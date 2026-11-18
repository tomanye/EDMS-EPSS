/**
 * EPSS EDRMS Domain Types & Data Contracts
 * Ethiopian Pharmaceutical Supply Service
 */

export type Language = 'en' | 'am';

export type BuiltInUserRole =
  | 'SuperAdmin'
  | 'SystemAuditor'
  | 'SecurityOfficer'
  | 'DirectorGeneral'
  | 'DeputyDG'
  | 'DirectorateDirector'
  | 'Director'
  | 'DepartmentHead'
  | 'TeamLeader'
  | 'RegistryOfficer'
  | 'BranchManager'
  | 'BranchRegistry'
  | 'ProcurementOfficer'
  | 'QualityOfficer'
  | 'LegalOfficer'
  | 'FinanceOfficer'
  | 'Auditor'
  | 'RecordsManager'
  | 'Viewer';

export type UserRole = BuiltInUserRole | (string & {});

export interface BiometricCredential {
  id: string;
  credentialId: string;
  publicKey?: string;
  counter: number;
  deviceName: string;
  authenticatorAttachment: 'platform' | 'cross-platform';
  registeredAt: string;
  lastUsedAt?: string;
}

export interface User {
  id: string;
  username: string;
  fullNameEn: string;
  fullNameAm: string;
  email: string;
  role: UserRole;
  branchId: string;
  branchNameEn: string;
  branchNameAm: string;
  departmentId: string;
  departmentNameEn: string;
  departmentNameAm: string;
  position: string;
  avatarUrl?: string;
  permissions: string[];
  status?: 'Active' | 'Inactive' | 'Locked';
  biometricsEnabled?: boolean;
  biometricCredentials?: BiometricCredential[];
  passwordHash?: string;
  mfaPinHash?: string;
  failedLoginAttempts?: number;
  lockedUntil?: string | null;
  nextAllowedLoginAt?: string | null;
  lastLoginAt?: string;
  lastPasswordChangeAt?: string;
  mfaRequired?: boolean;
  mustChangePassword?: boolean;
}

export type BranchCluster = 'Central' | 'Northern' | 'Western' | 'SouthernEastern';

export interface Branch {
  id: string;
  code: string;
  nameEn: string;
  nameAm: string;
  city: string;
  region: string;
  cluster: BranchCluster;
  isHeadOffice: boolean;
  phone: string;
  email: string;
  address: string;
  managerName: string;
  isActive?: boolean;
}

export interface Department {
  id: string;
  code: string;
  nameEn: string;
  nameAm: string;
  headUserId?: string;
  headNameEn?: string;
  directorateEn: string;
  directorateAm: string;
  isActive?: boolean;
}

export type DocumentType = 
  | 'IncomingLetter'
  | 'OutgoingLetter'
  | 'InternalMemo'
  | 'Application'
  | 'TenderDocument'
  | 'InspectionReport'
  | 'Circular';

export type ConfidentialityLevel = 
  | 'Public'
  | 'Internal'
  | 'Confidential'
  | 'Secret';

export type PriorityLevel = 
  | 'Normal'
  | 'Urgent'
  | 'VeryUrgent';

export type DocumentStatus = 
  | 'Received'
  | 'Registered'
  | 'UnderReview'
  | 'Assigned'
  | 'InProgress'
  | 'PendingInformation'
  | 'Forwarded'
  | 'AwaitingApproval'
  | 'Approved'
  | 'ResponsePrepared'
  | 'Dispatched'
  | 'Completed'
  | 'Archived'
  | 'Disposed'
  | 'Cancelled';

export interface DocumentAttachment {
  id: string;
  fileName: string;
  fileSize: number; // bytes
  mimeType: string;
  uploadDate: string;
  uploadedBy: string;
  fileUrl: string;
  version: number;
  description?: string;
  notes?: string;
}

export interface WorkflowActionRecord {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action:
    | 'Registered'
    | 'Forwarded'
    | 'Reviewed'
    | 'Approved'
    | 'ParallelApproved'
    | 'Rejected'
    | 'ReturnedForCorrection'
    | 'Dispatched'
    | 'MinuteAdded'
    | 'Delegated'
    | 'Escalated'
    | 'StageAdvanced'
    | 'Archived';
  decision?: string;
  comments: string;
  stageId?: string;
  stageName?: string;
  biometricVerified?: boolean;
  forwardedToDepartmentId?: string;
  forwardedToDepartmentName?: string;
  forwardedToUserId?: string;
  forwardedToUserName?: string;
  digitalSignature?: {
    signatureId?: string;
    signedByUserId?: string;
    signedBy: string;
    signedByRole?: string;
    certificateSerial: string;
    certificateFingerprint?: string;
    algorithm?: 'RSA-SHA256';
    documentDigestSha256?: string;
    signatureBase64?: string;
    signingMeaning?: string;
    biometricVerified?: boolean;
    mfaMethod?: 'webauthn' | 'pin' | 'session_mfa' | 'standard';
    timestamp: string;
    verified: boolean;
    invalidated?: boolean;
    invalidatedReason?: string;
  };
}

export interface PhysicalTrackingInfo {
  fileCode: string;
  building: string;
  floor: string;
  room: string;
  shelfNumber: string;
  boxNumber: string;
  currentCustodianId: string;
  currentCustodianName: string;
  expectedReturnDate?: string;
  lastMovedDate: string;
  movementsCount: number;
}

