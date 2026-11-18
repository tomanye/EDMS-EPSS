import React, { useState } from 'react';
import {
  ClipboardCheck,
  Plus,
  CheckCircle2,
  XCircle,
  Edit3,
  Clock,
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import { apiFetch } from '../../lib/apiFetch.js';
import { formatEthiopianDate } from '../../lib/translations.js';
import { localizeErrorMessage } from '../../lib/localizedErrors.js';
import { useEscapeKey } from '../../lib/useEscapeKey.js';
import {
  AccessReviewCampaign,
  AccessReviewItem,
  EnterpriseRole,
  User
} from '../../types/index.js';

interface AccessReviewPanelProps {
  campaigns: AccessReviewCampaign[];
  roles: EnterpriseRole[];
  users: User[];
  onRefresh: () => Promise<void>;
  onToast: (type: 'success' | 'error', text: string) => void;
}

export const AccessReviewPanel: React.FC<AccessReviewPanelProps> = ({
  campaigns,
  roles,
  users,
  onRefresh,
  onToast
}) => {
  const { language, t } = useApp();

  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(campaigns[0]?.id || '');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Initiate Campaign Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [titleEn, setTitleEn] = useState('');
  const [titleAm, setTitleAm] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date(Date.now() + 14 * 86400000);
    return d.toISOString().slice(0, 10);
  });
  const [reviewerIds, setReviewerIds] = useState<string[]>([]);
  const [targetRoleIds, setTargetRoleIds] = useState<string[]>([]);
  const [campaignReason, setCampaignReason] = useState('');

  // Decision Modal
  const [decisionTarget, setDecisionTarget] = useState<{
    campaignId: string;
    item: AccessReviewItem;
    decision: 'Approved' | 'Revoked' | 'Modified';
  } | null>(null);
  const [decisionComment, setDecisionComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEscapeKey(showCreateModal || !!decisionTarget, () => {
    setShowCreateModal(false);
    setDecisionTarget(null);
  });

  const activeCampaign =
    campaigns.find(c => c.id === selectedCampaignId) || campaigns[0] || null;

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (titleEn.trim().length < 5 || titleAm.trim().length < 3) {
      onToast('error', 'Campaign title in English (min 5) and Amharic are required.');
      return;
    }
    if (campaignReason.trim().length < 10) {
      onToast('error', 'Campaign justification must be at least 10 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiFetch('/api/v1/rbac/access-reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titleEn: titleEn.trim(),
          titleAm: titleAm.trim(),
          description: description.trim() || campaignReason.trim(),
          dueDate: new Date(dueDate + 'T23:59:59Z').toISOString(),
          reviewerIds: reviewerIds.length > 0 ? reviewerIds : undefined,
          targetRoleIds: targetRoleIds.length > 0 ? targetRoleIds : undefined,
          reason: campaignReason.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) {
        onToast('error', localizeErrorMessage(data.error || 'Failed to launch review campaign.', language));
        return;
      }
      setShowCreateModal(false);
      setTitleEn('');
      setTitleAm('');
      setDescription('');
      setCampaignReason('');
      setReviewerIds([]);
      setTargetRoleIds([]);
      setSelectedCampaignId(data.id);
      await onRefresh();
      onToast('success', `Launched Access Review campaign "${data.titleEn}".`);
    } catch {
      onToast('error', localizeErrorMessage('Network error launching access review.', language));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecideItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decisionTarget) return;
    if (decisionComment.trim().length < 10) {
      onToast('error', 'Reviewer comment must be at least 10 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiFetch(
        `/api/v1/rbac/access-reviews/${decisionTarget.campaignId}/items/${decisionTarget.item.id}/decide`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            decision: decisionTarget.decision,
            comment: decisionComment.trim()
          })
        }
      );
      const data = await res.json();
      if (!res.ok) {
        onToast('error', localizeErrorMessage(data.error || 'Failed to record review decision.', language));
        return;
      }
      setDecisionTarget(null);
      setDecisionComment('');
      await onRefresh();
      onToast(
        'success',
        `Recorded ${decisionTarget.decision} decision for ${decisionTarget.item.userName} (${decisionTarget.item.roleCode}).`
      );
    } catch {
      onToast('error', localizeErrorMessage('Network error recording decision.', language));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 text-xs">
      {/* Header Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-teal-600" />
            <span>
              {language === 'am'
                ? 'ወቅታዊ የተጠቃሚ ፈቃድ ግምገማ ዘመቻዎች (Access Certification)'
                : 'Access Review & Periodic Certification Campaigns'}
            </span>
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Periodically certify active role assignments; revoking an item immediately terminates the assignment and records an immutable audit entry.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-semibold inline-flex items-center gap-1.5 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Initiate Certification Campaign</span>
        </button>
      </div>

      {/* Campaigns Grid + Reviewer Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 4 Cols: Campaign List */}
        <div className="lg:col-span-4 space-y-3">
          {campaigns.length === 0 ? (
            <div className="p-6 text-center text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
              No access review campaigns initiated yet.
            </div>
          ) : (
            campaigns.map(c => {
              const total = c.items.length;
              const reviewed = c.items.filter(i => i.status !== 'Pending').length;
              const pct = total === 0 ? 100 : Math.round((reviewed / total) * 100);
              const isSelected = activeCampaign?.id === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCampaignId(c.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-colors space-y-2.5 ${
                    isSelected
                      ? 'bg-teal-50/40 dark:bg-teal-950/20 border-teal-400 dark:border-teal-700'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[11px] font-bold ${
                      c.status === 'Completed' ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-600'
                    }`}>
                      {c.status}
                    </span>
                    <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                      Due {formatEthiopianDate(c.dueDate, language)}
                    </span>
                  </div>
                  <div className="font-bold text-slate-900 dark:text-slate-100">
                    {language === 'am' ? c.titleAm : c.titleEn}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    Reviewers: {c.reviewerNames.join(', ')}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
                      <span>Progress</span>
                      <span>{reviewed}/{total} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-teal-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Right 8 Cols: Reviewer Workbench */}
        <div className="lg:col-span-8">
          {!activeCampaign ? (
            <div className="p-8 text-center text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
              Select a certification campaign to open the reviewer workbench.
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100">
                    {language === 'am' ? activeCampaign.titleAm : activeCampaign.titleEn}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">{activeCampaign.description}</p>
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                >
                  <option value="all">All Items ({activeCampaign.items.length})</option>
                  <option value="Pending">Pending ({activeCampaign.items.filter(i => i.status === 'Pending').length})</option>
                  <option value="Approved">Approved</option>
                  <option value="Revoked">Revoked</option>
                  <option value="Modified">Modified</option>
                </select>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50/70 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold">Staff Member</th>
                      <th className="px-4 py-2.5 font-semibold">Role & Scope</th>
                      <th className="px-4 py-2.5 font-semibold">Status & Reviewer Note</th>
                      <th className="px-4 py-2.5 font-semibold text-right">Certification Decision</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {activeCampaign.items
                      .filter(i => statusFilter === 'all' || i.status === statusFilter)
                      .map(item => (
                        <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-900 dark:text-slate-100">{item.userName}</div>
                            <div className="font-mono text-[11px] text-slate-400">@{item.username}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-teal-700 dark:text-teal-400">{item.roleNameEn}</div>
                            <div className="font-mono text-[11px] text-slate-500">{item.scopeLabel}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className={`font-semibold inline-flex items-center gap-1 ${
                              item.status === 'Approved'
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : item.status === 'Revoked'
                                  ? 'text-rose-600'
                                  : item.status === 'Modified'
                                    ? 'text-sky-600'
                                    : 'text-amber-600'
                            }`}>
                              {item.status === 'Pending' && <Clock className="w-3 h-3" />}
                              <span>{item.status}</span>
                            </div>
                            {item.reviewerComment && (
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                {item.reviewedByName}: {item.reviewerComment}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setDecisionComment('');
                                  setDecisionTarget({
                                    campaignId: activeCampaign.id,
                                    item,
                                    decision: 'Approved'
                                  });
                                }}
                                className="px-2 py-1 text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 rounded hover:bg-emerald-100 inline-flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Approve</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setDecisionComment('');
                                  setDecisionTarget({
                                    campaignId: activeCampaign.id,
                                    item,
                                    decision: 'Modified'
                                  });
                                }}
                                className="px-2 py-1 text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-200 inline-flex items-center gap-1"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>Modify</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setDecisionComment('');
                                  setDecisionTarget({
                                    campaignId: activeCampaign.id,
                                    item,
                                    decision: 'Revoked'
                                  });
                                }}
                                className="px-2 py-1 text-[11px] font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 rounded hover:bg-rose-100 inline-flex items-center gap-1"
                              >
                                <XCircle className="w-3 h-3" />
                                <span>Revoke</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CREATE CAMPAIGN MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <form
            onSubmit={handleCreateCampaign}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-xl w-full p-5 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Initiate Access Certification Campaign
              </h3>
              <button type="button" onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Title (English) *</label>
                <input
                  type="text"
                  required
                  value={titleEn}
                  onChange={(e) => setTitleEn(e.target.value)}
                  placeholder="Q3 Quarterly Sensitive Role Review"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Title (Amharic) *</label>
                <input
                  type="text"
                  required
                  value={titleAm}
                  onChange={(e) => setTitleAm(e.target.value)}
                  placeholder="የሩብ ዓመት የፈቃድ ግምገማ"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Description</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Scope & compliance guidance for reviewers"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Due Date *</label>
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Filter Target Roles (optional)</label>
                <select
                  multiple
                  value={targetRoleIds}
                  onChange={(e) => setTargetRoleIds(Array.from(e.target.selectedOptions, o => o.value))}
                  className="w-full p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg h-20"
                >
                  {roles.map(r => (
                    <option key={r.id} value={r.id}>{r.nameEn}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Assigned Reviewers</label>
                <div className="max-h-28 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg divide-y divide-slate-100 dark:divide-slate-800">
                  {users.filter(u => u.status === 'Active').map(u => (
                    <label key={u.id} className="px-3 py-1.5 flex items-center gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <input
                        type="checkbox"
                        checked={reviewerIds.includes(u.id)}
                        onChange={(e) =>
                          setReviewerIds(prev => (e.target.checked ? [...prev, u.id] : prev.filter(id => id !== u.id)))
                        }
                        className="rounded border-slate-300 text-teal-700"
                      />
                      <span>{u.fullNameEn} ({u.role})</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">{t('justificationMin10')} *</label>
                <input
                  type="text"
                  required
                  value={campaignReason}
                  onChange={(e) => setCampaignReason(e.target.value)}
                  placeholder="Governance mandate or periodic audit cycle reference..."
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-slate-600 rounded-lg font-semibold">
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-semibold disabled:opacity-50"
              >
                {isSubmitting ? 'Launching...' : 'Launch Campaign'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* REVIEW DECISION MODAL */}
      {decisionTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <form
            onSubmit={handleDecideItem}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl"
          >
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Confirm {decisionTarget.decision}: {decisionTarget.item.userName} ({decisionTarget.item.roleCode})
            </h3>
            {decisionTarget.decision === 'Revoked' && (
              <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-[11px] text-rose-700 dark:text-rose-300">
                Revoking this access certification item will immediately revoke the underlying role assignment.
              </div>
            )}
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Reviewer Decision Comment (min 10 characters) *
              </label>
              <textarea
                rows={3}
                required
                value={decisionComment}
                onChange={(e) => setDecisionComment(e.target.value)}
                placeholder="Document certification justification..."
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <button type="button" onClick={() => setDecisionTarget(null)} className="px-3.5 py-2 text-slate-600 rounded-lg font-semibold">
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-semibold disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : `Confirm ${decisionTarget.decision}`}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
