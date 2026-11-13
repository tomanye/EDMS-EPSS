import React, { useCallback, useEffect, useState } from 'react';
import {
  GitBranch,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Search,
  SlidersHorizontal,
  ArrowUpRight,
  Users,
  ShieldAlert,
  Inbox
} from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import { formatEthiopianDate } from '../../lib/translations.js';
import { EnrichedWorkflowTask, User, WorkflowDefinition } from '../../types/index.js';
import { TaskDetailDrawer } from './TaskDetailDrawer.js';
import { WorkflowDesignerView } from './WorkflowDesignerView.js';

export const WorkflowInboxView: React.FC = () => {
  const { currentUser, refreshData, language, t } = useApp();

  const [activeTab, setActiveTab] = useState<'my' | 'all' | 'designer'>('my');
  const [slaFilter, setSlaFilter] = useState<'all' | 'overdue' | 'dueToday' | 'escalated'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [tasks, setTasks] = useState<EnrichedWorkflowTask[]>([]);
  const [allTasksSnapshot, setAllTasksSnapshot] = useState<EnrichedWorkflowTask[]>([]);
  const [definitions, setDefinitions] = useState<WorkflowDefinition[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedTask, setSelectedTask] = useState<EnrichedWorkflowTask | null>(null);

  const loadWorkflowWorkspace = useCallback(async () => {
    try {
      setIsLoading(true);
      const [tasksAllRes, defsRes, usersRes] = await Promise.all([
        fetch('/api/v1/workflows/tasks?scope=all').then(r => (r.ok ? r.json() : [])),
        fetch('/api/v1/workflows/definitions').then(r => (r.ok ? r.json() : [])),
        fetch('/api/v1/organizations/users').then(r => (r.ok ? r.json() : []))
      ]);
      const allList: EnrichedWorkflowTask[] = Array.isArray(tasksAllRes) ? tasksAllRes : [];
      setAllTasksSnapshot(allList);
      setDefinitions(Array.isArray(defsRes) ? defsRes : []);
      setUsers(Array.isArray(usersRes) ? usersRes : []);
    } catch (err) {
      console.error('Failed to load workflow engine data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWorkflowWorkspace();
  }, [loadWorkflowWorkspace]);

  // Filter tasks based on active sub-tab and toolbar filters
  useEffect(() => {
    if (activeTab === 'designer') return;
    let list = [...allTasksSnapshot];

    if (activeTab === 'my') {
      list = list.filter(
        item =>
          (item.instance.status === 'Active' || item.instance.status === 'ReturnedForCorrection') &&
          (item.instance.assignedUserIds.includes(currentUser?.id || '') ||
            (item.actingAsDelegateFor && item.actingAsDelegateFor.length > 0))
      );
    }

    if (slaFilter === 'overdue') list = list.filter(item => item.isOverdue);
    else if (slaFilter === 'dueToday') list = list.filter(item => item.isDueToday);
    else if (slaFilter === 'escalated') list = list.filter(item => item.instance.isEscalated);

    if (typeFilter !== 'All') {
      list = list.filter(item => item.document.type === typeFilter);
    }
    if (priorityFilter !== 'All') {
      list = list.filter(item => item.document.priority === priorityFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        item =>
          item.document.registrationNumber.toLowerCase().includes(q) ||
          item.document.referenceNumber.toLowerCase().includes(q) ||
          item.document.subjectEn.toLowerCase().includes(q) ||
          item.document.subjectAm.toLowerCase().includes(q) ||
          item.instance.currentStageName.toLowerCase().includes(q)
      );
    }

    setTasks(list);
  }, [allTasksSnapshot, activeTab, slaFilter, typeFilter, priorityFilter, searchQuery, currentUser?.id]);

  const handleTaskUpdated = async (updatedTask?: EnrichedWorkflowTask) => {
    await loadWorkflowWorkspace();
    await refreshData();
    if (updatedTask) {
      setSelectedTask(updatedTask);
    }
  };

  // Summary metrics across tasks
  const myPendingTasks = allTasksSnapshot.filter(
    tItem =>
      (tItem.instance.status === 'Active' || tItem.instance.status === 'ReturnedForCorrection') &&
      (tItem.instance.assignedUserIds.includes(currentUser?.id || '') ||
        (tItem.actingAsDelegateFor && tItem.actingAsDelegateFor.length > 0))
  );
  const overdueTotal = allTasksSnapshot.filter(tItem => tItem.isOverdue).length;
  const dueTodayTotal = allTasksSnapshot.filter(tItem => tItem.isDueToday).length;
  const escalatedTotal = allTasksSnapshot.filter(tItem => tItem.instance.isEscalated).length;
  const parallelTotal = allTasksSnapshot.filter(
    tItem => tItem.instance.status === 'Active' && tItem.instance.currentStageMode === 'Parallel'
  ).length;

  return (
    <div className="space-y-6">
      {/* Page Header & Segmented View Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t('navWorkflows')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {language === 'am'
              ? 'የተመደቡ የሥራ ፍሰት ተግባራት፣ የቀነ-ገደብ (SLA) ክትትል እና የሥራ ፍሰት ንድፍ አዘጋጅ'
              : 'Stage-gated correspondence routing, SLA escalation tracking, parallel executive approvals, and workflow designer.'}
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 self-start lg:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('my')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 tabular-nums ${
              activeTab === 'my'
                ? 'bg-white dark:bg-slate-700 text-teal-800 dark:text-teal-200 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            {language === 'am' ? 'የእኔ ተግባራት' : 'My Tasks Inbox'} ({myPendingTasks.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 tabular-nums ${
              activeTab === 'all'
                ? 'bg-white dark:bg-slate-700 text-teal-800 dark:text-teal-200 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            {language === 'am' ? 'ሁሉም ፍሰቶች' : 'All Workflows'} ({allTasksSnapshot.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('designer')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              activeTab === 'designer'
                ? 'bg-white dark:bg-slate-700 text-teal-800 dark:text-teal-200 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>{language === 'am' ? 'የፍሰት ንድፍ አዘጋጅ' : 'Workflow Designer'}</span>
          </button>
        </div>
      </div>

      {/* 5-Column Operational KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800">
        <div className="p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">My Actionable Tasks</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
            {myPendingTasks.length}
          </div>
        </div>
        <div className="p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Overdue SLA</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400 mt-1">
            {overdueTotal}
          </div>
        </div>
        <div className="p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Due Today</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400 mt-1">
            {dueTodayTotal}
          </div>
        </div>
        <div className="p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Escalated</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-1">
            {escalatedTotal}
          </div>
        </div>
        <div className="p-4">
          <div className="text-xs text-slate-500 dark:text-slate-400">Parallel Approvals</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-teal-700 dark:text-teal-400 mt-1">
            {parallelTotal}
          </div>
        </div>
      </div>

      {activeTab === 'designer' ? (
        <WorkflowDesignerView
          definitions={definitions}
          users={users}
          onRefresh={loadWorkflowWorkspace}
        />
      ) : (
        <div className="space-y-4">
          {/* Task Inbox Filter Toolbar */}
          <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            {/* SLA Filter Segmented Buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>SLA:</span>
              </span>
              {[
                { id: 'all' as const, label: 'All Tasks' },
                { id: 'overdue' as const, label: `Overdue (${overdueTotal})` },
                { id: 'dueToday' as const, label: `Due Today (${dueTodayTotal})` },
                { id: 'escalated' as const, label: `Escalated (${escalatedTotal})` }
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSlaFilter(f.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                    slaFilter === f.id
                      ? 'bg-teal-700 text-white border-teal-700 dark:bg-teal-600 dark:border-teal-600'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Type, Priority & Search */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
              >
                <option value="All">All Types</option>
                <option value="IncomingLetter">IncomingLetter</option>
                <option value="OutgoingLetter">OutgoingLetter</option>
                <option value="InternalMemo">InternalMemo</option>
                <option value="Application">Application</option>
                <option value="TenderDocument">TenderDocument</option>
                <option value="Circular">Circular</option>
              </select>

              <select
                value={priorityFilter}
                onChange={e => setPriorityFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
              >
                <option value="All">All Priorities</option>
                <option value="VeryUrgent">VeryUrgent</option>
                <option value="Urgent">Urgent</option>
                <option value="Normal">Normal</option>
              </select>

              <div className="relative flex-1 min-w-[210px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Filter by reg #, subject, stage..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>
          </div>

          {/* Task Queue Table / Rows */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-14 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : tasks.length === 0 ? (
              <div className="py-16 px-6 text-center space-y-3">
                <Inbox className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  {activeTab === 'my'
                    ? 'Your actionable task inbox is clear'
                    : 'No workflow tasks match the current filters'}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  {activeTab === 'my'
                    ? 'Switch to "All Workflows" to inspect institutional workflow progress across directorates or reset SLA filters.'
                    : 'Adjust your SLA, type, or priority filters to view active and completed correspondence workflows.'}
                </p>
                {activeTab === 'my' && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('all');
                      setSlaFilter('all');
                      setTypeFilter('All');
                      setPriorityFilter('All');
                    }}
                    className="px-4 py-2 text-xs font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 rounded-lg"
                  >
                    View All Institutional Workflows
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {tasks.map(taskItem => {
                  const { instance, document: doc } = taskItem;
                  const parallelApproved = instance.parallelApprovals.filter(p => p.status === 'Approved').length;

                  return (
                    <div
                      key={instance.id}
                      className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        {/* Top metadata line: clean unboxed separators */}
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span className="font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                            {doc.registrationNumber}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{doc.type}</span>
                          <span aria-hidden="true">·</span>
                          <span
                            className={`font-semibold inline-flex items-center gap-1 ${
                              doc.priority === 'VeryUrgent'
                                ? 'text-rose-600 dark:text-rose-400'
                                : doc.priority === 'Urgent'
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            {doc.priority === 'VeryUrgent' && <ShieldAlert className="w-3.5 h-3.5" />}
                            <span>{doc.priority}</span>
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{doc.confidentiality}</span>
                          {instance.isEscalated && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-semibold text-rose-700 dark:text-rose-400 inline-flex items-center gap-1">
                                <ArrowUpRight className="w-3.5 h-3.5" />
                                <span>Escalated (L{instance.escalationLevel})</span>
                              </span>
                            </>
                          )}
                        </div>

                        {/* Subject */}
                        <button
                          type="button"
                          onClick={() => setSelectedTask(taskItem)}
                          className="text-left text-sm font-bold text-slate-900 dark:text-slate-100 hover:text-teal-700 dark:hover:text-teal-400 transition-colors block"
                        >
                          {language === 'am' ? doc.subjectAm : doc.subjectEn}
                        </button>

                        {/* Stage, Assignee & SLA line */}
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                          <span>
                            <strong>Stage:</strong> {instance.currentStageName} ({instance.currentStageMode})
                          </span>
                          {instance.parallelApprovals.length > 0 && (
                            <span className="inline-flex items-center gap-1 font-mono tabular-nums text-teal-700 dark:text-teal-400 font-semibold">
                              <Users className="w-3.5 h-3.5" />
                              <span>
                                Parallel {parallelApproved}/{instance.parallelApprovals.length}
                              </span>
                            </span>
                          )}
                          <span>
                            <strong>Assignees:</strong>{' '}
                            {taskItem.assignees.map(a => a.fullNameEn).join(', ') || 'Unassigned'}
                          </span>
                          {taskItem.actingAsDelegateFor && taskItem.actingAsDelegateFor.length > 0 && (
                            <span className="text-teal-700 dark:text-teal-400 font-semibold">
                              Acting Delegate
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right SLA Status & Action Controls */}
                      <div className="flex items-center justify-between lg:justify-end gap-4 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
                        <div className="text-left lg:text-right text-xs">
                          {instance.status === 'Completed' ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Completed</span>
                            </span>
                          ) : instance.status === 'Rejected' ? (
                            <span className="font-semibold text-rose-600 dark:text-rose-400">
                              Rejected
                            </span>
                          ) : (
                            <>
                              <div
                                className={`font-mono font-bold tabular-nums inline-flex items-center gap-1 ${
                                  taskItem.isOverdue
                                    ? 'text-rose-600 dark:text-rose-400'
                                    : taskItem.isDueToday
                                      ? 'text-amber-600 dark:text-amber-400'
                                      : 'text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                {taskItem.isOverdue ? (
                                  <AlertTriangle className="w-3.5 h-3.5" />
                                ) : (
                                  <Clock className="w-3.5 h-3.5" />
                                )}
                                <span>
                                  {taskItem.isOverdue
                                    ? `Overdue ${Math.abs(taskItem.remainingHours)}h`
                                    : taskItem.isDueToday
                                      ? `Due Today (${taskItem.remainingHours}h)`
                                      : `${taskItem.remainingHours}h SLA`}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-400 tabular-nums">
                                {formatEthiopianDate(instance.stageDueAt, language)}
                              </div>
                            </>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedTask(taskItem)}
                          className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500 rounded-lg whitespace-nowrap shrink-0 transition-colors"
                        >
                          {taskItem.canAct ? 'Review & Act' : 'Inspect Task'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Task Detail Slide-Over Drawer */}
      {selectedTask && (
        <TaskDetailDrawer
          task={selectedTask}
          users={users}
          onClose={() => setSelectedTask(null)}
          onTaskUpdated={handleTaskUpdated}
        />
      )}
    </div>
  );
};
