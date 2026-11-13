import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import crypto from 'node:crypto';
import multer from 'multer';
import { GoogleGenAI } from '@google/genai';
import { store } from './server/data/store.js';
import { AuthSession, User, UserRole } from './src/types/index.js';

const app = express();
const port = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '10mb' }));

const workspaceUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB max per file
    files: 20
  }
});

interface AuthedRequest extends Request {
  authUser?: User;
  authSession?: AuthSession;
  sessionToken?: string;
}

function parseCookies(cookieHeader?: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookieHeader) return result;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx > 0) {
      const k = part.slice(0, idx).trim();
      const v = part.slice(idx + 1).trim();
      result[k] = decodeURIComponent(v);
    }
  }
  return result;
}

function extractSessionToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    return auth.slice(7).trim();
  }
  const headerToken = req.headers['x-session-token'];
  if (typeof headerToken === 'string' && headerToken.trim()) {
    return headerToken.trim();
  }
  const cookies = parseCookies(req.headers.cookie);
  return cookies.epss_session || null;
}

function setSessionCookie(req: Request, res: Response, token: string) {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  const sameSite = isHttps ? 'SameSite=None; Secure' : 'SameSite=Lax';
  res.setHeader(
    'Set-Cookie',
    `epss_session=${encodeURIComponent(token)}; HttpOnly; Path=/; ${sameSite}; Max-Age=28800`
  );
}

function clearSessionCookie(req: Request, res: Response) {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  const sameSite = isHttps ? 'SameSite=None; Secure' : 'SameSite=Lax';
  res.setHeader(
    'Set-Cookie',
    `epss_session=; HttpOnly; Path=/; ${sameSite}; Max-Age=0`
  );
}

function getCurrentUser(req: AuthedRequest): User {
  if (req.authUser) return req.authUser;
  const fallback = store.getUsers()[0];
  return fallback;
}

// REST API V1 Routes
const apiRouter = express.Router();

// Global Auth Middleware for /api/v1/*
const PUBLIC_API_PATHS = new Set([
  '/health',
  '/metrics',
  '/auth/session',
  '/auth/login',
  '/auth/mfa/verify',
  '/auth/webauthn/login-options',
  '/auth/webauthn/login-verify',
  '/auth/password-reset/request',
  '/auth/password-reset/dev-inbox',
  '/auth/password-reset/confirm',
  '/auth/logout'
]);

apiRouter.use((req: AuthedRequest, res: Response, next) => {
  const token = extractSessionToken(req);
  if (token) {
    const validated = store.validateSessionToken(token);
    if (validated) {
      req.authUser = validated.user;
      req.authSession = validated.session;
      req.sessionToken = token;
    }
  }

  if (PUBLIC_API_PATHS.has(req.path)) {
    return next();
  }

  if (!req.authUser || !req.authSession) {
    return res.status(401).json({
      error: 'Authentication required or session expired. Please sign in.'
    });
  }

  next();
});

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

// 1. Auth, Sessions, MFA, Password Policy, RBAC & Delegation
apiRouter.get('/auth/session', (req: AuthedRequest, res: Response) => {
  if (!req.authUser || !req.authSession) {
    return res.status(401).json({ authenticated: false, error: 'No active authenticated session.' });
  }
  const safeUser = store.sanitizeUser(req.authUser);
  const maskedSession: AuthSession = {
    ...req.authSession,
    token: `${req.authSession.token.slice(0, 8)}...${req.authSession.token.slice(-4)}`,
    isCurrent: true
  };
  res.json({
    authenticated: true,
    currentUser: safeUser,
    session: maskedSession,
    roleMatrix: store.getRoleMatrix(),
    delegations: store.getDelegations(req.authUser)
  });
});

apiRouter.post('/auth/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  const clientIp = req.ip || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || 'EPSS Web Client';
  const result = store.loginWithPassword(username, password, clientIp, userAgent);

  if (!result.success) {
    return res.status(result.statusCode || 401).json({ error: result.error });
  }

  if (result.mfaRequired) {
    return res.json({
      mfaRequired: true,
      challengeToken: result.challengeToken,
      userPreview: result.userPreview
    });
  }

  if (result.session) {
    setSessionCookie(req, res, result.session.token);
  }
  res.json({
    mfaRequired: false,
    token: result.session?.token,
    session: result.session,
    user: result.user
  });
});

apiRouter.post('/auth/mfa/verify', (req: Request, res: Response) => {
  const { challengeToken, method, pin, credentialId } = req.body;
  const clientIp = req.ip || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || 'EPSS Web Client';

  const result = store.verifyMfaChallenge(
    challengeToken,
    method === 'webauthn' ? 'webauthn' : 'pin',
    method === 'webauthn' ? credentialId : pin,
    clientIp,
    userAgent
  );

  if (!result.success) {
    return res.status(result.statusCode || 401).json({ error: result.error });
  }

  if (result.session) {
    setSessionCookie(req, res, result.session.token);
  }
  res.json({
    verified: true,
    token: result.session?.token,
    session: result.session,
    user: result.user
  });
});

apiRouter.post('/auth/webauthn/login-options', (req: Request, res: Response) => {
  const { username } = req.body;
  const challenge = crypto.randomBytes(32).toString('base64url');
  const clean = (username || '').trim().toLowerCase();
  const user = store.getUsers().find(u => u.username.toLowerCase() === clean || u.email.toLowerCase() === clean);
  const credentials = user ? store.getBiometricCredentials(user.id) : [];

  res.json({
    challenge,
    timeout: 60000,
    rpId: req.hostname || 'localhost',
    userVerification: 'required',
    allowCredentials: credentials.map(c => ({
      id: c.credentialId,
      type: 'public-key',
      transports: ['internal']
    }))
  });
});

apiRouter.post('/auth/webauthn/login-verify', (req: Request, res: Response) => {
  const { username, credentialId } = req.body;
  const clientIp = req.ip || '127.0.0.1';
  const userAgent = req.headers['user-agent'] || 'EPSS Web Client';
  const result = store.loginWithWebAuthn(username, credentialId, clientIp, userAgent);
  if (!result.success) {
    return res.status(result.statusCode || 401).json({ error: result.error });
  }
  if (result.session) {
    setSessionCookie(req, res, result.session.token);
  }
  res.json({
    verified: true,
    token: result.session?.token,
    session: result.session,
    user: result.user
  });
});

apiRouter.post('/auth/elevate-mfa', (req: AuthedRequest, res: Response) => {
  const actor = getCurrentUser(req);
  const clientIp = req.ip || '127.0.0.1';
  if (!req.sessionToken) {
    return res.status(401).json({ error: 'Active session required' });
  }
  const { method, pin } = req.body || {};
  if (method === 'pin') {
    const result = store.elevateSessionWithPin(req.sessionToken, pin, actor, clientIp);
    if (!result.success) {
      return res.status(401).json({ error: result.error });
    }
  } else {
    store.markSessionMfaVerified(req.sessionToken, actor, clientIp);
  }
  res.json({ success: true, mfaVerified: true });
});

apiRouter.post('/auth/logout', (req: AuthedRequest, res: Response) => {
  const token = extractSessionToken(req);
  const clientIp = req.ip || '127.0.0.1';
  if (token) {
    store.logoutSession(token, clientIp);
  }
  clearSessionCookie(req, res);
  res.json({ success: true });
});

apiRouter.post('/auth/password-reset/request', (req: Request, res: Response) => {
  const { identifier } = req.body;
  const clientIp = req.ip || '127.0.0.1';
  store.requestPasswordReset(identifier || '', clientIp);
  // Constant response message to prevent user enumeration
  res.json({
    success: true,
    message: 'If an active EPSS account matches that identifier, password reset instructions have been sent.'
  });
});

