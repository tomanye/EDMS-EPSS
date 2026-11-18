import React, { useEffect, useState } from 'react';
import {
  UserPlus,
  Users,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Zap,
  Clock,
  Ban,
  Upload,
  Eye
} from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import { apiFetch } from '../../lib/apiFetch.js';
import { formatEthiopianDate } from '../../lib/translations.js';
import { localizeErrorMessage } from '../../lib/localizedErrors.js';
import { useEscapeKey } from '../../lib/useEscapeKey.js';
import {
  AuthPolicyConfig,
  BreakGlassElevation,
  EffectivePermissionPreview,
  EnterpriseRole,
  RoleScopeType,
  User,
  UserRoleAssignment
} from '../../types/index.js';

interface UserRoleAssignmentPanelProps {
  roles: EnterpriseRole[];
  users: User[];
  assignments: UserRoleAssignment[];
  breakGlassList: BreakGlassElevation[];
  authPolicy: AuthPolicyConfig | null;
  onRefresh: () => Promise<void>;
  onToast: (type: 'success' | 'error', text: string) => void;
}

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

export const UserRoleAssignmentPanel: React.FC<UserRoleAssignmentPanelProps> = ({
  roles,
  users,
  assignments,
  breakGlassList,
  authPolicy,
  onRefresh,
  onToast
}) => {
  const { language, branches, departments, currentUser, t } = useApp();

  const [selectedUserId, setSelectedUserId] = useState<string>(users[0]?.id || '');
  const [effectivePreview, setEffectivePreview] = useState<EffectivePermissionPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Single Assignment Form
  const [assignRoleId, setAssignRoleId] = useState('');
  const [assignScopeType, setAssignScopeType] = useState<RoleScopeType>('Global');
  const [assignScopeTargetId, setAssignScopeTargetId] = useState('');
  const [assignStartDate, setAssignStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [assignEndDate, setAssignEndDate] = useState('');
  const [assignTicketRef, setAssignTicketRef] = useState('');
  const [assignJustification, setAssignJustification] = useState('');
  const [assignOverrideSod, setAssignOverrideSod] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);

  // Bulk Assign Section
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkFilterBranch, setBulkFilterBranch] = useState('all');
  const [bulkSelectedUserIds, setBulkSelectedUserIds] = useState<string[]>([]);
  const [bulkCsvText, setBulkCsvText] = useState('');
  const [bulkRoleId, setBulkRoleId] = useState('');
  const [bulkEndDate, setBulkEndDate] = useState('');
  const [bulkTicketRef, setBulkTicketRef] = useState('');
  const [bulkJustification, setBulkJustification] = useState('');

  // Break-Glass Elevation Modal
  const [showBreakGlassModal, setShowBreakGlassModal] = useState(false);
  const [bgUserId, setBgUserId] = useState('');
  const [bgRoleId, setBgRoleId] = useState('');
  const [bgDurationHours, setBgDurationHours] = useState<number>(2);
  const [bgDualApproverId, setBgDualApproverId] = useState('');
  const [bgTicketRef, setBgTicketRef] = useState('');
  const [bgReason, setBgReason] = useState('');

  // Reason Modal for Revoke / Pending Decision / BG Revoke
  const [actionModal, setActionModal] = useState<{
    title: string;
    endpoint: string;
    method: 'POST' | 'DELETE';
    extraBody?: Record<string, any>;
  } | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedAssignmentIdsForRevoke, setSelectedAssignmentIdsForRevoke] = useState<string[]>([]);

  useEscapeKey(showBulkModal || showBreakGlassModal || !!actionModal, () => {
    setShowBulkModal(false);
    setShowBreakGlassModal(false);
    setActionModal(null);
  });

  useEffect(() => {
    if (!selectedUserId && users.length > 0) {
      setSelectedUserId(users[0].id);
    }
  }, [users, selectedUserId]);

  useEffect(() => {
    const activeRoles = roles.filter(r => r.status === 'Active');
    if (activeRoles.length > 0 && !assignRoleId) {
      setAssignRoleId(activeRoles[0].id);
      setBulkRoleId(activeRoles[0].id);
    }
  }, [roles, assignRoleId]);

  const loadEffective = async (uid: string) => {
    if (!uid) return;
    setLoadingPreview(true);
    try {
      const res = await apiFetch(`/api/v1/rbac/effective-permissions/${uid}`);
      if (res.ok) {
        setEffectivePreview(await res.json());
      }
    } catch {
      // ignore
    } finally {
      setLoadingPreview(false);
    }
  };

  useEffect(() => {
    setSelectedAssignmentIdsForRevoke([]);
    if (selectedUserId) {
      loadEffective(selectedUserId);
    }
  }, [selectedUserId, assignments, breakGlassList]);

  const handleAssignRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !assignRoleId) return;
    if (assignJustification.trim().length < 10) {
      onToast('error', language === 'am' ? 'ምክንያቱ ቢያንስ 10 ፊደላት መሆን አለበት።' : 'Justification must be at least 10 characters.');
      return;
    }
    if (assignEndDate && new Date(assignEndDate) <= new Date(assignStartDate)) {
      onToast('error', language === 'am' ? 'የማብቂያ ቀን ከመጀመሪያ ቀን መብለጥ አለበት።' : 'End date must be strictly after start date.');
      return;
    }

    setIsAssigning(true);
    try {
      const res = await apiFetch('/api/v1/rbac/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUserId,
          roleId: assignRoleId,
          scopeType: assignScopeType,
          scopeTargetId: assignScopeType === 'Global' ? undefined : assignScopeTargetId,
          startDate: assignStartDate ? new Date(assignStartDate).toISOString() : undefined,
          endDate: assignEndDate ? new Date(assignEndDate + 'T23:59:59Z').toISOString() : undefined,
          ticketRef: assignTicketRef.trim() || undefined,
          justification: assignJustification.trim(),
          overrideBreakGlass: assignOverrideSod
        })
      });
      const data = await res.json();
      if (!res.ok) {
        onToast('error', localizeErrorMessage(data.error || 'Role assignment rejected.', language));
        return;
      }
      setAssignJustification('');
      setAssignTicketRef('');
      setAssignEndDate('');
      setAssignOverrideSod(false);
      await onRefresh();
      await loadEffective(selectedUserId);
      onToast(
        'success',
        data.status === 'PendingApproval'
          ? `Role assignment queued for dual approval (${data.roleCode}).`
          : `Assigned role ${data.roleCode} (${data.scopeType}).`
      );
    } catch {
      onToast('error', localizeErrorMessage('Network error while assigning role.', language));
    } finally {
      setIsAssigning(false);
    }
  };

  const handleParseBulkCsv = () => {
    const tokens = bulkCsvText
      .split(/[\n,;]+/)
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);
    const matchedIds = users
      .filter(
        u =>
          tokens.includes(u.username.toLowerCase()) ||
          tokens.includes(u.email.toLowerCase()) ||
          tokens.includes(u.id.toLowerCase())
      )
      .map(u => u.id);
    if (matchedIds.length === 0) {
      onToast('error', 'No staff usernames or emails matched CSV input.');
      return;
    }
    setBulkSelectedUserIds(prev => Array.from(new Set([...prev, ...matchedIds])));
    onToast('success', `Matched ${matchedIds.length} staff user(s) from CSV input.`);
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bulkSelectedUserIds.length === 0) {
      onToast('error', 'Select at least one staff member.');
      return;
    }
    if (bulkJustification.trim().length < 10) {
      onToast('error', 'Bulk assignment justification must be at least 10 characters.');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await apiFetch('/api/v1/rbac/assignments/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: bulkSelectedUserIds,
          roleId: bulkRoleId,
          endDate: bulkEndDate ? new Date(bulkEndDate + 'T23:59:59Z').toISOString() : undefined,
          ticketRef: bulkTicketRef.trim() || undefined,
          justification: bulkJustification.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) {
        onToast('error', localizeErrorMessage(data.error || 'Bulk assignment failed.', language));
        return;
      }
      setShowBulkModal(false);
      setBulkSelectedUserIds([]);
      setBulkCsvText('');
      setBulkJustification('');
      await onRefresh();
      onToast('success', `Bulk assignment complete: ${data.succeededCount} succeeded, ${data.failedCount} skipped/blocked.`);
    } catch {
      onToast('error', localizeErrorMessage('Network error during bulk assignment.', language));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGrantBreakGlass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bgReason.trim().length < 10) {
      onToast('error', 'Break-Glass emergency justification must be at least 10 characters.');
      return;
    }
    setIsProcessing(true);
    try {
      const res = await apiFetch('/api/v1/rbac/break-glass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: bgUserId || selectedUserId,
          targetRoleId: bgRoleId,
          durationHours: Number(bgDurationHours),
          dualApprovedById: bgDualApproverId,
          ticketRef: bgTicketRef.trim() || undefined,
          reason: bgReason.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) {
        onToast('error', localizeErrorMessage(data.error || 'Break-Glass elevation rejected.', language));
        return;
      }
      setShowBreakGlassModal(false);
      setBgReason('');
      setBgTicketRef('');
      await onRefresh();
      onToast('success', `Emergency Break-Glass access granted to ${data.userName}; SecurityOfficer alerted in real time.`);
    } catch {
      onToast('error', localizeErrorMessage('Network error issuing Break-Glass elevation.', language));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionModal) return;
    if (actionReason.trim().length < 10) {
      onToast('error', 'Justification reason must be at least 10 characters.');
      return;
    }
    setIsProcessing(true);
    try {
      const res = await apiFetch(actionModal.endpoint, {
        method: actionModal.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...(actionModal.extraBody || {}), reason: actionReason.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        onToast('error', localizeErrorMessage(data.error || 'Action failed.', language));
        return;
      }
      setActionModal(null);
      setActionReason('');
      setSelectedAssignmentIdsForRevoke([]);
      await onRefresh();
      onToast(
        'success',
        data.succeededCount !== undefined
          ? `Bulk revocation complete: ${data.succeededCount} revoked, ${data.failedCount || 0} skipped.`
          : 'Role assignment status updated.'
      );
    } catch {
      onToast('error', localizeErrorMessage('Network error performing governance action.', language));
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedUser = users.find(u => u.id === selectedUserId) || null;
  const userAssignments = assignments.filter(a => a.userId === selectedUserId);
  const pendingApprovals = assignments.filter(a => a.status === 'PendingApproval');
  const activeRoles = roles.filter(r => r.status === 'Active');
  const eligibleDualApprovers = users.filter(
    u => u.status === 'Active' && u.id !== currentUser?.id && u.id !== (bgUserId || selectedUserId)
  );
  const bulkFilteredUsers = users.filter(
    u => u.status === 'Active' && (bulkFilterBranch === 'all' || u.branchId === bulkFilterBranch)
  );

  return (
    <div className="space-y-6 text-xs">
      {/* Top Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
        <div className="flex-1 min-w-0">
          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
            {language === 'am' ? 'የሠራተኛ መለያ ይምረጡ' : 'Inspect Staff Member Role Assignments & Effective Access'}
          </label>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="w-full max-w-xl p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-medium"
          >
            {users.map(u => (
              <option key={u.id} value={u.id}>
                {language === 'am' ? u.fullNameAm : u.fullNameEn} (@{u.username}) · {u.role} · {u.branchNameEn}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowBulkModal(true)}
            className="px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg font-semibold inline-flex items-center gap-1.5"
          >
            <Users className="w-3.5 h-3.5 text-teal-600" />
            <span>Bulk Assign Roles / CSV</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setBgUserId(selectedUserId);
              setBgRoleId(activeRoles[0]?.id || '');
              setBgDurationHours(Math.min(2, authPolicy?.maxBreakGlassHours || 4));
              setBgDualApproverId(eligibleDualApprovers[0]?.id || '');
              setShowBreakGlassModal(true);
            }}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold inline-flex items-center gap-1.5"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{t('breakGlassTitle')}</span>
          </button>
        </div>
      </div>

      {/* Pending Dual Approvals Queue (if any) */}
      {pendingApprovals.length > 0 && (
        <div className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-xl p-4 space-y-2.5">
          <div className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>Sensitive Role Assignments Awaiting Dual Approval ({pendingApprovals.length})</span>
          </div>
          <div className="divide-y divide-amber-200/70 dark:divide-amber-900/50">
            {pendingApprovals.map(pa => {
              const u = users.find(x => x.id === pa.userId);
              return (
                <div key={pa.id} className="py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      {u?.fullNameEn || pa.userId}
                    </span>{' '}
                    → <span className="font-mono font-bold text-teal-700 dark:text-teal-300">{pa.roleCode}</span>{' '}
                    <span className="text-slate-500">({pa.scopeType}) · Requested by {pa.assignedByName}</span>
                    <div className="text-[11px] text-slate-600 dark:text-slate-400">Reason: {pa.justification}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setActionReason('');
                        setActionModal({
                          title: `Approve Assignment: ${pa.roleCode}`,
                          endpoint: `/api/v1/rbac/assignments/${pa.id}/decision`,
                          method: 'POST',
                          extraBody: { approve: true }
                        });
                      }}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-semibold inline-flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Approve</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActionReason('');
                        setActionModal({
                          title: `Reject Assignment: ${pa.roleCode}`,
                          endpoint: `/api/v1/rbac/assignments/${pa.id}/decision`,
                          method: 'POST',
                          extraBody: { approve: false }
                        });
                      }}
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-md font-semibold inline-flex items-center gap-1"
                    >
                      <XCircle className="w-3 h-3" />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Split: Assignments + Assign Form | Visual Effective Permissions Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Assigned Roles + Assign Role Form */}
        <div className="lg:col-span-7 space-y-5">
          {/* Active & Historical Assignments for User */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div className="font-bold text-slate-900 dark:text-slate-100">
                Composite Roles Held by {selectedUser?.fullNameEn}
              </div>
              <div className="flex items-center gap-2">
                {selectedAssignmentIdsForRevoke.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setActionReason('');
                      setActionModal({
                        title: `${t('bulkRevokeRoles')} (${selectedAssignmentIdsForRevoke.length})`,
                        endpoint: '/api/v1/rbac/assignments/bulk-revoke',
                        method: 'POST',
                        extraBody: { assignmentIds: selectedAssignmentIdsForRevoke }
                      });
                    }}
                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-md font-semibold text-[11px] inline-flex items-center gap-1"
                  >
                    <Ban className="w-3 h-3" />
                    <span>
                      {t('bulkRevokeRoles')} ({selectedAssignmentIdsForRevoke.length})
                    </span>
                  </button>
                )}
                <span className="font-mono text-[11px] text-teal-700 dark:text-teal-400">
                  Primary Baseline: {selectedUser?.role}
                </span>
              </div>
            </div>

            {userAssignments.length === 0 ? (
              <div className="p-6 text-center text-slate-400">
                No additional scoped or time-bound role assignments recorded beyond primary baseline role ({selectedUser?.role}).
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {userAssignments.map(a => (
                  <div key={a.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      {a.status === 'Active' && (
                        <input
                          type="checkbox"
                          aria-label={`Select assignment ${a.roleCode} for bulk removal`}
                          checked={selectedAssignmentIdsForRevoke.includes(a.id)}
                          onChange={e =>
                            setSelectedAssignmentIdsForRevoke(prev =>
                              e.target.checked ? [...prev, a.id] : prev.filter(id => id !== a.id)
                            )
                          }
                          className="mt-1 rounded border-slate-300 text-rose-600"
                        />
                      )}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-slate-100">
                            {language === 'am' ? a.roleNameAm : a.roleNameEn}
                          </span>
                          <span className="font-mono text-[11px] text-slate-400">({a.roleCode})</span>
                          <span className={`font-semibold text-[11px] ${
                            a.status === 'Active'
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : a.status === 'PendingApproval'
                                ? 'text-amber-600'
                                : 'text-rose-600'
                          }`}>
                            {a.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                          Scope: {a.scopeType}{a.scopeTargetId ? ` (${a.scopeTargetId})` : ''} ·{' '}
                          {formatEthiopianDate(a.startDate, language)} →{' '}
                          {a.endDate ? formatEthiopianDate(a.endDate, language) : 'Permanent'}
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400">
                          Justification: {a.justification} {a.ticketRef ? `· Ticket: ${a.ticketRef}` : ''}
                        </div>
                      </div>
                    </div>

                    {a.status === 'Active' && (
                      <button
                        type="button"
                        onClick={() => {
                          setActionReason('');
                          setActionModal({
                            title: `Revoke Role: ${a.roleCode}`,
                            endpoint: `/api/v1/rbac/assignments/${a.id}`,
                            method: 'DELETE'
                          });
                        }}
                        className="px-2.5 py-1.5 text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 border border-rose-200 dark:border-rose-900 rounded-lg font-semibold inline-flex items-center gap-1 shrink-0"
                      >
                        <Ban className="w-3 h-3" />
                        <span>Revoke</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Role Assignment Form */}
          <form
            onSubmit={handleAssignRole}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4"
          >
            <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <UserPlus className="w-4 h-4 text-teal-600" />
              <span>Assign Scoped / Time-Bound Role to {selectedUser?.fullNameEn}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Role *</label>
                <select
                  value={assignRoleId}
                  onChange={(e) => setAssignRoleId(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                >
                  {activeRoles.map(r => (
                    <option key={r.id} value={r.id}>
                      {language === 'am' ? r.nameAm : r.nameEn} ({r.code}) {r.isSensitiveRole ? '[Sensitive]' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Scope</label>
                <select
                  value={assignScopeType}
                  onChange={(e) => {
                    setAssignScopeType(e.target.value as RoleScopeType);
                    setAssignScopeTargetId('');
                  }}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                >
                  <option value="Global">Global</option>
                  <option value="Branch">Branch</option>
                  <option value="Department">Department</option>
                  <option value="Cluster">Cluster</option>
                  <option value="DocumentType">Document Type</option>
                </select>
              </div>

              {assignScopeType !== 'Global' ? (
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Scope Target *</label>
                  <select
                    required
                    value={assignScopeTargetId}
                    onChange={(e) => setAssignScopeTargetId(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  >
                    <option value="">-- Select Target --</option>
                    {assignScopeType === 'Branch' && branches.map(b => <option key={b.id} value={b.id}>{b.code} · {b.nameEn}</option>)}
                    {assignScopeType === 'Department' && departments.map(d => <option key={d.id} value={d.id}>{d.code} · {d.nameEn}</option>)}
                    {assignScopeType === 'Cluster' && CLUSTERS.map(c => <option key={c} value={c}>{c}</option>)}
                    {assignScopeType === 'DocumentType' && DOC_TYPES.map(dt => <option key={dt} value={dt}>{dt}</option>)}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Ticket / Ref #</label>
                  <input
                    type="text"
                    value={assignTicketRef}
                    onChange={(e) => setAssignTicketRef(e.target.value)}
                    placeholder="e.g. EPSS-IAM-2026-44"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Start Date *</label>
                <input
                  type="date"
                  required
                  value={assignStartDate}
                  onChange={(e) => setAssignStartDate(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  End Date (optional, max {authPolicy?.maxTimeBoundRoleDays || 365}d)
                </label>
                <input
                  type="date"
                  value={assignEndDate}
                  onChange={(e) => setAssignEndDate(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                />
              </div>

              {assignScopeType !== 'Global' && (
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Ticket / Ref #</label>
                  <input
                    type="text"
                    value={assignTicketRef}
                    onChange={(e) => setAssignTicketRef(e.target.value)}
                    placeholder="e.g. EPSS-IAM-2026-44"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                  />
                </div>
              )}

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('justificationMin10')} *
                </label>
                <input
                  type="text"
                  required
                  value={assignJustification}
                  onChange={(e) => setAssignJustification(e.target.value)}
                  placeholder="Describe business need and authorization reference..."
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <label className="inline-flex items-center gap-2 text-[11px] font-semibold text-amber-700 dark:text-amber-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={assignOverrideSod}
                  onChange={(e) => setAssignOverrideSod(e.target.checked)}
                  className="rounded border-amber-300 text-amber-600"
                />
                <span>Explicitly override blocking SoD check (audited)</span>
              </label>

              <button
                type="submit"
                disabled={isAssigning}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{isAssigning ? 'Assigning...' : 'Assign Role'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right 5 Cols: Visual Effective Permissions Summary + Break-Glass Active List */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-teal-600" />
                <span>{t('effectivePermissionsTitle')}</span>
              </div>
              {loadingPreview && <span className="text-[11px] text-slate-400">Refreshing...</span>}
            </div>

            {effectivePreview && (
              <div className="space-y-3">
                {effectivePreview.activeBreakGlass && (
                  <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200">
                    <div className="font-bold flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5" />
                      <span>Active Break-Glass Elevation: {effectivePreview.activeBreakGlass.targetRoleCode}</span>
                    </div>
                    <div className="text-[11px] font-mono mt-0.5 tabular-nums">
                      Expires: {formatEthiopianDate(effectivePreview.activeBreakGlass.expiresAt, language, true)}
                    </div>
                  </div>
                )}

                {effectivePreview.sodWarnings.length > 0 && (
                  <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>SoD Conflicts ({effectivePreview.sodWarnings.length})</span>
                    </div>
                    {effectivePreview.sodWarnings.map((w, i) => (
                      <div key={i} className="text-[11px] mt-1">[{w.severity}] {w.detail}</div>
                    ))}
                  </div>
                )}

                <div>
                  <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Effective Union of Roles
                  </div>
                  <div className="font-mono font-semibold text-teal-700 dark:text-teal-300">
                    {effectivePreview.activeRoleCodes.join(' · ') || 'None'}
                  </div>
                </div>

                <div className="max-h-80 overflow-y-auto space-y-1.5 pr-1">
                  {Object.entries(effectivePreview.effectiveLevels).map(([k, lvl]) => {
                    const denied = effectivePreview.explicitDenies.includes(k) || lvl === 'None';
                    return (
                      <div
                        key={k}
                        className={`px-3 py-1.5 rounded-lg border flex items-center justify-between text-[11px] ${
                          denied
                            ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300'
                            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <span className="font-mono truncate">{k}</span>
                        <span className="font-semibold shrink-0">{denied ? 'DENIED' : lvl}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Break-Glass Elevation Log */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span>Emergency Break-Glass Elevations ({breakGlassList.length})</span>
            </div>
            {breakGlassList.length === 0 ? (
              <div className="p-5 text-center text-slate-400">No Break-Glass elevations recorded.</div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto">
                {breakGlassList.map(bg => (
                  <div key={bg.id} className="p-3.5 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {bg.userName} → <span className="font-mono text-rose-600">{bg.targetRoleCode}</span>
                      </span>
                      <span className={`font-semibold text-[11px] ${
                        bg.status === 'Active' ? 'text-rose-600' : 'text-slate-500'
                      }`}>
                        {bg.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                      Expires: {formatEthiopianDate(bg.expiresAt, language, true)} · Dual Approvers: {bg.approvedByName} & {bg.dualApprovedByName}
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span className="text-[11px] text-slate-600 dark:text-slate-400 truncate">Reason: {bg.reason}</span>
                      {bg.status === 'Active' && (
                        <button
                          type="button"
                          onClick={() => {
                            setActionReason('');
                            setActionModal({
                              title: `Revoke Break-Glass: ${bg.userName}`,
                              endpoint: `/api/v1/rbac/break-glass/${bg.id}/revoke`,
                              method: 'POST'
                            });
                          }}
                          className="px-2 py-1 text-[11px] font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 rounded shrink-0"
                        >
                          Revoke Now
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BULK ASSIGN MODAL */}
      {showBulkModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleBulkSubmit}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
          >
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Bulk Role Assignment (Filtered Staff List or CSV)
              </h3>
              <button type="button" onClick={() => setShowBulkModal(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Target Role *</label>
                  <select
                    value={bulkRoleId}
                    onChange={(e) => setBulkRoleId(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  >
                    {activeRoles.map(r => (
                      <option key={r.id} value={r.id}>{r.nameEn} ({r.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Optional End Date</label>
                  <input
                    type="date"
                    value={bulkEndDate}
                    onChange={(e) => setBulkEndDate(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Import Usernames / Emails via CSV</span>
                  <button
                    type="button"
                    onClick={handleParseBulkCsv}
                    className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-[11px] font-semibold inline-flex items-center gap-1"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Match CSV Users</span>
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={bulkCsvText}
                  onChange={(e) => setBulkCsvText(e.target.value)}
                  placeholder="Paste comma/newline separated usernames or emails (e.g. selamawit.b, dawit.t)..."
                  className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Select Staff Users ({bulkSelectedUserIds.length} selected)
                  </span>
                  <select
                    value={bulkFilterBranch}
                    onChange={(e) => setBulkFilterBranch(e.target.value)}
                    className="p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  >
                    <option value="all">All Branches</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.nameEn}</option>)}
                  </select>
                </div>
                <div className="max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg divide-y divide-slate-100 dark:divide-slate-800">
                  {bulkFilteredUsers.map(u => (
                    <label key={u.id} className="px-3 py-2 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={bulkSelectedUserIds.includes(u.id)}
                          onChange={(e) =>
                            setBulkSelectedUserIds(prev =>
                              e.target.checked ? [...prev, u.id] : prev.filter(id => id !== u.id)
                            )
                          }
                          className="rounded border-slate-300 text-teal-700"
                        />
                        <span className="font-medium text-slate-800 dark:text-slate-200">{u.fullNameEn}</span>
                        <span className="font-mono text-[11px] text-slate-400">@{u.username}</span>
                      </div>
                      <span className="text-[11px] text-slate-500">{u.role}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Ticket / Ref #</label>
                  <input
                    type="text"
                    value={bulkTicketRef}
                    onChange={(e) => setBulkTicketRef(e.target.value)}
                    placeholder="HR-BATCH-2026"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">{t('justificationMin10')} *</label>
                  <input
                    type="text"
                    required
                    value={bulkJustification}
                    onChange={(e) => setBulkJustification(e.target.value)}
                    placeholder="Reason for bulk role provisioning..."
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
              <button type="button" onClick={() => setShowBulkModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-semibold">
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-semibold disabled:opacity-50"
              >
                {isProcessing ? 'Assigning...' : `Assign to ${bulkSelectedUserIds.length} User(s)`}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* BREAK-GLASS ELEVATION MODAL */}
      {showBreakGlassModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleGrantBreakGlass}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-lg w-full p-5 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-rose-700 dark:text-rose-400 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                <span>{t('breakGlassTitle')}</span>
              </h3>
              <button type="button" onClick={() => setShowBreakGlassModal(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <p className="text-[11px] text-slate-600 dark:text-slate-400 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-lg p-2.5">
              Grants temporary time-limited emergency elevation with automatic expiry and immediate real-time notification to all Security Officers. Requires an independent second approver.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Staff User *</label>
                <select
                  value={bgUserId}
                  onChange={(e) => setBgUserId(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                >
                  {users.filter(u => u.status === 'Active').map(u => (
                    <option key={u.id} value={u.id}>{u.fullNameEn} (@{u.username})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Target Elevated Role *</label>
                  <select
                    value={bgRoleId}
                    onChange={(e) => setBgRoleId(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  >
                    {activeRoles.map(r => (
                      <option key={r.id} value={r.id}>{r.nameEn} ({r.code})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Duration Hours (max {authPolicy?.maxBreakGlassHours || 4}h) *
                  </label>
                  <input
                    type="number"
                    min={0.5}
                    max={authPolicy?.maxBreakGlassHours || 4}
                    step={0.5}
                    required
                    value={bgDurationHours}
                    onChange={(e) => setBgDurationHours(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono tabular-nums"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Independent Dual Approver *
                </label>
                <select
                  required
                  value={bgDualApproverId}
                  onChange={(e) => setBgDualApproverId(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                >
                  <option value="">-- Select Second Officer --</option>
                  {eligibleDualApprovers.map(u => (
                    <option key={u.id} value={u.id}>{u.fullNameEn} ({u.role})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Incident / Ticket Reference</label>
                <input
                  type="text"
                  value={bgTicketRef}
                  onChange={(e) => setBgTicketRef(e.target.value)}
                  placeholder="INC-2026-991"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Emergency Reason (min 10 chars) *</label>
                <textarea
                  rows={2}
                  required
                  value={bgReason}
                  onChange={(e) => setBgReason(e.target.value)}
                  placeholder="Explain urgent incident requiring Break-Glass privilege elevation..."
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button type="button" onClick={() => setShowBreakGlassModal(false)} className="px-4 py-2 text-slate-600 rounded-lg font-semibold">
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold disabled:opacity-50"
              >
                {isProcessing ? 'Authorizing...' : 'Authorize Break-Glass'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* REASON CONFIRMATION MODAL */}
      {actionModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleConfirmAction}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl"
          >
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{actionModal.title}</h3>
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('justificationMin10')} *
              </label>
              <textarea
                rows={3}
                required
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Enter audited reason (minimum 10 characters)..."
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={() => setActionModal(null)} className="px-3.5 py-2 text-slate-600 rounded-lg font-semibold">
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-semibold disabled:opacity-50"
              >
                {isProcessing ? 'Submitting...' : t('submit')}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
