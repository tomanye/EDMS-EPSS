import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2,
  ClipboardCheck,
  FileSpreadsheet,
  PackageCheck,
  Plus,
  Printer,
  RefreshCw,
  Send,
  ShieldCheck,
  Truck,
  Upload,
  X,
  AlertTriangle
} from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import { apiFetch } from '../../lib/apiFetch.js';
import { formatEthiopianDate } from '../../lib/translations.js';
import {
  BulkImportResult,
  BulkImportRowInput,
  ConfidentialityLevel,
  DocumentType,
  PriorityLevel,
  TransmittalDispatchMethod,
  TransmittalManifest
} from '../../types/index.js';

const SAMPLE_CSV = `type,referenceNumber,subjectEn,senderOrganization,recipientOrganization,priority,confidentiality
IncomingLetter,MOH-2026-881,National Essential Medicines Q4 Distribution Directive,Ministry of Health (MoH),EPSS Head Office,Urgent,Internal
IncomingLetter,EFDA-2026-412,Cold-Chain Vaccine Lot Release Certificate #44,Ethiopian Food and Drug Authority,EPSS Quality Assurance,VeryUrgent,Internal
OutgoingLetter,EPSS-OUT-2026-190,Regional Cold-Room Calibration Dispatch Notice,EPSS Head Office,Hawassa Regional Hub,Normal,Internal`;