apiRouter.get('/auth/password-reset/dev-inbox', (_req: Request, res: Response) => {
  if (isProduction) {
    return res.status(404).json({ error: 'Not available in production' });
  }
  res.json(store.getDevResetMailInbox());
});

apiRouter.post('/auth/password-reset/confirm', (req: Request, res: Response) => {
  const { token, newPassword } = req.body;
  const clientIp = req.ip || '127.0.0.1';
  const result = store.confirmPasswordReset(token, newPassword, clientIp);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }
  res.json({ success: true, message: 'Password updated successfully. You may now sign in.' });
});

apiRouter.post('/auth/change-password', (req: AuthedRequest, res: Response) => {
  const actor = getCurrentUser(req);
  const clientIp = req.ip || '127.0.0.1';
  const { currentPassword, newPassword } = req.body;
  const result = store.changePassword(actor.id, currentPassword, newPassword, clientIp);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }
  res.json({ success: true, message: 'Password changed successfully.' });
});

apiRouter.get('/auth/sessions', (req: AuthedRequest, res: Response) => {
  const actor = getCurrentUser(req);
  const scopeAll = req.query.scope === 'all';
  res.json(store.getSessions(actor, req.sessionToken, scopeAll));
});

apiRouter.delete('/auth/sessions/:id', (req: AuthedRequest, res: Response) => {
  const actor = getCurrentUser(req);
  const clientIp = req.ip || '127.0.0.1';
  const result = store.revokeSessionById(req.params.id, actor, clientIp);
  if (!result.success) {
    return res.status(403).json({ error: result.error });
  }
  res.json({ success: true });
});

apiRouter.get('/auth/login-history', (req: AuthedRequest, res: Response) => {
  const actor = getCurrentUser(req);
  const scopeAll = req.query.scope === 'all';
  res.json(store.getLoginHistory(actor, scopeAll));
});

apiRouter.get('/auth/delegations', (req: AuthedRequest, res: Response) => {
  const actor = getCurrentUser(req);
  res.json(store.getDelegations(actor));
});

apiRouter.post('/auth/delegations', (req: AuthedRequest, res: Response) => {
  const actor = getCurrentUser(req);
  const clientIp = req.ip || '127.0.0.1';
  const { delegateId, startDate, endDate, reason } = req.body;
  const result = store.createDelegation(actor, delegateId, startDate, endDate, reason, clientIp);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }
  res.status(201).json(result.delegation);
});

apiRouter.delete('/auth/delegations/:id', (req: AuthedRequest, res: Response) => {
  const actor = getCurrentUser(req);
  const clientIp = req.ip || '127.0.0.1';
  const result = store.revokeDelegation(req.params.id, actor, clientIp);
  if (!result.success) {
    return res.status(403).json({ error: result.error });
  }
  res.json({ success: true });
});

apiRouter.get('/auth/roles', (_req: Request, res: Response) => {
  res.json(store.getRoleMatrix());
});

apiRouter.put('/auth/roles/:role', (req: AuthedRequest, res: Response) => {
  const actor = getCurrentUser(req);
  const clientIp = req.ip || '127.0.0.1';
  const role = req.params.role as UserRole;
  const result = store.updateRoleMatrix(role, req.body, actor, clientIp);
  if (!result.success) {
    return res.status(403).json({ error: result.error });
  }
  res.json(result.roleMatrix);
});

apiRouter.post('/auth/admin/users/:id/lock', (req: AuthedRequest, res: Response) => {
  const actor = getCurrentUser(req);
  const clientIp = req.ip || '127.0.0.1';
  const result = store.adminSetUserLock(req.params.id, true, actor, clientIp);
  if (!result.success) {
    return res.status(403).json({ error: result.error });
  }
  res.json(result.user);
});

apiRouter.post('/auth/admin/users/:id/unlock', (req: AuthedRequest, res: Response) => {
  const actor = getCurrentUser(req);
  const clientIp = req.ip || '127.0.0.1';
  const result = store.adminSetUserLock(req.params.id, false, actor, clientIp);
  if (!result.success) {
    return res.status(403).json({ error: result.error });
  }
  res.json(result.user);
});

apiRouter.post('/auth/admin/users/:id/reset-password', (req: AuthedRequest, res: Response) => {
  const actor = getCurrentUser(req);
  const clientIp = req.ip || '127.0.0.1';
  const { newPassword } = req.body;
  const result = store.adminResetUserPassword(req.params.id, newPassword, actor, clientIp);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }
  res.json({ success: true, message: 'User password reset successfully.' });
});

// 1.1 WebAuthn Biometric Authentication Layer (Touch ID / Face ID / Windows Hello)
apiRouter.get('/auth/webauthn/credentials', (req: AuthedRequest, res: Response) => {
  const actor = getCurrentUser(req);
  const credentials = store.getBiometricCredentials(actor.id);
  res.json({
    userId: actor.id,
    biometricsEnabled: (credentials.length > 0) || !!actor.biometricsEnabled,
    credentials
  });
});

apiRouter.post('/auth/webauthn/register-options', (req: AuthedRequest, res: Response) => {
  const actor = getCurrentUser(req);
  const challenge = crypto.randomBytes(32).toString('base64url');
  
  res.json({
    challenge,
    rp: {
      name: 'EPSS EDRMS Biometric Security Vault',
      id: req.hostname || 'localhost'
    },
    user: {
      id: Buffer.from(actor.id).toString('base64url'),
      name: actor.email,
      displayName: actor.fullNameEn
    },
    pubKeyCredParams: [
      { alg: -7, type: 'public-key' },  // ES256
      { alg: -257, type: 'public-key' } // RS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'required',
      residentKey: 'preferred'
    },
    timeout: 60000,
    attestation: 'none'
  });
});

apiRouter.post('/auth/webauthn/register-verify', (req: AuthedRequest, res: Response) => {
  const actor = getCurrentUser(req);
  const clientIp = req.ip || '127.0.0.1';
  const { credentialId, deviceName, authenticatorAttachment } = req.body;

  const credId = credentialId || `cred-bio-${Date.now()}`;
  const cred = {
    id: `bio-${Date.now()}`,
    credentialId: credId,
    deviceName: deviceName || 'Platform Biometric Sensor (Touch ID / Face ID)',
    authenticatorAttachment: (authenticatorAttachment || 'platform') as 'platform' | 'cross-platform',
    counter: 1,
    registeredAt: new Date().toISOString(),
    lastUsedAt: new Date().toISOString()
  };

  const result = store.registerBiometricCredential(actor.id, cred, clientIp);
  res.json({
    success: true,
    message: 'Biometric credential enrolled successfully',
    credential: cred,
    user: store.sanitizeUser(result.user)
  });
});

apiRouter.post('/auth/webauthn/auth-options', (req: AuthedRequest, res: Response) => {
  const actor = getCurrentUser(req);
  const challenge = crypto.randomBytes(32).toString('base64url');
  const credentials = store.getBiometricCredentials(actor.id);

  res.json({
    challenge,
    timeout: 60000,
    rpId: req.hostname || 'localhost',
    userVerification: 'required',
    allowCredentials: credentials.map(c => ({
      id: c.credentialId,
      type: 'public-key',
      transports: ['internal']
    }))
  });
});

apiRouter.post('/auth/webauthn/auth-verify', (req: AuthedRequest, res: Response) => {
  const actor = getCurrentUser(req);
  const clientIp = req.ip || '127.0.0.1';
  const { credentialId, actionContext } = req.body;

  const result = store.verifyBiometricAssertion(
    actor.id,
    credentialId || 'webauthn-platform-sensor',
    clientIp,
    actionContext || 'Sensitive Pharmaceutical Record Access'
  );

  if (req.sessionToken) {
    store.markSessionMfaVerified(req.sessionToken, actor, clientIp);
  }

  res.json({
    verified: true,
    timestamp: new Date().toISOString(),
    user: store.sanitizeUser(result.user),
    actionContext
  });
});

