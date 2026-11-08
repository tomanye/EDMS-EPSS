# EPSS EDRMS - RESTful API Specification
### Version 1.0 (Base URI: `/api/v1`)
**Organization:** Ethiopian Pharmaceutical Supply Service (EPSS)  
**Authentication:** Session Header / Bearer Token (`x-user-id` in dev context)

---

## 1. Authentication & Session Management

### 1.1. Get Current Session
`GET /api/v1/auth/session`
Returns the currently authenticated staff profile, role, branch, and active permissions.

**Response `200 OK`:**
```json
{
  "id": "usr-dg-01",
  "fullNameEn": "Dr. Abdulkadir Gelgelo",
  "fullNameAm": "ዶ/ር አብዱልቃድር ገልገሎ",
  "email": "director.general@epss.gov.et",
  "role": "DirectorGeneral",
  "branchId": "b-head-office",
  "branchNameEn": "Head Office (Addis Ababa)",
  "branchNameAm": "ዋና መሥሪያ ቤት (አዲስ አበባ)",
  "departmentId": "dept-dg",
  "departmentNameEn": "Office of the Director General",
  "departmentNameAm": "የዋና ዳይሬክተር ጽሕፈት ቤት",
  "position": "Director General",
  "permissions": ["*"]
}
```

### 1.2. Switch Persona (Development & Demonstration)
`POST /api/v1/auth/switch-persona`
Switches the active operational persona between Director General, Procurement Officer, Registry Officer, Branch Manager, etc.

**Request Body:**
```json
{
  "userId": "usr-proc-01"
}
```

---

## 2. Organization Structure & Branch Hubs

### 2.1. List All Branches & Regional Hubs
`GET /api/v1/organizations/branches`
Returns Head Office and all 19 official regional branch hubs with geographic clusters and manager contacts.

**Response `200 OK`:**
```json
[
  {
    "id": "b-head-office",
    "code": "EPSS-HQ",
    "nameEn": "Head Office (Addis Ababa)",
    "nameAm": "ዋና መሥሪያ ቤት (አዲስ አበባ)",
    "city": "Addis Ababa",
    "region": "Addis Ababa",
    "cluster": "Central",
    "isHeadOffice": true,
    "phone": "+251-11-275-1266",
    "email": "info@epss.gov.et",
    "address": "Arada Sub-City, King George VI St., Addis Ababa",
    "managerName": "Dr. Abdulkadir Gelgelo"
  },
  {
    "id": "b-adama",
    "code": "EPSS-ADM",
    "nameEn": "Adama Branch Hub",
    "nameAm": "አዳማ ቅርንጫፍ ማዕከል",
    "city": "Adama",
    "region": "Oromia",
    "cluster": "Central",
    "isHeadOffice": false,
    "phone": "+251-22-111-2345",
    "email": "adama.branch@epss.gov.et",
    "address": "Bole Sub-City, Near Wonji Roundabout",
    "managerName": "Ato Gemechu Bekele"
  }
]
```

### 2.2. List Central Directorates
`GET /api/v1/organizations/departments`
Returns the 8 central EPSS Directorates.

---

## 3. Correspondence & Document Management

### 3.1. Query Correspondence Registry
`GET /api/v1/correspondence`
Query parameters:
- `type`: `Incoming` | `Outgoing` | `InternalMemo` | `Application`
- `status`: `Draft` | `Registered` | `UnderReview` | `Approved` | `Dispatched` | `Completed` | `Archived`
- `branchId`: Filter by origin or destination hub ID
- `search`: Keyword search matching registration number, subject, sender, or tags

### 3.2. Intake & Register Document
`POST /api/v1/correspondence`
Allocates a transaction-safe sequential registration number (`EPSS/IN/...`, `EPSS/OUT/...`), calculates a SHA-256 integrity seal, generates a dynamic QR code verification matrix, and records the physical storage location.

