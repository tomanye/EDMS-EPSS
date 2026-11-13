import React, { useMemo, useState } from 'react';
import {
  Building2,
  DoorOpen,
  Archive,
  Layers,
  Box,
  ChevronRight,
  ChevronDown,
  Plus,
  Pencil,
  Trash2,
  X,
  AlertCircle
} from 'lucide-react';
import {
  Branch,
  Language,
  PhysicalFileRecord,
  PhysicalLocationLevel,
  PhysicalLocationNode
} from '../../types/index.js';

interface LocationHierarchyTreeProps {
  locations: PhysicalLocationNode[];
  files: PhysicalFileRecord[];
  branches: Branch[];
  language: Language;
  canManage: boolean;
  onRefresh: () => Promise<void>;
  onNotify: (type: 'success' | 'error', message: string) => void;
}

const NEXT_LEVEL: Record<PhysicalLocationLevel, PhysicalLocationLevel | null> = {
  Building: 'Room',
  Room: 'Cabinet',
  Cabinet: 'Shelf',
  Shelf: 'Box',
  Box: null
};

const LEVEL_ICON: Record<PhysicalLocationLevel, React.ReactNode> = {
  Building: <Building2 className="w-4 h-4 text-teal-700 dark:text-teal-400" />,
  Room: <DoorOpen className="w-4 h-4 text-sky-700 dark:text-sky-400" />,
  Cabinet: <Archive className="w-4 h-4 text-indigo-700 dark:text-indigo-400" />,
  Shelf: <Layers className="w-4 h-4 text-amber-700 dark:text-amber-400" />,
  Box: <Box className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
};