// Input Sanitization Helper
function sanitize(input: any): string {
  if (typeof input !== 'string') return '';
  return input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '').trim();
}

// 2. Organization Structure CRUD
apiRouter.get('/organizations/branches', (req: Request, res: Response) => {
  res.json(store.getBranches());
});

apiRouter.post('/organizations/branches', (req: AuthedRequest, res: Response) => {
  try {
    const actor = getCurrentUser(req);
    if (!store.hasPermission(actor, 'manage:organizations')) {
      return res.status(403).json({ error: 'Forbidden: manage:organizations permission required.' });
    }
    const clientIp = req.ip || '127.0.0.1';
    const { code, nameEn, nameAm, city, region, cluster, isHeadOffice, phone, email, address, managerName } = req.body;

    if (!code || !nameEn || !nameAm || !city || !cluster) {
      return res.status(400).json({ error: 'Code, English name, Amharic name, city, and cluster are required' });
    }

    // Check unique branch code
    const existing = store.getBranches().find(b => b.code.toLowerCase() === code.toLowerCase().trim());
    if (existing) {
      return res.status(409).json({ error: `Branch code '${code}' already exists.` });
    }

    const branch = store.createBranch({
      code: sanitize(code).toUpperCase(),
      nameEn: sanitize(nameEn),
      nameAm: sanitize(nameAm),
      city: sanitize(city),
      region: sanitize(region || city),
      cluster,
      isHeadOffice: !!isHeadOffice,
      phone: sanitize(phone || '+251 11 275 1155'),
      email: sanitize(email || 'branch@epss.gov.et'),
      address: sanitize(address || 'EPSS Regional Compound'),
      managerName: sanitize(managerName || 'Assigned Branch Lead')
    }, actor, clientIp);

    res.status(201).json(branch);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create branch' });
  }
});

apiRouter.put('/organizations/branches/:id', (req: AuthedRequest, res: Response) => {
  try {
    const actor = getCurrentUser(req);
    if (!store.hasPermission(actor, 'manage:organizations')) {
      return res.status(403).json({ error: 'Forbidden: manage:organizations permission required.' });
    }
    const clientIp = req.ip || '127.0.0.1';
    const updated = store.updateBranch(req.params.id, req.body, actor, clientIp);
    if (!updated) {
      return res.status(404).json({ error: 'Branch not found' });
    }
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update branch' });
  }
});

apiRouter.delete('/organizations/branches/:id', (req: AuthedRequest, res: Response) => {
  const actor = getCurrentUser(req);
  if (!store.hasPermission(actor, 'manage:organizations')) {
    return res.status(403).json({ error: 'Forbidden: manage:organizations permission required.' });
  }
  const clientIp = req.ip || '127.0.0.1';
  const success = store.deleteBranch(req.params.id, actor, clientIp);
  if (!success) {
    return res.status(404).json({ error: 'Branch not found' });
  }
  res.json({ success, message: 'Branch deactivated successfully' });
});

apiRouter.get('/organizations/departments', (_req: Request, res: Response) => {
  res.json(store.getDepartments());
});

apiRouter.post('/organizations/departments', (req: AuthedRequest, res: Response) => {
  try {
    const actor = getCurrentUser(req);
    if (!store.hasPermission(actor, 'manage:organizations')) {
      return res.status(403).json({ error: 'Forbidden: manage:organizations permission required.' });
    }
    const clientIp = req.ip || '127.0.0.1';
    const { code, nameEn, nameAm, directorateEn, directorateAm, headNameEn, headUserId } = req.body;

    if (!code || !nameEn || !nameAm || !directorateEn) {
      return res.status(400).json({ error: 'Code, English name, Amharic name, and directorate are required' });
    }

    const dept = store.createDepartment({
      code: sanitize(code).toUpperCase(),
      nameEn: sanitize(nameEn),
      nameAm: sanitize(nameAm),
      directorateEn: sanitize(directorateEn),
      directorateAm: sanitize(directorateAm || directorateEn),
      headNameEn: sanitize(headNameEn || 'Directorate Lead'),
      headUserId
    }, actor, clientIp);

    res.status(201).json(dept);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create directorate' });
  }
});

apiRouter.put('/organizations/departments/:id', (req: AuthedRequest, res: Response) => {
  try {
    const actor = getCurrentUser(req);
    if (!store.hasPermission(actor, 'manage:organizations')) {
      return res.status(403).json({ error: 'Forbidden: manage:organizations permission required.' });
    }
    const clientIp = req.ip || '127.0.0.1';
    const updated = store.updateDepartment(req.params.id, req.body, actor, clientIp);
    if (!updated) {
      return res.status(404).json({ error: 'Directorate not found' });
    }
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update directorate' });
  }
});

apiRouter.delete('/organizations/departments/:id', (req: AuthedRequest, res: Response) => {
  const actor = getCurrentUser(req);
  if (!store.hasPermission(actor, 'manage:organizations')) {
    return res.status(403).json({ error: 'Forbidden: manage:organizations permission required.' });
  }
  const clientIp = req.ip || '127.0.0.1';
  const success = store.deleteDepartment(req.params.id, actor, clientIp);
  if (!success) {
    return res.status(404).json({ error: 'Directorate not found' });
  }
  res.json({ success, message: 'Directorate deactivated successfully' });
});

apiRouter.get('/organizations/users', (_req: Request, res: Response) => {
  res.json(store.getSanitizedUsers());
});

apiRouter.post('/organizations/users', (req: AuthedRequest, res: Response) => {
  try {
    const actor = getCurrentUser(req);
    if (!store.hasPermission(actor, 'manage:users')) {
      return res.status(403).json({ error: 'Forbidden: manage:users permission required.' });
    }
    const clientIp = req.ip || '127.0.0.1';
    const { username, fullNameEn, fullNameAm, email, role, branchId, departmentId, position, permissions, initialPassword } = req.body;

    if (!fullNameEn || !email || !role || !branchId || !departmentId) {
      return res.status(400).json({ error: 'Full name, email, role, branch, and department are required' });
    }

    const branch = store.getBranches().find(b => b.id === branchId);
    const dept = store.getDepartments().find(d => d.id === departmentId);

    const newUser = store.createUser({
      username: username ? sanitize(username) : undefined,
      initialPassword,
      fullNameEn: sanitize(fullNameEn),
      fullNameAm: sanitize(fullNameAm || fullNameEn),
      email: sanitize(email).toLowerCase(),
      role,
      branchId,
      branchNameEn: branch?.nameEn || 'EPSS Head Office',
      branchNameAm: branch?.nameAm || 'የኢ.መ.አ.አ ዋና መሥሪያ ቤት',
      departmentId,
      departmentNameEn: dept?.nameEn || 'Central Directorate',
      departmentNameAm: dept?.nameAm || 'ዋና ዳይሬክቶሬት',
      position: sanitize(position || role),
      permissions: Array.isArray(permissions) ? permissions : ['read:documents', 'create:documents']
    }, actor, clientIp);

    res.status(201).json(newUser);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create user' });
  }
});

apiRouter.put('/organizations/users/:id', (req: AuthedRequest, res: Response) => {
  try {
    const actor = getCurrentUser(req);
    if (!store.hasPermission(actor, 'manage:users')) {
      return res.status(403).json({ error: 'Forbidden: manage:users permission required.' });
    }
    const clientIp = req.ip || '127.0.0.1';
    const updated = store.updateUser(req.params.id, req.body, actor, clientIp);
    if (!updated) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update user' });
  }
});

apiRouter.delete('/organizations/users/:id', (req: AuthedRequest, res: Response) => {
  const actor = getCurrentUser(req);
  if (!store.hasPermission(actor, 'manage:users')) {
    return res.status(403).json({ error: 'Forbidden: manage:users permission required.' });
  }
  const clientIp = req.ip || '127.0.0.1';
  const success = store.deleteUser(req.params.id, actor, clientIp);
  if (!success) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ success, message: 'User account deactivated' });
});

