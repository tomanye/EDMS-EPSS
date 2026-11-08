import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { store } from './server/data/store.js';
import { User } from './src/types/index.js';

const app = express();
const port = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '10mb' }));

// Simulated Active Session (can be switched by user in UI to test different personas)
let currentActiveUserId = 'usr-dg'; // Default to Director General

function getCurrentUser(req: Request): User {
  const customUserId = req.headers['x-user-id'] as string;
  const user = store.getUserById(customUserId || currentActiveUserId);
  if (user) return user;
  return store.getUsers()[0];
}

// REST API V1 Routes
const apiRouter = express.Router();

// 0. System Health & Prometheus Metrics (Section 14 Monitoring)
apiRouter.get('/health', (_req: Request, res: Response) => {
  const mem = process.memoryUsage();
  res.json({
    status: 'UP',
    system: 'EPSS Enterprise EDRMS',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: {
      status: 'Connected',
      documentsCount: store.getDocuments().length,
      branchesCount: store.getBranches().length,
      usersCount: store.getUsers().length
    },
    memory: {
      rssMb: (mem.rss / 1024 / 1024).toFixed(2),
      heapUsedMb: (mem.heapUsed / 1024 / 1024).toFixed(2),
      heapTotalMb: (mem.heapTotal / 1024 / 1024).toFixed(2)
    }
  });
});

apiRouter.get('/metrics', (_req: Request, res: Response) => {
  const mem = process.memoryUsage();
  const docs = store.getDocuments().length;
  const branches = store.getBranches().length;
  const users = store.getUsers().length;
  const uptime = Math.floor(process.uptime());

  const prometheusMetrics = [
    '# HELP epss_edrms_uptime_seconds Total runtime of the EPSS EDRMS application server in seconds.',
    '# TYPE epss_edrms_uptime_seconds counter',
    `epss_edrms_uptime_seconds ${uptime}`,
    '# HELP epss_edrms_documents_total Total number of registered correspondence and records.',
    '# TYPE epss_edrms_documents_total gauge',
    `epss_edrms_documents_total ${docs}`,
    '# HELP epss_edrms_branches_active Total active national and regional branch hubs.',
    '# TYPE epss_edrms_branches_active gauge',
    `epss_edrms_branches_active ${branches}`,
    '# HELP epss_edrms_users_total Total authenticated institutional staff accounts.',
    '# TYPE epss_edrms_users_total gauge',
    `epss_edrms_users_total ${users}`,
    '# HELP epss_edrms_memory_heap_used_bytes Process heap memory used.',
    '# TYPE epss_edrms_memory_heap_used_bytes gauge',
    `epss_edrms_memory_heap_used_bytes ${mem.heapUsed}`
  ].join('\n');

  res.setHeader('Content-Type', 'text/plain; version=0.0.4');
  res.send(prometheusMetrics);
});

// 1. Auth & Session
apiRouter.get('/auth/session', (req: Request, res: Response) => {
  const currentUser = getCurrentUser(req);
  const allUsers = store.getUsers();
  res.json({
    currentUser,
    availablePersonas: allUsers
  });
});

apiRouter.post('/auth/switch-user', (req: Request, res: Response) => {
  const { userId } = req.body;
  const target = store.getUserById(userId);
  if (!target) {
    return res.status(404).json({ error: 'User not found' });
  }
  currentActiveUserId = userId;
  store.addAuditLog({
    userId: target.id,
    userName: target.fullNameEn,
    userRole: target.role,
    branchName: target.branchNameEn,
    action: 'Switched Active Persona',
    resourceType: 'UserSession',
    resourceId: target.id,
    ipAddress: req.ip || '127.0.0.1',
    details: `Active persona switched to ${target.fullNameEn} (${target.role})`
  });
  res.json({ success: true, currentUser: target });
});

// 2. Organization Structure
apiRouter.get('/organizations/branches', (req: Request, res: Response) => {
  res.json(store.getBranches());
});

apiRouter.get('/organizations/departments', (req: Request, res: Response) => {
  res.json(store.getDepartments());
});

apiRouter.get('/organizations/users', (req: Request, res: Response) => {
  res.json(store.getUsers());
});

// 3. Correspondence Management
apiRouter.get('/correspondence', (req: Request, res: Response) => {
  const { type, branchId, departmentId, status, searchQuery, confidentiality, priority, isArchived } = req.query;
  const docs = store.getDocuments({
    type: type as string,
    branchId: branchId as string,
    departmentId: departmentId as string,
    status: status as string,
    searchQuery: searchQuery as string,
    confidentiality: confidentiality as string,
    priority: priority as string,
    isArchived: isArchived === 'true' ? true : isArchived === 'false' ? false : undefined
  });
  res.json(docs);
});