export interface DocumentItem {
  id: string;
  registrationNumber: string; // e.g. EPSS/IN/2026/00142
  referenceNumber: string; // External ref no or department ref no
  type: DocumentType;
  subjectEn: string;
  subjectAm: string;
  descriptionEn?: string;
  descriptionAm?: string;
  senderOrganization: string;
  senderPerson?: string;
  recipientOrganization: string;
  recipientPerson?: string;
  receivedDate: string;
  registrationDate: string;
  dueDate?: string;
  priority: PriorityLevel;
  confidentiality: ConfidentialityLevel;
  status: DocumentStatus;
  branchId: string;
  departmentId: string;
  assignedUserId?: string;
  assignedUserName?: string;
  assignedDepartmentName?: string;
  attachments: DocumentAttachment[];
  workflowHistory: WorkflowActionRecord[];
  physicalTracking?: PhysicalTrackingInfo;
  qrCodeDataUrl?: string;
  tags: string[];
  isArchived: boolean;
  archivedAt?: string;
  archivedBy?: string;
  archiveLocationPath?: string;
  retentionScheduleId?: string;
  retentionCategory?: string;
  retentionYears: number;
  retentionExpiryDate: string;
  legalHold: boolean;
  legalHoldReason?: string;
  legalHoldAppliedBy?: string;
  legalHoldAppliedAt?: string;
  disposalCertificateId?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  deleteReason?: string;
  ocrTextEn?: string;
  ocrTextAm?: string;
  ocrConfidence?: number;
  contentHash?: string;
  aiExtracted?: {
    summaryEn: string;
    summaryAm: string;
    suggestedCategory: string;
    suggestedDepartment: string;
    confidence: number;
    ocrTextEn?: string;
    ocrTextAm?: string;
    ocrConfidence?: number;
    lowConfidenceFlagged?: boolean;
    suggestedType?: DocumentType;
    suggestedSubjectEn?: string;
    suggestedSubjectAm?: string;
    suggestedSenderOrg?: string;
    suggestedRecipientOrg?: string;
    suggestedReferenceNumber?: string;
    suggestedPriority?: PriorityLevel;
    suggestedConfidentiality?: ConfidentialityLevel;
    routingRecommendation?: string;
    verifiedBy?: string;
    verifiedAt?: string;
    acceptedFields?: string[];
  };
  currentVersion?: number;
  revisions?: DocumentRevision[];
}

export type DocumentRevisionActionType =
  | 'Initial'
  | 'MetadataEdit'
  | 'AttachmentUpdate'
  | 'ManualRevision'
  | 'Restored';

export interface DocumentRevisionSnapshot {
  subjectEn: string;
  subjectAm: string;
  descriptionEn?: string;
  descriptionAm?: string;
  senderOrganization: string;
  senderPerson?: string;
  recipientOrganization: string;
  recipientPerson?: string;
  priority: PriorityLevel;
  confidentiality: ConfidentialityLevel;
  status: DocumentStatus;
  departmentId: string;
  assignedDepartmentName?: string;
  dueDate?: string;
  attachments: DocumentAttachment[];
}

export interface DocumentRevision {
  versionNumber: number;
  createdAt: string;
  createdById: string;
  createdByName: string;
  createdByRole: UserRole;
  actionType: DocumentRevisionActionType;
  changeNote: string;
  restoredFromVersion?: number;
  contentHash?: string;
  snapshot: DocumentRevisionSnapshot;
}

export interface DocumentRevisionDiffField {
  field: string;
  labelEn: string;
  labelAm: string;
  beforeValue: string;
  afterValue: string;
  changed: boolean;
}

export interface CorrespondenceWorkflowState {
  hasWorkflow: boolean;
  instance: WorkflowInstance | null;
  definition: WorkflowDefinition | null;
  currentStage: WorkflowStageConfig | null;
  assignees: { id: string; fullNameEn: string; role: UserRole; departmentNameEn: string }[];
  isOverdue: boolean;
  isDueToday: boolean;
  remainingHours: number;
}

export type PhysicalLocationLevel = 'Building' | 'Room' | 'Cabinet' | 'Shelf' | 'Box';

export interface PhysicalLocationNode {
  id: string;
  code: string;
  name: string;
  level: PhysicalLocationLevel;
  parentId: string | null;
  branchId: string;
  capacity?: number;
  notes?: string;
  createdAt: string;
}

export interface PhysicalFileRecord {
  id: string;
  fileCode: string;
  documentId: string;
  registrationNumber: string;
  locationId: string;
  locationPath: string;
  building: string;
  room: string;
  cabinet: string;
  shelfNumber: string;
  boxNumber: string;
  currentCustodianId: string;
  currentCustodianName: string;
  expectedReturnDate?: string;
  status: 'Archived' | 'CheckedOut' | 'InTransit' | 'Missing';
  lastMovedDate: string;
  movementsCount: number;
  createdAt: string;
}

export interface PhysicalHandoverMovement {
  id: string;
  physicalFileId?: string;
  fileCode?: string;
  documentId: string;
  registrationNumber: string;
  fromCustodianId?: string;
  fromCustodian: string;
  toCustodianId?: string;
  toCustodian: string;
  department: string;
  transferReason: string;
  expectedReturnDate?: string;
  handoverDate: string;
  status: 'InCustody' | 'InTransit' | 'ReturnedToArchive' | 'Missing';
  verifiedByReceiver: boolean;
  initiatedById?: string;
  initiatedByName?: string;
  acknowledgedById?: string;
  acknowledgedByName?: string;
  acknowledgedAt?: string;
  notes?: string;
}

export interface MissingPhysicalIncident {
  id: string;
  physicalFileId: string;
  fileCode: string;
  documentId: string;
  registrationNumber: string;
  reportedById: string;
  reportedByName: string;
  reportedAt: string;
  lastKnownCustodianName: string;
  lastKnownLocation: string;
  urgency: 'Medium' | 'High' | 'Critical';
  reason: string;
  status: 'Open' | 'Investigating' | 'Recovered';
  resolvedAt?: string;
  resolvedByName?: string;
  resolutionNotes?: string;
}

