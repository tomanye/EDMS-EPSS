import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  XCircle,
  Users,
  GitMerge
} from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import { apiFetch } from '../../lib/apiFetch.js';
import { formatEthiopianDate } from '../../lib/translations.js';
import { CorrespondenceWorkflowState, DocumentItem } from '../../types/index.js';

interface WorkflowProgressTrackerProps {
  document: DocumentItem;
}

export const WorkflowProgressTracker: React.FC<WorkflowProgressTrackerProps> = ({ document }) => {
  const { language, t } = useApp();
  const [workflowState, setWorkflowState] = useState<CorrespondenceWorkflowState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    apiFetch(`/api/v1/correspondence/${document.id}/workflow`)
      .then(async res => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Failed to load workflow state');
        }
        return res.json();
      })
      .then((data: CorrespondenceWorkflowState) => {
        if (active) setWorkflowState(data);
      })
      .catch((err: any) => {
        if (active) setError(err?.message || 'Unable to load workflow progress');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [document.id, document.status, document.workflowHistory?.length]);

  if (loading) {
    return (
      <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 animate-pulse">
        <div className="h-4 w-56 bg-slate-200 dark:bg-slate-800 rounded" />
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="h-14 bg-slate-100 dark:bg-slate-800/60 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // Fallback Lifecycle Milestone Tracker when no multi-stage WorkflowDefinition is linked
  if (error || !workflowState?.hasWorkflow || !workflowState.instance || !workflowState.definition) {
    const isRejectedOrCancelled =
      document.status === 'Cancelled' || Boolean(document.isDeleted);
    const isArchivedOrDisposed =
      document.isArchived || document.status === 'Archived' || document.status === 'Disposed';
    const isApprovedOrCompleted =
      document.status === 'Approved' ||
      document.status === 'ResponsePrepared' ||
      document.status === 'Dispatched' ||
      document.status === 'Completed' ||
      isArchivedOrDisposed;
    const isReturnedForInfo = document.status === 'PendingInformation';
    const isInReview =
      !isApprovedOrCompleted &&
      !isRejectedOrCancelled &&
      (document.status === 'UnderReview' ||
        document.status === 'Assigned' ||
        document.status === 'InProgress' ||
        document.status === 'Forwarded' ||
        document.status === 'AwaitingApproval' ||
        isReturnedForInfo ||
        (document.workflowHistory?.length || 0) > 1);

    type FallbackState = 'completed' | 'active' | 'returned' | 'rejected' | 'pending';
    const fallbackSteps: Array<{
      key: string;
      order: number;
      labelEn: string;
      labelAm: string;
      state: FallbackState;
    }> = [
      {
        key: 'registered',
        order: 1,
        labelEn: 'Registered',
        labelAm: 'ተመዝግቧል',
        state: 'completed'
      },
      {
        key: 'review',
        order: 2,
        labelEn: isReturnedForInfo ? 'Pending Clarification' : 'Directorate Review',
        labelAm: isReturnedForInfo ? 'ተጨማሪ መረጃ በመጠበቅ ላይ' : 'የዳይሬክቶሬት ግምገማ',
        state: isApprovedOrCompleted
          ? 'completed'
          : isReturnedForInfo
            ? 'returned'
            : isInReview
              ? 'active'
              : 'active'
      },
      {
        key: 'decision',
        order: 3,
        labelEn: isRejectedOrCancelled
          ? document.status
          : isApprovedOrCompleted
            ? 'Approved / Cleared'
            : 'Executive Decision',
        labelAm: isRejectedOrCancelled
          ? 'ተሰርዟል'
          : isApprovedOrCompleted
            ? 'ጸድቋል'
            : 'የአመራር ውሳኔ',
        state: isRejectedOrCancelled
          ? 'rejected'
          : isApprovedOrCompleted
            ? 'completed'
            : 'pending'
      },
      {
        key: 'archive',
        order: 4,
        labelEn: document.status === 'Disposed' ? 'Disposed' : 'Records Archive',
        labelAm: document.status === 'Disposed' ? 'ተወግዷል' : 'መዝገብ ቤት ማህደር',
        state: isArchivedOrDisposed ? 'completed' : 'pending'
      }
    ];

    return (
      <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
            <GitMerge className="w-4 h-4 text-teal-600" />
            <span>{t('workflowProgressTitle')}</span>
          </div>
          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
            {document.status}
          </span>
        </div>

        <ol className="grid grid-cols-2 sm:grid-cols-4 gap-3" aria-label={t('workflowProgressTitle')}>
          {fallbackSteps.map((step, idx) => {
            const isCompleted = step.state === 'completed';
            const isActive = step.state === 'active';
            const isReturned = step.state === 'returned';
            const isRejected = step.state === 'rejected';

            return (
              <li
                key={step.key}
                className={`p-2.5 rounded-lg border transition-colors ${
                  isCompleted
                    ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900'
                    : isActive
                      ? 'bg-teal-50/70 dark:bg-teal-950/30 border-teal-300 dark:border-teal-800'
                      : isReturned
                        ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
                        : isRejected
                          ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-900'
                          : 'bg-slate-50/60 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-mono text-[10px] font-bold tabular-nums text-slate-500 dark:text-slate-400">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  {isCompleted ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : isActive ? (
                    <Clock className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                  ) : isReturned ? (
                    <RotateCcw className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  ) : isRejected ? (
                    <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
                  ) : (
                    <span className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-700 shrink-0" />
                  )}
                </div>
                <div className="font-semibold text-slate-900 dark:text-slate-100 leading-tight">
                  {language === 'am' ? step.labelAm : step.labelEn}
                </div>
                <div className="text-[10px] mt-0.5 text-slate-500 dark:text-slate-400">
                  {isCompleted
                    ? t('workflowStageCompleted')
                    : isActive
                      ? t('workflowStageActive')
                      : isReturned
                        ? t('workflowStageReturned')
                        : isRejected
                          ? t('workflowStageRejected')
                          : t('workflowStagePending')}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    );
  }

  const { instance, definition, assignees, isOverdue, isDueToday, remainingHours } = workflowState;
  const stages = [...definition.stages].sort((a, b) => a.order - b.order);
  const completedIds = new Set(instance.completedStageIds || []);

  const overallStatusText =
    instance.status === 'Completed'
      ? language === 'am'
        ? 'ተጠናቅቋል'
        : 'Completed'
      : instance.status === 'Rejected'
        ? language === 'am'
          ? 'ውድቅ ተደርጓል'
          : 'Rejected'
        : instance.status === 'ReturnedForCorrection'
          ? language === 'am'
            ? 'ለማስተካከያ ተመልሷል'
            : 'Returned for Correction'
          : language === 'am'
            ? 'በሂደት ላይ'
            : 'Active';

  return (
    <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <GitMerge className="w-4 h-4 text-teal-600 shrink-0" />
          <h3 className="font-bold text-slate-900 dark:text-slate-100">
            {t('workflowProgressTitle')}
          </h3>
          <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
          <span className="text-slate-600 dark:text-slate-300 font-medium truncate">
            {language === 'am' ? definition.nameAm : definition.nameEn}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono tabular-nums">
          <span
            className={`font-semibold ${
              instance.status === 'Completed'
                ? 'text-emerald-700 dark:text-emerald-400'
                : instance.status === 'Rejected'
                  ? 'text-rose-700 dark:text-rose-400'
                  : instance.status === 'ReturnedForCorrection'
                    ? 'text-amber-700 dark:text-amber-400'
                    : 'text-teal-700 dark:text-teal-400'
            }`}
          >
            {overallStatusText}
          </span>

          {instance.status === 'Active' && (
            <>
              <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
              <span
                className={`font-semibold inline-flex items-center gap-1 ${
                  isOverdue
                    ? 'text-rose-600 dark:text-rose-400'
                    : isDueToday
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                {isOverdue ? (
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                ) : (
                  <Clock className="w-3 h-3 shrink-0" />
                )}
                <span>
                  {isOverdue
                    ? `${Math.abs(Math.round(remainingHours))}h overdue`
                    : `${Math.max(0, Math.round(remainingHours))}h SLA left`}
                </span>
              </span>
            </>
          )}

          {instance.isEscalated && (
            <>
              <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
              <span className="font-semibold text-rose-600 dark:text-rose-400">
                Escalated (L{instance.escalationLevel})
              </span>
            </>
          )}
        </div>
      </div>

      {/* Horizontal Step-Based Stage Tracker */}
      <ol
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5"
        aria-label={t('workflowProgressTitle')}
      >
        {stages.map((stage, idx) => {
          const isCompleted =
            instance.status === 'Completed' || completedIds.has(stage.id);
          const isCurrent =
            instance.status !== 'Completed' && instance.currentStageId === stage.id;
          const isReturned = isCurrent && instance.status === 'ReturnedForCorrection';
          const isRejected = isCurrent && instance.status === 'Rejected';
          const isActive = isCurrent && instance.status === 'Active';

          const stateLabel = isCompleted
            ? t('workflowStageCompleted')
            : isReturned
              ? t('workflowStageReturned')
              : isRejected
                ? t('workflowStageRejected')
                : isActive
                  ? t('workflowStageActive')
                  : t('workflowStagePending');

          return (
            <li
              key={stage.id}
              aria-current={isCurrent ? 'step' : undefined}
              className={`p-3 rounded-lg border flex flex-col justify-between gap-2 transition-colors ${
                isCompleted
                  ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900'
                  : isActive
                    ? 'bg-teal-50/70 dark:bg-teal-950/30 border-teal-400 dark:border-teal-700'
                    : isReturned
                      ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
                      : isRejected
                        ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-900'
                        : 'bg-slate-50/60 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="font-mono text-[10px] font-bold tabular-nums text-slate-500 dark:text-slate-400">
                    {String(idx + 1).padStart(2, '0')} / {String(stages.length).padStart(2, '0')}
                  </span>
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  ) : isActive ? (
                    <Clock className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                  ) : isReturned ? (
                    <RotateCcw className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  ) : isRejected ? (
                    <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  ) : (
                    <span className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-700 shrink-0" />
                  )}
                </div>

                <div className="font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                  {language === 'am' ? stage.nameAm : stage.nameEn}
                </div>

                <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-1.5">
                  <span>{stage.assigneeRole || stage.stageType}</span>
                  {stage.pathMode === 'Parallel' && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>Parallel</span>
                    </>
                  )}
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">{stage.slaHours}h SLA</span>
                </div>
              </div>

              <div className="pt-1.5 border-t border-slate-200/70 dark:border-slate-800 flex items-center justify-between gap-1 text-[10px]">
                <span
                  className={`font-semibold ${
                    isCompleted
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : isActive
                        ? 'text-teal-700 dark:text-teal-400'
                        : isReturned
                          ? 'text-amber-700 dark:text-amber-400'
                          : isRejected
                            ? 'text-rose-700 dark:text-rose-400'
                            : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {stateLabel}
                </span>
                {isCurrent && instance.stageDueAt && instance.status !== 'Completed' && (
                  <span className="font-mono tabular-nums text-slate-400 truncate">
                    Due {formatEthiopianDate(instance.stageDueAt, language)}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {/* Current Stage Assignees & Parallel Approvals Detail */}
      {(assignees.length > 0 || (instance.parallelApprovals?.length || 0) > 0) && (
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-600 dark:text-slate-400">
          {assignees.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-teal-600 shrink-0" />
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {language === 'am' ? 'የአሁኑ ኃላፊዎች፡' : 'Current Assignees:'}
              </span>
              <span>
                {assignees.map(a => `${a.fullNameEn} (${a.role})`).join(', ')}
              </span>
            </div>
          )}

          {instance.parallelApprovals && instance.parallelApprovals.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 font-mono tabular-nums">
              <span className="font-sans font-semibold text-slate-700 dark:text-slate-300">
                {t('parallelApprovalsLabel')}:
              </span>
              {instance.parallelApprovals.map(pa => (
                <span
                  key={pa.approverId}
                  className={
                    pa.status === 'Approved'
                      ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
                      : pa.status === 'Rejected'
                        ? 'text-rose-600 font-semibold'
                        : 'text-slate-500'
                  }
                >
                  {pa.approverName} ({pa.status})
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