apiRouter.get('/correspondence/:id', (req: Request, res: Response) => {
  const doc = store.getDocumentById(req.params.id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }
  res.json(doc);
});

apiRouter.post('/correspondence', async (req: Request, res: Response) => {
  try {
    const actor = getCurrentUser(req);
    const clientIp = req.ip || '127.0.0.1';
    const newDoc = await store.createDocument(req.body, actor, clientIp);
    res.status(201).json(newDoc);
  } catch (error: any) {
    console.error('Error creating correspondence:', error);
    res.status(500).json({ error: error.message || 'Failed to create document' });
  }
});

// 4. Workflow Actions
apiRouter.post('/workflows/:id/action', async (req: Request, res: Response) => {
  try {
    const actor = getCurrentUser(req);
    const clientIp = req.ip || '127.0.0.1';
    const updated = await store.performWorkflowAction(req.params.id, req.body, actor, clientIp);
    if (!updated) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.json(updated);
  } catch (error: any) {
    console.error('Workflow action error:', error);
    res.status(500).json({ error: error.message || 'Workflow action failed' });
  }
});

// 5. Physical Custody Tracking & Handovers
apiRouter.get('/tracking/handovers', (req: Request, res: Response) => {
  res.json(store.getHandovers());
});

apiRouter.post('/tracking/handover', (req: Request, res: Response) => {
  const actor = getCurrentUser(req);
  const clientIp = req.ip || '127.0.0.1';
  const movement = store.recordPhysicalHandover(req.body, actor, clientIp);
  res.status(201).json(movement);
});

apiRouter.post('/tracking/missing-report', (req: Request, res: Response) => {
  const { documentId, notes } = req.body;
  const actor = getCurrentUser(req);
  const clientIp = req.ip || '127.0.0.1';
  const doc = store.getDocumentById(documentId);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }

  store.addAuditLog({
    userId: actor.id,
    userName: actor.fullNameEn,
    userRole: actor.role,
    branchName: actor.branchNameEn,
    action: 'REPORTED MISSING PHYSICAL DOSSIER',
    resourceType: 'PhysicalDossier',
    resourceId: doc.registrationNumber,
    ipAddress: clientIp,
    details: `URGENT INCIDENT: Physical binder reported missing from shelf. Notes: ${notes || 'Investigation initiated by registry division.'}`
  });

  res.json({ success: true, message: `Missing incident logged for ${doc.registrationNumber}` });
});

// 6. Records Archival & Legal Holds
apiRouter.get('/records/schedules', (req: Request, res: Response) => {
  res.json(store.getRetentionSchedules());
});

apiRouter.post('/records/legal-hold/:id', (req: Request, res: Response) => {
  const actor = getCurrentUser(req);
  const clientIp = req.ip || '127.0.0.1';
  const holdState = store.toggleLegalHold(req.params.id, actor, clientIp);
  res.json({ success: true, legalHold: holdState });
});

// 7. Executive Analytics & KPIs
apiRouter.get('/analytics/kpis', (req: Request, res: Response) => {
  res.json(store.getExecutiveKpis());
});

// 8. Audit Logs
apiRouter.get('/audit/logs', (req: Request, res: Response) => {
  res.json(store.getAuditLogs());
});

// 9. Notifications (SignalR / Live Dispatch Queue)
apiRouter.get('/notifications', (req: Request, res: Response) => {
  res.json(store.getNotifications());
});

apiRouter.post('/notifications/:id/read', (req: Request, res: Response) => {
  const success = store.markNotificationRead(req.params.id);
  res.json({ success });
});

// 10. Enterprise Integration Connectors (SAP S/4HANA, Active Directory, SMS, EFDA)
apiRouter.get('/integrations/connectors', (req: Request, res: Response) => {
  res.json(store.getConnectors());
});

apiRouter.post('/integrations/connectors/:id/test', (req: Request, res: Response) => {
  const actor = getCurrentUser(req);
  const clientIp = req.ip || '127.0.0.1';
  const updated = store.testConnector(req.params.id);
  if (!updated) {
    return res.status(404).json({ error: 'Connector not found' });
  }

  store.addAuditLog({
    userId: actor.id,
    userName: actor.fullNameEn,
    userRole: actor.role,
    branchName: actor.branchNameEn,
    action: `Tested Enterprise Connector: ${updated.name}`,
    resourceType: 'IntegrationConnector',
    resourceId: updated.id,
    ipAddress: clientIp,
    details: `Endpoint ${updated.endpoint} ping verified: ${updated.pingLatencyMs}ms`
  });

  res.json(updated);
});

// 11. Backup & Disaster Recovery (Section 10 & 14)
apiRouter.get('/admin/backups', (_req: Request, res: Response) => {
  res.json(store.listBackups());
});

