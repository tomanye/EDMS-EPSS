import React, { useEffect, useState } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  X, 
  Download, 
  Printer, 
  Copy, 
  Check, 
  QrCode, 
  ExternalLink, 
  Building2, 
  Clock, 
  Lock 
} from 'lucide-react';
import { DocumentItem } from '../../types/index.js';
import { 
  getVerificationCertificate, 
  generateVerificationQrCode, 
  downloadQrCodeImage, 
  printVerificationCertificate 
} from '../../lib/qrVerification.js';
import { formatEthiopianDate } from '../../lib/translations.js';

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

  useEffect(() => {
    if (doc) {
      generateVerificationQrCode(doc, { size: 280, darkColor: '#0f766e' }).then(setQrCodeUrl);
    }
  }, [doc]);

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

  const handlePrint = () => {
    if (qrCodeUrl) {
      printVerificationCertificate(doc, qrCodeUrl);
    }
  };

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
                Federal Democratic Republic of Ethiopia · EPSS
              </span>
              <h2 className="text-sm font-bold tracking-tight">
                Official Document Verification Status
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-teal-200 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Certificate Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          {/* Status Alert Banner */}
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-900 dark:text-emerald-200 text-xs uppercase tracking-wide">
                  Authentic Government Document Verified
                </span>
                <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-300 font-semibold bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded">
                  CERTIFICATE ACTIVE
                </span>
              </div>
              <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
                This document is recorded in the official EPSS National Electronic Document and Records Management System. All registration metadata, authority approvals, and custody timestamps match system records.
              </p>
            </div>
          </div>

          {/* Core Info & QR Box Split */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 items-center p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
            {/* QR Code Presentation */}
            <div className="flex flex-col items-center justify-center sm:border-r border-slate-200 dark:border-slate-700 sm:pr-4">
              {qrCodeUrl ? (
                <div className="p-2 bg-white rounded-xl shadow-xs border border-slate-200 text-center">
                  <img src={qrCodeUrl} alt="Direct Verification QR Code" className="w-32 h-32" />
                  <span className="block text-[9px] font-mono font-bold text-slate-500 mt-1">
                    SCAN FOR DIRECT PROOF
                  </span>
                </div>
              ) : (
                <div className="w-32 h-32 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
              )}
            </div>

            {/* Document Verification Key Facts */}
            <div className="sm:col-span-2 space-y-2.5">
              <div>
                <span className="text-[10px] font-semibold uppercase text-slate-400 block">Registration Code</span>
                <span className="text-sm font-mono font-bold text-slate-900 dark:text-slate-100">
                  {doc.registrationNumber}
                </span>
              </div>

              <div>
                <span className="text-[10px] font-semibold uppercase text-slate-400 block">External Reference</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
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
                  <span className="font-mono text-slate-700 dark:text-slate-300">{formatEthiopianDate(doc.registrationDate, language)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Cryptographic Proof Details */}
          <div className="space-y-2 p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px]">
            <span className="font-bold text-slate-900 dark:text-slate-100 block">
              Cryptographic Anti-Counterfeit Seal
            </span>
            <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded font-mono text-[10px] text-teal-700 dark:text-teal-400 break-all border border-slate-200 dark:border-slate-700">
              HASH: {cert.sha256Seal}
            </div>
            <div className="flex flex-wrap items-center justify-between text-slate-500 pt-1">
              <span>Authority: <strong>{cert.signingAuthority}</strong></span>
              {cert.digitalSignatureSerial && (
                <span>Cert: <strong>{cert.digitalSignatureSerial}</strong></span>
              )}
            </div>
          </div>

          {/* Direct Verification Link Input with Copy Button */}
          <div className="space-y-1.5">
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
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 font-semibold text-xs"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadQr}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-teal-600" />
              <span>Download QR</span>
            </button>

            <button
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
