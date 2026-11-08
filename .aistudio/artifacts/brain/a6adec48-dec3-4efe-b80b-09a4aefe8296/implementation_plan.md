# EPSS Enterprise Document and Records Management System (EDRMS)

Production-grade Enterprise Document and Records Management System designed specifically for the Ethiopian Pharmaceutical Supply Service (EPSS), establishing end-to-end digital correspondence lifecycle management, multi-stage approval workflows, physical file custody tracking, and dual English/Amharic records governance across the Head Office and all 19 regional distribution hubs.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural parameters have been established based on your specifications and confirmed requirements:

- **Confirmed Localization**: Full bilingual user interface supporting English and Amharic (አማርኛ) with dynamic translation toggle, Ethiopian date format indicators, and dual-language letter templates.
- **Confirmed Organizational Structure**: Initialized with EPSS Head Office (Addis Ababa) and all 19 official regional branch hubs (Adama, Bahir Dar, Hawassa, Mekelle, Dire Dawa, Jimma, Dessie, Gondar, Nekemte, Assosa, Gambella, Semera, Jijiga, Robe, Wolaita Sodo, Arba Minch, Debre Markos, Hosanna, and Addis Ababa Central Hub) organized into operational clusters.
- **Full-Stack Clean Architecture**: Node.js/Express API server mounted with clean domain layers, repository patterns, role-based access control (RBAC), and persistent JSON document store with transactional numbering sequences, paired with a React 19 / Tailwind enterprise client.
- **Real Lifecycle Engine**: Concrete state machines for Incoming Letters, Outgoing Correspondence, Internal Memos, and Applications with electronic verification, QR code custody tracking, and Gemini-assisted OCR classification.

---

## 1. Overview & Core Concept

- **What It Does**: EPSS EDRMS delivers a centralized, institutional-grade document automation platform. It handles the complete lifecycle of government and healthcare pharmaceutical correspondence—from intake scanning, metadata indexing, automated reference number allocation (`EPSS/IN/...`, `EPSS/OUT/...`, `EPSS/MEMO/...`), department routing, multi-tier executive approval, QR-coded physical folder movement tracking, through to long-term archiving and disposal retention schedules.
- **Target Audience / Personas**: 
  - *Registry Officers*: Document intake, scanning, metadata capture, barcode/QR generation, physical file check-in.
  - *Department Directors & Officers*: Document review, endorsement, delegation, memo drafting, and application processing.
  - *Director General & Executive Management*: Cross-branch KPI oversight, high-priority approval routing, and dispatch signing.
  - *Regional Branch Managers*: Hub-specific correspondence, inter-branch requisition tracking, and local physical archive control.
  - *System Administrators & Auditors*: Granular RBAC, security audit logs, workflow definition designer, and retention policy management.
- **Key Value**: Replaces vulnerable paper-based correspondence with a tamper-resistant, auditable electronic trail, cutting letter turnaround from days to hours across EPSS's nationwide pharmaceutical supply chain.

---

## 2. User Experience & Visual Design

### Key User Flows
1. **Incoming Document Registration & Dispatch**:
   - Registry clerk enters sender details (e.g., Ethiopian Food and Drug Authority, Ministry of Health, Global Fund, pharmaceutical suppliers).
   - System automatically generates a sequential transaction-safe reference number and dynamic QR tracking code.
   - Attachments/scans are uploaded; optional Gemini AI assists in extracting reference dates, sender identities, and department routing recommendations.
   - Document is forwarded to the designated directorate with an SLA deadline.
2. **Review, Endorsement & Multi-Tier Workflow**:
   - Assigned officer receives notification, examines document metadata and preview.
   - Officer can add internal minute notes, recommend action, forward to colleagues, or escalate to executive sign-off.
   - Sequential and parallel approval gates enforce mandatory sign-offs with digital signature stamps.
3. **Outgoing Letter Drafting & Dispatch Register**:
   - User crafts outgoing communication from pre-configured English/Amharic official EPSS letterheads.
   - Approval cycle executes; once approved, letter is locked against tampering, assigned an outgoing reference number, stamped, and logged in the Dispatch Register.