export const TransmittalManifestsView: React.FC = () => {
  const { documents, branches, departments, language, refreshData, setSelectedDocument } = useApp();
  const [activeTab, setActiveTab] = useState<'manifests' | 'csv'>('manifests');
  const [manifests, setManifests] = useState<TransmittalManifest[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Create Manifest Modal
  const [createOpen, setCreateOpen] = useState(false);
  const [mTitle, setMTitle] = useState('');
  const [mBranchId, setMBranchId] = useState(branches[1]?.id || branches[0]?.id || 'br-hq');
  const [mTargetOrg, setMTargetOrg] = useState('');
  const [mCarrier, setMCarrier] = useState('');
  const [mPhone, setMPhone] = useState('');
  const [mMethod, setMMethod] = useState<TransmittalDispatchMethod>('RegionalHubShuttle');
  const [mNotes, setMNotes] = useState('');
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [submittingManifest, setSubmittingManifest] = useState(false);

  // CSV Batch Import State
  const [csvText, setCsvText] = useState(SAMPLE_CSV);
  const [defaultBranchId, setDefaultBranchId] = useState(branches[0]?.id || 'br-hq');
  const [defaultDeptId, setDefaultDeptId] = useState(departments[0]?.id || 'dept-reg');
  const [importingCsv, setImportingCsv] = useState(false);
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null);

  const notify = (type: 'success' | 'error', text: string) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 5000);
  };

  const fetchManifests = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/v1/correspondence/transmittals');
      const data = await res.json().catch(() => []);
      setManifests(Array.isArray(data) ? data : []);
    } catch (err: any) {
      notify('error', err?.message || 'Failed to load transmittal manifests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchManifests();
    try {
      const preselect = window.sessionStorage.getItem('epss_pending_transmittal_docs');
      if (preselect) {
        const ids = JSON.parse(preselect);
        if (Array.isArray(ids) && ids.length > 0) {
          setSelectedDocIds(ids);
          setCreateOpen(true);
        }
        window.sessionStorage.removeItem('epss_pending_transmittal_docs');
      }
    } catch {
      // ignore
    }
  }, [fetchManifests]);

  const parseCsvRows = (raw: string): BulkImportRowInput[] => {
    const lines = raw
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return [];

    const parseCsvLine = (line: string): string[] => {
      const cols: string[] = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          inQuotes = !inQuotes;
        } else if (ch === ',' && !inQuotes) {
          cols.push(cur.trim());
          cur = '';
        } else {
          cur += ch;
        }
      }
      cols.push(cur.trim());
      return cols;
    };

    const firstCols = parseCsvLine(lines[0]).map(c => c.toLowerCase());
    const hasHeader = firstCols.includes('subjecten') || firstCols.includes('senderorganization');
    const dataLines = hasHeader ? lines.slice(1) : lines;

    return dataLines.map(line => {
      const cols = parseCsvLine(line);
      if (hasHeader) {
        const get = (key: string) => {
          const idx = firstCols.indexOf(key.toLowerCase());
          return idx >= 0 ? cols[idx] || '' : '';
        };
        return {
          type: (get('type') as DocumentType) || 'IncomingLetter',
          referenceNumber: get('referenceNumber') || undefined,
          subjectEn: get('subjectEn'),
          senderOrganization: get('senderOrganization'),
          recipientOrganization: get('recipientOrganization') || undefined,
          branchId: defaultBranchId,
          departmentId: defaultDeptId,
          priority: (get('priority') as PriorityLevel) || 'Normal',
          confidentiality: (get('confidentiality') as ConfidentialityLevel) || 'Internal'
        };
      }
      return {
        type: (cols[0] as DocumentType) || 'IncomingLetter',
        referenceNumber: cols[1] || undefined,
        subjectEn: cols[2] || '',
        senderOrganization: cols[3] || '',
        recipientOrganization: cols[4] || undefined,
        branchId: defaultBranchId,
        departmentId: defaultDeptId,
        priority: (cols[5] as PriorityLevel) || 'Normal',
        confidentiality: (cols[6] as ConfidentialityLevel) || 'Internal'
      };
    });
  };

  const parsedPreview = parseCsvRows(csvText);

  const handleCsvFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCsvText(reader.result);
      }
    };
    reader.readAsText(file);
  };

  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedPreview.length === 0) {
      notify('error', 'No correspondence rows detected in CSV input.');
      return;
    }
    try {
      setImportingCsv(true);
      const res = await apiFetch('/api/v1/correspondence/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: parsedPreview })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Batch import failed.');
      setImportResult(data as BulkImportResult);
      await refreshData();
      notify(
        'success',
        `Batch registered ${data.createdCount} of ${data.totalRows} correspondence records.`
      );
    } catch (err: any) {
      notify('error', err?.message || 'Batch import failed.');
    } finally {
      setImportingCsv(false);
    }
  };

  const handleCreateManifest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingManifest(true);
      const res = await apiFetch('/api/v1/correspondence/transmittals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: mTitle,
          targetBranchId: mBranchId || undefined,
          targetOrganization: mTargetOrg || undefined,
          carrierName: mCarrier,
          courierPhone: mPhone || undefined,
          dispatchMethod: mMethod,
          documentIds: selectedDocIds,
          notes: mNotes || undefined
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to prepare manifest.');
      setCreateOpen(false);
      setMTitle('');
      setMTargetOrg('');
      setMCarrier('');
      setMPhone('');
      setMNotes('');
      setSelectedDocIds([]);
      await fetchManifests();
      notify('success', `Prepared Official Transmittal Manifest ${data.manifestNumber}.`);
    } catch (err: any) {
      notify('error', err?.message || 'Failed to create transmittal manifest.');
    } finally {
      setSubmittingManifest(false);
    }
  };

  const handleDispatchManifest = async (m: TransmittalManifest) => {
    try {
      const res = await apiFetch(`/api/v1/correspondence/transmittals/${m.id}/dispatch`, {
        method: 'POST'
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Dispatch failed.');
      await Promise.all([fetchManifests(), refreshData()]);
      notify('success', `Manifest ${m.manifestNumber} sealed and marked Dispatched.`);
    } catch (err: any) {
      notify('error', err?.message || 'Dispatch failed.');
    }
  };

  const handleAcknowledgeManifest = async (m: TransmittalManifest) => {
    try {
      const res = await apiFetch(`/api/v1/correspondence/transmittals/${m.id}/acknowledge`, {
        method: 'POST'
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Acknowledgment failed.');
      await fetchManifests();
      notify('success', `Receipt confirmed for Manifest ${m.manifestNumber}.`);
    } catch (err: any) {
      notify('error', err?.message || 'Acknowledgment failed.');
    }
  };

  const openDocById = (docId: string) => {
    const found = documents.find(d => d.id === docId);
    if (found) setSelectedDocument(found);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Batch Operations &amp; Official Transmittal Manifests
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {language === 'am'
              ? 'የጅምላ ሰነድ ምዝገባ (CSV) እና ለ19 ቅርንጫፎች የሚላኩ ይፋዊ የመላኪያ ማኒፌስቶች'
              : 'Sealed multi-document dispatch manifests across 19 regional hubs and validated CSV batch correspondence intake.'}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={fetchManifests}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Transmittal Manifest</span>
          </button>
        </div>
      </div>

      {notice && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
            notice.type === 'success'
              ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-200'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
          }`}
        >
          <span className="flex items-center gap-2 font-medium">
            {notice.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{notice.text}</span>
          </span>
          <button type="button" onClick={() => setNotice(null)}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Sub-navigation Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('manifests')}
          className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'manifests'
              ? 'border-teal-700 text-teal-800 dark:border-teal-400 dark:text-teal-300'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          <span>Transmittal Manifests ({manifests.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('csv')}
          className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'csv'
              ? 'border-teal-700 text-teal-800 dark:border-teal-400 dark:text-teal-300'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>CSV / Batch Correspondence Intake</span>
        </button>
      </div>

      {/* TAB 1: TRANSMITTAL MANIFESTS */}
      {activeTab === 'manifests' && (
        <div className="space-y-4">
          {manifests.map(m => (
            <div
              key={m.id}
              className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-bold text-sm text-teal-700 dark:text-teal-400 tabular-nums">
                      {m.manifestNumber}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                        m.status === 'Acknowledged'
                          ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800'
                          : m.status === 'Dispatched'
                          ? 'text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50 border-sky-200 dark:border-sky-800'
                          : 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800'
                      }`}
                    >
                      {m.status}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      {m.dispatchMethod}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1">
                    {m.title}
                  </h3>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Destination: <strong className="text-slate-700 dark:text-slate-200">{m.targetOrganization}</strong> · Carrier:{' '}
                    <strong className="text-slate-700 dark:text-slate-200">{m.carrierName}</strong>
                    {m.courierPhone ? ` (${m.courierPhone})` : ''}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 print:hidden">
                  {m.status === 'Prepared' && (
                    <button
                      type="button"
                      onClick={() => handleDispatchManifest(m)}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Seal &amp; Dispatch</span>
                    </button>
                  )}
                  {m.status === 'Dispatched' && (
                    <button
                      type="button"
                      onClick={() => handleAcknowledgeManifest(m)}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg flex items-center gap-1.5"
                    >
                      <PackageCheck className="w-3.5 h-3.5" />
                      <span>Confirm Hub Receipt</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => typeof window.print === 'function' && window.print()}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg flex items-center gap-1"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Slip</span>
                  </button>
                </div>
              </div>

              {/* Bundled Documents */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg space-y-2 text-xs">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  <span>Bundled Correspondence Records ({m.documentIds.length})</span>
                  <span className="font-mono text-[10px] text-slate-400 truncate max-w-xs">
                    SHA256: {m.manifestDigestSha256}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {m.documentRegNumbers.map((regNo, idx) => (
                    <button
                      key={regNo}
                      type="button"
                      onClick={() => openDocById(m.documentIds[idx])}
                      className="px-2 py-1 font-mono text-[11px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-teal-600 rounded text-slate-800 dark:text-slate-200"
                    >
                      {regNo}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                <span>
                  Prepared by {m.createdByName} on {formatEthiopianDate(m.createdAt, language)}
                </span>
                <span>
                  {m.acknowledgedAt
                    ? `Acknowledged by ${m.acknowledgedByName} (${formatEthiopianDate(m.acknowledgedAt, language)})`
                    : m.dispatchedAt
                    ? `Dispatched by ${m.dispatchedByName} (${formatEthiopianDate(m.dispatchedAt, language)})`
                    : 'Awaiting seal & dispatch'}
                </span>
              </div>
            </div>
          ))}

          {manifests.length === 0 && (
            <div className="p-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-center text-xs text-slate-500 dark:text-slate-400">
              No transmittal manifests recorded yet. Select correspondence items or click "New Transmittal Manifest".
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CSV BATCH INTAKE */}
      {activeTab === 'csv' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form
            onSubmit={handleBulkImport}
            className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4 text-xs"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                CSV / Tabular Batch Correspondence Registration
              </h2>
              <label className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg font-semibold cursor-pointer inline-flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5" />
                <span>Load .CSV</span>
                <input type="file" accept=".csv,text/csv" onChange={handleCsvFileUpload} className="hidden" />
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Branch / Hub
                </label>
                <select
                  value={defaultBranchId}
                  onChange={e => setDefaultBranchId(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                >
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.nameEn}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Assigned Directorate
                </label>
                <select
                  value={defaultDeptId}
                  onChange={e => setDefaultDeptId(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                >
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.nameEn}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                CSV Rows (Max 50 per batch)
              </label>
              <textarea
                rows={9}
                value={csvText}
                onChange={e => setCsvText(e.target.value)}
                className="w-full p-3 font-mono text-[11px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setCsvText(SAMPLE_CSV)}
                className="text-teal-700 dark:text-teal-400 hover:underline font-semibold"
              >
                Reset Sample Template
              </button>
              <button
                type="submit"
                disabled={importingCsv || parsedPreview.length === 0}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-lg disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                <ClipboardCheck className="w-3.5 h-3.5" />
                <span>{importingCsv ? 'Registering Batch...' : `Register ${parsedPreview.length} Records`}</span>
              </button>
            </div>
          </form>

          {/* Parsed Row Preview & Import Outcome */}
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Validated Batch Preview ({parsedPreview.length} rows)
              </h3>
              {importResult && (
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                  {importResult.createdCount}/{importResult.totalRows} Created
                </span>
              )}
            </div>

            <div className="overflow-x-auto max-h-80 border border-slate-200 dark:border-slate-800 rounded-lg">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-2 px-3">#</th>
                    <th className="py-2 px-3">Type / Ref</th>
                    <th className="py-2 px-3">Subject &amp; Sender</th>
                    <th className="py-2 px-3">Priority</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {parsedPreview.map((r, i) => (
                    <tr key={i}>
                      <td className="py-2 px-3 font-mono text-slate-400">{i + 1}</td>
                      <td className="py-2 px-3 font-mono">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{r.type}</div>
                        <div className="text-slate-400">{r.referenceNumber || 'Auto'}</div>
                      </td>
                      <td className="py-2 px-3">
                        <div className="font-medium text-slate-900 dark:text-slate-100">{r.subjectEn || '—'}</div>
                        <div className="text-slate-500">{r.senderOrganization || '—'}</div>
                      </td>
                      <td className="py-2 px-3 font-mono">{r.priority}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {importResult && (
              <div className="p-3 bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 rounded-lg space-y-1.5">
                <div className="font-bold text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Batch Intake Summary</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {importResult.createdDocuments.map(doc => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => setSelectedDocument(doc)}
                      className="px-2 py-0.5 font-mono text-[11px] bg-white dark:bg-slate-900 border border-teal-200 dark:border-teal-800 rounded text-teal-800 dark:text-teal-300"
                    >
                      {doc.registrationNumber}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Prepare Transmittal Manifest */}
      {createOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 p-5 space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Prepare Official Transmittal Manifest
              </h3>
              <button type="button" onClick={() => setCreateOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateManifest} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Manifest Title *
                </label>
                <input
                  type="text"
                  required
                  minLength={4}
                  value={mTitle}
                  onChange={e => setMTitle(e.target.value)}
                  placeholder="e.g. Northern Hubs Weekly Cold-Chain Permits Pouch"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Destination Hub
                  </label>
                  <select
                    value={mBranchId}
                    onChange={e => setMBranchId(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  >
                    <option value="">External Agency</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.nameEn}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Dispatch Method
                  </label>
                  <select
                    value={mMethod}
                    onChange={e => setMMethod(e.target.value as TransmittalDispatchMethod)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  >
                    <option value="RegionalHubShuttle">RegionalHubShuttle</option>
                    <option value="Courier">Courier</option>
                    <option value="DiplomaticPouch">DiplomaticPouch</option>
                    <option value="ElectronicPortal">ElectronicPortal</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Carrier / Courier Name *
                  </label>
                  <input
                    type="text"
                    required
                    minLength={2}
                    value={mCarrier}
                    onChange={e => setMCarrier(e.target.value)}
                    placeholder="e.g. Ethiopian Postal Service / Shuttle"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Courier Phone
                  </label>
                  <input
                    type="text"
                    value={mPhone}
                    onChange={e => setMPhone(e.target.value)}
                    placeholder="+251-..."
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Organization Override
                </label>
                <input
                  type="text"
                  value={mTargetOrg}
                  onChange={e => setMTargetOrg(e.target.value)}
                  placeholder="Optional if sending to MoH, EFDA, or supplier"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Select Correspondence to Bundle ({selectedDocIds.length} selected) *
                </label>
                <div className="max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  {documents.slice(0, 35).map(doc => {
                    const checked = selectedDocIds.includes(doc.id);
                    return (
                      <label key={doc.id} className="flex items-center gap-2 p-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setSelectedDocIds(prev =>
                              checked ? prev.filter(id => id !== doc.id) : [...prev, doc.id]
                            )
                          }
                        />
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200 shrink-0">
                          {doc.registrationNumber}
                        </span>
                        <span className="truncate text-slate-600 dark:text-slate-400">{doc.subjectEn}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Seal / Dispatch Notes
                </label>
                <input
                  type="text"
                  value={mNotes}
                  onChange={e => setMNotes(e.target.value)}
                  placeholder="Optional pouch seal ID or handling notes"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingManifest || selectedDocIds.length === 0}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-semibold disabled:opacity-50"
                >
                  {submittingManifest ? 'Preparing...' : 'Prepare Sealed Manifest'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
