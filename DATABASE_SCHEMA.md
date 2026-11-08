# EPSS EDRMS - Database Schema Specification
### Technical Data Dictionary & Entity Definitions
**System:** Ethiopian Pharmaceutical Supply Service (EPSS) EDRMS  
**Version:** 2.4.0 Production  

---

## 1. Schema Tables & Collections Overview

The database comprises 10 primary collections maintained within `/data/edrms_store.json`:

| Entity Collection | Primary Key | Description |
|---|---|---|
| `branches` | `id` (String) | Head Office and all 19 Regional Branch Hubs |
| `departments` | `id` (String) | Central EPSS Directorates and Specialized Divisions |
| `users` | `id` (String) | Authenticated staff members with roles and permissions |
| `documents` | `id` (String) | Core correspondence records, letters, memos, tenders |
| `retentionSchedules` | `id` (String) | ISO-compliant archival and disposal retention rules |
| `handovers` | `id` (String) | Physical paper binder custody transfers |
| `auditLogs` | `id` (String) | Immutable append-only audit trail |
| `notifications` | `id` (String) | User alerts for assignments, approvals, and SLAs |
| `connectors` | `id` (String) | Enterprise ERP, LDAP, SMS, and Ministry integrations |
| `sequenceNumbers` | Key (String) | Atomic counters for registration sequence generation |

---

## 2. Table Specifications

### 2.1. `branches`
Represents the EPSS national distribution network.
```typescript
interface Branch {
  id: string;               // e.g. "b-head-office", "b-adama", "b-hawassa"
  code: string;             // Official hub code, e.g. "EPSS-HQ", "EPSS-ADM", "EPSS-HWS"
  nameEn: string;           // English Name, e.g. "Adama Branch Hub"
  nameAm: string;           // Amharic Name, e.g. "አዳማ ቅርንጫፍ ማዕከል"
  city: string;             // City location
  region: string;           // Ethiopian Administrative Region (Oromia, Amhara, Sidama, etc.)
  cluster: BranchCluster;   // 'Central' | 'Northern' | 'Western' | 'SouthernEastern'
  isHeadOffice: boolean;    // true for Addis Ababa Headquarters, false for 19 regional hubs
  phone: string;            // Landline / PBX number
  email: string;            // Official institutional email
  address: string;          // Physical street and sub-city address
  managerName: string;      // Branch General Manager
}
```

### 2.2. `departments`
EPSS Directorates operating at Head Office and overseeing regional hubs.
```typescript
interface Department {
  id: string;               // e.g. "dept-procurement", "dept-qa", "dept-storage"
  code: string;             // e.g. "PMPD", "QACD", "SDD"
  nameEn: string;           // e.g. "Pharmaceuticals & Medical Devices Procurement Directorate"
  nameAm: string;           // e.g. "የመድኃኒትና ሕክምና መሣሪያዎች ግዢ ዳይሬክቶሬት"
  headUserId?: string;      // User ID of Directorate Director
  headNameEn?: string;      // Name of Directorate Director
  directorateEn: string;    // Operational division
  directorateAm: string;    // Operational division (Amharic)
}
```

### 2.3. `users`
Authenticated EPSS institutional staff.
```typescript
interface User {
  id: string;               // e.g. "usr-dg-01", "usr-reg-01"
  fullNameEn: string;       // e.g. "Dr. Abdulkadir Gelgelo"
  fullNameAm: string;       // e.g. "ዶ/ር አብዱልቃድር ገልገሎ"
  email: string;            // Institutional email address
  role: UserRole;           // 'SuperAdmin' | 'DirectorGeneral' | 'Director' | 'RegistryOfficer' | 'BranchManager' | 'ProcurementOfficer' | 'Auditor'
  branchId: string;         // FK to branches.id
  branchNameEn: string;
  branchNameAm: string;
  departmentId: string;     // FK to departments.id
  departmentNameEn: string;
  departmentNameAm: string;
  position: string;         // Title, e.g. "Director General"
  permissions: string[];    // Granular permissions array
}
```

### 2.4. `documents`
The central records entity.
```typescript
interface DocumentItem {
  id: string;                      // System UUID
  registrationNumber: string;      // e.g. "EPSS/IN/2026/0101" (Unique Index)
  type: DocumentType;              // 'Incoming' | 'Outgoing' | 'InternalMemo' | 'Application'
  subject: string;                 // Subject line
  summaryEn: string;               // AI / Manual Executive summary (English)
  summaryAm: string;               // AI / Manual Executive summary (Amharic)
  category: DocumentCategory;      // e.g. 'TenderProcurement', 'RegulatoryClearance', 'EmergencySupply'
  priority: PriorityLevel;         // 'Routine' | 'Urgent' | 'Emergency'
  confidentiality: ConfidentialityLevel; // 'Public' | 'Official' | 'Confidential' | 'Secret'
  status: DocumentStatus;          // 'Draft' | 'Registered' | 'UnderReview' | 'Approved' | 'Dispatched' | 'Completed' | 'Archived' | 'Rejected'
  
  sender: {
    organization: string;          // e.g. "Ethiopian Food and Drug Authority (EFDA)"
    contactPerson?: string;
    email?: string;
    phone?: string;
    referenceNumber?: string;      // External incoming reference number
  };

  recipient: {
    branchId: string;              // Target EPSS Branch
    branchNameEn: string;
    departmentId: string;          // Target Directorate
    departmentNameEn: string;
    personName?: string;
  };

  createdDate: string;             // ISO-8601 UTC timestamp
  dueDate?: string;                // SLA compliance deadline
  qrVerificationUrl: string;       // Canonical verification URL
  sha256Checksum: string;          // Cryptographic document seal
  isPkiSigned: boolean;            // Digital cryptographic signature flag
  legalHold: boolean;              // Litigation hold flag preventing disposal
  retentionScheduleId?: string;    // FK to retentionSchedules.id

  physicalLocation: {
    building: string;              // Warehouse / Admin block
    floor: string;
    room: string;                  // Archive room number
    shelfNumber: string;           // Physical rack identifier
    boxFileNumber: string;         // Archival box identifier
    folderNumber: string;          // Physical folder docket
  };

  workflowHistory: WorkflowActionRecord[]; // Chronological audit of minutes and approvals
  versions: DocumentVersion[];            // Document revisions and PDF checksums
  tags: string[];
}
```

### 2.5. `auditLogs`
Immutable security and compliance log.
```typescript
interface AuditLogEntry {
  id: string;               // Unique log ID
  timestamp: string;        // High-precision ISO-8601 UTC timestamp
  userId: string;           // Actor ID
  userName: string;         // Actor Name
  userRole: string;         // Actor Role
  branchName: string;       // Actor Branch
  action: string;           // Action descriptor, e.g. "Endorsed Minute & Approved"
  resourceType: string;     // e.g. "Document", "Handover", "Backup"
  resourceId: string;       // Registration Number or target ID
  ipAddress: string;        // IPv4 / IPv6 client address
  details: string;          // Specific contextual notes
}
```