// 3. Correspondence Management & Validation
apiRouter.get('/correspondence', (req: AuthedRequest, res: Response) => {
  const actor = getCurrentUser(req);
  if (!store.hasPermission(actor, 'read:documents')) {
    return res.status(403).json({ error: 'Forbidden: read:documents permission required.' });
  }
  const { type, branchId, departmentId, status, searchQuery, confidentiality, priority, isArchived, includeDeleted } = req.query;
  const docs = store.getDocuments({
    type: type as string,
    branchId: branchId as string,
    departmentId: departmentId as string,
    status: status as string,
    searchQuery: searchQuery as string,
    confidentiality: confidentiality as string,
    priority: priority as string,
    isArchived: isArchived === 'true' ? true : isArchived === 'false' ? false : undefined,
    includeDeleted: includeDeleted === 'true'
  });
  res.json(docs);
});

apiRouter.get('/correspondence/:id', (req: AuthedRequest, res: Response) => {
  const actor = getCurrentUser(req);
  const doc = store.getDocumentById(req.params.id);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }
  const access = store.canAccessDocument(actor, doc, req.authSession);
  if (!access.allowed) {
    return res.status(403).json({ error: access.reason, mfaNeeded: access.mfaNeeded });
  }
  res.json(doc);
});

apiRouter.post('/correspondence', async (req: AuthedRequest, res: Response) => {
  try {
    const actor = getCurrentUser(req);
    if (!store.hasPermission(actor, 'create:documents')) {
      return res.status(403).json({ error: 'Forbidden: create:documents permission required.' });
    }
    const clientIp = req.ip || '127.0.0.1';
    const { 
      type, 
      subjectEn, 
      subjectAm, 
      priority, 
      confidentiality, 
      receivedDate, 
      senderOrganization, 
      recipientOrganization,
      branchId,
      departmentId 
    } = req.body;

    // Validation Rules from Specification
    if (!subjectEn || subjectEn.trim().length < 5 || subjectEn.trim().length > 500) {
      return res.status(400).json({ error: 'Subject (English) is required (min 5, max 500 characters)' });
    }
    const cleanSubjectAm = (subjectAm && subjectAm.trim()) || subjectEn.trim();
    if (cleanSubjectAm.length < 5 || cleanSubjectAm.length > 500) {
      return res.status(400).json({ error: 'Subject (Amharic) must be between 5 and 500 characters' });
    }

    const allowedTypes = ['IncomingLetter', 'OutgoingLetter', 'InternalMemo', 'Application', 'TenderDocument', 'InspectionReport', 'Circular'];
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({ error: `Invalid document type '${type}'. Allowed: ${allowedTypes.join(', ')}` });
    }

    const allowedPriorities = ['Normal', 'Urgent', 'VeryUrgent'];
    if (priority && !allowedPriorities.includes(priority)) {
      return res.status(400).json({ error: `Invalid priority '${priority}'. Allowed: ${allowedPriorities.join(', ')}` });
    }

    const allowedConf = ['Public', 'Internal', 'Confidential', 'Secret'];
    if (confidentiality && !allowedConf.includes(confidentiality)) {
      return res.status(400).json({ error: `Invalid confidentiality '${confidentiality}'. Allowed: ${allowedConf.join(', ')}` });
    }

    if (type === 'IncomingLetter' && (!senderOrganization || senderOrganization.trim().length < 2)) {
      return res.status(400).json({ error: 'Sender organization is mandatory for Incoming Correspondence' });
    }

    if (type === 'OutgoingLetter' && (!recipientOrganization || recipientOrganization.trim().length < 2)) {
      return res.status(400).json({ error: 'Recipient organization is mandatory for Outgoing Correspondence' });
    }

    // Verify branch & department exist
    if (branchId) {
      const bExists = store.getBranches().some(b => b.id === branchId);
      if (!bExists) return res.status(400).json({ error: `Branch ID '${branchId}' does not exist.` });
    }
    if (departmentId) {
      const dExists = store.getDepartments().some(d => d.id === departmentId);
      if (!dExists) return res.status(400).json({ error: `Department ID '${departmentId}' does not exist.` });
    }

    // Received date validation (not future date + 1 day buffer)
    if (receivedDate) {
      const recTime = new Date(receivedDate).getTime();
      const futureLimit = Date.now() + 86400000;
      if (recTime > futureLimit) {
        return res.status(400).json({ error: 'Received date cannot be in the future.' });
      }
    }

    const newDoc = await store.createDocument(req.body, actor, clientIp);
    res.status(201).json(newDoc);
  } catch (error: any) {
    console.error('Error creating correspondence:', error);
    res.status(500).json({ error: error.message || 'Failed to create document' });
  }
});

// Update Document
apiRouter.put('/correspondence/:id', (req: AuthedRequest, res: Response) => {
  try {
    const actor = getCurrentUser(req);
    if (!store.hasPermission(actor, 'edit:documents')) {
      return res.status(403).json({ error: 'Forbidden: edit:documents permission required.' });
    }
    const existingDoc = store.getDocumentById(req.params.id);
    if (!existingDoc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    const access = store.canAccessDocument(actor, existingDoc, req.authSession);
    if (!access.allowed) {
      return res.status(403).json({ error: access.reason, mfaNeeded: access.mfaNeeded });
    }
    const clientIp = req.ip || '127.0.0.1';

    if (existingDoc.legalHold) {
      return res.status(423).json({ error: 'Document under Legal Hold cannot be edited, deleted, or disposed.' });
    }
    if (existingDoc.status === 'Disposed') {
      return res.status(400).json({ error: 'Disposed records are permanently immutable.' });
    }

    // Validation if subjects updated
    if (req.body.subjectEn !== undefined && (req.body.subjectEn.trim().length < 5 || req.body.subjectEn.trim().length > 500)) {
      return res.status(400).json({ error: 'Subject (English) must be between 5 and 500 characters' });
    }

    const updated = store.updateDocument(req.params.id, req.body, actor, clientIp);
    if (!updated) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.json(updated);
  } catch (error: any) {
    res.status(error.message?.includes('Legal Hold') ? 423 : 500).json({ error: error.message || 'Failed to update document' });
  }
});

// Soft Delete Document
apiRouter.delete('/correspondence/:id', (req: AuthedRequest, res: Response) => {
  const actor = getCurrentUser(req);
  if (!store.hasPermission(actor, 'delete:documents')) {
    return res.status(403).json({ error: 'Forbidden: delete:documents permission required.' });
  }
  const existingDoc = store.getDocumentById(req.params.id);
  if (!existingDoc) {
    return res.status(404).json({ error: 'Document not found' });
  }
  if (existingDoc.legalHold) {
    return res.status(423).json({ error: 'Document under Legal Hold cannot be edited, deleted, or disposed.' });
  }
  const clientIp = req.ip || '127.0.0.1';
  const reason = (req.body && req.body.reason) || req.query.reason as string;
  try {
    const success = store.softDeleteDocument(req.params.id, actor, clientIp, reason);
    if (!success) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.json({ success: true, message: 'Document soft-deleted (status set to Cancelled)' });
  } catch (err: any) {
    res.status(err.message?.includes('Legal Hold') ? 423 : 400).json({ error: err.message });
  }
});

// Permanent Hard Delete Document (SuperAdmin Only)
apiRouter.delete('/correspondence/:id/permanent', (req: AuthedRequest, res: Response) => {
  const actor = getCurrentUser(req);
  const clientIp = req.ip || '127.0.0.1';

  if (actor.role !== 'SuperAdmin') {
    return res.status(403).json({ error: 'Access Denied: Hard deletion requires SuperAdmin credentials.' });
  }

  const existingDoc = store.getDocumentById(req.params.id);
  if (existingDoc?.legalHold) {
    return res.status(423).json({ error: 'Document under Legal Hold cannot be edited, deleted, or disposed.' });
  }

  const result = store.hardDeleteDocument(req.params.id, actor, clientIp);
  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }
  res.json(result);
});

