import React, { useEffect, useState } from 'react';
import {
  Scale,
  AlertTriangle,
  Key,
  Plus,
  Trash2,
  Play,
  Settings,
  Layers,
  CheckCircle2
} from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import { apiFetch } from '../../lib/apiFetch.js';
import { localizeErrorMessage } from '../../lib/localizedErrors.js';
import { PERMISSION_LEVELS } from '../../lib/permissions.js';
import {
  AuthPolicyConfig,
  EnterpriseRole,
  PermissionCategory,
  PermissionDefinition,
  PermissionScopeLevel,
  PermissionSet,
  RoleAutoAssignmentRule,
  SodRule,
  SodViolationItem
} from '../../types/index.js';

interface SodAndCataloguePanelProps {
  section: 'sod-policy' | 'catalogue-auto';
  roles: EnterpriseRole[];
  permissionsCatalogue: PermissionDefinition[];
  permissionSets: PermissionSet[];
  sodRules: SodRule[];
  sodViolations: SodViolationItem[];
  autoRules: RoleAutoAssignmentRule[];
  authPolicy: AuthPolicyConfig | null;
  onRefresh: () => Promise<void>;
  onToast: (type: 'success' | 'error', text: string) => void;
}

const CATEGORIES: PermissionCategory[] = [
  'Document',
  'Workflow',
  'Physical',
  'Records',
  'Administration',
  'Workspace',
  'Reporting'
];

