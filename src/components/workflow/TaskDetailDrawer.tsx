import React, { useRef, useState } from 'react';
import {
  X,
  CheckCircle2,
  XCircle,
  Send,
  CornerUpLeft,
  UserPlus,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Fingerprint,
  Paperclip,
  Upload,
  FileText,
  ExternalLink,
  MessageSquare,
  GitBranch,
  ArrowUpRight
} from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import { formatEthiopianDate } from '../../lib/translations.js';
import { EnrichedWorkflowTask, User } from '../../types/index.js';
import { BiometricVerificationModal } from '../auth/BiometricVerificationModal.js';

interface TaskDetailDrawerProps {
  task: EnrichedWorkflowTask;
  users: User[];
  onClose: () => void;
  onTaskUpdated: (updatedTask?: EnrichedWorkflowTask) => Promise<void>;
}

type ActionOption =
  | 'Approved'
  | 'Forwarded'
  | 'Delegated'
  | 'ReturnedForCorrection'
  | 'Rejected'
  | 'MinuteAdded';

export const TaskDetailDrawer: React.FC<TaskDetailDrawerProps> = ({
  task,
  users,
  onClose,
  onTaskUpdated
}) => {
  const { currentUser, departments, roleMatrix, setSelectedDocument, language, t } = useApp();
  const { instance, definition, currentStage, document: doc } = task;

  const [selectedAction, setSelectedAction] = useState<ActionOption>('Approved');
  const [comments, setComments] = useState('');
  const [forwardDeptId, setForwardDeptId] = useState(doc.departmentId || '');
  const [forwardUserId, setForwardUserId] = useState('');
  const [delegateUserId, setDelegateUserId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Escalation modal / inline section
  const [isEscalateOpen, setIsEscalateOpen] = useState(false);
  const [escalateReason, setEscalateReason] = useState('');
  const [escalateTargetId, setEscalateTargetId] = useState('');

  // Attachment upload
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingAtt, setIsUploadingAtt] = useState(false);

  // Biometric gate
  const [isBiometricOpen, setIsBiometricOpen] = useState(false);

  const isSensitiveApproval =
    doc.confidentiality === 'Secret' ||
    doc.confidentiality === 'Confidential' ||
    doc.priority === 'VeryUrgent' ||
    !!currentStage?.requireBiometricForSensitive;

  const requiresMin10Chars =
    selectedAction === 'Rejected' || selectedAction === 'ReturnedForCorrection';

  const canEscalate =
    instance.status === 'Active' &&
    (['SuperAdmin', 'DirectorGeneral', 'Director', 'BranchManager'].includes(currentUser?.role || '') ||
      task.canAct);

  // Helper to check if a user has the required permission for target stage
  const userHasStagePermission = (u: User, perm: string) => {
    if (u.role === 'SuperAdmin' || u.permissions.includes('*') || u.permissions.includes(perm)) return true;
    const roleEntry = roleMatrix.find(r => r.role === u.role);
    return !!(roleEntry && (roleEntry.permissions.includes('*') || roleEntry.permissions.includes(perm)));
  };

  const requiredPerm = currentStage?.requiredPermission || 'read:documents';
  const eligibleUsers = users.filter(
    u => u.status === 'Active' && u.id !== currentUser?.id && userHasStagePermission(u, requiredPerm)
  );

  const executeAction = async (biometricVerified = false) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (requiresMin10Chars && comments.trim().length < 10) {
      setErrorMsg(
        `${selectedAction === 'Rejected' ? 'Rejection' : 'Return for correction'} requires a comment of at least 10 characters.`
      );
      return;
    }

    if (selectedAction === 'Delegated' && !delegateUserId) {
      setErrorMsg('Please select an active staff member to delegate this task.');
      return;
    }

    if (selectedAction === 'MinuteAdded' && !comments.trim()) {
      setErrorMsg('Please enter a minute note.');
      return;
    }

    try {
      setIsSubmitting(true);
      const bioSuffix = biometricVerified ? ' [Biometrically Verified via WebAuthn]' : '';
      const payload: Record<string, unknown> = {
        action: selectedAction,
        comments: (comments.trim() || `${selectedAction} recorded by ${currentUser?.fullNameEn}`) + bioSuffix
      };

      if (selectedAction === 'Forwarded') {
        payload.forwardToDepartmentId = forwardDeptId;
        if (forwardUserId) payload.forwardToUserId = forwardUserId;
      }
      if (selectedAction === 'Delegated') {
        payload.delegateToUserId = delegateUserId;
      }
      if (selectedAction === 'Approved') {
        payload.digitalSignatureCertificate = `ET-PKI-EPSS-${currentUser?.role.toUpperCase()}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        if (biometricVerified) {
          payload.biometricSignatureVerified = true;
        }
      }

      const res = await fetch(`/api/v1/workflows/instances/${instance.id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.mfaNeeded && selectedAction === 'Approved') {
          setIsBiometricOpen(true);
          return;
        }
        setErrorMsg(data.error || 'Workflow action could not be completed.');
        return;
      }

      setComments('');
      setSuccessMsg(`Action "${selectedAction}" recorded successfully.`);
      await onTaskUpdated(data.task);
    } catch {
      setErrorMsg('Network error while executing workflow action.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedAction === 'Approved' && isSensitiveApproval) {
      setIsBiometricOpen(true);
      return;
    }
    await executeAction(false);
  };

  const handleEscalateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (escalateReason.trim().length < 5) {
      setErrorMsg('Please enter an escalation reason (at least 5 characters).');
      return;
    }
    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/v1/workflows/instances/${instance.id}/escalate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: escalateReason.trim(),
          escalateToUserId: escalateTargetId || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Escalation failed.');
        return;
      }
      setIsEscalateOpen(false);
      setEscalateReason('');
      setSuccessMsg('Task escalated and executive notification dispatched.');
      await onTaskUpdated(data.task);
    } catch {
      setErrorMsg('Network error during escalation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      setIsUploadingAtt(true);
      const fd = new FormData();
      fd.append('file', file);
      fd.append('notes', `Supporting attachment uploaded at stage: ${instance.currentStageName}`);
      const res = await fetch(`/api/v1/workflows/instances/${instance.id}/attachments`, {
        method: 'POST',
        body: fd
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Attachment upload failed.');
        return;
      }
      setSuccessMsg(`Attached "${file.name}" to ${doc.registrationNumber}.`);
      await onTaskUpdated(data.task);
    } catch {
      setErrorMsg('Network error while uploading attachment.');
    } finally {
      setIsUploadingAtt(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const orderedStages = definition ? [...definition.stages].sort((a, b) => a.order - b.order) : [];
  const parallelApprovedCount = instance.parallelApprovals.filter(p => p.status === 'Approved').length;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end">
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl h-full border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden">
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4 shrink-0">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-mono font-bold text-teal-700 dark:text-teal-400 tabular-nums">
                {doc.registrationNumber}
              </span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">{doc.referenceNumber}</span>
              <span aria-hidden="true">·</span>
              <span>{doc.type}</span>
              <span aria-hidden="true">·</span>
              <span
                className={`font-semibold ${
                  doc.priority === 'VeryUrgent'
                    ? 'text-rose-600 dark:text-rose-400'
                    : doc.priority === 'Urgent'
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                {doc.priority}
              </span>
              <span aria-hidden="true">·</span>
              <span>{doc.confidentiality}</span>
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
              {language === 'am' ? doc.subjectAm : doc.subjectEn}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setSelectedDocument(doc)}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg flex items-center gap-1 whitespace-nowrap"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Full Dossier</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg"
              aria-label="Close task detail"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMsg && (
            <div className="p-3 rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-3 rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Stage Progress Strip */}
          {orderedStages.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <GitBranch className="w-3.5 h-3.5 text-teal-600" />
                  <span>{instance.definitionName}</span>
                </span>
                <span className="font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                  Stage {instance.currentStageOrder} of {orderedStages.length}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {orderedStages.map(st => {
                  const isDone = instance.completedStageIds.includes(st.id);
                  const isCurrent = instance.currentStageId === st.id && instance.status === 'Active';
                  return (
                    <div
                      key={st.id}
                      className={`p-2.5 rounded-lg border text-xs ${
                        isCurrent
                          ? 'border-teal-600 bg-teal-50/70 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200'
                          : isDone
                            ? 'border-emerald-200 dark:border-emerald-900/70 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300'
                            : 'border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <div className="font-mono text-[11px] font-bold tabular-nums">
                        {isDone ? '✓ Done' : isCurrent ? '● Active' : `Step ${st.order}`}
                      </div>
                      <div className="font-semibold truncate mt-0.5">{st.nameEn}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Document Summary + SLA & Escalation Box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 text-xs">
            <div className="space-y-1.5">
              <div className="text-slate-500 dark:text-slate-400">Sender / Recipient</div>
              <div className="font-semibold text-slate-900 dark:text-slate-100">
                {doc.senderOrganization} → {doc.recipientOrganization}
              </div>
              <div className="text-slate-500 dark:text-slate-400 pt-1">Current Stage & Routing Mode</div>
              <div className="font-semibold text-slate-900 dark:text-slate-100">
                {instance.currentStageName} ({instance.currentStageMode})
              </div>
              <div className="text-slate-500 dark:text-slate-400 pt-1">Current Assignees</div>
              <div className="font-medium text-slate-800 dark:text-slate-200">
                {task.assignees.length > 0
                  ? task.assignees.map(a => `${a.fullNameEn} (${a.role})`).join(', ')
                  : 'Unassigned'}
              </div>
              {task.actingAsDelegateFor && task.actingAsDelegateFor.length > 0 && (
                <div className="text-teal-700 dark:text-teal-400 font-semibold">
                  Acting under active delegation authority
                </div>
              )}
            </div>

            <div className="space-y-2 sm:border-l sm:border-slate-200 dark:sm:border-slate-700 sm:pl-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">SLA Status</span>
                <span
                  className={`font-mono font-bold tabular-nums flex items-center gap-1 ${
                    task.isOverdue
                      ? 'text-rose-600 dark:text-rose-400'
                      : task.isDueToday
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-emerald-700 dark:text-emerald-400'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  {task.isOverdue
                    ? `Overdue (${Math.abs(task.remainingHours)}h)`
                    : task.isDueToday
                      ? `Due Today (${task.remainingHours}h left)`
                      : `${task.remainingHours}h remaining`}
                </span>
              </div>
              <div className="text-slate-600 dark:text-slate-300 tabular-nums">
                Deadline: {formatEthiopianDate(instance.stageDueAt, language)}
              </div>

              {/* Escalation status & Escalate Now button */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block">Escalation State</span>
                  <span
                    className={`font-semibold ${
                      instance.isEscalated
                        ? 'text-rose-700 dark:text-rose-400'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {instance.isEscalated
                      ? `Escalated · Level ${instance.escalationLevel}`
                      : 'Normal (Not Escalated)'}
                  </span>
                </div>
                {canEscalate && (
                  <button
                    type="button"
                    onClick={() => setIsEscalateOpen(v => !v)}
                    className="px-3 py-1.5 text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 border border-rose-200 dark:border-rose-800 rounded-lg flex items-center gap-1 whitespace-nowrap"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>Escalate Now</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Inline Escalation Form */}
          {isEscalateOpen && (
            <form
              onSubmit={handleEscalateSubmit}
              className="p-4 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20 space-y-3 text-xs"
            >
              <div className="font-bold text-rose-800 dark:text-rose-300">
                Trigger Immediate SLA Escalation
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Escalate To Executive / Supervisor
                  </label>
                  <select
                    value={escalateTargetId}
                    onChange={e => setEscalateTargetId(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  >
                    <option value="">Default Escalation Target (Director General)</option>
                    {users
                      .filter(u => u.status === 'Active' && ['DirectorGeneral', 'Director', 'SuperAdmin'].includes(u.role))
                      .map(u => (
                        <option key={u.id} value={u.id}>
                          {u.fullNameEn} ({u.role})
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Escalation Justification (min 5 chars)
                  </label>
                  <input
                    type="text"
                    value={escalateReason}
                    onChange={e => setEscalateReason(e.target.value)}
                    placeholder="e.g. SLA breached; cold chain clearance urgent..."
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEscalateOpen(false)}
                  className="px-3 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg font-semibold"
                >
                  Confirm Escalation
                </button>
              </div>
            </form>
          )}

          {/* Parallel Approvals Tracker */}
          {instance.parallelApprovals.length > 0 && (
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  Parallel Sign-off Progress ({parallelApprovedCount} / {instance.parallelApprovals.length} Approved)
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  All required approvals must complete before advancing
                </span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {instance.parallelApprovals.map(pa => (
                  <div key={pa.approverId} className="py-2 flex items-center justify-between gap-3">
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{pa.approverName}</span>
                      <span className="text-slate-400 ml-1.5 font-mono">({pa.approverRole})</span>
                      {pa.comments && (
                        <p className="text-slate-500 dark:text-slate-400 mt-0.5">{pa.comments}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span
                        className={`font-semibold ${
                          pa.status === 'Approved'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : pa.status === 'Rejected'
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {pa.status}
                      </span>
                      {pa.timestamp && (
                        <div className="text-[11px] text-slate-400 font-mono tabular-nums">
                          {new Date(pa.timestamp).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stage Decision Execution Panel */}
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Execute Workflow Decision
              </h3>
              {!task.canAct && (
                <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                  Read-only (Only current assignee, active delegate, or admin may decide)
                </span>
              )}
            </div>

            {/* Action Selector Buttons */}
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'Approved' as ActionOption, label: 'Approve', icon: ShieldCheck },
                { id: 'Forwarded' as ActionOption, label: 'Forward', icon: Send },
                { id: 'Delegated' as ActionOption, label: 'Delegate Task', icon: UserPlus },
                { id: 'ReturnedForCorrection' as ActionOption, label: 'Return for Correction', icon: CornerUpLeft },
                { id: 'Rejected' as ActionOption, label: 'Reject', icon: XCircle },
                { id: 'MinuteAdded' as ActionOption, label: 'Add Minute', icon: MessageSquare }
              ].map(btn => {
                const Icon = btn.icon;
                const active = selectedAction === btn.id;
                const disabled = !task.canAct && btn.id !== 'MinuteAdded';
                return (
                  <button
                    key={btn.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      setSelectedAction(btn.id);
                      setErrorMsg(null);
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg border flex items-center gap-1.5 transition-colors whitespace-nowrap disabled:opacity-40 ${
                      active
                        ? btn.id === 'Rejected'
                          ? 'bg-rose-700 text-white border-rose-700'
                          : btn.id === 'ReturnedForCorrection'
                            ? 'bg-amber-600 text-white border-amber-600'
                            : 'bg-teal-700 text-white border-teal-700 dark:bg-teal-600 dark:border-teal-600'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{btn.label}</span>
                  </button>
                );
              })}
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-3 text-xs">
              {selectedAction === 'Forwarded' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Target Directorate
                    </label>
                    <select
                      value={forwardDeptId}
                      onChange={e => setForwardDeptId(e.target.value)}
                      className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                      required
                    >
                      <option value="">Select Directorate...</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>
                          {d.nameEn}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Target Officer (Requires: {requiredPerm})
                    </label>
                    <select
                      value={forwardUserId}
                      onChange={e => setForwardUserId(e.target.value)}
                      className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                    >
                      <option value="">Auto-assign Directorate Head</option>
                      {eligibleUsers.map(u => (
                        <option key={u.id} value={u.id}>
                          {u.fullNameEn} ({u.role})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {selectedAction === 'Delegated' && (
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Delegate Stage Responsibility To (Requires: {requiredPerm})
                  </label>
                  <select
                    value={delegateUserId}
                    onChange={e => setDelegateUserId(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                    required
                  >
                    <option value="">Select eligible staff member...</option>
                    {eligibleUsers.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.fullNameEn} ({u.role} · {u.departmentNameEn})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectedAction === 'Approved' && isSensitiveApproval && (
                <div className="p-3 rounded-lg border border-teal-200 dark:border-teal-900 bg-teal-50/70 dark:bg-teal-950/30 text-teal-900 dark:text-teal-200 flex items-center gap-2">
                  <Fingerprint className="w-4 h-4 shrink-0 text-teal-700 dark:text-teal-400" />
                  <span>
                    Biometric / MFA Gate Active: Approving {doc.confidentiality} / {doc.priority} items requires biometric or Officer PIN confirmation.
                  </span>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    {requiresMin10Chars
                      ? 'Mandatory Justification Comment (min 10 characters)'
                      : 'Decision Rationale / Minute Note'}
                  </label>
                  <span
                    className={`font-mono tabular-nums ${
                      requiresMin10Chars && comments.trim().length < 10
                        ? 'text-amber-600 dark:text-amber-400 font-semibold'
                        : 'text-slate-400'
                    }`}
                  >
                    {comments.trim().length} chars{requiresMin10Chars ? ' / 10 min' : ''}
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={comments}
                  onChange={e => setComments(e.target.value)}
                  placeholder={
                    requiresMin10Chars
                      ? 'Provide clear correction instructions or rejection grounds (minimum 10 characters)...'
                      : 'Enter official comments, directives, or conditions...'
                  }
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
                  required={requiresMin10Chars || selectedAction === 'MinuteAdded'}
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    (!task.canAct && selectedAction !== 'MinuteAdded') ||
                    (requiresMin10Chars && comments.trim().length < 10)
                  }
                  className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 dark:bg-teal-600 rounded-lg flex items-center gap-1.5 disabled:opacity-40 whitespace-nowrap"
                >
                  {selectedAction === 'Approved' && isSensitiveApproval && <Fingerprint className="w-3.5 h-3.5" />}
                  <span>
                    {isSubmitting
                      ? 'Recording...'
                      : selectedAction === 'Approved' && isSensitiveApproval
                        ? 'Verify Biometrics & Approve'
                        : `Submit ${selectedAction}`}
                  </span>
                </button>
              </div>
            </form>
          </div>

          {/* Supporting Attachments Section */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-teal-600" />
                <span>Task & Document Attachments ({doc.attachments.length})</span>
              </h3>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <button
                  type="button"
                  disabled={isUploadingAtt}
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 text-xs font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 border border-teal-200 dark:border-teal-800 rounded-lg flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isUploadingAtt ? 'Uploading...' : 'Attach File'}</span>
                </button>
              </div>
            </div>

            {doc.attachments.length === 0 ? (
              <p className="text-slate-400">No supporting documents attached yet.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {doc.attachments.map(att => (
                  <div key={att.id} className="py-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium text-slate-800 dark:text-slate-200 truncate">
                          {att.fileName}
                        </div>
                        <div className="text-[11px] text-slate-400 tabular-nums">
                          {Math.max(1, Math.round(att.fileSize / 1024))} KB · Uploaded by {att.uploadedBy}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Immutable Workflow History Timeline */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {t('timeline')} (Immutable Audit Trail · {instance.history.length} Entries)
            </h3>
            <div className="space-y-3 pl-4 border-l border-slate-200 dark:border-slate-700">
              {instance.history.map(entry => (
                <div key={entry.id} className="relative pl-4 pb-2 text-xs">
                  <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-teal-600 dark:bg-teal-500 border-2 border-white dark:border-slate-900" />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      <span>{entry.action}</span>
                      {entry.stageName && (
                        <span className="text-slate-500 dark:text-slate-400 font-normal">
                          {' '}
                          · {entry.stageName}
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                      {new Date(entry.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-slate-600 dark:text-slate-300 mt-0.5">
                    <span className="font-medium">{entry.actorName}</span> ({entry.actorRole})
                  </div>
                  <p className="mt-1 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/70 text-slate-700 dark:text-slate-300">
                    {entry.comments}
                  </p>
                  {entry.digitalSignature && (
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] font-mono text-emerald-700 dark:text-emerald-400">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>PKI Seal: {entry.digitalSignature.certificateSerial}</span>
                      {entry.biometricVerified && <span>· Biometric Verified</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Biometric Verification Gate Modal */}
      <BiometricVerificationModal
        isOpen={isBiometricOpen}
        onClose={() => setIsBiometricOpen(false)}
        onVerified={() => {
          setIsBiometricOpen(false);
          executeAction(true);
        }}
        documentTitle={language === 'am' ? doc.subjectAm || doc.subjectEn : doc.subjectEn}
        registrationNumber={doc.registrationNumber}
        confidentialityLevel={doc.confidentiality}
        actionReason={`Biometric Endorsement for ${doc.registrationNumber} (${instance.currentStageName})`}
      />
    </div>
  );
};