// Attachment Metadata CRUD
apiRouter.post('/correspondence/:id/attachments', (req: AuthedRequest, res: Response) => {
  try {
    const actor = getCurrentUser(req);
    if (!store.hasPermission(actor, 'edit:documents') && !store.hasPermission(actor, 'create:documents')) {
      return res.status(403).json({ error: 'Forbidden: document modification permission required.' });
    }
    const clientIp = req.ip || '127.0.0.1';
    const { fileName, fileSize, mimeType, fileUrl, description, notes } = req.body;

    if (!fileName || !fileUrl) {
      return res.status(400).json({ error: 'fileName and fileUrl are required' });
    }

    const updated = store.addAttachment(req.params.id, {
      fileName: sanitize(fileName),
      fileSize: fileSize || 102400,
      mimeType: mimeType || 'application/pdf',
      fileUrl,
      description: sanitize(description || ''),
      notes: sanitize(notes || ''),
      version: 1
    }, actor, clientIp);

    if (!updated) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.status(201).json(updated);
  } catch (err: any) {
    res.status(err.message?.includes('Legal Hold') ? 423 : 500).json({ error: err.message || 'Failed to add attachment' });
  }
});

apiRouter.put('/correspondence/:id/attachments/:attachmentId', (req: AuthedRequest, res: Response) => {
  try {
    const actor = getCurrentUser(req);
    if (!store.hasPermission(actor, 'edit:documents')) {
      return res.status(403).json({ error: 'Forbidden: edit:documents permission required.' });
    }
    const clientIp = req.ip || '127.0.0.1';
    const updated = store.updateAttachment(req.params.id, req.params.attachmentId, req.body, actor, clientIp);
    if (!updated) {
      return res.status(404).json({ error: 'Document or attachment not found' });
    }
    res.json(updated);
  } catch (err: any) {
    res.status(err.message?.includes('Legal Hold') ? 423 : 500).json({ error: err.message || 'Failed to update attachment metadata' });
  }
});

apiRouter.delete('/correspondence/:id/attachments/:attachmentId', (req: AuthedRequest, res: Response) => {
  try {
    const actor = getCurrentUser(req);
    if (!store.hasPermission(actor, 'edit:documents')) {
      return res.status(403).json({ error: 'Forbidden: edit:documents permission required.' });
    }
    const clientIp = req.ip || '127.0.0.1';
    const updated = store.removeAttachment(req.params.id, req.params.attachmentId, actor, clientIp);
    if (!updated) {
      return res.status(404).json({ error: 'Document or attachment not found' });
    }
    res.json(updated);
  } catch (err: any) {
    res.status(err.message?.includes('Legal Hold') ? 423 : 500).json({ error: err.message || 'Failed to remove attachment' });
  }
});

// 4. Workflow Engine (Definitions, Tasks Inbox, Stage Actions, Escalation)
apiRouter.get('/workflows/definitions', (_req: AuthedRequest, res: Response) => {
  res.json(store.getWorkflowDefinitions());
});

apiRouter.post('/workflows/definitions', (req: AuthedRequest, res: Response) => {
  const actor = getCurrentUser(req);
  const clientIp = req.ip || '127.0.0.1';
  const result = store.createWorkflowDefinition(req.body, actor, clientIp);
  if (!result.success) {
    return res.status(result.error?.includes('Permission') ? 403 : 400).json({ error: result.error });
  }
  res.status(201).json(result.definition);
});

apiRouter.put('/workflows/definitions/:id', (req: AuthedRequest, res: Response) => {
  const actor = getCurrentUser(req);
  const clientIp = req.ip || '127.0.0.1';
  const result = store.updateWorkflowDefinition(req.params.id, req.body, actor, clientIp);
  if (!result.success) {
    return res.status(result.error?.includes('Permission') ? 403 : 400).json({ error: result.error });
  }
  res.json(result.definition);
});

apiRouter.delete('/workflows/definitions/:id', (req: AuthedRequest, res: Response) => {
  const actor = getCurrentUser(req);
  const clientIp = req.ip || '127.0.0.1';
  const result = store.deleteWorkflowDefinition(req.params.id, actor, clientIp);
  if (!result.success) {
    return res.status(result.error?.includes('Only SuperAdmin') ? 403 : 400).json({ error: result.error });
  }
  res.json({ success: true });
});

apiRouter.get('/workflows/tasks', (req: AuthedRequest, res: Response) => {
  const actor = getCurrentUser(req);
  const tasks = store.getWorkflowTasks(actor, {
    scope: (req.query.scope as any) || 'all',
    sla: (req.query.sla as any) || 'all',
    type: (req.query.type as string) || 'All',
    priority: (req.query.priority as string) || 'All',
    search: (req.query.search as string) || ''
  });
  res.json(tasks);
});

apiRouter.get('/workflows/instances/:id', (req: AuthedRequest, res: Response) => {
  const actor = getCurrentUser(req);
  const task = store.getEnrichedWorkflowTask(req.params.id, actor);
  if (!task) {
    return res.status(404).json({ error: 'Workflow task not found' });
  }
  const access = store.canAccessDocument(actor, task.document, req.authSession);
  if (!access.allowed) {
    return res.status(403).json({ error: access.reason, mfaNeeded: access.mfaNeeded });
  }
  res.json(task);
});

apiRouter.post('/workflows/instances/:id/action', async (req: AuthedRequest, res: Response) => {
  try {
    const actor = getCurrentUser(req);
    const actionName = req.body?.action;
    if ((actionName === 'Approved' || actionName === 'Rejected') && !store.hasPermission(actor, 'approve:workflows')) {
      return res.status(403).json({ error: 'Forbidden: approve:workflows permission required to approve or reject records.' });
    }

    const inst = store.getWorkflowInstanceByIdOrDocId(req.params.id);
    const targetDoc = inst ? store.getDocumentById(inst.documentId) : store.getDocumentById(req.params.id);
    if (!targetDoc) {
      return res.status(404).json({ error: 'Workflow task or document not found' });
    }
    const access = store.canAccessDocument(actor, targetDoc, req.authSession);
    if (!access.allowed) {
      return res.status(403).json({ error: access.reason, mfaNeeded: access.mfaNeeded });
    }

    const clientIp = req.ip || '127.0.0.1';
    const result = await store.executeWorkflowTaskAction(req.params.id, req.body, actor, req.authSession, clientIp);
    if (!result.success) {
      return res.status(result.statusCode || 400).json({ error: result.error, mfaNeeded: result.mfaNeeded });
    }
    const enriched = store.getEnrichedWorkflowTask(result.instance!.id, actor);
    res.json({ document: result.document, instance: result.instance, task: enriched });
  } catch (error: any) {
    console.error('Workflow instance action error:', error);
    res.status(error.statusCode || 500).json({ error: error.message || 'Workflow action failed', mfaNeeded: error.mfaNeeded });
  }
});

apiRouter.post('/workflows/instances/:id/escalate', (req: AuthedRequest, res: Response) => {
  const actor = getCurrentUser(req);
  const clientIp = req.ip || '127.0.0.1';
  const result = store.escalateWorkflowInstance(req.params.id, req.body || {}, actor, clientIp);
  if (!result.success) {
    return res.status(result.statusCode || 400).json({ error: result.error });
  }
  const enriched = store.getEnrichedWorkflowTask(result.instance!.id, actor);
  res.json({ instance: result.instance, task: enriched });
});

