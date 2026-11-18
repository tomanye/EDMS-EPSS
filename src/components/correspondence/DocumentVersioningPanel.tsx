import React, { useEffect, useMemo, useState } from 'react';
import {
  History,
  GitCompare,
  RotateCcw,
  Plus,
  CheckCircle2,
  AlertTriangle,
  FileText,
  X,
  ShieldCheck
} from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import { apiFetch } from '../../lib/apiFetch.js';
import { formatEthiopianDate } from '../../lib/translations.js';
import { localizeErrorMessage } from '../../lib/localizedErrors.js';
import { useEscapeKey } from '../../lib/useEscapeKey.js';
import {
  DocumentAttachment,
  DocumentItem,
  DocumentRevision,
  DocumentRevisionDiffField
} from '../../types/index.js';

interface DocumentVersioningPanelProps {
  document: DocumentItem;
  isImmutableRecord: boolean;
  onDocumentUpdated: (updated: DocumentItem) => void;
  onFeedback: (feedback: { type: 'success' | 'error'; text: string }) => void;
  onSubModalChange?: (open: boolean) => void;
}

const ACTION_TYPE_LABELS: Record<string, { en: string; am: string }> = {
  Initial: { en: 'Initial Registration', am: 'የመጀመሪያ ምዝገባ' },
  MetadataEdit: { en: 'Metadata Edit', am: 'የመረጃ ማሻሻያ' },
  AttachmentUpdate: { en: 'Attachment Revision', am: 'የፋይል አባሪ ለውጥ' },
  ManualRevision: { en: 'Draft Checkpoint', am: 'የረቂቅ እትም' },
  Restored: { en: 'Restored Revision', am: 'የተመለሰ እትም' }
};

