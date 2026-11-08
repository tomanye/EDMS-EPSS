# EPSS EDRMS - Administrator Guide
### System Administration, Maintenance, and Security Operations
**System:** Ethiopian Pharmaceutical Supply Service (EPSS) EDRMS  
**Audience:** IT Infrastructure Administrators, System Administrators, Security Officers  

---

## 1. System Administration Overview

As an EPSS EDRMS Administrator (`SuperAdmin`), you hold root governance over:
- Head Office and all 19 regional branch hub configurations.
- Enterprise integration connectors with national health systems.
- Disaster recovery snapshots, data backups, and point-in-time restoration.
- Retention schedules and institutional litigation holds.
- The append-only security audit log.

---

## 2. Managing Regional Branch Hubs & Directorates

Navigate to **Hub Management** in the administration sidebar:
- **Cluster Filtering:** Filter between Central, Northern, Western, and Southern & Eastern clusters.
- **Hub Inspection:** Review official codes (`EPSS-HQ`, `EPSS-ADM`, `EPSS-HWS`), contact numbers, regional office addresses, and assigned General Managers.
- **Network Synchronization:** Monitor real-time connectivity between the Addis Ababa central hub and regional repositories.

---

## 3. Disaster Recovery, Backups & Restoration

Located in **Security & Disaster Recovery** under the **Disaster Recovery & Snapshots** tab:

### 3.1. Creating a Point-in-Time Snapshot
1. Click the **Create Snapshot Now** button in the header card.
2. The system serializes all active correspondence records, users, branch hubs, physical tracking dockets, and audit entries into an atomic JSON snapshot in `/data/backups/`.
3. A SHA-256 integrity hash is computed and displayed alongside the byte footprint.
4. An immutable audit record is added to the security trail.

### 3.2. Restoring a Snapshot
1. In the **Saved Disaster Recovery Snapshots** table, locate the desired point-in-time archive.
2. Click **Restore State**.
3. Confirm the warning prompt. The system loads the snapshot, updates live memory, persists to `/data/edrms_store.json`, and records an audit log event.
4. All active views refresh immediately.

---

## 4. Enterprise Integration Connectors

Located in **Integrations** in the sidebar:
- **SAP S/4HANA:** Review OData gateway sync timestamp and ping status.
- **Active Directory / LDAP:** Verify user directory binding and SSL certificate validity.
- **Ethio Telecom SMS Gateway:** Test dispatch latency for emergency medication alerts.
- **EFDA Regulatory Portal:** Ensure bidirectional API handshake for batch release certificates.
- **MoH Emergency Response:** Verify national emergency allocation data feed.
- **Government Encrypted SMTP:** Test outbound mail relay for official dispatches.

Click **Test Connection** on any connector card to perform a live network ping. Latencies under 50ms indicate optimal connectivity.

---

## 5. Retention Schedules & Legal Holds

Located in **Archival & Retention**:
- **Schedules:** Review mandatory retention periods across procurement contracts, financial records, and medical supply audits.
- **Legal Holds:** When litigation or regulatory inquiries occur, toggle **Apply Legal Hold** on target records. This overrides retention disposal policies and locks the files against destruction.