export const LocationHierarchyTree: React.FC<LocationHierarchyTreeProps> = ({
  locations,
  files,
  branches,
  language,
  canManage,
  onRefresh,
  onNotify
}) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    locations.forEach((l) => {
      if (l.level === 'Building' || l.level === 'Room' || l.level === 'Cabinet') {
        initial.add(l.id);
      }
    });
    return initial;
  });

  const [formModal, setFormModal] = useState<{
    mode: 'create' | 'edit';
    level: PhysicalLocationLevel;
    parentId: string | null;
    parentName?: string;
    editingNode?: PhysicalLocationNode;
  } | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<PhysicalLocationNode | null>(null);

  const [codeInput, setCodeInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [branchIdInput, setBranchIdInput] = useState('br-hq');
  const [capacityInput, setCapacityInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const childrenByParent = useMemo(() => {
    const map = new Map<string, PhysicalLocationNode[]>();
    for (const loc of locations) {
      const key = loc.parentId || '__ROOT__';
      const list = map.get(key) || [];
      list.push(loc);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.code.localeCompare(b.code));
    }
    return map;
  }, [locations]);

  const directFileCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const f of files) {
      map.set(f.locationId, (map.get(f.locationId) || 0) + 1);
    }
    return map;
  }, [files]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openCreateModal = (level: PhysicalLocationLevel, parentId: string | null, parentName?: string) => {
    setCodeInput('');
    setNameInput('');
    setBranchIdInput('br-hq');
    setCapacityInput(level === 'Box' ? '60' : '');
    setNotesInput('');
    setFormError('');
    setFormModal({ mode: 'create', level, parentId, parentName });
  };

  const openEditModal = (node: PhysicalLocationNode) => {
    setCodeInput(node.code);
    setNameInput(node.name);
    setBranchIdInput(node.branchId || 'br-hq');
    setCapacityInput(node.capacity ? String(node.capacity) : '');
    setNotesInput(node.notes || '');
    setFormError('');
    setFormModal({ mode: 'edit', level: node.level, parentId: node.parentId, editingNode: node });
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formModal) return;
    setFormError('');
    setIsSubmitting(true);
    try {
      const isCreate = formModal.mode === 'create';
      const url = isCreate
        ? '/api/v1/tracking/locations'
        : `/api/v1/tracking/locations/${formModal.editingNode!.id}`;
      const res = await fetch(url, {
        method: isCreate ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: codeInput.trim(),
          name: nameInput.trim(),
          level: formModal.level,
          parentId: formModal.parentId,
          branchId: branchIdInput,
          capacity: capacityInput ? Number(capacityInput) : undefined,
          notes: notesInput.trim() || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Failed to save location');
        return;
      }
      if (formModal.parentId) {
        setExpandedIds((prev) => new Set(prev).add(formModal.parentId!));
      }
      await onRefresh();
      onNotify('success', isCreate ? `Created ${formModal.level} ${data.code}` : `Updated ${data.code}`);
      setFormModal(null);
    } catch (err: any) {
      setFormError(err.message || 'Network error while saving location');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/v1/tracking/locations/${deleteTarget.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) {
        onNotify('error', data.error || 'Could not delete location');
        setDeleteTarget(null);
        return;
      }
      await onRefresh();
      onNotify('success', `Deleted ${deleteTarget.level} "${deleteTarget.name}"`);
      setDeleteTarget(null);
    } catch (err: any) {
      onNotify('error', err.message || 'Delete failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderNode = (node: PhysicalLocationNode, depth: number) => {
    const children = childrenByParent.get(node.id) || [];
    const isExpanded = expandedIds.has(node.id);
    const nextLvl = NEXT_LEVEL[node.level];
    const directCount = directFileCounts.get(node.id) || 0;

    return (
      <div key={node.id} className="select-none">
        <div
          className="group flex flex-wrap items-center justify-between gap-2 py-2 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800/70 transition-colors"
          style={{ paddingLeft: `${12 + depth * 22}px` }}
        >
          <div className="flex items-center gap-2 min-w-0">
            {children.length > 0 || nextLvl ? (
              <button
                type="button"
                onClick={() => toggleExpand(node.id)}
                className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded"
                aria-label={isExpanded ? 'Collapse level' : 'Expand level'}
              >
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            ) : (
              <span className="w-4 inline-block" />
            )}

            {LEVEL_ICON[node.level]}

            <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100 tabular-nums">
              {node.code}
            </span>
            <span className="text-slate-300 dark:text-slate-700">·</span>
            <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
              {node.name}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {node.level}
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px]">
            {node.capacity ? (
              <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400">
                {directCount} / {node.capacity} files
              </span>
            ) : (
              <span className="font-mono tabular-nums text-slate-400 dark:text-slate-500">
                {children.length} {children.length === 1 ? 'child' : 'children'}
              </span>
            )}

            {canManage && (
              <div className="flex items-center gap-1">
                {nextLvl && (
                  <button
                    type="button"
                    onClick={() => openCreateModal(nextLvl, node.id, `${node.code} · ${node.name}`)}
                    className="px-2 py-1 text-[11px] font-medium text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/50 rounded flex items-center gap-1"
                    title={`Add ${nextLvl} inside ${node.name}`}
                  >
                    <Plus className="w-3 h-3" />
                    <span>{nextLvl}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => openEditModal(node)}
                  className="p-1 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Edit location"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(node)}
                  className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  title="Delete location"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {isExpanded && children.length > 0 && (
          <div>{children.map((child) => renderNode(child, depth + 1))}</div>
        )}
      </div>
    );
  };

  const rootBuildings = childrenByParent.get('__ROOT__') || [];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
      <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {language === 'am' ? 'የማከማቻ ቦታዎች ተዋረድ' : 'Vault Storage Location Hierarchy'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Building → Room → Cabinet → Shelf → Box · {locations.length} indexed nodes
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setExpandedIds(new Set(locations.map((l) => l.id)))}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
          >
            Expand All
          </button>
          <button
            type="button"
            onClick={() => setExpandedIds(new Set())}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
          >
            Collapse All
          </button>
          {canManage && (
            <button
              type="button"
              onClick={() => openCreateModal('Building', null)}
              className="px-3 py-1.5 text-xs font-semibold bg-teal-700 hover:bg-teal-800 text-white rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Building</span>
            </button>
          )}
        </div>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {rootBuildings.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-500">
            No storage buildings configured yet. Add a root building to begin structuring archival vaults.
          </div>
        ) : (
          rootBuildings.map((b) => renderNode(b, 0))
        )}
      </div>

      {/* Create / Edit Location Modal */}
      {formModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-[11px] font-mono uppercase text-teal-700 dark:text-teal-400 font-semibold">
                  {formModal.level} Location
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {formModal.mode === 'create' ? `Add ${formModal.level}` : `Edit ${formModal.level}`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setFormModal(null)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formModal.parentName && (
              <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/70 px-3 py-2 rounded-lg">
                Parent: <strong className="text-slate-900 dark:text-slate-100">{formModal.parentName}</strong>
              </div>
            )}

            {formError && (
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-lg text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitForm} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Location Code <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={30}
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  placeholder={formModal.level === 'Box' ? 'e.g. BOX-QA-2026B' : `e.g. ${formModal.level.toUpperCase().slice(0, 3)}-01`}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-slate-900 dark:text-slate-100"
                />
                <p className="mt-1 text-[11px] text-slate-400">Must be unique within the same parent node (1–30 chars).</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Location Name <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  minLength={2}
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder={`e.g. Cold Chain ${formModal.level} 04`}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              {formModal.level === 'Building' && (
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Branch Hub
                  </label>
                  <select
                    value={branchIdInput}
                    onChange={(e) => setBranchIdInput(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.nameEn}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {formModal.level === 'Box' && (
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Max Dossier Capacity
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={5000}
                    value={capacityInput}
                    onChange={(e) => setCapacityInput(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-slate-900 dark:text-slate-100"
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="Optional archival climate or access restriction note"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setFormModal(null)}
                  className="px-3 py-1.5 font-semibold text-slate-600 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-lg disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Delete {deleteTarget.level}?
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Confirm removing <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{deleteTarget.code}</span> ({deleteTarget.name}). Nodes containing sub-locations or assigned physical files cannot be deleted.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isSubmitting}
                className="px-4 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg disabled:opacity-50"
              >
                {isSubmitting ? 'Deleting...' : 'Delete Node'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
