import React, { useState } from 'react';
import { Search, Filter, Download, ArrowUpRight, RotateCcw } from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import { formatEthiopianDate } from '../../lib/translations.js';

export const AdvancedSearchView: React.FC = () => {
  const { documents, branches, departments, setSelectedDocument, language, t } = useApp();

  const [query, setQuery] = useState('');
  const [docType, setDocType] = useState('all');
  const [branchId, setBranchId] = useState('all');
  const [deptId, setDeptId] = useState('all');
  const [priority, setPriority] = useState('all');
  const [confidentiality, setConfidentiality] = useState('all');
  const [status, setStatus] = useState('all');

  const filtered = documents.filter(d => {
    if (docType !== 'all' && d.type !== docType) return false;
    if (branchId !== 'all' && d.branchId !== branchId) return false;
    if (deptId !== 'all' && d.departmentId !== deptId) return false;
    if (priority !== 'all' && d.priority !== priority) return false;
    if (confidentiality !== 'all' && d.confidentiality !== confidentiality) return false;
    if (status !== 'all' && d.status !== status) return false;

    if (query.trim()) {
      const q = query.toLowerCase().trim();
      return (
        d.registrationNumber.toLowerCase().includes(q) ||
        d.referenceNumber.toLowerCase().includes(q) ||
        d.subjectEn.toLowerCase().includes(q) ||
        d.subjectAm.toLowerCase().includes(q) ||
        d.senderOrganization.toLowerCase().includes(q) ||
        d.recipientOrganization.toLowerCase().includes(q) ||
        d.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleExportCsv = () => {
    const headers = ['Registration Number', 'Reference Number', 'Type', 'Subject', 'Sender', 'Department', 'Date', 'Status'];
    const rows = filtered.map(d => [
      `"${d.registrationNumber}"`,
      `"${d.referenceNumber}"`,
      `"${d.type}"`,
      `"${(d.subjectEn || '').replace(/"/g, '""')}"`,
      `"${d.senderOrganization}"`,
      `"${d.assignedDepartmentName || ''}"`,
      `"${d.registrationDate}"`,
      `"${d.status}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
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
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t('navSearch')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {language === 'am'
              ? 'በመለያ ቁጥር፣ ርዕስ፣ ላኪ፣ ቅርንጫፍ እና ባለብዙ መስፈርቶች የተደገፈ የሰነድ ፍለጋ'
              : 'Multi-parameter indexing engine with bilingual Amharic/English search and CSV export.'}
          </p>
        </div>
        <button
          onClick={handleExportCsv}
          disabled={filtered.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 shadow-xs transition-colors self-start sm:self-auto disabled:opacity-50"
        >
          <Download className="w-4 h-4 text-teal-600" />
          <span>Export Results (CSV)</span>
        </button>
      </div>

      {/* Advanced Filter Grid */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
        <div>
          <label className="block text-slate-700 dark:text-slate-300 font-semibold text-xs mb-1">
            Universal Keyword Search (English / አማርኛ)
          </label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search across all fields, registration numbers, subjects, senders, or tags..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
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
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.nameEn}</option>
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
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.nameEn}</option>
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
        </div>

        <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
          <span className="text-slate-500">
            Matching documents found: <strong className="font-mono tabular-nums text-slate-900 dark:text-slate-100">{filtered.length}</strong>
          </span>
          <button
            onClick={handleReset}
            className="flex items-center gap-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Filters</span>
          </button>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="px-4 py-3 font-semibold">Reg #</th>
              <th className="px-4 py-3 font-semibold">Type</th>
              <th className="px-4 py-3 font-semibold">Subject</th>
              <th className="px-4 py-3 font-semibold">Sender / Recipient</th>
              <th className="px-4 py-3 font-semibold">Department</th>
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  No records match your search criteria.
                </td>
              </tr>
            ) : (
              filtered.map((doc) => (
                <tr
                  key={doc.id}
                  onClick={() => setSelectedDocument(doc)}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    {doc.registrationNumber}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-teal-700 dark:text-teal-400 font-semibold">
                    {doc.type}
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <div className="font-medium text-slate-900 dark:text-slate-100 line-clamp-1">
                      {language === 'am' ? doc.subjectAm : doc.subjectEn}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-700 dark:text-slate-300">
                    {doc.senderOrganization}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-400">
                    {doc.assignedDepartmentName || 'Registry'}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-500 whitespace-nowrap">
                    {formatEthiopianDate(doc.registrationDate, language)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap font-semibold text-slate-800 dark:text-slate-200">
                    {doc.status}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setSelectedDocument(doc)}
                      className="px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 transition-colors inline-flex items-center gap-1"
                    >
                      <span>{t('view')}</span>
                      <ArrowUpRight className="w-3 h-3 text-slate-400" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
