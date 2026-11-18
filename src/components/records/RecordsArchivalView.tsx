import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Award,
  BellRing,
  Calculator,
  CheckCircle2,
  Clock,
  Edit3,
  FolderArchive,
  FolderUp,
  Gavel,
  Lock,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  Unlock,
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import { apiFetch } from '../../lib/apiFetch.js';
import { localizeErrorMessage } from '../../lib/localizedErrors.js';
import { formatEthiopianDate } from '../../lib/translations.js';
import {
  ArchiveRetrievalRequest,
  ConfidentialityLevel,
  DisposalAlertUrgency,
  DisposalCertificate,
  DisposalRequest,
  DocumentType,
  PhysicalLocationNode,
  RecordsAlertSummary,
  RegulatoryCategory,
  RetentionCalculationResult,
  RetentionSchedule,
  RetentionTriggerEvent
} from '../../types/index.js';
import { DisposalCertificateModal } from './DisposalCertificateModal.js';

type RecordsSubTab =
  | 'alerts'
  | 'retention'
  | 'legalHold'
  | 'archiveVault'
  | 'disposal'
  | 'certificates';

const ALL_DOC_TYPES: DocumentType[] = [
  'IncomingLetter',
  'OutgoingLetter',
  'InternalMemo',
  'Application',
  'TenderDocument',
  'InspectionReport',
  'Circular'
];

const ALL_CONF_LEVELS: ConfidentialityLevel[] = ['Public', 'Internal', 'Confidential', 'Secret'];

const REGULATORY_CATEGORIES: Array<{ value: RegulatoryCategory; labelEn: string; labelAm: string }> = [
  { value: 'PharmaceuticalQuality', labelEn: 'Pharmaceutical Quality & EFDA', labelAm: 'የመድኃኒት ጥራት እና EFDA' },
  { value: 'ProcurementTender', labelEn: 'Procurement & Tenders', labelAm: 'ግዥ እና ጨረታዎች' },
  { value: 'FinancialAudit', labelEn: 'Financial & Audit Vouchers', labelAm: 'ፋይናንስ እና ኦዲት' },
  { value: 'LegalCompliance', labelEn: 'Legal & Litigation Files', labelAm: 'ሕግ እና ክርክሮች' },
  { value: 'ExecutiveGovernance', labelEn: 'Executive & Sovereign Charters', labelAm: 'ከፍተኛ አመራር እና መመሪያዎች' },
  { value: 'HumanResources', labelEn: 'Human Resources Records', labelAm: 'የሰው ኃይል መዝገቦች' },
  { value: 'GeneralAdministrative', labelEn: 'General Administrative', labelAm: 'አጠቃላይ አስተዳደራዊ' }
];

const TRIGGER_EVENTS: Array<{ value: RetentionTriggerEvent; labelEn: string; labelAm: string }> = [
  { value: 'RegistrationDate', labelEn: 'Registration Date', labelAm: 'የተመዘገበበት ቀን' },
  { value: 'CompletionDate', labelEn: 'Closure / Approval Date', labelAm: 'የተጠናቀቀበት / የጸደቀበት ቀን' },
  { value: 'ArchiveDate', labelEn: 'Archive Transfer Date', labelAm: 'ወደ ማህደር የገባበት ቀን' },
  { value: 'FiscalYearEnd', labelEn: 'Ethiopian Fiscal Year End (Hamle 1)', labelAm: 'የበጀት ዓመት መጨረሻ (ሐምሌ 1)' }
];

