import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Search,
  Lock,
  Database,
  Download,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  HardDrive,
  FileCheck,
  RefreshCw,
  FileKey2,
  KeyRound,
  Cpu,
  ShieldCheck,
  Upload,
  Plus,
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import { apiFetch } from '../../lib/apiFetch.js';
import { formatEthiopianDate } from '../../lib/translations.js';
import { localizeErrorMessage } from '../../lib/localizedErrors.js';
import {
  AuditLogEntry,
  BackupRecord,
  BundleVerificationReport,
  CrlRevocationEntry,
  HsmProviderType,
  PkiHsmGovernanceStatus,
  PkiPolicyConfig,
  SigningAlgorithm,
  SigningCertificate
} from '../../types/index.js';

export const AuditSecurityView: React.FC = () => {
  const { currentUser, language, t, refreshData } = useApp();
  const [activeTab, setActiveTab] = useState<'audit' | 'pki' | 'backups'>('audit');

  // Audit Trail State
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // PKI & HSM Authority State
  const [certificates, setCertificates] = useState<SigningCertificate[]>([]);
  const [hsmStatus, setHsmStatus] = useState<PkiHsmGovernanceStatus | null>(null);
  const [crlEntries, setCrlEntries] = useState<CrlRevocationEntry[]>([]);
  const [pkiSubView, setPkiSubView] = useState<'vault' | 'crl' | 'verifier'>('vault');
  const [certFilter, setCertFilter] = useState<'All' | 'Active' | 'Revoked'>('All');
  const [certSearch, setCertSearch] = useState('');
  const [issueAlgorithm, setIssueAlgorithm] = useState<SigningAlgorithm>('RSA-SHA256');
  const [issueSlotId, setIssueSlotId] = useState<string>('');
  const [issuingForUserId, setIssuingForUserId] = useState<string | null>(null);
  const [attestingSlotId, setAttestingSlotId] = useState<string | null>(null);
  const [updatingPolicy, setUpdatingPolicy] = useState(false);
  const [showAddSlotForm, setShowAddSlotForm] = useState(false);
  const [newSlotCode, setNewSlotCode] = useState('');
  const [newSlotLabel, setNewSlotLabel] = useState('');
  const [newSlotProvider, setNewSlotProvider] = useState<HsmProviderType>('ExternalPKCS11');
  const [newSlotEndpoint, setNewSlotEndpoint] = useState('pkcs11://hsm-cluster-01.epss.gov.et:5657/partition/epss-sign');
  const [revokeModalCert, setRevokeModalCert] = useState<SigningCertificate | null>(null);
  const [revokeReason, setRevokeReason] = useState('');

  // Detached Bundle Verifier State
  const [bundleJsonInput, setBundleJsonInput] = useState('');
  const [isVerifyingBundle, setIsVerifyingBundle] = useState(false);
  const [bundleReport, setBundleReport] = useState<BundleVerificationReport | null>(null);

  // Backup & Recovery State
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [restoringFilename, setRestoringFilename] = useState<string | null>(null);
  const [confirmRestoreFilename, setConfirmRestoreFilename] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchAuditLogs = () => {
    apiFetch('/api/v1/audit/logs')
      .then(r => (r.ok ? r.json() : []))
      .then(data => setLogs(Array.isArray(data) ? data : []))
      .catch(console.error);
  };

  const fetchBackups = () => {
    apiFetch('/api/v1/admin/backups')
      .then(r => (r.ok ? r.json() : []))
      .then(data => setBackups(Array.isArray(data) ? data : []))
      .catch(console.error);
  };

  const fetchCertificates = () => {
    apiFetch('/api/v1/pki/certificates')
      .then(r => (r.ok ? r.json() : []))
      .then(data => setCertificates(Array.isArray(data) ? data : []))
      .catch(console.error);
  };

  const fetchHsmAndCrl = () => {
    apiFetch('/api/v1/pki/hsm/status')
      .then(r => (r.ok ? r.json() : null))
      .then((data: PkiHsmGovernanceStatus | null) => {
        if (data) {
          setHsmStatus(data);
          setIssueAlgorithm(prev => prev || data.policy.defaultAlgorithm);
          setIssueSlotId(prev => prev || data.policy.activeHsmSlotId);
        }
      })
      .catch(console.error);
    apiFetch('/api/v1/pki/crl')
      .then(r => (r.ok ? r.json() : []))
      .then(data => setCrlEntries(Array.isArray(data) ? data : []))
      .catch(console.error);
  };

  useEffect(() => {
    fetchAuditLogs();
    fetchBackups();
    fetchCertificates();
    fetchHsmAndCrl();
  }, []);

  const handleIssueCertificate = async (targetUserId: string, userName: string) => {
    setIssuingForUserId(targetUserId);
    setStatusMessage(null);
    try {
      const res = await apiFetch('/api/v1/pki/certificates/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId,
          algorithm: issueAlgorithm,
          hsmSlotId: issueSlotId || undefined,
          reason: `Administrative HSM/PKI keypair issuance by ${currentUser?.fullNameEn || 'Security Officer'}`
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to issue certificate');
      setStatusMessage({
        type: 'success',
        text:
          language === 'am'
            ? `የ${data.algorithm} ፊርማ ሰርተፊኬት (${data.serialNumber}) ለ${userName} በHSM ውስጥ ተዘጋጅቷል።`
            : `Issued HSM-wrapped ${data.algorithm} signing certificate ${data.serialNumber} for ${userName}.`
      });
      fetchCertificates();
      fetchHsmAndCrl();
      fetchAuditLogs();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: localizeErrorMessage(err.message, language) });
    } finally {
      setIssuingForUserId(null);
    }
  };

  const handleUpdatePkiPolicy = async (updates: Partial<PkiPolicyConfig>) => {
    setUpdatingPolicy(true);
    setStatusMessage(null);
    try {
      const res = await apiFetch('/api/v1/pki/hsm/policy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update PKI/HSM policy');
      setStatusMessage({
        type: 'success',
        text:
          language === 'am'
            ? 'የPKI/HSM የፊርማ እና የወጪ መላኪያ ፖሊሲ በስኬት ተዘምኗል።'
            : 'EPSS PKI/HSM governance policy updated and recorded to audit log.'
      });
      fetchHsmAndCrl();
      fetchAuditLogs();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: localizeErrorMessage(err.message, language) });
    } finally {
      setUpdatingPolicy(false);
    }
  };

  const handleAttestSlot = async (slotId: string) => {
    setAttestingSlotId(slotId);
    setStatusMessage(null);
    try {
      const res = await apiFetch(`/api/v1/pki/hsm/slots/${slotId}/attest`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'HSM self-test failed');
      setStatusMessage({
        type: data.roundTripVerified ? 'success' : 'error',
        text: data.roundTripVerified
          ? language === 'am'
            ? `የHSM ክፍል ${data.slot?.slotCode} ራስ-ሰር የቁልፍ ማሸጊያ እና ECDSA-P384 ሙከራ በስኬት አልፏል።`
            : `HSM partition ${data.slot?.slotCode} passed AES-256-GCM key-wrap and ECDSA-P384 round-trip attestation.`
          : 'HSM partition attestation check reported an error.'
      });
      fetchHsmAndCrl();
      fetchAuditLogs();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: localizeErrorMessage(err.message, language) });
    } finally {
      setAttestingSlotId(null);
    }
  };

  const handleRegisterHsmSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);
    try {
      const res = await apiFetch('/api/v1/pki/hsm/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotCode: newSlotCode,
          label: newSlotLabel,
          provider: newSlotProvider,
          endpointUri: newSlotEndpoint,
          fipsLevel: 'FIPS 140-3 Level 3'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to configure HSM partition');
      setShowAddSlotForm(false);
      setNewSlotCode('');
      setNewSlotLabel('');
      setStatusMessage({
        type: 'success',
        text: `Registered HSM partition ${data.slotCode} (${data.label}).`
      });
      fetchHsmAndCrl();
      fetchAuditLogs();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: localizeErrorMessage(err.message, language) });
    }
  };

  const handleVerifyDetachedBundle = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);
    setBundleReport(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(bundleJsonInput);
    } catch {
      setStatusMessage({
        type: 'error',
        text:
          language === 'am'
            ? 'የገባው JSON ትክክለኛ የ.sig.json ቅርጸት የለውም።'
            : 'Invalid JSON syntax. Paste or upload a valid .sig.json detached signature bundle.'
      });
      return;
    }
    setIsVerifyingBundle(true);
    try {
      const res = await apiFetch('/api/v1/pki/verify-bundle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Bundle verification failed');
      setBundleReport(data);
      fetchAuditLogs();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: localizeErrorMessage(err.message, language) });
    } finally {
      setIsVerifyingBundle(false);
    }
  };

  const handleBundleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setBundleJsonInput(reader.result);
        setBundleReport(null);
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmRevoke = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revokeModalCert) return;
    if (revokeReason.trim().length < 10) {
      setStatusMessage({ type: 'error', text: 'Revocation reason must be at least 10 characters.' });
      return;
    }
    setStatusMessage(null);
    try {
      const res = await apiFetch(`/api/v1/pki/certificates/${revokeModalCert.id}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: revokeReason.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Revocation failed');
      setStatusMessage({
        type: 'success',
        text: `Revoked signing certificate ${data.serialNumber} (${revokeModalCert.userName}) and published to CRL.`
      });
      setRevokeModalCert(null);
      setRevokeReason('');
      fetchCertificates();
      fetchHsmAndCrl();
      fetchAuditLogs();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: localizeErrorMessage(err.message, language) });
    }
  };

  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    setStatusMessage(null);
    try {
      const res = await apiFetch('/api/v1/admin/backup', { method: 'POST' });
      if (!res.ok) throw new Error('Backup failed to generate');
      const record: BackupRecord = await res.json();
      setStatusMessage({
        type: 'success',
        text:
          language === 'am'
            ? `የመጠባበቂያ ቅጂ በስኬት ተፈጥሯል፦ ${record.filename} (${(record.sizeBytes / 1024).toFixed(1)} KB)`
            : `Snapshot backup successfully created: ${record.filename} (${(record.sizeBytes / 1024).toFixed(1)} KB)`
      });
      fetchBackups();
      fetchAuditLogs();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to create backup snapshot'
      });
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleConfirmRestore = async () => {
    if (!confirmRestoreFilename) return;
    const filename = confirmRestoreFilename;
    setConfirmRestoreFilename(null);
    setRestoringFilename(filename);
    setStatusMessage(null);
    try {
      const res = await apiFetch('/api/v1/admin/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Restore failed');

      setStatusMessage({
        type: 'success',
        text:
          language === 'am'
            ? `የውሂብ ጎታው ከ ${filename} በስኬት ወደ ነበረበት ተመልሷል!`
            : `Database successfully restored from snapshot ${filename}!`
      });
      refreshData();
      fetchBackups();
      fetchAuditLogs();
      fetchCertificates();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to restore database snapshot'
      });
    } finally {
      setRestoringFilename(null);
    }
  };

  const filteredLogs = logs.filter(l => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      l.action.toLowerCase().includes(q) ||
      l.userName.toLowerCase().includes(q) ||
      l.resourceId.toLowerCase().includes(q) ||
      l.details.toLowerCase().includes(q)
    );
  });

  const filteredCerts = certificates.filter(c => {
    if (certFilter !== 'All' && c.status !== certFilter) return false;
    if (!certSearch.trim()) return true;
    const q = certSearch.toLowerCase();
    return (
      c.serialNumber.toLowerCase().includes(q) ||
      c.userName.toLowerCase().includes(q) ||
      c.userRole.toLowerCase().includes(q) ||
      c.departmentNameEn.toLowerCase().includes(q)
    );
  });

  const canManageAllCerts =
    currentUser?.role === 'SuperAdmin' || currentUser?.role === 'SecurityOfficer';

  return (
    <div className="space-y-6">
      {/* Header and Sub-navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Lock className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            {t('navSecurity')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {language === 'am'
              ? 'የማይቀየር የደህንነት እና የኦዲት መዝገብ፣ የHSM/PKI የፊርማ ባለሥልጣን እና የመጠባበቂያ ቅጂዎች'
              : 'Tamper-evident audit trail, EPSS HSM/PKI signing authority, and disaster recovery snapshots.'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'audit'
                ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>{language === 'am' ? 'የኦዲት መዝገብ' : 'Audit Trail'}</span>
            <span className="text-[10px] font-mono px-1.5 bg-slate-200 dark:bg-slate-700 rounded-sm tabular-nums">
              {logs.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pki')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'pki'
                ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <FileKey2 className="w-3.5 h-3.5" />
            <span>{t('pkiHsmTabTitle')}</span>
            <span className="text-[10px] font-mono px-1.5 bg-slate-200 dark:bg-slate-700 rounded-sm tabular-nums">
              {certificates.filter(c => c.status === 'Active').length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('backups')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'backups'
                ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>{language === 'am' ? 'የመጠባበቂያ ቅጂ እና መልሶ ማግኛ' : 'Disaster Recovery'}</span>
            <span className="text-[10px] font-mono px-1.5 bg-slate-200 dark:bg-slate-700 rounded-sm tabular-nums">
              {backups.length}
            </span>
          </button>
        </div>
      </div>

      {/* Global Status Banner */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-lg border text-xs flex items-center justify-between gap-3 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-[11px] font-semibold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* TAB 1: AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs flex items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search audit trail by actor name, action, registration #, or details..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <button
              type="button"
              onClick={fetchAuditLogs}
              className="px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Log</span>
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto shadow-xs">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-semibold">
                <tr>
                  <th className="px-4 py-3">Timestamp (UTC / ET)</th>
                  <th className="px-4 py-3">Actor & Persona</th>
                  <th className="px-4 py-3">Action Recorded</th>
                  <th className="px-4 py-3">Resource Target</th>
                  <th className="px-4 py-3">IP Address</th>
                  <th className="px-4 py-3">Audit Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No security audit events recorded.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-2.5 font-mono text-slate-500 whitespace-nowrap tabular-nums">
                        {formatEthiopianDate(log.timestamp, language)}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{log.userName}</div>
                        <div className="text-[10px] text-teal-700 dark:text-teal-400">{log.userRole} · {log.branchName}</div>
                      </td>
                      <td className="px-4 py-2.5 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {log.action}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-700 dark:text-slate-300 whitespace-nowrap">
                        {log.resourceId}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[11px] text-slate-400 whitespace-nowrap tabular-nums">
                        {log.ipAddress}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400 max-w-sm">
                        <span className="line-clamp-2">{log.details}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: PKI & HSM CRYPTOGRAPHIC AUTHORITY */}
      {activeTab === 'pki' && (
        <div className="space-y-4">
          {/* Sub-navigation inside PKI Authority */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setPkiSubView('vault')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  pkiSubView === 'vault'
                    ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {language === 'am' ? 'የHSM ካዝና እና ሰርተፊኬቶች' : 'HSM Vault & Certificates'}
              </button>
              <button
                type="button"
                onClick={() => setPkiSubView('crl')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                  pkiSubView === 'crl'
                    ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <span>{t('crlRegistryTitle')}</span>
                <span className="font-mono text-[10px] tabular-nums opacity-75">({crlEntries.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setPkiSubView('verifier')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  pkiSubView === 'verifier'
                    ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {t('detachedBundleVerifierTitle')}
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                fetchCertificates();
                fetchHsmAndCrl();
              }}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{language === 'am' ? 'አድስ' : 'Refresh Status'}</span>
            </button>
          </div>

          {pkiSubView === 'vault' && (
            <div className="space-y-4">
              {/* Top Metrics Strip */}
              {hsmStatus && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                    <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      {language === 'am' ? 'በHSM የታሸጉ ቁልፎች' : 'HSM AES-256 Wrapped Keys'}
                    </div>
                    <div className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1 tabular-nums">
                      {hsmStatus.metrics.hsmWrappedCertificates} / {hsmStatus.metrics.totalCertificates}
                    </div>
                    <div className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5 font-mono">
                      FIPS 140-3 Vault Protected
                    </div>
                  </div>
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                    <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      {language === 'am' ? 'የታሸጉ ወጪ ደብዳቤዎች' : 'Outgoing Non-Repudiation'}
                    </div>
                    <div className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1 tabular-nums">
                      {hsmStatus.metrics.outgoingSealed} / {hsmStatus.metrics.outgoingTotal}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                      {hsmStatus.metrics.outgoingUnsigned} {language === 'am' ? 'ፊርማ የሚጠብቁ' : 'pending signature'}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                    <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      {language === 'am' ? 'የTSA የጊዜ ማህተሞች' : 'RFC 3161 TSA Timestamps'}
                    </div>
                    <div className="text-xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1 tabular-nums">
                      {hsmStatus.metrics.totalTsaTimestampsIssued}
                    </div>
                    <div className="text-[11px] text-teal-700 dark:text-teal-400 mt-0.5 font-mono">
                      ECDSA-P384 Signed Tokens
                    </div>
                  </div>
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
                    <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      {language === 'am' ? 'የወጪ መላኪያ ደንብ' : 'Outgoing Dispatch Gate'}
                    </div>
                    <div className="text-xl font-bold font-mono mt-1 tabular-nums text-slate-900 dark:text-slate-100">
                      {hsmStatus.policy.requireSignedOutgoingDispatch
                        ? language === 'am'
                          ? 'አስገዳጅ (412)'
                          : 'ENFORCED'
                        : language === 'am'
                          ? 'አማራጭ'
                          : 'ADVISORY'}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                      Default: {hsmStatus.policy.defaultAlgorithm}
                    </div>
                  </div>
                </div>
              )}

              {/* Policy Governance + CA Trust Anchor Split */}
              {hsmStatus && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Enforcement Policy Controls */}
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                      <h2 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-teal-600" />
                        <span>{t('pkiPolicyTitle')}</span>
                      </h2>
                      <span className="text-[10px] font-mono text-slate-400 tabular-nums">
                        {hsmStatus.policy.updatedBy}
                      </span>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      <label className="flex items-center justify-between gap-3 cursor-pointer">
                        <span className="text-slate-700 dark:text-slate-300 font-medium">
                          {t('requireOutgoingDispatchSig')}
                        </span>
                        <input
                          type="checkbox"
                          disabled={!canManageAllCerts || updatingPolicy}
                          checked={hsmStatus.policy.requireSignedOutgoingDispatch}
                          onChange={(e) =>
                            handleUpdatePkiPolicy({ requireSignedOutgoingDispatch: e.target.checked })
                          }
                          className="h-4 w-4 accent-teal-600"
                        />
                      </label>

                      <label className="flex items-center justify-between gap-3 cursor-pointer">
                        <span className="text-slate-700 dark:text-slate-300 font-medium">
                          {t('requireTsaTimestampLabel')}
                        </span>
                        <input
                          type="checkbox"
                          disabled={!canManageAllCerts || updatingPolicy}
                          checked={hsmStatus.policy.requireTsaTimestamp}
                          onChange={(e) => handleUpdatePkiPolicy({ requireTsaTimestamp: e.target.checked })}
                          className="h-4 w-4 accent-teal-600"
                        />
                      </label>

                      <label className="flex items-center justify-between gap-3 cursor-pointer">
                        <span className="text-slate-700 dark:text-slate-300 font-medium">
                          {t('requireMfaHsmSignLabel')}
                        </span>
                        <input
                          type="checkbox"
                          disabled={!canManageAllCerts || updatingPolicy}
                          checked={hsmStatus.policy.requireStepUpMfaForHsmSign}
                          onChange={(e) =>
                            handleUpdatePkiPolicy({ requireStepUpMfaForHsmSign: e.target.checked })
                          }
                          className="h-4 w-4 accent-teal-600"
                        />
                      </label>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                        <span className="text-slate-600 dark:text-slate-400 font-medium">
                          {language === 'am' ? 'ነባሪ የፊርማ ዘዴ' : 'Default Org Signing Algorithm'}
                        </span>
                        <select
                          disabled={!canManageAllCerts || updatingPolicy}
                          value={hsmStatus.policy.defaultAlgorithm}
                          onChange={(e) =>
                            handleUpdatePkiPolicy({ defaultAlgorithm: e.target.value as SigningAlgorithm })
                          }
                          className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-[11px]"
                        >
                          <option value="RSA-SHA256">RSA-SHA256 (2048-bit)</option>
                          <option value="RSA-PSS-SHA256">RSA-PSS-SHA256 (3072-bit)</option>
                          <option value="ECDSA-P384-SHA384">ECDSA-P384-SHA384 (384-bit)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* CA Hierarchy Trust Anchors */}
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2.5">
                    <div className="border-b border-slate-100 dark:border-slate-800 pb-2.5">
                      <h2 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {t('caHierarchyTitle')}
                      </h2>
                    </div>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {hsmStatus.caChain.map((ca) => (
                        <div key={ca.caSerial} className="py-2 first:pt-0 last:pb-0 text-[11px] space-y-0.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-900 dark:text-slate-100">
                              {ca.role} · <span className="font-mono text-teal-700 dark:text-teal-400">{ca.caSerial}</span>
                            </span>
                            <span className="font-mono text-[10px] text-slate-500 tabular-nums">
                              {ca.algorithm} · {ca.status}
                            </span>
                          </div>
                          <div className="text-slate-600 dark:text-slate-400 truncate">{ca.subjectDn}</div>
                          <div className="font-mono text-[10px] text-slate-400 truncate tabular-nums">
                            SHA-256: {ca.fingerprintSha256}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* HSM Partition Vault Table */}
              {hsmStatus && (
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-slate-50/50 dark:bg-slate-800/40">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-teal-600" />
                      <h2 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {t('hsmVaultTitle')}
                      </h2>
                    </div>
                    {canManageAllCerts && (
                      <button
                        type="button"
                        onClick={() => setShowAddSlotForm(prev => !prev)}
                        className="px-2.5 py-1.5 text-[11px] font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 rounded-lg inline-flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5 text-teal-600" />
                        <span>{t('registerHsmSlot')}</span>
                      </button>
                    )}
                  </div>

                  {showAddSlotForm && (
                    <form
                      onSubmit={handleRegisterHsmSlot}
                      className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs"
                    >
                      <input
                        type="text"
                        required
                        minLength={3}
                        value={newSlotCode}
                        onChange={(e) => setNewSlotCode(e.target.value)}
                        placeholder="Slot Code (e.g. EPSS-THALES-02)"
                        className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                      />
                      <input
                        type="text"
                        required
                        minLength={5}
                        value={newSlotLabel}
                        onChange={(e) => setNewSlotLabel(e.target.value)}
                        placeholder="Descriptive Partition Label"
                        className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                      />
                      <select
                        value={newSlotProvider}
                        onChange={(e) => setNewSlotProvider(e.target.value as HsmProviderType)}
                        className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                      >
                        <option value="ExternalPKCS11">ExternalPKCS11 (Luna / nShield)</option>
                        <option value="AzureKeyVaultHSM">Azure Key Vault Managed HSM</option>
                        <option value="AwsCloudHSM">AWS CloudHSM Cluster</option>
                        <option value="SoftwarePKCS11HSM">Software PKCS#11 Vault</option>
                      </select>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={newSlotEndpoint}
                          onChange={(e) => setNewSlotEndpoint(e.target.value)}
                          placeholder="pkcs11://..."
                          className="flex-1 min-w-0 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-[11px]"
                        />
                        <button
                          type="submit"
                          className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-lg shrink-0"
                        >
                          {t('save')}
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-semibold">
                        <tr>
                          <th className="px-4 py-2.5">Slot Code & Label</th>
                          <th className="px-4 py-2.5">Provider & FIPS</th>
                          <th className="px-4 py-2.5">Key Wrap Mode</th>
                          <th className="px-4 py-2.5">Ops / Last Attested</th>
                          <th className="px-4 py-2.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {hsmStatus.hsmSlots.map((slot) => (
                          <tr key={slot.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                            <td className="px-4 py-2.5">
                              <div className="font-mono font-bold text-slate-900 dark:text-slate-100">
                                {slot.slotCode} {slot.isDefault ? '· PRIMARY' : ''}
                              </div>
                              <div className="text-[11px] text-slate-500">{slot.label}</div>
                            </td>
                            <td className="px-4 py-2.5 text-[11px]">
                              <div className="font-medium text-slate-800 dark:text-slate-200">{slot.provider}</div>
                              <div className="font-mono text-slate-400">{slot.fipsLevel} · {slot.status}</div>
                            </td>
                            <td className="px-4 py-2.5 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                              {slot.keyWrapAlgorithm}
                            </td>
                            <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500 tabular-nums">
                              <div>{slot.operationsCount} ops</div>
                              <div>{formatEthiopianDate(slot.lastAttestedAt, language)}</div>
                            </td>
                            <td className="px-4 py-2.5 text-right whitespace-nowrap space-x-2">
                              {!slot.isDefault && canManageAllCerts && (
                                <button
                                  type="button"
                                  disabled={updatingPolicy}
                                  onClick={() => handleUpdatePkiPolicy({ activeHsmSlotId: slot.id })}
                                  className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                  Set Primary
                                </button>
                              )}
                              <button
                                type="button"
                                disabled={attestingSlotId === slot.id}
                                onClick={() => handleAttestSlot(slot.id)}
                                className="px-2.5 py-1 text-[11px] font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 border border-teal-200 dark:border-teal-800 rounded-md"
                              >
                                {attestingSlotId === slot.id ? 'Testing...' : t('runHsmSelfTest')}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Certificates Filter + Issuance Toolbar */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Filter certificates by serial, staff name, role, or directorate..."
                      value={certSearch}
                      onChange={e => setCertSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100"
                    />
                  </div>
                  <select
                    value={certFilter}
                    onChange={e => setCertFilter(e.target.value as any)}
                    className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Active">Active Only</option>
                    <option value="Revoked">Revoked Only</option>
                  </select>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    aria-label={t('signingAlgorithmLabel')}
                    value={issueAlgorithm}
                    onChange={e => setIssueAlgorithm(e.target.value as SigningAlgorithm)}
                    className="px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono"
                  >
                    <option value="RSA-SHA256">RSA-SHA256</option>
                    <option value="RSA-PSS-SHA256">RSA-PSS-SHA256</option>
                    <option value="ECDSA-P384-SHA384">ECDSA-P384-SHA384</option>
                  </select>
                  {hsmStatus && (
                    <select
                      aria-label={t('hsmPartitionLabel')}
                      value={issueSlotId}
                      onChange={e => setIssueSlotId(e.target.value)}
                      className="px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono"
                    >
                      {hsmStatus.hsmSlots.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.slotCode}
                        </option>
                      ))}
                    </select>
                  )}
                  {currentUser && (
                    <button
                      type="button"
                      onClick={() => handleIssueCertificate(currentUser.id, currentUser.fullNameEn)}
                      disabled={issuingForUserId === currentUser.id}
                      className="px-3 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>{issuingForUserId === currentUser.id ? 'Issuing...' : 'Issue My Keypair'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Signing Certificates Table */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-semibold">
                    <tr>
                      <th className="px-4 py-3">Certificate Serial</th>
                      <th className="px-4 py-3">Holder & Directorate</th>
                      <th className="px-4 py-3">Algorithm & HSM Vault</th>
                      <th className="px-4 py-3">Validity Window</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredCerts.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-400">
                          No matching PKI signing certificates found.
                        </td>
                      </tr>
                    ) : (
                      filteredCerts.map(cert => (
                        <tr key={cert.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-3 font-mono font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap tabular-nums">
                            <div>{cert.serialNumber}</div>
                            {cert.issuerCaSerial && (
                              <div className="text-[10px] font-normal text-slate-400">CA: {cert.issuerCaSerial}</div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-900 dark:text-slate-100">{cert.userName}</div>
                            <div className="text-[11px] text-slate-500">
                              {cert.userRole} · {cert.departmentNameEn}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px] text-slate-600 dark:text-slate-400 tabular-nums">
                            <div>
                              {cert.algorithm} ({cert.keySizeBits}-bit) ·{' '}
                              <span className="text-teal-700 dark:text-teal-400">
                                {cert.keyProtectionMode === 'HSM_AES256_WRAPPED' ? 'HSM AES-256' : 'Software'}
                              </span>
                            </div>
                            <div className="truncate max-w-[220px]" title={cert.fingerprintSha256}>
                              {cert.hsmSlotLabel || 'EPSS Vault'} · {cert.fingerprintSha256.slice(0, 14)}...
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px] text-slate-500 whitespace-nowrap tabular-nums">
                            <div>Issued: {cert.issuedAt.slice(0, 10)}</div>
                            <div>Exp: {cert.expiresAt.slice(0, 10)}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`font-mono font-bold text-[11px] uppercase ${
                                cert.status === 'Active'
                                  ? 'text-emerald-700 dark:text-emerald-400'
                                  : 'text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              {cert.status}
                            </span>
                            {cert.revokedReason && (
                              <div className="text-[10px] text-rose-600 dark:text-rose-400 max-w-[180px] truncate" title={cert.revokedReason}>
                                {cert.revokedReason}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap space-x-2">
                            {(canManageAllCerts || cert.userId === currentUser?.id) && (
                              <button
                                type="button"
                                onClick={() => handleIssueCertificate(cert.userId, cert.userName)}
                                disabled={issuingForUserId === cert.userId}
                                className="px-2.5 py-1 text-[11px] font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 border border-teal-200 dark:border-teal-800 rounded-md"
                              >
                                {issuingForUserId === cert.userId ? 'Issuing...' : 'Rotate Key'}
                              </button>
                            )}
                            {cert.status === 'Active' && (canManageAllCerts || cert.userId === currentUser?.id) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setRevokeModalCert(cert);
                                  setRevokeReason('');
                                }}
                                className="px-2.5 py-1 text-[11px] font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 border border-rose-200 dark:border-rose-800 rounded-md"
                              >
                                Revoke
                              </button>
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

          {pkiSubView === 'crl' && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  {t('crlRegistryTitle')}
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  URI: /api/v1/pki/crl
                </span>
              </div>
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-semibold">
                  <tr>
                    <th className="px-4 py-3">Revoked Serial</th>
                    <th className="px-4 py-3">Certificate Holder</th>
                    <th className="px-4 py-3">Revoked At</th>
                    <th className="px-4 py-3">Revoked By</th>
                    <th className="px-4 py-3">Revocation Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {crlEntries.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        No revoked certificates currently listed on the EPSS CRL.
                      </td>
                    </tr>
                  ) : (
                    crlEntries.map((entry) => (
                      <tr key={entry.serialNumber} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 font-mono font-bold text-rose-700 dark:text-rose-400 whitespace-nowrap tabular-nums">
                          {entry.serialNumber}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">{entry.holderName}</div>
                          <div className="text-[11px] text-slate-500">{entry.holderRole}</div>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-500 whitespace-nowrap tabular-nums">
                          {formatEthiopianDate(entry.revokedAt, language, true)}
                        </td>
                        <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{entry.revokedBy}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{entry.reason}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {pkiSubView === 'verifier' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <form
                onSubmit={handleVerifyDetachedBundle}
                className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3"
              >
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                  <h2 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {t('detachedBundleVerifierTitle')}
                  </h2>
                  <label className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md cursor-pointer inline-flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-teal-600" />
                    <span>{language === 'am' ? '.sig.json ፋይል ምረጥ' : 'Upload .sig.json'}</span>
                    <input
                      type="file"
                      accept=".json,.sig.json,application/json"
                      onChange={handleBundleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {language === 'am'
                    ? 'ከማንኛውም የተፈረመ ወጪ ደብዳቤ የወረደውን .sig.json ማረጋገጫ እዚህ በመለጠፍ የሰነዱን SHA-256 ዲጂታል ፊርማ፣ የCA ሰንሰለት እና የTSA ጊዜ ማህተም ያረጋግጡ።'
                    : 'Upload or paste a detached EPSS-PKI-DETACHED-BUNDLE-V1 (.sig.json) proof bundle to independently verify SHA-256 digest integrity, CA endorsement, TSA timestamp, and CRL status.'}
                </p>
                <textarea
                  rows={10}
                  required
                  value={bundleJsonInput}
                  onChange={(e) => setBundleJsonInput(e.target.value)}
                  placeholder='{"bundleFormat": "EPSS-PKI-DETACHED-BUNDLE-V1", ...}'
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-[11px] text-slate-900 dark:text-slate-100"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isVerifyingBundle || !bundleJsonInput.trim()}
                    className="px-4 py-2 bg-teal-700 hover:bg-teal-800 disabled:opacity-40 text-white text-xs font-semibold rounded-lg"
                  >
                    {isVerifyingBundle
                      ? language === 'am'
                        ? 'በማረጋገጥ ላይ...'
                        : 'Verifying Cryptography...'
                      : language === 'am'
                        ? 'የማረጋገጫ ፓኬጁን መርምር'
                        : 'Verify Cryptographic Bundle'}
                  </button>
                </div>
              </form>

              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
                <h2 className="text-xs font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                  {language === 'am' ? 'የክሪፕቶግራፊ ምርመራ ውጤት' : 'Independent Verification Report'}
                </h2>
                {!bundleReport ? (
                  <div className="py-16 text-center text-xs text-slate-400">
                    {language === 'am'
                      ? 'የማረጋገጫ ፓኬጅ ገና አልተመረመረም።'
                      : 'Submit a .sig.json bundle to inspect cryptographic verification telemetry.'}
                  </div>
                ) : (
                  <div className="space-y-3 text-xs">
                    <div
                      className={`p-3 rounded-lg border ${
                        bundleReport.valid
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                          : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                      }`}
                    >
                      <div className="font-bold uppercase tracking-wide flex items-center justify-between">
                        <span>{bundleReport.valid ? 'NON-REPUDIATION VERIFIED' : 'VERIFICATION FAILED / TAMPER ALERT'}</span>
                        <span className="font-mono tabular-nums">
                          {bundleReport.validSignatures}/{bundleReport.totalSignatures} VALID
                        </span>
                      </div>
                      <p className="text-[11px] mt-1">{bundleReport.summaryMessage}</p>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 font-mono text-[10px] space-y-1 break-all tabular-nums">
                      <div>Reg #: <strong className="text-slate-900 dark:text-slate-100">{bundleReport.registrationNumber}</strong></div>
                      <div>Computed SHA-256: {bundleReport.computedDigestSha256}</div>
                      <div>Declared SHA-256: {bundleReport.declaredDigestSha256}</div>
                      <div>Digest Match: {bundleReport.digestIntegrityMatch ? 'YES' : 'NO (MODIFIED)'}</div>
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg">
                      {bundleReport.results.map(r => (
                        <div key={r.signatureId} className="p-3 text-[11px] space-y-1">
                          <div className="flex items-center justify-between font-semibold">
                            <span className="text-slate-900 dark:text-slate-100">{r.signedBy}</span>
                            <span className={`font-mono ${r.status === 'Valid' ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                              {r.status} · {r.algorithm}
                            </span>
                          </div>
                          <div className="font-mono text-[10px] text-slate-500">
                            Cert: {r.certificateSerial} · CA Trust: {r.caChainTrusted ? 'OK' : 'FAIL'} · TSA: {r.tsaVerified ? 'OK' : 'MISSING'} · CRL: {r.crlStatus}
                          </div>
                          <div className="text-slate-600 dark:text-slate-400">{r.reason}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DISASTER RECOVERY & BACKUPS */}
      {activeTab === 'backups' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {language === 'am' ? 'የስርዓት ሙሉ የመጠባበቂያ ቅጂ ፍጠር' : 'Database Snapshot Engine & Point-in-Time Recovery'}
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
                {language === 'am'
                  ? 'የኢ.መ.አ.አ ዋና መሥሪያ ቤት እና ሁሉንም 19 ቅርንጫፍ ቢሮዎች ሰነዶች፣ ተጠቃሚዎች፣ የመተላለፊያ ታሪኮች እና የኦዲት መዛግብትን የሚያካትት ሙሉ የደህንነት ቅጂ ይፈጥራል።'
                  : 'Generates an immutable cryptographic snapshot of all correspondence items, 20 branches, 8 directorates, users, PKI digital signatures, and audit trails into secure local storage.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCreateBackup}
                disabled={isCreatingBackup}
                className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center gap-2 shadow-xs transition-colors"
              >
                {isCreatingBackup ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>{language === 'am' ? 'አዲስ ቅጂ አሁን ፍጠር' : 'Create Snapshot Now'}</span>
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto shadow-xs">
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                {language === 'am' ? 'የተቀመጡ የመጠባበቂያ ቅጂዎች' : 'Saved Disaster Recovery Snapshots'}
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                Location: /data/backups/
              </span>
            </div>

            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-semibold">
                <tr>
                  <th className="px-4 py-3">Snapshot File Name</th>
                  <th className="px-4 py-3">Created Timestamp</th>
                  <th className="px-4 py-3">Data Footprint</th>
                  <th className="px-4 py-3">Scope & Records</th>
                  <th className="px-4 py-3">SHA-256 Checksum</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {backups.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No disaster recovery backups available. Click "Create Snapshot Now" to initialize the first archive.
                    </td>
                  </tr>
                ) : (
                  backups.map((b) => (
                    <tr key={b.filename} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-3 font-mono font-medium text-slate-900 dark:text-slate-100">
                        <div className="flex items-center gap-2">
                          <FileCheck className="w-4 h-4 text-teal-600 shrink-0" />
                          <span>{b.filename}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-500 whitespace-nowrap tabular-nums">
                        {formatEthiopianDate(b.timestamp, language)}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300 tabular-nums">
                        {(b.sizeBytes / 1024).toFixed(1)} KB
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                          <span className="font-semibold text-slate-900 dark:text-slate-100">{b.documentCount}</span> docs ·{' '}
                          <span className="font-semibold text-slate-900 dark:text-slate-100">{b.branchCount}</span> branches
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-400">
                        {b.checksum}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setConfirmRestoreFilename(b.filename)}
                          disabled={restoringFilename === b.filename}
                          className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800 rounded-md font-medium text-xs inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
                        >
                          {restoringFilename === b.filename ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="w-3.5 h-3.5" />
                          )}
                          <span>{language === 'am' ? 'ወደዚህ መልስ' : 'Restore State'}</span>
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

      {/* Certificate Revocation Modal */}
      {revokeModalCert && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-rose-200 dark:border-rose-900 shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Revoke PKI Signing Certificate
              </h3>
              <button type="button" onClick={() => setRevokeModalCert(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 font-mono text-[11px] space-y-1">
              <div className="font-bold text-slate-900 dark:text-slate-100">{revokeModalCert.serialNumber}</div>
              <div className="text-slate-500">Holder: {revokeModalCert.userName} ({revokeModalCert.userRole})</div>
            </div>
            <form onSubmit={handleConfirmRevoke} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mandatory Revocation Reason (min 10 chars) *
                </label>
                <textarea
                  rows={3}
                  required
                  minLength={10}
                  value={revokeReason}
                  onChange={e => setRevokeReason(e.target.value)}
                  placeholder="e.g. Hardware token compromised, staff role transfer, or lost credential..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setRevokeModalCert(null)}
                  className="px-3 py-1.5 text-slate-600 dark:text-slate-400 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg font-semibold"
                >
                  Revoke Certificate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Restore Confirmation Modal */}
      {confirmRestoreFilename && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-amber-200 dark:border-amber-900 shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex items-center gap-2 text-amber-600">
              <RotateCcw className="w-5 h-5" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Confirm Point-in-Time Database Restore
              </h3>
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Synchronize all active correspondence records, PKI certificates, and audit trails to snapshot{' '}
              <strong className="font-mono text-slate-900 dark:text-slate-100">{confirmRestoreFilename}</strong>?
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmRestoreFilename(null)}
                className="px-3 py-1.5 text-slate-600 dark:text-slate-400 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold"
              >
                Confirm Restore
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
