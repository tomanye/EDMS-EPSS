import React, { useEffect, useState } from 'react';
import { CheckCircle2, Truck, Users, X, AlertTriangle } from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import { apiFetch } from '../../lib/apiFetch.js';
import { BulkOperationResult, DocumentStatus, PriorityLevel, User } from '../../types/index.js';

interface CorrespondenceBulkToolbarProps {
  selectedIds: string[];
  onClearSelection: () => void;
}

export const CorrespondenceBulkToolbar: React.FC<CorrespondenceBulkToolbarProps> = ({
  selectedIds,
  onClearSelection
}) => {
  const { refreshData, setActiveTab } = useApp();
  const [users, setUsers] = useState<User[]>([]);
  const [bulkPriority, setBulkPriority] = useState<PriorityLevel>('Urgent');
  const [bulkStatus, setBulkStatus] = useState<DocumentStatus>('UnderReview');
  const [bulkUserId, setBulkUserId] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (selectedIds.length > 0 && users.length === 0) {
      apiFetch('/api/v1/organizations/users')
        .then(r => (r.ok ? r.json() : []))
        .then(data => {
          const list = Array.isArray(data) ? data.filter((u: User) => u.status !== 'Inactive') : [];
          setUsers(list);
          if (list.length > 0) setBulkUserId(list[0].id);
        })
        .catch(() => {});
    }
  }, [selectedIds.length, users.length]);

  if (selectedIds.length === 0 && !feedback) return null;

  const runBulkAction = async (
    action: 'priority' | 'status' | 'assign',
    payload: Record<string, string>
  ) => {
    try {
      setBusy(true);
      setFeedback(null);
      const res = await apiFetch('/api/v1/correspondence/bulk-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentIds: selectedIds,
          action,
          ...payload
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedback({ ok: false, text: data.error || 'Bulk action failed.' });
        return;
      }
      const outcome = data as BulkOperationResult;
      await refreshData();
      onClearSelection();
      setFeedback({
        ok: outcome.failedCount === 0,
        text: `Batch ${action} applied to ${outcome.succeededCount}/${outcome.totalRequested} records.${
          outcome.failedCount > 0 ? ` (${outcome.failedCount} skipped due to access/policy)` : ''
        }`
      });
    } catch {
      setFeedback({ ok: false, text: 'Network error executing batch operation.' });
    } finally {
      setBusy(false);
    }
  };

  const handleBundleManifest = () => {
    try {
      window.sessionStorage.setItem('epss_pending_transmittal_docs', JSON.stringify(selectedIds));
    } catch {
      // ignore
    }
    setActiveTab('transmittals');
  };

  return (
    <div className="space-y-2">
      {feedback && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
            feedback.ok
              ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-200'
              : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
          }`}
        >
          <span className="flex items-center gap-2 font-medium">
            {feedback.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{feedback.text}</span>
          </span>
          <button type="button" onClick={() => setFeedback(null)}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {selectedIds.length > 0 && (
        <div className="p-3 bg-teal-50/90 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-teal-900 dark:text-teal-200 tabular-nums">
              {selectedIds.length} selected
            </span>
            <button
              type="button"
              onClick={onClearSelection}
              className="text-[11px] text-teal-700 dark:text-teal-400 hover:underline font-medium"
            >
              Clear
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Bulk Priority */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-1">
              <select
                value={bulkPriority}
                onChange={e => setBulkPriority(e.target.value as PriorityLevel)}
                className="bg-transparent text-[11px] px-1.5 py-0.5 text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                <option value="Normal">Normal</option>
                <option value="Urgent">Urgent</option>
                <option value="VeryUrgent">VeryUrgent</option>
              </select>
              <button
                type="button"
                disabled={busy}
                onClick={() => runBulkAction('priority', { priority: bulkPriority })}
                className="px-2 py-1 text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded"
              >
                Set Priority
              </button>
            </div>

            {/* Bulk Status */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-1">
              <select
                value={bulkStatus}
                onChange={e => setBulkStatus(e.target.value as DocumentStatus)}
                className="bg-transparent text-[11px] px-1.5 py-0.5 text-slate-800 dark:text-slate-200 focus:outline-none"
              >
                <option value="UnderReview">UnderReview</option>
                <option value="InProgress">InProgress</option>
                <option value="Forwarded">Forwarded</option>
                <option value="Approved">Approved</option>
                <option value="Dispatched">Dispatched</option>
                <option value="Completed">Completed</option>
              </select>
              <button
                type="button"
                disabled={busy}
                onClick={() => runBulkAction('status', { status: bulkStatus })}
                className="px-2 py-1 text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded"
              >
                Update Status
              </button>
            </div>

            {/* Bulk Assign */}
            {users.length > 0 && (
              <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-1">
                <select
                  value={bulkUserId}
                  onChange={e => setBulkUserId(e.target.value)}
                  className="bg-transparent text-[11px] px-1.5 py-0.5 text-slate-800 dark:text-slate-200 focus:outline-none max-w-[140px]"
                >
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.fullNameEn}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={busy || !bulkUserId}
                  onClick={() => runBulkAction('assign', { assignedToUserId: bulkUserId })}
                  className="px-2 py-1 text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded inline-flex items-center gap-1"
                >
                  <Users className="w-3 h-3" />
                  <span>Assign</span>
                </button>
              </div>
            )}

            {/* Bundle into Official Transmittal Manifest */}
            <button
              type="button"
              onClick={handleBundleManifest}
              className="px-3 py-1.5 text-[11px] font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg inline-flex items-center gap-1.5"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Bundle Transmittal</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
