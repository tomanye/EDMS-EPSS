import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Save,
  AlertTriangle,
  CheckCircle2,
  GitBranch,
  Users,
  Clock,
  ShieldCheck,
  Sliders
} from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import {
  DocumentType,
  User,
  UserRole,
  WorkflowAssigneeType,
  WorkflowConditionRule,
  WorkflowDefinition,
  WorkflowPathMode,
  WorkflowStageConfig,
  WorkflowStageType
} from '../../types/index.js';

interface WorkflowDesignerViewProps {
  definitions: WorkflowDefinition[];
  users: User[];
  onRefresh: () => Promise<void>;
}

const DOC_TYPES: DocumentType[] = [
  'IncomingLetter',
  'OutgoingLetter',
  'InternalMemo',
  'Application',
  'TenderDocument',
  'InspectionReport',
  'Circular'
];

const ROLES: UserRole[] = [
  'SuperAdmin',
  'DirectorGeneral',
  'Director',
  'RegistryOfficer',
  'BranchManager',
  'ProcurementOfficer',
  'Auditor'
];

const PERMISSIONS_LIST = [
  'read:documents',
  'create:documents',
  'edit:documents',
  'approve:workflows',
  'manage:archives',
  'track:physical'
];

const STAGE_TYPES: WorkflowStageType[] = [
  'Start',
  'Review',
  'Approval',
  'ParallelApproval',
  'Conditional',
  'Dispatch',
  'End'
];

const PATH_MODES: WorkflowPathMode[] = ['Sequential', 'Parallel', 'Conditional'];

const ASSIGNEE_TYPES: { value: WorkflowAssigneeType; label: string }[] = [
  { value: 'Role', label: 'By Role' },
  { value: 'DepartmentHead', label: 'Directorate Head' },
  { value: 'BranchManager', label: 'Branch Manager' },
  { value: 'SpecificUser', label: 'Specific Staff Member' },
  { value: 'Initiator', label: 'Document Initiator / Registrar' }
];

