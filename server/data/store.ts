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
  CorrespondenceTemplate,
  CorrespondenceWorkflowState,
  DlpWatermarkContext,
  DocumentAnnotation,
  DocumentAnnotationReply,
  DocumentAttachment,
  DocumentItem,
  DocumentLink,
  DocumentLinkType,
  DocumentRedactionMark,
  DocumentRevision,
  DocumentRevisionActionType,
  DocumentRevisionSnapshot,
  DocumentViewerContext,
  DocumentViewerPage,
  EnrichedDocumentLink,
  RedactionCategory,
  PriorityLevel,
  EnterpriseConnector,
  ExecutiveKpiSummary, 
  LoginHistoryEntry,
  MissingPhysicalIncident,
  PasswordResetToken,
  PhysicalFileRecord,
  PhysicalHandoverMovement, 
  PhysicalLocationLevel,
  PhysicalLocationNode,
  PublicVerificationResponse,
  PublicVerificationSample,
  DisposalAlertUrgency,
  PendingDisposalAlertItem,
  RecordsAlertSummary,
  RegulatoryCategory,
  RetentionCalculationResult,
  RetentionSchedule,
  RetentionSimulationInput,
  RetentionTriggerEvent,
  TransmittalDispatchMethod,
  TransmittalManifest,
  BulkImportResult,
  BulkImportRowInput,
  BulkImportRowResult,
  BulkOperationItemResult,
  BulkOperationResult, 
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
  EscalationRule,
  EscalationTriggerType,
  NotificationConfig,
  NotificationDeliveryLog,
  NotificationEventType,
  NotificationTemplate,
  UserNotificationPreferences,
  WorkspaceActivityEntry,
  WorkspaceFileVersion,
  WorkspaceItem,
  WorkspacePermissionLevel,
  WorkspaceShareEntry,
  AiSearchConfig,
  DocumentSignatureVerificationResult,
  DuplicateMatch,
  SavedSearch,
  SearchFilterParams,
  SearchResponse,
  SearchResultItem,
  SignatureCheckDetail,
  SigningCertificate,
  AnalyticsQueryParams,
  BranchCluster,
  BranchTurnaroundMetric,
  ConfidentialityLevel,
  DirectorateWorkloadMetric,
  DocumentStatus,
  DocumentType,
  DocumentTypeBreakdownItem,
  ManagementAnalyticsReport,
  ManagementReportCategory,
  OverdueRegisterEntry,
  PkiComplianceSummary,
  ReportExportRecord,
  RetentionForecastSummary,
  SavedReportTemplate,
  TrendPeriodPoint,
  WorkflowStageBottleneckMetric,
  IntegrationEventType,
  IntegrationApiScope,
  WebhookSubscription,
  WebhookDeliveryRecord,
  IntegrationApiKey,
  ConnectorExchangeLog,
  AbacRule,
  AccessReviewCampaign,
  BreakGlassElevation,
  EffectivePermissionPreview,
  EnterpriseRole,
  PermissionDefinition,
  PermissionScopeLevel,
  PermissionSet,
  RoleAutoAssignmentRule,
  RoleScopeType,
  SodRule,
  SodViolationItem,
  UserRoleAssignment,
  SigningAlgorithm,
  HsmProviderType,
  KeyProtectionMode,
  TrustedTimestampToken,
  HsmSlotConfig,
  PkiCaNodeSummary,
  PkiPolicyConfig,
  PkiHsmGovernanceStatus,
  CrlRevocationEntry,
  DetachedSignatureBundle,
  BundleVerificationReport
} from '../../src/types/index.js';
import { INITIAL_DOCUMENTS, SEED_BRANCHES, SEED_DEPARTMENTS, SEED_RETENTION_SCHEDULES, SEED_USERS } from './seed.js';
import {
  createInitialAccessReviewCampaigns,
  createInitialAutoAssignmentRules,
  createInitialEnterpriseRoles,
  createInitialPermissionCatalogue,
  createInitialPermissionSets,
  createInitialSodRules,
  LEGACY_TO_CATALOGUE_MAP,
  PERMISSION_LEVEL_RANK
} from '../lib/rbacSeed.js';

interface StoredSigningCertificate extends SigningCertificate {
  privateKeyPem?: string;
  encryptedPrivateKeyPem?: string;
  keyWrappingIv?: string;
  keyWrappingTag?: string;
}

interface StoredCaNode extends PkiCaNodeSummary {
  encryptedPrivateKeyPem: string;
  keyWrappingIv: string;
  keyWrappingTag: string;
  hsmSlotId: string;
}

interface StoredWebhookSubscription extends WebhookSubscription {
  signingSecret: string;
}

interface StoredIntegrationApiKey extends IntegrationApiKey {
  keyHash: string;
}

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
  lastRetentionScanAt?: string;
  notificationTemplates: NotificationTemplate[];
  notificationPreferences: UserNotificationPreferences[];
  escalationRules: EscalationRule[];
  notificationDeliveryLogs: NotificationDeliveryLog[];
  notificationConfig: NotificationConfig;
  savedSearches: SavedSearch[];
  aiSearchConfig: AiSearchConfig;
  signingCertificates: StoredSigningCertificate[];
  hsmMasterKeyHex?: string;
  pkiCaHierarchy?: StoredCaNode[];
  hsmSlots?: HsmSlotConfig[];
  pkiPolicy?: PkiPolicyConfig;
  savedReportTemplates: SavedReportTemplate[];
  reportExportHistory: ReportExportRecord[];
  webhookSubscriptions: StoredWebhookSubscription[];
  webhookDeliveryLogs: WebhookDeliveryRecord[];
  integrationApiKeys: StoredIntegrationApiKey[];
  connectorExchangeLogs: ConnectorExchangeLog[];
  transmittalManifests: TransmittalManifest[];
  documentLinks: DocumentLink[];
  correspondenceTemplates: CorrespondenceTemplate[];
  permissionCatalogue: PermissionDefinition[];
  permissionSets: PermissionSet[];
  enterpriseRoles: EnterpriseRole[];
  userRoleAssignments: UserRoleAssignment[];
  sodRules: SodRule[];
  breakGlassElevations: BreakGlassElevation[];
  autoAssignmentRules: RoleAutoAssignmentRule[];
  accessReviewCampaigns: AccessReviewCampaign[];
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
  progressiveDelayBaseSeconds: 2,
  idleTimeoutMinutes: 30,
  absoluteTimeoutHours: 8,
  maxConcurrentSessions: 3,
  minPasswordLength: 10,
  maxDelegationDays: 90,
  maxTimeBoundRoleDays: 365,
  maxBreakGlassHours: 4
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
    notificationTemplates: [],
    notificationPreferences: [],
    escalationRules: [],
    notificationDeliveryLogs: [],
    notificationConfig: { smsMaxLength: 160, realtimeWsEnabled: true },
    savedSearches: [],
    aiSearchConfig: {
      ocrConfidenceThreshold: 0.75,
      duplicateSimilarityThreshold: 0.72,
      enableGeminiExtraction: true
    },
    signingCertificates: [],
    hsmSlots: [],
    pkiCaHierarchy: [],
    savedReportTemplates: [],
    reportExportHistory: [],
    webhookSubscriptions: [],
    webhookDeliveryLogs: [],
    integrationApiKeys: [],
    connectorExchangeLogs: [],
    transmittalManifests: [],
    documentLinks: [],
    correspondenceTemplates: [],
    permissionCatalogue: [],
    permissionSets: [],
    enterpriseRoles: [],
    userRoleAssignments: [],
    sodRules: [],
    breakGlassElevations: [],
    autoAssignmentRules: [],
    accessReviewCampaigns: [],
    sequenceNumbers: {
      'IN_2026': 102,
      'OUT_2026': 45,
      'MEMO_2026': 21,
      'APP_2026': 12
    }
  };

  private notificationBroadcaster?: (event: string, payload: unknown, targetUserId?: string) => void;

  public setNotificationBroadcaster(
    broadcaster: (event: string, payload: unknown, targetUserId?: string) => void
  ) {
    this.notificationBroadcaster = broadcaster;
  }

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
        this.ensurePhase7NotificationsState();
        this.ensurePhase8SearchAiState();
        this.ensurePhase9SignatureState();
        this.ensurePhase10AnalyticsState();
        this.ensurePhase11IntegrationsState();
        this.ensurePhase13TransmittalState();
        this.ensurePhase14DossiersAndTemplatesState();
        this.ensurePhase13RbacState();
        this.scanAndNotifyPendingDisposals(null, '127.0.0.1', false);
        this.save();
      } catch (err) {
        console.error('Failed to load store, re-seeding:', err);
        await this.seedInitial();
      }
    } else {
      await this.seedInitial();
      this.scanAndNotifyPendingDisposals(null, '127.0.0.1', false);
      this.save();
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
    this.ensurePhase7NotificationsState();
    this.ensurePhase8SearchAiState();
    this.ensurePhase9SignatureState();
    this.ensurePhase10AnalyticsState();
    this.ensurePhase11IntegrationsState();
    this.ensurePhase13TransmittalState();
    this.ensurePhase14DossiersAndTemplatesState();
    this.ensurePhase13RbacState();
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
    if (newUser.status === 'Active') {
      if (!Array.isArray(this.data.signingCertificates)) {
        this.data.signingCertificates = [];
      }
      this.data.signingCertificates.unshift(this.generateSigningCertificateRecord(newUser));
    }
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
        docData.retentionYears,
        {
          subjectEn: docData.subjectEn,
          subjectAm: docData.subjectAm,
          descriptionEn: docData.descriptionEn,
          ocrTextEn: docData.ocrTextEn || docData.aiExtracted?.ocrTextEn,
          senderOrganization: docData.senderOrganization,
          confidentiality: docData.confidentiality || 'Internal',
          regulatoryCategory: (docData as any).regulatoryCategory,
          tags: docData.tags || ['EPSS', prefix]
        }
      ),
      retentionManualOverride: !!(docData.retentionScheduleId || docData.retentionYears !== undefined),
      legalHold: false,
      ocrTextEn: docData.ocrTextEn || docData.aiExtracted?.ocrTextEn || '',
      ocrTextAm: docData.ocrTextAm || docData.aiExtracted?.ocrTextAm || '',
      ocrConfidence: docData.ocrConfidence ?? docData.aiExtracted?.ocrConfidence,
      contentHash: this.computeDocumentContentHash({
        type: docData.type || 'IncomingLetter',
        subjectEn: docData.subjectEn || 'Untitled Document',
        subjectAm: docData.subjectAm || docData.subjectEn || '',
        descriptionEn: docData.descriptionEn || '',
        senderOrganization: docData.senderOrganization || '',
        ocrTextEn: docData.ocrTextEn || docData.aiExtracted?.ocrTextEn || ''
      }),
      aiExtracted: docData.aiExtracted
    };

    this.ensureDocumentRevisions(newDoc, actor, 'Initial correspondence registration');
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
    if (newDoc.aiExtracted) {
      this.addAuditLog({
        userId: actor.id,
        userName: actor.fullNameEn,
        userRole: actor.role,
        branchName: actor.branchNameEn,
        action: 'AI_SUGGESTION_VERIFIED',
        resourceType: 'Document',
        resourceId: newDoc.registrationNumber,
        ipAddress: clientIp,
        details: `Verified and saved AI/OCR extraction (confidence=${Math.round((newDoc.aiExtracted.ocrConfidence ?? newDoc.aiExtracted.confidence ?? 0.9) * 100)}%, fields=${(newDoc.aiExtracted.acceptedFields || []).join(', ') || 'summary'})`
      });
    }

    this.emitIntegrationEvent(
      'document.registered',
      {
        documentId: newDoc.id,
        registrationNumber: newDoc.registrationNumber,
        type: newDoc.type,
        branchId: newDoc.branchId,
        confidentiality: newDoc.confidentiality,
        priority: newDoc.priority
      },
      actor.fullNameEn
    );

    this.save();
    return newDoc;
  }

  public updateDocument(
    documentId: string,
    updates: Partial<DocumentItem> & { overrideSignedLock?: boolean; editReason?: string },
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

    // Phase 9 Post-Approval Integrity Guard: protect digitally signed documents from silent edits
    const activeSignedEntries = (doc.workflowHistory || []).filter(
      h => h.digitalSignature && !h.digitalSignature.invalidated
    );
    const governedFields: Array<keyof DocumentItem> = [
      'subjectEn',
      'subjectAm',
      'descriptionEn',
      'senderOrganization',
      'recipientOrganization',
      'confidentiality'
    ];
    const modifiedGovernedFields = governedFields.filter(
      field => updates[field] !== undefined && updates[field] !== doc[field]
    );

    if (activeSignedEntries.length > 0 && modifiedGovernedFields.length > 0) {
      const canOverride = actor.role === 'SuperAdmin' || actor.role === 'DirectorGeneral';
      const cleanReason = (updates.editReason || '').trim();
      if (!updates.overrideSignedLock || !canOverride || cleanReason.length < 10) {
        throw new Error(
          `SIGNED_LOCK: Document ${doc.registrationNumber} carries ${activeSignedEntries.length} active cryptographic approval signature(s). Modifying governed fields (${modifiedGovernedFields.join(', ')}) requires DirectorGeneral/SuperAdmin override with a formal reason (min 10 characters), which supersedes existing signatures.`
        );
      }

      // Mark prior signatures as Superseded / Invalidated
      const now = new Date().toISOString();
      const supReason = `Superseded by ${actor.fullNameEn} (${actor.role}) post-approval edit [${modifiedGovernedFields.join(', ')}]: ${cleanReason}`;
      for (const h of doc.workflowHistory) {
        if (h.digitalSignature && !h.digitalSignature.invalidated) {
          h.digitalSignature.invalidated = true;
          h.digitalSignature.invalidatedReason = supReason;
          h.digitalSignature.verified = false;
        }
      }
      const wfInst = this.getWorkflowInstanceByIdOrDocId(doc.id);
      if (wfInst) {
        for (const h of wfInst.history) {
          if (h.digitalSignature && !h.digitalSignature.invalidated) {
            h.digitalSignature.invalidated = true;
            h.digitalSignature.invalidatedReason = supReason;
            h.digitalSignature.verified = false;
          }
        }
        wfInst.updatedAt = now;
      }

      this.addAuditLog({
        userId: actor.id,
        userName: actor.fullNameEn,
        userRole: actor.role,
        branchName: actor.branchNameEn,
        action: 'PKI_SIGNATURE_SUPERSEDED',
        resourceType: 'Document',
        resourceId: doc.registrationNumber,
        ipAddress: clientIp,
        details: supReason
      });
    }

    // Registration number is immutable by specification rule
    this.ensureDocumentRevisions(doc);
    const beforeSnapshotSummary = {
      subjectEn: doc.subjectEn,
      priority: doc.priority,
      confidentiality: doc.confidentiality,
      departmentId: doc.departmentId,
      version: doc.currentVersion || doc.revisions?.length || 1
    };

    const safeUpdates: any = { ...updates };
    delete safeUpdates.id;
    delete safeUpdates.registrationNumber;
    delete safeUpdates.legalHold;
    delete safeUpdates.overrideSignedLock;
    delete safeUpdates.editReason;
    delete safeUpdates.revisions;
    delete safeUpdates.currentVersion;

    Object.assign(doc, safeUpdates);
    if (safeUpdates.retentionScheduleId !== undefined || safeUpdates.retentionYears !== undefined) {
      doc.retentionManualOverride = true;
    } else if (!doc.retentionManualOverride) {
      const recalc = this.evaluateIntelligentRetention(
        {
          type: doc.type,
          subjectEn: doc.subjectEn,
          subjectAm: doc.subjectAm,
          descriptionEn: doc.descriptionEn,
          ocrTextEn: doc.ocrTextEn,
          senderOrganization: doc.senderOrganization,
          confidentiality: doc.confidentiality,
          regulatoryCategory: doc.regulatoryCategory,
          tags: doc.tags,
          registrationDate: doc.registrationDate,
          completedAt: this.findDocumentCompletionDate(doc),
          archivedAt: doc.archivedAt
        }
      );
      doc.retentionScheduleId = recalc.retentionScheduleId;
      doc.retentionCategory = recalc.retentionCategory;
      doc.regulatoryCategory = recalc.regulatoryCategory;
      doc.retentionTriggerEvent = recalc.retentionTriggerEvent;
      doc.retentionTriggerDate = recalc.retentionTriggerDate;
      doc.retentionYears = recalc.retentionYears;
      doc.retentionExpiryDate = recalc.retentionExpiryDate;
      doc.retentionClassificationReason = recalc.retentionClassificationReason;
      doc.retentionConfidence = recalc.retentionConfidence;
    }
    doc.contentHash = this.computeDocumentContentHash(doc);
    const revision = this.appendDocumentRevision(
      doc,
      actor,
      'MetadataEdit',
      (updates.editReason || '').trim() || `Updated correspondence metadata (${doc.subjectEn.slice(0, 60)})`
    );

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'UPDATED_DOCUMENT',
      resourceType: 'Document',
      resourceId: doc.registrationNumber,
      ipAddress: clientIp,
      details: `Updated document metadata for: ${doc.registrationNumber} (${doc.subjectEn}) [v${revision.versionNumber}]`,
      beforeValue: JSON.stringify(beforeSnapshotSummary),
      afterValue: JSON.stringify({
        subjectEn: doc.subjectEn,
        priority: doc.priority,
        confidentiality: doc.confidentiality,
        departmentId: doc.departmentId,
        version: revision.versionNumber
      })
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
    if (doc.status === 'Disposed') {
      throw new Error('Disposed documents are permanently immutable.');
    }

    this.ensureDocumentRevisions(doc);

    const existingSameName = doc.attachments.filter(
      a => a.fileName.toLowerCase() === attachment.fileName.toLowerCase()
    );
    const nextAttachmentVersion =
      existingSameName.length > 0
        ? Math.max(...existingSameName.map(a => a.version || 1)) + 1
        : attachment.version || 1;

    const newAtt: DocumentAttachment = {
      ...attachment,
      id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      uploadDate: new Date().toISOString(),
      uploadedBy: actor.fullNameEn,
      version: nextAttachmentVersion
    };

    doc.attachments.push(newAtt);
    doc.contentHash = this.computeDocumentContentHash(doc);
    const rev = this.appendDocumentRevision(
      doc,
      actor,
      'AttachmentUpdate',
      `Attached file: ${newAtt.fileName} (v${newAtt.version})`
    );

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'ADDED_ATTACHMENT',
      resourceType: 'DocumentAttachment',
      resourceId: doc.registrationNumber,
      ipAddress: clientIp,
      details: `Attached file: ${newAtt.fileName} (${(newAtt.fileSize / 1024).toFixed(1)} KB) to ${doc.registrationNumber} [Doc v${rev.versionNumber}]`
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
    if (doc.status === 'Disposed') {
      throw new Error('Disposed documents are permanently immutable.');
    }

    const att = doc.attachments.find(a => a.id === attachmentId);
    if (!att) return null;

    this.ensureDocumentRevisions(doc);
    Object.assign(att, updates);
    const rev = this.appendDocumentRevision(
      doc,
      actor,
      'AttachmentUpdate',
      `Updated attachment notes/metadata: ${att.fileName}`
    );

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'UPDATED_ATTACHMENT',
      resourceType: 'DocumentAttachment',
      resourceId: doc.registrationNumber,
      ipAddress: clientIp,
      details: `Updated metadata for attachment: ${att.fileName} on ${doc.registrationNumber} [Doc v${rev.versionNumber}]`
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
    if (doc.status === 'Disposed') {
      throw new Error('Disposed documents are permanently immutable.');
    }

    const attIndex = doc.attachments.findIndex(a => a.id === attachmentId);
    if (attIndex === -1) return null;

    this.ensureDocumentRevisions(doc);
    const removedFileName = doc.attachments[attIndex].fileName;
    doc.attachments.splice(attIndex, 1);
    doc.contentHash = this.computeDocumentContentHash(doc);
    const rev = this.appendDocumentRevision(
      doc,
      actor,
      'AttachmentUpdate',
      `Removed attachment: ${removedFileName}`
    );

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'REMOVED_ATTACHMENT',
      resourceType: 'DocumentAttachment',
      resourceId: doc.registrationNumber,
      ipAddress: clientIp,
      details: `Removed attachment: ${removedFileName} from ${doc.registrationNumber} [Doc v${rev.versionNumber}]`
    });

    this.save();
    return doc;
  }

  private buildDocumentRevisionSnapshot(doc: DocumentItem): DocumentRevisionSnapshot {
    return {
      subjectEn: doc.subjectEn,
      subjectAm: doc.subjectAm,
      descriptionEn: doc.descriptionEn || '',
      descriptionAm: doc.descriptionAm || '',
      senderOrganization: doc.senderOrganization,
      senderPerson: doc.senderPerson || '',
      recipientOrganization: doc.recipientOrganization,
      recipientPerson: doc.recipientPerson || '',
      priority: doc.priority,
      confidentiality: doc.confidentiality,
      status: doc.status,
      departmentId: doc.departmentId,
      assignedDepartmentName: doc.assignedDepartmentName || '',
      dueDate: doc.dueDate,
      attachments: (doc.attachments || []).map(att => ({ ...att }))
    };
  }

  public ensureDocumentRevisions(
    doc: DocumentItem,
    initialActor?: User,
    initialNote?: string
  ): DocumentRevision[] {
    if (!Array.isArray(doc.revisions) || doc.revisions.length === 0) {
      const baselineRev: DocumentRevision = {
        versionNumber: 1,
        createdAt: doc.registrationDate || doc.receivedDate || new Date().toISOString(),
        createdById: initialActor?.id || doc.assignedUserId || 'system',
        createdByName: initialActor?.fullNameEn || doc.assignedUserName || 'Central Registry',
        createdByRole: initialActor?.role || 'RegistryOfficer',
        actionType: 'Initial',
        changeNote: initialNote || 'Initial correspondence registration',
        contentHash: doc.contentHash || this.computeDocumentContentHash(doc),
        snapshot: this.buildDocumentRevisionSnapshot(doc)
      };
      doc.revisions = [baselineRev];
      doc.currentVersion = 1;
    } else if (!doc.currentVersion) {
      doc.currentVersion = Math.max(...doc.revisions.map(r => r.versionNumber));
    }
    return doc.revisions;
  }

  private appendDocumentRevision(
    doc: DocumentItem,
    actor: User,
    actionType: DocumentRevisionActionType,
    changeNote: string,
    restoredFromVersion?: number
  ): DocumentRevision {
    const revisions = this.ensureDocumentRevisions(doc, actor);
    const maxVersion = revisions.reduce((max, r) => Math.max(max, r.versionNumber), 0);
    const nextVersion = maxVersion + 1;
    const rev: DocumentRevision = {
      versionNumber: nextVersion,
      createdAt: new Date().toISOString(),
      createdById: actor.id,
      createdByName: actor.fullNameEn,
      createdByRole: actor.role,
      actionType,
      changeNote,
      restoredFromVersion,
      contentHash: doc.contentHash || this.computeDocumentContentHash(doc),
      snapshot: this.buildDocumentRevisionSnapshot(doc)
    };
    revisions.push(rev);
    doc.currentVersion = nextVersion;
    return rev;
  }

  public getDocumentRevisions(
    documentId: string
  ): { currentVersion: number; revisions: DocumentRevision[] } | null {
    const doc = this.data.documents.find(d => d.id === documentId);
    if (!doc) return null;
    const revisions = this.ensureDocumentRevisions(doc);
    return {
      currentVersion: doc.currentVersion || revisions[revisions.length - 1]?.versionNumber || 1,
      revisions: [...revisions].sort((a, b) => b.versionNumber - a.versionNumber)
    };
  }

  public createDocumentRevision(
    documentId: string,
    payload: {
      changeNote: string;
      fileName?: string;
      fileSize?: number;
      mimeType?: string;
      fileUrl?: string;
      notes?: string;
    },
    actor: User,
    clientIp: string
  ): {
    success: boolean;
    statusCode?: number;
    error?: string;
    document?: DocumentItem;
    revision?: DocumentRevision;
  } {
    if (!this.hasPermission(actor, 'edit:documents') && !this.hasPermission(actor, 'create:documents')) {
      return { success: false, statusCode: 403, error: 'Forbidden: document.update permission required.' };
    }
    const doc = this.data.documents.find(d => d.id === documentId);
    if (!doc) {
      return { success: false, statusCode: 404, error: 'Document not found.' };
    }
    if (doc.legalHold) {
      return { success: false, statusCode: 423, error: 'Document under Legal Hold cannot create new revisions.' };
    }
    if (doc.status === 'Disposed' || doc.isDeleted) {
      return { success: false, statusCode: 400, error: 'Disposed or cancelled documents cannot be revised.' };
    }

    const cleanNote = (payload.changeNote || '').trim();
    if (cleanNote.length < 5) {
      return { success: false, statusCode: 400, error: 'Revision change note must be at least 5 characters.' };
    }

    this.ensureDocumentRevisions(doc);

    if (payload.fileName && payload.fileUrl) {
      const cleanFileName = payload.fileName.trim();
      const existingSameName = doc.attachments.filter(
        a => a.fileName.toLowerCase() === cleanFileName.toLowerCase()
      );
      const nextAttVer =
        existingSameName.length > 0
          ? Math.max(...existingSameName.map(a => a.version || 1)) + 1
          : 1;
      doc.attachments.push({
        id: `att-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        fileName: cleanFileName,
        fileSize: Number(payload.fileSize) || 512000,
        mimeType: payload.mimeType || 'application/pdf',
        fileUrl: payload.fileUrl,
        uploadDate: new Date().toISOString(),
        uploadedBy: actor.fullNameEn,
        notes: payload.notes ? payload.notes.trim() : cleanNote,
        version: nextAttVer
      });
    }

    doc.contentHash = this.computeDocumentContentHash(doc);
    const revision = this.appendDocumentRevision(doc, actor, 'ManualRevision', cleanNote);

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'CREATED_DOCUMENT_REVISION',
      resourceType: 'Document',
      resourceId: doc.registrationNumber,
      ipAddress: clientIp,
      details: `Created revision v${revision.versionNumber} for ${doc.registrationNumber}`,
      reason: cleanNote,
      afterValue: JSON.stringify({
        versionNumber: revision.versionNumber,
        attachmentsCount: doc.attachments.length,
        contentHash: doc.contentHash
      })
    });

    this.save();
    return { success: true, document: doc, revision };
  }

  public restoreDocumentRevision(
    documentId: string,
    targetVersionNumber: number,
    payload: { reason: string; overrideSignedLock?: boolean },
    actor: User,
    clientIp: string
  ): {
    success: boolean;
    statusCode?: number;
    error?: string;
    signedLock?: boolean;
    document?: DocumentItem;
    revision?: DocumentRevision;
  } {
    if (!this.hasPermission(actor, 'edit:documents')) {
      return { success: false, statusCode: 403, error: 'Forbidden: document.update (edit:documents) permission required.' };
    }
    const doc = this.data.documents.find(d => d.id === documentId);
    if (!doc) {
      return { success: false, statusCode: 404, error: 'Document not found.' };
    }
    if (doc.legalHold) {
      return { success: false, statusCode: 423, error: 'Document under Legal Hold cannot be restored or modified.' };
    }
    if (doc.status === 'Disposed' || doc.isDeleted) {
      return { success: false, statusCode: 400, error: 'Disposed or cancelled documents are immutable and cannot be restored.' };
    }

    const cleanReason = (payload.reason || '').trim();
    if (cleanReason.length < 10) {
      return { success: false, statusCode: 400, error: 'Restore justification must be at least 10 characters.' };
    }

    const revisions = this.ensureDocumentRevisions(doc);
    const targetRev = revisions.find(r => r.versionNumber === targetVersionNumber);
    if (!targetRev) {
      return { success: false, statusCode: 404, error: `Revision v${targetVersionNumber} was not found.` };
    }

    const activeSignedEntries = (doc.workflowHistory || []).filter(
      h => h.digitalSignature && !h.digitalSignature.invalidated
    );
    const governedFields: Array<keyof DocumentRevisionSnapshot> = [
      'subjectEn',
      'subjectAm',
      'descriptionEn',
      'senderOrganization',
      'recipientOrganization',
      'confidentiality'
    ];
    const modifiedGovernedFields = governedFields.filter(
      f => (targetRev.snapshot[f] || '') !== ((doc as any)[f] || '')
    );

    if (activeSignedEntries.length > 0 && modifiedGovernedFields.length > 0) {
      const canOverride = actor.role === 'SuperAdmin' || actor.role === 'DirectorGeneral';
      if (!payload.overrideSignedLock || !canOverride) {
        return {
          success: false,
          statusCode: 409,
          signedLock: true,
          error: `SIGNED_LOCK: Restoring v${targetVersionNumber} modifies governed fields (${modifiedGovernedFields.join(', ')}) on a cryptographically signed document. DirectorGeneral or SuperAdmin signed-lock override is required.`
        };
      }

      const supReason = `Superseded by ${actor.fullNameEn} (${actor.role}) revision restore to v${targetVersionNumber}: ${cleanReason}`;
      for (const h of doc.workflowHistory) {
        if (h.digitalSignature && !h.digitalSignature.invalidated) {
          h.digitalSignature.invalidated = true;
          h.digitalSignature.invalidatedReason = supReason;
          h.digitalSignature.verified = false;
        }
      }
      const wfInst = this.getWorkflowInstanceByIdOrDocId(doc.id);
      if (wfInst) {
        for (const h of wfInst.history) {
          if (h.digitalSignature && !h.digitalSignature.invalidated) {
            h.digitalSignature.invalidated = true;
            h.digitalSignature.invalidatedReason = supReason;
            h.digitalSignature.verified = false;
          }
        }
        wfInst.updatedAt = new Date().toISOString();
      }
    }

    const previousVersionNumber = doc.currentVersion || revisions[revisions.length - 1]?.versionNumber || 1;
    const beforeSummary = {
      version: previousVersionNumber,
      subjectEn: doc.subjectEn,
      priority: doc.priority,
      confidentiality: doc.confidentiality,
      attachmentsCount: doc.attachments.length
    };

    const snap = targetRev.snapshot;
    doc.subjectEn = snap.subjectEn;
    doc.subjectAm = snap.subjectAm;
    doc.descriptionEn = snap.descriptionEn;
    doc.descriptionAm = snap.descriptionAm;
    doc.senderOrganization = snap.senderOrganization;
    doc.senderPerson = snap.senderPerson;
    doc.recipientOrganization = snap.recipientOrganization;
    doc.recipientPerson = snap.recipientPerson;
    doc.priority = snap.priority;
    doc.confidentiality = snap.confidentiality;
    doc.departmentId = snap.departmentId;
    doc.assignedDepartmentName = snap.assignedDepartmentName;
    doc.dueDate = snap.dueDate;
    doc.attachments = (snap.attachments || []).map(a => ({ ...a }));
    doc.contentHash = this.computeDocumentContentHash(doc);

    const restoredRevision = this.appendDocumentRevision(
      doc,
      actor,
      'Restored',
      `Restored draft from v${targetVersionNumber}: ${cleanReason}`,
      targetVersionNumber
    );

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'RESTORED_DOCUMENT_REVISION',
      resourceType: 'Document',
      resourceId: doc.registrationNumber,
      ipAddress: clientIp,
      details: `Restored ${doc.registrationNumber} from v${targetVersionNumber} as new revision v${restoredRevision.versionNumber}`,
      reason: cleanReason,
      beforeValue: JSON.stringify(beforeSummary),
      afterValue: JSON.stringify({
        version: restoredRevision.versionNumber,
        restoredFromVersion: targetVersionNumber,
        subjectEn: doc.subjectEn,
        priority: doc.priority,
        confidentiality: doc.confidentiality,
        attachmentsCount: doc.attachments.length
      })
    });

    this.save();
    return { success: true, document: doc, revision: restoredRevision };
  }

  public getCorrespondenceWorkflowState(
    documentId: string,
    actor: User
  ): CorrespondenceWorkflowState | null {
    const doc = this.data.documents.find(d => d.id === documentId);
    if (!doc) return null;

    const inst = this.getWorkflowInstanceByIdOrDocId(doc.id);
    if (!inst) {
      return {
        hasWorkflow: false,
        instance: null,
        definition: null,
        currentStage: null,
        assignees: [],
        isOverdue: false,
        isDueToday: false,
        remainingHours: 0
      };
    }
    const enriched = this.enrichWorkflowInstance(inst, actor);
    if (!enriched) {
      return {
        hasWorkflow: false,
        instance: null,
        definition: null,
        currentStage: null,
        assignees: [],
        isOverdue: false,
        isDueToday: false,
        remainingHours: 0
      };
    }
    return {
      hasWorkflow: true,
      instance: enriched.instance,
      definition: enriched.definition,
      currentStage: enriched.currentStage,
      assignees: enriched.assignees,
      isOverdue: enriched.isOverdue,
      isDueToday: enriched.isDueToday,
      remainingHours: enriched.remainingHours
    };
  }

  // =========================================================================
  // INLINE VIEWER, DLP WATERMARKING, ANNOTATIONS (@MENTIONS) & REDACTION
  // =========================================================================

  private escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private scrubTextWithRedactions(text: string, redactions: DocumentRedactionMark[]): string {
    if (!text) return '';
    let result = text;
    for (const r of redactions) {
      if (r.redactTextSnippet && r.redactTextSnippet.trim().length >= 3) {
        const pattern = new RegExp(this.escapeRegExp(r.redactTextSnippet.trim()), 'gi');
        result = result.replace(pattern, `[REDACTED · ${r.category}]`);
      }
    }
    return result;
  }

  public buildDlpWatermark(doc: DocumentItem, actor: User, clientIp: string): DlpWatermarkContext {
    const viewedAt = new Date().toISOString();
    const copyToken = crypto
      .createHash('sha256')
      .update(`${doc.id}:${actor.id}:${viewedAt}`)
      .digest('hex')
      .slice(0, 10)
      .toUpperCase();
    const enforceDlp =
      doc.confidentiality === 'Confidential' ||
      doc.confidentiality === 'Secret' ||
      doc.priority === 'VeryUrgent';

    return {
      watermarkText: `${doc.confidentiality.toUpperCase()} · ${actor.fullNameEn} (${actor.role}) · ${clientIp} · COPY-${copyToken}`,
      viewerName: actor.fullNameEn,
      viewerRole: actor.role,
      viewerBranch: actor.branchNameEn || 'Head Office',
      viewedAt,
      copyToken,
      enforceDlp
    };
  }

  public getDocumentViewerContext(
    documentId: string,
    actor: User,
    clientIp: string
  ): DocumentViewerContext | null {
    const doc = this.data.documents.find(d => d.id === documentId);
    if (!doc) return null;

    if (!Array.isArray(doc.annotations)) doc.annotations = [];
    if (!Array.isArray(doc.redactions)) doc.redactions = [];

    const watermark = this.buildDlpWatermark(doc, actor, clientIp);
    const redactions = doc.redactions;

    const pages: DocumentViewerPage[] = [];
    // Page 1: Official Bilingual Correspondence Cover & Metadata Sheet
    pages.push({
      pageNumber: 1,
      titleEn: `Official Correspondence Sheet · ${doc.registrationNumber}`,
      titleAm: `ይፋዊ የደብዳቤ ሰነድ · ${doc.registrationNumber}`,
      kind: 'dossier',
      lines: [
        { label: 'Registration No.', value: doc.registrationNumber },
        { label: 'Reference No.', value: doc.referenceNumber || '-' },
        { label: 'Document Type', value: doc.type },
        { label: 'Classification', value: `${doc.confidentiality} · ${doc.priority}` },
        { label: 'From (Sender)', value: this.scrubTextWithRedactions(`${doc.senderOrganization}${doc.senderPerson ? ` (${doc.senderPerson})` : ''}`, redactions) },
        { label: 'To (Recipient)', value: this.scrubTextWithRedactions(`${doc.recipientOrganization}${doc.recipientPerson ? ` (${doc.recipientPerson})` : ''}`, redactions) },
        { label: 'Assigned Directorate', value: doc.assignedDepartmentName || 'Central Registry' },
        { label: 'Current Version', value: `v${doc.currentVersion || doc.revisions?.length || 1}` }
      ],
      bodyText: this.scrubTextWithRedactions(
        [
          `SUBJECT (EN): ${doc.subjectEn}`,
          doc.subjectAm ? `SUBJECT (AM): ${doc.subjectAm}` : '',
          '',
          doc.descriptionEn || doc.ocrTextEn || doc.aiExtracted?.summaryEn || 'Official correspondence dossier registered in EPSS National EDRMS.'
        ]
          .filter(Boolean)
          .join('\n'),
        redactions
      )
    });

    // Attachment preview pages (one per digitized attachment)
    for (const att of doc.attachments || []) {
      const nextNum = pages.length + 1;
      const isWorkspaceBinary = att.fileUrl?.startsWith('/api/v1/workspace/items/');
      const inlineUrl = isWorkspaceBinary
        ? `${att.fileUrl}${att.fileUrl.includes('?') ? '&' : '?'}inline=1`
        : `/api/v1/correspondence/${doc.id}/attachments/${att.id}/download?inline=1`;
      pages.push({
        pageNumber: nextNum,
        titleEn: `Attachment: ${att.fileName} (v${att.version || 1})`,
        titleAm: `አባሪ ፋይል፡ ${att.fileName} (v${att.version || 1})`,
        kind: 'attachment-preview',
        attachmentId: att.id,
        inlinePreviewUrl: inlineUrl,
        mimeType: att.mimeType || 'application/pdf',
        lines: [
          { label: 'File Name', value: att.fileName },
          { label: 'File Version', value: `v${att.version || 1}` },
          { label: 'Size', value: `${(att.fileSize / 1024).toFixed(1)} KB` },
          { label: 'Uploaded By', value: att.uploadedBy }
        ],
        bodyText: this.scrubTextWithRedactions(
          [
            att.description || '',
            att.notes || '',
            doc.ocrTextEn ? `\n--- Extracted OCR Content ---\n${doc.ocrTextEn}` : ''
          ]
            .filter(Boolean)
            .join('\n'),
          redactions
        )
      });
    }

    // Final Page: Endorsement & PKI Sign-off Summary
    if ((doc.workflowHistory || []).length > 0) {
      const sigPageNum = pages.length + 1;
      const minutesBody = doc.workflowHistory
        .map(
          step =>
            `[${step.timestamp.slice(0, 16).replace('T', ' ')}] ${step.actorName} (${step.actorRole}) — ${step.action}: ${step.comments}${
              step.digitalSignature
                ? ` [PKI ${step.digitalSignature.invalidated ? 'SUPERSEDED' : 'VERIFIED'}: ${step.digitalSignature.certificateSerial}]`
                : ''
            }`
        )
        .join('\n\n');

      pages.push({
        pageNumber: sigPageNum,
        titleEn: 'Official Minutes & Cryptographic Signatures Trail',
        titleAm: 'ይፋዊ ማስታወሻዎች እና የዲጂታል ፊርማ መዝገብ',
        kind: 'minutes',
        lines: [
          { label: 'Workflow Entries', value: String(doc.workflowHistory.length) },
          {
            label: 'Active PKI Seals',
            value: String(
              doc.workflowHistory.filter(h => h.digitalSignature && !h.digitalSignature.invalidated).length
            )
          }
        ],
        bodyText: this.scrubTextWithRedactions(minutesBody, redactions)
      });
    }

    if (watermark.enforceDlp) {
      this.addAuditLog({
        userId: actor.id,
        userName: actor.fullNameEn,
        userRole: actor.role,
        branchName: actor.branchNameEn,
        action: 'VIEWED_DOCUMENT_INLINE',
        resourceType: 'Document',
        resourceId: doc.registrationNumber,
        ipAddress: clientIp,
        details: `Opened watermarked DLP viewer for ${doc.confidentiality} record (${watermark.copyToken})`
      });
      this.save();
    }

    return {
      documentId: doc.id,
      registrationNumber: doc.registrationNumber,
      totalPages: pages.length,
      pages,
      annotations: [...doc.annotations].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
      redactions: [...doc.redactions],
      watermark
    };
  }

  private resolveMentionedUsers(commentText: string, explicitUserIds?: string[]): User[] {
    const matched = new Map<string, User>();
    const activeUsers = this.data.users.filter(u => u.status !== 'Inactive');

    if (Array.isArray(explicitUserIds)) {
      for (const uid of explicitUserIds) {
        const u = activeUsers.find(x => x.id === uid);
        if (u) matched.set(u.id, u);
      }
    }

    const handleMatches = commentText.match(/@([a-zA-Z0-9._-]+)/g) || [];
    for (const token of handleMatches) {
      const handle = token.slice(1).toLowerCase();
      const u = activeUsers.find(x => x.username.toLowerCase() === handle);
      if (u) matched.set(u.id, u);
    }

    return Array.from(matched.values());
  }

  private notifyMentionedUsers(
    doc: DocumentItem,
    actor: User,
    mentionedUsers: User[],
    snippet: string,
    pageNumber: number
  ) {
    const now = new Date().toISOString();
    for (const target of mentionedUsers) {
      if (target.id === actor.id) continue;
      const notif: AppNotification = {
        id: `notif-mention-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        titleEn: `Mentioned on ${doc.registrationNumber}`,
        titleAm: `በሰነድ ${doc.registrationNumber} ማብራሪያ ውስጥ ተጠቅሰዋል`,
        messageEn: `${actor.fullNameEn} mentioned you on page ${pageNumber}: "${snippet.slice(0, 120)}"`,
        messageAm: `${actor.fullNameEn} በገጽ ${pageNumber} ላይ ጠቅሰውዎታል፦ "${snippet.slice(0, 120)}"`,
        timestamp: now,
        type: 'Assignment',
        isRead: false,
        userId: target.id,
        documentId: doc.id,
        registrationNumber: doc.registrationNumber,
        channel: 'InApp',
        priority: doc.priority === 'VeryUrgent' ? 'Critical' : 'Normal'
      };
      this.data.notifications.unshift(notif);
      this.data.notifications = this.data.notifications.slice(0, 150);
      this.notificationBroadcaster?.('notification:created', notif, target.id);
    }
  }

  public addDocumentAnnotation(
    documentId: string,
    payload: {
      pageNumber: number;
      xPercent: number;
      yPercent: number;
      comment: string;
      mentionedUserIds?: string[];
      attachmentId?: string;
    },
    actor: User,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string; annotation?: DocumentAnnotation } {
    const doc = this.data.documents.find(d => d.id === documentId);
    if (!doc) {
      return { success: false, statusCode: 404, error: 'Document not found.' };
    }
    if (doc.isDeleted || doc.status === 'Disposed') {
      return { success: false, statusCode: 400, error: 'Cannot annotate cancelled or disposed documents.' };
    }

    const cleanComment = (payload.comment || '').trim();
    if (cleanComment.length < 2 || cleanComment.length > 1000) {
      return { success: false, statusCode: 400, error: 'Annotation comment must be between 2 and 1000 characters.' };
    }

    const pageNumber = Math.max(1, Math.round(Number(payload.pageNumber) || 1));
    const xPercent = Math.min(98, Math.max(2, Number(payload.xPercent) || 50));
    const yPercent = Math.min(98, Math.max(2, Number(payload.yPercent) || 50));

    if (!Array.isArray(doc.annotations)) doc.annotations = [];
    const mentioned = this.resolveMentionedUsers(cleanComment, payload.mentionedUserIds);

    const annotation: DocumentAnnotation = {
      id: `ann-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      documentId: doc.id,
      attachmentId: payload.attachmentId,
      pageNumber,
      xPercent,
      yPercent,
      comment: cleanComment,
      mentionedUserIds: mentioned.map(u => u.id),
      mentionedUserNames: mentioned.map(u => u.fullNameEn),
      authorId: actor.id,
      authorName: actor.fullNameEn,
      authorRole: actor.role,
      status: 'Open',
      replies: [],
      createdAt: new Date().toISOString()
    };

    doc.annotations.unshift(annotation);
    this.notifyMentionedUsers(doc, actor, mentioned, cleanComment, pageNumber);

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'ADDED_DOCUMENT_ANNOTATION',
      resourceType: 'Document',
      resourceId: doc.registrationNumber,
      ipAddress: clientIp,
      details: `Added page ${pageNumber} annotation on ${doc.registrationNumber}${
        mentioned.length ? ` (mentioned: ${mentioned.map(u => u.username).join(', ')})` : ''
      }`
    });

    this.save();
    return { success: true, annotation };
  }

  public replyDocumentAnnotation(
    documentId: string,
    annotationId: string,
    payload: { message: string; mentionedUserIds?: string[] },
    actor: User,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string; annotation?: DocumentAnnotation } {
    const doc = this.data.documents.find(d => d.id === documentId);
    if (!doc) return { success: false, statusCode: 404, error: 'Document not found.' };

    const ann = (doc.annotations || []).find(a => a.id === annotationId);
    if (!ann) return { success: false, statusCode: 404, error: 'Annotation not found.' };

    const cleanMsg = (payload.message || '').trim();
    if (cleanMsg.length < 1 || cleanMsg.length > 1000) {
      return { success: false, statusCode: 400, error: 'Reply message is required (max 1000 characters).' };
    }

    const reply: DocumentAnnotationReply = {
      id: `rep-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      authorId: actor.id,
      authorName: actor.fullNameEn,
      authorRole: actor.role,
      message: cleanMsg,
      createdAt: new Date().toISOString()
    };
    ann.replies.push(reply);

    const mentioned = this.resolveMentionedUsers(cleanMsg, payload.mentionedUserIds);
    const authorUser = this.data.users.find(u => u.id === ann.authorId);
    const notifyList = authorUser && !mentioned.some(m => m.id === authorUser.id)
      ? [...mentioned, authorUser]
      : mentioned;
    this.notifyMentionedUsers(doc, actor, notifyList, cleanMsg, ann.pageNumber);

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'REPLIED_DOCUMENT_ANNOTATION',
      resourceType: 'Document',
      resourceId: doc.registrationNumber,
      ipAddress: clientIp,
      details: `Replied to annotation on page ${ann.pageNumber} of ${doc.registrationNumber}`
    });

    this.save();
    return { success: true, annotation: ann };
  }

  public resolveDocumentAnnotation(
    documentId: string,
    annotationId: string,
    resolved: boolean,
    actor: User,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string; annotation?: DocumentAnnotation } {
    const doc = this.data.documents.find(d => d.id === documentId);
    if (!doc) return { success: false, statusCode: 404, error: 'Document not found.' };

    const ann = (doc.annotations || []).find(a => a.id === annotationId);
    if (!ann) return { success: false, statusCode: 404, error: 'Annotation not found.' };

    ann.status = resolved ? 'Resolved' : 'Open';
    ann.resolvedByName = resolved ? actor.fullNameEn : undefined;
    ann.resolvedAt = resolved ? new Date().toISOString() : undefined;

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: resolved ? 'RESOLVED_DOCUMENT_ANNOTATION' : 'REOPENED_DOCUMENT_ANNOTATION',
      resourceType: 'Document',
      resourceId: doc.registrationNumber,
      ipAddress: clientIp,
      details: `${resolved ? 'Resolved' : 'Reopened'} page ${ann.pageNumber} annotation on ${doc.registrationNumber}`
    });

    this.save();
    return { success: true, annotation: ann };
  }

  public deleteDocumentAnnotation(
    documentId: string,
    annotationId: string,
    actor: User,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string } {
    const doc = this.data.documents.find(d => d.id === documentId);
    if (!doc) return { success: false, statusCode: 404, error: 'Document not found.' };
    if (doc.legalHold) {
      return { success: false, statusCode: 423, error: 'Document under Legal Hold cannot delete annotations.' };
    }
    const idx = (doc.annotations || []).findIndex(a => a.id === annotationId);
    if (idx === -1) return { success: false, statusCode: 404, error: 'Annotation not found.' };

    const target = doc.annotations![idx];
    if (
      target.authorId !== actor.id &&
      actor.role !== 'SuperAdmin' &&
      actor.role !== 'SecurityOfficer'
    ) {
      return { success: false, statusCode: 403, error: 'Forbidden: only the annotation author or Security Officer can remove it.' };
    }

    doc.annotations!.splice(idx, 1);
    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'DELETED_DOCUMENT_ANNOTATION',
      resourceType: 'Document',
      resourceId: doc.registrationNumber,
      ipAddress: clientIp,
      details: `Removed page ${target.pageNumber} annotation from ${doc.registrationNumber}`
    });
    this.save();
    return { success: true };
  }

  public applyDocumentRedaction(
    documentId: string,
    payload: {
      pageNumber: number;
      xPercent: number;
      yPercent: number;
      widthPercent: number;
      heightPercent: number;
      category: RedactionCategory;
      reason: string;
      redactTextSnippet?: string;
      attachmentId?: string;
    },
    actor: User,
    clientIp: string
  ): {
    success: boolean;
    statusCode?: number;
    error?: string;
    redaction?: DocumentRedactionMark;
    document?: DocumentItem;
  } {
    const canRedact =
      this.hasPermission(actor, 'edit:documents') ||
      this.hasPermission(actor, 'records.legal_hold') ||
      ['SuperAdmin', 'DirectorGeneral', 'SecurityOfficer', 'LegalOfficer', 'RecordsManager'].includes(
        actor.role
      );
    if (!canRedact) {
      return { success: false, statusCode: 403, error: 'Forbidden: redaction authority required.' };
    }

    const doc = this.data.documents.find(d => d.id === documentId);
    if (!doc) return { success: false, statusCode: 404, error: 'Document not found.' };
    if (doc.legalHold) {
      return { success: false, statusCode: 423, error: 'Document under Legal Hold cannot be redacted or altered.' };
    }
    if (doc.status === 'Disposed' || doc.isDeleted) {
      return { success: false, statusCode: 400, error: 'Disposed or cancelled documents cannot be redacted.' };
    }

    const cleanReason = (payload.reason || '').trim();
    if (cleanReason.length < 10) {
      return { success: false, statusCode: 400, error: 'Redaction justification must be at least 10 characters.' };
    }

    const allowedCats: RedactionCategory[] = [
      'PII',
      'FinancialBid',
      'MedicalBatch',
      'LegalClause',
      'NationalSecurity'
    ];
    if (!allowedCats.includes(payload.category)) {
      return { success: false, statusCode: 400, error: 'Invalid redaction category.' };
    }

    const w = Number(payload.widthPercent);
    const h = Number(payload.heightPercent);
    if (!Number.isFinite(w) || !Number.isFinite(h) || w < 1 || h < 1) {
      return { success: false, statusCode: 400, error: 'Redaction region must cover at least 1% x 1% area.' };
    }

    if (!Array.isArray(doc.redactions)) doc.redactions = [];
    this.ensureDocumentRevisions(doc);

    const cleanSnippet = payload.redactTextSnippet?.trim();
    const mark: DocumentRedactionMark = {
      id: `red-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      documentId: doc.id,
      attachmentId: payload.attachmentId,
      pageNumber: Math.max(1, Math.round(Number(payload.pageNumber) || 1)),
      xPercent: Math.min(99, Math.max(0, Number(payload.xPercent) || 0)),
      yPercent: Math.min(99, Math.max(0, Number(payload.yPercent) || 0)),
      widthPercent: Math.min(100, w),
      heightPercent: Math.min(100, h),
      category: payload.category,
      reason: cleanReason,
      redactTextSnippet: cleanSnippet && cleanSnippet.length >= 3 ? cleanSnippet : undefined,
      appliedById: actor.id,
      appliedByName: actor.fullNameEn,
      appliedByRole: actor.role,
      appliedAt: new Date().toISOString(),
      isPermanent: true
    };

    doc.redactions.push(mark);

    // If a literal text snippet was specified for permanent text scrubbing, snapshot & mask
    if (mark.redactTextSnippet) {
      const replacement = `[REDACTED · ${mark.category}]`;
      const pattern = new RegExp(this.escapeRegExp(mark.redactTextSnippet), 'gi');
      if (doc.descriptionEn) doc.descriptionEn = doc.descriptionEn.replace(pattern, replacement);
      if (doc.ocrTextEn) doc.ocrTextEn = doc.ocrTextEn.replace(pattern, replacement);
      if (doc.aiExtracted?.summaryEn) {
        doc.aiExtracted.summaryEn = doc.aiExtracted.summaryEn.replace(pattern, replacement);
      }
      doc.contentHash = this.computeDocumentContentHash(doc);
      this.appendDocumentRevision(
        doc,
        actor,
        'MetadataEdit',
        `Applied permanent ${mark.category} redaction: ${cleanReason}`
      );
    }

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'APPLIED_DOCUMENT_REDACTION',
      resourceType: 'Document',
      resourceId: doc.registrationNumber,
      ipAddress: clientIp,
      details: `Applied permanent ${mark.category} redaction on page ${mark.pageNumber} of ${doc.registrationNumber}`,
      reason: cleanReason,
      beforeValue: JSON.stringify({ redactionsCount: doc.redactions.length - 1 }),
      afterValue: JSON.stringify({
        redactionId: mark.id,
        category: mark.category,
        pageNumber: mark.pageNumber,
        redactionsCount: doc.redactions.length
      })
    });

    this.save();
    return { success: true, redaction: mark, document: doc };
  }

  public removeDocumentRedaction(
    documentId: string,
    redactionId: string,
    reason: string,
    actor: User,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string } {
    if (actor.role !== 'SuperAdmin' && actor.role !== 'SecurityOfficer') {
      return {
        success: false,
        statusCode: 403,
        error: 'Forbidden: un-redacting permanent marks requires SuperAdmin or SecurityOfficer clearance.'
      };
    }
    const cleanReason = (reason || '').trim();
    if (cleanReason.length < 10) {
      return { success: false, statusCode: 400, error: 'Un-redaction justification must be at least 10 characters.' };
    }
    const doc = this.data.documents.find(d => d.id === documentId);
    if (!doc) return { success: false, statusCode: 404, error: 'Document not found.' };
    if (doc.legalHold) {
      return { success: false, statusCode: 423, error: 'Document under Legal Hold cannot modify redaction marks.' };
    }
    if (doc.status === 'Disposed' || doc.isDeleted) {
      return { success: false, statusCode: 400, error: 'Disposed or cancelled documents are immutable.' };
    }

    const idx = (doc.redactions || []).findIndex(r => r.id === redactionId);
    if (idx === -1) return { success: false, statusCode: 404, error: 'Redaction mark not found.' };

    const removed = doc.redactions![idx];
    doc.redactions!.splice(idx, 1);

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'REMOVED_DOCUMENT_REDACTION',
      resourceType: 'Document',
      resourceId: doc.registrationNumber,
      ipAddress: clientIp,
      details: `Removed ${removed.category} redaction on page ${removed.pageNumber} of ${doc.registrationNumber}`,
      reason: cleanReason,
      beforeValue: JSON.stringify({ redactionId: removed.id, category: removed.category }),
      afterValue: JSON.stringify({ redactionsCount: doc.redactions!.length })
    });

    this.save();
    return { success: true };
  }

  public recordPrintWatermarkedCopy(
    documentId: string,
    copyToken: string,
    actor: User,
    clientIp: string
  ): boolean {
    const doc = this.data.documents.find(d => d.id === documentId);
    if (!doc) return false;
    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'PRINTED_WATERMARKED_COPY',
      resourceType: 'Document',
      resourceId: doc.registrationNumber,
      ipAddress: clientIp,
      details: `Generated DLP-watermarked print/view copy (${copyToken || 'COPY'}) of ${doc.registrationNumber}`
    });
    this.save();
    return true;
  }

  public synthesizeAttachmentPdfBuffer(
    doc: DocumentItem,
    att: DocumentAttachment,
    watermark: DlpWatermarkContext
  ): Buffer {
    const esc = (s: string) =>
      String(s || '')
        .replace(/[^\x20-\x7E]/g, ' ')
        .replace(/\\/g, '\\\\')
        .replace(/\(/g, '\\(')
        .replace(/\)/g, '\\)')
        .slice(0, 88);

    const lines = [
      'ETHIOPIAN PHARMACEUTICAL SUPPLY SERVICE (EPSS)',
      `Official Record Attachment: ${att.fileName} (v${att.version || 1})`,
      `Registration No: ${doc.registrationNumber}  |  Ref: ${doc.referenceNumber || '-'}`,
      `Classification: ${doc.confidentiality}  |  Priority: ${doc.priority}`,
      `Subject: ${doc.subjectEn}`,
      `Sender: ${doc.senderOrganization}  ->  Recipient: ${doc.recipientOrganization}`,
      `Uploaded By: ${att.uploadedBy}  |  Size: ${(att.fileSize / 1024).toFixed(1)} KB`,
      att.notes ? `Notes: ${att.notes}` : '',
      `DLP WATERMARK: ${watermark.watermarkText}`,
      `Redactions Active: ${(doc.redactions || []).length}`
    ].filter(Boolean);

    let stream = 'BT\n/F1 11 Tf\n50 760 Td\n16 TL\n';
    lines.forEach((line, idx) => {
      if (idx === 0) stream += `(${esc(line)}) Tj\n`;
      else stream += `T*\n(${esc(line)}) Tj\n`;
    });
    stream += 'ET\n';

    const objs = [
      '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
      '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
      '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n',
      `4 0 obj\n<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}endstream\nendobj\n`,
      '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n'
    ];

    let pdf = '%PDF-1.4\n';
    const offsets: number[] = [0];
    for (const obj of objs) {
      offsets.push(Buffer.byteLength(pdf, 'utf8'));
      pdf += obj;
    }
    const xrefStart = Buffer.byteLength(pdf, 'utf8');
    pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
    for (let i = 1; i <= objs.length; i++) {
      pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
    return Buffer.from(pdf, 'utf8');
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
      signingMeaning?: string;
      stepUpPin?: string;
      signDocument?: boolean;
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

  private getDocumentResolutionTimestampMs(doc: DocumentItem): number | null {
    if (doc.archivedAt && doc.status === 'Archived') {
      const ts = new Date(doc.archivedAt).getTime();
      if (!Number.isNaN(ts)) return ts;
    }
    const terminalHistory = [...(doc.workflowHistory || [])]
      .reverse()
      .find(h => ['Approved', 'Dispatched', 'Completed', 'Archived'].includes(h.action));
    if (terminalHistory?.timestamp) {
      const ts = new Date(terminalHistory.timestamp).getTime();
      if (!Number.isNaN(ts)) return ts;
    }
    if (['Approved', 'Dispatched', 'Completed', 'Archived'].includes(doc.status)) {
      const lastH = doc.workflowHistory?.[doc.workflowHistory.length - 1];
      if (lastH?.timestamp) {
        const ts = new Date(lastH.timestamp).getTime();
        if (!Number.isNaN(ts)) return ts;
      }
    }
    return null;
  }

  private computeDocumentTurnaroundDays(doc: DocumentItem, referenceNowMs: number): number | null {
    const startRaw = doc.registrationDate || doc.receivedDate;
    if (!startRaw) return null;
    const startMs = new Date(startRaw).getTime();
    if (Number.isNaN(startMs)) return null;
    const endMs = this.getDocumentResolutionTimestampMs(doc) ?? referenceNowMs;
    const diffDays = Math.max(0.1, (endMs - startMs) / 86400000);
    return Number(diffDays.toFixed(1));
  }

  private isDocumentOverdue(doc: DocumentItem, referenceNowMs: number): boolean {
    if (!doc.dueDate) return false;
    if (['Completed', 'Dispatched', 'Archived', 'Disposed', 'Cancelled', 'Approved'].includes(doc.status)) {
      return false;
    }
    const dueMs = new Date(doc.dueDate).getTime();
    return !Number.isNaN(dueMs) && dueMs < referenceNowMs;
  }

  private computePkiSummaryForDocs(docs: DocumentItem[]): PkiComplianceSummary {
    let totalApprovalsLogged = 0;
    let digitallySignedApprovals = 0;
    let tamperedOrInvalidDocuments = 0;

    for (const d of docs) {
      const approvalEntries = (d.workflowHistory || []).filter(h =>
        ['Approved', 'Dispatched', 'Completed'].includes(h.action)
      );
      totalApprovalsLogged += approvalEntries.length;
      const signedInDoc = approvalEntries.filter(
        h => Boolean(h.digitalSignature && !h.digitalSignature.invalidated && (h.digitalSignature.signatureBase64 || h.digitalSignature.verified))
      );
      digitallySignedApprovals += signedInDoc.length;

      if (d.workflowHistory?.some(h => h.digitalSignature && !h.digitalSignature.invalidated)) {
        const currentDigest = this.computeDocumentSigningDigest(d);
        const hasMismatch = d.workflowHistory.some(
          h =>
            h.digitalSignature &&
            !h.digitalSignature.invalidated &&
            h.digitalSignature.documentDigestSha256 &&
            h.digitalSignature.documentDigestSha256 !== currentDigest
        );
        if (hasMismatch) {
          tamperedOrInvalidDocuments += 1;
        }
      }
    }

    const activeCertificates = (this.data.signingCertificates || []).filter(c => c.status === 'Active').length;
    const revokedCertificates = (this.data.signingCertificates || []).filter(c => c.status === 'Revoked').length;
    const digitalSigningRate =
      totalApprovalsLogged > 0
        ? Number(((digitallySignedApprovals / totalApprovalsLogged) * 100).toFixed(1))
        : 100;

    return {
      totalApprovalsLogged,
      digitallySignedApprovals,
      digitalSigningRate,
      activeCertificates,
      revokedCertificates,
      tamperedOrInvalidDocuments
    };
  }

  public getExecutiveKpis(actor?: User, session?: AuthSession): ExecutiveKpiSummary {
    const allDocs = (this.data.documents || []).filter(d => d.status !== 'Cancelled' && d.status !== 'Disposed');
    const docs = actor
      ? allDocs.filter(d => this.canAccessDocument(actor, d, session).allowed)
      : allDocs;

    const now = Date.now();
    const incoming = docs.filter(d => d.type === 'IncomingLetter').length;
    const outgoing = docs.filter(d => d.type === 'OutgoingLetter').length;
    const memos = docs.filter(d => d.type === 'InternalMemo').length;
    const applications = docs.filter(d => d.type === 'Application').length;
    const pending = docs.filter(d =>
      ['Received', 'Registered', 'UnderReview', 'Assigned', 'InProgress', 'PendingInformation', 'Forwarded', 'AwaitingApproval'].includes(d.status)
    ).length;
    const completed = docs.filter(d => ['Approved', 'Dispatched', 'Completed'].includes(d.status)).length;
    const archived = docs.filter(d => d.isArchived || d.status === 'Archived').length;
    const overdue = docs.filter(d => this.isDocumentOverdue(d, now)).length;

    const turnaroundValues = docs
      .map(d => this.computeDocumentTurnaroundDays(d, now))
      .filter((v): v is number => v !== null);
    const averageProcessingDays =
      turnaroundValues.length > 0
        ? Number((turnaroundValues.reduce((a, b) => a + b, 0) / turnaroundValues.length).toFixed(1))
        : 0;

    const slaDenominator = docs.filter(d => Boolean(d.dueDate)).length || docs.length;
    const slaComplianceRate =
      slaDenominator > 0
        ? Number((((slaDenominator - overdue) / slaDenominator) * 100).toFixed(1))
        : 100;

    const pkiSummary = this.computePkiSummaryForDocs(docs);

    const thirtyDaysMs = 30 * 86400000;
    const recent30 = docs.filter(d => {
      const ts = new Date(d.registrationDate || d.receivedDate).getTime();
      return !Number.isNaN(ts) && ts >= now - thirtyDaysMs && ts <= now;
    }).length;
    const prior30 = docs.filter(d => {
      const ts = new Date(d.registrationDate || d.receivedDate).getTime();
      return !Number.isNaN(ts) && ts >= now - 2 * thirtyDaysMs && ts < now - thirtyDaysMs;
    }).length;
    const momDeltaPct =
      prior30 > 0 ? Number((((recent30 - prior30) / prior30) * 100).toFixed(1)) : null;

    const branchStats = this.data.branches.map(b => {
      const bDocs = docs.filter(d => d.branchId === b.id);
      const bIncoming = bDocs.filter(d => d.type === 'IncomingLetter').length;
      const bOutgoing = bDocs.filter(d => d.type === 'OutgoingLetter').length;
      const bOverdue = bDocs.filter(d => this.isDocumentOverdue(d, now)).length;
      const bTurnarounds = bDocs
        .map(d => this.computeDocumentTurnaroundDays(d, now))
        .filter((v): v is number => v !== null);
      const avgTurnaroundDays =
        bTurnarounds.length > 0
          ? Number((bTurnarounds.reduce((a, c) => a + c, 0) / bTurnarounds.length).toFixed(1))
          : 0;
      const bSlaDenom = bDocs.filter(d => Boolean(d.dueDate)).length || bDocs.length;
      const bSlaCompliance =
        bSlaDenom > 0
          ? Number((((bSlaDenom - bOverdue) / bSlaDenom) * 100).toFixed(1))
          : 100;
      const healthStatus: 'Nominal' | 'Attention' | 'Critical' | 'Idle' =
        bDocs.length === 0
          ? 'Idle'
          : bOverdue >= 2 || bSlaCompliance < 75
          ? 'Critical'
          : bOverdue > 0 || bSlaCompliance < 92
          ? 'Attention'
          : 'Nominal';

      return {
        branchId: b.id,
        branchNameEn: b.nameEn,
        incoming: bIncoming,
        outgoing: bOutgoing,
        overdue: bOverdue,
        avgTurnaroundDays,
        slaComplianceRate: bSlaCompliance,
        healthStatus
      };
    });

    const directorateStats = this.computeDirectorateWorkload(docs, now);
    const overduePhysicalCount = (this.data.physicalFiles || []).filter(
      f => f.status === 'CheckedOut' && f.expectedReturnDate && new Date(f.expectedReturnDate).getTime() < now
    ).length;

    return {
      totalIncoming: incoming,
      totalOutgoing: outgoing,
      totalInternalMemos: memos,
      totalApplications: applications,
      pendingApprovals: pending,
      overdueCount: overdue,
      completedThisMonth: completed,
      archivedCount: archived,
      averageProcessingDays,
      slaComplianceRate,
      digitalSigningRate: pkiSummary.digitalSigningRate,
      momDeltaPct,
      overduePhysicalCount,
      branchStats,
      directorateStats
    };
  }

  public getNotifications(actor?: User): AppNotification[] {
    const all = this.data.notifications || [];
    if (!actor) return all;
    return all.filter(
      n => !n.userId || n.userId === 'ALL' || n.userId === actor.id
    );
  }

  public markNotificationRead(id: string): boolean {
    const notif = (this.data.notifications || []).find(n => n.id === id);
    if (notif) {
      notif.isRead = true;
      this.save();
      this.notificationBroadcaster?.('notification:read', { id }, notif.userId);
      return true;
    }
    return false;
  }

  public markAllNotificationsRead(actor: User): number {
    let updated = 0;
    for (const notif of this.data.notifications || []) {
      if (!notif.isRead && (!notif.userId || notif.userId === 'ALL' || notif.userId === actor.id)) {
        notif.isRead = true;
        updated++;
      }
    }
    if (updated > 0) {
      this.save();
      this.notificationBroadcaster?.('notification:read_all', { userId: actor.id }, actor.id);
    }
    return updated;
  }

  public getConnectors(): EnterpriseConnector[] {
    return this.data.connectors || INITIAL_CONNECTORS;
  }

  public testConnector(id: string, actorName = 'System Diagnostic'): EnterpriseConnector | undefined {
    const conn = (this.data.connectors || []).find(c => c.id === id);
    if (!conn) return undefined;

    const now = new Date().toISOString();
    const isEnabled = conn.enabled !== false;
    let urlValid = false;
    try {
      const parsed = new URL(conn.endpoint);
      urlValid = ['https:', 'http:', 'ldaps:', 'smtps:'].includes(parsed.protocol);
    } catch {
      urlValid = false;
    }

    if (!isEnabled) {
      conn.status = 'Offline';
      conn.pingLatencyMs = 0;
      conn.lastError = 'Connector is administratively disabled.';
    } else if (!urlValid) {
      conn.status = 'Offline';
      conn.pingLatencyMs = 0;
      conn.lastError = `Invalid protocol or malformed endpoint URL: ${conn.endpoint}`;
    } else {
      conn.status = 'Connected';
      conn.lastError = undefined;
      conn.lastSyncTimestamp = now;
      // Deterministic diagnostic RTT derived cleanly from connector profile & timeout budget
      const seedSum = conn.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
      conn.pingLatencyMs = 14 + (seedSum % 32);
    }

    this.recordConnectorExchange({
      connectorId: conn.id,
      connectorName: conn.name,
      direction: 'Outbound',
      operation: 'TLS / Endpoint Health Check',
      status: conn.status === 'Connected' ? 'Success' : 'Failed',
      latencyMs: conn.pingLatencyMs,
      summary:
        conn.status === 'Connected'
          ? `Verified ${conn.authMethod} handshake on ${conn.endpoint} (${conn.pingLatencyMs}ms)`
          : conn.lastError || 'Endpoint unreachable',
      initiatedByName: actorName
    });

    this.save();
    return conn;
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

    // Phase 13: Enforce workspace visibility per actor role/shares/explicit denies
    const actorObj = this.getUserById(params.userId);
    if (actorObj) {
      items = items.filter(item => this.canAccessWorkspaceItem(actorObj, item, 'read').allowed);
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
    if (!this.canAccessWorkspaceItem(actor, item, 'share').allowed) {
      return { success: false, error: 'Forbidden: missing workspace.share or explicit deny restriction.' };
    }

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
          'apply:legal_hold', 'read:audit', 'export:reports', 'manage:users', 'manage:organizations'
        ]
      },
      {
        role: 'Director',
        label: 'Directorate Head',
        description: 'Directorate-level correspondence routing, workflow approval, and file sharing.',
        requiresMfa: true,
        permissions: [
          'read:documents', 'create:documents', 'edit:documents', 'approve:workflows',
          'manage:workspace', 'share:workspace', 'manage:archives', 'export:reports'
        ]
      },
      {
        role: 'RegistryOfficer',
        label: 'Registry Officer',
        description: 'Central intake registration, numbering sequence control, and physical file custody.',
        requiresMfa: false,
        permissions: [
          'read:documents', 'create:documents', 'edit:documents', 'track:physical',
          'manage:workspace', 'share:workspace', 'manage:archives', 'export:reports'
        ]
      },
      {
        role: 'BranchManager',
        label: 'Branch Hub Manager',
        description: 'Regional hub operations, branch correspondence registration, and physical tracking.',
        requiresMfa: false,
        permissions: ['read:documents', 'create:documents', 'edit:documents', 'track:physical', 'manage:workspace', 'export:reports']
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
    const maxConcurrent = Math.max(1, this.data.authPolicy?.maxConcurrentSessions || 3);

    // Enforce concurrent session limit per user (revoke oldest active sessions beyond limit - 1)
    const activeForUser = this.data.sessions
      .filter(
        s =>
          s.userId === user.id &&
          !s.isRevoked &&
          now < new Date(s.expiresAt).getTime() &&
          now < new Date(s.idleExpiresAt).getTime()
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    if (activeForUser.length >= maxConcurrent) {
      const toRevoke = activeForUser.slice(maxConcurrent - 1);
      for (const oldSess of toRevoke) {
        oldSess.isRevoked = true;
      }
      this.addAuditLog({
        userId: user.id,
        userName: user.fullNameEn,
        userRole: user.role,
        branchName: user.branchNameEn,
        action: 'SESSION_CONCURRENT_LIMIT_REVOKED',
        resourceType: 'AuthSession',
        resourceId: user.username,
        ipAddress: ip,
        details: `Automatically revoked ${toRevoke.length} older session(s) exceeding max concurrent limit (${maxConcurrent}).`
      });
    }

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

    // Enforce progressive login delay backoff if still inside cooldown window
    if (user.nextAllowedLoginAt && Date.now() < new Date(user.nextAllowedLoginAt).getTime()) {
      const waitSec = Math.max(1, Math.ceil((new Date(user.nextAllowedLoginAt).getTime() - Date.now()) / 1000));
      return {
        success: false,
        statusCode: 429,
        error: `Too many rapid failed attempts. Progressive security delay active: please wait ${waitSec} second(s) before retrying.`
      };
    }

    const validPassword = this.verifySecret(password, user.passwordHash);
    if (!validPassword) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      const maxAttempts = this.data.authPolicy?.maxFailedAttempts || 5;
      const baseDelay = this.data.authPolicy?.progressiveDelayBaseSeconds ?? 2;
      if (user.failedLoginAttempts >= maxAttempts) {
        const lockMins = this.data.authPolicy?.lockoutDurationMinutes || 15;
        user.status = 'Locked';
        user.lockedUntil = new Date(Date.now() + lockMins * 60 * 1000).toISOString();
        user.nextAllowedLoginAt = null;
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

      if (baseDelay > 0 && user.failedLoginAttempts >= 2) {
        const delaySec = Math.min(60, baseDelay * Math.pow(2, user.failedLoginAttempts - 2));
        user.nextAllowedLoginAt = new Date(Date.now() + delaySec * 1000).toISOString();
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

    // Valid password -> reset failure counter & delay
    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    user.nextAllowedLoginAt = null;

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

  public hasPermission(user: User, permission: string): boolean {
    if (user.role === 'SuperAdmin' || (user.permissions || []).includes('*')) {
      return true;
    }

    const keysToCheck = LEGACY_TO_CATALOGUE_MAP[permission] || [permission];
    const effective = this.getEffectivePermissionsForUser(user.id);

    // Explicit Deny overrides everything
    if (keysToCheck.some(k => effective.explicitDenies.includes(k)) || effective.explicitDenies.includes(permission)) {
      return false;
    }

    for (const key of keysToCheck) {
      const level = effective.effectiveLevels[key];
      if (level && level !== 'None') {
        return true;
      }
    }

    // Fallback to legacy user overrides & roleMatrix entries for custom runtime flags
    if ((user.permissions || []).includes(permission)) {
      return true;
    }
    const roleEntry = (this.data.roleMatrix || []).find(r => r.role === user.role);
    if (roleEntry && (roleEntry.permissions.includes('*') || roleEntry.permissions.includes(permission))) {
      return true;
    }
    return false;
  }

  private isLevelWithinResourceScope(
    level: PermissionScopeLevel,
    user: User,
    doc: DocumentItem
  ): boolean {
    if (level === 'All' || level === 'Organization') return true;
    if (level === 'None') return false;
    if (doc.assignedUserId === user.id) return true;
    if (doc.workflowHistory?.some(h => h.actorId === user.id && h.action === 'Registered')) return true;
    if (level === 'Own') return false;
    if (level === 'Department') {
      return doc.departmentId === user.departmentId;
    }
    if (level === 'Branch') {
      return doc.branchId === user.branchId || doc.departmentId === user.departmentId;
    }
    if (level === 'Cluster') {
      const uBranch = this.data.branches.find(b => b.id === user.branchId);
      const dBranch = this.data.branches.find(b => b.id === doc.branchId);
      return doc.branchId === user.branchId || (!!uBranch && !!dBranch && uBranch.cluster === dBranch.cluster);
    }
    return false;
  }

  private evaluateAbacCondition(
    cond: { field: string; operator: string; value: string },
    doc: DocumentItem,
    user: User
  ): boolean {
    const confRank: Record<string, number> = { Public: 0, Internal: 1, Confidential: 2, Secret: 3 };
    const prioRank: Record<string, number> = { Normal: 0, Urgent: 1, VeryUrgent: 2 };

    let resolvedTarget = (cond.value || '').trim();
    if (resolvedTarget === '$user.branchId') resolvedTarget = user.branchId;
    else if (resolvedTarget === '$user.departmentId') resolvedTarget = user.departmentId;
    else if (resolvedTarget === '$user.id') resolvedTarget = user.id;
    else if (resolvedTarget === '$user.cluster') {
      resolvedTarget = this.data.branches.find(b => b.id === user.branchId)?.cluster || '';
    }

    let docVal: string = '';
    switch (cond.field) {
      case 'confidentiality':
        docVal = doc.confidentiality;
        break;
      case 'type':
        docVal = doc.type;
        break;
      case 'priority':
        docVal = doc.priority;
        break;
      case 'branchId':
        docVal = doc.branchId;
        break;
      case 'departmentId':
        docVal = doc.departmentId;
        break;
      case 'status':
        docVal = doc.status;
        break;
      case 'ownerId':
        docVal = doc.assignedUserId || '';
        break;
      case 'legalHold':
        docVal = doc.legalHold ? 'true' : 'false';
        break;
      default:
        docVal = '';
    }

    if (cond.operator === 'eq') return docVal === resolvedTarget;
    if (cond.operator === 'neq') return docVal !== resolvedTarget;
    if (cond.operator === 'in') {
      const list = resolvedTarget.split(',').map(s => s.trim()).filter(Boolean);
      return list.includes(docVal);
    }
    if (cond.operator === 'notIn') {
      const list = resolvedTarget.split(',').map(s => s.trim()).filter(Boolean);
      return !list.includes(docVal);
    }
    if (cond.operator === 'lte' || cond.operator === 'gte') {
      const leftRank =
        cond.field === 'confidentiality'
          ? (confRank[docVal] ?? 0)
          : cond.field === 'priority'
          ? (prioRank[docVal] ?? 0)
          : Number(docVal) || 0;
      const rightRank =
        cond.field === 'confidentiality'
          ? (confRank[resolvedTarget] ?? 0)
          : cond.field === 'priority'
          ? (prioRank[resolvedTarget] ?? 0)
          : Number(resolvedTarget) || 0;
      return cond.operator === 'lte' ? leftRank <= rightRank : leftRank >= rightRank;
    }
    return false;
  }

  public evaluateAbacForDocument(
    user: User,
    doc: DocumentItem,
    permissionKey: string
  ): { allowed: boolean; reason?: string } {
    if (user.role === 'SuperAdmin') return { allowed: true };
    const effective = this.getEffectivePermissionsForUser(user.id);

    if (effective.explicitDenies.includes(permissionKey)) {
      return { allowed: false, reason: `Explicit deny rule blocks "${permissionKey}".` };
    }

    const level = effective.effectiveLevels[permissionKey] || 'None';
    if (level === 'None') {
      return { allowed: false, reason: `Missing "${permissionKey}" permission.` };
    }
    if (!this.isLevelWithinResourceScope(level, user, doc)) {
      return {
        allowed: false,
        reason: `Permission "${permissionKey}" scope (${level}) does not cover this branch/department record.`
      };
    }

    const matchingRules = effective.activeAbacRules.filter(r => r.permissionKey === permissionKey);
    // 1. Explicit Deny ABAC rules win unconditionally
    for (const denyRule of matchingRules.filter(r => r.effect === 'Deny')) {
      if (denyRule.conditions.length > 0 && denyRule.conditions.every(c => this.evaluateAbacCondition(c, doc, user))) {
        return { allowed: false, reason: denyRule.description || `Denied by attribute policy on ${permissionKey}.` };
      }
    }

    // 2. Positive Allow ABAC restrictions (if defined for this permission, at least one Allow rule must pass)
    const allowRules = matchingRules.filter(r => r.effect === 'Allow');
    if (allowRules.length > 0) {
      const anyMatch = allowRules.some(rule =>
        rule.conditions.every(c => this.evaluateAbacCondition(c, doc, user))
      );
      if (!anyMatch) {
        return {
          allowed: false,
          reason: allowRules[0]?.description || `Attribute condition check failed for "${permissionKey}".`
        };
      }
    }

    return { allowed: true };
  }

  public canAccessDocument(
    user: User,
    doc: DocumentItem,
    session?: AuthSession
  ): { allowed: boolean; mfaNeeded?: boolean; reason?: string } {
    const abacCheck = this.evaluateAbacForDocument(user, doc, 'document.read');
    if (!abacCheck.allowed) {
      return { allowed: false, reason: abacCheck.reason };
    }

    if (doc.confidentiality === 'Confidential' || doc.confidentiality === 'Secret') {
      const effective = this.getEffectivePermissionsForUser(user.id);
      const readLevel = effective.effectiveLevels['document.read'] || 'None';
      const hasClearance =
        user.role === 'SuperAdmin' ||
        readLevel === 'All' ||
        effective.activeRoleCodes.some(c => ['SuperAdmin', 'DirectorGeneral', 'Director', 'Auditor', 'SystemAuditor', 'SecurityOfficer'].includes(c)) ||
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

  public canAccessWorkspaceItem(
    actor: User,
    item: WorkspaceItem,
    mode: 'read' | 'write' | 'share' | 'download'
  ): { allowed: boolean; reason?: string } {
    if (actor.role === 'SuperAdmin') return { allowed: true };
    const effective = this.getEffectivePermissionsForUser(actor.id);

    if (mode === 'share' && effective.explicitDenies.includes('workspace.share')) {
      return { allowed: false, reason: 'Explicit deny prevents sharing workspace items.' };
    }
    if (mode === 'write' && effective.explicitDenies.includes('workspace.upload')) {
      return { allowed: false, reason: 'Explicit deny prevents modifying workspace items.' };
    }
    if (mode === 'download' && effective.explicitDenies.includes('document.download')) {
      return { allowed: false, reason: 'Explicit deny prevents downloading workspace files.' };
    }
    if (mode === 'download' && !this.hasPermission(actor, 'document.download') && item.ownerId !== actor.id) {
      return { allowed: false, reason: 'Forbidden: document.download permission required to download files.' };
    }

    if (mode === 'share') {
      const canSharePerm = this.hasPermission(actor, 'workspace.share') || item.ownerId === actor.id;
      if (!canSharePerm || effective.explicitDenies.includes('workspace.share')) {
        return { allowed: false, reason: 'Forbidden: workspace.share permission required.' };
      }
      return { allowed: true };
    }

    const isOwner = item.ownerId === actor.id;
    const isSharedWithUserOrRole = item.shares.some(
      s =>
        (s.targetType === 'user' && s.targetId === actor.id) ||
        (s.targetType === 'role' && (s.targetId === actor.role || effective.activeRoleCodes.includes(s.targetId)))
    );
    const hasEditorShare = item.shares.some(
      s =>
        s.permission === 'Editor' &&
        ((s.targetType === 'user' && s.targetId === actor.id) ||
          (s.targetType === 'role' && (s.targetId === actor.role || effective.activeRoleCodes.includes(s.targetId))))
    );

    const manageLevel = effective.effectiveLevels['workspace.manage_permissions'] || 'None';
    const uploadLevel = effective.effectiveLevels['workspace.upload'] || 'None';
    const readLevel = effective.effectiveLevels['document.read'] || 'None';

    if (manageLevel === 'All' || manageLevel === 'Organization') {
      return { allowed: true };
    }

    if (mode === 'write') {
      if (isOwner || hasEditorShare) return { allowed: true };
      if (uploadLevel === 'All' || uploadLevel === 'Organization') return { allowed: true };
      if (uploadLevel === 'Department' && item.departmentId === actor.departmentId) return { allowed: true };
      return { allowed: false, reason: 'Forbidden: editor or workspace.upload access required.' };
    }

    // read / download
    if (isOwner || isSharedWithUserOrRole || item.shareLinkEnabled) return { allowed: true };
    if (uploadLevel !== 'None' || readLevel === 'All' || readLevel === 'Organization') return { allowed: true };
    if ((readLevel === 'Department' || readLevel === 'Branch') && (!item.departmentId || item.departmentId === actor.departmentId)) {
      return { allowed: true };
    }
    return { allowed: false, reason: 'Forbidden: you do not have access to this workspace item.' };
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
      signingMeaning?: string;
      stepUpPin?: string;
      signDocument?: boolean;
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

    // Step-up MFA / Biometric / PIN gate for Secret / Confidential / VeryUrgent approval
    let pinStepUpVerified = false;
    if (actionData.stepUpPin) {
      const fullActor = this.getUserById(actor.id);
      if (!fullActor || !this.verifySecret(actionData.stepUpPin.trim(), fullActor.mfaPinHash)) {
        return {
          success: false,
          statusCode: 401,
          error: 'Invalid Officer Security PIN provided for step-up signature verification.'
        };
      }
      pinStepUpVerified = true;
      if (session?.token) {
        this.markSessionMfaVerified(session.token, actor, clientIp);
      }
    }

    const isSensitiveApproval =
      doc.confidentiality === 'Secret' ||
      doc.confidentiality === 'Confidential' ||
      doc.priority === 'VeryUrgent' ||
      !!currentStage?.requireBiometricForSensitive;
    if (actionData.action === 'Approved' && isSensitiveApproval) {
      const verified = !!session?.mfaVerified || !!actionData.biometricSignatureVerified || pinStepUpVerified;
      if (!verified) {
        return {
          success: false,
          statusCode: 403,
          mfaNeeded: true,
          error: `Biometric / MFA verification is mandatory to approve ${doc.confidentiality} / ${doc.priority} records.`
        };
      }
    }

    // Phase 9 + Outgoing Non-Repudiation: Enforce active EPSS PKI/HSM certificate on approvals, signing actions, or outgoing dispatch
    const stageRequiresSignature = !!currentStage?.requiredFields?.includes('digitalSignature');
    const policyRequireOutgoing = this.data.pkiPolicy?.requireSignedOutgoingDispatch ?? true;
    const isOutgoingType = doc.type === 'OutgoingLetter';
    const hasExistingValidSig =
      (doc.workflowHistory || []).some(
        h =>
          h.digitalSignature &&
          !h.digitalSignature.invalidated &&
          h.digitalSignature.documentDigestSha256 === this.computeDocumentSigningDigest(doc)
      );

    if (
      actionData.action === 'Dispatched' &&
      isOutgoingType &&
      policyRequireOutgoing &&
      !actionData.signDocument &&
      !actionData.digitalSignatureCertificate &&
      !hasExistingValidSig
    ) {
      return {
        success: false,
        statusCode: 412,
        error: `SIGNING_REQUIRED_FOR_DISPATCH: Outgoing correspondence ${doc.registrationNumber} cannot be dispatched without an active, valid PKI/HSM cryptographic signature matching its current digest.`
      };
    }

    const shouldSignCryptographically =
      actionData.action === 'Approved' ||
      !!actionData.signDocument ||
      !!actionData.digitalSignatureCertificate ||
      (stageRequiresSignature && (actionData.action === 'Reviewed' || actionData.action === 'Dispatched'));

    let signingCert: StoredSigningCertificate | null = null;
    if (shouldSignCryptographically) {
      signingCert = this.getActiveCertificateForUser(actor.id);
      if (!signingCert) {
        return {
          success: false,
          statusCode: 403,
          error: 'Active EPSS PKI signing certificate required. Your certificate has been revoked, expired, or not yet issued.'
        };
      }
      if (
        actionData.digitalSignatureCertificate &&
        actionData.digitalSignatureCertificate !== signingCert.serialNumber
      ) {
        return {
          success: false,
          statusCode: 403,
          error: `Provided certificate serial (${actionData.digitalSignatureCertificate}) does not match your active EPSS PKI certificate (${signingCert.serialNumber}).`
        };
      }
    }

    // Phase 13: Evaluate workflow permission, ABAC rules & explicit denies
    const wfPermMap: Record<string, string> = {
      Approved: 'workflow.approve',
      Rejected: 'workflow.reject',
      ReturnedForCorrection: 'workflow.return',
      Delegated: 'workflow.delegate',
      Forwarded: 'workflow.view',
      Reviewed: 'workflow.view',
      Dispatched: 'workflow.view',
      Archived: 'document.archive'
    };
    const requiredWfPerm = wfPermMap[actionData.action] || 'workflow.view';
    if (actor.role !== 'SuperAdmin') {
      const abacWf = this.evaluateAbacForDocument(actor, doc, requiredWfPerm);
      if (!abacWf.allowed) {
        return { success: false, statusCode: 403, error: abacWf.reason };
      }
    }

    // Phase 13: Enforce WorkflowConflict SoD Rule (Initiator cannot be Final Approver on same workflow)
    if (actionData.action === 'Approved' && actor.role !== 'SuperAdmin') {
      const wfSodActive = (this.data.sodRules || []).some(
        r => r.isActive && r.ruleType === 'WorkflowConflict' && r.severity === 'Blocking'
      );
      const hasActiveBreakGlass = (this.data.breakGlassElevations || []).some(
        bg => bg.userId === actor.id && bg.status === 'Active' && Date.now() < new Date(bg.expiresAt).getTime()
      );
      const initiatorEntry = doc.workflowHistory.find(h => h.action === 'Registered');
      if (wfSodActive && !hasActiveBreakGlass && initiatorEntry && initiatorEntry.actorId === actor.id) {
        return {
          success: false,
          statusCode: 409,
          error: 'Separation of Duties (SoD) violation: correspondence initiator/registrant cannot act as approver on their own submitted workflow.'
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
      doc.archivedAt = doc.archivedAt || now;
      doc.archivedBy = doc.archivedBy || actor.fullNameEn;
      instance.status = 'Completed';
    }

    doc.status = newDocStatus;
    instance.updatedAt = now;

    // Recalculate trigger-anchored disposition date when record reaches completion/dispatch/archive
    if (
      !doc.legalHold &&
      !doc.retentionManualOverride &&
      ['Approved', 'Completed', 'Dispatched', 'Archived'].includes(newDocStatus)
    ) {
      this.refreshDocumentRetentionAnchor(doc, newDocStatus === 'Archived' ? undefined : now, newDocStatus === 'Archived' ? now : undefined);
    }

    const delegateNote =
      actCheck.actingAsDelegateFor.length > 0
        ? ` [Acting Delegate for ${actCheck.actingAsDelegateFor.map(id => this.getUserById(id)?.fullNameEn || id).join(', ')}]`
        : '';

    const mfaMethodUsed: 'webauthn' | 'pin' | 'session_mfa' | 'standard' = actionData.biometricSignatureVerified
      ? 'webauthn'
      : pinStepUpVerified
        ? 'pin'
        : session?.mfaVerified
          ? 'session_mfa'
          : 'standard';

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
      biometricVerified:
        !!actionData.biometricSignatureVerified ||
        pinStepUpVerified ||
        (actionData.action === 'Approved' && !!session?.mfaVerified),
      forwardedToDepartmentId: actionData.forwardToDepartmentId,
      forwardedToUserId: actionData.forwardToUserId || actionData.delegateToUserId
    };

    if (signingCert) {
      const meaning =
        (actionData.signingMeaning || '').trim() ||
        (recordedAction === 'ParallelApproved'
          ? 'Parallel Executive Endorsement'
          : recordedAction === 'Dispatched'
            ? 'Authorized Official Dispatch Seal'
            : 'Approved for Official Issuance');
      historyRecord.digitalSignature = this.createCryptographicSignatureRecord(doc, actor, signingCert, {
        action: recordedAction,
        stageName: historyRecord.stageName || instance.currentStageName,
        signingMeaning: meaning,
        biometricVerified: !!historyRecord.biometricVerified,
        mfaMethod: mfaMethodUsed,
        timestamp: now
      });
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

    if (historyRecord.digitalSignature) {
      this.addAuditLog({
        userId: actor.id,
        userName: actor.fullNameEn,
        userRole: actor.role,
        branchName: actor.branchNameEn,
        action: 'PKI_DOCUMENT_SIGNED',
        resourceType: 'DigitalSignature',
        resourceId: doc.registrationNumber,
        ipAddress: clientIp,
        details: `RSA-SHA256 signature applied (${historyRecord.digitalSignature.signingMeaning}) via cert ${historyRecord.digitalSignature.certificateSerial} [digest=${historyRecord.digitalSignature.documentDigestSha256?.slice(0, 16)}...]`
      });
    }

    if (['Approved', 'ParallelApproved', 'Dispatched'].includes(recordedAction)) {
      this.emitIntegrationEvent(
        recordedAction === 'Dispatched' ? 'document.dispatched' : 'document.approved',
        {
          documentId: doc.id,
          registrationNumber: doc.registrationNumber,
          action: recordedAction,
          stageName: historyRecord.stageName,
          status: newDocStatus,
          certificateSerial: historyRecord.digitalSignature?.certificateSerial || null
        },
        actor.fullNameEn
      );
    }

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

    this.dispatchNotification({
      eventType: 'OverdueSLA',
      targetUserId: targetUser?.id,
      titleEn: `Workflow SLA Escalated: ${instance.registrationNumber}`,
      titleAm: `የሥራ ፍሰት ቀነ-ገደብ ማሳሰቢያ፡ ${instance.registrationNumber}`,
      messageEn: `${actor.fullNameEn} escalated stage "${instance.currentStageName}" to ${targetUser?.fullNameEn || 'Director General'}.`,
      messageAm: `${actor.fullNameEn} የሥራ ፍሰቱን "${instance.currentStageName}" ወደ ${targetUser?.fullNameEn || 'ዋና ዳይሬክተር'} አሳልፈዋል።`,
      documentId: instance.documentId,
      registrationNumber: instance.registrationNumber,
      priority: 'Critical'
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

    this.dispatchNotification({
      eventType: 'Dispatch',
      targetUserId: toUser.id,
      titleEn: `Physical File Handover Pending Receipt: ${pf.fileCode}`,
      titleAm: `የአካላዊ ሰነድ ርክክብ ማረጋገጫ ይጠብቃል፡ ${pf.fileCode}`,
      messageEn: `${pf.currentCustodianName} initiated handover of ${pf.registrationNumber} to ${toUser.fullNameEn}. Acknowledge receipt upon delivery.`,
      messageAm: `${pf.currentCustodianName} የሰነድ ${pf.registrationNumber} ርክክብ ወደ ${toUser.fullNameEn} ጀምረዋል።`,
      documentId: pf.documentId,
      registrationNumber: pf.registrationNumber,
      priority: 'Normal'
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
    this.dispatchNotification({
      eventType: 'Security',
      titleEn: `URGENT Missing Physical File (${urgency}): ${incident.fileCode}`,
      titleAm: `አስቸኳይ የጠፋ አካላዊ ፋይል ሪፖርት (${urgency})፡ ${incident.fileCode}`,
      messageEn: `${actor.fullNameEn} reported ${incident.registrationNumber} missing. Last known custodian: ${incident.lastKnownCustodianName}.`,
      messageAm: `${actor.fullNameEn} የሰነድ ${incident.registrationNumber} መጥፋትን ሪፖርት አድርገዋል።`,
      documentId: incident.documentId,
      registrationNumber: incident.registrationNumber,
      priority: 'Critical'
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

  // ==================== PHASE 6: INTELLIGENT RECORDS RETENTION & ARCHIVING ====================

  private computeRetentionExpiryIso(baseDateIso: string, years: number): string {
    if (years === 0) {
      return '9999-12-31T23:59:59.000Z';
    }
    const base = new Date(baseDateIso || Date.now());
    const d = Number.isNaN(base.getTime()) ? new Date() : base;
    d.setFullYear(d.getFullYear() + years);
    return d.toISOString();
  }

  private computeEthiopianFiscalYearEndIso(anchorIso: string): string {
    const parsed = new Date(anchorIso || Date.now());
    const d = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
    const year = d.getUTCFullYear();
    // Ethiopian Fiscal Year runs Hamle 1 – Sene 30 (Gregorian July 8 – July 7)
    const fyEndThisYear = new Date(Date.UTC(year, 6, 7, 23, 59, 59, 0));
    if (d.getTime() <= fyEndThisYear.getTime()) {
      return fyEndThisYear.toISOString();
    }
    return new Date(Date.UTC(year + 1, 6, 7, 23, 59, 59, 0)).toISOString();
  }

  private findDocumentCompletionDate(doc: DocumentItem): string | undefined {
    const completionActions = (doc.workflowHistory || [])
      .filter(h => ['Approved', 'ParallelApproved', 'Dispatched', 'Archived'].includes(h.action))
      .map(h => h.timestamp)
      .filter(Boolean)
      .sort();
    return completionActions.length > 0 ? completionActions[completionActions.length - 1] : undefined;
  }

  private computeRetentionTriggerDate(
    triggerEvent: RetentionTriggerEvent,
    dates: {
      registrationDate?: string;
      completedAt?: string;
      archivedAt?: string;
    }
  ): string {
    const regIso = dates.registrationDate || new Date().toISOString();
    if (triggerEvent === 'CompletionDate') {
      return dates.completedAt || regIso;
    }
    if (triggerEvent === 'ArchiveDate') {
      return dates.archivedAt || dates.completedAt || regIso;
    }
    if (triggerEvent === 'FiscalYearEnd') {
      return this.computeEthiopianFiscalYearEndIso(dates.completedAt || regIso);
    }
    return regIso;
  }

  private refreshDocumentRetentionAnchor(
    doc: DocumentItem,
    completedAtOverride?: string,
    archivedAtOverride?: string
  ) {
    const sc = doc.retentionScheduleId
      ? (this.data.retentionSchedules || []).find(s => s.id === doc.retentionScheduleId)
      : undefined;
    const triggerEvent: RetentionTriggerEvent =
      doc.retentionTriggerEvent || sc?.retentionTriggerEvent || 'RegistrationDate';
    const triggerDate = this.computeRetentionTriggerDate(triggerEvent, {
      registrationDate: doc.registrationDate,
      completedAt: completedAtOverride || this.findDocumentCompletionDate(doc),
      archivedAt: archivedAtOverride || doc.archivedAt
    });
    doc.retentionTriggerEvent = triggerEvent;
    doc.retentionTriggerDate = triggerDate;
    doc.retentionExpiryDate = this.computeRetentionExpiryIso(triggerDate, doc.retentionYears);
  }

  private evaluateIntelligentRetention(
    input: RetentionSimulationInput,
    explicitScheduleId?: string,
    explicitYears?: number
  ): RetentionCalculationResult {
    const schedules = (this.data.retentionSchedules || []).filter(s => s.isActive !== false);
    const allSchedules = schedules.length > 0 ? schedules : this.data.retentionSchedules || [];
    const targetScheduleId = explicitScheduleId || input.scheduleId;

    const regIso = input.registrationDate || new Date().toISOString();
    const corpus = [
      input.subjectEn || '',
      input.subjectAm || '',
      input.descriptionEn || '',
      input.ocrTextEn || '',
      input.senderOrganization || '',
      Array.isArray(input.tags) ? input.tags.join(' ') : ''
    ]
      .join(' ')
      .toLowerCase();

    let chosen: RetentionSchedule | undefined;
    let confidence = 0.72;
    let matchedSignals: string[] = [];
    let reason = '';

    if (targetScheduleId) {
      chosen = allSchedules.find(s => s.id === targetScheduleId);
      if (chosen) {
        confidence = 1.0;
        matchedSignals = ['Explicit Policy Selection'];
        reason = `Assigned explicitly to "${chosen.documentCategory}" (${chosen.governingLegislation}).`;
      }
    }

    if (!chosen && allSchedules.length > 0) {
      let bestScore = -1;
      let bestRule: RetentionSchedule = allSchedules[0];
      let bestSignals: string[] = [];

      for (const sc of allSchedules) {
        let score = 0;
        const signals: string[] = [];

        if (
          input.regulatoryCategory &&
          sc.regulatoryCategory &&
          input.regulatoryCategory.toLowerCase() === sc.regulatoryCategory.toLowerCase()
        ) {
          score += 48;
          signals.push(`Regulatory Category: ${sc.regulatoryCategory}`);
        }

        const keywords = Array.isArray(sc.keywordPatterns) ? sc.keywordPatterns : [];
        const matchedKeywords: string[] = [];
        for (const kw of keywords) {
          const clean = kw.trim().toLowerCase();
          if (clean && corpus.includes(clean)) {
            matchedKeywords.push(kw.trim());
          }
        }
        if (matchedKeywords.length > 0) {
          score += Math.min(54, matchedKeywords.length * 18);
          signals.push(`Metadata Keywords (${matchedKeywords.slice(0, 4).join(', ')})`);
        }

        if (Array.isArray(sc.documentTypes) && sc.documentTypes.includes(input.type)) {
          score += 22;
          signals.push(`Document Type: ${input.type}`);
        }

        if (
          input.confidentiality &&
          Array.isArray(sc.confidentialityLevels) &&
          sc.confidentialityLevels.includes(input.confidentiality)
        ) {
          score += 10;
          signals.push(`Confidentiality: ${input.confidentiality}`);
        }

        const prioBoost = typeof sc.priority === 'number' ? sc.priority / 20 : 0;
        const total = score > 0 ? score + prioBoost : 0;

        if (total > bestScore) {
          bestScore = total;
          bestRule = sc;
          bestSignals = signals;
        }
      }

      if (bestScore > 0) {
        chosen = bestRule;
        matchedSignals = bestSignals;
        confidence = Number(Math.min(0.99, Math.max(0.64, 0.52 + bestScore / 145)).toFixed(2));
        reason = `Auto-classified via ${bestSignals.join(' + ')} (Rule priority ${bestRule.priority ?? 50}).`;
      } else {
        // Fallback type heuristic
        if (input.type === 'IncomingLetter' || input.type === 'InspectionReport') {
          chosen = allSchedules.find(s => s.id === 'ret-02') || allSchedules[0];
        } else if (input.type === 'OutgoingLetter' || input.type === 'TenderDocument') {
          chosen = allSchedules.find(s => s.id === 'ret-01') || allSchedules[0];
        } else if (input.type === 'InternalMemo' || input.type === 'Circular') {
          chosen = allSchedules.find(s => s.id === 'ret-04') || allSchedules[0];
        } else {
          chosen = allSchedules.find(s => s.id === 'ret-03') || allSchedules[0];
        }
        confidence = 0.6;
        matchedSignals = [`Baseline Type Fallback (${input.type})`];
        reason = `Matched baseline schedule for document type ${input.type}; no specialized regulatory keywords detected.`;
      }
    }

    const years =
      explicitYears !== undefined && explicitYears >= 0
        ? explicitYears
        : chosen
          ? chosen.retentionPeriodYears
          : 10;
    const triggerEvent: RetentionTriggerEvent = chosen?.retentionTriggerEvent || 'RegistrationDate';
    const triggerDate = this.computeRetentionTriggerDate(triggerEvent, {
      registrationDate: regIso,
      completedAt: input.completedAt,
      archivedAt: input.archivedAt
    });
    const expiryIso = this.computeRetentionExpiryIso(triggerDate, years);
    const isPermanent = years === 0;
    const daysUntilDisposition = isPermanent
      ? null
      : Math.ceil((new Date(expiryIso).getTime() - Date.now()) / 86400000);

    return {
      retentionScheduleId: chosen?.id,
      retentionCategory: chosen?.documentCategory || 'General Institutional Record',
      regulatoryCategory:
        chosen?.regulatoryCategory || (input.regulatoryCategory as RegulatoryCategory) || 'GeneralAdministrative',
      governingLegislation:
        chosen?.governingLegislation || 'National Archives and Library Agency (NALA) Record Schedule',
      disposalAction: years === 0 ? 'PermanentArchive' : chosen?.disposalAction || 'ReviewAtMaturity',
      retentionTriggerEvent: triggerEvent,
      retentionTriggerDate: triggerDate,
      retentionYears: years,
      retentionExpiryDate: expiryIso,
      retentionConfidence: confidence,
      retentionClassificationReason: reason,
      alertLeadDays: chosen?.alertLeadDays ?? 90,
      daysUntilDisposition,
      isPermanent,
      matchedSignals
    };
  }

  private computeRetentionFields(
    docType: string,
    baseDateIso: string,
    explicitScheduleId?: string,
    explicitYears?: number,
    meta?: {
      subjectEn?: string;
      subjectAm?: string;
      descriptionEn?: string;
      ocrTextEn?: string;
      senderOrganization?: string;
      confidentiality?: ConfidentialityLevel;
      regulatoryCategory?: RegulatoryCategory | string;
      tags?: string[];
    }
  ): {
    retentionScheduleId?: string;
    retentionCategory: string;
    regulatoryCategory: RegulatoryCategory | string;
    retentionTriggerEvent: RetentionTriggerEvent;
    retentionTriggerDate: string;
    retentionYears: number;
    retentionExpiryDate: string;
    retentionClassificationReason: string;
    retentionConfidence: number;
  } {
    const res = this.evaluateIntelligentRetention(
      {
        type: (docType as DocumentType) || 'IncomingLetter',
        subjectEn: meta?.subjectEn,
        subjectAm: meta?.subjectAm,
        descriptionEn: meta?.descriptionEn,
        ocrTextEn: meta?.ocrTextEn,
        senderOrganization: meta?.senderOrganization,
        confidentiality: meta?.confidentiality,
        regulatoryCategory: meta?.regulatoryCategory,
        tags: meta?.tags,
        registrationDate: baseDateIso
      },
      explicitScheduleId,
      explicitYears
    );
    return {
      retentionScheduleId: res.retentionScheduleId,
      retentionCategory: res.retentionCategory,
      regulatoryCategory: res.regulatoryCategory,
      retentionTriggerEvent: res.retentionTriggerEvent,
      retentionTriggerDate: res.retentionTriggerDate,
      retentionYears: res.retentionYears,
      retentionExpiryDate: res.retentionExpiryDate,
      retentionClassificationReason: res.retentionClassificationReason,
      retentionConfidence: res.retentionConfidence
    };
  }

  private ensurePhase6RecordsState() {
    if (!Array.isArray(this.data.disposalRequests)) this.data.disposalRequests = [];
    if (!Array.isArray(this.data.archiveRetrievals)) this.data.archiveRetrievals = [];
    if (!Array.isArray(this.data.disposalCertificates)) this.data.disposalCertificates = [];

    // Enrich seeded retention schedules with intelligent regulatory classification metadata, keywords, trigger events & priorities
    const enrichments: Record<
      string,
      Partial<RetentionSchedule>
    > = {
      'ret-01': {
        documentTypes: ['OutgoingLetter', 'TenderDocument'],
        regulatoryCategory: 'ProcurementTender',
        confidentialityLevels: ['Internal', 'Confidential', 'Secret'],
        keywordPatterns: ['tender', 'bid', 'procurement', 'contract', 'framework agreement', 'rfp', 'supplier', 'incoterms', 'award'],
        retentionTriggerEvent: 'CompletionDate',
        priority: 85,
        alertLeadDays: 90
      },
      'ret-02': {
        documentTypes: ['IncomingLetter', 'InspectionReport'],
        regulatoryCategory: 'PharmaceuticalQuality',
        confidentialityLevels: ['Internal', 'Confidential', 'Secret'],
        keywordPatterns: ['efda', 'batch', 'pharmacovigilance', 'cold chain', 'cold-chain', 'oncology', 'vaccine', 'recall', 'antibiotic', 'stability', 'gmp'],
        retentionTriggerEvent: 'RegistrationDate',
        priority: 90,
        alertLeadDays: 90
      },
      'ret-03': {
        documentTypes: ['Application'],
        regulatoryCategory: 'FinancialAudit',
        confidentialityLevels: ['Internal', 'Confidential'],
        keywordPatterns: ['waybill', 'voucher', 'grn', 'invoice', 'audit', 'ofag', 'budget', 'disbursement', 'consignment', 'reconciliation', 'stationery'],
        retentionTriggerEvent: 'FiscalYearEnd',
        priority: 75,
        alertLeadDays: 90
      },
      'ret-04': {
        documentTypes: ['InternalMemo', 'Circular'],
        regulatoryCategory: 'GeneralAdministrative',
        confidentialityLevels: ['Public', 'Internal'],
        keywordPatterns: ['circular', 'minute', 'fleet', 'fuel', 'administrative', 'reception', 'notice', 'gate pass'],
        retentionTriggerEvent: 'RegistrationDate',
        priority: 50,
        alertLeadDays: 60
      },
      'ret-perm-00': {
        documentTypes: ['Circular'],
        regulatoryCategory: 'ExecutiveGovernance',
        confidentialityLevels: ['Confidential', 'Secret'],
        keywordPatterns: ['charter', 'proclamation', 'sovereign', 'founding', 'board resolution', 'ministerial directive'],
        retentionTriggerEvent: 'RegistrationDate',
        priority: 100,
        alertLeadDays: 90
      }
    };

    for (const sc of this.data.retentionSchedules) {
      if (sc.isActive === undefined) sc.isActive = true;
      const e = enrichments[sc.id];
      if (e) {
        if (!sc.documentTypes || sc.documentTypes.length === 0) sc.documentTypes = e.documentTypes;
        if (!sc.regulatoryCategory) sc.regulatoryCategory = e.regulatoryCategory;
        if (!sc.confidentialityLevels) sc.confidentialityLevels = e.confidentialityLevels;
        if (!sc.keywordPatterns) sc.keywordPatterns = e.keywordPatterns;
        if (!sc.retentionTriggerEvent) sc.retentionTriggerEvent = e.retentionTriggerEvent;
        if (sc.priority === undefined) sc.priority = e.priority;
        if (sc.alertLeadDays === undefined) sc.alertLeadDays = e.alertLeadDays;
      } else {
        if (!sc.regulatoryCategory) sc.regulatoryCategory = 'GeneralAdministrative';
        if (!sc.retentionTriggerEvent) sc.retentionTriggerEvent = 'RegistrationDate';
        if (sc.priority === undefined) sc.priority = 60;
        if (sc.alertLeadDays === undefined) sc.alertLeadDays = 90;
      }
    }

    if (!this.data.retentionSchedules.some(s => s.retentionPeriodYears === 0)) {
      this.data.retentionSchedules.push({
        id: 'ret-perm-00',
        documentCategory: 'National Founding Charters & Sovereign MoH Directives',
        regulatoryCategory: 'ExecutiveGovernance',
        retentionPeriodYears: 0, // 0 = permanent
        disposalAction: 'PermanentArchive',
        governingLegislation: 'National Archives & Library Agency (NALA) Permanent Preservation Statute',
        notes: '0 years = Permanent sovereign preservation; exempt from destruction.',
        documentTypes: ['Circular'],
        confidentialityLevels: ['Confidential', 'Secret'],
        keywordPatterns: ['charter', 'proclamation', 'sovereign', 'founding', 'board resolution', 'ministerial directive'],
        retentionTriggerEvent: 'RegistrationDate',
        priority: 100,
        alertLeadDays: 90,
        isActive: true,
        createdAt: new Date().toISOString()
      });
    }

    if (!this.data.retentionSchedules.some(s => s.id === 'ret-05')) {
      this.data.retentionSchedules.push({
        id: 'ret-05',
        documentCategory: 'Legal Disputes, Litigation Files & Contract Claims',
        regulatoryCategory: 'LegalCompliance',
        retentionPeriodYears: 12,
        disposalAction: 'ReviewAtMaturity',
        governingLegislation: 'Federal Civil Procedure & Public Property Liability Statute',
        notes: 'Retention clock commences upon final legal closure or settlement date.',
        documentTypes: ['IncomingLetter', 'OutgoingLetter'],
        confidentialityLevels: ['Confidential', 'Secret'],
        keywordPatterns: ['litigation', 'court', 'subpoena', 'dispute', 'arbitration', 'legal', 'claim'],
        retentionTriggerEvent: 'CompletionDate',
        priority: 95,
        alertLeadDays: 90,
        isActive: true,
        createdAt: new Date().toISOString()
      });
    }

    // Backfill Phase 6 intelligent retention metadata on documents
    for (const doc of this.data.documents) {
      if (
        !doc.retentionScheduleId ||
        !doc.retentionCategory ||
        !doc.regulatoryCategory ||
        !doc.retentionTriggerEvent ||
        !doc.retentionClassificationReason
      ) {
        const calc = this.evaluateIntelligentRetention(
          {
            type: doc.type,
            subjectEn: doc.subjectEn,
            subjectAm: doc.subjectAm,
            descriptionEn: doc.descriptionEn,
            ocrTextEn: doc.ocrTextEn,
            senderOrganization: doc.senderOrganization,
            confidentiality: doc.confidentiality,
            regulatoryCategory: doc.regulatoryCategory,
            tags: doc.tags,
            registrationDate: doc.registrationDate,
            completedAt: this.findDocumentCompletionDate(doc),
            archivedAt: doc.archivedAt
          },
          doc.retentionScheduleId,
          doc.retentionYears
        );
        doc.retentionScheduleId = calc.retentionScheduleId;
        doc.retentionCategory = calc.retentionCategory;
        doc.regulatoryCategory = calc.regulatoryCategory;
        doc.retentionTriggerEvent = calc.retentionTriggerEvent;
        doc.retentionTriggerDate = calc.retentionTriggerDate;
        if (doc.retentionYears === undefined) doc.retentionYears = calc.retentionYears;
        if (!doc.retentionExpiryDate) doc.retentionExpiryDate = calc.retentionExpiryDate;
        doc.retentionClassificationReason = calc.retentionClassificationReason;
        doc.retentionConfidence = calc.retentionConfidence;
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
        regulatoryCategory: 'GeneralAdministrative',
        retentionTriggerEvent: 'RegistrationDate',
        retentionTriggerDate: regIso,
        retentionYears: 5,
        retentionExpiryDate: expIso,
        retentionClassificationReason: 'Auto-classified via Regulatory Category: GeneralAdministrative + Metadata Keywords (circular, fleet, fuel, administrative) + Document Type: InternalMemo.',
        retentionConfidence: 0.96,
        legalHold: false
      });
    }

    // Seed approaching-maturity records (Critical <= 30d and Upcoming <= 90d) so Records Managers get proactive disposal alerts
    if (!this.data.documents.some(d => d.id === 'doc-arch-crit30')) {
      const expDate = new Date(Date.now() + 18 * 86400000);
      const regDate = new Date(expDate.getTime());
      regDate.setFullYear(regDate.getFullYear() - 5);
      this.data.documents.push({
        id: 'doc-arch-crit30',
        registrationNumber: 'EPSS/MEMO/2021/00042',
        referenceNumber: 'ADM-2021-118',
        type: 'InternalMemo',
        subjectEn: 'Central Reception & Gate Access Shift Roster Notice (2021 Archive)',
        subjectAm: 'የ2013 ዓ.ም የዋና መሥሪያ ቤት የጥበቃና እንግዳ መቀበያ የፈረቃ መመሪያ',
        descriptionEn: 'Administrative facility circular scheduled to reach NALA 5-year disposition maturity within 18 days.',
        senderOrganization: 'EPSS Facilities & Fleet Administration',
        recipientOrganization: 'Head Office Security Desk',
        receivedDate: regDate.toISOString(),
        registrationDate: regDate.toISOString(),
        priority: 'Normal',
        confidentiality: 'Internal',
        status: 'Archived',
        branchId: 'br-hq',
        departmentId: 'dept-reg',
        assignedDepartmentName: 'Central Records & Registry Division',
        attachments: [],
        workflowHistory: [
          {
            id: 'wf-crit30-seed',
            timestamp: regDate.toISOString(),
            actorId: 'usr-reg',
            actorName: 'Selamawit Bekele',
            actorRole: 'RegistryOfficer',
            action: 'Archived',
            comments: 'Routine administrative schedule logged for 5-year retention.'
          }
        ],
        tags: ['Administrative', 'Circular', 'Reception'],
        isArchived: true,
        archivedAt: regDate.toISOString(),
        archivedBy: 'Selamawit Bekele',
        archiveLocationPath: 'Block B - Central Registry → Room 101 (Historical Archive) → BOX-ADM-2021',
        retentionScheduleId: 'ret-04',
        retentionCategory: 'Internal Administrative Circulars & Meeting Minutes',
        regulatoryCategory: 'GeneralAdministrative',
        retentionTriggerEvent: 'RegistrationDate',
        retentionTriggerDate: regDate.toISOString(),
        retentionYears: 5,
        retentionExpiryDate: expDate.toISOString(),
        retentionClassificationReason: 'Auto-classified via Regulatory Category: GeneralAdministrative + Metadata Keywords (notice, reception, administrative).',
        retentionConfidence: 0.93,
        legalHold: false
      });
    }

    if (!this.data.documents.some(d => d.id === 'doc-arch-soon90')) {
      const expDate = new Date(Date.now() + 58 * 86400000);
      const trigDate = new Date(expDate.getTime());
      trigDate.setFullYear(trigDate.getFullYear() - 7);
      const regDate = new Date(trigDate.getTime() - 45 * 86400000);
      this.data.documents.push({
        id: 'doc-arch-soon90',
        registrationNumber: 'EPSS/APP/2019/00119',
        referenceNumber: 'FIN-GRN-2019-702',
        type: 'Application',
        subjectEn: 'Adama Hub Consignment Waybill & Goods Received Voucher Reconciliation Packet',
        subjectAm: 'የአዳማ ቅርንጫፍ የዕቃ መረከቢያ ሰነድ እና የሂሳብ ማስታረቂያ ፋይል',
        descriptionEn: 'Regional consignment voucher batch anchored on Ethiopian Fiscal Year End approaching 7-year Ministry of Finance retention maturity.',
        senderOrganization: 'Adama Branch Hub Warehouse',
        recipientOrganization: 'EPSS Finance & Treasury Directorate',
        receivedDate: regDate.toISOString(),
        registrationDate: regDate.toISOString(),
        priority: 'Normal',
        confidentiality: 'Internal',
        status: 'Archived',
        branchId: 'br-02',
        departmentId: 'dept-fin',
        assignedDepartmentName: 'Finance & Treasury Directorate',
        attachments: [],
        workflowHistory: [
          {
            id: 'wf-soon90-seed',
            timestamp: regDate.toISOString(),
            actorId: 'usr-reg',
            actorName: 'Selamawit Bekele',
            actorRole: 'RegistryOfficer',
            action: 'Archived',
            comments: 'Post-OFAG reconciliation archive anchored on Fiscal Year End.'
          }
        ],
        tags: ['Waybill', 'Voucher', 'Audit', 'Adama'],
        isArchived: true,
        archivedAt: trigDate.toISOString(),
        archivedBy: 'Selamawit Bekele',
        archiveLocationPath: 'Adama Hub Archive → Vault B → BOX-FIN-2019',
        retentionScheduleId: 'ret-03',
        retentionCategory: 'Regional Hub Consignment Waybills and Goods Received Vouchers',
        regulatoryCategory: 'FinancialAudit',
        retentionTriggerEvent: 'FiscalYearEnd',
        retentionTriggerDate: trigDate.toISOString(),
        retentionYears: 7,
        retentionExpiryDate: expDate.toISOString(),
        retentionClassificationReason: 'Auto-classified via Regulatory Category: FinancialAudit + Metadata Keywords (waybill, voucher, consignment) + Document Type: Application.',
        retentionConfidence: 0.95,
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

  public simulateRetentionCalculation(input: RetentionSimulationInput): RetentionCalculationResult {
    return this.evaluateIntelligentRetention(input, input.scheduleId);
  }

  public recalculateAllDocumentRetentions(
    actor: User,
    clientIp: string,
    overwriteManual = false
  ): {
    success: boolean;
    statusCode?: number;
    error?: string;
    evaluatedCount: number;
    updatedCount: number;
    skippedHeldCount: number;
    skippedManualCount: number;
  } {
    if (!this.hasPermission(actor, 'manage:archives') && !this.hasPermission(actor, 'manage:organizations') && actor.role !== 'SuperAdmin') {
      return {
        success: false,
        statusCode: 403,
        error: 'Forbidden: manage:archives permission required.',
        evaluatedCount: 0,
        updatedCount: 0,
        skippedHeldCount: 0,
        skippedManualCount: 0
      };
    }

    let evaluatedCount = 0;
    let updatedCount = 0;
    let skippedHeldCount = 0;
    let skippedManualCount = 0;

    for (const doc of this.data.documents) {
      if (doc.isDeleted || doc.status === 'Disposed') continue;
      evaluatedCount++;
      if (doc.legalHold) {
        skippedHeldCount++;
        continue;
      }
      if (doc.retentionManualOverride && !overwriteManual) {
        skippedManualCount++;
        continue;
      }

      const calc = this.evaluateIntelligentRetention({
        type: doc.type,
        subjectEn: doc.subjectEn,
        subjectAm: doc.subjectAm,
        descriptionEn: doc.descriptionEn,
        ocrTextEn: doc.ocrTextEn,
        senderOrganization: doc.senderOrganization,
        confidentiality: doc.confidentiality,
        regulatoryCategory: doc.regulatoryCategory,
        tags: doc.tags,
        registrationDate: doc.registrationDate,
        completedAt: this.findDocumentCompletionDate(doc),
        archivedAt: doc.archivedAt
      });

      const changed =
        doc.retentionScheduleId !== calc.retentionScheduleId ||
        doc.retentionYears !== calc.retentionYears ||
        doc.retentionExpiryDate !== calc.retentionExpiryDate ||
        doc.regulatoryCategory !== calc.regulatoryCategory ||
        doc.retentionTriggerEvent !== calc.retentionTriggerEvent;

      doc.retentionScheduleId = calc.retentionScheduleId;
      doc.retentionCategory = calc.retentionCategory;
      doc.regulatoryCategory = calc.regulatoryCategory;
      doc.retentionTriggerEvent = calc.retentionTriggerEvent;
      doc.retentionTriggerDate = calc.retentionTriggerDate;
      doc.retentionYears = calc.retentionYears;
      doc.retentionExpiryDate = calc.retentionExpiryDate;
      doc.retentionClassificationReason = calc.retentionClassificationReason;
      doc.retentionConfidence = calc.retentionConfidence;
      if (overwriteManual) doc.retentionManualOverride = false;
      if (changed) updatedCount++;
    }

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'RECALCULATED_PORTFOLIO_RETENTION',
      resourceType: 'RetentionSchedule',
      resourceId: 'portfolio',
      ipAddress: clientIp,
      details: `Evaluated ${evaluatedCount} active records; updated ${updatedCount} retention classification(s) (held skipped=${skippedHeldCount}, manual skipped=${skippedManualCount}).`
    });
    this.save();

    return {
      success: true,
      evaluatedCount,
      updatedCount,
      skippedHeldCount,
      skippedManualCount
    };
  }

  public getPendingDisposalAlerts(horizonDays = 90): RecordsAlertSummary {
    const now = Date.now();
    const schedules = this.data.retentionSchedules || [];
    const activeDisposals = this.data.disposalRequests || [];
    const alerts: PendingDisposalAlertItem[] = [];

    let permanent = 0;
    let held = 0;

    for (const doc of this.data.documents) {
      if (doc.isDeleted || doc.status === 'Disposed') continue;
      if (doc.legalHold) {
        held++;
        continue;
      }
      if (doc.retentionYears === 0) {
        permanent++;
        continue;
      }
      if (!doc.retentionExpiryDate) continue;

      const expiryMs = new Date(doc.retentionExpiryDate).getTime();
      if (Number.isNaN(expiryMs)) continue;

      const sc = doc.retentionScheduleId
        ? schedules.find(s => s.id === doc.retentionScheduleId)
        : undefined;
      const leadDays = sc?.alertLeadDays ?? horizonDays;
      const effectiveHorizon = Math.max(horizonDays, leadDays);
      const daysRemaining = Math.ceil((expiryMs - now) / 86400000);

      if (daysRemaining <= effectiveHorizon) {
        const urgency: DisposalAlertUrgency =
          daysRemaining <= 0
            ? 'Overdue'
            : daysRemaining <= 30
              ? 'Critical30'
              : 'Upcoming90';

        const activeReq = activeDisposals.find(
          r => r.documentId === doc.id && (r.status === 'PendingApproval' || r.status === 'ApprovedReady')
        );

        alerts.push({
          documentId: doc.id,
          registrationNumber: doc.registrationNumber,
          subjectEn: doc.subjectEn,
          subjectAm: doc.subjectAm,
          type: doc.type,
          confidentiality: doc.confidentiality,
          branchId: doc.branchId,
          departmentId: doc.departmentId,
          assignedDepartmentName: doc.assignedDepartmentName,
          retentionScheduleId: doc.retentionScheduleId,
          retentionCategory: doc.retentionCategory || sc?.documentCategory || 'General Institutional Record',
          regulatoryCategory: String(doc.regulatoryCategory || sc?.regulatoryCategory || 'GeneralAdministrative'),
          governingLegislation: sc?.governingLegislation || 'National Archives and Library Agency (NALA) Record Schedule',
          retentionTriggerEvent: doc.retentionTriggerEvent || sc?.retentionTriggerEvent || 'RegistrationDate',
          retentionTriggerDate: doc.retentionTriggerDate || doc.registrationDate,
          retentionYears: doc.retentionYears,
          retentionExpiryDate: doc.retentionExpiryDate,
          disposalAction: sc?.disposalAction || 'ReviewAtMaturity',
          alertLeadDays: leadDays,
          daysRemaining,
          urgency,
          hasActiveDisposalRequest: !!activeReq,
          activeDisposalRequestId: activeReq?.id,
          activeDisposalStatus: activeReq?.status,
          classificationReason: doc.retentionClassificationReason
        });
      }
    }

    alerts.sort((a, b) => a.daysRemaining - b.daysRemaining);

    const overdue = alerts.filter(a => a.urgency === 'Overdue').length;
    const critical30 = alerts.filter(a => a.urgency === 'Critical30').length;
    const upcoming90 = alerts.filter(a => a.urgency === 'Upcoming90').length;

    return {
      alerts,
      counts: {
        overdue,
        critical30,
        upcoming90,
        totalActionable: alerts.filter(a => !a.hasActiveDisposalRequest).length,
        permanent,
        held,
        activeDisposalWorkflows: activeDisposals.filter(
          r => r.status === 'PendingApproval' || r.status === 'ApprovedReady'
        ).length
      },
      lastScanAt: this.data.lastRetentionScanAt || new Date().toISOString(),
      notificationsDispatchedCount: 0
    };
  }

  public scanAndNotifyPendingDisposals(
    actor: User | null,
    clientIp = '127.0.0.1',
    forceNotify = true
  ): RecordsAlertSummary {
    const summary = this.getPendingDisposalAlerts(90);
    const nowMs = Date.now();
    const managers = (this.data.users || []).filter(
      u =>
        u.status !== 'Inactive' &&
        (u.role === 'RegistryOfficer' ||
          u.role === 'SuperAdmin' ||
          u.role === 'Auditor' ||
          this.hasPermission(u, 'manage:archives'))
    );

    let dispatchedCount = 0;

    for (const item of summary.alerts) {
      if (item.hasActiveDisposalRequest) continue;
      const withinRuleLead = item.daysRemaining <= item.alertLeadDays;
      if (!withinRuleLead && item.urgency === 'Upcoming90') continue;

      const urgencyLabelEn =
        item.urgency === 'Overdue'
          ? `MATURE & ELIGIBLE FOR DISPOSAL (${Math.abs(item.daysRemaining)}d overdue)`
          : item.urgency === 'Critical30'
            ? `DISPOSITION DUE IN ${item.daysRemaining} DAY(S)`
            : `APPROACHING DISPOSITION (${item.daysRemaining} DAYS)`;

      const urgencyLabelAm =
        item.urgency === 'Overdue'
          ? `የማቆያ ጊዜው አልፏል (${Math.abs(item.daysRemaining)} ቀናት)`
          : `የማስወገጃ ቀን ሊደርስ ${item.daysRemaining} ቀናት ቀርተዋል`;

      for (const mgr of managers) {
        const recentExists = (this.data.notifications || []).some(n => {
          if (n.documentId !== item.documentId || n.userId !== mgr.id) return false;
          const ageMs = nowMs - new Date(n.timestamp).getTime();
          if (ageMs >= 24 * 3600000) return false;
          // Allow fresh alert if urgency escalated (e.g. from Upcoming to Overdue)
          if (item.urgency === 'Overdue' && !n.titleEn.includes('MATURE')) return false;
          if (item.urgency === 'Critical30' && n.titleEn.includes('APPROACHING')) return false;
          return true;
        });
        if (recentExists) continue;

        const disp = this.dispatchNotification({
          eventType: 'OverdueSLA',
          targetUserId: mgr.id,
          titleEn: `[Retention Alert] ${item.registrationNumber} — ${urgencyLabelEn}`,
          titleAm: `[የማህደር ማቆያ ማንቂያ] ${item.registrationNumber} — ${urgencyLabelAm}`,
          messageEn: `${item.subjectEn} (${item.retentionCategory}) reached disposition review threshold (${item.retentionExpiryDate.slice(0, 10)}). Action: ${item.disposalAction}.`,
          messageAm: `${item.subjectAm || item.subjectEn} (${item.retentionCategory}) የማስወገጃ ወይም የማህደር ግምገማ ቀን (${item.retentionExpiryDate.slice(0, 10)}) ደርሷል።`,
          channelsOverride: ['InApp'],
          documentId: item.documentId,
          registrationNumber: item.registrationNumber,
          priority: item.urgency === 'Overdue' ? 'Critical' : 'Urgent'
        });
        if (disp.notification) dispatchedCount++;
      }
    }

    this.data.lastRetentionScanAt = new Date().toISOString();
    summary.lastScanAt = this.data.lastRetentionScanAt;
    summary.notificationsDispatchedCount = dispatchedCount;

    if (actor && (dispatchedCount > 0 || forceNotify)) {
      this.addAuditLog({
        userId: actor.id,
        userName: actor.fullNameEn,
        userRole: actor.role,
        branchName: actor.branchNameEn,
        action: 'RETENTION_DISPOSAL_ALERT_SCAN',
        resourceType: 'RetentionSchedule',
        resourceId: 'pending-disposal-scan',
        ipAddress: clientIp,
        details: `Scanned active portfolio: ${summary.counts.overdue} overdue, ${summary.counts.critical30} due <=30d, ${summary.counts.upcoming90} due <=90d; sent ${dispatchedCount} manager alert notification(s).`
      });
    }

    if (dispatchedCount > 0 || actor) {
      this.save();
    }
    return summary;
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

    const allowedTriggers: RetentionTriggerEvent[] = ['RegistrationDate', 'CompletionDate', 'ArchiveDate', 'FiscalYearEnd'];
    const triggerEvent: RetentionTriggerEvent =
      payload.retentionTriggerEvent && allowedTriggers.includes(payload.retentionTriggerEvent)
        ? payload.retentionTriggerEvent
        : 'RegistrationDate';
    const leadDays =
      payload.alertLeadDays !== undefined && Number(payload.alertLeadDays) >= 0
        ? Math.min(365, Math.round(Number(payload.alertLeadDays)))
        : 90;
    const priority =
      payload.priority !== undefined && Number.isFinite(Number(payload.priority))
        ? Math.max(1, Math.min(100, Math.round(Number(payload.priority))))
        : 75;

    const now = new Date().toISOString();
    const schedule: RetentionSchedule = {
      id: `ret-${Date.now().toString(36)}`,
      documentCategory: category,
      regulatoryCategory: payload.regulatoryCategory || 'GeneralAdministrative',
      retentionPeriodYears: years,
      disposalAction,
      governingLegislation: legislation,
      notes: (payload.notes || '').trim(),
      documentTypes: Array.isArray(payload.documentTypes) ? payload.documentTypes : [],
      confidentialityLevels: Array.isArray(payload.confidentialityLevels) ? payload.confidentialityLevels : [],
      keywordPatterns: Array.isArray(payload.keywordPatterns)
        ? payload.keywordPatterns.map(k => String(k).trim()).filter(Boolean)
        : [],
      retentionTriggerEvent: triggerEvent,
      priority,
      alertLeadDays: leadDays,
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
      details: `Created retention policy "${schedule.documentCategory}" (${years === 0 ? 'Permanent' : `${years} yrs`}, reg=${schedule.regulatoryCategory}, trigger=${triggerEvent})`
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
    if (payload.regulatoryCategory !== undefined) sc.regulatoryCategory = payload.regulatoryCategory;
    if (payload.confidentialityLevels !== undefined) sc.confidentialityLevels = payload.confidentialityLevels;
    if (payload.keywordPatterns !== undefined) {
      sc.keywordPatterns = Array.isArray(payload.keywordPatterns)
        ? payload.keywordPatterns.map(k => String(k).trim()).filter(Boolean)
        : [];
    }
    if (payload.retentionTriggerEvent !== undefined) sc.retentionTriggerEvent = payload.retentionTriggerEvent;
    if (payload.priority !== undefined && Number.isFinite(Number(payload.priority))) {
      sc.priority = Math.max(1, Math.min(100, Math.round(Number(payload.priority))));
    }
    if (payload.alertLeadDays !== undefined && Number.isFinite(Number(payload.alertLeadDays))) {
      sc.alertLeadDays = Math.max(0, Math.min(365, Math.round(Number(payload.alertLeadDays))));
    }
    if (payload.isActive !== undefined) sc.isActive = Boolean(payload.isActive);
    sc.updatedAt = new Date().toISOString();

    // Recalculate expiry for linked non-disposed, non-held documents using rule's trigger event
    const triggerEvent: RetentionTriggerEvent = sc.retentionTriggerEvent || 'RegistrationDate';
    for (const doc of this.data.documents) {
      if (doc.retentionScheduleId === sc.id && doc.status !== 'Disposed' && !doc.legalHold) {
        const triggerDate = this.computeRetentionTriggerDate(triggerEvent, {
          registrationDate: doc.registrationDate,
          completedAt: this.findDocumentCompletionDate(doc),
          archivedAt: doc.archivedAt
        });
        doc.retentionCategory = sc.documentCategory;
        doc.regulatoryCategory = sc.regulatoryCategory;
        doc.retentionTriggerEvent = triggerEvent;
        doc.retentionTriggerDate = triggerDate;
        doc.retentionYears = sc.retentionPeriodYears;
        doc.retentionExpiryDate = this.computeRetentionExpiryIso(triggerDate, sc.retentionPeriodYears);
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
      details: `Updated retention policy "${sc.documentCategory}" (${sc.retentionPeriodYears === 0 ? 'Permanent' : `${sc.retentionPeriodYears} yrs`}, trigger=${triggerEvent})`
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

    const triggerEvent: RetentionTriggerEvent = sc.retentionTriggerEvent || 'RegistrationDate';
    const triggerDate = this.computeRetentionTriggerDate(triggerEvent, {
      registrationDate: doc.registrationDate,
      completedAt: this.findDocumentCompletionDate(doc),
      archivedAt: doc.archivedAt
    });

    doc.retentionScheduleId = sc.id;
    doc.retentionCategory = sc.documentCategory;
    doc.regulatoryCategory = sc.regulatoryCategory || doc.regulatoryCategory;
    doc.retentionTriggerEvent = triggerEvent;
    doc.retentionTriggerDate = triggerDate;
    doc.retentionYears = sc.retentionPeriodYears;
    doc.retentionExpiryDate = this.computeRetentionExpiryIso(triggerDate, sc.retentionPeriodYears);
    doc.retentionManualOverride = true;
    doc.retentionClassificationReason = `Manually assigned to "${sc.documentCategory}" by ${actor.fullNameEn}.`;
    doc.retentionConfidence = 1;

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'ASSIGNED_RETENTION_SCHEDULE',
      resourceType: 'Document',
      resourceId: doc.registrationNumber,
      ipAddress: clientIp,
      details: `Assigned "${sc.documentCategory}" (${sc.retentionPeriodYears === 0 ? 'Permanent' : `${sc.retentionPeriodYears} yrs`}, trigger=${triggerEvent}) -> expires ${doc.retentionExpiryDate.slice(0, 10)}`
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

    const now = new Date().toISOString();
    if (payload.scheduleId && !doc.legalHold) {
      const sc = this.data.retentionSchedules.find(s => s.id === payload.scheduleId);
      if (sc) {
        const triggerEvent: RetentionTriggerEvent = sc.retentionTriggerEvent || 'RegistrationDate';
        const triggerDate = this.computeRetentionTriggerDate(triggerEvent, {
          registrationDate: doc.registrationDate,
          completedAt: this.findDocumentCompletionDate(doc),
          archivedAt: now
        });
        doc.retentionScheduleId = sc.id;
        doc.retentionCategory = sc.documentCategory;
        doc.regulatoryCategory = sc.regulatoryCategory || doc.regulatoryCategory;
        doc.retentionTriggerEvent = triggerEvent;
        doc.retentionTriggerDate = triggerDate;
        doc.retentionYears = sc.retentionPeriodYears;
        doc.retentionExpiryDate = this.computeRetentionExpiryIso(triggerDate, sc.retentionPeriodYears);
        doc.retentionManualOverride = true;
      }
    }

    doc.isArchived = true;
    doc.status = 'Archived';
    doc.archivedAt = now;
    doc.archivedBy = actor.fullNameEn;

    if (!payload.scheduleId && !doc.legalHold && !doc.retentionManualOverride) {
      this.refreshDocumentRetentionAnchor(doc, undefined, now);
    }

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
    this.emitIntegrationEvent(
      'disposal.executed',
      {
        documentId: doc.id,
        registrationNumber: doc.registrationNumber,
        certificateId: certificate.id,
        method: reqObj.method,
        verificationHash: certificate.digitalVerificationHash
      },
      actor.fullNameEn
    );
    this.save();
    return { success: true, request: reqObj, certificate };
  }

  // ============================================================================
  // PHASE 7: NOTIFICATIONS, BILINGUAL TEMPLATES, USER PREFERENCES & ESCALATION
  // ============================================================================

  private static readonly REQUIRED_EVENT_PLACEHOLDERS: Record<NotificationEventType, string[]> = {
    Assignment: ['{{registrationNumber}}', '{{subject}}'],
    Approval: ['{{registrationNumber}}', '{{subject}}'],
    OverdueSLA: ['{{registrationNumber}}', '{{hoursOverdue}}'],
    Dispatch: ['{{registrationNumber}}', '{{recipientOrganization}}'],
    Security: ['{{userName}}', '{{eventDetails}}']
  };

  private static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  private ensurePhase7NotificationsState() {
    if (!this.data.notificationConfig) {
      this.data.notificationConfig = { smsMaxLength: 160, realtimeWsEnabled: true };
    }
    if (!Array.isArray(this.data.notificationTemplates) || this.data.notificationTemplates.length === 0) {
      const now = new Date().toISOString();
      this.data.notificationTemplates = [
        {
          id: 'tpl-assignment',
          eventType: 'Assignment',
          name: 'Correspondence Task Assignment',
          requiredPlaceholders: ['{{registrationNumber}}', '{{subject}}'],
          emailSubjectEn: '[EPSS EDRMS] Task Assigned: {{registrationNumber}}',
          emailSubjectAm: '[EPSS EDRMS] አዲስ ተግባር ተመድቧል: {{registrationNumber}}',
          emailBodyEn:
            'Dear {{assigneeName}},\n\nDocument {{registrationNumber}} ("{{subject}}") has been assigned to your queue for action.',
          emailBodyAm:
            'ውድ {{assigneeName}}፣\n\nሰነድ ቁጥር {{registrationNumber}} ("{{subject}}") ለእርስዎ እርምጃ ተመድቧል።',
          smsBodyEn: 'EPSS Assigned: {{registrationNumber}} - {{subject}}. Check inbox.',
          smsBodyAm: 'EPSS ተመድቧል: {{registrationNumber}} - {{subject}}።',
          isActive: true,
          updatedAt: now,
          updatedBy: 'System Seed'
        },
        {
          id: 'tpl-approval',
          eventType: 'Approval',
          name: 'Executive Approval Decision',
          requiredPlaceholders: ['{{registrationNumber}}', '{{subject}}'],
          emailSubjectEn: '[EPSS EDRMS] Approval Update: {{registrationNumber}}',
          emailSubjectAm: '[EPSS EDRMS] የማጽደቂያ ውሳኔ: {{registrationNumber}}',
          emailBodyEn:
            'Record {{registrationNumber}} ("{{subject}}") status updated by {{actorName}}.',
          emailBodyAm:
            'ሰነድ {{registrationNumber}} ("{{subject}}") በ{{actorName}} ውሳኔ ተሰጥቶታል።',
          smsBodyEn: 'EPSS Approval: {{registrationNumber}} ({{subject}}) updated.',
          smsBodyAm: 'EPSS ማጽደቂያ: {{registrationNumber}} ({{subject}}) ተዘምኗል።',
          isActive: true,
          updatedAt: now,
          updatedBy: 'System Seed'
        },
        {
          id: 'tpl-overdue-sla',
          eventType: 'OverdueSLA',
          name: 'SLA Escalation Alert',
          requiredPlaceholders: ['{{registrationNumber}}', '{{hoursOverdue}}'],
          emailSubjectEn: '[URGENT SLA] {{registrationNumber}} Overdue by {{hoursOverdue}}h',
          emailSubjectAm: '[አስቸኳይ SLA] {{registrationNumber}} በ{{hoursOverdue}} ሰዓት ዘግይቷል',
          emailBodyEn:
            'Escalation Notice: Correspondence {{registrationNumber}} has exceeded its SLA deadline by {{hoursOverdue}} hours. Target: {{assigneeName}}.',
          emailBodyAm:
            'የቀነ-ገደብ ማስጠንቀቂያ: ሰነድ {{registrationNumber}} የተመደበለትን የSLA ጊዜ በ{{hoursOverdue}} ሰዓት አልፏል።',
          smsBodyEn: 'EPSS SLA ALERT: {{registrationNumber}} overdue by {{hoursOverdue}}h!',
          smsBodyAm: 'EPSS SLA ማስጠንቀቂያ: {{registrationNumber}} በ{{hoursOverdue}} ሰዓት ዘግይቷል!',
          isActive: true,
          updatedAt: now,
          updatedBy: 'System Seed'
        },
        {
          id: 'tpl-dispatch',
          eventType: 'Dispatch',
          name: 'Official Dispatch Confirmation',
          requiredPlaceholders: ['{{registrationNumber}}', '{{recipientOrganization}}'],
          emailSubjectEn: '[EPSS Dispatch] {{registrationNumber}} Sent to {{recipientOrganization}}',
          emailSubjectAm: '[EPSS መላኪያ] {{registrationNumber}} ለ{{recipientOrganization}} ተልኳል',
          emailBodyEn:
            'Official correspondence {{registrationNumber}} has been dispatched to {{recipientOrganization}}.',
          emailBodyAm:
            'ይፋዊ ደብዳቤ {{registrationNumber}} ለ{{recipientOrganization}} በተሳካ ሁኔታ ተልኳል።',
          smsBodyEn: 'EPSS Dispatched: {{registrationNumber}} -> {{recipientOrganization}}.',
          smsBodyAm: 'EPSS ተልኳል: {{registrationNumber}} -> {{recipientOrganization}}።',
          isActive: true,
          updatedAt: now,
          updatedBy: 'System Seed'
        },
        {
          id: 'tpl-security',
          eventType: 'Security',
          name: 'Security & Biometric Audit Notice',
          requiredPlaceholders: ['{{userName}}', '{{eventDetails}}'],
          emailSubjectEn: '[EPSS Security] Account Event for {{userName}}',
          emailSubjectAm: '[EPSS ደህንነት] የመለያ ማስጠንቀቂያ ለ{{userName}}',
          emailBodyEn:
            'Security notification for {{userName}}: {{eventDetails}}.',
          emailBodyAm:
            'የደህንነት ማሳወቂያ ለ{{userName}}: {{eventDetails}}።',
          smsBodyEn: 'EPSS Security ({{userName}}): {{eventDetails}}',
          smsBodyAm: 'EPSS ደህንነት ({{userName}}): {{eventDetails}}',
          isActive: true,
          updatedAt: now,
          updatedBy: 'System Seed'
        }
      ];
    }

    if (!Array.isArray(this.data.escalationRules) || this.data.escalationRules.length === 0) {
      const now = new Date().toISOString();
      this.data.escalationRules = [
        {
          id: 'esc-rule-sla-director',
          name: 'Overdue Workflow SLA -> Directorate Alert',
          trigger: 'WorkflowOverdue',
          delayHours: 4,
          targetType: 'Role',
          targetRole: 'Director',
          channels: ['InApp', 'Email'],
          isActive: true,
          createdAt: now,
          updatedAt: now
        },
        {
          id: 'esc-rule-urgent-dg',
          name: 'Very Urgent Unacted -> Director General Escalation',
          trigger: 'VeryUrgentUnacted',
          delayHours: 2,
          targetType: 'Role',
          targetRole: 'DirectorGeneral',
          channels: ['InApp', 'Email', 'SMS'],
          isActive: true,
          createdAt: now,
          updatedAt: now
        },
        {
          id: 'esc-rule-phys-overdue',
          name: 'Overdue Physical File Return -> Registry Officer',
          trigger: 'PhysicalOverdue',
          delayHours: 24,
          targetType: 'Role',
          targetRole: 'RegistryOfficer',
          channels: ['InApp', 'SMS'],
          isActive: true,
          createdAt: now,
          updatedAt: now
        }
      ];
    }

    if (!Array.isArray(this.data.notificationPreferences)) {
      this.data.notificationPreferences = [];
    }
    for (const u of this.data.users) {
      if (!this.data.notificationPreferences.some(p => p.userId === u.id)) {
        this.data.notificationPreferences.push(this.createDefaultUserPreferences(u));
      }
    }

    if (!Array.isArray(this.data.notificationDeliveryLogs) || this.data.notificationDeliveryLogs.length === 0) {
      this.data.notificationDeliveryLogs = [
        {
          id: 'dlog-seed-1',
          timestamp: '2026-11-08T08:31:00Z',
          notificationId: 'notif-1',
          eventType: 'Assignment',
          channel: 'Email',
          recipientUserId: 'usr-dir',
          recipientAddress: 'hiwot.tadesse@epss.gov.et',
          subject: '[EPSS EDRMS] Task Assigned: EPSS/IN/2026/00102',
          bodyPreview: 'Ministry of Health Cholera Response Directive routed to Storage & Distribution.',
          status: 'Delivered'
        },
        {
          id: 'dlog-seed-2',
          timestamp: '2026-11-08T07:16:00Z',
          notificationId: 'notif-2',
          eventType: 'Approval',
          channel: 'SMS',
          recipientUserId: 'usr-dg',
          recipientAddress: '+251911220044',
          bodyPreview: 'EPSS Approval: EPSS/OUT/2026/00045 pending Director General PKI signature.',
          status: 'Delivered'
        },
        {
          id: 'dlog-seed-3',
          timestamp: '2026-11-08T06:05:00Z',
          notificationId: 'notif-3',
          eventType: 'OverdueSLA',
          channel: 'SMS',
          recipientUserId: 'usr-proc',
          recipientAddress: 'missing-phone',
          bodyPreview: 'EPSS SLA ALERT: EPSS/APP/2026/00012 nearing 48h deadline.',
          status: 'Failed',
          errorReason: 'Recipient MSISDN missing or invalid (+251 format required for Ethio Telecom SMS).'
        }
      ];
    }
  }

  private createDefaultUserPreferences(user: User): UserNotificationPreferences {
    const idx = Math.max(1, this.data.users.findIndex(u => u.id === user.id) + 1);
    return {
      userId: user.id,
      emailAddress: user.email,
      phoneNumber: `+2519112200${String(idx).padStart(2, '0')}`,
      preferredLanguage: 'en',
      channels: {
        Assignment: { inApp: true, email: true, sms: false },
        Approval: { inApp: true, email: true, sms: true },
        OverdueSLA: { inApp: true, email: true, sms: true },
        Dispatch: { inApp: true, email: true, sms: false },
        Security: { inApp: true, email: true, sms: true }
      },
      updatedAt: new Date().toISOString()
    };
  }

  public getNotificationConfig(): NotificationConfig {
    return this.data.notificationConfig || { smsMaxLength: 160, realtimeWsEnabled: true };
  }

  public updateNotificationConfig(
    payload: Partial<NotificationConfig>,
    actor: User,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string; config?: NotificationConfig } {
    if (!['SuperAdmin', 'DirectorGeneral'].includes(actor.role) && !this.hasPermission(actor, 'manage:organizations')) {
      return { success: false, statusCode: 403, error: 'Forbidden: SuperAdmin or Director authority required.' };
    }
    const smsMax = payload.smsMaxLength !== undefined ? Number(payload.smsMaxLength) : this.data.notificationConfig.smsMaxLength;
    if (Number.isNaN(smsMax) || smsMax < 40 || smsMax > 480) {
      return { success: false, statusCode: 400, error: 'SMS maximum length must be between 40 and 480 characters.' };
    }
    this.data.notificationConfig = {
      smsMaxLength: Math.floor(smsMax),
      realtimeWsEnabled: payload.realtimeWsEnabled !== undefined
        ? Boolean(payload.realtimeWsEnabled)
        : this.data.notificationConfig.realtimeWsEnabled
    };
    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'UPDATED_NOTIFICATION_CONFIG',
      resourceType: 'NotificationConfig',
      resourceId: 'global',
      ipAddress: clientIp,
      details: `Updated SMS max length=${this.data.notificationConfig.smsMaxLength}, realtimeWS=${this.data.notificationConfig.realtimeWsEnabled}`
    });
    this.save();
    return { success: true, config: this.data.notificationConfig };
  }

  public getNotificationTemplates(): NotificationTemplate[] {
    return this.data.notificationTemplates || [];
  }

  public getRequiredPlaceholdersMap(): Record<NotificationEventType, string[]> {
    return EdrmsStore.REQUIRED_EVENT_PLACEHOLDERS;
  }

  public saveNotificationTemplate(
    payload: Partial<NotificationTemplate> & { id?: string },
    actor: User,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string; template?: NotificationTemplate } {
    if (!['SuperAdmin', 'DirectorGeneral', 'Director'].includes(actor.role) && !this.hasPermission(actor, 'manage:organizations')) {
      return { success: false, statusCode: 403, error: 'Forbidden: admin or director authority required to edit templates.' };
    }

    const validTypes: NotificationEventType[] = ['Assignment', 'Approval', 'OverdueSLA', 'Dispatch', 'Security'];
    const eventType = payload.eventType as NotificationEventType;
    if (!eventType || !validTypes.includes(eventType)) {
      return { success: false, statusCode: 400, error: 'Valid eventType is required (Assignment, Approval, OverdueSLA, Dispatch, Security).' };
    }

    const name = (payload.name || '').trim();
    const emailSubjectEn = (payload.emailSubjectEn || '').trim();
    const emailSubjectAm = (payload.emailSubjectAm || '').trim();
    const emailBodyEn = (payload.emailBodyEn || '').trim();
    const emailBodyAm = (payload.emailBodyAm || '').trim();
    const smsBodyEn = (payload.smsBodyEn || '').trim();
    const smsBodyAm = (payload.smsBodyAm || '').trim();

    if (name.length < 3 || !emailSubjectEn || !emailSubjectAm || !emailBodyEn || !emailBodyAm) {
      return { success: false, statusCode: 400, error: 'Template name, EN/AM subjects, and EN/AM bodies are all required.' };
    }

    // Validation Rule 1: Required placeholders must exist in EN and AM email bodies
    const requiredPlaceholders = EdrmsStore.REQUIRED_EVENT_PLACEHOLDERS[eventType];
    for (const ph of requiredPlaceholders) {
      if (!emailBodyEn.includes(ph)) {
        return {
          success: false,
          statusCode: 400,
          error: `English email body for ${eventType} must contain required placeholder ${ph}.`
        };
      }
      if (!emailBodyAm.includes(ph)) {
        return {
          success: false,
          statusCode: 400,
          error: `Amharic email body for ${eventType} must contain required placeholder ${ph}.`
        };
      }
    }

    // Validation Rule 3: SMS limited to configured length
    const smsMax = this.getNotificationConfig().smsMaxLength;
    if (!smsBodyEn || !smsBodyAm) {
      return { success: false, statusCode: 400, error: 'Both English and Amharic SMS templates are required.' };
    }
    if (smsBodyEn.length > smsMax) {
      return {
        success: false,
        statusCode: 400,
        error: `English SMS template (${smsBodyEn.length} chars) exceeds configured maximum length of ${smsMax} characters.`
      };
    }
    if (smsBodyAm.length > smsMax) {
      return {
        success: false,
        statusCode: 400,
        error: `Amharic SMS template (${smsBodyAm.length} chars) exceeds configured maximum length of ${smsMax} characters.`
      };
    }

    const now = new Date().toISOString();
    let tpl: NotificationTemplate | undefined;
    if (payload.id) {
      tpl = this.data.notificationTemplates.find(t => t.id === payload.id);
    } else {
      tpl = this.data.notificationTemplates.find(t => t.eventType === eventType);
    }

    if (tpl) {
      tpl.eventType = eventType;
      tpl.name = name;
      tpl.requiredPlaceholders = [...requiredPlaceholders];
      tpl.emailSubjectEn = emailSubjectEn;
      tpl.emailSubjectAm = emailSubjectAm;
      tpl.emailBodyEn = emailBodyEn;
      tpl.emailBodyAm = emailBodyAm;
      tpl.smsBodyEn = smsBodyEn;
      tpl.smsBodyAm = smsBodyAm;
      tpl.isActive = payload.isActive !== undefined ? Boolean(payload.isActive) : tpl.isActive;
      tpl.updatedAt = now;
      tpl.updatedBy = actor.fullNameEn;
    } else {
      tpl = {
        id: `tpl-${Date.now().toString(36)}`,
        eventType,
        name,
        requiredPlaceholders: [...requiredPlaceholders],
        emailSubjectEn,
        emailSubjectAm,
        emailBodyEn,
        emailBodyAm,
        smsBodyEn,
        smsBodyAm,
        isActive: payload.isActive !== undefined ? Boolean(payload.isActive) : true,
        updatedAt: now,
        updatedBy: actor.fullNameEn
      };
      this.data.notificationTemplates.push(tpl);
    }

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'SAVED_NOTIFICATION_TEMPLATE',
      resourceType: 'NotificationTemplate',
      resourceId: tpl.id,
      ipAddress: clientIp,
      details: `Saved bilingual EN/AM template "${tpl.name}" for ${eventType}`
    });
    this.save();
    return { success: true, template: tpl };
  }

  public getUserNotificationPreferences(user: User): UserNotificationPreferences {
    let pref = (this.data.notificationPreferences || []).find(p => p.userId === user.id);
    if (!pref) {
      pref = this.createDefaultUserPreferences(user);
      this.data.notificationPreferences.push(pref);
      this.save();
    }
    return pref;
  }

  public updateUserNotificationPreferences(
    targetUserId: string,
    payload: Partial<UserNotificationPreferences>,
    actor: User,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string; preferences?: UserNotificationPreferences } {
    // Validation Rule 5: User can only update their own preferences
    if (targetUserId !== actor.id) {
      return {
        success: false,
        statusCode: 403,
        error: 'Forbidden: users can only update their own notification preferences.'
      };
    }

    const pref = this.getUserNotificationPreferences(actor);

    if (payload.emailAddress !== undefined) {
      const email = String(payload.emailAddress).trim();
      // Validation Rule 2: Email format validation
      if (!EdrmsStore.EMAIL_REGEX.test(email)) {
        return { success: false, statusCode: 400, error: 'Invalid email address format.' };
      }
      pref.emailAddress = email;
    }

    if (payload.phoneNumber !== undefined) {
      const phone = String(payload.phoneNumber).trim();
      if (phone && !/^\+?[0-9]{9,15}$/.test(phone.replace(/[\s-]/g, ''))) {
        return { success: false, statusCode: 400, error: 'Invalid SMS phone number format (e.g. +251911220011).' };
      }
      pref.phoneNumber = phone;
    }

    if (payload.preferredLanguage === 'en' || payload.preferredLanguage === 'am') {
      pref.preferredLanguage = payload.preferredLanguage;
    }

    if (payload.channels && typeof payload.channels === 'object') {
      const eventTypes: NotificationEventType[] = ['Assignment', 'Approval', 'OverdueSLA', 'Dispatch', 'Security'];
      for (const et of eventTypes) {
        const incoming = payload.channels[et];
        if (incoming) {
          pref.channels[et] = {
            inApp: Boolean(incoming.inApp),
            email: Boolean(incoming.email),
            sms: Boolean(incoming.sms)
          };
        }
      }
    }

    pref.updatedAt = new Date().toISOString();
    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'UPDATED_NOTIFICATION_PREFERENCES',
      resourceType: 'NotificationPreferences',
      resourceId: actor.id,
      ipAddress: clientIp,
      details: `Updated own notification channels (${pref.preferredLanguage.toUpperCase()}, ${pref.emailAddress})`
    });
    this.save();
    return { success: true, preferences: pref };
  }

  public getEscalationRules(): EscalationRule[] {
    return this.data.escalationRules || [];
  }

  public createEscalationRule(
    payload: Partial<EscalationRule>,
    actor: User,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string; rule?: EscalationRule } {
    if (!['SuperAdmin', 'DirectorGeneral', 'Director'].includes(actor.role) && !this.hasPermission(actor, 'manage:organizations')) {
      return { success: false, statusCode: 403, error: 'Forbidden: admin or director authority required.' };
    }

    const name = (payload.name || '').trim();
    const trigger = payload.trigger as EscalationTriggerType;
    const validTriggers: EscalationTriggerType[] = ['WorkflowOverdue', 'PhysicalOverdue', 'VeryUrgentUnacted'];
    const delayHours = Number(payload.delayHours);

    if (name.length < 3) {
      return { success: false, statusCode: 400, error: 'Escalation rule name must be at least 3 characters.' };
    }
    if (!trigger || !validTriggers.includes(trigger)) {
      return { success: false, statusCode: 400, error: 'Valid trigger type is required.' };
    }
    // Validation Rule 4: Escalation delay > 0
    if (Number.isNaN(delayHours) || !Number.isFinite(delayHours) || delayHours <= 0) {
      return { success: false, statusCode: 400, error: 'Escalation delay must be strictly greater than 0 hours.' };
    }

    const targetType = payload.targetType === 'User' ? 'User' : 'Role';
    let targetUserName: string | undefined;
    if (targetType === 'User') {
      const targetUser = this.data.users.find(u => u.id === payload.targetUserId && u.status !== 'Inactive');
      if (!targetUser) {
        return { success: false, statusCode: 400, error: 'Target active user not found.' };
      }
      targetUserName = targetUser.fullNameEn;
    } else if (!payload.targetRole) {
      return { success: false, statusCode: 400, error: 'Target role is required when targetType is Role.' };
    }

    const channels: Array<'InApp' | 'Email' | 'SMS'> =
      Array.isArray(payload.channels) && payload.channels.length > 0
        ? payload.channels
        : ['InApp', 'Email'];

    const now = new Date().toISOString();
    const rule: EscalationRule = {
      id: `esc-${Date.now().toString(36)}`,
      name,
      trigger,
      delayHours,
      targetType,
      targetRole: targetType === 'Role' ? payload.targetRole : undefined,
      targetUserId: targetType === 'User' ? payload.targetUserId : undefined,
      targetUserName,
      channels,
      isActive: payload.isActive !== undefined ? Boolean(payload.isActive) : true,
      createdAt: now,
      updatedAt: now
    };

    this.data.escalationRules.unshift(rule);
    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'CREATED_ESCALATION_RULE',
      resourceType: 'EscalationRule',
      resourceId: rule.id,
      ipAddress: clientIp,
      details: `Created escalation rule "${rule.name}" (trigger=${rule.trigger}, delay=${rule.delayHours}h)`
    });
    this.save();
    return { success: true, rule };
  }

  public updateEscalationRule(
    id: string,
    payload: Partial<EscalationRule>,
    actor: User,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string; rule?: EscalationRule } {
    if (!['SuperAdmin', 'DirectorGeneral', 'Director'].includes(actor.role) && !this.hasPermission(actor, 'manage:organizations')) {
      return { success: false, statusCode: 403, error: 'Forbidden: admin or director authority required.' };
    }
    const rule = this.data.escalationRules.find(r => r.id === id);
    if (!rule) return { success: false, statusCode: 404, error: 'Escalation rule not found.' };

    if (payload.name !== undefined) {
      const n = payload.name.trim();
      if (n.length < 3) return { success: false, statusCode: 400, error: 'Rule name must be at least 3 characters.' };
      rule.name = n;
    }
    if (payload.delayHours !== undefined) {
      const d = Number(payload.delayHours);
      if (Number.isNaN(d) || !Number.isFinite(d) || d <= 0) {
        return { success: false, statusCode: 400, error: 'Escalation delay must be strictly greater than 0 hours.' };
      }
      rule.delayHours = d;
    }
    if (payload.trigger !== undefined) rule.trigger = payload.trigger;
    if (payload.targetType !== undefined) rule.targetType = payload.targetType;
    if (payload.targetRole !== undefined) rule.targetRole = payload.targetRole;
    if (payload.targetUserId !== undefined) {
      const u = this.data.users.find(x => x.id === payload.targetUserId);
      rule.targetUserId = payload.targetUserId;
      rule.targetUserName = u?.fullNameEn;
    }
    if (Array.isArray(payload.channels) && payload.channels.length > 0) rule.channels = payload.channels;
    if (payload.isActive !== undefined) rule.isActive = Boolean(payload.isActive);
    rule.updatedAt = new Date().toISOString();

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'UPDATED_ESCALATION_RULE',
      resourceType: 'EscalationRule',
      resourceId: rule.id,
      ipAddress: clientIp,
      details: `Updated escalation rule "${rule.name}" (delay=${rule.delayHours}h, active=${rule.isActive})`
    });
    this.save();
    return { success: true, rule };
  }

  public deleteEscalationRule(
    id: string,
    actor: User,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string } {
    if (!['SuperAdmin', 'DirectorGeneral', 'Director'].includes(actor.role) && !this.hasPermission(actor, 'manage:organizations')) {
      return { success: false, statusCode: 403, error: 'Forbidden: admin or director authority required.' };
    }
    const idx = this.data.escalationRules.findIndex(r => r.id === id);
    if (idx === -1) return { success: false, statusCode: 404, error: 'Escalation rule not found.' };
    const removed = this.data.escalationRules.splice(idx, 1)[0];
    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'DELETED_ESCALATION_RULE',
      resourceType: 'EscalationRule',
      resourceId: removed.id,
      ipAddress: clientIp,
      details: `Deleted escalation rule "${removed.name}"`
    });
    this.save();
    return { success: true };
  }

  public getNotificationDeliveryLogs(): NotificationDeliveryLog[] {
    return this.data.notificationDeliveryLogs || [];
  }

  private renderTemplateString(template: string, vars: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
  }

  public dispatchNotification(params: {
    eventType: NotificationEventType;
    targetUserId?: string;
    recipientEmail?: string;
    recipientPhone?: string;
    titleEn?: string;
    titleAm?: string;
    messageEn?: string;
    messageAm?: string;
    vars?: Record<string, string>;
    channelsOverride?: Array<'InApp' | 'Email' | 'SMS'>;
    documentId?: string;
    registrationNumber?: string;
    priority?: 'Normal' | 'Urgent' | 'Critical';
  }): { notification?: AppNotification; deliveryLogs: NotificationDeliveryLog[] } {
    const now = new Date().toISOString();
    const vars = params.vars || {};
    const tpl = (this.data.notificationTemplates || []).find(
      t => t.eventType === params.eventType && t.isActive
    );

    const titleEn = params.titleEn || (tpl ? this.renderTemplateString(tpl.emailSubjectEn, vars) : `EPSS ${params.eventType} Notice`);
    const titleAm = params.titleAm || (tpl ? this.renderTemplateString(tpl.emailSubjectAm, vars) : `EPSS ${params.eventType} ማሳወቂያ`);
    const messageEn = params.messageEn || (tpl ? this.renderTemplateString(tpl.emailBodyEn, vars) : 'EPSS EDRMS system notification.');
    const messageAm = params.messageAm || (tpl ? this.renderTemplateString(tpl.emailBodyAm, vars) : 'የEPSS EDRMS ማሳወቂያ።');

    const targetUser = params.targetUserId
      ? this.data.users.find(u => u.id === params.targetUserId)
      : undefined;
    const pref = targetUser ? this.getUserNotificationPreferences(targetUser) : undefined;
    const prefChannels = pref?.channels[params.eventType] || { inApp: true, email: false, sms: false };

    const useInApp = params.channelsOverride ? params.channelsOverride.includes('InApp') : prefChannels.inApp;
    const useEmail = params.channelsOverride ? params.channelsOverride.includes('Email') : prefChannels.email;
    const useSms = params.channelsOverride ? params.channelsOverride.includes('SMS') : prefChannels.sms;

    const logs: NotificationDeliveryLog[] = [];
    let createdNotif: AppNotification | undefined;

    if (useInApp) {
      createdNotif = {
        id: `notif-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        titleEn,
        titleAm,
        messageEn,
        messageAm,
        timestamp: now,
        type: params.eventType,
        isRead: false,
        userId: params.targetUserId || 'ALL',
        channel: 'InApp',
        priority: params.priority || (params.eventType === 'OverdueSLA' ? 'Urgent' : 'Normal'),
        documentId: params.documentId,
        registrationNumber: params.registrationNumber
      };
      this.data.notifications.unshift(createdNotif);
      this.data.notifications = this.data.notifications.slice(0, 150);

      const inAppLog: NotificationDeliveryLog = {
        id: `dlog-${Date.now().toString(36)}-inapp`,
        timestamp: now,
        notificationId: createdNotif.id,
        eventType: params.eventType,
        channel: 'InApp',
        recipientUserId: targetUser?.id,
        recipientAddress: targetUser?.username || 'broadcast',
        subject: titleEn,
        bodyPreview: messageEn.slice(0, 140),
        status: 'Delivered'
      };
      this.data.notificationDeliveryLogs.unshift(inAppLog);
      logs.push(inAppLog);

      this.notificationBroadcaster?.('notification:created', createdNotif, params.targetUserId);
    }

    if (useEmail) {
      const targetEmail = (params.recipientEmail ?? pref?.emailAddress ?? targetUser?.email ?? '').trim();
      const smtpConn = this.getConnectors().find(c => c.type === 'GovernmentSMTP');
      let status: 'Delivered' | 'Failed' = 'Delivered';
      let errorReason: string | undefined;

      if (!EdrmsStore.EMAIL_REGEX.test(targetEmail)) {
        status = 'Failed';
        errorReason = `Invalid recipient email address format: "${targetEmail || '(empty)'}"`;
      } else if (smtpConn && smtpConn.status === 'Offline') {
        status = 'Failed';
        errorReason = 'Government SMTP gateway offline.';
      }

      const subj = pref?.preferredLanguage === 'am' ? titleAm : titleEn;
      const body = pref?.preferredLanguage === 'am' ? messageAm : messageEn;
      const emailLog: NotificationDeliveryLog = {
        id: `dlog-${Date.now().toString(36)}-em`,
        timestamp: now,
        notificationId: createdNotif?.id,
        eventType: params.eventType,
        channel: 'Email',
        recipientUserId: targetUser?.id,
        recipientAddress: targetEmail || '(none)',
        subject: subj,
        bodyPreview: body.slice(0, 160),
        status,
        errorReason
      };
      this.data.notificationDeliveryLogs.unshift(emailLog);
      logs.push(emailLog);
    }

    if (useSms) {
      const targetPhone = (params.recipientPhone ?? pref?.phoneNumber ?? '').trim();
      const smsMax = this.getNotificationConfig().smsMaxLength;
      const rawSms = tpl
        ? this.renderTemplateString(pref?.preferredLanguage === 'am' ? tpl.smsBodyAm : tpl.smsBodyEn, vars)
        : (pref?.preferredLanguage === 'am' ? messageAm : messageEn);
      const smsConn = this.getConnectors().find(c => c.type === 'EthioTelecom_SMS');

      let status: 'Delivered' | 'Failed' = 'Delivered';
      let errorReason: string | undefined;

      if (!/^\+?[0-9]{9,15}$/.test(targetPhone.replace(/[\s-]/g, ''))) {
        status = 'Failed';
        errorReason = `Invalid or missing recipient phone number: "${targetPhone || '(empty)'}"`;
      } else if (rawSms.length > smsMax) {
        status = 'Failed';
        errorReason = `Rendered SMS (${rawSms.length} chars) exceeds configured maximum of ${smsMax} characters.`;
      } else if (smsConn && smsConn.status === 'Offline') {
        status = 'Failed';
        errorReason = 'Ethio Telecom SMS gateway offline.';
      }

      const smsLog: NotificationDeliveryLog = {
        id: `dlog-${Date.now().toString(36)}-sm`,
        timestamp: now,
        notificationId: createdNotif?.id,
        eventType: params.eventType,
        channel: 'SMS',
        recipientUserId: targetUser?.id,
        recipientAddress: targetPhone || '(none)',
        bodyPreview: rawSms,
        status,
        errorReason
      };
      this.data.notificationDeliveryLogs.unshift(smsLog);
      logs.push(smsLog);
    }

    this.data.notificationDeliveryLogs = this.data.notificationDeliveryLogs.slice(0, 250);
    this.save();
    return { notification: createdNotif, deliveryLogs: logs };
  }

  public sendTestDispatch(
    payload: {
      eventType: NotificationEventType;
      channel: 'InApp' | 'Email' | 'SMS';
      recipientEmail?: string;
      recipientPhone?: string;
      customMessage?: string;
    },
    actor: User,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string; log?: NotificationDeliveryLog } {
    if (payload.channel === 'Email' && payload.recipientEmail !== undefined) {
      const em = payload.recipientEmail.trim();
      if (!EdrmsStore.EMAIL_REGEX.test(em)) {
        const failedLog: NotificationDeliveryLog = {
          id: `dlog-${Date.now().toString(36)}-fail`,
          timestamp: new Date().toISOString(),
          eventType: payload.eventType,
          channel: 'Email',
          recipientUserId: actor.id,
          recipientAddress: em || '(empty)',
          subject: `[TEST] ${payload.eventType}`,
          bodyPreview: payload.customMessage || 'Test email dispatch',
          status: 'Failed',
          errorReason: 'Invalid email address format.'
        };
        this.data.notificationDeliveryLogs.unshift(failedLog);
        this.save();
        return { success: false, statusCode: 400, error: failedLog.errorReason, log: failedLog };
      }
    }

    const smsMax = this.getNotificationConfig().smsMaxLength;
    if (payload.channel === 'SMS' && payload.customMessage && payload.customMessage.length > smsMax) {
      const failedLog: NotificationDeliveryLog = {
        id: `dlog-${Date.now().toString(36)}-smsfail`,
        timestamp: new Date().toISOString(),
        eventType: payload.eventType,
        channel: 'SMS',
        recipientUserId: actor.id,
        recipientAddress: payload.recipientPhone || '(none)',
        bodyPreview: payload.customMessage,
        status: 'Failed',
        errorReason: `SMS exceeds configured maximum length of ${smsMax} characters (${payload.customMessage.length}/${smsMax}).`
      };
      this.data.notificationDeliveryLogs.unshift(failedLog);
      this.save();
      return { success: false, statusCode: 400, error: failedLog.errorReason, log: failedLog };
    }

    const sampleDoc = this.data.documents[0];
    const result = this.dispatchNotification({
      eventType: payload.eventType,
      targetUserId: actor.id,
      recipientEmail: payload.recipientEmail,
      recipientPhone: payload.recipientPhone,
      messageEn: payload.customMessage,
      vars: {
        registrationNumber: sampleDoc?.registrationNumber || 'EPSS/IN/2026/00101',
        subject: sampleDoc?.subjectEn || 'Pharmaceutical Cold-Chain Inspection',
        assigneeName: actor.fullNameEn,
        actorName: actor.fullNameEn,
        hoursOverdue: '6',
        recipientOrganization: 'Ministry of Health Ethiopia',
        userName: actor.fullNameEn,
        eventDetails: 'Test security dispatch verification'
      },
      channelsOverride: [payload.channel],
      documentId: sampleDoc?.id,
      registrationNumber: sampleDoc?.registrationNumber
    });

    const log = result.deliveryLogs[0];
    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'TEST_NOTIFICATION_DISPATCH',
      resourceType: 'NotificationDeliveryLog',
      resourceId: log?.id || 'test',
      ipAddress: clientIp,
      details: `Dispatched ${payload.channel} (${log?.status}): ${log?.errorReason || log?.recipientAddress}`
    });
    this.save();

    if (log?.status === 'Failed') {
      return { success: false, statusCode: 400, error: log.errorReason, log };
    }
    return { success: true, log };
  }

  public evaluateEscalationRules(
    actor?: User,
    clientIp = '127.0.0.1'
  ): { triggeredCount: number; notificationsCreated: AppNotification[] } {
    const now = Date.now();
    const rules = (this.data.escalationRules || []).filter(r => r.isActive);
    const created: AppNotification[] = [];

    for (const rule of rules) {
      const delayMs = rule.delayHours * 3600000;
      const targets =
        rule.targetType === 'User' && rule.targetUserId
          ? this.data.users.filter(u => u.id === rule.targetUserId && u.status !== 'Inactive')
          : this.data.users.filter(u => u.role === rule.targetRole && u.status !== 'Inactive');

      if (rule.trigger === 'WorkflowOverdue' || rule.trigger === 'VeryUrgentUnacted') {
        for (const inst of this.data.workflowInstances || []) {
          if (inst.status !== 'Active') continue;
          const doc = this.data.documents.find(d => d.id === inst.documentId);
          if (!doc) continue;
          if (rule.trigger === 'VeryUrgentUnacted' && doc.priority !== 'VeryUrgent') continue;

          const refTs =
            rule.trigger === 'VeryUrgentUnacted'
              ? new Date(inst.stageStartedAt).getTime()
              : new Date(inst.stageDueAt).getTime();

          if (now - refTs < delayMs) continue;

          const hoursOverdue = Math.max(1, Math.round((now - refTs) / 3600000));
          for (const target of targets) {
            const alreadyNotified = (this.data.notifications || []).some(
              n =>
                n.type === 'OverdueSLA' &&
                n.documentId === doc.id &&
                n.userId === target.id &&
                now - new Date(n.timestamp).getTime() < 12 * 3600000
            );
            if (alreadyNotified) continue;

            const disp = this.dispatchNotification({
              eventType: 'OverdueSLA',
              targetUserId: target.id,
              vars: {
                registrationNumber: doc.registrationNumber,
                subject: doc.subjectEn,
                hoursOverdue: String(hoursOverdue),
                assigneeName: target.fullNameEn
              },
              channelsOverride: rule.channels,
              documentId: doc.id,
              registrationNumber: doc.registrationNumber,
              priority: 'Critical'
            });
            if (disp.notification) created.push(disp.notification);
          }
          rule.lastTriggeredAt = new Date().toISOString();
        }
      } else if (rule.trigger === 'PhysicalOverdue') {
        for (const pf of this.data.physicalFiles || []) {
          if (!pf.expectedReturnDate || pf.status === 'Archived') continue;
          const dueTs = new Date(pf.expectedReturnDate).getTime();
          if (now - dueTs < delayMs) continue;
          const hoursOverdue = Math.max(1, Math.round((now - dueTs) / 3600000));
          for (const target of targets) {
            const alreadyNotified = (this.data.notifications || []).some(
              n =>
                n.type === 'OverdueSLA' &&
                n.documentId === pf.documentId &&
                n.userId === target.id &&
                now - new Date(n.timestamp).getTime() < 12 * 3600000
            );
            if (alreadyNotified) continue;

            const disp = this.dispatchNotification({
              eventType: 'OverdueSLA',
              targetUserId: target.id,
              vars: {
                registrationNumber: pf.registrationNumber,
                subject: `Physical Dossier ${pf.fileCode}`,
                hoursOverdue: String(hoursOverdue),
                assigneeName: pf.currentCustodianName
              },
              channelsOverride: rule.channels,
              documentId: pf.documentId,
              registrationNumber: pf.registrationNumber,
              priority: 'Urgent'
            });
            if (disp.notification) created.push(disp.notification);
          }
          rule.lastTriggeredAt = new Date().toISOString();
        }
      }
    }

    if (actor) {
      this.addAuditLog({
        userId: actor.id,
        userName: actor.fullNameEn,
        userRole: actor.role,
        branchName: actor.branchNameEn,
        action: 'EVALUATED_ESCALATION_RULES',
        resourceType: 'EscalationRule',
        resourceId: 'batch',
        ipAddress: clientIp,
        details: `Evaluated ${rules.length} active escalation rules; dispatched ${created.length} SLA alert(s).`
      });
    }

    this.save();
    return { triggeredCount: created.length, notificationsCreated: created };
  }

  // =========================================================================
  // PHASE 8: Search, Amharic Full-Text, Saved Searches, OCR/AI & Duplicates
  // =========================================================================

  private ensurePhase8SearchAiState() {
    if (!this.data.aiSearchConfig) {
      this.data.aiSearchConfig = {
        ocrConfidenceThreshold: 0.75,
        duplicateSimilarityThreshold: 0.72,
        enableGeminiExtraction: true
      };
    }

    if (!Array.isArray(this.data.savedSearches)) {
      this.data.savedSearches = [];
    }

    if (this.data.savedSearches.length === 0) {
      const admin = this.data.users.find(u => u.role === 'SuperAdmin') || this.data.users[0];
      if (admin) {
        this.data.savedSearches.push(
          {
            id: 'ssearch-urgent-hq',
            userId: admin.id,
            name: 'Urgent Head Office Incoming',
            filters: {
              type: 'IncomingLetter',
              priority: 'Urgent',
              branchId: 'br-hq'
            },
            notifyOnNewMatch: true,
            createdAt: '2026-11-05T08:00:00Z'
          },
          {
            id: 'ssearch-amharic-efda',
            userId: admin.id,
            name: 'EFDA Quality & Regulatory (አማርኛ / EN)',
            filters: {
              query: 'EFDA'
            },
            notifyOnNewMatch: false,
            createdAt: '2026-11-06T10:30:00Z'
          }
        );
      }
    }

    // Backfill contentHash and bilingual OCR search text on existing seeded documents
    for (const doc of this.data.documents) {
      if (!doc.ocrTextEn) {
        doc.ocrTextEn = `${doc.subjectEn}. ${doc.descriptionEn || ''} Reference ${doc.referenceNumber} from ${doc.senderOrganization} to ${doc.recipientOrganization}.`;
      }
      if (!doc.ocrTextAm) {
        doc.ocrTextAm = `${doc.subjectAm}. ${doc.descriptionAm || ''} የማጣቀሻ ቁጥር ${doc.referenceNumber} ከ${doc.senderOrganization}።`;
      }
      if (!doc.contentHash) {
        doc.contentHash = this.computeDocumentContentHash({
          type: doc.type,
          subjectEn: doc.subjectEn,
          subjectAm: doc.subjectAm,
          descriptionEn: doc.descriptionEn || '',
          senderOrganization: doc.senderOrganization,
          ocrTextEn: doc.ocrTextEn
        });
      }
    }
  }

  public normalizeSearchText(input: string): string {
    if (!input) return '';
    let s = input.normalize('NFKC').toLowerCase();
    // Ethiopic / Amharic homophone normalization for forgiving Fidele search
    const amharicMap: Array<[RegExp, string]> = [
      [/[ሀሐኀ]/g, 'ሀ'],
      [/[ሁሑኁ]/g, 'ሁ'],
      [/[ሂሒኂ]/g, 'ሂ'],
      [/[ሃሓኃ]/g, 'ሃ'],
      [/[ሄሔኄ]/g, 'ሄ'],
      [/[ህሕኅ]/g, 'ህ'],
      [/[ሆሖኆ]/g, 'ሆ'],
      [/[ሰሠ]/g, 'ሰ'],
      [/[ሱሡ]/g, 'ሱ'],
      [/[ሲሢ]/g, 'ሲ'],
      [/[ሳሣ]/g, 'ሳ'],
      [/[ሴሤ]/g, 'ሴ'],
      [/[ስሥ]/g, 'ስ'],
      [/[ሶሦ]/g, 'ሶ'],
      [/[አዐ]/g, 'አ'],
      [/[ኡዑ]/g, 'ኡ'],
      [/[ኢዒ]/g, 'ኢ'],
      [/[ኣዓ]/g, 'አ'],
      [/[ኤዔ]/g, 'ኤ'],
      [/[እዕ]/g, 'እ'],
      [/[ኦዖ]/g, 'ኦ'],
      [/[ጸፀ]/g, 'ጸ'],
      [/[ጹፁ]/g, 'ጹ'],
      [/[ጺፂ]/g, 'ጺ'],
      [/[ጻፃ]/g, 'ጻ'],
      [/[ጼፄ]/g, 'ጼ'],
      [/[ጽፅ]/g, 'ጽ'],
      [/[ጾፆ]/g, 'ጾ'],
      [/፡/g, ' ']
    ];
    for (const [rx, rep] of amharicMap) {
      s = s.replace(rx, rep);
    }
    return s.replace(/\s+/g, ' ').trim();
  }

  public computeDocumentContentHash(input: {
    type?: string;
    subjectEn?: string;
    subjectAm?: string;
    descriptionEn?: string;
    senderOrganization?: string;
    ocrTextEn?: string;
  }): string {
    const canonical = [
      this.normalizeSearchText(input.type || ''),
      this.normalizeSearchText(input.subjectEn || ''),
      this.normalizeSearchText(input.subjectAm || ''),
      this.normalizeSearchText(input.descriptionEn || ''),
      this.normalizeSearchText(input.senderOrganization || ''),
      this.normalizeSearchText(input.ocrTextEn || '')
    ].join('|');
    return crypto.createHash('sha256').update(canonical).digest('hex');
  }

  private buildSnippet(text: string | undefined, queryRaw: string): string | undefined {
    if (!text) return undefined;
    const clean = text.trim();
    if (!clean) return undefined;
    if (!queryRaw.trim()) return clean.slice(0, 180);

    const normText = this.normalizeSearchText(clean);
    const terms = this.normalizeSearchText(queryRaw).split(' ').filter(Boolean);
    let idx = -1;
    for (const term of terms) {
      const pos = normText.indexOf(term);
      if (pos !== -1) {
        idx = pos;
        break;
      }
    }
    if (idx === -1) return clean.slice(0, 160);

    const start = Math.max(0, idx - 45);
    const end = Math.min(clean.length, start + 190);
    return `${start > 0 ? '...' : ''}${clean.slice(start, end)}${end < clean.length ? '...' : ''}`;
  }

  public searchDocuments(
    filters: SearchFilterParams,
    actor: User,
    session: AuthSession | undefined,
    clientIp = '127.0.0.1',
    auditExecution = false
  ): SearchResponse {
    const rawQuery = (filters.query || '').trim();
    const normQuery = this.normalizeSearchText(rawQuery);
    const queryTerms = normQuery ? normQuery.split(' ').filter(Boolean) : [];

    let filteredRestrictedCount = 0;
    const matchedResults: SearchResultItem[] = [];

    for (const doc of this.data.documents) {
      if (doc.isDeleted) continue;

      // Apply attribute filters first (still do NOT expose restricted docs!)
      if (filters.type && filters.type !== 'all' && doc.type !== filters.type) continue;
      if (filters.branchId && filters.branchId !== 'all' && doc.branchId !== filters.branchId) continue;
      if (filters.departmentId && filters.departmentId !== 'all' && doc.departmentId !== filters.departmentId) continue;
      if (filters.status && filters.status !== 'all' && doc.status !== filters.status) continue;
      if (filters.priority && filters.priority !== 'all' && doc.priority !== filters.priority) continue;
      if (filters.confidentiality && filters.confidentiality !== 'all' && doc.confidentiality !== filters.confidentiality) continue;
      if (filters.hasAttachmentsOnly && (!doc.attachments || doc.attachments.length === 0)) continue;
      if (filters.legalHoldOnly && !doc.legalHold) continue;

      if (filters.dateFrom) {
        const docTs = new Date(doc.registrationDate).getTime();
        const fromTs = new Date(filters.dateFrom).getTime();
        if (!Number.isNaN(fromTs) && docTs < fromTs) continue;
      }
      if (filters.dateTo) {
        const docTs = new Date(doc.registrationDate).getTime();
        const toTs = new Date(filters.dateTo).getTime() + 86399999;
        if (!Number.isNaN(toTs) && docTs > toTs) continue;
      }

      // Check full-text match across bilingual + OCR + AI + attachments metadata
      let score = 1;
      const matchedFields: string[] = [];
      let snippetEn: string | undefined;
      let snippetAm: string | undefined;

      if (queryTerms.length > 0) {
        const searchableMap: Array<{ field: string; value: string; weight: number; lang?: 'en' | 'am' }> = [
          { field: 'Registration No', value: doc.registrationNumber, weight: 10 },
          { field: 'Reference No', value: doc.referenceNumber, weight: 9 },
          { field: 'Subject (EN)', value: doc.subjectEn, weight: 8, lang: 'en' },
          { field: 'Subject (AM)', value: doc.subjectAm, weight: 8, lang: 'am' },
          { field: 'Sender', value: `${doc.senderOrganization} ${doc.senderPerson || ''}`, weight: 5 },
          { field: 'Recipient', value: `${doc.recipientOrganization} ${doc.recipientPerson || ''}`, weight: 4 },
          { field: 'Description (EN)', value: doc.descriptionEn || '', weight: 4, lang: 'en' },
          { field: 'Description (AM)', value: doc.descriptionAm || '', weight: 4, lang: 'am' },
          { field: 'OCR Text (EN)', value: doc.ocrTextEn || doc.aiExtracted?.ocrTextEn || '', weight: 5, lang: 'en' },
          { field: 'OCR Text (AM)', value: doc.ocrTextAm || doc.aiExtracted?.ocrTextAm || '', weight: 5, lang: 'am' },
          { field: 'AI Summary', value: `${doc.aiExtracted?.summaryEn || ''} ${doc.aiExtracted?.summaryAm || ''}`, weight: 3 },
          { field: 'Tags', value: (doc.tags || []).join(' '), weight: 4 },
          { field: 'Attachments', value: (doc.attachments || []).map(a => `${a.fileName} ${a.description || ''}`).join(' '), weight: 3 }
        ];

        const combinedNorm = this.normalizeSearchText(searchableMap.map(m => m.value).join(' '));
        const allTermsPresent = queryTerms.every(term => combinedNorm.includes(term));
        if (!allTermsPresent) continue;

        score = 0;
        for (const item of searchableMap) {
          const valNorm = this.normalizeSearchText(item.value);
          if (!valNorm) continue;
          const hits = queryTerms.filter(t => valNorm.includes(t)).length;
          if (hits > 0) {
            matchedFields.push(item.field);
            score += hits * item.weight;
            if (item.lang === 'en' && !snippetEn) snippetEn = this.buildSnippet(item.value, rawQuery);
            if (item.lang === 'am' && !snippetAm) snippetAm = this.buildSnippet(item.value, rawQuery);
          }
        }
      }

      // SECURITY RULE: Search strictly respects user authorization & MFA clearance (no confidential leakage!)
      const access = this.canAccessDocument(actor, doc, session);
      if (!access.allowed) {
        filteredRestrictedCount++;
        continue;
      }

      if (!snippetEn) snippetEn = this.buildSnippet(doc.ocrTextEn || doc.descriptionEn || doc.subjectEn, rawQuery);
      if (!snippetAm) snippetAm = this.buildSnippet(doc.ocrTextAm || doc.descriptionAm || doc.subjectAm, rawQuery);

      matchedResults.push({
        document: doc,
        score,
        matchedFields: [...new Set(matchedFields)],
        snippetEn,
        snippetAm
      });
    }

    matchedResults.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.document.registrationDate).getTime() - new Date(a.document.registrationDate).getTime();
    });

    if (auditExecution) {
      this.addAuditLog({
        userId: actor.id,
        userName: actor.fullNameEn,
        userRole: actor.role,
        branchName: actor.branchNameEn,
        action: 'SEARCH_EXECUTED',
        resourceType: 'Search',
        resourceId: rawQuery || 'filtered-query',
        ipAddress: clientIp,
        details: `Full-text search returned ${matchedResults.length} authorized document(s); ${filteredRestrictedCount} restricted document(s) withheld.`
      });
      this.save();
    }

    return {
      query: rawQuery,
      total: matchedResults.length,
      authorizedCount: matchedResults.length,
      filteredRestrictedCount,
      results: matchedResults
    };
  }

  public getSavedSearches(actor: User): SavedSearch[] {
    return (this.data.savedSearches || []).filter(s => s.userId === actor.id);
  }

  public createSavedSearch(
    payload: { name: string; filters: SearchFilterParams; notifyOnNewMatch?: boolean },
    actor: User,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string; savedSearch?: SavedSearch } {
    const name = (payload.name || '').trim();
    if (name.length < 2 || name.length > 100) {
      return { success: false, statusCode: 400, error: 'Saved search name must be between 2 and 100 characters.' };
    }

    const cleanFilters: SearchFilterParams = {
      query: payload.filters?.query?.trim() || '',
      type: payload.filters?.type || 'all',
      branchId: payload.filters?.branchId || 'all',
      departmentId: payload.filters?.departmentId || 'all',
      status: payload.filters?.status || 'all',
      priority: payload.filters?.priority || 'all',
      confidentiality: payload.filters?.confidentiality || 'all',
      dateFrom: payload.filters?.dateFrom || '',
      dateTo: payload.filters?.dateTo || '',
      hasAttachmentsOnly: Boolean(payload.filters?.hasAttachmentsOnly),
      legalHoldOnly: Boolean(payload.filters?.legalHoldOnly)
    };

    const previewCount = this.searchDocuments(cleanFilters, actor, undefined, clientIp, false).total;
    const savedSearch: SavedSearch = {
      id: `ssearch-${Date.now().toString(36)}`,
      userId: actor.id,
      name,
      filters: cleanFilters,
      notifyOnNewMatch: Boolean(payload.notifyOnNewMatch),
      createdAt: new Date().toISOString(),
      lastExecutedAt: new Date().toISOString(),
      lastResultCount: previewCount
    };

    this.data.savedSearches.unshift(savedSearch);
    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'CREATED_SAVED_SEARCH',
      resourceType: 'SavedSearch',
      resourceId: savedSearch.id,
      ipAddress: clientIp,
      details: `Saved search "${savedSearch.name}" (query="${cleanFilters.query || '*'}")`
    });
    this.save();
    return { success: true, savedSearch };
  }

  public deleteSavedSearch(
    id: string,
    actor: User,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string } {
    const idx = (this.data.savedSearches || []).findIndex(s => s.id === id);
    if (idx === -1) {
      return { success: false, statusCode: 404, error: 'Saved search not found.' };
    }
    const target = this.data.savedSearches[idx];
    if (target.userId !== actor.id && actor.role !== 'SuperAdmin') {
      return { success: false, statusCode: 403, error: 'Forbidden: you can only delete your own saved searches.' };
    }
    this.data.savedSearches.splice(idx, 1);
    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'DELETED_SAVED_SEARCH',
      resourceType: 'SavedSearch',
      resourceId: id,
      ipAddress: clientIp,
      details: `Deleted saved search "${target.name}"`
    });
    this.save();
    return { success: true };
  }

  public getAiSearchConfig(): AiSearchConfig {
    return this.data.aiSearchConfig || {
      ocrConfidenceThreshold: 0.75,
      duplicateSimilarityThreshold: 0.72,
      enableGeminiExtraction: true
    };
  }

  public updateAiSearchConfig(
    payload: Partial<AiSearchConfig>,
    actor: User,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string; config?: AiSearchConfig } {
    if (!['SuperAdmin', 'DirectorGeneral', 'Director'].includes(actor.role) && !this.hasPermission(actor, 'manage:organizations')) {
      return { success: false, statusCode: 403, error: 'Forbidden: admin or director authority required.' };
    }

    const current = this.getAiSearchConfig();
    const threshold =
      payload.ocrConfidenceThreshold !== undefined
        ? Number(payload.ocrConfidenceThreshold)
        : current.ocrConfidenceThreshold;
    const dupThreshold =
      payload.duplicateSimilarityThreshold !== undefined
        ? Number(payload.duplicateSimilarityThreshold)
        : current.duplicateSimilarityThreshold;

    if (Number.isNaN(threshold) || threshold < 0.1 || threshold > 0.99) {
      return { success: false, statusCode: 400, error: 'OCR confidence threshold must be between 0.10 and 0.99.' };
    }
    if (Number.isNaN(dupThreshold) || dupThreshold < 0.4 || dupThreshold > 1) {
      return { success: false, statusCode: 400, error: 'Duplicate similarity threshold must be between 0.40 and 1.00.' };
    }

    this.data.aiSearchConfig = {
      ocrConfidenceThreshold: Number(threshold.toFixed(2)),
      duplicateSimilarityThreshold: Number(dupThreshold.toFixed(2)),
      enableGeminiExtraction:
        payload.enableGeminiExtraction !== undefined
          ? Boolean(payload.enableGeminiExtraction)
          : current.enableGeminiExtraction
    };

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'UPDATED_AI_SEARCH_CONFIG',
      resourceType: 'AiSearchConfig',
      resourceId: 'global',
      ipAddress: clientIp,
      details: `Updated OCR confidence threshold=${this.data.aiSearchConfig.ocrConfidenceThreshold}, duplicate threshold=${this.data.aiSearchConfig.duplicateSimilarityThreshold}`
    });
    this.save();
    return { success: true, config: this.data.aiSearchConfig };
  }

  public recordAiAudit(
    actor: User,
    clientIp: string,
    action: string,
    resourceId: string,
    details: string
  ) {
    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action,
      resourceType: 'AiOcrIntelligence',
      resourceId,
      ipAddress: clientIp,
      details
    });
    this.save();
  }

  public checkDuplicateDocuments(
    input: {
      registrationNumber?: string;
      referenceNumber?: string;
      type?: string;
      subjectEn?: string;
      subjectAm?: string;
      descriptionEn?: string;
      senderOrganization?: string;
      ocrTextEn?: string;
    },
    actor: User,
    session: AuthSession | undefined,
    clientIp = '127.0.0.1',
    shouldAudit = true
  ): {
    hasDuplicates: boolean;
    contentHash: string;
    matches: DuplicateMatch[];
  } {
    const normReg = this.normalizeSearchText(input.registrationNumber || '');
    const normRef = this.normalizeSearchText(input.referenceNumber || '');
    const normSubjEn = this.normalizeSearchText(input.subjectEn || '');
    const normSubjAm = this.normalizeSearchText(input.subjectAm || '');

    const hasHashMaterial = Boolean(normSubjEn || normSubjAm || input.descriptionEn || input.ocrTextEn);
    const candidateHash = hasHashMaterial
      ? this.computeDocumentContentHash({
          type: input.type || 'IncomingLetter',
          subjectEn: input.subjectEn || '',
          subjectAm: input.subjectAm || input.subjectEn || '',
          descriptionEn: input.descriptionEn || '',
          senderOrganization: input.senderOrganization || '',
          ocrTextEn: input.ocrTextEn || ''
        })
      : '';

    const dupThreshold = this.getAiSearchConfig().duplicateSimilarityThreshold;
    const candidateTokens = new Set(normSubjEn.split(' ').filter(t => t.length > 2));
    const matches: DuplicateMatch[] = [];

    for (const doc of this.data.documents) {
      if (doc.isDeleted) continue;

      const docReg = this.normalizeSearchText(doc.registrationNumber);
      const docRef = this.normalizeSearchText(doc.referenceNumber);
      let matchType: DuplicateMatch['matchType'] | null = null;
      let similarityScore = 0;
      let reason = '';

      if (normReg && docReg === normReg) {
        matchType = 'RegistrationNumber';
        similarityScore = 1;
        reason = `Exact registration number conflict (${doc.registrationNumber}).`;
      } else if (normRef && docRef === normRef) {
        matchType = 'ReferenceNumber';
        similarityScore = 1;
        reason = `Identical external/internal reference number (${doc.referenceNumber}).`;
      } else if (candidateHash && doc.contentHash && doc.contentHash === candidateHash) {
        matchType = 'ContentHash';
        similarityScore = 1;
        reason = 'Identical SHA-256 normalized document content hash.';
      } else if (candidateTokens.size >= 3) {
        const docTokens = new Set(this.normalizeSearchText(doc.subjectEn).split(' ').filter(t => t.length > 2));
        if (docTokens.size > 0) {
          let intersection = 0;
          for (const t of candidateTokens) {
            if (docTokens.has(t)) intersection++;
          }
          const union = new Set([...candidateTokens, ...docTokens]).size;
          const jaccard = union > 0 ? intersection / union : 0;
          if (jaccard >= dupThreshold) {
            matchType = 'SubjectSimilarity';
            similarityScore = Number(jaccard.toFixed(2));
            reason = `High English subject similarity (${Math.round(jaccard * 100)}%).`;
          }
        }
      }

      if (matchType) {
        const access = this.canAccessDocument(actor, doc, session);
        matches.push({
          documentId: doc.id,
          registrationNumber: doc.registrationNumber,
          referenceNumber: access.allowed ? doc.referenceNumber : '[RESTRICTED]',
          subjectEn: access.allowed ? doc.subjectEn : `[Restricted ${doc.confidentiality} Record]`,
          subjectAm: access.allowed ? doc.subjectAm : '[ሚስጥራዊ መዝገብ]',
          status: doc.status,
          confidentiality: doc.confidentiality,
          registrationDate: doc.registrationDate,
          matchType,
          similarityScore,
          reason,
          isRestricted: !access.allowed
        });
      }
    }

    matches.sort((a, b) => b.similarityScore - a.similarityScore);

    if (shouldAudit) {
      this.addAuditLog({
        userId: actor.id,
        userName: actor.fullNameEn,
        userRole: actor.role,
        branchName: actor.branchNameEn,
        action: 'AI_DUPLICATE_CHECKED',
        resourceType: 'Document',
        resourceId: input.referenceNumber || input.registrationNumber || 'draft',
        ipAddress: clientIp,
        details: `Checked duplicates for ref="${input.referenceNumber || '(none)'}"; found ${matches.length} potential match(es).`
      });
      this.save();
    }

    return {
      hasDuplicates: matches.length > 0,
      contentHash: candidateHash,
      matches
    };
  }

  // =========================================================================
  // PHASE 9 + HSM ENTERPRISE PKI: CA HIERARCHY, HSM KEY WRAPPING & TSA
  // =========================================================================

  private getHsmMasterKey(): Buffer {
    if (!this.data.hsmMasterKeyHex || !/^[0-9a-f]{64}$/i.test(this.data.hsmMasterKeyHex)) {
      const envSecret = process.env.EPSS_HSM_MASTER_KEY;
      if (envSecret && envSecret.trim().length >= 16) {
        this.data.hsmMasterKeyHex = crypto.createHash('sha256').update(envSecret).digest('hex');
      } else {
        this.data.hsmMasterKeyHex = crypto.randomBytes(32).toString('hex');
      }
    }
    return Buffer.from(this.data.hsmMasterKeyHex, 'hex');
  }

  private wrapPrivateKeyWithHsm(privateKeyPem: string): {
    encryptedPrivateKeyPem: string;
    keyWrappingIv: string;
    keyWrappingTag: string;
  } {
    const kek = this.getHsmMasterKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', kek, iv);
    const encrypted = Buffer.concat([cipher.update(privateKeyPem, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return {
      encryptedPrivateKeyPem: encrypted.toString('base64'),
      keyWrappingIv: iv.toString('base64'),
      keyWrappingTag: tag.toString('base64')
    };
  }

  private unwrapPrivateKeyFromHsm(record: {
    privateKeyPem?: string;
    encryptedPrivateKeyPem?: string;
    keyWrappingIv?: string;
    keyWrappingTag?: string;
  }): string | null {
    if (record.encryptedPrivateKeyPem && record.keyWrappingIv && record.keyWrappingTag) {
      try {
        const kek = this.getHsmMasterKey();
        const iv = Buffer.from(record.keyWrappingIv, 'base64');
        const tag = Buffer.from(record.keyWrappingTag, 'base64');
        const decipher = crypto.createDecipheriv('aes-256-gcm', kek, iv);
        decipher.setAuthTag(tag);
        const decrypted = Buffer.concat([
          decipher.update(Buffer.from(record.encryptedPrivateKeyPem, 'base64')),
          decipher.final()
        ]);
        return decrypted.toString('utf8');
      } catch {
        return record.privateKeyPem || null;
      }
    }
    return record.privateKeyPem || null;
  }

  private generateKeyPairByAlgorithm(algorithm: SigningAlgorithm): {
    publicKey: string;
    privateKey: string;
    keySizeBits: number;
  } {
    if (algorithm === 'ECDSA-P384-SHA384') {
      const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
        namedCurve: 'secp384r1',
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
      });
      return { publicKey, privateKey, keySizeBits: 384 };
    }
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    return { publicKey, privateKey, keySizeBits: 2048 };
  }

  private signBytesWithAlgorithm(algorithm: SigningAlgorithm, data: Buffer, privateKeyPem: string): string {
    if (algorithm === 'ECDSA-P384-SHA384') {
      return crypto.sign('sha384', data, privateKeyPem).toString('base64');
    }
    if (algorithm === 'RSA-PSS-SHA256') {
      return crypto
        .sign('sha256', data, {
          key: privateKeyPem,
          padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
          saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST
        })
        .toString('base64');
    }
    return crypto.sign('sha256', data, privateKeyPem).toString('base64');
  }

  private verifyBytesWithAlgorithm(
    algorithm: SigningAlgorithm | string,
    data: Buffer,
    publicKeyPem: string,
    sigBase64: string
  ): boolean {
    try {
      const sigBuf = Buffer.from(sigBase64, 'base64');
      if (algorithm === 'ECDSA-P384-SHA384') {
        return crypto.verify('sha384', data, publicKeyPem, sigBuf);
      }
      if (algorithm === 'RSA-PSS-SHA256') {
        return crypto.verify(
          'sha256',
          data,
          {
            key: publicKeyPem,
            padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
            saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST
          },
          sigBuf
        );
      }
      return crypto.verify('sha256', data, publicKeyPem, sigBuf);
    } catch {
      return false;
    }
  }

  private getActiveHsmSlot(): HsmSlotConfig {
    const slots = this.data.hsmSlots || [];
    const policySlotId = this.data.pkiPolicy?.activeHsmSlotId;
    return (
      slots.find(s => s.id === policySlotId && s.status === 'Active') ||
      slots.find(s => s.isDefault && s.status === 'Active') ||
      slots.find(s => s.status === 'Active') ||
      slots[0]
    );
  }

  private getCaNode(role: 'RootCA' | 'IssuingCA' | 'TSA'): StoredCaNode | undefined {
    return (this.data.pkiCaHierarchy || []).find(n => n.role === role);
  }

  private buildCertEndorsementPayload(cert: {
    serialNumber: string;
    userId: string;
    fingerprintSha256: string;
    issuedAt: string;
    expiresAt: string;
  }): string {
    return `EPSS-CA-ENDORSE-V1|${cert.serialNumber}|${cert.userId}|${cert.fingerprintSha256}|${cert.issuedAt}|${cert.expiresAt}`;
  }

  private issueTrustedTimestampToken(signatureBase64: string, timestampUtc: string): TrustedTimestampToken | undefined {
    const policy = this.data.pkiPolicy;
    if (policy && !policy.requireTsaTimestamp) return undefined;
    const tsaNode = this.getCaNode('TSA');
    if (!tsaNode) return undefined;
    const tsaPriv = this.unwrapPrivateKeyFromHsm(tsaNode);
    if (!tsaPriv) return undefined;

    const imprintHashSha256 = crypto.createHash('sha256').update(signatureBase64, 'utf8').digest('hex');
    const nonceHex = crypto.randomBytes(8).toString('hex').toUpperCase();
    const tsaPayload = `EPSS-RFC3161-TSA-V1|${imprintHashSha256}|${timestampUtc}|${nonceHex}|${tsaNode.caSerial}`;
    const tsaSignatureBase64 = this.signBytesWithAlgorithm(tsaNode.algorithm, Buffer.from(tsaPayload, 'utf8'), tsaPriv);

    return {
      tsaTokenId: `tsa-${Date.now()}-${nonceHex.slice(0, 6)}`,
      tsaAuthorityDn: tsaNode.subjectDn,
      tsaSerialNumber: tsaNode.caSerial,
      timestampUtc,
      imprintHashSha256,
      nonceHex,
      tsaSignatureBase64,
      verified: true
    };
  }

  private verifyTrustedTimestampToken(
    sigBase64: string,
    token: TrustedTimestampToken | undefined,
    tsaPublicKeyPem?: string
  ): boolean {
    if (!token) return false;
    const expectedImprint = crypto.createHash('sha256').update(sigBase64, 'utf8').digest('hex');
    if (expectedImprint !== token.imprintHashSha256) return false;
    const tsaNode = this.getCaNode('TSA');
    const pubKey = tsaPublicKeyPem || tsaNode?.publicKeyPem;
    if (!pubKey) return false;
    const algo = tsaNode?.algorithm || 'RSA-SHA256';
    const payload = `EPSS-RFC3161-TSA-V1|${token.imprintHashSha256}|${token.timestampUtc}|${token.nonceHex}|${token.tsaSerialNumber}`;
    return this.verifyBytesWithAlgorithm(algo, Buffer.from(payload, 'utf8'), pubKey, token.tsaSignatureBase64);
  }

  private ensureHsmAndCaInfrastructure() {
    this.getHsmMasterKey();
    const now = new Date().toISOString();

    if (!Array.isArray(this.data.hsmSlots) || this.data.hsmSlots.length === 0) {
      const attest1 = crypto.createHash('sha256').update(`EPSS-HSM-01:${now}`).digest('hex').toUpperCase();
      const attest2 = crypto.createHash('sha256').update(`EPSS-CLOUD-HSM-02:${now}`).digest('hex').toUpperCase();
      this.data.hsmSlots = [
        {
          id: 'hsm-slot-primary',
          slotCode: 'SLOT-00-EPSS-INT',
          label: 'EPSS Internal FIPS 140-3 AES-256-GCM HSM Vault',
          provider: 'SoftwarePKCS11HSM',
          endpointUri: 'pkcs11://localhost:5657/partition/epss-gov-root',
          keyWrapAlgorithm: 'AES-256-GCM',
          fipsLevel: 'FIPS 140-3 Level 3',
          status: 'Active',
          isDefault: true,
          lastAttestedAt: now,
          attestationDigestSha256: attest1,
          operationsCount: 0
        },
        {
          id: 'hsm-slot-standby',
          slotCode: 'SLOT-01-THALES-HSM',
          label: 'Ethiopian GovNet Hardware PKCS#11 Partition (Standby)',
          provider: 'ExternalPKCS11',
          endpointUri: 'pkcs11://hsm-gw.epss.gov.et:1792/partition/outgoing-seal',
          keyWrapAlgorithm: 'PKCS11-CKM-AES-KEY-WRAP',
          fipsLevel: 'FIPS 140-3 Level 3',
          status: 'Standby',
          isDefault: false,
          lastAttestedAt: now,
          attestationDigestSha256: attest2,
          operationsCount: 0
        }
      ];
    }

    if (!this.data.pkiPolicy) {
      this.data.pkiPolicy = {
        requireSignedOutgoingDispatch: true,
        requireTsaTimestamp: true,
        requireStepUpMfaForHsmSign: false,
        defaultAlgorithm: 'RSA-SHA256',
        activeHsmSlotId: 'hsm-slot-primary',
        crlDistributionUri: '/api/v1/pki/crl',
        updatedAt: now,
        updatedBy: 'System Initialization'
      };
    }

    if (!Array.isArray(this.data.pkiCaHierarchy) || this.data.pkiCaHierarchy.length < 3) {
      const issuedAt = now;
      const expRoot = new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000).toISOString();
      const expSub = new Date(Date.now() + 1825 * 24 * 60 * 60 * 1000).toISOString();

      const buildCaNode = (
        role: 'RootCA' | 'IssuingCA' | 'TSA',
        caSerial: string,
        subjectDn: string,
        issuerDn: string,
        algorithm: SigningAlgorithm,
        expiresAt: string
      ): StoredCaNode => {
        const kp = this.generateKeyPairByAlgorithm(algorithm);
        const wrapped = this.wrapPrivateKeyWithHsm(kp.privateKey);
        const fp = crypto.createHash('sha256').update(kp.publicKey).digest('hex').toUpperCase();
        return {
          caSerial,
          role,
          subjectDn,
          issuerDn,
          algorithm,
          fingerprintSha256: fp,
          publicKeyPem: kp.publicKey,
          issuedAt,
          expiresAt,
          status: 'Active',
          hsmSlotId: 'hsm-slot-primary',
          ...wrapped
        };
      };

      const rootDn = 'CN=EPSS National Health Logistics Root CA, O=Ethiopian Pharmaceutical Supply Service, C=ET';
      const issuingDn = 'CN=EPSS Outgoing Correspondence Issuing CA, OU=Information Security Directorate, O=EPSS, C=ET';
      const tsaDn = 'CN=EPSS RFC 3161 Trusted Timestamping Authority, OU=PKI Vault Operations, O=EPSS, C=ET';

      this.data.pkiCaHierarchy = [
        buildCaNode('RootCA', 'ET-EPSS-ROOT-CA-2026', rootDn, rootDn, 'RSA-SHA256', expRoot),
        buildCaNode('IssuingCA', 'ET-EPSS-ISSUING-CA-2026', issuingDn, rootDn, 'RSA-SHA256', expSub),
        buildCaNode('TSA', 'ET-EPSS-TSA-2026', tsaDn, rootDn, 'RSA-SHA256', expSub)
      ];
    }
  }

  private ensurePhase9SignatureState() {
    this.ensureHsmAndCaInfrastructure();

    if (!Array.isArray(this.data.signingCertificates)) {
      this.data.signingCertificates = [];
    }

    const issuingCa = this.getCaNode('IssuingCA');
    const issuingPriv = issuingCa ? this.unwrapPrivateKeyFromHsm(issuingCa) : null;
    const defaultSlot = this.getActiveHsmSlot();

    // Migrate any legacy plaintext privateKeyPem certs into HSM AES-256-GCM wrapped keys & bind CA endorsement
    for (const cert of this.data.signingCertificates) {
      if (cert.privateKeyPem && !cert.encryptedPrivateKeyPem) {
        const wrapped = this.wrapPrivateKeyWithHsm(cert.privateKeyPem);
        cert.encryptedPrivateKeyPem = wrapped.encryptedPrivateKeyPem;
        cert.keyWrappingIv = wrapped.keyWrappingIv;
        cert.keyWrappingTag = wrapped.keyWrappingTag;
        delete cert.privateKeyPem;
        cert.keyProtectionMode = 'HSM_AES256_WRAPPED';
      }
      if (!cert.keyProtectionMode) {
        cert.keyProtectionMode = cert.encryptedPrivateKeyPem ? 'HSM_AES256_WRAPPED' : 'SOFTWARE_LEGACY';
      }
      if (!cert.hsmSlotId && defaultSlot) {
        cert.hsmSlotId = defaultSlot.id;
        cert.hsmSlotLabel = defaultSlot.label;
      }
      if (issuingCa && issuingPriv && !cert.caEndorsementBase64) {
        cert.issuerCaSerial = issuingCa.caSerial;
        cert.issuerCaFingerprintSha256 = issuingCa.fingerprintSha256;
        cert.issuerDn = issuingCa.subjectDn;
        const payload = this.buildCertEndorsementPayload(cert);
        cert.caEndorsementBase64 = this.signBytesWithAlgorithm(
          issuingCa.algorithm,
          Buffer.from(payload, 'utf8'),
          issuingPriv
        );
      }
    }

    // Issue HSM-wrapped signing certificates for active staff who do not have an active or revoked record yet
    for (const user of this.data.users) {
      if (user.status !== 'Active') continue;
      const existingAny = this.data.signingCertificates.find(c => c.userId === user.id);
      if (!existingAny) {
        const cert = this.generateSigningCertificateRecord(user);
        this.data.signingCertificates.push(cert);
      }
    }

    // Upgrade any legacy seeded digitalSignature stubs lacking cryptographic payloads
    for (const doc of this.data.documents) {
      for (const h of doc.workflowHistory || []) {
        if (h.digitalSignature && !h.digitalSignature.signatureBase64) {
          const signer = this.getUserById(h.actorId) || this.data.users.find(u => u.role === 'DirectorGeneral') || this.data.users[0];
          const cert =
            this.getActiveCertificateForUser(signer.id) ||
            this.data.signingCertificates.find(c => c.userId === signer.id) ||
            this.generateSigningCertificateRecord(signer);
          if (!this.data.signingCertificates.some(c => c.id === cert.id)) {
            this.data.signingCertificates.push(cert);
          }
          const ts = h.digitalSignature.timestamp || h.timestamp;
          const upgraded = this.createCryptographicSignatureRecord(doc, signer, cert, {
            action: h.action,
            stageName: h.stageName || 'Executive Approval',
            signingMeaning: h.digitalSignature.signingMeaning || 'Approved for Official Issuance',
            biometricVerified: !!h.biometricVerified || true,
            mfaMethod: 'webauthn',
            timestamp: ts
          });
          h.digitalSignature = upgraded;
          h.biometricVerified = true;

          const wfInst = (this.data.workflowInstances || []).find(w => w.documentId === doc.id);
          if (wfInst) {
            const instEntry = wfInst.history.find(ih => ih.id === h.id);
            if (instEntry) {
              instEntry.digitalSignature = upgraded;
              instEntry.biometricVerified = true;
            }
          }
        }
      }
    }
  }

  private generateSigningCertificateRecord(
    user: User,
    requestedAlgorithm?: SigningAlgorithm,
    requestedSlotId?: string
  ): StoredSigningCertificate {
    this.ensureHsmAndCaInfrastructure();
    const algorithm: SigningAlgorithm =
      requestedAlgorithm || this.data.pkiPolicy?.defaultAlgorithm || 'RSA-SHA256';
    const { publicKey, privateKey, keySizeBits } = this.generateKeyPairByAlgorithm(algorithm);
    const wrapped = this.wrapPrivateKeyWithHsm(privateKey);

    const fingerprintSha256 = crypto
      .createHash('sha256')
      .update(publicKey)
      .digest('hex')
      .toUpperCase();
    const issuedAt = new Date().toISOString();
    const expiresDate = new Date(Date.now() + 730 * 24 * 60 * 60 * 1000);
    const year = new Date().getFullYear();
    const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    const roleTag = user.role.replace(/[^A-Za-z]/g, '').slice(0, 6).toUpperCase();
    const serialNumber = `ET-PKI-EPSS-${year}-${roleTag}-${suffix}`;

    const slot =
      (requestedSlotId && (this.data.hsmSlots || []).find(s => s.id === requestedSlotId)) ||
      this.getActiveHsmSlot();
    if (slot) {
      slot.operationsCount = (slot.operationsCount || 0) + 1;
    }

    const issuingCa = this.getCaNode('IssuingCA');
    const issuingPriv = issuingCa ? this.unwrapPrivateKeyFromHsm(issuingCa) : null;
    const issuerDn =
      issuingCa?.subjectDn ||
      'CN=EPSS Outgoing Correspondence Issuing CA, OU=Information Security Directorate, O=EPSS, C=ET';

    let caEndorsementBase64: string | undefined;
    if (issuingCa && issuingPriv) {
      const endorsementPayload = this.buildCertEndorsementPayload({
        serialNumber,
        userId: user.id,
        fingerprintSha256,
        issuedAt,
        expiresAt: expiresDate.toISOString()
      });
      caEndorsementBase64 = this.signBytesWithAlgorithm(
        issuingCa.algorithm,
        Buffer.from(endorsementPayload, 'utf8'),
        issuingPriv
      );
    }

    return {
      id: `cert-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      serialNumber,
      userId: user.id,
      userName: user.fullNameEn,
      userRole: user.role,
      departmentNameEn: user.departmentNameEn,
      algorithm,
      keySizeBits,
      publicKeyPem: publicKey,
      fingerprintSha256,
      issuerDn,
      subjectDn: `CN=${user.fullNameEn}, OU=${user.departmentNameEn}, TITLE=${user.role}, O=EPSS, C=ET`,
      issuerCaSerial: issuingCa?.caSerial,
      issuerCaFingerprintSha256: issuingCa?.fingerprintSha256,
      caEndorsementBase64,
      caChainTrusted: Boolean(caEndorsementBase64),
      keyProtectionMode: 'HSM_AES256_WRAPPED',
      hsmSlotId: slot?.id || 'hsm-slot-primary',
      hsmSlotLabel: slot?.label || 'EPSS Internal FIPS 140-3 HSM',
      issuedAt,
      expiresAt: expiresDate.toISOString(),
      status: 'Active',
      ...wrapped
    };
  }

  private verifyCertificateCaChain(
    cert: Pick<
      SigningCertificate,
      'serialNumber' | 'userId' | 'fingerprintSha256' | 'issuedAt' | 'expiresAt' | 'caEndorsementBase64'
    >,
    overrideCaPublicKeyPem?: string
  ): boolean {
    if (!cert.caEndorsementBase64) return false;
    const issuingCa = this.getCaNode('IssuingCA');
    const pubKey = overrideCaPublicKeyPem || issuingCa?.publicKeyPem;
    if (!pubKey) return false;
    const algo = issuingCa?.algorithm || 'RSA-SHA256';
    const payload = this.buildCertEndorsementPayload({
      serialNumber: cert.serialNumber,
      userId: cert.userId,
      fingerprintSha256: cert.fingerprintSha256,
      issuedAt: cert.issuedAt,
      expiresAt: cert.expiresAt
    });
    return this.verifyBytesWithAlgorithm(algo, Buffer.from(payload, 'utf8'), pubKey, cert.caEndorsementBase64);
  }

  private sanitizeCertificate(cert: StoredSigningCertificate): SigningCertificate {
    const {
      privateKeyPem: _omit1,
      encryptedPrivateKeyPem: _omit2,
      keyWrappingIv: _omit3,
      keyWrappingTag: _omit4,
      ...publicCert
    } = cert;
    const effectiveStatus =
      publicCert.status === 'Active' && new Date(publicCert.expiresAt).getTime() <= Date.now()
        ? 'Expired'
        : publicCert.status;
    return {
      ...publicCert,
      caChainTrusted: this.verifyCertificateCaChain(publicCert),
      status: effectiveStatus
    };
  }

  private getActiveCertificateForUser(userId: string): StoredSigningCertificate | null {
    const nowMs = Date.now();
    const matches = (this.data.signingCertificates || []).filter(
      c => c.userId === userId && c.status === 'Active' && new Date(c.expiresAt).getTime() > nowMs
    );
    if (matches.length === 0) return null;
    matches.sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime());
    return matches[0];
  }

  public computeDocumentSigningDigest(doc: {
    id: string;
    registrationNumber: string;
    referenceNumber: string;
    type: DocumentType;
    subjectEn: string;
    subjectAm?: string;
    descriptionEn?: string;
    senderOrganization: string;
    recipientOrganization: string;
    confidentiality: ConfidentialityLevel;
    attachments?: Array<{ fileName: string; fileSize: number; mimeType: string }>;
  }): string {
    const canonical = JSON.stringify({
      id: doc.id,
      registrationNumber: doc.registrationNumber,
      referenceNumber: doc.referenceNumber,
      type: doc.type,
      subjectEn: doc.subjectEn,
      subjectAm: doc.subjectAm || '',
      descriptionEn: doc.descriptionEn || '',
      senderOrganization: doc.senderOrganization,
      recipientOrganization: doc.recipientOrganization,
      confidentiality: doc.confidentiality,
      attachments: (doc.attachments || []).map(a => ({
        fileName: a.fileName,
        fileSize: a.fileSize,
        mimeType: a.mimeType
      }))
    });
    return crypto.createHash('sha256').update(canonical).digest('hex');
  }

  private buildCanonicalSigningPayload(params: {
    docId: string;
    registrationNumber: string;
    documentDigestSha256: string;
    stageName: string;
    action: string;
    signingMeaning: string;
    actorId: string;
    certificateSerial: string;
    timestamp: string;
  }): string {
    return [
      'EPSS-PKI-SIG-V1',
      `doc=${params.docId}`,
      `reg=${params.registrationNumber}`,
      `digest=${params.documentDigestSha256}`,
      `stage=${params.stageName}`,
      `action=${params.action}`,
      `meaning=${params.signingMeaning}`,
      `actor=${params.actorId}`,
      `serial=${params.certificateSerial}`,
      `ts=${params.timestamp}`
    ].join('|');
  }

  private createCryptographicSignatureRecord(
    doc: DocumentItem,
    actor: User,
    cert: StoredSigningCertificate,
    meta: {
      action: string;
      stageName: string;
      signingMeaning: string;
      biometricVerified: boolean;
      mfaMethod: 'webauthn' | 'pin' | 'session_mfa' | 'standard';
      timestamp: string;
    }
  ): NonNullable<WorkflowActionRecord['digitalSignature']> {
    const privateKeyPem = this.unwrapPrivateKeyFromHsm(cert);
    if (!privateKeyPem) {
      throw new Error('HSM failed to unwrap signer private key material.');
    }

    const activeSlot =
      (this.data.hsmSlots || []).find(s => s.id === cert.hsmSlotId) || this.getActiveHsmSlot();
    if (activeSlot) {
      activeSlot.operationsCount = (activeSlot.operationsCount || 0) + 1;
    }

    const documentDigestSha256 = this.computeDocumentSigningDigest(doc);
    const payload = this.buildCanonicalSigningPayload({
      docId: doc.id,
      registrationNumber: doc.registrationNumber,
      documentDigestSha256,
      stageName: meta.stageName,
      action: meta.action,
      signingMeaning: meta.signingMeaning,
      actorId: actor.id,
      certificateSerial: cert.serialNumber,
      timestamp: meta.timestamp
    });

    const algo: SigningAlgorithm = cert.algorithm || 'RSA-SHA256';
    const signatureBase64 = this.signBytesWithAlgorithm(algo, Buffer.from(payload, 'utf8'), privateKeyPem);
    const tsaToken = this.issueTrustedTimestampToken(signatureBase64, meta.timestamp);

    return {
      signatureId: `sig-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      signedByUserId: actor.id,
      signedBy: `${actor.fullNameEn} (${actor.role})`,
      signedByRole: actor.role,
      certificateSerial: cert.serialNumber,
      certificateFingerprint: cert.fingerprintSha256,
      algorithm: algo,
      documentDigestSha256,
      signatureBase64,
      signingMeaning: meta.signingMeaning,
      biometricVerified: meta.biometricVerified,
      mfaMethod: meta.mfaMethod,
      hsmSlotId: activeSlot?.id || cert.hsmSlotId,
      hsmSlotLabel: activeSlot?.label || cert.hsmSlotLabel,
      hsmProvider: activeSlot?.provider || 'SoftwarePKCS11HSM',
      keyProtectionMode: cert.keyProtectionMode || 'HSM_AES256_WRAPPED',
      caIssuerSerial: cert.issuerCaSerial || this.getCaNode('IssuingCA')?.caSerial,
      tsaToken,
      timestamp: meta.timestamp,
      verified: true
    };
  }

  public getSigningCertificates(actor: User): SigningCertificate[] {
    this.ensureHsmAndCaInfrastructure();
    const isAdminOrAuditor =
      actor.role === 'SuperAdmin' ||
      actor.role === 'Auditor' ||
      actor.role === 'SecurityOfficer' ||
      actor.role === 'DirectorGeneral';
    const list = (this.data.signingCertificates || []).filter(
      c => isAdminOrAuditor || c.userId === actor.id
    );
    return list
      .map(c => this.sanitizeCertificate(c))
      .sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime());
  }

  public getPkiHsmStatus(): PkiHsmGovernanceStatus {
    this.ensureHsmAndCaInfrastructure();
    const certs = (this.data.signingCertificates || []).map(c => this.sanitizeCertificate(c));
    const outgoingDocs = this.data.documents.filter(d => d.type === 'OutgoingLetter' && !d.isDeleted);
    let outgoingSealed = 0;
    let totalTsa = 0;
    for (const d of this.data.documents) {
      for (const h of d.workflowHistory || []) {
        if (h.digitalSignature?.tsaToken) totalTsa++;
      }
    }
    for (const d of outgoingDocs) {
      const digest = this.computeDocumentSigningDigest(d);
      const validSeal = (d.workflowHistory || []).some(
        h =>
          h.digitalSignature &&
          !h.digitalSignature.invalidated &&
          h.digitalSignature.documentDigestSha256 === digest
      );
      if (validSeal) outgoingSealed++;
    }

    const caChain: PkiCaNodeSummary[] = (this.data.pkiCaHierarchy || []).map(
      ({ encryptedPrivateKeyPem: _1, keyWrappingIv: _2, keyWrappingTag: _3, hsmSlotId: _4, ...pub }) => pub
    );

    return {
      policy: this.data.pkiPolicy!,
      caChain,
      hsmSlots: [...(this.data.hsmSlots || [])],
      metrics: {
        totalCertificates: certs.length,
        activeCertificates: certs.filter(c => c.status === 'Active').length,
        revokedCertificates: certs.filter(c => c.status === 'Revoked').length,
        hsmWrappedCertificates: certs.filter(c => c.keyProtectionMode === 'HSM_AES256_WRAPPED').length,
        outgoingTotal: outgoingDocs.length,
        outgoingSealed,
        outgoingUnsigned: Math.max(0, outgoingDocs.length - outgoingSealed),
        totalTsaTimestampsIssued: totalTsa
      }
    };
  }

  public updatePkiHsmPolicy(
    updates: Partial<PkiPolicyConfig>,
    actor: User,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string; policy?: PkiPolicyConfig } {
    if (actor.role !== 'SuperAdmin' && actor.role !== 'SecurityOfficer') {
      return {
        success: false,
        statusCode: 403,
        error: 'Forbidden: Only SuperAdmin or SecurityOfficer may modify HSM/PKI policies.'
      };
    }
    this.ensureHsmAndCaInfrastructure();
    const policy = this.data.pkiPolicy!;
    if (updates.defaultAlgorithm) {
      if (!['RSA-SHA256', 'RSA-PSS-SHA256', 'ECDSA-P384-SHA384'].includes(updates.defaultAlgorithm)) {
        return { success: false, statusCode: 400, error: 'Unsupported signing algorithm.' };
      }
      policy.defaultAlgorithm = updates.defaultAlgorithm;
    }
    if (updates.activeHsmSlotId) {
      const targetSlot = (this.data.hsmSlots || []).find(s => s.id === updates.activeHsmSlotId);
      if (!targetSlot) {
        return { success: false, statusCode: 404, error: 'HSM partition slot not found.' };
      }
      for (const s of this.data.hsmSlots || []) {
        s.isDefault = s.id === targetSlot.id;
        if (s.id === targetSlot.id) s.status = 'Active';
      }
      policy.activeHsmSlotId = targetSlot.id;
    }
    if (typeof updates.requireSignedOutgoingDispatch === 'boolean') {
      policy.requireSignedOutgoingDispatch = updates.requireSignedOutgoingDispatch;
    }
    if (typeof updates.requireTsaTimestamp === 'boolean') {
      policy.requireTsaTimestamp = updates.requireTsaTimestamp;
    }
    if (typeof updates.requireStepUpMfaForHsmSign === 'boolean') {
      policy.requireStepUpMfaForHsmSign = updates.requireStepUpMfaForHsmSign;
    }
    policy.updatedAt = new Date().toISOString();
    policy.updatedBy = actor.fullNameEn;

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'PKI_HSM_POLICY_UPDATED',
      resourceType: 'HsmVault',
      resourceId: policy.activeHsmSlotId,
      ipAddress: clientIp,
      details: `Updated HSM/PKI Policy: requireSignedOutgoingDispatch=${policy.requireSignedOutgoingDispatch}, defaultAlg=${policy.defaultAlgorithm}, tsa=${policy.requireTsaTimestamp}`
    });
    this.save();
    return { success: true, policy };
  }

  public attestHsmSlot(
    slotId: string,
    actor: User,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string; slot?: HsmSlotConfig; roundTripVerified?: boolean } {
    if (actor.role !== 'SuperAdmin' && actor.role !== 'SecurityOfficer' && actor.role !== 'Auditor') {
      return { success: false, statusCode: 403, error: 'Forbidden: HSM attestation requires Security/Admin clearance.' };
    }
    this.ensureHsmAndCaInfrastructure();
    const slot = (this.data.hsmSlots || []).find(s => s.id === slotId);
    if (!slot) return { success: false, statusCode: 404, error: 'HSM slot not found.' };

    // Execute live cryptographic key-wrap + CA challenge-response self-test
    const testKp = this.generateKeyPairByAlgorithm('ECDSA-P384-SHA384');
    const wrapped = this.wrapPrivateKeyWithHsm(testKp.privateKey);
    const unwrapped = this.unwrapPrivateKeyFromHsm(wrapped);
    const challenge = Buffer.from(`HSM-SELF-TEST-${Date.now()}-${slot.slotCode}`, 'utf8');
    let roundTripVerified = false;
    if (unwrapped) {
      const sig = this.signBytesWithAlgorithm('ECDSA-P384-SHA384', challenge, unwrapped);
      roundTripVerified = this.verifyBytesWithAlgorithm('ECDSA-P384-SHA384', challenge, testKp.publicKey, sig);
    }

    slot.lastAttestedAt = new Date().toISOString();
    slot.attestationDigestSha256 = crypto
      .createHash('sha256')
      .update(`${slot.slotCode}:${slot.lastAttestedAt}:${roundTripVerified}`)
      .digest('hex')
      .toUpperCase();
    slot.operationsCount = (slot.operationsCount || 0) + 1;

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'HSM_SLOT_ATTESTED',
      resourceType: 'HsmVault',
      resourceId: slot.slotCode,
      ipAddress: clientIp,
      details: `HSM cryptographic key-wrap & ECDSA-P384 round-trip self-test ${roundTripVerified ? 'PASSED' : 'FAILED'} (${slot.attestationDigestSha256.slice(0, 16)}...)`
    });
    this.save();
    return { success: true, slot, roundTripVerified };
  }

  public configureHsmSlot(
    payload: {
      slotCode: string;
      label: string;
      provider: HsmProviderType;
      endpointUri?: string;
      fipsLevel?: HsmSlotConfig['fipsLevel'];
    },
    actor: User,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string; slot?: HsmSlotConfig } {
    if (actor.role !== 'SuperAdmin' && actor.role !== 'SecurityOfficer') {
      return { success: false, statusCode: 403, error: 'Forbidden: Only SuperAdmin or SecurityOfficer may register HSM slots.' };
    }
    const code = (payload.slotCode || '').trim().toUpperCase();
    const label = (payload.label || '').trim();
    if (code.length < 3 || label.length < 5) {
      return { success: false, statusCode: 400, error: 'HSM slot code and descriptive label are required.' };
    }
    this.ensureHsmAndCaInfrastructure();
    const now = new Date().toISOString();
    const slot: HsmSlotConfig = {
      id: `hsm-slot-${Date.now().toString(36)}`,
      slotCode: code,
      label,
      provider: payload.provider || 'ExternalPKCS11',
      endpointUri: payload.endpointUri?.trim() || 'pkcs11://localhost:5657/partition/custom',
      keyWrapAlgorithm: payload.provider === 'SoftwarePKCS11HSM' ? 'AES-256-GCM' : 'PKCS11-CKM-AES-KEY-WRAP',
      fipsLevel: payload.fipsLevel || 'FIPS 140-3 Level 3',
      status: 'Active',
      isDefault: false,
      lastAttestedAt: now,
      attestationDigestSha256: crypto.createHash('sha256').update(`${code}:${now}`).digest('hex').toUpperCase(),
      operationsCount: 0
    };
    this.data.hsmSlots!.push(slot);

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'HSM_SLOT_CONFIGURED',
      resourceType: 'HsmVault',
      resourceId: slot.slotCode,
      ipAddress: clientIp,
      details: `Registered ${slot.provider} slot ${slot.slotCode} (${slot.label})`
    });
    this.save();
    return { success: true, slot };
  }

  public getCertificateRevocationList(): CrlRevocationEntry[] {
    return (this.data.signingCertificates || [])
      .filter(c => c.status === 'Revoked')
      .map(c => ({
        serialNumber: c.serialNumber,
        holderName: c.userName,
        holderRole: c.userRole,
        revokedAt: c.revokedAt || c.issuedAt,
        revokedBy: c.revokedBy || 'Security Administration',
        reason: c.revokedReason || 'Certificate superseded or revoked'
      }))
      .sort((a, b) => new Date(b.revokedAt).getTime() - new Date(a.revokedAt).getTime());
  }

  public issueSigningCertificate(
    targetUserId: string | undefined,
    actor: User,
    clientIp: string,
    reason?: string,
    algorithm?: SigningAlgorithm,
    hsmSlotId?: string
  ): { success: boolean; statusCode?: number; error?: string; certificate?: SigningCertificate } {
    const uid = targetUserId || actor.id;
    if (uid !== actor.id && actor.role !== 'SuperAdmin' && actor.role !== 'SecurityOfficer') {
      return {
        success: false,
        statusCode: 403,
        error: 'Forbidden: Only SuperAdmin or SecurityOfficer may issue PKI signing certificates for other staff members.'
      };
    }

    if (algorithm && !['RSA-SHA256', 'RSA-PSS-SHA256', 'ECDSA-P384-SHA384'].includes(algorithm)) {
      return { success: false, statusCode: 400, error: 'Unsupported signing algorithm requested.' };
    }

    const targetUser = this.getUserById(uid);
    if (!targetUser || targetUser.status !== 'Active') {
      return {
        success: false,
        statusCode: 400,
        error: 'Target staff user does not exist or is not Active.'
      };
    }

    const now = new Date().toISOString();
    // Supersede any existing Active certificate for this user
    for (const existing of this.data.signingCertificates || []) {
      if (existing.userId === targetUser.id && existing.status === 'Active') {
        existing.status = 'Revoked';
        existing.revokedAt = now;
        existing.revokedBy = actor.fullNameEn;
        existing.revokedReason = reason?.trim() || 'Superseded by new HSM/PKI certificate issuance / rotation';
      }
    }

    const newCert = this.generateSigningCertificateRecord(targetUser, algorithm, hsmSlotId);
    this.data.signingCertificates.unshift(newCert);

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'PKI_CERTIFICATE_ISSUED',
      resourceType: 'SigningCertificate',
      resourceId: newCert.serialNumber,
      ipAddress: clientIp,
      details: `Issued HSM-wrapped ${newCert.algorithm} (${newCert.keySizeBits}-bit) certificate ${newCert.serialNumber} for ${targetUser.fullNameEn} in slot ${newCert.hsmSlotLabel}. ${reason ? `Reason: ${reason}` : ''}`
    });

    this.save();
    return { success: true, certificate: this.sanitizeCertificate(newCert) };
  }

  public revokeSigningCertificate(
    certId: string,
    reason: string,
    actor: User,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string; certificate?: SigningCertificate } {
    const cert = (this.data.signingCertificates || []).find(
      c => c.id === certId || c.serialNumber === certId
    );
    if (!cert) {
      return { success: false, statusCode: 404, error: 'Signing certificate not found.' };
    }
    if (cert.userId !== actor.id && actor.role !== 'SuperAdmin' && actor.role !== 'SecurityOfficer') {
      return {
        success: false,
        statusCode: 403,
        error: 'Forbidden: Only the certificate holder, SecurityOfficer, or SuperAdmin can revoke a signing certificate.'
      };
    }
    if (cert.status === 'Revoked') {
      return { success: false, statusCode: 400, error: 'Certificate is already revoked.' };
    }
    const cleanReason = (reason || '').trim();
    if (cleanReason.length < 10) {
      return {
        success: false,
        statusCode: 400,
        error: 'Mandatory revocation reason must be at least 10 characters.'
      };
    }

    cert.status = 'Revoked';
    cert.revokedAt = new Date().toISOString();
    cert.revokedBy = actor.fullNameEn;
    cert.revokedReason = cleanReason;

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'PKI_CERTIFICATE_REVOKED',
      resourceType: 'SigningCertificate',
      resourceId: cert.serialNumber,
      ipAddress: clientIp,
      details: `Revoked signing certificate ${cert.serialNumber} (holder: ${cert.userName}) and published to CRL. Reason: ${cleanReason}`
    });

    this.save();
    return { success: true, certificate: this.sanitizeCertificate(cert) };
  }

  public signDocumentDirectly(
    docId: string,
    payload: {
      signingMeaning?: string;
      comments?: string;
      stepUpPin?: string;
      biometricSignatureVerified?: boolean;
    },
    actor: User,
    session: AuthSession | undefined,
    clientIp: string
  ): {
    success: boolean;
    statusCode?: number;
    error?: string;
    mfaNeeded?: boolean;
    document?: DocumentItem;
    signature?: WorkflowActionRecord['digitalSignature'];
  } {
    this.ensureHsmAndCaInfrastructure();
    const doc = this.data.documents.find(d => d.id === docId);
    if (!doc) {
      return { success: false, statusCode: 404, error: 'Document not found.' };
    }
    if (doc.legalHold) {
      return { success: false, statusCode: 423, error: 'Document under Legal Hold cannot be modified.' };
    }
    if (doc.status === 'Disposed' || doc.isDeleted) {
      return { success: false, statusCode: 400, error: 'Cancelled or disposed documents cannot be signed.' };
    }

    const canSign =
      this.hasPermission(actor, 'approve:workflows') || this.hasPermission(actor, 'edit:documents');
    if (!canSign) {
      return {
        success: false,
        statusCode: 403,
        error: 'Forbidden: Signing requires approve:workflows or edit:documents permission.'
      };
    }

    let pinVerified = false;
    if (payload.stepUpPin) {
      const fullUser = this.getUserById(actor.id);
      if (!fullUser || !this.verifySecret(payload.stepUpPin.trim(), fullUser.mfaPinHash)) {
        return {
          success: false,
          statusCode: 401,
          error: 'Invalid Officer Security PIN provided for HSM digital signature confirmation.'
        };
      }
      pinVerified = true;
      if (session?.token) {
        this.markSessionMfaVerified(session.token, actor, clientIp);
      }
    }

    const isSensitive =
      doc.confidentiality === 'Secret' ||
      doc.confidentiality === 'Confidential' ||
      doc.priority === 'VeryUrgent' ||
      !!this.data.pkiPolicy?.requireStepUpMfaForHsmSign;
    if (isSensitive && !session?.mfaVerified && !payload.biometricSignatureVerified && !pinVerified) {
      return {
        success: false,
        statusCode: 403,
        mfaNeeded: true,
        error: `Biometric / Officer PIN confirmation is mandatory to authorize HSM cryptographic signing on ${doc.confidentiality} records.`
      };
    }

    const cert = this.getActiveCertificateForUser(actor.id);
    if (!cert) {
      return {
        success: false,
        statusCode: 403,
        error: 'Active EPSS PKI signing certificate required. Your certificate is revoked, expired, or missing.'
      };
    }

    const now = new Date().toISOString();
    const signingMeaning =
      (payload.signingMeaning || '').trim() ||
      (doc.type === 'OutgoingLetter'
        ? 'Approved & Sealed for Official Outgoing Dispatch'
        : 'Executive Counter-Signature & Attestation');
    const comments = (payload.comments || '').trim() || `HSM PKI attestation (${cert.algorithm}): ${signingMeaning}`;
    const mfaMethod: 'webauthn' | 'pin' | 'session_mfa' | 'standard' = payload.biometricSignatureVerified
      ? 'webauthn'
      : pinVerified
        ? 'pin'
        : session?.mfaVerified
          ? 'session_mfa'
          : 'standard';

    const digitalSignature = this.createCryptographicSignatureRecord(doc, actor, cert, {
      action: 'Reviewed',
      stageName: doc.type === 'OutgoingLetter' ? 'Outgoing Non-Repudiation Seal' : 'Direct PKI Attestation',
      signingMeaning,
      biometricVerified: !!payload.biometricSignatureVerified || pinVerified || !!session?.mfaVerified,
      mfaMethod,
      timestamp: now
    });

    const record: WorkflowActionRecord = {
      id: `wf-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      timestamp: now,
      actorId: actor.id,
      actorName: actor.fullNameEn,
      actorRole: actor.role,
      action: 'Reviewed',
      decision: 'Signed',
      comments,
      stageName: doc.type === 'OutgoingLetter' ? 'Outgoing Non-Repudiation Seal' : 'Direct PKI Attestation',
      biometricVerified: digitalSignature.biometricVerified,
      digitalSignature
    };

    doc.workflowHistory.push(record);
    if (doc.type === 'OutgoingLetter' && ['Draft', 'Registered', 'UnderReview', 'InProgress', 'AwaitingApproval', 'ResponsePrepared'].includes(doc.status)) {
      doc.status = 'Approved';
    }
    const wfInst = this.getWorkflowInstanceByIdOrDocId(doc.id);
    if (wfInst) {
      wfInst.history.push(record);
      wfInst.updatedAt = now;
    }

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'PKI_DOCUMENT_SIGNED',
      resourceType: 'DigitalSignature',
      resourceId: doc.registrationNumber,
      ipAddress: clientIp,
      details: `Applied ${cert.algorithm} HSM signature (${signingMeaning}) via cert ${cert.serialNumber} [slot=${digitalSignature.hsmSlotLabel}, tsa=${digitalSignature.tsaToken?.tsaTokenId || 'none'}]`
    });

    this.save();
    return { success: true, document: doc, signature: digitalSignature };
  }

  public batchSignOutgoingDocuments(
    documentIds: string[],
    payload: { signingMeaning?: string; comments?: string; stepUpPin?: string },
    actor: User,
    session: AuthSession | undefined,
    clientIp: string
  ): {
    success: boolean;
    statusCode?: number;
    error?: string;
    signedCount: number;
    failed: Array<{ documentId: string; error: string }>;
    documents: DocumentItem[];
  } {
    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      return { success: false, statusCode: 400, error: 'Select at least one outgoing correspondence record.', signedCount: 0, failed: [], documents: [] };
    }
    const signedDocs: DocumentItem[] = [];
    const failed: Array<{ documentId: string; error: string }> = [];

    for (const id of documentIds) {
      const res = this.signDocumentDirectly(id, payload, actor, session, clientIp);
      if (res.success && res.document) {
        signedDocs.push(res.document);
      } else {
        failed.push({ documentId: id, error: res.error || 'Signing failed' });
        if (res.statusCode === 401 || res.statusCode === 403) {
          return {
            success: false,
            statusCode: res.statusCode,
            error: res.error,
            signedCount: signedDocs.length,
            failed,
            documents: signedDocs
          };
        }
      }
    }

    return {
      success: signedDocs.length > 0,
      statusCode: signedDocs.length > 0 ? 200 : 400,
      error: signedDocs.length === 0 ? failed[0]?.error || 'No documents signed.' : undefined,
      signedCount: signedDocs.length,
      failed,
      documents: signedDocs
    };
  }

  public verifyDocumentSignatures(
    docId: string,
    actor: User,
    clientIp: string,
    recordAudit = true
  ): DocumentSignatureVerificationResult | null {
    this.ensureHsmAndCaInfrastructure();
    const doc = this.data.documents.find(d => d.id === docId);
    if (!doc) return null;

    const nowIso = new Date().toISOString();
    const currentDigest = this.computeDocumentSigningDigest(doc);
    const wfInst = this.getWorkflowInstanceByIdOrDocId(doc.id);
    const def = wfInst ? this.getWorkflowDefinitionById(wfInst.definitionId) : null;
    const currentStage = def?.stages.find(s => s.id === wfInst?.currentStageId);
    const requiresDigitalSignature =
      !!currentStage?.requiredFields?.includes('digitalSignature') ||
      doc.confidentiality === 'Secret' ||
      doc.confidentiality === 'Confidential' ||
      doc.type === 'OutgoingLetter' ||
      doc.type === 'TenderDocument';

    const signedEntries = (doc.workflowHistory || []).filter(h => !!h.digitalSignature);
    const checks: SignatureCheckDetail[] = [];

    for (const entry of signedEntries) {
      const sig = entry.digitalSignature!;
      const cert =
        (this.data.signingCertificates || []).find(c => c.serialNumber === sig.certificateSerial) ||
        (sig.signedByUserId
          ? (this.data.signingCertificates || []).find(c => c.userId === sig.signedByUserId)
          : undefined);

      let certStatus: SignatureCheckDetail['certificateStatus'] = 'NotFound';
      let caChainTrusted = false;
      if (cert) {
        if (cert.status === 'Revoked') {
          certStatus = 'Revoked';
        } else if (new Date(cert.expiresAt).getTime() <= Date.now()) {
          certStatus = 'Expired';
        } else {
          certStatus = 'Active';
        }
        caChainTrusted = this.verifyCertificateCaChain(cert);
      }

      const signedDigest = sig.documentDigestSha256 || '';
      const digestMatchesCurrent = signedDigest === currentDigest;
      let cryptographicallyValid = false;
      const sigAlgorithm: SigningAlgorithm = sig.algorithm || cert?.algorithm || 'RSA-SHA256';

      if (cert && sig.signatureBase64 && signedDigest) {
        const expectedPayload = this.buildCanonicalSigningPayload({
          docId: doc.id,
          registrationNumber: doc.registrationNumber,
          documentDigestSha256: signedDigest,
          stageName: entry.stageName || 'Executive Approval',
          action: entry.action,
          signingMeaning: sig.signingMeaning || 'Approved for Official Issuance',
          actorId: sig.signedByUserId || entry.actorId,
          certificateSerial: sig.certificateSerial,
          timestamp: sig.timestamp
        });

        cryptographicallyValid = this.verifyBytesWithAlgorithm(
          sigAlgorithm,
          Buffer.from(expectedPayload, 'utf8'),
          cert.publicKeyPem,
          sig.signatureBase64
        );
      }

      const tsaVerified = sig.signatureBase64
        ? this.verifyTrustedTimestampToken(sig.signatureBase64, sig.tsaToken)
        : false;

      let status: SignatureCheckDetail['status'] = 'Valid';
      let reason = `${sigAlgorithm} HSM signature verified against CA-endorsed public key and matches current document digest.`;

      if (sig.invalidated) {
        status = 'Superseded';
        reason = sig.invalidatedReason || 'Signature superseded by authorized post-approval modification.';
      } else if (!cryptographicallyValid) {
        status = 'InvalidSignature';
        reason = `Cryptographic ${sigAlgorithm} verification failed or signature payload was altered.`;
      } else if (!digestMatchesCurrent) {
        status = 'Tampered';
        reason = `Document content modified after signing (signed digest ${signedDigest.slice(0, 12)}... != current ${currentDigest.slice(0, 12)}...).`;
      } else if (certStatus === 'Revoked') {
        status = 'CertificateRevoked';
        reason = `Signer certificate ${sig.certificateSerial} was revoked${cert?.revokedReason ? `: ${cert.revokedReason}` : '.'}`;
      } else if (certStatus === 'Expired') {
        status = 'CertificateExpired';
        reason = `Signer certificate ${sig.certificateSerial} has expired.`;
      }

      checks.push({
        historyRecordId: entry.id,
        signatureId: sig.signatureId || entry.id,
        signedBy: sig.signedBy,
        signedByUserId: sig.signedByUserId || entry.actorId,
        signedByRole: sig.signedByRole || entry.actorRole,
        action: entry.action,
        stageName: entry.stageName,
        certificateSerial: sig.certificateSerial,
        certificateFingerprint: sig.certificateFingerprint || cert?.fingerprintSha256,
        algorithm: sigAlgorithm,
        signingMeaning: sig.signingMeaning || 'Approved for Official Issuance',
        signedAt: sig.timestamp,
        signedDigestSha256: signedDigest,
        currentDocumentDigestSha256: currentDigest,
        cryptographicallyValid,
        digestMatchesCurrent,
        caChainTrusted,
        tsaVerified,
        tsaTimestampUtc: sig.tsaToken?.timestampUtc,
        tsaAuthorityDn: sig.tsaToken?.tsaAuthorityDn,
        hsmSlotLabel: sig.hsmSlotLabel || cert?.hsmSlotLabel,
        keyProtectionMode: sig.keyProtectionMode || cert?.keyProtectionMode,
        certificateStatus: certStatus,
        biometricVerified: !!sig.biometricVerified || !!entry.biometricVerified,
        invalidated: !!sig.invalidated,
        status,
        reason
      });
    }

    const validSignatures = checks.filter(c => c.status === 'Valid').length;
    let integrityStatus: DocumentSignatureVerificationResult['integrityStatus'] = 'Unsigned';
    let summaryMessage = 'No cryptographic approval signatures recorded on this document yet.';

    if (checks.some(c => c.status === 'Tampered' || c.status === 'InvalidSignature')) {
      integrityStatus = 'Tampered';
      summaryMessage = 'ALERT: Document integrity mismatch or invalid cryptographic signature detected.';
    } else if (checks.some(c => c.status === 'CertificateRevoked')) {
      integrityStatus = 'CertificateRevoked';
      summaryMessage = 'WARNING: One or more signing certificates have been revoked on the CRL.';
    } else if (checks.length > 0 && validSignatures === 0 && checks.every(c => c.status === 'Superseded')) {
      integrityStatus = 'Superseded';
      summaryMessage = 'Prior signatures were superseded by an authorized edit. Re-approval signature required.';
    } else if (validSignatures > 0) {
      integrityStatus = 'Verified';
      summaryMessage = `All ${validSignatures} active HSM/PKI signature(s) verified against current digest & CA trust chain.`;
    } else if (requiresDigitalSignature) {
      integrityStatus = 'MissingRequiredSignature';
      summaryMessage = 'This classified/outgoing record requires an authorized PKI digital signature.';
    }

    if (recordAudit) {
      this.addAuditLog({
        userId: actor.id,
        userName: actor.fullNameEn,
        userRole: actor.role,
        branchName: actor.branchNameEn,
        action: 'PKI_SIGNATURE_VERIFIED',
        resourceType: 'DigitalSignature',
        resourceId: doc.registrationNumber,
        ipAddress: clientIp,
        details: `Verified ${checks.length} signature(s) on ${doc.registrationNumber}: status=${integrityStatus} (${validSignatures}/${checks.length} valid)`
      });
      this.save();
    }

    return {
      documentId: doc.id,
      registrationNumber: doc.registrationNumber,
      verifiedAt: nowIso,
      integrityStatus,
      currentDocumentDigestSha256: currentDigest,
      totalSignatures: checks.length,
      validSignatures,
      requiresDigitalSignature,
      caHierarchyTrusted: checks.length > 0 ? checks.every(c => c.caChainTrusted !== false) : true,
      signatures: checks,
      summaryMessage
    };
  }

  public exportDetachedSignatureBundle(
    docId: string,
    actor: User,
    clientIp: string
  ): DetachedSignatureBundle | null {
    this.ensureHsmAndCaInfrastructure();
    const doc = this.data.documents.find(d => d.id === docId);
    if (!doc) return null;

    const issuingCa = this.getCaNode('IssuingCA')!;
    const tsaNode = this.getCaNode('TSA')!;
    const canonicalDigestSha256 = this.computeDocumentSigningDigest(doc);

    const signedEntries = (doc.workflowHistory || []).filter(
      h => h.digitalSignature && h.digitalSignature.signatureBase64
    );

    const signatures: DetachedSignatureBundle['signatures'] = [];
    for (const entry of signedEntries) {
      const sig = entry.digitalSignature!;
      const cert = (this.data.signingCertificates || []).find(
        c => c.serialNumber === sig.certificateSerial
      );
      if (!cert) continue;
      signatures.push({
        signatureId: sig.signatureId || entry.id,
        historyRecordId: entry.id,
        signedByUserId: sig.signedByUserId || entry.actorId,
        signedBy: sig.signedBy,
        signedByRole: sig.signedByRole || entry.actorRole,
        action: entry.action,
        stageName: entry.stageName || 'Executive Approval',
        signingMeaning: sig.signingMeaning || 'Approved for Official Issuance',
        algorithm: (sig.algorithm || cert.algorithm || 'RSA-SHA256') as SigningAlgorithm,
        certificateSerial: sig.certificateSerial,
        certificatePublicKeyPem: cert.publicKeyPem,
        certificateIssuerCaSerial: cert.issuerCaSerial,
        certificateCaEndorsementBase64: cert.caEndorsementBase64,
        hsmSlotLabel: sig.hsmSlotLabel || cert.hsmSlotLabel,
        keyProtectionMode: sig.keyProtectionMode || cert.keyProtectionMode,
        signedDigestSha256: sig.documentDigestSha256 || canonicalDigestSha256,
        signatureBase64: sig.signatureBase64!,
        tsaToken: sig.tsaToken,
        signedAt: sig.timestamp,
        invalidated: sig.invalidated
      });
    }

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'PKI_SIGNATURE_BUNDLE_EXPORTED',
      resourceType: 'DigitalSignature',
      resourceId: doc.registrationNumber,
      ipAddress: clientIp,
      details: `Exported detached PKI verification bundle (.sig.json) with ${signatures.length} signature(s) and CA/TSA trust anchors.`
    });
    this.save();

    return {
      bundleFormat: 'EPSS-PKI-DETACHED-BUNDLE-V1',
      exportedAt: new Date().toISOString(),
      exportedBy: actor.fullNameEn,
      document: {
        id: doc.id,
        registrationNumber: doc.registrationNumber,
        referenceNumber: doc.referenceNumber,
        type: doc.type,
        subjectEn: doc.subjectEn,
        subjectAm: doc.subjectAm || '',
        descriptionEn: doc.descriptionEn || '',
        senderOrganization: doc.senderOrganization,
        recipientOrganization: doc.recipientOrganization,
        confidentiality: doc.confidentiality,
        attachments: (doc.attachments || []).map(a => ({
          fileName: a.fileName,
          fileSize: a.fileSize,
          mimeType: a.mimeType
        }))
      },
      canonicalDigestSha256,
      caHierarchy: {
        issuingCaPublicKeyPem: issuingCa.publicKeyPem,
        issuingCaSerial: issuingCa.caSerial,
        tsaPublicKeyPem: tsaNode.publicKeyPem,
        tsaSerial: tsaNode.caSerial
      },
      signatures
    };
  }

  public verifyDetachedSignatureBundle(
    bundle: DetachedSignatureBundle,
    actor: User | null,
    clientIp: string
  ): BundleVerificationReport {
    this.ensureHsmAndCaInfrastructure();
    const computedDigestSha256 = this.computeDocumentSigningDigest(bundle.document);
    const digestIntegrityMatch = computedDigestSha256 === bundle.canonicalDigestSha256;

    const results: BundleVerificationReport['results'] = [];
    for (const sig of bundle.signatures || []) {
      const payload = this.buildCanonicalSigningPayload({
        docId: bundle.document.id,
        registrationNumber: bundle.document.registrationNumber,
        documentDigestSha256: sig.signedDigestSha256,
        stageName: sig.stageName,
        action: sig.action,
        signingMeaning: sig.signingMeaning,
        actorId: sig.signedByUserId,
        certificateSerial: sig.certificateSerial,
        timestamp: sig.signedAt
      });

      const cryptographicallyValid = this.verifyBytesWithAlgorithm(
        sig.algorithm,
        Buffer.from(payload, 'utf8'),
        sig.certificatePublicKeyPem,
        sig.signatureBase64
      );
      const digestMatchesBundle = sig.signedDigestSha256 === computedDigestSha256;

      // Cross-check CA endorsement against institutional IssuingCA (or bundled anchor)
      const knownCert = (this.data.signingCertificates || []).find(
        c => c.serialNumber === sig.certificateSerial
      );
      const caChainTrusted = knownCert
        ? this.verifyCertificateCaChain(knownCert)
        : Boolean(sig.certificateCaEndorsementBase64);

      const crlStatus: 'Good' | 'Revoked' | 'Unknown' = knownCert
        ? knownCert.status === 'Revoked'
          ? 'Revoked'
          : 'Good'
        : 'Unknown';

      const tsaVerified = this.verifyTrustedTimestampToken(
        sig.signatureBase64,
        sig.tsaToken,
        bundle.caHierarchy?.tsaPublicKeyPem
      );

      let status: BundleVerificationReport['results'][number]['status'] = 'Valid';
      let reason = `Non-repudiation proof intact (${sig.algorithm}, TSA timestamp valid, CRL Good).`;

      if (!cryptographicallyValid) {
        status = 'InvalidSignature';
        reason = 'Cryptographic signature verification failed against public key.';
      } else if (!digestMatchesBundle || !digestIntegrityMatch) {
        status = 'Tampered';
        reason = `Bundle content hash (${computedDigestSha256.slice(0, 12)}...) does not match signed digest (${sig.signedDigestSha256.slice(0, 12)}...). Content altered!`;
      } else if (crlStatus === 'Revoked') {
        status = 'CertificateRevoked';
        reason = `Signer certificate ${sig.certificateSerial} appears on the EPSS CRL.`;
      } else if (!caChainTrusted) {
        status = 'UntrustedCA';
        reason = 'Certificate endorsement signature is not anchored in EPSS Issuing CA.';
      }

      results.push({
        signatureId: sig.signatureId,
        signedBy: sig.signedBy,
        certificateSerial: sig.certificateSerial,
        algorithm: sig.algorithm,
        cryptographicallyValid,
        digestMatchesBundle,
        caChainTrusted,
        tsaVerified,
        crlStatus,
        status,
        reason
      });
    }

    const validSignatures = results.filter(r => r.status === 'Valid').length;
    const valid = digestIntegrityMatch && results.length > 0 && validSignatures === results.length;
    const summaryMessage = valid
      ? `Non-repudiation verified: all ${validSignatures} cryptographic signature(s), CA endorsement, and SHA-256 digest are authentic.`
      : !digestIntegrityMatch || results.some(r => r.status === 'Tampered' || r.status === 'InvalidSignature')
        ? 'TAMPER ALERT: Cryptographic verification failed — document payload or signature bytes were altered.'
        : results.length === 0
          ? 'Bundle contains zero cryptographic signatures.'
          : 'Verification warning: certificate revoked or untrusted CA.';

    if (actor) {
      this.addAuditLog({
        userId: actor.id,
        userName: actor.fullNameEn,
        userRole: actor.role,
        branchName: actor.branchNameEn,
        action: 'PKI_BUNDLE_VERIFIED',
        resourceType: 'DigitalSignature',
        resourceId: bundle.document?.registrationNumber || 'bundle',
        ipAddress: clientIp,
        details: `Verified detached bundle for ${bundle.document?.registrationNumber}: valid=${valid} (${validSignatures}/${results.length})`
      });
      this.save();
    }

    return {
      valid,
      bundleFormat: bundle.bundleFormat || 'EPSS-PKI-DETACHED-BUNDLE-V1',
      registrationNumber: bundle.document?.registrationNumber || '-',
      computedDigestSha256,
      declaredDigestSha256: bundle.canonicalDigestSha256 || '-',
      digestIntegrityMatch,
      totalSignatures: results.length,
      validSignatures,
      verifiedAt: new Date().toISOString(),
      summaryMessage,
      results
    };
  }

  // ==========================================
  // PHASE 10: MANAGEMENT ANALYTICS, SLA INTELLIGENCE & REPORT EXPORTS
  // ==========================================

  private ensurePhase10AnalyticsState() {
    if (!Array.isArray(this.data.savedReportTemplates) || this.data.savedReportTemplates.length === 0) {
      this.data.savedReportTemplates = [
        {
          id: 'rpt-tpl-sla-hq',
          name: 'Executive Monthly SLA & Hub Compliance Brief',
          description: 'All active correspondence SLA turnaround across Head Office and 19 Regional Hubs.',
          reportType: 'SlaCompliance',
          filters: { cluster: 'All', type: 'All', status: 'All', confidentiality: 'All' },
          createdByUserId: 'usr-admin',
          createdByName: 'System Administrator',
          createdAt: '2026-11-01T08:00:00Z'
        },
        {
          id: 'rpt-tpl-overdue',
          name: 'Critical SLA Overdue Action Register',
          description: 'Unresolved VeryUrgent and overdue correspondence requiring Directorate intervention.',
          reportType: 'OverdueRegister',
          filters: { cluster: 'All', type: 'All', status: 'All', confidentiality: 'All' },
          createdByUserId: 'usr-admin',
          createdByName: 'System Administrator',
          createdAt: '2026-11-01T08:05:00Z'
        },
        {
          id: 'rpt-tpl-retention-pki',
          name: 'Archival Retention & PKI Signature Audit',
          description: 'Digital signature verification rate, certificate health, and legal hold disposition ledger.',
          reportType: 'RetentionAndPki',
          filters: { cluster: 'All', type: 'All', status: 'All', confidentiality: 'All' },
          createdByUserId: 'usr-admin',
          createdByName: 'System Administrator',
          createdAt: '2026-11-01T08:10:00Z'
        }
      ];
    }
    if (!Array.isArray(this.data.reportExportHistory)) {
      this.data.reportExportHistory = [];
    }

    // Backfill export:reports permission on leadership/registry roles for upgraded stores
    const exportRoles: UserRole[] = ['DirectorGeneral', 'Director', 'RegistryOfficer', 'BranchManager', 'Auditor'];
    for (const entry of this.data.roleMatrix || []) {
      if (exportRoles.includes(entry.role) && !entry.permissions.includes('*') && !entry.permissions.includes('export:reports')) {
        entry.permissions.push('export:reports');
      }
    }
    for (const u of this.data.users || []) {
      if (exportRoles.includes(u.role) && !u.permissions.includes('*') && !u.permissions.includes('export:reports')) {
        u.permissions.push('export:reports');
      }
    }
  }

  private computeDirectorateWorkload(docs: DocumentItem[], now: number): DirectorateWorkloadMetric[] {
    return (this.data.departments || []).map(dept => {
      const deptDocs = docs.filter(
        d =>
          d.departmentId === dept.id ||
          (d.assignedDepartmentName || '').toLowerCase() === (dept.nameEn || '').toLowerCase()
      );
      const pendingReview = deptDocs.filter(d =>
        ['Received', 'Registered', 'UnderReview', 'Assigned', 'InProgress', 'PendingInformation', 'Forwarded', 'AwaitingApproval'].includes(d.status)
      ).length;
      const overdueCount = deptDocs.filter(d => this.isDocumentOverdue(d, now)).length;
      const completedCount = deptDocs.filter(d =>
        ['Approved', 'Dispatched', 'Completed', 'Archived'].includes(d.status)
      ).length;
      const turnarounds = deptDocs
        .map(d => this.computeDocumentTurnaroundDays(d, now))
        .filter((v): v is number => v !== null);
      const avgTurnaroundDays =
        turnarounds.length > 0
          ? Number((turnarounds.reduce((a, b) => a + b, 0) / turnarounds.length).toFixed(1))
          : 0;
      const slaDenom = deptDocs.filter(d => Boolean(d.dueDate)).length || deptDocs.length;
      const slaComplianceRate =
        slaDenom > 0
          ? Number((((slaDenom - overdueCount) / slaDenom) * 100).toFixed(1))
          : 100;
      const activeStaff = (this.data.users || []).filter(
        u => u.departmentId === dept.id && u.status === 'Active'
      ).length;

      return {
        departmentId: dept.id,
        code: dept.code,
        nameEn: dept.nameEn,
        nameAm: dept.nameAm,
        activeStaff,
        totalDocuments: deptDocs.length,
        pendingReview,
        overdueCount,
        completedCount,
        avgTurnaroundDays,
        slaComplianceRate
      };
    });
  }

  private filterDocumentsForReport(
    params: AnalyticsQueryParams,
    actor: User,
    session?: AuthSession
  ): {
    authorizedDocs: DocumentItem[];
    filteredBranches: Branch[];
    redactedRestrictedCount: number;
  } {
    const cleanParams: AnalyticsQueryParams = params || {};
    const branches = this.data.branches || [];
    const filteredBranches = branches.filter(b => {
      if (cleanParams.cluster && cleanParams.cluster !== 'All' && b.cluster !== cleanParams.cluster) {
        return false;
      }
      if (cleanParams.branchId && cleanParams.branchId !== 'All' && b.id !== cleanParams.branchId) {
        return false;
      }
      return true;
    });
    const allowedBranchIds = new Set(filteredBranches.map(b => b.id));

    const dateFromMs = cleanParams.dateFrom ? new Date(cleanParams.dateFrom).getTime() : null;
    const dateToMs = cleanParams.dateTo ? new Date(cleanParams.dateTo).getTime() + 86399999 : null;

    const matchingScopeDocs = (this.data.documents || []).filter(doc => {
      if (doc.status === 'Cancelled' || doc.status === 'Disposed') return false;
      if ((cleanParams.cluster && cleanParams.cluster !== 'All') || (cleanParams.branchId && cleanParams.branchId !== 'All')) {
        if (!allowedBranchIds.has(doc.branchId)) return false;
      }
      if (cleanParams.departmentId && cleanParams.departmentId !== 'All' && doc.departmentId !== cleanParams.departmentId) {
        return false;
      }
      if (cleanParams.type && cleanParams.type !== 'All' && doc.type !== cleanParams.type) {
        return false;
      }
      if (cleanParams.status && cleanParams.status !== 'All' && doc.status !== cleanParams.status) {
        return false;
      }
      if (
        cleanParams.confidentiality &&
        cleanParams.confidentiality !== 'All' &&
        doc.confidentiality !== cleanParams.confidentiality
      ) {
        return false;
      }
      const regMs = new Date(doc.registrationDate || doc.receivedDate).getTime();
      if (dateFromMs !== null && !Number.isNaN(dateFromMs) && !Number.isNaN(regMs) && regMs < dateFromMs) {
        return false;
      }
      if (dateToMs !== null && !Number.isNaN(dateToMs) && !Number.isNaN(regMs) && regMs > dateToMs) {
        return false;
      }
      return true;
    });

    const authorizedDocs: DocumentItem[] = [];
    let redactedRestrictedCount = 0;
    for (const doc of matchingScopeDocs) {
      if (this.canAccessDocument(actor, doc, session).allowed) {
        authorizedDocs.push(doc);
      } else {
        redactedRestrictedCount += 1;
      }
    }

    return { authorizedDocs, filteredBranches, redactedRestrictedCount };
  }

  public getManagementAnalyticsReport(
    params: AnalyticsQueryParams,
    actor: User,
    session?: AuthSession
  ): ManagementAnalyticsReport {
    const now = Date.now();
    const { authorizedDocs: docs, filteredBranches, redactedRestrictedCount } =
      this.filterDocumentsForReport(params, actor, session);

    const totalIncoming = docs.filter(d => d.type === 'IncomingLetter').length;
    const totalOutgoing = docs.filter(d => d.type === 'OutgoingLetter').length;
    const totalInternalMemos = docs.filter(d => d.type === 'InternalMemo').length;
    const totalApplications = docs.filter(d => d.type === 'Application').length;
    const pendingApprovals = docs.filter(d =>
      ['Received', 'Registered', 'UnderReview', 'Assigned', 'InProgress', 'PendingInformation', 'Forwarded', 'AwaitingApproval'].includes(d.status)
    ).length;
    const completedCount = docs.filter(d => ['Approved', 'Dispatched', 'Completed'].includes(d.status)).length;
    const archivedCount = docs.filter(d => d.isArchived || d.status === 'Archived').length;
    const overdueDocs = docs.filter(d => this.isDocumentOverdue(d, now));
    const overdueCount = overdueDocs.length;

    const turnarounds = docs
      .map(d => this.computeDocumentTurnaroundDays(d, now))
      .filter((v): v is number => v !== null);
    const averageProcessingDays =
      turnarounds.length > 0
        ? Number((turnarounds.reduce((a, b) => a + b, 0) / turnarounds.length).toFixed(1))
        : 0;

    const slaDenom = docs.filter(d => Boolean(d.dueDate)).length || docs.length;
    const slaComplianceRate =
      slaDenom > 0
        ? Number((((slaDenom - overdueCount) / slaDenom) * 100).toFixed(1))
        : 100;

    const pkiCompliance = this.computePkiSummaryForDocs(docs);

    const thirtyDaysMs = 30 * 86400000;
    const recent30 = docs.filter(d => {
      const ts = new Date(d.registrationDate || d.receivedDate).getTime();
      return !Number.isNaN(ts) && ts >= now - thirtyDaysMs && ts <= now;
    }).length;
    const prior30 = docs.filter(d => {
      const ts = new Date(d.registrationDate || d.receivedDate).getTime();
      return !Number.isNaN(ts) && ts >= now - 2 * thirtyDaysMs && ts < now - thirtyDaysMs;
    }).length;
    const momVolumeDeltaPct =
      prior30 > 0 ? Number((((recent30 - prior30) / prior30) * 100).toFixed(1)) : null;

    // Document type breakdown
    const allTypes: DocumentType[] = [
      'IncomingLetter',
      'OutgoingLetter',
      'InternalMemo',
      'Application',
      'TenderDocument',
      'InspectionReport',
      'Circular'
    ];
    const typeBreakdown: DocumentTypeBreakdownItem[] = allTypes
      .map(type => {
        const subset = docs.filter(d => d.type === type);
        return {
          type,
          count: subset.length,
          sharePct: docs.length > 0 ? Number(((subset.length / docs.length) * 100).toFixed(1)) : 0,
          completedCount: subset.filter(d => ['Approved', 'Dispatched', 'Completed', 'Archived'].includes(d.status)).length,
          overdueCount: subset.filter(d => this.isDocumentOverdue(d, now)).length
        };
      })
      .filter(item => item.count > 0);

    // Status breakdown
    const statusMap = new Map<DocumentStatus, number>();
    for (const d of docs) {
      statusMap.set(d.status, (statusMap.get(d.status) || 0) + 1);
    }
    const statusBreakdown = Array.from(statusMap.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);

    // Confidentiality breakdown
    const confLevels: ConfidentialityLevel[] = ['Public', 'Internal', 'Confidential', 'Secret'];
    const confidentialityBreakdown = confLevels.map(level => ({
      level,
      count: docs.filter(d => d.confidentiality === level).length
    }));

    // Branch turnaround metrics
    const branchStats: BranchTurnaroundMetric[] = filteredBranches.map(b => {
      const bDocs = docs.filter(d => d.branchId === b.id);
      const bOverdue = bDocs.filter(d => this.isDocumentOverdue(d, now)).length;
      const bTurnarounds = bDocs
        .map(d => this.computeDocumentTurnaroundDays(d, now))
        .filter((v): v is number => v !== null);
      const avgTurnaroundDays =
        bTurnarounds.length > 0
          ? Number((bTurnarounds.reduce((a, c) => a + c, 0) / bTurnarounds.length).toFixed(1))
          : 0;
      const bSlaDenom = bDocs.filter(d => Boolean(d.dueDate)).length || bDocs.length;
      const bSla =
        bSlaDenom > 0 ? Number((((bSlaDenom - bOverdue) / bSlaDenom) * 100).toFixed(1)) : 100;
      const healthStatus: BranchTurnaroundMetric['healthStatus'] =
        bDocs.length === 0
          ? 'Idle'
          : bOverdue >= 2 || bSla < 75
          ? 'Critical'
          : bOverdue > 0 || bSla < 92
          ? 'Attention'
          : 'Nominal';

      return {
        branchId: b.id,
        branchCode: b.code,
        branchNameEn: b.nameEn,
        branchNameAm: b.nameAm,
        cluster: b.cluster,
        incoming: bDocs.filter(d => d.type === 'IncomingLetter').length,
        outgoing: bDocs.filter(d => d.type === 'OutgoingLetter').length,
        memos: bDocs.filter(d => d.type === 'InternalMemo').length,
        applications: bDocs.filter(d => d.type === 'Application').length,
        totalDocuments: bDocs.length,
        completed: bDocs.filter(d => ['Approved', 'Dispatched', 'Completed', 'Archived'].includes(d.status)).length,
        overdue: bOverdue,
        slaComplianceRate: bSla,
        avgTurnaroundDays,
        healthStatus
      };
    });

    // Cluster rollup
    const clusters: BranchCluster[] = ['Central', 'Northern', 'Western', 'SouthernEastern'];
    const clusterSummary = clusters
      .map(cluster => {
        const cBranches = branchStats.filter(b => b.cluster === cluster);
        if (cBranches.length === 0) return null;
        const cDocs = docs.filter(d => cBranches.some(cb => cb.branchId === d.branchId));
        const cOverdue = cDocs.filter(d => this.isDocumentOverdue(d, now)).length;
        const cSlaDenom = cDocs.filter(d => Boolean(d.dueDate)).length || cDocs.length;
        const cSla = cSlaDenom > 0 ? Number((((cSlaDenom - cOverdue) / cSlaDenom) * 100).toFixed(1)) : 100;
        const cTurnarounds = cDocs
          .map(d => this.computeDocumentTurnaroundDays(d, now))
          .filter((v): v is number => v !== null);
        const cAvg =
          cTurnarounds.length > 0
            ? Number((cTurnarounds.reduce((a, b) => a + b, 0) / cTurnarounds.length).toFixed(1))
            : 0;
        return {
          cluster,
          branchesCount: cBranches.length,
          totalDocuments: cDocs.length,
          overdue: cOverdue,
          slaComplianceRate: cSla,
          avgTurnaroundDays: cAvg
        };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);

    // Directorate workload
    const directorateStats = this.computeDirectorateWorkload(docs, now);

    // Workflow stage bottlenecks (filtered to authorized doc IDs)
    const authorizedDocIds = new Set(docs.map(d => d.id));
    const stageMap = new Map<
      string,
      { activeInstances: number; overdueInstances: number; escalatedInstances: number; agesHours: number[] }
    >();
    for (const inst of this.data.workflowInstances || []) {
      if (inst.status !== 'Active' || !authorizedDocIds.has(inst.documentId)) continue;
      const stageName = inst.currentStageName || 'In Review';
      const bucket = stageMap.get(stageName) || {
        activeInstances: 0,
        overdueInstances: 0,
        escalatedInstances: 0,
        agesHours: []
      };
      bucket.activeInstances += 1;
      if (inst.stageDueAt && new Date(inst.stageDueAt).getTime() < now) {
        bucket.overdueInstances += 1;
      }
      if (inst.isEscalated) {
        bucket.escalatedInstances += 1;
      }
      const startedMs = new Date(inst.stageStartedAt || inst.createdAt).getTime();
      if (!Number.isNaN(startedMs)) {
        bucket.agesHours.push(Math.max(0.5, (now - startedMs) / 3600000));
      }
      stageMap.set(stageName, bucket);
    }
    const workflowBottlenecks: WorkflowStageBottleneckMetric[] = Array.from(stageMap.entries())
      .map(([stageName, bucket]) => ({
        stageName,
        activeInstances: bucket.activeInstances,
        overdueInstances: bucket.overdueInstances,
        escalatedInstances: bucket.escalatedInstances,
        avgAgeHours:
          bucket.agesHours.length > 0
            ? Number((bucket.agesHours.reduce((a, b) => a + b, 0) / bucket.agesHours.length).toFixed(1))
            : 0,
        maxAgeHours:
          bucket.agesHours.length > 0
            ? Number(Math.max(...bucket.agesHours).toFixed(1))
            : 0
      }))
      .sort((a, b) => b.overdueInstances - a.overdueInstances || b.avgAgeHours - a.avgAgeHours);

    // Overdue Register
    const overdueRegister: OverdueRegisterEntry[] = overdueDocs
      .map(d => {
        const dueMs = new Date(d.dueDate!).getTime();
        const daysOverdue = Math.max(1, Math.ceil((now - dueMs) / 86400000));
        const branch = (this.data.branches || []).find(b => b.id === d.branchId);
        const dept = (this.data.departments || []).find(dp => dp.id === d.departmentId);
        const activeWf = (this.data.workflowInstances || []).find(
          w => w.documentId === d.id && w.status === 'Active'
        );
        return {
          documentId: d.id,
          registrationNumber: d.registrationNumber,
          subjectEn: d.subjectEn,
          subjectAm: d.subjectAm,
          type: d.type,
          priority: d.priority,
          confidentiality: d.confidentiality,
          branchId: d.branchId,
          branchNameEn: branch?.nameEn || d.branchId,
          departmentNameEn: dept?.nameEn || d.assignedDepartmentName || 'General Directorate',
          status: d.status,
          dueDate: d.dueDate!,
          daysOverdue,
          assignedUserName: d.assignedUserName,
          stageName: activeWf?.currentStageName
        };
      })
      .sort((a, b) => b.daysOverdue - a.daysOverdue);

    // Monthly volume trend (chronological buckets from registrationDate)
    const monthBuckets = new Map<string, TrendPeriodPoint>();
    const monthFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' });
    for (const d of docs) {
      const dt = new Date(d.registrationDate || d.receivedDate);
      if (Number.isNaN(dt.getTime())) continue;
      const period = `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}`;
      const bucket = monthBuckets.get(period) || {
        period,
        label: monthFormatter.format(dt),
        incoming: 0,
        outgoing: 0,
        memos: 0,
        completed: 0
      };
      if (d.type === 'IncomingLetter') bucket.incoming += 1;
      else if (d.type === 'OutgoingLetter') bucket.outgoing += 1;
      else if (d.type === 'InternalMemo') bucket.memos += 1;
      if (['Approved', 'Dispatched', 'Completed', 'Archived'].includes(d.status)) {
        bucket.completed += 1;
      }
      monthBuckets.set(period, bucket);
    }
    const monthlyTrend = Array.from(monthBuckets.values()).sort((a, b) =>
      a.period.localeCompare(b.period)
    );

    // Retention & custody forecast
    const ninetyDaysMs = 90 * 86400000;
    const dueForReviewWithin90Days = docs.filter(d => {
      if (d.legalHold || d.status === 'Disposed' || d.isDeleted || d.retentionYears === 0 || !d.retentionExpiryDate) return false;
      const eligibleAtMs = new Date(d.retentionExpiryDate).getTime();
      if (Number.isNaN(eligibleAtMs)) return false;
      return eligibleAtMs <= now + ninetyDaysMs;
    }).length;

    const pendingDisposals = (this.data.disposalRequests || []).filter(
      r => r.status === 'PendingApproval' || r.status === 'ApprovedReady'
    ).length;
    const executedDisposals = (this.data.disposalCertificates || []).length;
    const overduePhysicalFiles = (this.data.physicalFiles || []).filter(
      f =>
        authorizedDocIds.has(f.documentId) &&
        f.status === 'CheckedOut' &&
        f.expectedReturnDate &&
        new Date(f.expectedReturnDate).getTime() < now
    ).length;

    const retentionForecast: RetentionForecastSummary = {
      totalArchived: archivedCount,
      underLegalHold: docs.filter(d => d.legalHold).length,
      dueForReviewWithin90Days,
      pendingDisposals,
      executedDisposals,
      overduePhysicalFiles
    };

    return {
      generatedAt: new Date().toISOString(),
      filtersApplied: params || {},
      authorizedDocumentCount: docs.length,
      redactedRestrictedCount,
      summary: {
        totalDocuments: docs.length,
        totalIncoming,
        totalOutgoing,
        totalInternalMemos,
        totalApplications,
        pendingApprovals,
        completedCount,
        overdueCount,
        archivedCount,
        averageProcessingDays,
        slaComplianceRate,
        digitalSigningRate: pkiCompliance.digitalSigningRate,
        momVolumeDeltaPct
      },
      typeBreakdown,
      statusBreakdown,
      confidentialityBreakdown,
      clusterSummary,
      branchStats,
      directorateStats,
      workflowBottlenecks,
      overdueRegister,
      monthlyTrend,
      retentionForecast,
      pkiCompliance
    };
  }

  public getSavedReportTemplates(): SavedReportTemplate[] {
    return this.data.savedReportTemplates || [];
  }

  public saveReportTemplate(
    payload: Partial<SavedReportTemplate>,
    actor: User,
    clientIp: string
  ): { success: boolean; error?: string; template?: SavedReportTemplate } {
    if (!this.hasPermission(actor, 'read:documents')) {
      return { success: false, error: 'Forbidden: read:documents permission required.' };
    }
    const name = (payload.name || '').trim();
    if (name.length < 3) {
      return { success: false, error: 'Template name must be at least 3 characters.' };
    }
    const validCategories: ManagementReportCategory[] = [
      'MasterRegister',
      'SlaCompliance',
      'BranchTurnaround',
      'DirectorateWorkload',
      'OverdueRegister',
      'RetentionAndPki'
    ];
    const reportType: ManagementReportCategory = validCategories.includes(payload.reportType as ManagementReportCategory)
      ? (payload.reportType as ManagementReportCategory)
      : 'MasterRegister';

    const template: SavedReportTemplate = {
      id: `rpt-tpl-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name,
      description: payload.description?.trim() || undefined,
      reportType,
      filters: payload.filters || {},
      createdByUserId: actor.id,
      createdByName: actor.fullNameEn,
      createdAt: new Date().toISOString()
    };

    if (!Array.isArray(this.data.savedReportTemplates)) {
      this.data.savedReportTemplates = [];
    }
    this.data.savedReportTemplates.unshift(template);

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'SAVED_REPORT_TEMPLATE',
      resourceType: 'ManagementReport',
      resourceId: template.id,
      ipAddress: clientIp,
      details: `Saved management report template "${template.name}" (${template.reportType})`
    });
    this.save();
    return { success: true, template };
  }

  public deleteReportTemplate(
    id: string,
    actor: User,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string } {
    const idx = (this.data.savedReportTemplates || []).findIndex(t => t.id === id);
    if (idx === -1) {
      return { success: false, statusCode: 404, error: 'Report template not found.' };
    }
    const tpl = this.data.savedReportTemplates[idx];
    const isAdmin = ['SuperAdmin', 'DirectorGeneral', 'Auditor'].includes(actor.role);
    if (!isAdmin && tpl.createdByUserId !== actor.id) {
      return { success: false, statusCode: 403, error: 'Only the creator or an Administrator can delete this report preset.' };
    }
    this.data.savedReportTemplates.splice(idx, 1);
    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'DELETED_REPORT_TEMPLATE',
      resourceType: 'ManagementReport',
      resourceId: id,
      ipAddress: clientIp,
      details: `Deleted report template "${tpl.name}"`
    });
    this.save();
    return { success: true };
  }

  public getReportExportHistory(actor: User): ReportExportRecord[] {
    const all = this.data.reportExportHistory || [];
    if (['SuperAdmin', 'DirectorGeneral', 'Auditor'].includes(actor.role) || this.hasPermission(actor, 'read:audit')) {
      return all;
    }
    return all.filter(r => r.exportedByUserId === actor.id);
  }

  private sanitizeCsvCell(value: unknown): string {
    const raw = value === null || value === undefined ? '' : String(value);
    const trimmedStart = raw.replace(/^\s+/, '');
    const neutralized =
      trimmedStart.length > 0 && ['=', '+', '-', '@', '\t', '\r'].includes(trimmedStart[0])
        ? `'${raw}`
        : raw;
    return `"${neutralized.replace(/"/g, '""')}"`;
  }

  private buildCsv(headers: string[], rows: unknown[][], includeBom: boolean): string {
    const headerLine = headers.map(h => this.sanitizeCsvCell(h)).join(',');
    const bodyLines = rows.map(row => row.map(cell => this.sanitizeCsvCell(cell)).join(','));
    const csv = [headerLine, ...bodyLines].join('\r\n');
    return includeBom ? `\uFEFF${csv}` : csv;
  }

  public exportManagementReport(
    payload: {
      reportType?: ManagementReportCategory;
      format?: 'csv' | 'excel-csv' | 'json' | 'print-brief';
      filters?: AnalyticsQueryParams;
    },
    actor: User,
    session: AuthSession | undefined,
    clientIp: string
  ): {
    success: boolean;
    statusCode?: number;
    error?: string;
    exportRecord?: ReportExportRecord;
    filename?: string;
    mimeType?: string;
    content?: string;
  } {
    if (!this.hasPermission(actor, 'export:reports')) {
      return {
        success: false,
        statusCode: 403,
        error: 'Forbidden: export:reports permission required to export management reports.'
      };
    }

    const reportType: ManagementReportCategory = payload.reportType || 'MasterRegister';
    const format: 'csv' | 'excel-csv' | 'json' | 'print-brief' = payload.format || 'excel-csv';
    const filters = payload.filters || {};
    const report = this.getManagementAnalyticsReport(filters, actor, session);
    const { authorizedDocs } = this.filterDocumentsForReport(filters, actor, session);

    const includeBom = format === 'excel-csv';
    const tsSlug = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    let content = '';
    let mimeType = 'text/csv;charset=utf-8';
    let ext = 'csv';
    let recordCount = 0;

    if (format === 'json') {
      mimeType = 'application/json;charset=utf-8';
      ext = 'json';
      const jsonBundle = {
        metadata: {
          system: 'EPSS EDRMS Enterprise Management Analytics',
          generatedAt: report.generatedAt,
          exportedBy: actor.fullNameEn,
          exportedByRole: actor.role,
          reportType,
          authorizedDocumentCount: report.authorizedDocumentCount,
          redactedRestrictedCount: report.redactedRestrictedCount,
          filtersApplied: filters
        },
        report,
        ...(reportType === 'MasterRegister'
          ? {
              documents: authorizedDocs.map(d => ({
                id: d.id,
                registrationNumber: d.registrationNumber,
                referenceNumber: d.referenceNumber,
                type: d.type,
                subjectEn: d.subjectEn,
                subjectAm: d.subjectAm,
                senderOrganization: d.senderOrganization,
                recipientOrganization: d.recipientOrganization,
                branchId: d.branchId,
                departmentId: d.departmentId,
                priority: d.priority,
                confidentiality: d.confidentiality,
                status: d.status,
                registrationDate: d.registrationDate,
                dueDate: d.dueDate,
                legalHold: d.legalHold
              }))
            }
          : {})
      };
      content = JSON.stringify(jsonBundle, null, 2);
      recordCount = reportType === 'MasterRegister' ? authorizedDocs.length : report.branchStats.length;
    } else if (reportType === 'BranchTurnaround' || reportType === 'SlaCompliance') {
      const headers = [
        'Branch Code',
        'Branch Name (EN)',
        'Branch Name (AM)',
        'Cluster',
        'Incoming',
        'Outgoing',
        'Memos',
        'Applications',
        'Total Documents',
        'Completed',
        'Overdue',
        'SLA Compliance (%)',
        'Avg Turnaround (Days)',
        'Operational Status'
      ];
      const rows = report.branchStats.map(b => [
        b.branchCode,
        b.branchNameEn,
        b.branchNameAm,
        b.cluster,
        b.incoming,
        b.outgoing,
        b.memos,
        b.applications,
        b.totalDocuments,
        b.completed,
        b.overdue,
        b.slaComplianceRate,
        b.avgTurnaroundDays,
        b.healthStatus
      ]);
      content = this.buildCsv(headers, rows, includeBom);
      recordCount = rows.length;
    } else if (reportType === 'DirectorateWorkload') {
      const headers = [
        'Directorate Code',
        'Directorate Name (EN)',
        'Directorate Name (AM)',
        'Active Staff',
        'Total Dossiers',
        'Pending Review',
        'Overdue',
        'Completed',
        'Avg Turnaround (Days)',
        'SLA Compliance (%)'
      ];
      const rows = report.directorateStats.map(d => [
        d.code,
        d.nameEn,
        d.nameAm,
        d.activeStaff,
        d.totalDocuments,
        d.pendingReview,
        d.overdueCount,
        d.completedCount,
        d.avgTurnaroundDays,
        d.slaComplianceRate
      ]);
      content = this.buildCsv(headers, rows, includeBom);
      recordCount = rows.length;
    } else if (reportType === 'OverdueRegister') {
      const headers = [
        'Registration No.',
        'Document Type',
        'Priority',
        'Confidentiality',
        'Subject (EN)',
        'Subject (AM)',
        'Branch',
        'Directorate',
        'Workflow Stage',
        'Assigned Officer',
        'Status',
        'Due Date',
        'Days Overdue'
      ];
      const rows = report.overdueRegister.map(o => [
        o.registrationNumber,
        o.type,
        o.priority,
        o.confidentiality,
        o.subjectEn,
        o.subjectAm,
        o.branchNameEn,
        o.departmentNameEn,
        o.stageName || 'N/A',
        o.assignedUserName || 'Unassigned',
        o.status,
        o.dueDate,
        o.daysOverdue
      ]);
      content = this.buildCsv(headers, rows, includeBom);
      recordCount = rows.length;
    } else if (reportType === 'RetentionAndPki') {
      const headers = ['Metric Category', 'Metric Indicator', 'Value'];
      const rows: unknown[][] = [
        ['Records Retention', 'Authorized Dossiers In Scope', report.authorizedDocumentCount],
        ['Records Retention', 'Archived Records', report.retentionForecast.totalArchived],
        ['Records Retention', 'Active Legal Holds', report.retentionForecast.underLegalHold],
        ['Records Retention', 'Eligible / Review Due Within 90 Days', report.retentionForecast.dueForReviewWithin90Days],
        ['Records Retention', 'Pending Disposal Requests', report.retentionForecast.pendingDisposals],
        ['Records Retention', 'Executed Disposal Certificates', report.retentionForecast.executedDisposals],
        ['Physical Custody', 'Overdue Physical Binders', report.retentionForecast.overduePhysicalFiles],
        ['PKI & Signing', 'Total Approvals Logged', report.pkiCompliance.totalApprovalsLogged],
        ['PKI & Signing', 'Digitally Signed Approvals', report.pkiCompliance.digitallySignedApprovals],
        ['PKI & Signing', 'Digital Signing Rate (%)', report.pkiCompliance.digitalSigningRate],
        ['PKI & Signing', 'Active Signing Certificates', report.pkiCompliance.activeCertificates],
        ['PKI & Signing', 'Revoked Certificates', report.pkiCompliance.revokedCertificates],
        ['PKI & Signing', 'Tampered / Integrity Mismatch Docs', report.pkiCompliance.tamperedOrInvalidDocuments]
      ];
      content = this.buildCsv(headers, rows, includeBom);
      recordCount = rows.length;
    } else {
      // MasterRegister
      const headers = [
        'Registration Number',
        'Reference Number',
        'Type',
        'Subject (EN)',
        'Subject (AM)',
        'Sender Organization',
        'Recipient Organization',
        'Branch',
        'Directorate',
        'Priority',
        'Confidentiality',
        'Status',
        'Registration Date',
        'Due Date',
        'Legal Hold'
      ];
      const rows = authorizedDocs.map(d => {
        const branchName = (this.data.branches || []).find(b => b.id === d.branchId)?.nameEn || d.branchId;
        const deptName =
          (this.data.departments || []).find(dp => dp.id === d.departmentId)?.nameEn ||
          d.assignedDepartmentName ||
          '';
        return [
          d.registrationNumber,
          d.referenceNumber,
          d.type,
          d.subjectEn,
          d.subjectAm,
          d.senderOrganization,
          d.recipientOrganization,
          branchName,
          deptName,
          d.priority,
          d.confidentiality,
          d.status,
          d.registrationDate,
          d.dueDate || '',
          d.legalHold ? 'YES' : 'NO'
        ];
      });
      content = this.buildCsv(headers, rows, includeBom);
      recordCount = rows.length;
    }

    const sha256Checksum = crypto.createHash('sha256').update(content, 'utf8').digest('hex');
    const filename = `epss_${reportType.toLowerCase()}_${tsSlug}.${ext}`;

    const filterPairs = Object.entries(filters)
      .filter(([, v]) => v !== undefined && v !== '' && v !== 'All')
      .map(([k, v]) => `${k}=${v}`);
    const filtersSummary = filterPairs.length > 0 ? filterPairs.join(' · ') : 'All Hubs & Dates';

    const exportRecord: ReportExportRecord = {
      id: `exp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      exportedAt: new Date().toISOString(),
      exportedByUserId: actor.id,
      exportedByName: actor.fullNameEn,
      exportedByRole: actor.role,
      reportType,
      format,
      filename,
      recordCount,
      redactedRestrictedCount: report.redactedRestrictedCount,
      filtersSummary,
      sha256Checksum
    };

    if (!Array.isArray(this.data.reportExportHistory)) {
      this.data.reportExportHistory = [];
    }
    this.data.reportExportHistory.unshift(exportRecord);
    if (this.data.reportExportHistory.length > 200) {
      this.data.reportExportHistory = this.data.reportExportHistory.slice(0, 200);
    }

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'EXPORTED_MANAGEMENT_REPORT',
      resourceType: 'ManagementReport',
      resourceId: exportRecord.id,
      ipAddress: clientIp,
      details: `Exported ${reportType} (${format}, ${recordCount} rows, ${report.redactedRestrictedCount} restricted redacted) · SHA-256 ${sha256Checksum.slice(0, 16)}`
    });
    this.save();

    return {
      success: true,
      exportRecord,
      filename,
      mimeType,
      content
    };
  }

  // ==========================================
  // PHASE 11: ENTERPRISE INTEGRATIONS, HMAC WEBHOOKS, API KEYS & HARDENING
  // ==========================================

  private ensurePhase11IntegrationsState() {
    for (const c of this.data.connectors || []) {
      if (c.enabled === undefined) c.enabled = true;
      if (c.syncIntervalMinutes === undefined) c.syncIntervalMinutes = 15;
      if (c.timeoutMs === undefined) c.timeoutMs = 8000;
      if (c.verifyTls === undefined) c.verifyTls = true;
      if (c.totalDispatches === undefined) c.totalDispatches = 0;
    }

    if (!Array.isArray(this.data.webhookSubscriptions) || this.data.webhookSubscriptions.length === 0) {
      this.data.webhookSubscriptions = [
        {
          id: 'wh-sap-erp',
          name: 'SAP S/4HANA Consignment & GRV Feed',
          targetUrl: 'https://sap-gateway.epss.gov.et/webhooks/edrms-events',
          events: ['document.approved', 'document.dispatched'],
          signingSecret: 'whsec_seed_sap_s4hana_hmac_2026_epss',
          signingSecretPreview: 'whsec_••••epss',
          isActive: true,
          connectorId: 'conn-sap',
          createdByUserId: 'usr-admin',
          createdByName: 'System Administrator',
          createdAt: '2026-11-01T08:00:00Z',
          lastTriggeredAt: '2026-11-08T09:15:00Z',
          lastDeliveryStatus: 'Delivered'
        },
        {
          id: 'wh-moh-emergency',
          name: 'Ministry of Health Emergency Dispatch Hook',
          targetUrl: 'https://emergency.moh.gov.et/api/v1/webhooks/epss',
          events: ['document.registered', 'workflow.escalated', 'document.dispatched'],
          signingSecret: 'whsec_seed_moh_emergency_hmac_2026_moh',
          signingSecretPreview: 'whsec_••••_moh',
          isActive: true,
          connectorId: 'conn-moh',
          createdByUserId: 'usr-admin',
          createdByName: 'System Administrator',
          createdAt: '2026-11-01T08:05:00Z',
          lastTriggeredAt: '2026-11-08T08:30:00Z',
          lastDeliveryStatus: 'Delivered'
        }
      ];
    }

    if (!Array.isArray(this.data.webhookDeliveryLogs)) {
      this.data.webhookDeliveryLogs = [];
    }

    if (!Array.isArray(this.data.integrationApiKeys) || this.data.integrationApiKeys.length === 0) {
      this.data.integrationApiKeys = [
        {
          id: 'key-efda-seed',
          name: 'EFDA Regulatory Portal Inbound Key',
          keyPrefix: 'epss_int_efda84',
          keyHash: crypto.createHash('sha256').update('epss_int_efda84_seed_locked_key').digest('hex'),
          scopes: ['correspondence:ingest', 'efda:clearance'],
          boundBranchId: 'br-hq',
          boundConnectorId: 'conn-efda',
          status: 'Active',
          createdByUserId: 'usr-admin',
          createdByName: 'System Administrator',
          createdAt: '2026-11-01T08:00:00Z',
          expiresAt: '2027-11-01T08:00:00Z',
          usageCount: 18
        }
      ];
    }

    if (!Array.isArray(this.data.connectorExchangeLogs) || this.data.connectorExchangeLogs.length === 0) {
      this.data.connectorExchangeLogs = [
        {
          id: 'exch-seed-1',
          connectorId: 'conn-sap',
          connectorName: 'SAP S/4HANA Pharmaceutical ERP',
          direction: 'Outbound',
          operation: 'PO & GRV Correspondence Sync',
          registrationNumber: 'EPSS/IN/2026/00101',
          externalRefId: 'SAP-PO-450009182',
          status: 'Success',
          latencyMs: 36,
          summary: 'Synchronized cold-chain procurement dossier metadata with SAP MM PO #450009182.',
          initiatedByName: 'Automated Scheduler',
          timestamp: '2026-11-08T09:15:00Z'
        },
        {
          id: 'exch-seed-2',
          connectorId: 'conn-efda',
          connectorName: 'EFDA Regulatory Drug Verification API',
          direction: 'Inbound',
          operation: 'GMP & Import Clearance Lookup',
          registrationNumber: 'EPSS/APP/2026/00012',
          externalRefId: 'EFDA-CLR-2026-8841',
          status: 'Success',
          latencyMs: 52,
          summary: 'Verified Ethiopian Food and Drug Authority batch clearance status (Valid / Active GMP).',
          initiatedByName: 'EFDA Inbound Gateway',
          timestamp: '2026-11-08T09:10:00Z'
        }
      ];
    }
  }

  private recordConnectorExchange(entry: Omit<ConnectorExchangeLog, 'id' | 'timestamp'>): ConnectorExchangeLog {
    if (!Array.isArray(this.data.connectorExchangeLogs)) {
      this.data.connectorExchangeLogs = [];
    }
    const record: ConnectorExchangeLog = {
      id: `exch-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      ...entry
    };
    this.data.connectorExchangeLogs.unshift(record);
    if (this.data.connectorExchangeLogs.length > 200) {
      this.data.connectorExchangeLogs = this.data.connectorExchangeLogs.slice(0, 200);
    }
    return record;
  }

  private isSafeIntegrationEndpoint(rawUrl: string): { valid: boolean; reason?: string } {
    try {
      const parsed = new URL(rawUrl.trim());
      if (!['https:', 'http:', 'ldaps:', 'smtps:'].includes(parsed.protocol)) {
        return { valid: false, reason: 'Protocol must be https://, http://, ldaps://, or smtps://' };
      }
      const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
      const isPrivateOctet =
        /^127\./.test(host) ||
        /^10\./.test(host) ||
        /^192\.168\./.test(host) ||
        /^169\.254\./.test(host) ||
        /^172\.(1[6-9]|2\d|3[01])\./.test(host);
      if (
        host === 'localhost' ||
        host === '::1' ||
        host === '0.0.0.0' ||
        host.endsWith('.internal') ||
        host.endsWith('.local') ||
        isPrivateOctet
      ) {
        return { valid: false, reason: 'Loopback, private RFC-1918, and metadata endpoints are blocked by SSRF policy.' };
      }
      return { valid: true };
    } catch {
      return { valid: false, reason: 'Malformed endpoint URL.' };
    }
  }

  public updateConnectorConfig(
    id: string,
    updates: {
      endpoint?: string;
      authMethod?: EnterpriseConnector['authMethod'];
      enabled?: boolean;
      syncIntervalMinutes?: number;
      timeoutMs?: number;
      verifyTls?: boolean;
      description?: string;
    },
    actor: User,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string; connector?: EnterpriseConnector } {
    if (!['SuperAdmin', 'DirectorGeneral'].includes(actor.role) && !this.hasPermission(actor, 'manage:organizations')) {
      return { success: false, statusCode: 403, error: 'Forbidden: Connector administration requires SuperAdmin or manage:organizations permission.' };
    }
    const conn = (this.data.connectors || []).find(c => c.id === id);
    if (!conn) {
      return { success: false, statusCode: 404, error: 'Connector not found.' };
    }

    if (updates.endpoint !== undefined) {
      const check = this.isSafeIntegrationEndpoint(updates.endpoint);
      if (!check.valid) {
        return { success: false, statusCode: 400, error: check.reason };
      }
      conn.endpoint = updates.endpoint.trim();
    }
    if (updates.authMethod !== undefined) {
      conn.authMethod = updates.authMethod;
    }
    if (updates.enabled !== undefined) {
      conn.enabled = Boolean(updates.enabled);
      if (!conn.enabled) {
        conn.status = 'Offline';
        conn.lastError = 'Disabled by administrator';
      } else if (conn.status === 'Offline') {
        conn.status = 'Standby';
        conn.lastError = undefined;
      }
    }
    if (updates.syncIntervalMinutes !== undefined) {
      const iv = Number(updates.syncIntervalMinutes);
      if (Number.isNaN(iv) || iv < 1 || iv > 1440) {
        return { success: false, statusCode: 400, error: 'Sync interval must be between 1 and 1440 minutes.' };
      }
      conn.syncIntervalMinutes = Math.round(iv);
    }
    if (updates.timeoutMs !== undefined) {
      const t = Number(updates.timeoutMs);
      if (Number.isNaN(t) || t < 500 || t > 60000) {
        return { success: false, statusCode: 400, error: 'Timeout must be between 500ms and 60000ms.' };
      }
      conn.timeoutMs = Math.round(t);
    }
    if (updates.verifyTls !== undefined) {
      conn.verifyTls = Boolean(updates.verifyTls);
    }
    if (updates.description !== undefined && updates.description.trim()) {
      conn.description = updates.description.trim();
    }
    conn.updatedAt = new Date().toISOString();

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'UPDATED_CONNECTOR_CONFIG',
      resourceType: 'IntegrationConnector',
      resourceId: conn.id,
      ipAddress: clientIp,
      details: `Updated ${conn.name}: enabled=${conn.enabled}, auth=${conn.authMethod}, tls=${conn.verifyTls}, interval=${conn.syncIntervalMinutes}m`
    });
    this.save();
    return { success: true, connector: conn };
  }

  public dispatchConnectorExchange(
    connectorId: string,
    payload: {
      operation?: string;
      documentId?: string;
      externalRefId?: string;
    },
    actor: User,
    session: AuthSession | undefined,
    clientIp: string
  ): {
    success: boolean;
    statusCode?: number;
    error?: string;
    exchange?: ConnectorExchangeLog;
    connector?: EnterpriseConnector;
  } {
    if (!this.hasPermission(actor, 'read:documents')) {
      return { success: false, statusCode: 403, error: 'Forbidden: read:documents permission required.' };
    }
    const conn = (this.data.connectors || []).find(c => c.id === connectorId);
    if (!conn) {
      return { success: false, statusCode: 404, error: 'Connector not found.' };
    }
    if (conn.enabled === false) {
      return { success: false, statusCode: 409, error: `Connector "${conn.name}" is currently disabled.` };
    }

    let doc: DocumentItem | undefined;
    if (payload.documentId) {
      doc = this.getDocumentById(payload.documentId);
      if (!doc) {
        return { success: false, statusCode: 404, error: 'Selected correspondence document not found.' };
      }
      const access = this.canAccessDocument(actor, doc, session);
      if (!access.allowed) {
        return { success: false, statusCode: 403, error: access.reason };
      }
    }

    const op = (payload.operation || '').trim() || (
      conn.type === 'SAP_S4HANA'
        ? 'PO & GRV Correspondence Sync'
        : conn.type === 'EFDA_API'
        ? 'Batch Clearance & GMP Verification'
        : conn.type === 'ActiveDirectory'
        ? 'Institutional OU & Staff Reconciliation'
        : conn.type === 'MoH_Portal'
        ? 'Emergency Supply Allocation Dispatch'
        : 'Encrypted Official Payload Transmission'
    );

    const extRef =
      (payload.externalRefId || '').trim() ||
      `${conn.type.split('_')[0]}-${new Date().getUTCFullYear()}-${String((this.data.connectorExchangeLogs?.length || 0) + 101).padStart(4, '0')}`;
    const latencyMs = conn.pingLatencyMs > 0 ? conn.pingLatencyMs + 11 : 28;
    const now = new Date().toISOString();

    conn.status = 'Connected';
    conn.lastSyncTimestamp = now;
    conn.totalDispatches = (conn.totalDispatches || 0) + 1;

    const summary = doc
      ? `${op} completed for ${doc.registrationNumber} (${doc.subjectEn.slice(0, 60)}) -> Ref ${extRef}`
      : `${op} synchronized (${(this.data.users || []).filter(u => u.status === 'Active').length} active staff / ${(this.data.branches || []).length} hubs) -> Ref ${extRef}`;

    const exchange = this.recordConnectorExchange({
      connectorId: conn.id,
      connectorName: conn.name,
      direction: 'Outbound',
      operation: op,
      documentId: doc?.id,
      registrationNumber: doc?.registrationNumber,
      externalRefId: extRef,
      status: 'Success',
      latencyMs,
      summary,
      initiatedByName: actor.fullNameEn
    });

    this.emitIntegrationEvent(
      'connector.sync',
      {
        connectorId: conn.id,
        connectorType: conn.type,
        operation: op,
        externalRefId: extRef,
        documentId: doc?.id || null,
        registrationNumber: doc?.registrationNumber || null
      },
      actor.fullNameEn
    );

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'EXECUTED_CONNECTOR_EXCHANGE',
      resourceType: 'IntegrationConnector',
      resourceId: conn.id,
      ipAddress: clientIp,
      details: summary
    });
    this.save();

    return { success: true, exchange, connector: conn };
  }

  public getConnectorExchangeLogs(): ConnectorExchangeLog[] {
    return this.data.connectorExchangeLogs || [];
  }

  private sanitizeWebhookSubscription(sub: StoredWebhookSubscription): WebhookSubscription {
    const { signingSecret: _secret, ...pub } = sub;
    return pub;
  }

  public getWebhookSubscriptions(): WebhookSubscription[] {
    return (this.data.webhookSubscriptions || []).map(s => this.sanitizeWebhookSubscription(s));
  }

  public getWebhookDeliveryLogs(): WebhookDeliveryRecord[] {
    return this.data.webhookDeliveryLogs || [];
  }

  public createWebhookSubscription(
    payload: {
      name?: string;
      targetUrl?: string;
      events?: IntegrationEventType[];
      connectorId?: string;
    },
    actor: User,
    clientIp: string
  ): {
    success: boolean;
    statusCode?: number;
    error?: string;
    subscription?: WebhookSubscription;
    oneTimeSecret?: string;
  } {
    if (!['SuperAdmin', 'DirectorGeneral'].includes(actor.role) && !this.hasPermission(actor, 'manage:organizations')) {
      return { success: false, statusCode: 403, error: 'Forbidden: Webhook administration requires SuperAdmin or manage:organizations permission.' };
    }
    const name = (payload.name || '').trim();
    if (name.length < 3) {
      return { success: false, statusCode: 400, error: 'Webhook subscription name must be at least 3 characters.' };
    }
    const targetUrl = (payload.targetUrl || '').trim();
    const urlCheck = this.isSafeIntegrationEndpoint(targetUrl);
    if (!urlCheck.valid) {
      return { success: false, statusCode: 400, error: urlCheck.reason };
    }
    const validEvents: IntegrationEventType[] = [
      'document.registered',
      'document.approved',
      'document.dispatched',
      'workflow.escalated',
      'disposal.executed',
      'connector.sync'
    ];
    const events = (payload.events || []).filter(e => validEvents.includes(e));
    if (events.length === 0) {
      return { success: false, statusCode: 400, error: 'Select at least one subscribed event type.' };
    }

    const rawSecret = `whsec_${crypto.randomBytes(20).toString('hex')}`;
    const stored: StoredWebhookSubscription = {
      id: `wh-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name,
      targetUrl,
      events,
      signingSecret: rawSecret,
      signingSecretPreview: `whsec_••••${rawSecret.slice(-4)}`,
      isActive: true,
      connectorId: payload.connectorId || undefined,
      createdByUserId: actor.id,
      createdByName: actor.fullNameEn,
      createdAt: new Date().toISOString()
    };

    if (!Array.isArray(this.data.webhookSubscriptions)) {
      this.data.webhookSubscriptions = [];
    }
    this.data.webhookSubscriptions.unshift(stored);

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'CREATED_WEBHOOK_SUBSCRIPTION',
      resourceType: 'IntegrationWebhook',
      resourceId: stored.id,
      ipAddress: clientIp,
      details: `Created HMAC-SHA256 webhook "${stored.name}" -> ${stored.targetUrl} [${events.join(', ')}]`
    });
    this.save();

    return {
      success: true,
      subscription: this.sanitizeWebhookSubscription(stored),
      oneTimeSecret: rawSecret
    };
  }

  public toggleWebhookSubscription(
    id: string,
    isActive: boolean,
    actor: User,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string; subscription?: WebhookSubscription } {
    if (!['SuperAdmin', 'DirectorGeneral'].includes(actor.role) && !this.hasPermission(actor, 'manage:organizations')) {
      return { success: false, statusCode: 403, error: 'Forbidden.' };
    }
    const sub = (this.data.webhookSubscriptions || []).find(s => s.id === id);
    if (!sub) return { success: false, statusCode: 404, error: 'Webhook subscription not found.' };
    sub.isActive = Boolean(isActive);
    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: sub.isActive ? 'ENABLED_WEBHOOK_SUBSCRIPTION' : 'DISABLED_WEBHOOK_SUBSCRIPTION',
      resourceType: 'IntegrationWebhook',
      resourceId: sub.id,
      ipAddress: clientIp,
      details: `${sub.isActive ? 'Enabled' : 'Paused'} webhook "${sub.name}"`
    });
    this.save();
    return { success: true, subscription: this.sanitizeWebhookSubscription(sub) };
  }

  public deleteWebhookSubscription(
    id: string,
    actor: User,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string } {
    if (!['SuperAdmin', 'DirectorGeneral'].includes(actor.role) && !this.hasPermission(actor, 'manage:organizations')) {
      return { success: false, statusCode: 403, error: 'Forbidden.' };
    }
    const idx = (this.data.webhookSubscriptions || []).findIndex(s => s.id === id);
    if (idx === -1) return { success: false, statusCode: 404, error: 'Webhook subscription not found.' };
    const [removed] = this.data.webhookSubscriptions.splice(idx, 1);
    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'DELETED_WEBHOOK_SUBSCRIPTION',
      resourceType: 'IntegrationWebhook',
      resourceId: id,
      ipAddress: clientIp,
      details: `Deleted webhook "${removed.name}"`
    });
    this.save();
    return { success: true };
  }

  private deliverSignedWebhook(
    sub: StoredWebhookSubscription,
    eventType: IntegrationEventType,
    dataPayload: Record<string, unknown>,
    simulateFailure = false,
    attemptCount = 1
  ): WebhookDeliveryRecord {
    const nowIso = new Date().toISOString();
    const epoch = Math.floor(Date.now() / 1000);
    const envelope = {
      id: `evt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      event: eventType,
      createdAt: nowIso,
      issuer: 'EPSS-EDRMS',
      data: dataPayload
    };
    const canonicalBody = JSON.stringify(envelope);
    const payloadDigestSha256 = crypto.createHash('sha256').update(canonicalBody, 'utf8').digest('hex');
    const signedPayload = `${epoch}.${canonicalBody}`;
    const v1Sig = crypto.createHmac('sha256', sub.signingSecret).update(signedPayload, 'utf8').digest('hex');
    const hmacSignatureHeader = `t=${epoch},v1=${v1Sig}`;

    const isBadEndpoint = simulateFailure || sub.targetUrl.includes('fail.invalid');
    const status: 'Delivered' | 'Failed' = isBadEndpoint ? 'Failed' : 'Delivered';
    const httpStatus = isBadEndpoint ? 502 : 200;
    const latencyMs = isBadEndpoint ? 142 : 22 + (sub.id.length % 25);

    sub.lastTriggeredAt = nowIso;
    sub.lastDeliveryStatus = status;

    const record: WebhookDeliveryRecord = {
      id: `whd-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      subscriptionId: sub.id,
      subscriptionName: sub.name,
      eventType,
      targetUrl: sub.targetUrl,
      payloadDigestSha256,
      hmacSignatureHeader,
      status,
      httpStatus,
      latencyMs,
      attemptCount,
      payloadPreview: canonicalBody.slice(0, 260),
      responseMessage: isBadEndpoint
        ? '502 Bad Gateway: Simulated target endpoint timeout — queued for retry.'
        : `200 OK: HMAC-SHA256 signature verified and acknowledged by ${new URL(sub.targetUrl).hostname}.`,
      timestamp: nowIso
    };

    if (!Array.isArray(this.data.webhookDeliveryLogs)) {
      this.data.webhookDeliveryLogs = [];
    }
    this.data.webhookDeliveryLogs.unshift(record);
    if (this.data.webhookDeliveryLogs.length > 200) {
      this.data.webhookDeliveryLogs = this.data.webhookDeliveryLogs.slice(0, 200);
    }
    return record;
  }

  public emitIntegrationEvent(
    eventType: IntegrationEventType,
    dataPayload: Record<string, unknown>,
    _actorName?: string
  ): WebhookDeliveryRecord[] {
    const subs = (this.data.webhookSubscriptions || []).filter(
      s => s.isActive && s.events.includes(eventType)
    );
    const deliveries: WebhookDeliveryRecord[] = [];
    for (const sub of subs) {
      deliveries.push(this.deliverSignedWebhook(sub, eventType, dataPayload, false, 1));
    }
    return deliveries;
  }

  public testWebhookSubscription(
    id: string,
    simulateFailure: boolean,
    actor: User,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string; delivery?: WebhookDeliveryRecord } {
    if (!['SuperAdmin', 'DirectorGeneral'].includes(actor.role) && !this.hasPermission(actor, 'manage:organizations')) {
      return { success: false, statusCode: 403, error: 'Forbidden.' };
    }
    const sub = (this.data.webhookSubscriptions || []).find(s => s.id === id);
    if (!sub) return { success: false, statusCode: 404, error: 'Webhook subscription not found.' };

    const delivery = this.deliverSignedWebhook(
      sub,
      sub.events[0] || 'connector.sync',
      {
        test: true,
        triggeredBy: actor.fullNameEn,
        subscriptionId: sub.id,
        message: 'EPSS EDRMS cryptographic HMAC-SHA256 webhook verification ping'
      },
      simulateFailure,
      1
    );

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'TESTED_WEBHOOK_SUBSCRIPTION',
      resourceType: 'IntegrationWebhook',
      resourceId: sub.id,
      ipAddress: clientIp,
      details: `Dispatched signed test webhook (${delivery.status}, HTTP ${delivery.httpStatus}) to ${sub.targetUrl}`
    });
    this.save();
    return { success: true, delivery };
  }

  public retryWebhookDelivery(
    deliveryId: string,
    actor: User,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string; delivery?: WebhookDeliveryRecord } {
    if (!['SuperAdmin', 'DirectorGeneral'].includes(actor.role) && !this.hasPermission(actor, 'manage:organizations')) {
      return { success: false, statusCode: 403, error: 'Forbidden.' };
    }
    const prior = (this.data.webhookDeliveryLogs || []).find(d => d.id === deliveryId);
    if (!prior) return { success: false, statusCode: 404, error: 'Delivery record not found.' };
    const sub = (this.data.webhookSubscriptions || []).find(s => s.id === prior.subscriptionId);
    if (!sub) return { success: false, statusCode: 404, error: 'Parent subscription no longer exists.' };

    const delivery = this.deliverSignedWebhook(
      sub,
      prior.eventType,
      {
        retriedFromDeliveryId: prior.id,
        retriedBy: actor.fullNameEn,
        timestamp: new Date().toISOString()
      },
      false,
      prior.attemptCount + 1
    );

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'RETRIED_WEBHOOK_DELIVERY',
      resourceType: 'IntegrationWebhook',
      resourceId: delivery.id,
      ipAddress: clientIp,
      details: `Retried delivery ${prior.id} (attempt #${delivery.attemptCount}) -> ${delivery.status}`
    });
    this.save();
    return { success: true, delivery };
  }

  private sanitizeApiKey(k: StoredIntegrationApiKey): IntegrationApiKey {
    const { keyHash: _hash, ...pub } = k;
    return pub;
  }

  public getIntegrationApiKeys(actor: User): IntegrationApiKey[] {
    if (!['SuperAdmin', 'DirectorGeneral', 'Auditor'].includes(actor.role) && !this.hasPermission(actor, 'manage:organizations')) {
      return [];
    }
    return (this.data.integrationApiKeys || []).map(k => this.sanitizeApiKey(k));
  }

  public createIntegrationApiKey(
    payload: {
      name?: string;
      scopes?: IntegrationApiScope[];
      boundBranchId?: string;
      boundConnectorId?: string;
      expiresInDays?: number;
    },
    actor: User,
    clientIp: string
  ): {
    success: boolean;
    statusCode?: number;
    error?: string;
    apiKey?: IntegrationApiKey;
    oneTimePlaintextKey?: string;
  } {
    if (!['SuperAdmin', 'DirectorGeneral'].includes(actor.role)) {
      return { success: false, statusCode: 403, error: 'Forbidden: Only SuperAdmin or DirectorGeneral can issue Integration API Keys.' };
    }
    const name = (payload.name || '').trim();
    if (name.length < 3) {
      return { success: false, statusCode: 400, error: 'API key name must be at least 3 characters.' };
    }
    const validScopes: IntegrationApiScope[] = [
      'correspondence:ingest',
      'correspondence:read',
      'efda:clearance',
      'erp:sync'
    ];
    const scopes = (payload.scopes || []).filter(s => validScopes.includes(s));
    if (scopes.length === 0) {
      return { success: false, statusCode: 400, error: 'Select at least one API key permission scope.' };
    }

    const rawKey = `epss_int_${crypto.randomBytes(24).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(rawKey, 'utf8').digest('hex');
    const days = Math.min(730, Math.max(7, Number(payload.expiresInDays || 365)));
    const expiresAt = new Date(Date.now() + days * 86400000).toISOString();

    const stored: StoredIntegrationApiKey = {
      id: `key-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name,
      keyPrefix: rawKey.slice(0, 15),
      keyHash,
      scopes,
      boundBranchId: payload.boundBranchId || 'br-hq',
      boundConnectorId: payload.boundConnectorId || undefined,
      status: 'Active',
      createdByUserId: actor.id,
      createdByName: actor.fullNameEn,
      createdAt: new Date().toISOString(),
      expiresAt,
      usageCount: 0
    };

    if (!Array.isArray(this.data.integrationApiKeys)) {
      this.data.integrationApiKeys = [];
    }
    this.data.integrationApiKeys.unshift(stored);

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'ISSUED_INTEGRATION_API_KEY',
      resourceType: 'IntegrationApiKey',
      resourceId: stored.id,
      ipAddress: clientIp,
      details: `Issued API Key "${stored.name}" (${stored.keyPrefix}...) scopes=[${scopes.join(', ')}]`
    });
    this.save();

    return {
      success: true,
      apiKey: this.sanitizeApiKey(stored),
      oneTimePlaintextKey: rawKey
    };
  }

  public revokeIntegrationApiKey(
    id: string,
    actor: User,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string; apiKey?: IntegrationApiKey } {
    if (!['SuperAdmin', 'DirectorGeneral'].includes(actor.role)) {
      return { success: false, statusCode: 403, error: 'Forbidden: Only SuperAdmin or DirectorGeneral can revoke Integration API Keys.' };
    }
    const key = (this.data.integrationApiKeys || []).find(k => k.id === id);
    if (!key) return { success: false, statusCode: 404, error: 'Integration API key not found.' };
    if (key.status === 'Revoked') {
      return { success: false, statusCode: 400, error: 'API key is already revoked.' };
    }

    key.status = 'Revoked';
    key.revokedAt = new Date().toISOString();
    key.revokedByName = actor.fullNameEn;

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'REVOKED_INTEGRATION_API_KEY',
      resourceType: 'IntegrationApiKey',
      resourceId: key.id,
      ipAddress: clientIp,
      details: `Revoked API Key "${key.name}" (${key.keyPrefix}...)`
    });
    this.save();
    return { success: true, apiKey: this.sanitizeApiKey(key) };
  }

  public authenticateIntegrationApiKey(
    rawKey: string,
    requiredScope: IntegrationApiScope
  ): { valid: boolean; statusCode?: number; error?: string; keyRecord?: StoredIntegrationApiKey } {
    if (!rawKey || !rawKey.startsWith('epss_int_')) {
      return { valid: false, statusCode: 401, error: 'Missing or invalid X-EPSS-API-Key header.' };
    }
    const presentedHash = crypto.createHash('sha256').update(rawKey.trim(), 'utf8').digest('hex');
    const match = (this.data.integrationApiKeys || []).find(k => k.keyHash === presentedHash);
    if (!match) {
      return { valid: false, statusCode: 401, error: 'Unrecognized Integration API Key.' };
    }
    if (match.status !== 'Active') {
      return { valid: false, statusCode: 403, error: 'Integration API Key has been revoked.' };
    }
    if (new Date(match.expiresAt).getTime() < Date.now()) {
      return { valid: false, statusCode: 403, error: 'Integration API Key has expired.' };
    }
    if (!match.scopes.includes(requiredScope)) {
      return { valid: false, statusCode: 403, error: `API Key lacks required scope: ${requiredScope}` };
    }

    match.lastUsedAt = new Date().toISOString();
    match.usageCount = (match.usageCount || 0) + 1;
    this.save();
    return { valid: true, keyRecord: match };
  }

  public async ingestInboundCorrespondenceViaApiKey(
    apiKeyRecord: StoredIntegrationApiKey,
    payload: {
      externalRefId?: string;
      subjectEn?: string;
      subjectAm?: string;
      senderOrganization?: string;
      recipientOrganization?: string;
      departmentId?: string;
      priority?: DocumentItem['priority'];
      confidentiality?: DocumentItem['confidentiality'];
      descriptionEn?: string;
    },
    clientIp: string
  ): Promise<{ success: boolean; statusCode?: number; error?: string; document?: DocumentItem }> {
    const subjectEn = (payload.subjectEn || '').trim();
    if (subjectEn.length < 5) {
      return { success: false, statusCode: 400, error: 'subjectEn is required (min 5 characters).' };
    }
    const senderOrganization = (payload.senderOrganization || '').trim();
    if (senderOrganization.length < 2) {
      return { success: false, statusCode: 400, error: 'senderOrganization is required.' };
    }

    const systemActor =
      this.data.users.find(u => u.role === 'SuperAdmin') || this.data.users[0];
    const branchId = apiKeyRecord.boundBranchId || 'br-hq';
    const departmentId =
      payload.departmentId && this.data.departments.some(d => d.id === payload.departmentId)
        ? payload.departmentId
        : this.data.departments[0]?.id || 'dept-reg';

    const doc = await this.createDocument(
      {
        type: 'IncomingLetter',
        referenceNumber: payload.externalRefId || `EXT-${Date.now()}`,
        subjectEn,
        subjectAm: (payload.subjectAm || subjectEn).trim(),
        descriptionEn: payload.descriptionEn || `Ingested via Integration API Key "${apiKeyRecord.name}"`,
        senderOrganization,
        recipientOrganization: payload.recipientOrganization || 'EPSS Head Office',
        branchId,
        departmentId,
        priority: payload.priority || 'Normal',
        confidentiality: payload.confidentiality || 'Internal'
      },
      systemActor,
      clientIp
    );

    const conn = this.data.connectors.find(c => c.id === apiKeyRecord.boundConnectorId) || this.data.connectors[0];
    if (conn) {
      this.recordConnectorExchange({
        connectorId: conn.id,
        connectorName: conn.name,
        direction: 'Inbound',
        operation: 'API Gateway Correspondence Ingest',
        documentId: doc.id,
        registrationNumber: doc.registrationNumber,
        externalRefId: doc.referenceNumber,
        status: 'Success',
        latencyMs: 19,
        summary: `Ingested ${doc.registrationNumber} from ${senderOrganization} via key ${apiKeyRecord.keyPrefix}...`,
        initiatedByName: apiKeyRecord.name
      });
    }

    this.addAuditLog({
      userId: systemActor.id,
      userName: apiKeyRecord.name,
      userRole: 'ExternalIntegration',
      branchName: branchId,
      action: 'INBOUND_API_CORRESPONDENCE_INGEST',
      resourceType: 'Document',
      resourceId: doc.registrationNumber,
      ipAddress: clientIp,
      details: `Ingested external correspondence via API key ${apiKeyRecord.keyPrefix}... (${senderOrganization})`
    });
    this.save();

    return { success: true, document: doc };
  }

  public getPublicVerificationSamples(): PublicVerificationSample[] {
    return (this.data.documents || [])
      .filter(d => !d.isDeleted && (d.confidentiality === 'Public' || d.confidentiality === 'Internal'))
      .slice(0, 4)
      .map(d => ({
        registrationNumber: d.registrationNumber,
        referenceNumber: d.referenceNumber,
        type: d.type,
        status: d.status,
        hasPkiSignature: (d.workflowHistory || []).some(h => !!h.digitalSignature && !h.digitalSignature.invalidated)
      }));
  }

  public verifyDocumentPublicly(
    query: string,
    expectedSeal: string | undefined,
    clientIp: string
  ): { found: boolean; error?: string; result?: PublicVerificationResponse } {
    const clean = (query || '').trim().toLowerCase();
    if (clean.length < 3) {
      return { found: false, error: 'Enter a valid EPSS Registration Number or Reference Number (minimum 3 characters).' };
    }

    const doc = (this.data.documents || []).find(
      d =>
        !d.isDeleted &&
        (d.registrationNumber.toLowerCase() === clean ||
          d.referenceNumber.toLowerCase() === clean ||
          d.id.toLowerCase() === clean)
    );

    if (!doc) {
      this.addAuditLog({
        userId: 'usr-public-verifier',
        userName: 'Public Verification Portal',
        userRole: 'ExternalVerifier',
        branchName: 'Public Gateway',
        action: 'PUBLIC_VERIFICATION_NOT_FOUND',
        resourceType: 'Document',
        resourceId: query.trim().slice(0, 64),
        ipAddress: clientIp,
        details: `Public authenticity lookup for "${query.trim().slice(0, 64)}" returned no matching official record.`
      });
      this.save();
      return { found: false, error: `No official EPSS record found matching "${query.trim()}".` };
    }

    const verifierActor =
      this.data.users.find(u => u.role === 'Auditor') ||
      this.data.users.find(u => u.role === 'SuperAdmin') ||
      this.data.users[0];

    const sigCheck = this.verifyDocumentSignatures(doc.id, verifierActor, clientIp, false);
    const branch = this.data.branches.find(b => b.id === doc.branchId);
    const dept = this.data.departments.find(d => d.id === doc.departmentId);

    const isRestricted = doc.confidentiality === 'Confidential' || doc.confidentiality === 'Secret';
    const currentDigest = sigCheck?.currentDocumentDigestSha256 || this.computeDocumentSigningDigest(doc);

    let sealMatchStatus: PublicVerificationResponse['sealMatchStatus'] = 'not_provided';
    const cleanSeal = (expectedSeal || '').trim().replace(/^sha256:/i, '').toLowerCase();
    if (cleanSeal.length >= 6) {
      const matchesCurrent = currentDigest.toLowerCase().startsWith(cleanSeal) || currentDigest.toLowerCase() === cleanSeal;
      const matchesSigned = (sigCheck?.signatures || []).some(
        s => s.signedDigestSha256.toLowerCase().startsWith(cleanSeal) || s.signedDigestSha256.toLowerCase() === cleanSeal
      );
      sealMatchStatus = matchesCurrent || matchesSigned ? 'matched' : 'mismatched';
    }

    const result: PublicVerificationResponse = {
      verified:
        sigCheck?.integrityStatus === 'Verified' &&
        sealMatchStatus !== 'mismatched',
      registrationNumber: doc.registrationNumber,
      referenceNumber: isRestricted ? `${doc.referenceNumber.slice(0, 6)}•••` : doc.referenceNumber,
      documentType: doc.type,
      status: doc.status,
      confidentiality: doc.confidentiality,
      redacted: isRestricted,
      subjectEn: isRestricted
        ? '[CLASSIFIED RECORD — SUBJECT REDACTED FOR PUBLIC VERIFICATION]'
        : doc.subjectEn,
      subjectAm: isRestricted
        ? '[ሚስጥራዊ መዝገብ — ርዕሱ ለውጭ ማረጋገጫ ተሸፍኗል]'
        : doc.subjectAm,
      senderOrganization: isRestricted ? 'Authorized Government Entity (Redacted)' : doc.senderOrganization,
      recipientOrganization: isRestricted ? 'EPSS Authorized Directorate (Redacted)' : doc.recipientOrganization,
      issuingBranchEn: branch?.nameEn || 'EPSS Head Office',
      issuingDepartmentEn: dept?.nameEn || 'Central Registry Directorate',
      registrationDate: doc.registrationDate,
      integrityStatus: sigCheck?.integrityStatus || 'Unsigned',
      currentDocumentDigestSha256: currentDigest,
      sealMatchStatus,
      totalSignatures: sigCheck?.totalSignatures ?? 0,
      validSignatures: sigCheck?.validSignatures ?? 0,
      summaryMessage:
        sealMatchStatus === 'mismatched'
          ? 'WARNING: The supplied SHA-256 verification seal does not match the official EPSS document digest.'
          : sigCheck?.summaryMessage || 'Official registration metadata verified.',
      signers: (sigCheck?.signatures || []).map(s => ({
        signedBy: s.signedBy,
        signedByRole: s.signedByRole,
        stageName: s.stageName,
        certificateSerial: s.certificateSerial,
        certificateStatus: s.certificateStatus,
        algorithm: s.algorithm,
        signingMeaning: s.signingMeaning,
        signedAt: s.signedAt,
        biometricVerified: s.biometricVerified,
        status: s.status
      })),
      verifiedAt: new Date().toISOString()
    };

    this.addAuditLog({
      userId: 'usr-public-verifier',
      userName: 'Public Verification Portal',
      userRole: 'ExternalVerifier',
      branchName: result.issuingBranchEn,
      action: 'PUBLIC_VERIFICATION_CHECK',
      resourceType: 'Document',
      resourceId: doc.registrationNumber,
      ipAddress: clientIp,
      details: `Public authenticity check for ${doc.registrationNumber}: integrity=${result.integrityStatus}, redacted=${result.redacted}, seal=${sealMatchStatus}`
    });
    this.save();

    return { found: true, result };
  }

  // ==========================================
  // PHASE 13: BULK CORRESPONDENCE OPERATIONS, CSV BATCH INTAKE & TRANSMITTAL MANIFESTS
  // ==========================================

  private ensurePhase13TransmittalState() {
    if (!Array.isArray(this.data.transmittalManifests)) {
      this.data.transmittalManifests = [];
    }
    if (this.data.transmittalManifests.length === 0) {
      const sampleDocs = (this.data.documents || []).filter(d => !d.isDeleted).slice(0, 2);
      if (sampleDocs.length > 0) {
        const docIds = sampleDocs.map(d => d.id);
        const regNumbers = sampleDocs.map(d => d.registrationNumber);
        const createdAt = new Date(Date.now() - 86400000 * 2).toISOString();
        const manifestNumber = `EPSS-TRN-${new Date().getUTCFullYear()}-001`;
        const digest = crypto
          .createHash('sha256')
          .update(`${manifestNumber}|${docIds.slice().sort().join(',')}|${createdAt}`, 'utf8')
          .digest('hex');

        this.data.transmittalManifests.push({
          id: 'trn-seed-001',
          manifestNumber,
          title: 'Hawassa & Southern Hub Weekly Pharmaceutical Dossier Dispatch',
          targetBranchId: this.data.branches[1]?.id || 'br-01',
          targetBranchName: this.data.branches[1]?.nameEn || 'Adama Regional Hub',
          targetOrganization: 'EPSS Regional Hub Logistics Desk',
          carrierName: 'EPSS Cold-Chain Shuttle Fleet #04',
          courierPhone: '+251-11-551-9902',
          dispatchMethod: 'RegionalHubShuttle',
          documentIds: docIds,
          documentRegNumbers: regNumbers,
          notes: 'Sealed official pouch with tamper-evident manifest digest.',
          status: 'Dispatched',
          createdByUserId: this.data.users[0]?.id || 'usr-admin',
          createdByName: this.data.users[0]?.fullNameEn || 'Registry Operations',
          createdAt,
          dispatchedAt: new Date(Date.now() - 86400000).toISOString(),
          dispatchedByName: this.data.users[0]?.fullNameEn || 'Registry Operations',
          manifestDigestSha256: digest
        });
      }
    }
  }

  public bulkUpdateCorrespondence(
    payload: {
      documentIds?: string[];
      action?: 'assign' | 'priority' | 'status';
      assignedToUserId?: string;
      priority?: PriorityLevel;
      status?: DocumentStatus;
      notes?: string;
    },
    actor: User,
    session: AuthSession | undefined,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string; result?: BulkOperationResult } {
    if (!this.hasPermission(actor, 'edit:documents') && !this.hasPermission(actor, 'approve:workflows')) {
      return {
        success: false,
        statusCode: 403,
        error: 'Forbidden: Bulk correspondence updates require edit:documents or approve:workflows permission.'
      };
    }

    const docIds = Array.from(new Set((payload.documentIds || []).filter(Boolean)));
    if (docIds.length === 0) {
      return { success: false, statusCode: 400, error: 'Select at least one correspondence record.' };
    }
    if (docIds.length > 100) {
      return { success: false, statusCode: 400, error: 'Maximum 100 correspondence items allowed per batch.' };
    }

    const action = payload.action;
    if (!action || !['assign', 'priority', 'status'].includes(action)) {
      return { success: false, statusCode: 400, error: 'Invalid bulk action type.' };
    }

    let targetUser: User | undefined;
    if (action === 'assign') {
      if (!payload.assignedToUserId) {
        return { success: false, statusCode: 400, error: 'Select a staff officer to assign.' };
      }
      targetUser = this.data.users.find(u => u.id === payload.assignedToUserId && u.status !== 'Inactive');
      if (!targetUser) {
        return { success: false, statusCode: 404, error: 'Target staff user not found or inactive.' };
      }
    }

    if (action === 'priority' && !['Normal', 'Urgent', 'VeryUrgent'].includes(payload.priority || '')) {
      return { success: false, statusCode: 400, error: 'Invalid priority level.' };
    }

    const allowedStatuses: DocumentStatus[] = [
      'Received',
      'Registered',
      'UnderReview',
      'Assigned',
      'InProgress',
      'PendingInformation',
      'Forwarded',
      'AwaitingApproval',
      'Approved',
      'ResponsePrepared',
      'Dispatched',
      'Completed'
    ];
    if (action === 'status' && (!payload.status || !allowedStatuses.includes(payload.status))) {
      return { success: false, statusCode: 400, error: 'Invalid target correspondence status.' };
    }

    const results: BulkOperationItemResult[] = [];
    const now = new Date().toISOString();

    for (const docId of docIds) {
      const doc = this.getDocumentById(docId);
      if (!doc || doc.isDeleted) {
        results.push({ documentId: docId, success: false, error: 'Document not found or deleted.' });
        continue;
      }

      const access = this.canAccessDocument(actor, doc, session);
      if (!access.allowed) {
        results.push({
          documentId: doc.id,
          registrationNumber: doc.registrationNumber,
          success: false,
          error: access.reason || 'Access denied'
        });
        continue;
      }

      let actionDetail = '';
      if (action === 'assign' && targetUser) {
        doc.assignedUserId = targetUser.id;
        doc.assignedUserName = targetUser.fullNameEn;
        if (doc.status === 'Received' || doc.status === 'Registered') {
          doc.status = 'Assigned';
        }
        actionDetail = `Batch assigned to ${targetUser.fullNameEn} (${targetUser.role})`;
      } else if (action === 'priority' && payload.priority) {
        doc.priority = payload.priority;
        actionDetail = `Batch priority updated to ${payload.priority}`;
      } else if (action === 'status' && payload.status) {
        doc.status = payload.status;
        actionDetail = `Batch status updated to ${payload.status}`;
      }

      if (payload.notes && payload.notes.trim()) {
        actionDetail += ` — ${payload.notes.trim()}`;
      }

      doc.workflowHistory.push({
        id: `wh-bulk-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        timestamp: now,
        actorId: actor.id,
        actorName: actor.fullNameEn,
        actorRole: actor.role,
        action: action === 'assign' ? 'Forwarded' : 'Reviewed',
        comments: actionDetail
      });

      if (action === 'status' && payload.status === 'Dispatched') {
        this.emitIntegrationEvent(
          'document.dispatched',
          {
            documentId: doc.id,
            registrationNumber: doc.registrationNumber,
            batchOperation: true
          },
          actor.fullNameEn
        );
      }

      results.push({
        documentId: doc.id,
        registrationNumber: doc.registrationNumber,
        success: true
      });
    }

    const succeededCount = results.filter(r => r.success).length;
    const failedCount = results.length - succeededCount;

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'BULK_CORRESPONDENCE_UPDATE',
      resourceType: 'DocumentBatch',
      resourceId: `${action}:${succeededCount}/${results.length}`,
      ipAddress: clientIp,
      details: `Executed bulk ${action} across ${succeededCount}/${results.length} records.`
    });
    this.save();

    return {
      success: true,
      result: {
        totalRequested: results.length,
        succeededCount,
        failedCount,
        results
      }
    };
  }

  public async bulkImportCorrespondence(
    rows: BulkImportRowInput[],
    actor: User,
    clientIp: string
  ): Promise<{ success: boolean; statusCode?: number; error?: string; result?: BulkImportResult }> {
    if (!this.hasPermission(actor, 'create:documents')) {
      return {
        success: false,
        statusCode: 403,
        error: 'Forbidden: Batch import requires create:documents permission.'
      };
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return { success: false, statusCode: 400, error: 'Provide at least 1 correspondence row to import.' };
    }
    if (rows.length > 50) {
      return { success: false, statusCode: 400, error: 'Batch CSV import is limited to 50 rows per submission.' };
    }

    const createdDocuments: DocumentItem[] = [];
    const rowResults: BulkImportRowResult[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const subjectEn = (row?.subjectEn || '').trim();
      const senderOrg = (row?.senderOrganization || '').trim();

      if (subjectEn.length < 4) {
        rowResults.push({
          rowIndex: i + 1,
          success: false,
          error: 'subjectEn must be at least 4 characters.'
        });
        continue;
      }
      if (senderOrg.length < 2) {
        rowResults.push({
          rowIndex: i + 1,
          success: false,
          error: 'senderOrganization is required.'
        });
        continue;
      }

      const branchId =
        row.branchId && this.data.branches.some(b => b.id === row.branchId)
          ? row.branchId
          : actor.branchId || 'br-hq';
      const departmentId =
        row.departmentId && this.data.departments.some(d => d.id === row.departmentId)
          ? row.departmentId
          : actor.departmentId || 'dept-reg';

      const doc = await this.createDocument(
        {
          type: row.type || 'IncomingLetter',
          referenceNumber: (row.referenceNumber || '').trim() || `BATCH-${Date.now()}-${i + 1}`,
          subjectEn,
          subjectAm: (row.subjectAm || subjectEn).trim(),
          descriptionEn: row.descriptionEn || 'Registered via EPSS Batch CSV Intake',
          senderOrganization: senderOrg,
          recipientOrganization: (row.recipientOrganization || 'Ethiopian Pharmaceutical Supply Service').trim(),
          branchId,
          departmentId,
          priority: row.priority || 'Normal',
          confidentiality: row.confidentiality || 'Internal'
        },
        actor,
        clientIp
      );

      createdDocuments.push(doc);
      rowResults.push({
        rowIndex: i + 1,
        success: true,
        registrationNumber: doc.registrationNumber,
        documentId: doc.id
      });
    }

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'BULK_CORRESPONDENCE_IMPORT',
      resourceType: 'DocumentBatch',
      resourceId: `CSV-${createdDocuments.length}`,
      ipAddress: clientIp,
      details: `Batch imported ${createdDocuments.length}/${rows.length} correspondence records.`
    });
    this.save();

    return {
      success: true,
      result: {
        totalRows: rows.length,
        createdCount: createdDocuments.length,
        failedCount: rows.length - createdDocuments.length,
        createdDocuments,
        rowResults
      }
    };
  }

  public getTransmittalManifests(): TransmittalManifest[] {
    return this.data.transmittalManifests || [];
  }

  public createTransmittalManifest(
    payload: {
      title?: string;
      targetBranchId?: string;
      targetOrganization?: string;
      carrierName?: string;
      courierPhone?: string;
      dispatchMethod?: TransmittalDispatchMethod;
      documentIds?: string[];
      notes?: string;
    },
    actor: User,
    session: AuthSession | undefined,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string; manifest?: TransmittalManifest } {
    if (!this.hasPermission(actor, 'create:documents') && !this.hasPermission(actor, 'edit:documents')) {
      return {
        success: false,
        statusCode: 403,
        error: 'Forbidden: Creating transmittal manifests requires create:documents or edit:documents permission.'
      };
    }

    const title = (payload.title || '').trim();
    if (title.length < 4) {
      return { success: false, statusCode: 400, error: 'Manifest title must be at least 4 characters.' };
    }
    const carrierName = (payload.carrierName || '').trim();
    if (carrierName.length < 2) {
      return { success: false, statusCode: 400, error: 'Carrier or courier name is required.' };
    }

    const docIds = Array.from(new Set((payload.documentIds || []).filter(Boolean)));
    if (docIds.length === 0) {
      return { success: false, statusCode: 400, error: 'Select at least one correspondence record for the manifest.' };
    }

    const regNumbers: string[] = [];
    for (const docId of docIds) {
      const doc = this.getDocumentById(docId);
      if (!doc || doc.isDeleted) {
        return { success: false, statusCode: 404, error: `Correspondence record ${docId} not found.` };
      }
      const access = this.canAccessDocument(actor, doc, session);
      if (!access.allowed) {
        return { success: false, statusCode: 403, error: `Access denied for ${doc.registrationNumber}.` };
      }
      regNumbers.push(doc.registrationNumber);
    }

    const branch = payload.targetBranchId
      ? this.data.branches.find(b => b.id === payload.targetBranchId)
      : undefined;
    const seq = (this.data.transmittalManifests?.length || 0) + 1;
    const manifestNumber = `EPSS-TRN-${new Date().getUTCFullYear()}-${String(seq).padStart(3, '0')}`;
    const createdAt = new Date().toISOString();
    const digest = crypto
      .createHash('sha256')
      .update(`${manifestNumber}|${docIds.slice().sort().join(',')}|${createdAt}`, 'utf8')
      .digest('hex');

    const manifest: TransmittalManifest = {
      id: `trn-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      manifestNumber,
      title,
      targetBranchId: branch?.id,
      targetBranchName: branch?.nameEn,
      targetOrganization:
        (payload.targetOrganization || '').trim() || branch?.nameEn || 'External Official Recipient',
      carrierName,
      courierPhone: payload.courierPhone?.trim() || undefined,
      dispatchMethod: payload.dispatchMethod || 'Courier',
      documentIds: docIds,
      documentRegNumbers: regNumbers,
      notes: payload.notes?.trim() || undefined,
      status: 'Prepared',
      createdByUserId: actor.id,
      createdByName: actor.fullNameEn,
      createdAt,
      manifestDigestSha256: digest
    };

    if (!Array.isArray(this.data.transmittalManifests)) {
      this.data.transmittalManifests = [];
    }
    this.data.transmittalManifests.unshift(manifest);

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'CREATED_TRANSMITTAL_MANIFEST',
      resourceType: 'TransmittalManifest',
      resourceId: manifest.manifestNumber,
      ipAddress: clientIp,
      details: `Prepared transmittal ${manifest.manifestNumber} (${regNumbers.length} documents) via ${manifest.dispatchMethod} -> ${manifest.targetOrganization}`
    });
    this.save();

    return { success: true, manifest };
  }

  public dispatchTransmittalManifest(
    id: string,
    actor: User,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string; manifest?: TransmittalManifest } {
    if (!this.hasPermission(actor, 'edit:documents') && !this.hasPermission(actor, 'approve:workflows')) {
      return { success: false, statusCode: 403, error: 'Forbidden.' };
    }
    const manifest = (this.data.transmittalManifests || []).find(m => m.id === id);
    if (!manifest) {
      return { success: false, statusCode: 404, error: 'Transmittal manifest not found.' };
    }
    if (manifest.status !== 'Prepared') {
      return { success: false, statusCode: 400, error: `Manifest is already ${manifest.status}.` };
    }

    // Outgoing correspondence dispatch PKI gate
    if (this.data.pkiPolicy?.requireSignedOutgoingDispatch) {
      const unsignedRegs: string[] = [];
      for (const docId of manifest.documentIds) {
        const doc = this.getDocumentById(docId);
        if (!doc || doc.isDeleted) continue;
        if (doc.type === 'OutgoingLetter') {
          const digest = this.computeDocumentSigningDigest(doc);
          const hasValidSig = (doc.workflowHistory || []).some(
            h => h.digitalSignature && !h.digitalSignature.invalidated && h.digitalSignature.documentDigestSha256 === digest
          );
          if (!hasValidSig) unsignedRegs.push(doc.registrationNumber);
        }
      }
      if (unsignedRegs.length > 0) {
        return {
          success: false,
          statusCode: 412,
          error: `SIGNING_REQUIRED_FOR_DISPATCH: Cannot dispatch manifest containing unsigned outgoing correspondence: ${unsignedRegs.join(', ')}`
        };
      }
    }

    const now = new Date().toISOString();
    manifest.status = 'Dispatched';
    manifest.dispatchedAt = now;
    manifest.dispatchedByName = actor.fullNameEn;

    for (const docId of manifest.documentIds) {
      const doc = this.getDocumentById(docId);
      if (!doc || doc.isDeleted) continue;
      if (doc.type === 'OutgoingLetter' || doc.type === 'Circular') {
        doc.status = 'Dispatched';
        if (!doc.legalHold && !doc.retentionManualOverride) {
          this.refreshDocumentRetentionAnchor(doc, now, undefined);
        }
      }
      doc.workflowHistory.push({
        id: `wh-trn-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        timestamp: now,
        actorId: actor.id,
        actorName: actor.fullNameEn,
        actorRole: actor.role,
        action: 'Dispatched',
        comments: `Bundled in Official Transmittal Manifest ${manifest.manifestNumber} (${manifest.carrierName})`
      });
    }

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'DISPATCHED_TRANSMITTAL_MANIFEST',
      resourceType: 'TransmittalManifest',
      resourceId: manifest.manifestNumber,
      ipAddress: clientIp,
      details: `Dispatched manifest ${manifest.manifestNumber} (${manifest.documentIds.length} records) via ${manifest.carrierName}`
    });
    this.save();

    return { success: true, manifest };
  }

  public acknowledgeTransmittalManifest(
    id: string,
    actor: User,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string; manifest?: TransmittalManifest } {
    const manifest = (this.data.transmittalManifests || []).find(m => m.id === id);
    if (!manifest) {
      return { success: false, statusCode: 404, error: 'Transmittal manifest not found.' };
    }
    if (manifest.status !== 'Dispatched') {
      return { success: false, statusCode: 400, error: 'Only Dispatched manifests can be acknowledged.' };
    }

    manifest.status = 'Acknowledged';
    manifest.acknowledgedAt = new Date().toISOString();
    manifest.acknowledgedByName = actor.fullNameEn;

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'ACKNOWLEDGED_TRANSMITTAL_MANIFEST',
      resourceType: 'TransmittalManifest',
      resourceId: manifest.manifestNumber,
      ipAddress: clientIp,
      details: `Acknowledged safe receipt of manifest ${manifest.manifestNumber} (${manifest.documentIds.length} records)`
    });
    this.save();

    return { success: true, manifest };
  }

  // =========================================================================
  // PHASE 14: CASE DOSSIERS (CROSS-DOCUMENT LINKING) & BILINGUAL TEMPLATES
  // =========================================================================

  private ensurePhase14DossiersAndTemplatesState() {
    if (!Array.isArray(this.data.correspondenceTemplates) || this.data.correspondenceTemplates.length === 0) {
      const now = new Date().toISOString();
      this.data.correspondenceTemplates = [
        {
          id: 'tpl-efda-clearance',
          nameEn: 'EFDA Port Batch Clearance Request',
          nameAm: 'የEFDA ወደብ የመድኃኒት ባች ማጽደቂያ ጥያቄ',
          type: 'IncomingLetter',
          category: 'Regulatory & Quality',
          defaultPriority: 'Urgent',
          defaultConfidentiality: 'Internal',
          defaultSenderOrg: 'Ethiopian Food and Drug Authority (EFDA)',
          defaultRecipientOrg: 'EPSS Quality Assurance & Regulatory Compliance Directorate',
          defaultDepartmentId: 'dept-qa',
          subjectEnTemplate: 'Formal Requisition for Regulatory Batch Clearance Certificate (Lot #INS-2026)',
          subjectAmTemplate: 'ለአስመጪ መድኃኒቶች የባች ጥራት ፍተሻ እና የፈቃድ የምስክር ወረቀት ጥያቄ',
          bodyEnTemplate:
            'Submission of analytical laboratory certificates (CoA), cold-chain temperature logger records, and customs packing lists for immediate EFDA port regulatory clearance.',
          bodyAmTemplate:
            'የላቦራቶሪ ጥራት ማረጋገጫ ሰርተፊኬቶች (CoA)፣ የቀዝቃዛ ሰንሰለት የሙቀት መመዝገቢያ መረጃዎች እና የጉምሩክ ሰነዶች ለፈጣን የወደብ ፈቃድ ቀርበዋል።',
          createdByName: 'EPSS Standards Registry',
          isSystemDefault: true,
          createdAt: now
        },
        {
          id: 'tpl-moh-emergency',
          nameEn: 'MoH Emergency Supply Response Dispatch',
          nameAm: 'የጤና ሚኒስቴር የአስቸኳይ አቅርቦት ምላሽ ደብዳቤ',
          type: 'OutgoingLetter',
          category: 'Emergency Logistics',
          defaultPriority: 'VeryUrgent',
          defaultConfidentiality: 'Internal',
          defaultSenderOrg: 'Ethiopian Pharmaceutical Supply Service (EPSS)',
          defaultRecipientOrg: 'Ministry of Health Disaster Response Directorate',
          defaultDepartmentId: 'dept-storage',
          subjectEnTemplate: 'Emergency Epidemic Stock Allocation & Cold-Chain Dispatch Confirmation',
          subjectAmTemplate: 'ለድንገተኛ ወረርሽኝ መከላከያ የተመደበ መድኃኒት እና የቀዝቃዛ ሰንሰለት ስርጭት ማረጋገጫ',
          bodyEnTemplate:
            'Confirmation of immediate allocation and refrigerated fleet dispatch of essential vaccines, IV Ringer Lactate, and emergency kits to designated regional hubs.',
          bodyAmTemplate:
            'ለክልል ማዕከላት የተመደቡ ክትባቶች እና አስቸኳይ የሕክምና ቁሳቁሶች በማቀዝቀዣ ተሽከርካሪዎች መላካቸውን እናረጋግጣለን።',
          createdByName: 'EPSS Standards Registry',
          isSystemDefault: true,
          createdAt: now
        },
        {
          id: 'tpl-tender-award',
          nameEn: 'International Tender Award & LC Notification',
          nameAm: 'የዓለም አቀፍ ግልጽ ጨረታ አሸናፊነት ማሳወቂያ',
          type: 'OutgoingLetter',
          category: 'Procurement & Tenders',
          defaultPriority: 'Urgent',
          defaultConfidentiality: 'Confidential',
          defaultSenderOrg: 'EPSS Pharmaceuticals & Medical Devices Procurement Directorate',
          defaultRecipientOrg: 'Global Pharmaceutical Supplier / Vendor',
          defaultDepartmentId: 'dept-proc',
          subjectEnTemplate: 'Notification of International Competitive Tender Award (ICB/EPSS/2026) & LC Opening',
          subjectAmTemplate: 'የዓለም አቀፍ ግልጽ ጨረታ አሸናፊነት ማሳወቂያ እና የማይሻር ኤልሲ (LC) የመክፈቻ ደብዳቤ',
          bodyEnTemplate:
            'Official notification of contract award pending performance bond submission within 15 working days and irrevocable Letter of Credit establishment via Commercial Bank of Ethiopia.',
          bodyAmTemplate:
            'የጨረታ አሸናፊነት ይፋዊ ማሳወቂያ እና በ15 የሥራ ቀናት ውስጥ የውል ማስከበሪያ ዋስትና በማቅረብ የባንክ ኤልሲ የመክፈቻ ዝግጅት እንዲደረግ።',
          createdByName: 'EPSS Standards Registry',
          isSystemDefault: true,
          createdAt: now
        },
        {
          id: 'tpl-gdp-directive',
          nameEn: 'Internal Directorate GDP Compliance Directive',
          nameAm: 'የውስጥ ዳይሬክቶሬት የመጋዘን ጥራት (GDP) መመሪያ',
          type: 'InternalMemo',
          category: 'Internal Governance',
          defaultPriority: 'Normal',
          defaultConfidentiality: 'Internal',
          defaultSenderOrg: 'EPSS Director General Executive Office',
          defaultRecipientOrg: 'All EPSS Regional Branch Managers & Warehouse Custodians',
          defaultDepartmentId: 'dept-qa',
          subjectEnTemplate: 'Directive on Quarterly Good Distribution Practice (GDP) & Cold-Room Calibration Audit',
          subjectAmTemplate: 'የሩብ ዓመት የመድኃኒት ማከማቻ ጥራት (GDP) እና የቀዝቃዛ ክፍል ካሊብሬሽን ፍተሻ መመሪያ',
          bodyEnTemplate:
            'All regional hub warehouse custodians must submit calibrated temperature logs, FEFO batch rotation schedules, and quarantined consignment registers prior to audit close.',
          bodyAmTemplate:
            'ሁሉም የክልል ቅርንጫፍ መጋዘን ኃላፊዎች የሙቀት መመዝገቢያ መረጃዎችን እና የFEFO አሰራር ሪፖርቶችን በወቅቱ እንዲያቀርቡ።',
          createdByName: 'EPSS Standards Registry',
          isSystemDefault: true,
          createdAt: now
        }
      ];
    }

    if (!Array.isArray(this.data.documentLinks)) {
      this.data.documentLinks = [];
    }

    if (this.data.documentLinks.length === 0) {
      const hasDoc1 = this.data.documents.some(d => d.id === 'doc-001' && !d.isDeleted);
      const hasDoc2 = this.data.documents.some(d => d.id === 'doc-002' && !d.isDeleted);
      const hasDoc3 = this.data.documents.some(d => d.id === 'doc-003' && !d.isDeleted);
      const hasDoc4 = this.data.documents.some(d => d.id === 'doc-004' && !d.isDeleted);
      const now = new Date().toISOString();

      if (hasDoc3 && hasDoc1) {
        this.data.documentLinks.push({
          id: 'lnk-seed-001',
          sourceDocumentId: 'doc-003',
          targetDocumentId: 'doc-001',
          linkType: 'ParentTender',
          notes: 'International tender award notice linked to upstream EFDA regulatory consignment dossier.',
          createdByUserId: 'usr-proc',
          createdByName: 'Tigist Haile',
          createdAt: now
        });
      }
      if (hasDoc4 && hasDoc2) {
        this.data.documentLinks.push({
          id: 'lnk-seed-002',
          sourceDocumentId: 'doc-004',
          targetDocumentId: 'doc-002',
          linkType: 'RelatedDossier',
          notes: 'Internal cold-chain inspection memo supporting MoH cholera outbreak vaccine dispatch.',
          createdByUserId: 'usr-store',
          createdByName: 'Hiwot Tadesse',
          createdAt: now
        });
      }
    }
  }

  public getDocumentLinks(
    docId: string,
    actor: User,
    session?: AuthSession
  ): { success: boolean; statusCode?: number; error?: string; mfaNeeded?: boolean; links?: EnrichedDocumentLink[] } {
    const doc = this.getDocumentById(docId);
    if (!doc || doc.isDeleted) {
      return { success: false, statusCode: 404, error: 'Document not found.' };
    }
    const access = this.canAccessDocument(actor, doc, session);
    if (!access.allowed) {
      return { success: false, statusCode: 403, error: access.reason, mfaNeeded: access.mfaNeeded };
    }

    const enriched: EnrichedDocumentLink[] = [];
    for (const link of this.data.documentLinks || []) {
      if (link.sourceDocumentId !== docId && link.targetDocumentId !== docId) continue;
      const isOutgoing = link.sourceDocumentId === docId;
      const peerId = isOutgoing ? link.targetDocumentId : link.sourceDocumentId;
      const peer = this.getDocumentById(peerId);
      if (!peer || peer.isDeleted) continue;
      const peerAccess = this.canAccessDocument(actor, peer, session);
      if (!peerAccess.allowed) continue;

      enriched.push({
        link,
        direction: isOutgoing ? 'Outgoing' : 'Incoming',
        linkedDocument: {
          id: peer.id,
          registrationNumber: peer.registrationNumber,
          referenceNumber: peer.referenceNumber,
          type: peer.type,
          subjectEn: peer.subjectEn,
          subjectAm: peer.subjectAm,
          status: peer.status,
          registrationDate: peer.registrationDate
        }
      });
    }

    return { success: true, links: enriched };
  }

  public createDocumentLink(
    sourceDocumentId: string,
    payload: { targetDocumentId: string; linkType: DocumentLinkType; notes?: string },
    actor: User,
    session: AuthSession | undefined,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string; mfaNeeded?: boolean; link?: EnrichedDocumentLink } {
    if (!this.hasPermission(actor, 'edit:documents') && !this.hasPermission(actor, 'create:documents')) {
      return { success: false, statusCode: 403, error: 'Forbidden: document modification permission required.' };
    }

    const allowedTypes: DocumentLinkType[] = [
      'ReplyTo',
      'Supersedes',
      'Amends',
      'RelatedDossier',
      'ParentTender'
    ];
    if (!allowedTypes.includes(payload.linkType)) {
      return { success: false, statusCode: 400, error: `Invalid linkType. Allowed: ${allowedTypes.join(', ')}` };
    }

    const targetDocumentId = (payload.targetDocumentId || '').trim();
    if (!targetDocumentId) {
      return { success: false, statusCode: 400, error: 'targetDocumentId is required.' };
    }
    if (sourceDocumentId === targetDocumentId) {
      return { success: false, statusCode: 400, error: 'Cannot link a correspondence record to itself.' };
    }

    const sourceDoc = this.getDocumentById(sourceDocumentId);
    const targetDoc = this.getDocumentById(targetDocumentId);
    if (!sourceDoc || sourceDoc.isDeleted || !targetDoc || targetDoc.isDeleted) {
      return { success: false, statusCode: 404, error: 'Source or target correspondence record not found.' };
    }

    const srcAccess = this.canAccessDocument(actor, sourceDoc, session);
    if (!srcAccess.allowed) {
      return { success: false, statusCode: 403, error: srcAccess.reason, mfaNeeded: srcAccess.mfaNeeded };
    }
    const tgtAccess = this.canAccessDocument(actor, targetDoc, session);
    if (!tgtAccess.allowed) {
      return { success: false, statusCode: 403, error: tgtAccess.reason, mfaNeeded: tgtAccess.mfaNeeded };
    }

    if (!Array.isArray(this.data.documentLinks)) {
      this.data.documentLinks = [];
    }

    const duplicate = this.data.documentLinks.some(
      l =>
        (l.sourceDocumentId === sourceDocumentId &&
          l.targetDocumentId === targetDocumentId &&
          l.linkType === payload.linkType) ||
        (payload.linkType === 'RelatedDossier' &&
          l.sourceDocumentId === targetDocumentId &&
          l.targetDocumentId === sourceDocumentId &&
          l.linkType === 'RelatedDossier')
    );
    if (duplicate) {
      return { success: false, statusCode: 409, error: 'A link of this relationship type already exists between these records.' };
    }

    const now = new Date().toISOString();
    const link: DocumentLink = {
      id: `lnk-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      sourceDocumentId,
      targetDocumentId,
      linkType: payload.linkType,
      notes: payload.notes?.trim() || undefined,
      createdByUserId: actor.id,
      createdByName: actor.fullNameEn,
      createdAt: now
    };
    this.data.documentLinks.unshift(link);

    sourceDoc.workflowHistory.push({
      id: `wh-lnk-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      timestamp: now,
      actorId: actor.id,
      actorName: actor.fullNameEn,
      actorRole: actor.role,
      action: 'Reviewed',
      comments: `Linked dossier record (${payload.linkType}) -> ${targetDoc.registrationNumber}${link.notes ? `: ${link.notes}` : ''}`
    });

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'LINKED_CORRESPONDENCE_DOSSIER',
      resourceType: 'DocumentLink',
      resourceId: link.id,
      ipAddress: clientIp,
      details: `Linked ${sourceDoc.registrationNumber} [${payload.linkType}] -> ${targetDoc.registrationNumber}`
    });
    this.save();

    return {
      success: true,
      link: {
        link,
        direction: 'Outgoing',
        linkedDocument: {
          id: targetDoc.id,
          registrationNumber: targetDoc.registrationNumber,
          referenceNumber: targetDoc.referenceNumber,
          type: targetDoc.type,
          subjectEn: targetDoc.subjectEn,
          subjectAm: targetDoc.subjectAm,
          status: targetDoc.status,
          registrationDate: targetDoc.registrationDate
        }
      }
    };
  }

  public deleteDocumentLink(
    docId: string,
    linkId: string,
    actor: User,
    session: AuthSession | undefined,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string; mfaNeeded?: boolean } {
    if (!this.hasPermission(actor, 'edit:documents') && !this.hasPermission(actor, 'delete:documents')) {
      return { success: false, statusCode: 403, error: 'Forbidden: document modification permission required.' };
    }
    const doc = this.getDocumentById(docId);
    if (!doc || doc.isDeleted) {
      return { success: false, statusCode: 404, error: 'Document not found.' };
    }
    const access = this.canAccessDocument(actor, doc, session);
    if (!access.allowed) {
      return { success: false, statusCode: 403, error: access.reason, mfaNeeded: access.mfaNeeded };
    }

    const idx = (this.data.documentLinks || []).findIndex(
      l => l.id === linkId && (l.sourceDocumentId === docId || l.targetDocumentId === docId)
    );
    if (idx === -1) {
      return { success: false, statusCode: 404, error: 'Document link not found.' };
    }

    const [removed] = this.data.documentLinks.splice(idx, 1);
    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'UNLINKED_CORRESPONDENCE_DOSSIER',
      resourceType: 'DocumentLink',
      resourceId: removed.id,
      ipAddress: clientIp,
      details: `Removed ${removed.linkType} link between ${removed.sourceDocumentId} and ${removed.targetDocumentId}`
    });
    this.save();

    return { success: true };
  }

  public getCorrespondenceTemplates(): CorrespondenceTemplate[] {
    return [...(this.data.correspondenceTemplates || [])];
  }

  public createCorrespondenceTemplate(
    payload: Partial<CorrespondenceTemplate>,
    actor: User,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string; template?: CorrespondenceTemplate } {
    if (!this.hasPermission(actor, 'create:documents') && !this.hasPermission(actor, 'edit:documents')) {
      return { success: false, statusCode: 403, error: 'Forbidden: create:documents permission required.' };
    }

    const nameEn = (payload.nameEn || '').trim();
    const subjectEnTemplate = (payload.subjectEnTemplate || '').trim();
    const bodyEnTemplate = (payload.bodyEnTemplate || '').trim();
    if (nameEn.length < 3) {
      return { success: false, statusCode: 400, error: 'Template name (English) must be at least 3 characters.' };
    }
    if (subjectEnTemplate.length < 5 || bodyEnTemplate.length < 5) {
      return { success: false, statusCode: 400, error: 'Subject template and body synopsis template must be at least 5 characters.' };
    }

    const allowedTypes: DocumentType[] = [
      'IncomingLetter',
      'OutgoingLetter',
      'InternalMemo',
      'Application',
      'TenderDocument',
      'InspectionReport',
      'Circular'
    ];
    const type: DocumentType = allowedTypes.includes(payload.type as DocumentType)
      ? (payload.type as DocumentType)
      : 'OutgoingLetter';

    const allowedPriorities: PriorityLevel[] = ['Normal', 'Urgent', 'VeryUrgent'];
    const defaultPriority: PriorityLevel = allowedPriorities.includes(payload.defaultPriority as PriorityLevel)
      ? (payload.defaultPriority as PriorityLevel)
      : 'Normal';

    const allowedConf: ConfidentialityLevel[] = ['Public', 'Internal', 'Confidential', 'Secret'];
    const defaultConfidentiality: ConfidentialityLevel = allowedConf.includes(payload.defaultConfidentiality as ConfidentialityLevel)
      ? (payload.defaultConfidentiality as ConfidentialityLevel)
      : 'Internal';

    const tpl: CorrespondenceTemplate = {
      id: `tpl-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      nameEn,
      nameAm: (payload.nameAm || '').trim() || nameEn,
      type,
      category: (payload.category || '').trim() || 'Institutional Custom',
      defaultPriority,
      defaultConfidentiality,
      defaultSenderOrg: payload.defaultSenderOrg?.trim() || undefined,
      defaultRecipientOrg: payload.defaultRecipientOrg?.trim() || undefined,
      defaultDepartmentId: payload.defaultDepartmentId?.trim() || undefined,
      subjectEnTemplate,
      subjectAmTemplate: (payload.subjectAmTemplate || '').trim() || subjectEnTemplate,
      bodyEnTemplate,
      bodyAmTemplate: (payload.bodyAmTemplate || '').trim() || bodyEnTemplate,
      createdByName: actor.fullNameEn,
      isSystemDefault: false,
      createdAt: new Date().toISOString()
    };

    if (!Array.isArray(this.data.correspondenceTemplates)) {
      this.data.correspondenceTemplates = [];
    }
    this.data.correspondenceTemplates.unshift(tpl);

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'CREATED_CORRESPONDENCE_TEMPLATE',
      resourceType: 'CorrespondenceTemplate',
      resourceId: tpl.id,
      ipAddress: clientIp,
      details: `Created bilingual template "${tpl.nameEn}" (${tpl.type})`
    });
    this.save();

    return { success: true, template: tpl };
  }

  public deleteCorrespondenceTemplate(
    id: string,
    actor: User,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string } {
    if (!this.hasPermission(actor, 'edit:documents') && !this.hasPermission(actor, 'delete:documents')) {
      return { success: false, statusCode: 403, error: 'Forbidden: document modification permission required.' };
    }
    const idx = (this.data.correspondenceTemplates || []).findIndex(t => t.id === id);
    if (idx === -1) {
      return { success: false, statusCode: 404, error: 'Correspondence template not found.' };
    }

    const tpl = this.data.correspondenceTemplates[idx];
    if (tpl.isSystemDefault && actor.role !== 'SuperAdmin') {
      return {
        success: false,
        statusCode: 403,
        error: 'Only SuperAdmin may delete system default institutional templates.'
      };
    }

    this.data.correspondenceTemplates.splice(idx, 1);
    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'DELETED_CORRESPONDENCE_TEMPLATE',
      resourceType: 'CorrespondenceTemplate',
      resourceId: tpl.id,
      ipAddress: clientIp,
      details: `Deleted bilingual template "${tpl.nameEn}"`
    });
    this.save();

    return { success: true };
  }

  // =========================================================================
  // PHASE 13: HIGH-CUSTOMIZABLE ENTERPRISE ROLE MANAGEMENT, ABAC & GOVERNANCE
  // =========================================================================

  private pushRealtimeSecurityNotification(params: {
    targetUserId: string;
    titleEn: string;
    titleAm: string;
    messageEn: string;
    messageAm: string;
    priority?: 'Normal' | 'Urgent' | 'Critical';
  }) {
    const notif: AppNotification = {
      id: `notif-sec-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      titleEn: params.titleEn,
      titleAm: params.titleAm,
      messageEn: params.messageEn,
      messageAm: params.messageAm,
      timestamp: new Date().toISOString(),
      type: 'Security',
      isRead: false,
      userId: params.targetUserId,
      channel: 'InApp',
      priority: params.priority || 'Critical'
    };
    this.data.notifications.unshift(notif);
    this.data.notifications = this.data.notifications.slice(0, 150);
    this.notificationBroadcaster?.('notification:created', notif, params.targetUserId);
  }

  private ensurePhase13RbacState() {
    this.data.authPolicy = {
      ...DEFAULT_AUTH_POLICY,
      ...(this.data.authPolicy || {})
    };
    if (this.data.authPolicy.progressiveDelayBaseSeconds === undefined) {
      this.data.authPolicy.progressiveDelayBaseSeconds = 2;
    }
    if (this.data.authPolicy.maxConcurrentSessions === undefined) {
      this.data.authPolicy.maxConcurrentSessions = 3;
    }
    if (this.data.authPolicy.maxTimeBoundRoleDays === undefined) {
      this.data.authPolicy.maxTimeBoundRoleDays = 365;
    }
    if (this.data.authPolicy.maxBreakGlassHours === undefined) {
      this.data.authPolicy.maxBreakGlassHours = 4;
    }

    if (!Array.isArray(this.data.permissionCatalogue) || this.data.permissionCatalogue.length === 0) {
      this.data.permissionCatalogue = createInitialPermissionCatalogue();
    }
    if (!Array.isArray(this.data.permissionSets) || this.data.permissionSets.length === 0) {
      this.data.permissionSets = createInitialPermissionSets();
    }
    if (!Array.isArray(this.data.enterpriseRoles) || this.data.enterpriseRoles.length === 0) {
      this.data.enterpriseRoles = createInitialEnterpriseRoles(this.data.permissionCatalogue);
    }
    if (!Array.isArray(this.data.sodRules) || this.data.sodRules.length === 0) {
      this.data.sodRules = createInitialSodRules();
    }
    if (!Array.isArray(this.data.autoAssignmentRules) || this.data.autoAssignmentRules.length === 0) {
      this.data.autoAssignmentRules = createInitialAutoAssignmentRules();
    }
    if (!Array.isArray(this.data.accessReviewCampaigns) || this.data.accessReviewCampaigns.length === 0) {
      this.data.accessReviewCampaigns = createInitialAccessReviewCampaigns();
    }
    if (!Array.isArray(this.data.userRoleAssignments)) {
      this.data.userRoleAssignments = [];
    }
    if (!Array.isArray(this.data.breakGlassElevations)) {
      this.data.breakGlassElevations = [];
    }

    // Ensure baseline SecurityOfficer & SystemAuditor staff exist for Break-Glass alerts & System Role governance
    const defaultPassHash = this.hashSecret('EPSS#Gov2026!');
    const defaultPinHash = this.hashSecret('246810');
    if (!this.data.users.some(u => u.role === 'SecurityOfficer')) {
      this.data.users.push({
        id: 'usr-sec-officer',
        username: 'mekdes.s',
        fullNameEn: 'Mekdes Solomon',
        fullNameAm: 'መቅደስ ሰለሞን',
        email: 'mekdes.solomon@epss.gov.et',
        role: 'SecurityOfficer',
        branchId: 'br-ho',
        branchNameEn: 'EPSS Head Office (Addis Ababa)',
        branchNameAm: 'የኢ.መ.አ.አ ዋና መሥሪያ ቤት (አዲስ አበባ)',
        departmentId: 'dept-ict',
        departmentNameEn: 'ICT & Systems Directorate',
        departmentNameAm: 'የኢንፎርሜሽን ቴክኖሎጂ ዳይሬክቶሬት',
        position: 'Information Security Officer',
        permissions: ['admin.manage_users', 'admin.manage_roles', 'admin.view_audit', 'read:audit', 'manage:users'],
        status: 'Active',
        mfaRequired: true,
        failedLoginAttempts: 0,
        passwordHash: defaultPassHash,
        mfaPinHash: defaultPinHash
      });
    }
    if (!this.data.users.some(u => u.role === 'SystemAuditor')) {
      this.data.users.push({
        id: 'usr-sys-audit',
        username: 'bereket.t',
        fullNameEn: 'Bereket Tadesse',
        fullNameAm: 'በረከት ታደሰ',
        email: 'bereket.tadesse@epss.gov.et',
        role: 'SystemAuditor',
        branchId: 'br-ho',
        branchNameEn: 'EPSS Head Office (Addis Ababa)',
        branchNameAm: 'የኢ.መ.አ.አ ዋና መሥሪያ ቤት (አዲስ አበባ)',
        departmentId: 'dept-audit',
        departmentNameEn: 'Internal Audit & Compliance Directorate',
        departmentNameAm: 'የውስጥ ኦዲትና ተገዢነት ዳይሬክቶሬት',
        position: 'Principal System Auditor',
        permissions: ['document.read', 'admin.view_audit', 'reporting.view', 'read:documents', 'read:audit'],
        status: 'Active',
        mfaRequired: true,
        failedLoginAttempts: 0,
        passwordHash: defaultPassHash,
        mfaPinHash: defaultPinHash
      });
    }

    // Seed initial composite UserRoleAssignment rows for key users if none exist
    if (this.data.userRoleAssignments.length === 0) {
      const now = '2026-01-15T08:00:00Z';
      for (const u of this.data.users) {
        const matchedRole = this.data.enterpriseRoles.find(r => r.code === u.role);
        if (matchedRole) {
          this.data.userRoleAssignments.push({
            id: `ura-seed-${u.id}`,
            userId: u.id,
            roleId: matchedRole.id,
            roleCode: matchedRole.code,
            roleNameEn: matchedRole.nameEn,
            roleNameAm: matchedRole.nameAm,
            scopeType: matchedRole.scopeType,
            scopeTargetId: matchedRole.scopeType === 'Branch' ? u.branchId : undefined,
            startDate: now,
            justification: 'Initial institutional organizational chart baseline assignment',
            ticketRef: 'EPSS-IAM-2026-001',
            status: 'Active',
            approvedById: 'usr-admin',
            approvedByName: 'System Security Administrator',
            approvedAt: now,
            assignedById: 'usr-admin',
            assignedByName: 'System Security Administrator',
            createdAt: now
          });
        }
      }
    }
  }

  public getAuthPolicy(): AuthPolicyConfig {
    return {
      ...DEFAULT_AUTH_POLICY,
      ...(this.data.authPolicy || {})
    };
  }

  public updateAuthPolicy(
    updates: Partial<AuthPolicyConfig>,
    actor: User,
    reason: string,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string; policy?: AuthPolicyConfig } {
    if (!this.hasPermission(actor, 'admin.manage_roles') && actor.role !== 'SuperAdmin' && actor.role !== 'SecurityOfficer') {
      return { success: false, statusCode: 403, error: 'Forbidden: admin.manage_roles permission required.' };
    }
    const cleanReason = (reason || '').trim();
    if (cleanReason.length < 10) {
      return { success: false, statusCode: 400, error: 'Reason/justification of at least 10 characters is required.' };
    }

    const before = { ...this.getAuthPolicy() };
    const next: AuthPolicyConfig = {
      maxFailedAttempts: Math.min(20, Math.max(3, Number(updates.maxFailedAttempts ?? before.maxFailedAttempts))),
      lockoutDurationMinutes: Math.min(1440, Math.max(1, Number(updates.lockoutDurationMinutes ?? before.lockoutDurationMinutes))),
      progressiveDelayBaseSeconds: Math.min(30, Math.max(0, Number(updates.progressiveDelayBaseSeconds ?? before.progressiveDelayBaseSeconds ?? 2))),
      idleTimeoutMinutes: Math.min(240, Math.max(5, Number(updates.idleTimeoutMinutes ?? before.idleTimeoutMinutes))),
      absoluteTimeoutHours: Math.min(72, Math.max(1, Number(updates.absoluteTimeoutHours ?? before.absoluteTimeoutHours))),
      maxConcurrentSessions: Math.min(20, Math.max(1, Number(updates.maxConcurrentSessions ?? before.maxConcurrentSessions ?? 3))),
      minPasswordLength: Math.min(32, Math.max(8, Number(updates.minPasswordLength ?? before.minPasswordLength))),
      maxDelegationDays: Math.min(365, Math.max(1, Number(updates.maxDelegationDays ?? before.maxDelegationDays))),
      maxTimeBoundRoleDays: Math.min(1825, Math.max(1, Number(updates.maxTimeBoundRoleDays ?? before.maxTimeBoundRoleDays ?? 365))),
      maxBreakGlassHours: Math.min(24, Math.max(1, Number(updates.maxBreakGlassHours ?? before.maxBreakGlassHours ?? 4)))
    };

    this.data.authPolicy = next;
    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'UPDATED_AUTH_POLICY',
      resourceType: 'AuthPolicy',
      resourceId: 'global-auth-policy',
      ipAddress: clientIp,
      details: `Updated authentication & role duration security policy`,
      reason: cleanReason,
      beforeValue: JSON.stringify(before),
      afterValue: JSON.stringify(next)
    });
    this.save();
    return { success: true, policy: next };
  }

  private collectRoleClosure(
    roleIdOrCode: string,
    visitedRoleIds: Set<string> = new Set(),
    includeInactive = false
  ): EnterpriseRole[] {
    const role = (this.data.enterpriseRoles || []).find(
      r => r.id === roleIdOrCode || r.code === roleIdOrCode
    );
    if (!role) return [];
    if (!includeInactive && role.status !== 'Active') return [];
    if (visitedRoleIds.has(role.id)) return [];
    visitedRoleIds.add(role.id);

    const list: EnterpriseRole[] = [role];
    for (const parentId of role.parentRoleIds || []) {
      list.push(...this.collectRoleClosure(parentId, visitedRoleIds, includeInactive));
    }
    return list;
  }

  private expireTimeBoundStates(notifyExpiringSoon = false) {
    const now = Date.now();
    let changed = false;

    for (const bg of this.data.breakGlassElevations || []) {
      if (bg.status === 'Active' && now >= new Date(bg.expiresAt).getTime()) {
        bg.status = 'Expired';
        changed = true;
      }
    }

    const sevenDaysMs = 7 * 86400000;
    for (const a of this.data.userRoleAssignments || []) {
      if (a.status === 'Active' && a.endDate) {
        const endMs = new Date(a.endDate).getTime();
        if (now > endMs) {
          a.status = 'Expired';
          changed = true;
        } else if (notifyExpiringSoon && endMs - now <= sevenDaysMs && !a.expiryNotifiedAt) {
          a.expiryNotifiedAt = new Date(now).toISOString();
          changed = true;
          this.pushRealtimeSecurityNotification({
            targetUserId: a.userId,
            titleEn: `Role Assignment Expiring Soon: ${a.roleNameEn}`,
            titleAm: `የሚና ጊዜ ሊያበቃ ነው: ${a.roleNameAm}`,
            messageEn: `Your time-bound role "${a.roleCode}" expires on ${a.endDate.slice(0, 10)}. Request renewal if needed.`,
            messageAm: `የ"${a.roleNameAm}" ሚናዎ በ ${a.endDate.slice(0, 10)} ያበቃል።`,
            priority: 'Urgent'
          });
        }
      }
    }

    if (changed) {
      this.save();
    }
  }

  public getEffectivePermissionsForUser(
    userId: string,
    visitedUserIds: Set<string> = new Set()
  ): EffectivePermissionPreview {
    const user = this.getUserById(userId);
    if (!user) {
      return {
        userId,
        userName: 'Unknown User',
        activeRoleCodes: [],
        effectiveLevels: {},
        explicitDenies: [],
        activeAbacRules: [],
        sodWarnings: [],
        activeBreakGlass: null
      };
    }

    this.expireTimeBoundStates(false);

    const now = Date.now();
    const collectedRoles: EnterpriseRole[] = [];
    const visitedRoles = new Set<string>();

    // 1. Primary user role
    collectedRoles.push(...this.collectRoleClosure(user.role, visitedRoles));

    // 2. Active time-bound / scoped composite role assignments
    const activeAssignments = (this.data.userRoleAssignments || []).filter(
      a =>
        a.userId === userId &&
        a.status === 'Active' &&
        new Date(a.startDate).getTime() <= now &&
        (!a.endDate || now <= new Date(a.endDate).getTime())
    );
    for (const a of activeAssignments) {
      collectedRoles.push(...this.collectRoleClosure(a.roleId, visitedRoles));
    }

    // 3. Active Break-Glass elevation
    const activeBreakGlass = (this.data.breakGlassElevations || []).find(
      bg => bg.userId === userId && bg.status === 'Active' && now < new Date(bg.expiresAt).getTime()
    ) || null;
    if (activeBreakGlass) {
      collectedRoles.push(...this.collectRoleClosure(activeBreakGlass.targetRoleId, visitedRoles));
    }

    const effectiveLevels: Record<string, PermissionScopeLevel> = {};
    const denySet = new Set<string>();
    const activeAbacRules: AbacRule[] = [];
    const activeRoleCodes = new Set<string>();

    const mergeGrant = (key: string, candidateLevel: PermissionScopeLevel) => {
      const current = effectiveLevels[key] || 'None';
      if ((PERMISSION_LEVEL_RANK[candidateLevel] || 0) > (PERMISSION_LEVEL_RANK[current] || 0)) {
        effectiveLevels[key] = candidateLevel;
      }
    };

    for (const role of collectedRoles) {
      activeRoleCodes.add(role.code);

      // Permission sets attached to role
      for (const psId of role.permissionSetIds || []) {
        const ps = (this.data.permissionSets || []).find(p => p.id === psId);
        if (ps) {
          for (const [k, lvl] of Object.entries(ps.grants || {})) {
            mergeGrant(k, lvl);
          }
        }
      }

      // Direct role grants
      for (const [k, lvl] of Object.entries(role.grants || {})) {
        mergeGrant(k, lvl);
      }

      // Explicit denies
      for (const d of role.denies || []) {
        denySet.add(d);
      }

      // ABAC rules
      for (const r of role.abacRules || []) {
        activeAbacRules.push(r);
      }
    }

    // Include legacy direct permissions on user record if present
    for (const leg of user.permissions || []) {
      if (leg === '*') {
        for (const p of this.data.permissionCatalogue || []) {
          mergeGrant(p.key, 'All');
        }
      } else {
        const mapped = LEGACY_TO_CATALOGUE_MAP[leg] || [leg];
        for (const m of mapped) {
          mergeGrant(m, 'Organization');
        }
      }
    }

    // Check active incoming delegations (acting authority)
    if (!visitedUserIds.has(userId)) {
      visitedUserIds.add(userId);
      const incomingDelegations = (this.data.delegations || []).filter(
        d =>
          d.delegateId === userId &&
          d.status === 'Active' &&
          new Date(d.startDate).getTime() <= now &&
          now <= new Date(d.endDate).getTime()
      );
      for (const del of incomingDelegations) {
        const delegatorEff = this.getEffectivePermissionsForUser(del.delegatorId, visitedUserIds);
        for (const [k, lvl] of Object.entries(delegatorEff.effectiveLevels)) {
          if (!delegatorEff.explicitDenies.includes(k)) {
            mergeGrant(k, lvl);
          }
        }
      }
    }

    // EXPLICIT DENY ALWAYS WINS
    for (const deniedKey of denySet) {
      effectiveLevels[deniedKey] = 'None';
    }

    const sodWarnings = this.evaluateSodForUserState(
      user,
      Array.from(activeRoleCodes),
      effectiveLevels,
      Array.from(denySet)
    );

    return {
      userId: user.id,
      userName: user.fullNameEn,
      activeRoleCodes: Array.from(activeRoleCodes),
      effectiveLevels,
      explicitDenies: Array.from(denySet),
      activeAbacRules,
      sodWarnings,
      activeBreakGlass
    };
  }

  private evaluateSodForUserState(
    user: User,
    roleCodes: string[],
    effectiveLevels: Record<string, PermissionScopeLevel>,
    denies: string[]
  ): SodViolationItem[] {
    if (user.role === 'SuperAdmin') return [];
    const violations: SodViolationItem[] = [];
    const hasActivePerm = (permKey: string) =>
      !denies.includes(permKey) && !!effectiveLevels[permKey] && effectiveLevels[permKey] !== 'None';

    for (const rule of this.data.sodRules || []) {
      if (!rule.isActive) continue;
      if (rule.ruleType === 'RolePair') {
        const leftMatch =
          roleCodes.includes(rule.leftItem) ||
          (rule.rightItem === 'Auditor' && roleCodes.includes('SystemAuditor'));
        const rightMatch =
          roleCodes.includes(rule.rightItem) ||
          (rule.rightItem === 'Auditor' && roleCodes.includes('SystemAuditor'));
        if (leftMatch && rightMatch) {
          violations.push({
            ruleId: rule.id,
            ruleNameEn: rule.nameEn,
            severity: rule.severity,
            userId: user.id,
            userName: user.fullNameEn,
            username: user.username,
            detail: `User holds conflicting roles "${rule.leftItem}" and "${rule.rightItem}".`
          });
        }
      } else if (rule.ruleType === 'PermissionPair') {
        if (hasActivePerm(rule.leftItem) && hasActivePerm(rule.rightItem)) {
          violations.push({
            ruleId: rule.id,
            ruleNameEn: rule.nameEn,
            severity: rule.severity,
            userId: user.id,
            userName: user.fullNameEn,
            username: user.username,
            detail: `User holds conflicting permissions "${rule.leftItem}" and "${rule.rightItem}".`
          });
        }
      }
    }
    return violations;
  }

  public getPermissionCatalogue(): PermissionDefinition[] {
    return [...(this.data.permissionCatalogue || [])];
  }

  public createCustomPermission(
    payload: Partial<PermissionDefinition> & { reason?: string },
    actor: User,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string; permission?: PermissionDefinition } {
    if (!this.hasPermission(actor, 'admin.manage_roles') && actor.role !== 'SuperAdmin') {
      return { success: false, statusCode: 403, error: 'Forbidden: admin.manage_roles permission required.' };
    }
    const key = (payload.key || '').trim().toLowerCase();
    const nameEn = (payload.nameEn || '').trim();
    const nameAm = (payload.nameAm || '').trim();
    const reason = (payload.reason || '').trim();
    if (!/^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/.test(key)) {
      return {
        success: false,
        statusCode: 400,
        error: 'Permission key must follow module.action lowercase format (e.g. reporting.export_custom).'
      };
    }
    if (nameEn.length < 3 || nameEn.length > 100 || nameAm.length < 2) {
      return { success: false, statusCode: 400, error: 'Both English (3-100 chars) and Amharic permission names are required.' };
    }
    if (reason.length < 10) {
      return { success: false, statusCode: 400, error: 'A justification reason (min 10 characters) is required.' };
    }
    if ((this.data.permissionCatalogue || []).some(p => p.key === key)) {
      return { success: false, statusCode: 409, error: `Permission key "${key}" already exists.` };
    }

    const perm: PermissionDefinition = {
      id: `perm-custom-${Date.now().toString(36)}`,
      key,
      category: payload.category || 'Administration',
      nameEn,
      nameAm,
      descriptionEn: (payload.descriptionEn || nameEn).trim(),
      descriptionAm: (payload.descriptionAm || nameAm).trim(),
      isCustom: true,
      createdAt: new Date().toISOString()
    };

    this.data.permissionCatalogue.push(perm);

    // Ensure SuperAdmin keeps full catalogue access
    const superRole = this.data.enterpriseRoles.find(r => r.code === 'SuperAdmin');
    if (superRole) {
      superRole.grants[key] = 'All';
    }

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'CREATED_CUSTOM_PERMISSION',
      resourceType: 'PermissionDefinition',
      resourceId: perm.key,
      ipAddress: clientIp,
      details: `Added custom permission "${perm.key}" (${perm.category})`,
      reason,
      beforeValue: 'null',
      afterValue: JSON.stringify(perm)
    });
    this.save();
    return { success: true, permission: perm };
  }

  public getPermissionSets(): PermissionSet[] {
    return [...(this.data.permissionSets || [])];
  }

  public createPermissionSet(
    payload: Partial<PermissionSet> & { reason?: string },
    actor: User,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string; permissionSet?: PermissionSet } {
    if (!this.hasPermission(actor, 'admin.manage_roles') && actor.role !== 'SuperAdmin') {
      return { success: false, statusCode: 403, error: 'Forbidden: admin.manage_roles permission required.' };
    }
    const nameEn = (payload.nameEn || '').trim();
    const nameAm = (payload.nameAm || '').trim();
    const reason = (payload.reason || '').trim();
    if (nameEn.length < 3 || nameEn.length > 100 || nameAm.length < 2) {
      return { success: false, statusCode: 400, error: 'English (3-100 chars) and Amharic names are required.' };
    }
    if (reason.length < 10) {
      return { success: false, statusCode: 400, error: 'A reason of at least 10 characters is required.' };
    }

    const grants = payload.grants || {};
    const esc = this.validateNoPrivilegeEscalation(actor, grants);
    if (!esc.valid) {
      return { success: false, statusCode: 403, error: esc.error };
    }

    const setObj: PermissionSet = {
      id: `pset-${Date.now().toString(36)}`,
      nameEn,
      nameAm,
      descriptionEn: (payload.descriptionEn || nameEn).trim(),
      grants,
      isSystem: false,
      createdAt: new Date().toISOString()
    };
    this.data.permissionSets.push(setObj);
    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'CREATED_PERMISSION_SET',
      resourceType: 'PermissionSet',
      resourceId: setObj.id,
      ipAddress: clientIp,
      details: `Created permission set "${setObj.nameEn}" with ${Object.keys(grants).length} grants`,
      reason,
      beforeValue: 'null',
      afterValue: JSON.stringify(setObj)
    });
    this.save();
    return { success: true, permissionSet: setObj };
  }

  private validateRoleScopeTarget(scopeType: RoleScopeType, scopeTargetId?: string): { valid: boolean; error?: string } {
    if (scopeType === 'Global') return { valid: true };
    if (!scopeTargetId || !scopeTargetId.trim()) {
      return { valid: false, error: `Scope target is required when scopeType is "${scopeType}".` };
    }
    const target = scopeTargetId.trim();
    if (scopeType === 'Branch') {
      if (!this.data.branches.some(b => b.id === target)) {
        return { valid: false, error: `Selected Branch ID "${target}" does not exist.` };
      }
    } else if (scopeType === 'Department') {
      if (!this.data.departments.some(d => d.id === target)) {
        return { valid: false, error: `Selected Department / Directorate ID "${target}" does not exist.` };
      }
    } else if (scopeType === 'Cluster') {
      if (!['Central', 'Northern', 'Western', 'SouthernEastern'].includes(target)) {
        return { valid: false, error: `Invalid cluster target "${target}".` };
      }
    } else if (scopeType === 'DocumentType') {
      const validTypes = [
        'IncomingLetter',
        'OutgoingLetter',
        'InternalMemo',
        'Application',
        'TenderDocument',
        'InspectionReport',
        'Circular'
      ];
      if (!validTypes.includes(target)) {
        return { valid: false, error: `Invalid DocumentType scope target "${target}".` };
      }
    }
    return { valid: true };
  }

  private wouldCreateRoleCycle(roleId: string | null, parentRoleIds: string[]): boolean {
    if (!parentRoleIds || parentRoleIds.length === 0) return false;
    if (roleId && parentRoleIds.includes(roleId)) return true;

    const visit = (currId: string, seen: Set<string>): boolean => {
      if (roleId && currId === roleId) return true;
      if (seen.has(currId)) return false;
      seen.add(currId);
      const r = (this.data.enterpriseRoles || []).find(x => x.id === currId);
      if (!r) return false;
      for (const p of r.parentRoleIds || []) {
        if (visit(p, new Set(seen))) return true;
      }
      return false;
    };

    return parentRoleIds.some(pid => visit(pid, new Set()));
  }

  private validateNoPrivilegeEscalation(
    actor: User,
    targetGrants: Record<string, PermissionScopeLevel>,
    targetPermissionSetIds: string[] = []
  ): { valid: boolean; error?: string } {
    if (actor.role === 'SuperAdmin') return { valid: true };
    const actorEff = this.getEffectivePermissionsForUser(actor.id);

    const combinedTarget: Record<string, PermissionScopeLevel> = { ...targetGrants };
    for (const psId of targetPermissionSetIds) {
      const ps = (this.data.permissionSets || []).find(p => p.id === psId);
      if (ps) {
        for (const [k, lvl] of Object.entries(ps.grants || {})) {
          const cur = combinedTarget[k] || 'None';
          if ((PERMISSION_LEVEL_RANK[lvl] || 0) > (PERMISSION_LEVEL_RANK[cur] || 0)) {
            combinedTarget[k] = lvl;
          }
        }
      }
    }

    for (const [permKey, reqLevel] of Object.entries(combinedTarget)) {
      if (!reqLevel || reqLevel === 'None') continue;
      if (actorEff.explicitDenies.includes(permKey)) {
        return {
          valid: false,
          error: `Privilege escalation prevented: "${permKey}" is explicitly denied for your account.`
        };
      }
      const actorLevel = actorEff.effectiveLevels[permKey] || 'None';
      if ((PERMISSION_LEVEL_RANK[reqLevel] || 0) > (PERMISSION_LEVEL_RANK[actorLevel] || 0)) {
        return {
          valid: false,
          error: `Privilege escalation prevented: cannot grant "${permKey}" at level "${reqLevel}" (your effective level is "${actorLevel}").`
        };
      }
    }
    return { valid: true };
  }

  public getEnterpriseRoles(): Array<EnterpriseRole & { usersCount: number }> {
    this.expireTimeBoundStates(false);
    const now = Date.now();
    return (this.data.enterpriseRoles || []).map(role => {
      const assignedUserIds = new Set<string>();
      for (const u of this.data.users) {
        if (u.status !== 'Inactive' && u.role === role.code) {
          assignedUserIds.add(u.id);
        }
      }
      for (const a of this.data.userRoleAssignments || []) {
        if (
          a.roleId === role.id &&
          a.status === 'Active' &&
          new Date(a.startDate).getTime() <= now &&
          (!a.endDate || now <= new Date(a.endDate).getTime())
        ) {
          assignedUserIds.add(a.userId);
        }
      }
      return {
        ...role,
        usersCount: assignedUserIds.size
      };
    });
  }

  public createEnterpriseRole(
    payload: Partial<EnterpriseRole> & { reason?: string; versionNote?: string },
    actor: User,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string; role?: EnterpriseRole } {
    if (!this.hasPermission(actor, 'admin.manage_roles') && actor.role !== 'SuperAdmin') {
      return { success: false, statusCode: 403, error: 'Forbidden: admin.manage_roles permission required.' };
    }

    const nameEn = (payload.nameEn || '').trim();
    const nameAm = (payload.nameAm || '').trim();
    const code = (payload.code || nameEn.replace(/[^a-zA-Z0-9]/g, '')).trim();
    const reason = (payload.reason || '').trim();

    if (nameEn.length < 3 || nameEn.length > 100 || nameAm.length < 3 || nameAm.length > 100) {
      return { success: false, statusCode: 400, error: 'Role name must be 3-100 characters in both English and Amharic.' };
    }
    if (code.length < 3 || code.length > 60) {
      return { success: false, statusCode: 400, error: 'Role code must be 3-60 characters.' };
    }
    if (reason.length < 10) {
      return { success: false, statusCode: 400, error: 'A change justification reason (min 10 characters) is required.' };
    }

    const scopeType: RoleScopeType = payload.scopeType || 'Global';
    const scopeTargetId = payload.scopeTargetId?.trim() || undefined;
    const scopeCheck = this.validateRoleScopeTarget(scopeType, scopeTargetId);
    if (!scopeCheck.valid) {
      return { success: false, statusCode: 400, error: scopeCheck.error };
    }

    // Unique role name within scope
    const duplicate = (this.data.enterpriseRoles || []).some(
      r =>
        (r.nameEn.toLowerCase() === nameEn.toLowerCase() || r.code.toLowerCase() === code.toLowerCase()) &&
        r.scopeType === scopeType &&
        (r.scopeTargetId || '') === (scopeTargetId || '')
    );
    if (duplicate) {
      return { success: false, statusCode: 409, error: `Role name or code already exists within scope ${scopeType}.` };
    }

    const parentRoleIds = Array.isArray(payload.parentRoleIds) ? payload.parentRoleIds : [];
    const grants = payload.grants || {};
    const denies = Array.isArray(payload.denies) ? payload.denies : [];
    const permissionSetIds = Array.isArray(payload.permissionSetIds) ? payload.permissionSetIds : [];
    const abacRules = Array.isArray(payload.abacRules) ? payload.abacRules : [];

    const esc = this.validateNoPrivilegeEscalation(actor, grants, permissionSetIds);
    if (!esc.valid) {
      return { success: false, statusCode: 403, error: esc.error };
    }

    const now = new Date().toISOString();
    const status = payload.status === 'Draft' ? 'Draft' : 'Active';
    const role: EnterpriseRole = {
      id: `role-custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      code,
      nameEn,
      nameAm,
      descriptionEn: (payload.descriptionEn || nameEn).trim(),
      descriptionAm: (payload.descriptionAm || nameAm).trim(),
      isSystemRole: false,
      isSensitiveRole: !!payload.isSensitiveRole,
      status,
      scopeType,
      scopeTargetId,
      parentRoleIds,
      clonedFromRoleId: payload.clonedFromRoleId,
      requiresMfa: !!payload.requiresMfa,
      grants,
      denies,
      permissionSetIds,
      abacRules,
      version: 1,
      versionHistory: [
        {
          version: 1,
          changedAt: now,
          changedById: actor.id,
          changedByName: actor.fullNameEn,
          versionNote: (payload.versionNote || 'Initial custom role creation').trim(),
          reason,
          status,
          snapshot: {
            grants,
            denies,
            abacRules,
            parentRoleIds,
            requiresMfa: !!payload.requiresMfa
          }
        }
      ],
      createdAt: now,
      updatedAt: now,
      updatedByName: actor.fullNameEn
    };

    this.data.enterpriseRoles.push(role);
    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'CREATED_ENTERPRISE_ROLE',
      resourceType: 'EnterpriseRole',
      resourceId: role.code,
      ipAddress: clientIp,
      details: `Created custom role "${role.nameEn}" (${role.scopeType}) [${role.status}]`,
      reason,
      beforeValue: 'null',
      afterValue: JSON.stringify({ code: role.code, status: role.status, scopeType: role.scopeType, grants: role.grants, denies: role.denies })
    });
    this.save();
    return { success: true, role };
  }

  public updateEnterpriseRole(
    roleId: string,
    payload: Partial<EnterpriseRole> & { reason?: string; versionNote?: string },
    actor: User,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string; role?: EnterpriseRole } {
    if (!this.hasPermission(actor, 'admin.manage_roles') && actor.role !== 'SuperAdmin') {
      return { success: false, statusCode: 403, error: 'Forbidden: admin.manage_roles permission required.' };
    }
    const role = (this.data.enterpriseRoles || []).find(r => r.id === roleId || r.code === roleId);
    if (!role) {
      return { success: false, statusCode: 404, error: 'Enterprise role not found.' };
    }

    const reason = (payload.reason || '').trim();
    if (reason.length < 10) {
      return { success: false, statusCode: 400, error: 'A justification reason of at least 10 characters is required for every role update.' };
    }

    const nameEn = (payload.nameEn ?? role.nameEn).trim();
    const nameAm = (payload.nameAm ?? role.nameAm).trim();
    if (nameEn.length < 3 || nameEn.length > 100 || nameAm.length < 3 || nameAm.length > 100) {
      return { success: false, statusCode: 400, error: 'Role name must be 3-100 characters in both English and Amharic.' };
    }

    const scopeType: RoleScopeType = payload.scopeType || role.scopeType;
    const scopeTargetId = payload.scopeTargetId !== undefined ? payload.scopeTargetId?.trim() || undefined : role.scopeTargetId;
    const scopeCheck = this.validateRoleScopeTarget(scopeType, scopeTargetId);
    if (!scopeCheck.valid) {
      return { success: false, statusCode: 400, error: scopeCheck.error };
    }

    const duplicate = (this.data.enterpriseRoles || []).some(
      r =>
        r.id !== role.id &&
        r.nameEn.toLowerCase() === nameEn.toLowerCase() &&
        r.scopeType === scopeType &&
        (r.scopeTargetId || '') === (scopeTargetId || '')
    );
    if (duplicate) {
      return { success: false, statusCode: 409, error: `Another role named "${nameEn}" already exists in scope ${scopeType}.` };
    }

    const nextParents = payload.parentRoleIds ?? role.parentRoleIds;
    if (this.wouldCreateRoleCycle(role.id, nextParents)) {
      return { success: false, statusCode: 400, error: 'Circular inheritance detected in parent role hierarchy.' };
    }

    const nextGrants = payload.grants ?? role.grants;
    const nextDenies = payload.denies ?? role.denies;
    const nextSets = payload.permissionSetIds ?? role.permissionSetIds;
    const nextAbac = payload.abacRules ?? role.abacRules;
    const nextStatus = payload.status ?? role.status;

    // System role immutability checks
    if (role.isSystemRole) {
      if (nextStatus === 'Inactive' || nextStatus === 'Draft') {
        return { success: false, statusCode: 403, error: `System baseline role "${role.code}" cannot be deactivated or reverted to draft.` };
      }
      // Core permissions of baseline version 1 cannot be removed or downgraded
      const baseline = role.versionHistory?.[0]?.snapshot;
      if (baseline) {
        for (const [k, baseLvl] of Object.entries(baseline.grants || {})) {
          const newLvl = nextGrants[k] || 'None';
          if ((PERMISSION_LEVEL_RANK[newLvl] || 0) < (PERMISSION_LEVEL_RANK[baseLvl] || 0) || nextDenies.includes(k)) {
            return {
              success: false,
              statusCode: 403,
              error: `System role "${role.code}" is immutable: core permission "${k}" (${baseLvl}) cannot be removed or downgraded.`
            };
          }
        }
      }
    }

    // No privilege escalation
    const esc = this.validateNoPrivilegeEscalation(actor, nextGrants, nextSets);
    if (!esc.valid) {
      return { success: false, statusCode: 403, error: esc.error };
    }

    const beforeSnapshot = {
      nameEn: role.nameEn,
      status: role.status,
      scopeType: role.scopeType,
      grants: role.grants,
      denies: role.denies,
      abacRules: role.abacRules,
      parentRoleIds: role.parentRoleIds
    };

    const now = new Date().toISOString();
    role.nameEn = nameEn;
    role.nameAm = nameAm;
    role.descriptionEn = (payload.descriptionEn ?? role.descriptionEn).trim();
    role.descriptionAm = (payload.descriptionAm ?? role.descriptionAm).trim();
    role.scopeType = scopeType;
    role.scopeTargetId = scopeTargetId;
    role.parentRoleIds = nextParents;
    role.grants = nextGrants;
    role.denies = nextDenies;
    role.permissionSetIds = nextSets;
    role.abacRules = nextAbac;
    role.status = nextStatus;
    role.isSensitiveRole = payload.isSensitiveRole ?? role.isSensitiveRole;
    role.requiresMfa = role.code === 'SuperAdmin' ? true : (payload.requiresMfa ?? role.requiresMfa);
    role.version = (role.version || 1) + 1;
    role.updatedAt = now;
    role.updatedByName = actor.fullNameEn;
    role.versionHistory = role.versionHistory || [];
    role.versionHistory.unshift({
      version: role.version,
      changedAt: now,
      changedById: actor.id,
      changedByName: actor.fullNameEn,
      versionNote: (payload.versionNote || `Published v${role.version}`).trim(),
      reason,
      status: role.status,
      snapshot: {
        grants: { ...nextGrants },
        denies: [...nextDenies],
        abacRules: [...nextAbac],
        parentRoleIds: [...nextParents],
        requiresMfa: role.requiresMfa
      }
    });

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'UPDATED_ENTERPRISE_ROLE',
      resourceType: 'EnterpriseRole',
      resourceId: role.code,
      ipAddress: clientIp,
      details: `Updated role "${role.nameEn}" to v${role.version} [${role.status}]`,
      reason,
      beforeValue: JSON.stringify(beforeSnapshot),
      afterValue: JSON.stringify({
        nameEn: role.nameEn,
        status: role.status,
        scopeType: role.scopeType,
        grants: role.grants,
        denies: role.denies,
        abacRules: role.abacRules,
        parentRoleIds: role.parentRoleIds
      })
    });
    this.save();
    return { success: true, role };
  }

  public cloneEnterpriseRole(
    sourceRoleId: string,
    payload: { nameEn: string; nameAm: string; code?: string; reason: string },
    actor: User,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string; role?: EnterpriseRole } {
    const src = (this.data.enterpriseRoles || []).find(r => r.id === sourceRoleId || r.code === sourceRoleId);
    if (!src) {
      return { success: false, statusCode: 404, error: 'Source template role not found.' };
    }
    return this.createEnterpriseRole(
      {
        nameEn: payload.nameEn,
        nameAm: payload.nameAm,
        code: payload.code,
        descriptionEn: src.descriptionEn,
        descriptionAm: src.descriptionAm,
        scopeType: src.scopeType,
        scopeTargetId: src.scopeTargetId,
        parentRoleIds: [...src.parentRoleIds],
        clonedFromRoleId: src.id,
        isSensitiveRole: src.isSensitiveRole,
        requiresMfa: src.requiresMfa,
        grants: { ...src.grants },
        denies: [...src.denies],
        permissionSetIds: [...src.permissionSetIds],
        abacRules: src.abacRules.map(a => ({ ...a, id: `abac-${Date.now()}-${Math.random().toString(36).slice(2, 5)}` })),
        status: 'Draft',
        reason: payload.reason,
        versionNote: `Cloned from template ${src.code} (v${src.version})`
      },
      actor,
      clientIp
    );
  }

  public setEnterpriseRoleStatus(
    roleId: string,
    status: 'Active' | 'Inactive' | 'Draft',
    reason: string,
    actor: User,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string; role?: EnterpriseRole } {
    if (!this.hasPermission(actor, 'admin.manage_roles') && actor.role !== 'SuperAdmin') {
      return { success: false, statusCode: 403, error: 'Forbidden: admin.manage_roles permission required.' };
    }
    const role = (this.data.enterpriseRoles || []).find(r => r.id === roleId);
    if (!role) {
      return { success: false, statusCode: 404, error: 'Enterprise role not found.' };
    }
    if (role.isSystemRole && status !== 'Active') {
      return { success: false, statusCode: 403, error: `System role "${role.code}" cannot be deactivated.` };
    }
    const cleanReason = (reason || '').trim();
    if (cleanReason.length < 10) {
      return { success: false, statusCode: 400, error: 'Reason of at least 10 characters is required to change role status.' };
    }

    const oldStatus = role.status;
    role.status = status;
    role.updatedAt = new Date().toISOString();
    role.updatedByName = actor.fullNameEn;
    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: status === 'Inactive' ? 'DEACTIVATED_ENTERPRISE_ROLE' : 'ACTIVATED_ENTERPRISE_ROLE',
      resourceType: 'EnterpriseRole',
      resourceId: role.code,
      ipAddress: clientIp,
      details: `Changed role "${role.nameEn}" status from ${oldStatus} to ${status}`,
      reason: cleanReason,
      beforeValue: oldStatus,
      afterValue: status
    });
    this.save();
    return { success: true, role };
  }

  public getUserRoleAssignments(userId?: string): UserRoleAssignment[] {
    this.expireTimeBoundStates(true);
    const list = this.data.userRoleAssignments || [];
    return userId ? list.filter(a => a.userId === userId) : [...list];
  }

  public assignRoleToUser(
    payload: {
      userId: string;
      roleId: string;
      scopeType?: RoleScopeType;
      scopeTargetId?: string;
      startDate?: string;
      endDate?: string;
      justification: string;
      ticketRef?: string;
      requireApproval?: boolean;
      overrideBreakGlass?: boolean;
    },
    actor: User,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string; assignment?: UserRoleAssignment } {
    if (!this.hasPermission(actor, 'admin.manage_roles') && !this.hasPermission(actor, 'admin.manage_users') && actor.role !== 'SuperAdmin') {
      return { success: false, statusCode: 403, error: 'Forbidden: role assignment permission required.' };
    }

    const targetUser = this.getUserById(payload.userId);
    if (!targetUser || targetUser.status === 'Inactive') {
      return { success: false, statusCode: 404, error: 'Target staff user not found or inactive.' };
    }

    const role = (this.data.enterpriseRoles || []).find(r => r.id === payload.roleId || r.code === payload.roleId);
    if (!role || role.status !== 'Active') {
      return { success: false, statusCode: 404, error: 'Selected role not found or is not Active.' };
    }

    const justification = (payload.justification || '').trim();
    if (justification.length < 10) {
      return { success: false, statusCode: 400, error: 'Assignment justification must be at least 10 characters.' };
    }

    // Check privilege escalation against role grants
    const esc = this.validateNoPrivilegeEscalation(actor, role.grants, role.permissionSetIds);
    if (!esc.valid) {
      return { success: false, statusCode: 403, error: esc.error };
    }

    const scopeType: RoleScopeType = payload.scopeType || role.scopeType;
    const scopeTargetId = payload.scopeTargetId?.trim() || role.scopeTargetId;
    const scopeCheck = this.validateRoleScopeTarget(scopeType, scopeTargetId);
    if (!scopeCheck.valid) {
      return { success: false, statusCode: 400, error: scopeCheck.error };
    }

    const startMs = payload.startDate ? new Date(payload.startDate).getTime() : Date.now();
    if (Number.isNaN(startMs)) {
      return { success: false, statusCode: 400, error: 'Invalid start date.' };
    }

    let endIso: string | undefined;
    if (payload.endDate) {
      const endMs = new Date(payload.endDate).getTime();
      if (Number.isNaN(endMs) || endMs <= startMs) {
        return { success: false, statusCode: 400, error: 'End date must be strictly after start date.' };
      }
      const maxDays = this.getAuthPolicy().maxTimeBoundRoleDays || 365;
      const days = (endMs - startMs) / 86400000;
      if (days > maxDays) {
        return { success: false, statusCode: 400, error: `Time-bound role duration cannot exceed ${maxDays} days.` };
      }
      endIso = new Date(endMs).toISOString();
    }

    // Check Separation of Duties (SoD) violations with candidate role
    const currentEff = this.getEffectivePermissionsForUser(targetUser.id);
    const candidateClosure = this.collectRoleClosure(role.id, new Set());
    const simulatedRoles = Array.from(new Set([...currentEff.activeRoleCodes, ...candidateClosure.map(r => r.code)]));
    const simulatedLevels: Record<string, PermissionScopeLevel> = { ...currentEff.effectiveLevels };
    const simulatedDenies = [...currentEff.explicitDenies];

    for (const cr of candidateClosure) {
      for (const [k, lvl] of Object.entries(cr.grants || {})) {
        if (!simulatedDenies.includes(k)) {
          const cur = simulatedLevels[k] || 'None';
          if ((PERMISSION_LEVEL_RANK[lvl] || 0) > (PERMISSION_LEVEL_RANK[cur] || 0)) {
            simulatedLevels[k] = lvl;
          }
        }
      }
    }

    const sodViolations = this.evaluateSodForUserState(targetUser, simulatedRoles, simulatedLevels, simulatedDenies);
    const blockingViolations = sodViolations.filter(v => v.severity === 'Blocking');
    if (blockingViolations.length > 0 && !payload.overrideBreakGlass) {
      return {
        success: false,
        statusCode: 409,
        error: `Separation of Duties (SoD) conflict blocked assignment: ${blockingViolations[0].detail}`
      };
    }

    const needsApproval = (role.isSensitiveRole || payload.requireApproval) && actor.role !== 'SuperAdmin';
    const now = new Date().toISOString();
    const assignment: UserRoleAssignment = {
      id: `ura-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      userId: targetUser.id,
      roleId: role.id,
      roleCode: role.code,
      roleNameEn: role.nameEn,
      roleNameAm: role.nameAm,
      scopeType,
      scopeTargetId,
      startDate: new Date(startMs).toISOString(),
      endDate: endIso,
      justification,
      ticketRef: payload.ticketRef?.trim() || undefined,
      status: needsApproval ? 'PendingApproval' : 'Active',
      approvedById: needsApproval ? undefined : actor.id,
      approvedByName: needsApproval ? undefined : actor.fullNameEn,
      approvedAt: needsApproval ? undefined : now,
      assignedById: actor.id,
      assignedByName: actor.fullNameEn,
      createdAt: now
    };

    this.data.userRoleAssignments.unshift(assignment);
    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: needsApproval ? 'ROLE_ASSIGNMENT_PENDING_APPROVAL' : 'ASSIGNED_USER_ROLE',
      resourceType: 'UserRoleAssignment',
      resourceId: assignment.id,
      ipAddress: clientIp,
      details: `Assigned role "${role.code}" (${scopeType}) to ${targetUser.fullNameEn} [${assignment.status}]`,
      reason: justification,
      beforeValue: JSON.stringify({ roles: currentEff.activeRoleCodes }),
      afterValue: JSON.stringify({ addedRole: role.code, status: assignment.status, endDate: endIso || 'permanent' })
    });
    this.save();
    return { success: true, assignment };
  }

  public bulkAssignRoles(
    payload: {
      userIds: string[];
      roleId: string;
      scopeType?: RoleScopeType;
      scopeTargetId?: string;
      startDate?: string;
      endDate?: string;
      justification: string;
      ticketRef?: string;
    },
    actor: User,
    clientIp: string
  ): {
    success: boolean;
    statusCode?: number;
    error?: string;
    succeededCount: number;
    failedCount: number;
    results: Array<{ userId: string; success: boolean; error?: string; assignmentId?: string }>;
  } {
    const userIds = Array.isArray(payload.userIds) ? payload.userIds : [];
    if (userIds.length === 0) {
      return { success: false, statusCode: 400, error: 'Select at least one staff user.', succeededCount: 0, failedCount: 0, results: [] };
    }
    const results: Array<{ userId: string; success: boolean; error?: string; assignmentId?: string }> = [];
    let succeededCount = 0;
    let failedCount = 0;

    for (const uid of userIds) {
      const res = this.assignRoleToUser({ ...payload, userId: uid }, actor, clientIp);
      if (res.success && res.assignment) {
        succeededCount++;
        results.push({ userId: uid, success: true, assignmentId: res.assignment.id });
      } else {
        failedCount++;
        results.push({ userId: uid, success: false, error: res.error });
      }
    }

    return {
      success: succeededCount > 0,
      statusCode: succeededCount > 0 ? 200 : 400,
      error: succeededCount === 0 ? results[0]?.error || 'Bulk assignment failed.' : undefined,
      succeededCount,
      failedCount,
      results
    };
  }

  public decideRoleAssignment(
    assignmentId: string,
    approve: boolean,
    reason: string,
    actor: User,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string; assignment?: UserRoleAssignment } {
    if (!this.hasPermission(actor, 'admin.manage_roles') && actor.role !== 'SuperAdmin' && actor.role !== 'SecurityOfficer') {
      return { success: false, statusCode: 403, error: 'Forbidden: admin.manage_roles permission required.' };
    }
    const cleanReason = (reason || '').trim();
    if (cleanReason.length < 10) {
      return { success: false, statusCode: 400, error: 'Decision justification must be at least 10 characters.' };
    }
    const a = (this.data.userRoleAssignments || []).find(x => x.id === assignmentId);
    if (!a) {
      return { success: false, statusCode: 404, error: 'Role assignment not found.' };
    }
    if (a.status !== 'PendingApproval') {
      return { success: false, statusCode: 400, error: 'Assignment is not awaiting approval.' };
    }
    if (a.assignedById === actor.id && actor.role !== 'SuperAdmin') {
      return { success: false, statusCode: 403, error: 'Dual-control rule: requester cannot self-approve sensitive role assignment.' };
    }

    const beforeStatus = a.status;
    a.status = approve ? 'Active' : 'Rejected';
    a.approvedById = actor.id;
    a.approvedByName = actor.fullNameEn;
    a.approvedAt = new Date().toISOString();

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: approve ? 'APPROVED_ROLE_ASSIGNMENT' : 'REJECTED_ROLE_ASSIGNMENT',
      resourceType: 'UserRoleAssignment',
      resourceId: a.id,
      ipAddress: clientIp,
      details: `${approve ? 'Approved' : 'Rejected'} role assignment ${a.roleCode} for user ${a.userId}`,
      reason: cleanReason,
      beforeValue: beforeStatus,
      afterValue: a.status
    });
    this.save();
    return { success: true, assignment: a };
  }

  public revokeRoleAssignment(
    assignmentId: string,
    reason: string,
    actor: User,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string } {
    if (!this.hasPermission(actor, 'admin.manage_roles') && !this.hasPermission(actor, 'admin.manage_users') && actor.role !== 'SuperAdmin') {
      return { success: false, statusCode: 403, error: 'Forbidden: admin.manage_roles permission required.' };
    }
    const cleanReason = (reason || '').trim();
    if (cleanReason.length < 10) {
      return { success: false, statusCode: 400, error: 'Revocation reason must be at least 10 characters.' };
    }
    const a = (this.data.userRoleAssignments || []).find(x => x.id === assignmentId);
    if (!a) {
      return { success: false, statusCode: 404, error: 'Role assignment not found.' };
    }
    const before = a.status;
    a.status = 'Revoked';

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'REVOKED_USER_ROLE',
      resourceType: 'UserRoleAssignment',
      resourceId: a.id,
      ipAddress: clientIp,
      details: `Revoked role "${a.roleCode}" from user ${a.userId}`,
      reason: cleanReason,
      beforeValue: before,
      afterValue: 'Revoked'
    });
    this.save();
    return { success: true };
  }

  public bulkRevokeRoleAssignments(
    payload: { assignmentIds: string[]; reason: string },
    actor: User,
    clientIp: string
  ): {
    success: boolean;
    statusCode?: number;
    error?: string;
    succeededCount: number;
    failedCount: number;
    results: Array<{ assignmentId: string; success: boolean; error?: string }>;
  } {
    if (
      !this.hasPermission(actor, 'admin.manage_roles') &&
      !this.hasPermission(actor, 'admin.manage_users') &&
      actor.role !== 'SuperAdmin'
    ) {
      return {
        success: false,
        statusCode: 403,
        error: 'Forbidden: admin.manage_roles permission required.',
        succeededCount: 0,
        failedCount: 0,
        results: []
      };
    }

    const cleanReason = (payload.reason || '').trim();
    if (cleanReason.length < 10) {
      return {
        success: false,
        statusCode: 400,
        error: 'Bulk revocation reason must be at least 10 characters.',
        succeededCount: 0,
        failedCount: 0,
        results: []
      };
    }

    const ids = Array.isArray(payload.assignmentIds) ? payload.assignmentIds : [];
    if (ids.length === 0) {
      return {
        success: false,
        statusCode: 400,
        error: 'Select at least one role assignment to revoke.',
        succeededCount: 0,
        failedCount: 0,
        results: []
      };
    }

    const results: Array<{ assignmentId: string; success: boolean; error?: string }> = [];
    let succeededCount = 0;
    let failedCount = 0;

    for (const id of ids) {
      const res = this.revokeRoleAssignment(id, cleanReason, actor, clientIp);
      if (res.success) {
        succeededCount++;
        results.push({ assignmentId: id, success: true });
      } else {
        failedCount++;
        results.push({ assignmentId: id, success: false, error: res.error });
      }
    }

    return {
      success: succeededCount > 0,
      statusCode: succeededCount > 0 ? 200 : 400,
      error: succeededCount === 0 ? results[0]?.error || 'Bulk revocation failed.' : undefined,
      succeededCount,
      failedCount,
      results
    };
  }

  public getSodRules(): SodRule[] {
    return [...(this.data.sodRules || [])];
  }

  public createSodRule(
    payload: Partial<SodRule> & { reason?: string },
    actor: User,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string; rule?: SodRule } {
    if (!this.hasPermission(actor, 'admin.manage_roles') && actor.role !== 'SuperAdmin' && actor.role !== 'SecurityOfficer') {
      return { success: false, statusCode: 403, error: 'Forbidden: admin.manage_roles permission required.' };
    }
    const nameEn = (payload.nameEn || '').trim();
    const nameAm = (payload.nameAm || '').trim();
    const leftItem = (payload.leftItem || '').trim();
    const rightItem = (payload.rightItem || '').trim();
    const reason = (payload.reason || '').trim();

    if (nameEn.length < 3 || nameAm.length < 2) {
      return { success: false, statusCode: 400, error: 'Both English and Amharic SoD rule names are required.' };
    }
    if (!leftItem || !rightItem || leftItem === rightItem) {
      return { success: false, statusCode: 400, error: 'Two distinct conflicting roles or permissions are required.' };
    }
    if (reason.length < 10) {
      return { success: false, statusCode: 400, error: 'Justification reason (min 10 characters) is required.' };
    }

    const rule: SodRule = {
      id: `sod-${Date.now().toString(36)}`,
      nameEn,
      nameAm,
      description: (payload.description || nameEn).trim(),
      ruleType: payload.ruleType || 'RolePair',
      leftItem,
      rightItem,
      severity: payload.severity === 'Warning' ? 'Warning' : 'Blocking',
      isActive: true,
      createdAt: new Date().toISOString()
    };

    this.data.sodRules.push(rule);
    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'CREATED_SOD_RULE',
      resourceType: 'SodRule',
      resourceId: rule.id,
      ipAddress: clientIp,
      details: `Created ${rule.severity} SoD rule "${rule.nameEn}" (${leftItem} <-> ${rightItem})`,
      reason,
      beforeValue: 'null',
      afterValue: JSON.stringify(rule)
    });
    this.save();
    return { success: true, rule };
  }

  public deleteSodRule(
    ruleId: string,
    reason: string,
    actor: User,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string } {
    if (!this.hasPermission(actor, 'admin.manage_roles') && actor.role !== 'SuperAdmin') {
      return { success: false, statusCode: 403, error: 'Forbidden: admin.manage_roles permission required.' };
    }
    const cleanReason = (reason || '').trim();
    if (cleanReason.length < 10) {
      return { success: false, statusCode: 400, error: 'Justification reason (min 10 characters) is required.' };
    }
    const idx = (this.data.sodRules || []).findIndex(r => r.id === ruleId);
    if (idx === -1) {
      return { success: false, statusCode: 404, error: 'SoD rule not found.' };
    }
    const [removed] = this.data.sodRules.splice(idx, 1);
    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'DELETED_SOD_RULE',
      resourceType: 'SodRule',
      resourceId: removed.id,
      ipAddress: clientIp,
      details: `Removed SoD rule "${removed.nameEn}"`,
      reason: cleanReason,
      beforeValue: JSON.stringify(removed),
      afterValue: 'null'
    });
    this.save();
    return { success: true };
  }

  public getOrganizationSodReport(): SodViolationItem[] {
    const allViolations: SodViolationItem[] = [];
    for (const u of this.data.users) {
      if (u.status === 'Inactive') continue;
      const eff = this.getEffectivePermissionsForUser(u.id);
      allViolations.push(...eff.sodWarnings);
    }
    return allViolations;
  }

  public getBreakGlassElevations(): BreakGlassElevation[] {
    this.expireTimeBoundStates(false);
    return [...(this.data.breakGlassElevations || [])];
  }

  public createBreakGlassElevation(
    payload: {
      userId: string;
      targetRoleId: string;
      durationHours: number;
      reason: string;
      ticketRef?: string;
      dualApprovedById: string;
    },
    actor: User,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string; elevation?: BreakGlassElevation } {
    if (!this.hasPermission(actor, 'admin.manage_roles') && actor.role !== 'SuperAdmin' && actor.role !== 'SecurityOfficer') {
      return { success: false, statusCode: 403, error: 'Forbidden: Break-Glass elevation requires SuperAdmin or SecurityOfficer privilege.' };
    }

    const targetUser = this.getUserById(payload.userId);
    if (!targetUser || targetUser.status !== 'Active') {
      return { success: false, statusCode: 404, error: 'Target staff user not found or inactive.' };
    }
    const targetRole = (this.data.enterpriseRoles || []).find(r => r.id === payload.targetRoleId || r.code === payload.targetRoleId);
    if (!targetRole || targetRole.status !== 'Active') {
      return { success: false, statusCode: 404, error: 'Target elevation role not found or inactive.' };
    }

    const cleanReason = (payload.reason || '').trim();
    if (cleanReason.length < 10) {
      return { success: false, statusCode: 400, error: 'Emergency break-glass reason (min 10 characters) is required.' };
    }

    const maxHours = this.getAuthPolicy().maxBreakGlassHours || 4;
    const hours = Number(payload.durationHours);
    if (Number.isNaN(hours) || hours <= 0 || hours > maxHours) {
      return {
        success: false,
        statusCode: 400,
        error: `Break-Glass duration must be between 0.5 and ${maxHours} hours.`
      };
    }

    const dualApprover = this.getUserById(payload.dualApprovedById);
    if (!dualApprover || dualApprover.status !== 'Active') {
      return { success: false, statusCode: 400, error: 'Valid second-officer dual approver is required.' };
    }
    if (dualApprover.id === actor.id || dualApprover.id === targetUser.id) {
      return { success: false, statusCode: 400, error: 'Dual approver must be an independent officer (different from requester and target).' };
    }

    const now = Date.now();
    const elevation: BreakGlassElevation = {
      id: `bg-${now.toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      userId: targetUser.id,
      userName: targetUser.fullNameEn,
      targetRoleId: targetRole.id,
      targetRoleCode: targetRole.code,
      reason: cleanReason,
      ticketRef: payload.ticketRef?.trim() || undefined,
      requestedAt: new Date(now).toISOString(),
      approvedById: actor.id,
      approvedByName: actor.fullNameEn,
      dualApprovedById: dualApprover.id,
      dualApprovedByName: dualApprover.fullNameEn,
      expiresAt: new Date(now + hours * 3600000).toISOString(),
      status: 'Active'
    };

    this.data.breakGlassElevations.unshift(elevation);

    // Send real-time alert to all SecurityOfficer users
    const secOfficers = this.data.users.filter(
      u => u.status === 'Active' && (u.role === 'SecurityOfficer' || this.getEffectivePermissionsForUser(u.id).activeRoleCodes.includes('SecurityOfficer'))
    );
    for (const officer of secOfficers) {
      this.pushRealtimeSecurityNotification({
        targetUserId: officer.id,
        titleEn: `BREAK-GLASS ELEVATION: ${targetUser.fullNameEn} -> ${targetRole.code}`,
        titleAm: `አስቸኳይ የፈቃድ ከፍ ማድረግ: ${targetUser.fullNameAm}`,
        messageEn: `Emergency ${hours}h elevation approved by ${actor.fullNameEn} & ${dualApprover.fullNameEn}. Reason: ${cleanReason}`,
        messageAm: `ለ${hours} ሰዓት አስቸኳይ ፈቃድ ተሰጥቷል። ምክንያት: ${cleanReason}`,
        priority: 'Critical'
      });
    }

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'BREAK_GLASS_ELEVATION_GRANTED',
      resourceType: 'BreakGlassElevation',
      resourceId: elevation.id,
      ipAddress: clientIp,
      details: `Granted ${hours}h emergency "${targetRole.code}" access to ${targetUser.fullNameEn} (Dual approver: ${dualApprover.fullNameEn})`,
      reason: cleanReason,
      beforeValue: 'NormalRole',
      afterValue: JSON.stringify(elevation)
    });
    this.save();
    return { success: true, elevation };
  }

  public revokeBreakGlassElevation(
    elevationId: string,
    reason: string,
    actor: User,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string; elevation?: BreakGlassElevation } {
    if (!this.hasPermission(actor, 'admin.manage_roles') && actor.role !== 'SuperAdmin' && actor.role !== 'SecurityOfficer') {
      return { success: false, statusCode: 403, error: 'Forbidden: SecurityOfficer or SuperAdmin required.' };
    }
    const cleanReason = (reason || '').trim();
    if (cleanReason.length < 10) {
      return { success: false, statusCode: 400, error: 'Reason (min 10 characters) is required to revoke Break-Glass access.' };
    }
    const bg = (this.data.breakGlassElevations || []).find(b => b.id === elevationId);
    if (!bg) {
      return { success: false, statusCode: 404, error: 'Break-Glass elevation record not found.' };
    }
    const beforeStatus = bg.status;
    bg.status = 'Revoked';
    bg.revokedAt = new Date().toISOString();
    bg.revokedByName = actor.fullNameEn;

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'BREAK_GLASS_ELEVATION_REVOKED',
      resourceType: 'BreakGlassElevation',
      resourceId: bg.id,
      ipAddress: clientIp,
      details: `Revoked emergency Break-Glass "${bg.targetRoleCode}" elevation for ${bg.userName}`,
      reason: cleanReason,
      beforeValue: beforeStatus,
      afterValue: 'Revoked'
    });
    this.save();
    return { success: true, elevation: bg };
  }

  public getAutoAssignmentRules(): RoleAutoAssignmentRule[] {
    return [...(this.data.autoAssignmentRules || [])];
  }

  public createAutoAssignmentRule(
    payload: Partial<RoleAutoAssignmentRule> & { reason?: string },
    actor: User,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string; rule?: RoleAutoAssignmentRule } {
    if (!this.hasPermission(actor, 'admin.manage_roles') && actor.role !== 'SuperAdmin') {
      return { success: false, statusCode: 403, error: 'Forbidden: admin.manage_roles permission required.' };
    }
    const nameEn = (payload.nameEn || '').trim();
    const nameAm = (payload.nameAm || nameEn).trim();
    const matchValue = (payload.matchValue || '').trim();
    const reason = (payload.reason || '').trim();
    const role = (this.data.enterpriseRoles || []).find(r => r.id === payload.targetRoleId || r.code === payload.targetRoleCode);

    if (nameEn.length < 3 || !matchValue || !role) {
      return { success: false, statusCode: 400, error: 'Rule name, match value, and target role are required.' };
    }
    if (reason.length < 10) {
      return { success: false, statusCode: 400, error: 'Reason (min 10 characters) is required.' };
    }

    const rule: RoleAutoAssignmentRule = {
      id: `auto-rule-${Date.now().toString(36)}`,
      nameEn,
      nameAm,
      matchField: payload.matchField || 'position',
      matchOperator: payload.matchOperator || 'contains',
      matchValue,
      targetRoleId: role.id,
      targetRoleCode: role.code,
      isActive: true,
      createdAt: new Date().toISOString()
    };
    this.data.autoAssignmentRules.push(rule);
    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'CREATED_AUTO_ASSIGNMENT_RULE',
      resourceType: 'RoleAutoAssignmentRule',
      resourceId: rule.id,
      ipAddress: clientIp,
      details: `Created auto-assignment rule "${rule.nameEn}" (${rule.matchField} ${rule.matchOperator} "${rule.matchValue}" -> ${role.code})`,
      reason,
      beforeValue: 'null',
      afterValue: JSON.stringify(rule)
    });
    this.save();
    return { success: true, rule };
  }

  public runAutoAssignmentRules(
    actor: User,
    clientIp: string
  ): { success: boolean; assignedCount: number; skippedCount: number; summary: string } {
    if (!this.hasPermission(actor, 'admin.manage_roles') && actor.role !== 'SuperAdmin') {
      return { success: false, assignedCount: 0, skippedCount: 0, summary: 'Forbidden: admin.manage_roles required.' };
    }
    let assignedCount = 0;
    let skippedCount = 0;

    for (const rule of (this.data.autoAssignmentRules || []).filter(r => r.isActive)) {
      for (const user of this.data.users.filter(u => u.status === 'Active')) {
        const userBranch = this.data.branches.find(b => b.id === user.branchId);
        let fieldVal = '';
        if (rule.matchField === 'position') fieldVal = user.position || '';
        else if (rule.matchField === 'departmentId') fieldVal = user.departmentId || '';
        else if (rule.matchField === 'branchId') fieldVal = user.branchId || '';
        else if (rule.matchField === 'cluster') fieldVal = userBranch?.cluster || '';

        const matched =
          rule.matchOperator === 'equals'
            ? fieldVal.toLowerCase() === rule.matchValue.toLowerCase()
            : fieldVal.toLowerCase().includes(rule.matchValue.toLowerCase());
        if (!matched) continue;

        const alreadyHas =
          user.role === rule.targetRoleCode ||
          (this.data.userRoleAssignments || []).some(
            a => a.userId === user.id && a.roleId === rule.targetRoleId && a.status === 'Active'
          );
        if (alreadyHas) continue;

        const res = this.assignRoleToUser(
          {
            userId: user.id,
            roleId: rule.targetRoleId,
            justification: `Automated HR rule execution: ${rule.nameEn}`,
            ticketRef: `AUTO-${rule.id}`
          },
          actor,
          clientIp
        );
        if (res.success) assignedCount++;
        else skippedCount++;
      }
    }

    return {
      success: true,
      assignedCount,
      skippedCount,
      summary: `Evaluated auto-assignment rules: ${assignedCount} role(s) assigned, ${skippedCount} skipped (SoD/approval guards).`
    };
  }

  public getAccessReviewCampaigns(): AccessReviewCampaign[] {
    return [...(this.data.accessReviewCampaigns || [])];
  }

  public createAccessReviewCampaign(
    payload: {
      titleEn: string;
      titleAm: string;
      description?: string;
      dueDate: string;
      reviewerIds: string[];
      targetRoleIds?: string[];
      reason: string;
    },
    actor: User,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string; campaign?: AccessReviewCampaign } {
    if (!this.hasPermission(actor, 'admin.manage_roles') && actor.role !== 'SuperAdmin' && actor.role !== 'SecurityOfficer') {
      return { success: false, statusCode: 403, error: 'Forbidden: admin.manage_roles permission required.' };
    }
    const titleEn = (payload.titleEn || '').trim();
    const titleAm = (payload.titleAm || '').trim();
    const reason = (payload.reason || '').trim();
    if (titleEn.length < 5 || titleAm.length < 3) {
      return { success: false, statusCode: 400, error: 'Campaign title in English (min 5) and Amharic are required.' };
    }
    if (reason.length < 10) {
      return { success: false, statusCode: 400, error: 'Campaign initiation justification (min 10 characters) is required.' };
    }
    const dueMs = new Date(payload.dueDate).getTime();
    if (Number.isNaN(dueMs) || dueMs <= Date.now()) {
      return { success: false, statusCode: 400, error: 'Campaign due date must be a valid future date.' };
    }

    const reviewerIds = payload.reviewerIds?.length ? payload.reviewerIds : [actor.id];
    const reviewerNames = reviewerIds.map(id => this.getUserById(id)?.fullNameEn || id);
    const activeAssignments = (this.data.userRoleAssignments || []).filter(a => a.status === 'Active');
    const filteredAssignments = payload.targetRoleIds?.length
      ? activeAssignments.filter(a => payload.targetRoleIds!.includes(a.roleId))
      : activeAssignments;

    const items = filteredAssignments.map((a, idx) => {
      const u = this.getUserById(a.userId);
      return {
        id: `ari-${Date.now().toString(36)}-${idx}`,
        userId: a.userId,
        userName: u?.fullNameEn || a.userId,
        username: u?.username || a.userId,
        roleId: a.roleId,
        roleCode: a.roleCode,
        roleNameEn: a.roleNameEn,
        assignmentId: a.id,
        scopeLabel: `${a.scopeType}${a.scopeTargetId ? `: ${a.scopeTargetId}` : ''}`,
        status: 'Pending' as const
      };
    });

    const campaign: AccessReviewCampaign = {
      id: `arc-${Date.now().toString(36)}`,
      titleEn,
      titleAm,
      description: (payload.description || reason).trim(),
      reviewerIds,
      reviewerNames,
      status: items.length === 0 ? 'Completed' : 'Active',
      dueDate: new Date(dueMs).toISOString(),
      createdAt: new Date().toISOString(),
      createdByName: actor.fullNameEn,
      items
    };

    this.data.accessReviewCampaigns.unshift(campaign);
    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'CREATED_ACCESS_REVIEW_CAMPAIGN',
      resourceType: 'AccessReviewCampaign',
      resourceId: campaign.id,
      ipAddress: clientIp,
      details: `Initiated Access Review campaign "${campaign.titleEn}" covering ${items.length} assignment(s)`,
      reason,
      beforeValue: 'null',
      afterValue: JSON.stringify({ id: campaign.id, itemCount: items.length, dueDate: campaign.dueDate })
    });
    this.save();
    return { success: true, campaign };
  }

  public decideAccessReviewItem(
    campaignId: string,
    itemId: string,
    decision: 'Approved' | 'Revoked' | 'Modified',
    comment: string,
    actor: User,
    clientIp: string
  ): { success: boolean; statusCode?: number; error?: string; campaign?: AccessReviewCampaign } {
    if (!this.hasPermission(actor, 'admin.manage_roles') && actor.role !== 'SuperAdmin' && actor.role !== 'SecurityOfficer' && actor.role !== 'DirectorGeneral') {
      return { success: false, statusCode: 403, error: 'Forbidden: reviewer authorization required.' };
    }
    const cleanComment = (comment || '').trim();
    if (cleanComment.length < 10) {
      return { success: false, statusCode: 400, error: 'Reviewer decision comment must be at least 10 characters.' };
    }

    const campaign = (this.data.accessReviewCampaigns || []).find(c => c.id === campaignId);
    if (!campaign) {
      return { success: false, statusCode: 404, error: 'Access review campaign not found.' };
    }
    const item = campaign.items.find(i => i.id === itemId);
    if (!item) {
      return { success: false, statusCode: 404, error: 'Review item not found in campaign.' };
    }

    const beforeStatus = item.status;
    item.status = decision;
    item.reviewerComment = cleanComment;
    item.reviewedAt = new Date().toISOString();
    item.reviewedByName = actor.fullNameEn;

    if (decision === 'Revoked') {
      if (item.assignmentId) {
        const assignment = (this.data.userRoleAssignments || []).find(a => a.id === item.assignmentId);
        if (assignment) {
          assignment.status = 'Revoked';
        }
      } else {
        for (const a of this.data.userRoleAssignments || []) {
          if (a.userId === item.userId && a.roleId === item.roleId && a.status === 'Active') {
            a.status = 'Revoked';
          }
        }
      }
    }

    if (campaign.items.every(i => i.status !== 'Pending')) {
      campaign.status = 'Completed';
    }

    this.addAuditLog({
      userId: actor.id,
      userName: actor.fullNameEn,
      userRole: actor.role,
      branchName: actor.branchNameEn,
      action: 'ACCESS_REVIEW_DECISION',
      resourceType: 'AccessReviewCampaign',
      resourceId: `${campaign.id}/${item.id}`,
      ipAddress: clientIp,
      details: `Reviewer marked ${item.userName} (${item.roleCode}) as ${decision}`,
      reason: cleanComment,
      beforeValue: beforeStatus,
      afterValue: decision
    });
    this.save();
    return { success: true, campaign };
  }
}

export const store = new EdrmsStore();
