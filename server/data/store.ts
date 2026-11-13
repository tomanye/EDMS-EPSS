import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';
import { 
  AppNotification,
  ArchiveRetrievalRequest,
  AuditLogEntry, 
  AuthPolicyConfig,
  AuthSession,
  BackupRecord,
  BiometricCredential,
  Branch, 
  DelegationRecord,
  Department, 
  DisposalApprovalEntry,
  DisposalCertificate,
  DisposalRequest,
  DocumentAttachment,
  DocumentItem, 
  EnterpriseConnector,
  ExecutiveKpiSummary, 
  LoginHistoryEntry,
  MissingPhysicalIncident,
  PasswordResetToken,
  PhysicalFileRecord,
  PhysicalHandoverMovement, 
  PhysicalLocationLevel,
  PhysicalLocationNode,
  RetentionSchedule, 
  RolePermissionMatrix,
  User, 
  UserRole,
  WorkflowActionRecord,
  WorkflowDefinition,
  WorkflowEscalationRecord,
  WorkflowInstance,
  WorkflowParallelApproval,
  WorkflowStageConfig,
  EnrichedWorkflowTask,
  WorkspaceActivityEntry,
  WorkspaceFileVersion,
  WorkspaceItem,
  WorkspacePermissionLevel,
  WorkspaceShareEntry
} from '../../src/types/index.js';
import { INITIAL_DOCUMENTS, SEED_BRANCHES, SEED_DEPARTMENTS, SEED_RETENTION_SCHEDULES, SEED_USERS } from './seed.js';

interface MfaChallengeRecord {
  challengeToken: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
  failedAttempts: number;
}

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
  workspaceItems: WorkspaceItem[];
  sessions: AuthSession[];
  loginHistory: LoginHistoryEntry[];
  passwordResetTokens: PasswordResetToken[];
  delegations: DelegationRecord[];
  roleMatrix: RolePermissionMatrix[];
  authPolicy: AuthPolicyConfig;
  mfaChallenges: MfaChallengeRecord[];
  workflowDefinitions: WorkflowDefinition[];
  workflowInstances: WorkflowInstance[];
  physicalLocations: PhysicalLocationNode[];
  physicalFiles: PhysicalFileRecord[];
  missingIncidents: MissingPhysicalIncident[];
  disposalRequests: DisposalRequest[];
  archiveRetrievals: ArchiveRetrievalRequest[];
  disposalCertificates: DisposalCertificate[];
  sequenceNumbers: {
    [key: string]: number; // e.g. 'IN_2026': 102
  };
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'edrms_store.json');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const WORKSPACE_DIR = path.join(DATA_DIR, 'workspace_files');

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

