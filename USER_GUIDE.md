# EPSS EDRMS - User Guide & Operational Manual
### የኢትዮጵያ የመድኃኒት አቅርቦት አገልግሎት - የተጠቃሚ መመሪያ
**System:** EPSS Enterprise Electronic Document and Records Management System  
**Audience:** Registry Officers, Directorate Directors, Branch Managers, Procurement Officers  

---

## 1. Getting Started & Interface Basics

### 1.1. Switching Interface Language (English / አማርኛ)
In the top header bar, click the language badge:
- Click **English** for international terminology, Gregorian dates, and standard English forms.
- Click **አማርኛ** for full Amharic translation, Geez numerals, and approximate Ethiopian calendar conversions (e.g. ጥቅምት 25, 2019 ዓ.ም.).

### 1.2. Persona Switcher (Demonstration & Role Simulation)
Click the user profile menu in the upper right corner to switch roles:
- **Director General:** Executive reviews, tender sanctions, policy directives.
- **Registry Officer:** Intake registration, physical binder filing, dispatch.
- **Procurement Officer:** Medicine tenders, supplier contract documentation.
- **Branch Manager:** Regional hub tracking, local warehouse movements.
- **Super Admin:** Global configurations, integrations, disaster recovery backups.

---

## 2. Registering Incoming Documents (Intake Officer)

1. Click **+ Register New Document** (or **+ አዲስ ሰነድ መዝግብ**) in the header or registry view.
2. **Document Details:** Select Document Type (Incoming, Outgoing, Internal Memo, Application).
3. **AI Smart Intake (Optional):** Paste correspondence text into the AI Document Text box and click **Analyze & Fill with Gemini AI**. The system auto-populates the Category, Target Directorate, and bilingual summaries in English and Amharic.
4. **Sender & Recipient Information:** Enter the originating organization (e.g. EFDA, MoH, Supplier) and target EPSS Directorate or Branch Hub.
5. **Physical Warehouse Coordinates (Dual Registration):** Enter the exact storage coordinates:
   - Building (e.g., Central Archive Block A)
   - Floor & Room Number
   - Shelf Rack Number (e.g., Shelf-08)
   - Archival Box File Number (e.g., BOX-2026-REG)
   - Folder Docket Identifier
6. Click **Confirm Registration**. The system automatically assigns an official number (e.g., `EPSS/IN/2026/0105`), computes a SHA-256 seal, and generates a dynamic QR code.

---

## 3. Reviewing & Processing Workflow Items

1. Navigate to **My Workflow Inbox** in the sidebar.
2. Click any document row to open the **360-Degree Document Detail Drawer**.
3. In the drawer:
   - Review metadata, category, and priority.
   - Inspect physical warehouse coordinates.
   - Read previous chronological minutes and endorsements.
4. **Endorsing Minutes:**
   - In the **Endorse Minute / Workflow Action** panel, select your decision (`Approved`, `Forwarded`, `Rejected`, `Dispatched`, or `Closed`).
   - Enter your official technical minute notes.
   - Click **Submit Official Action**. The system appends your signature and notifies the recipient.

---

## 4. Physical Dossier Handover & Custody Tracking

When moving a physical paper dossier to another officer, room, or courier:
1. Navigate to **Physical Tracking** in the sidebar.
2. Click **Record Physical Handover**.
3. Select the document, specify the From and To locations/officers, carrier method (Registry Messenger, Internal Cart, Courier), and dispatch date.
4. The recipient officer acknowledges receipt, updating the immutable chain of custody.

---

## 5. QR Code Document Verification & Authenticity Checks

### 5.1. Viewing & Printing the Verification Certificate
1. Open any document in the **Document Detail Drawer**.
2. Locate the **Official EPSS Document Verification Seal** card.
3. Click **Download PNG** to save a high-resolution QR matrix image.
4. Click **Print Certificate** to generate an official verification slip containing the seal, SHA-256 checksum, and legal clearance text.

### 5.2. Scanning with a Smartphone Camera
1. Open the camera app on any iOS or Android smartphone.
2. Aim the lens at the QR code on the physical paper document or verification certificate.
3. Tap the detected URL: `${APP_URL}/?verifyDoc=EPSS/...`.
4. The system opens the official **Cryptographic Authenticity Certificate**, instantly confirming whether the paper document is authentic, who authorized it, and its current legal status.
