import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  Eye,
  MessageSquarePlus,
  ShieldAlert,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Printer,
  CheckCircle2,
  RotateCcw,
  Trash2,
  Send,
  AtSign,
  Lock,
  FileText,
  Layers,
  AlertTriangle
} from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import { apiFetch } from '../../lib/apiFetch.js';
import { formatEthiopianDate } from '../../lib/translations.js';
import { localizeErrorMessage } from '../../lib/localizedErrors.js';
import { useEscapeKey } from '../../lib/useEscapeKey.js';
import {
  DocumentAnnotation,
  DocumentItem,
  DocumentRedactionMark,
  DocumentViewerContext,
  RedactionCategory,
  User
} from '../../types/index.js';

interface InlineDocumentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: DocumentItem;
  initialPage?: number;
  onDocumentMutated?: (updatedDoc?: DocumentItem) => Promise<void> | void;
}

type ViewerMode = 'view' | 'annotate' | 'redact';
type SidebarTab = 'annotations' | 'redactions';

const REDACTION_CATEGORIES: { value: RedactionCategory; labelEn: string; labelAm: string }[] = [
  { value: 'PII', labelEn: 'Personal Identity (PII)', labelAm: 'የግል መረጃ (PII)' },
  { value: 'FinancialBid', labelEn: 'Financial & Tender Bid', labelAm: 'የፋይናንስ እና የጨረታ ዋጋ' },
  { value: 'MedicalBatch', labelEn: 'Medical Batch / Patient Safety', labelAm: 'የመድኃኒት ባች / የታካሚ ደህንነት' },
  { value: 'LegalClause', labelEn: 'Privileged Legal Clause', labelAm: 'የሕግ ሚስጥራዊ አንቀጽ' },
  { value: 'NationalSecurity', labelEn: 'National Security / Restricted', labelAm: 'የብሔራዊ ደህንነት ሚስጥር' }
];

