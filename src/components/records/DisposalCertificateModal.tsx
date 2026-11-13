import React from 'react';
import {
  Award,
  CheckCircle2,
  Download,
  FileText,
  Printer,
  ShieldCheck,
  X
} from 'lucide-react';
import { DisposalCertificate, Language } from '../../types/index.js';
import { formatEthiopianDate } from '../../lib/translations.js';

interface DisposalCertificateModalProps {
  certificate: DisposalCertificate;
  language: Language;
  onClose: () => void;
}

export const DisposalCertificateModal: React.FC<DisposalCertificateModalProps> = ({
  certificate,
  language,
  onClose
}) => {
  const handleDownloadTxt = () => {
    const lines = [
      '========================================================================',
      'ETHIOPIAN PHARMACEUTICAL SUPPLY SERVICE (EPSS)',
      'OFFICIAL CERTIFICATE OF ARCHIVAL DISPOSAL & DESTRUCTION',
      '========================================================================',
      `Certificate Number : ${certificate.certificateNumber}`,
      `Registration Number: ${certificate.registrationNumber}`,
      `Subject (EN)       : ${certificate.subjectEn}`,
      `Subject (AM)       : ${certificate.subjectAm}`,
      `Confidentiality    : ${certificate.confidentiality}`,
      `Retention Category : ${certificate.retentionCategory}`,
      `Governing Law      : ${certificate.governingLegislation}`,
      `Destruction Method : ${certificate.destructionMethod}`,
      `Issued Timestamp   : ${certificate.issuedAt}`,
      `Executed By        : ${certificate.executedByName}`,
      '',
      '--- INDEPENDENT AUTHORIZING SIGNATORIES ---',
      ...certificate.approvers.map(
        (a, idx) => `${idx + 1}. ${a.name} (${a.role}) — Authorized at ${a.decidedAt}`
      ),
      '',
      '--- DIGITAL INTEGRITY & VERIFICATION SEAL ---',
      `SHA-256 Digest     : ${certificate.digitalVerificationHash}`,
      '========================================================================'
    ].join('\n');

    const blob = new Blob([lines], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = `EPSS_${certificate.certificateNumber}.txt`;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadJson = () => {
    const blob = new Blob([JSON.stringify(certificate, null, 2)], {
      type: 'application/json;charset=utf-8'
    });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = `EPSS_${certificate.certificateNumber}.json`;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden my-6">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {language === 'am' ? 'ይፋዊ የማህደር ማስወገጃ ሰርተፊኬት' : 'Certificate of Destruction & Archival Disposal'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded"
            aria-label="Close certificate preview"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 bg-slate-50 dark:bg-slate-950/50 max-h-[75vh] overflow-y-auto">
          <div className="epss-printable-certificate bg-white text-slate-900 border-2 border-slate-900 rounded-lg p-6 space-y-5">
            {/* Official Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b-2 border-slate-900 pb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                  Federal Democratic Republic of Ethiopia · Ethiopian Pharmaceutical Supply Service
                </p>
                <h4 className="text-base font-bold text-slate-900 mt-1">
                  CERTIFICATE OF AUTHORIZED RECORD DISPOSAL
                </h4>
                <p className="text-[11px] text-slate-600">
                  Issued pursuant to EPSS Records Governance & NALA Proclamation
                </p>
              </div>
              <div className="sm:text-right shrink-0">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 block">
                  Certificate Serial
                </span>
                <span className="text-sm font-mono font-bold text-teal-800 tabular-nums">
                  {certificate.certificateNumber}
                </span>
              </div>
            </div>

            {/* Record Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 block">
                  Registration Number
                </span>
                <span className="font-mono font-bold text-slate-900 tabular-nums">
                  {certificate.registrationNumber}
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 block">
                  Confidentiality Classification
                </span>
                <span className="font-bold text-slate-900 uppercase">
                  {certificate.confidentiality}
                </span>
              </div>

              <div className="sm:col-span-2 p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 block">
                  Disposed Record Subject
                </span>
                <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>{certificate.subjectEn}</span>
                </p>
                {certificate.subjectAm && (
                  <p className="text-slate-600 text-[11px] pl-5">{certificate.subjectAm}</p>
                )}
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 block">
                  Retention Policy & Law
                </span>
                <span className="font-semibold text-slate-900 block">
                  {certificate.retentionCategory}
                </span>
                <span className="text-[11px] text-slate-600">
                  {certificate.governingLegislation}
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <span className="text-[10px] uppercase tracking-wider text-slate-500 block">
                  Destruction / Transfer Method
                </span>
                <span className="font-semibold text-slate-900 block">
                  {certificate.destructionMethod}
                </span>
                <span className="text-[11px] text-slate-600 tabular-nums">
                  Executed: {formatEthiopianDate(certificate.issuedAt, language)}
                </span>
              </div>
            </div>

            {/* Authorizing Signatories */}
            <div className="space-y-2">
              <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-700" />
                Independent Disposal Authorizations ({certificate.approvers.length})
              </h5>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 text-[10px] uppercase">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Authorizing Officer</th>
                      <th className="px-3 py-2 font-semibold">Statutory Role</th>
                      <th className="px-3 py-2 font-semibold text-right">Authorized At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {certificate.approvers.map((appr, i) => (
                      <tr key={`${appr.name}-${i}`}>
                        <td className="px-3 py-2 font-semibold text-slate-900">{appr.name}</td>
                        <td className="px-3 py-2 font-mono text-[11px] text-slate-700">{appr.role}</td>
                        <td className="px-3 py-2 font-mono text-[11px] text-slate-600 text-right tabular-nums">
                          {formatEthiopianDate(appr.decidedAt, language)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Execution & SHA-256 Digest */}
            <div className="border-t border-slate-300 pt-4 space-y-2 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2 text-slate-700">
                <span>
                  Executed by: <strong className="text-slate-900">{certificate.executedByName}</strong>
                </span>
                <span className="font-mono text-[11px] tabular-nums">
                  Issued: {certificate.issuedAt.slice(0, 19).replace('T', ' ')} UTC
                </span>
              </div>
              <div className="p-2.5 bg-slate-100 border border-slate-300 rounded flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 block">
                    Immutable SHA-256 Audit Verification Hash
                  </span>
                  <code className="text-[10px] font-mono text-slate-900 break-all">
                    {certificate.digitalVerificationHash}
                  </code>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadTxt}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download TXT</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadJson}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download JSON</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            >
              {language === 'am' ? 'ዝጋ' : 'Close'}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{language === 'am' ? 'ሰርተፊኬት አትም' : 'Print Certificate'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
