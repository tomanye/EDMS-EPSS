# EPSS EDRMS - Workflow & State Transition Design
### Multi-Tier Approval, Minutes Endorsement, and SLA Engine
**System:** Ethiopian Pharmaceutical Supply Service (EPSS) EDRMS  

---

## 1. Document Lifecycle State Machine

Correspondence progresses through a formalized finite state machine (FSM):

```
       [ Draft ]
           |
           | (Intake / Register)
           v
    [ Registered ] <----------------------------+
           |                                     |
           | (Assign / Forward to Directorate)   |
           v                                     | (Return for revision)
    [ UnderReview ] -----------------------------+
           |
           +-----------------------+
           |                       |
      (Approve)                 (Reject)
           v                       v
     [ Approved ]            [ Rejected ]
           |                       |
           | (Seal / Dispatch)     | (Closed / Noted)
           v                       v
    [ Dispatched ]           [ Completed ]
           |                       ^
           | (Acknowledge Receipt) |
           +-----------------------+
           |
           | (Retention Policy Trigger)
           v
     [ Archived ]
```

---

## 2. Multi-Tier Operational Roles & Approval Hierarchy

| Tier | Role | Responsibilities & Authorization |
|---|---|---|
| **Tier 1: Intake & Custody** | `RegistryOfficer` | Scans physical documents, enters dual coordinates, verifies external seal, initiates intake record. |
| **Tier 2: Directorate Review** | `Director` / `BranchManager` | Reviews dossier, appends technical minutes, assigns tasks to specialists, or escalates to Director General. |
| **Tier 3: Executive Sanction** | `DirectorGeneral` | Final institutional authorization for high-value tenders, emergency imports, national policy circulars, and EFDA waivers. |
| **Tier 4: Action & Dispatch** | `ProcurementOfficer` / `RegistryOfficer` | Executes purchase order, transmits dispatch via courier or SMTP, records receipt acknowledgment. |
| **Oversight** | `Auditor` / `SuperAdmin` | Read-only access to all records, audit trails, and retention schedules. |

---

## 3. Minute Endorsement & Digital Signature Process

When an officer takes an action (Forward, Approve, Reject):
1. **Minute Entry:** The officer enters official directives, operational notes, or legal citations.
2. **Identity Binding:** The system binds the authenticated actor's name, role, department, and timestamp to the minute record.
3. **Cryptographic Stamping:** If the action constitutes final approval (`Approved`), the document's `isPkiSigned` attribute is set to `true`, and an immutable digital signature string is embedded:
   `DIGITAL-SIG-USR-XXXX-[TIMESTAMP]-[HASH]`
4. **Audit Trail Synchronized:** A high-priority audit entry is concurrently written into the immutable security ledger.

---

## 4. Service Level Agreement (SLA) & Urgency Classification

| Priority Level | Target Turnaround (SLA) | Notification Escalation Trigger |
|---|---|---|
| **Emergency** | **12 Hours** | Alert triggered at 6 hours remaining; SMS notification sent to Branch Manager / Directorate Director. |
| **Urgent** | **48 Hours** | Alert triggered at 24 hours remaining; visual badge displayed on executive dashboard. |
| **Routine** | **5 Business Days** | System reminder sent at Day 4 if no review action is logged. |