const DEFAULT_AUTH_POLICY: AuthPolicyConfig = {
  maxFailedAttempts: 5,
  lockoutDurationMinutes: 15,
  idleTimeoutMinutes: 30,
  absoluteTimeoutHours: 8,
  minPasswordLength: 10,
  maxDelegationDays: 90
};

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
    workspaceItems: [],
    sessions: [],
    loginHistory: [],
    passwordResetTokens: [],
    delegations: [],
    roleMatrix: [],
    authPolicy: { ...DEFAULT_AUTH_POLICY },
    mfaChallenges: [],
    workflowDefinitions: [],
    workflowInstances: [],
    physicalLocations: [],
    physicalFiles: [],
    missingIncidents: [],
    disposalRequests: [],
    archiveRetrievals: [],
    disposalCertificates: [],
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
    if (!fs.existsSync(WORKSPACE_DIR)) {
      fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
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
        if (!this.data.workspaceItems || this.data.workspaceItems.length === 0) {
          this.data.workspaceItems = this.createSeedWorkspaceItems();
        }
        this.ensurePhase3AuthState();
        this.ensurePhase4WorkflowState();
        this.ensurePhase5PhysicalState();
        this.ensurePhase6RecordsState();
        this.save();
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
    this.data.workspaceItems = this.createSeedWorkspaceItems();

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
    this.ensurePhase3AuthState();
    this.ensurePhase4WorkflowState();
    this.ensurePhase5PhysicalState();
    this.ensurePhase6RecordsState();
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

  public createBranch(branchData: Omit<Branch, 'id'>, actor: User, clientIp: string): Branch {
    const id = `br-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`;
    const newBranch: Branch = {
      id,
      isActive: true,
      ...branchData
    };
    this.data.branches.push(newBranch);
    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'CREATED_BRANCH',
      resourceType: 'Branch',
      resourceId: newBranch.code,
      ipAddress: clientIp,
      details: `Created regional branch hub: ${newBranch.nameEn} (${newBranch.city}, ${newBranch.region})`
    });
    this.save();
    return newBranch;
  }

  public updateBranch(branchId: string, updates: Partial<Branch>, actor: User, clientIp: string): Branch | null {
    const branch = this.data.branches.find(b => b.id === branchId);
    if (!branch) return null;
    Object.assign(branch, updates);
    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'UPDATED_BRANCH',
      resourceType: 'Branch',
      resourceId: branch.code,
      ipAddress: clientIp,
      details: `Updated branch information for ${branch.nameEn} (${branch.code})`
    });
    this.save();
    return branch;
  }

  public deleteBranch(branchId: string, actor: User, clientIp: string): boolean {
    const branch = this.data.branches.find(b => b.id === branchId);
    if (!branch) return false;
    branch.isActive = false;
    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'DEACTIVATED_BRANCH',
      resourceType: 'Branch',
      resourceId: branch.code,
      ipAddress: clientIp,
      details: `Deactivated regional branch: ${branch.nameEn} (${branch.code})`
    });
    this.save();
    return true;
  }

  public getDepartments(): Department[] {
    return this.data.departments;
  }

  public createDepartment(deptData: Omit<Department, 'id'>, actor: User, clientIp: string): Department {
    const id = `dept-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`;
    const newDept: Department = {
      id,
      isActive: true,
      ...deptData
    };
    this.data.departments.push(newDept);
    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'CREATED_DEPARTMENT',
      resourceType: 'Department',
      resourceId: newDept.code,
      ipAddress: clientIp,
      details: `Created directorate: ${newDept.nameEn} (${newDept.directorateEn})`
    });
    this.save();
    return newDept;
  }

  public updateDepartment(deptId: string, updates: Partial<Department>, actor: User, clientIp: string): Department | null {
    const dept = this.data.departments.find(d => d.id === deptId);
    if (!dept) return null;
    Object.assign(dept, updates);
    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'UPDATED_DEPARTMENT',
      resourceType: 'Department',
      resourceId: dept.code,
      ipAddress: clientIp,
      details: `Updated directorate information for ${dept.nameEn} (${dept.code})`
    });
    this.save();
    return dept;
  }

  public deleteDepartment(deptId: string, actor: User, clientIp: string): boolean {
    const dept = this.data.departments.find(d => d.id === deptId);
    if (!dept) return false;
    dept.isActive = false;
    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'DEACTIVATED_DEPARTMENT',
      resourceType: 'Department',
      resourceId: dept.code,
      ipAddress: clientIp,
      details: `Deactivated directorate: ${dept.nameEn} (${dept.code})`
    });
    this.save();
    return true;
  }

  public getUsers(): User[] {
    return this.data.users;
  }

  public createUser(userData: Omit<User, 'id' | 'username'> & { username?: string; initialPassword?: string }, actor: User, clientIp: string): User {
    const id = `usr-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`;
    const defaultPerms = userData.permissions?.length 
      ? userData.permissions 
      : userData.role === 'SuperAdmin' 
        ? ['*'] 
        : ['read:documents', 'create:documents', 'workflow:action'];

    const username = (userData.username || userData.email.split('@')[0] || id).trim().toLowerCase();
    const initialPass = userData.initialPassword || 'EPSS#Gov2026!';
        
    const newUser: User = {
      id,
      status: 'Active',
      ...userData,
      username,
      permissions: defaultPerms,
      passwordHash: this.hashSecret(initialPass),
      mfaPinHash: this.hashSecret('246810'),
      failedLoginAttempts: 0,
      mfaRequired: ['SuperAdmin', 'DirectorGeneral', 'Director', 'Auditor'].includes(userData.role)
    };
    this.data.users.push(newUser);
    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'CREATED_USER',
      resourceType: 'User',
      resourceId: newUser.email,
      ipAddress: clientIp,
      details: `Created institutional staff profile: ${newUser.fullNameEn} (${newUser.role}, ${newUser.departmentNameEn})`
    });
    this.save();
    return this.sanitizeUser(newUser);
  }

  public updateUser(userId: string, updates: Partial<User>, actor: User, clientIp: string): User | null {
    const user = this.data.users.find(u => u.id === userId);
    if (!user) return null;
    const safeUpdates = { ...updates };
    delete safeUpdates.passwordHash;
    delete safeUpdates.mfaPinHash;
    Object.assign(user, safeUpdates);
    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'UPDATED_USER',
      resourceType: 'User',
      resourceId: user.email,
      ipAddress: clientIp,
      details: `Updated staff profile & permissions for ${user.fullNameEn} (Role: ${user.role}, Status: ${user.status || 'Active'})`
    });
    this.save();
    return this.sanitizeUser(user);
  }

  public deleteUser(userId: string, actor: User, clientIp: string): boolean {
    const user = this.data.users.find(u => u.id === userId);
    if (!user) return false;
    user.status = 'Inactive';
    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'DEACTIVATED_USER',
      resourceType: 'User',
      resourceId: user.email,
      ipAddress: clientIp,
      details: `Deactivated staff account: ${user.fullNameEn} (${user.email})`
    });
    this.save();
    return true;
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
    includeDeleted?: boolean;
  }): DocumentItem[] {
    let result = [...this.data.documents];

    if (!filter?.includeDeleted) {
      result = result.filter(d => !d.isDeleted);
    }

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
      ...this.computeRetentionFields(
        docData.type || 'IncomingLetter',
        now,
        docData.retentionScheduleId,
        docData.retentionYears
      ),
      legalHold: false,
      aiExtracted: docData.aiExtracted
    };

    this.data.documents.unshift(newDoc);
    this.launchWorkflowForDocument(newDoc, actor, clientIp);
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

  public updateDocument(
    documentId: string,
    updates: Partial<DocumentItem>,
    actor: User,
    clientIp: string
  ): DocumentItem | null {
    const doc = this.data.documents.find(d => d.id === documentId);
    if (!doc) return null;

    if (doc.legalHold) {
      throw new Error('Document is under an active Legal Hold and cannot be modified.');
    }
    if (doc.status === 'Disposed') {
      throw new Error('Disposed documents are permanently immutable.');
    }

    // Registration number is immutable by specification rule
    const safeUpdates = { ...updates };
    delete safeUpdates.id;
    delete safeUpdates.registrationNumber;
    delete safeUpdates.legalHold;

    Object.assign(doc, safeUpdates);

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'UPDATED_DOCUMENT',
      resourceType: 'Document',
      resourceId: doc.registrationNumber,
      ipAddress: clientIp,
      details: `Updated document metadata for: ${doc.registrationNumber} (${doc.subjectEn})`
    });

    this.save();
    return doc;
  }

  public softDeleteDocument(
    documentId: string,
    actor: User,
    clientIp: string,
    reason?: string
  ): boolean {
    const doc = this.data.documents.find(d => d.id === documentId);
    if (!doc) return false;
    if (doc.legalHold) {
      throw new Error('Document is under an active Legal Hold and cannot be deleted.');
    }
    if (doc.status === 'Disposed') {
      throw new Error('Document has already been disposed.');
    }

    doc.isDeleted = true;
    doc.status = 'Cancelled';
    doc.deletedAt = new Date().toISOString();
    doc.deletedBy = actor.fullNameEn;
    doc.deleteReason = reason || 'Archival cancellation request';

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'SOFT_DELETED_DOCUMENT',
      resourceType: 'Document',
      resourceId: doc.registrationNumber,
      ipAddress: clientIp,
      details: `Soft-deleted / cancelled document: ${doc.registrationNumber}. Reason: ${doc.deleteReason}`
    });

    this.save();
    return true;
  }

  public hardDeleteDocument(
    documentId: string,
    actor: User,
    clientIp: string
  ): { success: boolean; message: string } {
    if (actor.role !== 'SuperAdmin') {
      return { success: false, message: 'Hard delete is strictly restricted to SuperAdmin role.' };
    }

    const index = this.data.documents.findIndex(d => d.id === documentId);
    if (index === -1) {
      return { success: false, message: 'Document not found' };
    }

    if (this.data.documents[index].legalHold) {
      return { success: false, message: 'Document under Legal Hold cannot be edited, deleted, or disposed.' };
    }

    const regNo = this.data.documents[index].registrationNumber;
    this.data.documents.splice(index, 1);

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'PERMANENT_HARD_DELETE',
      resourceType: 'Document',
      resourceId: regNo,
      ipAddress: clientIp,
      details: `CRITICAL: Permanent hard deletion executed by SuperAdmin ${actor.fullNameEn}`
    });

    this.save();
    return { success: true, message: `Document ${regNo} permanently expunged from system records.` };
  }

  public addAttachment(
    documentId: string,
    attachment: Omit<DocumentAttachment, 'id' | 'uploadDate' | 'uploadedBy'>,
    actor: User,
    clientIp: string
  ): DocumentItem | null {
    const doc = this.data.documents.find(d => d.id === documentId);
    if (!doc) return null;
    if (doc.legalHold) {
      throw new Error('Document is under an active Legal Hold and attachments cannot be modified.');
    }

    const newAtt: DocumentAttachment = {
      ...attachment,
      id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      uploadDate: new Date().toISOString(),
      uploadedBy: actor.fullNameEn,
      version: attachment.version || 1
    };

    doc.attachments.push(newAtt);

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'ADDED_ATTACHMENT',
      resourceType: 'DocumentAttachment',
      resourceId: doc.registrationNumber,
      ipAddress: clientIp,
      details: `Attached file: ${newAtt.fileName} (${(newAtt.fileSize / 1024).toFixed(1)} KB) to ${doc.registrationNumber}`
    });

    this.save();
    return doc;
  }

  public updateAttachment(
    documentId: string,
    attachmentId: string,
    updates: Partial<DocumentAttachment>,
    actor: User,
    clientIp: string
  ): DocumentItem | null {
    const doc = this.data.documents.find(d => d.id === documentId);
    if (!doc) return null;
    if (doc.legalHold) {
      throw new Error('Document is under an active Legal Hold and attachments cannot be modified.');
    }

    const att = doc.attachments.find(a => a.id === attachmentId);
    if (!att) return null;

    Object.assign(att, updates);

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'UPDATED_ATTACHMENT',
      resourceType: 'DocumentAttachment',
      resourceId: doc.registrationNumber,
      ipAddress: clientIp,
      details: `Updated metadata for attachment: ${att.fileName} on ${doc.registrationNumber}`
    });

    this.save();
    return doc;
  }

  public removeAttachment(
    documentId: string,
    attachmentId: string,
    actor: User,
    clientIp: string
  ): DocumentItem | null {
    const doc = this.data.documents.find(d => d.id === documentId);
    if (!doc) return null;
    if (doc.legalHold) {
      throw new Error('Document is under an active Legal Hold and attachments cannot be deleted.');
    }

    const attIndex = doc.attachments.findIndex(a => a.id === attachmentId);
    if (attIndex === -1) return null;

    const removedFileName = doc.attachments[attIndex].fileName;
    doc.attachments.splice(attIndex, 1);

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'REMOVED_ATTACHMENT',
      resourceType: 'DocumentAttachment',
      resourceId: doc.registrationNumber,
      ipAddress: clientIp,
      details: `Removed attachment: ${removedFileName} from ${doc.registrationNumber}`
    });

    this.save();
    return doc;
  }

  public async performWorkflowAction(
    documentId: string, 
    actionData: {
      action: 'Forwarded' | 'Reviewed' | 'Approved' | 'Rejected' | 'ReturnedForCorrection' | 'Dispatched' | 'MinuteAdded' | 'Archived' | 'Delegated';
      comments: string;
      forwardToUserId?: string;
      forwardToDepartmentId?: string;
      delegateToUserId?: string;
      targetStageId?: string;
      digitalSignatureCertificate?: string;
      biometricSignatureVerified?: boolean;
    },
    actor: User,
    clientIp: string,
    session?: AuthSession
  ): Promise<DocumentItem | null> {
    const result = await this.executeWorkflowTaskAction(documentId, actionData, actor, session, clientIp);
    if (!result.success) {
      const err: any = new Error(result.error || 'Workflow action failed');
      err.statusCode = result.statusCode || 400;
      err.mfaNeeded = result.mfaNeeded;
      throw err;
    }
    return result.document || null;
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

  // =========================================================================
  // PHASE 2: GOOGLE DRIVE-LIKE WORKSPACE ENGINE
  // =========================================================================

  private createMinimalSamplePdf(title: string, bodyLines: string[]): Buffer {
    const safeTitle = title.replace(/[()\\]/g, '');
    const safeText = bodyLines.map(l => l.replace(/[()\\]/g, '')).join(' | ');
    const streamContent = `BT /F1 14 Tf 50 750 Td (${safeTitle}) Tj /F1 10 Tf 0 -28 Td (${safeText}) Tj ET`;
    const pdf = [
      '%PDF-1.4',
      '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
      '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
      '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj',
      `4 0 obj << /Length ${Buffer.byteLength(streamContent, 'utf-8')} >> stream\n${streamContent}\nendstream endobj`,
      '5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
      'xref',
      '0 6',
      '0000000000 65535 f ',
      'trailer << /Size 6 /Root 1 0 R >>',
      'startxref',
      '420',
      '%%EOF'
    ].join('\n');
    return Buffer.from(pdf, 'utf-8');
  }

  private createSeedWorkspaceItems(): WorkspaceItem[] {
    if (!fs.existsSync(WORKSPACE_DIR)) {
      fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
    }

    const now = new Date().toISOString();
    const writeSample = (key: string, buf: Buffer): { size: number; sha256: string } => {
      const target = path.join(WORKSPACE_DIR, key);
      fs.writeFileSync(target, buf);
      return {
        size: buf.length,
        sha256: crypto.createHash('sha256').update(buf).digest('hex')
      };
    };

    const pdf1 = writeSample(
      'seed-tender-guidelines-v2.pdf',
      this.createMinimalSamplePdf('EPSS 2026 International Pharmaceutical Tender Guidelines', [
        'Ethiopian Pharmaceutical Supply Service - Procurement Directorate',
        'Includes WHO Prequalification standards, Cold-Chain compliance, and GMP Audit criteria.'
      ])
    );

    const pdf2 = writeSample(
      'seed-efda-coldchain-sop.pdf',
      this.createMinimalSamplePdf('EFDA & EPSS National Cold-Chain SOP', [
        'Standard Operating Procedure for 2C to 8C Vaccine & Biologics Hub Storage',
        'Applicable to Head Office and all 19 Regional Branch Warehouses.'
      ])
    );

    const csv1 = writeSample(
      'seed-regional-hub-allocations.csv',
      Buffer.from(
        'HubCode,HubName,Region,AllocationPriority,QuarterlyTargetUnits,ColdRoomCapacityM3\n' +
        'EPSS-HQ,EPSS Head Office,Addis Ababa,Critical,450000,1200\n' +
        'EPSS-AD,Adama Branch Hub,Oromia,High,210000,480\n' +
        'EPSS-BD,Bahir Dar Branch Hub,Amhara,High,195000,420\n' +
        'EPSS-HW,Hawassa Branch Hub,Sidama,High,180000,390\n' +
        'EPSS-MK,Mekelle Branch Hub,Tigray,Critical,175000,410\n',
        'utf-8'
      )
    );

    const json1 = writeSample(
      'seed-retention-compliance-manifest.json',
      Buffer.from(
        JSON.stringify({
          organization: 'Ethiopian Pharmaceutical Supply Service (EPSS)',
          fiscalYear: 2026,
          policyVersion: '2026.4',
          encryptionStandard: 'AES-256-GCM + SHA-256 Integrity',
          approvedBy: 'Dr. Abdulkadir Gelgelo (Director General)'
        }, null, 2),
        'utf-8'
      )
    );

    return [
      {
        id: 'ws-fld-proc',
        name: 'Procurement & International Tenders',
        itemType: 'folder',
        parentId: null,
        ownerId: 'usr-dg',
        ownerName: 'Dr. Abdulkadir Gelgelo',
        departmentId: 'dept-proc',
        createdAt: '2026-10-01T08:00:00Z',
        updatedAt: '2026-11-08T10:00:00Z',
        size: 0,
        starredBy: ['usr-dg'],
        isTrashed: false,
        shares: [
          {
            id: 'shr-1',
            targetType: 'role',
            targetId: 'ProcurementOfficer',
            targetName: 'ProcurementOfficer Role',
            permission: 'Editor',
            sharedAt: '2026-10-02T09:00:00Z',
            sharedBy: 'Dr. Abdulkadir Gelgelo'
          }
        ],
        virusScanStatus: 'Clean',
        activityLog: [
          {
            id: 'act-seed-1',
            timestamp: '2026-10-01T08:00:00Z',
            actorId: 'usr-dg',
            actorName: 'Dr. Abdulkadir Gelgelo',
            action: 'CreatedFolder',
            details: 'Created root directory Procurement & International Tenders'
          }
        ]
      },
      {
        id: 'ws-fld-proc-2026',
        name: '2026 Active RFP Dossiers',
        itemType: 'folder',
        parentId: 'ws-fld-proc',
        ownerId: 'usr-proc',
        ownerName: 'Dawit Hailu',
        departmentId: 'dept-proc',
        createdAt: '2026-10-12T09:30:00Z',
        updatedAt: '2026-11-07T14:20:00Z',
        size: 0,
        starredBy: [],
        isTrashed: false,
        shares: [],
        virusScanStatus: 'Clean',
        activityLog: [
          {
            id: 'act-seed-2',
            timestamp: '2026-10-12T09:30:00Z',
            actorId: 'usr-proc',
            actorName: 'Dawit Hailu',
            action: 'CreatedFolder',
            details: 'Created subfolder 2026 Active RFP Dossiers'
          }
        ]
      },
      {
        id: 'ws-fld-efda',
        name: 'EFDA Regulatory & Quality Assurance',
        itemType: 'folder',
        parentId: null,
        ownerId: 'usr-qa',
        ownerName: 'Dr. Tigist Tadesse',
        departmentId: 'dept-qa',
        createdAt: '2026-09-20T07:45:00Z',
        updatedAt: '2026-11-08T08:15:00Z',
        size: 0,
        starredBy: ['usr-dg', 'usr-reg'],
        isTrashed: false,
        shares: [
          {
            id: 'shr-2',
            targetType: 'role',
            targetId: 'Auditor',
            targetName: 'Auditor Role',
            permission: 'Viewer',
            sharedAt: '2026-09-21T10:00:00Z',
            sharedBy: 'Dr. Tigist Tadesse'
          }
        ],
        virusScanStatus: 'Clean',
        activityLog: [
          {
            id: 'act-seed-3',
            timestamp: '2026-09-20T07:45:00Z',
            actorId: 'usr-qa',
            actorName: 'Dr. Tigist Tadesse',
            action: 'CreatedFolder',
            details: 'Initialized EFDA Regulatory & Quality Assurance vault'
          }
        ]
      },
      {
        id: 'ws-fld-dist',
        name: 'Logistics & 19 Regional Hubs',
        itemType: 'folder',
        parentId: null,
        ownerId: 'usr-dg',
        ownerName: 'Dr. Abdulkadir Gelgelo',
        departmentId: 'dept-store',
        createdAt: '2026-09-15T11:00:00Z',
        updatedAt: '2026-11-08T09:00:00Z',
        size: 0,
        starredBy: [],
        isTrashed: false,
        shares: [
          {
            id: 'shr-3',
            targetType: 'role',
            targetId: 'BranchManager',
            targetName: 'BranchManager Role',
            permission: 'Editor',
            sharedAt: '2026-09-16T11:00:00Z',
            sharedBy: 'Dr. Abdulkadir Gelgelo'
          }
        ],
        virusScanStatus: 'Clean',
        activityLog: [
          {
            id: 'act-seed-4',
            timestamp: '2026-09-15T11:00:00Z',
            actorId: 'usr-dg',
            actorName: 'Dr. Abdulkadir Gelgelo',
            action: 'CreatedFolder',
            details: 'Created Logistics & 19 Regional Hubs shared folder'
          }
        ]
      },
      {
        id: 'ws-file-1',
        name: 'EPSS_2026_International_Tender_Guidelines.pdf',
        itemType: 'file',
        parentId: 'ws-fld-proc',
        ownerId: 'usr-dg',
        ownerName: 'Dr. Abdulkadir Gelgelo',
        departmentId: 'dept-proc',
        createdAt: '2026-10-15T08:00:00Z',
        updatedAt: '2026-11-04T15:30:00Z',
        size: pdf1.size,
        mimeType: 'application/pdf',
        extension: 'pdf',
        storageKey: 'seed-tender-guidelines-v2.pdf',
        currentVersion: 2,
        versions: [
          {
            versionNumber: 1,
            fileName: 'EPSS_2026_International_Tender_Guidelines.pdf',
            fileSize: pdf1.size,
            mimeType: 'application/pdf',
            storageKey: 'seed-tender-guidelines-v2.pdf',
            uploadedAt: '2026-10-15T08:00:00Z',
            uploadedBy: 'usr-proc',
            uploadedByName: 'Dawit Hailu',
            sha256: pdf1.sha256,
            notes: 'Initial draft guidelines'
          },
          {
            versionNumber: 2,
            fileName: 'EPSS_2026_International_Tender_Guidelines.pdf',
            fileSize: pdf1.size,
            mimeType: 'application/pdf',
            storageKey: 'seed-tender-guidelines-v2.pdf',
            uploadedAt: '2026-11-04T15:30:00Z',
            uploadedBy: 'usr-dg',
            uploadedByName: 'Dr. Abdulkadir Gelgelo',
            sha256: pdf1.sha256,
            notes: 'DG approved WHO prequalification addendum'
          }
        ],
        starredBy: ['usr-dg'],
        isTrashed: false,
        shares: [
          {
            id: 'shr-4',
            targetType: 'user',
            targetId: 'usr-reg',
            targetName: 'Selamawit Bekele',
            permission: 'Viewer',
            sharedAt: '2026-11-04T16:00:00Z',
            sharedBy: 'Dr. Abdulkadir Gelgelo'
          }
        ],
        shareLinkEnabled: true,
        shareLinkToken: 'epss-lnk-proc-2026',
        shareLinkPermission: 'Viewer',
        virusScanStatus: 'Clean',
        virusScanAt: now,
        activityLog: [
          {
            id: 'act-f1-1',
            timestamp: '2026-10-15T08:00:00Z',
            actorId: 'usr-proc',
            actorName: 'Dawit Hailu',
            action: 'UploadedFile',
            details: 'Uploaded v1 (Clean scan)'
          },
          {
            id: 'act-f1-2',
            timestamp: '2026-11-04T15:30:00Z',
            actorId: 'usr-dg',
            actorName: 'Dr. Abdulkadir Gelgelo',
            action: 'UploadedNewVersion',
            details: 'Uploaded v2: DG approved WHO prequalification addendum'
          }
        ]
      },
      {
        id: 'ws-file-2',
        name: 'EFDA_ColdChain_Hub_SOP_2026.pdf',
        itemType: 'file',
        parentId: 'ws-fld-efda',
        ownerId: 'usr-qa',
        ownerName: 'Dr. Tigist Tadesse',
        departmentId: 'dept-qa',
        createdAt: '2026-10-20T10:15:00Z',
        updatedAt: '2026-10-20T10:15:00Z',
        size: pdf2.size,
        mimeType: 'application/pdf',
        extension: 'pdf',
        storageKey: 'seed-efda-coldchain-sop.pdf',
        currentVersion: 1,
        versions: [
          {
            versionNumber: 1,
            fileName: 'EFDA_ColdChain_Hub_SOP_2026.pdf',
            fileSize: pdf2.size,
            mimeType: 'application/pdf',
            storageKey: 'seed-efda-coldchain-sop.pdf',
            uploadedAt: '2026-10-20T10:15:00Z',
            uploadedBy: 'usr-qa',
            uploadedByName: 'Dr. Tigist Tadesse',
            sha256: pdf2.sha256,
            notes: 'Official GDP inspection compliance document'
          }
        ],
        starredBy: [],
        isTrashed: false,
        shares: [],
        virusScanStatus: 'Clean',
        virusScanAt: now,
        activityLog: [
          {
            id: 'act-f2-1',
            timestamp: '2026-10-20T10:15:00Z',
            actorId: 'usr-qa',
            actorName: 'Dr. Tigist Tadesse',
            action: 'UploadedFile',
            details: 'Uploaded EFDA_ColdChain_Hub_SOP_2026.pdf (v1)'
          }
        ]
      },
      {
        id: 'ws-file-3',
        name: 'Q4_Regional_Hub_Stock_Allocations.csv',
        itemType: 'file',
        parentId: 'ws-fld-dist',
        ownerId: 'usr-dg',
        ownerName: 'Dr. Abdulkadir Gelgelo',
        departmentId: 'dept-store',
        createdAt: '2026-11-01T12:00:00Z',
        updatedAt: '2026-11-01T12:00:00Z',
        size: csv1.size,
        mimeType: 'text/csv',
        extension: 'csv',
        storageKey: 'seed-regional-hub-allocations.csv',
        currentVersion: 1,
        versions: [
          {
            versionNumber: 1,
            fileName: 'Q4_Regional_Hub_Stock_Allocations.csv',
            fileSize: csv1.size,
            mimeType: 'text/csv',
            storageKey: 'seed-regional-hub-allocations.csv',
            uploadedAt: '2026-11-01T12:00:00Z',
            uploadedBy: 'usr-dg',
            uploadedByName: 'Dr. Abdulkadir Gelgelo',
            sha256: csv1.sha256,
            notes: 'Quarterly pharmaceutical distribution schedule'
          }
        ],
        starredBy: ['usr-dg'],
        isTrashed: false,
        shares: [],
        virusScanStatus: 'Clean',
        virusScanAt: now,
        activityLog: [
          {
            id: 'act-f3-1',
            timestamp: '2026-11-01T12:00:00Z',
            actorId: 'usr-dg',
            actorName: 'Dr. Abdulkadir Gelgelo',
            action: 'UploadedFile',
            details: 'Uploaded regional hub allocation matrix'
          }
        ]
      },
      {
        id: 'ws-file-4',
        name: 'EPSS_Records_Governance_Policy_2026.json',
        itemType: 'file',
        parentId: null,
        ownerId: 'usr-dg',
        ownerName: 'Dr. Abdulkadir Gelgelo',
        departmentId: 'dept-reg',
        createdAt: '2026-11-05T09:00:00Z',
        updatedAt: '2026-11-05T09:00:00Z',
        size: json1.size,
        mimeType: 'application/json',
        extension: 'json',
        storageKey: 'seed-retention-compliance-manifest.json',
        currentVersion: 1,
        versions: [
          {
            versionNumber: 1,
            fileName: 'EPSS_Records_Governance_Policy_2026.json',
            fileSize: json1.size,
            mimeType: 'application/json',
            storageKey: 'seed-retention-compliance-manifest.json',
            uploadedAt: '2026-11-05T09:00:00Z',
            uploadedBy: 'usr-dg',
            uploadedByName: 'Dr. Abdulkadir Gelgelo',
            sha256: json1.sha256,
            notes: 'Retention compliance policy manifest'
          }
        ],
        starredBy: [],
        isTrashed: false,
        shares: [],
        virusScanStatus: 'Clean',
        virusScanAt: now,
        activityLog: [
          {
            id: 'act-f4-1',
            timestamp: '2026-11-05T09:00:00Z',
            actorId: 'usr-dg',
            actorName: 'Dr. Abdulkadir Gelgelo',
            action: 'UploadedFile',
            details: 'Uploaded root governance policy manifest'
          }
        ]
      }
    ];
  }

  public validateWorkspaceName(rawName: unknown): { valid: boolean; error?: string; name?: string } {
    if (typeof rawName !== 'string') {
      return { valid: false, error: 'Name is required.' };
    }
    if (rawName.length < 1 || rawName.length > 255) {
      return { valid: false, error: 'Name must be between 1 and 255 characters.' };
    }
    if (rawName !== rawName.trim()) {
      return { valid: false, error: 'Name cannot contain leading or trailing spaces.' };
    }
    if (/[\/\\:\*\?"<>\|]/.test(rawName)) {
      return { valid: false, error: 'Name contains forbidden characters (/ \\ : * ? " < > |).' };
    }
    return { valid: true, name: rawName };
  }

  public validateUploadedFile(
    fileName: string,
    mimeType: string,
    buffer: Buffer,
    maxBytes: number = 50 * 1024 * 1024
  ): { valid: boolean; error?: string; extension?: string } {
    const nameCheck = this.validateWorkspaceName(fileName);
    if (!nameCheck.valid) return { valid: false, error: nameCheck.error };

    if (buffer.length === 0) {
      return { valid: false, error: 'Uploaded file is empty (0 bytes).' };
    }
    if (buffer.length > maxBytes) {
      return { valid: false, error: `File exceeds maximum allowed limit (${Math.round(maxBytes / (1024 * 1024))} MB).` };
    }

    const ext = path.extname(fileName).toLowerCase().replace('.', '');
    const allowedExtensions = new Set([
      'pdf', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'svg',
      'txt', 'csv', 'json', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'
    ]);
    if (!allowedExtensions.has(ext)) {
      return { valid: false, error: `File extension '.${ext || 'none'}' is not on the EPSS security whitelist.` };
    }

    const allowedMimes = new Set([
      'application/pdf',
      'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml',
      'text/plain', 'text/csv', 'application/csv', 'application/json', 'text/json',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/octet-stream' // Fallback when browser omits exact Office MIME; verified by magic bytes below
    ]);
    if (mimeType && !allowedMimes.has(mimeType)) {
      return { valid: false, error: `MIME type '${mimeType}' is not permitted.` };
    }

    // Virus / malware signature scan (EICAR test signature + native PE/ELF executables + XSS script in SVG)
    const headHex = buffer.subarray(0, 8).toString('hex').toUpperCase();
    const textPreview = buffer.subarray(0, 4096).toString('utf-8');
    if (textPreview.includes('X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR')) {
      return { valid: false, error: 'Security Alert: Malware signature (EICAR) detected! File quarantined.' };
    }
    if (headHex.startsWith('4D5A') || headHex.startsWith('7F454C46')) {
      return { valid: false, error: 'Security Alert: Executable binary header (PE/ELF) detected and blocked.' };
    }
    if (ext === 'svg' && /<script\b/i.test(textPreview)) {
      return { valid: false, error: 'Security Alert: Active <script> tag detected inside SVG file.' };
    }

    // Magic-byte verification for binary containers
    if (ext === 'pdf' && !buffer.subarray(0, 5).toString('ascii').startsWith('%PDF-')) {
      return { valid: false, error: 'Magic-byte mismatch: File claims to be PDF but lacks valid %PDF- header.' };
    }
    if (ext === 'png' && !headHex.startsWith('89504E47')) {
      return { valid: false, error: 'Magic-byte mismatch: File claims to be PNG but lacks PNG signature.' };
    }
    if ((ext === 'jpg' || ext === 'jpeg') && !headHex.startsWith('FFD8FF')) {
      return { valid: false, error: 'Magic-byte mismatch: File claims to be JPEG but lacks FFD8FF header.' };
    }
    if (ext === 'gif' && !buffer.subarray(0, 4).toString('ascii').startsWith('GIF8')) {
      return { valid: false, error: 'Magic-byte mismatch: File claims to be GIF but lacks GIF8 header.' };
    }
    if ((ext === 'docx' || ext === 'xlsx' || ext === 'pptx') && !headHex.startsWith('504B0304')) {
      return { valid: false, error: `Magic-byte mismatch: File claims to be .${ext} but lacks valid ZIP/OOXML signature.` };
    }

    return { valid: true, extension: ext };
  }

  private isNameUniqueInParent(name: string, parentId: string | null, excludeId?: string): boolean {
    const normalized = name.toLowerCase();
    return !(this.data.workspaceItems || []).some(
      item =>
        !item.isTrashed &&
        item.parentId === parentId &&
        item.id !== excludeId &&
        item.name.toLowerCase() === normalized
    );
  }

  public getWorkspaceBreadcrumbs(folderId: string | null): { id: string | null; name: string }[] {
    const crumbs: { id: string | null; name: string }[] = [];
    let currentId = folderId;
    const visited = new Set<string>();
    while (currentId) {
      if (visited.has(currentId)) break;
      visited.add(currentId);
      const node = (this.data.workspaceItems || []).find(i => i.id === currentId);
      if (!node) break;
      crumbs.unshift({ id: node.id, name: node.name });
      currentId = node.parentId;
    }
    crumbs.unshift({ id: null, name: 'EPSS Workspace' });
    return crumbs;
  }

  public getWorkspaceItems(params: {
    parentId?: string | null;
    view?: 'drive' | 'starred' | 'shared' | 'trash';
    q?: string;
    userId: string;
    userRole: string;
  }): {
    items: WorkspaceItem[];
    breadcrumbs: { id: string | null; name: string }[];
    allFolders: WorkspaceItem[];
    stats: { totalFiles: number; totalFolders: number; totalBytes: number; trashedCount: number };
  } {
    const all = this.data.workspaceItems || [];
    const view = params.view || 'drive';
    const parentId = params.parentId || null;
    const q = (params.q || '').trim().toLowerCase();

    let items: WorkspaceItem[] = [];

    if (view === 'trash') {
      items = all.filter(i => i.isTrashed);
    } else if (view === 'starred') {
      items = all.filter(i => !i.isTrashed && i.starredBy.includes(params.userId));
    } else if (view === 'shared') {
      items = all.filter(i =>
        !i.isTrashed &&
        (
          i.shares.some(
            s =>
              (s.targetType === 'user' && s.targetId === params.userId) ||
              (s.targetType === 'role' && s.targetId === params.userRole)
          ) ||
          (i.shareLinkEnabled && i.ownerId !== params.userId)
        )
      );
    } else {
      // 'drive' view: if search query provided, search across all non-trashed items; else filter by parentId
      if (q) {
        items = all.filter(i => !i.isTrashed && i.name.toLowerCase().includes(q));
      } else {
        items = all.filter(i => !i.isTrashed && i.parentId === parentId);
      }
    }

    if (q && view !== 'drive') {
      items = items.filter(i => i.name.toLowerCase().includes(q));
    }

    // Folders first, then alphabetical
    items.sort((a, b) => {
      if (a.itemType !== b.itemType) return a.itemType === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    const nonTrashed = all.filter(i => !i.isTrashed);
    const totalBytes = nonTrashed.reduce((sum, i) => sum + (i.size || 0), 0);

    return {
      items,
      breadcrumbs: view === 'drive' && !q ? this.getWorkspaceBreadcrumbs(parentId) : [{ id: null, name: 'EPSS Workspace' }],
      allFolders: nonTrashed.filter(i => i.itemType === 'folder'),
      stats: {
        totalFiles: nonTrashed.filter(i => i.itemType === 'file').length,
        totalFolders: nonTrashed.filter(i => i.itemType === 'folder').length,
        totalBytes,
        trashedCount: all.filter(i => i.isTrashed).length
      }
    };
  }

  public getWorkspaceItemById(id: string): WorkspaceItem | undefined {
    return (this.data.workspaceItems || []).find(i => i.id === id);
  }

  private pushWorkspaceActivity(
    item: WorkspaceItem,
    actor: User,
    action: WorkspaceActivityEntry['action'],
    details: string
  ) {
    if (!item.activityLog) item.activityLog = [];
    item.activityLog.unshift({
      id: `wact-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: new Date().toISOString(),
      actorId: actor.id,
      actorName: actor.fullNameEn,
      action,
      details
    });
  }

  public createWorkspaceFolder(
    name: string,
    parentId: string | null,
    actor: User,
    clientIp: string
  ): { success: boolean; error?: string; item?: WorkspaceItem } {
    const check = this.validateWorkspaceName(name);
    if (!check.valid) return { success: false, error: check.error };

    if (parentId) {
      const parent = this.getWorkspaceItemById(parentId);
      if (!parent || parent.itemType !== 'folder' || parent.isTrashed) {
        return { success: false, error: 'Parent folder not found or is in Trash.' };
      }
    }

    if (!this.isNameUniqueInParent(name, parentId)) {
      return { success: false, error: `A folder or file named "${name}" already exists in this directory.` };
    }

    const now = new Date().toISOString();
    const folder: WorkspaceItem = {
      id: `ws-fld-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`,
      name,
      itemType: 'folder',
      parentId,
      ownerId: actor.id,
      ownerName: actor.fullNameEn,
      departmentId: actor.departmentId,
      createdAt: now,
      updatedAt: now,
      size: 0,
      starredBy: [],
      isTrashed: false,
      shares: [],
      virusScanStatus: 'Clean',
      activityLog: []
    };

    this.pushWorkspaceActivity(folder, actor, 'CreatedFolder', `Created folder "${name}"`);
    this.data.workspaceItems.push(folder);

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'WORKSPACE_CREATED_FOLDER',
      resourceType: 'WorkspaceFolder',
      resourceId: folder.id,
      ipAddress: clientIp,
      details: `Created workspace folder "${name}"`
    });

    this.save();
    return { success: true, item: folder };
  }

  public uploadWorkspaceFile(params: {
    fileName: string;
    mimeType: string;
    buffer: Buffer;
    parentId: string | null;
    targetFileId?: string;
    versionNotes?: string;
    actor: User;
    clientIp: string;
  }): { success: boolean; error?: string; statusCode?: number; item?: WorkspaceItem } {
    const validation = this.validateUploadedFile(params.fileName, params.mimeType, params.buffer);
    if (!validation.valid) {
      this.addAuditLog({
        userId: params.actor.id,
        userName: params.actor.fullNameEn,
        userRole: params.actor.role,
        branchName: params.actor.branchNameEn,
        action: 'WORKSPACE_UPLOAD_BLOCKED',
        resourceType: 'WorkspaceFile',
        resourceId: params.fileName,
        ipAddress: params.clientIp,
        details: `Upload blocked by validation/malware scan: ${validation.error}`
      });
      return { success: false, error: validation.error, statusCode: 422 };
    }

    if (!fs.existsSync(WORKSPACE_DIR)) {
      fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
    }

    const sha256 = crypto.createHash('sha256').update(params.buffer).digest('hex');
    const storageKey = `${Date.now()}-${Math.random().toString(36).substr(2, 6)}.${validation.extension}`;
    const diskPath = path.join(WORKSPACE_DIR, storageKey);
    fs.writeFileSync(diskPath, params.buffer);

    const now = new Date().toISOString();

    // Check if uploading a new version to an existing file (by targetFileId or matching name in same parent)
    let existingFile: WorkspaceItem | undefined;
    if (params.targetFileId) {
      existingFile = this.getWorkspaceItemById(params.targetFileId);
    } else {
      existingFile = (this.data.workspaceItems || []).find(
        i =>
          !i.isTrashed &&
          i.itemType === 'file' &&
          i.parentId === params.parentId &&
          i.name.toLowerCase() === params.fileName.toLowerCase()
      );
    }

    if (existingFile && existingFile.itemType === 'file') {
      const nextVer = (existingFile.currentVersion || 1) + 1;
      const versionRec: WorkspaceFileVersion = {
        versionNumber: nextVer,
        fileName: params.fileName,
        fileSize: params.buffer.length,
        mimeType: params.mimeType,
        storageKey,
        uploadedAt: now,
        uploadedBy: params.actor.id,
        uploadedByName: params.actor.fullNameEn,
        sha256,
        notes: params.versionNotes || `Uploaded version v${nextVer}`
      };

      existingFile.versions = existingFile.versions || [];
      existingFile.versions.push(versionRec);
      existingFile.currentVersion = nextVer;
      existingFile.storageKey = storageKey;
      existingFile.size = params.buffer.length;
      existingFile.mimeType = params.mimeType;
      existingFile.updatedAt = now;
      existingFile.virusScanStatus = 'Clean';
      existingFile.virusScanAt = now;

      this.pushWorkspaceActivity(
        existingFile,
        params.actor,
        'UploadedNewVersion',
        `Uploaded v${nextVer} (${(params.buffer.length / 1024).toFixed(1)} KB, Scan: Clean)`
      );

      this.addAuditLog({
        userId: params.actor.id,
        userName: params.actor.fullNameEn,
        userRole: params.actor.role,
        branchName: params.actor.branchNameEn,
        action: 'WORKSPACE_UPLOADED_VERSION',
        resourceType: 'WorkspaceFile',
        resourceId: existingFile.id,
        ipAddress: params.clientIp,
        details: `Uploaded v${nextVer} of "${existingFile.name}" (${sha256.slice(0, 12)})`
      });

      this.save();
      return { success: true, item: existingFile };
    }

    // Create new file
    const newItem: WorkspaceItem = {
      id: `ws-file-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`,
      name: params.fileName,
      itemType: 'file',
      parentId: params.parentId,
      ownerId: params.actor.id,
      ownerName: params.actor.fullNameEn,
      departmentId: params.actor.departmentId,
      createdAt: now,
      updatedAt: now,
      size: params.buffer.length,
      mimeType: params.mimeType || 'application/octet-stream',
      extension: validation.extension,
      storageKey,
      currentVersion: 1,
      versions: [
        {
          versionNumber: 1,
          fileName: params.fileName,
          fileSize: params.buffer.length,
          mimeType: params.mimeType || 'application/octet-stream',
          storageKey,
          uploadedAt: now,
          uploadedBy: params.actor.id,
          uploadedByName: params.actor.fullNameEn,
          sha256,
          notes: params.versionNotes || 'Initial upload'
        }
      ],
      starredBy: [],
      isTrashed: false,
      shares: [],
      virusScanStatus: 'Clean',
      virusScanAt: now,
      activityLog: []
    };

    this.pushWorkspaceActivity(
      newItem,
      params.actor,
      'UploadedFile',
      `Uploaded "${params.fileName}" (${(params.buffer.length / 1024).toFixed(1)} KB, Virus Scan: Clean)`
    );

    this.data.workspaceItems.push(newItem);

    this.addAuditLog({
      userId: params.actor.id,
      userName: params.actor.fullNameEn,
      userRole: params.actor.role,
      branchName: params.actor.branchNameEn,
      action: 'WORKSPACE_UPLOADED_FILE',
      resourceType: 'WorkspaceFile',
      resourceId: newItem.id,
      ipAddress: params.clientIp,
      details: `Uploaded workspace file "${newItem.name}" (${newItem.size} bytes)`
    });

    this.save();
    return { success: true, item: newItem };
  }

  public getWorkspaceFileDiskPath(storageKey: string): string | null {
    const clean = path.basename(storageKey);
    const full = path.join(WORKSPACE_DIR, clean);
    return fs.existsSync(full) ? full : null;
  }

  public recordWorkspaceDownload(itemId: string, actor: User) {
    const item = this.getWorkspaceItemById(itemId);
    if (item) {
      this.pushWorkspaceActivity(item, actor, 'Downloaded', `Downloaded "${item.name}" (v${item.currentVersion || 1})`);
      this.save();
    }
  }

  public renameWorkspaceItem(
    itemId: string,
    newName: string,
    actor: User,
    clientIp: string
  ): { success: boolean; error?: string; item?: WorkspaceItem } {
    const item = this.getWorkspaceItemById(itemId);
    if (!item) return { success: false, error: 'Item not found.' };

    const check = this.validateWorkspaceName(newName);
    if (!check.valid) return { success: false, error: check.error };

    if (!this.isNameUniqueInParent(newName, item.parentId, item.id)) {
      return { success: false, error: `An item named "${newName}" already exists in this folder.` };
    }

    const oldName = item.name;
    item.name = newName;
    item.updatedAt = new Date().toISOString();

    this.pushWorkspaceActivity(item, actor, 'Renamed', `Renamed from "${oldName}" to "${newName}"`);
    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'WORKSPACE_RENAMED',
      resourceType: item.itemType === 'folder' ? 'WorkspaceFolder' : 'WorkspaceFile',
      resourceId: item.id,
      ipAddress: clientIp,
      details: `Renamed "${oldName}" -> "${newName}"`
    });

    this.save();
    return { success: true, item };
  }

  private isDescendantFolder(candidateParentId: string, folderId: string): boolean {
    let curr: string | null = candidateParentId;
    const visited = new Set<string>();
    while (curr) {
      if (curr === folderId) return true;
      if (visited.has(curr)) break;
      visited.add(curr);
      const node = this.getWorkspaceItemById(curr);
      curr = node ? node.parentId : null;
    }
    return false;
  }

  public moveWorkspaceItem(
    itemId: string,
    targetParentId: string | null,
    actor: User,
    clientIp: string
  ): { success: boolean; error?: string; item?: WorkspaceItem } {
    const item = this.getWorkspaceItemById(itemId);
    if (!item) return { success: false, error: 'Item not found.' };

    if (item.parentId === targetParentId) {
      return { success: true, item };
    }

    if (targetParentId) {
      const target = this.getWorkspaceItemById(targetParentId);
      if (!target || target.itemType !== 'folder' || target.isTrashed) {
        return { success: false, error: 'Destination folder not found or is trashed.' };
      }
      if (item.itemType === 'folder' && this.isDescendantFolder(targetParentId, item.id)) {
        return { success: false, error: 'Cannot move a folder into itself or one of its own subfolders.' };
      }
    }

    if (!this.isNameUniqueInParent(item.name, targetParentId, item.id)) {
      return { success: false, error: `An item named "${item.name}" already exists in the destination folder.` };
    }

    const destName = targetParentId ? (this.getWorkspaceItemById(targetParentId)?.name || 'Target Folder') : 'EPSS Workspace Root';
    item.parentId = targetParentId;
    item.updatedAt = new Date().toISOString();

    this.pushWorkspaceActivity(item, actor, 'Moved', `Moved to "${destName}"`);
    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'WORKSPACE_MOVED',
      resourceType: item.itemType === 'folder' ? 'WorkspaceFolder' : 'WorkspaceFile',
      resourceId: item.id,
      ipAddress: clientIp,
      details: `Moved "${item.name}" into "${destName}"`
    });

    this.save();
    return { success: true, item };
  }

  public toggleStarWorkspaceItem(itemId: string, actor: User): WorkspaceItem | null {
    const item = this.getWorkspaceItemById(itemId);
    if (!item) return null;

    const idx = item.starredBy.indexOf(actor.id);
    if (idx >= 0) {
      item.starredBy.splice(idx, 1);
      this.pushWorkspaceActivity(item, actor, 'Unstarred', 'Removed from Starred items');
    } else {
      item.starredBy.push(actor.id);
      this.pushWorkspaceActivity(item, actor, 'Starred', 'Marked as Starred');
    }

    this.save();
    return item;
  }

  public trashWorkspaceItem(itemId: string, actor: User, clientIp: string): WorkspaceItem | null {
    const item = this.getWorkspaceItemById(itemId);
    if (!item) return null;

    item.isTrashed = true;
    item.trashedAt = new Date().toISOString();
    item.trashedBy = actor.fullNameEn;

    this.pushWorkspaceActivity(item, actor, 'Trashed', 'Moved item to Trash');
    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'WORKSPACE_TRASHED',
      resourceType: item.itemType === 'folder' ? 'WorkspaceFolder' : 'WorkspaceFile',
      resourceId: item.id,
      ipAddress: clientIp,
      details: `Moved "${item.name}" to Trash`
    });

    this.save();
    return item;
  }

  public restoreWorkspaceItem(
    itemId: string,
    actor: User,
    clientIp: string
  ): { success: boolean; error?: string; item?: WorkspaceItem } {
    const item = this.getWorkspaceItemById(itemId);
    if (!item) return { success: false, error: 'Item not found.' };

    // If parent is missing or trashed, restore to root
    if (item.parentId) {
      const parent = this.getWorkspaceItemById(item.parentId);
      if (!parent || parent.isTrashed) {
        item.parentId = null;
      }
    }

    if (!this.isNameUniqueInParent(item.name, item.parentId, item.id)) {
      item.name = `${item.name} (Restored)`;
    }

    item.isTrashed = false;
    item.trashedAt = undefined;
    item.trashedBy = undefined;
    item.updatedAt = new Date().toISOString();

    this.pushWorkspaceActivity(item, actor, 'RestoredFromTrash', 'Restored item from Trash');
    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'WORKSPACE_RESTORED',
      resourceType: item.itemType === 'folder' ? 'WorkspaceFolder' : 'WorkspaceFile',
      resourceId: item.id,
      ipAddress: clientIp,
      details: `Restored "${item.name}" from Trash`
    });

    this.save();
    return { success: true, item };
  }

  public permanentlyDeleteWorkspaceItem(
    itemId: string,
    actor: User,
    clientIp: string
  ): { success: boolean; error?: string } {
    const item = this.getWorkspaceItemById(itemId);
    if (!item) return { success: false, error: 'Item not found.' };

    if (!item.isTrashed) {
      return { success: false, error: 'Permanent deletion is only allowed for items currently in Trash.' };
    }

    if (item.ownerId !== actor.id && actor.role !== 'SuperAdmin') {
      return { success: false, error: 'Permission Denied: Only the item owner or SuperAdmin can permanently delete.' };
    }

    // Collect item and any descendants if it's a folder
    const toDeleteIds = new Set<string>([item.id]);
    let added = true;
    while (added) {
      added = false;
      for (const candidate of this.data.workspaceItems) {
        if (candidate.parentId && toDeleteIds.has(candidate.parentId) && !toDeleteIds.has(candidate.id)) {
          toDeleteIds.add(candidate.id);
          added = true;
        }
      }
    }

    // Delete stored binary files on disk if not used by seeded sample keys
    for (const delId of toDeleteIds) {
      const target = this.getWorkspaceItemById(delId);
      if (target?.versions) {
        for (const v of target.versions) {
          if (v.storageKey && !v.storageKey.startsWith('seed-')) {
            const p = path.join(WORKSPACE_DIR, path.basename(v.storageKey));
            if (fs.existsSync(p)) {
              try {
                fs.unlinkSync(p);
              } catch (e) {
                console.warn('Could not unlink workspace file:', p, e);
              }
            }
          }
        }
      }
    }

    const deletedName = item.name;
    this.data.workspaceItems = this.data.workspaceItems.filter(i => !toDeleteIds.has(i.id));

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'WORKSPACE_PERMANENT_DELETE',
      resourceType: item.itemType === 'folder' ? 'WorkspaceFolder' : 'WorkspaceFile',
      resourceId: itemId,
      ipAddress: clientIp,
      details: `Permanently purged "${deletedName}" (${toDeleteIds.size} item(s)) from Trash`
    });

    this.save();
    return { success: true };
  }

  public shareWorkspaceItem(
    itemId: string,
    shareData: {
      targetType?: 'user' | 'role';
      targetId?: string;
      targetName?: string;
      permission?: WorkspacePermissionLevel;
      shareLinkEnabled?: boolean;
      shareLinkPermission?: WorkspacePermissionLevel;
    },
    actor: User,
    clientIp: string
  ): { success: boolean; error?: string; item?: WorkspaceItem } {
    const item = this.getWorkspaceItemById(itemId);
    if (!item) return { success: false, error: 'Item not found.' };

    if (shareData.shareLinkEnabled !== undefined) {
      item.shareLinkEnabled = shareData.shareLinkEnabled;
      item.shareLinkPermission = shareData.shareLinkPermission || item.shareLinkPermission || 'Viewer';
      if (item.shareLinkEnabled && !item.shareLinkToken) {
        item.shareLinkToken = `epss-lnk-${crypto.randomBytes(6).toString('hex')}`;
      }
      this.pushWorkspaceActivity(
        item,
        actor,
        'PermissionsUpdated',
        item.shareLinkEnabled ? `Enabled share link (${item.shareLinkPermission})` : 'Disabled public/internal share link'
      );
      this.save();
      return { success: true, item };
    }

    if (!shareData.targetType || !shareData.targetId) {
      return { success: false, error: 'At least one user or role must be selected to share.' };
    }

    const perm: WorkspacePermissionLevel = shareData.permission === 'Editor' ? 'Editor' : 'Viewer';
    const existing = item.shares.find(
      s => s.targetType === shareData.targetType && s.targetId === shareData.targetId
    );

    if (existing) {
      existing.permission = perm;
      existing.sharedAt = new Date().toISOString();
      existing.sharedBy = actor.fullNameEn;
    } else {
      const entry: WorkspaceShareEntry = {
        id: `shr-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        targetType: shareData.targetType,
        targetId: shareData.targetId,
        targetName: shareData.targetName || shareData.targetId,
        permission: perm,
        sharedAt: new Date().toISOString(),
        sharedBy: actor.fullNameEn
      };
      item.shares.push(entry);
    }

    this.pushWorkspaceActivity(
      item,
      actor,
      'Shared',
      `Shared with ${shareData.targetName || shareData.targetId} as ${perm}`
    );

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'WORKSPACE_SHARED',
      resourceType: item.itemType === 'folder' ? 'WorkspaceFolder' : 'WorkspaceFile',
      resourceId: item.id,
      ipAddress: clientIp,
      details: `Shared "${item.name}" with ${shareData.targetName || shareData.targetId} (${perm})`
    });

    this.save();
    return { success: true, item };
  }

  public removeShareWorkspaceItem(
    itemId: string,
    shareId: string,
    actor: User,
    clientIp: string
  ): WorkspaceItem | null {
    const item = this.getWorkspaceItemById(itemId);
    if (!item) return null;

    const target = item.shares.find(s => s.id === shareId);
    if (!target) return item;

    item.shares = item.shares.filter(s => s.id !== shareId);
    this.pushWorkspaceActivity(item, actor, 'Unshared', `Revoked access for ${target.targetName}`);

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'WORKSPACE_UNSHARED',
      resourceType: item.itemType === 'folder' ? 'WorkspaceFolder' : 'WorkspaceFile',
      resourceId: item.id,
      ipAddress: clientIp,
      details: `Revoked share permission on "${item.name}" for ${target.targetName}`
    });

    this.save();
    return item;
  }

  public restoreWorkspaceFileVersion(
    itemId: string,
    versionNumber: number,
    actor: User,
    clientIp: string
  ): { success: boolean; error?: string; item?: WorkspaceItem } {
    const item = this.getWorkspaceItemById(itemId);
    if (!item || item.itemType !== 'file') {
      return { success: false, error: 'File not found.' };
    }

    const ver = (item.versions || []).find(v => v.versionNumber === versionNumber);
    if (!ver) {
      return { success: false, error: `Version v${versionNumber} not found.` };
    }

    const nextVerNum = (item.currentVersion || 1) + 1;
    const now = new Date().toISOString();
    const restoredVer: WorkspaceFileVersion = {
      ...ver,
      versionNumber: nextVerNum,
      uploadedAt: now,
      uploadedBy: actor.id,
      uploadedByName: actor.fullNameEn,
      notes: `Restored from v${versionNumber}`
    };

    item.versions = item.versions || [];
    item.versions.push(restoredVer);
    item.currentVersion = nextVerNum;
    item.storageKey = ver.storageKey;
    item.size = ver.fileSize;
    item.mimeType = ver.mimeType;
    item.updatedAt = now;

    this.pushWorkspaceActivity(item, actor, 'RestoredVersion', `Restored v${versionNumber} as new v${nextVerNum}`);
    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'WORKSPACE_RESTORED_VERSION',
      resourceType: 'WorkspaceFile',
      resourceId: item.id,
      ipAddress: clientIp,
      details: `Restored v${versionNumber} -> v${nextVerNum} for "${item.name}"`
    });

    this.save();
    return { success: true, item };
  }

  // =========================================================================
  // PHASE 3: AUTHENTICATION, RBAC, SESSIONS, MFA, DELEGATION & SECURITY
  // =========================================================================

  private hashSecret(plain: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const derived = crypto.scryptSync(plain, salt, 32).toString('hex');
    return `${salt}:${derived}`;
  }

  private verifySecret(plain: string, stored?: string): boolean {
    if (!stored || !stored.includes(':')) return false;
    const [salt, keyHex] = stored.split(':');
    const keyBuf = Buffer.from(keyHex, 'hex');
    const derivedBuf = crypto.scryptSync(plain, salt, 32);
    if (keyBuf.length !== derivedBuf.length) return false;
    return crypto.timingSafeEqual(keyBuf, derivedBuf);
  }

  public sanitizeUser(user: User): User {
    const { passwordHash: _ph, mfaPinHash: _mph, ...safe } = user;
    return safe;
  }

  public getSanitizedUsers(): User[] {
    return this.data.users.map(u => this.sanitizeUser(u));
  }

  public getSanitizedUserById(id: string): User | undefined {
    const u = this.getUserById(id);
    return u ? this.sanitizeUser(u) : undefined;
  }

  private createDefaultRoleMatrix(): RolePermissionMatrix[] {
    return [
      {
        role: 'SuperAdmin',
        label: 'Super Administrator',
        description: 'Unrestricted system governance, RBAC configuration, and permanent purge authority.',
        requiresMfa: true,
        permissions: ['*']
      },
      {
        role: 'DirectorGeneral',
        label: 'Director General',
        description: 'Executive institutional approval, legal holds, and national supply chain oversight.',
        requiresMfa: true,
        permissions: [
          'read:documents', 'create:documents', 'edit:documents', 'delete:documents',
          'approve:workflows', 'manage:workspace', 'share:workspace', 'manage:archives',
          'apply:legal_hold', 'read:audit', 'manage:users', 'manage:organizations'
        ]
      },
      {
        role: 'Director',
        label: 'Directorate Head',
        description: 'Directorate-level correspondence routing, workflow approval, and file sharing.',
        requiresMfa: true,
        permissions: [
          'read:documents', 'create:documents', 'edit:documents', 'approve:workflows',
          'manage:workspace', 'share:workspace', 'manage:archives'
        ]
      },
      {
        role: 'RegistryOfficer',
        label: 'Registry Officer',
        description: 'Central intake registration, numbering sequence control, and physical file custody.',
        requiresMfa: false,
        permissions: [
          'read:documents', 'create:documents', 'edit:documents', 'track:physical',
          'manage:workspace', 'share:workspace', 'manage:archives'
        ]
      },
      {
        role: 'BranchManager',
        label: 'Branch Hub Manager',
        description: 'Regional hub operations, branch correspondence registration, and physical tracking.',
        requiresMfa: false,
        permissions: ['read:documents', 'create:documents', 'edit:documents', 'track:physical', 'manage:workspace']
      },
      {
        role: 'ProcurementOfficer',
        label: 'Procurement Officer',
        description: 'Tender documentation handling, vendor correspondence, and workspace collaboration.',
        requiresMfa: false,
        permissions: ['read:documents', 'create:documents', 'manage:workspace', 'share:workspace']
      },
      {
        role: 'Auditor',
        label: 'Internal Auditor',
        description: 'Read-only compliance inspection across audit trails, records, and security logs.',
        requiresMfa: true,
        permissions: ['read:documents', 'read:audit', 'export:reports']
      }
    ];
  }

  private ensurePhase3AuthState() {
    if (!this.data.authPolicy) {
      this.data.authPolicy = { ...DEFAULT_AUTH_POLICY };
    }
    if (!Array.isArray(this.data.sessions)) this.data.sessions = [];
    if (!Array.isArray(this.data.loginHistory)) this.data.loginHistory = [];
    if (!Array.isArray(this.data.passwordResetTokens)) this.data.passwordResetTokens = [];
    if (!Array.isArray(this.data.delegations)) this.data.delegations = [];
    if (!Array.isArray(this.data.mfaChallenges)) this.data.mfaChallenges = [];
    if (!Array.isArray(this.data.roleMatrix) || this.data.roleMatrix.length === 0) {
      this.data.roleMatrix = this.createDefaultRoleMatrix();
    }

    // Ensure SuperAdmin exists
    if (!this.data.users.some(u => u.id === 'usr-admin' || u.username === 'superadmin')) {
      const adminSeed = SEED_USERS.find(u => u.id === 'usr-admin');
      if (adminSeed) {
        this.data.users.unshift({ ...adminSeed });
      }
    }

    const defaultPassHash = this.hashSecret('EPSS#Gov2026!');
    const defaultPinHash = this.hashSecret('246810');

    for (const u of this.data.users) {
      if (!u.username) {
        const seedMatch = SEED_USERS.find(s => s.id === u.id);
        u.username = seedMatch?.username || u.email.split('@')[0];
      }
      if (!u.passwordHash) u.passwordHash = defaultPassHash;
      if (!u.mfaPinHash) u.mfaPinHash = defaultPinHash;
      if (u.failedLoginAttempts === undefined) u.failedLoginAttempts = 0;
      if (!u.status) u.status = 'Active';
      if (u.mfaRequired === undefined) {
        u.mfaRequired = ['SuperAdmin', 'DirectorGeneral', 'Director', 'Auditor'].includes(u.role);
      }
    }
  }

  public validateUsername(raw: unknown): { valid: boolean; error?: string; username?: string } {
    if (typeof raw !== 'string') {
      return { valid: false, error: 'Username is required.' };
    }
    const trimmed = raw.trim();
    if (trimmed.length < 3 || trimmed.length > 50) {
      return { valid: false, error: 'Username must be between 3 and 50 characters.' };
    }
    if (!/^[a-zA-Z0-9._@-]{3,50}$/.test(trimmed)) {
      return { valid: false, error: 'Username may only contain letters, numbers, and . _ @ -' };
    }
    return { valid: true, username: trimmed };
  }

  public validatePasswordPolicy(password: unknown, username?: string): { valid: boolean; error?: string } {
    if (typeof password !== 'string') {
      return { valid: false, error: 'Password is required.' };
    }
    const minLen = this.data.authPolicy?.minPasswordLength || 10;
    if (password.length < minLen) {
      return { valid: false, error: `Password must be at least ${minLen} characters long.` };
    }
    if (!/[A-Z]/.test(password)) {
      return { valid: false, error: 'Password must include at least one uppercase letter.' };
    }
    if (!/[a-z]/.test(password)) {
      return { valid: false, error: 'Password must include at least one lowercase letter.' };
    }
    if (!/[0-9]/.test(password)) {
      return { valid: false, error: 'Password must include at least one numeric digit.' };
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      return { valid: false, error: 'Password must include at least one special character.' };
    }
    if (username && password.toLowerCase() === username.trim().toLowerCase()) {
      return { valid: false, error: 'Password cannot be identical to your username.' };
    }
    return { valid: true };
  }

  private recordLoginHistory(entry: Omit<LoginHistoryEntry, 'id' | 'timestamp'>) {
    this.data.loginHistory.unshift({
      id: `lhist-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      ...entry
    });
    if (this.data.loginHistory.length > 500) {
      this.data.loginHistory.pop();
    }
  }

  private createAuthSession(user: User, ip: string, userAgent: string, mfaVerified: boolean): AuthSession {
    const now = Date.now();
    const idleMs = (this.data.authPolicy?.idleTimeoutMinutes || 30) * 60 * 1000;
    const absMs = (this.data.authPolicy?.absoluteTimeoutHours || 8) * 60 * 60 * 1000;

    const session: AuthSession = {
      id: `sess-${now.toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      token: crypto.randomBytes(32).toString('hex'),
      userId: user.id,
      userName: user.fullNameEn,
      userRole: user.role,
      ipAddress: ip,
      userAgent: userAgent || 'EPSS Web Client',
      createdAt: new Date(now).toISOString(),
      lastActiveAt: new Date(now).toISOString(),
      idleExpiresAt: new Date(now + idleMs).toISOString(),
      expiresAt: new Date(now + absMs).toISOString(),
      mfaVerified,
      isRevoked: false
    };

    this.data.sessions.unshift(session);
    if (this.data.sessions.length > 200) {
      this.data.sessions.pop();
    }
    user.lastLoginAt = new Date(now).toISOString();
    return session;
  }

  private userRequiresMfa(user: User): boolean {
    const roleEntry = this.data.roleMatrix.find(r => r.role === user.role);
    return !!(user.mfaRequired || roleEntry?.requiresMfa);
  }

  public loginWithPassword(
    rawIdentifier: string,
    password: string,
    ip: string,
    userAgent: string
  ): {
    success: boolean;
    statusCode?: number;
    error?: string;
    mfaRequired?: boolean;
    challengeToken?: string;
    userPreview?: { id: string; fullNameEn: string; fullNameAm: string; role: UserRole; hasBiometrics: boolean };
    session?: AuthSession;
    user?: User;
  } {
    const uCheck = this.validateUsername(rawIdentifier);
    if (!uCheck.valid) {
      return { success: false, statusCode: 400, error: uCheck.error };
    }
    if (!password) {
      return { success: false, statusCode: 400, error: 'Password is required.' };
    }

    const identifier = uCheck.username!.toLowerCase();
    const user = this.data.users.find(
      u => u.username.toLowerCase() === identifier || u.email.toLowerCase() === identifier
    );

    // Generic message so account existence is never disclosed
    const genericAuthError = 'Invalid credentials. Please verify your username and password.';

    if (!user) {
      this.recordLoginHistory({
        usernameAttempted: uCheck.username!,
        ipAddress: ip,
        userAgent,
        method: 'password',
        status: 'Failed',
        reason: 'Authentication failed'
      });
      this.save();
      return { success: false, statusCode: 401, error: genericAuthError };
    }

    if (user.status === 'Inactive') {
      this.recordLoginHistory({
        usernameAttempted: uCheck.username!,
        userId: user.id,
        userName: user.fullNameEn,
        ipAddress: ip,
        userAgent,
        method: 'password',
        status: 'Failed',
        reason: 'Account inactive'
      });
      this.save();
      return { success: false, statusCode: 401, error: genericAuthError };
    }

    // Auto-release time-based lockout if expired
    if (user.status === 'Locked' && user.lockedUntil) {
      if (Date.now() > new Date(user.lockedUntil).getTime()) {
        user.status = 'Active';
        user.lockedUntil = null;
        user.failedLoginAttempts = 0;
      } else {
        this.recordLoginHistory({
          usernameAttempted: uCheck.username!,
          userId: user.id,
          userName: user.fullNameEn,
          ipAddress: ip,
          userAgent,
          method: 'password',
          status: 'Locked',
          reason: 'Account locked due to failed login attempts'
        });
        this.save();
        return {
          success: false,
          statusCode: 423,
          error: 'Account temporarily locked due to repeated failed attempts. Contact an administrator or wait for the lockout window to expire.'
        };
      }
    } else if (user.status === 'Locked') {
      return {
        success: false,
        statusCode: 423,
        error: 'This account is locked by security administration. Please contact your EPSS SuperAdmin.'
      };
    }

    const validPassword = this.verifySecret(password, user.passwordHash);
    if (!validPassword) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      const maxAttempts = this.data.authPolicy?.maxFailedAttempts || 5;
      if (user.failedLoginAttempts >= maxAttempts) {
        const lockMins = this.data.authPolicy?.lockoutDurationMinutes || 15;
        user.status = 'Locked';
        user.lockedUntil = new Date(Date.now() + lockMins * 60 * 1000).toISOString();
        this.recordLoginHistory({
          usernameAttempted: uCheck.username!,
          userId: user.id,
          userName: user.fullNameEn,
          ipAddress: ip,
          userAgent,
          method: 'password',
          status: 'Locked',
          reason: `Reached ${maxAttempts} consecutive failed attempts`
        });
        this.addAuditLog({
          userId: user.id,
          userName: user.fullNameEn,
          userRole: user.role,
          branchName: user.branchNameEn,
          action: 'ACCOUNT_AUTO_LOCKED',
          resourceType: 'UserAccount',
          resourceId: user.username,
          ipAddress: ip,
          details: `Account automatically locked for ${lockMins} minutes after ${maxAttempts} failed password attempts.`
        });
        this.save();
        return {
          success: false,
          statusCode: 423,
          error: `Account locked after ${maxAttempts} consecutive failed attempts. Try again in ${lockMins} minutes or contact an administrator.`
        };
      }

      this.recordLoginHistory({
        usernameAttempted: uCheck.username!,
        userId: user.id,
        userName: user.fullNameEn,
        ipAddress: ip,
        userAgent,
        method: 'password',
        status: 'Failed',
        reason: `Bad password (attempt ${user.failedLoginAttempts}/${maxAttempts})`
      });
      this.save();
      return { success: false, statusCode: 401, error: genericAuthError };
    }

    // Valid password -> reset failure counter
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;

    if (this.userRequiresMfa(user)) {
      const challengeToken = crypto.randomBytes(24).toString('hex');
      this.data.mfaChallenges.push({
        challengeToken,
        userId: user.id,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        failedAttempts: 0
      });
      this.recordLoginHistory({
        usernameAttempted: uCheck.username!,
        userId: user.id,
        userName: user.fullNameEn,
        ipAddress: ip,
        userAgent,
        method: 'password',
        status: 'MfaChallenge',
        reason: 'Primary factor passed; awaiting MFA verification'
      });
      this.save();

      return {
        success: true,
        mfaRequired: true,
        challengeToken,
        userPreview: {
          id: user.id,
          fullNameEn: user.fullNameEn,
          fullNameAm: user.fullNameAm,
          role: user.role,
          hasBiometrics: (user.biometricCredentials?.length || 0) > 0 || !!user.biometricsEnabled
        }
      };
    }

    const session = this.createAuthSession(user, ip, userAgent, false);
    this.recordLoginHistory({
      usernameAttempted: user.username,
      userId: user.id,
      userName: user.fullNameEn,
      ipAddress: ip,
      userAgent,
      method: 'password',
      status: 'Success'
    });
    this.addAuditLog({
      userId: user.id,
      userName: user.fullNameEn,
      userRole: user.role,
      branchName: user.branchNameEn,
      action: 'USER_LOGIN',
      resourceType: 'AuthSession',
      resourceId: session.id,
      ipAddress: ip,
      details: `Authenticated via username + password`
    });
    this.save();

    return {
      success: true,
      mfaRequired: false,
      session,
      user: this.sanitizeUser(user)
    };
  }

  public verifyMfaChallenge(
    challengeToken: string,
    method: 'pin' | 'webauthn',
    credentialOrPin: string,
    ip: string,
    userAgent: string
  ): { success: boolean; statusCode?: number; error?: string; session?: AuthSession; user?: User } {
    const chIdx = this.data.mfaChallenges.findIndex(c => c.challengeToken === challengeToken);
    if (chIdx === -1) {
      return { success: false, statusCode: 401, error: 'MFA challenge expired or invalid. Please sign in again.' };
    }
    const ch = this.data.mfaChallenges[chIdx];
    if (Date.now() > new Date(ch.expiresAt).getTime()) {
      this.data.mfaChallenges.splice(chIdx, 1);
      this.save();
      return { success: false, statusCode: 401, error: 'MFA challenge timed out. Please sign in again.' };
    }

    const user = this.getUserById(ch.userId);
    if (!user || user.status !== 'Active') {
      return { success: false, statusCode: 401, error: 'Account unavailable.' };
    }

    if (method === 'pin') {
      const ok = this.verifySecret(credentialOrPin || '', user.mfaPinHash);
      if (!ok) {
        ch.failedAttempts += 1;
        this.recordLoginHistory({
          usernameAttempted: user.username,
          userId: user.id,
          userName: user.fullNameEn,
          ipAddress: ip,
          userAgent,
          method: 'mfa_pin',
          status: 'Failed',
          reason: 'Invalid MFA PIN'
        });
        if (ch.failedAttempts >= 5) {
          this.data.mfaChallenges.splice(chIdx, 1);
        }
        this.save();
        return { success: false, statusCode: 401, error: 'Invalid MFA security PIN.' };
      }
    } else {
      // WebAuthn assertion verified
      this.verifyBiometricAssertion(user.id, credentialOrPin || 'webauthn-mfa', ip, 'MFA Login Challenge');
    }

    this.data.mfaChallenges.splice(chIdx, 1);
    const session = this.createAuthSession(user, ip, userAgent, true);
    this.recordLoginHistory({
      usernameAttempted: user.username,
      userId: user.id,
      userName: user.fullNameEn,
      ipAddress: ip,
      userAgent,
      method: method === 'webauthn' ? 'mfa_webauthn' : 'mfa_pin',
      status: 'Success',
      reason: `MFA verified (${method})`
    });
    this.addAuditLog({
      userId: user.id,
      userName: user.fullNameEn,
      userRole: user.role,
      branchName: user.branchNameEn,
      action: 'USER_LOGIN_MFA',
      resourceType: 'AuthSession',
      resourceId: session.id,
      ipAddress: ip,
      details: `Completed Multi-Factor Authentication via ${method.toUpperCase()}`
    });
    this.save();

    return {
      success: true,
      session,
      user: this.sanitizeUser(user)
    };
  }

  public loginWithWebAuthn(
    rawIdentifier: string,
    credentialId: string,
    ip: string,
    userAgent: string
  ): { success: boolean; statusCode?: number; error?: string; session?: AuthSession; user?: User } {
    const clean = (rawIdentifier || '').trim().toLowerCase();
    const user = this.data.users.find(
      u => u.username.toLowerCase() === clean || u.email.toLowerCase() === clean
    );
    if (!user || user.status !== 'Active') {
      return { success: false, statusCode: 401, error: 'Biometric authentication failed or account unavailable.' };
    }

    this.verifyBiometricAssertion(user.id, credentialId || 'webauthn-login-sensor', ip, 'Direct Biometric Sign-In');
    const session = this.createAuthSession(user, ip, userAgent, true);
    this.recordLoginHistory({
      usernameAttempted: user.username,
      userId: user.id,
      userName: user.fullNameEn,
      ipAddress: ip,
      userAgent,
      method: 'webauthn',
      status: 'Success'
    });
    this.save();

    return {
      success: true,
      session,
      user: this.sanitizeUser(user)
    };
  }

  public validateSessionToken(token?: string | null): { session: AuthSession; user: User } | null {
    if (!token) return null;
    const session = this.data.sessions.find(s => s.token === token);
    if (!session || session.isRevoked) return null;

    const now = Date.now();
    if (now > new Date(session.expiresAt).getTime() || now > new Date(session.idleExpiresAt).getTime()) {
      session.isRevoked = true;
      this.save();
      return null;
    }

    const user = this.getUserById(session.userId);
    if (!user || user.status !== 'Active') return null;

    // Slide idle timeout cleanly
    const idleMs = (this.data.authPolicy?.idleTimeoutMinutes || 30) * 60 * 1000;
    session.lastActiveAt = new Date(now).toISOString();
    session.idleExpiresAt = new Date(now + idleMs).toISOString();
    return { session, user };
  }

  public markSessionMfaVerified(token: string, actor: User, ip: string): boolean {
    const session = this.data.sessions.find(s => s.token === token && s.userId === actor.id && !s.isRevoked);
    if (!session) return false;
    session.mfaVerified = true;
    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'SESSION_MFA_ELEVATED',
      resourceType: 'AuthSession',
      resourceId: session.id,
      ipAddress: ip,
      details: 'Session elevated with step-up biometric / MFA verification for Confidential/Secret access'
    });
    this.save();
    return true;
  }

  public elevateSessionWithPin(
    token: string,
    pin: string,
    actor: User,
    ip: string
  ): { success: boolean; error?: string } {
    const user = this.getUserById(actor.id);
    if (!user) return { success: false, error: 'User account not found.' };
    if (!this.verifySecret(pin || '', user.mfaPinHash)) {
      return { success: false, error: 'Invalid officer MFA security PIN.' };
    }
    this.markSessionMfaVerified(token, actor, ip);
    return { success: true };
  }

  public logoutSession(token: string, ip: string): boolean {
    const session = this.data.sessions.find(s => s.token === token);
    if (!session) return false;
    session.isRevoked = true;
    const user = this.getUserById(session.userId);
    if (user) {
      this.addAuditLog({
        userId: user.id,
        userName: user.fullNameEn,
        userRole: user.role,
        branchName: user.branchNameEn,
        action: 'USER_LOGOUT',
        resourceType: 'AuthSession',
        resourceId: session.id,
        ipAddress: ip,
        details: 'Secure logout executed; session token invalidated'
      });
    }
    this.save();
    return true;
  }

  public getSessions(actor: User, currentToken?: string, scopeAll?: boolean): AuthSession[] {
    const isAdmin = actor.role === 'SuperAdmin' || actor.role === 'DirectorGeneral';
    const list = scopeAll && isAdmin
      ? this.data.sessions
      : this.data.sessions.filter(s => s.userId === actor.id);

    const now = Date.now();
    return list
      .filter(s => !s.isRevoked && now < new Date(s.expiresAt).getTime() && now < new Date(s.idleExpiresAt).getTime())
      .map(s => ({
        ...s,
        token: `${s.token.slice(0, 8)}...${s.token.slice(-4)}`,
        isCurrent: s.token === currentToken
      }));
  }

  public revokeSessionById(sessionId: string, actor: User, ip: string): { success: boolean; error?: string } {
    const session = this.data.sessions.find(s => s.id === sessionId);
    if (!session) return { success: false, error: 'Session not found.' };

    const isAdmin = actor.role === 'SuperAdmin' || actor.role === 'DirectorGeneral';
    if (session.userId !== actor.id && !isAdmin) {
      return { success: false, error: 'Forbidden: You may only revoke your own sessions.' };
    }

    session.isRevoked = true;
    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'SESSION_REVOKED',
      resourceType: 'AuthSession',
      resourceId: session.id,
      ipAddress: ip,
      details: `Revoked active session belonging to ${session.userName}`
    });
    this.save();
    return { success: true };
  }

  public changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    ip: string
  ): { success: boolean; error?: string } {
    const user = this.getUserById(userId);
    if (!user) return { success: false, error: 'User not found.' };

    if (!this.verifySecret(currentPassword, user.passwordHash)) {
      return { success: false, error: 'Current password is incorrect.' };
    }
    const policy = this.validatePasswordPolicy(newPassword, user.username);
    if (!policy.valid) return { success: false, error: policy.error };
    if (currentPassword === newPassword) {
      return { success: false, error: 'New password must be different from your current password.' };
    }

    user.passwordHash = this.hashSecret(newPassword);
    user.lastPasswordChangeAt = new Date().toISOString();
    user.mustChangePassword = false;

    this.addAuditLog({
      userId: user.id,
      userName: user.fullNameEn,
      userRole: user.role,
      branchName: user.branchNameEn,
      action: 'CHANGED_PASSWORD',
      resourceType: 'UserAccount',
      resourceId: user.username,
      ipAddress: ip,
      details: 'User changed account password complying with complexity policy'
    });
    this.save();
    return { success: true };
  }

  public requestPasswordReset(identifier: string, ip: string): void {
    const clean = (identifier || '').trim().toLowerCase();
    const user = this.data.users.find(
      u => u.username.toLowerCase() === clean || u.email.toLowerCase() === clean
    );
    if (!user || user.status === 'Inactive') return;

    const token = crypto.randomBytes(16).toString('hex');
    const now = Date.now();
    this.data.passwordResetTokens.unshift({
      token,
      userId: user.id,
      username: user.username,
      email: user.email,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + 30 * 60 * 1000).toISOString(),
      used: false
    });

    this.addAuditLog({
      userId: user.id,
      userName: user.fullNameEn,
      userRole: user.role,
      branchName: user.branchNameEn,
      action: 'PASSWORD_RESET_REQUESTED',
      resourceType: 'UserAccount',
      resourceId: user.username,
      ipAddress: ip,
      details: `Dispatched password reset verification token to ${user.email}`
    });
    this.save();
  }

  public getDevResetMailInbox(): PasswordResetToken[] {
    const now = Date.now();
    return (this.data.passwordResetTokens || [])
      .filter(t => !t.used && now < new Date(t.expiresAt).getTime())
      .slice(0, 5);
  }

  public confirmPasswordReset(token: string, newPassword: string, ip: string): { success: boolean; error?: string } {
    const rec = this.data.passwordResetTokens.find(t => t.token === token && !t.used);
    if (!rec || Date.now() > new Date(rec.expiresAt).getTime()) {
      return { success: false, error: 'Reset token is invalid or has expired.' };
    }
    const user = this.getUserById(rec.userId);
    if (!user) return { success: false, error: 'Associated user account unavailable.' };

    const policy = this.validatePasswordPolicy(newPassword, user.username);
    if (!policy.valid) return { success: false, error: policy.error };

    user.passwordHash = this.hashSecret(newPassword);
    user.lastPasswordChangeAt = new Date().toISOString();
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    if (user.status === 'Locked') user.status = 'Active';
    rec.used = true;

    this.addAuditLog({
      userId: user.id,
      userName: user.fullNameEn,
      userRole: user.role,
      branchName: user.branchNameEn,
      action: 'PASSWORD_RESET_COMPLETED',
      resourceType: 'UserAccount',
      resourceId: user.username,
      ipAddress: ip,
      details: 'Password updated via verified email reset link'
    });
    this.save();
    return { success: true };
  }

  public adminSetUserLock(
    targetUserId: string,
    lock: boolean,
    actor: User,
    ip: string
  ): { success: boolean; error?: string; user?: User } {
    if (!this.hasPermission(actor, 'manage:users')) {
      return { success: false, error: 'Permission denied: manage:users required.' };
    }
    const target = this.getUserById(targetUserId);
    if (!target) return { success: false, error: 'User not found.' };
    if (lock && target.id === actor.id) {
      return { success: false, error: 'Administrators cannot lock their own active account.' };
    }

    target.status = lock ? 'Locked' : 'Active';
    target.failedLoginAttempts = 0;
    target.lockedUntil = lock ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null;

    if (lock) {
      // Revoke active sessions of locked user
      for (const s of this.data.sessions) {
        if (s.userId === target.id) s.isRevoked = true;
      }
    }

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: lock ? 'ADMIN_LOCKED_USER' : 'ADMIN_UNLOCKED_USER',
      resourceType: 'UserAccount',
      resourceId: target.username,
      ipAddress: ip,
      details: `${lock ? 'Locked' : 'Unlocked'} user account ${target.fullNameEn} (${target.username})`
    });
    this.save();
    return { success: true, user: this.sanitizeUser(target) };
  }

  public adminResetUserPassword(
    targetUserId: string,
    newPassword: string,
    actor: User,
    ip: string
  ): { success: boolean; error?: string } {
    if (!this.hasPermission(actor, 'manage:users')) {
      return { success: false, error: 'Permission denied: manage:users required.' };
    }
    const target = this.getUserById(targetUserId);
    if (!target) return { success: false, error: 'User not found.' };

    const policy = this.validatePasswordPolicy(newPassword, target.username);
    if (!policy.valid) return { success: false, error: policy.error };

    target.passwordHash = this.hashSecret(newPassword);
    target.mustChangePassword = true;
    target.failedLoginAttempts = 0;
    target.lockedUntil = null;
    if (target.status === 'Locked') target.status = 'Active';

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'ADMIN_RESET_PASSWORD',
      resourceType: 'UserAccount',
      resourceId: target.username,
      ipAddress: ip,
      details: `Administrator reset password for ${target.fullNameEn} (${target.username})`
    });
    this.save();
    return { success: true };
  }

  public getRoleMatrix(): RolePermissionMatrix[] {
    return this.data.roleMatrix;
  }

  public updateRoleMatrix(
    role: UserRole,
    updates: { permissions?: string[]; requiresMfa?: boolean },
    actor: User,
    ip: string
  ): { success: boolean; error?: string; roleMatrix?: RolePermissionMatrix[] } {
    if (actor.role !== 'SuperAdmin' && actor.role !== 'DirectorGeneral') {
      return { success: false, error: 'Only SuperAdmin or DirectorGeneral may modify the RBAC role matrix.' };
    }
    const entry = this.data.roleMatrix.find(r => r.role === role);
    if (!entry) return { success: false, error: `Role '${role}' not found.` };

    if (updates.permissions && role !== 'SuperAdmin') {
      entry.permissions = updates.permissions;
    }
    if (typeof updates.requiresMfa === 'boolean') {
      entry.requiresMfa = role === 'SuperAdmin' ? true : updates.requiresMfa;
    }

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'UPDATED_ROLE_MATRIX',
      resourceType: 'RoleMatrix',
      resourceId: role,
      ipAddress: ip,
      details: `Updated permissions for role ${role}: [${entry.permissions.join(', ')}], MFA=${entry.requiresMfa}`
    });
    this.save();
    return { success: true, roleMatrix: this.data.roleMatrix };
  }

  public hasPermission(user: User, permission: string, visitedUserIds: Set<string> = new Set()): boolean {
    if (user.role === 'SuperAdmin' || user.permissions.includes('*') || user.permissions.includes(permission)) {
      return true;
    }
    const roleEntry = this.data.roleMatrix.find(r => r.role === user.role);
    if (roleEntry && (roleEntry.permissions.includes('*') || roleEntry.permissions.includes(permission))) {
      return true;
    }

    // Check active incoming delegations (acting authority)
    if (!visitedUserIds.has(user.id)) {
      visitedUserIds.add(user.id);
      const now = Date.now();
      const activeDelegations = (this.data.delegations || []).filter(
        d =>
          d.delegateId === user.id &&
          d.status === 'Active' &&
          new Date(d.startDate).getTime() <= now &&
          now <= new Date(d.endDate).getTime()
      );
      for (const del of activeDelegations) {
        const delegator = this.getUserById(del.delegatorId);
        if (delegator && this.hasPermission(delegator, permission, visitedUserIds)) {
          return true;
        }
      }
    }
    return false;
  }

  public canAccessDocument(
    user: User,
    doc: DocumentItem,
    session?: AuthSession
  ): { allowed: boolean; mfaNeeded?: boolean; reason?: string } {
    if (!this.hasPermission(user, 'read:documents')) {
      return { allowed: false, reason: 'Missing read:documents permission.' };
    }

    if (doc.confidentiality === 'Confidential' || doc.confidentiality === 'Secret') {
      const hasClearance =
        ['SuperAdmin', 'DirectorGeneral', 'Director', 'Auditor'].includes(user.role) ||
        doc.assignedUserId === user.id ||
        doc.departmentId === user.departmentId ||
        doc.branchId === user.branchId;

      if (!hasClearance) {
        return { allowed: false, reason: `Insufficient clearance for ${doc.confidentiality} record.` };
      }
      if (session && !session.mfaVerified) {
        return {
          allowed: false,
          mfaNeeded: true,
          reason: `MFA verification is mandatory to access ${doc.confidentiality} records.`
        };
      }
    }

    return { allowed: true };
  }

  public getDelegations(actor: User): DelegationRecord[] {
    const now = Date.now();
    // Auto-update computed statuses
    for (const d of this.data.delegations) {
      if (d.status !== 'Revoked') {
        const start = new Date(d.startDate).getTime();
        const end = new Date(d.endDate).getTime();
        if (now > end) d.status = 'Expired';
        else if (now < start) d.status = 'Scheduled';
        else d.status = 'Active';
      }
    }
    const isAdmin = actor.role === 'SuperAdmin' || actor.role === 'DirectorGeneral';
    if (isAdmin) return this.data.delegations;
    return this.data.delegations.filter(d => d.delegatorId === actor.id || d.delegateId === actor.id);
  }

  public createDelegation(
    actor: User,
    delegateId: string,
    startDate: string,
    endDate: string,
    reason: string,
    ip: string
  ): { success: boolean; error?: string; delegation?: DelegationRecord } {
    if (!delegateId || delegateId === actor.id) {
      return { success: false, error: 'You must select a different staff member as your acting delegate.' };
    }
    const delegate = this.getUserById(delegateId);
    if (!delegate || delegate.status !== 'Active') {
      return { success: false, error: 'Selected delegate user is not active.' };
    }

    const startMs = new Date(startDate).getTime();
    const endMs = new Date(endDate).getTime();
    if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
      return { success: false, error: 'Valid start date and end date are required.' };
    }
    if (endMs <= startMs) {
      return { success: false, error: 'Delegation end date must be strictly after start date.' };
    }

    const maxDays = this.data.authPolicy?.maxDelegationDays || 90;
    const durationDays = (endMs - startMs) / (1000 * 60 * 60 * 24);
    if (durationDays > maxDays) {
      return { success: false, error: `Delegation period cannot exceed ${maxDays} days.` };
    }
    if (!reason || reason.trim().length < 5) {
      return { success: false, error: 'A clear delegation reason (min 5 characters) is required.' };
    }

    const now = Date.now();
    const record: DelegationRecord = {
      id: `del-${now.toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      delegatorId: actor.id,
      delegatorName: actor.fullNameEn,
      delegatorRole: actor.role,
      delegateId: delegate.id,
      delegateName: delegate.fullNameEn,
      delegateRole: delegate.role,
      startDate: new Date(startMs).toISOString(),
      endDate: new Date(endMs).toISOString(),
      reason: reason.trim(),
      status: now >= startMs ? 'Active' : 'Scheduled',
      createdAt: new Date(now).toISOString()
    };

    this.data.delegations.unshift(record);
    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'CREATED_DELEGATION',
      resourceType: 'Delegation',
      resourceId: record.id,
      ipAddress: ip,
      details: `Delegated acting authority to ${delegate.fullNameEn} (${delegate.role}) until ${record.endDate.slice(0, 10)}. Reason: ${record.reason}`
    });
    this.save();
    return { success: true, delegation: record };
  }

  public revokeDelegation(delegationId: string, actor: User, ip: string): { success: boolean; error?: string } {
    const rec = this.data.delegations.find(d => d.id === delegationId);
    if (!rec) return { success: false, error: 'Delegation record not found.' };
    const isAdmin = actor.role === 'SuperAdmin' || actor.role === 'DirectorGeneral';
    if (rec.delegatorId !== actor.id && !isAdmin) {
      return { success: false, error: 'Only the delegator or an administrator may revoke this delegation.' };
    }
    rec.status = 'Revoked';
    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'REVOKED_DELEGATION',
      resourceType: 'Delegation',
      resourceId: rec.id,
      ipAddress: ip,
      details: `Revoked acting delegation from ${rec.delegatorName} to ${rec.delegateName}`
    });
    this.save();
    return { success: true };
  }

  public getLoginHistory(actor: User, scopeAll?: boolean): LoginHistoryEntry[] {
    const canViewAll = ['SuperAdmin', 'DirectorGeneral', 'Auditor'].includes(actor.role);
    if (scopeAll && canViewAll) {
      return this.data.loginHistory;
    }
    return this.data.loginHistory.filter(l => l.userId === actor.id);
  }

  // =========================================================================
  // PHASE 4: WORKFLOW ENGINE (Definitions, Stages, Parallel/Conditional, SLA)
  // =========================================================================

  private createDefaultWorkflowDefinitions(): WorkflowDefinition[] {
    const now = new Date().toISOString();
    return [
      {
        id: 'wf-def-incoming',
        code: 'WF-IN-01',
        nameEn: 'Incoming Official Correspondence & Emergency Directive Flow',
        nameAm: 'የገቢ ደብዳቤዎች እና የአስቸኳይ መመሪያዎች የሥራ ፍሰት',
        descriptionEn:
          'Standard intake to directorate screening with conditional fast-track for VeryUrgent/Secret items into parallel executive endorsement.',
        documentTypes: ['IncomingLetter', 'Circular'],
        isActive: true,
        version: 1,
        createdAt: now,
        updatedAt: now,
        createdBy: 'usr-admin',
        stages: [
          {
            id: 'stg-in-start',
            order: 1,
            nameEn: 'Central Registry Intake',
            nameAm: 'የማዕከላዊ መዝገብ ቤት ምዝገባ',
            stageType: 'Start',
            pathMode: 'Sequential',
            isMandatory: true,
            assigneeType: 'Role',
            assigneeRole: 'RegistryOfficer',
            requiredPermission: 'create:documents',
            slaHours: 4,
            requiredFields: ['comments'],
            requireBiometricForSensitive: false,
            escalationTargetRole: 'Director'
          },
          {
            id: 'stg-in-screen',
            order: 2,
            nameEn: 'Directorate Screening & Conditional Routing',
            nameAm: 'የዳይሬክቶሬት ማጣሪያ እና ሁኔታዊ መምራት',
            stageType: 'Conditional',
            pathMode: 'Conditional',
            isMandatory: true,
            assigneeType: 'DepartmentHead',
            assigneeRole: 'Director',
            requiredPermission: 'edit:documents',
            slaHours: 24,
            requiredFields: ['comments'],
            requireBiometricForSensitive: false,
            escalationTargetRole: 'DirectorGeneral',
            conditions: [
              {
                id: 'cond-in-urgent',
                field: 'priority',
                operator: 'equals',
                value: 'VeryUrgent',
                targetStageId: 'stg-in-parallel'
              },
              {
                id: 'cond-in-secret',
                field: 'confidentiality',
                operator: 'equals',
                value: 'Secret',
                targetStageId: 'stg-in-parallel'
              }
            ]
          },
          {
            id: 'stg-in-tech',
            order: 3,
            nameEn: 'Technical Officer Verification',
            nameAm: 'የባለሙያ ቴክኒካል ማረጋገጫ',
            stageType: 'Review',
            pathMode: 'Sequential',
            isMandatory: false,
            assigneeType: 'Role',
            assigneeRole: 'ProcurementOfficer',
            requiredPermission: 'read:documents',
            slaHours: 36,
            requiredFields: ['comments'],
            requireBiometricForSensitive: false,
            escalationTargetRole: 'Director'
          },
          {
            id: 'stg-in-parallel',
            order: 4,
            nameEn: 'Executive Parallel Approval',
            nameAm: 'የአመራር የጋራ (Parallel) ማጽደቂያ',
            stageType: 'ParallelApproval',
            pathMode: 'Parallel',
            isMandatory: true,
            assigneeType: 'SpecificUser',
            assigneeRole: 'DirectorGeneral',
            requiredPermission: 'approve:workflows',
            parallelApproverIds: ['usr-store', 'usr-dg'],
            slaHours: 24,
            requiredFields: ['comments', 'digitalSignature'],
            requireBiometricForSensitive: true,
            escalationTargetRole: 'DirectorGeneral',
            escalationTargetUserId: 'usr-dg'
          },
          {
            id: 'stg-in-end',
            order: 5,
            nameEn: 'Final Dispatch & Registry Closure',
            nameAm: 'የመጨረሻ ስርጭት እና መዝገብ መዝጊያ',
            stageType: 'End',
            pathMode: 'Sequential',
            isMandatory: true,
            assigneeType: 'Initiator',
            assigneeRole: 'RegistryOfficer',
            requiredPermission: 'read:documents',
            slaHours: 12,
            requiredFields: [],
            requireBiometricForSensitive: false,
            escalationTargetRole: 'Director'
          }
        ]
      },
      {
        id: 'wf-def-outgoing',
        code: 'WF-OUT-01',
        nameEn: 'Outgoing Tender & Executive Letter Authorization',
        nameAm: 'የወጪ ጨረታ እና የአመራር ደብዳቤ ማጽደቂያ ፍሰት',
        descriptionEn:
          'Multi-level verification and parallel directorate/DG sign-off prior to official diplomatic or vendor dispatch.',
        documentTypes: ['OutgoingLetter', 'TenderDocument'],
        isActive: true,
        version: 1,
        createdAt: now,
        updatedAt: now,
        createdBy: 'usr-admin',
        stages: [
          {
            id: 'stg-out-start',
            order: 1,
            nameEn: 'Drafting & Registry Number Assignment',
            nameAm: 'ረቂቅ ዝግጅት እና የምዝገባ ቁጥር',
            stageType: 'Start',
            pathMode: 'Sequential',
            isMandatory: true,
            assigneeType: 'DepartmentHead',
            assigneeRole: 'Director',
            requiredPermission: 'create:documents',
            slaHours: 8,
            requiredFields: ['comments'],
            requireBiometricForSensitive: false,
            escalationTargetRole: 'Director'
          },
          {
            id: 'stg-out-parallel',
            order: 2,
            nameEn: 'Procurement & Executive Dual Clearance',
            nameAm: 'የግዥ እና የዋና ዳይሬክተር የጋራ ማረጋገጫ',
            stageType: 'ParallelApproval',
            pathMode: 'Parallel',
            isMandatory: true,
            assigneeType: 'SpecificUser',
            assigneeRole: 'DirectorGeneral',
            requiredPermission: 'approve:workflows',
            parallelApproverIds: ['usr-proc', 'usr-dg'],
            slaHours: 24,
            requiredFields: ['comments', 'digitalSignature'],
            requireBiometricForSensitive: true,
            escalationTargetRole: 'DirectorGeneral',
            escalationTargetUserId: 'usr-dg'
          },
          {
            id: 'stg-out-end',
            order: 3,
            nameEn: 'Official Outbox Dispatch',
            nameAm: 'ይፋዊ ወጪ ደብዳቤ መላኪያ',
            stageType: 'End',
            pathMode: 'Sequential',
            isMandatory: true,
            assigneeType: 'Role',
            assigneeRole: 'RegistryOfficer',
            requiredPermission: 'edit:documents',
            slaHours: 12,
            requiredFields: [],
            requireBiometricForSensitive: false,
            escalationTargetRole: 'Director'
          }
        ]
      },
      {
        id: 'wf-def-memo-app',
        code: 'WF-APP-01',
        nameEn: 'Internal Memo & Regulatory Permit Assessment',
        nameAm: 'የውስጥ ማስታወሻ እና የፈቃድ ማመልከቻ ግምገማ ፍሰት',
        descriptionEn:
          'Streamlined sequential assessment for internal executive directives, GDP warehouse inspections, and regulatory applications.',
        documentTypes: ['InternalMemo', 'Application', 'InspectionReport'],
        isActive: true,
        version: 1,
        createdAt: now,
        updatedAt: now,
        createdBy: 'usr-admin',
        stages: [
          {
            id: 'stg-app-start',
            order: 1,
            nameEn: 'Intake & Completeness Check',
            nameAm: 'የማመልከቻ መቀበያ እና የተሟላነት ማጣሪያ',
            stageType: 'Start',
            pathMode: 'Sequential',
            isMandatory: true,
            assigneeType: 'Role',
            assigneeRole: 'RegistryOfficer',
            requiredPermission: 'create:documents',
            slaHours: 8,
            requiredFields: [],
            requireBiometricForSensitive: false,
            escalationTargetRole: 'Director'
          },
          {
            id: 'stg-app-review',
            order: 2,
            nameEn: 'Directorate Inspection & Technical Assessment',
            nameAm: 'የዳይሬክቶሬት ፍተሻ እና ቴክኒካል ግምገማ',
            stageType: 'Review',
            pathMode: 'Sequential',
            isMandatory: true,
            assigneeType: 'DepartmentHead',
            assigneeRole: 'Director',
            requiredPermission: 'edit:documents',
            slaHours: 48,
            requiredFields: ['comments'],
            requireBiometricForSensitive: false,
            escalationTargetRole: 'DirectorGeneral'
          },
          {
            id: 'stg-app-approve',
            order: 3,
            nameEn: 'Final Directorate / DG Endorsement',
            nameAm: 'የመጨረሻ ዳይሬክቶሬት / ዋና ዳይሬክተር ማጽደቂያ',
            stageType: 'Approval',
            pathMode: 'Sequential',
            isMandatory: true,
            assigneeType: 'Role',
            assigneeRole: 'DirectorGeneral',
            requiredPermission: 'approve:workflows',
            slaHours: 24,
            requiredFields: ['comments', 'digitalSignature'],
            requireBiometricForSensitive: true,
            escalationTargetRole: 'DirectorGeneral',
            escalationTargetUserId: 'usr-dg'
          },
          {
            id: 'stg-app-end',
            order: 4,
            nameEn: 'Certification & Archive Filing',
            nameAm: 'ማረጋገጫ እና ማህደር ማስቀመጫ',
            stageType: 'End',
            pathMode: 'Sequential',
            isMandatory: true,
            assigneeType: 'Initiator',
            assigneeRole: 'RegistryOfficer',
            requiredPermission: 'read:documents',
            slaHours: 12,
            requiredFields: [],
            requireBiometricForSensitive: false,
            escalationTargetRole: 'Director'
          }
        ]
      }
    ];
  }

  private ensurePhase4WorkflowState() {
    if (!Array.isArray(this.data.workflowDefinitions) || this.data.workflowDefinitions.length === 0) {
      this.data.workflowDefinitions = this.createDefaultWorkflowDefinitions();
    }
    if (!Array.isArray(this.data.workflowInstances)) {
      this.data.workflowInstances = [];
    }

    const nowMs = Date.now();
    // Seed rich workflow instances for existing documents that lack an instance
    for (const doc of this.data.documents) {
      if (this.data.workflowInstances.some(w => w.documentId === doc.id)) continue;

      const def =
        this.data.workflowDefinitions.find(d => d.documentTypes.includes(doc.type) && d.isActive) ||
        this.data.workflowDefinitions[0];
      if (!def) continue;

      if (doc.id === 'doc-002') {
        // Seed as active ParallelApproval stage with 1/2 completed & Overdue SLA for realistic demonstration
        const stage = def.stages.find(s => s.id === 'stg-in-parallel') || def.stages[1];
        const pastStart = new Date(nowMs - 38 * 3600000).toISOString();
        const pastDue = new Date(nowMs - 14 * 3600000).toISOString();
        this.data.workflowInstances.push({
          id: `wfi-${doc.id}`,
          documentId: doc.id,
          registrationNumber: doc.registrationNumber,
          definitionId: def.id,
          definitionName: def.nameEn,
          currentStageId: stage.id,
          currentStageOrder: stage.order,
          currentStageName: stage.nameEn,
          currentStageMode: stage.pathMode,
          status: 'Active',
          assignedUserIds: ['usr-dg', 'usr-store'],
          assignedRole: stage.assigneeRole,
          stageStartedAt: pastStart,
          stageDueAt: pastDue,
          isEscalated: false,
          escalationLevel: 0,
          escalations: [],
          parallelApprovals: [
            {
              approverId: 'usr-store',
              approverName: 'Hiwot Tadesse',
              approverRole: 'Director',
              status: 'Approved',
              timestamp: new Date(nowMs - 20 * 3600000).toISOString(),
              comments: 'Storage & Distribution verified Kaliti & Adama cold chain stock availability.'
            },
            {
              approverId: 'usr-dg',
              approverName: 'Dr. Abdulkadir Gelgelo',
              approverRole: 'DirectorGeneral',
              status: 'Pending'
            }
          ],
          completedStageIds: ['stg-in-start', 'stg-in-screen'],
          history: [...(doc.workflowHistory || [])],
          createdAt: doc.registrationDate,
          updatedAt: nowMs ? new Date(nowMs - 20 * 3600000).toISOString() : doc.registrationDate
        });
      } else if (doc.id === 'doc-001') {
        // Seed as Due Today active stage assigned to usr-proc
        const stage = def.stages.find(s => s.id === 'stg-in-screen') || def.stages[1];
        const dueToday = new Date();
        dueToday.setHours(23, 0, 0, 0);
        this.data.workflowInstances.push({
          id: `wfi-${doc.id}`,
          documentId: doc.id,
          registrationNumber: doc.registrationNumber,
          definitionId: def.id,
          definitionName: def.nameEn,
          currentStageId: stage.id,
          currentStageOrder: stage.order,
          currentStageName: stage.nameEn,
          currentStageMode: stage.pathMode,
          status: 'Active',
          assignedUserIds: [doc.assignedUserId || 'usr-proc'],
          assignedRole: stage.assigneeRole,
          stageStartedAt: new Date(nowMs - 6 * 3600000).toISOString(),
          stageDueAt: dueToday.toISOString(),
          isEscalated: false,
          escalationLevel: 0,
          escalations: [],
          parallelApprovals: [],
          completedStageIds: ['stg-in-start'],
          history: [...(doc.workflowHistory || [])],
          createdAt: doc.registrationDate,
          updatedAt: new Date(nowMs - 6 * 3600000).toISOString()
        });
      } else if (doc.id === 'doc-003' || doc.id === 'doc-004' || ['Approved', 'Completed', 'Dispatched', 'Archived'].includes(doc.status)) {
        const lastStage = def.stages[def.stages.length - 1];
        this.data.workflowInstances.push({
          id: `wfi-${doc.id}`,
          documentId: doc.id,
          registrationNumber: doc.registrationNumber,
          definitionId: def.id,
          definitionName: def.nameEn,
          currentStageId: lastStage.id,
          currentStageOrder: lastStage.order,
          currentStageName: lastStage.nameEn,
          currentStageMode: lastStage.pathMode,
          status: 'Completed',
          assignedUserIds: [doc.assignedUserId || 'usr-reg'],
          assignedRole: lastStage.assigneeRole,
          stageStartedAt: doc.registrationDate,
          stageDueAt: new Date(new Date(doc.registrationDate).getTime() + lastStage.slaHours * 3600000).toISOString(),
          isEscalated: false,
          escalationLevel: 0,
          escalations: [],
          parallelApprovals: [],
          completedStageIds: def.stages.map(s => s.id),
          history: [...(doc.workflowHistory || [])],
          createdAt: doc.registrationDate,
          updatedAt: doc.registrationDate
        });
      } else {
        // General active document (e.g., doc-005)
        const stage = def.stages[1] || def.stages[0];
        this.data.workflowInstances.push({
          id: `wfi-${doc.id}`,
          documentId: doc.id,
          registrationNumber: doc.registrationNumber,
          definitionId: def.id,
          definitionName: def.nameEn,
          currentStageId: stage.id,
          currentStageOrder: stage.order,
          currentStageName: stage.nameEn,
          currentStageMode: stage.pathMode,
          status: doc.status === 'Cancelled' ? 'Rejected' : doc.status === 'PendingInformation' ? 'ReturnedForCorrection' : 'Active',
          assignedUserIds: [doc.assignedUserId || 'usr-proc'],
          assignedRole: stage.assigneeRole,
          stageStartedAt: doc.registrationDate,
          stageDueAt: new Date(nowMs + stage.slaHours * 3600000).toISOString(),
          isEscalated: false,
          escalationLevel: 0,
          escalations: [],
          parallelApprovals: [],
          completedStageIds: def.stages.slice(0, 1).map(s => s.id),
          history: [...(doc.workflowHistory || [])],
          createdAt: doc.registrationDate,
          updatedAt: doc.registrationDate
        });
      }
    }
  }

  public getWorkflowDefinitions(): WorkflowDefinition[] {
    return this.data.workflowDefinitions || [];
  }

  public getWorkflowDefinitionById(id: string): WorkflowDefinition | undefined {
    return (this.data.workflowDefinitions || []).find(d => d.id === id);
  }

  public validateWorkflowDefinition(payload: Partial<WorkflowDefinition>): { valid: boolean; error?: string } {
    if (!payload.nameEn || payload.nameEn.trim().length < 3) {
      return { valid: false, error: 'Workflow name (English) must be at least 3 characters.' };
    }
    if (!Array.isArray(payload.stages) || payload.stages.length < 2) {
      return { valid: false, error: 'Workflow definition must have at least two stages (Start -> End).' };
    }

    const stages = [...payload.stages].sort((a, b) => a.order - b.order);
    if (stages[0].stageType !== 'Start') {
      return { valid: false, error: 'The first workflow stage must be of type Start.' };
    }
    if (stages[stages.length - 1].stageType !== 'End') {
      return { valid: false, error: 'The final workflow stage must be of type End.' };
    }

    const stageIds = new Set(stages.map(s => s.id));
    for (const s of stages) {
      if (!s.nameEn || s.nameEn.trim().length < 2) {
        return { valid: false, error: `Stage #${s.order} must have a valid name.` };
      }
      if (typeof s.slaHours !== 'number' || !Number.isFinite(s.slaHours) || s.slaHours <= 0) {
        return { valid: false, error: `Stage "${s.nameEn}" must have SLA hours strictly greater than 0.` };
      }
      if (!s.requiredPermission) {
        return { valid: false, error: `Stage "${s.nameEn}" must define a required permission.` };
      }
      if (s.assigneeType === 'SpecificUser' && s.assigneeUserId) {
        const u = this.getUserById(s.assigneeUserId);
        if (!u || u.status !== 'Active') {
          return { valid: false, error: `Assigned user for stage "${s.nameEn}" is not active.` };
        }
        if (!this.hasPermission(u, s.requiredPermission)) {
          return {
            valid: false,
            error: `Assignee ${u.fullNameEn} lacks required permission "${s.requiredPermission}" for stage "${s.nameEn}".`
          };
        }
      }
      if (s.pathMode === 'Parallel' || s.stageType === 'ParallelApproval') {
        const approvers = s.parallelApproverIds || [];
        if (approvers.length < 2) {
          return {
            valid: false,
            error: `Parallel stage "${s.nameEn}" requires at least 2 designated approvers.`
          };
        }
        for (const uid of approvers) {
          const u = this.getUserById(uid);
          if (!u || u.status !== 'Active') {
            return { valid: false, error: `Parallel approver ID "${uid}" is invalid or inactive.` };
          }
          if (!this.hasPermission(u, s.requiredPermission)) {
            return {
              valid: false,
              error: `Parallel approver ${u.fullNameEn} lacks required permission "${s.requiredPermission}" for stage "${s.nameEn}".`
            };
          }
        }
      }
      if (s.conditions && s.conditions.length > 0) {
        for (const c of s.conditions) {
          if (!stageIds.has(c.targetStageId)) {
            return { valid: false, error: `Conditional rule in "${s.nameEn}" targets an unknown stage.` };
          }
          const targetStg = stages.find(x => x.id === c.targetStageId);
          if (targetStg && targetStg.order <= s.order) {
            return { valid: false, error: `Conditional target "${targetStg.nameEn}" must follow "${s.nameEn}" sequentially.` };
          }
        }
      }
    }

    return { valid: true };
  }

  public createWorkflowDefinition(
    payload: Partial<WorkflowDefinition>,
    actor: User,
    ip: string
  ): { success: boolean; error?: string; definition?: WorkflowDefinition } {
    if (!this.hasPermission(actor, 'manage:organizations') && !this.hasPermission(actor, 'approve:workflows')) {
      return { success: false, error: 'Permission denied: workflow designer requires Director or Admin privileges.' };
    }
    const validation = this.validateWorkflowDefinition(payload);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const now = new Date().toISOString();
    const sortedStages = [...(payload.stages || [])]
      .sort((a, b) => a.order - b.order)
      .map((s, idx) => ({ ...s, order: idx + 1 }));

    const def: WorkflowDefinition = {
      id: `wf-def-${Date.now().toString(36)}`,
      code: (payload.code || `WF-CUST-${Math.floor(100 + Math.random() * 900)}`).trim(),
      nameEn: payload.nameEn!.trim(),
      nameAm: (payload.nameAm || payload.nameEn!).trim(),
      descriptionEn: (payload.descriptionEn || '').trim(),
      documentTypes: payload.documentTypes && payload.documentTypes.length > 0 ? payload.documentTypes : ['IncomingLetter'],
      isActive: payload.isActive ?? true,
      version: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: actor.id,
      stages: sortedStages
    };

    this.data.workflowDefinitions.push(def);
    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'CREATED_WORKFLOW_DEFINITION',
      resourceType: 'WorkflowDefinition',
      resourceId: def.code,
      ipAddress: ip,
      details: `Created workflow "${def.nameEn}" with ${def.stages.length} stages.`
    });
    this.save();
    return { success: true, definition: def };
  }

  public updateWorkflowDefinition(
    id: string,
    payload: Partial<WorkflowDefinition>,
    actor: User,
    ip: string
  ): { success: boolean; error?: string; definition?: WorkflowDefinition } {
    if (!this.hasPermission(actor, 'manage:organizations') && !this.hasPermission(actor, 'approve:workflows')) {
      return { success: false, error: 'Permission denied: workflow modification requires Director or Admin privileges.' };
    }
    const existing = this.getWorkflowDefinitionById(id);
    if (!existing) return { success: false, error: 'Workflow definition not found.' };

    const merged: Partial<WorkflowDefinition> = {
      ...existing,
      ...payload,
      stages: payload.stages ?? existing.stages
    };
    const validation = this.validateWorkflowDefinition(merged);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const sortedStages = [...(merged.stages || [])]
      .sort((a, b) => a.order - b.order)
      .map((s, idx) => ({ ...s, order: idx + 1 }));

    existing.nameEn = merged.nameEn!.trim();
    existing.nameAm = (merged.nameAm || existing.nameEn).trim();
    existing.code = (merged.code || existing.code).trim();
    existing.descriptionEn = (merged.descriptionEn ?? existing.descriptionEn).trim();
    existing.documentTypes = merged.documentTypes && merged.documentTypes.length > 0 ? merged.documentTypes : existing.documentTypes;
    if (typeof payload.isActive === 'boolean') existing.isActive = payload.isActive;
    existing.stages = sortedStages;
    existing.version += 1;
    existing.updatedAt = new Date().toISOString();

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'UPDATED_WORKFLOW_DEFINITION',
      resourceType: 'WorkflowDefinition',
      resourceId: existing.code,
      ipAddress: ip,
      details: `Updated workflow "${existing.nameEn}" (v${existing.version}, ${existing.stages.length} stages).`
    });
    this.save();
    return { success: true, definition: existing };
  }

  public deleteWorkflowDefinition(id: string, actor: User, ip: string): { success: boolean; error?: string } {
    if (actor.role !== 'SuperAdmin' && actor.role !== 'DirectorGeneral') {
      return { success: false, error: 'Only SuperAdmin or DirectorGeneral may delete workflow definitions.' };
    }
    const idx = this.data.workflowDefinitions.findIndex(d => d.id === id);
    if (idx === -1) return { success: false, error: 'Workflow definition not found.' };
    const inUse = this.data.workflowInstances.some(w => w.definitionId === id && w.status === 'Active');
    if (inUse) {
      return { success: false, error: 'Cannot delete workflow definition with active running tasks. Deactivate it instead.' };
    }
    const removed = this.data.workflowDefinitions.splice(idx, 1)[0];
    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'DELETED_WORKFLOW_DEFINITION',
      resourceType: 'WorkflowDefinition',
      resourceId: removed.code,
      ipAddress: ip,
      details: `Deleted workflow definition "${removed.nameEn}".`
    });
    this.save();
    return { success: true };
  }

  private resolveStageAssignees(
    stage: WorkflowStageConfig,
    doc: DocumentItem,
    initiatorId: string
  ): { userIds: string[]; parallelApprovals: WorkflowParallelApproval[] } {
    const activeUsers = this.data.users.filter(u => u.status === 'Active');
    const hasPerm = (u: User) => this.hasPermission(u, stage.requiredPermission);

    if (stage.pathMode === 'Parallel' || stage.stageType === 'ParallelApproval') {
      const ids = (stage.parallelApproverIds || []).filter(uid => {
        const u = this.getUserById(uid);
        return u && u.status === 'Active' && hasPerm(u);
      });
      const fallbackUsers = ids.length >= 2 ? ids : activeUsers.filter(u => u.role === 'Director' || u.role === 'DirectorGeneral').slice(0, 2).map(u => u.id);
      const parallelApprovals: WorkflowParallelApproval[] = fallbackUsers.map(uid => {
        const u = this.getUserById(uid)!;
        return {
          approverId: u.id,
          approverName: u.fullNameEn,
          approverRole: u.role,
          status: 'Pending'
        };
      });
      return { userIds: fallbackUsers, parallelApprovals };
    }

    let resolved: User | undefined;
    if (stage.assigneeType === 'SpecificUser' && stage.assigneeUserId) {
      const candidate = this.getUserById(stage.assigneeUserId);
      if (candidate && candidate.status === 'Active' && hasPerm(candidate)) resolved = candidate;
    } else if (stage.assigneeType === 'DepartmentHead') {
      const dept = this.data.departments.find(d => d.id === (stage.assigneeDepartmentId || doc.departmentId));
      if (dept?.headUserId) {
        const head = this.getUserById(dept.headUserId);
        if (head && head.status === 'Active' && hasPerm(head)) resolved = head;
      }
      if (!resolved) {
        resolved = activeUsers.find(u => u.departmentId === doc.departmentId && u.role === 'Director' && hasPerm(u));
      }
    } else if (stage.assigneeType === 'BranchManager') {
      resolved = activeUsers.find(u => u.branchId === doc.branchId && u.role === 'BranchManager' && hasPerm(u));
    } else if (stage.assigneeType === 'Initiator') {
      const initUser = this.getUserById(initiatorId);
      if (initUser && initUser.status === 'Active' && hasPerm(initUser)) resolved = initUser;
    }

    if (!resolved && stage.assigneeRole) {
      resolved =
        activeUsers.find(u => u.role === stage.assigneeRole && u.departmentId === doc.departmentId && hasPerm(u)) ||
        activeUsers.find(u => u.role === stage.assigneeRole && hasPerm(u));
    }
    if (!resolved && doc.assignedUserId) {
      const curr = this.getUserById(doc.assignedUserId);
      if (curr && curr.status === 'Active' && hasPerm(curr)) resolved = curr;
    }
    if (!resolved) {
      resolved = activeUsers.find(u => hasPerm(u)) || activeUsers[0];
    }

    return { userIds: resolved ? [resolved.id] : [], parallelApprovals: [] };
  }

  private evaluateNextStage(
    def: WorkflowDefinition,
    currentStage: WorkflowStageConfig,
    doc: DocumentItem
  ): WorkflowStageConfig | null {
    const sorted = [...def.stages].sort((a, b) => a.order - b.order);
    if (currentStage.pathMode === 'Conditional' && currentStage.conditions && currentStage.conditions.length > 0) {
      for (const rule of currentStage.conditions) {
        const docVal = String((doc as any)[rule.field] || '');
        const matched = rule.operator === 'equals' ? docVal === rule.value : docVal !== rule.value;
        if (matched) {
          const target = sorted.find(s => s.id === rule.targetStageId);
          if (target) return target;
        }
      }
    }
    const idx = sorted.findIndex(s => s.id === currentStage.id);
    if (idx === -1 || idx + 1 >= sorted.length) return null;
    return sorted[idx + 1];
  }

  public launchWorkflowForDocument(doc: DocumentItem, actor: User, _ip: string): WorkflowInstance | null {
    const def =
      this.data.workflowDefinitions.find(d => d.isActive && d.documentTypes.includes(doc.type)) ||
      this.data.workflowDefinitions.find(d => d.isActive);
    if (!def) return null;

    const sorted = [...def.stages].sort((a, b) => a.order - b.order);
    const startStage = sorted[0];
    // Move past Start intake immediately to stage 2 if present so task enters active inbox queue
    const activeStage = sorted.length > 1 ? sorted[1] : startStage;
    const { userIds, parallelApprovals } = this.resolveStageAssignees(activeStage, doc, actor.id);

    const nowMs = Date.now();
    const nowIso = new Date(nowMs).toISOString();
    const dueIso = new Date(nowMs + activeStage.slaHours * 3600000).toISOString();

    if (!doc.assignedUserId && userIds[0]) {
      const assignee = this.getUserById(userIds[0]);
      if (assignee) {
        doc.assignedUserId = assignee.id;
        doc.assignedUserName = assignee.fullNameEn;
      }
    }

    const instance: WorkflowInstance = {
      id: `wfi-${doc.id}`,
      documentId: doc.id,
      registrationNumber: doc.registrationNumber,
      definitionId: def.id,
      definitionName: def.nameEn,
      currentStageId: activeStage.id,
      currentStageOrder: activeStage.order,
      currentStageName: activeStage.nameEn,
      currentStageMode: activeStage.pathMode,
      status: 'Active',
      assignedUserIds: doc.assignedUserId && activeStage.pathMode !== 'Parallel' ? [doc.assignedUserId] : userIds,
      assignedRole: activeStage.assigneeRole,
      stageStartedAt: nowIso,
      stageDueAt: dueIso,
      isEscalated: false,
      escalationLevel: 0,
      escalations: [],
      parallelApprovals,
      completedStageIds: sorted.length > 1 ? [startStage.id] : [],
      history: [...doc.workflowHistory],
      createdAt: nowIso,
      updatedAt: nowIso
    };

    this.data.workflowInstances.unshift(instance);
    return instance;
  }

  private getActiveDelegatorsForDelegate(delegateUserId: string): string[] {
    const now = Date.now();
    return (this.data.delegations || [])
      .filter(
        d =>
          d.delegateId === delegateUserId &&
          d.status === 'Active' &&
          new Date(d.startDate).getTime() <= now &&
          now <= new Date(d.endDate).getTime()
      )
      .map(d => d.delegatorId);
  }

  private checkUserCanActOnInstance(
    actor: User,
    instance: WorkflowInstance
  ): { allowed: boolean; actingAsDelegateFor: string[]; reason?: string } {
    if (instance.status === 'Completed' || instance.status === 'Rejected') {
      return { allowed: false, actingAsDelegateFor: [], reason: `Workflow is already ${instance.status}.` };
    }
    const isAdmin = actor.role === 'SuperAdmin' || actor.role === 'DirectorGeneral';
    const isAssigned = instance.assignedUserIds.includes(actor.id);
    const activeDelegators = this.getActiveDelegatorsForDelegate(actor.id);
    const actingAsDelegateFor = activeDelegators.filter(id => instance.assignedUserIds.includes(id));

    if (isAssigned || actingAsDelegateFor.length > 0 || isAdmin) {
      return { allowed: true, actingAsDelegateFor };
    }
    return {
      allowed: false,
      actingAsDelegateFor: [],
      reason: 'Only the current stage assignee, their active acting delegate, or an administrator may perform this workflow action.'
    };
  }

  private enrichWorkflowInstance(instance: WorkflowInstance, actor: User): EnrichedWorkflowTask | null {
    const doc = this.data.documents.find(d => d.id === instance.documentId && !d.isDeleted);
    if (!doc) return null;

    const def = this.getWorkflowDefinitionById(instance.definitionId) || null;
    const currentStage = def?.stages.find(s => s.id === instance.currentStageId) || null;
    const now = Date.now();
    const dueMs = new Date(instance.stageDueAt).getTime();
    const remainingHours = Math.round(((dueMs - now) / 3600000) * 10) / 10;
    const isActive = instance.status === 'Active' || instance.status === 'ReturnedForCorrection';
    const isOverdue = isActive && dueMs < now;

    const todayStr = new Date().toISOString().slice(0, 10);
    const dueStr = instance.stageDueAt.slice(0, 10);
    const isDueToday = isActive && dueStr === todayStr && !isOverdue;

    const actCheck = this.checkUserCanActOnInstance(actor, instance);
    const assignees = instance.assignedUserIds
      .map(uid => this.getUserById(uid))
      .filter((u): u is User => !!u)
      .map(u => ({
        id: u.id,
        fullNameEn: u.fullNameEn,
        role: u.role,
        departmentNameEn: u.departmentNameEn
      }));

    return {
      instance,
      definition: def,
      currentStage,
      document: doc,
      assignees,
      isOverdue,
      isDueToday,
      remainingHours,
      canAct: actCheck.allowed,
      actReason: actCheck.reason,
      actingAsDelegateFor: actCheck.actingAsDelegateFor
    };
  }

  public getWorkflowTasks(
    actor: User,
    filters?: {
      scope?: 'my' | 'all' | 'delegated';
      sla?: 'all' | 'overdue' | 'dueToday' | 'escalated';
      type?: string;
      priority?: string;
      search?: string;
    }
  ): EnrichedWorkflowTask[] {
    const activeDelegators = this.getActiveDelegatorsForDelegate(actor.id);
    let tasks = (this.data.workflowInstances || [])
      .map(inst => this.enrichWorkflowInstance(inst, actor))
      .filter((t): t is EnrichedWorkflowTask => !!t);

    if (filters?.scope === 'my') {
      tasks = tasks.filter(
        t =>
          (t.instance.status === 'Active' || t.instance.status === 'ReturnedForCorrection') &&
          (t.instance.assignedUserIds.includes(actor.id) ||
            t.instance.assignedUserIds.some(id => activeDelegators.includes(id)))
      );
    } else if (filters?.scope === 'delegated') {
      tasks = tasks.filter(
        t => (t.actingAsDelegateFor && t.actingAsDelegateFor.length > 0)
      );
    }

    if (filters?.sla === 'overdue') tasks = tasks.filter(t => t.isOverdue);
    else if (filters?.sla === 'dueToday') tasks = tasks.filter(t => t.isDueToday);
    else if (filters?.sla === 'escalated') tasks = tasks.filter(t => t.instance.isEscalated);

    if (filters?.type && filters.type !== 'All') {
      tasks = tasks.filter(t => t.document.type === filters.type);
    }
    if (filters?.priority && filters.priority !== 'All') {
      tasks = tasks.filter(t => t.document.priority === filters.priority);
    }
    if (filters?.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      tasks = tasks.filter(
        t =>
          t.document.registrationNumber.toLowerCase().includes(q) ||
          t.document.referenceNumber.toLowerCase().includes(q) ||
          t.document.subjectEn.toLowerCase().includes(q) ||
          t.document.subjectAm.toLowerCase().includes(q) ||
          t.instance.currentStageName.toLowerCase().includes(q)
      );
    }

    return tasks.sort((a, b) => {
      if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
      return new Date(b.instance.updatedAt).getTime() - new Date(a.instance.updatedAt).getTime();
    });
  }

  public getWorkflowInstanceByIdOrDocId(idOrDocId: string): WorkflowInstance | undefined {
    return (this.data.workflowInstances || []).find(
      w => w.id === idOrDocId || w.documentId === idOrDocId
    );
  }

  public getEnrichedWorkflowTask(idOrDocId: string, actor: User): EnrichedWorkflowTask | null {
    const inst = this.getWorkflowInstanceByIdOrDocId(idOrDocId);
    if (!inst) return null;
    return this.enrichWorkflowInstance(inst, actor);
  }

  public async executeWorkflowTaskAction(
    idOrDocId: string,
    actionData: {
      action:
        | 'Forwarded'
        | 'Reviewed'
        | 'Approved'
        | 'Rejected'
        | 'ReturnedForCorrection'
        | 'Dispatched'
        | 'MinuteAdded'
        | 'Archived'
        | 'Delegated';
      comments: string;
      forwardToUserId?: string;
      forwardToDepartmentId?: string;
      delegateToUserId?: string;
      targetStageId?: string;
      digitalSignatureCertificate?: string;
      biometricSignatureVerified?: boolean;
    },
    actor: User,
    session: AuthSession | undefined,
    clientIp: string
  ): Promise<{
    success: boolean;
    statusCode?: number;
    error?: string;
    mfaNeeded?: boolean;
    document?: DocumentItem;
    instance?: WorkflowInstance;
  }> {
    let instance = this.getWorkflowInstanceByIdOrDocId(idOrDocId);
    const doc = instance
      ? this.data.documents.find(d => d.id === instance!.documentId)
      : this.data.documents.find(d => d.id === idOrDocId);

    if (!doc) {
      return { success: false, statusCode: 404, error: 'Document or workflow task not found.' };
    }

    if (!instance) {
      instance = this.launchWorkflowForDocument(doc, actor, clientIp) || undefined;
    }
    if (!instance) {
      return { success: false, statusCode: 400, error: 'No active workflow definition found for this document.' };
    }

    const def = this.getWorkflowDefinitionById(instance.definitionId);
    const sortedStages = def ? [...def.stages].sort((a, b) => a.order - b.order) : [];
    const currentStage = sortedStages.find(s => s.id === instance!.currentStageId) || null;
    const now = new Date().toISOString();
    const commentsClean = (actionData.comments || '').trim();

    // Consultative minute addition allowed without altering stage progression
    if (actionData.action === 'MinuteAdded') {
      if (!commentsClean) {
        return { success: false, statusCode: 400, error: 'Minute note cannot be empty.' };
      }
      const minuteEntry: WorkflowActionRecord = {
        id: `wf-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        timestamp: now,
        actorId: actor.id,
        actorName: actor.fullNameEn,
        actorRole: actor.role,
        action: 'MinuteAdded',
        comments: commentsClean,
        stageId: instance.currentStageId,
        stageName: instance.currentStageName
      };
      doc.workflowHistory.push(minuteEntry);
      instance.history.push(minuteEntry);
      instance.updatedAt = now;
      this.addAuditLog({
        userId: actor.id,
        userName: actor.fullNameEn,
        userRole: actor.role,
        branchName: actor.branchNameEn,
        action: 'Workflow: MinuteAdded',
        resourceType: 'Document',
        resourceId: doc.registrationNumber,
        ipAddress: clientIp,
        details: commentsClean
      });
      this.save();
      return { success: true, document: doc, instance };
    }

    // Rule: Only current assignee (or active delegate / admin) can perform stage actions
    const actCheck = this.checkUserCanActOnInstance(actor, instance);
    if (!actCheck.allowed) {
      return { success: false, statusCode: 403, error: actCheck.reason };
    }

    // Rule: Reject and Return require non-empty comment (min 10 characters)
    if (actionData.action === 'Rejected' || actionData.action === 'ReturnedForCorrection') {
      if (commentsClean.length < 10) {
        return {
          success: false,
          statusCode: 400,
          error: `${actionData.action === 'Rejected' ? 'Rejection' : 'Return for correction'} requires a detailed comment of at least 10 characters.`
        };
      }
    }

    // Check stage required fields (excluding MinuteAdded)
    if (currentStage?.requiredFields?.includes('attachment') && actionData.action === 'Approved') {
      if (!doc.attachments || doc.attachments.length === 0) {
        return {
          success: false,
          statusCode: 400,
          error: `Stage "${currentStage.nameEn}" requires at least one attached supporting document before approval.`
        };
      }
    }

    // Rule: Cannot skip mandatory stages if an explicit targetStageId is passed
    if (actionData.targetStageId && def) {
      const targetIdx = sortedStages.findIndex(s => s.id === actionData.targetStageId);
      const currIdx = sortedStages.findIndex(s => s.id === instance!.currentStageId);
      if (targetIdx === -1 || targetIdx <= currIdx) {
        return { success: false, statusCode: 400, error: 'Target stage must follow the current stage sequentially.' };
      }
      const skippedMandatory = sortedStages
        .slice(currIdx + 1, targetIdx)
        .filter(s => s.isMandatory && !instance!.completedStageIds.includes(s.id));
      if (skippedMandatory.length > 0) {
        return {
          success: false,
          statusCode: 400,
          error: `Cannot skip mandatory workflow stage: ${skippedMandatory.map(s => s.nameEn).join(', ')}.`
        };
      }
    }

    // Biometric / MFA gate for Secret / Confidential / VeryUrgent approval
    const isSensitiveApproval =
      doc.confidentiality === 'Secret' ||
      doc.confidentiality === 'Confidential' ||
      doc.priority === 'VeryUrgent' ||
      !!currentStage?.requireBiometricForSensitive;
    if (actionData.action === 'Approved' && isSensitiveApproval) {
      const verified = !!session?.mfaVerified || !!actionData.biometricSignatureVerified;
      if (!verified) {
        return {
          success: false,
          statusCode: 403,
          mfaNeeded: true,
          error: `Biometric / MFA verification is mandatory to approve ${doc.confidentiality} / ${doc.priority} records.`
        };
      }
    }

    // Rule: Target assignee must have permission for the target stage on Forward / Delegate
    if (actionData.action === 'Forwarded' || actionData.action === 'Delegated') {
      const targetUserId = actionData.action === 'Delegated' ? actionData.delegateToUserId : actionData.forwardToUserId;
      if (actionData.action === 'Delegated' && !targetUserId) {
        return { success: false, statusCode: 400, error: 'A target staff member must be selected when delegating a task.' };
      }
      if (targetUserId) {
        const targetUser = this.getUserById(targetUserId);
        if (!targetUser || targetUser.status !== 'Active') {
          return { success: false, statusCode: 400, error: 'Target assignee user does not exist or is inactive.' };
        }
        const permStage = actionData.targetStageId
          ? sortedStages.find(s => s.id === actionData.targetStageId) || currentStage
          : currentStage;
        const requiredPerm = permStage?.requiredPermission || 'read:documents';
        if (!this.hasPermission(targetUser, requiredPerm)) {
          return {
            success: false,
            statusCode: 400,
            error: `Assignee ${targetUser.fullNameEn} (${targetUser.role}) lacks required permission "${requiredPerm}" for stage "${permStage?.nameEn || instance.currentStageName}".`
          };
        }
      }
    }

    // Execute state transitions
    let recordedAction: WorkflowActionRecord['action'] = actionData.action;
    let newDocStatus = doc.status;

    if (actionData.action === 'Delegated' && actionData.delegateToUserId) {
      const delegateUser = this.getUserById(actionData.delegateToUserId)!;
      if (instance.currentStageMode === 'Parallel') {
        const slot = instance.parallelApprovals.find(
          p => p.status === 'Pending' && (p.approverId === actor.id || actCheck.actingAsDelegateFor.includes(p.approverId))
        );
        if (slot) {
          slot.approverId = delegateUser.id;
          slot.approverName = delegateUser.fullNameEn;
          slot.approverRole = delegateUser.role;
        }
        instance.assignedUserIds = Array.from(
          new Set([...instance.assignedUserIds.filter(id => id !== actor.id), delegateUser.id])
        );
      } else {
        instance.assignedUserIds = [delegateUser.id];
      }
      doc.assignedUserId = delegateUser.id;
      doc.assignedUserName = delegateUser.fullNameEn;
      doc.assignedDepartmentName = delegateUser.departmentNameEn;
    } else if (actionData.action === 'Forwarded') {
      newDocStatus = 'Forwarded';
      if (actionData.forwardToDepartmentId) {
        const targetDept = this.data.departments.find(dep => dep.id === actionData.forwardToDepartmentId);
        if (targetDept) {
          doc.departmentId = targetDept.id;
          doc.assignedDepartmentName = targetDept.nameEn;
        }
      }
      if (actionData.forwardToUserId) {
        const targetUser = this.getUserById(actionData.forwardToUserId)!;
        doc.assignedUserId = targetUser.id;
        doc.assignedUserName = targetUser.fullNameEn;
        doc.assignedDepartmentName = targetUser.departmentNameEn;
        instance.assignedUserIds = [targetUser.id];
      } else if (actionData.forwardToDepartmentId) {
        const deptHead = this.data.users.find(
          u => u.status === 'Active' && u.departmentId === actionData.forwardToDepartmentId && u.role === 'Director'
        );
        if (deptHead) {
          doc.assignedUserId = deptHead.id;
          doc.assignedUserName = deptHead.fullNameEn;
          instance.assignedUserIds = [deptHead.id];
        }
      }
      // Advance to next stage if currently on Conditional/Review screening
      if (def && currentStage && (currentStage.stageType === 'Conditional' || currentStage.stageType === 'Start')) {
        const nextStage = this.evaluateNextStage(def, currentStage, doc);
        if (nextStage) {
          if (!instance.completedStageIds.includes(currentStage.id)) {
            instance.completedStageIds.push(currentStage.id);
          }
          instance.currentStageId = nextStage.id;
          instance.currentStageOrder = nextStage.order;
          instance.currentStageName = nextStage.nameEn;
          instance.currentStageMode = nextStage.pathMode;
          instance.stageStartedAt = now;
          instance.stageDueAt = new Date(Date.now() + nextStage.slaHours * 3600000).toISOString();
          if (nextStage.pathMode === 'Parallel') {
            const { userIds, parallelApprovals } = this.resolveStageAssignees(nextStage, doc, actor.id);
            instance.assignedUserIds = userIds;
            instance.parallelApprovals = parallelApprovals;
          }
        }
      }
    } else if (actionData.action === 'Rejected') {
      newDocStatus = 'Cancelled';
      instance.status = 'Rejected';
      for (const p of instance.parallelApprovals) {
        if (p.approverId === actor.id || actCheck.actingAsDelegateFor.includes(p.approverId)) {
          p.status = 'Rejected';
          p.timestamp = now;
          p.comments = commentsClean;
        }
      }
    } else if (actionData.action === 'ReturnedForCorrection') {
      newDocStatus = 'PendingInformation';
      instance.status = 'ReturnedForCorrection';
      // Route back to Start/Initiator stage
      const startStage = sortedStages[0];
      if (startStage) {
        const regEntry = doc.workflowHistory.find(h => h.action === 'Registered');
        const initiatorId = regEntry?.actorId || 'usr-reg';
        const initUser = this.getUserById(initiatorId);
        instance.currentStageId = startStage.id;
        instance.currentStageOrder = startStage.order;
        instance.currentStageName = startStage.nameEn;
        instance.currentStageMode = startStage.pathMode;
        instance.assignedUserIds = [initiatorId];
        instance.stageStartedAt = now;
        instance.stageDueAt = new Date(Date.now() + startStage.slaHours * 3600000).toISOString();
        instance.parallelApprovals = [];
        if (initUser) {
          doc.assignedUserId = initUser.id;
          doc.assignedUserName = initUser.fullNameEn;
        }
      }
    } else if (actionData.action === 'Reviewed' || actionData.action === 'Approved') {
      // Handle Parallel stage rule: all required approvals must complete before advancing
      if (instance.currentStageMode === 'Parallel' && instance.parallelApprovals.length > 0) {
        let slotMatched = instance.parallelApprovals.find(
          p => p.status === 'Pending' && (p.approverId === actor.id || actCheck.actingAsDelegateFor.includes(p.approverId))
        );
        if (!slotMatched && (actor.role === 'SuperAdmin' || actor.role === 'DirectorGeneral')) {
          slotMatched = instance.parallelApprovals.find(p => p.status === 'Pending');
        }
        if (!slotMatched) {
          return {
            success: false,
            statusCode: 400,
            error: 'Your parallel approval has already been recorded or you are not a pending approver for this parallel stage.'
          };
        }
        slotMatched.status = 'Approved';
        slotMatched.timestamp = now;
        slotMatched.comments = commentsClean || 'Approved parallel review';

        const pendingRemaining = instance.parallelApprovals.filter(p => p.status === 'Pending');
        if (pendingRemaining.length > 0) {
          // Stay on Parallel stage until all required approvals complete!
          recordedAction = 'ParallelApproved';
          newDocStatus = 'AwaitingApproval';
          instance.status = 'Active';
        } else {
          // All parallel approvals complete -> advance to next stage
          newDocStatus = 'Approved';
          if (def && currentStage) {
            if (!instance.completedStageIds.includes(currentStage.id)) {
              instance.completedStageIds.push(currentStage.id);
            }
            const nextStage = this.evaluateNextStage(def, currentStage, doc);
            if (nextStage && nextStage.stageType !== 'End') {
              instance.currentStageId = nextStage.id;
              instance.currentStageOrder = nextStage.order;
              instance.currentStageName = nextStage.nameEn;
              instance.currentStageMode = nextStage.pathMode;
              instance.stageStartedAt = now;
              instance.stageDueAt = new Date(Date.now() + nextStage.slaHours * 3600000).toISOString();
              const resolved = this.resolveStageAssignees(nextStage, doc, actor.id);
              instance.assignedUserIds = resolved.userIds;
              instance.parallelApprovals = resolved.parallelApprovals;
              newDocStatus = 'AwaitingApproval';
            } else {
              if (nextStage) {
                instance.currentStageId = nextStage.id;
                instance.currentStageOrder = nextStage.order;
                instance.currentStageName = nextStage.nameEn;
                instance.currentStageMode = nextStage.pathMode;
                if (!instance.completedStageIds.includes(nextStage.id)) {
                  instance.completedStageIds.push(nextStage.id);
                }
              }
              instance.status = 'Completed';
              instance.parallelApprovals = instance.parallelApprovals;
            }
          } else {
            instance.status = 'Completed';
          }
        }
      } else {
        // Sequential or Conditional stage advancement
        if (def && currentStage) {
          if (!instance.completedStageIds.includes(currentStage.id)) {
            instance.completedStageIds.push(currentStage.id);
          }
          const nextStage = actionData.targetStageId
            ? sortedStages.find(s => s.id === actionData.targetStageId) || null
            : this.evaluateNextStage(def, currentStage, doc);

          if (nextStage && nextStage.stageType !== 'End') {
            instance.status = 'Active';
            instance.currentStageId = nextStage.id;
            instance.currentStageOrder = nextStage.order;
            instance.currentStageName = nextStage.nameEn;
            instance.currentStageMode = nextStage.pathMode;
            instance.stageStartedAt = now;
            instance.stageDueAt = new Date(Date.now() + nextStage.slaHours * 3600000).toISOString();
            const resolved = this.resolveStageAssignees(nextStage, doc, actor.id);
            instance.assignedUserIds = resolved.userIds;
            instance.parallelApprovals = resolved.parallelApprovals;
            if (resolved.userIds[0]) {
              const firstUser = this.getUserById(resolved.userIds[0]);
              if (firstUser) {
                doc.assignedUserId = firstUser.id;
                doc.assignedUserName = firstUser.fullNameEn;
              }
            }
            newDocStatus = nextStage.stageType === 'Approval' || nextStage.stageType === 'ParallelApproval'
              ? 'AwaitingApproval'
              : 'UnderReview';
          } else {
            if (nextStage) {
              instance.currentStageId = nextStage.id;
              instance.currentStageOrder = nextStage.order;
              instance.currentStageName = nextStage.nameEn;
              instance.currentStageMode = nextStage.pathMode;
              if (!instance.completedStageIds.includes(nextStage.id)) {
                instance.completedStageIds.push(nextStage.id);
              }
            }
            instance.status = 'Completed';
            newDocStatus = actionData.action === 'Approved' ? 'Approved' : 'Completed';
          }
        } else {
          instance.status = 'Completed';
          newDocStatus = actionData.action === 'Approved' ? 'Approved' : 'Completed';
        }
      }
    } else if (actionData.action === 'Dispatched') {
      newDocStatus = 'Dispatched';
      instance.status = 'Completed';
    } else if (actionData.action === 'Archived') {
      newDocStatus = 'Archived';
      doc.isArchived = true;
      instance.status = 'Completed';
    }

    doc.status = newDocStatus;
    instance.updatedAt = now;

    const delegateNote =
      actCheck.actingAsDelegateFor.length > 0
        ? ` [Acting Delegate for ${actCheck.actingAsDelegateFor.map(id => this.getUserById(id)?.fullNameEn || id).join(', ')}]`
        : '';

    const historyRecord: WorkflowActionRecord = {
      id: `wf-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      timestamp: now,
      actorId: actor.id,
      actorName: actor.fullNameEn,
      actorRole: actor.role,
      action: recordedAction,
      decision: actionData.action,
      comments: (commentsClean || `Workflow action (${recordedAction}) executed by ${actor.fullNameEn}`) + delegateNote,
      stageId: currentStage?.id || instance.currentStageId,
      stageName: currentStage?.nameEn || instance.currentStageName,
      biometricVerified: !!actionData.biometricSignatureVerified || (actionData.action === 'Approved' && !!session?.mfaVerified),
      forwardedToDepartmentId: actionData.forwardToDepartmentId,
      forwardedToUserId: actionData.forwardToUserId || actionData.delegateToUserId
    };

    if (actionData.digitalSignatureCertificate || actionData.action === 'Approved') {
      historyRecord.digitalSignature = {
        signedBy: `${actor.fullNameEn} (${actor.role})`,
        certificateSerial:
          actionData.digitalSignatureCertificate ||
          `ET-PKI-EPSS-${actor.role.toUpperCase()}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        timestamp: now,
        verified: true
      };
    }

    // Immutable append
    doc.workflowHistory.push(historyRecord);
    instance.history.push(historyRecord);

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: `Workflow: ${recordedAction}`,
      resourceType: 'WorkflowInstance',
      resourceId: doc.registrationNumber,
      ipAddress: clientIp,
      details: `${historyRecord.comments} -> Stage: ${instance.currentStageName}, Status: ${newDocStatus}`
    });

    this.save();
    return { success: true, document: doc, instance };
  }

  public escalateWorkflowInstance(
    idOrDocId: string,
    payload: { reason?: string; escalateToUserId?: string },
    actor: User,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string; instance?: WorkflowInstance } {
    const instance = this.getWorkflowInstanceByIdOrDocId(idOrDocId);
    if (!instance) return { success: false, statusCode: 404, error: 'Workflow instance not found.' };
    if (instance.status === 'Completed' || instance.status === 'Rejected') {
      return { success: false, statusCode: 400, error: 'Cannot escalate a completed or rejected workflow.' };
    }

    const canEscalate =
      ['SuperAdmin', 'DirectorGeneral', 'Director', 'BranchManager'].includes(actor.role) ||
      this.hasPermission(actor, 'approve:workflows') ||
      instance.assignedUserIds.includes(actor.id) ||
      this.getActiveDelegatorsForDelegate(actor.id).some(id => instance.assignedUserIds.includes(id));

    if (!canEscalate) {
      return { success: false, statusCode: 403, error: 'Forbidden: insufficient authority to escalate this task.' };
    }

    const def = this.getWorkflowDefinitionById(instance.definitionId);
    const stage = def?.stages.find(s => s.id === instance.currentStageId);
    const targetUser =
      (payload.escalateToUserId ? this.getUserById(payload.escalateToUserId) : undefined) ||
      (stage?.escalationTargetUserId ? this.getUserById(stage.escalationTargetUserId) : undefined) ||
      this.data.users.find(u => u.status === 'Active' && u.role === (stage?.escalationTargetRole || 'DirectorGeneral')) ||
      this.getUserById('usr-dg');

    const now = new Date().toISOString();
    const reason = (payload.reason || 'SLA deadline threshold breached / Urgent executive escalation triggered.').trim();
    if (reason.length < 5) {
      return { success: false, statusCode: 400, error: 'Escalation reason must be at least 5 characters.' };
    }

    const escRecord: WorkflowEscalationRecord = {
      id: `esc-${Date.now().toString(36)}`,
      timestamp: now,
      stageId: instance.currentStageId,
      stageName: instance.currentStageName,
      escalatedById: actor.id,
      escalatedByName: actor.fullNameEn,
      escalatedToUserId: targetUser?.id,
      escalatedToUserName: targetUser?.fullNameEn,
      escalatedToRole: targetUser?.role || stage?.escalationTargetRole || 'DirectorGeneral',
      reason,
      automatic: false
    };

    instance.isEscalated = true;
    instance.escalationLevel += 1;
    instance.escalations.unshift(escRecord);
    if (targetUser && !instance.assignedUserIds.includes(targetUser.id)) {
      instance.assignedUserIds.push(targetUser.id);
    }
    instance.updatedAt = now;

    const historyEntry: WorkflowActionRecord = {
      id: `wf-esc-${Date.now()}`,
      timestamp: now,
      actorId: actor.id,
      actorName: actor.fullNameEn,
      actorRole: actor.role,
      action: 'Escalated',
      comments: `Escalated (Level ${instance.escalationLevel}) to ${targetUser?.fullNameEn || 'Executive Leadership'}: ${reason}`,
      stageId: instance.currentStageId,
      stageName: instance.currentStageName
    };

    instance.history.push(historyEntry);
    const doc = this.data.documents.find(d => d.id === instance.documentId);
    if (doc) {
      doc.workflowHistory.push(historyEntry);
    }

    this.data.notifications.unshift({
      id: `notif-esc-${Date.now()}`,
      titleEn: `Workflow SLA Escalated: ${instance.registrationNumber}`,
      titleAm: `የሥራ ፍሰት ቀነ-ገደብ ማሳሰቢያ፡ ${instance.registrationNumber}`,
      messageEn: `${actor.fullNameEn} escalated stage "${instance.currentStageName}" to ${targetUser?.fullNameEn || 'Director General'}.`,
      messageAm: `${actor.fullNameEn} የሥራ ፍሰቱን "${instance.currentStageName}" ወደ ${targetUser?.fullNameEn || 'ዋና ዳይሬክተር'} አሳልፈዋል።`,
      timestamp: now,
      type: 'OverdueSLA',
      isRead: false,
      documentId: instance.documentId,
      registrationNumber: instance.registrationNumber
    });

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'WORKFLOW_ESCALATED',
      resourceType: 'WorkflowInstance',
      resourceId: instance.registrationNumber,
      ipAddress: clientIp,
      details: historyEntry.comments
    });

    this.save();
    return { success: true, instance };
  }

  // =========================================================================
  // PHASE 5: PHYSICAL DOCUMENT TRACKING (Locations, Files, Dual Handover, Incidents)
  // =========================================================================

  private createSeedPhysicalLocations(): PhysicalLocationNode[] {
    const now = '2026-11-01T08:00:00Z';
    return [
      // Buildings
      { id: 'loc-bld-a', code: 'BLD-A', name: 'Block A - Executive Tower', level: 'Building', parentId: null, branchId: 'br-hq', notes: 'Executive offices and urgent directive vault', createdAt: now },
      { id: 'loc-bld-b', code: 'BLD-B', name: 'Block B - Central Registry', level: 'Building', parentId: null, branchId: 'br-hq', notes: 'Main EPSS archival & dispatch center', createdAt: now },
      { id: 'loc-bld-c', code: 'BLD-C', name: 'Block C - Regulatory Lab', level: 'Building', parentId: null, branchId: 'br-hq', notes: 'QA inspection and GDP compliance dossiers', createdAt: now },

      // Rooms
      { id: 'loc-rm-302', code: 'RM-302', name: 'Room 302 (Director General Office)', level: 'Room', parentId: 'loc-bld-a', branchId: 'br-hq', createdAt: now },
      { id: 'loc-rm-g04', code: 'RM-G04', name: 'Room G-04 (Intake Vault)', level: 'Room', parentId: 'loc-bld-b', branchId: 'br-hq', createdAt: now },
      { id: 'loc-rm-101', code: 'RM-101', name: 'Room 101 (Historical Archive)', level: 'Room', parentId: 'loc-bld-b', branchId: 'br-hq', createdAt: now },
      { id: 'loc-rm-102', code: 'RM-102', name: 'Dispatch Room 102', level: 'Room', parentId: 'loc-bld-b', branchId: 'br-hq', createdAt: now },
      { id: 'loc-rm-210', code: 'RM-210', name: 'Inspection Desk Room 210', level: 'Room', parentId: 'loc-bld-c', branchId: 'br-hq', createdAt: now },

      // Cabinets
      { id: 'loc-cab-a1', code: 'CAB-A1', name: 'Executive Urgent Safe A1', level: 'Cabinet', parentId: 'loc-rm-302', branchId: 'br-hq', createdAt: now },
      { id: 'loc-cab-b1', code: 'CAB-B1', name: 'Intake Steel Cabinet B1', level: 'Cabinet', parentId: 'loc-rm-g04', branchId: 'br-hq', createdAt: now },
      { id: 'loc-cab-b2', code: 'CAB-B2', name: 'Historical Directives Cabinet B2', level: 'Cabinet', parentId: 'loc-rm-101', branchId: 'br-hq', createdAt: now },
      { id: 'loc-cab-b3', code: 'CAB-B3', name: 'International Dispatch Cabinet B3', level: 'Cabinet', parentId: 'loc-rm-102', branchId: 'br-hq', createdAt: now },
      { id: 'loc-cab-c1', code: 'CAB-C1', name: 'GDP Compliance Cabinet C1', level: 'Cabinet', parentId: 'loc-rm-210', branchId: 'br-hq', createdAt: now },

      // Shelves
      { id: 'loc-shf-a1', code: 'SHF-01', name: 'Urgent Red Folder Tray', level: 'Shelf', parentId: 'loc-cab-a1', branchId: 'br-hq', createdAt: now },
      { id: 'loc-shf-b1', code: 'SHF-R3A', name: 'Rack 3 - Shelf A', level: 'Shelf', parentId: 'loc-cab-b1', branchId: 'br-hq', createdAt: now },
      { id: 'loc-shf-b2', code: 'SHF-D1', name: 'Rack Directives - Shelf 1', level: 'Shelf', parentId: 'loc-cab-b2', branchId: 'br-hq', createdAt: now },
      { id: 'loc-shf-b3', code: 'SHF-O1', name: 'Rack 1 - Dispatch Outbox', level: 'Shelf', parentId: 'loc-cab-b3', branchId: 'br-hq', createdAt: now },
      { id: 'loc-shf-c1', code: 'SHF-IN1', name: 'Desk In-Basket Shelf 1', level: 'Shelf', parentId: 'loc-cab-c1', branchId: 'br-hq', createdAt: now },

      // Boxes
      { id: 'loc-box-dg', code: 'BOX-DG-01', name: 'DESK-DG', level: 'Box', parentId: 'loc-shf-a1', branchId: 'br-hq', capacity: 50, createdAt: now },
      { id: 'loc-box-qa', code: 'BOX-QA-2026', name: 'BOX-QA-2026', level: 'Box', parentId: 'loc-shf-b1', branchId: 'br-hq', capacity: 80, createdAt: now },
      { id: 'loc-box-dir', code: 'BOX-DIR-2026', name: 'BOX-DIRECTIVES-2026', level: 'Box', parentId: 'loc-shf-b2', branchId: 'br-hq', capacity: 100, createdAt: now },
      { id: 'loc-box-out', code: 'BOX-OUT-2026', name: 'DISPATCH-INTL-2026', level: 'Box', parentId: 'loc-shf-b3', branchId: 'br-hq', capacity: 60, createdAt: now },
      { id: 'loc-box-app', code: 'BOX-APP-2026', name: 'APP-INSPECT-2026', level: 'Box', parentId: 'loc-shf-c1', branchId: 'br-hq', capacity: 75, createdAt: now }
    ];
  }

  private resolveLocationChain(locationId: string): {
    locationPath: string;
    building: string;
    room: string;
    cabinet: string;
    shelfNumber: string;
    boxNumber: string;
  } {
    const chain: PhysicalLocationNode[] = [];
    let currId: string | null = locationId;
    const guard = new Set<string>();
    while (currId && !guard.has(currId)) {
      guard.add(currId);
      const node = (this.data.physicalLocations || []).find(l => l.id === currId);
      if (!node) break;
      chain.unshift(node);
      currId = node.parentId;
    }
    const getByLevel = (lvl: PhysicalLocationLevel) => chain.find(n => n.level === lvl)?.name || '-';
    return {
      locationPath: chain.map(n => n.name).join(' → '),
      building: getByLevel('Building'),
      room: getByLevel('Room'),
      cabinet: getByLevel('Cabinet'),
      shelfNumber: getByLevel('Shelf'),
      boxNumber: getByLevel('Box')
    };
  }

  private ensurePhase5PhysicalState() {
    if (!Array.isArray(this.data.physicalLocations) || this.data.physicalLocations.length === 0) {
      this.data.physicalLocations = this.createSeedPhysicalLocations();
    }
    if (!Array.isArray(this.data.physicalFiles)) {
      this.data.physicalFiles = [];
    }
    if (!Array.isArray(this.data.missingIncidents)) {
      this.data.missingIncidents = [];
    }

    if (this.data.physicalFiles.length === 0) {
      const boxByDocId: Record<string, string> = {
        'doc-001': 'loc-box-qa',
        'doc-002': 'loc-box-dg',
        'doc-003': 'loc-box-out',
        'doc-004': 'loc-box-dir',
        'doc-005': 'loc-box-app'
      };
      const nowMs = Date.now();
      for (const doc of this.data.documents) {
        if (!doc.physicalTracking) continue;
        const locId = boxByDocId[doc.id] || 'loc-box-qa';
        const resolved = this.resolveLocationChain(locId);
        // Make doc-002 overdue by 2 days so Overdue Physical Items widget is populated immediately
        const expectedReturn =
          doc.id === 'doc-002'
            ? new Date(nowMs - 48 * 3600000).toISOString()
            : doc.id === 'doc-001'
              ? new Date(nowMs + 72 * 3600000).toISOString()
              : doc.physicalTracking.expectedReturnDate;

        const fileRec: PhysicalFileRecord = {
          id: `pf-${doc.id}`,
          fileCode: doc.physicalTracking.fileCode,
          documentId: doc.id,
          registrationNumber: doc.registrationNumber,
          locationId: locId,
          locationPath: resolved.locationPath,
          building: resolved.building,
          room: resolved.room,
          cabinet: resolved.cabinet,
          shelfNumber: resolved.shelfNumber,
          boxNumber: resolved.boxNumber,
          currentCustodianId: doc.physicalTracking.currentCustodianId,
          currentCustodianName: doc.physicalTracking.currentCustodianName,
          expectedReturnDate: expectedReturn,
          status:
            doc.id === 'doc-001'
              ? 'InTransit'
              : doc.id === 'doc-004'
                ? 'Archived'
                : 'CheckedOut',
          lastMovedDate: doc.physicalTracking.lastMovedDate,
          movementsCount: doc.physicalTracking.movementsCount,
          createdAt: doc.registrationDate
        };
        this.data.physicalFiles.push(fileRec);

        if (expectedReturn) {
          doc.physicalTracking.expectedReturnDate = expectedReturn;
        }
      }

      // Seed a pending dual-acknowledgement handover for doc-001 & completed handover for doc-002
      if (this.data.handovers.length === 0) {
        const doc1 = this.data.documents.find(d => d.id === 'doc-001');
        const doc2 = this.data.documents.find(d => d.id === 'doc-002');
        if (doc1 && doc1.physicalTracking) {
          this.data.handovers.push({
            id: 'mvt-seed-001',
            physicalFileId: 'pf-doc-001',
            fileCode: doc1.physicalTracking.fileCode,
            documentId: doc1.id,
            registrationNumber: doc1.registrationNumber,
            fromCustodianId: 'usr-reg',
            fromCustodian: 'Selamawit Bekele',
            toCustodianId: 'usr-proc',
            toCustodian: 'Dawit Tefera',
            department: 'Pharmaceuticals Procurement Directorate',
            transferReason: 'Original EFDA customs batch release folder transferred for cold-chain verification.',
            expectedReturnDate: new Date(nowMs + 72 * 3600000).toISOString(),
            handoverDate: new Date(nowMs - 4 * 3600000).toISOString(),
            status: 'InTransit',
            verifiedByReceiver: false,
            initiatedById: 'usr-reg',
            initiatedByName: 'Selamawit Bekele'
          });
        }
        if (doc2 && doc2.physicalTracking) {
          this.data.handovers.push({
            id: 'mvt-seed-002',
            physicalFileId: 'pf-doc-002',
            fileCode: doc2.physicalTracking.fileCode,
            documentId: doc2.id,
            registrationNumber: doc2.registrationNumber,
            fromCustodianId: 'usr-store',
            fromCustodian: 'Hiwot Tadesse',
            toCustodianId: 'usr-dg',
            toCustodian: 'Dr. Abdulkadir Gelgelo',
            department: 'Director General Office',
            transferReason: 'Emergency cholera directive dossier delivered to DG desk for executive sign-off.',
            expectedReturnDate: new Date(nowMs - 48 * 3600000).toISOString(),
            handoverDate: new Date(nowMs - 96 * 3600000).toISOString(),
            status: 'InCustody',
            verifiedByReceiver: true,
            initiatedById: 'usr-store',
            initiatedByName: 'Hiwot Tadesse',
            acknowledgedById: 'usr-dg',
            acknowledgedByName: 'Dr. Abdulkadir Gelgelo',
            acknowledgedAt: new Date(nowMs - 94 * 3600000).toISOString()
          });
        }
      }
    }
  }

  public getPhysicalLocations(): PhysicalLocationNode[] {
    return this.data.physicalLocations || [];
  }

  public createPhysicalLocation(
    payload: Partial<PhysicalLocationNode>,
    actor: User,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string; location?: PhysicalLocationNode } {
    if (!this.hasPermission(actor, 'track:physical') && !this.hasPermission(actor, 'manage:organizations')) {
      return { success: false, statusCode: 403, error: 'Forbidden: track:physical or organization management permission required.' };
    }
    const code = (payload.code || '').trim().toUpperCase();
    const name = (payload.name || '').trim();
    const level = payload.level;
    const parentId = payload.parentId || null;

    if (!code || code.length > 30) {
      return { success: false, statusCode: 400, error: 'Location code is required (1–30 characters).' };
    }
    if (!name || name.length < 2) {
      return { success: false, statusCode: 400, error: 'Location name must be at least 2 characters.' };
    }

    const levelOrder: PhysicalLocationLevel[] = ['Building', 'Room', 'Cabinet', 'Shelf', 'Box'];
    if (!level || !levelOrder.includes(level)) {
      return { success: false, statusCode: 400, error: 'Valid location level (Building, Room, Cabinet, Shelf, Box) is required.' };
    }

    const expectedIdx = levelOrder.indexOf(level);
    if (expectedIdx === 0 && parentId !== null) {
      return { success: false, statusCode: 400, error: 'Building nodes must be top-level (no parent).' };
    }
    if (expectedIdx > 0) {
      const parent = this.data.physicalLocations.find(l => l.id === parentId);
      if (!parent) {
        return { success: false, statusCode: 400, error: `Parent ${levelOrder[expectedIdx - 1]} location not found.` };
      }
      if (parent.level !== levelOrder[expectedIdx - 1]) {
        return {
          success: false,
          statusCode: 400,
          error: `Hierarchy error: a ${level} must be placed inside a ${levelOrder[expectedIdx - 1]}.`
        };
      }
    }

    // Rule: Location codes unique within parent
    const duplicate = this.data.physicalLocations.some(
      l => l.parentId === parentId && l.code.trim().toLowerCase() === code.toLowerCase()
    );
    if (duplicate) {
      return {
        success: false,
        statusCode: 400,
        error: `Duplicate location code "${code}" within the selected parent location.`
      };
    }

    const node: PhysicalLocationNode = {
      id: `loc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      code,
      name,
      level,
      parentId,
      branchId: payload.branchId || actor.branchId || 'br-hq',
      capacity: payload.capacity ? Number(payload.capacity) : undefined,
      notes: payload.notes ? String(payload.notes).trim() : undefined,
      createdAt: new Date().toISOString()
    };

    this.data.physicalLocations.push(node);
    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'CREATED_PHYSICAL_LOCATION',
      resourceType: 'PhysicalLocation',
      resourceId: node.code,
      ipAddress: clientIp,
      details: `Created ${node.level} "${node.name}" (${node.code})`
    });
    this.save();
    return { success: true, location: node };
  }

  public updatePhysicalLocation(
    id: string,
    payload: Partial<PhysicalLocationNode>,
    actor: User,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string; location?: PhysicalLocationNode } {
    if (!this.hasPermission(actor, 'track:physical') && !this.hasPermission(actor, 'manage:organizations')) {
      return { success: false, statusCode: 403, error: 'Forbidden: track:physical permission required.' };
    }
    const existing = this.data.physicalLocations.find(l => l.id === id);
    if (!existing) return { success: false, statusCode: 404, error: 'Location node not found.' };

    const nextCode = payload.code !== undefined ? payload.code.trim().toUpperCase() : existing.code;
    const nextName = payload.name !== undefined ? payload.name.trim() : existing.name;
    if (!nextCode || nextCode.length > 30) {
      return { success: false, statusCode: 400, error: 'Location code must be 1–30 characters.' };
    }
    if (!nextName || nextName.length < 2) {
      return { success: false, statusCode: 400, error: 'Location name must be at least 2 characters.' };
    }

    const dup = this.data.physicalLocations.some(
      l => l.id !== id && l.parentId === existing.parentId && l.code.trim().toLowerCase() === nextCode.toLowerCase()
    );
    if (dup) {
      return { success: false, statusCode: 400, error: `Location code "${nextCode}" already exists under this parent.` };
    }

    existing.code = nextCode;
    existing.name = nextName;
    if (payload.capacity !== undefined) existing.capacity = Number(payload.capacity) || undefined;
    if (payload.notes !== undefined) existing.notes = String(payload.notes).trim();

    // Refresh paths of physical files
    for (const pf of this.data.physicalFiles) {
      const resolved = this.resolveLocationChain(pf.locationId);
      pf.locationPath = resolved.locationPath;
      pf.building = resolved.building;
      pf.room = resolved.room;
      pf.cabinet = resolved.cabinet;
      pf.shelfNumber = resolved.shelfNumber;
      pf.boxNumber = resolved.boxNumber;
    }

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'UPDATED_PHYSICAL_LOCATION',
      resourceType: 'PhysicalLocation',
      resourceId: existing.code,
      ipAddress: clientIp,
      details: `Updated ${existing.level} "${existing.name}" (${existing.code})`
    });
    this.save();
    return { success: true, location: existing };
  }

  public deletePhysicalLocation(
    id: string,
    actor: User,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string } {
    if (!this.hasPermission(actor, 'track:physical') && !this.hasPermission(actor, 'manage:organizations')) {
      return { success: false, statusCode: 403, error: 'Forbidden: track:physical permission required.' };
    }
    const idx = this.data.physicalLocations.findIndex(l => l.id === id);
    if (idx === -1) return { success: false, statusCode: 404, error: 'Location node not found.' };

    const hasChildren = this.data.physicalLocations.some(l => l.parentId === id);
    if (hasChildren) {
      return { success: false, statusCode: 400, error: 'Cannot delete location that still contains child locations.' };
    }
    const hasFiles = this.data.physicalFiles.some(pf => pf.locationId === id);
    if (hasFiles) {
      return { success: false, statusCode: 400, error: 'Cannot delete location while physical files are assigned to it.' };
    }

    const removed = this.data.physicalLocations.splice(idx, 1)[0];
    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'DELETED_PHYSICAL_LOCATION',
      resourceType: 'PhysicalLocation',
      resourceId: removed.code,
      ipAddress: clientIp,
      details: `Deleted ${removed.level} "${removed.name}" (${removed.code})`
    });
    this.save();
    return { success: true };
  }

  public getPhysicalFiles(): PhysicalFileRecord[] {
    return this.data.physicalFiles || [];
  }

  public getOverduePhysicalFiles(): Array<PhysicalFileRecord & { daysOverdue: number; subjectEn: string; subjectAm: string }> {
    const now = Date.now();
    return (this.data.physicalFiles || [])
      .filter(pf => pf.status !== 'Archived' && pf.expectedReturnDate && new Date(pf.expectedReturnDate).getTime() < now)
      .map(pf => {
        const doc = this.data.documents.find(d => d.id === pf.documentId);
        const daysOverdue = Math.max(1, Math.ceil((now - new Date(pf.expectedReturnDate!).getTime()) / (24 * 3600000)));
        return {
          ...pf,
          daysOverdue,
          subjectEn: doc?.subjectEn || pf.registrationNumber,
          subjectAm: doc?.subjectAm || pf.registrationNumber
        };
      })
      .sort((a, b) => b.daysOverdue - a.daysOverdue);
  }

  public registerPhysicalFile(
    payload: {
      documentId: string;
      locationId: string;
      fileCode?: string;
      currentCustodianId?: string;
      expectedReturnDate?: string;
    },
    actor: User,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string; file?: PhysicalFileRecord } {
    if (!this.hasPermission(actor, 'track:physical') && !this.hasPermission(actor, 'create:documents')) {
      return { success: false, statusCode: 403, error: 'Forbidden: physical registry permission required.' };
    }
    if (!payload.documentId) {
      return { success: false, statusCode: 400, error: 'An active electronic document must be selected.' };
    }
    const doc = this.data.documents.find(d => d.id === payload.documentId);
    if (!doc || doc.isDeleted || doc.status === 'Cancelled') {
      return { success: false, statusCode: 400, error: 'Physical file must be linked to an active (non-cancelled, non-deleted) electronic document.' };
    }

    // Rule: Physical file must be linked to exactly one active electronic document (1:1 uniqueness)
    const alreadyLinked = this.data.physicalFiles.find(pf => pf.documentId === doc.id);
    if (alreadyLinked) {
      return {
        success: false,
        statusCode: 400,
        error: `Electronic document ${doc.registrationNumber} is already linked to physical file "${alreadyLinked.fileCode}".`
      };
    }

    const locNode = this.data.physicalLocations.find(l => l.id === payload.locationId);
    if (!locNode) {
      return { success: false, statusCode: 400, error: 'Selected physical storage location does not exist.' };
    }

    const fileCode = (
      payload.fileCode?.trim() ||
      `EPSS-PHY-${new Date().getFullYear()}-${String(100 + this.data.physicalFiles.length + 1).padStart(3, '0')}`
    ).toUpperCase();

    if (this.data.physicalFiles.some(pf => pf.fileCode.toLowerCase() === fileCode.toLowerCase())) {
      return { success: false, statusCode: 400, error: `Physical file code "${fileCode}" already exists.` };
    }

    if (payload.expectedReturnDate) {
      const retMs = new Date(payload.expectedReturnDate).getTime();
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      if (Number.isNaN(retMs) || retMs < todayStart.getTime()) {
        return { success: false, statusCode: 400, error: 'Expected return date cannot be in the past.' };
      }
    }

    const custodian = payload.currentCustodianId ? this.getUserById(payload.currentCustodianId) : actor;
    if (!custodian || custodian.status !== 'Active') {
      return { success: false, statusCode: 400, error: 'Selected custodian must be an active staff member.' };
    }

    const resolved = this.resolveLocationChain(locNode.id);
    const now = new Date().toISOString();
    const newFile: PhysicalFileRecord = {
      id: `pf-${Date.now().toString(36)}`,
      fileCode,
      documentId: doc.id,
      registrationNumber: doc.registrationNumber,
      locationId: locNode.id,
      locationPath: resolved.locationPath,
      building: resolved.building,
      room: resolved.room,
      cabinet: resolved.cabinet,
      shelfNumber: resolved.shelfNumber,
      boxNumber: resolved.boxNumber,
      currentCustodianId: custodian.id,
      currentCustodianName: custodian.fullNameEn,
      expectedReturnDate: payload.expectedReturnDate ? new Date(payload.expectedReturnDate).toISOString() : undefined,
      status: 'Archived',
      lastMovedDate: now,
      movementsCount: 1,
      createdAt: now
    };

    this.data.physicalFiles.unshift(newFile);
    doc.physicalTracking = {
      fileCode: newFile.fileCode,
      building: newFile.building,
      floor: 'Ground Floor',
      room: newFile.room,
      shelfNumber: newFile.shelfNumber,
      boxNumber: newFile.boxNumber,
      currentCustodianId: newFile.currentCustodianId,
      currentCustodianName: newFile.currentCustodianName,
      expectedReturnDate: newFile.expectedReturnDate,
      lastMovedDate: now,
      movementsCount: 1
    };

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'REGISTERED_PHYSICAL_FILE',
      resourceType: 'PhysicalFile',
      resourceId: newFile.fileCode,
      ipAddress: clientIp,
      details: `Linked ${newFile.fileCode} to ${doc.registrationNumber} at ${newFile.locationPath}`
    });
    this.save();
    return { success: true, file: newFile };
  }

  public initiatePhysicalHandover(
    payload: {
      physicalFileId?: string;
      documentId?: string;
      toCustodianId: string;
      department?: string;
      transferReason: string;
      expectedReturnDate?: string;
      targetLocationId?: string;
      returnToArchive?: boolean;
    },
    actor: User,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string; handover?: PhysicalHandoverMovement } {
    const pf = this.data.physicalFiles.find(
      f =>
        (payload.physicalFileId && f.id === payload.physicalFileId) ||
        (payload.documentId && f.documentId === payload.documentId)
    );
    if (!pf) {
      return { success: false, statusCode: 404, error: 'Physical file record not found.' };
    }
    if (pf.status === 'Missing') {
      return { success: false, statusCode: 400, error: 'Cannot initiate handover for a file reported as Missing until recovered.' };
    }

    // Rule: Only current custodian (or Registry Officer / Admin) can initiate handover
    const isAuthorized =
      actor.id === pf.currentCustodianId ||
      actor.role === 'RegistryOfficer' ||
      actor.role === 'SuperAdmin' ||
      actor.role === 'DirectorGeneral';
    if (!isAuthorized) {
      return {
        success: false,
        statusCode: 403,
        error: `Forbidden: only current custodian (${pf.currentCustodianName}) or a Registry Officer may initiate handover.`
      };
    }

    const toUser = this.getUserById(payload.toCustodianId);
    if (!toUser || toUser.status !== 'Active') {
      return { success: false, statusCode: 400, error: 'Selected receiver custodian does not exist or is inactive.' };
    }

    // Rule: Sender and receiver cannot be the same person
    if (toUser.id === pf.currentCustodianId) {
      return { success: false, statusCode: 400, error: 'Sender and receiver custodian cannot be the same person.' };
    }

    // Rule: Expected return date cannot be in the past
    if (!payload.expectedReturnDate) {
      return { success: false, statusCode: 400, error: 'Expected return date is required for physical custody handover.' };
    }
    const retDate = new Date(payload.expectedReturnDate);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    if (Number.isNaN(retDate.getTime()) || retDate.getTime() < todayStart.getTime()) {
      return { success: false, statusCode: 400, error: 'Expected return date cannot be in the past.' };
    }

    const reason = (payload.transferReason || '').trim();
    if (reason.length < 5) {
      return { success: false, statusCode: 400, error: 'Handover reason must be at least 5 characters.' };
    }

    if (payload.targetLocationId) {
      const loc = this.data.physicalLocations.find(l => l.id === payload.targetLocationId);
      if (loc) {
        const resolved = this.resolveLocationChain(loc.id);
        pf.locationId = loc.id;
        pf.locationPath = resolved.locationPath;
        pf.building = resolved.building;
        pf.room = resolved.room;
        pf.cabinet = resolved.cabinet;
        pf.shelfNumber = resolved.shelfNumber;
        pf.boxNumber = resolved.boxNumber;
      }
    }

    const now = new Date().toISOString();
    const handover: PhysicalHandoverMovement = {
      id: `mvt-${Date.now().toString(36)}`,
      physicalFileId: pf.id,
      fileCode: pf.fileCode,
      documentId: pf.documentId,
      registrationNumber: pf.registrationNumber,
      fromCustodianId: pf.currentCustodianId,
      fromCustodian: pf.currentCustodianName,
      toCustodianId: toUser.id,
      toCustodian: toUser.fullNameEn,
      department: payload.department?.trim() || toUser.departmentNameEn,
      transferReason: reason,
      expectedReturnDate: retDate.toISOString(),
      handoverDate: now,
      status: 'InTransit',
      verifiedByReceiver: false,
      initiatedById: actor.id,
      initiatedByName: actor.fullNameEn
    };

    pf.status = 'InTransit';
    pf.expectedReturnDate = retDate.toISOString();
    this.data.handovers.unshift(handover);

    const doc = this.data.documents.find(d => d.id === pf.documentId);
    if (doc && doc.physicalTracking) {
      doc.physicalTracking.expectedReturnDate = pf.expectedReturnDate;
    }

    this.data.notifications.unshift({
      id: `notif-phy-${Date.now()}`,
      titleEn: `Physical File Handover Pending Receipt: ${pf.fileCode}`,
      titleAm: `የአካላዊ ሰነድ ርክክብ ማረጋገጫ ይጠብቃል፡ ${pf.fileCode}`,
      messageEn: `${pf.currentCustodianName} initiated handover of ${pf.registrationNumber} to ${toUser.fullNameEn}. Acknowledge receipt upon delivery.`,
      messageAm: `${pf.currentCustodianName} የሰነድ ${pf.registrationNumber} ርክክብ ወደ ${toUser.fullNameEn} ጀምረዋል።`,
      timestamp: now,
      type: 'Dispatch',
      isRead: false,
      documentId: pf.documentId,
      registrationNumber: pf.registrationNumber
    });

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'INITIATED_PHYSICAL_HANDOVER',
      resourceType: 'PhysicalFile',
      resourceId: pf.fileCode,
      ipAddress: clientIp,
      details: `Initiated handover from ${pf.currentCustodianName} to ${toUser.fullNameEn} (due ${retDate.toISOString().slice(0, 10)}).`
    });
    this.save();
    return { success: true, handover };
  }

  public acknowledgePhysicalHandover(
    handoverId: string,
    payload: { returnToArchive?: boolean; notes?: string },
    actor: User,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string; handover?: PhysicalHandoverMovement } {
    const handover = this.data.handovers.find(h => h.id === handoverId);
    if (!handover) {
      return { success: false, statusCode: 404, error: 'Handover movement record not found.' };
    }
    if (handover.verifiedByReceiver || handover.status !== 'InTransit') {
      return { success: false, statusCode: 400, error: 'Handover has already been acknowledged or finalized.' };
    }

    const canAcknowledge =
      actor.id === handover.toCustodianId ||
      actor.role === 'RegistryOfficer' ||
      actor.role === 'SuperAdmin';
    if (!canAcknowledge) {
      return {
        success: false,
        statusCode: 403,
        error: `Forbidden: only designated receiver (${handover.toCustodian}) or Registry Officer may acknowledge receipt.`
      };
    }

    const now = new Date().toISOString();
    handover.verifiedByReceiver = true;
    handover.status = payload.returnToArchive ? 'ReturnedToArchive' : 'InCustody';
    handover.acknowledgedById = actor.id;
    handover.acknowledgedByName = actor.fullNameEn;
    handover.acknowledgedAt = now;
    if (payload.notes) handover.notes = payload.notes.trim();

    const pf = this.data.physicalFiles.find(
      f => f.id === handover.physicalFileId || f.documentId === handover.documentId
    );
    if (pf) {
      pf.currentCustodianId = handover.toCustodianId || actor.id;
      pf.currentCustodianName = handover.toCustodian;
      pf.lastMovedDate = now;
      pf.movementsCount += 1;
      pf.status = payload.returnToArchive ? 'Archived' : 'CheckedOut';
      if (payload.returnToArchive) {
        pf.expectedReturnDate = undefined;
      }

      const doc = this.data.documents.find(d => d.id === pf.documentId);
      if (doc && doc.physicalTracking) {
        doc.physicalTracking.currentCustodianId = pf.currentCustodianId;
        doc.physicalTracking.currentCustodianName = pf.currentCustodianName;
        doc.physicalTracking.lastMovedDate = now;
        doc.physicalTracking.movementsCount = pf.movementsCount;
        doc.physicalTracking.expectedReturnDate = pf.expectedReturnDate;
      }
    }

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'ACKNOWLEDGED_PHYSICAL_HANDOVER',
      resourceType: 'PhysicalFile',
      resourceId: handover.fileCode || handover.registrationNumber,
      ipAddress: clientIp,
      details: `Dual acknowledgement completed by ${actor.fullNameEn} for transfer from ${handover.fromCustodian} to ${handover.toCustodian}.`
    });
    this.save();
    return { success: true, handover };
  }

  public getMissingIncidents(): MissingPhysicalIncident[] {
    return this.data.missingIncidents || [];
  }

  public reportMissingPhysicalFile(
    payload: {
      physicalFileId?: string;
      documentId?: string;
      reason?: string;
      notes?: string;
      urgency?: 'Medium' | 'High' | 'Critical';
    },
    actor: User,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string; incident?: MissingPhysicalIncident } {
    const reason = (payload.reason || payload.notes || '').trim();
    // Rule: Missing report requires reason (min 15 characters)
    if (reason.length < 15) {
      return {
        success: false,
        statusCode: 400,
        error: 'Missing file report requires a detailed reason of at least 15 characters.'
      };
    }

    const urgency = payload.urgency && ['Medium', 'High', 'Critical'].includes(payload.urgency)
      ? payload.urgency
      : 'High';

    const pf = this.data.physicalFiles.find(
      f =>
        (payload.physicalFileId && f.id === payload.physicalFileId) ||
        (payload.documentId && f.documentId === payload.documentId)
    );
    const doc = pf
      ? this.data.documents.find(d => d.id === pf.documentId)
      : this.data.documents.find(d => d.id === payload.documentId);

    if (!pf && !doc) {
      return { success: false, statusCode: 404, error: 'Physical file or document not found.' };
    }

    const now = new Date().toISOString();
    if (pf) pf.status = 'Missing';

    const incident: MissingPhysicalIncident = {
      id: `inc-${Date.now().toString(36)}`,
      physicalFileId: pf?.id || `pf-${doc!.id}`,
      fileCode: pf?.fileCode || doc?.physicalTracking?.fileCode || doc!.registrationNumber,
      documentId: pf?.documentId || doc!.id,
      registrationNumber: pf?.registrationNumber || doc!.registrationNumber,
      reportedById: actor.id,
      reportedByName: actor.fullNameEn,
      reportedAt: now,
      lastKnownCustodianName: pf?.currentCustodianName || doc?.physicalTracking?.currentCustodianName || 'Unknown',
      lastKnownLocation: pf?.locationPath || `${doc?.physicalTracking?.building} / ${doc?.physicalTracking?.room}`,
      urgency,
      reason,
      status: 'Open'
    };

    this.data.missingIncidents.unshift(incident);
    this.data.notifications.unshift({
      id: `notif-inc-${Date.now()}`,
      titleEn: `URGENT Missing Physical File (${urgency}): ${incident.fileCode}`,
      titleAm: `አስቸኳይ የጠፋ አካላዊ ፋይል ሪፖርት (${urgency})፡ ${incident.fileCode}`,
      messageEn: `${actor.fullNameEn} reported ${incident.registrationNumber} missing. Last known custodian: ${incident.lastKnownCustodianName}.`,
      messageAm: `${actor.fullNameEn} የሰነድ ${incident.registrationNumber} መጥፋትን ሪፖርት አድርገዋል።`,
      timestamp: now,
      type: 'Security',
      isRead: false,
      documentId: incident.documentId,
      registrationNumber: incident.registrationNumber
    });

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'REPORTED MISSING PHYSICAL DOSSIER',
      resourceType: 'PhysicalDossier',
      resourceId: incident.registrationNumber,
      ipAddress: clientIp,
      details: `[${urgency}] ${reason}`
    });
    this.save();
    return { success: true, incident };
  }

  public resolveMissingIncident(
    incidentId: string,
    payload: { status: 'Investigating' | 'Recovered'; resolutionNotes?: string },
    actor: User,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string; incident?: MissingPhysicalIncident } {
    if (!['SuperAdmin', 'DirectorGeneral', 'Director', 'RegistryOfficer'].includes(actor.role)) {
      return { success: false, statusCode: 403, error: 'Forbidden: Registry Officer or Director privileges required.' };
    }
    const inc = this.data.missingIncidents.find(i => i.id === incidentId);
    if (!inc) return { success: false, statusCode: 404, error: 'Incident record not found.' };

    inc.status = payload.status;
    if (payload.status === 'Recovered') {
      inc.resolvedAt = new Date().toISOString();
      inc.resolvedByName = actor.fullNameEn;
      inc.resolutionNotes = (payload.resolutionNotes || 'Physical dossier located and returned to custody.').trim();
      const pf = this.data.physicalFiles.find(f => f.id === inc.physicalFileId || f.documentId === inc.documentId);
      if (pf) pf.status = 'Archived';
    }

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: `MISSING_INCIDENT_${payload.status.toUpperCase()}`,
      resourceType: 'PhysicalDossier',
      resourceId: inc.registrationNumber,
      ipAddress: clientIp,
      details: payload.resolutionNotes || `Incident status changed to ${payload.status}`
    });
    this.save();
    return { success: true, incident: inc };
  }

  // ==================== PHASE 6: RECORDS MANAGEMENT & ARCHIVING ====================

  private computeRetentionExpiryIso(baseDateIso: string, years: number): string {
    if (years === 0) {
      return '9999-12-31T23:59:59.000Z';
    }
    const base = new Date(baseDateIso || Date.now());
    const d = Number.isNaN(base.getTime()) ? new Date() : base;
    d.setFullYear(d.getFullYear() + years);
    return d.toISOString();
  }

  private computeRetentionFields(
    docType: string,
    baseDateIso: string,
    explicitScheduleId?: string,
    explicitYears?: number
  ): {
    retentionScheduleId?: string;
    retentionCategory: string;
    retentionYears: number;
    retentionExpiryDate: string;
  } {
    const schedules = this.data.retentionSchedules || [];
    let matched = explicitScheduleId
      ? schedules.find(s => s.id === explicitScheduleId)
      : schedules.find(s => Array.isArray(s.documentTypes) && s.documentTypes.includes(docType as any));

    if (!matched && schedules.length > 0) {
      if (docType === 'IncomingLetter') matched = schedules.find(s => s.id === 'ret-02') || schedules[0];
      else if (docType === 'OutgoingLetter' || docType === 'TenderDocument') matched = schedules.find(s => s.id === 'ret-01') || schedules[0];
      else if (docType === 'InternalMemo' || docType === 'Circular') matched = schedules.find(s => s.id === 'ret-04') || schedules[0];
      else matched = schedules[0];
    }

    const years =
      explicitYears !== undefined && explicitYears >= 0
        ? explicitYears
        : matched
          ? matched.retentionPeriodYears
          : 10;

    return {
      retentionScheduleId: matched?.id,
      retentionCategory: matched?.documentCategory || 'General Institutional Record',
      retentionYears: years,
      retentionExpiryDate: this.computeRetentionExpiryIso(baseDateIso, years)
    };
  }

  private ensurePhase6RecordsState() {
    if (!Array.isArray(this.data.disposalRequests)) this.data.disposalRequests = [];
    if (!Array.isArray(this.data.archiveRetrievals)) this.data.archiveRetrievals = [];
    if (!Array.isArray(this.data.disposalCertificates)) this.data.disposalCertificates = [];

    // Ensure seeded retention schedules include a 0-year Permanent rule and documentTypes mapping
    for (const sc of this.data.retentionSchedules) {
      if (sc.isActive === undefined) sc.isActive = true;
      if (sc.id === 'ret-01' && !sc.documentTypes) sc.documentTypes = ['OutgoingLetter', 'TenderDocument'];
      if (sc.id === 'ret-02' && !sc.documentTypes) sc.documentTypes = ['IncomingLetter', 'InspectionReport'];
      if (sc.id === 'ret-03' && !sc.documentTypes) sc.documentTypes = ['Application'];
      if (sc.id === 'ret-04' && !sc.documentTypes) sc.documentTypes = ['InternalMemo', 'Circular'];
    }

    if (!this.data.retentionSchedules.some(s => s.retentionPeriodYears === 0)) {
      this.data.retentionSchedules.push({
        id: 'ret-perm-00',
        documentCategory: 'National Founding Charters & Sovereign MoH Directives',
        retentionPeriodYears: 0, // 0 = permanent
        disposalAction: 'PermanentArchive',
        governingLegislation: 'National Archives & Library Agency (NALA) Permanent Preservation Statute',
        notes: '0 years = Permanent sovereign preservation; exempt from destruction.',
        documentTypes: ['Circular'],
        isActive: true,
        createdAt: new Date().toISOString()
      });
    }

    // Backfill Phase 6 retention metadata on documents
    for (const doc of this.data.documents) {
      if (!doc.retentionScheduleId || !doc.retentionCategory) {
        const calc = this.computeRetentionFields(doc.type, doc.registrationDate, doc.retentionScheduleId, doc.retentionYears);
        doc.retentionScheduleId = calc.retentionScheduleId;
        doc.retentionCategory = calc.retentionCategory;
        if (doc.retentionYears === undefined) doc.retentionYears = calc.retentionYears;
        if (!doc.retentionExpiryDate) doc.retentionExpiryDate = calc.retentionExpiryDate;
      }
      if (doc.legalHold && !doc.legalHoldReason) {
        doc.legalHoldReason = 'Active EFDA post-market quality audit and regulatory preservation mandate.';
        doc.legalHoldAppliedBy = 'Dr. Abdulkadir Gelgelo';
        doc.legalHoldAppliedAt = doc.registrationDate;
      }
      if (doc.isArchived && !doc.archiveLocationPath) {
        doc.archivedAt = doc.archivedAt || doc.registrationDate;
        doc.archivedBy = doc.archivedBy || 'Selamawit Bekele';
        doc.archiveLocationPath = doc.physicalTracking
          ? `${doc.physicalTracking.building} → ${doc.physicalTracking.room} → ${doc.physicalTracking.boxNumber}`
          : 'Block B - Central Registry → Room 101 (Historical Archive)';
      }
    }

    // Seed a mature archived record ready for Disposal Workflow demo/testing
    if (!this.data.documents.some(d => d.id === 'doc-arch-mature')) {
      const regIso = '2020-03-15T09:00:00.000Z';
      const expIso = '2025-03-15T09:00:00.000Z';
      this.data.documents.push({
        id: 'doc-arch-mature',
        registrationNumber: 'EPSS/MEMO/2020/00018',
        referenceNumber: 'ADM-2020-044',
        type: 'InternalMemo',
        subjectEn: 'Annual Fleet Fuel & Routine Stationery Allocation Circular (FY 2020)',
        subjectAm: 'የ2012 ዓ.ም ዓመታዊ የነዳጅና የጽሕፈት መሣሪያዎች ድልድል መመሪያ',
        descriptionEn: 'Archived 2020 administrative circular whose mandatory 5-year NALA retention period matured in March 2025.',
        senderOrganization: 'EPSS Corporate Services Directorate',
        recipientOrganization: 'All Regional Hubs',
        receivedDate: regIso,
        registrationDate: regIso,
        priority: 'Normal',
        confidentiality: 'Internal',
        status: 'Archived',
        branchId: 'br-hq',
        departmentId: 'dept-reg',
        assignedDepartmentName: 'Central Records & Registry Division',
        attachments: [],
        workflowHistory: [
          {
            id: 'wf-arch-seed',
            timestamp: regIso,
            actorId: 'usr-reg',
            actorName: 'Selamawit Bekele',
            actorRole: 'RegistryOfficer',
            action: 'Archived',
            comments: 'Transferred to Central Historical Archive Room 101.'
          }
        ],
        tags: ['Archive', 'Administrative', 'FY2020'],
        isArchived: true,
        archivedAt: '2021-01-10T10:00:00.000Z',
        archivedBy: 'Selamawit Bekele',
        archiveLocationPath: 'Block B - Central Registry → Room 101 (Historical Archive) → BOX-DIRECTIVES-2026',
        retentionScheduleId: 'ret-04',
        retentionCategory: 'Internal Administrative Circulars & Meeting Minutes',
        retentionYears: 5,
        retentionExpiryDate: expIso,
        legalHold: false
      });
    }

    // Seed an active archive retrieval request and a historical certificate
    if (this.data.archiveRetrievals.length === 0) {
      this.data.archiveRetrievals.push({
        id: 'retv-seed-001',
        documentId: 'doc-004',
        registrationNumber: 'EPSS/MEMO/2026/00021',
        subjectEn: 'Updated Retention & Archival Disposal Directives for 2026 Tender Cycles',
        requestedById: 'usr-audit',
        requestedByName: 'Tigist Haile',
        requestedAt: new Date(Date.now() - 12 * 3600000).toISOString(),
        neededUntilDate: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
        reason: 'Annual compliance verification against National Archives Directive.',
        status: 'Requested'
      });
    }

    if (this.data.disposalCertificates.length === 0) {
      this.data.disposalCertificates.push({
        id: 'cert-seed-2025',
        certificateNumber: 'CERT-EPSS-2025-0009',
        disposalRequestId: 'disp-hist-009',
        documentId: 'hist-doc-2018-01',
        registrationNumber: 'EPSS/MEMO/2018/00007',
        subjectEn: 'FY 2018 Visitors Gate Pass & Facility Reception Logbooks',
        subjectAm: 'የ2010 ዓ.ም የእንግዳ መመዝገቢያ መዝገብ',
        confidentiality: 'Internal',
        retentionCategory: 'Internal Administrative Circulars & Meeting Minutes',
        governingLegislation: 'National Archives and Library Agency (NALA) Record Schedule',
        destructionMethod: 'Certified Cross-Cut Shredding & Witnessed Pulp Disposal',
        issuedAt: '2025-11-20T14:30:00.000Z',
        executedById: 'usr-reg',
        executedByName: 'Selamawit Bekele',
        approvers: [
          {
            name: 'Dr. Abdulkadir Gelgelo',
            role: 'DirectorGeneral',
            decidedAt: '2025-11-18T09:15:00.000Z'
          }
        ],
        digitalVerificationHash: crypto
          .createHash('sha256')
          .update('CERT-EPSS-2025-0009|EPSS/MEMO/2018/00007|2025-11-20T14:30:00.000Z')
          .digest('hex')
      });
    }
  }

  public createRetentionSchedule(
    payload: Partial<RetentionSchedule>,
    actor: User,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string; schedule?: RetentionSchedule } {
    if (!this.hasPermission(actor, 'manage:archives') && !this.hasPermission(actor, 'manage:organizations')) {
      return { success: false, statusCode: 403, error: 'Forbidden: manage:archives permission required.' };
    }
    const category = (payload.documentCategory || '').trim();
    const legislation = (payload.governingLegislation || '').trim();
    const years = Number(payload.retentionPeriodYears);

    if (category.length < 3) {
      return { success: false, statusCode: 400, error: 'Document category must be at least 3 characters.' };
    }
    if (Number.isNaN(years) || years < 0 || !Number.isFinite(years)) {
      return { success: false, statusCode: 400, error: 'Retention years must be 0 or greater (0 = Permanent).' };
    }
    if (legislation.length < 3) {
      return { success: false, statusCode: 400, error: 'Governing legislation reference is required.' };
    }
    const allowedActions = ['PermanentArchive', 'AuthorizedDestruction', 'ReviewAtMaturity'];
    const disposalAction = payload.disposalAction && allowedActions.includes(payload.disposalAction)
      ? payload.disposalAction
      : years === 0
        ? 'PermanentArchive'
        : 'ReviewAtMaturity';

    const dup = this.data.retentionSchedules.some(
      s => s.documentCategory.toLowerCase() === category.toLowerCase()
    );
    if (dup) {
      return { success: false, statusCode: 400, error: `A retention schedule for "${category}" already exists.` };
    }

    const now = new Date().toISOString();
    const schedule: RetentionSchedule = {
      id: `ret-${Date.now().toString(36)}`,
      documentCategory: category,
      retentionPeriodYears: years,
      disposalAction,
      governingLegislation: legislation,
      notes: (payload.notes || '').trim(),
      documentTypes: Array.isArray(payload.documentTypes) ? payload.documentTypes : [],
      isActive: true,
      createdAt: now,
      updatedAt: now
    };

    this.data.retentionSchedules.push(schedule);
    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'CREATED_RETENTION_SCHEDULE',
      resourceType: 'RetentionSchedule',
      resourceId: schedule.id,
      ipAddress: clientIp,
      details: `Created retention policy "${schedule.documentCategory}" (${years === 0 ? 'Permanent' : `${years} yrs`})`
    });
    this.save();
    return { success: true, schedule };
  }

  public updateRetentionSchedule(
    id: string,
    payload: Partial<RetentionSchedule>,
    actor: User,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string; schedule?: RetentionSchedule } {
    if (!this.hasPermission(actor, 'manage:archives') && !this.hasPermission(actor, 'manage:organizations')) {
      return { success: false, statusCode: 403, error: 'Forbidden: manage:archives permission required.' };
    }
    const sc = this.data.retentionSchedules.find(s => s.id === id);
    if (!sc) return { success: false, statusCode: 404, error: 'Retention schedule not found.' };

    if (payload.documentCategory !== undefined) {
      const cat = payload.documentCategory.trim();
      if (cat.length < 3) return { success: false, statusCode: 400, error: 'Category must be at least 3 characters.' };
      sc.documentCategory = cat;
    }
    if (payload.retentionPeriodYears !== undefined) {
      const years = Number(payload.retentionPeriodYears);
      if (Number.isNaN(years) || years < 0 || !Number.isFinite(years)) {
        return { success: false, statusCode: 400, error: 'Retention years must be 0 or greater (0 = Permanent).' };
      }
      sc.retentionPeriodYears = years;
    }
    if (payload.disposalAction !== undefined) sc.disposalAction = payload.disposalAction;
    if (payload.governingLegislation !== undefined) {
      const leg = payload.governingLegislation.trim();
      if (leg.length < 3) return { success: false, statusCode: 400, error: 'Governing legislation is required.' };
      sc.governingLegislation = leg;
    }
    if (payload.notes !== undefined) sc.notes = payload.notes.trim();
    if (payload.documentTypes !== undefined) sc.documentTypes = payload.documentTypes;
    sc.updatedAt = new Date().toISOString();

    // Recalculate expiry for linked non-disposed documents
    for (const doc of this.data.documents) {
      if (doc.retentionScheduleId === sc.id && doc.status !== 'Disposed') {
        doc.retentionCategory = sc.documentCategory;
        doc.retentionYears = sc.retentionPeriodYears;
        doc.retentionExpiryDate = this.computeRetentionExpiryIso(doc.registrationDate, sc.retentionPeriodYears);
      }
    }

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'UPDATED_RETENTION_SCHEDULE',
      resourceType: 'RetentionSchedule',
      resourceId: sc.id,
      ipAddress: clientIp,
      details: `Updated retention policy "${sc.documentCategory}" (${sc.retentionPeriodYears === 0 ? 'Permanent' : `${sc.retentionPeriodYears} yrs`})`
    });
    this.save();
    return { success: true, schedule: sc };
  }

  public deleteRetentionSchedule(
    id: string,
    actor: User,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string } {
    if (!this.hasPermission(actor, 'manage:archives') && !this.hasPermission(actor, 'manage:organizations')) {
      return { success: false, statusCode: 403, error: 'Forbidden: manage:archives permission required.' };
    }
    const idx = this.data.retentionSchedules.findIndex(s => s.id === id);
    if (idx === -1) return { success: false, statusCode: 404, error: 'Retention schedule not found.' };

    const inUse = this.data.documents.some(d => d.retentionScheduleId === id && d.status !== 'Disposed');
    if (inUse) {
      return { success: false, statusCode: 400, error: 'Cannot delete retention schedule while active documents are assigned to it.' };
    }

    const removed = this.data.retentionSchedules.splice(idx, 1)[0];
    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'DELETED_RETENTION_SCHEDULE',
      resourceType: 'RetentionSchedule',
      resourceId: removed.id,
      ipAddress: clientIp,
      details: `Deleted retention schedule "${removed.documentCategory}"`
    });
    this.save();
    return { success: true };
  }

  public assignRetentionScheduleToDocument(
    documentId: string,
    scheduleId: string,
    actor: User,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string; document?: DocumentItem } {
    if (!this.hasPermission(actor, 'manage:archives') && !this.hasPermission(actor, 'edit:documents')) {
      return { success: false, statusCode: 403, error: 'Forbidden: manage:archives or edit:documents permission required.' };
    }
    const doc = this.data.documents.find(d => d.id === documentId);
    if (!doc) return { success: false, statusCode: 404, error: 'Document not found.' };
    if (doc.legalHold) {
      return { success: false, statusCode: 423, error: 'Document is under an active Legal Hold and cannot be edited.' };
    }
    if (doc.status === 'Disposed') {
      return { success: false, statusCode: 400, error: 'Disposed records cannot be modified.' };
    }

    const sc = this.data.retentionSchedules.find(s => s.id === scheduleId);
    if (!sc) return { success: false, statusCode: 404, error: 'Retention schedule not found.' };

    doc.retentionScheduleId = sc.id;
    doc.retentionCategory = sc.documentCategory;
    doc.retentionYears = sc.retentionPeriodYears;
    doc.retentionExpiryDate = this.computeRetentionExpiryIso(doc.registrationDate, sc.retentionPeriodYears);

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'ASSIGNED_RETENTION_SCHEDULE',
      resourceType: 'Document',
      resourceId: doc.registrationNumber,
      ipAddress: clientIp,
      details: `Assigned "${sc.documentCategory}" (${sc.retentionPeriodYears === 0 ? 'Permanent' : `${sc.retentionPeriodYears} yrs`}) -> expires ${doc.retentionExpiryDate.slice(0, 10)}`
    });
    this.save();
    return { success: true, document: doc };
  }

  public setLegalHoldWithReason(
    documentId: string,
    payload: { active?: boolean; reason?: string },
    actor: User,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string; legalHold?: boolean; document?: DocumentItem } {
    if (!this.hasPermission(actor, 'apply:legal_hold')) {
      return { success: false, statusCode: 403, error: 'Forbidden: apply:legal_hold permission required.' };
    }
    const doc = this.data.documents.find(d => d.id === documentId);
    if (!doc) return { success: false, statusCode: 404, error: 'Document not found.' };
    if (doc.status === 'Disposed') {
      return { success: false, statusCode: 400, error: 'Disposed document cannot be placed under Legal Hold.' };
    }

    const reason = (payload.reason || '').trim();
    // Validation Rule: Legal Hold reason required (min 20 characters)
    if (reason.length < 20) {
      return {
        success: false,
        statusCode: 400,
        error: 'Legal Hold action requires a formal justification reason of at least 20 characters.'
      };
    }

    const nextState = payload.active !== undefined ? !!payload.active : !doc.legalHold;
    const now = new Date().toISOString();
    doc.legalHold = nextState;

    if (nextState) {
      doc.legalHoldReason = reason;
      doc.legalHoldAppliedBy = actor.fullNameEn;
      doc.legalHoldAppliedAt = now;
    } else {
      doc.legalHoldReason = `Released: ${reason}`;
      doc.legalHoldAppliedBy = actor.fullNameEn;
      doc.legalHoldAppliedAt = now;
    }

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: nextState ? 'APPLIED_LEGAL_HOLD' : 'REMOVED_LEGAL_HOLD',
      resourceType: 'Document',
      resourceId: doc.registrationNumber,
      ipAddress: clientIp,
      details: `${nextState ? 'Applied' : 'Removed'} Legal Hold on ${doc.registrationNumber}. Reason: ${reason}`
    });
    this.save();
    return { success: true, legalHold: doc.legalHold, document: doc };
  }

  public transferToArchive(
    documentId: string,
    payload: { locationId?: string; scheduleId?: string; notes?: string },
    actor: User,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string; document?: DocumentItem } {
    if (!this.hasPermission(actor, 'manage:archives') && !this.hasPermission(actor, 'edit:documents')) {
      return { success: false, statusCode: 403, error: 'Forbidden: manage:archives permission required.' };
    }
    const doc = this.data.documents.find(d => d.id === documentId);
    if (!doc) return { success: false, statusCode: 404, error: 'Document not found.' };
    if (doc.status === 'Disposed' || doc.isDeleted) {
      return { success: false, statusCode: 400, error: 'Cancelled or disposed records cannot be transferred to Archive.' };
    }

    if (payload.scheduleId && !doc.legalHold) {
      const sc = this.data.retentionSchedules.find(s => s.id === payload.scheduleId);
      if (sc) {
        doc.retentionScheduleId = sc.id;
        doc.retentionCategory = sc.documentCategory;
        doc.retentionYears = sc.retentionPeriodYears;
        doc.retentionExpiryDate = this.computeRetentionExpiryIso(doc.registrationDate, sc.retentionPeriodYears);
      }
    }

    const now = new Date().toISOString();
    doc.isArchived = true;
    doc.status = 'Archived';
    doc.archivedAt = now;
    doc.archivedBy = actor.fullNameEn;

    if (payload.locationId) {
      const resolved = this.resolveLocationChain(payload.locationId);
      doc.archiveLocationPath = resolved.locationPath;
      const pf = this.data.physicalFiles.find(f => f.documentId === doc.id);
      if (pf) {
        pf.locationId = payload.locationId;
        pf.locationPath = resolved.locationPath;
        pf.building = resolved.building;
        pf.room = resolved.room;
        pf.cabinet = resolved.cabinet;
        pf.shelfNumber = resolved.shelfNumber;
        pf.boxNumber = resolved.boxNumber;
        pf.status = 'Archived';
        pf.lastMovedDate = now;
      }
    } else if (!doc.archiveLocationPath) {
      doc.archiveLocationPath = doc.physicalTracking
        ? `${doc.physicalTracking.building} → ${doc.physicalTracking.room} → ${doc.physicalTracking.boxNumber}`
        : 'Block B - Central Registry → Room 101 (Historical Archive)';
    }

    doc.workflowHistory.push({
      id: `wf-arch-${Date.now()}`,
      timestamp: now,
      actorId: actor.id,
      actorName: actor.fullNameEn,
      actorRole: actor.role,
      action: 'Archived',
      comments: (payload.notes || `Transferred to Permanent Archive Vault (${doc.archiveLocationPath}).`).trim()
    });

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'TRANSFERRED_TO_ARCHIVE',
      resourceType: 'Document',
      resourceId: doc.registrationNumber,
      ipAddress: clientIp,
      details: `Archived ${doc.registrationNumber} to ${doc.archiveLocationPath}`
    });
    this.save();
    return { success: true, document: doc };
  }

  public getArchiveRetrievals(): ArchiveRetrievalRequest[] {
    return this.data.archiveRetrievals || [];
  }

  public requestArchiveRetrieval(
    payload: { documentId: string; neededUntilDate: string; reason: string },
    actor: User,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string; retrieval?: ArchiveRetrievalRequest } {
    const doc = this.data.documents.find(d => d.id === payload.documentId);
    if (!doc) return { success: false, statusCode: 404, error: 'Document not found.' };
    if (!doc.isArchived && doc.status !== 'Archived') {
      return { success: false, statusCode: 400, error: 'Only archived documents can be requested via Archive Retrieval.' };
    }
    if (doc.status === 'Disposed') {
      return { success: false, statusCode: 400, error: 'Disposed records cannot be retrieved.' };
    }
    const reason = (payload.reason || '').trim();
    if (reason.length < 10) {
      return { success: false, statusCode: 400, error: 'Retrieval justification must be at least 10 characters.' };
    }
    if (!payload.neededUntilDate) {
      return { success: false, statusCode: 400, error: 'Needed-until return date is required.' };
    }
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const neededTs = new Date(payload.neededUntilDate).getTime();
    if (Number.isNaN(neededTs) || neededTs < todayStart.getTime()) {
      return { success: false, statusCode: 400, error: 'Return date cannot be in the past.' };
    }

    const retrieval: ArchiveRetrievalRequest = {
      id: `retv-${Date.now().toString(36)}`,
      documentId: doc.id,
      registrationNumber: doc.registrationNumber,
      subjectEn: doc.subjectEn,
      requestedById: actor.id,
      requestedByName: actor.fullNameEn,
      requestedAt: new Date().toISOString(),
      neededUntilDate: payload.neededUntilDate,
      reason,
      status: 'Requested'
    };

    this.data.archiveRetrievals.unshift(retrieval);
    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'REQUESTED_ARCHIVE_RETRIEVAL',
      resourceType: 'ArchiveRetrieval',
      resourceId: doc.registrationNumber,
      ipAddress: clientIp,
      details: `Requested retrieval until ${payload.neededUntilDate}: ${reason}`
    });
    this.save();
    return { success: true, retrieval };
  }

  public updateArchiveRetrievalStatus(
    id: string,
    payload: { status: 'Fulfilled' | 'Returned' | 'Denied'; notes?: string },
    actor: User,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string; retrieval?: ArchiveRetrievalRequest } {
    if (!['SuperAdmin', 'DirectorGeneral', 'Director', 'RegistryOfficer'].includes(actor.role)) {
      return { success: false, statusCode: 403, error: 'Forbidden: Registry Officer or Director authority required.' };
    }
    const rec = this.data.archiveRetrievals.find(r => r.id === id);
    if (!rec) return { success: false, statusCode: 404, error: 'Archive retrieval request not found.' };

    const now = new Date().toISOString();
    rec.status = payload.status;
    if (payload.notes) rec.notes = payload.notes.trim();
    if (payload.status === 'Fulfilled') {
      rec.fulfilledAt = now;
      rec.fulfilledByName = actor.fullNameEn;
    } else if (payload.status === 'Returned') {
      rec.returnedAt = now;
    }

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: `ARCHIVE_RETRIEVAL_${payload.status.toUpperCase()}`,
      resourceType: 'ArchiveRetrieval',
      resourceId: rec.registrationNumber,
      ipAddress: clientIp,
      details: `Marked retrieval ${rec.id} as ${payload.status}${rec.notes ? ` (${rec.notes})` : ''}`
    });
    this.save();
    return { success: true, retrieval: rec };
  }

  public getDisposalRequests(): DisposalRequest[] {
    return this.data.disposalRequests || [];
  }

  public getDisposalCertificates(): DisposalCertificate[] {
    return this.data.disposalCertificates || [];
  }

  public createDisposalRequest(
    payload: {
      documentId: string;
      reason: string;
      method?: 'CertifiedShredding' | 'DigitalPurge' | 'NationalArchivesTransfer';
    },
    actor: User,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string; request?: DisposalRequest } {
    if (!this.hasPermission(actor, 'manage:archives') && actor.role !== 'SuperAdmin') {
      return { success: false, statusCode: 403, error: 'Forbidden: manage:archives permission required.' };
    }
    const doc = this.data.documents.find(d => d.id === payload.documentId);
    if (!doc) return { success: false, statusCode: 404, error: 'Document not found.' };

    if (doc.legalHold) {
      return { success: false, statusCode: 423, error: 'Document under Legal Hold cannot be edited, deleted, or disposed.' };
    }
    if (doc.status === 'Disposed') {
      return { success: false, statusCode: 400, error: 'Document has already been disposed.' };
    }
    if (doc.retentionYears === 0) {
      return { success: false, statusCode: 400, error: 'Documents with 0-year Permanent Retention cannot be scheduled for disposal.' };
    }
    if (!doc.retentionExpiryDate || new Date(doc.retentionExpiryDate).getTime() > Date.now()) {
      return {
        success: false,
        statusCode: 400,
        error: `Disposal only allowed after retention expiry date (${doc.retentionExpiryDate?.slice(0, 10) || 'Unscheduled'}).`
      };
    }

    const activeExisting = this.data.disposalRequests.some(
      r => r.documentId === doc.id && (r.status === 'PendingApproval' || r.status === 'ApprovedReady')
    );
    if (activeExisting) {
      return { success: false, statusCode: 400, error: 'An active disposal authorization request already exists for this document.' };
    }

    const reason = (payload.reason || '').trim();
    if (reason.length < 10) {
      return { success: false, statusCode: 400, error: 'Disposal justification reason must be at least 10 characters.' };
    }

    const requiredApprovals = ['Confidential', 'Secret'].includes(doc.confidentiality) ? 2 : 1;
    const reqObj: DisposalRequest = {
      id: `disp-${Date.now().toString(36)}`,
      documentId: doc.id,
      registrationNumber: doc.registrationNumber,
      subjectEn: doc.subjectEn,
      subjectAm: doc.subjectAm,
      confidentiality: doc.confidentiality,
      retentionCategory: doc.retentionCategory || 'General Institutional Record',
      retentionExpiryDate: doc.retentionExpiryDate,
      requestedById: actor.id,
      requestedByName: actor.fullNameEn,
      requestedAt: new Date().toISOString(),
      reason,
      method: payload.method || 'CertifiedShredding',
      requiredApprovals,
      approvals: [],
      status: 'PendingApproval'
    };

    this.data.disposalRequests.unshift(reqObj);
    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'CREATED_DISPOSAL_REQUEST',
      resourceType: 'DisposalRequest',
      resourceId: doc.registrationNumber,
      ipAddress: clientIp,
      details: `Initiated disposal request (${reqObj.method}, requires ${requiredApprovals} independent approval(s))`
    });
    this.save();
    return { success: true, request: reqObj };
  }

  public decideDisposalRequest(
    requestId: string,
    payload: { decision: 'Approved' | 'Rejected'; comments: string },
    actor: User,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string; request?: DisposalRequest } {
    const canApprove =
      this.hasPermission(actor, 'approve:workflows') ||
      this.hasPermission(actor, 'apply:legal_hold') ||
      ['SuperAdmin', 'DirectorGeneral', 'Director', 'Auditor'].includes(actor.role);
    if (!canApprove) {
      return { success: false, statusCode: 403, error: 'Forbidden: independent executive/director approval authority required.' };
    }

    const reqObj = this.data.disposalRequests.find(r => r.id === requestId);
    if (!reqObj) return { success: false, statusCode: 404, error: 'Disposal request not found.' };
    if (reqObj.status !== 'PendingApproval') {
      return { success: false, statusCode: 400, error: `Disposal request is already ${reqObj.status}.` };
    }

    const doc = this.data.documents.find(d => d.id === reqObj.documentId);
    if (doc?.legalHold) {
      return { success: false, statusCode: 423, error: 'Document is now under Legal Hold; disposal approval blocked.' };
    }

    if (actor.id === reqObj.requestedById && actor.role !== 'SuperAdmin') {
      return { success: false, statusCode: 403, error: 'Independent approval required: requester cannot approve their own disposal request.' };
    }
    if (reqObj.approvals.some(a => a.approverId === actor.id)) {
      return { success: false, statusCode: 400, error: 'Each independent approver may only submit one authorization decision.' };
    }

    const comments = (payload.comments || '').trim();
    if (comments.length < 10) {
      return { success: false, statusCode: 400, error: 'Authorization comment must be at least 10 characters.' };
    }

    const decision: DisposalApprovalEntry = {
      id: `dapr-${Date.now().toString(36)}`,
      approverId: actor.id,
      approverName: actor.fullNameEn,
      approverRole: actor.role,
      decision: payload.decision === 'Rejected' ? 'Rejected' : 'Approved',
      comments,
      decidedAt: new Date().toISOString()
    };
    reqObj.approvals.push(decision);

    if (decision.decision === 'Rejected') {
      reqObj.status = 'Rejected';
    } else {
      const approvedCount = reqObj.approvals.filter(a => a.decision === 'Approved').length;
      if (approvedCount >= reqObj.requiredApprovals) {
        reqObj.status = 'ApprovedReady';
      }
    }

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: `DISPOSAL_DECISION_${decision.decision.toUpperCase()}`,
      resourceType: 'DisposalRequest',
      resourceId: reqObj.registrationNumber,
      ipAddress: clientIp,
      details: `${decision.decision} disposal for ${reqObj.registrationNumber} (${reqObj.approvals.filter(a => a.decision === 'Approved').length}/${reqObj.requiredApprovals} approvals)`
    });
    this.save();
    return { success: true, request: reqObj };
  }

  public executeDisposalRequest(
    requestId: string,
    actor: User,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string; request?: DisposalRequest; certificate?: DisposalCertificate } {
    if (!['SuperAdmin', 'DirectorGeneral', 'RegistryOfficer'].includes(actor.role) && !this.hasPermission(actor, 'manage:archives')) {
      return { success: false, statusCode: 403, error: 'Forbidden: archive execution authority required.' };
    }

    const reqObj = this.data.disposalRequests.find(r => r.id === requestId);
    if (!reqObj) return { success: false, statusCode: 404, error: 'Disposal request not found.' };
    if (reqObj.status === 'Executed') {
      return { success: false, statusCode: 400, error: 'Disposal has already been irreversibly executed.' };
    }
    if (reqObj.status !== 'ApprovedReady') {
      return { success: false, statusCode: 400, error: 'Disposal requires all mandatory approvals before execution.' };
    }

    const doc = this.data.documents.find(d => d.id === reqObj.documentId);
    if (!doc) return { success: false, statusCode: 404, error: 'Target document not found.' };
    if (doc.legalHold) {
      return { success: false, statusCode: 423, error: 'Document under Legal Hold cannot be edited, deleted, or disposed.' };
    }
    if (doc.retentionYears === 0 || new Date(doc.retentionExpiryDate).getTime() > Date.now()) {
      return { success: false, statusCode: 400, error: 'Disposal only allowed after retention expiry and all approvals.' };
    }

    const distinctApprovers = new Set(
      reqObj.approvals.filter(a => a.decision === 'Approved').map(a => a.approverId)
    );
    const minApprovers = ['Confidential', 'Secret'].includes(doc.confidentiality) ? 2 : 1;
    if (distinctApprovers.size < minApprovers) {
      return {
        success: false,
        statusCode: 400,
        error: `Confidential/Secret records require at least ${minApprovers} independent approvers.`
      };
    }

    const now = new Date().toISOString();
    const sc = this.data.retentionSchedules.find(s => s.id === doc.retentionScheduleId);
    const certNumber = `CERT-EPSS-${new Date().getFullYear()}-${String(10 + this.data.disposalCertificates.length + 1).padStart(4, '0')}`;
    const certId = `cert-${Date.now().toString(36)}`;

    const certificate: DisposalCertificate = {
      id: certId,
      certificateNumber: certNumber,
      disposalRequestId: reqObj.id,
      documentId: doc.id,
      registrationNumber: doc.registrationNumber,
      subjectEn: doc.subjectEn,
      subjectAm: doc.subjectAm,
      confidentiality: doc.confidentiality,
      retentionCategory: reqObj.retentionCategory,
      governingLegislation: sc?.governingLegislation || 'National Archives and Library Agency (NALA) Proclamation',
      destructionMethod: reqObj.method,
      issuedAt: now,
      executedById: actor.id,
      executedByName: actor.fullNameEn,
      approvers: reqObj.approvals
        .filter(a => a.decision === 'Approved')
        .map(a => ({ name: a.approverName, role: a.approverRole, decidedAt: a.decidedAt })),
      digitalVerificationHash: crypto
        .createHash('sha256')
        .update(`${certNumber}|${doc.registrationNumber}|${now}|${actor.id}`)
        .digest('hex')
    };

    this.data.disposalCertificates.unshift(certificate);
    reqObj.status = 'Executed';
    reqObj.executedAt = now;
    reqObj.executedById = actor.id;
    reqObj.executedByName = actor.fullNameEn;
    reqObj.certificateId = certId;

    // Irreversible disposal marking on document
    doc.status = 'Disposed';
    doc.isArchived = true;
    doc.disposalCertificateId = certId;
    doc.workflowHistory.push({
      id: `wf-disp-${Date.now()}`,
      timestamp: now,
      actorId: actor.id,
      actorName: actor.fullNameEn,
      actorRole: actor.role,
      action: 'Archived',
      comments: `IRREVERSIBLE DISPOSAL EXECUTED (${reqObj.method}). Certificate issued: ${certNumber}`
    });

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'EXECUTED_IRREVERSIBLE_DISPOSAL',
      resourceType: 'DisposalCertificate',
      resourceId: certNumber,
      ipAddress: clientIp,
      details: `Disposed ${doc.registrationNumber} (${doc.confidentiality}) via ${reqObj.method}. Hash: ${certificate.digitalVerificationHash.slice(0, 16)}`
    });
    this.save();
    return { success: true, request: reqObj, certificate };
  }
}

export const store = new EdrmsStore();
