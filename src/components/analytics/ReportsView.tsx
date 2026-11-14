import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bookmark,
  Building2,
  CheckCircle2,
  Download,
  FileJson,
  FileSpreadsheet,
  Filter,
  Lock,
  Printer,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Trash2,
  TrendingUp
} from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import { apiFetch } from '../../lib/apiFetch.js';
import { formatEthiopianDate } from '../../lib/translations.js';
import {
  AnalyticsQueryParams,
  BranchCluster,
  ConfidentialityLevel,
  DocumentStatus,
  DocumentType,
  ManagementAnalyticsReport,
  ManagementReportCategory,
  ReportExportRecord,
  SavedReportTemplate
} from '../../types/index.js';

type ReportSubTab = 'overview' | 'branches' | 'directorates' | 'overdue' | 'governance';

const SUB_TAB_REPORT_TYPE: Record<ReportSubTab, ManagementReportCategory> = {
  overview: 'MasterRegister',
  branches: 'BranchTurnaround',
  directorates: 'DirectorateWorkload',
  overdue: 'OverdueRegister',
  governance: 'RetentionAndPki'
};

export const ReportsView: React.FC = () => {
  const {
    branches,
    departments,
    documents,
    currentUser,
    language,
    setSelectedDocument,
    t
  } = useApp();

  const [subTab, setSubTab] = useState<ReportSubTab>('overview');
  const [filters, setFilters] = useState<AnalyticsQueryParams>({
    cluster: 'All',
    branchId: 'All',
    departmentId: 'All',
    type: 'All',
    status: 'All',
    confidentiality: 'All',
    dateFrom: '',
    dateTo: ''
  });

  const [report, setReport] = useState<ManagementAnalyticsReport | null>(null);
  const [templates, setTemplates] = useState<SavedReportTemplate[]>([]);
  const [exportHistory, setExportHistory] = useState<ReportExportRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const [isSavePresetOpen, setIsSavePresetOpen] = useState<boolean>(false);
  const [presetName, setPresetName] = useState<string>('');
  const [presetDesc, setPresetDesc] = useState<string>('');
  const [exportTargetType, setExportTargetType] = useState<ManagementReportCategory>('MasterRegister');

  useEffect(() => {
    setExportTargetType(SUB_TAB_REPORT_TYPE[subTab]);
  }, [subTab]);

  const canExportReports = useMemo(() => {
    if (!currentUser) return false;
    return (
      currentUser.role === 'SuperAdmin' ||
      currentUser.permissions.includes('*') ||
      currentUser.permissions.includes('export:reports') ||
      ['DirectorGeneral', 'Director', 'RegistryOfficer', 'BranchManager', 'Auditor'].includes(currentUser.role)
    );
  }, [currentUser]);

  const filteredBranchOptions = useMemo(() => {
    if (!filters.cluster || filters.cluster === 'All') return branches;
    return branches.filter((b) => b.cluster === filters.cluster);
  }, [branches, filters.cluster]);

  const buildQueryString = useCallback((f: AnalyticsQueryParams) => {
    const qs = new URLSearchParams();
    if (f.dateFrom) qs.set('dateFrom', f.dateFrom);
    if (f.dateTo) qs.set('dateTo', f.dateTo);
    if (f.cluster && f.cluster !== 'All') qs.set('cluster', f.cluster);
    if (f.branchId && f.branchId !== 'All') qs.set('branchId', f.branchId);
    if (f.departmentId && f.departmentId !== 'All') qs.set('departmentId', f.departmentId);
    if (f.type && f.type !== 'All') qs.set('type', f.type);
    if (f.status && f.status !== 'All') qs.set('status', f.status);
    if (f.confidentiality && f.confidentiality !== 'All') qs.set('confidentiality', f.confidentiality);
    const s = qs.toString();
    return s ? `?${s}` : '';
  }, []);

  const fetchAnalytics = useCallback(
    async (activeFilters: AnalyticsQueryParams) => {
      try {
        setIsLoading(true);
        setErrorMsg(null);
        const res = await apiFetch(`/api/v1/analytics/management${buildQueryString(activeFilters)}`);
        if (!res.ok) {
          const payload = await res.json().catch(() => ({}));
          throw new Error(payload.error || 'Failed to compute analytics report');
        }
        const data: ManagementAnalyticsReport = await res.json();
        setReport(data);
      } catch (err: any) {
        setErrorMsg(err?.message || 'Unable to load analytics data');
      } finally {
        setIsLoading(false);
      }
    },
    [buildQueryString]
  );

  const fetchTemplatesAndHistory = useCallback(async () => {
    try {
      const [tplRes, expRes] = await Promise.all([
        apiFetch('/api/v1/reports/templates'),
        apiFetch('/api/v1/reports/exports')
      ]);
      if (tplRes.ok) {
        setTemplates(await tplRes.json());
      }
      if (expRes.ok) {
        setExportHistory(await expRes.json());
      }
    } catch {
      // Non-blocking supplementary metadata
    }
  }, []);

  useEffect(() => {
    fetchAnalytics(filters);
  }, [fetchAnalytics, filters]);

  useEffect(() => {
    fetchTemplatesAndHistory();
  }, [fetchTemplatesAndHistory]);

  const handleResetFilters = () => {
    setFilters({
      cluster: 'All',
      branchId: 'All',
      departmentId: 'All',
      type: 'All',
      status: 'All',
      confidentiality: 'All',
      dateFrom: '',
      dateTo: ''
    });
  };

  const handleApplyTemplate = (tpl: SavedReportTemplate) => {
    setFilters({
      cluster: tpl.filters?.cluster || 'All',
      branchId: tpl.filters?.branchId || 'All',
      departmentId: tpl.filters?.departmentId || 'All',
      type: tpl.filters?.type || 'All',
      status: tpl.filters?.status || 'All',
      confidentiality: tpl.filters?.confidentiality || 'All',
      dateFrom: tpl.filters?.dateFrom || '',
      dateTo: tpl.filters?.dateTo || ''
    });
    if (tpl.reportType === 'BranchTurnaround') setSubTab('branches');
    else if (tpl.reportType === 'DirectorateWorkload') setSubTab('directorates');
    else if (tpl.reportType === 'OverdueRegister') setSubTab('overdue');
    else if (tpl.reportType === 'RetentionAndPki') setSubTab('governance');
    else setSubTab('overview');
    setFeedbackBanner({
      kind: 'success',
      text: `Applied preset "${tpl.name}".`
    });
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (presetName.trim().length < 3) {
      setFeedbackBanner({ kind: 'error', text: 'Preset name must be at least 3 characters.' });
      return;
    }
    try {
      const res = await apiFetch('/api/v1/reports/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: presetName.trim(),
          description: presetDesc.trim() || undefined,
          reportType: exportTargetType,
          filters
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save report preset');
      }
      setTemplates((prev) => [data, ...prev]);
      setPresetName('');
      setPresetDesc('');
      setIsSavePresetOpen(false);
      setFeedbackBanner({ kind: 'success', text: `Saved report preset "${data.name}".` });
    } catch (err: any) {
      setFeedbackBanner({ kind: 'error', text: err?.message || 'Unable to save preset' });
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      const res = await apiFetch(`/api/v1/reports/templates/${id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Cannot delete preset');
      }
      setTemplates((prev) => prev.filter((item) => item.id !== id));
    } catch (err: any) {
      setFeedbackBanner({ kind: 'error', text: err?.message || 'Unable to delete preset' });
    }
  };

  const handleExport = async (format: 'excel-csv' | 'csv' | 'json') => {
    try {
      setIsExporting(true);
      setFeedbackBanner(null);
      const res = await apiFetch('/api/v1/reports/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportType: exportTargetType,
          format,
          filters
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Export authorization failed');
      }

      const blob = new Blob([data.content], { type: data.mimeType || 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      if (data.exportRecord) {
        setExportHistory((prev) => [data.exportRecord, ...prev]);
      }
      setFeedbackBanner({
        kind: 'success',
        text: `Downloaded ${data.filename} (${data.exportRecord?.recordCount ?? 0} rows · SHA-256 ${data.exportRecord?.sha256Checksum?.slice(0, 12)}).`
      });
    } catch (err: any) {
      setFeedbackBanner({ kind: 'error', text: err?.message || 'Failed to generate export' });
    } finally {
      setIsExporting(false);
    }
  };

  const handleInspectOverdue = (documentId: string) => {
    const match = documents.find((d) => d.id === documentId);
    if (match) {
      setSelectedDocument(match);
    }
  };

  const maxMonthlyCount = useMemo(() => {
    if (!report?.monthlyTrend?.length) return 1;
    return Math.max(
      1,
      ...report.monthlyTrend.map((m) => m.incoming + m.outgoing + m.memos)
    );
  }, [report]);

  return (
    <div className="space-y-6 epss-printable-report">
      {/* Header & Export Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t('navReports')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {language === 'am'
              ? 'የሥራ አመራር ትንተና፣ የ19 ቅርንጫፎች የማጠናቀቂያ ጊዜ እና በኦዲት የተረጋገጠ የCSV/Excel/JSON መረጃ መውጫ'
              : 'Server-computed correspondence SLA analytics, cross-branch turnaround intelligence, and audited exports.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Export dataset scope"
            value={exportTargetType}
            onChange={(e) => setExportTargetType(e.target.value as ManagementReportCategory)}
            className="px-2.5 py-2 text-xs font-medium bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="MasterRegister">Master Register</option>
            <option value="SlaCompliance">SLA Compliance Summary</option>
            <option value="BranchTurnaround">19 Hubs Turnaround</option>
            <option value="DirectorateWorkload">Directorate Workload</option>
            <option value="OverdueRegister">Overdue SLA Register</option>
            <option value="RetentionAndPki">Retention & PKI Audit</option>
          </select>

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{language === 'am' ? 'ሪፖርት አትም' : 'Print Brief'}</span>
          </button>

          <button
            type="button"
            disabled={!canExportReports || isExporting}
            onClick={() => handleExport('excel-csv')}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>{isExporting ? 'Generating...' : 'Export Excel CSV'}</span>
          </button>

          <button
            type="button"
            disabled={!canExportReports || isExporting}
            onClick={() => handleExport('csv')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>

          <button
            type="button"
            disabled={!canExportReports || isExporting}
            onClick={() => handleExport('json')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
          >
            <FileJson className="w-3.5 h-3.5" />
            <span>JSON</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner & Security Redaction Notice */}
      {feedbackBanner && (
        <div
          className={`px-4 py-2.5 rounded-lg border text-xs flex items-center justify-between gap-3 ${
            feedbackBanner.kind === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200'
          }`}
        >
          <span className="font-medium">{feedbackBanner.text}</span>
          <button
            type="button"
            onClick={() => setFeedbackBanner(null)}
            className="text-xs underline opacity-80 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {report && report.redactedRestrictedCount > 0 && (
        <div className="px-4 py-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
          <Lock className="w-4 h-4 shrink-0 text-amber-700 dark:text-amber-400" />
          <span>
            Clearance enforcement active: <strong className="font-mono tabular-nums">{report.redactedRestrictedCount}</strong> Confidential/Secret record(s) outside your authorization scope are excluded from metrics and exports.
          </span>
        </div>
      )}

      {/* Interactive Filter & Preset Toolbar */}
      <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <Filter className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span>{language === 'am' ? 'የሪፖርት ማጣሪያዎች' : 'Report Scope & Analytical Filters'}</span>
            {report && (
              <>
                <span aria-hidden="true" className="text-slate-300 dark:text-slate-600">·</span>
                <span className="font-normal text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                  {report.authorizedDocumentCount} records in scope
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsSavePresetOpen((v) => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-950/70 rounded-lg transition-colors"
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Save Preset</span>
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
            <button
              type="button"
              onClick={() => fetchAnalytics(filters)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5 text-xs">
          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">From Date</label>
            <input
              type="date"
              value={filters.dateFrom || ''}
              onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">To Date</label>
            <input
              type="date"
              value={filters.dateTo || ''}
              onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-mono text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">Cluster</label>
            <select
              value={filters.cluster || 'All'}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  cluster: e.target.value as BranchCluster | 'All',
                  branchId: 'All'
                }))
              }
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-xs"
            >
              <option value="All">All Clusters</option>
              <option value="Central">Central Cluster</option>
              <option value="Northern">Northern Cluster</option>
              <option value="Western">Western Cluster</option>
              <option value="SouthernEastern">Southern/Eastern Cluster</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">Branch / Hub</label>
            <select
              value={filters.branchId || 'All'}
              onChange={(e) => setFilters((f) => ({ ...f, branchId: e.target.value }))}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-xs"
            >
              <option value="All">All Hubs ({filteredBranchOptions.length})</option>
              {filteredBranchOptions.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nameEn}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">Directorate</label>
            <select
              value={filters.departmentId || 'All'}
              onChange={(e) => setFilters((f) => ({ ...f, departmentId: e.target.value }))}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-xs"
            >
              <option value="All">All Directorates</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.code} · {d.nameEn}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">Document Type</label>
            <select
              value={filters.type || 'All'}
              onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value as DocumentType | 'All' }))}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-xs"
            >
              <option value="All">All Types</option>
              <option value="IncomingLetter">Incoming Letter</option>
              <option value="OutgoingLetter">Outgoing Letter</option>
              <option value="InternalMemo">Internal Memo</option>
              <option value="Application">Application</option>
              <option value="TenderDocument">Tender Document</option>
              <option value="InspectionReport">Inspection Report</option>
              <option value="Circular">Circular</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">Confidentiality</label>
            <select
              value={filters.confidentiality || 'All'}
              onChange={(e) =>
                setFilters((f) => ({ ...f, confidentiality: e.target.value as ConfidentialityLevel | 'All' }))
              }
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-xs"
            >
              <option value="All">All Levels</option>
              <option value="Public">Public</option>
              <option value="Internal">Internal</option>
              <option value="Confidential">Confidential</option>
              <option value="Secret">Secret</option>
            </select>
          </div>
        </div>

        {/* Save Preset Inline Form */}
        {isSavePresetOpen && (
          <form
            onSubmit={handleSaveTemplate}
            className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-end gap-2.5 text-xs"
          >
            <div className="flex-1 space-y-1">
              <label className="block text-[11px] font-medium text-slate-500">Preset Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Northern Cluster Q4 SLA Audit"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>
            <div className="flex-1 space-y-1">
              <label className="block text-[11px] font-medium text-slate-500">Description (optional)</label>
              <input
                type="text"
                placeholder="Scope description"
                value={presetDesc}
                onChange={(e) => setPresetDesc(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="px-3.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-lg whitespace-nowrap shrink-0"
              >
                Save Preset
              </button>
              <button
                type="button"
                onClick={() => setIsSavePresetOpen(false)}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Saved Templates Strip */}
        {templates.length > 0 && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Saved Presets:</span>
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                className="inline-flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => handleApplyTemplate(tpl)}
                  title={tpl.description || tpl.name}
                  className="px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-200/70 dark:hover:bg-slate-700 transition-colors whitespace-nowrap"
                >
                  {tpl.name}
                </button>
                {(currentUser?.id === tpl.createdByUserId ||
                  ['SuperAdmin', 'DirectorGeneral', 'Auditor'].includes(currentUser?.role || '')) && (
                  <button
                    type="button"
                    aria-label={`Delete preset ${tpl.name}`}
                    onClick={() => handleDeleteTemplate(tpl.id)}
                    className="px-1.5 py-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 border-l border-slate-200 dark:border-slate-700"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Sub-Navigation Segmented Control */}
      <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl w-fit">
        {[
          { id: 'overview', label: 'Overview & SLA' },
          { id: 'branches', label: '19 Hubs & Clusters' },
          { id: 'directorates', label: 'Directorates & Bottlenecks' },
          {
            id: 'overdue',
            label: `Overdue Register (${report?.summary.overdueCount ?? 0})`
          },
          { id: 'governance', label: 'Retention, PKI & Exports' }
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSubTab(item.id as ReportSubTab)}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              subTab === item.id
                ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Loading / Error / Content */}
      {errorMsg ? (
        <div className="p-6 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-700 dark:text-rose-300">
          <p className="font-semibold">Failed to load management analytics</p>
          <p className="mt-1">{errorMsg}</p>
        </div>
      ) : isLoading && !report ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-28 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 animate-pulse"
            />
          ))}
        </div>
      ) : !report ? null : (
        <div className="space-y-6">
          {/* 4-Column Executive KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 block">Authorized Correspondence</span>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                  {report.summary.totalDocuments}
                </span>
                {report.summary.momVolumeDeltaPct !== null && (
                  <span
                    className={`font-mono tabular-nums text-[11px] font-semibold ${
                      report.summary.momVolumeDeltaPct >= 0 ? 'text-teal-700 dark:text-teal-400' : 'text-amber-600'
                    }`}
                  >
                    {report.summary.momVolumeDeltaPct >= 0 ? '+' : ''}
                    {report.summary.momVolumeDeltaPct}% 30d
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block font-mono tabular-nums">
                {report.summary.totalIncoming} IN · {report.summary.totalOutgoing} OUT · {report.summary.totalInternalMemos} MEMO
              </span>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 block">Average Turnaround</span>
              <span className="text-2xl font-bold font-mono tabular-nums text-teal-700 dark:text-teal-400 mt-1.5 block">
                {report.summary.averageProcessingDays} Days
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block">
                {report.summary.averageProcessingDays <= 3
                  ? 'Within 3.0-day institutional target'
                  : 'Exceeds 3.0-day institutional target'}
              </span>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 block">SLA Compliance Rate</span>
              <span
                className={`text-2xl font-bold font-mono tabular-nums mt-1.5 block ${
                  report.summary.slaComplianceRate >= 90
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : report.summary.slaComplianceRate >= 75
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {report.summary.slaComplianceRate}%
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block font-mono tabular-nums">
                {report.summary.overdueCount} overdue · {report.summary.pendingApprovals} active
              </span>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 block">PKI Digital Signing Rate</span>
              <span className="text-2xl font-bold font-mono tabular-nums text-sky-700 dark:text-sky-400 mt-1.5 block">
                {report.pkiCompliance.digitalSigningRate}%
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block font-mono tabular-nums">
                {report.pkiCompliance.digitallySignedApprovals}/{report.pkiCompliance.totalApprovalsLogged} approvals RSA-SHA256 signed
              </span>
            </div>
          </div>

          {/* SUBTAB 1: OVERVIEW & SLA */}
          {subTab === 'overview' && (
            <div className="space-y-6">
              {report.summary.totalDocuments === 0 ? (
                <div className="p-10 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 space-y-2">
                  <p className="font-semibold text-slate-700 dark:text-slate-200">
                    No authorized correspondence matches your active filter criteria.
                  </p>
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="px-3.5 py-1.5 bg-teal-700 text-white rounded-lg font-semibold"
                  >
                    Reset Analytical Filters
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Correspondence Mix Breakdown */}
                    <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                          Document Lifecycle Mix & Completion
                        </h2>
                        <span className="text-xs text-slate-500 font-mono tabular-nums">
                          {report.summary.completedCount} completed
                        </span>
                      </div>
                      <div className="space-y-3 text-xs">
                        {report.typeBreakdown.map((item) => (
                          <div key={item.type} className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-slate-800 dark:text-slate-200">{item.type}</span>
                              <span className="font-mono tabular-nums text-slate-600 dark:text-slate-400">
                                {item.count} ({item.sharePct}%) · {item.overdueCount} overdue
                              </span>
                            </div>
                            <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-teal-600 dark:bg-teal-500 rounded-full"
                                style={{ width: `${Math.max(4, item.sharePct)}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Monthly Throughput Trend */}
                    <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-teal-600" />
                          <span>Monthly Volume & Resolution Trend</span>
                        </h2>
                        <span className="text-xs text-slate-500 font-mono tabular-nums">
                          {report.monthlyTrend.length} period(s)
                        </span>
                      </div>
                      {report.monthlyTrend.length === 0 ? (
                        <p className="text-xs text-slate-400 py-8 text-center">No dated periods available.</p>
                      ) : (
                        <div className="space-y-3 text-xs">
                          {report.monthlyTrend.map((m) => {
                            const total = m.incoming + m.outgoing + m.memos;
                            const pct = Math.round((total / maxMonthlyCount) * 100);
                            return (
                              <div key={m.period} className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                                    {m.label}
                                  </span>
                                  <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                                    {m.incoming} IN · {m.outgoing} OUT · {m.memos} MEMO · {m.completed} closed
                                  </span>
                                </div>
                                <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                                  <div
                                    className="bg-teal-600 h-full"
                                    style={{ width: `${Math.max(3, (m.incoming / maxMonthlyCount) * 100)}%` }}
                                    title={`Incoming: ${m.incoming}`}
                                  />
                                  <div
                                    className="bg-sky-600 h-full"
                                    style={{ width: `${(m.outgoing / maxMonthlyCount) * 100}%` }}
                                    title={`Outgoing: ${m.outgoing}`}
                                  />
                                  <div
                                    className="bg-amber-500 h-full"
                                    style={{ width: `${(m.memos / maxMonthlyCount) * 100}%` }}
                                    title={`Internal Memos: ${m.memos}`}
                                  />
                                  {pct === 0 && <div className="w-1 bg-slate-300 h-full" />}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Cluster Rollup Summary */}
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                      <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        Strategic Operational Cluster Performance
                      </h2>
                      <span className="text-xs text-slate-500">4 EPSS Geographic Clusters</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                          <tr>
                            <th className="px-4 py-3 font-semibold">Cluster</th>
                            <th className="px-4 py-3 font-semibold text-right">Hubs</th>
                            <th className="px-4 py-3 font-semibold text-right">Documents</th>
                            <th className="px-4 py-3 font-semibold text-right">Overdue</th>
                            <th className="px-4 py-3 font-semibold text-right">SLA Compliance</th>
                            <th className="px-4 py-3 font-semibold text-right">Avg Turnaround</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {report.clusterSummary.map((c) => (
                            <tr key={c.cluster} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                              <td className="px-4 py-2.5 font-semibold text-slate-900 dark:text-slate-100">
                                {c.cluster} Cluster
                              </td>
                              <td className="px-4 py-2.5 text-right font-mono tabular-nums">{c.branchesCount}</td>
                              <td className="px-4 py-2.5 text-right font-mono tabular-nums">{c.totalDocuments}</td>
                              <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                                <span className={c.overdue > 0 ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-500'}>
                                  {c.overdue}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-right font-mono tabular-nums font-semibold">
                                {c.slaComplianceRate}%
                              </td>
                              <td className="px-4 py-2.5 text-right font-mono tabular-nums">{c.avgTurnaroundDays} days</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* SUBTAB 2: 19 HUBS & CLUSTERS */}
          {subTab === 'branches' && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Head Office & 19 Regional Hubs Turnaround Matrix
                  </h2>
                </div>
                <span className="text-xs font-mono tabular-nums text-slate-500">
                  {report.branchStats.length} hubs shown
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Hub Code</th>
                      <th className="px-4 py-3 font-semibold">Regional Hub Name</th>
                      <th className="px-4 py-3 font-semibold">Cluster</th>
                      <th className="px-4 py-3 font-semibold text-right">IN / OUT</th>
                      <th className="px-4 py-3 font-semibold text-right">Total</th>
                      <th className="px-4 py-3 font-semibold text-right">Overdue</th>
                      <th className="px-4 py-3 font-semibold text-right">SLA %</th>
                      <th className="px-4 py-3 font-semibold text-right">Avg Turnaround</th>
                      <th className="px-4 py-3 font-semibold text-right">Operational State</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {report.branchStats.map((b) => (
                      <tr key={b.branchId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-2.5 font-mono font-bold text-teal-700 dark:text-teal-400">
                          {b.branchCode}
                        </td>
                        <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-slate-100">
                          {language === 'am' ? b.branchNameAm : b.branchNameEn}
                        </td>
                        <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{b.cluster}</td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                          {b.incoming} / {b.outgoing}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums font-semibold">
                          {b.totalDocuments}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                          <span className={b.overdue > 0 ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-400'}>
                            {b.overdue}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums">{b.slaComplianceRate}%</td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums">{b.avgTurnaroundDays} d</td>
                        <td className="px-4 py-2.5 text-right font-semibold">
                          <span
                            className={
                              b.healthStatus === 'Critical'
                                ? 'text-rose-700 dark:text-rose-400'
                                : b.healthStatus === 'Attention'
                                ? 'text-amber-700 dark:text-amber-400'
                                : b.healthStatus === 'Nominal'
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : 'text-slate-400'
                            }
                          >
                            {b.healthStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SUBTAB 3: DIRECTORATES & WORKFLOW BOTTLENECKS */}
          {subTab === 'directorates' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Directorate Correspondence Workload & Turnaround
                  </h2>
                  <span className="text-xs text-slate-500 font-mono tabular-nums">
                    {report.directorateStats.length} directorates
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Code</th>
                        <th className="px-4 py-3 font-semibold">Directorate Name</th>
                        <th className="px-4 py-3 font-semibold text-right">Active Staff</th>
                        <th className="px-4 py-3 font-semibold text-right">Total Dossiers</th>
                        <th className="px-4 py-3 font-semibold text-right">Pending Review</th>
                        <th className="px-4 py-3 font-semibold text-right">Overdue</th>
                        <th className="px-4 py-3 font-semibold text-right">SLA %</th>
                        <th className="px-4 py-3 font-semibold text-right">Avg Turnaround</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {report.directorateStats.map((d) => (
                        <tr key={d.departmentId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-2.5 font-mono font-bold text-teal-700 dark:text-teal-400">
                            {d.code}
                          </td>
                          <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-slate-100">
                            {language === 'am' ? d.nameAm : d.nameEn}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono tabular-nums">{d.activeStaff}</td>
                          <td className="px-4 py-2.5 text-right font-mono tabular-nums font-semibold">
                            {d.totalDocuments}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono tabular-nums">{d.pendingReview}</td>
                          <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                            <span className={d.overdueCount > 0 ? 'text-rose-600 font-bold' : 'text-slate-400'}>
                              {d.overdueCount}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono tabular-nums">{d.slaComplianceRate}%</td>
                          <td className="px-4 py-2.5 text-right font-mono tabular-nums">{d.avgTurnaroundDays} d</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Active Workflow Stage Aging & Bottlenecks
                  </h2>
                  <span className="text-xs text-slate-500">Live stage dwell hours</span>
                </div>
                {report.workflowBottlenecks.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    No active workflow stage bottlenecks detected in the current scope.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Workflow Stage</th>
                          <th className="px-4 py-3 font-semibold text-right">Active Tasks</th>
                          <th className="px-4 py-3 font-semibold text-right">Overdue</th>
                          <th className="px-4 py-3 font-semibold text-right">Escalated</th>
                          <th className="px-4 py-3 font-semibold text-right">Avg Stage Age</th>
                          <th className="px-4 py-3 font-semibold text-right">Max Stage Age</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {report.workflowBottlenecks.map((wb) => (
                          <tr key={wb.stageName} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-slate-100">
                              {wb.stageName}
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono tabular-nums">{wb.activeInstances}</td>
                            <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                              <span className={wb.overdueInstances > 0 ? 'text-rose-600 font-bold' : 'text-slate-400'}>
                                {wb.overdueInstances}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono tabular-nums">{wb.escalatedInstances}</td>
                            <td className="px-4 py-2.5 text-right font-mono tabular-nums">{wb.avgAgeHours} hrs</td>
                            <td className="px-4 py-2.5 text-right font-mono tabular-nums">{wb.maxAgeHours} hrs</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SUBTAB 4: OVERDUE REGISTER */}
          {subTab === 'overdue' && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Overdue Correspondence SLA Register
                  </h2>
                </div>
                <span className="text-xs font-mono tabular-nums text-rose-700 dark:text-rose-400 font-semibold">
                  {report.overdueRegister.length} overdue item(s)
                </span>
              </div>
              {report.overdueRegister.length === 0 ? (
                <div className="p-10 text-center text-xs text-slate-500 space-y-2">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                  <p className="font-semibold text-slate-700 dark:text-slate-200">
                    Zero overdue correspondence items in this scope.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Registration #</th>
                        <th className="px-4 py-3 font-semibold">Subject</th>
                        <th className="px-4 py-3 font-semibold">Hub / Directorate</th>
                        <th className="px-4 py-3 font-semibold">Stage / Assignee</th>
                        <th className="px-4 py-3 font-semibold text-right">Due Date</th>
                        <th className="px-4 py-3 font-semibold text-right">Overdue</th>
                        <th className="px-4 py-3 font-semibold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {report.overdueRegister.map((o) => (
                        <tr key={o.documentId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-2.5 font-mono font-bold text-teal-700 dark:text-teal-400 whitespace-nowrap">
                            {o.registrationNumber}
                          </td>
                          <td className="px-4 py-2.5 max-w-xs truncate font-medium text-slate-900 dark:text-slate-100">
                            {language === 'am' ? o.subjectAm : o.subjectEn}
                          </td>
                          <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">
                            {o.branchNameEn} · {o.departmentNameEn}
                          </td>
                          <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">
                            {o.stageName || o.status}
                            {o.assignedUserName ? ` · ${o.assignedUserName}` : ''}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono tabular-nums whitespace-nowrap">
                            {formatEthiopianDate(o.dueDate, language)}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono tabular-nums font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap">
                            +{o.daysOverdue}d
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => handleInspectOverdue(o.documentId)}
                              className="px-2.5 py-1 text-[11px] font-semibold text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 rounded-md hover:bg-teal-50 dark:hover:bg-teal-950/40"
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* SUBTAB 5: RETENTION, PKI & EXPORT HISTORY */}
          {subTab === 'governance' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Records Retention & Physical Custody Forecast */}
                <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-3">
                    Records Retention & Custody Forecast
                  </h2>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-500">Archived Records</span>
                      <p className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                        {report.retentionForecast.totalArchived}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Active Legal Holds</span>
                      <p className="text-lg font-bold font-mono tabular-nums text-amber-700 dark:text-amber-400">
                        {report.retentionForecast.underLegalHold}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Retention Review (≤90d)</span>
                      <p className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                        {report.retentionForecast.dueForReviewWithin90Days}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Pending / Executed Disposals</span>
                      <p className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                        {report.retentionForecast.pendingDisposals} / {report.retentionForecast.executedDisposals}
                      </p>
                    </div>
                    <div className="col-span-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-slate-500">Overdue Checked-Out Physical Binders</span>
                      <span
                        className={`font-mono font-bold tabular-nums ${
                          report.retentionForecast.overduePhysicalFiles > 0 ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      >
                        {report.retentionForecast.overduePhysicalFiles}
                      </span>
                    </div>
                  </div>
                </div>

                {/* PKI Digital Signature Compliance */}
                <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-teal-600" />
                    <span>PKI Cryptographic Signing Compliance</span>
                  </h2>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-500">Digital Signing Rate</span>
                      <p className="text-lg font-bold font-mono tabular-nums text-teal-700 dark:text-teal-400">
                        {report.pkiCompliance.digitalSigningRate}%
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Signed / Logged Approvals</span>
                      <p className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                        {report.pkiCompliance.digitallySignedApprovals} / {report.pkiCompliance.totalApprovalsLogged}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Active / Revoked Certificates</span>
                      <p className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                        {report.pkiCompliance.activeCertificates} / {report.pkiCompliance.revokedCertificates}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-500">Integrity Alerts (Tampered)</span>
                      <p
                        className={`text-lg font-bold font-mono tabular-nums ${
                          report.pkiCompliance.tamperedOrInvalidDocuments > 0 ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      >
                        {report.pkiCompliance.tamperedOrInvalidDocuments}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Audited Export Ledger */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Management Report Export Audit Ledger
                  </h2>
                  <span className="text-xs font-mono tabular-nums text-slate-500">
                    {exportHistory.length} recorded exports
                  </span>
                </div>
                {exportHistory.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500">
                    No report downloads logged yet. Use Export Excel CSV, CSV, or JSON above to generate an audited export.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Timestamp</th>
                          <th className="px-4 py-3 font-semibold">Report & Format</th>
                          <th className="px-4 py-3 font-semibold">Exported By</th>
                          <th className="px-4 py-3 font-semibold text-right">Rows</th>
                          <th className="px-4 py-3 font-semibold text-right">Redacted</th>
                          <th className="px-4 py-3 font-semibold">SHA-256 Digest</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {exportHistory.slice(0, 25).map((exp) => (
                          <tr key={exp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="px-4 py-2.5 font-mono tabular-nums text-slate-500 whitespace-nowrap">
                              {formatEthiopianDate(exp.exportedAt, language)}
                            </td>
                            <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-slate-100">
                              {exp.reportType} · {exp.format.toUpperCase()}
                            </td>
                            <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">
                              {exp.exportedByName} ({exp.exportedByRole})
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono tabular-nums">{exp.recordCount}</td>
                            <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                              {exp.redactedRestrictedCount}
                            </td>
                            <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500">
                              {exp.sha256Checksum.slice(0, 18)}…
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
