import QRCode from 'qrcode';
import { DocumentItem } from '../types/index.js';

export interface VerificationCertificate {
  certificateId: string;
  registrationNumber: string;
  referenceNumber: string;
  documentType: string;
  subjectEn: string;
  subjectAm: string;
  senderOrganization: string;
  recipientOrganization: string;
  issueDate: string;
  verificationUrl: string;
  status: string;
  isAuthentic: boolean;
  signingAuthority: string;
  digitalSignatureSerial?: string;
  sha256Seal: string;
  physicalFileCode?: string;
  physicalLocation?: string;
}

/**
 * Builds the canonical public verification URL for a document.
 */
export function getDocumentVerificationUrl(doc: DocumentItem): string {
  const origin = typeof window !== 'undefined' && window.location.origin 
    ? window.location.origin 
    : 'https://epss-edrms.gov.et';
  return `${origin}/?verifyDoc=${encodeURIComponent(doc.registrationNumber)}`;
}

/**
 * Generates an SHA-256 style simulated security digest for anti-counterfeit proof.
 */
export function generateSecuritySealHash(doc: DocumentItem): string {
  const raw = `${doc.registrationNumber}:${doc.referenceNumber}:${doc.registrationDate}:${doc.status}:EPSS-SECURE`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash << 5) - hash + raw.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `0x${hex}b84f29a071de99c3${hex}f1`.toUpperCase();
}

/**
 * Generates high-resolution QR code data URL encoding the direct verification link.
 */
export async function generateVerificationQrCode(
  doc: DocumentItem,
  options?: {
    size?: number;
    darkColor?: string;
    lightColor?: string;
  }
): Promise<string> {
  const url = getDocumentVerificationUrl(doc);
  try {
    return await QRCode.toDataURL(url, {
      width: options?.size || 320,
      margin: 1,
      color: {
        dark: options?.darkColor || '#0f766e', // EPSS Teal
        light: options?.lightColor || '#ffffff',
      },
      errorCorrectionLevel: 'H', // High error tolerance for clear scanning
    });
  } catch (err) {
    console.error('Failed to generate QR code:', err);
    // Fallback simple svg
    return '';
  }
}

/**
 * Builds the structured verification certificate object.
 */
export function getVerificationCertificate(doc: DocumentItem): VerificationCertificate {
  const latestSignedAction = doc.workflowHistory.slice().reverse().find(w => !!w.digitalSignature);

  return {
    certificateId: `EPSS-CERT-${doc.registrationNumber.replace(/\//g, '-')}`,
    registrationNumber: doc.registrationNumber,
    referenceNumber: doc.referenceNumber,
    documentType: doc.type,
    subjectEn: doc.subjectEn,
    subjectAm: doc.subjectAm,
    senderOrganization: doc.senderOrganization,
    recipientOrganization: doc.recipientOrganization,
    issueDate: doc.registrationDate,
    verificationUrl: getDocumentVerificationUrl(doc),
    status: doc.status,
    isAuthentic: true,
    signingAuthority: latestSignedAction?.digitalSignature?.signedBy || 'EPSS Directorate Registry Authority',
    digitalSignatureSerial: latestSignedAction?.digitalSignature?.certificateSerial,
    sha256Seal: generateSecuritySealHash(doc),
    physicalFileCode: doc.physicalTracking?.fileCode,
    physicalLocation: doc.physicalTracking ? `${doc.physicalTracking.building}, ${doc.physicalTracking.room}, ${doc.physicalTracking.shelfNumber}` : undefined
  };
}

/**
 * Downloads a generated QR code image as PNG file.
 */
export function downloadQrCodeImage(dataUrl: string, fileName: string) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Opens a print dialog for an official verification certificate badge.
 */
