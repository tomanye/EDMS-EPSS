# EPSS Enterprise Electronic Document and Records Management System (EDRMS)
### የኢትዮጵያ የመድኃኒት አቅርቦት አገልግሎት የኤሌክትሮኒክስ ሰነድ እና መዛግብት አስተዳደር ሥርዓት

[![EPSS Healthcare Architecture](https://img.shields.io/badge/EPSS-National%20Pharmaceutical%20Supply-0d9488?style=flat-square)](https://epss.gov.et)
[![Security Standard](https://img.shields.io/badge/Security-ISO%2015489%20%7C%20MoH%20Compliant-teal?style=flat-square)](https://moh.gov.et)
[![Bilingual Support](https://img.shields.io/badge/Language-English%20%7C%20%E1%8a%a0%E1%88%9b%E1%88%ad%E1%87%8b-emerald?style=flat-square)](/)
[![Branch Coverage](https://img.shields.io/badge/Hubs-Head%20Office%20%2B%2019%20Branches-blue?style=flat-square)](/)

---

## 1. Executive Overview

The **EPSS Enterprise Electronic Document and Records Management System (EDRMS)** is the national electronic records and correspondence platform for the **Ethiopian Pharmaceutical Supply Service (EPSS)**. It governs the end-to-end lifecycle of critical pharmaceutical tenders, regulatory batch approvals (EFDA), emergency medical supplies, internal memos, donor partner grants, and citizen/supplier applications across the **Addis Ababa Central Head Office** and all **19 official regional branch hubs**.

### Core Value Pillars
- **National Hub Interconnectivity:** Seamless correspondence distribution between Addis Ababa Head Office and 19 regional hubs across 4 geographic clusters (Central, Northern, Western, Southern & Eastern).
- **Dual-Calendar & Bilingual Parity:** Real-time toggling between English and Amharic (አማርኛ) with Geez script rendering and Ethiopian calendar conversion.
- **Physical & Digital Dual Custody:** End-to-end dual registration associating electronic records with physical warehouse/vault locations (Building, Floor, Room, Shelf, Box, Folder).
- **Cryptographic Document Verification:** High-resolution QR verification engine with direct deep links (`/?verifyDoc=...`), SHA-256 seals, and printable authenticity certificates.
- **Strict Role-Based Access Control (RBAC):** Tailored views and permissions for 7 distinct institutional personas from Director General to Branch Managers and Registry Officers.
- **AI-Powered Intake Classifier:** Integrated Gemini 2.5 Flash document summarizer and classifier extracting metadata, routing suggestions, and bilingual summaries.

---

## 2. Organization Structure & Hub Coverage

The system natively maintains the official EPSS institutional hierarchy:

### National Head Office
- **Location:** Addis Ababa Central Hub (Arada Sub-City, King George VI St.)
- **Directorates Supported:**
  1. Office of the Director General (ODG)
  2. Pharmaceuticals & Medical Devices Procurement Directorate
  3. Storage & Distribution Directorate
  4. Warehousing & Inventory Management Directorate
  5. Quality Assurance & Regulatory Compliance Directorate
  6. Fund Management & Finance Directorate
  7. Human Resource Development & Administration Directorate
  8. Information Communication Technology Directorate

### 19 Regional Branch Hubs (4 Clusters)
| Cluster | Regional Branch Hubs |
|---|---|
| **Central Cluster** | Addis Ababa Central Hub, Adama Hub, Robe Hub, Hosanna Hub |
| **Northern Cluster** | Bahir Dar Hub, Mekelle Hub, Dessie Hub, Gondar Hub, Debre Markos Hub, Semera Hub |
| **Western Cluster** | Jimma Hub, Nekemte Hub, Assosa Hub, Gambella Hub |
| **Southern & Eastern Cluster**| Hawassa Hub, Dire Dawa Hub, Jijiga Hub, Wolaita Sodo Hub, Arba Minch Hub |

---

## 3. Technology Stack

- **Frontend:** React 19 SPA, TypeScript 5.8, Tailwind CSS v4, Motion, Lucide Icons.
- **Backend Application Server:** Node.js 22 LTS, Express 4.21, TypeScript via TSX runner.
- **Data Persistence:** File-backed JSON database store with atomic write semantics (`/data/edrms_store.json`), automatic backup snapshots, and directory provisioning.
- **AI Engine:** Google Gemini 2.5 Flash via `@google/genai` TypeScript SDK with intelligent heuristic fallback.
- **Cryptographic & Verification Tools:** Node `crypto` SHA-256 digital seals, `qrcode` dynamic SVG/PNG generator, and canvas rasterizer.
- **Deployment Infrastructure:** Multi-stage production `Dockerfile`, `docker-compose.yml`, and security-hardened `nginx.conf` reverse proxy with SSL termination and API rate limiting.

---

## 4. Quick Start & Local Execution

### Prerequisites
- Node.js 20+ or 22+
- npm 10+

### Installation & Run
```bash
# 1. Install dependencies
npm install

# 2. Run development server (Vite + Express on port 3000)
npm run dev

# 3. Compile and verify static TypeScript types
npm run lint

# 4. Build production bundle
npm run build

# 5. Launch in production mode
npm start
```

Open your browser at `http://localhost:3000`.

---

## 5. Master Documentation Index

Comprehensive engineering, administrative, and user manuals are included in the repository:

1. [`README.md`](./README.md) - Executive project overview, quick start, and system capabilities.
2. [`PROJECT_ARCHITECTURE.md`](./PROJECT_ARCHITECTURE.md) - System architecture, tier topology, and data flows.
3. [`DATABASE_DESIGN.md`](./DATABASE_DESIGN.md) - Conceptual database model, normalization, and relational integrity.
4. [`DATABASE_SCHEMA.md`](./DATABASE_SCHEMA.md) - Exact schema definitions, field types, indexes, and relations.
5. [`API_DOCUMENTATION.md`](./API_DOCUMENTATION.md) - Complete REST API specification with endpoints, request/response payloads.
6. [`MODULES_AND_FEATURES.md`](./MODULES_AND_FEATURES.md) - Detailed breakdown of all 14 functional modules.
7. [`WORKFLOW_DESIGN.md`](./WORKFLOW_DESIGN.md) - Multi-tier approval routing, state transition machines, and SLAs.
8. [`SECURITY_DOCUMENTATION.md`](./SECURITY_DOCUMENTATION.md) - RBAC matrix, audit log immutability, cryptographic seals, and threat model.
9. [`INSTALLATION_GUIDE.md`](./INSTALLATION_GUIDE.md) - Developer workstation setup, prerequisites, and initialization.
10. [`DEPLOYMENT_GUIDE.md`](./DEPLOYMENT_GUIDE.md) - Docker, Docker Compose, Nginx, SSL, and systemd deployment.
11. [`ADMINISTRATOR_GUIDE.md`](./ADMINISTRATOR_GUIDE.md) - User administration, branch management, retention policies, and backups.
12. [`USER_GUIDE.md`](./USER_GUIDE.md) - Operational manual for Registry Officers, Directors, and Branch Staff.
13. [`TESTING_REPORT.md`](./TESTING_REPORT.md) - Test verification results, API health checks, and compilation audit.
14. [`PROJECT_STATUS.md`](./PROJECT_STATUS.md) - Real-time milestone tracker across all 10 project phases.
15. [`IMPLEMENTATION_ROADMAP.md`](./IMPLEMENTATION_ROADMAP.md) - Phased delivery milestones and future evolution paths.
16. [`KNOWN_ISSUES.md`](./KNOWN_ISSUES.md) - Operational caveats, browser support, and edge-case handling.

---

## 6. Official License & Attribution
© 2026 Ethiopian Pharmaceutical Supply Service (EPSS) & Ministry of Health, Federal Democratic Republic of Ethiopia. All rights reserved.
