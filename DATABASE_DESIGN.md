# EPSS EDRMS - Database Design Document
### Conceptual, Logical, and Physical Data Architecture
**System:** Ethiopian Pharmaceutical Supply Service (EPSS) EDRMS  
**Standard Compliance:** ISO 15489-1:2016 (Records Management Information Systems)

---

## 1. Design Principles & Objectives

The EPSS EDRMS database architecture adheres to strict enterprise design tenets:
1. **Third Normal Form (3NF) Normalization:** Ensures non-redundant entity structures for branches, directorates, users, correspondence records, and retention policies.
2. **Dual-Representation Indexing:** Master records store bilingual descriptors (`nameEn`, `nameAm`) side-by-side to allow zero-translation overhead during high-volume queries.
3. **Immutable Audit Ledger:** Security audit events are append-only. Deletion and modification of audit records are programmatically barred.
4. **Physical & Digital Dual Custody Mapping:** Every document entity incorporates an embedded or linked physical storage coordinate tuple `(building, floor, room, shelfNumber, boxFileNumber, folderNumber)` to prevent lost paper binders in central and regional archives.
5. **Point-in-Time Recoverability:** Database snapshots are self-contained, cryptographically signed with SHA-256 hashes, and stored in independent backup volumes.

---

## 2. Entity Relationship Model (ERD)

```
+------------------+         1:N         +-------------------+
|      Branch      | <------------------ |       User        |
|------------------|                     |-------------------|
| id (PK)          |                     | id (PK)           |
| code             |                     | fullNameEn/Am     |
| nameEn/Am        |                     | role              |
| cluster          |                     | branchId (FK)     |
| isHeadOffice     |                     | departmentId (FK) |
+------------------+                     +-------------------+
        |                                          |
        | 1:N                                      | 1:N (Author/Assignee)
        v                                          v
+------------------+         1:N         +-------------------+
|    Department    |                     |   DocumentItem    |
|------------------|                     |-------------------|
| id (PK)          |                     | id (PK)           |
| code             |                     | regNumber (Unique)|
| directorateEn/Am |                     | type              |
+------------------+                     | status            |
                                         | branchId (FK)     |
                                         | departmentId (FK) |
                                         | assignedTo (FK)   |
                                         | retentionId (FK)  |
                                         +-------------------+
                                           |        |        |
                         1:N (Chronology)  |        |        | 1:N (Custody)
        +----------------------------------+        |        +-----------------------+
        |                                           |                                |
        v                                           v                                v
+----------------------+                 +--------------------+            +--------------------+
| WorkflowActionRecord |                 |  DocumentVersion   |            |  PhysicalMovement  |
|----------------------|                 |--------------------|            |--------------------|
| id (PK)              |                 | versionNumber (PK) |            | id (PK)            |
| documentId (FK)      |                 | documentId (FK)    |            | documentId (FK)    |
| actorUserId (FK)     |                 | sha256Checksum     |            | fromUser/Room      |
| actionType           |                 | uploadTimestamp    |            | toUser/Room        |
| minuteNotes          |                 +--------------------+            | handoverDate       |
| digitalSignature     |                                                   | signatureAcknowledged
+----------------------+                                                   +--------------------+
```

---

## 3. Storage Engine & Partitioning Strategy

- **Operational Engine:** High-performance, JSON-structured database engine featuring in-memory indexing with atomic filesystem flushes.
- **Relational Integrity Guarantees:**
  - Foreign key validation on branch, department, and assigned user references during insertion.
  - Transaction-safe sequence allocation (`EPSS/IN/...`, `EPSS/OUT/...`) protecting against concurrent increment race conditions.
- **Physical Document Vault Organization:**
  - Physical archives are partitioned hierarchically:
    `[Hub Code] / [Building] / [Floor] / [Room] / [Shelf] / [Box]`
  - Real-time queries allow warehouse managers to locate paper dossiers in seconds.