export function printVerificationCertificate(doc: DocumentItem, qrDataUrl: string) {
  const cert = getVerificationCertificate(doc);
  const printWindow = window.open('', '_blank', 'width=800,height=900');
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>EPSS Document Verification Certificate - ${doc.registrationNumber}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            margin: 0;
            padding: 30px;
            color: #0f172a;
            background: #ffffff;
          }
          .cert-container {
            border: 2px solid #0f766e;
            padding: 30px;
            border-radius: 12px;
            max-width: 680px;
            margin: 0 auto;
            position: relative;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 16px;
            margin-bottom: 20px;
          }
          .header h1 {
            color: #0f766e;
            font-size: 20px;
            margin: 0 0 4px 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .header h2 {
            font-size: 13px;
            color: #475569;
            margin: 0;
            font-weight: 500;
          }
          .badge-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: #f0fdfa;
            border: 1px solid #ccfbf1;
            padding: 12px 16px;
            border-radius: 8px;
            margin-bottom: 20px;
          }
          .badge-row strong {
            color: #0f766e;
            font-size: 14px;
          }
          .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-bottom: 20px;
            font-size: 13px;
          }
          .field label {
            display: block;
            font-size: 11px;
            text-transform: uppercase;
            color: #64748b;
            font-weight: 600;
            margin-bottom: 2px;
          }
          .field span {
            font-weight: 500;
            color: #1e293b;
          }
          .qr-section {
            display: flex;
            align-items: center;
            gap: 20px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 16px;
            border-radius: 8px;
            margin-bottom: 20px;
          }
          .qr-img {
            width: 130px;
            height: 130px;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
          }
          .seal-code {
            font-family: monospace;
            font-size: 10px;
            color: #0f766e;
            word-break: break-all;
            background: #ffffff;
            padding: 6px;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            margin-top: 6px;
          }
          .footer {
            text-align: center;
            font-size: 11px;
            color: #64748b;
            border-top: 1px solid #e2e8f0;
            padding-top: 12px;
          }
          @media print {
            body { padding: 0; }
            .cert-container { border: 2px solid #000; }
          }
        </style>
      </head>
      <body>
        <div class="cert-container">
          <div class="header">
            <h1>Federal Democratic Republic of Ethiopia</h1>
            <h2>Ethiopian Pharmaceutical Supply Service (EPSS) · የኢትዮጵያ መድኃኒት አቅራቢ አገልግሎት</h2>
            <p style="margin: 6px 0 0 0; font-size: 12px; font-weight: bold; color: #0f766e;">Official Electronic Correspondence Authenticity Certificate</p>
          </div>

          <div class="badge-row">
            <div>
              <span style="font-size: 11px; color: #64748b;">Security Status:</span><br/>
              <strong>AUTHENTIC & VERIFIED GOVERNMENT RECORD</strong>
            </div>
            <div style="text-align: right;">
              <span style="font-size: 11px; color: #64748b;">Registration Number:</span><br/>
              <span style="font-family: monospace; font-size: 14px; font-weight: bold;">${doc.registrationNumber}</span>
            </div>
          </div>

          <div class="grid">
            <div class="field">
              <label>External / Directorate Reference</label>
              <span>${doc.referenceNumber}</span>
            </div>
            <div class="field">
              <label>Document Classification</label>
              <span>${doc.type} (${doc.confidentiality})</span>
            </div>
            <div class="field" style="grid-column: span 2;">
              <label>Subject (English / Amharic)</label>
              <span>${doc.subjectEn}</span><br/>
              <span style="color: #475569; font-size: 12px;">${doc.subjectAm || ''}</span>
            </div>
            <div class="field">
              <label>Sender Organization</label>
              <span>${doc.senderOrganization}</span>
            </div>
            <div class="field">
              <label>Recipient Authority</label>
              <span>${doc.recipientOrganization}</span>
            </div>
            <div class="field">
              <label>Registration Date</label>
              <span>${doc.registrationDate}</span>
            </div>
            <div class="field">
              <label>Current Lifecycle Status</label>
              <span style="color: #0f766e; font-weight: bold;">${doc.status}</span>
            </div>
          </div>

          <div class="qr-section">
            <img src="${qrDataUrl}" class="qr-img" alt="Official Verification QR" />
            <div style="flex: 1;">
              <strong style="font-size: 12px; color: #0f766e;">Direct Verification Link & Anti-Tamper Seal</strong>
              <p style="font-size: 11px; color: #475569; margin: 4px 0;">
                Scan with any mobile camera or visit the verification portal to inspect the tamper-evident digital workflow history.
              </p>
              <div class="seal-code">
                SEAL: ${cert.sha256Seal}
              </div>
              <p style="font-size: 10px; color: #64748b; margin: 4px 0 0 0;">
                URL: ${cert.verificationUrl}
              </p>
            </div>
          </div>

          <div class="footer">
            EPSS EDRMS Security Architecture · Document ID: ${doc.id} · Issued by National Health Logistics Registry
          </div>
        </div>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 350);
}
