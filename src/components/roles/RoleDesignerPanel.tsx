import React, { useEffect, useMemo, useState } from 'react';
import {
  Shield,
  X,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  History,
  Eye,
  Lock,
  GitBranch,
  Download
} from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import { apiFetch } from '../../lib/apiFetch.js';
import { formatEthiopianDate } from '../../lib/translations.js';
import { localizeErrorMessage } from '../../lib/localizedErrors.js';
import { useEscapeKey } from '../../lib/useEscapeKey.js';
import { PERMISSION_LEVELS, PERMISSION_LEVEL_LABELS } from '../../lib/permissions.js';
import {
  AbacCondition,
  AbacConditionField,
  AbacConditionOperator,
  AbacRule,
  EffectivePermissionPreview,
  EnterpriseRole,
  PermissionCategory,
  PermissionDefinition,
  PermissionScopeLevel,
  PermissionSet,
  RoleScopeType,
  SodRule,
  User
} from '../../types/index.js';

interface RoleDesignerPanelProps {
  isOpen: boolean;
  mode: 'create' | 'edit' | 'view' | 'clone';
  initialRole: EnterpriseRole | null;
  allRoles: EnterpriseRole[];
  permissionsCatalogue: PermissionDefinition[];
  permissionSets: PermissionSet[];
  sodRules: SodRule[];
  users: User[];
  onClose: () => void;
  onSaved: (message: string) => void;
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

const CLUSTERS = ['Central', 'Northern', 'Western', 'SouthernEastern'];
const DOC_TYPES = [
  'IncomingLetter',
  'OutgoingLetter',
  'InternalMemo',
  'Application',
  'TenderDocument',
  'InspectionReport',
  'Circular'
];

const ABAC_FIELDS: { value: AbacConditionField; labelEn: string; labelAm: string }[] = [
  { value: 'confidentiality', labelEn: 'Confidentiality Level', labelAm: 'የሚስጥራዊነት ደረጃ' },
  { value: 'type', labelEn: 'Document Type', labelAm: 'የሰነድ ዓይነት' },
  { value: 'priority', labelEn: 'Priority', labelAm: 'አስቸኳይነት' },
  { value: 'branchId', labelEn: 'Branch / Hub', labelAm: 'ቅርንጫፍ ማዕከል' },
  { value: 'departmentId', labelEn: 'Department / Directorate', labelAm: 'መምሪያ / ዳይሬክቶሬት' },
  { value: 'status', labelEn: 'Workflow Stage / Status', labelAm: 'የሂደት ደረጃ' },
  { value: 'ownerId', labelEn: 'Record Owner', labelAm: 'የሰነድ ባለቤት' },
  { value: 'legalHold', labelEn: 'Legal Hold Status', labelAm: 'የሕግ እገዳ ሁኔታ' }
];

const ABAC_OPERATORS: { value: AbacConditionOperator; label: string }[] = [
  { value: 'eq', label: '=' },
  { value: 'neq', label: '!=' },
  { value: 'lte', label: '<=' },
  { value: 'gte', label: '>=' },
  { value: 'in', label: 'IN' },
  { value: 'notIn', label: 'NOT IN' }
];

export const RoleDesignerPanel: React.FC<RoleDesignerPanelProps> = ({
  isOpen,
  mode,
  initialRole,
  allRoles,
  permissionsCatalogue,
  permissionSets,
  sodRules,
  users,
  onClose,
  onSaved
}) => {
  const { language, branches, departments, t } = useApp();
  const isReadOnly = mode === 'view';

  const [designerTab, setDesignerTab] = useState<'general' | 'matrix' | 'abac' | 'preview' | 'history'>('general');
  const [templateRoleId, setTemplateRoleId] = useState<string>('');
  const [code, setCode] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [nameAm, setNameAm] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [descriptionAm, setDescriptionAm] = useState('');
  const [scopeType, setScopeType] = useState<RoleScopeType>('Global');
  const [scopeTargetId, setScopeTargetId] = useState('');
  const [parentRoleIds, setParentRoleIds] = useState<string[]>([]);
  const [permissionSetIds, setPermissionSetIds] = useState<string[]>([]);
  const [isSensitiveRole, setIsSensitiveRole] = useState(false);
  const [requiresMfa, setRequiresMfa] = useState(false);
  const [grants, setGrants] = useState<Record<string, PermissionScopeLevel>>({});
  const [denies, setDenies] = useState<string[]>([]);
  const [abacRules, setAbacRules] = useState<AbacRule[]>([]);
  const [versionNote, setVersionNote] = useState('');
  const [reason, setReason] = useState('');

  // Sample User Effective Permission Preview
  const [previewUserId, setPreviewUserId] = useState('');
  const [previewData, setPreviewData] = useState<EffectivePermissionPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEscapeKey(isOpen, onClose);

  useEffect(() => {
    if (!isOpen) return;
    setDesignerTab('general');
    setErrorMsg(null);
    setReason('');
    setVersionNote('');
    setPreviewData(null);
    if (users.length > 0 && !previewUserId) {
      setPreviewUserId(users[0].id);
    }

    if (mode === 'create') {
      setTemplateRoleId('');
      setCode('');
      setNameEn('');
      setNameAm('');
      setDescriptionEn('');
      setDescriptionAm('');
      setScopeType('Global');
      setScopeTargetId('');
      setParentRoleIds([]);
      setPermissionSetIds([]);
      setIsSensitiveRole(false);
      setRequiresMfa(false);
      setGrants({});
      setDenies([]);
      setAbacRules([]);
    } else if (initialRole) {
      const isClone = mode === 'clone';
      setTemplateRoleId(isClone ? initialRole.id : '');
      setCode(isClone ? `${initialRole.code}Custom` : initialRole.code);
      setNameEn(isClone ? `${initialRole.nameEn} (Custom)` : initialRole.nameEn);
      setNameAm(isClone ? `${initialRole.nameAm} (ብጁ)` : initialRole.nameAm);
      setDescriptionEn(initialRole.descriptionEn);
      setDescriptionAm(initialRole.descriptionAm);
      setScopeType(initialRole.scopeType);
      setScopeTargetId(initialRole.scopeTargetId || '');
      setParentRoleIds([...(initialRole.parentRoleIds || [])]);
      setPermissionSetIds([...(initialRole.permissionSetIds || [])]);
      setIsSensitiveRole(initialRole.isSensitiveRole);
      setRequiresMfa(initialRole.requiresMfa);
      setGrants({ ...(initialRole.grants || {}) });
      setDenies([...(initialRole.denies || [])]);
      setAbacRules(
        (initialRole.abacRules || []).map(r => ({
          ...r,
          conditions: (r.conditions || []).map(c => ({ ...c }))
        }))
      );
    }
  }, [isOpen, mode, initialRole, users]);

  const applyTemplateRole = (roleId: string) => {
    setTemplateRoleId(roleId);
    const tpl = allRoles.find(r => r.id === roleId);
    if (!tpl) return;
    setScopeType(tpl.scopeType);
    setScopeTargetId(tpl.scopeTargetId || '');
    setParentRoleIds([...(tpl.parentRoleIds || [])]);
    setPermissionSetIds([...(tpl.permissionSetIds || [])]);
    setIsSensitiveRole(tpl.isSensitiveRole);
    setRequiresMfa(tpl.requiresMfa);
    setGrants({ ...(tpl.grants || {}) });
    setDenies([...(tpl.denies || [])]);
    setAbacRules(
      (tpl.abacRules || []).map(r => ({
        ...r,
        id: `abac-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        conditions: r.conditions.map(c => ({ ...c }))
      }))
    );
    if (!descriptionEn) setDescriptionEn(tpl.descriptionEn);
    if (!descriptionAm) setDescriptionAm(tpl.descriptionAm);
  };

  // Detect SoD conflicts for current role configuration
  const sodConflicts = useMemo(() => {
    const conflicts: { rule: SodRule; detail: string }[] = [];
    const activeGrantedKeys = new Set(
      Object.entries(grants)
        .filter(([k, lvl]) => lvl !== 'None' && !denies.includes(k))
        .map(([k]) => k)
    );
    for (const psId of permissionSetIds) {
      const ps = permissionSets.find(p => p.id === psId);
      if (ps) {
        Object.entries(ps.grants).forEach(([k, lvl]) => {
          if (lvl !== 'None' && !denies.includes(k)) activeGrantedKeys.add(k);
        });
      }
    }

    for (const rule of sodRules.filter(r => r.isActive)) {
      if (rule.ruleType === 'PermissionPair') {
        if (activeGrantedKeys.has(rule.leftItem) && activeGrantedKeys.has(rule.rightItem)) {
          conflicts.push({
            rule,
            detail: `${rule.leftItem} + ${rule.rightItem}`
          });
        }
      } else if (rule.ruleType === 'RolePair') {
        const parentCodes = parentRoleIds
          .map(pid => allRoles.find(r => r.id === pid)?.code)
          .filter(Boolean) as string[];
        const selfAndParents = new Set([code, ...parentCodes]);
        if (selfAndParents.has(rule.leftItem) && selfAndParents.has(rule.rightItem)) {
          conflicts.push({
            rule,
            detail: `${rule.leftItem} <-> ${rule.rightItem}`
          });
        }
      }
    }
    return conflicts;
  }, [grants, denies, permissionSetIds, permissionSets, sodRules, parentRoleIds, allRoles, code]);

  const handleLoadUserPreview = async (uid: string) => {
    setPreviewUserId(uid);
    if (!uid) return;
    setPreviewLoading(true);
    try {
      const res = await apiFetch(`/api/v1/rbac/effective-permissions/${uid}`);
      if (res.ok) {
        setPreviewData(await res.json());
      }
    } catch {
      // ignore
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleExportJson = () => {
    if (!initialRole) return;
    const blob = new Blob([JSON.stringify(initialRole, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${initialRole.code}-v${initialRole.version}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const addAbacRule = () => {
    const firstPerm = permissionsCatalogue[0]?.key || 'workflow.approve';
    setAbacRules(prev => [
      ...prev,
      {
        id: `abac-${Date.now().toString(36)}`,
        permissionKey: firstPerm,
        effect: 'Allow',
        description: '',
        conditions: [
          {
            id: `cond-${Date.now().toString(36)}`,
            field: 'confidentiality',
            operator: 'lte',
            value: 'Internal'
          }
        ]
      }
    ]);
  };

  const updateAbacRule = (ruleId: string, patch: Partial<AbacRule>) => {
    setAbacRules(prev => prev.map(r => (r.id === ruleId ? { ...r, ...patch } : r)));
  };

  const addCondition = (ruleId: string) => {
    setAbacRules(prev =>
      prev.map(r =>
        r.id === ruleId
          ? {
              ...r,
              conditions: [
                ...r.conditions,
                {
                  id: `cond-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 4)}`,
                  field: 'departmentId',
                  operator: 'eq',
                  value: '$user.departmentId'
                }
              ]
            }
          : r
      )
    );
  };

  const updateCondition = (ruleId: string, condId: string, patch: Partial<AbacCondition>) => {
    setAbacRules(prev =>
      prev.map(r =>
        r.id === ruleId
          ? {
              ...r,
              conditions: r.conditions.map(c => (c.id === condId ? { ...c, ...patch } : c))
            }
          : r
      )
    );
  };

  const removeCondition = (ruleId: string, condId: string) => {
    setAbacRules(prev =>
      prev.map(r =>
        r.id === ruleId
          ? { ...r, conditions: r.conditions.filter(c => c.id !== condId) }
          : r
      )
    );
  };

  const handleSubmit = async (targetStatus: 'Draft' | 'Active') => {
    setErrorMsg(null);
    const cleanEn = nameEn.trim();
    const cleanAm = nameAm.trim();
    const cleanReason = reason.trim();

    if (cleanEn.length < 3 || cleanEn.length > 100 || cleanAm.length < 3 || cleanAm.length > 100) {
      setErrorMsg(
        language === 'am'
          ? 'የሚና ስም በእንግሊዝኛ እና በአማርኛ ከ3 እስከ 100 ፊደላት መሆን አለበት።'
          : 'Role name must be 3-100 characters in both English and Amharic.'
      );
      setDesignerTab('general');
      return;
    }
    if (scopeType !== 'Global' && !scopeTargetId.trim()) {
      setErrorMsg(
        language === 'am'
          ? 'ለተመረጠው ወሰን (Scope) ኢላማ መምረጥ አለብዎት።'
          : `A scope target must be selected for ${scopeType} scope.`
      );
      setDesignerTab('general');
      return;
    }
    if (cleanReason.length < 10) {
      setErrorMsg(
        language === 'am'
          ? 'ለሚና ለውጥ ቢያንስ 10 ፊደላት ያለው ምክንያት ማስገባት ግዴታ ነው።'
          : 'A change justification reason of at least 10 characters is required.'
      );
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        code: code.trim() || undefined,
        nameEn: cleanEn,
        nameAm: cleanAm,
        descriptionEn: descriptionEn.trim() || cleanEn,
        descriptionAm: descriptionAm.trim() || cleanAm,
        scopeType,
        scopeTargetId: scopeType === 'Global' ? undefined : scopeTargetId.trim(),
        parentRoleIds,
        permissionSetIds,
        clonedFromRoleId: templateRoleId || undefined,
        isSensitiveRole,
        requiresMfa,
        grants,
        denies,
        abacRules,
        status: targetStatus,
        versionNote: versionNote.trim() || `${targetStatus} release`,
        reason: cleanReason
      };

      const isUpdate = mode === 'edit' && initialRole;
      const endpoint = isUpdate ? `/api/v1/rbac/roles/${initialRole.id}` : '/api/v1/rbac/roles';
      const method = isUpdate ? 'PUT' : 'POST';

      const res = await apiFetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(localizeErrorMessage(data.error || 'Failed to save enterprise role.', language));
        return;
      }

      onSaved(
        isUpdate
          ? `Updated role "${data.nameEn}" (v${data.version}, ${data.status}).`
          : `Created custom role "${data.nameEn}" (${data.status}).`
      );
    } catch {
      setErrorMsg(localizeErrorMessage('Network error while saving enterprise role.', language));
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const groupedPermissions = CATEGORIES.map(cat => ({
    category: cat,
    items: permissionsCatalogue.filter(p => p.category === cat)
  })).filter(g => g.items.length > 0);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="role-designer-title"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50/70 dark:bg-slate-800/40 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
              <h2 id="role-designer-title" className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                {mode === 'create'
                  ? language === 'am' ? 'አዲስ ብጁ ሚና መንደፊያ' : 'Role Designer: New Custom Role'
                  : mode === 'clone'
                    ? `Clone Role Template: ${initialRole?.nameEn}`
                    : mode === 'view'
                      ? `Inspect Role: ${initialRole?.nameEn}`
                      : `Edit Role: ${initialRole?.nameEn}`}
              </h2>
              {initialRole?.isSystemRole && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                  <Lock className="w-3 h-3" />
                  {t('systemRoleBaseline')}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {initialRole
                ? `Code: ${initialRole.code} · Version v${initialRole.version} · ${initialRole.status}`
                : language === 'am'
                  ? 'ሚና፣ የፈቃድ ደረጃዎች እና የABAC ደንቦችን ያዋቅሩ'
                  : 'Configure scope, inheritance, granular matrix grants, explicit denies, and attribute-based rules.'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {initialRole && (
              <button
                type="button"
                onClick={handleExportJson}
                className="px-2.5 py-1.5 text-xs font-semibold border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>JSON</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label={t('close')}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 pt-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-1 overflow-x-auto shrink-0">
          {[
            { id: 'general', label: language === 'am' ? 'መሠረታዊ መረጃ እና ውርስ' : 'Basic Info & Inheritance' },
            { id: 'matrix', label: language === 'am' ? 'የፈቃድ ሰንጠረዥ (Matrix)' : 'Permissions Matrix' },
            { id: 'abac', label: `ABAC Rules (${abacRules.length})` },
            { id: 'preview', label: language === 'am' ? 'ውጤታማ ፈቃድ ቅድመ-እይታ' : 'Effective Preview & SoD' },
            ...(initialRole ? [{ id: 'history', label: `Version History (${initialRole.versionHistory?.length || 1})` }] : [])
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setDesignerTab(tab.id as any)}
              className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                designerTab === tab.id
                  ? 'border-teal-700 dark:border-teal-400 text-teal-800 dark:text-teal-200'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Error & SoD Banner */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-200 flex items-center gap-2 shrink-0">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {sodConflicts.length > 0 && (
          <div className="mx-6 mt-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-200 shrink-0">
            <div className="font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{t('sodConflictWarning')}: {sodConflicts.length} conflict(s) detected in role definition</span>
            </div>
            <ul className="mt-1 space-y-0.5 text-[11px] pl-5 list-disc">
              {sodConflicts.map((c, idx) => (
                <li key={idx}>
                  <span className="font-semibold">[{c.rule.severity}]</span> {c.rule.nameEn} ({c.detail})
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 text-xs">
          {/* TAB 1: GENERAL & INHERITANCE */}
          {designerTab === 'general' && (
            <div className="space-y-5">
              {mode === 'create' && (
                <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {language === 'am' ? 'ከነባር ሚና ቅጂ ጀምር (አማራጭ)' : 'Start from Role Template (Optional Clone Baseline)'}
                  </label>
                  <select
                    value={templateRoleId}
                    onChange={(e) => applyTemplateRole(e.target.value)}
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                  >
                    <option value="">-- Blank Custom Role --</option>
                    {allRoles.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.nameEn} ({r.code}) · {r.scopeType}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Role Name (English) *
                  </label>
                  <input
                    type="text"
                    disabled={isReadOnly}
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    placeholder="e.g. Regional Narcotics Inspector"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Role Name (Amharic / አማርኛ) *
                  </label>
                  <input
                    type="text"
                    disabled={isReadOnly}
                    value={nameAm}
                    onChange={(e) => setNameAm(e.target.value)}
                    placeholder="ምሳሌ፡ የክልል ተቆጣጣሪ"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Role Code (Unique Identifier)
                  </label>
                  <input
                    type="text"
                    disabled={isReadOnly || mode === 'edit'}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Auto-generated if left blank"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono disabled:opacity-60"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Scope *</label>
                    <select
                      disabled={isReadOnly || initialRole?.isSystemRole}
                      value={scopeType}
                      onChange={(e) => {
                        setScopeType(e.target.value as RoleScopeType);
                        setScopeTargetId('');
                      }}
                      className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-60"
                    >
                      <option value="Global">Global</option>
                      <option value="Branch">Branch</option>
                      <option value="Department">Department / Directorate</option>
                      <option value="Cluster">Cluster</option>
                      <option value="DocumentType">Document Type</option>
                    </select>
                  </div>

                  {scopeType !== 'Global' && (
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Scope Target *
                      </label>
                      <select
                        disabled={isReadOnly}
                        value={scopeTargetId}
                        onChange={(e) => setScopeTargetId(e.target.value)}
                        className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-60"
                      >
                        <option value="">-- Select Target --</option>
                        {scopeType === 'Branch' &&
                          branches.map(b => (
                            <option key={b.id} value={b.id}>
                              {b.code} · {b.nameEn}
                            </option>
                          ))}
                        {scopeType === 'Department' &&
                          departments.map(d => (
                            <option key={d.id} value={d.id}>
                              {d.code} · {d.nameEn}
                            </option>
                          ))}
                        {scopeType === 'Cluster' &&
                          CLUSTERS.map(c => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        {scopeType === 'DocumentType' &&
                          DOC_TYPES.map(dt => (
                            <option key={dt} value={dt}>
                              {dt}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Description (English)
                  </label>
                  <textarea
                    rows={2}
                    disabled={isReadOnly}
                    value={descriptionEn}
                    onChange={(e) => setDescriptionEn(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Description (Amharic)
                  </label>
                  <textarea
                    rows={2}
                    disabled={isReadOnly}
                    value={descriptionAm}
                    onChange={(e) => setDescriptionAm(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Security Flags */}
              <div className="flex flex-wrap items-center gap-6 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800">
                <label className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={isReadOnly || initialRole?.code === 'SuperAdmin'}
                    checked={requiresMfa}
                    onChange={(e) => setRequiresMfa(e.target.checked)}
                    className="rounded border-slate-300 text-teal-700"
                  />
                  <span>Require MFA / WebAuthn Step-Up</span>
                </label>

                <label className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={isReadOnly}
                    checked={isSensitiveRole}
                    onChange={(e) => setIsSensitiveRole(e.target.checked)}
                    className="rounded border-slate-300 text-teal-700"
                  />
                  <span>Sensitive Role (Requires Dual Assignment Approval)</span>
                </label>
              </div>

              {/* Parent Role Inheritance & Permission Sets */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2.5">
                  <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <GitBranch className="w-4 h-4 text-teal-600" />
                    <span>Parent Role Inheritance (Composite Baseline)</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Child role inherits all grants from checked parent roles. Circular loops are blocked server-side.
                  </p>
                  <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                    {allRoles
                      .filter(r => r.id !== initialRole?.id)
                      .map(r => {
                        const checked = parentRoleIds.includes(r.id);
                        return (
                          <label
                            key={r.id}
                            className="flex items-center justify-between gap-2 p-2 rounded border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <input
                                type="checkbox"
                                disabled={isReadOnly}
                                checked={checked}
                                onChange={(e) => {
                                  setParentRoleIds(prev =>
                                    e.target.checked ? [...prev, r.id] : prev.filter(id => id !== r.id)
                                  );
                                }}
                                className="rounded border-slate-300 text-teal-700"
                              />
                              <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                                {language === 'am' ? r.nameAm : r.nameEn}
                              </span>
                            </div>
                            <span className="font-mono text-[10px] text-slate-400 shrink-0">{r.code}</span>
                          </label>
                        );
                      })}
                  </div>
                </div>

                <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2.5">
                  <div className="font-bold text-slate-900 dark:text-slate-100">
                    Reusable Permission Sets
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Attach curated permission bundles to speed up governance configuration.
                  </p>
                  <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                    {permissionSets.map(ps => {
                      const checked = permissionSetIds.includes(ps.id);
                      return (
                        <label
                          key={ps.id}
                          className="flex items-start gap-2 p-2 rounded border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            disabled={isReadOnly}
                            checked={checked}
                            onChange={(e) => {
                              setPermissionSetIds(prev =>
                                e.target.checked ? [...prev, ps.id] : prev.filter(id => id !== ps.id)
                              );
                            }}
                            className="mt-0.5 rounded border-slate-300 text-teal-700"
                          />
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-800 dark:text-slate-200">
                              {language === 'am' ? ps.nameAm : ps.nameEn}
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">
                              {Object.keys(ps.grants).length} grants · {ps.descriptionEn}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PERMISSIONS MATRIX */}
          {designerTab === 'matrix' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-[11px] text-slate-500 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                <span>
                  Select the maximum scope level per capability. Toggling <strong>Explicit Deny</strong> overrides any inherited or composite Allow.
                </span>
                <span className="font-mono tabular-nums font-semibold text-slate-700 dark:text-slate-300">
                  {Object.values(grants).filter(v => v !== 'None').length} granted · {denies.length} denied
                </span>
              </div>

              {groupedPermissions.map(group => (
                <div
                  key={group.category}
                  className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden"
                >
                  <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
                    <span>{group.category}</span>
                    <span className="text-[11px] font-mono text-slate-500 tabular-nums">{group.items.length}</span>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {group.items.map(perm => {
                      const currentLevel = grants[perm.key] || 'None';
                      const isDenied = denies.includes(perm.key);
                      return (
                        <div
                          key={perm.id}
                          className={`px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            isDenied ? 'bg-rose-50/40 dark:bg-rose-950/20' : ''
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900 dark:text-slate-100">
                                {language === 'am' ? perm.nameAm : perm.nameEn}
                              </span>
                              <span className="font-mono text-[10px] text-slate-400">{perm.key}</span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              {language === 'am' ? perm.descriptionAm : perm.descriptionEn}
                            </p>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <select
                              disabled={isReadOnly || isDenied}
                              value={isDenied ? 'None' : currentLevel}
                              onChange={(e) => {
                                const val = e.target.value as PermissionScopeLevel;
                                setGrants(prev => {
                                  const next = { ...prev };
                                  if (val === 'None') delete next[perm.key];
                                  else next[perm.key] = val;
                                  return next;
                                });
                              }}
                              className="p-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-medium disabled:opacity-50"
                            >
                              {PERMISSION_LEVELS.map(lvl => (
                                <option key={lvl} value={lvl}>
                                  {language === 'am' ? PERMISSION_LEVEL_LABELS[lvl].am : PERMISSION_LEVEL_LABELS[lvl].en}
                                </option>
                              ))}
                            </select>

                            <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-rose-700 dark:text-rose-400 cursor-pointer">
                              <input
                                type="checkbox"
                                disabled={isReadOnly}
                                checked={isDenied}
                                onChange={(e) => {
                                  setDenies(prev =>
                                    e.target.checked
                                      ? Array.from(new Set([...prev, perm.key]))
                                      : prev.filter(k => k !== perm.key)
                                  );
                                }}
                                className="rounded border-rose-300 text-rose-600"
                              />
                              <span>Deny</span>
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: ABAC RULES BUILDER */}
          {designerTab === 'abac' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
                <div>
                  <div className="font-bold text-slate-900 dark:text-slate-100">
                    Attribute-Based Access Control (ABAC) Rules
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Evaluate document attributes dynamically (tokens like <code className="font-mono">$user.departmentId</code>, <code className="font-mono">$user.branchId</code>, <code className="font-mono">$user.id</code>).
                  </div>
                </div>
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={addAbacRule}
                    className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-semibold inline-flex items-center gap-1.5 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add ABAC Rule</span>
                  </button>
                )}
              </div>

              {abacRules.length === 0 ? (
                <div className="py-10 text-center text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  No ABAC condition rules attached to this role. Static matrix grants apply unconditionally within role scope.
                </div>
              ) : (
                <div className="space-y-3">
                  {abacRules.map((rule, rIdx) => (
                    <div
                      key={rule.id}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-bold text-slate-400">#{rIdx + 1}</span>
                          <select
                            disabled={isReadOnly}
                            value={rule.effect}
                            onChange={(e) => updateAbacRule(rule.id, { effect: e.target.value as 'Allow' | 'Deny' })}
                            className={`p-1.5 rounded-lg border font-bold ${
                              rule.effect === 'Deny'
                                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300'
                                : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300'
                            }`}
                          >
                            <option value="Allow">ALLOW ONLY IF</option>
                            <option value="Deny">DENY IF</option>
                          </select>
                          <select
                            disabled={isReadOnly}
                            value={rule.permissionKey}
                            onChange={(e) => updateAbacRule(rule.id, { permissionKey: e.target.value })}
                            className="p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                          >
                            {permissionsCatalogue.map(p => (
                              <option key={p.key} value={p.key}>
                                {p.key} ({p.nameEn})
                              </option>
                            ))}
                          </select>
                        </div>

                        {!isReadOnly && (
                          <button
                            type="button"
                            onClick={() => setAbacRules(prev => prev.filter(r => r.id !== rule.id))}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                            title="Remove Rule"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <input
                        type="text"
                        disabled={isReadOnly}
                        value={rule.description}
                        onChange={(e) => updateAbacRule(rule.id, { description: e.target.value })}
                        placeholder="Rule description (e.g. Can approve only if Confidentiality <= Internal and Department = User Dept)"
                        className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                      />

                      <div className="space-y-2">
                        {rule.conditions.map((cond, cIdx) => (
                          <div key={cond.id} className="grid grid-cols-12 gap-2 items-center">
                            <span className="col-span-1 text-[11px] font-mono text-slate-400">
                              {cIdx === 0 ? 'IF' : 'AND'}
                            </span>
                            <select
                              disabled={isReadOnly}
                              value={cond.field}
                              onChange={(e) => updateCondition(rule.id, cond.id, { field: e.target.value as AbacConditionField })}
                              className="col-span-4 p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                            >
                              {ABAC_FIELDS.map(f => (
                                <option key={f.value} value={f.value}>
                                  {language === 'am' ? f.labelAm : f.labelEn}
                                </option>
                              ))}
                            </select>
                            <select
                              disabled={isReadOnly}
                              value={cond.operator}
                              onChange={(e) => updateCondition(rule.id, cond.id, { operator: e.target.value as AbacConditionOperator })}
                              className="col-span-2 p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                            >
                              {ABAC_OPERATORS.map(op => (
                                <option key={op.value} value={op.value}>
                                  {op.label}
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              disabled={isReadOnly}
                              value={cond.value}
                              onChange={(e) => updateCondition(rule.id, cond.id, { value: e.target.value })}
                              placeholder="Value or $user.departmentId"
                              className="col-span-4 p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                            />
                            {!isReadOnly && (
                              <button
                                type="button"
                                onClick={() => removeCondition(rule.id, cond.id)}
                                className="col-span-1 p-1 text-slate-400 hover:text-rose-600 flex justify-center"
                                title="Remove Condition"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}

                        {!isReadOnly && (
                          <button
                            type="button"
                            onClick={() => addCondition(rule.id)}
                            className="text-[11px] font-semibold text-teal-700 dark:text-teal-400 hover:underline inline-flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add AND condition</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SAMPLE USER EFFECTIVE PERMISSIONS PREVIEW */}
          {designerTab === 'preview' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div className="flex-1">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Preview Current Effective Permissions for Sample Staff User
                  </label>
                  <select
                    value={previewUserId}
                    onChange={(e) => handleLoadUserPreview(e.target.value)}
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                  >
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.fullNameEn} (@{u.username}) — {u.role}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => handleLoadUserPreview(previewUserId)}
                  className="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-semibold inline-flex items-center gap-1.5 shrink-0"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{previewLoading ? 'Evaluating...' : 'Evaluate Effective Access'}</span>
                </button>
              </div>

              {previewData && (
                <div className="space-y-4 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-slate-100">{previewData.userName}</div>
                      <div className="text-[11px] font-mono text-slate-500">
                        Active Roles: {previewData.activeRoleCodes.join(', ') || 'None'}
                      </div>
                    </div>
                    {previewData.explicitDenies.length > 0 && (
                      <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-400">
                        {previewData.explicitDenies.length} Explicit Denies Active
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {Object.entries(previewData.effectiveLevels).map(([key, level]) => (
                      <div
                        key={key}
                        className={`px-3 py-2 rounded-lg border flex items-center justify-between ${
                          previewData.explicitDenies.includes(key) || level === 'None'
                            ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300'
                            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <span className="font-mono text-[11px] truncate">{key}</span>
                        <span className="font-semibold text-[11px] shrink-0">
                          {previewData.explicitDenies.includes(key) ? 'DENIED' : level}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: VERSION HISTORY */}
          {designerTab === 'history' && initialRole && (
            <div className="space-y-3">
              {(initialRole.versionHistory || []).map(vh => (
                <div
                  key={vh.version}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <History className="w-3.5 h-3.5 text-teal-600" />
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100">v{vh.version}</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{vh.versionNote}</span>
                    </div>
                    <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                      {formatEthiopianDate(vh.changedAt, language, true)}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400">
                    Changed by <strong>{vh.changedByName}</strong> · Reason: {vh.reason} · Status: <strong>{vh.status}</strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer w/ Mandatory Justification */}
        {!isReadOnly && (
          <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 space-y-3 shrink-0 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('justificationMin10')} *
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Provide audit justification (minimum 10 characters)..."
                  className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Version Release Note
                </label>
                <input
                  type="text"
                  value={versionNote}
                  onChange={(e) => setVersionNote(e.target.value)}
                  placeholder="e.g. Q2 governance alignment"
                  className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-semibold"
              >
                {t('cancel')}
              </button>
              {!initialRole?.isSystemRole && (
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleSubmit('Draft')}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg font-semibold disabled:opacity-50"
                >
                  Save as Draft
                </button>
              )}
              <button
                type="button"
                disabled={isSaving}
                onClick={() => handleSubmit('Active')}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Publishing...' : 'Publish Role'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