export const SodAndCataloguePanel: React.FC<SodAndCataloguePanelProps> = ({
  section,
  roles,
  permissionsCatalogue,
  permissionSets,
  sodRules,
  sodViolations,
  autoRules,
  authPolicy,
  onRefresh,
  onToast
}) => {
  const { language, t } = useApp();

  // SoD Rule Form
  const [sodNameEn, setSodNameEn] = useState('');
  const [sodNameAm, setSodNameAm] = useState('');
  const [sodRuleType, setSodRuleType] = useState<'RolePair' | 'PermissionPair' | 'WorkflowConflict'>('RolePair');
  const [sodLeftItem, setSodLeftItem] = useState('');
  const [sodRightItem, setSodRightItem] = useState('');
  const [sodSeverity, setSodSeverity] = useState<'Blocking' | 'Warning'>('Blocking');
  const [sodReason, setSodReason] = useState('');
  const [deleteSodId, setDeleteSodId] = useState<string | null>(null);
  const [deleteSodReason, setDeleteSodReason] = useState('');

  // Auth Policy Form
  const [policyDraft, setPolicyDraft] = useState<AuthPolicyConfig | null>(authPolicy);
  const [policyReason, setPolicyReason] = useState('');

  // Custom Permission Form
  const [permSearch, setPermSearch] = useState('');
  const [permCatFilter, setPermCatFilter] = useState('all');
  const [newPermKey, setNewPermKey] = useState('');
  const [newPermCategory, setNewPermCategory] = useState<PermissionCategory>('Administration');
  const [newPermNameEn, setNewPermNameEn] = useState('');
  const [newPermNameAm, setNewPermNameAm] = useState('');
  const [newPermDescEn, setNewPermDescEn] = useState('');
  const [newPermReason, setNewPermReason] = useState('');

  // Permission Set Form
  const [setNameEn, setSetNameEn] = useState('');
  const [setNameAm, setSetNameAm] = useState('');
  const [setGrants, setSetGrants] = useState<Record<string, PermissionScopeLevel>>({});
  const [setReason, setSetReason] = useState('');

  // Auto-Assignment Rule Form
  const [autoNameEn, setAutoNameEn] = useState('');
  const [autoNameAm, setAutoNameAm] = useState('');
  const [autoField, setAutoField] = useState<'position' | 'departmentId' | 'branchId' | 'cluster'>('position');
  const [autoOp, setAutoOp] = useState<'equals' | 'contains'>('contains');
  const [autoValue, setAutoValue] = useState('');
  const [autoRoleId, setAutoRoleId] = useState('');
  const [autoReason, setAutoReason] = useState('');

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (authPolicy) setPolicyDraft(authPolicy);
  }, [authPolicy]);

  useEffect(() => {
    if (roles.length >= 2 && !sodLeftItem) {
      setSodLeftItem(roles[0].code);
      setSodRightItem(roles[1].code);
      setAutoRoleId(roles[0].id);
    }
  }, [roles, sodLeftItem]);

  const handleCreateSodRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sodReason.trim().length < 10) {
      onToast('error', 'Justification reason must be at least 10 characters.');
      return;
    }
    setIsSaving(true);
    try {
      const res = await apiFetch('/api/v1/rbac/sod-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nameEn: sodNameEn.trim(),
          nameAm: sodNameAm.trim(),
          ruleType: sodRuleType,
          leftItem: sodLeftItem.trim(),
          rightItem: sodRightItem.trim(),
          severity: sodSeverity,
          description: `${sodRuleType}: ${sodLeftItem} vs ${sodRightItem}`,
          reason: sodReason.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) {
        onToast('error', localizeErrorMessage(data.error || 'Failed to create SoD rule.', language));
        return;
      }
      setSodNameEn('');
      setSodNameAm('');
      setSodReason('');
      await onRefresh();
      onToast('success', `Created SoD rule "${data.nameEn}".`);
    } catch {
      onToast('error', localizeErrorMessage('Network error creating SoD rule.', language));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSodRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteSodId || deleteSodReason.trim().length < 10) {
      onToast('error', 'Deletion reason (min 10 chars) is required.');
      return;
    }
    setIsSaving(true);
    try {
      const res = await apiFetch(`/api/v1/rbac/sod-rules/${deleteSodId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: deleteSodReason.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        onToast('error', localizeErrorMessage(data.error || 'Failed to remove SoD rule.', language));
        return;
      }
      setDeleteSodId(null);
      setDeleteSodReason('');
      await onRefresh();
      onToast('success', 'Removed SoD rule.');
    } catch {
      onToast('error', localizeErrorMessage('Network error deleting SoD rule.', language));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAuthPolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!policyDraft) return;
    if (policyReason.trim().length < 10) {
      onToast('error', 'Policy update reason (min 10 chars) is required.');
      return;
    }
    setIsSaving(true);
    try {
      const res = await apiFetch('/api/v1/auth/policy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...policyDraft, reason: policyReason.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        onToast('error', localizeErrorMessage(data.error || 'Failed to update security policy.', language));
        return;
      }
      setPolicyReason('');
      await onRefresh();
      onToast('success', 'Updated authentication & role duration security policy.');
    } catch {
      onToast('error', localizeErrorMessage('Network error updating auth policy.', language));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateCustomPermission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPermReason.trim().length < 10) {
      onToast('error', 'Reason must be at least 10 characters.');
      return;
    }
    setIsSaving(true);
    try {
      const res = await apiFetch('/api/v1/rbac/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: newPermKey.trim().toLowerCase(),
          category: newPermCategory,
          nameEn: newPermNameEn.trim(),
          nameAm: newPermNameAm.trim(),
          descriptionEn: newPermDescEn.trim() || newPermNameEn.trim(),
          reason: newPermReason.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) {
        onToast('error', localizeErrorMessage(data.error || 'Failed to register custom permission.', language));
        return;
      }
      setNewPermKey('');
      setNewPermNameEn('');
      setNewPermNameAm('');
      setNewPermDescEn('');
      setNewPermReason('');
      await onRefresh();
      onToast('success', `Added custom permission "${data.key}".`);
    } catch {
      onToast('error', localizeErrorMessage('Network error registering custom permission.', language));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreatePermissionSet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (setReason.trim().length < 10) {
      onToast('error', 'Reason must be at least 10 characters.');
      return;
    }
    setIsSaving(true);
    try {
      const res = await apiFetch('/api/v1/rbac/permission-sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nameEn: setNameEn.trim(),
          nameAm: setNameAm.trim(),
          grants: setGrants,
          reason: setReason.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) {
        onToast('error', localizeErrorMessage(data.error || 'Failed to create permission set.', language));
        return;
      }
      setSetNameEn('');
      setSetNameAm('');
      setSetGrants({});
      setSetReason('');
      await onRefresh();
      onToast('success', `Created permission set "${data.nameEn}".`);
    } catch {
      onToast('error', localizeErrorMessage('Network error creating permission set.', language));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateAutoRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (autoReason.trim().length < 10) {
      onToast('error', 'Reason must be at least 10 characters.');
      return;
    }
    setIsSaving(true);
    try {
      const res = await apiFetch('/api/v1/rbac/auto-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nameEn: autoNameEn.trim(),
          nameAm: autoNameAm.trim() || autoNameEn.trim(),
          matchField: autoField,
          matchOperator: autoOp,
          matchValue: autoValue.trim(),
          targetRoleId: autoRoleId,
          reason: autoReason.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) {
        onToast('error', localizeErrorMessage(data.error || 'Failed to create auto-assignment rule.', language));
        return;
      }
      setAutoNameEn('');
      setAutoNameAm('');
      setAutoValue('');
      setAutoReason('');
      await onRefresh();
      onToast('success', `Created HR auto-assignment rule "${data.nameEn}".`);
    } catch {
      onToast('error', localizeErrorMessage('Network error creating auto-assignment rule.', language));
    } finally {
      setIsSaving(false);
    }
  };

  const handleRunAutoRules = async () => {
    setIsSaving(true);
    try {
      const res = await apiFetch('/api/v1/rbac/auto-rules/run', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        onToast('error', localizeErrorMessage(data.error || 'Auto-rule evaluation failed.', language));
        return;
      }
      await onRefresh();
      onToast('success', data.summary || `Assigned ${data.assignedCount} roles.`);
    } catch {
      onToast('error', localizeErrorMessage('Network error executing auto-assignment rules.', language));
    } finally {
      setIsSaving(false);
    }
  };

  if (section === 'sod-policy') {
    return (
      <div className="space-y-6 text-xs">
        {/* SoD Violations Scanner */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <AlertTriangle className={`w-4 h-4 ${sodViolations.length > 0 ? 'text-amber-600' : 'text-emerald-600'}`} />
              <span>Organization-Wide SoD Violation Report ({sodViolations.length})</span>
            </div>
            <span className="text-[11px] text-slate-500">Live scan across active composite assignments & effective grants</span>
          </div>

          {sodViolations.length === 0 ? (
            <div className="p-5 flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-medium">
              <CheckCircle2 className="w-4 h-4" />
              <span>Zero Segregation of Duties conflicts detected across active EPSS staff accounts.</span>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {sodViolations.map((v, i) => (
                <div key={i} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      {v.userName} (@{v.username}) · <span className="text-amber-700 dark:text-amber-300">{v.ruleNameEn}</span>
                    </div>
                    <div className="text-[11px] text-slate-500">{v.detail}</div>
                  </div>
                  <span className={`font-bold ${v.severity === 'Blocking' ? 'text-rose-600' : 'text-amber-600'}`}>
                    {v.severity}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SoD Rules List + Create SoD Rule */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Scale className="w-4 h-4 text-teal-600" />
              <span>Defined Separation of Duties (SoD) Rules ({sodRules.length})</span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {sodRules.map(rule => (
                <div key={rule.id} className="p-4 flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {language === 'am' ? rule.nameAm : rule.nameEn}
                      </span>
                      <span className={`font-semibold text-[11px] ${
                        rule.severity === 'Blocking' ? 'text-rose-600' : 'text-amber-600'
                      }`}>
                        {rule.severity}
                      </span>
                    </div>
                    <div className="font-mono text-[11px] text-slate-600 dark:text-slate-400">
                      [{rule.ruleType}] {rule.leftItem} ↔ {rule.rightItem}
                    </div>
                    <div className="text-[11px] text-slate-500">{rule.description}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDeleteSodId(rule.id);
                      setDeleteSodReason('');
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                    title="Delete SoD Rule"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <form
            onSubmit={handleCreateSodRule}
            className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3"
          >
            <h4 className="font-bold text-slate-900 dark:text-slate-100 pb-2 border-b border-slate-100 dark:border-slate-800">
              Add Separation of Duties Rule
            </h4>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Rule Name (English) *</label>
              <input
                type="text"
                required
                value={sodNameEn}
                onChange={(e) => setSodNameEn(e.target.value)}
                placeholder="e.g. Legal Hold vs Record Disposal"
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Rule Name (Amharic) *</label>
              <input
                type="text"
                required
                value={sodNameAm}
                onChange={(e) => setSodNameAm(e.target.value)}
                placeholder="የሕግ እገዳ እና የመዝገብ ማስወገድ"
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Rule Type</label>
                <select
                  value={sodRuleType}
                  onChange={(e) => {
                    const nextType = e.target.value as any;
                    setSodRuleType(nextType);
                    if (nextType === 'RolePair' && roles.length >= 2) {
                      setSodLeftItem(roles[0].code);
                      setSodRightItem(roles[1].code);
                    } else if (nextType === 'PermissionPair' && permissionsCatalogue.length >= 2) {
                      setSodLeftItem(permissionsCatalogue[0].key);
                      setSodRightItem(permissionsCatalogue[1].key);
                    } else {
                      setSodLeftItem('DocumentSubmitter');
                      setSodRightItem('WorkflowFinalApprover');
                    }
                  }}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                >
                  <option value="RolePair">RolePair</option>
                  <option value="PermissionPair">PermissionPair</option>
                  <option value="WorkflowConflict">WorkflowConflict</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Severity</label>
                <select
                  value={sodSeverity}
                  onChange={(e) => setSodSeverity(e.target.value as 'Blocking' | 'Warning')}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                >
                  <option value="Blocking">Blocking</option>
                  <option value="Warning">Warning</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Left Conflict Item *</label>
                {sodRuleType === 'RolePair' ? (
                  <select
                    value={sodLeftItem}
                    onChange={(e) => setSodLeftItem(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                  >
                    {roles.map(r => <option key={r.id} value={r.code}>{r.code}</option>)}
                  </select>
                ) : sodRuleType === 'PermissionPair' ? (
                  <select
                    value={sodLeftItem}
                    onChange={(e) => setSodLeftItem(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                  >
                    {permissionsCatalogue.map(p => <option key={p.id} value={p.key}>{p.key}</option>)}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={sodLeftItem}
                    onChange={(e) => setSodLeftItem(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                  />
                )}
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Right Conflict Item *</label>
                {sodRuleType === 'RolePair' ? (
                  <select
                    value={sodRightItem}
                    onChange={(e) => setSodRightItem(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                  >
                    {roles.map(r => <option key={r.id} value={r.code}>{r.code}</option>)}
                  </select>
                ) : sodRuleType === 'PermissionPair' ? (
                  <select
                    value={sodRightItem}
                    onChange={(e) => setSodRightItem(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                  >
                    {permissionsCatalogue.map(p => <option key={p.id} value={p.key}>{p.key}</option>)}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={sodRightItem}
                    onChange={(e) => setSodRightItem(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                  />
                )}
              </div>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">{t('justificationMin10')} *</label>
              <input
                type="text"
                required
                value={sodReason}
                onChange={(e) => setSodReason(e.target.value)}
                placeholder="Audit control justification..."
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>
            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-semibold disabled:opacity-50"
            >
              Add SoD Rule
            </button>
          </form>
        </div>

        {/* Auth & Role Duration Policy Settings */}
        {policyDraft && (
          <form
            onSubmit={handleSaveAuthPolicy}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4"
          >
            <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <Settings className="w-4 h-4 text-teal-600" />
              <span>Authentication, Progressive Delay, Session & Role Duration Security Policy</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {[
                { key: 'maxFailedAttempts', label: 'Max Failed Logins' },
                { key: 'lockoutDurationMinutes', label: 'Lockout (Minutes)' },
                { key: 'progressiveDelayBaseSeconds', label: 'Progressive Delay Base (s)' },
                { key: 'idleTimeoutMinutes', label: 'Idle Timeout (Min)' },
                { key: 'absoluteTimeoutHours', label: 'Absolute Timeout (Hrs)' },
                { key: 'maxConcurrentSessions', label: 'Max Concurrent Sessions' },
                { key: 'minPasswordLength', label: 'Min Password Length' },
                { key: 'maxDelegationDays', label: 'Max Delegation (Days)' },
                { key: 'maxTimeBoundRoleDays', label: 'Max Time-Bound Role (Days)' },
                { key: 'maxBreakGlassHours', label: 'Max Break-Glass (Hours)' }
              ].map(field => (
                <div key={field.key}>
                  <label className="block font-semibold text-slate-600 dark:text-slate-400 mb-1 text-[11px]">
                    {field.label}
                  </label>
                  <input
                    type="number"
                    value={(policyDraft as any)[field.key] ?? 0}
                    onChange={(e) =>
                      setPolicyDraft(prev => (prev ? { ...prev, [field.key]: Number(e.target.value) } : prev))
                    }
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono tabular-nums"
                  />
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex-1">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Policy Change Reason (min 10 characters) *
                </label>
                <input
                  type="text"
                  required
                  value={policyReason}
                  onChange={(e) => setPolicyReason(e.target.value)}
                  placeholder="Document security baseline update rationale..."
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-semibold shrink-0 disabled:opacity-50"
              >
                Save Security Policy
              </button>
            </div>
          </form>
        )}

        {/* Delete SoD Reason Modal */}
        {deleteSodId && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <form
              onSubmit={handleDeleteSodRule}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl"
            >
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Confirm Removal of SoD Rule</h3>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">{t('justificationMin10')} *</label>
                <textarea
                  rows={3}
                  required
                  value={deleteSodReason}
                  onChange={(e) => setDeleteSodReason(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <button type="button" onClick={() => setDeleteSodId(null)} className="px-3.5 py-2 text-slate-600 rounded-lg font-semibold">
                  {t('cancel')}
                </button>
                <button type="submit" disabled={isSaving} className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold">
                  Delete Rule
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  // SECTION 2: PERMISSION CATALOGUE, PERMISSION SETS & HR AUTO-ASSIGNMENT RULES
  const filteredPerms = permissionsCatalogue.filter(p => {
    const matchCat = permCatFilter === 'all' || p.category === permCatFilter;
    const q = permSearch.trim().toLowerCase();
    const matchQ =
      !q ||
      p.key.toLowerCase().includes(q) ||
      p.nameEn.toLowerCase().includes(q) ||
      p.nameAm.toLowerCase().includes(q);
    return matchCat && matchQ;
  });

  return (
    <div className="space-y-6 text-xs">
      {/* Permission Catalogue & Add Custom Permission */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Key className="w-4 h-4 text-teal-600" />
              <span>Granular Permission Catalogue ({permissionsCatalogue.length})</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={permSearch}
                onChange={(e) => setPermSearch(e.target.value)}
                placeholder="Filter permissions..."
                className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
              <select
                value={permCatFilter}
                onChange={(e) => setPermCatFilter(e.target.value)}
                className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
              >
                <option value="all">All Categories</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {filteredPerms.map(p => (
              <div key={p.id} className="px-4 py-2.5 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {language === 'am' ? p.nameAm : p.nameEn}
                    </span>
                    <span className="font-mono text-[11px] text-teal-700 dark:text-teal-400">{p.key}</span>
                    {p.isCustom && (
                      <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300">Custom</span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {language === 'am' ? p.descriptionAm : p.descriptionEn}
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-slate-500 shrink-0">{p.category}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Add Custom Permission Form */}
        <form
          onSubmit={handleCreateCustomPermission}
          className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-3"
        >
          <h4 className="font-bold text-slate-900 dark:text-slate-100 pb-2 border-b border-slate-100 dark:border-slate-800">
            Register Custom Module Permission
          </h4>
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Permission Key (`module.action`) *</label>
            <input
              type="text"
              required
              value={newPermKey}
              onChange={(e) => setNewPermKey(e.target.value)}
              placeholder="e.g. coldchain.certify_batch"
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Category</label>
            <select
              value={newPermCategory}
              onChange={(e) => setNewPermCategory(e.target.value as PermissionCategory)}
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Name (English) *</label>
            <input
              type="text"
              required
              value={newPermNameEn}
              onChange={(e) => setNewPermNameEn(e.target.value)}
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Name (Amharic) *</label>
            <input
              type="text"
              required
              value={newPermNameAm}
              onChange={(e) => setNewPermNameAm(e.target.value)}
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Description</label>
            <input
              type="text"
              value={newPermDescEn}
              onChange={(e) => setNewPermDescEn(e.target.value)}
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">{t('justificationMin10')} *</label>
            <input
              type="text"
              required
              value={newPermReason}
              onChange={(e) => setNewPermReason(e.target.value)}
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
            />
          </div>
          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-semibold inline-flex items-center justify-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Custom Permission</span>
          </button>
        </form>
      </div>

      {/* Permission Sets & HR Auto-Assignment Rules */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Permission Sets */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Layers className="w-4 h-4 text-teal-600" />
            <span>Permission Sets ({permissionSets.length})</span>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {permissionSets.map(ps => (
              <div key={ps.id} className="p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="font-semibold text-slate-900 dark:text-slate-100">
                  {language === 'am' ? ps.nameAm : ps.nameEn}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">{ps.descriptionEn}</div>
                <div className="text-[11px] font-mono text-teal-700 dark:text-teal-400 mt-1">
                  {Object.entries(ps.grants).map(([k, v]) => `${k}:${v}`).join(' · ')}
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleCreatePermissionSet} className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
            <div className="font-semibold text-slate-800 dark:text-slate-200">Create New Permission Set</div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                required
                value={setNameEn}
                onChange={(e) => setSetNameEn(e.target.value)}
                placeholder="Set Name (EN)"
                className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
              <input
                type="text"
                required
                value={setNameAm}
                onChange={(e) => setSetNameAm(e.target.value)}
                placeholder="Set Name (AM)"
                className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>
            <div className="max-h-32 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg divide-y divide-slate-100 dark:divide-slate-800">
              {permissionsCatalogue.slice(0, 12).map(p => (
                <div key={p.id} className="px-2.5 py-1.5 flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] truncate">{p.key}</span>
                  <select
                    value={setGrants[p.key] || 'None'}
                    onChange={(e) => {
                      const val = e.target.value as PermissionScopeLevel;
                      setSetGrants(prev => {
                        const next = { ...prev };
                        if (val === 'None') delete next[p.key];
                        else next[p.key] = val;
                        return next;
                      });
                    }}
                    className="p-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-[11px]"
                  >
                    {PERMISSION_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                required
                value={setReason}
                onChange={(e) => setSetReason(e.target.value)}
                placeholder="Reason (min 10 chars)..."
                className="flex-1 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
              <button type="submit" disabled={isSaving} className="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-semibold shrink-0">
                Create Set
              </button>
            </div>
          </form>
        </div>

        {/* HR Auto-Assignment Rules */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="font-bold text-slate-900 dark:text-slate-100">
              HR Attribute Auto-Assignment Rules ({autoRules.length})
            </div>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleRunAutoRules}
              className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-semibold inline-flex items-center gap-1.5 shrink-0"
            >
              <Play className="w-3 h-3" />
              <span>Run Rules Now</span>
            </button>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {autoRules.map(rule => (
              <div key={rule.id} className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    {language === 'am' ? rule.nameAm : rule.nameEn}
                  </div>
                  <div className="font-mono text-[11px] text-slate-500">
                    IF {rule.matchField} {rule.matchOperator} "{rule.matchValue}" → {rule.targetRoleCode}
                  </div>
                </div>
                <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                  {rule.isActive ? 'Active' : 'Paused'}
                </span>
              </div>
            ))}
          </div>

          <form onSubmit={handleCreateAutoRule} className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
            <div className="font-semibold text-slate-800 dark:text-slate-200">Create Auto-Assignment Rule</div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                required
                value={autoNameEn}
                onChange={(e) => setAutoNameEn(e.target.value)}
                placeholder="Rule Name (EN)"
                className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
              <input
                type="text"
                value={autoNameAm}
                onChange={(e) => setAutoNameAm(e.target.value)}
                placeholder="Rule Name (AM)"
                className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <select
                value={autoField}
                onChange={(e) => setAutoField(e.target.value as any)}
                className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              >
                <option value="position">HR Position</option>
                <option value="departmentId">Department ID</option>
                <option value="branchId">Branch ID</option>
                <option value="cluster">Cluster</option>
              </select>
              <select
                value={autoOp}
                onChange={(e) => setAutoOp(e.target.value as any)}
                className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              >
                <option value="contains">contains</option>
                <option value="equals">equals</option>
              </select>
              <input
                type="text"
                required
                value={autoValue}
                onChange={(e) => setAutoValue(e.target.value)}
                placeholder="Match value..."
                className="p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
              />
            </div>
            <select
              value={autoRoleId}
              onChange={(e) => setAutoRoleId(e.target.value)}
              className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
            >
              {roles.filter(r => r.status === 'Active').map(r => (
                <option key={r.id} value={r.id}>Assign Role: {r.nameEn} ({r.code})</option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <input
                type="text"
                required
                value={autoReason}
                onChange={(e) => setAutoReason(e.target.value)}
                placeholder="Reason (min 10 chars)..."
                className="flex-1 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
              <button type="submit" disabled={isSaving} className="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-semibold shrink-0">
                Add Rule
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