export const DocumentVersioningPanel: React.FC<DocumentVersioningPanelProps> = ({
  document,
  isImmutableRecord,
  onDocumentUpdated,
  onFeedback,
  onSubModalChange
}) => {
  const { language, currentUser, can, refreshData, t } = useApp();

  const [revisions, setRevisions] = useState<DocumentRevision[]>([]);
  const [currentVersion, setCurrentVersion] = useState<number>(document.currentVersion || 1);
  const [loading, setLoading] = useState(true);

  // Compare state
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [compareFromVer, setCompareFromVer] = useState<number>(1);
  const [compareToVer, setCompareToVer] = useState<number>(1);
  const [showChangedOnly, setShowChangedOnly] = useState(false);

  // Save manual revision modal
  const [isSaveRevOpen, setIsSaveRevOpen] = useState(false);
  const [revNote, setRevNote] = useState('');
  const [revFileName, setRevFileName] = useState('');
  const [revFileNotes, setRevFileNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Restore revision modal
  const [restoreTargetRev, setRestoreTargetRev] = useState<DocumentRevision | null>(null);
  const [restoreReason, setRestoreReason] = useState('');
  const [restoreOverrideSigned, setRestoreOverrideSigned] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  useEffect(() => {
    onSubModalChange?.(isSaveRevOpen || Boolean(restoreTargetRev));
  }, [isSaveRevOpen, restoreTargetRev, onSubModalChange]);

  useEscapeKey(isSaveRevOpen, () => setIsSaveRevOpen(false));
  useEscapeKey(Boolean(restoreTargetRev), () => setRestoreTargetRev(null));

  const fetchRevisions = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/v1/correspondence/${document.id}/versions`);
      if (res.ok) {
        const data = await res.json();
        const list: DocumentRevision[] = Array.isArray(data.revisions) ? data.revisions : [];
        setRevisions(list);
        const cur = data.currentVersion || list[0]?.versionNumber || 1;
        setCurrentVersion(cur);
        if (list.length >= 2) {
          setCompareToVer(list[0].versionNumber);
          setCompareFromVer(list[1].versionNumber);
        } else if (list.length === 1) {
          setCompareToVer(list[0].versionNumber);
          setCompareFromVer(list[0].versionNumber);
        }
      }
    } catch {
      // keep fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRevisions();
  }, [document.id, document.currentVersion, document.attachments?.length, document.subjectEn]);

  const canEdit =
    !isImmutableRecord &&
    !document.isDeleted &&
    (can('edit:documents') || can('create:documents'));

  const canRestore = !isImmutableRecord && !document.isDeleted && can('edit:documents');

  const activeSignaturesCount = (document.workflowHistory || []).filter(
    h => h.digitalSignature && !h.digitalSignature.invalidated
  ).length;

  const fromRev = useMemo(
    () => revisions.find(r => r.versionNumber === compareFromVer) || null,
    [revisions, compareFromVer]
  );
  const toRev = useMemo(
    () => revisions.find(r => r.versionNumber === compareToVer) || null,
    [revisions, compareToVer]
  );

  const fieldDiffs = useMemo<DocumentRevisionDiffField[]>(() => {
    if (!fromRev || !toRev) return [];
    const a = fromRev.snapshot;
    const b = toRev.snapshot;
    const fields: Array<{ key: keyof typeof a; labelEn: string; labelAm: string }> = [
      { key: 'subjectEn', labelEn: 'Subject (English)', labelAm: 'ርዕስ (እንግሊዝኛ)' },
      { key: 'subjectAm', labelEn: 'Subject (Amharic)', labelAm: 'ርዕስ (አማርኛ)' },
      { key: 'descriptionEn', labelEn: 'Description / Notes', labelAm: 'ዝርዝር ማብራሪያ' },
      { key: 'senderOrganization', labelEn: 'Sender Organization', labelAm: 'ላኪ ተቋም' },
      { key: 'recipientOrganization', labelEn: 'Recipient Organization', labelAm: 'ተቀባይ ተቋም' },
      { key: 'priority', labelEn: 'Priority', labelAm: 'ቅድሚያ' },
      { key: 'confidentiality', labelEn: 'Confidentiality', labelAm: 'ሚስጥራዊነት' },
      { key: 'assignedDepartmentName', labelEn: 'Handling Department', labelAm: 'ኃላፊ መምሪያ' },
      { key: 'dueDate', labelEn: 'Due Date', labelAm: 'የማለቂያ ቀን' }
    ];
    return fields.map(f => {
      const beforeVal = String(a[f.key] ?? '').trim();
      const afterVal = String(b[f.key] ?? '').trim();
      return {
        field: String(f.key),
        labelEn: f.labelEn,
        labelAm: f.labelAm,
        beforeValue: beforeVal || '—',
        afterValue: afterVal || '—',
        changed: beforeVal !== afterVal
      };
    });
  }, [fromRev, toRev]);

  const attachmentDiffs = useMemo(() => {
    if (!fromRev || !toRev) return [];
    const beforeMap = new Map<string, DocumentAttachment>();
    const afterMap = new Map<string, DocumentAttachment>();
    for (const att of fromRev.snapshot.attachments || []) {
      beforeMap.set(`${att.fileName.toLowerCase()}#v${att.version || 1}`, att);
    }
    for (const att of toRev.snapshot.attachments || []) {
      afterMap.set(`${att.fileName.toLowerCase()}#v${att.version || 1}`, att);
    }
    const items: Array<{
      key: string;
      fileName: string;
      version: number;
      change: 'Added' | 'Removed' | 'Unchanged';
    }> = [];
    for (const [key, att] of afterMap.entries()) {
      items.push({
        key: `after-${key}`,
        fileName: att.fileName,
        version: att.version || 1,
        change: beforeMap.has(key) ? 'Unchanged' : 'Added'
      });
    }
    for (const [key, att] of beforeMap.entries()) {
      if (!afterMap.has(key)) {
        items.push({
          key: `before-${key}`,
          fileName: att.fileName,
          version: att.version || 1,
          change: 'Removed'
        });
      }
    }
    return items;
  }, [fromRev, toRev]);

  const visibleDiffs = showChangedOnly ? fieldDiffs.filter(d => d.changed) : fieldDiffs;
  const hasAnyDiff =
    fieldDiffs.some(d => d.changed) || attachmentDiffs.some(a => a.change !== 'Unchanged');

  const handleSaveRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (revNote.trim().length < 5) {
      onFeedback({
        type: 'error',
        text:
          language === 'am'
            ? 'የእትም ማስታወሻ ቢያንስ 5 ፊደላት መሆን አለበት።'
            : 'Revision change note must be at least 5 characters.'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const cleanName = revFileName.trim();
      const bodyPayload: Record<string, any> = {
        changeNote: revNote.trim()
      };
      if (cleanName) {
        bodyPayload.fileName = cleanName.endsWith('.pdf') ? cleanName : `${cleanName}.pdf`;
        bodyPayload.fileSize = 1280000;
        bodyPayload.mimeType = 'application/pdf';
        bodyPayload.fileUrl = '/assets/sample-docs/uploaded_file.pdf';
        bodyPayload.notes = revFileNotes.trim() || revNote.trim();
      }

      const res = await apiFetch(`/api/v1/correspondence/${document.id}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      });
      const data = await res.json();
      if (!res.ok) {
        onFeedback({
          type: 'error',
          text: localizeErrorMessage(data.error || 'Failed to save revision.', language)
        });
        return;
      }
      setIsSaveRevOpen(false);
      setRevNote('');
      setRevFileName('');
      setRevFileNotes('');
      if (data.document) {
        onDocumentUpdated(data.document);
      }
      await fetchRevisions();
      await refreshData();
      onFeedback({
        type: 'success',
        text:
          language === 'am'
            ? `አዲስ እትም v${data.revision?.versionNumber || ''} ተመዝግቧል።`
            : `Saved revision checkpoint v${data.revision?.versionNumber || ''}.`
      });
    } catch {
      onFeedback({
        type: 'error',
        text: localizeErrorMessage('Network error while saving document revision.', language)
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRestoreRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restoreTargetRev) return;
    setRestoreError(null);

    if (restoreReason.trim().length < 10) {
      setRestoreError(
        language === 'am'
          ? 'የመመለሻ ምክንያት ቢያንስ 10 ፊደላት መሆን አለበት።'
          : 'Restore justification must be at least 10 characters.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiFetch(
        `/api/v1/correspondence/${document.id}/versions/${restoreTargetRev.versionNumber}/restore`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reason: restoreReason.trim(),
            overrideSignedLock: restoreOverrideSigned || undefined
          })
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setRestoreError(localizeErrorMessage(data.error || 'Failed to restore revision.', language));
        return;
      }

      setRestoreTargetRev(null);
      setRestoreReason('');
      setRestoreOverrideSigned(false);
      if (data.document) {
        onDocumentUpdated(data.document);
      }
      await fetchRevisions();
      await refreshData();
      onFeedback({
        type: 'success',
        text:
          language === 'am'
            ? `እትም v${restoreTargetRev.versionNumber} እንደ v${data.revision?.versionNumber || ''} ተመልሷል።`
            : `Restored draft from v${restoreTargetRev.versionNumber} as new revision v${data.revision?.versionNumber || ''}.`
      });
    } catch {
      setRestoreError(localizeErrorMessage('Network error while restoring revision.', language));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="doc-versioning-section"
      className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4"
    >
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-teal-600 shrink-0" />
          <h3 className="font-bold text-slate-900 dark:text-slate-100">
            {t('docRevisionsTitle')}
          </h3>
          <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
          <span className="font-mono text-[11px] font-semibold tabular-nums text-teal-700 dark:text-teal-400">
            v{currentVersion} ({revisions.length})
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {revisions.length >= 2 && (
            <button
              type="button"
              onClick={() => setIsCompareOpen(v => !v)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg border inline-flex items-center gap-1 transition-colors ${
                isCompareOpen
                  ? 'bg-teal-700 text-white border-teal-700'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <GitCompare className="w-3.5 h-3.5" />
              <span>{t('compareRevisions')}</span>
            </button>
          )}

          {canEdit && (
            <button
              type="button"
              onClick={() => {
                setRevNote('');
                setRevFileName('');
                setRevFileNotes('');
                setIsSaveRevOpen(true);
              }}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-900 hover:bg-teal-100 inline-flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('saveRevisionCheckpoint')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Side-by-Side / Field-by-Field Diff Comparison Workbench */}
      {isCompareOpen && revisions.length >= 2 && (
        <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 min-w-[240px]">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  {t('revisionCompareFrom')}
                </label>
                <select
                  value={compareFromVer}
                  onChange={e => setCompareFromVer(Number(e.target.value))}
                  className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono tabular-nums"
                >
                  {revisions.map(rev => (
                    <option key={rev.versionNumber} value={rev.versionNumber}>
                      v{rev.versionNumber} — {rev.actionType} ({rev.createdByName})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  {t('revisionCompareTo')}
                </label>
                <select
                  value={compareToVer}
                  onChange={e => setCompareToVer(Number(e.target.value))}
                  className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono tabular-nums"
                >
                  {revisions.map(rev => (
                    <option key={rev.versionNumber} value={rev.versionNumber}>
                      v{rev.versionNumber}
                      {rev.versionNumber === currentVersion ? ` (${t('currentVersionLabel')})` : ''} — {rev.actionType}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300 cursor-pointer pb-2">
              <input
                type="checkbox"
                checked={showChangedOnly}
                onChange={e => setShowChangedOnly(e.target.checked)}
                className="rounded border-slate-300 text-teal-600"
              />
              <span>{language === 'am' ? 'የተቀየሩትን ብቻ አሳይ' : 'Changed fields only'}</span>
            </label>
          </div>

          {!hasAnyDiff ? (
            <div className="p-4 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
              {t('revisionNoDifferences')}
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300">
                      <th className="py-2 px-3 font-semibold w-40">Field</th>
                      <th className="py-2 px-3 font-semibold font-mono tabular-nums">
                        v{compareFromVer}
                      </th>
                      <th className="py-2 px-3 font-semibold font-mono tabular-nums">
                        v{compareToVer}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {visibleDiffs.map(d => (
                      <tr
                        key={d.field}
                        className={d.changed ? 'bg-amber-50/40 dark:bg-amber-950/15' : ''}
                      >
                        <td className="py-2 px-3 font-semibold text-slate-700 dark:text-slate-300 align-top">
                          {language === 'am' ? d.labelAm : d.labelEn}
                        </td>
                        <td
                          className={`py-2 px-3 align-top break-words ${
                            d.changed
                              ? 'text-rose-700 dark:text-rose-300 line-through/60'
                              : 'text-slate-500 dark:text-slate-400'
                          }`}
                        >
                          {d.beforeValue}
                        </td>
                        <td
                          className={`py-2 px-3 align-top break-words ${
                            d.changed
                              ? 'text-emerald-700 dark:text-emerald-300 font-semibold'
                              : 'text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {d.afterValue}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {attachmentDiffs.length > 0 && (
                <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1.5">
                  <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    {language === 'am' ? 'የፋይል አባሪ ልዩነቶች' : 'Attachment Comparison'}
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {attachmentDiffs
                      .filter(a => !showChangedOnly || a.change !== 'Unchanged')
                      .map(att => (
                        <div
                          key={att.key}
                          className="py-1 flex items-center justify-between gap-2 text-[11px]"
                        >
                          <span className="flex items-center gap-1.5 truncate text-slate-800 dark:text-slate-200">
                            <FileText className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                            <span className="truncate">{att.fileName}</span>
                            <span className="font-mono text-slate-400 tabular-nums">
                              v{att.version}
                            </span>
                          </span>
                          <span
                            className={`font-semibold shrink-0 ${
                              att.change === 'Added'
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : att.change === 'Removed'
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : 'text-slate-400'
                            }`}
                          >
                            {att.change}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Revisions Timeline List */}
      {loading ? (
        <div className="space-y-2 animate-pulse">
          {[1, 2].map(n => (
            <div key={n} className="h-12 bg-slate-100 dark:bg-slate-800/50 rounded-lg" />
          ))}
        </div>
      ) : revisions.length === 0 ? (
        <div className="py-4 text-center text-slate-400">
          {language === 'am' ? 'ምንም የእትም ታሪክ አልተመዘገበም።' : 'No revision history recorded yet.'}
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {revisions.map(rev => {
            const isCurrent = rev.versionNumber === currentVersion;
            const labelPair = ACTION_TYPE_LABELS[rev.actionType] || {
              en: rev.actionType,
              am: rev.actionType
            };

            return (
              <div
                key={rev.versionNumber}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                      v{rev.versionNumber}
                    </span>
                    {isCurrent && (
                      <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{t('currentVersionLabel')}</span>
                      </span>
                    )}
                    <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
                    <span className="font-semibold text-teal-700 dark:text-teal-400">
                      {language === 'am' ? labelPair.am : labelPair.en}
                    </span>
                    <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
                    <span className="text-slate-600 dark:text-slate-300">
                      {rev.createdByName} ({rev.createdByRole})
                    </span>
                    <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
                    <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                      {formatEthiopianDate(rev.createdAt, language, true)}
                    </span>
                  </div>

                  <p className="text-slate-700 dark:text-slate-300 leading-snug">
                    {rev.changeNote}
                  </p>

                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-2 font-mono tabular-nums">
                    <span>{rev.snapshot.attachments.length} attachment(s)</span>
                    <span aria-hidden="true">·</span>
                    <span>{rev.snapshot.priority} / {rev.snapshot.confidentiality}</span>
                    {rev.restoredFromVersion && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>From v{rev.restoredFromVersion}</span>
                      </>
                    )}
                    {rev.contentHash && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>SHA {rev.contentHash.slice(0, 10)}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {!isCurrent && revisions.length >= 2 && (
                    <button
                      type="button"
                      onClick={() => {
                        setCompareFromVer(rev.versionNumber);
                        setCompareToVer(currentVersion);
                        setIsCompareOpen(true);
                      }}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1"
                    >
                      <GitCompare className="w-3 h-3" />
                      <span>{language === 'am' ? 'አነጻጽር' : 'Diff'}</span>
                    </button>
                  )}

                  {!isCurrent && canRestore && (
                    <button
                      type="button"
                      onClick={() => {
                        setRestoreTargetRev(rev);
                        setRestoreReason('');
                        setRestoreOverrideSigned(false);
                        setRestoreError(null);
                      }}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900 hover:bg-amber-100 inline-flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>{t('restoreRevisionBtn')}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Save Revision Checkpoint Modal */}
      {isSaveRevOpen && (
        <div
          className="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleSaveRevision}
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 text-xs"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-teal-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {t('saveRevisionCheckpoint')} — {document.registrationNumber}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSaveRevOpen(false)}
                aria-label={t('close')}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {language === 'am' ? 'የእትም ለውጥ ማስታወሻ (ቢያንስ 5 ፊደላት) *' : 'Revision Change Note (min 5 chars) *'}
                </label>
                <textarea
                  rows={2}
                  required
                  minLength={5}
                  value={revNote}
                  onChange={e => setRevNote(e.target.value)}
                  placeholder="Describe why this draft checkpoint or file revision is being recorded..."
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {language === 'am' ? 'አዲስ / የተሻሻለ ፋይል ስም (አማራጭ)' : 'Optional New / Updated File Attachment'}
                </label>
                <input
                  type="text"
                  value={revFileName}
                  onChange={e => setRevFileName(e.target.value)}
                  placeholder="e.g. procurement_dossier_revised.pdf"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              {revFileName.trim() && (
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'am' ? 'የፋይል ማስታወሻ' : 'Attachment Revision Notes'}
                  </label>
                  <input
                    type="text"
                    value={revFileNotes}
                    onChange={e => setRevFileNotes(e.target.value)}
                    placeholder="Notes about this uploaded file version..."
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsSaveRevOpen(false)}
                className="px-3 py-1.5 text-slate-600 dark:text-slate-400 font-semibold"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-semibold disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : t('saveRevisionCheckpoint')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Restore Older Revision Confirmation Modal */}
      {restoreTargetRev && (
        <div
          className="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleRestoreRevision}
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 text-xs"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <RotateCcw className="w-4 h-4" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {t('restoreRevisionBtn')} v{restoreTargetRev.versionNumber} → v{currentVersion + 1}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRestoreTargetRev(null)}
                aria-label={t('close')}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {restoreError && (
              <div className="p-2.5 rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{restoreError}</span>
              </div>
            )}

            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-1 text-[11px]">
              <div className="font-semibold text-slate-800 dark:text-slate-200">
                {language === 'am'
                  ? `ከእትም v${restoreTargetRev.versionNumber} የሚመለሰው ይዘት፡`
                  : `Target Snapshot Summary (v${restoreTargetRev.versionNumber}):`}
              </div>
              <div className="text-slate-600 dark:text-slate-300 truncate">
                Subject: {restoreTargetRev.snapshot.subjectEn}
              </div>
              <div className="text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                {restoreTargetRev.snapshot.priority} · {restoreTargetRev.snapshot.confidentiality} ·{' '}
                {restoreTargetRev.snapshot.attachments.length} attachment(s)
              </div>
            </div>

            {activeSignaturesCount > 0 && (
              <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50/70 dark:bg-amber-950/30 space-y-2 text-[11px]">
                <div className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  <span>Active PKI Signature Protection ({activeSignaturesCount})</span>
                </div>
                <p className="text-amber-800 dark:text-amber-300">
                  Restoring governed fields on a signed document invalidates prior signatures and requires DirectorGeneral or SuperAdmin override.
                </p>
                {(currentUser?.role === 'SuperAdmin' || currentUser?.role === 'DirectorGeneral') && (
                  <label className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={restoreOverrideSigned}
                      onChange={e => setRestoreOverrideSigned(e.target.checked)}
                      className="rounded border-slate-300 text-teal-600"
                    />
                    <span>Override Signed-Lock (audit-logged)</span>
                  </label>
                )}
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('justificationMin10')} *
              </label>
              <textarea
                rows={3}
                required
                minLength={10}
                value={restoreReason}
                onChange={e => setRestoreReason(e.target.value)}
                placeholder="Explain why this earlier revision is being restored as a new draft..."
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setRestoreTargetRev(null)}
                className="px-3 py-1.5 text-slate-600 dark:text-slate-400 font-semibold"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold disabled:opacity-50"
              >
                {isSubmitting ? 'Restoring...' : t('restoreRevisionBtn')}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
