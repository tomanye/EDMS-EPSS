import React, { useCallback, useEffect, useState } from 'react';
import {
  KeyRound,
  Plus,
  Search,
  Eye,
  Edit3,
  Copy,
  Power,
  Download,
  Lock,
  CheckCircle2,
  AlertCircle,
  X,
  History,
  Shield
} from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import { apiFetch } from '../../lib/apiFetch.js';
import { formatEthiopianDate } from '../../lib/translations.js';
import { localizeErrorMessage } from '../../lib/localizedErrors.js';
import { useEscapeKey } from '../../lib/useEscapeKey.js';
import { RoleDesignerPanel } from './RoleDesignerPanel.js';
import { UserRoleAssignmentPanel } from './UserRoleAssignmentPanel.js';
import { AccessReviewPanel } from './AccessReviewPanel.js';
import { SodAndCataloguePanel } from './SodAndCataloguePanel.js';
import {
  AccessReviewCampaign,
  AuditLogEntry,
  AuthPolicyConfig,
  BreakGlassElevation,
  EnterpriseRole,
  PermissionDefinition,
  PermissionSet,
  RoleAutoAssignmentRule,
  SodRule,
  SodViolationItem,
  User,
  UserRoleAssignment
} from '../../types/index.js';

type GovernanceTab =
  | 'directory'
  | 'assignments'
  | 'reviews'
  | 'sod-policy'
  | 'catalogue'
  | 'audit';

type EnterpriseRoleRow = EnterpriseRole & { usersCount?: number };

