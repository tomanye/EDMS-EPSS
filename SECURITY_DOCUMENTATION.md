# EPSS EDRMS - Security & Compliance Architecture
### Information Security, Cryptographic Controls, and Access Matrix
**System:** Ethiopian Pharmaceutical Supply Service (EPSS) EDRMS  
**Standard Compliance:** ISO 27001, ISO 15489, MoH Data Security Guidelines  

---

## 1. Role-Based Access Control (RBAC) Matrix

| Module / Operation | SuperAdmin | DirectorGeneral | Director | RegistryOfficer | BranchManager | ProcurementOfficer | Auditor |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **View Dashboard** | Full | Full | Directorate | Hub | Hub | Unit | Full |
| **Intake / Register Document** | Yes | Yes | Yes | **Yes** | Yes | Yes | No |
| **Approve / Endorse Minutes** | Yes | **Yes** | **Yes** | No | **Yes** | No | No |
| **Dispatch Outgoing Letters** | Yes | Yes | Yes | **Yes** | Yes | Yes | No |
| **Physical Tracking & Handovers** | Yes | View | View | **Yes** | Yes | View | View |
| **Apply / Release Legal Hold** | **Yes** | **Yes** | No | No | No | No | View |
| **Trigger Database Backup** | **Yes** | No | No | No | No | No | No |
| **Restore Database Snapshot** | **Yes** | No | No | No | No | No | No |
| **View Immutable Audit Logs** | **Yes** | **Yes** | No | No | No | No | **Yes** |
| **Manage Hubs & Connectors** | **Yes** | View | View | No | View | No | View |

---

## 2. Cryptographic Integrity & Document Verification

### 2.1. SHA-256 Document Fingerprint
During registration and approval, the system calculates a SHA-256 cryptographic hash combining:
- Normalized Registration Number
- Document Type and Category
- Creation Timestamp
- Subject and Body Content
- Actor Identity and Signature

The resulting hex digest is recorded in `sha256Checksum` and embedded into the verification QR code.

### 2.2. QR Code Verification Architecture
- **Format:** High-density 2D QR matrix rendered at high resolution.
- **Deep-Link Protocol:** Direct URL routing `${APP_URL}/?verifyDoc=${registrationNumber}`.
- **Verification Service:** Accessible to any camera or scanner without authentication, returning a cryptographic proof modal confirming:
  - Genuine EPSS Issuing Hub
  - Official Registration Number
  - Current Lifecycle Status
  - Digital PKI Signature Stamping
  - Physical Vault Coordinates

---

## 3. Append-Only Tamper-Evident Audit Trail

Every state change, authentication event, workflow action, physical transfer, and backup creation emits a structured audit record containing:
- `id`: System-generated UUID
- `timestamp`: High-precision ISO-8601 UTC timestamp
- `userId` & `userName`: Authenticated actor credentials
- `userRole` & `branchName`: Contextual authority
- `action`: Clear English & Amharic action descriptor
- `resourceType` & `resourceId`: Target entity identifier
- `ipAddress`: Client IPv4 or IPv6 address
- `details`: Contextual metadata, before/after values, or cryptographic fingerprints

**Immutability Enforcement:** The persistence layer exposes no API or interface to delete, modify, or truncate records in the `auditLogs` collection.

---

## 4. Legal Hold & Regulatory Archival Compliance

- **Litigation Protection:** Authorized records officers (`SuperAdmin`, `DirectorGeneral`) can activate `legalHold = true` on any document.
- **Disposal Shield:** Once a legal hold is applied, the system programmatically locks the document against deletion, destruction, or purging, regardless of its retention schedule expiration date.
- **Audit Verification:** Application and release of legal holds are recorded in the security audit log with justification notes.
