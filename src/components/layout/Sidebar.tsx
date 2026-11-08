import React from 'react';
import { 
  LayoutDashboard, 
  Inbox, 
  Send, 
  FileText, 
  FileCheck2, 
  GitBranch, 
  PackageSearch, 
  Archive, 
  FolderArchive, 
  BarChart3, 
  Network, 
  ShieldAlert,
  Search,
  Cpu
} from 'lucide-react';
import { useApp } from '../../context/AppContext.js';

interface NavItem {
  id: string;
  labelKey: any;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, t, kpis, documents } = useApp();

  const pendingApprovalsCount = kpis?.pendingApprovals || 0;
  const overdueCount = kpis?.overdueCount || 0;

  const navItems: { section: string; items: NavItem[] }[] = [
    {
      section: 'Operations & Registry',
      items: [
        { id: 'dashboard', labelKey: 'navDashboard', icon: LayoutDashboard },
        { id: 'incoming', labelKey: 'navIncoming', icon: Inbox, badge: documents.filter(d => d.type === 'IncomingLetter').length },
        { id: 'outgoing', labelKey: 'navOutgoing', icon: Send, badge: documents.filter(d => d.type === 'OutgoingLetter').length },
        { id: 'memos', labelKey: 'navMemos', icon: FileText },
        { id: 'applications', labelKey: 'navApplications', icon: FileCheck2 },
      ]
    },
    {
      section: 'Workflows & Custody',
      items: [
        { id: 'workflows', labelKey: 'navWorkflows', icon: GitBranch, badge: pendingApprovalsCount },
        { id: 'tracking', labelKey: 'navTracking', icon: PackageSearch },
        { id: 'repository', labelKey: 'navRepository', icon: Archive },
        { id: 'search', labelKey: 'navSearch', icon: Search },
      ]
    },
    {
      section: 'Governance & Systems',
      items: [
        { id: 'archives', labelKey: 'navArchives', icon: FolderArchive },
        { id: 'reports', labelKey: 'navReports', icon: BarChart3 },
        { id: 'organization', labelKey: 'navOrganization', icon: Network },
        { id: 'integrations', labelKey: 'navIntegrations', icon: Cpu },
        { id: 'security', labelKey: 'navSecurity', icon: ShieldAlert },
      ]
    }
  ];

  return (
    <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col shrink-0 min-h-[calc(100vh-4rem)]">
      <nav className="p-4 space-y-6 flex-1 overflow-y-auto">
        {navItems.map((group, gIdx) => (
          <div key={gIdx} className="space-y-1">
            <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {group.section}
            </div>
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors text-left ${
                    isActive
                      ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-200 font-semibold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-teal-700 dark:text-teal-400' : 'text-slate-400 dark:text-slate-500'}`} />
                    <span className="truncate">{t(item.labelKey)}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className={`text-[11px] font-mono tabular-nums px-1.5 py-0.2 rounded-md ${
                      item.id === 'workflows' && pendingApprovalsCount > 0
                        ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-bold'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Overdue alert in sidebar if any */}
      {overdueCount > 0 && (
        <div className="p-4 border-t border-slate-200 dark:border-slate-800">
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg text-xs">
            <span className="font-semibold text-rose-800 dark:text-rose-300 block">SLA Attention Required</span>
            <span className="text-rose-600 dark:text-rose-400 mt-0.5 block font-mono tabular-nums">
              {overdueCount} correspondence deadlines exceeded
            </span>
          </div>
        </div>
      )}
    </aside>
  );
};
