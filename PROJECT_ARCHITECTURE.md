# EPSS EDRMS - Project Architecture Specification
### Enterprise Electronic Document & Records Management System
**Organization:** Ethiopian Pharmaceutical Supply Service (EPSS)  
**Standard:** ISO 15489 (Information and Documentation — Records Management)  

---

## 1. High-Level Architectural Topology

The EPSS EDRMS is engineered as a secure, distributed multi-tier web platform designed for low-latency operation across both the Addis Ababa Headquarters campus and bandwidth-constrained regional branch hubs across Ethiopia.

```
                    +-------------------------------------------------------+
                    |             EPSS Users & External Auditors            |
                    |   (Head Office, 19 Regional Hubs, Mobile QR Scanners) |
                    +---------------------------+---------------------------+
                                                |
                                        HTTPS / Port 443
                                                |
                                                v
                    +-------------------------------------------------------+
                    |         Nginx Reverse Proxy & Security Gateway        |
                    |   - TLS 1.3 Termination (Strict-Transport-Security)   |
                    |   - Rate Limiting (30 req/s, Burst 20)                |
                    |   - Gzip Compression & Static Asset Cache (30d)       |
                    +---------------------------+---------------------------+
                                                |
                                        HTTP / Port 3000
                                                |
                                                v
+-----------------------------------------------------------------------------------------------+
|                                Node.js / Express Application Server                           |
|                                                                                               |
|  +-----------------------+  +-----------------------+  +-----------------------------------+  |
|  |     REST API Layer    |  |  Transaction Engine   |  |     AI Analysis Microservice      |  |
|  |   (/api/v1/* routes)  |  |  - Number Sequences   |  |   - Gemini 2.5 Flash Client       |  |
|  |   - Auth & Session    |  |  - State Transitions  |  |   - Rule-based Heuristic Fallback |  |
|  |   - Correspondence    |  |  - Dual Custody Sync  |  +-----------------------------------+  |
|  |   - Workflows & SLAs  |  +-----------------------+                                         |
|  |   - Physical Tracking |  +-----------------------+  +-----------------------------------+  |
|  |   - Retention Engine  |  | Cryptographic Engine  |  |     Enterprise Connectors         |  |
|  |   - Audit Logger      |  |  - SHA-256 Hashes     |  |   - SAP S/4HANA ERP (OData)       |  |
|  |   - Backups & Restore |  |  - Dynamic QR Matrix  |  |   - EPSS Active Directory (LDAP)  |  |
|  +-----------------------+  +-----------------------+  |   - Ethio Telecom SMS Gateway     |  |
|                                                        |   - EFDA Regulatory Clearance API |  |
|                                                        |   - MoH Emergency Portal          |  |
|                                                        |   - Government Encrypted SMTP     |  |
|                                                        +-----------------------------------+  |
+-----------------------------------------------------------------------------------------------+
                                                |
                                                v
                    +-------------------------------------------------------+
                    |                Persistent Storage Subsystem           |
                    |   - Primary Store: /data/edrms_store.json             |
                    |   - Snapshot Archives: /data/backups/*.json           |
                    |   - Document Attachments: /data/uploads/*             |
                    |   - Atomic Flushes & Append-Only Audit Trail          |
                    +-------------------------------------------------------+
```

---

## 2. Frontend Client Architecture (React 19 SPA)

### Component Hierarchy & Layout
- **Root Shell (`src/App.tsx`):**
  - Handles global view routing via active navigation state.
  - Mounts verification deep-link handler (`/?verifyDoc=...` query parameter) so phone camera QR scans immediately launch the `VerificationStatusModal`.
- **Top Bar (`src/components/layout/Header.tsx`):**
  - Brand identity with EPSS crest.
  - Bilingual switcher: instantly switches all UI strings and calendar representations between English and Amharic.
  - Notification drawer with unread counts and direct document navigation.
  - Dark/Light mode toggle synchronized with Tailwind v4 `@custom-variant dark`.
  - Persona switcher enabling rapid demonstration of all 7 operational roles without credential friction.
- **Navigation Sidebar (`src/components/layout/Sidebar.tsx`):**
  - Organized into 4 functional groups:
    1. Correspondence & Registry (Incoming, Outgoing, Internal Memos, Applications).
    2. Workflow & Custody (My Workflow Inbox, Physical Tracking, Central Repository).
    3. Records & Intelligence (Advanced Search, Retention & Archival, Analytics & Reports).
    4. Administration (Organization Hubs, Security & Disaster Recovery, Enterprise Integrations).

### State Management (`src/context/AppContext.tsx`)
- Centralized context providing:
  - Current authenticated persona (`currentUser`).
  - Active locale (`language`: `'en'` | `'am'`) and lookup translation method `t(key)`.
  - Document detail modal trigger (`selectedDocument`).
  - Active notifications list with mark-as-read dispatcher.
  - `refreshData()` trigger for re-fetching domain records after mutations.

---

## 3. Server Architecture (`server.ts` & `server/data/store.ts`)

### Modular Service Separation
1. **Transaction & Sequence Allocator:**
   - Generates standardized registry identifiers:
     - Incoming: `EPSS/IN/YYYY/NNNN`
     - Outgoing: `EPSS/OUT/YYYY/NNNN`
     - Internal Memos: `EPSS/MEMO/YYYY/NNNN`
     - Citizen/Supplier Applications: `EPSS/APP/YYYY/NNNN`
   - Guarantees sequential non-colliding serial numbers even across distributed regional branch hubs.
2. **Dynamic QR Code Engine:**
   - Produces high-density SVG and DataURL matrices encoding the canonical URL: `${APP_URL}/?verifyDoc=${registrationNumber}`.
   - Embeds document metadata, SHA-256 seal, and verification hash directly into the QR payload.
3. **Backup & Disaster Recovery Subsystem:**
   - Generates point-in-time cryptographic snapshots into `/data/backups/`.
   - Produces SHA-256 checksums of every snapshot for verification prior to restoration.

---

## 4. Enterprise Integration Architecture

EPSS EDRMS incorporates dedicated connector adapters for key government and institutional systems:
1. **SAP S/4HANA ERP Connector:** Synchronizes pharmaceutical purchase orders, good receipt vouchers (GRVs), and consignment inspection documents.
2. **Microsoft Active Directory / LDAP:** Provides institutional single sign-on (SSO), organizational chart syncing, and role entitlements.
3. **Ethio Telecom SMS Gateway:** Dispatches critical notification SMS alerts to branch directors and couriers for urgent medications (e.g. cold-chain insulin, emergency vaccines).
4. **EFDA Regulatory Clearance API:** Validates drug registration licenses, batch analysis laboratory certificates, and customs clearance permits in real-time.
5. **Ministry of Health (MoH) Emergency Portal:** Bi-directional exchange of national emergency drug allocations during regional outbreaks (cholera, malaria).
6. **Government Encrypted SMTP:** Automated dispatch of signed official letters and acknowledgement receipts to external ministries and embassies.