export const RecordsArchivalView: React.FC = () => {
  const {
    documents,
    branches,
    currentUser,
    setSelectedDocument,
    refreshData,
    language,
    t
  } = useApp();

  const [activeTab, setActiveTab] = useState<RecordsSubTab>('alerts');
  const [schedules, setSchedules] = useState<RetentionSchedule[]>([]);
  const [alertSummary, setAlertSummary] = useState<RecordsAlertSummary | null>(null);
  const [retrievals, setRetrievals] = useState<ArchiveRetrievalRequest[]>([]);
  const [disposals, setDisposals] = useState<DisposalRequest[]>([]);
  const [certificates, setCertificates] = useState<DisposalCertificate[]>([]);
  const [locations, setLocations] = useState<PhysicalLocationNode[]>([]);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pending Disposal Alerts filters
  const [alertUrgencyFilter, setAlertUrgencyFilter] = useState<'All' | DisposalAlertUrgency>('All');
  const [alertCategoryFilter, setAlertCategoryFilter] = useState<string>('All');
  const [alertSearch, setAlertSearch] = useState('');

  // Policy Simulator state
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [simType, setSimType] = useState<DocumentType>('IncomingLetter');
  const [simRegCat, setSimRegCat] = useState<RegulatoryCategory | ''>('');
  const [simConf, setSimConf] = useState<ConfidentialityLevel>('Internal');
  const [simSubject, setSimSubject] = useState('EFDA Batch Clearance & Cold-Chain Vaccine Inspection');
  const [simRegDate, setSimRegDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [simCompDate, setSimCompDate] = useState('');
  const [simResult, setSimResult] = useState<RetentionCalculationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Archive Explorer filters
  const [archiveSearch, setArchiveSearch] = useState('');
  const [archiveYearFilter, setArchiveYearFilter] = useState('All');
  const [archiveCategoryFilter, setArchiveCategoryFilter] = useState('All');
  const [archiveBranchFilter, setArchiveBranchFilter] = useState('All');

  // Schedule CRUD modal
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<RetentionSchedule | null>(null);
  const [scCategory, setScCategory] = useState('');
  const [scRegCategory, setScRegCategory] = useState<RegulatoryCategory>('GeneralAdministrative');
  const [scTriggerEvent, setScTriggerEvent] = useState<RetentionTriggerEvent>('RegistrationDate');
  const [scYears, setScYears] = useState<string>('5');
  const [scPriority, setScPriority] = useState<string>('75');
  const [scAlertLeadDays, setScAlertLeadDays] = useState<string>('90');
  const [scAction, setScAction] = useState<RetentionSchedule['disposalAction']>('ReviewAtMaturity');
  const [scLegislation, setScLegislation] = useState('');
  const [scNotes, setScNotes] = useState('');
  const [scDocTypes, setScDocTypes] = useState<DocumentType[]>([]);
  const [scConfLevels, setScConfLevels] = useState<ConfidentialityLevel[]>([]);
  const [scKeywordsInput, setScKeywordsInput] = useState('');
  const [scError, setScError] = useState('');

  // Assign Schedule to Document modal
  const [isAssignScheduleOpen, setIsAssignScheduleOpen] = useState(false);
  const [assignDocId, setAssignDocId] = useState('');
  const [assignScheduleId, setAssignScheduleId] = useState('');
  const [assignError, setAssignError] = useState('');

  // Legal Hold modal
  const [isLegalHoldModalOpen, setIsLegalHoldModalOpen] = useState(false);
  const [holdDocId, setHoldDocId] = useState('');
  const [holdTargetActive, setHoldTargetActive] = useState(true);
  const [holdReason, setHoldReason] = useState('');
  const [holdError, setHoldError] = useState('');

  // Transfer to Archive modal
  const [isArchiveTransferOpen, setIsArchiveTransferOpen] = useState(false);
  const [transferDocId, setTransferDocId] = useState('');
  const [transferLocationId, setTransferLocationId] = useState('');
  const [transferScheduleId, setTransferScheduleId] = useState('');
  const [transferNotes, setTransferNotes] = useState('');
  const [transferError, setTransferError] = useState('');

  // Retrieval Request modal
  const [isRetrievalModalOpen, setIsRetrievalModalOpen] = useState(false);
  const [retrievalDocId, setRetrievalDocId] = useState('');
  const [retrievalNeededDate, setRetrievalNeededDate] = useState('');
  const [retrievalReason, setRetrievalReason] = useState('');
  const [retrievalError, setRetrievalError] = useState('');

  // Disposal Request modal
  const [isDisposalModalOpen, setIsDisposalModalOpen] = useState(false);
  const [disposalDocId, setDisposalDocId] = useState('');
  const [disposalMethod, setDisposalMethod] = useState<DisposalRequest['method']>('CertifiedShredding');
  const [disposalReason, setDisposalReason] = useState('');
  const [disposalError, setDisposalError] = useState('');

  // Disposal Decision modal
  const [decisionTarget, setDecisionTarget] = useState<DisposalRequest | null>(null);
  const [decisionChoice, setDecisionChoice] = useState<'Approved' | 'Rejected'>('Approved');
  const [decisionComments, setDecisionComments] = useState('');
  const [decisionError, setDecisionError] = useState('');

  // Execute Disposal confirm modal
  const [executeTarget, setExecuteTarget] = useState<DisposalRequest | null>(null);
  const [executeError, setExecuteError] = useState('');

  // Delete Retention Schedule confirm modal
  const [deleteScheduleTarget, setDeleteScheduleTarget] = useState<RetentionSchedule | null>(null);

  // Certificate modal
  const [selectedCertificate, setSelectedCertificate] = useState<DisposalCertificate | null>(null);

  const notify = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast((curr) => (curr?.message === message ? null : curr));
    }, 5500);
  }, []);

  const fetchRecordsData = useCallback(async () => {
    try {
      const [scRes, alertsRes, retvRes, dispRes, certRes, locRes] = await Promise.all([
        apiFetch('/api/v1/records/schedules').then((r) => (r.ok ? r.json() : [])),
        apiFetch('/api/v1/records/retention/alerts?horizonDays=90').then((r) => (r.ok ? r.json() : null)),
        apiFetch('/api/v1/records/retrievals').then((r) => (r.ok ? r.json() : [])),
        apiFetch('/api/v1/records/disposals').then((r) => (r.ok ? r.json() : [])),
        apiFetch('/api/v1/records/certificates').then((r) => (r.ok ? r.json() : [])),
        apiFetch('/api/v1/tracking/locations').then((r) => (r.ok ? r.json() : []))
      ]);
      setSchedules(Array.isArray(scRes) ? scRes : []);
      if (alertsRes && Array.isArray(alertsRes.alerts)) {
        setAlertSummary(alertsRes);
      }
      setRetrievals(Array.isArray(retvRes) ? retvRes : []);
      setDisposals(Array.isArray(dispRes) ? dispRes : []);
      setCertificates(Array.isArray(certRes) ? certRes : []);
      setLocations(Array.isArray(locRes) ? locRes : []);
    } catch (err) {
      console.error('Failed to fetch records governance data:', err);
    }
  }, []);

  useEffect(() => {
    fetchRecordsData();
  }, [fetchRecordsData]);

  const perms = currentUser?.permissions || [];
  const canManageArchives =
    perms.includes('manage:archives') ||
    perms.includes('manage:organizations') ||
    currentUser?.role === 'SuperAdmin';
  const canLegalHold = perms.includes('apply:legal_hold') || currentUser?.role === 'SuperAdmin';
  const canScanAlerts =
    canManageArchives || ['RegistryOfficer', 'Auditor'].includes(currentUser?.role || '');
  const canDecideDisposal =
    perms.includes('approve:workflows') ||
    perms.includes('apply:legal_hold') ||
    ['SuperAdmin', 'DirectorGeneral', 'Director', 'Auditor'].includes(currentUser?.role || '');
  const canExecuteDisposal =
    ['SuperAdmin', 'DirectorGeneral', 'RegistryOfficer'].includes(currentUser?.role || '') ||
    perms.includes('manage:archives');
  const canFulfillRetrieval = ['SuperAdmin', 'DirectorGeneral', 'Director', 'RegistryOfficer'].includes(
    currentUser?.role || ''
  );

  const activeDocs = useMemo(
    () => documents.filter((d) => !d.isDeleted && d.status !== 'Disposed'),
    [documents]
  );
  const heldDocs = useMemo(
    () => documents.filter((d) => d.legalHold && !d.isDeleted),
    [documents]
  );
  const archivedDocs = useMemo(
    () => documents.filter((d) => (d.isArchived || d.status === 'Archived') && !d.isDeleted),
    [documents]
  );

  const disposalEligibleDocs = useMemo(() => {
    const now = Date.now();
    return documents.filter((d) => {
      if (d.isDeleted || d.status === 'Disposed' || d.legalHold) return false;
      if (d.retentionYears === 0) return false;
      if (!d.retentionExpiryDate) return false;
      return new Date(d.retentionExpiryDate).getTime() <= now;
    });
  }, [documents]);

  const filteredAlerts = useMemo(() => {
    const list = alertSummary?.alerts || [];
    const q = alertSearch.trim().toLowerCase();
    return list.filter((item) => {
      if (alertUrgencyFilter !== 'All' && item.urgency !== alertUrgencyFilter) return false;
      if (alertCategoryFilter !== 'All' && item.regulatoryCategory !== alertCategoryFilter) return false;
      if (!q) return true;
      return (
        item.registrationNumber.toLowerCase().includes(q) ||
        item.subjectEn.toLowerCase().includes(q) ||
        (item.subjectAm || '').toLowerCase().includes(q) ||
        item.retentionCategory.toLowerCase().includes(q)
      );
    });
  }, [alertSummary, alertUrgencyFilter, alertCategoryFilter, alertSearch]);

  const archiveYears = useMemo(() => {
    const yrs = new Set<string>();
    archivedDocs.forEach((d) => {
      const y = (d.archivedAt || d.registrationDate || '').slice(0, 4);
      if (y) yrs.add(y);
    });
    return Array.from(yrs).sort((a, b) => b.localeCompare(a));
  }, [archivedDocs]);

  const archiveCategories = useMemo(() => {
    const cats = new Set<string>();
    archivedDocs.forEach((d) => {
      if (d.retentionCategory) cats.add(d.retentionCategory);
    });
    return Array.from(cats).sort();
  }, [archivedDocs]);

  const filteredArchivedDocs = useMemo(() => {
    const q = archiveSearch.trim().toLowerCase();
    return archivedDocs.filter((d) => {
      const docYear = (d.archivedAt || d.registrationDate || '').slice(0, 4);
      if (archiveYearFilter !== 'All' && docYear !== archiveYearFilter) return false;
      if (archiveCategoryFilter !== 'All' && (d.retentionCategory || '') !== archiveCategoryFilter) {
        return false;
      }
      if (archiveBranchFilter !== 'All' && d.branchId !== archiveBranchFilter) return false;
      if (!q) return true;
      return (
        d.registrationNumber.toLowerCase().includes(q) ||
        d.subjectEn.toLowerCase().includes(q) ||
        (d.subjectAm || '').toLowerCase().includes(q) ||
        (d.archiveLocationPath || '').toLowerCase().includes(q)
      );
    });
  }, [archivedDocs, archiveSearch, archiveYearFilter, archiveCategoryFilter, archiveBranchFilter]);

  const branchNameById = useMemo(() => {
    const m = new Map<string, string>();
    branches.forEach((b) => m.set(b.id, b.nameEn));
    return m;
  }, [branches]);

  const locationOptions = useMemo(() => {
    const map = new Map<string, PhysicalLocationNode>();
    locations.forEach((l) => map.set(l.id, l));
    const buildPath = (node: PhysicalLocationNode): string => {
      const parts: string[] = [node.name];
      let cur: PhysicalLocationNode | undefined = node;
      let guard = 0;
      while (cur?.parentId && guard < 10) {
        const p = map.get(cur.parentId);
        if (!p) break;
        parts.unshift(p.name);
        cur = p;
        guard++;
      }
      return parts.join(' → ');
    };
    return locations
      .filter((l) => l.level === 'Box' || l.level === 'Shelf' || l.level === 'Cabinet')
      .map((l) => ({ id: l.id, label: buildPath(l), level: l.level }));
  }, [locations]);

  const handleRunSimulation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setIsSimulating(true);
      const res = await apiFetch('/api/v1/records/retention/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: simType,
          regulatoryCategory: simRegCat || undefined,
          confidentiality: simConf,
          subjectEn: simSubject.trim(),
          registrationDate: simRegDate ? new Date(simRegDate).toISOString() : new Date().toISOString(),
          completedAt: simCompDate ? new Date(simCompDate).toISOString() : undefined
        })
      });
      const data = await res.json();
      if (!res.ok) {
        notify('error', localizeErrorMessage(data.error, language));
        return;
      }
      setSimResult(data);
    } catch {
      notify('error', localizeErrorMessage('Network error running retention simulation.', language));
    } finally {
      setIsSimulating(false);
    }
  };

  const handleScanAndNotify = async () => {
    try {
      setIsSubmitting(true);
      const res = await apiFetch('/api/v1/records/retention/scan-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data: RecordsAlertSummary & { error?: string } = await res.json();
      if (!res.ok) {
        notify('error', localizeErrorMessage(data.error, language));
        return;
      }
      setAlertSummary(data);
      await refreshData();
      notify(
        'success',
        language === 'am'
          ? `ፍተሻ ተጠናቋል፦ ${data.counts.overdue} ጊዜው ያለፈበት፣ ${data.counts.critical30} በ30 ቀን ውስጥ፣ ${data.notificationsDispatchedCount} ማሳወቂያ ተልኳል።`
          : `Alert scan completed: ${data.counts.overdue} mature, ${data.counts.critical30} due ≤30d, ${data.notificationsDispatchedCount} new manager notification(s) dispatched.`
      );
    } catch {
      notify('error', localizeErrorMessage('Network error scanning disposal alerts.', language));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecalculatePortfolio = async () => {
    try {
      setIsSubmitting(true);
      const res = await apiFetch('/api/v1/records/retention/recalculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overwriteManual: false })
      });
      const data = await res.json();
      if (!res.ok) {
        notify('error', localizeErrorMessage(data.error, language));
        return;
      }
      await Promise.all([fetchRecordsData(), refreshData()]);
      notify(
        'success',
        language === 'am'
          ? `${data.evaluatedCount} ሰነዶች ተገምግመዋል፤ ${data.updatedCount} መመሪያዎች ተዘምነዋል (${data.skippedHeldCount} በሕግ እግድ የተጠበቁ)።`
          : `Evaluated ${data.evaluatedCount} active records; updated ${data.updatedCount} schedule classification(s) (${data.skippedHeldCount} Legal Hold protected).`
      );
    } catch {
      notify('error', localizeErrorMessage('Network error recalculating retention.', language));
    } finally {
      setIsSubmitting(false);
    }
  };

  const openNewScheduleModal = () => {
    setEditingSchedule(null);
    setScCategory('');
    setScRegCategory('GeneralAdministrative');
    setScTriggerEvent('RegistrationDate');
    setScYears('5');
    setScPriority('75');
    setScAlertLeadDays('90');
    setScAction('ReviewAtMaturity');
    setScLegislation('');
    setScNotes('');
    setScDocTypes([]);
    setScConfLevels([]);
    setScKeywordsInput('');
    setScError('');
    setIsScheduleModalOpen(true);
  };

  const openEditScheduleModal = (sc: RetentionSchedule) => {
    setEditingSchedule(sc);
    setScCategory(sc.documentCategory);
    setScRegCategory(sc.regulatoryCategory || 'GeneralAdministrative');
    setScTriggerEvent(sc.retentionTriggerEvent || 'RegistrationDate');
    setScYears(String(sc.retentionPeriodYears));
    setScPriority(String(sc.priority ?? 75));
    setScAlertLeadDays(String(sc.alertLeadDays ?? 90));
    setScAction(sc.disposalAction);
    setScLegislation(sc.governingLegislation);
    setScNotes(sc.notes || '');
    setScDocTypes(sc.documentTypes || []);
    setScConfLevels(sc.confidentialityLevels || []);
    setScKeywordsInput((sc.keywordPatterns || []).join(', '));
    setScError('');
    setIsScheduleModalOpen(true);
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setScError('');
    const yearsNum = Number(scYears);
    if (scCategory.trim().length < 3) {
      setScError('Document category must be at least 3 characters.');
      return;
    }
    if (Number.isNaN(yearsNum) || yearsNum < 0) {
      setScError('Retention years must be 0 or greater (0 = Permanent Retention).');
      return;
    }
    if (scLegislation.trim().length < 3) {
      setScError('Governing legislation reference is required.');
      return;
    }

    const keywordPatterns = scKeywordsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      setIsSubmitting(true);
      const endpoint = editingSchedule
        ? `/api/v1/records/schedules/${editingSchedule.id}`
        : '/api/v1/records/schedules';
      const res = await apiFetch(endpoint, {
        method: editingSchedule ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentCategory: scCategory.trim(),
          regulatoryCategory: scRegCategory,
          retentionTriggerEvent: scTriggerEvent,
          priority: Math.max(1, Math.min(100, Number(scPriority) || 75)),
          alertLeadDays: Math.max(0, Math.min(365, Number(scAlertLeadDays) || 90)),
          retentionPeriodYears: yearsNum,
          disposalAction: yearsNum === 0 ? 'PermanentArchive' : scAction,
          governingLegislation: scLegislation.trim(),
          notes: scNotes.trim(),
          documentTypes: scDocTypes,
          confidentialityLevels: scConfLevels,
          keywordPatterns
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setScError(localizeErrorMessage(data.error || 'Failed to save retention schedule.', language));
        return;
      }
      setIsScheduleModalOpen(false);
      await Promise.all([fetchRecordsData(), refreshData()]);
      notify('success', editingSchedule ? 'Retention policy updated and linked records recalculated.' : 'Intelligent retention policy created.');
    } catch {
      setScError(localizeErrorMessage('Network error saving retention schedule.', language));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSchedule = async () => {
    if (!deleteScheduleTarget) return;
    try {
      setIsSubmitting(true);
      const res = await apiFetch(`/api/v1/records/schedules/${deleteScheduleTarget.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) {
        notify('error', localizeErrorMessage(data.error || 'Could not delete schedule.', language));
        setDeleteScheduleTarget(null);
        return;
      }
      setDeleteScheduleTarget(null);
      await fetchRecordsData();
      notify('success', 'Retention schedule deleted.');
    } catch {
      notify('error', localizeErrorMessage('Failed to delete schedule.', language));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setAssignError('');
    if (!assignDocId || !assignScheduleId) {
      setAssignError('Select both a document and a retention schedule.');
      return;
    }
    try {
      setIsSubmitting(true);
      const res = await apiFetch(`/api/v1/records/documents/${assignDocId}/assign-schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleId: assignScheduleId })
      });
      const data = await res.json();
      if (!res.ok) {
        setAssignError(localizeErrorMessage(data.error || 'Failed to assign schedule.', language));
        return;
      }
      setIsAssignScheduleOpen(false);
      await Promise.all([fetchRecordsData(), refreshData()]);
      notify('success', `Retention schedule assigned to ${data.registrationNumber}.`);
    } catch {
      setAssignError(localizeErrorMessage('Network error assigning schedule.', language));
    } finally {
      setIsSubmitting(false);
    }
  };

  const openLegalHoldDialog = (docId: string, active: boolean) => {
    setHoldDocId(docId);
    setHoldTargetActive(active);
    setHoldReason('');
    setHoldError('');
    setIsLegalHoldModalOpen(true);
  };

  const handleLegalHoldSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHoldError('');
    if (!holdDocId) {
      setHoldError('Select a target document.');
      return;
    }
    if (holdReason.trim().length < 20) {
      setHoldError('Legal Hold reason must be at least 20 characters.');
      return;
    }
    try {
      setIsSubmitting(true);
      const res = await apiFetch(`/api/v1/records/legal-hold/${holdDocId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          active: holdTargetActive,
          reason: holdReason.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setHoldError(localizeErrorMessage(data.error || 'Failed to update Legal Hold.', language));
        return;
      }
      setIsLegalHoldModalOpen(false);
      await Promise.all([fetchRecordsData(), refreshData()]);
      notify(
        'success',
        holdTargetActive ? 'Legal Hold applied and record locked.' : 'Legal Hold released.'
      );
    } catch {
      setHoldError(localizeErrorMessage('Network error updating Legal Hold.', language));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTransferToArchive = async (e: React.FormEvent) => {
    e.preventDefault();
    setTransferError('');
    if (!transferDocId) {
      setTransferError('Select a document to transfer to Archive.');
      return;
    }
    try {
      setIsSubmitting(true);
      const res = await apiFetch(`/api/v1/records/archive/${transferDocId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId: transferLocationId || undefined,
          scheduleId: transferScheduleId || undefined,
          notes: transferNotes.trim() || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setTransferError(localizeErrorMessage(data.error || 'Failed to transfer document to Archive.', language));
        return;
      }
      setIsArchiveTransferOpen(false);
      await Promise.all([fetchRecordsData(), refreshData()]);
      notify('success', `${data.registrationNumber} transferred to Archive Vault.`);
    } catch {
      setTransferError(localizeErrorMessage('Network error transferring record.', language));
    } finally {
      setIsSubmitting(false);
    }
  };

  const openRetrievalModal = (docId: string) => {
    const defaultDate = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    setRetrievalDocId(docId);
    setRetrievalNeededDate(defaultDate);
    setRetrievalReason('');
    setRetrievalError('');
    setIsRetrievalModalOpen(true);
  };

  const handleRequestRetrieval = async (e: React.FormEvent) => {
    e.preventDefault();
    setRetrievalError('');
    if (!retrievalDocId) {
      setRetrievalError('Select an archived document.');
      return;
    }
    if (!retrievalNeededDate) {
      setRetrievalError('Needed-until return date is required.');
      return;
    }
    if (retrievalReason.trim().length < 10) {
      setRetrievalError('Retrieval justification must be at least 10 characters.');
      return;
    }
    try {
      setIsSubmitting(true);
      const res = await apiFetch('/api/v1/records/retrievals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: retrievalDocId,
          neededUntilDate: retrievalNeededDate,
          reason: retrievalReason.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setRetrievalError(localizeErrorMessage(data.error || 'Failed to submit retrieval request.', language));
        return;
      }
      setIsRetrievalModalOpen(false);
      await fetchRecordsData();
      notify('success', `Archive retrieval requested for ${data.registrationNumber}.`);
    } catch {
      setRetrievalError(localizeErrorMessage('Network error submitting retrieval request.', language));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateRetrievalStatus = async (
    id: string,
    status: 'Fulfilled' | 'Returned' | 'Denied'
  ) => {
    try {
      setIsSubmitting(true);
      const res = await apiFetch(`/api/v1/records/retrievals/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (!res.ok) {
        notify('error', localizeErrorMessage(data.error || 'Could not update retrieval request.', language));
        return;
      }
      await fetchRecordsData();
      notify('success', `Retrieval marked as ${status}.`);
    } catch {
      notify('error', localizeErrorMessage('Failed to update retrieval status.', language));
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDisposalForDoc = (docId: string, presetReason?: string) => {
    setDisposalDocId(docId);
    setDisposalMethod('CertifiedShredding');
    setDisposalReason(
      presetReason ||
        'Retention maturity period elapsed with zero active litigation or financial audit claims.'
    );
    setDisposalError('');
    setIsDisposalModalOpen(true);
  };

  const handleCreateDisposal = async (e: React.FormEvent) => {
    e.preventDefault();
    setDisposalError('');
    if (!disposalDocId) {
      setDisposalError('Select an eligible expired document.');
      return;
    }
    if (disposalReason.trim().length < 10) {
      setDisposalError('Disposal justification must be at least 10 characters.');
      return;
    }
    try {
      setIsSubmitting(true);
      const res = await apiFetch('/api/v1/records/disposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: disposalDocId,
          method: disposalMethod,
          reason: disposalReason.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setDisposalError(localizeErrorMessage(data.error || 'Failed to submit disposal request.', language));
        return;
      }
      setIsDisposalModalOpen(false);
      await fetchRecordsData();
      notify(
        'success',
        `Disposal authorization request submitted for ${data.registrationNumber} (${data.requiredApprovals} approval(s) required).`
      );
    } catch {
      setDisposalError(localizeErrorMessage('Network error submitting disposal request.', language));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecideDisposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decisionTarget) return;
    setDecisionError('');
    if (decisionComments.trim().length < 10) {
      setDecisionError('Authorization comment must be at least 10 characters.');
      return;
    }
    try {
      setIsSubmitting(true);
      const res = await apiFetch(`/api/v1/records/disposals/${decisionTarget.id}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision: decisionChoice,
          comments: decisionComments.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setDecisionError(localizeErrorMessage(data.error || 'Failed to record authorization decision.', language));
        return;
      }
      setDecisionTarget(null);
      await fetchRecordsData();
      notify('success', `Disposal ${decisionChoice.toLowerCase()} recorded.`);
    } catch {
      setDecisionError(localizeErrorMessage('Network error recording decision.', language));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExecuteDisposal = async () => {
    if (!executeTarget) return;
    setExecuteError('');
    try {
      setIsSubmitting(true);
      const res = await apiFetch(`/api/v1/records/disposals/${executeTarget.id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok) {
        setExecuteError(localizeErrorMessage(data.error || 'Failed to execute disposal.', language));
        return;
      }
      setExecuteTarget(null);
      await Promise.all([fetchRecordsData(), refreshData()]);
      notify(
        'success',
        `Irreversible disposal executed. Certificate ${data.certificate?.certificateNumber} issued.`
      );
      if (data.certificate) {
        setSelectedCertificate(data.certificate);
      }
    } catch {
      setExecuteError(localizeErrorMessage('Network error executing disposal.', language));
    } finally {
      setIsSubmitting(false);
    }
  };

  const pendingDisposalCount = disposals.filter(
    (d) => d.status === 'PendingApproval' || d.status === 'ApprovedReady'
  ).length;
  const openRetrievalsCount = retrievals.filter(
    (r) => r.status === 'Requested' || r.status === 'Fulfilled'
  ).length;
  const alertCounts = alertSummary?.counts || {
    overdue: disposalEligibleDocs.length,
    critical30: 0,
    upcoming90: 0,
    totalActionable: disposalEligibleDocs.length,
    permanent: activeDocs.filter((d) => d.retentionYears === 0).length,
    held: heldDocs.length,
    activeDisposalWorkflows: pendingDisposalCount
  };

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t('navArchives')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {language === 'am'
              ? 'ብልህ የሰነድ ማቆያ ጊዜ ስሌት፣ የማስወገጃ ማንቂያዎች፣ የሕግ ከለላ (Legal Hold) እና የማህደር አስተዳደር'
              : 'Intelligent disposition calculation by regulatory category & trigger event, proactive disposal alerts, legal holds, and vault custody.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 border-b xl:border-b-0 border-slate-200 dark:border-slate-800 self-start">
          {(
            [
              { id: 'alerts', label: `${t('retentionAlertsTab')} (${alertSummary?.alerts.length ?? disposalEligibleDocs.length})` },
              { id: 'retention', label: `${t('retentionSchedulesTab')} (${schedules.length})` },
              { id: 'legalHold', label: `${t('legalHoldsTab')} (${heldDocs.length})` },
              { id: 'archiveVault', label: `${t('archiveVaultTab')} (${archivedDocs.length})` },
              { id: 'disposal', label: `${t('disposalWorkflowTab')} (${disposals.length})` },
              { id: 'certificates', label: `${t('certificatesTab')} (${certificates.length})` }
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-teal-600 text-teal-700 dark:text-teal-300'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Inline Toast */}
      {toast && (
        <div
          className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-xs font-medium ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/50 dark:border-rose-800 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
          <button type="button" onClick={() => setToast(null)} className="opacity-70 hover:opacity-100">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="text-[11px] font-medium text-slate-500">{t('urgencyOverdueLabel')}</div>
          <div className="text-xl font-bold text-rose-700 dark:text-rose-400 mt-1 tabular-nums">
            {alertCounts.overdue}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
            {alertCounts.totalActionable} {language === 'am' ? 'እርምጃ የሚፈልጉ' : 'Actionable'}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="text-[11px] font-medium text-slate-500">{t('urgencyCritical30Label')}</div>
          <div className="text-xl font-bold text-amber-700 dark:text-amber-400 mt-1 tabular-nums">
            {alertCounts.critical30}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
            {alertCounts.upcoming90} {language === 'am' ? 'በ90 ቀን ውስጥ' : 'Due <= 90d'}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="text-[11px] font-medium text-slate-500">Retention Policies</div>
          <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1 tabular-nums">
            {schedules.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
            {alertCounts.permanent} {language === 'am' ? 'ቋሚ ሰነዶች' : 'Permanent Docs'}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="text-[11px] font-medium text-slate-500">Active Legal Holds</div>
          <div className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-1 tabular-nums">
            {heldDocs.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Immutable Freeze</div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="text-[11px] font-medium text-slate-500">Archived Records</div>
          <div className="text-xl font-bold text-teal-700 dark:text-teal-400 mt-1 tabular-nums">
            {archivedDocs.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
            {openRetrievalsCount} Open Retrievals
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="text-[11px] font-medium text-slate-500">Disposal & Certs</div>
          <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1 tabular-nums">
            {pendingDisposalCount} / {certificates.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Active / SHA-256 Issued</div>
        </div>
      </div>

      {/* TAB 0: Proactive Pending Disposal Alerts */}
      {activeTab === 'alerts' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <BellRing className="w-4 h-4 text-amber-600" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {t('pendingAlertsTitle')}
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t('pendingAlertsSubtitle')}
                {alertSummary?.lastScanAt && (
                  <span className="font-mono tabular-nums ml-2 text-slate-400">
                    · Last scan: {formatEthiopianDate(alertSummary.lastScanAt, language, true)}
                  </span>
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {canManageArchives && (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleRecalculatePortfolio}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{t('recalculatePortfolioBtn')}</span>
                </button>
              )}
              {canScanAlerts && (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleScanAndNotify}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  <BellRing className="w-3.5 h-3.5" />
                  <span>{t('scanNotifyManagersBtn')}</span>
                </button>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/20">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {(
                [
                  { id: 'All', label: `${language === 'am' ? 'ሁሉም' : 'All'} (${alertSummary?.alerts.length || 0})` },
                  { id: 'Overdue', label: `${t('urgencyOverdueLabel')} (${alertCounts.overdue})` },
                  { id: 'Critical30', label: `${t('urgencyCritical30Label')} (${alertCounts.critical30})` },
                  { id: 'Upcoming90', label: `${t('urgencyUpcoming90Label')} (${alertCounts.upcoming90})` }
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setAlertUrgencyFilter(f.id)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition-colors ${
                    alertUrgencyFilter === f.id
                      ? 'bg-teal-700 text-white border-teal-700'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:text-slate-900'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={alertCategoryFilter}
                onChange={(e) => setAlertCategoryFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
              >
                <option value="All">All Regulatory Categories</option>
                {REGULATORY_CATEGORIES.map((rc) => (
                  <option key={rc.value} value={rc.value}>
                    {language === 'am' ? rc.labelAm : rc.labelEn}
                  </option>
                ))}
              </select>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={alertSearch}
                  onChange={(e) => setAlertSearch(e.target.value)}
                  placeholder={language === 'am' ? 'ቁጥር ወይም ርዕስ ፈልግ...' : 'Search reg #, subject...'}
                  className="pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg w-48"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Record & Subject</th>
                  <th className="px-4 py-3">Regulatory Classification</th>
                  <th className="px-4 py-3">Clock Trigger & Anchor</th>
                  <th className="px-4 py-3">Calculated Disposition</th>
                  <th className="px-4 py-3">Window / Urgency</th>
                  <th className="px-4 py-3 text-right">Governance Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredAlerts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                      {language === 'am'
                        ? 'በተመረጠው መስፈርት የማስወገጃ ጊዜያቸው የቀረበ ሰነዶች የሉም።'
                        : 'No records within the selected pending disposal or maturity window.'}
                    </td>
                  </tr>
                ) : (
                  filteredAlerts.map((item) => {
                    const matchedDoc = documents.find((d) => d.id === item.documentId);
                    const urgencyTextClass =
                      item.urgency === 'Overdue'
                        ? 'text-rose-700 dark:text-rose-400 font-bold'
                        : item.urgency === 'Critical30'
                          ? 'text-amber-700 dark:text-amber-400 font-bold'
                          : 'text-teal-700 dark:text-teal-400 font-semibold';

                    return (
                      <tr key={item.documentId} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 max-w-xs">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => matchedDoc && setSelectedDocument(matchedDoc)}
                              className="font-mono font-bold text-teal-800 dark:text-teal-300 hover:underline"
                            >
                              {item.registrationNumber}
                            </button>
                            <span className="text-[11px] text-slate-400">
                              · {item.type} · {item.confidentiality}
                            </span>
                          </div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5 truncate">
                            {language === 'am' ? item.subjectAm || item.subjectEn : item.subjectEn}
                          </div>
                        </td>

                        <td className="px-4 py-3 max-w-xs">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {item.regulatoryCategory}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {item.retentionCategory} · {item.retentionYears} yrs
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-700 dark:text-slate-300">
                            {item.retentionTriggerEvent}
                          </div>
                          <div className="font-mono text-[11px] text-slate-500 tabular-nums">
                            {item.retentionTriggerDate.slice(0, 10)}
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <div className="font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                            {formatEthiopianDate(item.retentionExpiryDate, language)}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {item.disposalAction}
                          </div>
                        </td>

                        <td className="px-4 py-3 font-mono tabular-nums">
                          <div className={urgencyTextClass}>
                            {item.daysRemaining <= 0
                              ? `${Math.abs(item.daysRemaining)}d overdue · MATURE`
                              : `Due in ${item.daysRemaining}d`}
                          </div>
                          {item.hasActiveDisposalRequest && (
                            <div className="text-[11px] font-sans text-slate-500">
                              Disposal: {item.activeDisposalStatus}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            {item.daysRemaining <= 0 && !item.hasActiveDisposalRequest && canManageArchives && (
                              <button
                                type="button"
                                onClick={() =>
                                  openDisposalForDoc(
                                    item.documentId,
                                    `Mature per ${item.retentionCategory} (${item.governingLegislation}); disposition date ${item.retentionExpiryDate.slice(0, 10)} elapsed.`
                                  )
                                }
                                className="px-2.5 py-1 text-[11px] font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-md"
                              >
                                {t('initiateDisposalAction')}
                              </button>
                            )}
                            {canLegalHold && (
                              <button
                                type="button"
                                onClick={() => openLegalHoldDialog(item.documentId, true)}
                                className="px-2.5 py-1 text-[11px] font-semibold text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-md"
                              >
                                {t('applyHoldAction')}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 1: Intelligent Retention Schedules & Simulator */}
      {activeTab === 'retention' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  EPSS Intelligent Records Retention Rules
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Disposition dates auto-calculate using regulatory category, metadata keywords, trigger event clock, and rule priority.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const next = !isSimulatorOpen;
                    setIsSimulatorOpen(next);
                    if (next && !simResult) {
                      handleRunSimulation();
                    }
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-teal-800 dark:text-teal-200 border border-teal-200 dark:border-teal-800 bg-teal-50/70 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/50 rounded-lg transition-colors inline-flex items-center gap-1.5"
                >
                  <Calculator className="w-3.5 h-3.5" />
                  <span>{isSimulatorOpen ? 'Hide Disposition Simulator' : 'Disposition Calculator'}</span>
                </button>
                {canManageArchives && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setAssignDocId(activeDocs[0]?.id || '');
                        setAssignScheduleId(schedules[0]?.id || '');
                        setAssignError('');
                        setIsAssignScheduleOpen(true);
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      Assign Schedule to Record
                    </button>
                    <button
                      type="button"
                      onClick={openNewScheduleModal}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>New Policy</span>
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Interactive Disposition Calculator & Rule Simulator */}
            {isSimulatorOpen && (
              <form
                onSubmit={handleRunSimulation}
                className="p-5 bg-slate-50/80 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-800 space-y-4 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100">
                      <Sparkles className="w-4 h-4 text-teal-600" />
                      <span>{t('policySimulatorTitle')}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {t('policySimulatorSubtitle')}
                    </p>
                  </div>
                  <button
                    type="submit"
                    disabled={isSimulating}
                    className="px-3.5 py-1.5 font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg disabled:opacity-50"
                  >
                    {isSimulating ? 'Calculating...' : t('runSimulationBtn')}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Document Type
                    </label>
                    <select
                      value={simType}
                      onChange={(e) => setSimType(e.target.value as DocumentType)}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                    >
                      {ALL_DOC_TYPES.map((dt) => (
                        <option key={dt} value={dt}>
                          {dt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      {t('regulatoryCategoryLabel')}
                    </label>
                    <select
                      value={simRegCat}
                      onChange={(e) => setSimRegCat(e.target.value as RegulatoryCategory | '')}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                    >
                      <option value="">Auto-Detect from Subject Keywords</option>
                      {REGULATORY_CATEGORIES.map((rc) => (
                        <option key={rc.value} value={rc.value}>
                          {rc.labelEn}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Confidentiality
                    </label>
                    <select
                      value={simConf}
                      onChange={(e) => setSimConf(e.target.value as ConfidentialityLevel)}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                    >
                      {ALL_CONF_LEVELS.map((cl) => (
                        <option key={cl} value={cl}>
                          {cl}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Registration Date
                    </label>
                    <input
                      type="date"
                      value={simRegDate}
                      onChange={(e) => setSimRegDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Completion Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={simCompDate}
                      onChange={(e) => setSimCompDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Sample Subject / Metadata Text
                  </label>
                  <input
                    type="text"
                    value={simSubject}
                    onChange={(e) => setSimSubject(e.target.value)}
                    placeholder="e.g. Tender award framework agreement OR EFDA batch pharmacovigilance recall..."
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>

                {simResult && (
                  <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="md:col-span-2 space-y-1">
                      <div className="text-[11px] text-slate-500">Matched Policy & Governing Statute</div>
                      <div className="font-bold text-slate-900 dark:text-slate-100">
                        {simResult.retentionCategory}
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-300">
                        {simResult.regulatoryCategory} · {simResult.governingLegislation}
                      </div>
                      <div className="text-[11px] text-teal-700 dark:text-teal-300">
                        {simResult.retentionClassificationReason} ({Math.round(simResult.retentionConfidence * 100)}%)
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-[11px] text-slate-500">{t('retentionTriggerLabel')}</div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {simResult.retentionTriggerEvent}
                      </div>
                      <div className="font-mono text-[11px] text-slate-600 dark:text-slate-300 tabular-nums">
                        Anchor: {simResult.retentionTriggerDate.slice(0, 10)}
                      </div>
                      <div className="text-[11px] text-slate-500 tabular-nums">
                        Lead Alert: {simResult.alertLeadDays} days before maturity
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-[11px] text-slate-500">{t('calculatedDispositionDateLabel')}</div>
                      <div className="font-mono font-bold text-teal-700 dark:text-teal-300 tabular-nums">
                        {simResult.isPermanent
                          ? t('permanentRetentionLabel')
                          : formatEthiopianDate(simResult.retentionExpiryDate, language)}
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-300 font-mono tabular-nums">
                        {simResult.isPermanent
                          ? 'Exempt from destruction'
                          : `${simResult.retentionYears} yrs · Action: ${simResult.disposalAction}`}
                      </div>
                    </div>
                  </div>
                )}
              </form>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/70 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Record Category & Signals</th>
                    <th className="px-4 py-3">Regulatory & Trigger</th>
                    <th className="px-4 py-3">Retention / Lead Alert</th>
                    <th className="px-4 py-3">Governing Legislation</th>
                    <th className="px-4 py-3 text-right">Linked Docs</th>
                    {canManageArchives && <th className="px-4 py-3 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {schedules.map((sc) => {
                    const linkedCount = documents.filter((d) => d.retentionScheduleId === sc.id).length;
                    return (
                      <tr key={sc.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {sc.documentCategory}
                          </div>
                          {sc.notes && (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 max-w-md">
                              {sc.notes}
                            </div>
                          )}
                          {(sc.keywordPatterns?.length || sc.documentTypes?.length) ? (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                              {sc.documentTypes && sc.documentTypes.length > 0 && (
                                <span>Types: {sc.documentTypes.join(', ')}</span>
                              )}
                              {sc.keywordPatterns && sc.keywordPatterns.length > 0 && (
                                <span>
                                  {sc.documentTypes?.length ? ' · ' : ''}
                                  Keywords: {sc.keywordPatterns.slice(0, 5).join(', ')}
                                  {sc.keywordPatterns.length > 5 ? ` (+${sc.keywordPatterns.length - 5})` : ''}
                                </span>
                              )}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {sc.regulatoryCategory || 'GeneralAdministrative'}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                            {sc.retentionTriggerEvent || 'RegistrationDate'} · Prio {sc.priority ?? 75}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono tabular-nums">
                          {sc.retentionPeriodYears === 0 ? (
                            <span className="font-bold text-teal-700 dark:text-teal-300">
                              Permanent (0 yrs)
                            </span>
                          ) : (
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {sc.retentionPeriodYears} Years
                            </span>
                          )}
                          <div className="text-[11px] font-sans text-slate-500">
                            {sc.disposalAction} · Alert {sc.alertLeadDays ?? 90}d prior
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-xs">
                          {sc.governingLegislation}
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                          {linkedCount}
                        </td>
                        {canManageArchives && (
                          <td className="px-4 py-3 text-right">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => openEditScheduleModal(sc)}
                                className="p-1.5 text-slate-500 hover:text-teal-700 dark:hover:text-teal-300 rounded"
                                title="Edit retention schedule"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteScheduleTarget(sc)}
                                className="p-1.5 text-slate-500 hover:text-rose-600 rounded"
                                title="Delete retention schedule"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Legal Holds */}
      {activeTab === 'legalHold' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-rose-600" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Litigation & Audit Legal Hold Registry
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Records under Legal Hold cannot be edited, deleted, or disposed. Reason (minimum 20 characters) is strictly audited.
              </p>
            </div>
            {canLegalHold && (
              <button
                type="button"
                onClick={() => {
                  const candidate = activeDocs.find((d) => !d.legalHold)?.id || '';
                  openLegalHoldDialog(candidate, true);
                }}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-700 hover:bg-rose-800 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Apply Legal Hold</span>
              </button>
            )}
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {heldDocs.length === 0 ? (
              <div className="py-10 text-center text-slate-400">
                No active Legal Holds at this time.
              </div>
            ) : (
              heldDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedDocument(doc)}
                        className="font-mono font-bold text-teal-800 dark:text-teal-300 hover:underline"
                      >
                        {doc.registrationNumber}
                      </button>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
                        · IMMUTABLE LEGAL HOLD
                      </span>
                      <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                        · Retention Expiry:{' '}
                        {doc.retentionYears === 0
                          ? 'Permanent'
                          : formatEthiopianDate(doc.retentionExpiryDate, language)}
                      </span>
                    </div>
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {language === 'am' ? doc.subjectAm : doc.subjectEn}
                    </p>
                    {doc.legalHoldReason && (
                      <p className="text-[11px] text-rose-800 dark:text-rose-200 bg-rose-50/60 dark:bg-rose-950/30 px-2.5 py-1.5 rounded border border-rose-100 dark:border-rose-900/50">
                        <strong>Hold Reason:</strong> {doc.legalHoldReason}
                        {doc.legalHoldAppliedBy && (
                          <span className="text-slate-500 dark:text-slate-400">
                            {' '}
                            · Held by {doc.legalHoldAppliedBy}
                          </span>
                        )}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setSelectedDocument(doc)}
                      className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg"
                    >
                      Inspect
                    </button>
                    {canLegalHold && (
                      <button
                        type="button"
                        onClick={() => openLegalHoldDialog(doc.id, false)}
                        className="px-2.5 py-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-200 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center gap-1"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        <span>Remove Hold</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Archive Explorer & Retrieval Requests */}
      {activeTab === 'archiveVault' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <FolderArchive className="w-4 h-4 text-teal-600" />
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Permanent Archive Vault Explorer
                  </h2>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Browse archived institutional records by year, retention category, or storage location, and request temporary vault retrievals.
                </p>
              </div>
              {canManageArchives && (
                <button
                  type="button"
                  onClick={() => {
                    const candidate = activeDocs.find((d) => !d.isArchived && d.status !== 'Archived')?.id || '';
                    setTransferDocId(candidate);
                    setTransferLocationId(locationOptions[0]?.id || '');
                    setTransferScheduleId('');
                    setTransferNotes('');
                    setTransferError('');
                    setIsArchiveTransferOpen(true);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <FolderUp className="w-3.5 h-3.5" />
                  <span>Transfer to Archive</span>
                </button>
              )}
            </div>

            {/* Explorer Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={archiveSearch}
                  onChange={(e) => setArchiveSearch(e.target.value)}
                  placeholder="Search reg #, subject, vault path..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-teal-600"
                />
              </div>

              <select
                value={archiveYearFilter}
                onChange={(e) => setArchiveYearFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              >
                <option value="All">All Years</option>
                {archiveYears.map((y) => (
                  <option key={y} value={y}>
                    Year {y}
                  </option>
                ))}
              </select>

              <select
                value={archiveCategoryFilter}
                onChange={(e) => setArchiveCategoryFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              >
                <option value="All">All Retention Categories</option>
                {archiveCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <select
                value={archiveBranchFilter}
                onChange={(e) => setArchiveBranchFilter(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              >
                <option value="All">All Branches / Vaults</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.nameEn}
                  </option>
                ))}
              </select>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {filteredArchivedDocs.length === 0 ? (
                <div className="py-10 text-center text-slate-400">
                  No archived records match your current explorer filters.
                </div>
              ) : (
                filteredArchivedDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedDocument(doc)}
                          className="font-mono font-bold text-teal-800 dark:text-teal-300 hover:underline"
                        >
                          {doc.registrationNumber}
                        </button>
                        <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                          · {doc.retentionCategory || 'General Record'}
                        </span>
                        {doc.regulatoryCategory && (
                          <span className="text-[11px] font-medium text-teal-700 dark:text-teal-400">
                            · {doc.regulatoryCategory}
                          </span>
                        )}
                        {doc.legalHold && (
                          <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400">
                            · LEGAL HOLD
                          </span>
                        )}
                      </div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {language === 'am' ? doc.subjectAm : doc.subjectEn}
                      </div>
                      <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-3">
                        <span>Location: {doc.archiveLocationPath || branchNameById.get(doc.branchId) || doc.branchId}</span>
                        <span className="font-mono tabular-nums">
                          Expiry:{' '}
                          {doc.retentionYears === 0
                            ? 'Permanent (0 yrs)'
                            : formatEthiopianDate(doc.retentionExpiryDate, language)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setSelectedDocument(doc)}
                        className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg"
                      >
                        Open Record
                      </button>
                      <button
                        type="button"
                        onClick={() => openRetrievalModal(doc.id)}
                        className="px-2.5 py-1.5 text-xs font-semibold text-teal-800 dark:text-teal-200 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:hover:bg-teal-900/60 border border-teal-200 dark:border-teal-800 rounded-lg"
                      >
                        Request Retrieval
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Archive Retrieval Requests Queue */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Archive Retrieval Requests ({retrievals.length})
                </h3>
              </div>
              {archivedDocs.length > 0 && (
                <button
                  type="button"
                  onClick={() => openRetrievalModal(archivedDocs[0].id)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg"
                >
                  + New Retrieval Request
                </button>
              )}
            </div>

            {retrievals.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                No archive retrieval requests recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/70 text-[11px] uppercase text-slate-500 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-3 py-2.5">Registration #</th>
                      <th className="px-3 py-2.5">Requested By</th>
                      <th className="px-3 py-2.5">Justification</th>
                      <th className="px-3 py-2.5">Return By</th>
                      <th className="px-3 py-2.5">Status</th>
                      {canFulfillRetrieval && <th className="px-3 py-2.5 text-right">Workflow</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {retrievals.map((retv) => (
                      <tr key={retv.id}>
                        <td className="px-3 py-2.5 font-mono font-bold text-slate-900 dark:text-slate-100">
                          {retv.registrationNumber}
                        </td>
                        <td className="px-3 py-2.5 text-slate-700 dark:text-slate-300">
                          {retv.requestedByName}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300 max-w-xs">
                          {retv.reason}
                        </td>
                        <td className="px-3 py-2.5 font-mono tabular-nums text-slate-600 dark:text-slate-300">
                          {retv.neededUntilDate.slice(0, 10)}
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className={`text-[11px] font-bold uppercase ${
                              retv.status === 'Returned'
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : retv.status === 'Fulfilled'
                                  ? 'text-teal-700 dark:text-teal-400'
                                  : retv.status === 'Denied'
                                    ? 'text-rose-700 dark:text-rose-400'
                                    : 'text-amber-700 dark:text-amber-400'
                            }`}
                          >
                            {retv.status}
                          </span>
                        </td>
                        {canFulfillRetrieval && (
                          <td className="px-3 py-2.5 text-right space-x-1.5">
                            {retv.status === 'Requested' && (
                              <>
                                <button
                                  type="button"
                                  disabled={isSubmitting}
                                  onClick={() => handleUpdateRetrievalStatus(retv.id, 'Fulfilled')}
                                  className="px-2 py-1 text-[11px] font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded"
                                >
                                  Fulfill
                                </button>
                                <button
                                  type="button"
                                  disabled={isSubmitting}
                                  onClick={() => handleUpdateRetrievalStatus(retv.id, 'Denied')}
                                  className="px-2 py-1 text-[11px] font-semibold text-rose-700 border border-rose-200 hover:bg-rose-50 rounded"
                                >
                                  Deny
                                </button>
                              </>
                            )}
                            {retv.status === 'Fulfilled' && (
                              <button
                                type="button"
                                disabled={isSubmitting}
                                onClick={() => handleUpdateRetrievalStatus(retv.id, 'Returned')}
                                className="px-2 py-1 text-[11px] font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded"
                              >
                                Mark Returned
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: Disposal Authorization Workflow */}
      {activeTab === 'disposal' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Gavel className="w-4 h-4 text-amber-700 dark:text-amber-400" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Authorized Disposal & Destruction Workflow
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Disposal is permitted only after retention expiry and all approvals. Confidential & Secret records require at least 2 independent approvers.
              </p>
            </div>
            {canManageArchives && (
              <button
                type="button"
                onClick={() => openDisposalForDoc(disposalEligibleDocs[0]?.id || '', '')}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Request Disposal</span>
              </button>
            )}
          </div>

          {disposals.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">
              No disposal authorization requests initiated yet. Mature eligible records: {disposalEligibleDocs.length}.
            </div>
          ) : (
            <div className="space-y-3">
              {disposals.map((req) => {
                const approvedCount = req.approvals.filter((a) => a.decision === 'Approved').length;
                const cert = req.certificateId
                  ? certificates.find((c) => c.id === req.certificateId)
                  : undefined;

                return (
                  <div
                    key={req.id}
                    className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 space-y-3 text-xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                          {req.registrationNumber}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                          · {req.confidentiality}
                        </span>
                        <span
                          className={`text-[11px] font-bold uppercase ${
                            req.status === 'Executed'
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : req.status === 'ApprovedReady'
                                ? 'text-teal-700 dark:text-teal-400'
                                : req.status === 'Rejected'
                                  ? 'text-rose-700 dark:text-rose-400'
                                  : 'text-amber-700 dark:text-amber-400'
                          }`}
                        >
                          · {req.status}
                        </span>
                      </div>

                      <div className="font-mono text-[11px] text-slate-500 tabular-nums">
                        Approvals: <strong>{approvedCount}</strong> / {req.requiredApprovals} Independent
                      </div>
                    </div>

                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{req.subjectEn}</p>
                      <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                        <strong>Method:</strong> {req.method} · <strong>Retention Expired:</strong>{' '}
                        {req.retentionExpiryDate.slice(0, 10)} · <strong>Requested by:</strong>{' '}
                        {req.requestedByName}
                      </p>
                      <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                        <strong>Justification:</strong> {req.reason}
                      </p>
                    </div>

                    {req.approvals.length > 0 && (
                      <div className="border-t border-slate-200 dark:border-slate-700 pt-2.5 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Authorization Sign-Offs
                        </span>
                        {req.approvals.map((appr) => (
                          <div key={appr.id} className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                            <span>
                              <strong className={appr.decision === 'Approved' ? 'text-teal-700 dark:text-teal-300' : 'text-rose-600'}>
                                [{appr.decision}]
                              </strong>{' '}
                              {appr.approverName} ({appr.approverRole}) — "{appr.comments}"
                            </span>
                            <span className="font-mono text-slate-400 tabular-nums">
                              {formatEthiopianDate(appr.decidedAt, language)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                      {req.status === 'PendingApproval' && canDecideDisposal && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setDecisionTarget(req);
                              setDecisionChoice('Approved');
                              setDecisionComments('');
                              setDecisionError('');
                            }}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg"
                          >
                            Approve Disposal
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDecisionTarget(req);
                              setDecisionChoice('Rejected');
                              setDecisionComments('');
                              setDecisionError('');
                            }}
                            className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg"
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {req.status === 'ApprovedReady' && canExecuteDisposal && (
                        <button
                          type="button"
                          onClick={() => {
                            setExecuteTarget(req);
                            setExecuteError('');
                          }}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-700 hover:bg-rose-800 rounded-lg flex items-center gap-1.5"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>Execute Irreversible Disposal</span>
                        </button>
                      )}

                      {req.status === 'Executed' && cert && (
                        <button
                          type="button"
                          onClick={() => setSelectedCertificate(cert)}
                          className="px-3 py-1.5 text-xs font-semibold text-teal-800 dark:text-teal-200 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 rounded-lg flex items-center gap-1.5"
                        >
                          <Award className="w-3.5 h-3.5" />
                          <span>View Certificate ({cert.certificateNumber})</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: Disposal Certificates */}
      {activeTab === 'certificates' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-teal-600" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Issued Certificates of Destruction
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Immutable cryptographic proof of authorized records disposal.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/70 text-[11px] uppercase text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Certificate #</th>
                  <th className="px-4 py-3">Document #</th>
                  <th className="px-4 py-3">Subject & Method</th>
                  <th className="px-4 py-3">Approvers</th>
                  <th className="px-4 py-3">Issued At</th>
                  <th className="px-4 py-3 text-right">Certificate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {certificates.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      No disposal certificates issued yet.
                    </td>
                  </tr>
                ) : (
                  certificates.map((cert) => (
                    <tr key={cert.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-mono font-bold text-teal-800 dark:text-teal-300 tabular-nums">
                        {cert.certificateNumber}
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold text-slate-900 dark:text-slate-100">
                        {cert.registrationNumber}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {cert.subjectEn}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {cert.destructionMethod} · {cert.confidentiality}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {cert.approvers.map((a) => a.name).join(', ')}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] tabular-nums text-slate-500">
                        {formatEthiopianDate(cert.issuedAt, language)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedCertificate(cert)}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg inline-flex items-center gap-1.5"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>View / Print</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Create / Edit Intelligent Retention Schedule */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleSaveSchedule}
            className="bg-white dark:bg-slate-900 rounded-xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden my-4"
          >
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {editingSchedule ? 'Edit Intelligent Retention Rule' : 'Create Intelligent Retention Rule'}
              </h3>
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3.5 text-xs max-h-[75vh] overflow-y-auto">
              {scError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800">
                  {scError}
                </div>
              )}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Document Category *
                </label>
                <input
                  type="text"
                  value={scCategory}
                  onChange={(e) => setScCategory(e.target.value)}
                  placeholder="e.g. Narcotic & Controlled Substances Distribution Dossiers"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('regulatoryCategoryLabel')} *
                  </label>
                  <select
                    value={scRegCategory}
                    onChange={(e) => setScRegCategory(e.target.value as RegulatoryCategory)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  >
                    {REGULATORY_CATEGORIES.map((rc) => (
                      <option key={rc.value} value={rc.value}>
                        {rc.labelEn}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('retentionTriggerLabel')} *
                  </label>
                  <select
                    value={scTriggerEvent}
                    onChange={(e) => setScTriggerEvent(e.target.value as RetentionTriggerEvent)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  >
                    {TRIGGER_EVENTS.map((te) => (
                      <option key={te.value} value={te.value}>
                        {te.labelEn}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Retention Yrs (0 = Perm) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={scYears}
                    onChange={(e) => setScYears(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('alertLeadDaysLabel')}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={365}
                    value={scAlertLeadDays}
                    onChange={(e) => setScAlertLeadDays(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('rulePriorityLabel')}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={scPriority}
                    onChange={(e) => setScPriority(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Maturity Action *
                  </label>
                  <select
                    value={Number(scYears) === 0 ? 'PermanentArchive' : scAction}
                    onChange={(e) =>
                      setScAction(e.target.value as RetentionSchedule['disposalAction'])
                    }
                    disabled={Number(scYears) === 0}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  >
                    <option value="ReviewAtMaturity">ReviewAtMaturity</option>
                    <option value="AuthorizedDestruction">AuthorizedDestruction</option>
                    <option value="PermanentArchive">PermanentArchive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Governing Legislation / Proclamation *
                </label>
                <input
                  type="text"
                  value={scLegislation}
                  onChange={(e) => setScLegislation(e.target.value)}
                  placeholder="e.g. Ethiopian Food & Drug Administration Proclamation No. 1112/2019"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('keywordsFieldLabel')}
                </label>
                <input
                  type="text"
                  value={scKeywordsInput}
                  onChange={(e) => setScKeywordsInput(e.target.value)}
                  placeholder="e.g. narcotic, controlled substance, efda, cold chain, batch recall"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Auto-Assign to Document Types
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_DOC_TYPES.map((dt) => {
                    const checked = scDocTypes.includes(dt);
                    return (
                      <button
                        key={dt}
                        type="button"
                        onClick={() =>
                          setScDocTypes((prev) =>
                            checked ? prev.filter((x) => x !== dt) : [...prev, dt]
                          )
                        }
                        className={`px-2 py-1 text-[11px] rounded border transition-colors ${
                          checked
                            ? 'bg-teal-700 text-white border-teal-700'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {dt}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Match Confidentiality Levels
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_CONF_LEVELS.map((cl) => {
                    const checked = scConfLevels.includes(cl);
                    return (
                      <button
                        key={cl}
                        type="button"
                        onClick={() =>
                          setScConfLevels((prev) =>
                            checked ? prev.filter((x) => x !== cl) : [...prev, cl]
                          )
                        }
                        className={`px-2 py-1 text-[11px] rounded border transition-colors ${
                          checked
                            ? 'bg-teal-700 text-white border-teal-700'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {cl}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Governance Notes
                </label>
                <textarea
                  rows={2}
                  value={scNotes}
                  onChange={(e) => setScNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>
            </div>
            <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsScheduleModalOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg disabled:opacity-50"
              >
                {editingSchedule ? 'Save Policy Changes' : 'Create Policy'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Delete Retention Schedule Confirmation */}
      {deleteScheduleTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl p-5 space-y-4 text-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Delete Retention Schedule?
            </h3>
            <p className="text-slate-600 dark:text-slate-300">
              Are you sure you want to delete <strong>{deleteScheduleTarget.documentCategory}</strong>? Schedules with active linked documents cannot be deleted.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteScheduleTarget(null)}
                className="px-3 py-1.5 font-semibold text-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleDeleteSchedule}
                className="px-4 py-1.5 font-semibold text-white bg-rose-700 hover:bg-rose-800 rounded-lg"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Assign Schedule to Document */}
      {isAssignScheduleOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleAssignSchedule}
            className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Assign Retention Schedule
              </h3>
              <button
                type="button"
                onClick={() => setIsAssignScheduleOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              {assignError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800">
                  {assignError}
                </div>
              )}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Record *
                </label>
                <select
                  value={assignDocId}
                  onChange={(e) => setAssignDocId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                >
                  {activeDocs.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.registrationNumber} — {d.subjectEn.slice(0, 48)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Retention Policy *
                </label>
                <select
                  value={assignScheduleId}
                  onChange={(e) => setAssignScheduleId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                >
                  {schedules.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.documentCategory} ({s.retentionPeriodYears === 0 ? 'Permanent' : `${s.retentionPeriodYears} yrs · ${s.retentionTriggerEvent || 'RegistrationDate'}`})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAssignScheduleOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg"
              >
                Recalculate Retention
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Apply / Remove Legal Hold */}
      {isLegalHoldModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleLegalHoldSubmit}
            className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {holdTargetActive ? 'Apply Litigation Legal Hold' : 'Release Legal Hold'}
              </h3>
              <button
                type="button"
                onClick={() => setIsLegalHoldModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              {holdError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800">
                  {holdError}
                </div>
              )}
              {holdTargetActive && (
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Document to Freeze *
                  </label>
                  <select
                    value={holdDocId}
                    onChange={(e) => setHoldDocId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  >
                    {activeDocs
                      .filter((d) => !d.legalHold)
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.registrationNumber} — {d.subjectEn.slice(0, 48)}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Legal Authorization Reason (min 20 chars) *
                  </label>
                  <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                    {holdReason.trim().length} / 20
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={holdReason}
                  onChange={(e) => setHoldReason(e.target.value)}
                  placeholder="Provide court order, OFAG audit reference, or regulatory investigation directive..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  required
                />
              </div>
            </div>
            <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsLegalHoldModalOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-4 py-1.5 text-xs font-semibold text-white rounded-lg ${
                  holdTargetActive ? 'bg-rose-700 hover:bg-rose-800' : 'bg-emerald-700 hover:bg-emerald-800'
                }`}
              >
                {holdTargetActive ? 'Freeze Record Under Legal Hold' : 'Release Hold'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Transfer to Archive Vault */}
      {isArchiveTransferOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleTransferToArchive}
            className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Transfer Record to Permanent Archive Vault
              </h3>
              <button
                type="button"
                onClick={() => setIsArchiveTransferOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              {transferError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800">
                  {transferError}
                </div>
              )}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Document to Archive *
                </label>
                <select
                  value={transferDocId}
                  onChange={(e) => setTransferDocId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                >
                  {activeDocs
                    .filter((d) => !d.isArchived && d.status !== 'Archived')
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.registrationNumber} — {d.subjectEn.slice(0, 48)}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Vault Storage Location
                </label>
                <select
                  value={transferLocationId}
                  onChange={(e) => setTransferLocationId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                >
                  <option value="">Default Central Archive Room</option>
                  {locationOptions.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Override Retention Schedule (optional)
                </label>
                <select
                  value={transferScheduleId}
                  onChange={(e) => setTransferScheduleId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                >
                  <option value="">Keep current retention schedule</option>
                  {schedules.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.documentCategory} ({s.retentionPeriodYears === 0 ? 'Permanent' : `${s.retentionPeriodYears} yrs`})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Archival Transfer Notes
                </label>
                <textarea
                  rows={2}
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  placeholder="Boxing batch or vault inspection notes..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>
            </div>
            <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsArchiveTransferOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg"
              >
                Confirm Archive Transfer
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Request Archive Retrieval */}
      {isRetrievalModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleRequestRetrieval}
            className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Request Archive Vault Retrieval
              </h3>
              <button
                type="button"
                onClick={() => setIsRetrievalModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              {retrievalError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800">
                  {retrievalError}
                </div>
              )}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Archived Document *
                </label>
                <select
                  value={retrievalDocId}
                  onChange={(e) => setRetrievalDocId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                >
                  {archivedDocs.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.registrationNumber} — {d.subjectEn.slice(0, 48)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Needed Until Return Date *
                </label>
                <input
                  type="date"
                  value={retrievalNeededDate}
                  onChange={(e) => setRetrievalNeededDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                  required
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Retrieval Justification (min 10 chars) *
                </label>
                <textarea
                  rows={3}
                  value={retrievalReason}
                  onChange={(e) => setRetrievalReason(e.target.value)}
                  placeholder="Reason for temporary vault checkout (e.g. EFDA audit verification)..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  required
                />
              </div>
            </div>
            <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsRetrievalModalOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg"
              >
                Submit Retrieval Request
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Request Disposal Authorization */}
      {isDisposalModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateDisposal}
            className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Initiate Record Disposal Request
              </h3>
              <button
                type="button"
                onClick={() => setIsDisposalModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              {disposalError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800">
                  {disposalError}
                </div>
              )}

              <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-[11px]">
                Only records past retention expiry without Legal Hold and without 0-year Permanent Retention appear below. Confidential/Secret records require 2 independent approvals.
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Eligible Matured Record *
                </label>
                <select
                  value={disposalDocId}
                  onChange={(e) => setDisposalDocId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                >
                  {disposalEligibleDocs.length === 0 ? (
                    <option value="">No expired non-held records eligible</option>
                  ) : (
                    disposalEligibleDocs.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.registrationNumber} [{d.confidentiality}] — Exp: {d.retentionExpiryDate.slice(0, 10)}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Disposal / Destruction Method *
                </label>
                <select
                  value={disposalMethod}
                  onChange={(e) => setDisposalMethod(e.target.value as DisposalRequest['method'])}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                >
                  <option value="CertifiedShredding">Certified Cross-Cut Shredding</option>
                  <option value="DigitalPurge">Cryptographic Digital Purge</option>
                  <option value="NationalArchivesTransfer">National Archives (NALA) Transfer</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Disposal Justification (min 10 chars) *
                </label>
                <textarea
                  rows={3}
                  value={disposalReason}
                  onChange={(e) => setDisposalReason(e.target.value)}
                  placeholder="Retention period matured; zero open litigation or financial claims..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  required
                />
              </div>
            </div>
            <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsDisposalModalOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || disposalEligibleDocs.length === 0}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 rounded-lg disabled:opacity-50"
              >
                Submit for Authorization
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Approve / Reject Disposal */}
      {decisionTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleDecideDisposal}
            className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {decisionChoice === 'Approved' ? 'Approve Record Disposal' : 'Reject Disposal Request'}
              </h3>
              <button
                type="button"
                onClick={() => setDecisionTarget(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              {decisionError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800">
                  {decisionError}
                </div>
              )}
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="font-mono font-bold text-slate-900 dark:text-slate-100">
                  {decisionTarget.registrationNumber} ({decisionTarget.confidentiality})
                </div>
                <div className="text-slate-600 dark:text-slate-300 mt-0.5">{decisionTarget.subjectEn}</div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Independent Authorization Comment (min 10 chars) *
                </label>
                <textarea
                  rows={3}
                  value={decisionComments}
                  onChange={(e) => setDecisionComments(e.target.value)}
                  placeholder="Verified retention schedule expiry and absence of regulatory holds..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  required
                />
              </div>
            </div>
            <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDecisionTarget(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-4 py-1.5 text-xs font-semibold text-white rounded-lg ${
                  decisionChoice === 'Approved'
                    ? 'bg-teal-700 hover:bg-teal-800'
                    : 'bg-rose-700 hover:bg-rose-800'
                }`}
              >
                Confirm {decisionChoice}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Irreversible Disposal Execution Confirm */}
      {executeTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full border border-rose-300 dark:border-rose-800 shadow-xl p-5 space-y-4 text-xs">
            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <h3 className="text-sm font-bold">Execute Irreversible Disposal?</h3>
            </div>
            {executeError && (
              <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800">
                {executeError}
              </div>
            )}
            <p className="text-slate-600 dark:text-slate-300">
              You are about to permanently mark{' '}
              <strong className="font-mono text-slate-900 dark:text-slate-100">
                {executeTarget.registrationNumber}
              </strong>{' '}
              as <strong>Disposed</strong> via <strong>{executeTarget.method}</strong> and issue an official Certificate of Destruction. This action is irreversible and permanently audited.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setExecuteTarget(null)}
                className="px-3 py-1.5 font-semibold text-slate-600 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleExecuteDisposal}
                className="px-4 py-1.5 font-semibold text-white bg-rose-700 hover:bg-rose-800 rounded-lg"
              >
                Execute & Issue Certificate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Certificate of Destruction Viewer / Print / Download */}
      {selectedCertificate && (
        <DisposalCertificateModal
          certificate={selectedCertificate}
          language={language}
          onClose={() => setSelectedCertificate(null)}
        />
      )}
    </div>
  );
};