apiRouter.post('/workflows/instances/:id/attachments', (req: AuthedRequest, res: Response) => {
  workspaceUpload.single('file')(req, res, (err: any) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Attachment upload failed' });
    }
    const actor = getCurrentUser(req);
    const inst = store.getWorkflowInstanceByIdOrDocId(req.params.id);
    const targetDoc = inst ? store.getDocumentById(inst.documentId) : store.getDocumentById(req.params.id);
    if (!targetDoc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    const clientIp = req.ip || '127.0.0.1';
    const uploadedFile = (req as any).file;

    if (uploadedFile) {
      const wsResult = store.uploadWorkspaceFile({
        fileName: uploadedFile.originalname,
        mimeType: uploadedFile.mimetype,
        buffer: uploadedFile.buffer,
        parentId: null,
        versionNotes: `Task attachment for ${targetDoc.registrationNumber}`,
        actor,
        clientIp
      });
      if (!wsResult.success || !wsResult.item) {
        return res.status(400).json({ error: wsResult.error || 'File failed security validation.' });
      }
      const updated = store.addAttachment(
        targetDoc.id,
        {
          fileName: wsResult.item.name,
          fileSize: wsResult.item.size,
          mimeType: wsResult.item.mimeType || uploadedFile.mimetype || 'application/octet-stream',
          fileUrl: `/api/v1/workspace/items/${wsResult.item.id}/download`,
          description: sanitize((req.body?.description as string) || 'Workflow Task Attachment'),
          notes: sanitize((req.body?.notes as string) || `Uploaded during stage: ${inst?.currentStageName || 'Workflow Review'}`),
          version: 1
        },
        actor,
        clientIp
      );
      return res.status(201).json({ document: updated, task: store.getEnrichedWorkflowTask(targetDoc.id, actor) });
    }

    const { fileName, fileSize, mimeType, fileUrl, description, notes } = req.body || {};
    if (!fileName || !fileUrl) {
      return res.status(400).json({ error: 'Either a file upload or fileName + fileUrl is required.' });
    }
    const updated = store.addAttachment(
      targetDoc.id,
      {
        fileName: sanitize(fileName),
        fileSize: fileSize || 102400,
        mimeType: mimeType || 'application/pdf',
        fileUrl,
        description: sanitize(description || ''),
        notes: sanitize(notes || ''),
        version: 1
      },
      actor,
      clientIp
    );
    res.status(201).json({ document: updated, task: store.getEnrichedWorkflowTask(targetDoc.id, actor) });
  });
});

apiRouter.post('/workflows/:id/action', async (req: AuthedRequest, res: Response) => {
  try {
    const actor = getCurrentUser(req);
    const actionName = req.body?.action;
    if ((actionName === 'Approved' || actionName === 'Rejected') && !store.hasPermission(actor, 'approve:workflows')) {
      return res.status(403).json({ error: 'Forbidden: approve:workflows permission required to approve or reject records.' });
    }
    const targetDoc = store.getDocumentById(req.params.id);
    if (!targetDoc) {
      return res.status(404).json({ error: 'Document not found' });
    }
    const access = store.canAccessDocument(actor, targetDoc, req.authSession);
    if (!access.allowed) {
      return res.status(403).json({ error: access.reason, mfaNeeded: access.mfaNeeded });
    }
    const clientIp = req.ip || '127.0.0.1';
    const updated = await store.performWorkflowAction(req.params.id, req.body, actor, clientIp, req.authSession);
    if (!updated) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.json(updated);
  } catch (error: any) {
    console.error('Workflow action error:', error);
    res.status(error.statusCode || 500).json({ error: error.message || 'Workflow action failed', mfaNeeded: error.mfaNeeded });
  }
});

// 5. Physical Custody Tracking, Location Hierarchy, Handovers & Missing Incidents
apiRouter.get('/tracking/locations', (_req: Request, res: Response) => {
  res.json(store.getPhysicalLocations());
});

apiRouter.post('/tracking/locations', (req: AuthedRequest, res: Response) => {
  const actor = getCurrentUser(req);
  const clientIp = req.ip || '127.0.0.1';
  const result = store.createPhysicalLocation(req.body || {}, actor, clientIp);
  if (!result.success) {
    return res.status(result.statusCode || 400).json({ error: result.error });
  }
  res.status(201).json(result.location);
});

apiRouter.put('/tracking/locations/:id', (req: AuthedRequest, res: Response) => {
  const actor = getCurrentUser(req);
  const clientIp = req.ip || '127.0.0.1';
  const result = store.updatePhysicalLocation(req.params.id, req.body || {}, actor, clientIp);
  if (!result.success) {
    return res.status(result.statusCode || 400).json({ error: result.error });
  }
  res.json(result.location);
});

apiRouter.delete('/tracking/locations/:id', (req: AuthedRequest, res: Response) => {
  const actor = getCurrentUser(req);
  const clientIp = req.ip || '127.0.0.1';
  const result = store.deletePhysicalLocation(req.params.id, actor, clientIp);
  if (!result.success) {
    return res.status(result.statusCode || 400).json({ error: result.error });
  }
  res.json({ success: true });
});

apiRouter.get('/tracking/files', (_req: Request, res: Response) => {
  res.json(store.getPhysicalFiles());
});

apiRouter.post('/tracking/files', (req: AuthedRequest, res: Response) => {
  const actor = getCurrentUser(req);
  const clientIp = req.ip || '127.0.0.1';
  const result = store.registerPhysicalFile(req.body || {}, actor, clientIp);
  if (!result.success) {
    return res.status(result.statusCode || 400).json({ error: result.error });
  }
  res.status(201).json(result.file);
});

apiRouter.get('/tracking/overdue', (_req: Request, res: Response) => {
  res.json(store.getOverduePhysicalFiles());
});

apiRouter.get('/tracking/handovers', (_req: Request, res: Response) => {
  res.json(store.getHandovers());
});

apiRouter.post('/tracking/handover', (req: AuthedRequest, res: Response) => {
  const actor = getCurrentUser(req);
  const clientIp = req.ip || '127.0.0.1';
  const result = store.initiatePhysicalHandover(req.body || {}, actor, clientIp);
  if (!result.success) {
    return res.status(result.statusCode || 400).json({ error: result.error });
  }
  res.status(201).json(result.handover);
});

apiRouter.post('/tracking/handovers/:id/acknowledge', (req: AuthedRequest, res: Response) => {
  const actor = getCurrentUser(req);
  const clientIp = req.ip || '127.0.0.1';
  const result = store.acknowledgePhysicalHandover(req.params.id, req.body || {}, actor, clientIp);
  if (!result.success) {
    return res.status(result.statusCode || 400).json({ error: result.error });
  }
  res.json(result.handover);
});

apiRouter.get('/tracking/missing-incidents', (_req: Request, res: Response) => {
  res.json(store.getMissingIncidents());
});

apiRouter.post('/tracking/missing-report', (req: AuthedRequest, res: Response) => {
  const actor = getCurrentUser(req);
  const clientIp = req.ip || '127.0.0.1';
  const result = store.reportMissingPhysicalFile(req.body || {}, actor, clientIp);
  if (!result.success) {
    return res.status(result.statusCode || 400).json({ error: result.error });
  }
  res.status(201).json({
    success: true,
    incident: result.incident,
    message: `Missing incident logged for ${result.incident?.registrationNumber}`
  });
});

apiRouter.post('/tracking/missing-incidents/:id/resolve', (req: AuthedRequest, res: Response) => {
  const actor = getCurrentUser(req);
  const clientIp = req.ip || '127.0.0.1';
  const result = store.resolveMissingIncident(req.params.id, req.body || {}, actor, clientIp);
  if (!result.success) {
    return res.status(result.statusCode || 400).json({ error: result.error });
  }
  res.json(result.incident);
});

// 6. Records Management, Retention Schedules, Legal Holds, Archive & Disposal
apiRouter.get('/records/schedules', (_req: Request, res: Response) => {
  res.json(store.getRetentionSchedules());
});