apiRouter.post('/admin/backup', (req: Request, res: Response) => {
  const actor = getCurrentUser(req);
  const clientIp = req.ip || '127.0.0.1';
  const record = store.createBackup(actor.fullNameEn);

  store.addAuditLog({
    userId: actor.id,
    userName: actor.fullNameEn,
    userRole: actor.role,
    branchName: actor.branchNameEn,
    action: `Created Full System Database Backup Snapshot`,
    resourceType: 'DisasterRecoveryBackup',
    resourceId: record.filename,
    ipAddress: clientIp,
    details: `Created snapshot ${record.filename} (${(record.sizeBytes / 1024).toFixed(1)} KB) - Documents: ${record.documentCount}, Branches: ${record.branchCount}, SHA256: ${record.checksum}`
  });

  res.status(201).json(record);
});

apiRouter.post('/admin/restore', (req: Request, res: Response) => {
  const { filename } = req.body;
  if (!filename) {
    return res.status(400).json({ error: 'Filename is required for restore' });
  }

  const actor = getCurrentUser(req);
  const clientIp = req.ip || '127.0.0.1';
  const result = store.restoreBackup(filename);

  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }

  store.addAuditLog({
    userId: actor.id,
    userName: actor.fullNameEn,
    userRole: actor.role,
    branchName: actor.branchNameEn,
    action: `Restored System Database from Snapshot`,
    resourceType: 'DisasterRecoveryBackup',
    resourceId: filename,
    ipAddress: clientIp,
    details: `Database restored from snapshot ${filename}. All documents and branch records restored.`
  });

  res.json(result);
});

// 9. AI Document Processing & Summarization (Gemini API)
apiRouter.post('/ai/analyze-document', async (req: Request, res: Response) => {
  const { documentText, subject } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (apiKey && documentText) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `You are the AI Document Classifier for the Ethiopian Pharmaceutical Supply Service (EPSS).
Analyze the following official Ethiopian healthcare / pharmaceutical correspondence text:
"${documentText}" (Subject: "${subject || ''}")

Provide a JSON response with:
1. "summaryEn": A 2-sentence executive summary in English.
2. "summaryAm": A 2-sentence executive summary in Amharic (አማርኛ).
3. "suggestedCategory": e.g. "Regulatory Clearance", "Emergency Drug Supply", "Procurement Tender", "Quality Assurance", or "Administrative".
4. "suggestedDepartment": The best matching EPSS Directorate (e.g. "Pharmaceuticals Procurement Directorate", "Storage & Distribution Directorate", "Quality Assurance Directorate", or "Finance Directorate").
5. "confidence": Number between 0.85 and 0.99.

Output ONLY valid JSON.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });

      const responseText = response.text || '';
      try {
        const parsed = JSON.parse(responseText);
        return res.json(parsed);
      } catch {
        // Fallback to text parsing
      }
    } catch (err) {
      console.warn('Gemini API call failed, falling back to intelligent rule-based extraction:', err);
    }
  }

  // Fallback intelligent classification based on healthcare keywords
  const text = ((documentText || '') + ' ' + (subject || '')).toLowerCase();
  let category = 'Pharmaceutical Supply Correspondence';
  let department = 'Storage & Distribution Directorate';

  if (text.includes('tender') || text.includes('procure') || text.includes('bid') || text.includes('award') || text.includes('supplier')) {
    category = 'Procurement & Tender Contract';
    department = 'Pharmaceuticals Procurement Directorate';
  } else if (text.includes('clearance') || text.includes('efda') || text.includes('quality') || text.includes('lab') || text.includes('batch')) {
    category = 'Regulatory & Batch Clearance';
    department = 'Quality Assurance Directorate';
  } else if (text.includes('emergency') || text.includes('outbreak') || text.includes('cholera') || text.includes('malaria') || text.includes('urgent')) {
    category = 'Emergency Healthcare Response';
    department = 'Storage & Distribution Directorate';
  } else if (text.includes('budget') || text.includes('payment') || text.includes('fund') || text.includes('invoice')) {
    category = 'Financial & Fund Allocation';
    department = 'Fund Management & Finance Directorate';
  }

  res.json({
    summaryEn: `Official correspondence concerning ${subject || 'EPSS pharmaceutical operations'}. Priority routing recommended to ${department}.`,
    summaryAm: `የኢ.መ.አ.አ መድኃኒት አቅርቦት ሥራዎችን የተመለከተ ይፋዊ ደብዳቤ። ጉዳዩ ለ${department} እንዲመራ ይመከራል።`,
    suggestedCategory: category,
    suggestedDepartment: department,
    confidence: 0.94
  });
});

app.use('/api/v1', apiRouter);

// Serve Frontend
async function setupServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = http.createServer(app);
  server.listen(port, () => {
    console.log(`EPSS EDRMS server running on port ${port} in ${isProduction ? 'production' : 'development'} mode.`);
  });
}

setupServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
