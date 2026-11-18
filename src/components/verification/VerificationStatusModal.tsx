import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  X,
  Download,
  Printer,
  Copy,
  Check,
  AlertTriangle,
  ShieldAlert,
  RefreshCw,
  Fingerprint,
  FileKey2
} from 'lucide-react';
import { DocumentItem, DocumentSignatureVerificationResult } from '../../types/index.js';
import {
  getVerificationCertificate,
  generateVerificationQrCode,
  downloadQrCodeImage
} from '../../lib/qrVerification.js';
import { formatEthiopianDate } from '../../lib/translations.js';
import { apiFetch } from '../../lib/apiFetch.js';

interface VerificationStatusModalProps {
  document: DocumentItem | null;
  isOpen: boolean;
  onClose: () => void;
  language?: 'en' | 'am';
}

export const VerificationStatusModal: React.FC<VerificationStatusModalProps> = ({
  document: doc,
  isOpen,
  onClose,
  language = 'en'
}) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [verification, setVerification] = useState<DocumentSignatureVerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verifyError, setVerifyError] = useState<string>('');

  const runLiveVerification = async (docId: string) => {
    setIsVerifying(true);
    setVerifyError('');
    try {
      const res = await apiFetch(`/api/v1/correspondence/${docId}/signatures/verify`);
      const data = await res.json();
      if (!res.ok) {
        setVerifyError(data.error || 'Cryptographic verification check failed.');
        setVerification(null);
      } else {
        setVerification(data);
      }
    } catch {
      setVerifyError('Network error communicating with EPSS PKI verification authority.');
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    if (isOpen && doc) {
      generateVerificationQrCode(doc, { size: 280, darkColor: '#0f766e' }).then(setQrCodeUrl);
      runLiveVerification(doc.id);
    }
  }, [isOpen, doc]);

  if (!isOpen || !doc) return null;

  const cert = getVerificationCertificate(doc);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(cert.verificationUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQr = () => {
    if (qrCodeUrl) {
      downloadQrCodeImage(qrCodeUrl, `EPSS_QR_${doc.registrationNumber.replace(/\//g, '_')}.png`);
    }
  };

  const handleDownloadBundle = async () => {
    try {
      const res = await apiFetch(`/api/v1/correspondence/${doc.id}/signatures/bundle`);
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.registrationNumber.replace(/[^A-Za-z0-9_-]/g, '_')}.sig.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // handled silently if offline
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined' && typeof window.print === 'function') {
      window.print();
    }
  };

  const integrity = verification?.integrityStatus;
  const isVerified = integrity === 'Verified';
  const isTampered = integrity === 'Tampered';
  const isRevoked = integrity === 'CertificateRevoked';
  const isSuperseded = integrity === 'Superseded';

  const bannerColors = isTampered
    ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200'
    : isRevoked || isSuperseded || integrity === 'MissingRequiredSignature'
      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200'
      : isVerified
        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200';

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-teal-200 dark:border-teal-900 shadow-2xl overflow-hidden my-6 max-h-[92vh] flex flex-col">
        {/* Header Ribbon */}
        <div className="px-6 py-4 bg-teal-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-teal-700 border border-teal-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-teal-200" />
            </div>
            <div>
              <span className="text-[10px] tracking-wider uppercase font-semibold text-teal-200 block">
                Federal Democratic Republic of Ethiopia · EPSS PKI Authority
              </span>
              <h2 className="text-sm font-bold tracking-tight">
                Cryptographic Signature & Authenticity Verification
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-teal-200 hover:text-white rounded-lg transition-colors"
            aria-label="Close verification modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Certificate Body (Printable Surface) */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs epss-printable-certificate">
          {/* Live Verification Banner */}
          <div className={`p-4 border rounded-xl flex items-start gap-3 ${bannerColors}`}>
            {isTampered || isRevoked ? (
              <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
            ) : isVerified ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            )}
            <div className="flex-1 space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-xs uppercase tracking-wide">
                  {isVerifying
                    ? 'Verifying RSA-SHA256 Signatures...'
                    : integrity === 'Verified'
                      ? 'Cryptographically Verified Official Record'
                      : integrity === 'Tampered'
                        ? 'Integrity Alert: Post-Signing Modification Detected'
                        : integrity === 'CertificateRevoked'
                          ? 'Certificate Warning: Signer Key Revoked'
                          : integrity === 'Superseded'
                            ? 'Signatures Superseded by Authorized Edit'
                            : integrity === 'MissingRequiredSignature'
                              ? 'Pending Required PKI Digital Signature'
                              : 'Registered Document (No PKI Approvals Yet)'}
                </span>
                <span className="text-[11px] font-mono font-bold tabular-nums">
                  {verification ? `${verification.validSignatures}/${verification.totalSignatures} VALID` : 'CHECKING'}
                </span>
              </div>
              <p className="text-[11px] opacity-90 leading-relaxed">
                {verifyError ||
                  verification?.summaryMessage ||
                  'Checking document SHA-256 canonical digest against recorded EPSS X.509-style RSA-2048 signatures...'}
              </p>
            </div>
          </div>

          {/* Core Info & QR Box Split */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 items-center p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex flex-col items-center justify-center sm:border-r border-slate-200 dark:border-slate-700 sm:pr-4">
              {qrCodeUrl ? (
                <div className="p-2 bg-white rounded-xl shadow-xs border border-slate-200 text-center">
                  <img src={qrCodeUrl} alt="Direct Verification QR Code" className="w-32 h-32" />
                  <span className="block text-[9px] font-mono font-bold text-slate-500 mt-1">
                    SCAN FOR DIRECT PROOF
                  </span>
                </div>
              ) : (
                <div className="w-32 h-32 bg-slate-200 dark:bg-slate-700 rounded-xl" />
              )}
            </div>

            <div className="sm:col-span-2 space-y-2.5">
              <div>
                <span className="text-[10px] font-semibold uppercase text-slate-400 block">Registration Code</span>
                <span className="text-sm font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                  {doc.registrationNumber}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-semibold uppercase text-slate-400 block">External Reference</span>
                <span className="font-mono text-slate-700 dark:text-slate-300 tabular-nums">
                  {doc.referenceNumber}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-semibold uppercase text-slate-400 block">Subject</span>
                <span className="font-semibold text-slate-900 dark:text-slate-100 line-clamp-2">
                  {doc.subjectEn}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200 dark:border-slate-700 text-[11px]">
                <div>
                  <span className="text-slate-400 block">Current Status:</span>
                  <span className="font-bold text-teal-700 dark:text-teal-400">{doc.status}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Issue Date:</span>
                  <span className="font-mono text-slate-700 dark:text-slate-300 tabular-nums">
                    {formatEthiopianDate(doc.registrationDate, language)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Cryptographic SHA-256 Digest */}
          <div className="space-y-2 p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px]">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <FileKey2 className="w-3.5 h-3.5 text-teal-600" />
                <span>Canonical SHA-256 Document Digest</span>
              </span>
              <button
                type="button"
                onClick={() => runLiveVerification(doc.id)}
                disabled={isVerifying}
                className="text-[11px] font-semibold text-teal-700 dark:text-teal-400 hover:underline inline-flex items-center gap-1 disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isVerifying ? 'animate-spin' : ''}`} />
                <span>Re-Verify Cryptography</span>
              </button>
            </div>
            <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded font-mono text-[10px] text-teal-700 dark:text-teal-400 break-all border border-slate-200 dark:border-slate-700 tabular-nums">
              SHA256: {verification?.currentDocumentDigestSha256 || cert.sha256Seal}
            </div>
          </div>

          {/* Cryptographic Signature Ledger */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xs">
              Recorded PKI Signatures & Certificate Chain ({verification?.signatures.length ?? 0})
            </h3>
            {!verification || verification.signatures.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-slate-500 dark:text-slate-400 text-[11px]">
                No RSA-SHA256 approval signatures have been applied to this record yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                {verification.signatures.map((sig) => {
                  const statusColor =
                    sig.status === 'Valid'
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : sig.status === 'Tampered' || sig.status === 'InvalidSignature'
                        ? 'text-rose-700 dark:text-rose-400'
                        : 'text-amber-700 dark:text-amber-400';

                  return (
                    <div key={sig.historyRecordId} className="p-3.5 space-y-1.5 text-[11px]">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="font-bold text-slate-900 dark:text-slate-100">
                          {sig.signedBy}
                        </div>
                        <span className={`font-mono font-bold uppercase ${statusColor}`}>
                          {sig.status} · {sig.algorithm}
                        </span>
                      </div>
                      <div className="text-slate-700 dark:text-slate-300">
                        Intent: <strong>{sig.signingMeaning || 'Approved for Official Issuance'}</strong>
                        {sig.stageName ? ` · Stage: ${sig.stageName}` : ''}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">
                        <span>Cert: {sig.certificateSerial} ({sig.certificateStatus})</span>
                        <span>Signed: {formatEthiopianDate(sig.signedAt, language, true)}</span>
                        {sig.hsmSlotLabel && (
                          <span className="text-slate-700 dark:text-slate-300">
                            HSM: {sig.hsmSlotLabel} ({sig.keyProtectionMode === 'HSM_AES256_WRAPPED' ? 'AES-256 Wrapped' : 'Legacy'})
                          </span>
                        )}
                        {sig.caChainTrusted !== undefined && (
                          <span className={sig.caChainTrusted ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600'}>
                            CA Trust: {sig.caChainTrusted ? 'Verified' : 'Untrusted'}
                          </span>
                        )}
                        {sig.tsaVerified && sig.tsaTimestampUtc && (
                          <span className="text-teal-700 dark:text-teal-400">
                            TSA RFC-3161: {sig.tsaTimestampUtc.slice(0, 19)}Z
                          </span>
                        )}
                        {sig.biometricVerified && (
                          <span className="inline-flex items-center gap-1 text-teal-700 dark:text-teal-400 font-semibold">
                            <Fingerprint className="w-3 h-3" />
                            Step-Up MFA Verified
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {sig.reason}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Direct Verification Link Input */}
          <div className="space-y-1.5 print:hidden">
            <label className="block text-slate-700 dark:text-slate-300 font-semibold text-[11px]">
              Direct Verification URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={cert.verificationUrl}
                className="flex-1 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-mono text-[11px]"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg font-semibold flex items-center gap-1.5 shrink-0 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy URL'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 font-semibold text-xs"
          >
            Close
          </button>

          <div className="flex flex-wrap items-center gap-2">
            {(verification?.signatures.length ?? 0) > 0 && (
              <button
                type="button"
                onClick={handleDownloadBundle}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-lg hover:bg-teal-100 transition-colors"
              >
                <FileKey2 className="w-3.5 h-3.5" />
                <span>{language === 'am' ? 'የ.sig.json ማረጋገጫ' : 'Export .sig.json Proof'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleDownloadQr}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-teal-600" />
              <span>Download QR</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Certificate Slip</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