**Request Body:**
```json
{
  "type": "Incoming",
  "subject": "Emergency Pediatric Antimalarial Drug Request",
  "category": "EmergencySupply",
  "priority": "Urgent",
  "confidentiality": "Official",
  "summaryEn": "Immediate dispatch requested for 40,000 doses of Artemether/Lumefantrine to Gambella Regional Health Bureau.",
  "summaryAm": "ለጋምቤላ ክልል ጤና ቢሮ አስቸኳይ 40,000 ዶዝ የወባ መድኃኒት እንዲላክ የቀረበ ጥያቄ።",
  "sender": {
    "organization": "Gambella Regional Health Bureau",
    "contactPerson": "Dr. Owar Omot",
    "email": "health@gambellaregion.gov.et",
    "phone": "+251-47-551-0123",
    "referenceNumber": "GRHB/EM/2026/89"
  },
  "recipient": {
    "branchId": "b-gambella",
    "branchNameEn": "Gambella Branch Hub",
    "departmentId": "dept-storage",
    "departmentNameEn": "Storage & Distribution Directorate"
  },
  "physicalLocation": {
    "building": "Regional Warehouse Block B",
    "floor": "Ground Floor",
    "room": "Registry Room 102",
    "shelfNumber": "Shelf-04",
    "boxFileNumber": "BOX-2026-EM",
    "folderNumber": "FLD-014"
  },
  "tags": ["Malaria", "Emergency", "Gambella"]
}
```

**Response `201 Created`:**
Returns the complete initialized document entity with populated `registrationNumber`, `qrVerificationUrl`, `sha256Checksum`, and initial audit record.

---

## 4. Multi-Tier Workflows & Endorsements

### 4.1. Execute Workflow Action
`POST /api/v1/correspondence/:id/workflow`
Applies an official action (Approve, Forward, Minute, Reject, Dispatch, Close) to the document.

**Request Body:**
```json
{
  "actionType": "Approved",
  "minuteNotes": "Requisition approved under emergency disaster allocation. Storage & Distribution Directorate to expedite delivery via cold-chain trucks.",
  "targetUserId": "usr-stor-01",
  "targetDepartmentId": "dept-storage"
}
```

---

## 5. Public Document Verification & Authenticity

### 5.1. Verify Document by Registration Number
`GET /api/v1/verification/:regNumber`
Public endpoint queried when scanning the document's verification QR code.

**Response `200 OK`:**
```json
{
  "verified": true,
  "registrationNumber": "EPSS/IN/2026/0101",
  "subject": "Clearance Certificate for Imported Insulin Consignment (Lot #IN-9082)",
  "sender": "Ethiopian Food and Drug Authority (EFDA)",
  "recipient": "Pharmaceuticals & Medical Devices Procurement Directorate",
  "status": "Approved",
  "createdDate": "2026-11-04T08:30:00Z",
  "sha256Checksum": "SHA256:8f4c1e7a9b2d3f6e1a0c4e8b5a3d2c1f9e8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c",
  "isPkiSigned": true,
  "qrVerificationUrl": "https://edrms.epss.gov.et/?verifyDoc=EPSS%2FIN%2F2026%2F0101",
  "physicalLocation": "Main Central Archive Building A, Floor 2, Shelf-08, Box-2026-REG-01"
}
```

---

## 6. Backup & Disaster Recovery Operations

### 6.1. List Backups
`GET /api/v1/admin/backups`
Returns all cryptographic JSON snapshots in `/data/backups/`.

### 6.2. Create Snapshot
`POST /api/v1/admin/backup`
Creates an immediate timestamped backup snapshot, computes its SHA-256 hash, and logs an audit trail event.

### 6.3. Restore Snapshot
`POST /api/v1/admin/restore`
Restores the database state from a specified snapshot file.
**Request Body:** `{"filename": "epss_edrms_backup_2026-11-08T09-45-00.json"}`

---

## 7. AI Document Intelligence (Gemini 2.5 Flash)

### 7.1. Auto-Extract & Classify
`POST /api/v1/ai/analyze-document`
Performs natural language parsing and returns recommended category, target directorate, and bilingual summaries.
**Request Body:** `{"documentText": "...", "subject": "..."}`
