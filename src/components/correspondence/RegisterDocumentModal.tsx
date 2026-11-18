import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Sparkles,
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ScanText,
  ArrowUpRight,
  Check,
  ShieldAlert,
  BookmarkPlus,
  CornerUpLeft,
  Trash2,
  Layers
} from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import { apiFetch } from '../../lib/apiFetch.js';
import { localizeErrorMessage } from '../../lib/localizedErrors.js';
import { useEscapeKey } from '../../lib/useEscapeKey.js';
import {
  ConfidentialityLevel,
  CorrespondenceTemplate,
  DocumentType,
  DuplicateMatch,
  OcrExtractionResult,
  PriorityLevel,
  RegulatoryCategory,
  RetentionCalculationResult
} from '../../types/index.js';

export const RegisterDocumentModal: React.FC = () => {
  const {
    isRegisterModalOpen,
    setIsRegisterModalOpen,
    registerModalType,
    replyToDocument,
    clearReplyContext,
    branches,
    departments,
    documents,
    currentUser,
    refreshData,
    setSelectedDocument,
    language,
    t
  } = useApp();

  const [docType, setDocType] = useState<DocumentType>(registerModalType || 'IncomingLetter');
  const [subjectEn, setSubjectEn] = useState('');
  const [subjectAm, setSubjectAm] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [descriptionAm, setDescriptionAm] = useState('');
  const [senderOrg, setSenderOrg] = useState('');
  const [senderPerson, setSenderPerson] = useState('');
  const [recipientOrg, setRecipientOrg] = useState('Ethiopian Pharmaceutical Supply Service (EPSS)');
  const [recipientPerson, setRecipientPerson] = useState('');
  const [refNumber, setRefNumber] = useState('');
  const [receivedDate, setReceivedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [priority, setPriority] = useState<PriorityLevel>('Normal');
  const [confidentiality, setConfidentiality] = useState<ConfidentialityLevel>('Internal');
  const [regulatoryCategory, setRegulatoryCategory] = useState<RegulatoryCategory | ''>('');
  const [retentionPreview, setRetentionPreview] = useState<RetentionCalculationResult | null>(null);
  const [targetBranchId, setTargetBranchId] = useState('br-hq');
  const [targetDeptId, setTargetDeptId] = useState(departments[0]?.id || 'dept-proc');
  const [dueDate, setDueDate] = useState('');
  const [roomLocation, setRoomLocation] = useState('Room G-04 (Intake Vault)');
  const [shelfLocation, setShelfLocation] = useState('Rack 2 - Shelf B');
  const [boxLocation, setBoxLocation] = useState('BOX-2026-MED');
  const [uploadedScanFile, setUploadedScanFile] = useState<File | null>(null);
  const [sampleFileName, setSampleFileName] = useState('official_signed_letter_scan.pdf');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Phase 8 OCR & AI Human-in-the-Loop Verification State
  const [aiTextPrompt, setAiTextPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [ocrExtraction, setOcrExtraction] = useState<OcrExtractionResult | null>(null);
  const [verifiedAiPayload, setVerifiedAiPayload] = useState<any>(null);
  const [acceptedMap, setAcceptedMap] = useState<Record<string, boolean>>({
    subjectEn: true,
    subjectAm: true,
    senderOrg: true,
    referenceNumber: true,
    department: true,
    priority: true,
    summary: true
  });
  const [editableAiDraft, setEditableAiDraft] = useState<{
    subjectEn: string;
    subjectAm: string;
    senderOrg: string;
    referenceNumber: string;
    departmentId: string;
    priority: PriorityLevel;
    summaryEn: string;
    summaryAm: string;
  } | null>(null);

  // Phase 8 Duplicate Detection State
  const [duplicateMatches, setDuplicateMatches] = useState<DuplicateMatch[]>([]);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);

  // Phase 14 Official Bilingual Templates & Reply Threading State
  const [templates, setTemplates] = useState<CorrespondenceTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isSaveTemplateOpen, setIsSaveTemplateOpen] = useState(false);
  const [newTemplateNameEn, setNewTemplateNameEn] = useState('');
  const [newTemplateNameAm, setNewTemplateNameAm] = useState('');
  const [newTemplateCategory, setNewTemplateCategory] = useState('Institutional Standard');
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [pendingDeleteTemplateId, setPendingDeleteTemplateId] = useState<string | null>(null);

  const [formError, setFormError] = useState('');
  const [formBanner, setFormBanner] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (registerModalType) {
      setDocType(registerModalType);
    }
  }, [registerModalType]);

  useEffect(() => {
    if (!isRegisterModalOpen) return;
    apiFetch('/api/v1/correspondence/templates')
      .then((r) => (r.ok ? r.json() : []))
      .then((list: CorrespondenceTemplate[]) => {
        if (Array.isArray(list)) setTemplates(list);
      })
      .catch(() => {});
  }, [isRegisterModalOpen]);

  useEffect(() => {
    if (!isRegisterModalOpen) return;
    const timer = setTimeout(() => {
      apiFetch('/api/v1/records/retention/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: docType,
          subjectEn,
          subjectAm,
          descriptionEn,
          senderOrganization: senderOrg,
          confidentiality,
          regulatoryCategory: regulatoryCategory || undefined,
          tags: [docType, priority],
          registrationDate: receivedDate ? new Date(receivedDate).toISOString() : new Date().toISOString()
        })
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data: RetentionCalculationResult | null) => {
          if (data) setRetentionPreview(data);
        })
        .catch(() => {});
    }, 220);
    return () => clearTimeout(timer);
  }, [
    isRegisterModalOpen,
    docType,
    subjectEn,
    subjectAm,
    descriptionEn,
    senderOrg,
    confidentiality,
    regulatoryCategory,
    priority,
    receivedDate
  ]);

  useEffect(() => {
    if (!isRegisterModalOpen || !replyToDocument) return;
    const replyDocType: DocumentType = replyToDocument.type === 'InternalMemo' ? 'InternalMemo' : 'OutgoingLetter';
    setDocType(replyDocType);
    setSubjectEn(
      replyToDocument.subjectEn.startsWith('Re:')
        ? replyToDocument.subjectEn
        : `Re: ${replyToDocument.subjectEn}`.slice(0, 500)
    );
    setSubjectAm(
      replyToDocument.subjectAm
        ? `መልስ፡ ${replyToDocument.subjectAm}`.slice(0, 500)
        : `Re: ${replyToDocument.subjectEn}`.slice(0, 500)
    );
    setSenderOrg(
      replyToDocument.recipientOrganization || 'Ethiopian Pharmaceutical Supply Service (EPSS)'
    );
    setRecipientOrg(replyToDocument.senderOrganization || '');
    setPriority(replyToDocument.priority || 'Normal');
    setConfidentiality(replyToDocument.confidentiality || 'Internal');
    if (replyToDocument.branchId) setTargetBranchId(replyToDocument.branchId);
    if (replyToDocument.departmentId) setTargetDeptId(replyToDocument.departmentId);
    setDescriptionEn(
      `Official institutional response referencing ${replyToDocument.registrationNumber} (External Ref: ${replyToDocument.referenceNumber}).`
    );
    setFormBanner(`Reply threading active for ${replyToDocument.registrationNumber}. A ReplyTo dossier link will be created automatically.`);
  }, [isRegisterModalOpen, replyToDocument]);

  useEscapeKey(isDuplicateModalOpen, () => setIsDuplicateModalOpen(false));
  useEscapeKey(isRegisterModalOpen && !isDuplicateModalOpen, () => setIsRegisterModalOpen(false));

  if (!isRegisterModalOpen) return null;

  const handleOcrAndAiExtract = async () => {
    if (!uploadedScanFile && !aiTextPrompt.trim() && !subjectEn.trim()) {
      setFormError(
        language === 'am'
          ? 'OCR እና የAI መረጃ ማውጣት ከመጀመርዎ በፊት የተቃኘ ደብዳቤ ይጫኑ ወይም የደብዳቤ ጽሑፍ ያስገቡ።'
          : 'Upload a scanned letter (PDF/PNG/JPG) or enter letter text before running OCR & AI extraction.'
      );
      return;
    }

    setFormError('');
    setFormBanner('');

    try {
      setIsAiLoading(true);
      let res: Response;
      if (uploadedScanFile) {
        const fd = new FormData();
        fd.append('file', uploadedScanFile);
        if (aiTextPrompt.trim()) fd.append('rawText', aiTextPrompt.trim());
        if (subjectEn.trim()) fd.append('subject', subjectEn.trim());
        res = await apiFetch('/api/v1/ai/ocr-extract', {
          method: 'POST',
          body: fd
        });
      } else {
        res = await apiFetch('/api/v1/ai/ocr-extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rawText: aiTextPrompt || descriptionEn,
            subject: subjectEn
          })
        });
      }

      const data: OcrExtractionResult & { error?: string } = await res.json();
      if (!res.ok) {
        setFormError(localizeErrorMessage(data.error || 'OCR & AI extraction failed.', language));
        return;
      }

      // IMPORTANT RULE: Never auto-apply AI suggestions! Populate side-by-side review panel only.
      setOcrExtraction(data);
      setEditableAiDraft({
        subjectEn: data.suggestedSubjectEn || '',
        subjectAm: data.suggestedSubjectAm || '',
        senderOrg: data.suggestedSenderOrg || '',
        referenceNumber: data.suggestedReferenceNumber || '',
        departmentId: data.suggestedDepartmentId || targetDeptId,
        priority: data.suggestedPriority || 'Normal',
        summaryEn: data.summaryEn || '',
        summaryAm: data.summaryAm || ''
      });
      setAcceptedMap({
        subjectEn: Boolean(data.suggestedSubjectEn),
        subjectAm: Boolean(data.suggestedSubjectAm),
        senderOrg: Boolean(data.suggestedSenderOrg),
        referenceNumber: Boolean(data.suggestedReferenceNumber),
        department: Boolean(data.suggestedDepartmentId),
        priority: true,
        summary: Boolean(data.summaryEn)
      });
      setFormBanner('OCR & AI extraction ready below. Review side-by-side and accept fields explicitly before saving.');
    } catch (err) {
      console.error(err);
      setFormError(
        language === 'am'
          ? 'የOCR እና የAI መረጃ ማውጫ አገልግሎትን ማግኘት አልተቻለም።'
          : 'Failed to contact OCR & AI extraction service.'
      );
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAcceptAiSuggestions = async () => {
    if (!ocrExtraction || !editableAiDraft) return;
    const appliedFields: string[] = [];

    if (acceptedMap.subjectEn && editableAiDraft.subjectEn.trim()) {
      setSubjectEn(editableAiDraft.subjectEn.trim());
      appliedFields.push('subjectEn');
    }
    if (acceptedMap.subjectAm && editableAiDraft.subjectAm.trim()) {
      setSubjectAm(editableAiDraft.subjectAm.trim());
      appliedFields.push('subjectAm');
    }
    if (acceptedMap.senderOrg && editableAiDraft.senderOrg.trim()) {
      setSenderOrg(editableAiDraft.senderOrg.trim());
      appliedFields.push('senderOrganization');
    }
    if (acceptedMap.referenceNumber && editableAiDraft.referenceNumber.trim()) {
      setRefNumber(editableAiDraft.referenceNumber.trim());
      appliedFields.push('referenceNumber');
    }
    if (acceptedMap.department && editableAiDraft.departmentId) {
      setTargetDeptId(editableAiDraft.departmentId);
      appliedFields.push('departmentId');
    }
    if (acceptedMap.priority) {
      setPriority(editableAiDraft.priority);
      appliedFields.push('priority');
    }
    if (acceptedMap.summary && editableAiDraft.summaryEn.trim()) {
      setDescriptionEn(editableAiDraft.summaryEn.trim());
      setDescriptionAm(editableAiDraft.summaryAm.trim());
      appliedFields.push('summary');
    }

    const editedByHuman =
      editableAiDraft.subjectEn !== ocrExtraction.suggestedSubjectEn ||
      editableAiDraft.senderOrg !== ocrExtraction.suggestedSenderOrg ||
      editableAiDraft.referenceNumber !== ocrExtraction.suggestedReferenceNumber;

    setVerifiedAiPayload({
      summaryEn: editableAiDraft.summaryEn,
      summaryAm: editableAiDraft.summaryAm,
      suggestedCategory: ocrExtraction.suggestedCategory,
      suggestedDepartment: ocrExtraction.suggestedDepartment,
      confidence: ocrExtraction.ocrConfidence,
      ocrTextEn: ocrExtraction.rawTextEn,
      ocrTextAm: ocrExtraction.rawTextAm,
      ocrConfidence: ocrExtraction.ocrConfidence,
      lowConfidenceFlagged: ocrExtraction.lowConfidenceFlagged,
      routingRecommendation: ocrExtraction.routingRecommendation,
      verifiedBy: currentUser?.fullNameEn,
      verifiedAt: new Date().toISOString(),
      acceptedFields: appliedFields
    });

    await apiFetch('/api/v1/ai/verify-suggestion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        extractionId: ocrExtraction.extractionId,
        acceptedFields: appliedFields,
        editedByHuman,
        outcome: 'accepted'
      })
    }).catch(() => {});

    setOcrExtraction(null);
    setEditableAiDraft(null);
    setFormBanner(`Applied ${appliedFields.length} human-verified field(s) into the registration form.`);
  };

  const handleDiscardAiSuggestions = async () => {
    if (ocrExtraction) {
      await apiFetch('/api/v1/ai/verify-suggestion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extractionId: ocrExtraction.extractionId,
          acceptedFields: [],
          outcome: 'discarded'
        })
      }).catch(() => {});
    }
    setOcrExtraction(null);
    setEditableAiDraft(null);
  };

  const runDuplicateCheck = async (showModalIfClean = false): Promise<DuplicateMatch[]> => {
    try {
      setIsCheckingDuplicates(true);
      const res = await apiFetch('/api/v1/documents/check-duplicates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: docType,
          referenceNumber: refNumber,
          subjectEn,
          subjectAm,
          descriptionEn,
          senderOrganization: senderOrg,
          ocrTextEn: verifiedAiPayload?.ocrTextEn || ocrExtraction?.rawTextEn || ''
        })
      });
      if (!res.ok) return [];
      const data = await res.json();
      const matches: DuplicateMatch[] = Array.isArray(data.matches) ? data.matches : [];
      if (matches.length > 0) {
        setDuplicateMatches(matches);
        setIsDuplicateModalOpen(true);
      } else if (showModalIfClean) {
        setFormBanner('No duplicate reference numbers, content hashes, or matching subjects found.');
      }
      return matches;
    } catch {
      return [];
    } finally {
      setIsCheckingDuplicates(false);
    }
  };

  const submitRegistration = async (confirmDuplicate: boolean) => {
    try {
      setIsSubmitting(true);
      setFormError('');
      const selectedDeptObj = departments.find((d) => d.id === targetDeptId);

      const payload = {
        type: docType,
        subjectEn,
        subjectAm: subjectAm || subjectEn,
        descriptionEn,
        descriptionAm: descriptionAm || verifiedAiPayload?.summaryAm || '',
        senderOrganization: senderOrg || (docType === 'OutgoingLetter' ? 'EPSS' : 'External Ministry/Supplier'),
        senderPerson,
        recipientOrganization: recipientOrg,
        recipientPerson,
        referenceNumber: refNumber || `REF-${Math.floor(1000 + Math.random() * 9000)}`,
        receivedDate: receivedDate ? new Date(receivedDate).toISOString() : undefined,
        priority,
        confidentiality,
        regulatoryCategory: regulatoryCategory || undefined,
        branchId: targetBranchId,
        departmentId: targetDeptId,
        assignedDepartmentName: selectedDeptObj?.nameEn || 'Designated Directorate',
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        confirmDuplicate,
        ocrTextEn: verifiedAiPayload?.ocrTextEn || '',
        ocrTextAm: verifiedAiPayload?.ocrTextAm || '',
        ocrConfidence: verifiedAiPayload?.ocrConfidence,
        physicalTracking: {
          fileCode: `EPSS-PHY-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
          building: targetBranchId === 'br-hq' ? 'Block B - Central Archive' : 'Regional Branch Warehouse',
          floor: 'Ground Floor',
          room: roomLocation,
          shelfNumber: shelfLocation,
          boxNumber: boxLocation,
          currentCustodianId: currentUser?.id || 'usr-reg',
          currentCustodianName: currentUser?.fullNameEn || 'Selamawit Bekele',
          lastMovedDate: new Date().toISOString(),
          movementsCount: 1
        },
        attachments: [
          {
            id: `att-${Date.now()}`,
            fileName: uploadedScanFile?.name || sampleFileName,
            fileSize: uploadedScanFile?.size || 1850400,
            mimeType: uploadedScanFile?.type || 'application/pdf',
            uploadDate: new Date().toISOString(),
            uploadedBy: currentUser?.fullNameEn || 'Registry Officer',
            fileUrl: '/assets/sample-docs/registered_document.pdf',
            version: 1
          }
        ],
        tags: [docType, 'EPSS-2026', priority],
        aiExtracted: verifiedAiPayload || undefined,
        replyToDocumentId: replyToDocument?.id || undefined,
        linkType: replyToDocument ? 'ReplyTo' : undefined,
        replyNotes: replyToDocument ? `Direct reply drafted from ${replyToDocument.registrationNumber}` : undefined
      };

      const res = await apiFetch('/api/v1/correspondence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.status === 409 && Array.isArray(data.duplicates)) {
        setDuplicateMatches(data.duplicates);
        setIsDuplicateModalOpen(true);
        return;
      }
      if (!res.ok) {
        setFormError(localizeErrorMessage(data.error || 'Failed to register correspondence.', language));
        return;
      }

      await refreshData();
      setIsDuplicateModalOpen(false);
      setIsRegisterModalOpen(false);
      setSelectedDocument(data);
    } catch (err) {
      console.error(err);
      setFormError(
        language === 'am'
          ? 'ደብዳቤውን መመዝገብ አልተቻለም። እባክዎ ዳግም ይሞክሩ።'
          : 'Failed to register correspondence.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (ocrExtraction) {
      setFormError(
        language === 'am'
          ? 'ከመመዝገብዎ በፊት በOCR/AI የተለየውን ረቂቅ ይገምግሙ እና ይቀበሉ ወይም ይሰርዙ።'
          : 'Please review & accept or discard the pending OCR/AI extraction draft before registering.'
      );
      return;
    }

    if (subjectEn.trim().length < 5) {
      setFormError(
        language === 'am'
          ? 'ርዕስ (እንግሊዝኛ) ቢያንስ 5 ፊደላት መሆን አለበት።'
          : 'Subject (English) must be at least 5 characters.'
      );
      return;
    }

    if (refNumber.trim().length < 2) {
      setFormError(
        language === 'am'
          ? 'የውጭ / የመምሪያ ማጣቀሻ ቁጥር ቢያንስ 2 ፊደላት መሆን አለበት።'
          : 'Reference number must be at least 2 characters.'
      );
      return;
    }

    if (docType === 'IncomingLetter' && !senderOrg.trim()) {
      setFormError(
        language === 'am'
          ? 'ለገቢ ደብዳቤ የላኪ ተቋም መግለጽ ግዴታ ነው።'
          : 'Sender organization is required for an Incoming Letter.'
      );
      return;
    }

    if (docType === 'OutgoingLetter' && !recipientOrg.trim()) {
      setFormError(
        language === 'am'
          ? 'ለወጪ ደብዳቤ የተቀባይ ተቋም መግለጽ ግዴታ ነው።'
          : 'Recipient organization is required for an Outgoing Letter.'
      );
      return;
    }

    if (receivedDate) {
      const todayUtc = new Date().toISOString().slice(0, 10);
      if (receivedDate > todayUtc) {
        setFormError(
          language === 'am'
            ? 'የተቀበለበት / የደብዳቤ ቀን ከዛሬ በኋላ ሊሆን አይችልም።'
            : 'Received / letter date cannot be in the future.'
        );
        return;
      }
    }

    const matches = await runDuplicateCheck(false);
    if (matches.length > 0) {
      return;
    }

    await submitRegistration(false);
  };

  const applyStoredTemplate = (tpl: CorrespondenceTemplate) => {
    setSelectedTemplateId(tpl.id);
    if (!replyToDocument) {
      setDocType(tpl.type);
      if (tpl.defaultSenderOrg) setSenderOrg(tpl.defaultSenderOrg);
      if (tpl.defaultRecipientOrg) setRecipientOrg(tpl.defaultRecipientOrg);
    }
    setPriority(tpl.defaultPriority);
    setConfidentiality(tpl.defaultConfidentiality);
    setSubjectEn(tpl.subjectEnTemplate);
    setSubjectAm(tpl.subjectAmTemplate || tpl.subjectEnTemplate);
    setDescriptionEn(tpl.bodyEnTemplate);
    setDescriptionAm(tpl.bodyAmTemplate || tpl.bodyEnTemplate);
    if (tpl.defaultDepartmentId && departments.some((d) => d.id === tpl.defaultDepartmentId)) {
      setTargetDeptId(tpl.defaultDepartmentId);
    }
    setFormBanner(`Applied template "${language === 'am' ? tpl.nameAm : tpl.nameEn}".`);
  };

  const handleSaveAsTemplate = async () => {
    setFormError('');
    if (newTemplateNameEn.trim().length < 3) {
      setFormError(
        language === 'am'
          ? 'የቅጹ ስም (እንግሊዝኛ) ቢያንስ 3 ፊደላት መሆን አለበት።'
          : 'Template name (English) must be at least 3 characters.'
      );
      return;
    }
    if (subjectEn.trim().length < 5 || descriptionEn.trim().length < 5) {
      setFormError(
        language === 'am'
          ? 'ቅጽ አድርገው ከማስቀመጥዎ በፊት ርዕስ (እንግሊዝኛ) እና ዝርዝር መግለጫ (እያንዳንዳቸው ቢያንስ 5 ፊደላት) ይሙሉ።'
          : 'Fill in Subject (English) and Detailed Description (at least 5 characters each) before saving as a template.'
      );
      return;
    }

    try {
      setIsSavingTemplate(true);
      const res = await apiFetch('/api/v1/correspondence/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nameEn: newTemplateNameEn.trim(),
          nameAm: newTemplateNameAm.trim() || newTemplateNameEn.trim(),
          type: docType,
          category: newTemplateCategory.trim() || 'Institutional Custom',
          defaultPriority: priority,
          defaultConfidentiality: confidentiality,
          defaultSenderOrg: senderOrg.trim() || undefined,
          defaultRecipientOrg: recipientOrg.trim() || undefined,
          defaultDepartmentId: targetDeptId,
          subjectEnTemplate: subjectEn.trim(),
          subjectAmTemplate: (subjectAm || subjectEn).trim(),
          bodyEnTemplate: descriptionEn.trim(),
          bodyAmTemplate: (descriptionAm || descriptionEn).trim()
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(localizeErrorMessage(data.error || 'Failed to save correspondence template.', language));
        return;
      }
      setTemplates((prev) => [data, ...prev]);
      setSelectedTemplateId(data.id);
      setIsSaveTemplateOpen(false);
      setNewTemplateNameEn('');
      setNewTemplateNameAm('');
      setFormBanner(`Saved custom bilingual template "${data.nameEn}".`);
    } catch {
      setFormError(localizeErrorMessage('Network error while saving template.', language));
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    setFormError('');
    try {
      const res = await apiFetch(`/api/v1/correspondence/templates/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(localizeErrorMessage(data.error || 'Failed to delete correspondence template.', language));
        return;
      }
      setTemplates((prev) => prev.filter((tpl) => tpl.id !== id));
      if (selectedTemplateId === id) setSelectedTemplateId('');
      setPendingDeleteTemplateId(null);
      setFormBanner('Correspondence template removed.');
    } catch {
      setFormError(localizeErrorMessage('Network error while deleting template.', language));
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="register-modal-title"
        className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-4 max-h-[94vh] flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/40">
          <div>
            <h2 id="register-modal-title" className="text-base font-bold text-slate-900 dark:text-slate-100">
              {language === 'am' ? 'አዲስ ይፋዊ ሰነድ ምዝገባ' : 'Official Correspondence Registration'}
            </h2>
            <p className="text-xs text-slate-500">
              EPSS Central Registry · Bilingual OCR Extraction · Duplicate Detection
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsRegisterModalOpen(false)}
            aria-label={t('close')}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
              <button type="button" onClick={() => setFormError('')}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {formBanner && (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{formBanner}</span>
              </div>
              <button type="button" onClick={() => setFormBanner('')}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Reply Threading Context Banner */}
          {replyToDocument && (
            <div className="p-3.5 rounded-xl bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <CornerUpLeft className="w-4 h-4 text-teal-700 dark:text-teal-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="font-bold text-teal-900 dark:text-teal-200 flex items-center gap-2">
                    <span>Drafting Official Reply</span>
                    <span className="font-mono tabular-nums text-[11px] px-1.5 py-0.5 rounded bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200">
                      ReplyTo → {replyToDocument.registrationNumber}
                    </span>
                  </div>
                  <p className="text-[11px] text-teal-800/80 dark:text-teal-300/80 truncate mt-0.5">
                    {replyToDocument.subjectEn}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={clearReplyContext}
                className="px-2.5 py-1 text-[11px] font-semibold bg-white dark:bg-slate-900 border border-teal-200 dark:border-teal-800 text-slate-700 dark:text-slate-300 rounded-md hover:bg-slate-50"
              >
                Clear Reply Link
              </button>
            </div>
          )}

          {/* Official Bilingual Templates Library (API-Backed) */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                <Layers className="w-3.5 h-3.5 text-teal-600" />
                <span>
                  {language === 'am'
                    ? 'ይፋዊ የሁለት ቋንቋ የደብዳቤ ቅጾች'
                    : `Official Bilingual Templates (${templates.length})`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsSaveTemplateOpen((v) => !v)}
                className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-[11px] font-semibold text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/30 inline-flex items-center gap-1"
              >
                <BookmarkPlus className="w-3.5 h-3.5" />
                <span>{isSaveTemplateOpen ? 'Close' : 'Save Draft as Template'}</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {templates.map((tpl) => {
                const isSelected = selectedTemplateId === tpl.id;
                const canDelete = !tpl.isSystemDefault || currentUser?.role === 'SuperAdmin';
                return (
                  <div
                    key={tpl.id}
                    className={`inline-flex items-center rounded-md border text-[11px] overflow-hidden ${
                      isSelected
                        ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/50 text-teal-900 dark:text-teal-200'
                        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => applyStoredTemplate(tpl)}
                      className="px-2.5 py-1 font-medium hover:bg-teal-50/70 dark:hover:bg-teal-950/40 transition-colors text-left"
                      title={`${tpl.category} · ${tpl.type}`}
                    >
                      {language === 'am' ? tpl.nameAm : tpl.nameEn}
                    </button>
                    {canDelete &&
                      (pendingDeleteTemplateId === tpl.id ? (
                        <div className="inline-flex items-center gap-1 pr-1.5 border-l border-slate-200 dark:border-slate-700 pl-1.5">
                          <button
                            type="button"
                            onClick={() => handleDeleteTemplate(tpl.id)}
                            className="text-[10px] font-bold text-rose-600 hover:underline"
                          >
                            Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingDeleteTemplateId(null)}
                            className="text-[10px] text-slate-400 hover:text-slate-600"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setPendingDeleteTemplateId(tpl.id)}
                          className="px-1.5 py-1 text-slate-400 hover:text-rose-600 border-l border-slate-200 dark:border-slate-700"
                          title="Delete custom template"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      ))}
                  </div>
                );
              })}
            </div>

            {isSaveTemplateOpen && (
              <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2.5">
                <div className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                  Save Current Subject, Synopsis & Parties as Reusable Bilingual Template
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Template Name (EN) *"
                    value={newTemplateNameEn}
                    onChange={(e) => setNewTemplateNameEn(e.target.value)}
                    className="p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[11px]"
                  />
                  <input
                    type="text"
                    placeholder="Template Name (አማርኛ)"
                    value={newTemplateNameAm}
                    onChange={(e) => setNewTemplateNameAm(e.target.value)}
                    className="p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[11px]"
                  />
                  <input
                    type="text"
                    placeholder="Category (e.g. Regulatory)"
                    value={newTemplateCategory}
                    onChange={(e) => setNewTemplateCategory(e.target.value)}
                    className="p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[11px]"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsSaveTemplateOpen(false)}
                    className="px-2.5 py-1 text-[11px] text-slate-500 hover:text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isSavingTemplate}
                    onClick={handleSaveAsTemplate}
                    className="px-3 py-1 bg-teal-700 hover:bg-teal-800 text-white rounded text-[11px] font-semibold disabled:opacity-50"
                  >
                    {isSavingTemplate ? 'Saving...' : 'Save Template'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Phase 8 OCR (EN+AM) & Gemini Extraction Panel */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ScanText className="w-4 h-4 text-teal-600" />
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {t('aiAssistantTitle')} · Bilingual OCR (EN / አማርኛ)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setUploadedScanFile(f);
                    if (f) setSampleFileName(f.name);
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-md font-medium hover:bg-slate-100 flex items-center gap-1"
                >
                  <Upload className="w-3.5 h-3.5 text-teal-600" />
                  <span>{uploadedScanFile ? uploadedScanFile.name : 'Upload Scan for OCR'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleOcrAndAiExtract}
                  disabled={isAiLoading}
                  className="px-3 py-1.5 text-xs font-semibold bg-teal-700 hover:bg-teal-800 text-white rounded-md transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isAiLoading ? t('aiAnalyzing') : 'Extract & Suggest'}</span>
                </button>
              </div>
            </div>

            <textarea
              rows={2}
              placeholder="Optional: Paste raw letter body or Amharic/English OCR excerpt to extract subjects, reference number, summary, and recommended directorate..."
              value={aiTextPrompt}
              onChange={(e) => setAiTextPrompt(e.target.value)}
              className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400"
            />

            {/* Side-by-Side Original Text vs Extracted Fields with Mandatory Human Verification */}
            {ocrExtraction && editableAiDraft && (
              <div className="pt-3 border-t border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      Human Review Required Before Applying
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      OCR Confidence: {Math.round(ocrExtraction.ocrConfidence * 100)}% (Threshold:{' '}
                      {Math.round(ocrExtraction.thresholdUsed * 100)}%)
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>Language: {ocrExtraction.detectedLanguage.toUpperCase()}</span>
                  </div>
                  {ocrExtraction.lowConfidenceFlagged && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded">
                      <AlertTriangle className="w-3 h-3" />
                      Low OCR Confidence Flagged — Verify Carefully
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Left: Original Extracted OCR Text */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 space-y-2">
                    <div className="font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-1.5">
                      Original OCR Text (Read-Only Reference)
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto text-[11px] text-slate-600 dark:text-slate-300">
                      <div>
                        <div className="font-semibold text-slate-500 mb-0.5">English Text:</div>
                        <p className="whitespace-pre-wrap leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-2 rounded">
                          {ocrExtraction.rawTextEn || '(No English text extracted)'}
                        </p>
                      </div>
                      <div>
                        <div className="font-semibold text-slate-500 mb-0.5">Amharic Text (አማርኛ):</div>
                        <p className="whitespace-pre-wrap leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-2 rounded">
                          {ocrExtraction.rawTextAm || '(የአማርኛ ጽሑፍ አልተገኘም)'}
                        </p>
                      </div>
                    </div>
                    <div className="pt-1 border-t border-slate-100 dark:border-slate-800 text-[11px] text-teal-700 dark:text-teal-400">
                      <strong>Routing Recommendation:</strong> {ocrExtraction.routingRecommendation}
                    </div>
                  </div>

                  {/* Right: Editable Extracted Fields with Checkboxes */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3 space-y-2.5">
                    <div className="font-semibold text-slate-800 dark:text-slate-200 border-b border-slate-100 dark:border-slate-800 pb-1.5">
                      Extracted Fields (Edit & Select to Accept)
                    </div>

                    <label className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={acceptedMap.subjectEn}
                        onChange={(e) => setAcceptedMap((m) => ({ ...m, subjectEn: e.target.checked }))}
                        className="mt-1 rounded border-slate-300 text-teal-600"
                      />
                      <div className="flex-1">
                        <div className="flex justify-between text-[11px] text-slate-500">
                          <span>Subject (EN)</span>
                          <span className="font-mono tabular-nums">
                            {Math.round((ocrExtraction.fieldConfidences.subjectEn || ocrExtraction.ocrConfidence) * 100)}%
                          </span>
                        </div>
                        <input
                          type="text"
                          value={editableAiDraft.subjectEn}
                          onChange={(e) => setEditableAiDraft({ ...editableAiDraft, subjectEn: e.target.value })}
                          className="w-full p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[11px]"
                        />
                      </div>
                    </label>

                    <label className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={acceptedMap.subjectAm}
                        onChange={(e) => setAcceptedMap((m) => ({ ...m, subjectAm: e.target.checked }))}
                        className="mt-1 rounded border-slate-300 text-teal-600"
                      />
                      <div className="flex-1">
                        <div className="flex justify-between text-[11px] text-slate-500">
                          <span>Subject (AM)</span>
                          <span className="font-mono tabular-nums">
                            {Math.round((ocrExtraction.fieldConfidences.subjectAm || ocrExtraction.ocrConfidence) * 100)}%
                          </span>
                        </div>
                        <input
                          type="text"
                          value={editableAiDraft.subjectAm}
                          onChange={(e) => setEditableAiDraft({ ...editableAiDraft, subjectAm: e.target.value })}
                          className="w-full p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[11px]"
                        />
                      </div>
                    </label>

                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={acceptedMap.senderOrg}
                          onChange={(e) => setAcceptedMap((m) => ({ ...m, senderOrg: e.target.checked }))}
                          className="mt-1 rounded border-slate-300 text-teal-600"
                        />
                        <div className="flex-1">
                          <span className="text-[11px] text-slate-500 block">Sender Org</span>
                          <input
                            type="text"
                            value={editableAiDraft.senderOrg}
                            onChange={(e) => setEditableAiDraft({ ...editableAiDraft, senderOrg: e.target.value })}
                            className="w-full p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[11px]"
                          />
                        </div>
                      </label>

                      <label className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={acceptedMap.referenceNumber}
                          onChange={(e) => setAcceptedMap((m) => ({ ...m, referenceNumber: e.target.checked }))}
                          className="mt-1 rounded border-slate-300 text-teal-600"
                        />
                        <div className="flex-1">
                          <span className="text-[11px] text-slate-500 block">Ref No.</span>
                          <input
                            type="text"
                            value={editableAiDraft.referenceNumber}
                            onChange={(e) =>
                              setEditableAiDraft({ ...editableAiDraft, referenceNumber: e.target.value })
                            }
                            className="w-full p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[11px] font-mono"
                          />
                        </div>
                      </label>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={acceptedMap.department}
                          onChange={(e) => setAcceptedMap((m) => ({ ...m, department: e.target.checked }))}
                          className="mt-1 rounded border-slate-300 text-teal-600"
                        />
                        <div className="flex-1">
                          <span className="text-[11px] text-slate-500 block">Directorate</span>
                          <select
                            value={editableAiDraft.departmentId}
                            onChange={(e) => setEditableAiDraft({ ...editableAiDraft, departmentId: e.target.value })}
                            className="w-full p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[11px]"
                          >
                            {departments.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.nameEn}
                              </option>
                            ))}
                          </select>
                        </div>
                      </label>

                      <label className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={acceptedMap.priority}
                          onChange={(e) => setAcceptedMap((m) => ({ ...m, priority: e.target.checked }))}
                          className="mt-1 rounded border-slate-300 text-teal-600"
                        />
                        <div className="flex-1">
                          <span className="text-[11px] text-slate-500 block">Priority</span>
                          <select
                            value={editableAiDraft.priority}
                            onChange={(e) =>
                              setEditableAiDraft({ ...editableAiDraft, priority: e.target.value as PriorityLevel })
                            }
                            className="w-full p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[11px]"
                          >
                            <option value="Normal">Normal</option>
                            <option value="Urgent">Urgent</option>
                            <option value="VeryUrgent">Very Urgent</option>
                          </select>
                        </div>
                      </label>
                    </div>

                    <label className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={acceptedMap.summary}
                        onChange={(e) => setAcceptedMap((m) => ({ ...m, summary: e.target.checked }))}
                        className="mt-1 rounded border-slate-300 text-teal-600"
                      />
                      <div className="flex-1">
                        <span className="text-[11px] text-slate-500 block">AI Synopsis (EN)</span>
                        <textarea
                          rows={2}
                          value={editableAiDraft.summaryEn}
                          onChange={(e) => setEditableAiDraft({ ...editableAiDraft, summaryEn: e.target.value })}
                          className="w-full p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[11px]"
                        />
                      </div>
                    </label>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleDiscardAiSuggestions}
                    className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 border border-slate-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900"
                  >
                    Discard Suggestions
                  </button>
                  <button
                    type="button"
                    onClick={handleAcceptAiSuggestions}
                    className="px-3.5 py-1.5 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-md inline-flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Review & Accept Selected Fields</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Document Type, Reference & Received Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                {t('documentType')} *
              </label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value as DocumentType)}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-medium"
                required
              >
                <option value="IncomingLetter">Incoming Letter (ገቢ ደብዳቤ)</option>
                <option value="OutgoingLetter">Outgoing Letter (ወጪ ደብዳቤ)</option>
                <option value="InternalMemo">Internal Memorandum (የውስጥ ማስታወሻ)</option>
                <option value="Application">Application / Permit Request (ማመልከቻ)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                External / Department Reference No. *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. EFDA/08/992/2026"
                value={refNumber}
                onChange={(e) => setRefNumber(e.target.value)}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Received / Letter Date *
              </label>
              <input
                type="date"
                required
                max={new Date().toISOString().slice(0, 10)}
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono"
              />
            </div>
          </div>

          {/* Subjects (EN & AM) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Subject (English) *
              </label>
              <input
                type="text"
                required
                minLength={5}
                maxLength={500}
                placeholder="Official subject description in English..."
                value={subjectEn}
                onChange={(e) => setSubjectEn(e.target.value)}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                ጉዳዩ / ርዕስ (አማርኛ)
              </label>
              <input
                type="text"
                placeholder="የደብዳቤው ርዕስ በአማርኛ..."
                value={subjectAm}
                onChange={(e) => setSubjectAm(e.target.value)}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
              Detailed Description / Letter Synopsis
            </label>
            <textarea
              rows={2}
              placeholder="Enter synopsis of the letter, action requirements, consignment batch numbers..."
              value={descriptionEn}
              onChange={(e) => setDescriptionEn(e.target.value)}
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
            />
          </div>

          {/* Sender & Recipient */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                {t('sender')} *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Ethiopian Food and Drug Authority (EFDA)"
                value={senderOrg}
                onChange={(e) => setSenderOrg(e.target.value)}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                {t('recipient')} *
              </label>
              <input
                type="text"
                required
                value={recipientOrg}
                onChange={(e) => setRecipientOrg(e.target.value)}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Branch, Directorate, Priority & Confidentiality */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Target Hub / Branch *
              </label>
              <select
                value={targetBranchId}
                onChange={(e) => setTargetBranchId(e.target.value)}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nameEn}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Responsible Directorate *
              </label>
              <select
                value={targetDeptId}
                onChange={(e) => setTargetDeptId(e.target.value)}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              >
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nameEn}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                {t('priority')}
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-semibold"
              >
                <option value="Normal">Normal</option>
                <option value="Urgent">Urgent</option>
                <option value="VeryUrgent">Very Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                {t('confidentiality')}
              </label>
              <select
                value={confidentiality}
                onChange={(e) => setConfidentiality(e.target.value as ConfidentialityLevel)}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-semibold"
              >
                <option value="Public">Public</option>
                <option value="Internal">Internal</option>
                <option value="Confidential">Confidential</option>
                <option value="Secret">Secret</option>
              </select>
            </div>
          </div>

          {/* Regulatory Category & Intelligent Retention Preview */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/30">
            <div className="sm:col-span-5">
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 text-[11px]">
                {t('regulatoryCategoryLabel')}
              </label>
              <select
                value={regulatoryCategory}
                onChange={(e) => setRegulatoryCategory(e.target.value as RegulatoryCategory | '')}
                className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-xs"
              >
                <option value="">
                  {language === 'am' ? 'በሰነዱ መረጃ መሠረት በራስ-ሰር ይመደብ' : 'Auto-Classify from Metadata & Keywords'}
                </option>
                <option value="PharmaceuticalQuality">Pharmaceutical Quality & EFDA (15 yrs)</option>
                <option value="ProcurementTender">Procurement & Tenders (10 yrs)</option>
                <option value="LegalCompliance">Legal & Litigation (12 yrs)</option>
                <option value="FinancialAudit">Financial & Waybill Audit (7 yrs)</option>
                <option value="ExecutiveGovernance">Executive / Sovereign Charter (Permanent)</option>
                <option value="HumanResources">Human Resources Directives</option>
                <option value="GeneralAdministrative">General Administrative (5 yrs)</option>
              </select>
            </div>
            <div className="sm:col-span-7 flex flex-col justify-center text-[11px] space-y-0.5">
              <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center justify-between gap-2">
                <span>
                  {retentionPreview
                    ? retentionPreview.retentionCategory
                    : language === 'am'
                      ? 'የማቆያ ጊዜ በመሰላት ላይ...'
                      : 'Calculating regulatory retention schedule...'}
                </span>
                {retentionPreview && (
                  <span className="font-mono font-bold text-teal-700 dark:text-teal-300 tabular-nums shrink-0">
                    {retentionPreview.isPermanent
                      ? language === 'am'
                        ? 'ቋሚ (0 ዓመት)'
                        : 'Permanent (0 yrs)'
                      : `${retentionPreview.retentionYears} yrs · ${retentionPreview.retentionExpiryDate.slice(0, 10)}`}
                  </span>
                )}
              </div>
              {retentionPreview && (
                <p className="text-slate-500 dark:text-slate-400 leading-snug">
                  {language === 'am' ? 'መነሻ፡' : 'Trigger:'}{' '}
                  <strong className="text-slate-700 dark:text-slate-300">
                    {retentionPreview.retentionTriggerEvent}
                  </strong>{' '}
                  · {Math.round(retentionPreview.retentionConfidence * 100)}% ·{' '}
                  {retentionPreview.retentionClassificationReason}
                </p>
              )}
            </div>
          </div>

          {/* Physical Storage Coordinates */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
            <span className="font-bold text-slate-900 dark:text-slate-100 block">
              Physical Original File Tracking & Shelf Storage
            </span>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-500 text-[11px] mb-0.5">Archive Room</label>
                <input
                  type="text"
                  value={roomLocation}
                  onChange={(e) => setRoomLocation(e.target.value)}
                  className="w-full p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs"
                />
              </div>
              <div>
                <label className="block text-slate-500 text-[11px] mb-0.5">Shelf / Rack</label>
                <input
                  type="text"
                  value={shelfLocation}
                  onChange={(e) => setShelfLocation(e.target.value)}
                  className="w-full p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs"
                />
              </div>
              <div>
                <label className="block text-slate-500 text-[11px] mb-0.5">Archive Box</label>
                <input
                  type="text"
                  value={boxLocation}
                  onChange={(e) => setBoxLocation(e.target.value)}
                  className="w-full p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-xs"
                />
              </div>
            </div>
          </div>

          {/* File Attachment */}
          <div className="p-3 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-teal-600" />
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {uploadedScanFile?.name || sampleFileName}
              </span>
              <span className="text-slate-400 font-mono tabular-nums">
                ({uploadedScanFile ? `${Math.round(uploadedScanFile.size / 1024)} KB` : '1.8 MB'})
              </span>
            </div>
            <button
              type="button"
              onClick={() => runDuplicateCheck(true)}
              disabled={isCheckingDuplicates}
              className="text-[11px] font-semibold text-teal-700 dark:text-teal-400 hover:underline disabled:opacity-50"
            >
              {isCheckingDuplicates ? 'Checking Duplicates...' : 'Run Duplicate Check'}
            </button>
          </div>

          {/* Footer Submit */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsRegisterModalOpen(false)}
              className="px-4 py-2 text-slate-600 dark:text-slate-400 font-semibold"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isCheckingDuplicates}
              className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50"
            >
              {isSubmitting ? 'Registering Document...' : 'Generate Reference & Register'}
            </button>
          </div>
        </form>
      </div>

      {/* Duplicate Warning Modal */}
      {isDuplicateModalOpen && duplicateMatches.length > 0 && (
        <div className="fixed inset-0 z-60 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="duplicate-warning-title"
            className="bg-white dark:bg-slate-900 rounded-xl border border-amber-300 dark:border-amber-800 max-w-xl w-full p-5 space-y-4 text-xs shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5 text-amber-800 dark:text-amber-300">
                <ShieldAlert className="w-5 h-5 shrink-0" />
                <div>
                  <h3 id="duplicate-warning-title" className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Potential Duplicate Document Detected
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {duplicateMatches.length} matching existing correspondence record(s) found. Inspect matches before proceeding.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDuplicateModalOpen(false)}
                aria-label={t('close')}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg">
              {duplicateMatches.map((m) => (
                <div key={m.documentId} className="p-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <span className="font-bold text-slate-900 dark:text-slate-100">{m.registrationNumber}</span>
                      <span className="text-slate-400">·</span>
                      <span className="text-slate-600 dark:text-slate-300">{m.referenceNumber}</span>
                    </div>
                    <span className="font-semibold text-amber-700 dark:text-amber-300 font-mono tabular-nums text-[11px]">
                      {m.matchType} ({Math.round(m.similarityScore * 100)}%)
                    </span>
                  </div>
                  <div className="font-medium text-slate-800 dark:text-slate-200">{m.subjectEn}</div>
                  <div className="text-[11px] text-slate-500 flex items-center justify-between gap-2">
                    <span>{m.reason}</span>
                    {!m.isRestricted && (
                      <button
                        type="button"
                        onClick={() => {
                          const doc = documents.find((d) => d.id === m.documentId);
                          if (doc) {
                            setIsDuplicateModalOpen(false);
                            setIsRegisterModalOpen(false);
                            setSelectedDocument(doc);
                          }
                        }}
                        className="text-teal-700 dark:text-teal-400 font-semibold hover:underline inline-flex items-center gap-0.5 shrink-0"
                      >
                        Open Record <ArrowUpRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsDuplicateModalOpen(false)}
                className="px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-semibold"
              >
                Cancel & Edit Registration
              </button>
              <button
                type="button"
                onClick={() => submitRegistration(true)}
                disabled={isSubmitting}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold"
              >
                {isSubmitting ? 'Registering...' : 'Confirm Not Duplicate & Register'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