apiRouter.post('/records/schedules', (req: AuthedRequest, res: Response) => {
  const actor = getCurrentUser(req);
  const clientIp = req.ip || '127.0.0.1';
  const result = store.createRetentionSchedule(req.body || {}, actor, clientIp);
  if (!result.success) {
    return res.status(result.statusCode || 400).json({ error: result.error });
  }
  res.status(201).json(result.schedule);
});

apiRouter.put('/records/schedules/:id', (req: AuthedRequest, res: Response) => {
  const actor = getCurrentUser(req);
  const clientIp = req.ip || '127.0.0.1';
  const result = store.updateRetentionSchedule(req.params.id, req.body || {}, actor, clientIp);
  if (!result.success) {
    return res.status(result.statusCode || 400).json({ error: result.error });
  }
  res.json(result.schedule);
});

apiRouter.delete('/records/schedules/:id', (req: AuthedRequest, res: Response) => {
  const actor = getCurrentUser(req);
  const clientIp = req.ip || '127.0.0.1';
  const result = store.deleteRetentionSchedule(req.params.id, actor, clientIp);
  if (!result.success) {
    return res.status(result.statusCode || 400).json({ error: result.error });
  }
  res.json({ success: true });
});

apiRouter.post('/records/documents/:id/assign-schedule', (req: AuthedRequest, res: Response) => {
  const actor = getCurrentUser(req);
  const clientIp = req.ip || '127.0.0.1';
  const result = store.assignRetentionScheduleToDocument(req.params.id, req.body?.scheduleId, actor, clientIp);
  if (!result.success) {
    return res.status(result.statusCode || 400).json({ error: result.error });
  }
  res.json(result.document);
});

apiRouter.post('/records/legal-hold/:id', (req: AuthedRequest, res: Response) => {
  const actor = getCurrentUser(req);
  const clientIp = req.ip || '127.0.0.1';
  const result = store.setLegalHoldWithReason(req.params.id, req.body || {}, actor, clientIp);
  if (!result.success) {
    return res.status(result.statusCode || 400).json({ error: result.error });
  }
  res.json({ success: true, legalHold: result.legalHold, document: result.document });
});

apiRouter.post('/records/archive/:id', (req: AuthedRequest, res: Response) => {
  const actor = getCurrentUser(req);
  const clientIp = req.ip || '127.0.0.1';
  const result = store.transferToArchive(req.params.id, req.body || {}, actor, clientIp);
  if (!result.success) {
    return res.status(result.statusCode || 400).json({ error: result.error });
  }
  res.json(result.document);
});

apiRouter.get('/records/retrievals', (_req: Request, res: Response) => {
  res.json(store.getArchiveRetrievals());
});

apiRouter.post('/records/retrievals', (req: AuthedRequest, res: Response) => {
  const actor = getCurrentUser(req);
  const clientIp = req.ip || '127.0.0.1';
  const result = store.requestArchiveRetrieval(req.body || {}, actor, clientIp);
  if (!result.success) {
    return res.status(result.statusCode || 400).json({ error: result.error });
  }
  res.status(201).json(result.retrieval);
});

apiRouter.post('/records/retrievals/:id/status', (req: AuthedRequest, res: Response) => {
  const actor = getCurrentUser(req);
  const clientIp = req.ip || '127.0.0.1';
  const result = store.updateArchiveRetrievalStatus(req.params.id, req.body || {}, actor, clientIp);
  if (!result.success) {
    return res.status(result.statusCode || 400).json({ error: result.error });
  }
  res.json(result.retrieval);
});

apiRouter.get('/records/disposals', (_req: Request, res: Response) => {
  res.json(store.getDisposalRequests());
});

apiRouter.post('/records/disposals', (req: AuthedRequest, res: Response) => {
  const actor = getCurrentUser(req);
  const clientIp = req.ip || '127.0.0.1';
  const result = store.createDisposalRequest(req.body || {}, actor, clientIp);
  if (!result.success) {
    return res.status(result.statusCode || 400).json({ error: result.error });
  }
  res.status(201).json(result.request);
});

apiRouter.post('/records/disposals/:id/decide', (req: AuthedRequest, res: Response) => {
  const actor = getCurrentUser(req);
  const clientIp = req.ip || '127.0.0.1';
  const result = store.decideDisposalRequest(req.params.id, req.body || {}, actor, clientIp);
  if (!result.success) {
    return res.status(result.statusCode || 400).json({ error: result.error });
  }
  res.json(result.request);
});

apiRouter.post('/records/disposals/:id/execute', (req: AuthedRequest, res: Response) => {
  const actor = getCurrentUser(req);
  const clientIp = req.ip || '127.0.0.1';
  const result = store.executeDisposalRequest(req.params.id, actor, clientIp);
  if (!result.success) {
    return res.status(result.statusCode || 400).json({ error: result.error });
  }
  res.json({ success: true, request: result.request, certificate: result.certificate });
});

apiRouter.get('/records/certificates', (_req: Request, res: Response) => {
  res.json(store.getDisposalCertificates());
});

// 7. Executive Analytics & KPIs
apiRouter.get('/analytics/kpis', (_req: Request, res: Response) => {
  res.json(store.getExecutiveKpis());
});

// 8. Audit Logs
apiRouter.get('/audit/logs', (req: AuthedRequest, res: Response) => {
  const actor = getCurrentUser(req);
  if (!store.hasPermission(actor, 'read:audit')) {
    return res.status(403).json({ error: 'Forbidden: read:audit permission required.' });
  }
  res.json(store.getAuditLogs());
});

// 9. Notifications (SignalR / Live Dispatch Queue)
apiRouter.get('/notifications', (_req: Request, res: Response) => {
  res.json(store.getNotifications());
});

apiRouter.post('/notifications/:id/read', (req: Request, res: Response) => {
  const success = store.markNotificationRead(req.params.id);
  res.json({ success });
});

// 10. Enterprise Integration Connectors (SAP S/4HANA, Active Directory, SMS, EFDA)
apiRouter.get('/integrations/connectors', (_req: Request, res: Response) => {
  res.json(store.getConnectors());
});

