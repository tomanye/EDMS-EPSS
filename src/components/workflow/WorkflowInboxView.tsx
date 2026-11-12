import React, { useState } from 'react';
import { 
  GitBranch, 
  CheckCircle2, 
  XCircle, 
  Send, 
  CornerUpLeft, 
  ShieldCheck, 
  MessageSquare,
  Clock,
  ArrowRight,
  Filter,
  Fingerprint
} from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import { formatEthiopianDate } from '../../lib/translations.js';
import { DocumentItem } from '../../types/index.js';
import { BiometricVerificationModal } from '../auth/BiometricVerificationModal.js';

export const WorkflowInboxView: React.FC = () => {
  const { documents, currentUser, departments, users = [], refreshData, setSelectedDocument, language, t } = useApp() as any;

  const [activeSubTab, setActiveSubTab] = useState<'pending' | 'all'>('pending');
  const [actionModalDoc, setActionModalDoc] = useState<DocumentItem | null>(null);
  const [actionType, setActionType] = useState<'Approved' | 'Forwarded' | 'Rejected' | 'ReturnedForCorrection'>('Approved');
  const [actionComments, setActionComments] = useState('');
  const [forwardDept, setForwardDept] = useState('');
  const [forwardUser, setForwardUser] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBiometricApprovalOpen, setIsBiometricApprovalOpen] = useState(false);

  // Filter actionable items: either explicitly assigned to current user, or under review/awaiting approval
  const pendingDocs = documents.filter((d: DocumentItem) => 
    ['UnderReview', 'AwaitingApproval', 'Received', 'Assigned', 'InProgress'].includes(d.status)
  );

  const displayedDocs = activeSubTab === 'pending' ? pendingDocs : documents;

  const handleOpenActionModal = (doc: DocumentItem, type: 'Approved' | 'Forwarded' | 'Rejected' | 'ReturnedForCorrection') => {
    setActionModalDoc(doc);
    setActionType(type);
    setActionComments('');
    setForwardDept(doc.departmentId || '');
    setForwardUser('');
  };

  const handleExecuteWorkflow = async (e?: React.FormEvent, biometricSignatureVerified?: boolean) => {
    if (e) e.preventDefault();
    if (!actionModalDoc) return;

    try {
      setIsSubmitting(true);
      const bioSuffix = biometricSignatureVerified ? ' [Biometrically Signed & Sealed via WebAuthn]' : '';
      const payload: any = {
        action: actionType,
        comments: (actionComments || `Workflow decision recorded by ${currentUser?.fullNameEn}`) + bioSuffix
      };

      if (actionType === 'Forwarded') {
        payload.forwardToDepartmentId = forwardDept;
        payload.forwardToUserId = forwardUser;
      }

      if (actionType === 'Approved') {
        payload.digitalSignatureCertificate = `ET-PKI-EPSS-${currentUser?.role.toUpperCase()}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        if (biometricSignatureVerified) {
          payload.biometricSignatureVerified = true;
        }
      }

      const res = await fetch(`/api/v1/workflows/${actionModalDoc.id}/action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || ''
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Workflow action failed');

      await refreshData();
      setActionModalDoc(null);
    } catch (err) {
      console.error(err);
      alert('Failed to process workflow decision.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t('navWorkflows')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {language === 'am'
              ? 'ውሳኔ፣ ፊርማ እና አስተያየት የሚሹ ሰነዶች የሥራ ፍሰት ሳጥን'
              : 'Actionable approval tasks, digital endorsement queue, and routing minutes.'}
          </p>
        </div>

        {/* Sub-tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg self-start sm:self-auto border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveSubTab('pending')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              activeSubTab === 'pending'
                ? 'bg-white dark:bg-slate-700 text-teal-800 dark:text-teal-200 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            {language === 'am' ? 'ውሳኔ የሚጠብቁ' : 'Pending Decisions'} ({pendingDocs.length})
          </button>
          <button
            onClick={() => setActiveSubTab('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              activeSubTab === 'all'
                ? 'bg-white dark:bg-slate-700 text-teal-800 dark:text-teal-200 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            {language === 'am' ? 'ሁሉም የሥራ ፍሰቶች' : 'All Workflow Records'}
          </button>
        </div>
      </div>

      {/* Task Queue List */}
      <div className="space-y-4">
        {displayedDocs.length === 0 ? (
          <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
            {t('noTasksPending')}
          </div>
        ) : (
          displayedDocs.map((doc: DocumentItem) => {
            const lastAction = doc.workflowHistory[doc.workflowHistory.length - 1];
            return (
              <div
                key={doc.id}
                className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
              >
                {/* Left info */}
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                      {doc.registrationNumber}
                    </span>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <span className="text-slate-500 dark:text-slate-400">{doc.referenceNumber}</span>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <span className="font-semibold text-teal-700 dark:text-teal-400">{doc.type}</span>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <span className={`font-semibold ${
                      doc.priority === 'VeryUrgent' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-300'
                    }`}>
                      {doc.priority}
                    </span>
                  </div>

                  <h3 
                    onClick={() => setSelectedDocument(doc)}
                    className="text-sm font-bold text-slate-900 dark:text-slate-100 hover:text-teal-700 dark:hover:text-teal-400 cursor-pointer transition-colors"
                  >
                    {language === 'am' ? doc.subjectAm : doc.subjectEn}
                  </h3>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                    <span><strong>Sender:</strong> {doc.senderOrganization}</span>
                    <span><strong>Stage:</strong> <span className="font-medium text-teal-800 dark:text-teal-300">{doc.status}</span></span>
                    <span><strong>Date:</strong> {formatEthiopianDate(doc.registrationDate, language)}</span>
                  </div>

                  {lastAction && (
                    <div className="mt-2 text-xs bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">{lastAction.actorName} ({lastAction.actorRole}):</span> {lastAction.comments}
                    </div>
                  )}
                </div>

                {/* Right Action buttons */}
                <div className="flex items-center flex-wrap gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => setSelectedDocument(doc)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
                  >
                    {t('view')}
                  </button>
                  <button
                    onClick={() => handleOpenActionModal(doc, 'Forwarded')}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-sky-800 dark:text-sky-200 bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 rounded-lg border border-sky-200 dark:border-sky-900 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{t('forward')}</span>
                  </button>
                  <button
                    onClick={() => handleOpenActionModal(doc, 'Approved')}
                    className="flex items-center gap-1 px-3.5 py-1.5 text-xs font-semibold text-white bg-teal-700 dark:bg-teal-600 hover:bg-teal-800 rounded-lg shadow-xs transition-colors"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>{t('approve')}</span>
                  </button>
                  <button
                    onClick={() => handleOpenActionModal(doc, 'ReturnedForCorrection')}
                    className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
                    title={t('returnForCorrection')}
                  >
                    <CornerUpLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleOpenActionModal(doc, 'Rejected')}
                    className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
                    title={t('reject')}
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Decision Execution Modal */}
      {actionModalDoc && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-[11px] font-mono font-bold text-teal-700 dark:text-teal-400">
                  {actionModalDoc.registrationNumber}
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {actionType === 'Approved' ? t('approve') : actionType === 'Forwarded' ? t('forward') : actionType}
                </h3>
              </div>
              <button 
                onClick={() => setActionModalDoc(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleExecuteWorkflow} className="space-y-4 text-xs">
              {actionType === 'Forwarded' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                      Target Directorate / Department
                    </label>
                    <select
                      value={forwardDept}
                      onChange={(e) => setForwardDept(e.target.value)}
                      className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                      required
                    >
                      <option value="">Select Directorate...</option>
                      {departments.map((d: any) => (
                        <option key={d.id} value={d.id}>{d.nameEn}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {actionType === 'Approved' && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-lg text-emerald-800 dark:text-emerald-300">
                  <div className="flex items-center gap-2 font-semibold">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Electronic Digital Signature & Verification</span>
                  </div>
                  <p className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-400">
                    This action will apply your cryptographic identity ({currentUser?.fullNameEn}, {currentUser?.role}) and attach the official EPSS verification seal.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Minute Note / Decision Rationale
                </label>
                <textarea
                  rows={4}
                  value={actionComments}
                  onChange={(e) => setActionComments(e.target.value)}
                  placeholder="Enter official executive comments, instructions, or conditions..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  required
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  {actionType === 'Approved' && (
                    <button
                      type="button"
                      onClick={() => setIsBiometricApprovalOpen(true)}
                      className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-lg font-semibold shadow-xs flex items-center gap-1.5 text-xs transition-all ring-1 ring-emerald-500/30"
                    >
                      <Fingerprint className="w-3.5 h-3.5 text-emerald-200" />
                      <span>{language === 'am' ? 'በጣት አሻራ አጽድቅ' : 'Sign with Biometrics'}</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActionModalDoc(null)}
                    className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-lg font-semibold"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50"
                  >
                    {isSubmitting ? 'Recording...' : 'Confirm Decision'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WebAuthn Biometric Verification Modal for Approvals */}
      <BiometricVerificationModal
        isOpen={isBiometricApprovalOpen}
        onClose={() => setIsBiometricApprovalOpen(false)}
        onVerified={() => {
          setIsBiometricApprovalOpen(false);
          handleExecuteWorkflow(undefined, true);
        }}
        documentTitle={language === 'am' ? (actionModalDoc?.subjectAm || actionModalDoc?.subjectEn) : actionModalDoc?.subjectEn}
        registrationNumber={actionModalDoc?.registrationNumber}
        confidentialityLevel={actionModalDoc?.confidentiality}
        actionReason={`Executive Biometric Seal Approval for ${actionModalDoc?.registrationNumber || 'Document'}`}
      />
    </div>
  );
};
