import React, { useCallback, useEffect, useState } from 'react';
import {
  Search,
  Download,
  ArrowUpRight,
  RotateCcw,
  SlidersHorizontal,
  BookmarkPlus,
  Bookmark,
  Trash2,
  ShieldAlert,
  FileText,
  ChevronDown,
  ChevronUp,
  Settings2,
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import { apiFetch } from '../../lib/apiFetch.js';
import { formatEthiopianDate } from '../../lib/translations.js';
import {
  AiSearchConfig,
  SavedSearch,
  SearchFilterParams,
  SearchResponse
} from '../../types/index.js';

function HighlightText({ text, query }: { text?: string; query: string }) {
  if (!text) return null;
  const rawTerms = query
    .trim()
    .split(/\s+/)
    .filter((w) => w.length >= 2)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

  if (rawTerms.length === 0) return <>{text}</>;

  const regex = new RegExp(`(${rawTerms.join('|')})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, idx) => {
        const isMatch = rawTerms.some((t) => new RegExp(`^${t}$`, 'i').test(part));
        return isMatch ? (
          <mark
            key={idx}
            className="bg-amber-200/80 dark:bg-amber-500/30 text-slate-900 dark:text-amber-100 px-0.5 rounded-xs font-semibold"
          >
            {part}
          </mark>
        ) : (
          <React.Fragment key={idx}>{part}</React.Fragment>
        );
      })}
    </>
  );
}

export const AdvancedSearchView: React.FC = () => {
  const { currentUser, branches, departments, setSelectedDocument, language, t } = useApp();

  const isAdminOrDirector =
    ['SuperAdmin', 'DirectorGeneral', 'Director'].includes(currentUser?.role || '') ||
    (currentUser?.permissions || []).includes('manage:organizations');

  // Search Filters
  const [query, setQuery] = useState('');
  const [docType, setDocType] = useState('all');
  const [branchId, setBranchId] = useState('all');
  const [deptId, setDeptId] = useState('all');
  const [priority, setPriority] = useState('all');
  const [confidentiality, setConfidentiality] = useState('all');
  const [status, setStatus] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [hasAttachmentsOnly, setHasAttachmentsOnly] = useState(false);
  const [legalHoldOnly, setLegalHoldOnly] = useState(false);
  const [showExpandedFilters, setShowExpandedFilters] = useState(true);

  // Server Search State
  const [searchResponse, setSearchResponse] = useState<SearchResponse>({
    query: '',
    total: 0,
    authorizedCount: 0,
    filteredRestrictedCount: 0,
    results: []
  });
  const [isSearching, setIsSearching] = useState(false);

  // Saved Searches
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveNotify, setSaveNotify] = useState(false);

  // Threshold / AI Config (Admin)
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [aiConfig, setAiConfig] = useState<AiSearchConfig>({
    ocrConfidenceThreshold: 0.75,
    duplicateSimilarityThreshold: 0.72,
    enableGeminiExtraction: true
  });
  const [thresholdInput, setThresholdInput] = useState('0.75');
  const [dupThresholdInput, setDupThresholdInput] = useState('0.72');
  const [geminiEnabledInput, setGeminiEnabledInput] = useState(true);

  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const notify = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast((curr) => (curr?.message === message ? null : curr));
    }, 4500);
  }, []);

  const currentFilters = useCallback(
    (): SearchFilterParams => ({
      query,
      type: docType,
      branchId,
      departmentId: deptId,
      status,
      priority,
      confidentiality,
      dateFrom,
      dateTo,
      hasAttachmentsOnly,
      legalHoldOnly
    }),
    [
      query,
      docType,
      branchId,
      deptId,
      status,
      priority,
      confidentiality,
      dateFrom,
      dateTo,
      hasAttachmentsOnly,
      legalHoldOnly
    ]
  );

  const executeSearch = useCallback(
    async (overrideFilters?: SearchFilterParams, audit = false) => {
      try {
        setIsSearching(true);
        const res = await apiFetch('/api/v1/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filters: overrideFilters || currentFilters(),
            audit
          })
        });
        if (res.ok) {
          const data: SearchResponse = await res.json();
          setSearchResponse(data);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    },
    [currentFilters]
  );

  const loadMeta = useCallback(async () => {
    try {
      const [savedRes, cfgRes] = await Promise.all([
        apiFetch('/api/v1/search/saved'),
        apiFetch('/api/v1/ai/config')
      ]);
      if (savedRes.ok) {
        const list = await savedRes.json();
        setSavedSearches(Array.isArray(list) ? list : []);
      }
      if (cfgRes.ok) {
        const cfg: AiSearchConfig = await cfgRes.json();
        setAiConfig(cfg);
        setThresholdInput(String(cfg.ocrConfidenceThreshold));
        setDupThresholdInput(String(cfg.duplicateSimilarityThreshold));
        setGeminiEnabledInput(cfg.enableGeminiExtraction);
      }
    } catch (err) {
      console.error('Failed loading search metadata:', err);
    }
  }, []);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  useEffect(() => {
    const timer = setTimeout(() => {
      executeSearch(undefined, false);
    }, 180);
    return () => clearTimeout(timer);
  }, [executeSearch]);

  const handleSaveSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/v1/search/saved', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: saveName,
          filters: currentFilters(),
          notifyOnNewMatch: saveNotify
        })
      });
      const data = await res.json();
      if (!res.ok) {
        notify('error', data.error || 'Could not save search.');
        return;
      }
      setSavedSearches((prev) => [data, ...prev]);
      setIsSaveModalOpen(false);
      setSaveName('');
      setSaveNotify(false);
      notify('success', `Saved search "${data.name}".`);
    } catch {
      notify('error', 'Network error while saving search.');
    }
  };

  const handleApplySavedSearch = (saved: SavedSearch) => {
    const f = saved.filters || {};
    setQuery(f.query || '');
    setDocType(f.type || 'all');
    setBranchId(f.branchId || 'all');
    setDeptId(f.departmentId || 'all');
    setStatus(f.status || 'all');
    setPriority(f.priority || 'all');
    setConfidentiality(f.confidentiality || 'all');
    setDateFrom(f.dateFrom || '');
    setDateTo(f.dateTo || '');
    setHasAttachmentsOnly(Boolean(f.hasAttachmentsOnly));
    setLegalHoldOnly(Boolean(f.legalHoldOnly));
    executeSearch(f, true);
  };

  const handleDeleteSavedSearch = async (id: string) => {
    try {
      const res = await apiFetch(`/api/v1/search/saved/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSavedSearches((prev) => prev.filter((s) => s.id !== id));
        notify('success', 'Saved search deleted.');
      }
    } catch {
      notify('error', 'Failed to delete saved search.');
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/v1/ai/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ocrConfidenceThreshold: Number(thresholdInput),
          duplicateSimilarityThreshold: Number(dupThresholdInput),
          enableGeminiExtraction: geminiEnabledInput
        })
      });
      const data = await res.json();
      if (!res.ok) {
        notify('error', data.error || 'Failed to update threshold settings.');
        return;
      }
      setAiConfig(data);
      setShowConfigPanel(false);
      notify('success', 'Updated OCR confidence & duplicate similarity thresholds.');
    } catch {
      notify('error', 'Network error saving OCR settings.');
    }
  };

  const handleExportCsv = () => {
    const headers = [
      'Registration Number',
      'Reference Number',
      'Type',
      'Subject (EN)',
      'Subject (AM)',
      'Sender',
      'Department',
      'Confidentiality',
      'Date',
      'Status'
    ];
    const rows = searchResponse.results.map(({ document: d }) => [
      `"${d.registrationNumber}"`,
      `"${d.referenceNumber}"`,
      `"${d.type}"`,
      `"${(d.subjectEn || '').replace(/"/g, '""')}"`,
      `"${(d.subjectAm || '').replace(/"/g, '""')}"`,
      `"${(d.senderOrganization || '').replace(/"/g, '""')}"`,
      `"${(d.assignedDepartmentName || '').replace(/"/g, '""')}"`,
      `"${d.confidentiality}"`,
      `"${d.registrationDate}"`,
      `"${d.status}"`
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `epss_edrms_search_results_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    setQuery('');
    setDocType('all');
    setBranchId('all');
    setDeptId('all');
    setPriority('all');
    setConfidentiality('all');
    setStatus('all');
    setDateFrom('');
    setDateTo('');
    setHasAttachmentsOnly(false);
    setLegalHoldOnly(false);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t('navSearch')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {language === 'am'
              ? 'በአማርኛ እና በእንግሊዝኛ ሙሉ ጽሑፍ (OCR) ፍለጋ፣ የተቀመጡ ፍለጋዎች እና የፈቃድ ደረጃ ጥበቃ'
              : 'Authorization-enforced full-text English & Amharic Fidele search across OCR text, subjects, and metadata.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {isAdminOrDirector && (
            <button
              type="button"
              onClick={() => setShowConfigPanel((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              <Settings2 className="w-3.5 h-3.5 text-slate-500" />
              <span>OCR Thresholds ({Math.round(aiConfig.ocrConfidenceThreshold * 100)}%)</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsSaveModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-lg hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-colors whitespace-nowrap shrink-0"
          >
            <BookmarkPlus className="w-3.5 h-3.5" />
            <span>Save This Search</span>
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={searchResponse.results.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-teal-600" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Inline Toast */}
      {toast && (
        <div
          className={`px-4 py-2.5 rounded-lg text-xs font-medium border flex items-center justify-between ${
            toast.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200'
          }`}
        >
          <span>{toast.message}</span>
          <button type="button" onClick={() => setToast(null)} className="opacity-70 hover:opacity-100">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Admin OCR & Duplicate Threshold Panel */}
      {showConfigPanel && isAdminOrDirector && (
        <form
          onSubmit={handleSaveConfig}
          className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 text-xs"
        >
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              OCR Confidence & Duplicate Detection Thresholds
            </span>
            <button type="button" onClick={() => setShowConfigPanel(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">
                OCR Low-Confidence Flag Threshold (0.10 – 0.99)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.10"
                max="0.99"
                value={thresholdInput}
                onChange={(e) => setThresholdInput(e.target.value)}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono tabular-nums"
              />
            </div>
            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">
                Duplicate Subject Similarity Threshold (0.40 – 1.00)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.40"
                max="1.00"
                value={dupThresholdInput}
                onChange={(e) => setDupThresholdInput(e.target.value)}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono tabular-nums"
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={geminiEnabledInput}
                  onChange={(e) => setGeminiEnabledInput(e.target.checked)}
                  className="rounded border-slate-300 text-teal-600"
                />
                <span>Enable Gemini OCR</span>
              </label>
              <button
                type="submit"
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-semibold whitespace-nowrap"
              >
                Save Settings
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Saved Searches Strip */}
      {savedSearches.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 text-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Bookmark className="w-3.5 h-3.5 text-teal-600" />
              <span>Saved Searches</span>
            </span>
            <span className="text-[11px] text-slate-400 font-mono tabular-nums">
              {savedSearches.length} saved
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {savedSearches.map((saved) => (
              <div
                key={saved.id}
                className="inline-flex items-center bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => handleApplySavedSearch(saved)}
                  className="px-3 py-1.5 text-slate-800 dark:text-slate-200 hover:bg-teal-50 dark:hover:bg-teal-950/40 font-medium transition-colors text-left"
                >
                  {saved.name}
                  {saved.lastResultCount !== undefined && (
                    <span className="ml-1.5 text-[11px] font-mono tabular-nums text-slate-400">
                      ({saved.lastResultCount})
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteSavedSearch(saved.id)}
                  title="Delete saved search"
                  className="px-2 py-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-l border-slate-200 dark:border-slate-700 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search Bar & Expandable Filter Matrix */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search keywords, Amharic text (አማርኛ e.g. ጨረታ / ኮሌራ / EFDA), OCR body, reference numbers, or senders..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') executeSearch(undefined, true);
              }}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
          <button
            type="button"
            onClick={() => executeSearch(undefined, true)}
            className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
          >
            Search Records
          </button>
          <button
            type="button"
            onClick={() => setShowExpandedFilters((prev) => !prev)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters</span>
            {showExpandedFilters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {showExpandedFilters && (
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              <div>
                <label className="block text-slate-500 text-[11px] mb-1">Document Type</label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                >
                  <option value="all">All Types</option>
                  <option value="IncomingLetter">Incoming</option>
                  <option value="OutgoingLetter">Outgoing</option>
                  <option value="InternalMemo">Internal Memo</option>
                  <option value="Application">Application</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 text-[11px] mb-1">Branch Hub</label>
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                >
                  <option value="all">All 19 Hubs</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.nameEn}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-500 text-[11px] mb-1">Directorate</label>
                <select
                  value={deptId}
                  onChange={(e) => setDeptId(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                >
                  <option value="all">All Directorates</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nameEn}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-500 text-[11px] mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                >
                  <option value="all">All Statuses</option>
                  <option value="Received">Received</option>
                  <option value="UnderReview">Under Review</option>
                  <option value="InProgress">In Progress</option>
                  <option value="AwaitingApproval">Awaiting Approval</option>
                  <option value="Approved">Approved</option>
                  <option value="Dispatched">Dispatched</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 text-[11px] mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                >
                  <option value="all">All Priorities</option>
                  <option value="Normal">Normal</option>
                  <option value="Urgent">Urgent</option>
                  <option value="VeryUrgent">Very Urgent</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 text-[11px] mb-1">Confidentiality</label>
                <select
                  value={confidentiality}
                  onChange={(e) => setConfidentiality(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                >
                  <option value="all">All Classifications</option>
                  <option value="Public">Public</option>
                  <option value="Internal">Internal</option>
                  <option value="Confidential">Confidential</option>
                  <option value="Secret">Secret</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 text-[11px] mb-1">From Date</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-500 text-[11px] mb-1">To Date</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 font-mono"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-5 pt-1">
              <label className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasAttachmentsOnly}
                  onChange={(e) => setHasAttachmentsOnly(e.target.checked)}
                  className="rounded border-slate-300 text-teal-600"
                />
                <span>Has Scanned Attachments Only</span>
              </label>
              <label className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={legalHoldOnly}
                  onChange={(e) => setLegalHoldOnly(e.target.checked)}
                  className="rounded border-slate-300 text-teal-600"
                />
                <span>Under Legal Hold Only</span>
              </label>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-3 text-slate-500">
            <span>
              {isSearching ? 'Searching repository...' : 'Authorized matches:'}{' '}
              <strong className="font-mono tabular-nums text-slate-900 dark:text-slate-100">
                {searchResponse.total}
              </strong>
            </span>
            {searchResponse.filteredRestrictedCount > 0 && (
              <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300 font-medium">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span className="tabular-nums">
                  {searchResponse.filteredRestrictedCount} restricted document(s) hidden by clearance / MFA policy
                </span>
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Filters</span>
          </button>
        </div>
      </div>

      {/* Results List with Highlighted Bilingual Snippets */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
        {searchResponse.results.length === 0 ? (
          <div className="py-14 px-6 text-center space-y-2">
            <FileText className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No authorized records match your search criteria
            </p>
            <p className="text-xs text-slate-500">
              Try broader English or Amharic keywords, clear date filters, or verify MFA step-up for confidential files.
            </p>
          </div>
        ) : (
          searchResponse.results.map(({ document: doc, matchedFields, snippetEn, snippetAm }) => (
            <div
              key={doc.id}
              onClick={() => setSelectedDocument(doc)}
              className="p-4 sm:px-5 hover:bg-slate-50/90 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1.5 min-w-0 flex-1">
                  {/* Quiet Metadata Row (zero pill boxes per design rule) */}
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                      <HighlightText text={doc.registrationNumber} query={query} />
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono">
                      <HighlightText text={doc.referenceNumber} query={query} />
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-semibold text-teal-700 dark:text-teal-400">{doc.type}</span>
                    <span aria-hidden="true">·</span>
                    <span>{doc.status}</span>
                    <span aria-hidden="true">·</span>
                    <span
                      className={
                        doc.confidentiality === 'Secret' || doc.confidentiality === 'Confidential'
                          ? 'text-amber-700 dark:text-amber-400 font-semibold'
                          : ''
                      }
                    >
                      {doc.confidentiality}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">
                      {formatEthiopianDate(doc.registrationDate, language)}
                    </span>
                  </div>

                  {/* Bilingual Subjects */}
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                    <HighlightText text={doc.subjectEn} query={query} />
                  </h3>
                  {doc.subjectAm && doc.subjectAm !== doc.subjectEn && (
                    <div className="text-xs text-slate-600 dark:text-slate-300">
                      <HighlightText text={doc.subjectAm} query={query} />
                    </div>
                  )}

                  {/* Snippets */}
                  {(snippetEn || snippetAm) && (
                    <div className="text-xs text-slate-600 dark:text-slate-400 space-y-0.5 pt-0.5 leading-relaxed">
                      {snippetEn && (
                        <p className="line-clamp-2">
                          <HighlightText text={snippetEn} query={query} />
                        </p>
                      )}
                      {snippetAm && snippetAm !== doc.subjectAm && (
                        <p className="line-clamp-1 text-slate-500 dark:text-slate-400">
                          <HighlightText text={snippetAm} query={query} />
                        </p>
                      )}
                    </div>
                  )}

                  {/* Parties & Matched Fields */}
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 pt-1">
                    <span>
                      From <strong className="font-medium text-slate-700 dark:text-slate-300">{doc.senderOrganization}</strong>
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      Directorate:{' '}
                      <strong className="font-medium text-slate-700 dark:text-slate-300">
                        {doc.assignedDepartmentName || 'Central Registry'}
                      </strong>
                    </span>
                    {matchedFields.length > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-teal-700 dark:text-teal-400">
                          Matched: {matchedFields.join(', ')}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => setSelectedDocument(doc)}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors inline-flex items-center gap-1 whitespace-nowrap"
                  >
                    <span>{t('view')}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Save Search Modal */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveSearch}
            className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-5 space-y-4 text-xs shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Save Current Search Query
              </h3>
              <button
                type="button"
                onClick={() => setIsSaveModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-semibold mb-1">
                Search Name *
              </label>
              <input
                type="text"
                required
                minLength={2}
                placeholder="e.g. EFDA Pending Cold-Chain Letters"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>
            <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={saveNotify}
                onChange={(e) => setSaveNotify(e.target.checked)}
                className="rounded border-slate-300 text-teal-600"
              />
              <span>Notify me when new correspondence matches this filter</span>
            </label>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsSaveModalOpen(false)}
                className="px-3.5 py-2 text-slate-600 dark:text-slate-400 font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-semibold"
              >
                Save Search
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