export interface RetentionSchedule {
  id: string;
  documentCategory: string;
  retentionPeriodYears: number; // 0 = Permanent Archive
  disposalAction: 'PermanentArchive' | 'AuthorizedDestruction' | 'ReviewAtMaturity';
  governingLegislation: string;
  notes: string;
  documentTypes?: DocumentType[];
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface DisposalApprovalEntry {
  id: string;
  approverId: string;
  approverName: string;
  approverRole: UserRole;
  decision: 'Approved' | 'Rejected';
  comments: string;
  decidedAt: string;
}

export interface DisposalRequest {
  id: string;
  documentId: string;
  registrationNumber: string;
  subjectEn: string;
  subjectAm: string;
  confidentiality: ConfidentialityLevel;
  retentionCategory: string;
  retentionExpiryDate: string;
  requestedById: string;
  requestedByName: string;
  requestedAt: string;
  reason: string;
  method: 'CertifiedShredding' | 'DigitalPurge' | 'NationalArchivesTransfer';
  requiredApprovals: number;
  approvals: DisposalApprovalEntry[];
  status: 'PendingApproval' | 'ApprovedReady' | 'Executed' | 'Rejected';
  executedAt?: string;
  executedById?: string;
  executedByName?: string;
  certificateId?: string;
}

export interface ArchiveRetrievalRequest {
  id: string;
  documentId: string;
  registrationNumber: string;
  subjectEn: string;
  requestedById: string;
  requestedByName: string;
  requestedAt: string;
  neededUntilDate: string;
  reason: string;
  status: 'Requested' | 'Fulfilled' | 'Returned' | 'Denied';
  fulfilledByName?: string;
  fulfilledAt?: string;
  returnedAt?: string;
  notes?: string;
}

export interface DisposalCertificate {
  id: string;
  certificateNumber: string;
  disposalRequestId: string;
  documentId: string;
  registrationNumber: string;
  subjectEn: string;
  subjectAm: string;
  confidentiality: ConfidentialityLevel;
  retentionCategory: string;
  governingLegislation: string;
  destructionMethod: string;
  issuedAt: string;
  executedById: string;
  executedByName: string;
  approvers: Array<{
    name: string;
    role: string;
    decidedAt: string;
  }>;
  digitalVerificationHash: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  branchName: string;
  action: string;
  resourceType: string;
  resourceId: string;
  ipAddress: string;
  details: string;
  reason?: string;
  beforeValue?: string;
  afterValue?: string;
}

export interface AnalyticsQueryParams {
  dateFrom?: string;
  dateTo?: string;
  branchId?: string;
  cluster?: BranchCluster | 'All';
  departmentId?: string;
  type?: DocumentType | 'All';
  status?: DocumentStatus | 'All';
  confidentiality?: ConfidentialityLevel | 'All';
}

export interface BranchTurnaroundMetric {
  branchId: string;
  branchCode: string;
  branchNameEn: string;
  branchNameAm: string;
  cluster: BranchCluster;
  incoming: number;
  outgoing: number;
  memos: number;
  applications: number;
  totalDocuments: number;
  completed: number;
  overdue: number;
  slaComplianceRate: number;
  avgTurnaroundDays: number;
  healthStatus: 'Nominal' | 'Attention' | 'Critical' | 'Idle';
}

export interface DirectorateWorkloadMetric {
  departmentId: string;
  code: string;
  nameEn: string;
  nameAm: string;
  activeStaff: number;
  totalDocuments: number;
  pendingReview: number;
  overdueCount: number;
  completedCount: number;
  avgTurnaroundDays: number;
  slaComplianceRate: number;
}

export interface WorkflowStageBottleneckMetric {
  stageName: string;
  activeInstances: number;
  overdueInstances: number;
  escalatedInstances: number;
  avgAgeHours: number;
  maxAgeHours: number;
}

export interface DocumentTypeBreakdownItem {
  type: DocumentType;
  count: number;
  sharePct: number;
  completedCount: number;
  overdueCount: number;
}

export interface OverdueRegisterEntry {
  documentId: string;
  registrationNumber: string;
  subjectEn: string;
  subjectAm: string;
  type: DocumentType;
  priority: PriorityLevel;
  confidentiality: ConfidentialityLevel;
  branchId: string;
  branchNameEn: string;
  departmentNameEn: string;
  status: DocumentStatus;
  dueDate: string;
  daysOverdue: number;
  assignedUserName?: string;
  stageName?: string;
}

export interface RetentionForecastSummary {
  totalArchived: number;
  underLegalHold: number;
  dueForReviewWithin90Days: number;
  pendingDisposals: number;
  executedDisposals: number;
  overduePhysicalFiles: number;
}

export interface PkiComplianceSummary {
  totalApprovalsLogged: number;
  digitallySignedApprovals: number;
  digitalSigningRate: number;
  activeCertificates: number;
  revokedCertificates: number;
  tamperedOrInvalidDocuments: number;
}

export interface TrendPeriodPoint {
  period: string;
  label: string;
  incoming: number;
  outgoing: number;
  memos: number;
  completed: number;
}

export type ManagementReportCategory =
  | 'MasterRegister'
  | 'SlaCompliance'
  | 'BranchTurnaround'
  | 'DirectorateWorkload'
  | 'OverdueRegister'
  | 'RetentionAndPki';

export interface ManagementAnalyticsReport {
  generatedAt: string;
  filtersApplied: AnalyticsQueryParams;
  authorizedDocumentCount: number;
  redactedRestrictedCount: number;
  summary: {
    totalDocuments: number;
    totalIncoming: number;
    totalOutgoing: number;
    totalInternalMemos: number;
    totalApplications: number;
    pendingApprovals: number;
    completedCount: number;
    overdueCount: number;
    archivedCount: number;
    averageProcessingDays: number;
    slaComplianceRate: number;
    digitalSigningRate: number;
    momVolumeDeltaPct: number | null;
  };
  typeBreakdown: DocumentTypeBreakdownItem[];
  statusBreakdown: Array<{ status: DocumentStatus; count: number }>;
  confidentialityBreakdown: Array<{ level: ConfidentialityLevel; count: number }>;
  clusterSummary: Array<{
    cluster: BranchCluster;
    branchesCount: number;
    totalDocuments: number;
    overdue: number;
    slaComplianceRate: number;
    avgTurnaroundDays: number;
  }>;
  branchStats: BranchTurnaroundMetric[];
  directorateStats: DirectorateWorkloadMetric[];
  workflowBottlenecks: WorkflowStageBottleneckMetric[];
  overdueRegister: OverdueRegisterEntry[];
  monthlyTrend: TrendPeriodPoint[];
  retentionForecast: RetentionForecastSummary;
  pkiCompliance: PkiComplianceSummary;
}

export interface SavedReportTemplate {
  id: string;
  name: string;
  description?: string;
  reportType: ManagementReportCategory;
  filters: AnalyticsQueryParams;
  createdByUserId: string;
  createdByName: string;
  createdAt: string;
}

export interface ReportExportRecord {
  id: string;
  exportedAt: string;
  exportedByUserId: string;
  exportedByName: string;
  exportedByRole: UserRole;
  reportType: ManagementReportCategory;
  format: 'csv' | 'excel-csv' | 'json' | 'print-brief';
  filename: string;
  recordCount: number;
  redactedRestrictedCount: number;
  filtersSummary: string;
  sha256Checksum: string;
}

export interface ExecutiveKpiSummary {
  totalIncoming: number;
  totalOutgoing: number;
  totalInternalMemos: number;
  totalApplications: number;
  pendingApprovals: number;
  overdueCount: number;
  completedThisMonth: number;
  archivedCount: number;
  averageProcessingDays: number;
  slaComplianceRate: number;
  digitalSigningRate: number;
  momDeltaPct: number | null;
  overduePhysicalCount: number;
  branchStats: {
    branchId: string;
    branchNameEn: string;
    incoming: number;
    outgoing: number;
    overdue: number;
    avgTurnaroundDays: number;
    slaComplianceRate?: number;
    healthStatus?: 'Nominal' | 'Attention' | 'Critical' | 'Idle';
  }[];
  directorateStats: DirectorateWorkloadMetric[];
}

export type NotificationEventType =
  | 'Assignment'
  | 'Approval'
  | 'OverdueSLA'
  | 'Dispatch'
  | 'Security';

export interface AppNotification {
  id: string;
  titleEn: string;
  titleAm: string;
  messageEn: string;
  messageAm: string;
  timestamp: string;
  type: NotificationEventType;
  isRead: boolean;
  userId?: string;
  channel?: 'InApp' | 'Email' | 'SMS';
  priority?: 'Normal' | 'Urgent' | 'Critical';
  documentId?: string;
  registrationNumber?: string;
}

export interface NotificationTemplate {
  id: string;
  eventType: NotificationEventType;
  name: string;
  requiredPlaceholders: string[];
  emailSubjectEn: string;
  emailSubjectAm: string;
  emailBodyEn: string;
  emailBodyAm: string;
  smsBodyEn: string;
  smsBodyAm: string;
  isActive: boolean;
  updatedAt: string;
  updatedBy?: string;
}

export interface ChannelPreferenceSet {
  inApp: boolean;
  email: boolean;
  sms: boolean;
}

export interface UserNotificationPreferences {
  userId: string;
  emailAddress: string;
  phoneNumber?: string;
  preferredLanguage: Language;
  channels: Record<NotificationEventType, ChannelPreferenceSet>;
  updatedAt: string;
}

export type EscalationTriggerType =
  | 'WorkflowOverdue'
  | 'PhysicalOverdue'
  | 'VeryUrgentUnacted';

export interface EscalationRule {
  id: string;
  name: string;
  trigger: EscalationTriggerType;
  delayHours: number;
  targetType: 'Role' | 'User';
  targetRole?: UserRole;
  targetUserId?: string;
  targetUserName?: string;
  channels: Array<'InApp' | 'Email' | 'SMS'>;
  isActive: boolean;
  lastTriggeredAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationDeliveryLog {
  id: string;
  timestamp: string;
  notificationId?: string;
  eventType: NotificationEventType;
  channel: 'InApp' | 'Email' | 'SMS';
  recipientUserId?: string;
  recipientAddress: string;
  subject?: string;
  bodyPreview: string;
  status: 'Delivered' | 'Failed';
  errorReason?: string;
}

export interface NotificationConfig {
  smsMaxLength: number;
  realtimeWsEnabled: boolean;
}

export interface EnterpriseConnector {
  id: string;
  name: string;
  type: 'ActiveDirectory' | 'SAP_S4HANA' | 'EthioTelecom_SMS' | 'EFDA_API' | 'MoH_Portal' | 'GovernmentSMTP';
  status: 'Connected' | 'Standby' | 'Syncing' | 'Offline';
  endpoint: string;
  authMethod: 'OAuth2' | 'LDAP_SSL' | 'API_Key' | 'Mutual_TLS';
  lastSyncTimestamp: string;
  pingLatencyMs: number;
  description: string;
  enabled?: boolean;
  syncIntervalMinutes?: number;
  timeoutMs?: number;
  verifyTls?: boolean;
  totalDispatches?: number;
  lastError?: string;
  updatedAt?: string;
}

export type IntegrationEventType =
  | 'document.registered'
  | 'document.approved'
  | 'document.dispatched'
  | 'workflow.escalated'
  | 'disposal.executed'
  | 'connector.sync';

export type IntegrationApiScope =
  | 'correspondence:ingest'
  | 'correspondence:read'
  | 'efda:clearance'
  | 'erp:sync';

export interface WebhookSubscription {
  id: string;
  name: string;
  targetUrl: string;
  events: IntegrationEventType[];
  signingSecretPreview: string;
  isActive: boolean;
  connectorId?: string;
  createdByUserId: string;
  createdByName: string;
  createdAt: string;
  lastTriggeredAt?: string;
  lastDeliveryStatus?: 'Delivered' | 'Failed';
}

export interface WebhookDeliveryRecord {
  id: string;
  subscriptionId: string;
  subscriptionName: string;
  eventType: IntegrationEventType;
  targetUrl: string;
  payloadDigestSha256: string;
  hmacSignatureHeader: string;
  status: 'Delivered' | 'Failed';
  httpStatus: number;
  latencyMs: number;
  attemptCount: number;
  payloadPreview: string;
  responseMessage: string;
  timestamp: string;
}

export interface IntegrationApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: IntegrationApiScope[];
  boundBranchId?: string;
  boundConnectorId?: string;
  status: 'Active' | 'Revoked';
  createdByUserId: string;
  createdByName: string;
  createdAt: string;
  expiresAt: string;
  lastUsedAt?: string;
  usageCount: number;
  revokedAt?: string;
  revokedByName?: string;
}

export interface ConnectorExchangeLog {
  id: string;
  connectorId: string;
  connectorName: string;
  direction: 'Outbound' | 'Inbound';
  operation: string;
  documentId?: string;
  registrationNumber?: string;
  externalRefId?: string;
  status: 'Success' | 'Failed';
  latencyMs: number;
  summary: string;
  initiatedByName: string;
  timestamp: string;
}

export interface BackupRecord {
  filename: string;
  timestamp: string;
  sizeBytes: number;
  checksum: string;
  documentCount: number;
  userCount: number;
  branchCount: number;
  createdBy: string;
}

export type WorkspacePermissionLevel = 'Viewer' | 'Editor';

export interface WorkspaceShareEntry {
  id: string;
  targetType: 'user' | 'role';
  targetId: string;
  targetName: string;
  permission: WorkspacePermissionLevel;
  sharedAt: string;
  sharedBy: string;
}

export interface WorkspaceFileVersion {
  versionNumber: number;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storageKey: string;
  uploadedAt: string;
  uploadedBy: string;
  uploadedByName: string;
  sha256: string;
  notes?: string;
}

export interface WorkspaceActivityEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  action:
    | 'CreatedFolder'
    | 'UploadedFile'
    | 'UploadedNewVersion'
    | 'RestoredVersion'
    | 'Renamed'
    | 'Moved'
    | 'Shared'
    | 'Unshared'
    | 'Starred'
    | 'Unstarred'
    | 'Trashed'
    | 'RestoredFromTrash'
    | 'Downloaded'
    | 'PermissionsUpdated';
  details: string;
}

