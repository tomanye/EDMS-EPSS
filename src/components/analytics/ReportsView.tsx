import React from 'react';
import { BarChart3, Download, Printer, CheckCircle2, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import { formatEthiopianDate } from '../../lib/translations.js';

export const ReportsView: React.FC = () => {
  const { kpis, documents, language, t } = useApp();

  const handleExportFullRegister = () => {
    const headers = ['Registration Number', 'Reference Number', 'Type', 'Subject', 'Sender', 'Recipient', 'Date', 'Status', 'Branch'];
    const rows = documents.map(d => [
      `"${d.registrationNumber}"`,
      `"${d.referenceNumber}"`,
      `"${d.type}"`,
      `"${(d.subjectEn || '').replace(/"/g, '""')}"`,
      `"${d.senderOrganization}"`,
      `"${d.recipientOrganization}"`,
      `"${d.registrationDate}"`,
      `"${d.status}"`,
      `"${d.branchId}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `epss_official_correspondence_register_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t('navReports')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {language === 'am'
              ? 'የደብዳቤዎች እንቅስቃሴ ምዝገባ ሪፖርት፣ የቅርንጫፎች የማጠናቀቂያ ጊዜ እና የውሳኔዎች ትንተና'
              : 'Institutional reporting registers, SLA compliance metrics, and downloadable records.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
          <button
            onClick={handleExportFullRegister}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>Export Master Register (CSV)</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Summary Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-slate-500 block">Total Correspondence</span>
          <span className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 mt-1 block">
            {documents.length}
          </span>
          <span className="text-[11px] text-slate-400">All modules combined</span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-slate-500 block">Average Turnaround</span>
          <span className="text-2xl font-bold font-mono text-teal-700 dark:text-teal-400 mt-1 block">
            {kpis?.averageProcessingDays || 2.4} Days
          </span>
          <span className="text-[11px] text-emerald-600">Within 3-day target</span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-slate-500 block">Digital Signing Rate</span>
          <span className="text-2xl font-bold font-mono text-sky-600 mt-1 block">
            96.8%
          </span>
          <span className="text-[11px] text-slate-400">PKI Authenticated</span>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-slate-500 block">SLA Compliance Rate</span>
          <span className="text-2xl font-bold font-mono text-emerald-600 mt-1 block">
            94.2%
          </span>
          <span className="text-[11px] text-slate-400">Across 19 Hubs</span>
        </div>
      </div>

      {/* 19 Hubs Turnaround & Workload Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Regional Hub Correspondence Throughput & Turnaround Time
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3 font-semibold">Hub Code</th>
                <th className="px-4 py-3 font-semibold">Regional Branch Name</th>
                <th className="px-4 py-3 font-semibold text-right">Incoming Letters</th>
                <th className="px-4 py-3 font-semibold text-right">Outgoing Letters</th>
                <th className="px-4 py-3 font-semibold text-right">Overdue Tasks</th>
                <th className="px-4 py-3 font-semibold text-right">Average Resolution</th>
                <th className="px-4 py-3 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {(kpis?.branchStats || []).map((b) => (
                <tr key={b.branchId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-2.5 font-mono font-bold text-teal-700 dark:text-teal-400">
                    {b.branchId.toUpperCase()}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-slate-100">
                    {b.branchNameEn}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums">{b.incoming}</td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums">{b.outgoing}</td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                    <span className={b.overdue > 0 ? 'text-rose-600 font-bold' : 'text-slate-400'}>
                      {b.overdue}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums">{b.avgTurnaroundDays} days</td>
                  <td className="px-4 py-2.5 text-right">
                    <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded">
                      Nominal
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
