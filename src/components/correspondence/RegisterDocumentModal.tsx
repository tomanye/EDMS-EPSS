import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Upload, 
  FileText, 
  Building2, 
  ShieldAlert, 
  Calendar, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import { DocumentType } from '../../types/index.js';

export const RegisterDocumentModal: React.FC = () => {
  const { 
    isRegisterModalOpen, 
    setIsRegisterModalOpen, 
    registerModalType, 
    branches, 
    departments, 
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
  const [senderOrg, setSenderOrg] = useState('');
  const [senderPerson, setSenderPerson] = useState('');
  const [recipientOrg, setRecipientOrg] = useState('Ethiopian Pharmaceutical Supply Service (EPSS)');
  const [recipientPerson, setRecipientPerson] = useState('');
  const [refNumber, setRefNumber] = useState('');
  const [priority, setPriority] = useState<'Normal' | 'Urgent' | 'VeryUrgent'>('Normal');
  const [confidentiality, setConfidentiality] = useState<'Public' | 'Internal' | 'Confidential' | 'Secret'>('Internal');
  const [targetBranchId, setTargetBranchId] = useState('br-hq');
  const [targetDeptId, setTargetDeptId] = useState(departments[0]?.id || 'dept-proc');
  const [dueDate, setDueDate] = useState('');
  const [roomLocation, setRoomLocation] = useState('Room G-04 (Intake Vault)');
  const [shelfLocation, setShelfLocation] = useState('Rack 2 - Shelf B');
  const [boxLocation, setBoxLocation] = useState('BOX-2026-MED');
  const [sampleFileName, setSampleFileName] = useState('official_signed_letter_scan.pdf');

  // AI Assistant states
  const [aiTextPrompt, setAiTextPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isRegisterModalOpen) return null;

  const handleAiAnalyze = async () => {
    if (!aiTextPrompt && !subjectEn) {
      alert('Please enter document text, excerpt, or subject for Gemini to analyze.');
      return;
    }

    try {
      setIsAiLoading(true);
      const res = await fetch('/api/v1/ai/analyze-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentText: aiTextPrompt || descriptionEn,
          subject: subjectEn
        })
      });
      const data = await res.json();
      setAiResult(data);

      if (data.summaryEn && !descriptionEn) {
        setDescriptionEn(data.summaryEn);
      }
      if (data.summaryAm && !subjectAm) {
        setSubjectAm(data.summaryAm.split('.')[0] || '');
      }
      // Match suggested department
      const matchDept = departments.find(d => d.nameEn.toLowerCase().includes((data.suggestedDepartment || '').toLowerCase()));
      if (matchDept) {
        setTargetDeptId(matchDept.id);
      }
    } catch (err) {
      console.error(err);
      alert('AI Document Analysis failed');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const selectedDeptObj = departments.find(d => d.id === targetDeptId);

      const payload = {
        type: docType,
        subjectEn,
        subjectAm: subjectAm || subjectEn,
        descriptionEn,
        descriptionAm: aiResult?.summaryAm || '',
        senderOrganization: senderOrg || (docType === 'OutgoingLetter' ? 'EPSS' : 'External Ministry/Supplier'),
        senderPerson,
        recipientOrganization: recipientOrg,
        recipientPerson,
        referenceNumber: refNumber || `REF-${Math.floor(1000 + Math.random() * 9000)}`,
        priority,
        confidentiality,
        branchId: targetBranchId,
        departmentId: targetDeptId,
        assignedDepartmentName: selectedDeptObj?.nameEn || 'Designated Directorate',
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
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
            fileName: sampleFileName,
            fileSize: 1850400,
            mimeType: 'application/pdf',
            uploadDate: new Date().toISOString(),
            uploadedBy: currentUser?.fullNameEn || 'Registry Officer',
            fileUrl: '/assets/sample-docs/registered_document.pdf',
            version: 1
          }
        ],
        tags: [docType, 'EPSS-2026', priority],
        aiExtracted: aiResult ? {
          summaryEn: aiResult.summaryEn,
          summaryAm: aiResult.summaryAm,
          suggestedCategory: aiResult.suggestedCategory,
          suggestedDepartment: aiResult.suggestedDepartment,
          confidence: aiResult.confidence || 0.95
        } : undefined
      };

      const res = await fetch('/api/v1/correspondence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser?.id || ''
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Registration failed');
      const created = await res.json();

      await refreshData();
      setIsRegisterModalOpen(false);
      setSelectedDocument(created);
    } catch (err) {
      console.error(err);
      alert('Failed to register correspondence');
    } finally {
      setIsSubmitting(false);
    }
  };

  const applyTemplate = (templateKey: 'efda' | 'emergency' | 'gdp' | 'tender') => {
    if (templateKey === 'efda') {
      setSubjectEn('Formal Requisition for Regulatory Batch Clearance Certificate (Lot #INS-2026-90)');
      setSubjectAm('ለአስመጪ መድኃኒቶች የባች ጥራት ፍተሻ እና የፈቃድ የምስክር ወረቀት ጥያቄ');
      setSenderOrg('Ethiopian Food and Drug Authority (EFDA)');
      setRecipientOrg('EPSS Quality Assurance & Regulatory Compliance Directorate');
      setRefNumber('EFDA/QA/2026/8901');
      setPriority('Urgent');
      setConfidentiality('Internal');
      setDescriptionEn('Submission of analytical laboratory certificates, cold-chain temperature logger records, and certificate of analysis (CoA) for immediate regulatory clearance.');
      const dept = departments.find(d => d.nameEn.toLowerCase().includes('quality'));
      if (dept) setTargetDeptId(dept.id);
    } else if (templateKey === 'emergency') {
      setSubjectEn('Emergency Epidemic Allocation Requisition for Oral Cholera Vaccines & IV Ringer Lactate');
      setSubjectAm('ለድንገተኛ ወረርሽኝ መከላከያ የኮሌራ ክትባት እና የደም ስር ፈሳሽ አስቸኳይ አቅርቦት ጥያቄ');
      setSenderOrg('Ministry of Health Disaster Response Directorate');
      setRecipientOrg('EPSS Storage & Distribution Directorate');
      setRefNumber('MOH/EM-DRUG/2026/412');
      setPriority('VeryUrgent');
      setConfidentiality('Internal');
      setDescriptionEn('Urgent requisition to dispatch 50,000 vaccine vials and 20,000 bags of IV fluids to Eastern regional hubs via refrigerated cold-chain trucks.');
      const dept = departments.find(d => d.nameEn.toLowerCase().includes('storage'));
      if (dept) setTargetDeptId(dept.id);
    } else if (templateKey === 'gdp') {
      setSubjectEn('Official Notice of Annual GDP Compliance Audit for Regional Hub Central Warehouse');
      setSubjectAm('የመድኃኒት ማከማቻ መጋዘን ዓመታዊ የጥራትና ደህንነት (GDP) ኢንስፔክሽን ማስታወቂያ');
      setSenderOrg('EPSS Internal Regulatory Audit Division');
      setRecipientOrg('EPSS Warehousing & Inventory Management Directorate');
      setRefNumber('EPSS/AUD/GDP/2026/09');
      setPriority('Normal');
      setConfidentiality('Internal');
      setDescriptionEn('Scheduled annual inspection covering temperature monitoring protocols, pest control logs, quarantined consignment segregation, and security access.');
      const dept = departments.find(d => d.nameEn.toLowerCase().includes('warehousing') || d.nameEn.toLowerCase().includes('storage'));
      if (dept) setTargetDeptId(dept.id);
    } else if (templateKey === 'tender') {
      setSubjectEn('Notification of International Competitive Tender Award (ICB/EPSS/2026/044) & Irrevocable LC Opening');
      setSubjectAm('የዓለም አቀፍ ግልጽ ጨረታ አሸናፊነት ማሳወቂያ እና የማይሻር ኤልሲ (LC) የመክፈቻ ደብዳቤ');
      setSenderOrg('EPSS Pharmaceuticals & Medical Devices Procurement Directorate');
      setRecipientOrg('Serum Institute of India / Global Health Pharma Ltd');
      setRefNumber('EPSS/PROC/ICB/2026/044');
      setPriority('Urgent');
      setConfidentiality('Internal');
      setDescriptionEn('Confirmation of contract signature and bilateral banking coordination for shipping 250,000 ampoules of essential antibiotics under CIF Djibouti terms.');
      const dept = departments.find(d => d.nameEn.toLowerCase().includes('procurement'));
      if (dept) setTargetDeptId(dept.id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-6 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              {language === 'am' ? 'አዲስ ይፋዊ ሰነድ ምዝገባ' : 'Official Correspondence Registration'}
            </h2>
            <p className="text-xs text-slate-500">
              EPSS Central Registry & Branch Hub Ingestion
            </p>
          </div>
          <button
            onClick={() => setIsRegisterModalOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Quick-Apply Official Institutional Templates */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/60">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2">
              {language === 'am' ? 'ይፋዊ የደብዳቤ ቅጾች (ፈጣን መሙያ)' : 'Standard Healthcare Templates (1-Click Fill)'}
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => applyTemplate('efda')}
                className="px-2.5 py-1 bg-white dark:bg-slate-900 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-slate-700 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-400 border border-slate-200 dark:border-slate-700 rounded-md text-[11px] font-medium transition-colors"
              >
                📋 EFDA Batch Clearance
              </button>
              <button
                type="button"
                onClick={() => applyTemplate('emergency')}
                className="px-2.5 py-1 bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-700 dark:text-slate-300 hover:text-rose-700 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 rounded-md text-[11px] font-medium transition-colors"
              >
                🚨 Emergency Epidemic Vaccines
              </button>
              <button
                type="button"
                onClick={() => applyTemplate('gdp')}
                className="px-2.5 py-1 bg-white dark:bg-slate-900 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-slate-700 dark:text-slate-300 hover:text-amber-700 dark:hover:text-amber-400 border border-slate-200 dark:border-slate-700 rounded-md text-[11px] font-medium transition-colors"
              >
                🏭 GDP Warehouse Audit
              </button>
              <button
                type="button"
                onClick={() => applyTemplate('tender')}
                className="px-2.5 py-1 bg-white dark:bg-slate-900 hover:bg-sky-50 dark:hover:bg-sky-950/40 text-slate-700 dark:text-slate-300 hover:text-sky-700 dark:hover:text-sky-400 border border-slate-200 dark:border-slate-700 rounded-md text-[11px] font-medium transition-colors"
              >
                💼 International Tender Award
              </button>
            </div>
          </div>

          {/* AI Assistance Box */}
          <div className="p-4 bg-teal-50/60 dark:bg-teal-950/30 rounded-xl border border-teal-200 dark:border-teal-900/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-bold text-teal-800 dark:text-teal-300">
                <Sparkles className="w-4 h-4 text-teal-600" />
                <span>{t('aiAssistantTitle')}</span>
              </span>
              <button
                type="button"
                onClick={handleAiAnalyze}
                disabled={isAiLoading}
                className="px-2.5 py-1 text-xs font-semibold bg-teal-700 hover:bg-teal-800 text-white rounded-md transition-colors disabled:opacity-50"
              >
                {isAiLoading ? t('aiAnalyzing') : 'Analyze with Gemini'}
              </button>
            </div>
            <textarea
              rows={2}
              placeholder="Paste letter body, OCR scan text, or summary snippet to auto-detect category, dates, and directorate routing..."
              value={aiTextPrompt}
              onChange={(e) => setAiTextPrompt(e.target.value)}
              className="w-full p-2 bg-white dark:bg-slate-800 border border-teal-200 dark:border-teal-900 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400"
            />
            {aiResult && (
              <div className="text-[11px] text-teal-800 dark:text-teal-300 pt-1 space-y-1">
                <div><strong>Detected Category:</strong> {aiResult.suggestedCategory}</div>
                <div><strong>Recommended Directorate:</strong> {aiResult.suggestedDepartment}</div>
                <div><strong>English Summary:</strong> {aiResult.summaryEn}</div>
                <div><strong>Amharic Summary:</strong> {aiResult.summaryAm}</div>
              </div>
            )}
          </div>

          {/* Document Type & Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                {t('documentType')} *
              </label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value as any)}
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
                placeholder="e.g. EFDA/08/992/2026 or MoH/2026/04"
                value={refNumber}
                onChange={(e) => setRefNumber(e.target.value)}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono"
              />
            </div>
          </div>

          {/* Subjects (EN & AM) */}
          <div className="space-y-3">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Subject (English) *
              </label>
              <input
                type="text"
                required
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
              rows={3}
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

          {/* Branch, Directorate & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                Target Hub / Branch *
              </label>
              <select
                value={targetBranchId}
                onChange={(e) => setTargetBranchId(e.target.value)}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              >
                {branches.map(b => (
                  <option key={b.id} value={b.id}>{b.nameEn}</option>
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
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.nameEn}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                {t('priority')}
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-semibold"
              >
                <option value="Normal">Normal</option>
                <option value="Urgent">Urgent</option>
                <option value="VeryUrgent">Very Urgent</option>
              </select>
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
          <div className="space-y-1">
            <label className="block text-slate-700 dark:text-slate-300 font-semibold">
              Scanned Letter File Attachment (PDF / TIFF)
            </label>
            <div className="p-3 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-600" />
                <span className="font-medium text-slate-800 dark:text-slate-200">{sampleFileName}</span>
                <span className="text-slate-400">(1.8 MB)</span>
              </div>
              <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2 py-1 rounded">
                Attached & Ready
              </span>
            </div>
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
              disabled={isSubmitting}
              className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50"
            >
              {isSubmitting ? 'Registering Document...' : 'Generate Reference & Register'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
