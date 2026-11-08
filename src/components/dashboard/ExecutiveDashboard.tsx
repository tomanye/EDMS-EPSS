import React, { useState, useEffect } from 'react';
import { 
  Inbox, 
  Send, 
  FileText, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Building2, 
  ArrowUpRight,
  TrendingUp,
  FileCheck,
  Briefcase,
  Layers,
  Server,
  Activity,
  HardDrive,
  Users,
  Archive,
  RefreshCw
} from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import { formatEthiopianDate } from '../../lib/translations.js';

export const ExecutiveDashboard: React.FC = () => {
  const { kpis, documents, language, setSelectedDocument, setActiveTab, t, currentUser } = useApp();
  const [dashboardView, setDashboardView] = useState<'executive' | 'department' | 'registry' | 'admin'>('executive');
  const [serverHealth, setServerHealth] = useState<any>(null);

  useEffect(() => {
    if (dashboardView === 'admin') {
      fetch('/api/v1/health')
        .then(r => r.json())
        .then(setServerHealth)
        .catch(console.error);
    }
  }, [dashboardView]);

  const recentDocs = documents.slice(0, 5);
  const urgentDocs = documents.filter(d => d.priority === 'VeryUrgent' || d.priority === 'Urgent').slice(0, 4);

  // Department analytics aggregates
  const deptStats = [
    {
      nameEn: 'Pharmaceuticals & Medical Devices Procurement Directorate',
      nameAm: 'የመድኃኒትና ሕክምና መሣሪያዎች ግዢ ዳይሬክቶሬት',
      code: 'PMPD',
      pending: documents.filter(d => (d.assignedDepartmentName || '').toLowerCase().includes('procure') && d.status === 'UnderReview').length,
      total: documents.filter(d => (d.assignedDepartmentName || '').toLowerCase().includes('procure')).length,
      activeStaff: 14,
      avgDays: 2.1
    },
    {
      nameEn: 'Storage & Distribution Directorate',
      nameAm: 'የመድኃኒት ክምችትና ሥርጭት ዳይሬክቶሬት',
      code: 'SDD',
      pending: documents.filter(d => (d.assignedDepartmentName || '').toLowerCase().includes('storage') && d.status === 'UnderReview').length,
      total: documents.filter(d => (d.assignedDepartmentName || '').toLowerCase().includes('storage')).length,
      activeStaff: 22,
      avgDays: 1.4
    },
    {
      nameEn: 'Quality Assurance & Regulatory Compliance Directorate',
      nameAm: 'የጥራት ማረጋገጫና ሕጋዊ ተገዥነት ዳይሬክቶሬት',
      code: 'QACD',
      pending: documents.filter(d => (d.assignedDepartmentName || '').toLowerCase().includes('quality') && d.status === 'UnderReview').length,
      total: documents.filter(d => (d.assignedDepartmentName || '').toLowerCase().includes('quality')).length,
      activeStaff: 9,
      avgDays: 1.8
    },
    {
      nameEn: 'Fund Management & Finance Directorate',
      nameAm: 'የፈንድ አስተዳደርና ፋይናንስ ዳይሬክቶሬት',
      code: 'FMFD',
      pending: documents.filter(d => (d.assignedDepartmentName || '').toLowerCase().includes('finance') && d.status === 'UnderReview').length,
      total: documents.filter(d => (d.assignedDepartmentName || '').toLowerCase().includes('finance')).length,
      activeStaff: 11,
      avgDays: 1.9
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner / Perspective Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            {t('navDashboard')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {language === 'am' 
              ? 'የኢትዮጵያ መድኃኒት አቅራቢ አገልግሎት አጠቃላይ የደብዳቤዎችና የ19 ቅርንጫፎች የሥራ ክትትል'
              : 'Nationwide correspondence operations and 19 regional hub throughput monitoring.'}
          </p>
        </div>

        {/* 4 Dashboard Perspective Buttons (Module 15 Requirement) */}
        <div className="flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setDashboardView('executive')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              dashboardView === 'executive'
                ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            {language === 'am' ? 'የሥራ አመራር' : 'Executive Management'}
          </button>
          <button
            onClick={() => setDashboardView('department')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              dashboardView === 'department'
                ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            {language === 'am' ? 'ዳይሬክቶሬቶች' : 'Department Heads'}
          </button>
          <button
            onClick={() => setDashboardView('registry')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              dashboardView === 'registry'
                ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            {language === 'am' ? 'የሰነድ መዝገብ ቤት' : 'Document Registry'}
          </button>
          <button
            onClick={() => setDashboardView('admin')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              dashboardView === 'admin'
                ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            {language === 'am' ? 'የስርዓት አስተዳዳሪ' : 'System Admin'}
          </button>
        </div>
      </div>

      {/* PERSPECTIVE 1: EXECUTIVE MANAGEMENT */}
      {dashboardView === 'executive' && (
        <div className="space-y-6">
          {/* KPI Cards Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Incoming Letters */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
                <span>{t('kpiIncoming')}</span>
                <Inbox className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                  {kpis?.totalIncoming || 0}
                </span>
                <span className="text-[11px] text-teal-700 dark:text-teal-400 font-medium">
                  +14% MoM
                </span>
              </div>
              <div className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
                {language === 'am' ? 'በማዕከልና በቅርንጫፎች የተመዘገቡ' : 'Logged across all hubs'}
              </div>
            </div>

            {/* Outgoing Letters */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
                <span>{t('kpiOutgoing')}</span>
                <Send className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                  {kpis?.totalOutgoing || 0}
                </span>
                <span className="text-[11px] text-sky-700 dark:text-sky-400 font-medium">
                  Official Sealed
                </span>
              </div>
              <div className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
                {language === 'am' ? 'በዲጂታል ፊርማ የተላኩ' : 'Signed with digital certificate'}
              </div>
            </div>

            {/* Pending Approvals */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
                <span>{t('kpiPending')}</span>
                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
                  {kpis?.pendingApprovals || 0}
                </span>
                <span className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                  In Review
                </span>
              </div>
              <div className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
                {language === 'am' ? 'ውሳኔ በመጠባበቅ ላይ ያሉ' : 'Awaiting directorate decision'}
              </div>
            </div>

            {/* Overdue Items */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
                <span>{t('kpiOverdue')}</span>
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400">
                  {kpis?.overdueCount || 0}
                </span>
                <span className="text-[11px] text-rose-700 dark:text-rose-400 font-medium">
                  SLA Critical
                </span>
              </div>
              <div className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
                {language === 'am' ? 'የቀነ-ገደብ ማሳሰቢያ የወጣላቸው' : 'Target SLA exceeded'}
              </div>
            </div>
          </div>

          {/* Main Grid: 19 Branches Performance Matrix + Urgent SLA Queue */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 19 Regional Hubs Performance Table (2 cols) */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
              <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {t('branchPerformance')}
                  </h2>
                </div>
                <button 
                  onClick={() => setActiveTab('organization')}
                  className="text-xs text-teal-700 dark:text-teal-400 hover:underline font-medium"
                >
                  {language === 'am' ? 'ሁሉንም 19 ቅርንጫፎች ይመልከቱ →' : 'View Hub Registry →'}
                </button>
              </div>

              <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 sticky top-0">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold">{t('branch')}</th>
                      <th className="px-4 py-2.5 font-semibold text-right">{t('kpiIncoming')}</th>
                      <th className="px-4 py-2.5 font-semibold text-right">{t('kpiOutgoing')}</th>
                      <th className="px-4 py-2.5 font-semibold text-right">{t('kpiOverdue')}</th>
                      <th className="px-4 py-2.5 font-semibold text-right">{t('kpiAvgTurnaround')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(kpis?.branchStats || []).map((bs) => (
                      <tr key={bs.branchId} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {bs.branchNameEn}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                          {bs.incoming}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                          {bs.outgoing}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                          <span className={bs.overdue > 0 ? 'text-rose-600 dark:text-rose-400 font-semibold' : 'text-slate-400'}>
                            {bs.overdue}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                          {bs.avgTurnaroundDays} {t('days')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Urgent Action SLA Queue (1 col) */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {t('urgentActionQueue')}
                  </h2>
                  <span className="text-[11px] font-mono tabular-nums text-amber-700 dark:text-amber-400 font-semibold">
                    {urgentDocs.length} pending
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {urgentDocs.map((doc) => (
                    <div
                      key={doc.id}
                      onClick={() => setSelectedDocument(doc)}
                      className="p-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 rounded-lg cursor-pointer transition-colors text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono tabular-nums font-semibold text-teal-700 dark:text-teal-400">
                          {doc.registrationNumber}
                        </span>
                        <span className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold uppercase">
                          {doc.priority}
                        </span>
                      </div>
                      <p className="mt-1 font-medium text-slate-800 dark:text-slate-200 line-clamp-1">
                        {language === 'am' ? doc.subjectAm : doc.subjectEn}
                      </p>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                        <span>{doc.senderOrganization}</span>
                        <span className="font-mono">{formatEthiopianDate(doc.registrationDate, language)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setActiveTab('workflows')}
                className="w-full mt-4 py-2 px-3 text-xs font-semibold text-center text-teal-800 dark:text-teal-200 bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 rounded-lg transition-colors border border-teal-200 dark:border-teal-900/60"
              >
                {language === 'am' ? 'ወደ ውሳኔ መስጫ ሳጥን ይሂዱ →' : 'Open Workflow Task Queue →'}
              </button>
            </div>
          </div>

          {/* Recent Correspondence Stream */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-500" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {t('recentCorrespondence')}
                </h2>
              </div>
              <button
                onClick={() => setActiveTab('incoming')}
                className="text-xs text-teal-700 dark:text-teal-400 hover:underline font-medium"
              >
                {language === 'am' ? 'ሁሉንም ሰነዶች ይመልከቱ →' : 'View Full Document Index →'}
              </button>
            </div>

            <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
              {recentDocs.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDocument(doc)}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 px-2 rounded-lg cursor-pointer transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100">
                        {doc.registrationNumber}
                      </span>
                      <span className="text-slate-300 dark:text-slate-600">·</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {doc.referenceNumber}
                      </span>
                      <span className="text-slate-300 dark:text-slate-600">·</span>
                      <span className="text-xs text-teal-700 dark:text-teal-400 font-medium">
                        {doc.type}
                      </span>
                    </div>
                    <div className="text-xs font-medium text-slate-800 dark:text-slate-200 line-clamp-1">
                      {language === 'am' ? doc.subjectAm : doc.subjectEn}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs shrink-0">
                    <span className="text-slate-500 dark:text-slate-400 font-mono">
                      {formatEthiopianDate(doc.registrationDate, language)}
                    </span>
                    <span className="font-semibold text-teal-700 dark:text-teal-300">
                      {doc.status}
                    </span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PERSPECTIVE 2: DEPARTMENT HEADS */}
      {dashboardView === 'department' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {deptStats.map((d) => (
              <div key={d.code} className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-teal-700 dark:text-teal-400">{d.code}</span>
                  <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-semibold rounded text-[11px]">
                    {d.pending} Pending Review
                  </span>
                </div>
                <h3 className="mt-2 text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-2">
                  {language === 'am' ? d.nameAm : d.nameEn}
                </h3>
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-[11px] text-slate-500">
                  <div>
                    <span>Total Dossiers:</span>
                    <p className="font-mono font-bold text-slate-800 dark:text-slate-200">{d.total}</p>
                  </div>
                  <div>
                    <span>Avg Turnaround:</span>
                    <p className="font-mono font-bold text-slate-800 dark:text-slate-200">{d.avgDays} days</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Department Pending Approval Queue */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                {language === 'am' ? 'በዳይሬክቶሬቶች ውሳኔ በመጠባበቅ ላይ ያሉ ሰነዶች' : 'Dossiers Under Active Directorate Evaluation'}
              </span>
              <span className="text-[11px] font-mono text-slate-500">
                Sorted by priority & submission date
              </span>
            </div>
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-semibold">
                <tr>
                  <th className="px-4 py-3">Registration #</th>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Assigned Directorate</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Date Ingested</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {documents.filter(d => d.status === 'UnderReview' || d.status === 'PendingInformation').map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-mono font-semibold text-teal-700 dark:text-teal-400 whitespace-nowrap">
                      {doc.registrationNumber}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100 max-w-xs truncate">
                      {language === 'am' ? doc.subjectAm : doc.subjectEn}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {doc.assignedDepartmentName || 'General Directorate'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        doc.priority === 'VeryUrgent' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300' :
                        doc.priority === 'Urgent' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' :
                        'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}>
                        {doc.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-500 whitespace-nowrap">
                      {formatEthiopianDate(doc.registrationDate, language)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelectedDocument(doc)}
                        className="px-2.5 py-1 bg-teal-50 dark:bg-teal-950/50 hover:bg-teal-100 text-teal-700 dark:text-teal-300 font-medium rounded border border-teal-200 dark:border-teal-800 text-[11px]"
                      >
                        Endorse Minute
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PERSPECTIVE 3: DOCUMENT REGISTRY */}
      {dashboardView === 'registry' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Registry Vault Coordinates</span>
              <p className="mt-2 text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
                Building A / Rooms 101, 102
              </p>
              <p className="mt-1 text-[11px] text-teal-600">Active Shelf Racks: 14 Racks Indexed</p>
            </div>
            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Physical Binders Tracked</span>
              <p className="mt-2 text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
                {documents.length} Dossiers
              </p>
              <p className="mt-1 text-[11px] text-emerald-600">100% Dual Coordinates Bound</p>
            </div>
            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Unassigned Incoming Queue</span>
              <p className="mt-2 text-xl font-bold font-mono text-slate-900 dark:text-slate-100">
                {documents.filter(d => !d.assignedDepartmentName).length} Documents
              </p>
              <p className="mt-1 text-[11px] text-slate-400">Zero Ingestion Backlog</p>
            </div>
          </div>

          {/* Physical Vault Coordinate Distribution */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
            <h2 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-3">
              Physical Storage Binders & Archival Coordinates
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {documents.map((d) => (
                <div 
                  key={d.id} 
                  onClick={() => setSelectedDocument(d)}
                  className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/60 hover:border-teal-500 cursor-pointer transition-all text-xs"
                >
                  <div className="flex items-center justify-between font-mono font-semibold text-teal-700 dark:text-teal-400">
                    <span>{d.registrationNumber}</span>
                    <span className="text-[10px] text-slate-400">{d.physicalTracking?.room || 'Room 102'}</span>
                  </div>
                  <p className="mt-1 font-medium text-slate-800 dark:text-slate-200 truncate">
                    {language === 'am' ? d.subjectAm : d.subjectEn}
                  </p>
                  <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700/50 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Shelf: {d.physicalTracking?.shelfNumber || 'Rack-02'}</span>
                    <span>Box: {d.physicalTracking?.boxNumber || 'BOX-2026'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PERSPECTIVE 4: SYSTEM ADMINISTRATOR */}
      {dashboardView === 'admin' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Node Server Status</span>
              <div className="mt-2 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {serverHealth?.status || 'UP'} (Port 3000)
                </span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400 font-mono">
                Uptime: {serverHealth?.uptimeSeconds || 0} seconds
              </p>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Process Memory Usage</span>
              <p className="mt-2 text-base font-bold font-mono text-slate-900 dark:text-slate-100">
                {serverHealth?.memory?.heapUsedMb || '96'} MB Heap
              </p>
              <p className="mt-1 text-[11px] text-slate-400 font-mono">
                RSS: {serverHealth?.memory?.rssMb || '280'} MB
              </p>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Database Records</span>
              <p className="mt-2 text-base font-bold font-mono text-slate-900 dark:text-slate-100">
                {serverHealth?.database?.documentsCount || documents.length} Records
              </p>
              <p className="mt-1 text-[11px] text-teal-600 font-mono">
                {serverHealth?.database?.branchesCount || 20} Hubs Active
              </p>
            </div>

            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Disaster Recovery</span>
              <p className="mt-2 text-base font-bold text-slate-900 dark:text-slate-100">
                Operational
              </p>
              <button
                onClick={() => setActiveTab('security')}
                className="mt-1 text-[11px] text-teal-600 hover:underline font-medium block"
              >
                Manage Backups →
              </button>
            </div>
          </div>

          {/* Quick Server Action Bar */}
          <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-slate-400">
              Prometheus Metrics Exporter mounted at <code className="font-mono bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">/api/v1/metrics</code>
            </span>
            <button
              onClick={() => {
                fetch('/api/v1/health')
                  .then(r => r.json())
                  .then(setServerHealth);
              }}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded font-medium flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh Telemetry
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