export interface WorkspaceItem {
  id: string;
  name: string;
  itemType: 'folder' | 'file';
  parentId: string | null;
  ownerId: string;
  ownerName: string;
  departmentId?: string;
  createdAt: string;
  updatedAt: string;
  size: number;
  mimeType?: string;
  extension?: string;
  storageKey?: string;
  currentVersion?: number;
  versions?: WorkspaceFileVersion[];
  starredBy: string[];
  isTrashed: boolean;
  trashedAt?: string;
  trashedBy?: string;
  shares: WorkspaceShareEntry[];
  shareLinkEnabled?: boolean;
  shareLinkToken?: string;
  shareLinkPermission?: WorkspacePermissionLevel;
  virusScanStatus: 'Clean' | 'Pending' | 'Quarantined';
  virusScanAt?: string;
  activityLog: WorkspaceActivityEntry[];
}

export interface AuthPolicyConfig {
  maxFailedAttempts: number;
  lockoutDurationMinutes: number;
  progressiveDelayBaseSeconds?: number;
  idleTimeoutMinutes: number;
  absoluteTimeoutHours: number;
  maxConcurrentSessions?: number;
  minPasswordLength: number;
  maxDelegationDays: number;
  maxTimeBoundRoleDays?: number;
  maxBreakGlassHours?: number;
}

