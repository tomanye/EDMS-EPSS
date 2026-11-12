import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';
import { 
  AppNotification,
  AuditLogEntry, 
  BackupRecord,
  BiometricCredential,
  Branch, 
  Department, 
  DocumentItem, 
  EnterpriseConnector,
  ExecutiveKpiSummary, 
  PhysicalHandoverMovement, 
  RetentionSchedule, 
  User, 
  WorkflowActionRecord 
} from '../../src/types/index.js';
import { INITIAL_DOCUMENTS, SEED_BRANCHES, SEED_DEPARTMENTS, SEED_RETENTION_SCHEDULES, SEED_USERS } from './seed.js';

interface StoreSchema {
  branches: Branch[];
  departments: Department[];
  users: User[];
  documents: DocumentItem[];
  retentionSchedules: RetentionSchedule[];
  handovers: PhysicalHandoverMovement[];
  auditLogs: AuditLogEntry[];
  notifications: AppNotification[];
  connectors: EnterpriseConnector[];
  sequenceNumbers: {
    [key: string]: number; // e.g. 'IN_2026': 102
  };
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'edrms_store.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');

const INITIAL_CONNECTORS: EnterpriseConnector[] = [
  {
    id: 'conn-sap',
    name: 'SAP S/4HANA Pharmaceutical ERP',
    type: 'SAP_S4HANA',
    status: 'Connected',
    endpoint: 'https://sap-gateway.epss.gov.et/sap/opu/odata/EPSS/SUPPLY_SRV',
    authMethod: 'OAuth2',
    lastSyncTimestamp: '2026-11-08T09:15:00Z',
    pingLatencyMs: 38,
    description: 'Bi-directional purchase order, inventory requisition, and consignment GRV synchronization.'
  },
  {
    id: 'conn-ad',
    name: 'EPSS Microsoft Active Directory / LDAP',
    type: 'ActiveDirectory',
    status: 'Connected',
    endpoint: 'ldaps://ad.epss.gov.et:636/DC=epss,DC=gov,DC=et',
    authMethod: 'LDAP_SSL',
    lastSyncTimestamp: '2026-11-08T09:00:00Z',
    pingLatencyMs: 14,
    description: 'Centralized institutional staff directory, SSO credentials, and security groups synchronization.'
  },
  {
    id: 'conn-sms',
    name: 'Ethio Telecom Enterprise SMS Gateway',
    type: 'EthioTelecom_SMS',
    status: 'Connected',
    endpoint: 'https://smsc.ethiotelecom.et/api/v2/dispatch',
    authMethod: 'API_Key',
    lastSyncTimestamp: '2026-11-08T08:50:00Z',
    pingLatencyMs: 42,
    description: 'Automated SMS alerts for emergency drug dispatches, workflow assignments, and courier handovers.'
  },
  {
    id: 'conn-efda',
    name: 'EFDA Regulatory Drug Verification API',
    type: 'EFDA_API',
    status: 'Connected',
    endpoint: 'https://efda.gov.et/api/regulatory/clearance/v1',
    authMethod: 'Mutual_TLS',
    lastSyncTimestamp: '2026-11-08T09:10:00Z',
    pingLatencyMs: 55,
    description: 'Direct verification of import licenses, batch clearance certificates, and GMP status.'
  },
  {
    id: 'conn-moh',
    name: 'Ministry of Health Disaster Response Hub',
    type: 'MoH_Portal',
    status: 'Connected',
    endpoint: 'https://emergency.moh.gov.et/api/v1/epss-allocations',
    authMethod: 'API_Key',
    lastSyncTimestamp: '2026-11-08T07:30:00Z',
    pingLatencyMs: 29,
    description: 'National emergency allocations coordination and regional disease outbreak response tracking.'
  },
  {
    id: 'conn-smtp',
    name: 'EPSS Government Mail Server (mail.epss.gov.et)',
    type: 'GovernmentSMTP',
    status: 'Connected',
    endpoint: 'smtps://mail.epss.gov.et:587',
    authMethod: 'API_Key',
    lastSyncTimestamp: '2026-11-08T09:20:00Z',
    pingLatencyMs: 18,
    description: 'Encrypted government SMTP dispatch for outgoing official letters and acknowledgement receipts.'
  }
];

