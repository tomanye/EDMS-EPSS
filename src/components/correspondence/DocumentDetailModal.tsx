import React, { useState, useEffect } from 'react';
import { 
  X, 
  QrCode, 
  ShieldCheck, 
  FileText, 
  Download, 
  Clock, 
  MapPin, 
  UserCheck, 
  Send, 
  Lock, 
  Unlock, 
  CheckCircle2, 
  CornerUpLeft,
  Calendar,
  AlertCircle,
  ExternalLink,
  Printer,
  Copy,
  Check
} from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import { formatEthiopianDate } from '../../lib/translations.js';
import { 
  generateVerificationQrCode, 
  getDocumentVerificationUrl, 
  downloadQrCodeImage, 
  printVerificationCertificate 
} from '../../lib/qrVerification.js';
import { VerificationStatusModal } from '../verification/VerificationStatusModal.js';

export const DocumentDetailModal: React.FC = () => {
  const { selectedDocument, setSelectedDocument, currentUser, departments, refreshData, language, t } = useApp();
  const [minuteText, setMinuteText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [liveQrCodeUrl, setLiveQrCodeUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (selectedDocument) {
      generateVerificationQrCode(selectedDocument, { size: 280, darkColor: '#0f766e' }).then(url => {
        setLiveQrCodeUrl(url);
      });
    }
  }, [selectedDocument]);

  if (!selectedDocument) return null;

  const doc = selectedDocument;

  const handleAddMinute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!minuteText.trim()) return;

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/v1/workflows/${doc.id}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || ''
        },
        body: JSON.stringify({
          action: 'MinuteAdded',
          comments: minuteText
        })
      });
      if (!res.ok) throw new Error('Failed to record minute');
      const updated = await res.json();
      setSelectedDocument(updated);
      setMinuteText('');
      await refreshData();
    } catch (err) {
      console.error(err);
      alert('Failed to add minute note');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleLegalHold = async () => {
    try {
      const res = await fetch(`/api/v1/records/legal-hold/${doc.id}`, {
        method: 'POST',
        headers: {
          'x-user-id': currentUser?.id || ''
        }
      });
      const data = await res.json();
      setSelectedDocument({
        ...doc,
        legalHold: data.legalHold
      });
      await refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-6 max-h-[90vh] flex flex-col">
        {/* Modal Top Bar */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-950 flex items-center justify-center text-teal-800 dark:text-teal-300 font-mono font-bold text-xs">
              DOC
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
                  {doc.registrationNumber}
                </span>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <span className="text-xs text-slate-500 font-mono">
                  Ref: {doc.referenceNumber}
                </span>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <span className="text-xs font-semibold text-teal-700 dark:text-teal-400">
                  {doc.type}
                </span>
              </div>
              <div className="text-[11px] text-slate-400">
                Registered on {formatEthiopianDate(doc.registrationDate, language)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleLegalHold}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors inline-flex items-center gap-1 ${
                doc.legalHold
                  ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900'
                  : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
              }`}
              title="Toggle Legal Hold to protect from records disposal"
            >
              {doc.legalHold ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              <span>{doc.legalHold ? 'Legal Hold Active' : 'Apply Legal Hold'}</span>
            </button>

            <button
              onClick={() => setSelectedDocument(null)}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          {/* Main Title & Status Strip */}
          <div className="space-y-2">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-snug">
              {doc.subjectEn}
            </h2>
            {doc.subjectAm && (
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 font-sans">
                {doc.subjectAm}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-2 text-slate-600 dark:text-slate-400">
              <span>Status: <strong className="text-teal-700 dark:text-teal-400 font-semibold">{doc.status}</strong></span>
              <span>·</span>
              <span>Priority: <strong className={doc.priority === 'VeryUrgent' ? 'text-rose-600' : 'text-slate-800 dark:text-slate-200'}>{doc.priority}</strong></span>
              <span>·</span>
              <span>Confidentiality: <strong className="text-slate-800 dark:text-slate-200">{doc.confidentiality}</strong></span>
              <span>·</span>
              <span>Due: <strong className="font-mono text-slate-800 dark:text-slate-200">{doc.dueDate ? formatEthiopianDate(doc.dueDate, language) : 'None'}</strong></span>
            </div>
          </div>

          {/* Description & AI Summary */}
          {doc.descriptionEn && (
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
              <span className="font-semibold text-slate-800 dark:text-slate-200 block">Description:</span>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                {language === 'am' ? doc.descriptionAm || doc.descriptionEn : doc.descriptionEn}
              </p>
            </div>
          )}

          {doc.aiExtracted && (
            <div className="p-3.5 bg-teal-50/60 dark:bg-teal-950/30 rounded-xl border border-teal-200 dark:border-teal-900/60 space-y-2">
              <div className="flex items-center justify-between text-teal-800 dark:text-teal-300 font-semibold">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-teal-600" />
                  <span>Gemini Multimodal Document Intelligence</span>
                </span>
                <span className="font-mono text-[11px] text-teal-700 dark:text-teal-400">
                  Confidence {(doc.aiExtracted.confidence * 100).toFixed(0)}%
                </span>
              </div>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                {language === 'am' ? doc.aiExtracted.summaryAm : doc.aiExtracted.summaryEn}
              </p>
              <div className="flex items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-teal-100 dark:border-teal-900/40">
                <span>Category: <strong>{doc.aiExtracted.suggestedCategory}</strong></span>
                <span>·</span>
                <span>Assigned: <strong>{doc.aiExtracted.suggestedDepartment}</strong></span>
              </div>
            </div>
          )}

          {/* 2-Column Info: Parties + Physical Location & QR */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Sender & Recipient Details */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 pb-2 border-b border-slate-100 dark:border-slate-800">
                Parties & Distribution
              </h3>
              <div className="space-y-1">
                <span className="text-[11px] text-slate-400 font-semibold uppercase">Sender</span>
                <div className="font-medium text-slate-900 dark:text-slate-100">{doc.senderOrganization}</div>
                {doc.senderPerson && <div className="text-slate-500">{doc.senderPerson}</div>}
              </div>
              <div className="space-y-1 pt-1">
                <span className="text-[11px] text-slate-400 font-semibold uppercase">Recipient</span>
                <div className="font-medium text-slate-900 dark:text-slate-100">{doc.recipientOrganization}</div>
                {doc.recipientPerson && <div className="text-slate-500">{doc.recipientPerson}</div>}
              </div>
              <div className="space-y-1 pt-1">
                <span className="text-[11px] text-slate-400 font-semibold uppercase">Handling Department</span>
                <div className="text-slate-800 dark:text-slate-200 font-medium">{doc.assignedDepartmentName || 'Central Registry'}</div>
              </div>
            </div>

            {/* QR Code & Direct Verification Status Card */}
            <div className="p-4 bg-teal-50/40 dark:bg-slate-900 rounded-xl border border-teal-200 dark:border-slate-800 flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-teal-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100">
                  <QrCode className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span>Direct QR Verification Status</span>
                </div>
                <span className="text-[10px] font-mono font-bold text-teal-700 dark:text-teal-300 bg-teal-100 dark:bg-teal-950/80 px-2 py-0.5 rounded">
                  AUTHENTICATED
                </span>
              </div>

              <div className="flex gap-4 items-center">
                {liveQrCodeUrl || doc.qrCodeDataUrl ? (
                  <div className="p-1.5 bg-white border border-slate-200 rounded-lg shadow-xs shrink-0 text-center">
                    <img src={liveQrCodeUrl || doc.qrCodeDataUrl} alt="Document Verification QR Code" className="w-24 h-24" />
                    <span className="block text-[8px] font-mono font-bold text-slate-500 mt-0.5">DIRECT STATUS LINK</span>
                  </div>
                ) : (
                  <div className="w-24 h-24 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                    <QrCode className="w-8 h-8" />
                  </div>
                )}

                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="text-[11px] text-slate-600 dark:text-slate-400">
                    <span>Binder Code:</span> <strong className="font-mono text-teal-700 dark:text-teal-400">{doc.physicalTracking?.fileCode || 'NO-PHYSICAL-FILE'}</strong>
                  </div>

                  {doc.physicalTracking && (
                    <div className="text-[10px] text-slate-500 space-y-0.5 truncate">
                      <div>Vault: {doc.physicalTracking.building} ({doc.physicalTracking.room})</div>
                      <div>Custodian: {doc.physicalTracking.currentCustodianName}</div>
                    </div>
                  )}

                  <div className="pt-1 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsVerificationModalOpen(true)}
                      className="px-2.5 py-1 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-700 rounded-md shadow-xs transition-colors inline-flex items-center gap-1"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Verify Status</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const url = getDocumentVerificationUrl(doc);
                        navigator.clipboard.writeText(url);
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 2000);
                      }}
                      className="p-1 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                      title="Copy Direct Verification URL"
                    >
                      {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>

                    {(liveQrCodeUrl || doc.qrCodeDataUrl) && (
                      <button
                        type="button"
                        onClick={() => downloadQrCodeImage(liveQrCodeUrl || doc.qrCodeDataUrl!, `EPSS_QR_${doc.registrationNumber.replace(/\//g, '_')}.png`)}
                        className="p-1 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Download QR Code (PNG)"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    )}

                    {(liveQrCodeUrl || doc.qrCodeDataUrl) && (
                      <button
                        type="button"
                        onClick={() => printVerificationCertificate(doc, liveQrCodeUrl || doc.qrCodeDataUrl!)}
                        className="p-1 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Print Official Certificate Slip"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Attachments Section */}
          <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="font-bold text-slate-900 dark:text-slate-100">
              Attached Digitized Documents ({doc.attachments.length})
            </h3>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {doc.attachments.map((att) => (
                <div key={att.id} className="py-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-4 h-4 text-teal-600 shrink-0" />
                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate">{att.fileName}</span>
                    <span className="text-[11px] text-slate-400">({(att.fileSize / 1024 / 1024).toFixed(2)} MB)</span>
                  </div>
                  <a
                    href={att.fileUrl}
                    download={att.fileName}
                    className="p-1 text-slate-600 hover:text-teal-700 dark:text-slate-400 dark:hover:text-teal-300"
                    title="Download attachment"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Workflow History / Minutes Trail */}
          <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="font-bold text-slate-900 dark:text-slate-100">
              Official Minutes & Workflow Progression
            </h3>

            <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
              {doc.workflowHistory.map((step) => (
                <div key={step.id} className="relative space-y-1">
                  <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-teal-600 border-2 border-white dark:border-slate-900" />
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-slate-100">{step.actorName}</span>
                    <span className="text-slate-400">({step.actorRole})</span>
                    <span className="text-slate-300">·</span>
                    <span className="font-semibold text-teal-700 dark:text-teal-400">{step.action}</span>
                    <span className="text-slate-300">·</span>
                    <span className="font-mono text-slate-400">{formatEthiopianDate(step.timestamp, language)}</span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                    {step.comments}
                  </p>
                  {step.digitalSignature && (
                    <div className="inline-flex items-center gap-1.5 text-[10px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded">
                      <ShieldCheck className="w-3 h-3" />
                      <span>Signed: {step.digitalSignature.certificateSerial}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Quick Minute Note Form */}
            <form onSubmit={handleAddMinute} className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <label className="block text-slate-700 dark:text-slate-300 font-semibold">
                Add Official Directorate Minute / Endorsement
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type minute comment or instruction..."
                  value={minuteText}
                  onChange={(e) => setMinuteText(e.target.value)}
                  className="flex-1 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  required
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-3 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-semibold shrink-0"
                >
                  {isSubmitting ? 'Posting...' : 'Post Minute'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Verification Status Modal */}
      <VerificationStatusModal
        document={doc}
        isOpen={isVerificationModalOpen}
        onClose={() => setIsVerificationModalOpen(false)}
        language={language}
      />
    </div>
  );
};