export interface AuthSession {
  id: string;
  token: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  lastActiveAt: string;
  idleExpiresAt: string;
  expiresAt: string;
  mfaVerified: boolean;
  isRevoked: boolean;
  isCurrent?: boolean;
}

export interface LoginHistoryEntry {
  id: string;
  timestamp: string;
  usernameAttempted: string;
  userId?: string;
  userName?: string;
  ipAddress: string;
  userAgent: string;
  method: 'password' | 'webauthn' | 'mfa_pin' | 'mfa_webauthn';
  status: 'Success' | 'Failed' | 'Locked' | 'MfaChallenge';
  reason?: string;
}

export interface PasswordResetToken {
  token: string;
  userId: string;
  username: string;
  email: string;
  createdAt: string;
  expiresAt: string;
  used: boolean;
}

export interface DelegationRecord {
  id: string;
  delegatorId: string;
  delegatorName: string;
  delegatorRole: UserRole;
  delegateId: string;
  delegateName: string;
  delegateRole: UserRole;
  startDate: string;
  endDate: string;
  reason: string;
  status: 'Active' | 'Scheduled' | 'Expired' | 'Revoked';
  createdAt: string;
}

export interface RolePermissionMatrix {
  role: UserRole;
  label: string;
  description: string;
  requiresMfa: boolean;
  permissions: string[];
}

export type WorkflowStageType =
  | 'Start'
  | 'Review'
  | 'Approval'
  | 'ParallelApproval'
  | 'Conditional'
  | 'Dispatch'
  | 'End';

export type WorkflowPathMode = 'Sequential' | 'Parallel' | 'Conditional';

export type WorkflowAssigneeType =
  | 'SpecificUser'
  | 'Role'
  | 'DepartmentHead'
  | 'BranchManager'
  | 'Initiator';

export interface WorkflowConditionRule {
  id: string;
  field: 'priority' | 'confidentiality' | 'type';
  operator: 'equals' | 'notEquals';
  value: string;
  targetStageId: string;
}

