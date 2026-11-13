import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  Archive,
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  FolderTree,
  History,
  MapPin,
  Plus,
  Printer,
  Search,
  ShieldAlert,
  User as UserIcon,
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import { formatEthiopianDate } from '../../lib/translations.js';
import {
  DocumentItem,
  MissingPhysicalIncident,
  PhysicalFileRecord,
  PhysicalHandoverMovement,
  PhysicalLocationNode,
  User
} from '../../types/index.js';
import { LocationHierarchyTree } from './LocationHierarchyTree.js';
import { PhysicalLabelModal } from './PhysicalLabelModal.js';

type TrackingSubTab = 'files' | 'locations' | 'handovers' | 'incidents';
type FileStatusFilter = 'All' | 'Archived' | 'CheckedOut' | 'InTransit' | 'Missing' | 'Overdue';

export const PhysicalTrackingView: React.FC = () => {
  const {
    documents,
    branches,
    currentUser,
    language,
    refreshData,
    setSelectedDocument,
    t
  } = useApp();

  const [subTab, setSubTab] = useState<TrackingSubTab>('files');
  const [files, setFiles] = useState<PhysicalFileRecord[]>([]);
  const [locations, setLocations] = useState<PhysicalLocationNode[]>([]);
  const [handovers, setHandovers] = useState<PhysicalHandoverMovement[]>([]);
  const [overdueItems, setOverdueItems] = useState<Array<PhysicalFileRecord & { daysOverdue: number }>>([]);
  const [incidents, setIncidents] = useState<MissingPhysicalIncident[]>([]);
  const [staffUsers, setStaffUsers] = useState<User[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FileStatusFilter>('All');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [handoverTarget, setHandoverTarget] = useState<PhysicalFileRecord | null>(null);
  const [acknowledgeTarget, setAcknowledgeTarget] = useState<PhysicalHandoverMovement | null>(null);
  const [missingTarget, setMissingTarget] = useState<PhysicalFileRecord | null>(null);
  const [timelineTarget, setTimelineTarget] = useState<PhysicalFileRecord | null>(null);
  const [labelTarget, setLabelTarget] = useState<PhysicalFileRecord | null>(null);
  const [resolveTarget, setResolveTarget] = useState<MissingPhysicalIncident | null>(null);

  // Register Physical File form state
  const [regDocId, setRegDocId] = useState('');
  const [regLocationId, setRegLocationId] = useState('');
  const [regFileCode, setRegFileCode] = useState('');
  const [regCustodianId, setRegCustodianId] = useState('');
  const [regExpectedReturn, setRegExpectedReturn] = useState('');
  const [regError, setRegError] = useState('');

  // Handover form state
  const [toCustodianId, setToCustodianId] = useState('');
  const [targetDept, setTargetDept] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [targetLocationId, setTargetLocationId] = useState('');
  const [handoverError, setHandoverError] = useState('');

  // Acknowledge form state
  const [ackReturnToArchive, setAckReturnToArchive] = useState(false);
  const [ackNotes, setAckNotes] = useState('');
  const [ackError, setAckError] = useState('');

  // Report Missing form state
  const [missingReason, setMissingReason] = useState('');
  const [missingUrgency, setMissingUrgency] = useState<'Medium' | 'High' | 'Critical'>('High');
  const [missingError, setMissingError] = useState('');

  // Resolve Missing Incident state
  const [resolveStatus, setResolveStatus] = useState<'Investigating' | 'Recovered'>('Recovered');
  const [resolveNotes, setResolveNotes] = useState('');
  const [resolveError, setResolveError] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const notify = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast((curr) => (curr?.message === message ? null : curr));
    }, 5000);
  }, []);

  const fetchTrackingData = useCallback(async () => {
    try {
      const [filesRes, locsRes, handoversRes, overdueRes, incRes, usersRes] = await Promise.all([
        fetch('/api/v1/tracking/files').then((r) => (r.ok ? r.json() : [])),
        fetch('/api/v1/tracking/locations').then((r) => (r.ok ? r.json() : [])),
        fetch('/api/v1/tracking/handovers').then((r) => (r.ok ? r.json() : [])),
        fetch('/api/v1/tracking/overdue').then((r) => (r.ok ? r.json() : [])),
        fetch('/api/v1/tracking/missing-incidents').then((r) => (r.ok ? r.json() : [])),
        fetch('/api/v1/organizations/users').then((r) => (r.ok ? r.json() : []))
      ]);

      setFiles(Array.isArray(filesRes) ? filesRes : []);
      setLocations(Array.isArray(locsRes) ? locsRes : []);
      setHandovers(Array.isArray(handoversRes) ? handoversRes : []);
      setOverdueItems(Array.isArray(overdueRes) ? overdueRes : []);
      setIncidents(Array.isArray(incRes) ? incRes : []);
      setStaffUsers(Array.isArray(usersRes) ? usersRes.filter((u: User) => u.status === 'Active') : []);
    } catch (e) {
      console.error('Failed loading physical tracking data:', e);
    }
  }, []);

  useEffect(() => {
    fetchTrackingData();
  }, [fetchTrackingData]);

  const docById = useMemo(() => {
    const map = new Map<string, DocumentItem>();
    for (const d of documents) map.set(d.id, d);
    return map;
  }, [documents]);

  const overdueByFileId = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of overdueItems) map.set(item.id, item.daysOverdue);
    return map;
  }, [overdueItems]);

  const pendingHandoverByFileId = useMemo(() => {
    const map = new Map<string, PhysicalHandoverMovement>();
    for (const h of handovers) {
      if (h.status === 'InTransit' && !h.verifiedByReceiver) {
        if (h.physicalFileId && !map.has(h.physicalFileId)) map.set(h.physicalFileId, h);
        if (!map.has(`doc:${h.documentId}`)) map.set(`doc:${h.documentId}`, h);
      }
    }
    return map;
  }, [handovers]);

  // Leaf/box locations (prefer Boxes & Shelves for file placement)
  const assignableLocations = useMemo(() => {
    const priorityOrder: Record<string, number> = { Box: 1, Shelf: 2, Cabinet: 3, Room: 4, Building: 5 };
    return [...locations].sort(
      (a, b) => (priorityOrder[a.level] || 9) - (priorityOrder[b.level] || 9) || a.code.localeCompare(b.code)
    );
  }, [locations]);

  // Active electronic documents not yet linked to a physical file (1:1 uniqueness)
  const unlinkedActiveDocs = useMemo(() => {
    const linkedDocIds = new Set(files.map((f) => f.documentId));
    return documents.filter((d) => !d.isDeleted && d.status !== 'Cancelled' && !linkedDocIds.has(d.id));
  }, [documents, files]);

  const canManageRegistry =
    !!currentUser &&
    ['SuperAdmin', 'DirectorGeneral', 'RegistryOfficer', 'Director'].includes(currentUser.role);

  const canInitiateHandover = (pf: PhysicalFileRecord) => {
    if (!currentUser || pf.status === 'Missing') return false;
    return (
      currentUser.id === pf.currentCustodianId ||
      ['RegistryOfficer', 'SuperAdmin', 'DirectorGeneral'].includes(currentUser.role)
    );
  };

  const canAcknowledge = (h: PhysicalHandoverMovement) => {
    if (!currentUser || h.status !== 'InTransit' || h.verifiedByReceiver) return false;
    return (
      currentUser.id === h.toCustodianId ||
      ['RegistryOfficer', 'SuperAdmin'].includes(currentUser.role)
    );
  };

  const todayIsoDate = new Date().toISOString().slice(0, 10);
  const defaultFutureDate = new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10);

  const filteredFiles = useMemo(() => {
    return files.filter((pf) => {
      const isOverdue = overdueByFileId.has(pf.id);
      if (statusFilter === 'Overdue' && !isOverdue) return false;
      if (statusFilter !== 'All' && statusFilter !== 'Overdue' && pf.status !== statusFilter) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const doc = docById.get(pf.documentId);
      return (
        pf.fileCode.toLowerCase().includes(q) ||
        pf.registrationNumber.toLowerCase().includes(q) ||
        pf.currentCustodianName.toLowerCase().includes(q) ||
        pf.locationPath.toLowerCase().includes(q) ||
        (doc?.subjectEn || '').toLowerCase().includes(q) ||
        (doc?.subjectAm || '').includes(searchQuery.trim())
      );
    });
  }, [files, overdueByFileId, statusFilter, searchQuery, docById]);

  // Open Register Physical File Modal
  const openRegisterModal = () => {
    setRegDocId(unlinkedActiveDocs[0]?.id || '');
    const firstBox = assignableLocations.find((l) => l.level === 'Box') || assignableLocations[0];
    setRegLocationId(firstBox?.id || '');
    setRegFileCode('');
    setRegCustodianId(currentUser?.id || staffUsers[0]?.id || '');
    setRegExpectedReturn('');
    setRegError('');
    setIsRegisterModalOpen(true);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    if (!regDocId) {
      setRegError('Select an active electronic document to link 1:1.');
      return;
    }
    if (!regLocationId) {
      setRegError('Select a storage location node.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/v1/tracking/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: regDocId,
          locationId: regLocationId,
          fileCode: regFileCode.trim() || undefined,
          currentCustodianId: regCustodianId || undefined,
          expectedReturnDate: regExpectedReturn || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setRegError(data.error || 'Registration failed');
        return;
      }
      await refreshData();
      await fetchTrackingData();
      setIsRegisterModalOpen(false);
      notify('success', `Registered physical file ${data.fileCode} for ${data.registrationNumber}`);
    } catch (err: any) {
      setRegError(err.message || 'Network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Handover Modal
  const openHandoverModal = (pf: PhysicalFileRecord) => {
    const candidate = staffUsers.find((u) => u.id !== pf.currentCustodianId);
    setHandoverTarget(pf);
    setToCustodianId(candidate?.id || '');
    setTargetDept(candidate?.departmentNameEn || '');
    setTransferReason('');
    setExpectedReturnDate(defaultFutureDate);
    setTargetLocationId(pf.locationId || '');
    setHandoverError('');
  };

  const handleHandoverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handoverTarget) return;
    setHandoverError('');

    if (!toCustodianId) {
      setHandoverError('Please select a receiving custodian.');
      return;
    }
    if (toCustodianId === handoverTarget.currentCustodianId) {
      setHandoverError('Sender and receiver custodian cannot be the same person.');
      return;
    }
    if (!expectedReturnDate || expectedReturnDate < todayIsoDate) {
      setHandoverError('Expected return date cannot be in the past.');
      return;
    }
    if (transferReason.trim().length < 5) {
      setHandoverError('Handover reason must be at least 5 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/v1/tracking/handover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          physicalFileId: handoverTarget.id,
          documentId: handoverTarget.documentId,
          toCustodianId,
          department: targetDept.trim() || undefined,
          transferReason: transferReason.trim(),
          expectedReturnDate,
          targetLocationId: targetLocationId !== handoverTarget.locationId ? targetLocationId : undefined
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setHandoverError(data.error || 'Failed to initiate handover');
        return;
      }
      await refreshData();
      await fetchTrackingData();
      setHandoverTarget(null);
      notify('success', `Handover initiated (${data.fileCode}) — awaiting receiver dual acknowledgement.`);
    } catch (err: any) {
      setHandoverError(err.message || 'Network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Acknowledge Receipt Modal
  const openAcknowledgeModal = (h: PhysicalHandoverMovement) => {
    setAcknowledgeTarget(h);
    setAckReturnToArchive(false);
    setAckNotes('');
    setAckError('');
  };

  const handleAcknowledgeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acknowledgeTarget) return;
    setAckError('');
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/v1/tracking/handovers/${acknowledgeTarget.id}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returnToArchive: ackReturnToArchive,
          notes: ackNotes.trim() || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setAckError(data.error || 'Acknowledgement failed');
        return;
      }
      await refreshData();
      await fetchTrackingData();
      setAcknowledgeTarget(null);
      notify('success', `Receipt acknowledged for ${data.fileCode || data.registrationNumber}.`);
    } catch (err: any) {
      setAckError(err.message || 'Network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Report Missing Modal
  const openMissingModal = (pf: PhysicalFileRecord) => {
    setMissingTarget(pf);
    setMissingReason('');
    setMissingUrgency('High');
    setMissingError('');
  };

  const handleReportMissingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!missingTarget) return;
    setMissingError('');

    if (missingReason.trim().length < 15) {
      setMissingError('Missing file report requires a detailed reason of at least 15 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/v1/tracking/missing-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          physicalFileId: missingTarget.id,
          documentId: missingTarget.documentId,
          reason: missingReason.trim(),
          urgency: missingUrgency
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setMissingError(data.error || 'Failed to log missing report');
        return;
      }
      await refreshData();
      await fetchTrackingData();
      setMissingTarget(null);
      notify('success', `Missing dossier incident logged for ${missingTarget.fileCode}.`);
    } catch (err: any) {
      setMissingError(err.message || 'Network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resolve Missing Incident
  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolveTarget) return;
    setResolveError('');
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/v1/tracking/missing-incidents/${resolveTarget.id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: resolveStatus,
          resolutionNotes: resolveNotes.trim() || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setResolveError(data.error || 'Could not update incident status');
        return;
      }
      await refreshData();
      await fetchTrackingData();
      setResolveTarget(null);
      notify('success', `Incident ${data.fileCode} updated to ${data.status}.`);
    } catch (err: any) {
      setResolveError(err.message || 'Network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStatusText = (pf: PhysicalFileRecord) => {
    if (pf.status === 'Missing') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 dark:text-rose-400">
          <AlertOctagon className="w-3.5 h-3.5" />
          Missing
        </span>
      );
    }
    if (pf.status === 'InTransit') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
          <Clock className="w-3.5 h-3.5" />
          In Transit (Pending Receipt)
        </span>
      );
    }
    if (pf.status === 'CheckedOut') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 dark:text-sky-400">
          <ArrowRightLeft className="w-3.5 h-3.5" />
          Checked Out
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 dark:text-teal-400">
        <Archive className="w-3.5 h-3.5" />
        Archived in Vault
      </span>
    );
  };

  const timelineMovements = useMemo(() => {
    if (!timelineTarget) return [];
    return handovers.filter(
      (h) => h.physicalFileId === timelineTarget.id || h.documentId === timelineTarget.documentId
    );
  }, [timelineTarget, handovers]);

  const inTransitCount = files.filter((f) => f.status === 'InTransit').length;
  const openIncidentsCount = incidents.filter((i) => i.status !== 'Recovered').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t('navTracking')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {language === 'am'
              ? 'የአካላዊ ማህደሮች መዝገብ፣ የ5-ደረጃ ማከማቻ ተዋረድ እና ድርብ ማረጋገጫ ርክክብ'
              : '5-level vault hierarchy, 1:1 physical binder registration, dual-acknowledgement custody, and missing incident control.'}
          </p>
        </div>

        <button
          type="button"
          onClick={openRegisterModal}
          className="px-4 py-2 text-xs font-semibold bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>{language === 'am' ? 'አካላዊ ፋይል መዝግብ' : 'Register Physical File'}</span>
        </button>
      </div>

      {/* Inline Toast Feedback */}
      {toast && (
        <div
          className={`px-4 py-3 rounded-xl border text-xs flex items-center justify-between gap-3 ${
            toast.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2 font-medium">
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
          <button type="button" onClick={() => setToast(null)} className="text-current opacity-70 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Summary KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Physical Files Tracked</span>
          <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
            {files.length}
          </p>
          <p className="mt-1 text-[11px] text-slate-400 font-mono">{locations.length} vault nodes indexed</p>
        </div>

        <button
          type="button"
          onClick={() => {
            setSubTab('files');
            setStatusFilter('InTransit');
          }}
          className="text-left p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-amber-400 shadow-xs transition-colors"
        >
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Pending Dual Receipt</span>
          <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-amber-700 dark:text-amber-400">
            {inTransitCount}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">Awaiting receiver verification</p>
        </button>

        <button
          type="button"
          onClick={() => {
            setSubTab('files');
            setStatusFilter('Overdue');
          }}
          className="text-left p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-rose-400 shadow-xs transition-colors"
        >
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Overdue Physical Returns</span>
          <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-rose-700 dark:text-rose-400">
            {overdueItems.length}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">Past expected return date</p>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('incidents')}
          className="text-left p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-rose-400 shadow-xs transition-colors"
        >
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Open Missing Incidents</span>
          <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
            {openIncidentsCount}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">{incidents.length} total incident records</p>
        </button>
      </div>

      {/* Sub-Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 w-fit">
        <button
          type="button"
          onClick={() => setSubTab('files')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
            subTab === 'files'
              ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <Archive className="w-3.5 h-3.5" />
          <span>Physical Files & Custody ({files.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('locations')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
            subTab === 'locations'
              ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <FolderTree className="w-3.5 h-3.5" />
          <span>Location Hierarchy ({locations.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('handovers')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
            subTab === 'handovers'
              ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          <span>Handovers & Movements ({handovers.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab('incidents')}
          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
            subTab === 'incidents'
              ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Missing Incidents ({openIncidentsCount})</span>
        </button>
      </div>

      {/* TAB 1: PHYSICAL FILES & CUSTODY */}
      {subTab === 'files' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by file code, registration number, subject, custodian, or storage location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {(['All', 'Archived', 'CheckedOut', 'InTransit', 'Overdue', 'Missing'] as FileStatusFilter[]).map(
                (st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                      statusFilter === st
                        ? 'bg-teal-700 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {st}
                  </button>
                )
              )}
            </div>
          </div>

          {filteredFiles.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-10 text-center space-y-2">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No physical files match the active filter.
              </p>
              <p className="text-xs text-slate-500">
                Adjust the search filter or register a physical binder linked to an active electronic document.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFiles.map((pf) => {
                const doc = docById.get(pf.documentId);
                const daysOverdue = overdueByFileId.get(pf.id);
                const pendingHandover =
                  pendingHandoverByFileId.get(pf.id) || pendingHandoverByFileId.get(`doc:${pf.documentId}`);

                return (
                  <div
                    key={pf.id}
                    className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 text-[11px] font-mono">
                            <span className="font-bold text-teal-700 dark:text-teal-400 tabular-nums">
                              {pf.fileCode}
                            </span>
                            <span className="text-slate-300 dark:text-slate-700">·</span>
                            <button
                              type="button"
                              onClick={() => doc && setSelectedDocument(doc)}
                              className="font-semibold text-slate-600 dark:text-slate-300 hover:text-teal-700 hover:underline tabular-nums"
                            >
                              {pf.registrationNumber}
                            </button>
                          </div>
                          <h3 className="mt-1.5 text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-2">
                            {doc ? (language === 'am' ? doc.subjectAm : doc.subjectEn) : pf.registrationNumber}
                          </h3>
                        </div>

                        {daysOverdue && (
                          <span className="text-[10px] font-mono font-bold text-rose-700 dark:text-rose-400 shrink-0 tabular-nums">
                            {daysOverdue}d overdue
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        {renderStatusText(pf)}
                        <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                          {pf.movementsCount} moves
                        </span>
                      </div>

                      <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200/80 dark:border-slate-700/80 space-y-1.5 text-[11px]">
                        <div className="flex items-start gap-1.5 text-slate-700 dark:text-slate-300">
                          <MapPin className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                          <span className="leading-snug font-medium">{pf.locationPath}</span>
                        </div>
                        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 pt-1">
                          <span className="flex items-center gap-1">
                            <UserIcon className="w-3 h-3" />
                            <strong className="text-slate-800 dark:text-slate-200">{pf.currentCustodianName}</strong>
                          </span>
                          {pf.expectedReturnDate && (
                            <span className="font-mono tabular-nums">
                              Due {formatEthiopianDate(pf.expectedReturnDate, language)}
                            </span>
                          )}
                        </div>
                      </div>

                      {pendingHandover && (
                        <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/70 rounded-lg text-[11px] space-y-1.5">
                          <div className="text-amber-900 dark:text-amber-200 font-medium">
                            Transferring to <strong>{pendingHandover.toCustodian}</strong>
                          </div>
                          {canAcknowledge(pendingHandover) && (
                            <button
                              type="button"
                              onClick={() => openAcknowledgeModal(pendingHandover)}
                              className="w-full py-1.5 px-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-md transition-colors flex items-center justify-center gap-1.5"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Acknowledge Receipt</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1.5">
                      <button
                        type="button"
                        onClick={() => openHandoverModal(pf)}
                        disabled={!canInitiateHandover(pf)}
                        title={
                          canInitiateHandover(pf)
                            ? 'Initiate physical custody transfer'
                            : 'Only current custodian or Registry Officer can initiate handover'
                        }
                        className="flex-1 py-1.5 px-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center justify-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5 text-teal-600" />
                        <span>Handover</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTimelineTarget(pf)}
                        className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100 bg-slate-100 dark:bg-slate-800 rounded-lg"
                        title="Movement History Timeline"
                      >
                        <History className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setLabelTarget(pf)}
                        className="p-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100 bg-slate-100 dark:bg-slate-800 rounded-lg"
                        title="Label Preview & Print QR"
                      >
                        <Printer className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => openMissingModal(pf)}
                        disabled={pf.status === 'Missing'}
                        className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 bg-slate-100 dark:bg-slate-800 rounded-lg transition-colors disabled:opacity-40"
                        title="Report Missing File"
                      >
                        <AlertOctagon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: LOCATION HIERARCHY */}
      {subTab === 'locations' && (
        <LocationHierarchyTree
          locations={locations}
          files={files}
          branches={branches}
          language={language}
          canManage={canManageRegistry}
          onRefresh={fetchTrackingData}
          onNotify={notify}
        />
      )}

      {/* TAB 3: HANDOVERS & MOVEMENT HISTORY */}
      {subTab === 'handovers' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {t('handoverHistory')}
            </h2>
            <span className="text-xs font-mono text-slate-400 tabular-nums">{handovers.length} entries</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">File / Reg #</th>
                  <th className="px-4 py-3 font-semibold">From → To Custodian</th>
                  <th className="px-4 py-3 font-semibold">Reason & Directorate</th>
                  <th className="px-4 py-3 font-semibold">Dates (Due / Ack)</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {handovers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      No physical custody transfers recorded yet.
                    </td>
                  </tr>
                ) : (
                  handovers.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-mono whitespace-nowrap">
                        <div className="font-bold text-teal-700 dark:text-teal-400">{h.fileCode || '-'}</div>
                        <div className="text-[11px] text-slate-500">{h.registrationNumber}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {h.fromCustodian} → {h.toCustodian}
                        </div>
                        {h.acknowledgedByName && (
                          <div className="text-[11px] text-emerald-700 dark:text-emerald-400">
                            Verified by {h.acknowledgedByName}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <div className="text-slate-800 dark:text-slate-200 line-clamp-2">{h.transferReason}</div>
                        <div className="text-[11px] text-slate-400">{h.department}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-500 whitespace-nowrap tabular-nums">
                        <div>Sent: {formatEthiopianDate(h.handoverDate, language)}</div>
                        {h.expectedReturnDate && (
                          <div>Due: {formatEthiopianDate(h.expectedReturnDate, language)}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-semibold">
                        <span
                          className={
                            h.status === 'InTransit'
                              ? 'text-amber-700 dark:text-amber-400'
                              : h.status === 'ReturnedToArchive'
                                ? 'text-teal-700 dark:text-teal-400'
                                : 'text-sky-700 dark:text-sky-400'
                          }
                        >
                          {h.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {canAcknowledge(h) ? (
                          <button
                            type="button"
                            onClick={() => openAcknowledgeModal(h)}
                            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-md font-semibold text-[11px]"
                          >
                            Acknowledge Receipt
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            {h.verifiedByReceiver ? 'Dual Verified' : 'Awaiting Receiver'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: MISSING INCIDENTS */}
      {subTab === 'incidents' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Missing Physical File Incidents
            </h2>
            <span className="text-xs font-mono text-slate-400 tabular-nums">{incidents.length} reports</span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {incidents.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400">
                No missing dossier incidents logged. All registered binders accounted for.
              </div>
            ) : (
              incidents.map((inc) => (
                <div
                  key={inc.id}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2 font-mono">
                      <span className="font-bold text-slate-900 dark:text-slate-100">{inc.fileCode}</span>
                      <span className="text-slate-300">·</span>
                      <span className="text-teal-700 dark:text-teal-400 font-semibold">{inc.registrationNumber}</span>
                      <span className="text-slate-300">·</span>
                      <span
                        className={`font-bold uppercase ${
                          inc.urgency === 'Critical'
                            ? 'text-rose-700 dark:text-rose-400'
                            : inc.urgency === 'High'
                              ? 'text-amber-700 dark:text-amber-400'
                              : 'text-slate-600'
                        }`}
                      >
                        {inc.urgency} Urgency
                      </span>
                      <span className="text-slate-300">·</span>
                      <span
                        className={`font-semibold ${
                          inc.status === 'Recovered'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-rose-700 dark:text-rose-400'
                        }`}
                      >
                        {inc.status}
                      </span>
                    </div>
                    <p className="text-slate-800 dark:text-slate-200 font-medium">{inc.reason}</p>
                    <p className="text-[11px] text-slate-500">
                      Last custodian: <strong>{inc.lastKnownCustodianName}</strong> · Location: {inc.lastKnownLocation} ·
                      Reported by {inc.reportedByName} on {formatEthiopianDate(inc.reportedAt, language)}
                    </p>
                    {inc.resolutionNotes && (
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                        Resolution ({inc.resolvedByName}): {inc.resolutionNotes}
                      </p>
                    )}
                  </div>

                  {inc.status !== 'Recovered' && canManageRegistry && (
                    <button
                      type="button"
                      onClick={() => {
                        setResolveTarget(inc);
                        setResolveStatus('Recovered');
                        setResolveNotes('');
                        setResolveError('');
                      }}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-teal-700 dark:hover:bg-teal-800 text-white font-semibold rounded-lg shrink-0"
                    >
                      Update / Resolve
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL: REGISTER PHYSICAL FILE */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-[11px] font-mono font-bold text-teal-700 dark:text-teal-400 uppercase">
                  1:1 Dossier Binding
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Register Physical File
                </h3>
              </div>
              <button type="button" onClick={() => setIsRegisterModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            {regError && (
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-xs text-rose-700 dark:text-rose-300">
                {regError}
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Active Electronic Document <span className="text-rose-600">*</span>
                </label>
                <select
                  required
                  value={regDocId}
                  onChange={(e) => setRegDocId(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                >
                  {unlinkedActiveDocs.length === 0 ? (
                    <option value="">All active electronic documents already have linked physical files</option>
                  ) : (
                    unlinkedActiveDocs.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.registrationNumber} — {d.subjectEn.slice(0, 60)}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Vault Storage Node (Box / Shelf / Cabinet) <span className="text-rose-600">*</span>
                </label>
                <select
                  required
                  value={regLocationId}
                  onChange={(e) => setRegLocationId(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                >
                  {assignableLocations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      [{loc.level}] {loc.code} — {loc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Binder File Code (optional)
                  </label>
                  <input
                    type="text"
                    value={regFileCode}
                    onChange={(e) => setRegFileCode(e.target.value)}
                    placeholder="Auto-generated if blank"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Expected Return Date (optional)
                  </label>
                  <input
                    type="date"
                    min={todayIsoDate}
                    value={regExpectedReturn}
                    onChange={(e) => setRegExpectedReturn(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Initial Custodian
                </label>
                <select
                  value={regCustodianId}
                  onChange={(e) => setRegCustodianId(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                >
                  {staffUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullNameEn} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

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
                  disabled={isSubmitting || unlinkedActiveDocs.length === 0}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-semibold disabled:opacity-50"
                >
                  {isSubmitting ? 'Registering...' : 'Register Physical Binder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TRANSFER CUSTODY HANDOVER */}
      {handoverTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-[11px] font-mono font-bold text-teal-700 dark:text-teal-400">
                  {handoverTarget.fileCode} · {handoverTarget.registrationNumber}
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Initiate Physical Handover
                </h3>
              </div>
              <button type="button" onClick={() => setHandoverTarget(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            {handoverError && (
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-xs text-rose-700 dark:text-rose-300">
                {handoverError}
              </div>
            )}

            <form onSubmit={handleHandoverSubmit} className="space-y-3 text-xs">
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/70 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-[11px] text-slate-500 block">From Current Custodian</span>
                <strong className="text-slate-900 dark:text-slate-100">{handoverTarget.currentCustodianName}</strong>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  To Receiving Custodian <span className="text-rose-600">*</span>
                </label>
                <select
                  required
                  value={toCustodianId}
                  onChange={(e) => {
                    const uid = e.target.value;
                    setToCustodianId(uid);
                    const found = staffUsers.find((u) => u.id === uid);
                    if (found) setTargetDept(found.departmentNameEn);
                  }}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                >
                  {staffUsers
                    .filter((u) => u.id !== handoverTarget.currentCustodianId)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullNameEn} ({u.role} · {u.departmentNameEn})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Receiving Directorate
                  </label>
                  <input
                    type="text"
                    required
                    value={targetDept}
                    onChange={(e) => setTargetDept(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Expected Return Date <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    min={todayIsoDate}
                    value={expectedReturnDate}
                    onChange={(e) => setExpectedReturnDate(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Update Vault Location (optional)
                </label>
                <select
                  value={targetLocationId}
                  onChange={(e) => setTargetLocationId(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                >
                  {assignableLocations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      [{loc.level}] {loc.code} — {loc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Reason for Handover (min 5 characters) <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  minLength={5}
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  placeholder="Specify review purpose, executive signing, or QA evaluation..."
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setHandoverTarget(null)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 font-semibold"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-semibold disabled:opacity-50"
                >
                  {isSubmitting ? 'Dispatching...' : 'Initiate Dual Handover'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ACKNOWLEDGE RECEIPT */}
      {acknowledgeTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-[11px] font-mono font-bold text-amber-700 dark:text-amber-400">
                  Dual Custody Verification
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Acknowledge Physical Receipt
                </h3>
              </div>
              <button type="button" onClick={() => setAcknowledgeTarget(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            {ackError && (
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-xs text-rose-700 dark:text-rose-300">
                {ackError}
              </div>
            )}

            <form onSubmit={handleAcknowledgeSubmit} className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/70 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1">
                <div className="font-mono font-bold text-teal-700 dark:text-teal-400">
                  {acknowledgeTarget.fileCode} · {acknowledgeTarget.registrationNumber}
                </div>
                <div className="text-slate-700 dark:text-slate-300">
                  From <strong>{acknowledgeTarget.fromCustodian}</strong> → To{' '}
                  <strong>{acknowledgeTarget.toCustodian}</strong>
                </div>
                <div className="text-slate-500">{acknowledgeTarget.transferReason}</div>
              </div>

              <label className="flex items-center gap-2 p-2.5 bg-slate-50 dark:bg-slate-800 rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={ackReturnToArchive}
                  onChange={(e) => setAckReturnToArchive(e.target.checked)}
                  className="rounded border-slate-300 text-teal-700"
                />
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  Mark as Returned to Archive Vault (clears return due date)
                </span>
              </label>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Condition / Verification Notes (optional)
                </label>
                <textarea
                  rows={2}
                  value={ackNotes}
                  onChange={(e) => setAckNotes(e.target.value)}
                  placeholder="Verify seal integrity, attachment count, or enclosure completeness..."
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setAcknowledgeTarget(null)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 font-semibold"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold disabled:opacity-50"
                >
                  {isSubmitting ? 'Verifying...' : 'Confirm Physical Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REPORT MISSING FILE */}
      {missingTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-[11px] font-mono font-bold text-rose-700 dark:text-rose-400">
                  Security Escalation
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Report Missing Physical File
                </h3>
              </div>
              <button type="button" onClick={() => setMissingTarget(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            {missingError && (
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-xs text-rose-700 dark:text-rose-300">
                {missingError}
              </div>
            )}

            <form onSubmit={handleReportMissingSubmit} className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/70 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="font-mono font-bold text-slate-900 dark:text-slate-100">
                  {missingTarget.fileCode} · {missingTarget.registrationNumber}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Last known custodian: {missingTarget.currentCustodianName}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Incident Urgency
                </label>
                <select
                  value={missingUrgency}
                  onChange={(e) => setMissingUrgency(e.target.value as 'Medium' | 'High' | 'Critical')}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                >
                  <option value="Medium">Medium — Misplaced during internal transfer</option>
                  <option value="High">High — Unlocated after shelf audit</option>
                  <option value="Critical">Critical — Confidential / urgent tender binder missing</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Detailed Incident Description (min 15 chars) <span className="text-rose-600">*</span>
                  </label>
                  <span
                    className={`font-mono text-[11px] tabular-nums ${
                      missingReason.trim().length >= 15 ? 'text-emerald-600' : 'text-slate-400'
                    }`}
                  >
                    {missingReason.trim().length}/15
                  </span>
                </div>
                <textarea
                  rows={3}
                  required
                  minLength={15}
                  value={missingReason}
                  onChange={(e) => setMissingReason(e.target.value)}
                  placeholder="Describe last verified location, search steps taken, and suspected custody gap..."
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setMissingTarget(null)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 font-semibold"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Missing Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: MOVEMENT HISTORY TIMELINE */}
      {timelineTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-xl p-6 space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-[11px] font-mono font-bold text-teal-700 dark:text-teal-400">
                  {timelineTarget.fileCode} · {timelineTarget.registrationNumber}
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Custody Movement Timeline
                </h3>
              </div>
              <button type="button" onClick={() => setTimelineTarget(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-4 pr-1 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/70 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="text-[11px] text-slate-500">Current Vault Location</div>
                <div className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                  {timelineTarget.locationPath}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Current Custodian: <strong className="text-slate-800 dark:text-slate-200">{timelineTarget.currentCustodianName}</strong>
                </div>
              </div>

              {timelineMovements.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  Initial vault registration complete — no custody transfers recorded yet.
                </div>
              ) : (
                <div className="space-y-3 border-l-2 border-slate-200 dark:border-slate-700 ml-2 pl-4">
                  {timelineMovements.map((m) => (
                    <div key={m.id} className="relative pb-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full absolute -left-[21px] top-1 ${
                          m.status === 'InTransit' ? 'bg-amber-500' : 'bg-teal-600'
                        }`}
                      />
                      <div className="flex items-center justify-between font-mono text-[11px] text-slate-500">
                        <span>{formatEthiopianDate(m.handoverDate, language)}</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{m.status}</span>
                      </div>
                      <div className="mt-1 font-semibold text-slate-900 dark:text-slate-100">
                        {m.fromCustodian} → {m.toCustodian}
                      </div>
                      <p className="mt-0.5 text-slate-600 dark:text-slate-400">{m.transferReason}</p>
                      {m.verifiedByReceiver && m.acknowledgedAt && (
                        <p className="mt-1 text-[11px] text-emerald-700 dark:text-emerald-400">
                          Receipt verified by {m.acknowledgedByName} on {formatEthiopianDate(m.acknowledgedAt, language)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RESOLVE MISSING INCIDENT */}
      {resolveTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Update Missing Incident ({resolveTarget.fileCode})
              </h3>
              <button type="button" onClick={() => setResolveTarget(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            {resolveError && (
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-xs text-rose-700 dark:text-rose-300">
                {resolveError}
              </div>
            )}

            <form onSubmit={handleResolveSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Updated Status
                </label>
                <select
                  value={resolveStatus}
                  onChange={(e) => setResolveStatus(e.target.value as 'Investigating' | 'Recovered')}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                >
                  <option value="Investigating">Under Registry Investigation</option>
                  <option value="Recovered">Recovered & Returned to Archive Custody</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Investigation / Recovery Notes
                </label>
                <textarea
                  rows={3}
                  value={resolveNotes}
                  onChange={(e) => setResolveNotes(e.target.value)}
                  placeholder="Document where the binder was located or current search progress..."
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setResolveTarget(null)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-semibold disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PRINTABLE QR LABEL PREVIEW */}
      {labelTarget && (
        <PhysicalLabelModal
          file={labelTarget}
          document={docById.get(labelTarget.documentId)}
          language={language}
          onClose={() => setLabelTarget(null)}
        />
      )}
    </div>
  );
};