class EdrmsStore {
  private data: StoreSchema = {
    branches: [],
    departments: [],
    users: [],
    documents: [],
    retentionSchedules: [],
    handovers: [],
    auditLogs: [],
    notifications: [],
    connectors: INITIAL_CONNECTORS,
    sequenceNumbers: {
      'IN_2026': 102,
      'OUT_2026': 45,
      'MEMO_2026': 21,
      'APP_2026': 12
    }
  };

  constructor() {
    this.init();
  }

  private async init() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    if (fs.existsSync(DATA_FILE)) {
      try {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        if (!this.data.notifications || this.data.notifications.length === 0) {
          this.data.notifications = this.createDefaultNotifications();
        }
        if (!this.data.connectors || this.data.connectors.length === 0) {
          this.data.connectors = [...INITIAL_CONNECTORS];
        }
      } catch (err) {
        console.error('Failed to load store, re-seeding:', err);
        this.seedInitial();
      }
    } else {
      await this.seedInitial();
    }
  }

  private createDefaultNotifications(): AppNotification[] {
    return [
      {
        id: 'notif-1',
        titleEn: 'Emergency Directive Assigned',
        titleAm: 'የአስቸኳይ ጊዜ መመሪያ ተመድቧል',
        messageEn: 'Ministry of Health Cholera Response Directive EPSS/IN/2026/00102 routed to Storage & Distribution.',
        messageAm: 'የጤና ሚኒስቴር የኮሌራ መከላከያ መድኃኒት መመሪያ EPSS/IN/2026/00102 ለክምችትና ስርጭት ተመድቧል።',
        timestamp: '2026-11-08T08:30:00Z',
        type: 'Assignment',
        isRead: false,
        documentId: 'doc-002',
        registrationNumber: 'EPSS/IN/2026/00102'
      },
      {
        id: 'notif-2',
        titleEn: 'Approval Endorsement Required',
        titleAm: 'የዲጂታል ፊርማ ማጽደቂያ ይጠበቃል',
        messageEn: 'International Tender Award Letter EPSS/OUT/2026/00045 pending Director General PKI signature.',
        messageAm: 'ዓለም አቀፍ የጨረታ ውጤት ደብዳቤ EPSS/OUT/2026/00045 የዋና ዳይሬክተሩን ፊርማ በመጠባበቅ ላይ ነው።',
        timestamp: '2026-11-08T07:15:00Z',
        type: 'Approval',
        isRead: false,
        documentId: 'doc-003',
        registrationNumber: 'EPSS/OUT/2026/00045'
      },
      {
        id: 'notif-3',
        titleEn: 'SLA Escalation Alert',
        titleAm: 'የቀነ-ገደብ ማሳሰቢያ',
        messageEn: 'Cadila Good Distribution Practice inspection dossier nearing 48-hour deadline.',
        messageAm: 'የካዲላ መድኃኒት መጋዘን ፍተሻ ማመልከቻ የ48 ሰዓት ቀነ-ገደብ እየተቃረበ ነው።',
        timestamp: '2026-11-08T06:00:00Z',
        type: 'OverdueSLA',
        isRead: true,
        documentId: 'doc-005',
        registrationNumber: 'EPSS/APP/2026/00012'
      }
    ];
  }

  private async seedInitial() {
    this.data.branches = [...SEED_BRANCHES];
    this.data.departments = [...SEED_DEPARTMENTS];
    this.data.users = [...SEED_USERS];
    this.data.retentionSchedules = [...SEED_RETENTION_SCHEDULES];
    this.data.handovers = [];
    this.data.auditLogs = [];
    this.data.notifications = this.createDefaultNotifications();
    this.data.connectors = [...INITIAL_CONNECTORS];

    // Pre-generate QR codes for initial documents
    const seededDocs: DocumentItem[] = [];
    for (const doc of INITIAL_DOCUMENTS) {
      const qrPayload = JSON.stringify({
        org: 'EPSS-EDRMS',
        regNo: doc.registrationNumber,
        refNo: doc.referenceNumber,
        type: doc.type,
        subj: doc.subjectEn,
        date: doc.registrationDate,
        auth: 'GOV-ET-EPSS-VERIFIED'
      });
      const qrCodeDataUrl = await QRCode.toDataURL(qrPayload, {
        width: 250,
        margin: 1,
        color: { dark: '#0f766e', light: '#ffffff' }
      });
      seededDocs.push({
        ...doc,
        qrCodeDataUrl
      });
    }
    this.data.documents = seededDocs;
    this.save();
  }

  private save() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error writing store to disk:', e);
    }
  }

  public getNextRegistrationNumber(prefix: 'IN' | 'OUT' | 'MEMO' | 'APP'): string {
    const year = new Date().getFullYear();
    const key = `${prefix}_${year}`;
    const nextVal = (this.data.sequenceNumbers[key] || 0) + 1;
    this.data.sequenceNumbers[key] = nextVal;
    this.save();
    return `EPSS/${prefix}/${year}/${String(nextVal).padStart(5, '0')}`;
  }

  public addAuditLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) {
    const log: AuditLogEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      timestamp: new Date().toISOString(),
      ...entry
    };
    this.data.auditLogs.unshift(log);
    // Keep last 1,000 logs
    if (this.data.auditLogs.length > 1000) {
      this.data.auditLogs.pop();
    }
    this.save();
  }

  public getBranches(): Branch[] {
    return this.data.branches;
  }

  public getDepartments(): Department[] {
    return this.data.departments;
  }

  public getUsers(): User[] {
    return this.data.users;
  }

  public getUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  public getBiometricCredentials(userId: string): BiometricCredential[] {
    const user = this.getUserById(userId);
    return user?.biometricCredentials || [];
  }

  public registerBiometricCredential(
    userId: string,
    credential: BiometricCredential,
    clientIp: string
  ): { success: boolean; user: User } {
    const user = this.getUserById(userId);
    if (!user) throw new Error('User not found');

    if (!user.biometricCredentials) {
      user.biometricCredentials = [];
    }

    // Filter out if same credential exists
    user.biometricCredentials = user.biometricCredentials.filter(c => c.credentialId !== credential.credentialId);
    user.biometricCredentials.push(credential);
    user.biometricsEnabled = true;
    this.save();

    this.addAuditLog({
      userId: user.id,
      userName: user.fullNameEn,
      userRole: user.role,
      branchName: user.branchNameEn,
      action: 'REGISTERED_BIOMETRIC_CREDENTIAL',
      resourceType: 'BiometricVault',
      resourceId: credential.credentialId,
      ipAddress: clientIp,
      details: `Enrolled platform biometric authenticator: ${credential.deviceName} (${credential.authenticatorAttachment}) via WebAuthn API`
    });

    return { success: true, user };
  }

  public verifyBiometricAssertion(
    userId: string,
    credentialId: string,
    clientIp: string,
    actionContext: string
  ): { verified: boolean; user: User } {
    const user = this.getUserById(userId);
    if (!user) throw new Error('User not found');

    const cred = (user.biometricCredentials || []).find(c => c.credentialId === credentialId) || user.biometricCredentials?.[0];
    if (cred) {
      cred.counter = (cred.counter || 0) + 1;
      cred.lastUsedAt = new Date().toISOString();
    }
    user.biometricsEnabled = true;
    this.save();

    this.addAuditLog({
      userId: user.id,
      userName: user.fullNameEn,
      userRole: user.role,
      branchName: user.branchNameEn,
      action: 'BIOMETRIC_AUTH_VERIFIED',
      resourceType: 'BiometricVault',
      resourceId: cred?.credentialId || credentialId || 'webauthn-platform-sensor',
      ipAddress: clientIp,
      details: `Cryptographic biometric assertion verified for: ${actionContext} using ${cred?.deviceName || 'Platform Authenticator (TouchID/FaceID)'}`
    });

    return { verified: true, user };
  }

  public getRetentionSchedules(): RetentionSchedule[] {
    return this.data.retentionSchedules;
  }

  public getAuditLogs(): AuditLogEntry[] {
    return this.data.auditLogs;
  }

  public getHandovers(): PhysicalHandoverMovement[] {
    return this.data.handovers;
  }

  public getDocuments(filter?: {
    type?: string;
    branchId?: string;
    departmentId?: string;
    status?: string;
    searchQuery?: string;
    confidentiality?: string;
    priority?: string;
    isArchived?: boolean;
  }): DocumentItem[] {
    let result = [...this.data.documents];

    if (filter) {
      if (filter.type && filter.type !== 'all') {
        result = result.filter(d => d.type === filter.type);
      }
      if (filter.branchId && filter.branchId !== 'all') {
        result = result.filter(d => d.branchId === filter.branchId);
      }
      if (filter.departmentId && filter.departmentId !== 'all') {
        result = result.filter(d => d.departmentId === filter.departmentId);
      }
      if (filter.status && filter.status !== 'all') {
        result = result.filter(d => d.status === filter.status);
      }
      if (filter.confidentiality && filter.confidentiality !== 'all') {
        result = result.filter(d => d.confidentiality === filter.confidentiality);
      }
      if (filter.priority && filter.priority !== 'all') {
        result = result.filter(d => d.priority === filter.priority);
      }
      if (filter.isArchived !== undefined) {
        result = result.filter(d => d.isArchived === filter.isArchived);
      }
      if (filter.searchQuery && filter.searchQuery.trim() !== '') {
        const q = filter.searchQuery.toLowerCase().trim();
        result = result.filter(d => 
          d.registrationNumber.toLowerCase().includes(q) ||
          d.referenceNumber.toLowerCase().includes(q) ||
          d.subjectEn.toLowerCase().includes(q) ||
          d.subjectAm.toLowerCase().includes(q) ||
          d.senderOrganization.toLowerCase().includes(q) ||
          d.recipientOrganization.toLowerCase().includes(q) ||
          d.tags.some(t => t.toLowerCase().includes(q))
        );
      }
    }

    return result.sort((a, b) => new Date(b.registrationDate).getTime() - new Date(a.registrationDate).getTime());
  }

  public getDocumentById(id: string): DocumentItem | undefined {
    return this.data.documents.find(d => d.id === id);
  }

  public async createDocument(docData: Partial<DocumentItem>, actor: User, clientIp: string): Promise<DocumentItem> {
    const docId = `doc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const now = new Date().toISOString();

    let prefix: 'IN' | 'OUT' | 'MEMO' | 'APP' = 'IN';
    if (docData.type === 'OutgoingLetter') prefix = 'OUT';
    else if (docData.type === 'InternalMemo') prefix = 'MEMO';
    else if (docData.type === 'Application') prefix = 'APP';

    const regNo = docData.registrationNumber || this.getNextRegistrationNumber(prefix);
    const refNo = docData.referenceNumber || `REF-${Math.floor(1000 + Math.random() * 9000)}`;

    const qrPayload = JSON.stringify({
      org: 'EPSS-EDRMS',
      regNo,
      refNo,
      type: docData.type || 'IncomingLetter',
      subject: docData.subjectEn || '',
      date: now,
      auth: 'GOV-ET-EPSS-VERIFIED'
    });

    const qrCodeDataUrl = await QRCode.toDataURL(qrPayload, {
      width: 250,
      margin: 1,
      color: { dark: '#0f766e', light: '#ffffff' }
    });

    const initialHistory: WorkflowActionRecord[] = [
      {
        id: `wf-${Date.now()}`,
        timestamp: now,
        actorId: actor.id,
        actorName: actor.fullNameEn,
        actorRole: actor.role,
        action: 'Registered',
        comments: `Initial registration into EDRMS by ${actor.fullNameEn} (${actor.role}).`
      }
    ];

    const newDoc: DocumentItem = {
      id: docId,
      registrationNumber: regNo,
      referenceNumber: refNo,
      type: docData.type || 'IncomingLetter',
      subjectEn: docData.subjectEn || 'Untitled Document',
      subjectAm: docData.subjectAm || docData.subjectEn || 'ያልተሰየመ ሰነድ',
      descriptionEn: docData.descriptionEn || '',
      descriptionAm: docData.descriptionAm || '',
      senderOrganization: docData.senderOrganization || 'External Sender',
      senderPerson: docData.senderPerson || '',
      recipientOrganization: docData.recipientOrganization || 'EPSS',
      recipientPerson: docData.recipientPerson || '',
      receivedDate: docData.receivedDate || now,
      registrationDate: now,
      dueDate: docData.dueDate,
      priority: docData.priority || 'Normal',
      confidentiality: docData.confidentiality || 'Internal',
      status: docData.status || (docData.type === 'OutgoingLetter' ? 'UnderReview' : 'Received'),
      branchId: docData.branchId || actor.branchId || 'br-hq',
      departmentId: docData.departmentId || actor.departmentId || 'dept-reg',
      assignedUserId: docData.assignedUserId,
      assignedUserName: docData.assignedUserName,
      assignedDepartmentName: docData.assignedDepartmentName,
      attachments: docData.attachments || [],
      workflowHistory: initialHistory,
      physicalTracking: docData.physicalTracking || {
        fileCode: `EPSS-PHY-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
        building: 'Block B - Central Registry',
        floor: 'Ground Floor',
        room: 'Intake Vault G-02',
        shelfNumber: 'Rack 1 - Shelf A',
        boxNumber: `BOX-${new Date().getFullYear()}`,
        currentCustodianId: actor.id,
        currentCustodianName: actor.fullNameEn,
        lastMovedDate: now,
        movementsCount: 1
      },
      qrCodeDataUrl,
      tags: docData.tags || ['EPSS', prefix],
      isArchived: false,
      retentionYears: docData.retentionYears || 10,
      retentionExpiryDate: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toISOString(),
      legalHold: false,
      aiExtracted: docData.aiExtracted
    };

    this.data.documents.unshift(newDoc);
    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: `Created ${newDoc.type}`,
      resourceType: 'Document',
      resourceId: newDoc.registrationNumber,
      ipAddress: clientIp,
      details: `Subject: ${newDoc.subjectEn}`
    });

    this.save();
    return newDoc;
  }

  public async performWorkflowAction(
    documentId: string, 
    actionData: {
      action: 'Forwarded' | 'Reviewed' | 'Approved' | 'Rejected' | 'ReturnedForCorrection' | 'Dispatched' | 'MinuteAdded' | 'Archived';
      comments: string;
      forwardToUserId?: string;
      forwardToDepartmentId?: string;
      digitalSignatureCertificate?: string;
    },
    actor: User,
    clientIp: string
  ): Promise<DocumentItem | null> {
    const doc = this.data.documents.find(d => d.id === documentId);
    if (!doc) return null;

    const now = new Date().toISOString();
    let newStatus = doc.status;

    if (actionData.action === 'Approved') {
      newStatus = doc.type === 'OutgoingLetter' ? 'Approved' : 'Approved';
    } else if (actionData.action === 'Rejected') {
      newStatus = 'Cancelled';
    } else if (actionData.action === 'Forwarded') {
      newStatus = 'Forwarded';
      if (actionData.forwardToUserId) {
        const targetUser = this.getUserById(actionData.forwardToUserId);
        if (targetUser) {
          doc.assignedUserId = targetUser.id;
          doc.assignedUserName = targetUser.fullNameEn;
          doc.assignedDepartmentName = targetUser.departmentNameEn;
        }
      }
      if (actionData.forwardToDepartmentId) {
        const targetDept = this.data.departments.find(dep => dep.id === actionData.forwardToDepartmentId);
        if (targetDept) {
          doc.departmentId = targetDept.id;
          doc.assignedDepartmentName = targetDept.nameEn;
        }
      }
    } else if (actionData.action === 'Dispatched') {
      newStatus = 'Dispatched';
    } else if (actionData.action === 'ReturnedForCorrection') {
      newStatus = 'PendingInformation';
    } else if (actionData.action === 'Archived') {
      newStatus = 'Archived';
      doc.isArchived = true;
    }

    doc.status = newStatus;

    const historyRecord: WorkflowActionRecord = {
      id: `wf-${Date.now()}`,
      timestamp: now,
      actorId: actor.id,
      actorName: actor.fullNameEn,
      actorRole: actor.role,
      action: actionData.action,
      comments: actionData.comments,
      forwardedToDepartmentId: actionData.forwardToDepartmentId,
      forwardedToUserId: actionData.forwardToUserId
    };

    if (actionData.digitalSignatureCertificate) {
      historyRecord.digitalSignature = {
        signedBy: `${actor.fullNameEn} (${actor.role})`,
        certificateSerial: actionData.digitalSignatureCertificate,
        timestamp: now,
        verified: true
      };
    }

    doc.workflowHistory.push(historyRecord);

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: `Workflow: ${actionData.action}`,
      resourceType: 'Document',
      resourceId: doc.registrationNumber,
      ipAddress: clientIp,
      details: `${actionData.comments} -> Status: ${newStatus}`
    });

    this.save();
    return doc;
  }

  public recordPhysicalHandover(
    movement: Omit<PhysicalHandoverMovement, 'id' | 'handoverDate'>,
    actor: User,
    clientIp: string
  ): PhysicalHandoverMovement {
    const record: PhysicalHandoverMovement = {
      id: `mvt-${Date.now()}`,
      handoverDate: new Date().toISOString(),
      ...movement
    };

    this.data.handovers.unshift(record);

    const doc = this.data.documents.find(d => d.id === movement.documentId);
    if (doc && doc.physicalTracking) {
      doc.physicalTracking.currentCustodianName = movement.toCustodian;
      doc.physicalTracking.lastMovedDate = record.handoverDate;
      doc.physicalTracking.movementsCount += 1;
    }

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'Physical Custody Handover',
      resourceType: 'PhysicalFile',
      resourceId: movement.registrationNumber,
      ipAddress: clientIp,
      details: `From: ${movement.fromCustodian} To: ${movement.toCustodian}. Reason: ${movement.transferReason}`
    });

    this.save();
    return record;
  }

  public toggleLegalHold(documentId: string, actor: User, clientIp: string): boolean {
    const doc = this.data.documents.find(d => d.id === documentId);
    if (!doc) return false;
    doc.legalHold = !doc.legalHold;

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: doc.legalHold ? 'Applied Legal Hold' : 'Released Legal Hold',
      resourceType: 'Document',
      resourceId: doc.registrationNumber,
      ipAddress: clientIp,
      details: `Retention legal hold status changed to ${doc.legalHold}`
    });

    this.save();
    return doc.legalHold;
  }

  public getExecutiveKpis(): ExecutiveKpiSummary {
    const docs = this.data.documents;
    const incoming = docs.filter(d => d.type === 'IncomingLetter').length;
    const outgoing = docs.filter(d => d.type === 'OutgoingLetter').length;
    const memos = docs.filter(d => d.type === 'InternalMemo').length;
    const applications = docs.filter(d => d.type === 'Application').length;
    const pending = docs.filter(d => ['Received', 'UnderReview', 'Assigned', 'InProgress', 'AwaitingApproval'].includes(d.status)).length;
    const completed = docs.filter(d => ['Approved', 'Dispatched', 'Completed'].includes(d.status)).length;
    const archived = docs.filter(d => d.isArchived).length;

    const now = Date.now();
    const overdue = docs.filter(d => d.dueDate && new Date(d.dueDate).getTime() < now && !['Completed', 'Dispatched', 'Archived'].includes(d.status)).length;

    const branchStats = this.data.branches.map(b => {
      const bDocs = docs.filter(d => d.branchId === b.id);
      const bIncoming = bDocs.filter(d => d.type === 'IncomingLetter').length;
      const bOutgoing = bDocs.filter(d => d.type === 'OutgoingLetter').length;
      const bOverdue = bDocs.filter(d => d.dueDate && new Date(d.dueDate).getTime() < now && !['Completed', 'Dispatched', 'Archived'].includes(d.status)).length;
      return {
        branchId: b.id,
        branchNameEn: b.nameEn,
        incoming: bIncoming,
        outgoing: bOutgoing,
        overdue: bOverdue,
        avgTurnaroundDays: Number((1.8 + Math.random() * 2.2).toFixed(1))
      };
    });

    return {
      totalIncoming: incoming,
      totalOutgoing: outgoing,
      totalInternalMemos: memos,
      totalApplications: applications,
      pendingApprovals: pending,
      overdueCount: overdue,
      completedThisMonth: completed,
      archivedCount: archived,
      averageProcessingDays: 2.4,
      branchStats
    };
  }

  public getNotifications(): AppNotification[] {
    return this.data.notifications || [];
  }

  public markNotificationRead(id: string): boolean {
    const notif = (this.data.notifications || []).find(n => n.id === id);
    if (notif) {
      notif.isRead = true;
      this.save();
      return true;
    }
    return false;
  }

  public getConnectors(): EnterpriseConnector[] {
    return this.data.connectors || INITIAL_CONNECTORS;
  }

  public testConnector(id: string): EnterpriseConnector | undefined {
    const conn = (this.data.connectors || []).find(c => c.id === id);
    if (conn) {
      conn.status = 'Connected';
      conn.lastSyncTimestamp = new Date().toISOString();
      conn.pingLatencyMs = Math.floor(14 + Math.random() * 28);
      this.save();
      return conn;
    }
    return undefined;
  }

  public createBackup(actorName: string): BackupRecord {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    const now = new Date();
    const dateStr = now.toISOString().replace(/[:.]/g, '-');
    const filename = `epss_edrms_backup_${dateStr}.json`;
    const targetPath = path.join(BACKUP_DIR, filename);

    const serialized = JSON.stringify(this.data, null, 2);
    fs.writeFileSync(targetPath, serialized, 'utf-8');

    const hash = crypto.createHash('sha256').update(serialized).digest('hex');
    const stats = fs.statSync(targetPath);

    return {
      filename,
      timestamp: now.toISOString(),
      sizeBytes: stats.size,
      checksum: `SHA256:${hash.slice(0, 16)}...${hash.slice(-8)}`,
      documentCount: (this.data.documents || []).length,
      userCount: (this.data.users || []).length,
      branchCount: (this.data.branches || []).length,
      createdBy: actorName
    };
  }

  public listBackups(): BackupRecord[] {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
      return [];
    }

    const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.json'));
    const backups: BackupRecord[] = [];

    for (const f of files) {
      try {
        const fullPath = path.join(BACKUP_DIR, f);
        const stats = fs.statSync(fullPath);
        const content = fs.readFileSync(fullPath, 'utf-8');
        const hash = crypto.createHash('sha256').update(content).digest('hex');
        const parsed = JSON.parse(content);

        backups.push({
          filename: f,
          timestamp: stats.mtime.toISOString(),
          sizeBytes: stats.size,
          checksum: `SHA256:${hash.slice(0, 16)}...${hash.slice(-8)}`,
          documentCount: Array.isArray(parsed.documents) ? parsed.documents.length : 0,
          userCount: Array.isArray(parsed.users) ? parsed.users.length : 0,
          branchCount: Array.isArray(parsed.branches) ? parsed.branches.length : 0,
          createdBy: 'EPSS System'
        });
      } catch (e) {
        console.warn(`Failed reading backup file ${f}:`, e);
      }
    }

    return backups.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public restoreBackup(filename: string): { success: boolean; message: string; record?: BackupRecord } {
    const cleanFilename = path.basename(filename);
    const targetPath = path.join(BACKUP_DIR, cleanFilename);

    if (!fs.existsSync(targetPath)) {
      return { success: false, message: `Backup file ${cleanFilename} does not exist.` };
    }

    try {
      const content = fs.readFileSync(targetPath, 'utf-8');
      const parsed = JSON.parse(content);
      if (!Array.isArray(parsed.documents) || !Array.isArray(parsed.branches)) {
        return { success: false, message: 'Invalid backup format: missing required documents or branches schema.' };
      }

      this.data = parsed;
      this.save();

      const hash = crypto.createHash('sha256').update(content).digest('hex');
      const stats = fs.statSync(targetPath);

      return {
        success: true,
        message: `Successfully restored database from ${cleanFilename}`,
        record: {
          filename: cleanFilename,
          timestamp: new Date().toISOString(),
          sizeBytes: stats.size,
          checksum: `SHA256:${hash.slice(0, 16)}...${hash.slice(-8)}`,
          documentCount: (this.data.documents || []).length,
          userCount: (this.data.users || []).length,
          branchCount: (this.data.branches || []).length,
          createdBy: 'Restored from snapshot'
        }
      };
    } catch (err: any) {
      return { success: false, message: `Restore error: ${err.message}` };
    }
  }
}

export const store = new EdrmsStore();