export interface WorkflowStageConfig {
  id: string;
  order: number;
  nameEn: string;
  nameAm: string;
  stageType: WorkflowStageType;
  pathMode: WorkflowPathMode;
  isMandatory: boolean;
  assigneeType: WorkflowAssigneeType;
  assigneeRole?: UserRole;
  assigneeUserId?: string;
  assigneeDepartmentId?: string;
  requiredPermission: string;
  parallelApproverIds?: string[];
  slaHours: number;
  requiredFields: string[];
  requireBiometricForSensitive: boolean;
  escalationTargetRole?: UserRole;
  escalationTargetUserId?: string;
  conditions?: WorkflowConditionRule[];
}

export interface WorkflowDefinition {
  id: string;
  code: string;
  nameEn: string;
  nameAm: string;
  descriptionEn: string;
  documentTypes: DocumentType[];
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  stages: WorkflowStageConfig[];
}

export interface WorkflowParallelApproval {
  approverId: string;
  approverName: string;
  approverRole: UserRole;
  status: 'Pending' | 'Approved' | 'Rejected';
  timestamp?: string;
  comments?: string;
}

export interface WorkflowEscalationRecord {
  id: string;
  timestamp: string;
  stageId: string;
  stageName: string;
  escalatedById: string;
  escalatedByName: string;
  escalatedToUserId?: string;
  escalatedToUserName?: string;
  escalatedToRole?: UserRole;
  reason: string;
  automatic: boolean;
}

export interface WorkflowInstance {
  id: string;
  documentId: string;
  registrationNumber: string;
  definitionId: string;
  definitionName: string;
  currentStageId: string;
  currentStageOrder: number;
  currentStageName: string;
  currentStageMode: WorkflowPathMode;
  status: 'Active' | 'Completed' | 'Rejected' | 'ReturnedForCorrection';
  assignedUserIds: string[];
  assignedRole?: UserRole;
  stageStartedAt: string;
  stageDueAt: string;
  isEscalated: boolean;
  escalationLevel: number;
  escalations: WorkflowEscalationRecord[];
  parallelApprovals: WorkflowParallelApproval[];
  completedStageIds: string[];
  history: WorkflowActionRecord[];
  createdAt: string;
  updatedAt: string;
}

export interface EnrichedWorkflowTask {
  instance: WorkflowInstance;
  definition: WorkflowDefinition | null;
  currentStage: WorkflowStageConfig | null;
  document: DocumentItem;
  assignees: { id: string; fullNameEn: string; role: UserRole; departmentNameEn: string }[];
  isOverdue: boolean;
  isDueToday: boolean;
  remainingHours: number;
  canAct: boolean;
  actReason?: string;
  actingAsDelegateFor?: string[];
}

export interface SearchFilterParams {
  query?: string;
  type?: string;
  branchId?: string;
  departmentId?: string;
  status?: string;
  priority?: string;
  confidentiality?: string;
  dateFrom?: string;
  dateTo?: string;
  hasAttachmentsOnly?: boolean;
  legalHoldOnly?: boolean;
}

export interface SavedSearch {
  id: string;
  userId: string;
  name: string;
  filters: SearchFilterParams;
  notifyOnNewMatch?: boolean;
  createdAt: string;
  lastExecutedAt?: string;
  lastResultCount?: number;
}

export interface SearchResultItem {
  document: DocumentItem;
  score: number;
  matchedFields: string[];
  snippetEn?: string;
  snippetAm?: string;
}

export interface SearchResponse {
  query: string;
  total: number;
  authorizedCount: number;
  filteredRestrictedCount: number;
  results: SearchResultItem[];
}

export interface AiSearchConfig {
  ocrConfidenceThreshold: number;
  duplicateSimilarityThreshold: number;
  enableGeminiExtraction: boolean;
}

export interface OcrExtractionResult {
  extractionId: string;
  rawTextEn: string;
  rawTextAm: string;
  detectedLanguage: 'en' | 'am' | 'bilingual';
  ocrConfidence: number;
  lowConfidenceFlagged: boolean;
  thresholdUsed: number;
  modelUsed: string;
  suggestedType: DocumentType;
  suggestedSubjectEn: string;
  suggestedSubjectAm: string;
  suggestedSenderOrg: string;
  suggestedRecipientOrg: string;
  suggestedReferenceNumber: string;
  suggestedPriority: PriorityLevel;
  suggestedConfidentiality: ConfidentialityLevel;
  suggestedCategory: string;
  suggestedDepartment: string;
  suggestedDepartmentId: string;
  summaryEn: string;
  summaryAm: string;
  routingRecommendation: string;
  fieldConfidences: Record<string, number>;
  fallbackUsed?: boolean;
}

export interface DuplicateMatch {
  documentId: string;
  registrationNumber: string;
  referenceNumber: string;
  subjectEn: string;
  subjectAm: string;
  status: DocumentStatus;
  confidentiality: ConfidentialityLevel;
  registrationDate: string;
  matchType: 'RegistrationNumber' | 'ReferenceNumber' | 'ContentHash' | 'SubjectSimilarity';
  similarityScore: number;
  reason: string;
  isRestricted: boolean;
}

export interface SigningCertificate {
  id: string;
  serialNumber: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  departmentNameEn: string;
  algorithm: 'RSA-SHA256';
  keySizeBits: number;
  publicKeyPem: string;
  fingerprintSha256: string;
  issuerDn: string;
  subjectDn: string;
  issuedAt: string;
  expiresAt: string;
  status: 'Active' | 'Revoked' | 'Expired';
  revokedAt?: string;
  revokedBy?: string;
  revokedReason?: string;
}