4. **Physical File Custody Tracking**:
   - Tracks physical binder/folder location (Building, Floor, Room, Shelf, Box).
   - Custody transfer log records physical handovers with sender/receiver confirmation.
5. **Advanced Search & Archive Management**:
   - Global multi-parameter search across both languages, reference numbers, dates, status, and classification.
   - Retention schedules automatically flag documents eligible for permanent archiving or authorized disposal.

### Visual Identity & Theme
- **Aesthetic Direction**: High-density institutional enterprise cockpit adhering to domain design guidelines for SaaS dashboards. Dignified, clean, and utilitarian with zero decorative fluff.
- **Color Palette**:
  - Dominant Canvas: Crisp neutral white (`#FFFFFF`) / light slate (`#F8FAFC`) in light mode; deep institutional slate (`#0F172A`) in dark mode.
  - Structural Surfaces: Hairline borders (`#E2E8F0` / `#1E293B`) with single-elevation depth.
  - Primary Accent: Deep Ethiopian Emerald / EPSS Medical Teal (`#0D9488` / `#0F766E`) conveying healthcare logistics authority.
  - Semantic Status Tokens:
    - *Under Review / Pending*: Warm Amber (`#D97706`)
    - *Approved / Completed / Dispatched*: Emerald Green (`#16A34A`)
    - *Urgent / Overdue / Rejected*: Deep Crimson (`#DC2626`)
    - *In Transit / Forwarded*: Cobalt Blue (`#2563EB`)
- **Typography & Hierarchy**:
  - Display & Headings: `Plus Jakarta Sans` for crisp titles and structural headers.
  - Body & Form Controls: `DM Sans` / `Noto Sans Ethiopic` for bilingual legibility.
  - Numerics & Identifiers: Strict tabular figures (`font-mono tabular-nums`) for reference numbers, dates, timestamps, and SLA metrics.
- **Anti-Slop Discipline**:
  - No decorative pulsing dots, no code-comment headings (`// 01`), no fake scorecards.
  - Unboxed metadata with subtle typographic separators (`·` or `/`).
  - Top bar follows strict 3-zone contract (Brand wordmark, single-line navigation, primary action).

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Full-Stack Express Server with File Persistence**:
  - *Chosen Approach*: Implement an Express backend (`server.ts`) hosting versioned REST endpoints (`/api/v1/...`) with schema-validated persistence in `/data` and transactional numbering generators.
  - *Why*: Provides real server-side API separation, prevents client-only transient state loss on refresh, fulfills the backend API mandate, and runs reliably in the AI Studio environment.
  - *Alternatives Considered*: Pure browser `localStorage` (violates backend API requirements) vs external database container (requires external credentials not natively provisioned).
- **Decision 2: Comprehensive 19-Branch Operational Topology**:
  - *Chosen Approach*: Seed the database with the real EPSS organizational hierarchy: Head Office (Addis Ababa) plus all 19 branches grouped into 4 strategic clusters (Central, Northern, Western, Southern/Eastern).
  - *Why*: Allows realistic branch-to-branch correspondence, regional file tracking, and executive comparative analytics out of the box.
- **Decision 3: Gemini Multimodal Document Intelligence**:
  - *Chosen Approach*: Integrate Google Gemini API (`@google/genai`) via secure server-side proxy route for AI document scanning, automated metadata extraction (dates, sender, subject), and English/Amharic correspondence summaries.
  - *Why*: Fulfills Module 11 without requiring complex external Python OCR daemons.

---

## 4. Technical Architecture & Data Strategy

