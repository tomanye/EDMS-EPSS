# EPSS EDRMS - Known Issues & Operational Considerations
### Technical Caveats, Edge Cases, and Workarounds
**System:** Ethiopian Pharmaceutical Supply Service (EPSS) EDRMS  
**Version:** 2.4.0 Production Baseline  

---

## 1. AI Document Scanner Graceful Fallback
- **Behavior:** The `/api/v1/ai/analyze-document` endpoint leverages Google Gemini 2.5 Flash when `GEMINI_API_KEY` is configured in `.env`.
- **Mitigation:** If no API key is provided or if external internet access is disabled in isolated on-premises networks, the system automatically falls back to an internal healthcare keyword classification engine. This extracts appropriate EPSS Directorates and categories without throwing errors.

## 2. Ethiopian Calendar Algorithmic Approximation
- **Behavior:** The `formatEthiopianDate` helper computes Ethiopian dates based on standard Julian day conversion.
- **Mitigation:** For official legal disputes, the canonical ISO-8601 UTC timestamp (`createdDate`, `timestamp`) stored in the database remains the legally authoritative record.

## 3. Persona Switcher in Production Environments
- **Behavior:** The current deployment includes a persona switcher dropdown in the header bar to facilitate immediate evaluation of all 7 institutional roles without manual re-login.
- **Production Guidance:** When deploying to production with Microsoft Active Directory integration enabled, configure Nginx or the Express session middleware to disable `/api/v1/auth/switch-persona` and enforce Kerberos / LDAP authentication.

## 4. Large File Uploads & Iframe Sandbox
- **Behavior:** Scanned PDF documents exceeding 50 MB should be stored on local NFS storage rather than passed through standard base64 strings.
- **Mitigation:** The Nginx reverse proxy is configured with `client_max_body_size 50M;`. For larger multi-gigabyte tender dossier archives, sysadmins should mount external volume storage to `/app/data/uploads`.

## 5. High-Volume Scalability
- **Behavior:** The built-in atomic JSON store (`/data/edrms_store.json`) easily supports up to 100,000 documents with microsecond memory access and automated point-in-time snapshots.
- **Future Scale:** For archives projecting tens of millions of records over a 15-year retention lifecycle, the data layer is architected to allow drop-in migration to PostgreSQL / Cloud SQL using the same domain contracts.