export interface SignatureCheckDetail {
  historyRecordId: string;
  signatureId: string;
  signedBy: string;
  signedByUserId?: string;
  signedByRole?: string;
  action: string;
  stageName?: string;
  certificateSerial: string;
  certificateFingerprint?: string;
  algorithm: string;
  signingMeaning?: string;
  signedAt: string;
  signedDigestSha256: string;
  currentDocumentDigestSha256: string;
  cryptographicallyValid: boolean;
  digestMatchesCurrent: boolean;
  certificateStatus: 'Active' | 'Revoked' | 'Expired' | 'NotFound';
  biometricVerified: boolean;
  invalidated?: boolean;
  status: 'Valid' | 'Tampered' | 'CertificateRevoked' | 'CertificateExpired' | 'InvalidSignature' | 'Superseded';
  reason: string;
}

export interface DocumentSignatureVerificationResult {
  documentId: string;
  registrationNumber: string;
  verifiedAt: string;
  integrityStatus: 'Verified' | 'Unsigned' | 'Tampered' | 'CertificateRevoked' | 'MissingRequiredSignature' | 'Superseded';
  currentDocumentDigestSha256: string;
  totalSignatures: number;
  validSignatures: number;
  requiresDigitalSignature: boolean;
  signatures: SignatureCheckDetail[];
  summaryMessage: string;
}

export interface PublicVerificationSignerSummary {
  signedBy: string;
  signedByRole?: string;
  stageName?: string;
  certificateSerial: string;
  certificateStatus: 'Active' | 'Revoked' | 'Expired' | 'NotFound';
  algorithm: string;
  signingMeaning?: string;
  signedAt: string;
  biometricVerified: boolean;
  status: SignatureCheckDetail['status'];
}

export interface PublicVerificationResponse {
  verified: boolean;
  registrationNumber: string;
  referenceNumber: string;
  documentType: DocumentItem['type'];
  status: DocumentItem['status'];
  confidentiality: DocumentItem['confidentiality'];
  redacted: boolean;
  subjectEn: string;
  subjectAm: string;
  senderOrganization: string;
  recipientOrganization: string;
  issuingBranchEn: string;
  issuingDepartmentEn: string;
  registrationDate: string;
  integrityStatus: DocumentSignatureVerificationResult['integrityStatus'];
  currentDocumentDigestSha256: string;
  sealMatchStatus: 'matched' | 'mismatched' | 'not_provided';
  totalSignatures: number;
  validSignatures: number;
  summaryMessage: string;
  signers: PublicVerificationSignerSummary[];
  verifiedAt: string;
}

export interface PublicVerificationSample {
  registrationNumber: string;
  referenceNumber: string;
  type: DocumentItem['type'];
  status: DocumentItem['status'];
  hasPkiSignature: boolean;
}

export type TransmittalDispatchMethod =
  | 'Courier'
  | 'RegionalHubShuttle'
  | 'DiplomaticPouch'
  | 'ElectronicPortal';

export interface TransmittalManifest {
  id: string;
  manifestNumber: string;
  title: string;
  targetBranchId?: string;
  targetBranchName?: string;
  targetOrganization: string;
  carrierName: string;
  courierPhone?: string;
  dispatchMethod: TransmittalDispatchMethod;
  documentIds: string[];
  documentRegNumbers: string[];
  notes?: string;
  status: 'Prepared' | 'Dispatched' | 'Acknowledged';
  createdByUserId: string;
  createdByName: string;
  createdAt: string;
  dispatchedAt?: string;
  dispatchedByName?: string;
  acknowledgedAt?: string;
  acknowledgedByName?: string;
  manifestDigestSha256: string;
}

export interface BulkOperationItemResult {
  documentId: string;
  registrationNumber?: string;
  success: boolean;
  error?: string;
}

export interface BulkOperationResult {
  totalRequested: number;
  succeededCount: number;
  failedCount: number;
  results: BulkOperationItemResult[];
}

export interface BulkImportRowInput {
  type?: DocumentType;
  referenceNumber?: string;
  subjectEn: string;
  subjectAm?: string;
  senderOrganization: string;
  recipientOrganization?: string;
  branchId?: string;
  departmentId?: string;
  priority?: PriorityLevel;
  confidentiality?: ConfidentialityLevel;
  descriptionEn?: string;
}

export interface BulkImportRowResult {
  rowIndex: number;
  success: boolean;
  registrationNumber?: string;
  documentId?: string;
  error?: string;
}

export interface BulkImportResult {
  totalRows: number;
  createdCount: number;
  failedCount: number;
  createdDocuments: DocumentItem[];
  rowResults: BulkImportRowResult[];
}

export type DocumentLinkType =
  | 'ReplyTo'
  | 'Supersedes'
  | 'Amends'
  | 'RelatedDossier'
  | 'ParentTender';

export interface DocumentLink {
  id: string;
  sourceDocumentId: string;
  targetDocumentId: string;
  linkType: DocumentLinkType;
  notes?: string;
  createdByUserId: string;
  createdByName: string;
  createdAt: string;
}

export interface EnrichedDocumentLink {
  link: DocumentLink;
  direction: 'Outgoing' | 'Incoming';
  linkedDocument: {
    id: string;
    registrationNumber: string;
    referenceNumber: string;
    type: DocumentType;
    subjectEn: string;
    subjectAm: string;
    status: DocumentStatus;
    registrationDate: string;
  };
}

export interface CorrespondenceTemplate {
  id: string;
  nameEn: string;
  nameAm: string;
  type: DocumentType;
  category: string;
  defaultPriority: PriorityLevel;
  defaultConfidentiality: ConfidentialityLevel;
  defaultSenderOrg?: string;
  defaultRecipientOrg?: string;
  defaultDepartmentId?: string;
  subjectEnTemplate: string;
  subjectAmTemplate: string;
  bodyEnTemplate: string;
  bodyAmTemplate: string;
  createdByName: string;
  isSystemDefault?: boolean;
  createdAt: string;
}

// Phase 13: High-Customizable Enterprise Role Management & ABAC Types
export type PermissionCategory =
  | 'Document'
  | 'Workflow'
  | 'Physical'
  | 'Records'
  | 'Administration'
  | 'Workspace'
  | 'Reporting';