### System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                   EPSS EDRMS Enterprise Frontend                       │
│  React 19 + TypeScript + Tailwind CSS + Lucide Icons + Motion         │
├────────────────────────────────────────────────────────────────────────┤
│  Top Navigation Bar (Bilingual Toggle EN/AM · Notifications · User)    │
│  Sidebar Navigation (Role-filtered 12 primary modules)                 │
│  Dynamic View Router:                                                  │
│    ├── Executive & Branch Dashboard                                    │
│    ├── Incoming Correspondence Registry & Intake Modal                 │
│    ├── Outgoing Letter Generator & Dispatch Registry                   │
│    ├── Internal Memorandums & Circulars                                │
│    ├── Application Tracking & Review Pipeline                          │
│    ├── Workflow Engine & Task Approval Inbox                           │
│    ├── Physical Custody & QR Tracker                                   │
│    ├── Central Document Repository & Versioning                        │
│    ├── Advanced Search & Filter Engine                                 │
│    ├── Records Retention & Archive Schedules                           │
│    ├── Management Analytics & PDF/Excel Export                         │
│    └── Organization & RBAC Administration                              │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / REST APIs (/api/v1/*)
┌───────────────────────────────────▼────────────────────────────────────┐
│                    Express Full-Stack Server (server.ts)                │
├────────────────────────────────────────────────────────────────────────┤
│  Middleware: JSON Parser, Audit Logger, RBAC Authorization Guard       │
│  API Controllers (/api/v1/):                                           │
│    ├── /auth (Session, Roles, Permissions, Delegation)                 │
│    ├── /organizations (Head Office, 19 Branches, Directorates)         │
│    ├── /correspondence (Incoming, Outgoing, Memos, Numbering)          │
│    ├── /workflows (Definitions, Transitions, Approvals, Minutes)       │
│    ├── /tracking (Physical Files, Handover Logs, Barcode/QR)           │
│    ├── /records (Retention, Archival, Legal Hold, Disposal)            │
│    ├── /analytics (Executive KPIs, SLA Tracking, Workloads)            │
│    └── /ai (Gemini OCR, Document Summary, Category Classifier)         │
├────────────────────────────────────────────────────────────────────────┤
│  Persistence Service:                                                  │
│    ├── Transactional Numbering Sequence Store                          │
│    ├── Document Metadata & Version Repository                          │
│    └── Audit Log & History Storage                                     │
└────────────────────────────────────────────────────────────────────────┘
```

### Core Data Models
- **Organization & Branch**: `id`, `nameEn`, `nameAm`, `code` (e.g., `EPSS-HQ`, `EPSS-ADA`, `EPSS-BDR`), `cluster`, `type` (HeadOffice | Branch), `directorates[]`.
- **User & RBAC**: `id`, `fullName`, `email`, `role` (Admin | Director | RegistryClerk | BranchManager | Officer), `branchId`, `departmentId`, `permissions[]`.
- **Document / Correspondence**: `id`, `registrationNumber` (e.g., `EPSS/IN/2026/00142`), `refNumber`, `type` (Incoming | Outgoing | Memo | Application), `confidentiality` (Public | Internal | Confidential | Secret), `priority` (Normal | Urgent | VeryUrgent), `status` (Received | UnderReview | Assigned | InProgress | Approved | Dispatched | Archived), `sender`, `recipient`, `subject`, `tags[]`, `qrCode`, `physicalFileId`, `createdAt`, `slaDeadline`.
- **Workflow Instance**: `id`, `documentId`, `currentStage`, `assignedToUserId`, `assignedDepartmentId`, `actions[]` (timestamp, actor, decision, comments, signatureStamp).
- **Physical Tracking Record**: `id`, `documentId`, `fileCode`, `shelfLocation`, `currentCustodianId`, `expectedReturnDate`, `movements[]`.
- **Records Retention**: `id`, `documentId`, `scheduleYears`, `disposalMethod`, `legalHoldStatus`, `archivedAt`.

### Component State & Mutation Flow
- **Live Search & Filtering**: Client queries filtered by branch, status, confidentiality, date range with debounce.
- **Workflow Decision Execution**: Instant optimistic UI update with real-time POST to `/api/v1/workflows/:id/action`, refreshing notification queues and audit trails.
- **Bilingual State**: React Context (`LanguageContext`) managing dictionary keys, date display converters (Gregorian & Ethiopian Calendar references), and right/left formatting alignments.