export const InlineDocumentViewerModal: React.FC<InlineDocumentViewerModalProps> = ({
  isOpen,
  onClose,
  document: doc,
  initialPage = 1,
  onDocumentMutated
}) => {
  const { currentUser, language, can, t } = useApp();

  const [viewerCtx, setViewerCtx] = useState<DocumentViewerContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [currentPageNum, setCurrentPageNum] = useState(initialPage || 1);
  const [zoom, setZoom] = useState<number>(100);
  const [mode, setMode] = useState<ViewerMode>('view');
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('annotations');
  const [watermarkOverrideOff, setWatermarkOverrideOff] = useState(false);
  const [showBinaryPreview, setShowBinaryPreview] = useState(false);
  const [binaryBlobUrl, setBinaryBlobUrl] = useState<string | null>(null);
  const [binaryLoading, setBinaryLoading] = useState(false);

  // Staff directory for @mentions
  const [staffUsers, setStaffUsers] = useState<User[]>([]);
  const [mentionPickerOpen, setMentionPickerOpen] = useState(false);

  // Annotation state
  const [annotationFilter, setAnnotationFilter] = useState<'page' | 'all'>('page');
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [pendingPin, setPendingPin] = useState<{ xPercent: number; yPercent: number } | null>(null);
  const [newComment, setNewComment] = useState('');
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);
  const [isSubmittingAnnotation, setIsSubmittingAnnotation] = useState(false);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [confirmDeleteAnnId, setConfirmDeleteAnnId] = useState<string | null>(null);

  // Redaction drag-draw state
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragBox, setDragBox] = useState<{
    xPercent: number;
    yPercent: number;
    widthPercent: number;
    heightPercent: number;
  } | null>(null);
  const [pendingRedactionBox, setPendingRedactionBox] = useState<{
    xPercent: number;
    yPercent: number;
    widthPercent: number;
    heightPercent: number;
  } | null>(null);
  const [redactionCategory, setRedactionCategory] = useState<RedactionCategory>('PII');
  const [redactionReason, setRedactionReason] = useState('');
  const [redactTextSnippet, setRedactTextSnippet] = useState('');
  const [isApplyingRedaction, setIsApplyingRedaction] = useState(false);

  // Un-redact modal state (SuperAdmin / SecurityOfficer)
  const [unredactTarget, setUnredactTarget] = useState<DocumentRedactionMark | null>(null);
  const [unredactReason, setUnredactReason] = useState('');
  const [isUnredacting, setIsUnredacting] = useState(false);

  const isImmutableRecord = !!doc.legalHold || doc.status === 'Disposed';
  const canRedact =
    !isImmutableRecord &&
    !doc.isDeleted &&
    (can('edit:documents') ||
      can('records.legal_hold') ||
      ['SuperAdmin', 'DirectorGeneral', 'SecurityOfficer', 'LegalOfficer', 'RecordsManager'].includes(
        currentUser?.role || ''
      ));
  const canUnredact =
    !isImmutableRecord &&
    !doc.isDeleted &&
    (currentUser?.role === 'SuperAdmin' || currentUser?.role === 'SecurityOfficer');

  const fetchViewerContext = useCallback(async () => {
    if (!isOpen || !doc?.id) return;
    setLoading(true);
    try {
      const res = await apiFetch(`/api/v1/correspondence/${doc.id}/viewer`);
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', text: localizeErrorMessage(data.error || 'Failed to load viewer.', language) });
        return;
      }
      setViewerCtx(data);
    } catch {
      setFeedback({ type: 'error', text: localizeErrorMessage('Network error loading inline viewer.', language) });
    } finally {
      setLoading(false);
    }
  }, [isOpen, doc?.id, language]);

  useEffect(() => {
    if (!isOpen) return;
    setCurrentPageNum(initialPage || 1);
    setMode('view');
    setFeedback(null);
    setPendingPin(null);
    setPendingRedactionBox(null);
    setUnredactTarget(null);
    setShowBinaryPreview(false);
    fetchViewerContext();
  }, [isOpen, doc.id, initialPage, fetchViewerContext]);

  useEffect(() => {
    if (!isOpen) return;
    apiFetch('/api/v1/organizations/users')
      .then(r => (r.ok ? r.json() : []))
      .then((rows: User[]) => {
        if (Array.isArray(rows)) {
          setStaffUsers(rows.filter(u => u.status !== 'Inactive'));
        }
      })
      .catch(() => {});
  }, [isOpen]);

  const currentPage = useMemo(() => {
    if (!viewerCtx?.pages?.length) return null;
    return viewerCtx.pages.find(p => p.pageNumber === currentPageNum) || viewerCtx.pages[0];
  }, [viewerCtx, currentPageNum]);

  // Load authenticated inline binary stream if user toggles Attached Binary Stream preview
  useEffect(() => {
    let active = true;
    let createdUrl: string | null = null;

    const loadBinary = async () => {
      if (!showBinaryPreview || !currentPage?.inlinePreviewUrl) {
        setBinaryBlobUrl(null);
        return;
      }
      setBinaryLoading(true);
      try {
        const res = await apiFetch(currentPage.inlinePreviewUrl);
        if (!res.ok) throw new Error('Stream unavailable');
        const blob = await res.blob();
        createdUrl = URL.createObjectURL(blob);
        if (active) setBinaryBlobUrl(createdUrl);
      } catch {
        if (active) setBinaryBlobUrl(null);
      } finally {
        if (active) setBinaryLoading(false);
      }
    };
    loadBinary();

    return () => {
      active = false;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [showBinaryPreview, currentPage?.inlinePreviewUrl]);

  const hasSubDialog = Boolean(pendingRedactionBox) || Boolean(unredactTarget);
  useEscapeKey(Boolean(unredactTarget), () => setUnredactTarget(null));
  useEscapeKey(Boolean(pendingRedactionBox), () => setPendingRedactionBox(null));
  useEscapeKey(isOpen && !hasSubDialog, onClose);

  if (!isOpen) return null;

  const annotations = viewerCtx?.annotations || [];
  const redactions = viewerCtx?.redactions || [];
  const watermark = viewerCtx?.watermark;
  const watermarkVisible = Boolean(watermark) && (watermark?.enforceDlp || !watermarkOverrideOff);

  const pageAnnotations = annotations.filter(a => a.pageNumber === (currentPage?.pageNumber || 1));
  const pageRedactions = redactions.filter(r => r.pageNumber === (currentPage?.pageNumber || 1));
  const displayedAnnotations = annotationFilter === 'page' ? pageAnnotations : annotations;

  const getRelativePercent = (clientX: number, clientY: number) => {
    const el = canvasRef.current;
    if (!el) return { x: 50, y: 50 };
    const rect = el.getBoundingClientRect();
    const x = Math.min(99, Math.max(1, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.min(99, Math.max(1, ((clientY - rect.top) / rect.height) * 100));
    return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (showBinaryPreview) return;
    const pos = getRelativePercent(e.clientX, e.clientY);
    if (mode === 'annotate') {
      setPendingPin({ xPercent: pos.x, yPercent: pos.y });
      setSidebarTab('annotations');
      return;
    }
    if (mode === 'redact' && canRedact) {
      setDragStart(pos);
      setDragBox({ xPercent: pos.x, yPercent: pos.y, widthPercent: 0, heightPercent: 0 });
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (mode !== 'redact' || !dragStart) return;
    const pos = getRelativePercent(e.clientX, e.clientY);
    const xPercent = Math.min(dragStart.x, pos.x);
    const yPercent = Math.min(dragStart.y, pos.y);
    const widthPercent = Number(Math.abs(pos.x - dragStart.x).toFixed(1));
    const heightPercent = Number(Math.abs(pos.y - dragStart.y).toFixed(1));
    setDragBox({ xPercent, yPercent, widthPercent, heightPercent });
  };

  const handleCanvasMouseUp = () => {
    if (mode !== 'redact' || !dragStart || !dragBox) {
      setDragStart(null);
      setDragBox(null);
      return;
    }
    if (dragBox.widthPercent >= 2 && dragBox.heightPercent >= 1.5) {
      setPendingRedactionBox(dragBox);
      setRedactionReason('');
      setRedactTextSnippet('');
    }
    setDragStart(null);
    setDragBox(null);
  };

  const insertMentionToken = (user: User) => {
    const token = `@${user.username} `;
    setNewComment(prev => (prev.endsWith(' ') || prev === '' ? `${prev}${token}` : `${prev} ${token}`));
    setMentionedUserIds(prev => (prev.includes(user.id) ? prev : [...prev, user.id]));
    setMentionPickerOpen(false);
  };

  const handleCreateAnnotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setFeedback(null);
    setIsSubmittingAnnotation(true);
    try {
      const targetPage = currentPage?.pageNumber || 1;
      const res = await apiFetch(`/api/v1/correspondence/${doc.id}/annotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageNumber: targetPage,
          xPercent: pendingPin?.xPercent ?? 50,
          yPercent: pendingPin?.yPercent ?? 35,
          comment: newComment.trim(),
          mentionedUserIds,
          attachmentId: currentPage?.attachmentId
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', text: localizeErrorMessage(data.error || 'Failed to add annotation.', language) });
        return;
      }
      setNewComment('');
      setMentionedUserIds([]);
      setPendingPin(null);
      setSelectedAnnotationId(data.id);
      await fetchViewerContext();
      await onDocumentMutated?.();
    } catch {
      setFeedback({ type: 'error', text: localizeErrorMessage('Network error posting annotation.', language) });
    } finally {
      setIsSubmittingAnnotation(false);
    }
  };

  const handleReplySubmit = async (annId: string) => {
    if (!replyText.trim()) return;
    setFeedback(null);
    try {
      const res = await apiFetch(`/api/v1/correspondence/${doc.id}/annotations/${annId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: replyText.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', text: localizeErrorMessage(data.error || 'Failed to reply.', language) });
        return;
      }
      setReplyText('');
      setReplyingToId(null);
      await fetchViewerContext();
      await onDocumentMutated?.();
    } catch {
      setFeedback({ type: 'error', text: localizeErrorMessage('Network error posting reply.', language) });
    }
  };

  const handleToggleResolve = async (ann: DocumentAnnotation) => {
    setFeedback(null);
    try {
      const res = await apiFetch(`/api/v1/correspondence/${doc.id}/annotations/${ann.id}/resolve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolved: ann.status !== 'Resolved' })
      });
      if (!res.ok) {
        const d = await res.json();
        setFeedback({ type: 'error', text: localizeErrorMessage(d.error || 'Failed to update status.', language) });
        return;
      }
      await fetchViewerContext();
      await onDocumentMutated?.();
    } catch {
      setFeedback({ type: 'error', text: localizeErrorMessage('Network error updating thread status.', language) });
    }
  };

  const handleDeleteAnnotation = async (annId: string) => {
    setFeedback(null);
    try {
      const res = await apiFetch(`/api/v1/correspondence/${doc.id}/annotations/${annId}`, {
        method: 'DELETE'
      });
      const d = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', text: localizeErrorMessage(d.error || 'Failed to delete annotation.', language) });
        return;
      }
      setConfirmDeleteAnnId(null);
      await fetchViewerContext();
      await onDocumentMutated?.();
    } catch {
      setFeedback({ type: 'error', text: localizeErrorMessage('Network error removing annotation.', language) });
    }
  };

  const handleConfirmRedaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingRedactionBox) return;
    if (redactionReason.trim().length < 10) {
      setFeedback({
        type: 'error',
        text: language === 'am' ? 'የመደበቂያ ምክንያት ቢያንስ 10 ፊደላት መሆን አለበት።' : 'Redaction justification must be at least 10 characters.'
      });
      return;
    }
    setIsApplyingRedaction(true);
    setFeedback(null);
    try {
      const res = await apiFetch(`/api/v1/correspondence/${doc.id}/redactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageNumber: currentPage?.pageNumber || 1,
          ...pendingRedactionBox,
          category: redactionCategory,
          reason: redactionReason.trim(),
          redactTextSnippet: redactTextSnippet.trim() || undefined,
          attachmentId: currentPage?.attachmentId
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', text: localizeErrorMessage(data.error || 'Failed to apply redaction.', language) });
        return;
      }
      setPendingRedactionBox(null);
      setRedactionReason('');
      setRedactTextSnippet('');
      setSidebarTab('redactions');
      setFeedback({
        type: 'success',
        text:
          language === 'am'
            ? 'ቋሚ የመደበቂያ ምልክት በተሳካ ሁኔታ ተተግብሯል።'
            : `Permanent ${redactionCategory} redaction applied and audited.`
      });
      await fetchViewerContext();
      await onDocumentMutated?.(data.document);
    } catch {
      setFeedback({ type: 'error', text: localizeErrorMessage('Network error applying redaction.', language) });
    } finally {
      setIsApplyingRedaction(false);
    }
  };

  const handleConfirmUnredact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unredactTarget) return;
    if (unredactReason.trim().length < 10) return;
    setIsUnredacting(true);
    setFeedback(null);
    try {
      const res = await apiFetch(
        `/api/v1/correspondence/${doc.id}/redactions/${unredactTarget.id}`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: unredactReason.trim() })
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', text: localizeErrorMessage(data.error || 'Failed to remove redaction.', language) });
        return;
      }
      setUnredactTarget(null);
      setUnredactReason('');
      setFeedback({
        type: 'success',
        text: language === 'am' ? 'መደበቂያው በኦዲት ተነስቷል።' : 'Redaction mark removed with security audit trail.'
      });
      await fetchViewerContext();
      await onDocumentMutated?.();
    } catch {
      setFeedback({ type: 'error', text: localizeErrorMessage('Network error removing redaction.', language) });
    } finally {
      setIsUnredacting(false);
    }
  };

  const handlePrintWatermarkedCopy = async () => {
    try {
      await apiFetch(`/api/v1/correspondence/${doc.id}/viewer/print-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ copyToken: watermark?.copyToken || 'COPY' })
      });
    } catch {
      // non-blocking print audit log
    }
    window.print();
  };

  const renderCommentWithMentions = (text: string) => {
    const parts = text.split(/(@[a-zA-Z0-9._-]+)/g);
    return parts.map((part, idx) =>
      part.startsWith('@') ? (
        <span key={idx} className="font-mono font-semibold text-teal-700 dark:text-teal-400">
          {part}
        </span>
      ) : (
        <React.Fragment key={idx}>{part}</React.Fragment>
      )
    );
  };

  return (
    <div
      className="fixed inset-0 z-[70] bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="inline-viewer-title"
        onClick={e => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-7xl h-[92vh] flex flex-col overflow-hidden"
      >
        {/* Top Control Bar */}
        <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-teal-700 text-white flex items-center justify-center shrink-0">
              <Eye className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs">
                <h3 id="inline-viewer-title" className="font-bold text-slate-900 dark:text-slate-100 truncate">
                  {t('inlineViewerTitle')}
                </h3>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <span className="font-mono font-semibold text-teal-700 dark:text-teal-400 tabular-nums">
                  {doc.registrationNumber}
                </span>
                {watermark && (
                  <>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <button
                      type="button"
                      disabled={watermark.enforceDlp}
                      onClick={() => setWatermarkOverrideOff(prev => !prev)}
                      className={`text-[11px] font-mono font-semibold inline-flex items-center gap-1 ${
                        watermark.enforceDlp
                          ? 'text-amber-700 dark:text-amber-400 cursor-default'
                          : watermarkVisible
                            ? 'text-teal-700 dark:text-teal-400 hover:underline'
                            : 'text-slate-400 hover:text-slate-600'
                      }`}
                      title={
                        watermark.enforceDlp
                          ? 'Mandatory DLP watermark active for Confidential / Secret / Very Urgent correspondence'
                          : 'Toggle watermark preview'
                      }
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>
                        {watermark.enforceDlp ? t('dlpWatermarkEnforced') : t('dlpWatermarkActive')} ·{' '}
                        {watermark.copyToken}
                      </span>
                    </button>
                  </>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xl">
                {language === 'am' ? doc.subjectAm || doc.subjectEn : doc.subjectEn}
              </p>
            </div>
          </div>

          {/* Mode & Navigation Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Mode Switcher */}
            <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => {
                  setMode('view');
                  setPendingPin(null);
                }}
                className={`px-2.5 py-1 rounded-md font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  mode === 'view'
                    ? 'bg-teal-700 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{t('modeView')}</span>
              </button>
              <button
                type="button"
                disabled={doc.isDeleted || doc.status === 'Disposed'}
                onClick={() => {
                  setShowBinaryPreview(false);
                  setMode('annotate');
                  setSidebarTab('annotations');
                }}
                className={`px-2.5 py-1 rounded-md font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap disabled:opacity-40 ${
                  mode === 'annotate'
                    ? 'bg-teal-700 text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                <MessageSquarePlus className="w-3.5 h-3.5" />
                <span>{t('modePinComment')}</span>
              </button>
              {canRedact && (
                <button
                  type="button"
                  onClick={() => {
                    setShowBinaryPreview(false);
                    setMode('redact');
                    setSidebarTab('redactions');
                  }}
                  className={`px-2.5 py-1 rounded-md font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                    mode === 'redact'
                      ? 'bg-rose-700 text-white'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>{t('modeRedactArea')}</span>
                </button>
              )}
            </div>

            {/* Page Controls */}
            {viewerCtx && viewerCtx.totalPages > 0 && (
              <div className="inline-flex items-center gap-1 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 px-1.5 py-1 text-xs">
                <button
                  type="button"
                  disabled={currentPageNum <= 1}
                  onClick={() => {
                    setShowBinaryPreview(false);
                    setCurrentPageNum(p => Math.max(1, p - 1));
                  }}
                  className="p-0.5 text-slate-600 dark:text-slate-300 disabled:opacity-30"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <select
                  aria-label="Select page"
                  value={currentPage?.pageNumber || 1}
                  onChange={e => {
                    setShowBinaryPreview(false);
                    setCurrentPageNum(Number(e.target.value));
                  }}
                  className="bg-transparent text-xs font-mono font-semibold text-slate-800 dark:text-slate-200 focus:outline-none tabular-nums max-w-[160px]"
                >
                  {viewerCtx.pages.map(p => (
                    <option key={p.pageNumber} value={p.pageNumber} className="dark:bg-slate-900">
                      {p.pageNumber}/{viewerCtx.totalPages} · {language === 'am' ? p.titleAm : p.titleEn}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={currentPageNum >= viewerCtx.totalPages}
                  onClick={() => {
                    setShowBinaryPreview(false);
                    setCurrentPageNum(p => Math.min(viewerCtx.totalPages, p + 1));
                  }}
                  className="p-0.5 text-slate-600 dark:text-slate-300 disabled:opacity-30"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Zoom */}
            <div className="inline-flex items-center gap-1 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 px-1.5 py-1 text-xs">
              <button
                type="button"
                onClick={() => setZoom(z => Math.max(75, z - 25))}
                className="p-0.5 text-slate-600 dark:text-slate-300"
                aria-label="Zoom out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono font-semibold text-slate-700 dark:text-slate-200 w-10 text-center tabular-nums">
                {zoom}%
              </span>
              <button
                type="button"
                onClick={() => setZoom(z => Math.min(150, z + 25))}
                className="p-0.5 text-slate-600 dark:text-slate-300"
                aria-label="Zoom in"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Print Audited Copy */}
            <button
              type="button"
              onClick={handlePrintWatermarkedCopy}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5 text-teal-600" />
              <span>{t('printWatermarkedCopy')}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label={t('close')}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Instruction / Feedback Strip */}
        {(feedback || mode !== 'view' || isImmutableRecord) && (
          <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              {mode === 'annotate' && <span>{t('clickCanvasToPin')}</span>}
              {mode === 'redact' && <span className="text-rose-700 dark:text-rose-400 font-medium">{t('dragCanvasToRedact')}</span>}
              {mode === 'view' && isImmutableRecord && (
                <span className="inline-flex items-center gap-1.5 text-rose-700 dark:text-rose-400 font-medium">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Record under Legal Hold / Disposed — redaction edits locked</span>
                </span>
              )}
            </div>
            {feedback && (
              <div
                className={`font-medium flex items-center gap-2 ${
                  feedback.type === 'success' ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
                }`}
              >
                <span>{feedback.text}</span>
                <button type="button" onClick={() => setFeedback(null)} className="underline text-[11px]">
                  {t('dismiss')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Split Main Body: Canvas + Governance Sidebar */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
          {/* Interactive Page Canvas */}
          <div className="flex-1 min-h-0 overflow-auto bg-slate-100 dark:bg-slate-950 p-4 sm:p-6 flex flex-col items-center">
            {currentPage?.kind === 'attachment-preview' && currentPage.inlinePreviewUrl && (
              <div className="mb-3 flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setShowBinaryPreview(false)}
                  className={`px-3 py-1 rounded-lg border font-semibold ${
                    !showBinaryPreview
                      ? 'bg-teal-700 text-white border-teal-700'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {t('sheetPreviewToggle')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('view');
                    setShowBinaryPreview(true);
                  }}
                  className={`px-3 py-1 rounded-lg border font-semibold ${
                    showBinaryPreview
                      ? 'bg-teal-700 text-white border-teal-700'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {t('binaryPreviewToggle')}
                </button>
              </div>
            )}

            {loading || !currentPage ? (
              <div className="w-full max-w-[740px] h-[640px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-8 space-y-4">
                <div className="h-6 w-2/3 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="h-4 w-1/2 bg-slate-100 dark:bg-slate-800/60 rounded" />
                <div className="h-64 w-full bg-slate-100 dark:bg-slate-800/40 rounded" />
              </div>
            ) : showBinaryPreview && currentPage.inlinePreviewUrl ? (
              <div className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden relative min-h-[68vh] flex items-center justify-center">
                {binaryLoading ? (
                  <div className="text-xs text-slate-500 py-16">Loading watermarked file stream...</div>
                ) : binaryBlobUrl ? (
                  currentPage.mimeType?.startsWith('image/') ? (
                    <img src={binaryBlobUrl} alt={currentPage.titleEn} className="max-h-[68vh] object-contain" />
                  ) : (
                    <iframe title={currentPage.titleEn} src={binaryBlobUrl} className="w-full h-[68vh] border-0" />
                  )
                ) : (
                  <div className="text-xs text-slate-500 py-16">Binary preview unavailable for this attachment.</div>
                )}
                {watermarkVisible && watermark && (
                  <div className="pointer-events-none select-none absolute inset-0 overflow-hidden flex flex-col justify-between p-6 opacity-20">
                    {[0, 1, 2].map(row => (
                      <div
                        key={row}
                        className="-rotate-24 text-center font-mono text-xs font-bold tracking-wider text-rose-700 dark:text-rose-400 whitespace-nowrap"
                      >
                        {watermark.watermarkText}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div
                ref={canvasRef}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                style={{
                  width: `${Math.round((720 * zoom) / 100)}px`,
                  minHeight: `${Math.round((880 * zoom) / 100)}px`
                }}
                className={`relative bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg shadow-sm p-8 sm:p-10 select-none shrink-0 transition-[width] duration-150 ${
                  mode === 'annotate'
                    ? 'cursor-crosshair'
                    : mode === 'redact'
                      ? 'cursor-cell'
                      : 'cursor-default'
                }`}
              >
                {/* Official Sheet Header */}
                <div className="border-b border-slate-200 dark:border-slate-800 pb-4 mb-5 flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-widest text-teal-700 dark:text-teal-400 font-bold">
                      Ethiopian Pharmaceutical Supply Service · National EDRMS
                    </div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
                      {language === 'am' ? currentPage.titleAm : currentPage.titleEn}
                    </h4>
                  </div>
                  <div className="text-right font-mono text-[11px] text-slate-500 dark:text-slate-400 tabular-nums shrink-0">
                    <div>
                      Page {currentPage.pageNumber} / {viewerCtx?.totalPages}
                    </div>
                    <div>{doc.confidentiality.toUpperCase()}</div>
                  </div>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 text-xs mb-6 pb-5 border-b border-slate-200 dark:border-slate-800">
                  {currentPage.lines.map((row, idx) => (
                    <div key={idx} className="flex flex-col">
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                        {row.label}
                      </span>
                      <span className="text-slate-900 dark:text-slate-100 font-medium break-words">
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Structured Scrubbed Document Body */}
                <div className="space-y-2 text-xs leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-sans select-text">
                  {currentPage.bodyText}
                </div>

                {/* Dynamic Repeating Diagonal DLP Watermark Overlay */}
                {watermarkVisible && watermark && (
                  <div
                    aria-hidden="true"
                    className="pointer-events-none select-none absolute inset-0 overflow-hidden flex flex-col justify-around py-12 opacity-[0.16]"
                  >
                    {[0, 1, 2, 3].map(idx => (
                      <div
                        key={idx}
                        className="-rotate-24 text-center font-mono text-[11px] font-bold tracking-widest text-slate-800 dark:text-slate-200 whitespace-nowrap"
                      >
                        {watermark.watermarkText}
                      </div>
                    ))}
                  </div>
                )}

                {/* Permanent Redaction Overlay Boxes */}
                {pageRedactions.map(r => (
                  <div
                    key={r.id}
                    style={{
                      left: `${r.xPercent}%`,
                      top: `${r.yPercent}%`,
                      width: `${r.widthPercent}%`,
                      height: `${r.heightPercent}%`
                    }}
                    title={`[${r.category}] ${r.reason} — Applied by ${r.appliedByName}`}
                    className="absolute bg-slate-950 border border-rose-500/60 text-white flex items-center justify-center p-1 overflow-hidden z-20"
                  >
                    <span className="font-mono text-[10px] font-bold tracking-wider uppercase truncate">
                      [REDACTED · {r.category}]
                    </span>
                  </div>
                ))}

                {/* Live Drag Preview Box */}
                {dragBox && dragBox.widthPercent > 0 && dragBox.heightPercent > 0 && (
                  <div
                    style={{
                      left: `${dragBox.xPercent}%`,
                      top: `${dragBox.yPercent}%`,
                      width: `${dragBox.widthPercent}%`,
                      height: `${dragBox.heightPercent}%`
                    }}
                    className="pointer-events-none absolute bg-rose-950/75 border-2 border-dashed border-rose-400 z-30"
                  />
                )}

                {/* Existing Annotation Pins */}
                {pageAnnotations.map((ann, idx) => {
                  const isSelected = selectedAnnotationId === ann.id;
                  return (
                    <button
                      key={ann.id}
                      type="button"
                      onMouseDown={e => e.stopPropagation()}
                      onClick={e => {
                        e.stopPropagation();
                        setSelectedAnnotationId(ann.id);
                        setSidebarTab('annotations');
                      }}
                      style={{ left: `${ann.xPercent}%`, top: `${ann.yPercent}%` }}
                      title={`${ann.authorName}: ${ann.comment}`}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 w-6 h-6 rounded-full text-[11px] font-mono font-bold flex items-center justify-center border shadow-xs z-30 transition-transform tabular-nums ${
                        ann.status === 'Resolved'
                          ? 'bg-emerald-600 text-white border-white'
                          : isSelected
                            ? 'bg-teal-700 text-white border-white scale-110 ring-2 ring-teal-400'
                            : 'bg-amber-500 text-slate-950 border-white hover:scale-110'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}

                {/* Pending Pin Indicator */}
                {pendingPin && mode === 'annotate' && (
                  <div
                    style={{ left: `${pendingPin.xPercent}%`, top: `${pendingPin.yPercent}%` }}
                    className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full border-2 border-dashed border-teal-600 bg-teal-500/20 flex items-center justify-center text-[10px] font-mono font-bold text-teal-800 dark:text-teal-200 z-30"
                  >
                    +
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Governance Sidebar */}
          <div className="w-full lg:w-[400px] border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col min-h-0 max-h-[40vh] lg:max-h-none">
            {/* Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setSidebarTab('annotations')}
                className={`flex-1 py-3 px-4 border-b-2 transition-colors flex items-center justify-center gap-1.5 tabular-nums ${
                  sidebarTab === 'annotations'
                    ? 'border-teal-600 text-teal-700 dark:text-teal-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <MessageSquarePlus className="w-3.5 h-3.5" />
                <span>
                  {t('annotationsTab')} ({annotations.length})
                </span>
              </button>
              <button
                type="button"
                onClick={() => setSidebarTab('redactions')}
                className={`flex-1 py-3 px-4 border-b-2 transition-colors flex items-center justify-center gap-1.5 tabular-nums ${
                  sidebarTab === 'redactions'
                    ? 'border-rose-600 text-rose-700 dark:text-rose-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>
                  {t('redactionsTab')} ({redactions.length})
                </span>
              </button>
            </div>

            {sidebarTab === 'annotations' ? (
              <div className="flex-1 min-h-0 flex flex-col">
                {/* Filter Strip */}
                <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                  <div className="inline-flex gap-2">
                    <button
                      type="button"
                      onClick={() => setAnnotationFilter('page')}
                      className={`font-semibold ${
                        annotationFilter === 'page'
                          ? 'text-teal-700 dark:text-teal-400 underline'
                          : 'text-slate-500'
                      }`}
                    >
                      {t('currentPageOnly')} ({pageAnnotations.length})
                    </button>
                    <span className="text-slate-300 dark:text-slate-700">·</span>
                    <button
                      type="button"
                      onClick={() => setAnnotationFilter('all')}
                      className={`font-semibold ${
                        annotationFilter === 'all'
                          ? 'text-teal-700 dark:text-teal-400 underline'
                          : 'text-slate-500'
                      }`}
                    >
                      {t('allPagesFilter')} ({annotations.length})
                    </button>
                  </div>
                  {pendingPin && (
                    <span className="font-mono text-teal-700 dark:text-teal-400 tabular-nums">
                      Pin ({pendingPin.xPercent}%, {pendingPin.yPercent}%)
                    </span>
                  )}
                </div>

                {/* New Annotation Composer */}
                {!doc.isDeleted && doc.status !== 'Disposed' && (
                  <form
                    onSubmit={handleCreateAnnotation}
                    className="p-3.5 border-b border-slate-200 dark:border-slate-800 space-y-2 bg-slate-50/50 dark:bg-slate-800/30"
                  >
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>{t('mentionOfficerHint')}</span>
                      <button
                        type="button"
                        onClick={() => setMentionPickerOpen(prev => !prev)}
                        className="inline-flex items-center gap-1 font-semibold text-teal-700 dark:text-teal-400 hover:underline"
                      >
                        <AtSign className="w-3 h-3" />
                        <span>@Officer</span>
                      </button>
                    </div>

                    {mentionPickerOpen && (
                      <div className="max-h-32 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
                        {staffUsers.map(u => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => insertMentionToken(u)}
                            className="w-full px-2.5 py-1.5 text-left text-xs hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between gap-2"
                          >
                            <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                              {u.fullNameEn}
                            </span>
                            <span className="font-mono text-[10px] text-teal-700 dark:text-teal-400">
                              @{u.username}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    <textarea
                      rows={2}
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      placeholder={
                        language === 'am'
                          ? 'ማብራሪያ ወይም @username ጥቆማ ይጻፉ...'
                          : 'Add collaborative review note or @username mention...'
                      }
                      className="w-full p-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                    />
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono text-slate-400 tabular-nums">
                        Page {currentPage?.pageNumber || 1}
                        {pendingPin ? ` · (${pendingPin.xPercent}%, ${pendingPin.yPercent}%)` : ''}
                      </span>
                      <button
                        type="submit"
                        disabled={isSubmittingAnnotation || newComment.trim().length < 2}
                        className="px-3 py-1 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1 disabled:opacity-40"
                      >
                        <Send className="w-3 h-3" />
                        <span>{isSubmittingAnnotation ? '...' : t('submit')}</span>
                      </button>
                    </div>
                  </form>
                )}

                {/* Annotation Thread List */}
                <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {displayedAnnotations.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 space-y-1">
                      <FileText className="w-6 h-6 mx-auto opacity-40" />
                      <p>
                        {language === 'am'
                          ? 'በዚህ ገጽ ላይ እስካሁን ማብራሪያ የለም።'
                          : 'No annotations yet. Select Pin Comment or post above.'}
                      </p>
                    </div>
                  ) : (
                    displayedAnnotations.map(ann => {
                      const canDelete =
                        !doc.legalHold &&
                        (ann.authorId === currentUser?.id ||
                          currentUser?.role === 'SuperAdmin' ||
                          currentUser?.role === 'SecurityOfficer');
                      return (
                        <div
                          key={ann.id}
                          onClick={() => {
                            setCurrentPageNum(ann.pageNumber);
                            setSelectedAnnotationId(ann.id);
                          }}
                          className={`p-3.5 space-y-2 cursor-pointer transition-colors ${
                            selectedAnnotationId === ann.id
                              ? 'bg-teal-50/50 dark:bg-teal-950/20'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                                {ann.authorName}
                              </div>
                              <div className="text-[10px] font-mono text-slate-500 tabular-nums">
                                {ann.authorRole} · P.{ann.pageNumber} · {formatEthiopianDate(ann.createdAt, language, true)}
                              </div>
                            </div>
                            <span
                              className={`text-[10px] font-mono font-bold uppercase shrink-0 ${
                                ann.status === 'Resolved'
                                  ? 'text-emerald-700 dark:text-emerald-400'
                                  : 'text-amber-700 dark:text-amber-400'
                              }`}
                            >
                              {ann.status}
                            </span>
                          </div>

                          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                            {renderCommentWithMentions(ann.comment)}
                          </p>

                          {/* Replies */}
                          {ann.replies.length > 0 && (
                            <div className="pl-3 border-l border-slate-200 dark:border-slate-700 space-y-2 pt-1">
                              {ann.replies.map(rep => (
                                <div key={rep.id} className="text-[11px] space-y-0.5">
                                  <div className="font-semibold text-slate-800 dark:text-slate-200">
                                    {rep.authorName}{' '}
                                    <span className="font-mono font-normal text-[10px] text-slate-400">
                                      · {formatEthiopianDate(rep.createdAt, language, true)}
                                    </span>
                                  </div>
                                  <p className="text-slate-600 dark:text-slate-300">
                                    {renderCommentWithMentions(rep.message)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Thread Actions */}
                          <div
                            className="flex flex-wrap items-center gap-3 pt-1 text-[11px]"
                            onClick={e => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setReplyingToId(replyingToId === ann.id ? null : ann.id);
                                setReplyText('');
                              }}
                              className="font-semibold text-teal-700 dark:text-teal-400 hover:underline"
                            >
                              Reply
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleResolve(ann)}
                              className="font-semibold text-slate-600 dark:text-slate-300 hover:underline inline-flex items-center gap-1"
                            >
                              {ann.status === 'Resolved' ? (
                                <>
                                  <RotateCcw className="w-3 h-3" />
                                  <span>{t('reopenThread')}</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>{t('resolveThread')}</span>
                                </>
                              )}
                            </button>
                            {canDelete &&
                              (confirmDeleteAnnId === ann.id ? (
                                <span className="inline-flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteAnnotation(ann.id)}
                                    className="font-semibold text-rose-600 hover:underline"
                                  >
                                    Confirm Delete
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteAnnId(null)}
                                    className="text-slate-400"
                                  >
                                    {t('cancel')}
                                  </button>
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteAnnId(ann.id)}
                                  className="text-slate-400 hover:text-rose-600 inline-flex items-center gap-1"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              ))}
                          </div>

                          {replyingToId === ann.id && (
                            <div
                              className="flex items-center gap-1.5 pt-1"
                              onClick={e => e.stopPropagation()}
                            >
                              <input
                                type="text"
                                value={replyText}
                                onChange={e => setReplyText(e.target.value)}
                                placeholder="Write reply or @username..."
                                className="flex-1 px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                              />
                              <button
                                type="button"
                                onClick={() => handleReplySubmit(ann.id)}
                                className="px-2.5 py-1 bg-teal-700 text-white rounded-lg text-xs font-semibold"
                              >
                                Send
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : (
              /* Redactions Sidebar Tab */
              <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {redactions.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 space-y-1.5">
                    <ShieldAlert className="w-6 h-6 mx-auto opacity-40" />
                    <p>
                      {language === 'am'
                        ? 'እስካሁን የተተገበረ መደበቂያ የለም።'
                        : 'No permanent redactions applied on this record.'}
                    </p>
                    {canRedact && (
                      <p className="text-[11px]">
                        Switch to <strong>{t('modeRedactArea')}</strong> and drag across sensitive content.
                      </p>
                    )}
                  </div>
                ) : (
                  redactions.map(mark => (
                    <div key={mark.id} className="p-3.5 space-y-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-bold text-rose-700 dark:text-rose-400">
                          [REDACTED · {mark.category}]
                        </span>
                        <span className="font-mono text-[10px] text-slate-500 tabular-nums">
                          Page {mark.pageNumber}
                        </span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300">{mark.reason}</p>
                      {mark.redactTextSnippet && (
                        <div className="font-mono text-[10px] text-slate-500 bg-slate-50 dark:bg-slate-800/60 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">
                          Text Scrubbed · Revision Snapshot Recorded
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-2 text-[10px] text-slate-400 font-mono">
                        <span>
                          {mark.appliedByName} · {formatEthiopianDate(mark.appliedAt, language, true)}
                        </span>
                        {canUnredact && (
                          <button
                            type="button"
                            onClick={() => {
                              setUnredactTarget(mark);
                              setUnredactReason('');
                            }}
                            className="text-rose-600 dark:text-rose-400 font-sans font-semibold hover:underline"
                          >
                            {t('unredactAction')}
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal 1: Confirm Permanent Redaction */}
      {pendingRedactionBox && (
        <div
          className="fixed inset-0 z-[80] bg-slate-950/70 flex items-center justify-center p-4"
          onClick={() => setPendingRedactionBox(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={e => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-5 space-y-4 text-xs"
          >
            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>{t('modeRedactArea')}</span>
            </div>

            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              {t('permanentRedactionWarning')}
            </p>

            <form onSubmit={handleConfirmRedaction} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  {t('redactionCategory')}
                </label>
                <select
                  value={redactionCategory}
                  onChange={e => setRedactionCategory(e.target.value as RedactionCategory)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                >
                  {REDACTION_CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>
                      {language === 'am' ? c.labelAm : c.labelEn}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Optional Text Snippet to Permanently Scrub
                </label>
                <input
                  type="text"
                  value={redactTextSnippet}
                  onChange={e => setRedactTextSnippet(e.target.value)}
                  placeholder="Exact sensitive phrase or ID to mask across text..."
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  {t('justificationMin10')} <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  minLength={10}
                  rows={2}
                  value={redactionReason}
                  onChange={e => setRedactionReason(e.target.value)}
                  placeholder="Specify legal/privacy basis for permanent redaction..."
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setPendingRedactionBox(null)}
                  className="px-3 py-1.5 text-slate-600 dark:text-slate-300 font-semibold"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isApplyingRedaction || redactionReason.trim().length < 10}
                  className="px-4 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg font-semibold disabled:opacity-40"
                >
                  {isApplyingRedaction ? 'Applying...' : 'Apply Permanent Redaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Audited Un-redact (SuperAdmin / SecurityOfficer) */}
      {unredactTarget && (
        <div
          className="fixed inset-0 z-[80] bg-slate-950/70 flex items-center justify-center p-4"
          onClick={() => setUnredactTarget(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={e => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-5 space-y-4 text-xs"
          >
            <div className="font-bold text-sm text-slate-900 dark:text-slate-100">
              {t('unredactAction')} · [{unredactTarget.category}]
            </div>
            <form onSubmit={handleConfirmUnredact} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  {t('justificationMin10')} <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  minLength={10}
                  rows={2}
                  value={unredactReason}
                  onChange={e => setUnredactReason(e.target.value)}
                  placeholder="Enter formal Security Officer authorization justification..."
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setUnredactTarget(null)}
                  className="px-3 py-1.5 text-slate-600 dark:text-slate-300 font-semibold"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isUnredacting || unredactReason.trim().length < 10}
                  className="px-4 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg font-semibold disabled:opacity-40"
                >
                  {isUnredacting ? 'Removing...' : 'Confirm Audited Un-redact'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
