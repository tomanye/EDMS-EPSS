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
  const latestSignedAction = doc.workflowHistory
    .slice()
    .reverse()
    .find(w => !!w.digitalSignature && !w.digitalSignature.invalidated);

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
    sha256Seal: latestSignedAction?.digitalSignature?.documentDigestSha256 || generateSecuritySealHash(doc),
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
 * Prints the active verification certificate surface via native browser print CSS (.epss-printable-certificate).
 */
export function printVerificationCertificate(_doc: DocumentItem, _qrDataUrl: string) {
  if (typeof window !== 'undefined' && typeof window.print === 'function') {
    window.print();
  }
}
