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
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import { apiFetch } from '../../lib/apiFetch.js';
import { formatEthiopianDate } from '../../lib/translations.js';
import { AuditLogEntry, BackupRecord, SigningCertificate } from '../../types/index.js';

export const AuditSecurityView: React.FC = () => {
  const { currentUser, language, t, refreshData } = useApp();
  const [activeTab, setActiveTab] = useState<'audit' | 'pki' | 'backups'>('audit');

  // Audit Trail State
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // PKI Certificates Registry State
  const [certificates, setCertificates] = useState<SigningCertificate[]>([]);
  const [certFilter, setCertFilter] = useState<'All' | 'Active' | 'Revoked'>('All');
  const [certSearch, setCertSearch] = useState('');
  const [issuingForUserId, setIssuingForUserId] = useState<string | null>(null);
  const [revokeModalCert, setRevokeModalCert] = useState<SigningCertificate | null>(null);
  const [revokeReason, setRevokeReason] = useState('');

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

  useEffect(() => {
    fetchAuditLogs();
    fetchBackups();
    fetchCertificates();
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
          reason: `Administrative PKI keypair issuance/renewal by ${currentUser?.fullNameEn || 'SuperAdmin'}`
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to issue certificate');
      setStatusMessage({
        type: 'success',
        text: `Issued active RSA-2048 signing certificate ${data.serialNumber} for ${userName}.`
      });
      fetchCertificates();
      fetchAuditLogs();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Certificate issuance failed' });
    } finally {
      setIssuingForUserId(null);
    }
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
        text: `Revoked signing certificate ${data.serialNumber} (${revokeModalCert.userName}).`
      });
      setRevokeModalCert(null);
      setRevokeReason('');
      fetchCertificates();
      fetchAuditLogs();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to revoke certificate' });
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

  const canManageAllCerts = currentUser?.role === 'SuperAdmin';

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
              ? 'የማይቀየር የደህንነት እና የኦዲት መዝገብ፣ የPKI ፊርማ ሰርተፊኬቶች እና የመጠባበቂያ ቅጂዎች'
              : 'Tamper-evident audit trail, EPSS PKI signing certificate authority, and disaster recovery snapshots.'}
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
            <span>{language === 'am' ? 'የPKI ፊርማ ሰርተፊኬቶች' : 'PKI Certificates'}</span>
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

      {/* TAB 2: PKI SIGNING CERTIFICATES REGISTRY */}
      {activeTab === 'pki' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter certificates by serial number, staff name, role, or directorate..."
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
            <div className="flex items-center gap-2">
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
              <button
                type="button"
                onClick={fetchCertificates}
                className="px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto shadow-xs">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-semibold">
                <tr>
                  <th className="px-4 py-3">Certificate Serial</th>
                  <th className="px-4 py-3">Holder & Directorate</th>
                  <th className="px-4 py-3">Algorithm & Fingerprint</th>
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
                        {cert.serialNumber}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{cert.userName}</div>
                        <div className="text-[11px] text-slate-500">
                          {cert.userRole} · {cert.departmentNameEn}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-600 dark:text-slate-400 tabular-nums">
                        <div>{cert.algorithm} ({cert.keySizeBits}-bit)</div>
                        <div className="truncate max-w-[200px]" title={cert.fingerprintSha256}>
                          SHA256: {cert.fingerprintSha256.slice(0, 20)}...
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
                            {issuingForUserId === cert.userId ? 'Issuing...' : 'Renew'}
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
