# EPSS EDRMS - Implementation Roadmap
### Phased Delivery Milestones and Future Evolution
**System:** Ethiopian Pharmaceutical Supply Service (EPSS) EDRMS  

---

## 1. Completed Phases & Production Baseline (Phases 1 - 10)

- [x] **Phase 1: Architecture, Environment & Brand Design**
  - EPSS visual identity, dual-mode typography (`Plus Jakarta Sans`, `DM Sans`, `Noto Sans Ethiopic`), dark mode contract.
- [x] **Phase 2: Domain Data Contracts & Seed Registry**
  - Full institutional data modeling: Head Office + all 19 regional branch hubs across 4 clusters, 8 directorates, 6 user personas, initial correspondence records.
- [x] **Phase 3: File-Backed Persistent Store & RESTful Express API**
  - File-backed database in `/data/edrms_store.json`, atomic writes, sequential numbering generators, and full REST routing.
- [x] **Phase 4: Bilingual App Shell & Executive Dashboard**
  - Top bar with bilingual switcher (English / አማርኛ), live notification drawer, persona switcher, tabular KPI dashboard, 19-hub throughput matrix.
- [x] **Phase 5: Four Primary Correspondence Registries & Intake Modal**
  - Incoming, Outgoing, Internal Memos, Citizen/Supplier Applications registries with AI-assisted intake form.
- [x] **Phase 6: Multi-Tier Workflow Engine & Minute Endorsement**
  - Dynamic action dispatching (Approve, Forward, Minute, Reject, Dispatch, Close) with digital signature stamping.
- [x] **Phase 7: Physical Archive Tracking & Dual-Custody Handover**
  - Warehouse coordinates (Building, Floor, Room, Shelf, Box, Folder) and physical transfer chain-of-custody tracking.
- [x] **Phase 8: Central Repository, Archival Vault & Advanced Search**
  - Version management, SHA-256 integrity, ISO 15489 retention schedules, legal hold litigation lock, multi-field faceted search, CSV exports.
- [x] **Phase 9: Enterprise Integrations, Gemini AI Scanner & QR Verification Engine**
  - Connectors for SAP S/4HANA, Active Directory, SMS, EFDA, MoH, and SMTP with live pings; Gemini 2.5 Flash classifier; high-resolution QR generator linking directly to public verification modal via `/?verifyDoc=...`.
- [x] **Phase 10: Security, Disaster Recovery, On-Premises Packaging & Master Docs**
  - Point-in-time database snapshot backup and restore engine; production `Dockerfile`, `docker-compose.yml`, hardened `nginx.conf`, operational shell scripts, and complete 14-document master technical suite.

---

## 2. Immediate Next Steps (Pilot Rollout - Q1 2027)

1. **National Head Office Pilot:**
   - Deploy production container cluster at Addis Ababa Data Center.
   - Pilot intake and minute endorsement with Office of the Director General and Pharmaceuticals Procurement Directorate.
2. **Regional Cluster Phase 1 (Adama, Hawassa, Bahir Dar):**
   - Connect high-throughput regional hubs.
   - Train registry officers on dual physical filing and smartphone QR verification.

---

## 3. Medium-Term Roadmap (Q2 - Q3 2027)

1. **Warehouse Barcode Scanner Companion App:**
   - Native Android application for rugged Zebra / Honeywell handheld barcode scanners for warehouse inventory staff.
2. **Offline-First PWA Synchronization:**
   - Background sync and local IndexedDB cache for remote hubs during intermittent telecom connectivity.
3. **Automated Amharic OCR:**
   - AI OCR pipeline specialized in typed and handwritten Amharic letters to auto-index legacy paper archives.

---

## 4. Long-Term Evolution (2028+)

1. **Ethiopian Customs Single Window API:**
   - Automated electronic customs clearance for emergency donor drugs arriving at Addis Ababa Bole International Airport.
2. **Blockchain-Backed Audit Anchor:**
   - Periodic anchoring of SHA-256 daily audit logs to a sovereign national ledger for immutable public trust.