export type PermissionScopeLevel =
  | 'None'
  | 'Own'
  | 'Department'
  | 'Branch'
  | 'Cluster'
  | 'Organization'
  | 'All';

export type RoleScopeType =
  | 'Global'
  | 'Branch'
  | 'Department'
  | 'Cluster'
  | 'DocumentType';

export type AbacConditionField =
  | 'confidentiality'
  | 'type'
  | 'priority'
  | 'branchId'
  | 'departmentId'
  | 'status'
  | 'ownerId'
  | 'legalHold';

export type AbacConditionOperator =
  | 'eq'
  | 'neq'
  | 'lte'
  | 'gte'
  | 'in'
  | 'notIn';

export interface PermissionDefinition {
  id: string;
  key: string;
  category: PermissionCategory;
  nameEn: string;
  nameAm: string;
  descriptionEn: string;
  descriptionAm: string;
  legacyAlias?: string;
  isCustom?: boolean;
  createdAt?: string;
}

export interface PermissionSet {
  id: string;
  nameEn: string;
  nameAm: string;
  descriptionEn: string;
  grants: Record<string, PermissionScopeLevel>;
  isSystem?: boolean;
  createdAt: string;
}

export interface AbacCondition {
  id: string;
  field: AbacConditionField;
  operator: AbacConditionOperator;
  value: string;
}

export interface AbacRule {
  id: string;
  permissionKey: string;
  effect: 'Allow' | 'Deny';
  description: string;
  conditions: AbacCondition[];
}

export interface RoleVersionEntry {
  version: number;
  changedAt: string;
  changedById: string;
  changedByName: string;
  versionNote: string;
  reason: string;
  status: 'Draft' | 'Active' | 'Inactive';
  snapshot: {
    grants: Record<string, PermissionScopeLevel>;
    denies: string[];
    abacRules: AbacRule[];
    parentRoleIds: string[];
    requiresMfa: boolean;
  };
}

export interface EnterpriseRole {
  id: string;
  code: string;
  nameEn: string;
  nameAm: string;
  descriptionEn: string;
  descriptionAm: string;
  isSystemRole: boolean;
  isSensitiveRole: boolean;
  status: 'Draft' | 'Active' | 'Inactive';
  scopeType: RoleScopeType;
  scopeTargetId?: string;
  parentRoleIds: string[];
  clonedFromRoleId?: string;
  requiresMfa: boolean;
  grants: Record<string, PermissionScopeLevel>;
  denies: string[];
  permissionSetIds: string[];
  abacRules: AbacRule[];
  version: number;
  versionHistory: RoleVersionEntry[];
  createdAt: string;
  updatedAt: string;
  updatedByName: string;
}

export interface UserRoleAssignment {
  id: string;
  userId: string;
  roleId: string;
  roleCode: string;
  roleNameEn: string;
  roleNameAm: string;
  scopeType: RoleScopeType;
  scopeTargetId?: string;
  startDate: string;
  endDate?: string;
  justification: string;
  ticketRef?: string;
  status: 'Active' | 'PendingApproval' | 'Rejected' | 'Expired' | 'Revoked';
  approvedById?: string;
  approvedByName?: string;
  approvedAt?: string;
  expiryNotifiedAt?: string;
  isBreakGlass?: boolean;
  assignedById: string;
  assignedByName: string;
  createdAt: string;
}

export interface SodRule {
  id: string;
  nameEn: string;
  nameAm: string;
  description: string;
  ruleType: 'RolePair' | 'PermissionPair' | 'WorkflowConflict';
  leftItem: string;
  rightItem: string;
  severity: 'Blocking' | 'Warning';
  isActive: boolean;
  createdAt: string;
}

export interface SodViolationItem {
  ruleId: string;
  ruleNameEn: string;
  severity: 'Blocking' | 'Warning';
  userId: string;
  userName: string;
  username: string;
  detail: string;
}

export interface BreakGlassElevation {
  id: string;
  userId: string;
  userName: string;
  targetRoleId: string;
  targetRoleCode: string;
  reason: string;
  ticketRef?: string;
  requestedAt: string;
  approvedById: string;
  approvedByName: string;
  dualApprovedById?: string;
  dualApprovedByName?: string;
  expiresAt: string;
  status: 'Active' | 'Expired' | 'Revoked';
  revokedAt?: string;
  revokedByName?: string;
}

export interface RoleAutoAssignmentRule {
  id: string;
  nameEn: string;
  nameAm: string;
  matchField: 'position' | 'departmentId' | 'branchId' | 'cluster';
  matchOperator: 'equals' | 'contains';
  matchValue: string;
  targetRoleId: string;
  targetRoleCode: string;
  isActive: boolean;
  createdAt: string;
}

export interface AccessReviewItem {
  id: string;
  userId: string;
  userName: string;
  username: string;
  roleId: string;
  roleCode: string;
  roleNameEn: string;
  assignmentId?: string;
  scopeLabel: string;
  status: 'Pending' | 'Approved' | 'Revoked' | 'Modified';
  reviewerComment?: string;
  reviewedAt?: string;
  reviewedByName?: string;
}

export interface AccessReviewCampaign {
  id: string;
  titleEn: string;
  titleAm: string;
  description: string;
  reviewerIds: string[];
  reviewerNames: string[];
  status: 'Active' | 'Completed';
  dueDate: string;
  createdAt: string;
  createdByName: string;
  items: AccessReviewItem[];
}

export interface EffectivePermissionPreview {
  userId: string;
  userName: string;
  activeRoleCodes: string[];
  effectiveLevels: Record<string, PermissionScopeLevel>;
  explicitDenies: string[];
  activeAbacRules: AbacRule[];
  sodWarnings: SodViolationItem[];
  activeBreakGlass?: BreakGlassElevation | null;
}

