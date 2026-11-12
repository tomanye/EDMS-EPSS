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
  biometricsEnabled?: boolean;
  biometricCredentials?: BiometricCredential[];
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
}

export interface WorkflowActionRecord {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: 'Registered' | 'Forwarded' | 'Reviewed' | 'Approved' | 'Rejected' | 'ReturnedForCorrection' | 'Dispatched' | 'MinuteAdded' | 'Archived';
  decision?: string;
  comments: string;
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
  retentionYears: number;
  retentionExpiryDate: string;
  legalHold: boolean;
  aiExtracted?: {
    summaryEn: string;
    summaryAm: string;
    suggestedCategory: string;
    suggestedDepartment: string;
    confidence: number;
  };
}

export interface PhysicalHandoverMovement {
  id: string;
  documentId: string;
  registrationNumber: string;
  fromCustodian: string;
  toCustodian: string;
  department: string;
  transferReason: string;
  handoverDate: string;
  status: 'InCustody' | 'InTransit' | 'ReturnedToArchive' | 'Missing';
  verifiedByReceiver: boolean;
}

export interface RetentionSchedule {
  id: string;
  documentCategory: string;
  retentionPeriodYears: number;
  disposalAction: 'PermanentArchive' | 'AuthorizedDestruction' | 'ReviewAtMaturity';
  governingLegislation: string;
  notes: string;
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

