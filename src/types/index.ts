/**
 * EPSS EDRMS Domain Types & Data Contracts
 * Ethiopian Pharmaceutical Supply Service
 */

export type Language = 'en' | 'am';

export type UserRole = 
  | 'SuperAdmin'
  | 'DirectorGeneral'
  | 'Director'
  | 'RegistryOfficer'
  | 'BranchManager'
  | 'ProcurementOfficer'
  | 'Auditor';

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
    signedBy: string;
    certificateSerial: string;
    timestamp: string;
    verified: boolean;
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
  aiExtracted?: {
    summaryEn: string;
    summaryAm: string;
    suggestedCategory: string;
    suggestedDepartment: string;
    confidence: number;
  };
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
  branchStats: {
    branchId: string;
    branchNameEn: string;
    incoming: number;
    outgoing: number;
    overdue: number;
    avgTurnaroundDays: number;
  }[];
}

export interface AppNotification {
  id: string;
  titleEn: string;
  titleAm: string;
  messageEn: string;
  messageAm: string;
  timestamp: string;
  type: 'Assignment' | 'Approval' | 'OverdueSLA' | 'Dispatch' | 'Security';
  isRead: boolean;
  documentId?: string;
  registrationNumber?: string;
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
  idleTimeoutMinutes: number;
  absoluteTimeoutHours: number;
  minPasswordLength: number;
  maxDelegationDays: number;
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
