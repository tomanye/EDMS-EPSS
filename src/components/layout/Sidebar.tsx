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
  Cpu,
  Bell,
  ShieldCheck,
  Truck,
  KeyRound
} from 'lucide-react';
import { useApp } from '../../context/AppContext.js';

interface NavItem {
  id: string;
  labelKey: any;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  requiredPerm?: string;
}

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, t, language, kpis, documents, unreadNotificationsCount, can, currentUser } = useApp();

  const pendingApprovalsCount = kpis?.pendingApprovals || 0;
  const overdueCount = kpis?.overdueCount || 0;

  const navItems: { sectionEn: string; sectionAm: string; items: NavItem[] }[] = [
    {
      sectionEn: 'Operations & Registry',
      sectionAm: 'የዕለት ተዕለት ሥራ እና መዝገብ',
      items: [
        { id: 'dashboard', labelKey: 'navDashboard', icon: LayoutDashboard },
        { id: 'incoming', labelKey: 'navIncoming', icon: Inbox, badge: documents.filter(d => d.type === 'IncomingLetter').length, requiredPerm: 'document.read' },
        { id: 'outgoing', labelKey: 'navOutgoing', icon: Send, badge: documents.filter(d => d.type === 'OutgoingLetter').length, requiredPerm: 'document.read' },
        { id: 'memos', labelKey: 'navMemos', icon: FileText, requiredPerm: 'document.read' },
        { id: 'applications', labelKey: 'navApplications', icon: FileCheck2, requiredPerm: 'document.read' },
        { id: 'transmittals', labelKey: 'navTransmittals', icon: Truck, requiredPerm: 'document.read' },
      ]
    },
    {
      sectionEn: 'Workflows & Custody',
      sectionAm: 'የሥራ ፍሰት እና አካላዊ ክትትል',
      items: [
        { id: 'workflows', labelKey: 'navWorkflows', icon: GitBranch, badge: pendingApprovalsCount, requiredPerm: 'workflow.view' },
        { id: 'tracking', labelKey: 'navTracking', icon: PackageSearch, requiredPerm: 'physical.register' },
        { id: 'repository', labelKey: 'navRepository', icon: Archive },
        { id: 'search', labelKey: 'navSearch', icon: Search, requiredPerm: 'document.read' },
      ]
    },
    {
      sectionEn: 'Governance & Systems',
      sectionAm: 'አስተዳደር እና ሲስተሞች',
      items: [
        { id: 'archives', labelKey: 'navArchives', icon: FolderArchive, requiredPerm: 'document.archive' },
        { id: 'notifications', labelKey: 'navNotifications', icon: Bell, badge: unreadNotificationsCount },
        { id: 'reports', labelKey: 'navReports', icon: BarChart3, requiredPerm: 'reporting.view' },
        { id: 'organization', labelKey: 'navOrganization', icon: Network, requiredPerm: 'admin.manage_branches' },
        { id: 'roles', labelKey: 'navRolesGovernance', icon: KeyRound, requiredPerm: 'admin.manage_roles' },
        { id: 'integrations', labelKey: 'navIntegrations', icon: Cpu, requiredPerm: 'admin.manage_integrations' },
        { id: 'verify', labelKey: 'navVerify', icon: ShieldCheck },
        { id: 'security', labelKey: 'navSecurity', icon: ShieldAlert, requiredPerm: 'admin.view_audit' },
      ]
    }
  ];

  const isVisibleItem = (item: NavItem) => {
    if (!item.requiredPerm) return true;
    if (item.id === 'roles') {
      return (
        can('admin.manage_roles') ||
        can('admin.manage_users') ||
        currentUser?.role === 'SecurityOfficer' ||
        currentUser?.role === 'SystemAuditor' ||
        currentUser?.role === 'DirectorGeneral'
      );
    }
    if (item.id === 'organization') {
      return can('admin.manage_branches') || can('admin.manage_users');
    }
    if (item.id === 'tracking') {
      return can('physical.register') || can('physical.handover') || can('physical.acknowledge');
    }
    if (item.id === 'archives') {
      return can('document.archive') || can('records.legal_hold') || can('records.request_disposal') || can('records.approve_disposal');
    }
    return can(item.requiredPerm);
  };

  return (
    <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col shrink-0 min-h-[calc(100vh-4rem)]">
      <nav aria-label={t('mainNavigation')} className="p-4 space-y-6 flex-1 overflow-y-auto">
        {navItems.map((group, gIdx) => {
          const visibleItems = group.items.filter(isVisibleItem);
          if (visibleItems.length === 0) return null;
          return (
            <div key={gIdx} className="space-y-1">
              <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {language === 'am' ? group.sectionAm : group.sectionEn}
              </div>
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    type="button"
                    key={item.id}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors text-left ${
                      isActive
                        ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-200 font-semibold'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-teal-700 dark:text-teal-400' : 'text-slate-500 dark:text-slate-400'}`} />
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
          );
        })}
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
