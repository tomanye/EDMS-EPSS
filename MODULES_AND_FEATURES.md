# EPSS EDRMS - Modules and Features Specification
### Comprehensive Functional Breakdown
**System:** Ethiopian Pharmaceutical Supply Service (EPSS) EDRMS  
**Coverage:** 14 Enterprise Modules  

---

## 1. Executive Dashboard (`src/components/dashboard/ExecutiveDashboard.tsx`)
- **Key Metrics:** Real-time counters for Total Incoming, Total Outgoing, Internal Memos, Supplier Applications, Pending Approvals, Overdue SLAs, and Completed Actions.
- **National Hub Matrix:** Live throughput grid tracking intake and dispatch volumes across all 19 regional hubs (Adama, Bahir Dar, Hawassa, Mekelle, Dire Dawa, Jimma, Dessie, Gondar, Nekemte, Assosa, Gambella, Semera, Jijiga, Robe, Wolaita Sodo, Arba Minch, Debre Markos, Hosanna, Addis Ababa Central).
- **Urgent SLA Queue:** Highlighting critical emergency pharmaceuticals approaching turnaround deadlines with visual urgency flags.

## 2. Incoming Correspondence (`src/components/correspondence/IncomingCorrespondenceView.tsx`)
- Intake registration from external entities (MoH, EFDA, WHO, UNICEF, Regional Health Bureaus, pharmaceutical manufacturers).
- Automated sequential numbering (`EPSS/IN/YYYY/NNNN`).
- Dual registration associating electronic scans with physical warehouse binders.
- Integrated AI summarizer extracting bilingual abstracts in English and Amharic.

## 3. Outgoing Correspondence (`src/components/correspondence/OutgoingCorrespondenceView.tsx`)
- Drafting, review, and dispatch of outbound official letters.
- Transaction sequence numbering (`EPSS/OUT/YYYY/NNNN`).
- Cryptographic PKI digital signature stamping.
- Automatic dispatch tracking via Government SMTP and courier logs.

## 4. Internal Directives & Memos (`src/components/correspondence/InternalMemosView.tsx`)
- Executive directives, circulars, and cross-directorate communications.
- Distribution lists targeting all 19 regional branch hubs simultaneously or specific departments.
- Sequential numbering (`EPSS/MEMO/YYYY/NNNN`).

## 5. Citizen & Supplier Applications (`src/components/correspondence/ApplicationsView.tsx`)
- Public portal intake for pharmaceutical suppliers requesting Good Distribution Practice (GDP) inspection, cold-chain validation, and import clearance.
- Sequential numbering (`EPSS/APP/YYYY/NNNN`).
- Tracking application review stages from intake to final permit issuance.

## 6. Multi-Tier Workflow Engine (`src/components/workflow/WorkflowInboxView.tsx`)
- Dynamic role-based routing (Registry Officer -> Directorate Director -> Director General).
- Minute endorsement engine allowing executive actors to append official remarks, directives, and instructions.
- Digital signature stamping binding actor identity and timestamp to the record.

## 7. Physical Storage & Custody Tracking (`src/components/tracking/PhysicalTrackingView.tsx`)
- Dual-custody warehouse coordinates: Building, Floor, Room, Shelf Number, Box File Number, and Folder Number.
- Chain-of-custody transfer handover logging recording physical movement between staff, couriers, and regional hub archives.

## 8. Central Repository & Version Control (`src/components/repository/CentralRepositoryView.tsx`)
- Document vault with versioning history and SHA-256 integrity hashing.
- Collaborative check-in and check-out file locking preventing concurrent overwrite collisions.

## 9. Advanced Search & Discovery (`src/components/search/AdvancedSearchView.tsx`)
- Multi-parameter faceted filtering by registration number, subject keywords, date range, branch hub, department, and priority.
- Instant CSV export of search results.

## 10. Records Retention & Archival (`src/components/records/RecordsArchivalView.tsx`)
- ISO 15489 compliant retention schedules (Finance: 10 years, Tender Contracts: 7 years, Clinical Trials: 15 years, General: 5 years).
- Legal hold litigation lock prohibiting disposal of records under active dispute or regulatory review.
- Automated eligibility calculation for permanent archival or authorized destruction.

## 11. Analytics & Executive Reports (`src/components/analytics/ReportsView.tsx`)
- Turnaround time metrics across all 19 hubs.
- Directorate efficiency tracking.
- Master CSV export for MoH and ministerial reporting.

## 12. Organization & Hub Administration (`src/components/admin/OrganizationAdminView.tsx`)
- Complete institutional directory with Head Office and all 19 regional branch hubs.
- Geographic cluster filtering: Central, Northern, Western, and Southern & Eastern.
- Branch manager contact profiles and phone PBX directories.

## 13. Enterprise Integrations (`src/components/integrations/EnterpriseIntegrationsView.tsx`)
- Connectors for SAP S/4HANA ERP, Active Directory / LDAP, Ethio Telecom SMS, EFDA Regulatory API, MoH Emergency Portal, and Government SMTP.
- Live connectivity ping testing with latency measurement.

## 14. Security, Audit Trail & Disaster Recovery (`src/components/admin/AuditSecurityView.tsx`)
- Tamper-evident, append-only security audit log recording every user action, IP address, and timestamp.
- In-app disaster recovery engine supporting point-in-time JSON snapshots, SHA-256 verification, and 1-click database restoration.
