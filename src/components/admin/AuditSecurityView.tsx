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
  RefreshCw
} from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import { formatEthiopianDate } from '../../lib/translations.js';
import { AuditLogEntry, BackupRecord } from '../../types/index.js';

export const AuditSecurityView: React.FC = () => {
  const { language, t, refreshData } = useApp();
  const [activeTab, setActiveTab] = useState<'audit' | 'backups'>('audit');
  
  // Audit Trail State
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Backup & Recovery State
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [restoringFilename, setRestoringFilename] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchAuditLogs = () => {
    fetch('/api/v1/audit/logs')
      .then(r => r.json())
      .then(data => setLogs(data || []))
      .catch(console.error);
  };

  const fetchBackups = () => {
    fetch('/api/v1/admin/backups')
      .then(r => r.json())
      .then(data => setBackups(data || []))
      .catch(console.error);
  };

  useEffect(() => {
    fetchAuditLogs();
    fetchBackups();
  }, []);

  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/v1/admin/backup', { method: 'POST' });
      if (!res.ok) throw new Error('Backup failed to generate');
      const record: BackupRecord = await res.json();
      setStatusMessage({
        type: 'success',
        text: language === 'am' 
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

  const handleRestore = async (filename: string) => {
    const confirmText = language === 'am'
      ? `ይህ የመጠባበቂያ ቅጂ ወደ ነበረበት ይመለሳል፦ "${filename}"። እርግጠኛ ነዎት?`
      : `Are you sure you want to restore the system state from snapshot "${filename}"? All active documents and records will synchronize to this state.`;
    
    if (!window.confirm(confirmText)) return;

    setRestoringFilename(filename);
    setStatusMessage(null);
    try {
      const res = await fetch('/api/v1/admin/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Restore failed');

      setStatusMessage({
        type: 'success',
        text: language === 'am'
          ? `የውሂብ ጎታው ከ ${filename} በስኬት ወደ ነበረበት ተመልሷል!`
          : `Database successfully restored from snapshot ${filename}!`
      });
      refreshData();
      fetchBackups();
      fetchAuditLogs();
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
              ? 'የማይቀየር የደህንነት እና የኦዲት መዝገብ እንዲሁም የድንገተኛ አደጋ መቋቋሚያ የመጠባበቂያ ቅጂዎች'
              : 'Tamper-evident audit trail, regulatory integrity seals, and disaster recovery snapshot management.'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === 'audit'
                ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            {language === 'am' ? 'የኦዲት መዝገብ' : 'Audit Trail'}
            <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-200 dark:bg-slate-700 rounded-sm">
              {logs.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('backups')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === 'backups'
                ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            {language === 'am' ? 'የመጠባበቂያ ቅጂ እና መልሶ ማግኛ' : 'Disaster Recovery & Snapshots'}
            <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-200 dark:bg-slate-700 rounded-sm">
              {backups.length}
            </span>
          </button>
        </div>
      </div>

      {/* Global Status Banner */}
      {statusMessage && (
        <div className={`p-3.5 rounded-lg border text-xs flex items-center justify-between gap-3 ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
            : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button 
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
              onClick={fetchAuditLogs}
              className="px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh Log
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
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
                      <td className="px-4 py-2.5 font-mono text-slate-500 whitespace-nowrap">
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
                      <td className="px-4 py-2.5 font-mono text-[11px] text-slate-400 whitespace-nowrap">
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

      {/* TAB 2: DISASTER RECOVERY & BACKUPS */}
      {activeTab === 'backups' && (
        <div className="space-y-6">
          {/* Action Overview Card */}
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
                  : 'Generates an immutable cryptographic snapshot of all correspondence items, 20 branches, 8 directorates, users, digital signatures, and audit trails into secure local storage.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCreateBackup}
                disabled={isCreatingBackup}
                className="px-4 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center gap-2 shadow-xs transition-colors"
              >
                {isCreatingBackup ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                {language === 'am' ? 'አዲስ ቅጂ አሁን ፍጠር' : 'Create Snapshot Now'}
              </button>
            </div>
          </div>

          {/* Backup Archives Table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
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
                      <td className="px-4 py-3 font-mono text-slate-500 whitespace-nowrap">
                        {formatEthiopianDate(b.timestamp, language)}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-300">
                        {(b.sizeBytes / 1024).toFixed(1)} KB
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                          <span className="font-semibold text-slate-900 dark:text-slate-100">{b.documentCount}</span> docs · 
                          <span className="font-semibold text-slate-900 dark:text-slate-100">{b.branchCount}</span> branches
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-400">
                        {b.checksum}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleRestore(b.filename)}
                          disabled={restoringFilename === b.filename}
                          className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800 rounded-md font-medium text-xs inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
                        >
                          {restoringFilename === b.filename ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="w-3.5 h-3.5" />
                          )}
                          {language === 'am' ? 'ወደዚህ መልስ' : 'Restore State'}
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
    </div>
  );
};
