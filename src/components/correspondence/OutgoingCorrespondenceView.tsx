import React, { useEffect, useState } from 'react';
import {
  PlusCircle,
  Search,
  ShieldCheck,
  ArrowUpRight,
  KeyRound,
  AlertTriangle,
  CheckCircle2,
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import { formatEthiopianDate } from '../../lib/translations.js';
import { apiFetch } from '../../lib/apiFetch.js';
import { localizeErrorMessage } from '../../lib/localizedErrors.js';
import { PkiHsmGovernanceStatus } from '../../types/index.js';
import { CorrespondenceBulkToolbar } from './CorrespondenceBulkToolbar.js';

type OutgoingFilterTab = 'all' | 'pending_sign' | 'sealed' | 'dispatched';

export const OutgoingCorrespondenceView: React.FC = () => {
  const {
    documents,
    setSelectedDocument,
    openRegisterModal,
    setActiveTab,
    can,
    language,
    t,
    refreshData
  } = useApp();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<OutgoingFilterTab>('all');
  const [hsmPolicyEnforced, setHsmPolicyEnforced] = useState<boolean>(true);
  const [defaultAlgo, setDefaultAlgo] = useState<string>('RSA-SHA256');
  const [isBatchSignOpen, setIsBatchSignOpen] = useState(false);
  const [batchMeaning, setBatchMeaning] = useState('Approved & Sealed for Official Outgoing Dispatch');
  const [batchPin, setBatchPin] = useState('');
  const [batchNotes, setBatchNotes] = useState('');
  const [isBatchSigning, setIsBatchSigning] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    apiFetch('/api/v1/pki/hsm/status')
      .then(r => (r.ok ? r.json() : null))
      .then((data: PkiHsmGovernanceStatus | null) => {
        if (data?.policy) {
          setHsmPolicyEnforced(data.policy.requireSignedOutgoingDispatch);
          setDefaultAlgo(data.policy.defaultAlgorithm);
        }
      })
      .catch(() => {});
  }, []);

  const outgoingDocs = documents.filter(d => d.type === 'OutgoingLetter' && !d.isDeleted);

  const isDocSealed = (doc: (typeof outgoingDocs)[number]) =>
    doc.workflowHistory.some(w => w.digitalSignature && !w.digitalSignature.invalidated && w.digitalSignature.verified);

  const sealedCount = outgoingDocs.filter(isDocSealed).length;
  const pendingSigCount = outgoingDocs.filter(d => !isDocSealed(d) && d.status !== 'Dispatched').length;

  const filteredDocs = outgoingDocs.filter(d => {
    const sealed = isDocSealed(d);
    if (filterTab === 'pending_sign' && (sealed || d.status === 'Dispatched')) return false;
    if (filterTab === 'sealed' && (!sealed || d.status === 'Dispatched')) return false;
    if (filterTab === 'dispatched' && d.status !== 'Dispatched') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        d.registrationNumber.toLowerCase().includes(q) ||
        d.referenceNumber.toLowerCase().includes(q) ||
        d.subjectEn.toLowerCase().includes(q) ||
        d.subjectAm.toLowerCase().includes(q) ||
        d.recipientOrganization.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const canBatchSign = can('approve:workflows') || can('edit:documents');

  const handleBatchSignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) return;
    setIsBatchSigning(true);
    setFeedback(null);
    try {
      const res = await apiFetch('/api/v1/pki/batch-sign-outgoing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentIds: selectedIds,
          signingMeaning: batchMeaning,
          comments: batchNotes.trim() || undefined,
          stepUpPin: batchPin.trim() || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({
          type: 'error',
          text: localizeErrorMessage(data.error || 'Batch signing failed.', language)
        });
        return;
      }
      setIsBatchSignOpen(false);
      setBatchPin('');
      setBatchNotes('');
      setSelectedIds([]);
      setFeedback({
        type: 'success',
        text:
          language === 'am'
            ? `${data.signedCount} የወጪ ደብዳቤዎች በHSM/PKI ዲጂታል ፊርማ በስኬት ታሽገዋል።`
            : `Cryptographically signed and TSA-sealed ${data.signedCount} outgoing correspondence record(s).`
      });
      await refreshData();
    } catch {
      setFeedback({
        type: 'error',
        text: localizeErrorMessage('Network error during batch HSM digital signing.', language)
      });
    } finally {
      setIsBatchSigning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t('navOutgoing')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {language === 'am'
              ? 'በኢ.መ.አ.አ ዋና ዳይሬክተር እና ዳይሬክቶሬቶች በHSM/PKI ፊርማ የተረጋገጡ ወጪ ደብዳቤዎች መዝገብ'
              : 'Outbound official correspondence sealed with HSM/PKI non-repudiation signatures prior to dispatch.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {canBatchSign && selectedIds.length > 0 && (
            <button
              type="button"
              onClick={() => setIsBatchSignOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-teal-800 dark:text-teal-200 bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 rounded-lg transition-colors whitespace-nowrap"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>
                {t('batchSignOutgoingBtn')} ({selectedIds.length})
              </span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveTab('transmittals')}
            className="px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap"
          >
            {language === 'am' ? 'የቡድን መላኪያ ማኒፌስት' : 'Transmittal Manifests'}
          </button>
          <button
            type="button"
            onClick={() => openRegisterModal('OutgoingLetter')}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-700 rounded-lg shadow-xs transition-colors whitespace-nowrap shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{language === 'am' ? 'አዲስ ወጪ ደብዳቤ አዘጋጅ' : 'Draft Outgoing Letter'}</span>
          </button>
        </div>
      </div>

      {/* Outgoing Non-Repudiation KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {t('outgoingTotalStat')}
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1 tabular-nums">
            {outgoingDocs.length}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {t('outgoingSealedStat')}
          </div>
          <div className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-400 mt-1 tabular-nums">
            {sealedCount}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {t('outgoingPendingSignStat')}
          </div>
          <div className="text-xl font-bold font-mono text-amber-700 dark:text-amber-400 mt-1 tabular-nums">
            {pendingSigCount}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {t('outgoingDispatchPolicyStat')}
          </div>
          <div className="text-sm font-bold font-mono text-slate-900 dark:text-slate-100 mt-1.5">
            {hsmPolicyEnforced
              ? language === 'am'
                ? 'ፊርማ ግዴታ (412)'
                : `ENFORCED · ${defaultAlgo}`
              : language === 'am'
                ? 'አማራጭ'
                : 'ADVISORY'}
          </div>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button type="button" onClick={() => setFeedback(null)} className="font-semibold hover:underline">
            {t('dismiss')}
          </button>
        </div>
      )}

      {/* Search & Signature Filter Controls */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
        <div className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 overflow-x-auto">
          {(
            [
              { id: 'all', label: t('filterAllOutgoing') },
              { id: 'pending_sign', label: t('filterPendingSignature') },
              { id: 'sealed', label: t('filterSealedReady') },
              { id: 'dispatched', label: t('filterDispatchedOutgoing') }
            ] as const
          ).map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-colors ${
                filterTab === tab.id
                  ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <CorrespondenceBulkToolbar
        selectedIds={selectedIds}
        onClearSelection={() => setSelectedIds([])}
      />

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="pl-4 pr-2 py-3 w-8">
                  <input
                    type="checkbox"
                    aria-label="Select all visible outgoing letters"
                    checked={filteredDocs.length > 0 && filteredDocs.every(d => selectedIds.includes(d.id))}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(filteredDocs.map(d => d.id));
                      } else {
                        setSelectedIds([]);
                      }
                    }}
                  />
                </th>
                <th className="px-4 py-3 font-semibold">{t('regNumber')}</th>
                <th className="px-4 py-3 font-semibold">{t('subject')}</th>
                <th className="px-4 py-3 font-semibold">{t('recipient')}</th>
                <th className="px-4 py-3 font-semibold">{t('department')}</th>
                <th className="px-4 py-3 font-semibold">{t('registrationDate')}</th>
                <th className="px-4 py-3 font-semibold">Digital Seal</th>
                <th className="px-4 py-3 font-semibold">{t('status')}</th>
                <th className="px-4 py-3 font-semibold text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    {t('noDocumentsFound')}
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc) => {
                  const activeSig = doc.workflowHistory
                    .slice()
                    .reverse()
                    .find(w => w.digitalSignature && !w.digitalSignature.invalidated && w.digitalSignature.verified)?.digitalSignature;
                  return (
                    <tr
                      key={doc.id}
                      onClick={() => setSelectedDocument(doc)}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      <td className="pl-4 pr-2 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label={`Select ${doc.registrationNumber}`}
                          checked={selectedIds.includes(doc.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds(prev => [...prev, doc.id]);
                            } else {
                              setSelectedIds(prev => prev.filter(id => id !== doc.id));
                            }
                          }}
                        />
                      </td>
                      <td className="px-4 py-3 font-mono tabular-nums whitespace-nowrap">
                        <div className="font-bold text-slate-900 dark:text-slate-100">
                          {doc.registrationNumber}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {doc.referenceNumber}
                        </div>
                      </td>

                      <td className="px-4 py-3 max-w-xs">
                        <div className="font-medium text-slate-900 dark:text-slate-100 line-clamp-2">
                          {language === 'am' ? doc.subjectAm : doc.subjectEn}
                        </div>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {doc.recipientOrganization}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {doc.recipientPerson || 'External Recipient'}
                        </div>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-400">
                        {doc.assignedDepartmentName || 'Directorate'}
                      </td>

                      <td className="px-4 py-3 font-mono tabular-nums whitespace-nowrap text-slate-600 dark:text-slate-400">
                        {formatEthiopianDate(doc.registrationDate, language)}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {activeSig ? (
                          <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              PKI Sealed · {activeSig.algorithm || 'RSA-SHA256'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
                            Pending HSM Sign
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-semibold text-teal-700 dark:text-teal-300">
                          {doc.status}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setSelectedDocument(doc)}
                          className="px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 transition-colors inline-flex items-center gap-1"
                        >
                          <span>{t('view')}</span>
                          <ArrowUpRight className="w-3 h-3 text-slate-400" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Batch Outgoing HSM Digital Signing Modal */}
      {isBatchSignOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-teal-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {t('batchSignOutgoingBtn')}
                  </h3>
                  <p className="text-[11px] font-mono text-slate-500">
                    {selectedIds.length} outgoing correspondence item(s) selected
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBatchSignOpen(false)}
                aria-label={t('close')}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleBatchSignSubmit} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Official Signing Intent
                </label>
                <select
                  value={batchMeaning}
                  onChange={(e) => setBatchMeaning(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                >
                  <option value="Approved & Sealed for Official Outgoing Dispatch">
                    Approved & Sealed for Official Outgoing Dispatch
                  </option>
                  <option value="Executive Counter-Signature & Attestation">
                    Executive Counter-Signature & Attestation
                  </option>
                  <option value="Legal & Regulatory Compliance Verified">
                    Legal & Regulatory Compliance Verified
                  </option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Officer Security PIN (Required for HSM Batch Sign)
                </label>
                <input
                  type="password"
                  maxLength={8}
                  value={batchPin}
                  onChange={(e) => setBatchPin(e.target.value)}
                  placeholder="Enter Officer MFA PIN"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Batch Sealing Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={batchNotes}
                  onChange={(e) => setBatchNotes(e.target.value)}
                  placeholder="e.g. Verified clearance batch for regional dispatch..."
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsBatchSignOpen(false)}
                  className="px-3 py-1.5 text-slate-600 dark:text-slate-400 font-semibold"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isBatchSigning}
                  className="px-4 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-semibold disabled:opacity-40"
                >
                  {isBatchSigning ? 'Signing Batch...' : `Seal ${selectedIds.length} Item(s)`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

