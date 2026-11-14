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
  Check,
  Edit3,
  Trash2,
  Plus,
  Save,
  AlertTriangle,
  FilePlus,
  Paperclip,
  KeyRound,
  FileKey2,
  GitBranch,
  Link2,
  Unlink
} from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import { formatEthiopianDate } from '../../lib/translations.js';
import { apiFetch } from '../../lib/apiFetch.js';
import { localizeErrorMessage } from '../../lib/localizedErrors.js';
import { useEscapeKey } from '../../lib/useEscapeKey.js';
import { 
  generateVerificationQrCode, 
  getDocumentVerificationUrl, 
  downloadQrCodeImage
} from '../../lib/qrVerification.js';
import { VerificationStatusModal } from '../verification/VerificationStatusModal.js';
import { BiometricVerificationModal } from '../auth/BiometricVerificationModal.js';
import { Fingerprint, Scan, LockKeyhole } from 'lucide-react';
import {
  DocumentLinkType,
  EnrichedDocumentLink,
  SigningCertificate
} from '../../types/index.js';

export const DocumentDetailModal: React.FC = () => {
  const {
    selectedDocument,
    setSelectedDocument,
    currentUser,
    session,
    departments,
    branches,
    documents,
    openRegisterModal,
    refreshData,
    language,
    t
  } = useApp();
  const [minuteText, setMinuteText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
  const [isBiometricModalOpen, setIsBiometricModalOpen] = useState(false);
  const [isBiometricUnlocked, setIsBiometricUnlocked] = useState(false);
  const [liveQrCodeUrl, setLiveQrCodeUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pendingDeleteAttId, setPendingDeleteAttId] = useState<string | null>(null);

  // Direct PKI Electronic Signing Modal State
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [signMeaning, setSignMeaning] = useState('Executive Counter-Signature & Attestation');
  const [signComments, setSignComments] = useState('');
  const [signStepUpPin, setSignStepUpPin] = useState('');
  const [pendingBioSignRetry, setPendingBioSignRetry] = useState(false);
  const [myCertificates, setMyCertificates] = useState<SigningCertificate[]>([]);
  const [isIssuingCert, setIsIssuingCert] = useState(false);

  // Edit Document Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editSubjectEn, setEditSubjectEn] = useState('');
  const [editSubjectAm, setEditSubjectAm] = useState('');
  const [editDescriptionEn, setEditDescriptionEn] = useState('');
  const [editSenderOrg, setEditSenderOrg] = useState('');
  const [editRecipientOrg, setEditRecipientOrg] = useState('');
  const [editPriority, setEditPriority] = useState<any>('Normal');
  const [editConfidentiality, setEditConfidentiality] = useState<any>('Internal');
  const [editDeptId, setEditDeptId] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editOverrideSignedLock, setEditOverrideSignedLock] = useState(false);
  const [editOverrideReason, setEditOverrideReason] = useState('');

  // Delete Modals State
  const [isSoftDeleteOpen, setIsSoftDeleteOpen] = useState(false);
  const [softDeleteReason, setSoftDeleteReason] = useState('');
  const [isHardDeleteOpen, setIsHardDeleteOpen] = useState(false);
  const [hardDeleteConfirmText, setHardDeleteConfirmText] = useState('');

  // Attachment CRUD State
  const [isAddAttachmentOpen, setIsAddAttachmentOpen] = useState(false);
  const [newAttName, setNewAttName] = useState('');
  const [newAttNotes, setNewAttNotes] = useState('');
  const [editingAttId, setEditingAttId] = useState<string | null>(null);
  const [editingAttNotes, setEditingAttNotes] = useState('');

  // Legal Hold Modal State (min 20 char reason)
  const [isLegalHoldModalOpen, setIsLegalHoldModalOpen] = useState(false);
  const [legalHoldReasonInput, setLegalHoldReasonInput] = useState('');
  const [legalHoldError, setLegalHoldError] = useState('');

  // Phase 14: Case Dossier Cross-Document Linking State
  const [documentLinks, setDocumentLinks] = useState<EnrichedDocumentLink[]>([]);
  const [linksLoading, setLinksLoading] = useState(false);
  const [isLinkFormOpen, setIsLinkFormOpen] = useState(false);
  const [linkTargetDocId, setLinkTargetDocId] = useState('');
  const [linkType, setLinkType] = useState<DocumentLinkType>('RelatedDossier');
  const [linkNotes, setLinkNotes] = useState('');
  const [pendingUnlinkId, setPendingUnlinkId] = useState<string | null>(null);

  const isSensitiveRecord = selectedDocument?.confidentiality === 'Confidential' || 
    selectedDocument?.confidentiality === 'Secret' || 
    selectedDocument?.priority === 'VeryUrgent';

  useEffect(() => {
    if (selectedDocument) {
      setIsBiometricUnlocked(!isSensitiveRecord || !!session?.mfaVerified);
      generateVerificationQrCode(selectedDocument, { size: 280, darkColor: '#0f766e' }).then(url => {
        setLiveQrCodeUrl(url);
      });
      // Pre-fill edit fields
      setEditSubjectEn(selectedDocument.subjectEn || '');
      setEditSubjectAm(selectedDocument.subjectAm || '');
      setEditDescriptionEn(selectedDocument.descriptionEn || '');
      setEditSenderOrg(selectedDocument.senderOrganization || '');
      setEditRecipientOrg(selectedDocument.recipientOrganization || '');
      setEditPriority(selectedDocument.priority || 'Normal');
      setEditConfidentiality(selectedDocument.confidentiality || 'Internal');
      setEditDeptId(selectedDocument.departmentId || '');
      setEditDueDate(selectedDocument.dueDate ? selectedDocument.dueDate.split('T')[0] : '');
      setEditOverrideSignedLock(false);
      setEditOverrideReason('');
      setActionFeedback(null);
      setPendingDeleteAttId(null);
      setIsLinkFormOpen(false);
      setLinkTargetDocId('');
      setLinkNotes('');
      setPendingUnlinkId(null);

      setLinksLoading(true);
      apiFetch(`/api/v1/correspondence/${selectedDocument.id}/links`)
        .then(r => (r.ok ? r.json() : []))
        .then((rows: EnrichedDocumentLink[]) => {
          setDocumentLinks(Array.isArray(rows) ? rows : []);
        })
        .catch(() => setDocumentLinks([]))
        .finally(() => setLinksLoading(false));
    }
  }, [selectedDocument, session?.mfaVerified, isSensitiveRecord]);

  useEffect(() => {
    if (!isSignModalOpen || !currentUser) return;
    apiFetch('/api/v1/pki/certificates')
      .then(r => (r.ok ? r.json() : []))
      .then((list: SigningCertificate[]) => {
        setMyCertificates(list.filter(c => c.userId === currentUser.id));
      })
      .catch(() => {});
  }, [isSignModalOpen, currentUser?.id]);

  const hasSubModalOpen =
    isSignModalOpen ||
    isEditOpen ||
    isSoftDeleteOpen ||
    isHardDeleteOpen ||
    isLegalHoldModalOpen ||
    isVerificationModalOpen ||
    isBiometricModalOpen ||
    isAddAttachmentOpen ||
    Boolean(editingAttId);

  useEscapeKey(Boolean(editingAttId), () => setEditingAttId(null));
  useEscapeKey(isAddAttachmentOpen, () => setIsAddAttachmentOpen(false));
  useEscapeKey(isLegalHoldModalOpen, () => setIsLegalHoldModalOpen(false));
  useEscapeKey(isHardDeleteOpen, () => setIsHardDeleteOpen(false));
  useEscapeKey(isSoftDeleteOpen, () => setIsSoftDeleteOpen(false));
  useEscapeKey(isEditOpen, () => setIsEditOpen(false));
  useEscapeKey(isSignModalOpen && !isBiometricModalOpen, () => setIsSignModalOpen(false));
  useEscapeKey(Boolean(selectedDocument) && !hasSubModalOpen, () => setSelectedDocument(null));

  if (!selectedDocument) return null;

  const doc = selectedDocument;
  const isImmutableRecord = !!doc.legalHold || doc.status === 'Disposed';
  const activeSignaturesCount = (doc.workflowHistory || []).filter(
    h => h.digitalSignature && !h.digitalSignature.invalidated
  ).length;
  const activeCertificate = myCertificates.find(c => c.status === 'Active') || null;
  const canSignDoc =
    !isImmutableRecord &&
    !doc.isDeleted &&
    !!currentUser &&
    (currentUser.role === 'SuperAdmin' ||
      currentUser.permissions.includes('*') ||
      currentUser.permissions.includes('approve:workflows') ||
      currentUser.permissions.includes('edit:documents'));

  const handleIssueMyCert = async () => {
    setActionFeedback(null);
    setIsIssuingCert(true);
    try {
      const res = await apiFetch('/api/v1/pki/certificates/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Direct document PKI attestation activation' })
      });
      const data = await res.json();
      if (!res.ok) {
        setActionFeedback({
          type: 'error',
          text: localizeErrorMessage(data.error || 'Failed to issue signing certificate.', language)
        });
        return;
      }
      setMyCertificates(prev => [data, ...prev.map(c => (c.status === 'Active' ? { ...c, status: 'Revoked' as const } : c))]);
      setActionFeedback({ type: 'success', text: `Issued active PKI certificate ${data.serialNumber}.` });
    } catch {
      setActionFeedback({
        type: 'error',
        text: localizeErrorMessage('Network error while issuing signing certificate.', language)
      });
    } finally {
      setIsIssuingCert(false);
    }
  };

  const executeDirectSign = async (biometricVerified = false) => {
    setActionFeedback(null);
    try {
      setIsSubmitting(true);
      const res = await apiFetch(`/api/v1/correspondence/${doc.id}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signingMeaning: signMeaning,
          comments: signComments.trim() || undefined,
          stepUpPin: signStepUpPin.trim() || undefined,
          biometricSignatureVerified: biometricVerified
        })
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.mfaNeeded) {
          setPendingBioSignRetry(true);
          setIsBiometricModalOpen(true);
          return;
        }
        setActionFeedback({
          type: 'error',
          text: localizeErrorMessage(data.error || 'Failed to apply PKI signature.', language)
        });
        return;
      }
      setSelectedDocument(data.document);
      setIsSignModalOpen(false);
      setSignComments('');
      setSignStepUpPin('');
      setActionFeedback({
        type: 'success',
        text: `Cryptographic RSA-SHA256 signature applied (${data.signature?.certificateSerial || 'PKI'}).`
      });
      await refreshData();
    } catch {
      setActionFeedback({
        type: 'error',
        text: localizeErrorMessage('Network error while applying PKI digital signature.', language)
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddMinute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!minuteText.trim()) return;
    setActionFeedback(null);

    try {
      setIsSubmitting(true);
      const res = await apiFetch(`/api/v1/workflows/${doc.id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'MinuteAdded',
          comments: minuteText
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to record minute');
      }
      const updated = await res.json();
      setSelectedDocument(updated);
      setMinuteText('');
      setActionFeedback({ type: 'success', text: 'Official directorate minute recorded.' });
      await refreshData();
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        text: localizeErrorMessage(err?.message || 'Failed to add minute note.', language)
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openLegalHoldModal = () => {
    setLegalHoldReasonInput('');
    setLegalHoldError('');
    setIsLegalHoldModalOpen(true);
  };

  const handleSubmitLegalHold = async (e: React.FormEvent) => {
    e.preventDefault();
    setLegalHoldError('');
    if (legalHoldReasonInput.trim().length < 20) {
      setLegalHoldError(
        language === 'am'
          ? 'የሕግ እገዳ ምክንያት ቢያንስ 20 ፊደላት መሆን አለበት።'
          : 'Legal Hold reason must be at least 20 characters.'
      );
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await apiFetch(`/api/v1/records/legal-hold/${doc.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          active: !doc.legalHold,
          reason: legalHoldReasonInput.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setLegalHoldError(localizeErrorMessage(data.error || 'Failed to update Legal Hold status', language));
        return;
      }
      setSelectedDocument(
        data.document || {
          ...doc,
          legalHold: data.legalHold,
          legalHoldReason: legalHoldReasonInput.trim()
        }
      );
      setIsLegalHoldModalOpen(false);
      await refreshData();
    } catch (err: any) {
      setLegalHoldError(localizeErrorMessage(err?.message || 'Network error while updating Legal Hold', language));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionFeedback(null);
    if (!editSubjectEn.trim() || editSubjectEn.trim().length < 5) {
      setActionFeedback({
        type: 'error',
        text:
          language === 'am'
            ? 'ርዕስ (እንግሊዝኛ) ቢያንስ 5 ፊደላት መሆን አለበት።'
            : 'Subject (English) must be at least 5 characters.'
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const targetDeptObj = departments.find(d => d.id === editDeptId);
      const res = await apiFetch(`/api/v1/correspondence/${doc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectEn: editSubjectEn,
          subjectAm: editSubjectAm || editSubjectEn,
          descriptionEn: editDescriptionEn,
          senderOrganization: editSenderOrg,
          recipientOrganization: editRecipientOrg,
          priority: editPriority,
          confidentiality: editConfidentiality,
          departmentId: editDeptId || doc.departmentId,
          assignedDepartmentName: targetDeptObj?.nameEn || doc.assignedDepartmentName,
          dueDate: editDueDate ? new Date(editDueDate).toISOString() : undefined,
          overrideSignedLock: editOverrideSignedLock || undefined,
          editReason: editOverrideReason.trim() || undefined
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update document');
      }

      const updated = await res.json();
      setSelectedDocument(updated);
      setIsEditOpen(false);
      setActionFeedback({ type: 'success', text: 'Document metadata updated.' });
      await refreshData();
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        text: localizeErrorMessage(err?.message || 'Failed to update document metadata.', language)
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSoftDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionFeedback(null);
    if (!softDeleteReason.trim() || softDeleteReason.trim().length < 10) {
      setActionFeedback({
        type: 'error',
        text:
          language === 'am'
            ? 'እባክዎ የሰነድ መሰረዣ ምክንያት (ቢያንስ 10 ፊደላት) ያስገቡ።'
            : 'Please provide a mandatory cancellation/deletion reason (min 10 characters).'
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await apiFetch(`/api/v1/correspondence/${doc.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: softDeleteReason })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Soft delete failed');
      }
      setIsSoftDeleteOpen(false);
      setSelectedDocument(null);
      await refreshData();
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        text: localizeErrorMessage(err?.message || 'Failed to cancel document.', language)
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleHardDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionFeedback(null);
    if (hardDeleteConfirmText !== 'DELETE') {
      setActionFeedback({
        type: 'error',
        text:
          language === 'am'
            ? 'በቋሚነት ለማጥፋት እባክዎ DELETE ብለው ይጻፉ።'
            : 'Please type DELETE to confirm permanent purge.'
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await apiFetch(`/api/v1/correspondence/${doc.id}/permanent`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Hard delete failed');
      }
      setIsHardDeleteOpen(false);
      setSelectedDocument(null);
      await refreshData();
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        text: localizeErrorMessage(err?.message || 'Hard delete failed.', language)
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddAttachment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAttName.trim()) return;
    setActionFeedback(null);

    try {
      setIsSubmitting(true);
      const res = await apiFetch(`/api/v1/correspondence/${doc.id}/attachments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: newAttName.endsWith('.pdf') ? newAttName : `${newAttName}.pdf`,
          fileSize: 1540000 + Math.floor(Math.random() * 900000),
          mimeType: 'application/pdf',
          fileUrl: '/assets/sample-docs/uploaded_file.pdf',
          notes: newAttNotes
        })
      });

      if (!res.ok) throw new Error('Failed to attach document');
      const updated = await res.json();
      setSelectedDocument(updated);
      setIsAddAttachmentOpen(false);
      setNewAttName('');
      setNewAttNotes('');
      setActionFeedback({ type: 'success', text: 'Attachment linked to correspondence dossier.' });
      await refreshData();
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        text: localizeErrorMessage(err?.message || 'Failed to add attachment.', language)
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateAttachmentNotes = async (attId: string) => {
    setActionFeedback(null);
    try {
      const res = await apiFetch(`/api/v1/correspondence/${doc.id}/attachments/${attId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: editingAttNotes })
      });
      if (!res.ok) throw new Error('Failed to update notes');
      const updated = await res.json();
      setSelectedDocument(updated);
      setEditingAttId(null);
      setActionFeedback({ type: 'success', text: 'Attachment notes updated.' });
      await refreshData();
    } catch {
      setActionFeedback({
        type: 'error',
        text: localizeErrorMessage('Failed to update attachment notes.', language)
      });
    }
  };

  const handleDeleteAttachment = async (attId: string) => {
    setActionFeedback(null);
    try {
      const res = await apiFetch(`/api/v1/correspondence/${doc.id}/attachments/${attId}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to remove attachment');
      const updated = await res.json();
      setSelectedDocument(updated);
      setPendingDeleteAttId(null);
      setActionFeedback({ type: 'success', text: 'Attachment removed from record.' });
      await refreshData();
    } catch {
      setActionFeedback({
        type: 'error',
        text: localizeErrorMessage('Failed to delete attachment.', language)
      });
    }
  };

  const canModifyLinks =
    !doc.isDeleted &&
    !!currentUser &&
    (currentUser.role === 'SuperAdmin' ||
      currentUser.permissions.includes('*') ||
      currentUser.permissions.includes('edit:documents') ||
      currentUser.permissions.includes('create:documents'));

  const handleDraftReply = () => {
    const replyType = doc.type === 'InternalMemo' ? 'InternalMemo' : 'OutgoingLetter';
    openRegisterModal(replyType, doc);
    setSelectedDocument(null);
  };

  const handleCreateDocumentLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkTargetDocId) return;
    setActionFeedback(null);
    try {
      setIsSubmitting(true);
      const res = await apiFetch(`/api/v1/correspondence/${doc.id}/links`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetDocumentId: linkTargetDocId,
          linkType,
          notes: linkNotes.trim() || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setActionFeedback({
          type: 'error',
          text: localizeErrorMessage(data.error || 'Failed to link correspondence record.', language)
        });
        return;
      }
      setDocumentLinks(prev => [data, ...prev]);
      setIsLinkFormOpen(false);
      setLinkTargetDocId('');
      setLinkNotes('');
      setActionFeedback({ type: 'success', text: `Linked dossier record (${linkType}).` });
    } catch {
      setActionFeedback({
        type: 'error',
        text: localizeErrorMessage('Network error while linking correspondence record.', language)
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDocumentLink = async (linkId: string) => {
    setActionFeedback(null);
    try {
      const res = await apiFetch(`/api/v1/correspondence/${doc.id}/links/${linkId}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setActionFeedback({
          type: 'error',
          text: localizeErrorMessage(err.error || 'Failed to unlink record.', language)
        });
        return;
      }
      setDocumentLinks(prev => prev.filter(item => item.link.id !== linkId));
      setPendingUnlinkId(null);
      setActionFeedback({ type: 'success', text: 'Cross-document dossier link removed.' });
    } catch {
      setActionFeedback({
        type: 'error',
        text: localizeErrorMessage('Network error while unlinking record.', language)
      });
    }
  };

  const handleOpenLinkedDocument = async (linkedDocId: string) => {
    const localDoc = documents.find(d => d.id === linkedDocId);
    if (localDoc) {
      setSelectedDocument(localDoc);
      return;
    }
    try {
      const res = await apiFetch(`/api/v1/correspondence/${linkedDocId}`);
      if (res.ok) {
        const fetched = await res.json();
        setSelectedDocument(fetched);
      } else {
        setActionFeedback({
          type: 'error',
          text: localizeErrorMessage('Unable to open linked record with current clearance.', language)
        });
      }
    } catch {
      setActionFeedback({
        type: 'error',
        text: localizeErrorMessage('Failed to load linked correspondence record.', language)
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="doc-detail-modal-title"
        className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-6 max-h-[90vh] flex flex-col"
      >
        {/* Modal Top Bar */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-950 flex items-center justify-center text-teal-800 dark:text-teal-300 font-mono font-bold text-xs">
              DOC
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span id="doc-detail-modal-title" className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
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
                Registered on {formatEthiopianDate(doc.registrationDate, language, true)}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Direct PKI Digital Sign / Attest Button */}
            {canSignDoc && (
              <button
                type="button"
                onClick={() => {
                  setActionFeedback(null);
                  setIsSignModalOpen(true);
                }}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-teal-700 hover:bg-teal-800 text-white inline-flex items-center gap-1 transition-colors"
                title="Apply RSA-SHA256 Digital Signature / Executive Attestation"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Sign / Attest</span>
              </button>
            )}

            {/* Draft Official Reply Button */}
            {!doc.isDeleted && canModifyLinks && (
              <button
                type="button"
                onClick={handleDraftReply}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 hover:bg-teal-100 inline-flex items-center gap-1 transition-colors"
                title="Draft an outgoing letter or memo linked as a reply to this correspondence"
              >
                <CornerUpLeft className="w-3.5 h-3.5" />
                <span>Draft Reply</span>
              </button>
            )}

            {/* Edit Button */}
            <button
              onClick={() => setIsEditOpen(true)}
              disabled={isImmutableRecord}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 inline-flex items-center gap-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title={isImmutableRecord ? 'Locked under Legal Hold or Disposed' : 'Edit Document Metadata'}
            >
              <Edit3 className="w-3.5 h-3.5 text-teal-600" />
              <span>{t('edit')}</span>
            </button>

            {/* Soft Delete / Cancel Button */}
            <button
              onClick={() => setIsSoftDeleteOpen(true)}
              disabled={isImmutableRecord}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 inline-flex items-center gap-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title={isImmutableRecord ? 'Locked under Legal Hold or Disposed' : 'Cancel / Soft-Delete Document'}
            >
              <Trash2 className="w-3.5 h-3.5 text-amber-600" />
              <span>{language === 'am' ? 'ሰነድ ሰርዝ' : 'Cancel Doc'}</span>
            </button>

            {/* SuperAdmin Permanent Hard Delete */}
            {currentUser?.role === 'SuperAdmin' && (
              <button
                onClick={() => setIsHardDeleteOpen(true)}
                disabled={isImmutableRecord}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 hover:bg-rose-100 inline-flex items-center gap-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title={isImmutableRecord ? 'Locked under Legal Hold or Disposed' : 'SuperAdmin Permanent Hard Delete'}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>Hard Delete</span>
              </button>
            )}

            {/* Legal Hold Toggle */}
            <button
              onClick={openLegalHoldModal}
              disabled={doc.status === 'Disposed'}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors inline-flex items-center gap-1 disabled:opacity-40 ${
                doc.legalHold
                  ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900'
                  : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
              }`}
              title="Apply or remove formal Legal Hold protection"
            >
              {doc.legalHold ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              <span>{doc.legalHold ? 'Remove Legal Hold' : 'Apply Legal Hold'}</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedDocument(null)}
              aria-label={t('close')}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs">
          {actionFeedback && (
            <div
              className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${
                actionFeedback.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300'
              }`}
            >
              <span>{actionFeedback.text}</span>
              <button
                type="button"
                onClick={() => setActionFeedback(null)}
                className="text-[11px] font-semibold hover:underline"
              >
                Dismiss
              </button>
            </div>
          )}
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
              <span>
                Retention:{' '}
                <strong className="font-mono text-slate-800 dark:text-slate-200 tabular-nums">
                  {doc.retentionYears === 0
                    ? 'Permanent'
                    : doc.retentionExpiryDate
                      ? formatEthiopianDate(doc.retentionExpiryDate, language)
                      : `${doc.retentionYears} yrs`}
                </strong>
              </span>
            </div>
          </div>

          {/* Legal Hold / Retention Governance Strip */}
          {(doc.legalHold || doc.retentionCategory) && (
            <div
              className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                doc.legalHold
                  ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900 text-rose-900 dark:text-rose-200'
                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 font-semibold">
                  {doc.legalHold ? <Lock className="w-4 h-4 text-rose-600" /> : <Clock className="w-4 h-4 text-teal-600" />}
                  <span>
                    {doc.legalHold
                      ? 'IMMUTABLE LEGAL HOLD ACTIVE — Edits, deletion & disposal blocked'
                      : `Retention Schedule: ${doc.retentionCategory || 'Standard Institutional Schedule'}`}
                  </span>
                </div>
                {doc.legalHold && doc.legalHoldReason && (
                  <p className="text-[11px] opacity-90">
                    Reason: {doc.legalHoldReason} {doc.legalHoldAppliedBy ? `(${doc.legalHoldAppliedBy})` : ''}
                  </p>
                )}
              </div>
              <span className="font-mono text-[11px] font-semibold shrink-0 tabular-nums">
                {doc.retentionYears === 0
                  ? '0 yrs · Permanent'
                  : `${doc.retentionYears} yrs · Exp ${doc.retentionExpiryDate?.slice(0, 10) || '-'}`}
              </span>
            </div>
          )}

          {/* Sensitive Record Biometric Protection Banner */}
          {isSensitiveRecord && (
            <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
              isBiometricUnlocked
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl shrink-0 ${
                  isBiometricUnlocked 
                    ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300' 
                    : 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300'
                }`}>
                  <Fingerprint className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-xs flex items-center gap-1.5">
                    <span>
                      {isBiometricUnlocked 
                        ? (language === 'am' ? 'የባዮሜትሪክ ማረጋገጫ ተከናውኗል — ሰነዱ ክፍት ነው' : 'Biometric Authentication Cleared') 
                        : (language === 'am' ? 'ሚስጥራዊ የህክምና ሰነድ — የባዮሜትሪክ ማረጋገጫ ይፈልጋል' : 'Sensitive Record — WebAuthn Biometric Protection Active')}
                    </span>
                    {isBiometricUnlocked && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                  </div>
                  <p className="text-[11px] opacity-80 mt-0.5">
                    {isBiometricUnlocked
                      ? (language === 'am' ? 'የጣት አሻራ / የፊት ገጽታ ማረጋገጫ ተረጋግጧል። ፋይሎችንና ውሳኔዎችን ማስተናገድ ይችላሉ።' : 'Hardware security assertion verified for this session. Dossier data and files unlocked.')
                      : (language === 'am' ? 'ደህንነቱ የተጠበቀ ሰነድ ነው። ዝርዝር መረጃዎችንና አባሪዎችን ለማየት የጣት አሻራዎን ይቃኙ።' : 'Confidential pharmaceutical tender & batch record guarded by FIDO2 platform biometrics.')}
                  </p>
                </div>
              </div>

              {!isBiometricUnlocked ? (
                <button
                  type="button"
                  onClick={() => setIsBiometricModalOpen(true)}
                  className="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center gap-1.5 shrink-0 self-start sm:self-auto transition-colors"
                >
                  <Fingerprint className="w-4 h-4" />
                  <span>{language === 'am' ? 'በጣት አሻራ / በFace ID ክፈት' : 'Unlock with Biometrics'}</span>
                </button>
              ) : (
                <span className="text-[10px] font-mono font-bold px-2 py-1 bg-emerald-100 dark:bg-emerald-900/60 rounded text-emerald-800 dark:text-emerald-200 shrink-0">
                  FIDO2 VERIFIED
                </span>
              )}
            </div>
          )}

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
              <div className="flex flex-wrap items-center justify-between gap-2 text-teal-800 dark:text-teal-300 font-semibold">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-teal-600" />
                  <span>Gemini Multimodal Document Intelligence</span>
                </span>
                <span className="font-mono text-[11px] tabular-nums text-teal-700 dark:text-teal-400">
                  Confidence {(doc.aiExtracted.confidence * 100).toFixed(0)}%
                  {doc.aiExtracted.lowConfidenceFlagged ? ' · Flagged Low Confidence' : ''}
                </span>
              </div>
              <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                {language === 'am' ? doc.aiExtracted.summaryAm : doc.aiExtracted.summaryEn}
              </p>
              {doc.aiExtracted.routingRecommendation && (
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  <strong>Routing Recommendation:</strong> {doc.aiExtracted.routingRecommendation}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-teal-100 dark:border-teal-900/40">
                <span>Category: <strong>{doc.aiExtracted.suggestedCategory}</strong></span>
                <span aria-hidden="true">·</span>
                <span>Assigned: <strong>{doc.aiExtracted.suggestedDepartment}</strong></span>
                {doc.aiExtracted.verifiedBy && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>Human Verified by <strong>{doc.aiExtracted.verifiedBy}</strong></span>
                  </>
                )}
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
                        onClick={() => setIsVerificationModalOpen(true)}
                        className="p-1 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Open Printable Cryptographic Verification Certificate"
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
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>Attached Digitized Documents ({doc.attachments.length})</span>
                {isSensitiveRecord && (
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${isBiometricUnlocked ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300' : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'}`}>
                    {isBiometricUnlocked ? 'Biometrically Unlocked' : 'Biometric Gated'}
                  </span>
                )}
              </h3>

              {(!isSensitiveRecord || isBiometricUnlocked) && !isImmutableRecord && (
                <button
                  type="button"
                  onClick={() => setIsAddAttachmentOpen(true)}
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-900 hover:bg-teal-100 inline-flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{language === 'am' ? 'ፋይል አያይዝ' : 'Add Attachment'}</span>
                </button>
              )}
            </div>

            {isSensitiveRecord && !isBiometricUnlocked ? (
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-amber-300 dark:border-amber-800/60 text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-700 dark:text-amber-400 mx-auto">
                  <Lock className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                    {language === 'am' ? 'የተያያዙ ሰነዶች በባዮሜትሪክ የተቆለፉ ናቸው' : 'Pharmaceutical Dossier Files Secured & Gated'}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    {language === 'am' 
                      ? 'የመድኃኒት አቅርቦት ትንተና፣ የፍተሻ ሰርተፊኬት እና የጨረታ ፋይሎች በባዮሜትሪክ የተጠበቁ ናቸው።'
                      : 'Direct access to emergency pharmaceutical dossiers, drug safety audits, and analytical records requires WebAuthn biometric clearance.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsBiometricModalOpen(true)}
                  className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-semibold text-xs inline-flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Fingerprint className="w-4 h-4" />
                  <span>{language === 'am' ? 'በጣት አሻራ ይክፈቱ' : 'Authenticate with Biometrics'}</span>
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {doc.attachments.length === 0 ? (
                  <div className="py-6 text-center text-slate-400 text-xs">
                    No attachments uploaded. Click "Add Attachment" to link digitized records.
                  </div>
                ) : (
                  doc.attachments.map((att) => (
                    <div key={att.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="w-4 h-4 text-teal-600 shrink-0" />
                        <div className="truncate">
                          <span className="font-medium text-slate-800 dark:text-slate-200 truncate block">{att.fileName}</span>
                          <span className="text-[11px] text-slate-400">
                            {(att.fileSize / 1024 / 1024).toFixed(2)} MB · Uploaded by {att.uploadedBy}
                            {att.notes ? ` · Note: ${att.notes}` : ''}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAttId(att.id);
                            setEditingAttNotes(att.notes || '');
                          }}
                          className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Edit Notes"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <a
                          href={att.fileUrl}
                          download={att.fileName}
                          className="p-1 text-slate-600 hover:text-teal-700 dark:text-slate-400 dark:hover:text-teal-300 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                          title="Download attachment"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                        {pendingDeleteAttId === att.id ? (
                          <div className="inline-flex items-center gap-1 ml-1">
                            <button
                              type="button"
                              onClick={() => handleDeleteAttachment(att.id)}
                              className="px-2 py-0.5 text-[11px] font-semibold bg-rose-600 text-white rounded"
                            >
                              Remove
                            </button>
                            <button
                              type="button"
                              onClick={() => setPendingDeleteAttId(null)}
                              className="px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setPendingDeleteAttId(att.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            title="Delete Attachment"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Phase 14: Case Dossier & Cross-Document Threading */}
          <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-teal-600" />
                <h3 className="font-bold text-slate-900 dark:text-slate-100">
                  Case Dossier & Linked Records ({documentLinks.length})
                </h3>
              </div>
              {canModifyLinks && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDraftReply}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 inline-flex items-center gap-1"
                  >
                    <CornerUpLeft className="w-3.5 h-3.5 text-teal-600" />
                    <span>Draft Reply Letter</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsLinkFormOpen(v => !v)}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-900 hover:bg-teal-100 inline-flex items-center gap-1"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    <span>{isLinkFormOpen ? 'Close' : 'Link Record'}</span>
                  </button>
                </div>
              )}
            </div>

            {isLinkFormOpen && (
              <form
                onSubmit={handleCreateDocumentLink}
                className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2.5"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Relationship Type
                    </label>
                    <select
                      value={linkType}
                      onChange={e => setLinkType(e.target.value as DocumentLinkType)}
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                    >
                      <option value="RelatedDossier">Related Dossier</option>
                      <option value="ReplyTo">Reply To</option>
                      <option value="ParentTender">Parent Tender</option>
                      <option value="Amends">Amends</option>
                      <option value="Supersedes">Supersedes</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Target Correspondence Record
                    </label>
                    <select
                      required
                      value={linkTargetDocId}
                      onChange={e => setLinkTargetDocId(e.target.value)}
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                    >
                      <option value="">Select correspondence to link...</option>
                      {documents
                        .filter(d => d.id !== doc.id && !d.isDeleted)
                        .map(candidate => (
                          <option key={candidate.id} value={candidate.id}>
                            {candidate.registrationNumber} — {candidate.subjectEn.slice(0, 70)}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="Optional dossier note (e.g. Tender award follow-up or amendment justification)..."
                    value={linkNotes}
                    onChange={e => setLinkNotes(e.target.value)}
                    className="flex-1 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting || !linkTargetDocId}
                    className="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-semibold text-xs disabled:opacity-50 shrink-0"
                  >
                    Create Link
                  </button>
                </div>
              </form>
            )}

            {linksLoading ? (
              <div className="py-4 text-center text-slate-400 text-xs">Loading dossier thread...</div>
            ) : documentLinks.length === 0 ? (
              <div className="py-4 text-center text-slate-400 text-xs">
                No cross-document links recorded yet. Click "Link Record" or "Draft Reply Letter" to build this case dossier.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {documentLinks.map(item => (
                  <div
                    key={item.link.id}
                    className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                          {item.link.linkType}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {item.direction === 'Outgoing' ? 'Outgoing Link' : 'Referenced By'}
                        </span>
                        <span className="font-mono tabular-nums font-bold text-slate-900 dark:text-slate-100">
                          {item.linkedDocument.registrationNumber}
                        </span>
                        <span className="font-mono tabular-nums text-[11px] text-slate-500">
                          ({item.linkedDocument.status})
                        </span>
                      </div>
                      <div className="font-medium text-slate-800 dark:text-slate-200 truncate">
                        {item.linkedDocument.subjectEn}
                      </div>
                      {item.link.notes && (
                        <div className="text-[11px] text-slate-500">{item.link.notes}</div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => handleOpenLinkedDocument(item.linkedDocument.id)}
                        className="px-2.5 py-1 text-[11px] font-semibold text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800 rounded-md hover:bg-teal-50 dark:hover:bg-teal-950/40 inline-flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Open Record</span>
                      </button>
                      {canModifyLinks &&
                        (pendingUnlinkId === item.link.id ? (
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDeleteDocumentLink(item.link.id)}
                              className="px-2 py-1 text-[11px] font-semibold bg-rose-600 text-white rounded"
                            >
                              Unlink
                            </button>
                            <button
                              type="button"
                              onClick={() => setPendingUnlinkId(null)}
                              className="px-1.5 py-1 text-[11px] text-slate-500"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setPendingUnlinkId(item.link.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            title="Remove dossier link"
                          >
                            <Unlink className="w-3.5 h-3.5" />
                          </button>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Workflow History / Minutes Trail */}
          <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-bold text-slate-900 dark:text-slate-100">
                Official Minutes & Workflow Progression
              </h3>
              <button
                type="button"
                onClick={() => setIsVerificationModalOpen(true)}
                className="text-[11px] font-semibold text-teal-700 dark:text-teal-400 hover:underline inline-flex items-center gap-1"
              >
                <FileKey2 className="w-3.5 h-3.5" />
                <span>Verify PKI Signatures ({activeSignaturesCount})</span>
              </button>
            </div>

            <div className="relative pl-6 space-y-4 before:content-[''] before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
              {doc.workflowHistory.map((step) => (
                <div key={step.id} className="relative space-y-1">
                  <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-teal-600 border-2 border-white dark:border-slate-900" />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-slate-100">{step.actorName}</span>
                    <span className="text-slate-400">({step.actorRole})</span>
                    <span className="text-slate-300">·</span>
                    <span className="font-semibold text-teal-700 dark:text-teal-400">{step.action}</span>
                    <span className="text-slate-300">·</span>
                    <span className="font-mono text-slate-400 tabular-nums">{formatEthiopianDate(step.timestamp, language, true)}</span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                    {step.comments}
                  </p>
                  {step.digitalSignature && (
                    <div
                      className={`p-2 rounded-lg border text-[11px] font-mono tabular-nums space-y-0.5 ${
                        step.digitalSignature.invalidated
                          ? 'text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900'
                          : 'text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900'
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-2 font-semibold">
                        <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {step.digitalSignature.invalidated ? 'Superseded PKI Seal' : 'RSA-SHA256 Signed'}:{' '}
                          {step.digitalSignature.certificateSerial}
                        </span>
                        {step.digitalSignature.biometricVerified && <span>· Step-Up MFA</span>}
                      </div>
                      {step.digitalSignature.signingMeaning && (
                        <div className="font-sans text-slate-700 dark:text-slate-300">
                          Intent: {step.digitalSignature.signingMeaning}
                        </div>
                      )}
                      {step.digitalSignature.documentDigestSha256 && (
                        <div className="text-[10px] opacity-80 truncate">
                          Digest: {step.digitalSignature.documentDigestSha256}
                        </div>
                      )}
                      {step.digitalSignature.invalidatedReason && (
                        <div className="font-sans text-[10px] font-semibold">
                          {step.digitalSignature.invalidatedReason}
                        </div>
                      )}
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

      {/* Edit Document Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-teal-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {language === 'am' ? 'የሰነድ መረጃ አሻሽል' : 'Edit Document Metadata'} – <span className="font-mono text-teal-700 dark:text-teal-400">{doc.registrationNumber}</span>
                </h3>
              </div>
              <button type="button" onClick={() => setIsEditOpen(false)} aria-label={t('close')} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateDocument} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Subject (English) *</label>
                  <input
                    type="text"
                    required
                    minLength={5}
                    maxLength={500}
                    value={editSubjectEn}
                    onChange={(e) => setEditSubjectEn(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Subject (Amharic)</label>
                  <input
                    type="text"
                    value={editSubjectAm}
                    onChange={(e) => setEditSubjectAm(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Sender Organization</label>
                  <input
                    type="text"
                    value={editSenderOrg}
                    onChange={(e) => setEditSenderOrg(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Recipient Organization</label>
                  <input
                    type="text"
                    value={editRecipientOrg}
                    onChange={(e) => setEditRecipientOrg(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Priority</label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Urgent">Urgent</option>
                    <option value="VeryUrgent">Very Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Confidentiality</label>
                  <select
                    value={editConfidentiality}
                    onChange={(e) => setEditConfidentiality(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  >
                    <option value="Public">Public</option>
                    <option value="Internal">Internal</option>
                    <option value="Confidential">Confidential</option>
                    <option value="Secret">Secret</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Assigned Directorate</label>
                  <select
                    value={editDeptId}
                    onChange={(e) => setEditDeptId(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.nameEn}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Due Date</label>
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">Description / Content Notes</label>
                  <textarea
                    rows={3}
                    value={editDescriptionEn}
                    onChange={(e) => setEditDescriptionEn(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              {activeSignaturesCount > 0 && (
                <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/70 dark:bg-amber-950/30 space-y-2.5">
                  <div className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                    <span>Signed Record Protection ({activeSignaturesCount} Active PKI Signature{activeSignaturesCount > 1 ? 's' : ''})</span>
                  </div>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300">
                    Modifying governed fields (subject, sender, recipient, confidentiality, or description) will supersede existing cryptographic signatures. Only SuperAdmin or DirectorGeneral may override with a mandatory reason.
                  </p>
                  {(currentUser?.role === 'SuperAdmin' || currentUser?.role === 'DirectorGeneral') && (
                    <div className="space-y-2 pt-1">
                      <label className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editOverrideSignedLock}
                          onChange={(e) => setEditOverrideSignedLock(e.target.checked)}
                          className="rounded border-slate-300 text-teal-600"
                        />
                        <span>Confirm Executive Signed-Lock Override (invalidates prior signatures)</span>
                      </label>
                      {editOverrideSignedLock && (
                        <input
                          type="text"
                          required
                          minLength={10}
                          value={editOverrideReason}
                          onChange={(e) => setEditOverrideReason(e.target.value)}
                          placeholder="Enter formal justification for modifying signed record (min 10 characters)..."
                          className="w-full p-2 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-800 rounded-lg text-slate-900 dark:text-slate-100"
                        />
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-semibold"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Soft Delete Modal */}
      {isSoftDeleteOpen && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-amber-600">
              <Trash2 className="w-5 h-5" />
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Cancel / Soft-Delete Document
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              This will change status to <strong>Cancelled</strong> and retain immutable audit history. Per EPSS policy, a cancellation justification is mandatory.
            </p>
            <form onSubmit={handleSoftDelete} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Cancellation Reason (min 10 characters) *
                </label>
                <textarea
                  required
                  minLength={10}
                  rows={3}
                  value={softDeleteReason}
                  onChange={(e) => setSoftDeleteReason(e.target.value)}
                  placeholder="State reason for soft deletion (e.g. Duplicate entry, retracted letter, superseded version)..."
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSoftDeleteOpen(false)}
                  className="px-3 py-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-semibold"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold shadow-xs"
                >
                  Confirm Soft Delete
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hard Delete Modal (SuperAdmin Only) */}
      {isHardDeleteOpen && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-rose-200 dark:border-rose-900 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Permanent Hard Delete (SuperAdmin)
              </h3>
            </div>
            <p className="text-xs text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 p-3 rounded-lg border border-rose-200 dark:border-rose-900 leading-relaxed">
              WARNING: This will permanently expunge record <strong>{doc.registrationNumber}</strong> from the database. This action cannot be undone.
            </p>
            <form onSubmit={handleHardDelete} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Type <strong>DELETE</strong> to confirm:
                </label>
                <input
                  type="text"
                  required
                  value={hardDeleteConfirmText}
                  onChange={(e) => setHardDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-rose-300 dark:border-rose-800 rounded-lg text-slate-900 dark:text-slate-100 font-mono"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsHardDeleteOpen(false)}
                  className="px-3 py-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-semibold"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={hardDeleteConfirmText !== 'DELETE' || isSubmitting}
                  className="px-3.5 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg font-semibold shadow-xs disabled:opacity-40"
                >
                  Purge Permanently
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Attachment Modal */}
      {isAddAttachmentOpen && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FilePlus className="w-5 h-5 text-teal-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Add Document Attachment
                </h3>
              </div>
              <button type="button" onClick={() => setIsAddAttachmentOpen(false)} aria-label={t('close')} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleAddAttachment} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  File Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. batch_certificate_cadila_2026.pdf"
                  value={newAttName}
                  onChange={(e) => setNewAttName(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Attachment Notes / Metadata
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Official signed lab certificate from EFDA..."
                  value={newAttNotes}
                  onChange={(e) => setNewAttNotes(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddAttachmentOpen(false)}
                  className="px-3 py-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-semibold"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-semibold shadow-xs"
                >
                  Upload & Attach
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Attachment Note Modal */}
      {editingAttId && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Update Attachment Metadata
            </h3>
            <textarea
              rows={3}
              value={editingAttNotes}
              onChange={(e) => setEditingAttNotes(e.target.value)}
              placeholder="Enter updated notes or description for this attachment..."
              className="w-full p-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingAttId(null)}
                className="px-3 py-1 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-semibold"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={() => handleUpdateAttachmentNotes(editingAttId)}
                className="px-3 py-1 text-xs bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-semibold"
              >
                Save Notes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verification Status Modal */}
      <VerificationStatusModal
        document={doc}
        isOpen={isVerificationModalOpen}
        onClose={() => setIsVerificationModalOpen(false)}
        language={language}
      />

      {/* Legal Hold Reason Modal */}
      {isLegalHoldModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                {doc.legalHold ? <Unlock className="w-4 h-4 text-amber-600" /> : <Lock className="w-4 h-4 text-rose-600" />}
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {doc.legalHold ? 'Remove Legal Hold' : 'Apply Legal Hold'} — {doc.registrationNumber}
                </h3>
              </div>
              <button type="button" onClick={() => setIsLegalHoldModalOpen(false)} aria-label={t('close')} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {legalHoldError && (
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-lg text-xs text-rose-700 dark:text-rose-300">
                {legalHoldError}
              </div>
            )}

            <form onSubmit={handleSubmitLegalHold} className="space-y-3 text-xs">
              <p className="text-slate-600 dark:text-slate-400">
                {doc.legalHold
                  ? 'Confirm lifting Legal Hold protection. Standard retention and disposal controls will resume.'
                  : 'Documents under Legal Hold cannot be edited, deleted, or disposed during regulatory audits or litigation.'}
              </p>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Formal Justification Reason (min 20 chars) <span className="text-rose-600">*</span>
                  </label>
                  <span className={`font-mono text-[11px] tabular-nums ${legalHoldReasonInput.trim().length >= 20 ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {legalHoldReasonInput.trim().length}/20
                  </span>
                </div>
                <textarea
                  rows={3}
                  required
                  minLength={20}
                  value={legalHoldReasonInput}
                  onChange={(e) => setLegalHoldReasonInput(e.target.value)}
                  placeholder="Cite audit case reference, EFDA directive, or legal notice requiring hold action..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsLegalHoldModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 dark:text-slate-400 font-semibold"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-4 py-1.5 text-white rounded-lg font-semibold ${
                    doc.legalHold ? 'bg-amber-600 hover:bg-amber-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {isSubmitting ? 'Saving...' : doc.legalHold ? 'Confirm Release' : 'Confirm Legal Hold'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Direct PKI Signing / Executive Attestation Modal */}
      {isSignModalOpen && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-teal-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Apply Electronic PKI Signature
                  </h3>
                  <p className="text-[11px] font-mono text-slate-500">{doc.registrationNumber}</p>
                </div>
              </div>
              <button type="button" onClick={() => setIsSignModalOpen(false)} aria-label={t('close')} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            {!activeCertificate ? (
              <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 space-y-2">
                <p className="font-semibold">No active RSA-2048 signing certificate found for your account.</p>
                <button
                  type="button"
                  onClick={handleIssueMyCert}
                  disabled={isIssuingCert}
                  className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-semibold"
                >
                  {isIssuingCert ? 'Issuing Certificate...' : 'Issue Active EPSS Certificate'}
                </button>
              </div>
            ) : (
              <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/60 dark:bg-emerald-950/30 space-y-1 font-mono text-[11px] tabular-nums">
                <div className="font-bold text-emerald-800 dark:text-emerald-300">
                  ACTIVE CERT: {activeCertificate.serialNumber}
                </div>
                <div className="text-slate-600 dark:text-slate-400">
                  {activeCertificate.algorithm} ({activeCertificate.keySizeBits}-bit) · Exp {activeCertificate.expiresAt.slice(0, 10)}
                </div>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                executeDirectSign(false);
              }}
              className="space-y-3"
            >
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Signature Intent / Official Meaning
                </label>
                <select
                  value={signMeaning}
                  onChange={(e) => setSignMeaning(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                >
                  <option value="Executive Counter-Signature & Attestation">Executive Counter-Signature & Attestation</option>
                  <option value="Approved for Official Issuance">Approved for Official Issuance</option>
                  <option value="Legal & Regulatory Compliance Verified">Legal & Regulatory Compliance Verified</option>
                  <option value="Cold-Chain Quality Clearance">Cold-Chain Quality Clearance</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Step-Up Officer Security PIN (Required for Sensitive Records if WebAuthn not elevated)
                </label>
                <input
                  type="password"
                  maxLength={8}
                  value={signStepUpPin}
                  onChange={(e) => setSignStepUpPin(e.target.value)}
                  placeholder="Enter Officer PIN or verify via Biometrics"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Attestation Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={signComments}
                  onChange={(e) => setSignComments(e.target.value)}
                  placeholder="Record attestation context or compliance statement..."
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSignModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 dark:text-slate-400 font-semibold"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !activeCertificate}
                  className="px-4 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-semibold disabled:opacity-40"
                >
                  {isSubmitting ? 'Signing...' : 'Sign with RSA-SHA256'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Biometric Verification Modal */}
      <BiometricVerificationModal
        isOpen={isBiometricModalOpen}
        onClose={() => {
          setPendingBioSignRetry(false);
          setIsBiometricModalOpen(false);
        }}
        onVerified={() => {
          setIsBiometricUnlocked(true);
          setIsBiometricModalOpen(false);
          if (pendingBioSignRetry) {
            setPendingBioSignRetry(false);
            executeDirectSign(true);
          }
        }}
        documentTitle={doc.subjectEn}
        registrationNumber={doc.registrationNumber}
        confidentialityLevel={doc.confidentiality}
        actionReason={
          pendingBioSignRetry
            ? 'Step-Up Biometric Confirmation for RSA-SHA256 Digital Signature'
            : 'Unlock Confidential Pharmaceutical Record & Authorize Minutes'
        }
      />
    </div>
  );
};