apiRouter.post('/integrations/connectors/:id/test', (req: AuthedRequest, res: Response) => {
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
apiRouter.get('/admin/backups', (req: AuthedRequest, res: Response) => {
  const actor = getCurrentUser(req);
  if (!store.hasPermission(actor, 'read:audit')) {
    return res.status(403).json({ error: 'Forbidden: read:audit permission required.' });
  }
  res.json(store.listBackups());
});

apiRouter.post('/admin/backup', (req: AuthedRequest, res: Response) => {
  const actor = getCurrentUser(req);
  if (actor.role !== 'SuperAdmin' && actor.role !== 'DirectorGeneral') {
    return res.status(403).json({ error: 'Forbidden: Backup creation requires SuperAdmin or DirectorGeneral.' });
  }
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

apiRouter.post('/admin/restore', (req: AuthedRequest, res: Response) => {
  const actor = getCurrentUser(req);
  if (actor.role !== 'SuperAdmin') {
    return res.status(403).json({ error: 'Forbidden: Database restore strictly requires SuperAdmin role.' });
  }
  const { filename } = req.body;
  if (!filename) {
    return res.status(400).json({ error: 'Filename is required for restore' });
  }

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

// 12. Phase 2: Google Drive-like Workspace API
apiRouter.get('/workspace/items', (req: Request, res: Response) => {
  const actor = getCurrentUser(req);
  const { parentId, view, q } = req.query;
  const result = store.getWorkspaceItems({
    parentId: parentId && parentId !== 'null' ? String(parentId) : null,
    view: (view as 'drive' | 'starred' | 'shared' | 'trash') || 'drive',
    q: q ? String(q) : '',
    userId: actor.id,
    userRole: actor.role
  });
  res.json(result);
});

apiRouter.get('/workspace/items/:id', (req: Request, res: Response) => {
  const item = store.getWorkspaceItemById(req.params.id);
  if (!item) {
    return res.status(404).json({ error: 'Workspace item not found' });
  }
  const breadcrumbs = store.getWorkspaceBreadcrumbs(item.parentId);
  res.json({ item, breadcrumbs });
});

apiRouter.post('/workspace/folders', (req: Request, res: Response) => {
  const actor = getCurrentUser(req);
  const clientIp = req.ip || '127.0.0.1';
  const { name, parentId } = req.body;
  const result = store.createWorkspaceFolder(name, parentId || null, actor, clientIp);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }
  res.status(201).json(result.item);
});

apiRouter.post('/workspace/upload', (req: Request, res: Response) => {
  workspaceUpload.array('files', 20)(req, res, (err: any) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File exceeds maximum allowed limit (50 MB).' });
      }
      return res.status(400).json({ error: err.message || 'Multipart upload failed.' });
    }

    const actor = getCurrentUser(req);
    const clientIp = req.ip || '127.0.0.1';
    const files = (req.files as Express.Multer.File[]) || [];

    if (files.length === 0) {
      return res.status(400).json({ error: 'No files provided in upload request.' });
    }

    const parentId = req.body.parentId && req.body.parentId !== 'null' ? String(req.body.parentId) : null;
    const targetFileId = req.body.targetFileId ? String(req.body.targetFileId) : undefined;
    const versionNotes = req.body.versionNotes ? String(req.body.versionNotes) : undefined;

    const uploadedItems: any[] = [];
    const errors: { fileName: string; error: string; statusCode?: number }[] = [];

    for (const file of files) {
      const result = store.uploadWorkspaceFile({
        fileName: file.originalname,
        mimeType: file.mimetype,
        buffer: file.buffer,
        parentId,
        targetFileId: files.length === 1 ? targetFileId : undefined,
        versionNotes,
        actor,
        clientIp
      });

      if (result.success && result.item) {
        uploadedItems.push(result.item);
      } else {
        errors.push({
          fileName: file.originalname,
          error: result.error || 'Upload validation failed.',
          statusCode: result.statusCode || 400
        });
      }
    }

    if (uploadedItems.length === 0) {
      return res.status(errors[0]?.statusCode || 422).json({
        error: errors[0]?.error || 'All uploaded files failed security validation.',
        items: [],
        errors
      });
    }

    if (errors.length > 0) {
      return res.status(207).json({
        items: uploadedItems,
        errors,
        message: `${uploadedItems.length} file(s) uploaded; ${errors.length} blocked by validation.`
      });
    }

    res.status(201).json({
      items: uploadedItems,
      errors: []
    });
  });
});

apiRouter.get('/workspace/items/:id/download', (req: Request, res: Response) => {
  const actor = getCurrentUser(req);
  const item = store.getWorkspaceItemById(req.params.id);
  if (!item || item.itemType !== 'file') {
    return res.status(404).json({ error: 'File not found' });
  }
  if (item.virusScanStatus !== 'Clean') {
    return res.status(403).json({ error: 'File is quarantined or pending malware scan and cannot be accessed.' });
  }

  const requestedVersion = req.query.version ? Number(req.query.version) : undefined;
  const versionObj = requestedVersion
    ? (item.versions || []).find(v => v.versionNumber === requestedVersion)
    : (item.versions || []).find(v => v.versionNumber === item.currentVersion) || item.versions?.[0];

  const storageKey = versionObj?.storageKey || item.storageKey;
  if (!storageKey) {
    return res.status(404).json({ error: 'File storage key not found' });
  }

  const diskPath = store.getWorkspaceFileDiskPath(storageKey);
  if (!diskPath) {
    return res.status(404).json({ error: 'Binary file missing on storage volume' });
  }

  const isInline = req.query.inline === '1' || req.query.inline === 'true';
  if (!isInline) {
    store.recordWorkspaceDownload(item.id, actor);
  }

  const mimeType = versionObj?.mimeType || item.mimeType || 'application/octet-stream';
  const fileName = versionObj?.fileName || item.name;
  const safeFileName = encodeURIComponent(fileName).replace(/['()]/g, escape);

  res.setHeader('Content-Type', mimeType);
  res.setHeader(
    'Content-Disposition',
    isInline
      ? `inline; filename*=UTF-8''${safeFileName}`
      : `attachment; filename*=UTF-8''${safeFileName}`
  );

  res.sendFile(path.resolve(diskPath));
});

apiRouter.put('/workspace/items/:id/rename', (req: Request, res: Response) => {
  const actor = getCurrentUser(req);
  const clientIp = req.ip || '127.0.0.1';
  const result = store.renameWorkspaceItem(req.params.id, req.body.name, actor, clientIp);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }
  res.json(result.item);
});

apiRouter.post('/workspace/items/:id/move', (req: Request, res: Response) => {
  const actor = getCurrentUser(req);
  const clientIp = req.ip || '127.0.0.1';
  const targetParentId = req.body.targetParentId && req.body.targetParentId !== 'null' ? req.body.targetParentId : null;
  const result = store.moveWorkspaceItem(req.params.id, targetParentId, actor, clientIp);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }
  res.json(result.item);
});

apiRouter.post('/workspace/items/:id/star', (req: Request, res: Response) => {
  const actor = getCurrentUser(req);
  const updated = store.toggleStarWorkspaceItem(req.params.id, actor);
  if (!updated) {
    return res.status(404).json({ error: 'Workspace item not found' });
  }
  res.json(updated);
});

apiRouter.post('/workspace/items/:id/trash', (req: Request, res: Response) => {
  const actor = getCurrentUser(req);
  const clientIp = req.ip || '127.0.0.1';
  const updated = store.trashWorkspaceItem(req.params.id, actor, clientIp);
  if (!updated) {
    return res.status(404).json({ error: 'Workspace item not found' });
  }
  res.json(updated);
});

apiRouter.post('/workspace/items/:id/restore', (req: Request, res: Response) => {
  const actor = getCurrentUser(req);
  const clientIp = req.ip || '127.0.0.1';
  const result = store.restoreWorkspaceItem(req.params.id, actor, clientIp);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }
  res.json(result.item);
});

apiRouter.delete('/workspace/items/:id/permanent', (req: Request, res: Response) => {
  const actor = getCurrentUser(req);
  const clientIp = req.ip || '127.0.0.1';
  const result = store.permanentlyDeleteWorkspaceItem(req.params.id, actor, clientIp);
  if (!result.success) {
    return res.status(403).json({ error: result.error });
  }
  res.json({ success: true });
});

apiRouter.post('/workspace/items/:id/share', (req: Request, res: Response) => {
  const actor = getCurrentUser(req);
  const clientIp = req.ip || '127.0.0.1';
  const result = store.shareWorkspaceItem(req.params.id, req.body, actor, clientIp);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }
  res.json(result.item);
});

apiRouter.delete('/workspace/items/:id/share/:shareId', (req: Request, res: Response) => {
  const actor = getCurrentUser(req);
  const clientIp = req.ip || '127.0.0.1';
  const updated = store.removeShareWorkspaceItem(req.params.id, req.params.shareId, actor, clientIp);
  if (!updated) {
    return res.status(404).json({ error: 'Workspace item not found' });
  }
  res.json(updated);
});

apiRouter.post('/workspace/items/:id/versions/:versionNumber/restore', (req: Request, res: Response) => {
  const actor = getCurrentUser(req);
  const clientIp = req.ip || '127.0.0.1';
  const verNum = Number(req.params.versionNumber);
  if (Number.isNaN(verNum)) {
    return res.status(400).json({ error: 'Invalid version number' });
  }
  const result = store.restoreWorkspaceFileVersion(req.params.id, verNum, actor, clientIp);
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }
  res.json(result.item);
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