export const WorkflowDesignerView: React.FC<WorkflowDesignerViewProps> = ({
  definitions,
  users,
  onRefresh
}) => {
  const { currentUser, departments, language } = useApp();
  const canEdit =
    currentUser?.role === 'SuperAdmin' ||
    currentUser?.role === 'DirectorGeneral' ||
    currentUser?.role === 'Director';

  const [selectedId, setSelectedId] = useState<string>(definitions[0]?.id || 'new');
  const [draft, setDraft] = useState<WorkflowDefinition>(() =>
    definitions[0]
      ? structuredClone(definitions[0])
      : createBlankDefinition()
  );
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [expandedStageId, setExpandedStageId] = useState<string | null>(
    definitions[0]?.stages[0]?.id || null
  );
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  function createBlankDefinition(): WorkflowDefinition {
    const now = new Date().toISOString();
    const s1 = `stg-${Date.now()}-1`;
    const s2 = `stg-${Date.now()}-2`;
    return {
      id: 'new',
      code: `WF-${Math.floor(100 + Math.random() * 899)}`,
      nameEn: 'New Correspondence Workflow',
      nameAm: 'አዲስ የሥራ ፍሰት',
      descriptionEn: 'Custom sequential and approval workflow configuration.',
      documentTypes: ['IncomingLetter'],
      isActive: true,
      version: 1,
      createdAt: now,
      updatedAt: now,
      createdBy: currentUser?.id || 'usr-admin',
      stages: [
        {
          id: s1,
          order: 1,
          nameEn: 'Intake & Registration',
          nameAm: 'ምዝገባ',
          stageType: 'Start',
          pathMode: 'Sequential',
          isMandatory: true,
          assigneeType: 'Role',
          assigneeRole: 'RegistryOfficer',
          requiredPermission: 'create:documents',
          slaHours: 4,
          requiredFields: ['comments'],
          requireBiometricForSensitive: false,
          escalationTargetRole: 'Director'
        },
        {
          id: s2,
          order: 2,
          nameEn: 'Final Sign-off & Closure',
          nameAm: 'መዝጊያ',
          stageType: 'End',
          pathMode: 'Sequential',
          isMandatory: true,
          assigneeType: 'Role',
          assigneeRole: 'DirectorGeneral',
          requiredPermission: 'approve:workflows',
          slaHours: 24,
          requiredFields: ['comments'],
          requireBiometricForSensitive: true,
          escalationTargetRole: 'DirectorGeneral'
        }
      ]
    };
  }

  const handleSelectDefinition = (def: WorkflowDefinition) => {
    setSelectedId(def.id);
    setDraft(structuredClone(def));
    setExpandedStageId(def.stages[0]?.id || null);
    setStatusMsg(null);
  };

  const handleNewWorkflow = () => {
    const blank = createBlankDefinition();
    setSelectedId('new');
    setDraft(blank);
    setExpandedStageId(blank.stages[0]?.id || null);
    setStatusMsg(null);
  };

  const updateStagesOrder = (nextStages: WorkflowStageConfig[]) => {
    const reindexed = nextStages.map((s, idx) => ({ ...s, order: idx + 1 }));
    setDraft(prev => ({ ...prev, stages: reindexed }));
  };

  const handleMoveStage = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= draft.stages.length) return;
    const copy = [...draft.stages];
    const [item] = copy.splice(index, 1);
    copy.splice(target, 0, item);
    updateStagesOrder(copy);
  };

  const handleDropStage = (dropIndex: number) => {
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null);
      return;
    }
    const copy = [...draft.stages];
    const [dragged] = copy.splice(dragIndex, 1);
    copy.splice(dropIndex, 0, dragged);
    updateStagesOrder(copy);
    setDragIndex(null);
  };

  const handleAddStage = () => {
    const newStage: WorkflowStageConfig = {
      id: `stg-${Date.now().toString(36)}`,
      order: draft.stages.length,
      nameEn: 'Directorate Review Stage',
      nameAm: 'የዳይሬክቶሬት ግምገማ ደረጃ',
      stageType: 'Review',
      pathMode: 'Sequential',
      isMandatory: true,
      assigneeType: 'DepartmentHead',
      assigneeRole: 'Director',
      requiredPermission: 'edit:documents',
      slaHours: 24,
      requiredFields: ['comments'],
      requireBiometricForSensitive: false,
      escalationTargetRole: 'DirectorGeneral'
    };
    const copy = [...draft.stages];
    // Insert right before the final End stage when possible
    const insertAt = Math.max(1, copy.length - 1);
    copy.splice(insertAt, 0, newStage);
    updateStagesOrder(copy);
    setExpandedStageId(newStage.id);
  };

  const handleRemoveStage = (stageId: string) => {
    if (draft.stages.length <= 2) {
      setStatusMsg({
        type: 'error',
        text: 'Workflow must retain at least two stages (Start and End).'
      });
      return;
    }
    const filtered = draft.stages.filter(s => s.id !== stageId);
    updateStagesOrder(filtered);
    setStatusMsg(null);
  };

  const updateStage = (stageId: string, patch: Partial<WorkflowStageConfig>) => {
    setDraft(prev => ({
      ...prev,
      stages: prev.stages.map(s => (s.id === stageId ? { ...s, ...patch } : s))
    }));
  };

  const toggleDocType = (dt: DocumentType) => {
    setDraft(prev => {
      const exists = prev.documentTypes.includes(dt);
      const next = exists ? prev.documentTypes.filter(t => t !== dt) : [...prev.documentTypes, dt];
      return { ...prev, documentTypes: next.length > 0 ? next : [dt] };
    });
  };

  const toggleRequiredField = (stageId: string, field: string) => {
    const st = draft.stages.find(s => s.id === stageId);
    if (!st) return;
    const curr = st.requiredFields || [];
    const next = curr.includes(field) ? curr.filter(f => f !== field) : [...curr, field];
    updateStage(stageId, { requiredFields: next });
  };

  const toggleParallelApprover = (stageId: string, userId: string) => {
    const st = draft.stages.find(s => s.id === stageId);
    if (!st) return;
    const curr = st.parallelApproverIds || [];
    const next = curr.includes(userId) ? curr.filter(id => id !== userId) : [...curr, userId];
    updateStage(stageId, { parallelApproverIds: next });
  };

  const addConditionRule = (stageId: string) => {
    const st = draft.stages.find(s => s.id === stageId);
    if (!st) return;
    const laterStages = draft.stages.filter(s => s.order > st.order);
    const fallbackTarget = laterStages[laterStages.length - 1]?.id || draft.stages[draft.stages.length - 1]?.id;
    const rule: WorkflowConditionRule = {
      id: `cond-${Date.now().toString(36)}`,
      field: 'priority',
      operator: 'equals',
      value: 'VeryUrgent',
      targetStageId: fallbackTarget
    };
    updateStage(stageId, { conditions: [...(st.conditions || []), rule] });
  };

  const updateConditionRule = (stageId: string, condId: string, patch: Partial<WorkflowConditionRule>) => {
    const st = draft.stages.find(s => s.id === stageId);
    if (!st) return;
    updateStage(stageId, {
      conditions: (st.conditions || []).map(c => (c.id === condId ? { ...c, ...patch } : c))
    });
  };

  const removeConditionRule = (stageId: string, condId: string) => {
    const st = draft.stages.find(s => s.id === stageId);
    if (!st) return;
    updateStage(stageId, {
      conditions: (st.conditions || []).filter(c => c.id !== condId)
    });
  };

  // Live validation checks
  const validationErrors: string[] = [];
  if (!draft.nameEn.trim() || draft.nameEn.trim().length < 3) {
    validationErrors.push('Workflow title must be at least 3 characters.');
  }
  if (draft.stages.length < 2) {
    validationErrors.push('Workflow must have at least 2 stages (Start -> End).');
  } else {
    if (draft.stages[0].stageType !== 'Start') {
      validationErrors.push('First stage must be Start.');
    }
    if (draft.stages[draft.stages.length - 1].stageType !== 'End') {
      validationErrors.push('Last stage must be End.');
    }
  }
  for (const st of draft.stages) {
    if (!st.slaHours || st.slaHours <= 0) {
      validationErrors.push(`Stage "${st.nameEn || st.order}" must have SLA hours > 0.`);
    }
    if ((st.pathMode === 'Parallel' || st.stageType === 'ParallelApproval') && (st.parallelApproverIds?.length || 0) < 2) {
      validationErrors.push(`Parallel stage "${st.nameEn}" requires at least 2 approvers.`);
    }
  }

  const handleSave = async () => {
    setStatusMsg(null);
    if (validationErrors.length > 0) {
      setStatusMsg({ type: 'error', text: validationErrors[0] });
      return;
    }

    try {
      setSaving(true);
      const isNew = selectedId === 'new';
      const url = isNew ? '/api/v1/workflows/definitions' : `/api/v1/workflows/definitions/${draft.id}`;
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft)
      });
      const data = await res.json();
      if (!res.ok) {
        setStatusMsg({ type: 'error', text: data.error || 'Failed to save workflow definition.' });
        return;
      }
      setStatusMsg({
        type: 'success',
        text: isNew ? 'Workflow definition created.' : `Saved ${data.code} (v${data.version}).`
      });
      setSelectedId(data.id);
      setDraft(structuredClone(data));
      await onRefresh();
    } catch {
      setStatusMsg({ type: 'error', text: 'Network error while saving workflow definition.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (selectedId === 'new') return;
    try {
      setSaving(true);
      const res = await fetch(`/api/v1/workflows/definitions/${draft.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setStatusMsg({ type: 'error', text: data.error || 'Cannot delete workflow definition.' });
        return;
      }
      setStatusMsg({ type: 'success', text: 'Workflow definition deleted.' });
      await onRefresh();
      const next = definitions.find(d => d.id !== draft.id);
      if (next) handleSelectDefinition(next);
      else handleNewWorkflow();
    } catch {
      setStatusMsg({ type: 'error', text: 'Failed to delete workflow definition.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Column: Workflow Catalog */}
      <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {language === 'am' ? 'የሥራ ፍሰት ንድፎች' : 'Workflow Definitions'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
              {definitions.length} configured templates
            </p>
          </div>
          {canEdit && (
            <button
              type="button"
              onClick={handleNewWorkflow}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500 rounded-lg flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Flow</span>
            </button>
          )}
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {definitions.map(def => {
            const isSelected = selectedId === def.id;
            const totalSla = def.stages.reduce((acc, s) => acc + s.slaHours, 0);
            return (
              <button
                key={def.id}
                type="button"
                onClick={() => handleSelectDefinition(def)}
                className={`w-full text-left p-4 transition-colors ${
                  isSelected
                    ? 'bg-teal-50/70 dark:bg-teal-950/40'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-mono font-bold text-teal-700 dark:text-teal-400">
                    {def.code} · v{def.version}
                  </span>
                  <span
                    className={`text-xs font-medium ${
                      def.isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-400'
                    }`}
                  >
                    {def.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 mt-1">
                  {language === 'am' ? def.nameAm : def.nameEn}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1.5 tabular-nums">
                  <span>{def.stages.length} stages</span>
                  <span aria-hidden="true">·</span>
                  <span>{totalSla}h max SLA</span>
                  <span aria-hidden="true">·</span>
                  <span className="truncate">{def.documentTypes.join(', ')}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Column: Visual Stage Designer */}
      <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400">
              <GitBranch className="w-3.5 h-3.5 text-teal-600" />
              <span>{draft.code}</span>
              <span aria-hidden="true">·</span>
              <span>Version {draft.version}</span>
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
              {selectedId === 'new' ? 'Create New Workflow Definition' : draft.nameEn}
            </h2>
          </div>

          {canEdit && (
            <div className="flex items-center gap-2 shrink-0">
              {selectedId !== 'new' && currentUser?.role === 'SuperAdmin' && (
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving}
                  className="px-3 py-2 text-xs font-semibold text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors whitespace-nowrap"
                >
                  Delete
                </button>
              )}
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500 rounded-lg flex items-center gap-1.5 whitespace-nowrap transition-colors disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Saving...' : 'Save Workflow'}</span>
              </button>
            </div>
          )}
        </div>

        {statusMsg && (
          <div
            className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
              statusMsg.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300'
            }`}
          >
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {validationErrors.length > 0 && (
          <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 text-xs text-amber-800 dark:text-amber-300 space-y-1">
            <div className="font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Workflow Integrity Rules</span>
            </div>
            <ul className="list-disc pl-5 space-y-0.5">
              {validationErrors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Workflow Metadata */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Workflow Name (English)
            </label>
            <input
              type="text"
              value={draft.nameEn}
              disabled={!canEdit}
              onChange={e => setDraft(prev => ({ ...prev, nameEn: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Workflow Name (Amharic)
            </label>
            <input
              type="text"
              value={draft.nameAm}
              disabled={!canEdit}
              onChange={e => setDraft(prev => ({ ...prev, nameAm: e.target.value }))}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Workflow Code
            </label>
            <input
              type="text"
              value={draft.code}
              disabled={!canEdit}
              onChange={e => setDraft(prev => ({ ...prev, code: e.target.value }))}
              className="w-full px-3 py-2 font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
            />
          </div>
          <div className="flex items-end pb-1.5">
            <label className="inline-flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300 font-semibold">
              <input
                type="checkbox"
                checked={draft.isActive}
                disabled={!canEdit}
                onChange={e => setDraft(prev => ({ ...prev, isActive: e.target.checked }))}
                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
              />
              <span>Active for Automatic Document Routing</span>
            </label>
          </div>
          <div className="md:col-span-2">
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Bound Correspondence Types
            </label>
            <div className="flex flex-wrap gap-2">
              {DOC_TYPES.map(dt => {
                const active = draft.documentTypes.includes(dt);
                return (
                  <button
                    key={dt}
                    type="button"
                    disabled={!canEdit}
                    onClick={() => toggleDocType(dt)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-teal-700 text-white border-teal-700 dark:bg-teal-600 dark:border-teal-600'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {dt}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Stages Pipeline (Drag to Reorder) */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Stage Pipeline ({draft.stages.length} Stages)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Drag stages or use arrows to reorder. Start must precede End; SLA must exceed 0 hours.
              </p>
            </div>
            {canEdit && (
              <button
                type="button"
                onClick={handleAddStage}
                className="px-3 py-1.5 text-xs font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/50 hover:bg-teal-100 dark:hover:bg-teal-900/50 border border-teal-200 dark:border-teal-800 rounded-lg flex items-center gap-1.5 whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Stage</span>
              </button>
            )}
          </div>

          <div className="space-y-3">
            {draft.stages.map((stage, idx) => {
              const isExpanded = expandedStageId === stage.id;
              return (
                <div
                  key={stage.id}
                  draggable={canEdit}
                  onDragStart={() => setDragIndex(idx)}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => handleDropStage(idx)}
                  className={`rounded-xl border transition-colors ${
                    dragIndex === idx
                      ? 'border-teal-500 bg-teal-50/40 dark:bg-teal-950/20'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30'
                  }`}
                >
                  {/* Stage Header Row */}
                  <div className="px-4 py-3 flex items-center justify-between gap-3">
                    <div
                      onClick={() => setExpandedStageId(isExpanded ? null : stage.id)}
                      className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                    >
                      {canEdit && <GripVertical className="w-4 h-4 text-slate-400 shrink-0 cursor-grab" />}
                      <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400 tabular-nums w-6">
                        {String(idx + 1).padStart(2, '0')}.
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {stage.nameEn}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                          <span>{stage.stageType}</span>
                          <span aria-hidden="true">·</span>
                          <span>{stage.pathMode}</span>
                          <span aria-hidden="true">·</span>
                          <span>{stage.assigneeType}</span>
                          <span aria-hidden="true">·</span>
                          <span>{stage.slaHours}h SLA</span>
                          <span aria-hidden="true">·</span>
                          <span>{stage.isMandatory ? 'Mandatory' : 'Optional'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {canEdit && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleMoveStage(idx, -1)}
                            disabled={idx === 0}
                            className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-30 rounded-md"
                            title="Move Up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveStage(idx, 1)}
                            disabled={idx === draft.stages.length - 1}
                            className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-30 rounded-md"
                            title="Move Down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveStage(stage.id)}
                            disabled={draft.stages.length <= 2}
                            className="p-1.5 text-slate-500 hover:text-rose-600 disabled:opacity-30 rounded-md"
                            title="Remove Stage"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => setExpandedStageId(isExpanded ? null : stage.id)}
                        className="px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700/60 rounded-md"
                      >
                        {isExpanded ? 'Collapse' : 'Configure'}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Stage Config */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-3 border-t border-slate-200 dark:border-slate-700/70 space-y-4 text-xs bg-white dark:bg-slate-900 rounded-b-xl">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Stage Name (EN)
                          </label>
                          <input
                            type="text"
                            disabled={!canEdit}
                            value={stage.nameEn}
                            onChange={e => updateStage(stage.id, { nameEn: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Stage Type
                          </label>
                          <select
                            disabled={!canEdit}
                            value={stage.stageType}
                            onChange={e => updateStage(stage.id, { stageType: e.target.value as WorkflowStageType })}
                            className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                          >
                            {STAGE_TYPES.map(st => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Path Mode
                          </label>
                          <select
                            disabled={!canEdit}
                            value={stage.pathMode}
                            onChange={e => updateStage(stage.id, { pathMode: e.target.value as WorkflowPathMode })}
                            className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                          >
                            {PATH_MODES.map(pm => (
                              <option key={pm} value={pm}>
                                {pm}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Assignment Rule
                          </label>
                          <select
                            disabled={!canEdit}
                            value={stage.assigneeType}
                            onChange={e =>
                              updateStage(stage.id, { assigneeType: e.target.value as WorkflowAssigneeType })
                            }
                            className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                          >
                            {ASSIGNEE_TYPES.map(at => (
                              <option key={at.value} value={at.value}>
                                {at.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {stage.assigneeType === 'SpecificUser' ? (
                          <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                              Assigned Staff Member
                            </label>
                            <select
                              disabled={!canEdit}
                              value={stage.assigneeUserId || ''}
                              onChange={e => updateStage(stage.id, { assigneeUserId: e.target.value })}
                              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                            >
                              <option value="">Select staff...</option>
                              {users
                                .filter(u => u.status === 'Active')
                                .map(u => (
                                  <option key={u.id} value={u.id}>
                                    {u.fullNameEn} ({u.role})
                                  </option>
                                ))}
                            </select>
                          </div>
                        ) : stage.assigneeType === 'DepartmentHead' ? (
                          <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                              Override Directorate (Optional)
                            </label>
                            <select
                              disabled={!canEdit}
                              value={stage.assigneeDepartmentId || ''}
                              onChange={e => updateStage(stage.id, { assigneeDepartmentId: e.target.value })}
                              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                            >
                              <option value="">Use Document Directorate</option>
                              {departments.map(d => (
                                <option key={d.id} value={d.id}>
                                  {d.nameEn}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <div>
                            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                              Assignee Role
                            </label>
                            <select
                              disabled={!canEdit}
                              value={stage.assigneeRole || 'Director'}
                              onChange={e => updateStage(stage.id, { assigneeRole: e.target.value as UserRole })}
                              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                            >
                              {ROLES.map(r => (
                                <option key={r} value={r}>
                                  {r}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Required Permission
                          </label>
                          <select
                            disabled={!canEdit}
                            value={stage.requiredPermission}
                            onChange={e => updateStage(stage.id, { requiredPermission: e.target.value })}
                            className="w-full px-2.5 py-1.5 font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                          >
                            {PERMISSIONS_LIST.map(p => (
                              <option key={p} value={p}>
                                {p}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            SLA Hours (&gt; 0)
                          </label>
                          <div className="relative">
                            <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                            <input
                              type="number"
                              min={1}
                              disabled={!canEdit}
                              value={stage.slaHours}
                              onChange={e =>
                                updateStage(stage.id, { slaHours: Math.max(0, Number(e.target.value) || 0) })
                              }
                              className="w-full pl-8 pr-2.5 py-1.5 font-mono tabular-nums bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Escalation Target Role
                          </label>
                          <select
                            disabled={!canEdit}
                            value={stage.escalationTargetRole || 'DirectorGeneral'}
                            onChange={e =>
                              updateStage(stage.id, { escalationTargetRole: e.target.value as UserRole })
                            }
                            className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                          >
                            {ROLES.map(r => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex flex-col justify-end gap-1.5 pb-1">
                          <label className="inline-flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              disabled={!canEdit}
                              checked={stage.isMandatory}
                              onChange={e => updateStage(stage.id, { isMandatory: e.target.checked })}
                              className="rounded border-slate-300 text-teal-600"
                            />
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              Mandatory Stage (No Skip)
                            </span>
                          </label>
                          <label className="inline-flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              disabled={!canEdit}
                              checked={stage.requireBiometricForSensitive}
                              onChange={e =>
                                updateStage(stage.id, { requireBiometricForSensitive: e.target.checked })
                              }
                              className="rounded border-slate-300 text-teal-600"
                            />
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              Biometric Gate for Approval
                            </span>
                          </label>
                        </div>
                      </div>

                      {/* Required Fields */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                          Required Fields Before Transition
                        </span>
                        <div className="flex flex-wrap gap-4">
                          {['comments', 'attachment', 'digitalSignature'].map(rf => (
                            <label key={rf} className="inline-flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                disabled={!canEdit}
                                checked={(stage.requiredFields || []).includes(rf)}
                                onChange={() => toggleRequiredField(stage.id, rf)}
                                className="rounded border-slate-300 text-teal-600"
                              />
                              <span className="text-slate-600 dark:text-slate-300 capitalize">{rf}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Parallel Approvers */}
                      {(stage.pathMode === 'Parallel' || stage.stageType === 'ParallelApproval') && (
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                          <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-1.5">
                            <Users className="w-3.5 h-3.5 text-teal-600" />
                            <span>Parallel Approvers (All selected must approve to advance)</span>
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {users
                              .filter(u => u.status === 'Active')
                              .map(u => {
                                const selected = (stage.parallelApproverIds || []).includes(u.id);
                                return (
                                  <label
                                    key={u.id}
                                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer ${
                                      selected
                                        ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/30'
                                        : 'border-slate-200 dark:border-slate-700'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      disabled={!canEdit}
                                      checked={selected}
                                      onChange={() => toggleParallelApprover(stage.id, u.id)}
                                      className="rounded border-slate-300 text-teal-600"
                                    />
                                    <span className="truncate font-medium text-slate-800 dark:text-slate-200">
                                      {u.fullNameEn}
                                    </span>
                                    <span className="text-slate-400 ml-auto font-mono">{u.role}</span>
                                  </label>
                                );
                              })}
                          </div>
                        </div>
                      )}

                      {/* Conditional Routing Rules */}
                      {(stage.pathMode === 'Conditional' || stage.stageType === 'Conditional') && (
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                              <Sliders className="w-3.5 h-3.5 text-teal-600" />
                              <span>Conditional Branching Rules</span>
                            </span>
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => addConditionRule(stage.id)}
                                className="text-teal-700 dark:text-teal-400 hover:underline font-semibold"
                              >
                                + Add Rule
                              </button>
                            )}
                          </div>
                          {(stage.conditions || []).length === 0 ? (
                            <p className="text-slate-400">No conditional branches; proceeds sequentially.</p>
                          ) : (
                            (stage.conditions || []).map(cond => (
                              <div
                                key={cond.id}
                                className="flex flex-wrap items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
                              >
                                <span className="text-slate-500">If</span>
                                <select
                                  disabled={!canEdit}
                                  value={cond.field}
                                  onChange={e =>
                                    updateConditionRule(stage.id, cond.id, {
                                      field: e.target.value as WorkflowConditionRule['field']
                                    })
                                  }
                                  className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded"
                                >
                                  <option value="priority">priority</option>
                                  <option value="confidentiality">confidentiality</option>
                                  <option value="type">type</option>
                                </select>
                                <select
                                  disabled={!canEdit}
                                  value={cond.operator}
                                  onChange={e =>
                                    updateConditionRule(stage.id, cond.id, {
                                      operator: e.target.value as 'equals' | 'notEquals'
                                    })
                                  }
                                  className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded"
                                >
                                  <option value="equals">equals</option>
                                  <option value="notEquals">not equals</option>
                                </select>
                                <input
                                  type="text"
                                  disabled={!canEdit}
                                  value={cond.value}
                                  onChange={e => updateConditionRule(stage.id, cond.id, { value: e.target.value })}
                                  className="px-2 py-1 w-28 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded"
                                />
                                <span className="text-slate-500">route to</span>
                                <select
                                  disabled={!canEdit}
                                  value={cond.targetStageId}
                                  onChange={e =>
                                    updateConditionRule(stage.id, cond.id, { targetStageId: e.target.value })
                                  }
                                  className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded flex-1 min-w-[140px]"
                                >
                                  {draft.stages
                                    .filter(s => s.order > stage.order)
                                    .map(target => (
                                      <option key={target.id} value={target.id}>
                                        {target.order}. {target.nameEn}
                                      </option>
                                    ))}
                                </select>
                                {canEdit && (
                                  <button
                                    type="button"
                                    onClick={() => removeConditionRule(stage.id, cond.id)}
                                    className="text-rose-500 hover:text-rose-700 px-1"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