export const RoleGovernanceView: React.FC = () => {
  const { language, refreshSession, t } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<GovernanceTab>('directory');
  const [roles, setRoles] = useState<EnterpriseRoleRow[]>([]);
  const [permissionsCatalogue, setPermissionsCatalogue] = useState<PermissionDefinition[]>([]);
  const [permissionSets, setPermissionSets] = useState<PermissionSet[]>([]);
  const [assignments, setAssignments] = useState<UserRoleAssignment[]>([]);
  const [sodRules, setSodRules] = useState<SodRule[]>([]);
  const [sodViolations, setSodViolations] = useState<SodViolationItem[]>([]);
  const [breakGlassList, setBreakGlassList] = useState<BreakGlassElevation[]>([]);
  const [autoRules, setAutoRules] = useState<RoleAutoAssignmentRule[]>([]);
  const [campaigns, setCampaigns] = useState<AccessReviewCampaign[]>([]);
  const [authPolicy, setAuthPolicy] = useState<AuthPolicyConfig | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'system' | 'custom'>('all');
  const [scopeFilter, setScopeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [designerState, setDesignerState] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit' | 'view' | 'clone';
    role: EnterpriseRoleRow | null;
  }>({ isOpen: false, mode: 'create', role: null });

  const [statusModalRole, setStatusModalRole] = useState<EnterpriseRoleRow | null>(null);
  const [statusReason, setStatusReason] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const [expandedAuditId, setExpandedAuditId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEscapeKey(!!statusModalRole, () => setStatusModalRole(null));

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 5000);
  };

  const loadGovernanceData = useCallback(async () => {
    try {
      const [
        rolesRes,
        permsRes,
        setsRes,
        assignRes,
        sodRes,
        violRes,
        bgRes,
        autoRes,
        revRes,
        polRes,
        usersRes,
        auditRes
      ] = await Promise.all([
        apiFetch('/api/v1/rbac/roles'),
        apiFetch('/api/v1/rbac/permissions'),
        apiFetch('/api/v1/rbac/permission-sets'),
        apiFetch('/api/v1/rbac/assignments'),
        apiFetch('/api/v1/rbac/sod-rules'),
        apiFetch('/api/v1/rbac/sod-violations'),
        apiFetch('/api/v1/rbac/break-glass'),
        apiFetch('/api/v1/rbac/auto-rules'),
        apiFetch('/api/v1/rbac/access-reviews'),
        apiFetch('/api/v1/auth/policy'),
        apiFetch('/api/v1/organizations/users'),
        apiFetch('/api/v1/audit/logs')
      ]);

      if (rolesRes.ok) setRoles(await rolesRes.json());
      if (permsRes.ok) setPermissionsCatalogue(await permsRes.json());
      if (setsRes.ok) setPermissionSets(await setsRes.json());
      if (assignRes.ok) setAssignments(await assignRes.json());
      if (sodRes.ok) setSodRules(await sodRes.json());
      if (violRes.ok) setSodViolations(await violRes.json());
      if (bgRes.ok) setBreakGlassList(await bgRes.json());
      if (autoRes.ok) setAutoRules(await autoRes.json());
      if (revRes.ok) setCampaigns(await revRes.json());
      if (polRes.ok) setAuthPolicy(await polRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
      if (auditRes.ok) {
        const allLogs: AuditLogEntry[] = await auditRes.json();
        const rbacTypes = new Set([
          'EnterpriseRole',
          'UserRoleAssignment',
          'SodRule',
          'BreakGlassElevation',
          'PermissionDefinition',
          'PermissionSet',
          'RoleAutoAssignmentRule',
          'AccessReviewCampaign',
          'AuthPolicy'
        ]);
        setAuditLogs(allLogs.filter(l => rbacTypes.has(l.resourceType)));
      }
    } catch {
      showToast('error', 'Failed to load enterprise role governance data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGovernanceData();
  }, [loadGovernanceData]);

  const handleFullRefresh = async () => {
    await loadGovernanceData();
    await refreshSession();
  };

  const handleToggleRoleStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusModalRole) return;
    if (statusReason.trim().length < 10) {
      showToast('error', 'Status change reason must be at least 10 characters.');
      return;
    }
    const targetStatus = statusModalRole.status === 'Active' ? 'Inactive' : 'Active';
    setIsUpdatingStatus(true);
    try {
      const res = await apiFetch(`/api/v1/rbac/roles/${statusModalRole.id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus, reason: statusReason.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        showToast('error', localizeErrorMessage(data.error || 'Failed to update role status.', language));
        return;
      }
      setStatusModalRole(null);
      setStatusReason('');
      await handleFullRefresh();
      showToast('success', `Role "${data.nameEn}" is now ${data.status}.`);
    } catch {
      showToast('error', localizeErrorMessage('Network error updating role status.', language));
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleExportRole = (role: EnterpriseRoleRow) => {
    const blob = new Blob([JSON.stringify(role, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${role.code}-v${role.version}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredRoles = roles.filter(r => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      r.nameEn.toLowerCase().includes(q) ||
      r.nameAm.toLowerCase().includes(q) ||
      r.code.toLowerCase().includes(q);
    const matchesType =
      typeFilter === 'all' ||
      (typeFilter === 'system' && r.isSystemRole) ||
      (typeFilter === 'custom' && !r.isSystemRole);
    const matchesScope = scopeFilter === 'all' || r.scopeType === scopeFilter;
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesType && matchesScope && matchesStatus;
  });

  const activeUsersCount = users.filter(u => u.status === 'Active').length;
  const activeBgCount = breakGlassList.filter(b => b.status === 'Active').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <span>{t('navRolesGovernance')}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('rolesGovernanceSubtitle')}</p>
        </div>

        <button
          type="button"
          onClick={() => setDesignerState({ isOpen: true, mode: 'create', role: null })}
          className="px-3.5 py-2 text-xs font-semibold bg-teal-700 hover:bg-teal-800 text-white rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{t('createCustomRole')}</span>
        </button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Enterprise Roles', value: roles.length, sub: `${roles.filter(r => r.isSystemRole).length} System · ${roles.filter(r => !r.isSystemRole).length} Org/Custom` },
          { label: 'Permissions Catalogue', value: permissionsCatalogue.length, sub: `${permissionSets.length} Permission Sets · ${autoRules.length} Auto Rules` },
          { label: 'SoD Conflicts', value: sodViolations.length, sub: `${sodRules.length} Active SoD Rules`, alert: sodViolations.length > 0 },
          { label: 'Active Staff / Break-Glass', value: `${activeUsersCount} / ${activeBgCount}`, sub: `${campaigns.filter(c => c.status === 'Active').length} Open Review Campaigns`, alert: activeBgCount > 0 }
        ].map((kpi, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {kpi.label}
            </div>
            <div className={`text-2xl font-bold font-mono tabular-nums mt-1 ${
              kpi.alert ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-slate-100'
            }`}>
              {kpi.value}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Inline Toast */}
      {toast && (
        <div className={`p-3 rounded-xl border text-xs font-medium flex items-center justify-between ${
          toast.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300'
            : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300'
        }`}>
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{toast.text}</span>
          </div>
          <button type="button" onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Sub-Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 w-fit">
        {[
          { id: 'directory', label: `${t('tabRolesDirectory')} (${roles.length})` },
          { id: 'assignments', label: t('tabUserAssignments') },
          { id: 'reviews', label: `${t('tabAccessReviews')} (${campaigns.length})` },
          { id: 'sod-policy', label: t('tabSodPolicies') },
          { id: 'catalogue', label: t('tabPermCatalogue') },
          { id: 'audit', label: `${t('tabRbacAudit')} (${auditLogs.length})` }
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveSubTab(tab.id as GovernanceTab)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              activeSubTab === tab.id
                ? 'bg-white dark:bg-slate-700 text-teal-800 dark:text-teal-200 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: ROLES DIRECTORY */}
      {activeSubTab === 'directory' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search roles by name (EN/AM) or code..."
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg"
              >
                <option value="all">All Types</option>
                <option value="system">System Baseline</option>
                <option value="custom">Organizational / Custom</option>
              </select>
              <select
                value={scopeFilter}
                onChange={(e) => setScopeFilter(e.target.value)}
                className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg"
              >
                <option value="all">All Scopes</option>
                <option value="Global">Global</option>
                <option value="Branch">Branch</option>
                <option value="Department">Department</option>
                <option value="Cluster">Cluster</option>
                <option value="DocumentType">Document Type</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg"
              >
                <option value="all">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Draft">Draft</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Role Name & Code</th>
                    <th className="px-4 py-3 font-semibold">Type</th>
                    <th className="px-4 py-3 font-semibold">Scope</th>
                    <th className="px-4 py-3 font-semibold">Users</th>
                    <th className="px-4 py-3 font-semibold">Version & Status</th>
                    <th className="px-4 py-3 font-semibold">Last Modified</th>
                    <th className="px-4 py-3 font-semibold text-right">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">Loading enterprise role catalogue...</td>
                    </tr>
                  ) : filteredRoles.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">No roles match the selected filters.</td>
                    </tr>
                  ) : (
                    filteredRoles.map(role => (
                      <tr key={role.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                            {role.isSystemRole ? (
                              <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            ) : (
                              <Shield className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                            )}
                            <span>{language === 'am' ? role.nameAm : role.nameEn}</span>
                          </div>
                          <div className="font-mono text-[11px] text-slate-400">
                            {role.code} · {language === 'am' ? role.nameEn : role.nameAm}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-semibold ${
                            role.isSystemRole
                              ? 'text-amber-700 dark:text-amber-300'
                              : role.id.startsWith('role-custom-')
                                ? 'text-teal-700 dark:text-teal-300'
                                : 'text-slate-600 dark:text-slate-300'
                          }`}>
                            {role.isSystemRole
                              ? 'System'
                              : role.id.startsWith('role-custom-')
                                ? 'Custom'
                                : 'Organizational'}
                          </span>
                          {role.isSensitiveRole && (
                            <div className="text-[10px] text-rose-600 font-semibold">Dual-Approval</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800 dark:text-slate-200">{role.scopeType}</div>
                          {role.scopeTargetId && (
                            <div className="font-mono text-[11px] text-slate-400">{role.scopeTargetId}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold tabular-nums text-slate-800 dark:text-slate-200">
                          {role.usersCount ?? 0}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-slate-500">v{role.version}</span>
                            <span className={`font-semibold ${
                              role.status === 'Active'
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : role.status === 'Draft'
                                  ? 'text-amber-600'
                                  : 'text-rose-600'
                            }`}>
                              {role.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-500 tabular-nums whitespace-nowrap">
                          <div>{formatEthiopianDate(role.updatedAt, language)}</div>
                          <div className="text-slate-400">{role.updatedByName}</div>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setDesignerState({ isOpen: true, mode: 'view', role })}
                              className="p-1.5 text-slate-500 hover:text-teal-700 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                              title="View Role & Matrix"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDesignerState({ isOpen: true, mode: 'edit', role })}
                              className="p-1.5 text-slate-500 hover:text-teal-700 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                              title="Edit Role"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDesignerState({ isOpen: true, mode: 'clone', role })}
                              className="p-1.5 text-slate-500 hover:text-teal-700 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                              title="Clone as Template"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            {!role.isSystemRole && (
                              <button
                                type="button"
                                onClick={() => {
                                  setStatusReason('');
                                  setStatusModalRole(role);
                                }}
                                className={`p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 ${
                                  role.status === 'Active' ? 'text-amber-600' : 'text-emerald-600'
                                }`}
                                title={role.status === 'Active' ? 'Deactivate Role' : 'Activate Role'}
                              >
                                <Power className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleExportRole(role)}
                              className="p-1.5 text-slate-500 hover:text-teal-700 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                              title="Export JSON"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USER ASSIGNMENTS & BREAK-GLASS */}
      {activeSubTab === 'assignments' && (
        <UserRoleAssignmentPanel
          roles={roles}
          users={users}
          assignments={assignments}
          breakGlassList={breakGlassList}
          authPolicy={authPolicy}
          onRefresh={handleFullRefresh}
          onToast={showToast}
        />
      )}

      {/* TAB 3: ACCESS REVIEWS */}
      {activeSubTab === 'reviews' && (
        <AccessReviewPanel
          campaigns={campaigns}
          roles={roles}
          users={users}
          onRefresh={handleFullRefresh}
          onToast={showToast}
        />
      )}

      {/* TAB 4: SOD & AUTH POLICIES */}
      {activeSubTab === 'sod-policy' && (
        <SodAndCataloguePanel
          section="sod-policy"
          roles={roles}
          permissionsCatalogue={permissionsCatalogue}
          permissionSets={permissionSets}
          sodRules={sodRules}
          sodViolations={sodViolations}
          autoRules={autoRules}
          authPolicy={authPolicy}
          onRefresh={handleFullRefresh}
          onToast={showToast}
        />
      )}

      {/* TAB 5: PERMISSION CATALOGUE & AUTO-RULES */}
      {activeSubTab === 'catalogue' && (
        <SodAndCataloguePanel
          section="catalogue-auto"
          roles={roles}
          permissionsCatalogue={permissionsCatalogue}
          permissionSets={permissionSets}
          sodRules={sodRules}
          sodViolations={sodViolations}
          autoRules={autoRules}
          authPolicy={authPolicy}
          onRefresh={handleFullRefresh}
          onToast={showToast}
        />
      )}

      {/* TAB 6: IMMUTABLE RBAC AUDIT TRAIL */}
      {activeSubTab === 'audit' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 text-xs">
            <History className="w-4 h-4 text-teal-600" />
            <span>Immutable Role, Permission & Governance Audit Trail ({auditLogs.length})</span>
          </div>
          {auditLogs.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No RBAC governance mutations recorded yet. Create or update roles, SoD rules, or assignments to inspect before/after audit records.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {auditLogs.map(log => {
                const isExpanded = expandedAuditId === log.id;
                return (
                  <div key={log.id} className="p-4 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="font-mono font-bold text-teal-700 dark:text-teal-400">{log.action}</span>{' '}
                        <span className="text-slate-400">·</span>{' '}
                        <span className="font-semibold text-slate-900 dark:text-slate-100">{log.userName}</span>{' '}
                        <span className="text-slate-500">({log.userRole})</span>
                      </div>
                      <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                        {formatEthiopianDate(log.timestamp, language, true)}
                      </span>
                    </div>
                    <div className="text-slate-700 dark:text-slate-300">{log.details}</div>
                    {log.reason && (
                      <div className="text-[11px] text-slate-500">
                        <strong>Reason:</strong> {log.reason}
                      </div>
                    )}
                    {(log.beforeValue || log.afterValue) && (
                      <div>
                        <button
                          type="button"
                          onClick={() => setExpandedAuditId(isExpanded ? null : log.id)}
                          className="text-[11px] font-semibold text-teal-700 dark:text-teal-400 hover:underline"
                        >
                          {isExpanded ? 'Hide Before/After Diff' : 'Inspect Before/After Snapshot'}
                        </button>
                        {isExpanded && (
                          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 font-mono text-[11px]">
                            <div className="p-2.5 rounded-lg bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 overflow-x-auto">
                              <div className="font-bold text-rose-700 dark:text-rose-400 mb-1">BEFORE</div>
                              <pre className="whitespace-pre-wrap break-all">{log.beforeValue || 'null'}</pre>
                            </div>
                            <div className="p-2.5 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 overflow-x-auto">
                              <div className="font-bold text-emerald-700 dark:text-emerald-400 mb-1">AFTER</div>
                              <pre className="whitespace-pre-wrap break-all">{log.afterValue || 'null'}</pre>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Role Designer Modal */}
      <RoleDesignerPanel
        isOpen={designerState.isOpen}
        mode={designerState.mode}
        initialRole={designerState.role}
        allRoles={roles}
        permissionsCatalogue={permissionsCatalogue}
        permissionSets={permissionSets}
        sodRules={sodRules}
        users={users}
        onClose={() => setDesignerState(prev => ({ ...prev, isOpen: false }))}
        onSaved={async (msg) => {
          setDesignerState(prev => ({ ...prev, isOpen: false }));
          await handleFullRefresh();
          showToast('success', msg);
        }}
      />

      {/* Activate / Deactivate Confirmation Modal */}
      {statusModalRole && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleToggleRoleStatus}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl text-xs"
          >
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {statusModalRole.status === 'Active' ? 'Deactivate Role' : 'Activate Role'}: {statusModalRole.nameEn}
            </h3>
            <p className="text-slate-500">
              Soft deactivation preserves historical assignments and audit logs while stopping active permission inheritance.
            </p>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('justificationMin10')} *
              </label>
              <textarea
                rows={3}
                required
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="Provide reason (min 10 characters)..."
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={() => setStatusModalRole(null)} className="px-3.5 py-2 text-slate-600 rounded-lg font-semibold">
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={isUpdatingStatus}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-semibold disabled:opacity-50"
              >
                {isUpdatingStatus ? 'Updating...' : 'Confirm Status Change'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
