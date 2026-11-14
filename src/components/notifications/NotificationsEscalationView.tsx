import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  CheckCircle2,
  Clock,
  Edit3,
  FileWarning,
  Mail,
  MessageSquare,
  Play,
  Plus,
  Send,
  Settings2,
  Sliders,
  Trash2,
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import { apiFetch } from '../../lib/apiFetch.js';
import { formatEthiopianDate } from '../../lib/translations.js';
import {
  AppNotification,
  EscalationRule,
  EscalationTriggerType,
  NotificationConfig,
  NotificationDeliveryLog,
  NotificationEventType,
  NotificationTemplate,
  User,
  UserNotificationPreferences,
  UserRole
} from '../../types/index.js';

type NotifSubTab = 'center' | 'preferences' | 'templates' | 'escalation' | 'logs';

const EVENT_TYPES: NotificationEventType[] = [
  'Assignment',
  'Approval',
  'OverdueSLA',
  'Dispatch',
  'Security'
];

const ROLES_LIST: UserRole[] = [
  'SuperAdmin',
  'DirectorGeneral',
  'Director',
  'RegistryOfficer',
  'BranchManager',
  'ProcurementOfficer',
  'Auditor'
];

export function groupNotificationsByDate(list: AppNotification[]) {
  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);
  const yesterday = new Date(now.getTime() - 86400000);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);

  const buckets: { key: 'Today' | 'Yesterday' | 'Earlier'; items: AppNotification[] }[] = [
    { key: 'Today', items: [] },
    { key: 'Yesterday', items: [] },
    { key: 'Earlier', items: [] }
  ];

  for (const item of list) {
    const dayKey = (item.timestamp || '').slice(0, 10);
    if (dayKey === todayKey) buckets[0].items.push(item);
    else if (dayKey === yesterdayKey) buckets[1].items.push(item);
    else buckets[2].items.push(item);
  }

  return buckets.filter((b) => b.items.length > 0);
}

export const NotificationsEscalationView: React.FC = () => {
  const {
    currentUser,
    notifications,
    unreadNotificationsCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    documents,
    setSelectedDocument,
    language
  } = useApp();

  const isAdminOrDirector =
    ['SuperAdmin', 'DirectorGeneral', 'Director'].includes(currentUser?.role || '') ||
    (currentUser?.permissions || []).includes('manage:organizations');

  const [subTab, setSubTab] = useState<NotifSubTab>('center');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // Center Filters
  const [readFilter, setReadFilter] = useState<'all' | 'unread'>('all');
  const [eventFilter, setEventFilter] = useState<NotificationEventType | 'All'>('All');

  // Preferences State
  const [prefs, setPrefs] = useState<UserNotificationPreferences | null>(null);
  const [prefEmail, setPrefEmail] = useState('');
  const [prefPhone, setPrefPhone] = useState('');
  const [prefLang, setPrefLang] = useState<'en' | 'am'>('en');

  // Templates & Config State
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [requiredPlaceholdersMap, setRequiredPlaceholdersMap] = useState<
    Record<NotificationEventType, string[]>
  >({
    Assignment: ['{{registrationNumber}}', '{{subject}}'],
    Approval: ['{{registrationNumber}}', '{{subject}}'],
    OverdueSLA: ['{{registrationNumber}}', '{{hoursOverdue}}'],
    Dispatch: ['{{registrationNumber}}', '{{recipientOrganization}}'],
    Security: ['{{userName}}', '{{eventDetails}}']
  });
  const [config, setConfig] = useState<NotificationConfig>({ smsMaxLength: 160, realtimeWsEnabled: true });
  const [smsMaxInput, setSmsMaxInput] = useState('160');

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('tpl-assignment');
  const [tplLangTab, setTplLangTab] = useState<'en' | 'am'>('en');
  const [tplDraft, setTplDraft] = useState<NotificationTemplate | null>(null);

  // Test Dispatch State
  const [testChannel, setTestChannel] = useState<'InApp' | 'Email' | 'SMS'>('Email');
  const [testEmail, setTestEmail] = useState('');
  const [testPhone, setTestPhone] = useState('');
  const [testCustomMsg, setTestCustomMsg] = useState('');

  // Escalation Rules State
  const [rules, setRules] = useState<EscalationRule[]>([]);
  const [staffUsers, setStaffUsers] = useState<User[]>([]);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<EscalationRule | null>(null);
  const [ruleName, setRuleName] = useState('');
  const [ruleTrigger, setRuleTrigger] = useState<EscalationTriggerType>('WorkflowOverdue');
  const [ruleDelayHours, setRuleDelayHours] = useState('4');
  const [ruleTargetType, setRuleTargetType] = useState<'Role' | 'User'>('Role');
  const [ruleTargetRole, setRuleTargetRole] = useState<UserRole>('Director');
  const [ruleTargetUserId, setRuleTargetUserId] = useState('');
  const [ruleChannels, setRuleChannels] = useState<Array<'InApp' | 'Email' | 'SMS'>>(['InApp', 'Email']);
  const [ruleError, setRuleError] = useState('');
  const [deleteRuleTarget, setDeleteRuleTarget] = useState<EscalationRule | null>(null);

  // Delivery Logs State
  const [deliveryLogs, setDeliveryLogs] = useState<NotificationDeliveryLog[]>([]);
  const [logStatusFilter, setLogStatusFilter] = useState<'All' | 'Delivered' | 'Failed'>('All');
  const [logChannelFilter, setLogChannelFilter] = useState<'All' | 'InApp' | 'Email' | 'SMS'>('All');

  const notify = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => {
      setToast((curr) => (curr?.message === message ? null : curr));
    }, 5500);
  }, []);

  const loadPhase7Data = useCallback(async () => {
    try {
      const [prefRes, tplRes, rulesRes, logsRes, usersRes] = await Promise.all([
        apiFetch('/api/v1/notifications/preferences').then((r) => (r.ok ? r.json() : null)),
        apiFetch('/api/v1/notifications/templates').then((r) => (r.ok ? r.json() : null)),
        apiFetch('/api/v1/notifications/escalation-rules').then((r) => (r.ok ? r.json() : [])),
        apiFetch('/api/v1/notifications/delivery-logs').then((r) => (r.ok ? r.json() : [])),
        apiFetch('/api/v1/organizations/users').then((r) => (r.ok ? r.json() : []))
      ]);

      if (prefRes) {
        setPrefs(prefRes);
        setPrefEmail(prefRes.emailAddress || '');
        setPrefPhone(prefRes.phoneNumber || '');
        setPrefLang(prefRes.preferredLanguage || 'en');
        setTestEmail((prev) => prev || prefRes.emailAddress || '');
        setTestPhone((prev) => prev || prefRes.phoneNumber || '');
      }

      if (tplRes && Array.isArray(tplRes.templates)) {
        setTemplates(tplRes.templates);
        if (tplRes.requiredPlaceholders) setRequiredPlaceholdersMap(tplRes.requiredPlaceholders);
        if (tplRes.config) {
          setConfig(tplRes.config);
          setSmsMaxInput(String(tplRes.config.smsMaxLength));
        }
      }

      setRules(Array.isArray(rulesRes) ? rulesRes : []);
      setDeliveryLogs(Array.isArray(logsRes) ? logsRes : []);
      setStaffUsers(Array.isArray(usersRes) ? usersRes : []);
    } catch (err) {
      console.error('Failed to load Phase 7 notifications data:', err);
    }
  }, []);

  useEffect(() => {
    loadPhase7Data();
  }, [loadPhase7Data]);

  useEffect(() => {
    const found = templates.find((t) => t.id === selectedTemplateId) || templates[0] || null;
    if (found) {
      setSelectedTemplateId(found.id);
      setTplDraft({ ...found });
    }
  }, [templates, selectedTemplateId]);

  // Listen to custom open-preferences navigation shortcut if triggered
  useEffect(() => {
    try {
      const pendingTab = window.sessionStorage.getItem('epss_notifications_target_tab') as NotifSubTab | null;
      if (pendingTab) {
        setSubTab(pendingTab);
        window.sessionStorage.removeItem('epss_notifications_target_tab');
      }
    } catch {
      // ignore storage errors
    }

    const handler = (e: Event) => {
      const custom = e as CustomEvent<{ tab?: NotifSubTab }>;
      if (custom.detail?.tab) {
        setSubTab(custom.detail.tab);
      }
    };
    window.addEventListener('epss-notifications-tab', handler);
    return () => window.removeEventListener('epss-notifications-tab', handler);
  }, []);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (readFilter === 'unread' && n.isRead) return false;
      if (eventFilter !== 'All' && n.type !== eventFilter) return false;
      return true;
    });
  }, [notifications, readFilter, eventFilter]);

  const groupedNotifications = useMemo(
    () => groupNotificationsByDate(filteredNotifications),
    [filteredNotifications]
  );

  const handleOpenNotificationDoc = (n: AppNotification) => {
    markNotificationAsRead(n.id);
    if (n.documentId || n.registrationNumber) {
      const found = documents.find(
        (d) => d.id === n.documentId || d.registrationNumber === n.registrationNumber
      );
      if (found) {
        setSelectedDocument(found);
      }
    }
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prefs || !currentUser) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(prefEmail.trim())) {
      notify('error', 'Please enter a valid institutional email address.');
      return;
    }

    try {
      setBusy(true);
      const res = await apiFetch('/api/v1/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailAddress: prefEmail.trim(),
          phoneNumber: prefPhone.trim(),
          preferredLanguage: prefLang,
          channels: prefs.channels
        })
      });
      const data = await res.json();
      if (!res.ok) {
        notify('error', data.error || 'Failed to save preferences.');
        return;
      }
      setPrefs(data);
      notify('success', 'Your notification channel preferences have been saved.');
    } catch {
      notify('error', 'Network error saving notification preferences.');
    } finally {
      setBusy(false);
    }
  };

  const toggleChannel = (et: NotificationEventType, ch: 'inApp' | 'email' | 'sms') => {
    if (!prefs) return;
    setPrefs({
      ...prefs,
      channels: {
        ...prefs.channels,
        [et]: {
          ...prefs.channels[et],
          [ch]: !prefs.channels[et][ch]
        }
      }
    });
  };

  const missingPlaceholders = useMemo(() => {
    if (!tplDraft) return [];
    const reqs = requiredPlaceholdersMap[tplDraft.eventType] || tplDraft.requiredPlaceholders || [];
    const body = tplLangTab === 'en' ? tplDraft.emailBodyEn : tplDraft.emailBodyAm;
    return reqs.filter((ph) => !body.includes(ph));
  }, [tplDraft, tplLangTab, requiredPlaceholdersMap]);

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tplDraft) return;

    try {
      setBusy(true);
      const res = await apiFetch(`/api/v1/notifications/templates/${tplDraft.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tplDraft)
      });
      const data = await res.json();
      if (!res.ok) {
        notify('error', data.error || 'Template validation failed.');
        return;
      }
      await loadPhase7Data();
      notify('success', `Saved bilingual template "${data.name}" (${data.eventType}).`);
    } catch {
      notify('error', 'Network error saving notification template.');
    } finally {
      setBusy(false);
    }
  };

  const handleSendTestDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tplDraft) return;
    try {
      setBusy(true);
      const res = await apiFetch('/api/v1/notifications/test-dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventType: tplDraft.eventType,
          channel: testChannel,
          recipientEmail: testChannel === 'Email' ? testEmail.trim() : undefined,
          recipientPhone: testChannel === 'SMS' ? testPhone.trim() : undefined,
          customMessage: testCustomMsg.trim() || undefined
        })
      });
      const data = await res.json();
      await loadPhase7Data();
      if (!res.ok) {
        notify('error', data.error || 'Test dispatch logged as Failed.');
        return;
      }
      notify('success', `Test ${testChannel} dispatch succeeded (${data.log?.recipientAddress}).`);
    } catch {
      notify('error', 'Failed executing test dispatch.');
    } finally {
      setBusy(false);
    }
  };

  const openNewRuleModal = () => {
    setEditingRule(null);
    setRuleName('');
    setRuleTrigger('WorkflowOverdue');
    setRuleDelayHours('4');
    setRuleTargetType('Role');
    setRuleTargetRole('Director');
    setRuleTargetUserId(staffUsers[0]?.id || '');
    setRuleChannels(['InApp', 'Email']);
    setRuleError('');
    setIsRuleModalOpen(true);
  };

  const openEditRuleModal = (rule: EscalationRule) => {
    setEditingRule(rule);
    setRuleName(rule.name);
    setRuleTrigger(rule.trigger);
    setRuleDelayHours(String(rule.delayHours));
    setRuleTargetType(rule.targetType);
    setRuleTargetRole(rule.targetRole || 'Director');
    setRuleTargetUserId(rule.targetUserId || staffUsers[0]?.id || '');
    setRuleChannels(rule.channels.length ? rule.channels : ['InApp']);
    setRuleError('');
    setIsRuleModalOpen(true);
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setRuleError('');
    const delayNum = Number(ruleDelayHours);
    if (ruleName.trim().length < 3) {
      setRuleError('Rule name must be at least 3 characters.');
      return;
    }
    if (Number.isNaN(delayNum) || delayNum <= 0) {
      setRuleError('Escalation delay must be strictly greater than 0 hours.');
      return;
    }
    if (ruleChannels.length === 0) {
      setRuleError('Select at least one dispatch channel.');
      return;
    }

    try {
      setBusy(true);
      const url = editingRule
        ? `/api/v1/notifications/escalation-rules/${editingRule.id}`
        : '/api/v1/notifications/escalation-rules';
      const res = await apiFetch(url, {
        method: editingRule ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: ruleName.trim(),
          trigger: ruleTrigger,
          delayHours: delayNum,
          targetType: ruleTargetType,
          targetRole: ruleTargetType === 'Role' ? ruleTargetRole : undefined,
          targetUserId: ruleTargetType === 'User' ? ruleTargetUserId : undefined,
          channels: ruleChannels
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setRuleError(data.error || 'Could not save escalation rule.');
        return;
      }
      setIsRuleModalOpen(false);
      await loadPhase7Data();
      notify('success', editingRule ? 'Escalation rule updated.' : 'Escalation rule created.');
    } catch {
      setRuleError('Network error saving escalation rule.');
    } finally {
      setBusy(false);
    }
  };

  const handleToggleRuleActive = async (rule: EscalationRule) => {
    try {
      const res = await apiFetch(`/api/v1/notifications/escalation-rules/${rule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !rule.isActive })
      });
      if (res.ok) {
        await loadPhase7Data();
      }
    } catch {
      notify('error', 'Failed updating rule status.');
    }
  };

  const handleDeleteRule = async () => {
    if (!deleteRuleTarget) return;
    try {
      setBusy(true);
      const res = await apiFetch(`/api/v1/notifications/escalation-rules/${deleteRuleTarget.id}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const d = await res.json();
        notify('error', d.error || 'Failed deleting escalation rule.');
      } else {
        notify('success', 'Escalation rule deleted.');
        await loadPhase7Data();
      }
      setDeleteRuleTarget(null);
    } catch {
      notify('error', 'Network error deleting escalation rule.');
    } finally {
      setBusy(false);
    }
  };

  const handleEvaluateEscalations = async () => {
    try {
      setBusy(true);
      const res = await apiFetch('/api/v1/notifications/escalations/evaluate', {
        method: 'POST'
      });
      const data = await res.json();
      await loadPhase7Data();
      notify(
        'success',
        `Escalation evaluation complete: ${data.triggeredCount || 0} overdue alert(s) dispatched.`
      );
    } catch {
      notify('error', 'Failed running escalation evaluation.');
    } finally {
      setBusy(false);
    }
  };

  const handleSaveSmsConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(smsMaxInput);
    if (Number.isNaN(n) || n < 40 || n > 480) {
      notify('error', 'SMS maximum length must be between 40 and 480 characters.');
      return;
    }
    try {
      setBusy(true);
      const res = await apiFetch('/api/v1/notifications/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ smsMaxLength: n })
      });
      const data = await res.json();
      if (!res.ok) {
        notify('error', data.error || 'Could not update SMS config.');
        return;
      }
      setConfig(data);
      notify('success', `SMS maximum length configured to ${data.smsMaxLength} characters.`);
    } catch {
      notify('error', 'Network error updating notification configuration.');
    } finally {
      setBusy(false);
    }
  };

  const filteredLogs = useMemo(() => {
    return deliveryLogs.filter((l) => {
      if (logStatusFilter !== 'All' && l.status !== logStatusFilter) return false;
      if (logChannelFilter !== 'All' && l.channel !== logChannelFilter) return false;
      return true;
    });
  }, [deliveryLogs, logStatusFilter, logChannelFilter]);

  const failedLogsCount = deliveryLogs.filter((l) => l.status === 'Failed').length;

  return (
    <div className="space-y-6">
      {/* Header & Sub-tab Navigation */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {language === 'am' ? 'ማሳወቂያዎች እና የSLA ማስጠንቀቂያዎች' : 'Notifications & Escalation Center'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {language === 'am'
              ? 'የእውነተኛ ጊዜ ማሳወቂያዎች፣ የግል ምርጫዎች፣ የEN/AM መልእክት ቅጾች እና የቀነ-ገደብ ማስጠንቀቂያ ህጎች'
              : 'Real-time WebSocket dispatch, personal channel preferences, bilingual EN/AM templates, and SLA escalation rules.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 self-start">
          <button
            type="button"
            onClick={() => setSubTab('center')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              subTab === 'center'
                ? 'bg-white dark:bg-slate-700 text-teal-800 dark:text-teal-200 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Notification Center ({unreadNotificationsCount} unread)
          </button>
          <button
            type="button"
            onClick={() => setSubTab('preferences')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              subTab === 'preferences'
                ? 'bg-white dark:bg-slate-700 text-teal-800 dark:text-teal-200 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            My Preferences
          </button>
          {isAdminOrDirector && (
            <>
              <button
                type="button"
                onClick={() => setSubTab('templates')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  subTab === 'templates'
                    ? 'bg-white dark:bg-slate-700 text-teal-800 dark:text-teal-200 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Templates (EN/AM)
              </button>
              <button
                type="button"
                onClick={() => setSubTab('escalation')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  subTab === 'escalation'
                    ? 'bg-white dark:bg-slate-700 text-teal-800 dark:text-teal-200 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Escalation Rules ({rules.length})
              </button>
              <button
                type="button"
                onClick={() => setSubTab('logs')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  subTab === 'logs'
                    ? 'bg-white dark:bg-slate-700 text-teal-800 dark:text-teal-200 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Delivery Logs ({failedLogsCount} failed)
              </button>
            </>
          )}
        </div>
      </div>

      {/* Inline Toast */}
      {toast && (
        <div
          className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-xs font-medium ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 border-rose-200 text-rose-900 dark:bg-rose-950/50 dark:border-rose-800 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
          <button type="button" onClick={() => setToast(null)} className="opacity-70 hover:opacity-100">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* TAB 1: In-App Notification Center */}
      {subTab === 'center' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => setReadFilter('all')}
                  className={`px-3 py-1 rounded-md font-semibold ${
                    readFilter === 'all'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-500'
                  }`}
                >
                  All ({notifications.length})
                </button>
                <button
                  type="button"
                  onClick={() => setReadFilter('unread')}
                  className={`px-3 py-1 rounded-md font-semibold ${
                    readFilter === 'unread'
                      ? 'bg-white dark:bg-slate-700 text-teal-800 dark:text-teal-200 shadow-xs'
                      : 'text-slate-500'
                  }`}
                >
                  Unread ({unreadNotificationsCount})
                </button>
              </div>

              <select
                value={eventFilter}
                onChange={(e) => setEventFilter(e.target.value as NotificationEventType | 'All')}
                className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              >
                <option value="All">All Event Types</option>
                {EVENT_TYPES.map((et) => (
                  <option key={et} value={et}>
                    {et}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => markAllNotificationsAsRead()}
              disabled={unreadNotificationsCount === 0}
              className="px-3 py-1.5 text-xs font-semibold text-teal-800 dark:text-teal-200 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 rounded-lg flex items-center gap-1.5 disabled:opacity-40"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark All Read</span>
            </button>
          </div>

          {groupedNotifications.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No notifications match your current filter.
            </div>
          ) : (
            <div className="space-y-5">
              {groupedNotifications.map((group) => (
                <div key={group.key} className="space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-1">
                    {group.key} ({group.items.length})
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {group.items.map((n) => (
                      <div
                        key={n.id}
                        className={`py-3 px-3 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                          !n.isRead ? 'bg-teal-50/40 dark:bg-teal-950/20' : ''
                        }`}
                      >
                        <div
                          onClick={() => handleOpenNotificationDoc(n)}
                          className="space-y-1 min-w-0 cursor-pointer flex-1"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                n.type === 'OverdueSLA' || n.type === 'Security'
                                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                                  : n.type === 'Approval'
                                    ? 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                    : 'bg-teal-50 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300'
                              }`}
                            >
                              {n.type}
                            </span>
                            <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">
                              {language === 'am' ? n.titleAm : n.titleEn}
                            </span>
                            {n.registrationNumber && (
                              <span className="font-mono text-[11px] font-bold text-teal-700 dark:text-teal-400">
                                {n.registrationNumber}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-300">
                            {language === 'am' ? n.messageAm : n.messageEn}
                          </p>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 text-[11px]">
                          <span className="font-mono text-slate-400 tabular-nums">
                            {formatEthiopianDate(n.timestamp, language)}
                          </span>
                          {!n.isRead && (
                            <button
                              type="button"
                              onClick={() => markNotificationAsRead(n.id)}
                              className="px-2.5 py-1 font-semibold text-teal-700 dark:text-teal-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-50"
                            >
                              Mark read
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: User Preferences */}
      {subTab === 'preferences' && prefs && (
        <form
          onSubmit={handleSavePreferences}
          className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-5"
        >
          <div>
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-teal-600" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Personal Notification Channel Preferences
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Configure which channels deliver alerts for your account ({currentUser?.fullNameEn}). Only you can modify your own preferences.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Notification Email Address *
              </label>
              <input
                type="email"
                value={prefEmail}
                onChange={(e) => setPrefEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                SMS Mobile Number (+251...)
              </label>
              <input
                type="text"
                value={prefPhone}
                onChange={(e) => setPrefPhone(e.target.value)}
                placeholder="+251911220011"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Alert Language (Email & SMS)
              </label>
              <select
                value={prefLang}
                onChange={(e) => setPrefLang(e.target.value as 'en' | 'am')}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              >
                <option value="en">English (EN)</option>
                <option value="am">አማርኛ (Amharic)</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/70 text-[11px] uppercase text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Event Type</th>
                  <th className="px-4 py-3 text-center">In-App Push</th>
                  <th className="px-4 py-3 text-center">Email (SMTP)</th>
                  <th className="px-4 py-3 text-center">SMS (Ethio Telecom)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {EVENT_TYPES.map((et) => (
                  <tr key={et}>
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{et}</td>
                    {(['inApp', 'email', 'sms'] as const).map((ch) => (
                      <td key={ch} className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={!!prefs.channels[et]?.[ch]}
                          onChange={() => toggleChannel(et, ch)}
                          className="w-4 h-4 accent-teal-700 cursor-pointer"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={busy}
              className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg disabled:opacity-50"
            >
              Save My Preferences
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: Admin EN/AM Templates + Test Dispatch */}
      {subTab === 'templates' && isAdminOrDirector && tplDraft && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left Event List */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2 self-start">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 px-1">
              Notification Templates
            </h3>
            {templates.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => setSelectedTemplateId(tpl.id)}
                className={`w-full text-left p-3 rounded-lg border text-xs transition-colors ${
                  selectedTemplateId === tpl.id
                    ? 'bg-teal-50 dark:bg-teal-950/50 border-teal-300 dark:border-teal-800 text-teal-900 dark:text-teal-100'
                    : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="font-bold">{tpl.name}</div>
                <div className="text-[11px] font-mono text-slate-500 mt-0.5">{tpl.eventType}</div>
              </button>
            ))}
          </div>

          {/* Right Bilingual Template Editor + Test Dispatch */}
          <div className="lg:col-span-2 space-y-5">
            <form
              onSubmit={handleSaveTemplate}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 text-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {tplDraft.name} ({tplDraft.eventType})
                  </h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    SMS limit configured to {config.smsMaxLength} characters. Required placeholders must be preserved.
                  </p>
                </div>

                {/* Language Tabs */}
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setTplLangTab('en')}
                    className={`px-3 py-1 rounded-md font-semibold ${
                      tplLangTab === 'en'
                        ? 'bg-white dark:bg-slate-700 text-teal-800 dark:text-teal-200 shadow-xs'
                        : 'text-slate-500'
                    }`}
                  >
                    English (EN)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTplLangTab('am')}
                    className={`px-3 py-1 rounded-md font-semibold ${
                      tplLangTab === 'am'
                        ? 'bg-white dark:bg-slate-700 text-teal-800 dark:text-teal-200 shadow-xs'
                        : 'text-slate-500'
                    }`}
                  >
                    አማርኛ (AM)
                  </button>
                </div>
              </div>

              {/* Required Placeholders Helper */}
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1.5">
                <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  Required Placeholders for {tplDraft.eventType} (click to insert into body):
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(requiredPlaceholdersMap[tplDraft.eventType] || []).map((ph) => {
                    const present = !missingPlaceholders.includes(ph);
                    return (
                      <button
                        key={ph}
                        type="button"
                        onClick={() => {
                          if (tplLangTab === 'en') {
                            setTplDraft({ ...tplDraft, emailBodyEn: `${tplDraft.emailBodyEn} ${ph}` });
                          } else {
                            setTplDraft({ ...tplDraft, emailBodyAm: `${tplDraft.emailBodyAm} ${ph}` });
                          }
                        }}
                        className={`px-2 py-0.5 rounded font-mono text-[11px] border ${
                          present
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-300'
                            : 'bg-rose-50 border-rose-300 text-rose-800 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-300'
                        }`}
                      >
                        {ph} {present ? '✓' : '(missing)'}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Subject ({tplLangTab.toUpperCase()}) *
                </label>
                <input
                  type="text"
                  value={tplLangTab === 'en' ? tplDraft.emailSubjectEn : tplDraft.emailSubjectAm}
                  onChange={(e) =>
                    setTplDraft(
                      tplLangTab === 'en'
                        ? { ...tplDraft, emailSubjectEn: e.target.value }
                        : { ...tplDraft, emailSubjectAm: e.target.value }
                    )
                  }
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Body ({tplLangTab.toUpperCase()}) *
                </label>
                <textarea
                  rows={4}
                  value={tplLangTab === 'en' ? tplDraft.emailBodyEn : tplDraft.emailBodyAm}
                  onChange={(e) =>
                    setTplDraft(
                      tplLangTab === 'en'
                        ? { ...tplDraft, emailBodyEn: e.target.value }
                        : { ...tplDraft, emailBodyAm: e.target.value }
                    )
                  }
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-[11px]"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    SMS Message ({tplLangTab.toUpperCase()}) *
                  </label>
                  <span
                    className={`font-mono text-[11px] tabular-nums ${
                      (tplLangTab === 'en' ? tplDraft.smsBodyEn : tplDraft.smsBodyAm).length >
                      config.smsMaxLength
                        ? 'text-rose-600 font-bold'
                        : 'text-slate-500'
                    }`}
                  >
                    {(tplLangTab === 'en' ? tplDraft.smsBodyEn : tplDraft.smsBodyAm).length} /{' '}
                    {config.smsMaxLength} chars
                  </span>
                </div>
                <textarea
                  rows={2}
                  value={tplLangTab === 'en' ? tplDraft.smsBodyEn : tplDraft.smsBodyAm}
                  onChange={(e) =>
                    setTplDraft(
                      tplLangTab === 'en'
                        ? { ...tplDraft, smsBodyEn: e.target.value }
                        : { ...tplDraft, smsBodyAm: e.target.value }
                    )
                  }
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-[11px]"
                  required
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={busy}
                  className="px-4 py-2 font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg disabled:opacity-50"
                >
                  Save Bilingual Template
                </button>
              </div>
            </form>

            {/* Test Dispatch Panel */}
            <form
              onSubmit={handleSendTestDispatch}
              className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-3 text-xs"
            >
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-teal-600" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Test Multi-Channel Dispatch ({tplDraft.eventType})
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Channel
                  </label>
                  <select
                    value={testChannel}
                    onChange={(e) => setTestChannel(e.target.value as 'InApp' | 'Email' | 'SMS')}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  >
                    <option value="InApp">In-App WebSocket Push</option>
                    <option value="Email">Email (SMTP)</option>
                    <option value="SMS">SMS (Ethio Telecom)</option>
                  </select>
                </div>

                {testChannel === 'Email' && (
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Test Recipient Email
                    </label>
                    <input
                      type="text"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="recipient@epss.gov.et"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                    />
                  </div>
                )}

                {testChannel === 'SMS' && (
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Test Recipient Mobile
                    </label>
                    <input
                      type="text"
                      value={testPhone}
                      onChange={(e) => setTestPhone(e.target.value)}
                      placeholder="+251911220011"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Optional Custom Body Override
                </label>
                <input
                  type="text"
                  value={testCustomMsg}
                  onChange={(e) => setTestCustomMsg(e.target.value)}
                  placeholder="Leave blank to render active template..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={busy}
                  className="px-4 py-1.5 font-semibold text-white bg-slate-800 hover:bg-slate-900 dark:bg-teal-700 dark:hover:bg-teal-800 rounded-lg"
                >
                  Send Test {testChannel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAB 4: Escalation Rules */}
      {subTab === 'escalation' && isAdminOrDirector && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Automated SLA Escalation Rules
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Escalation delay must be strictly greater than 0 hours. Trigger evaluation dispatches multi-channel alerts.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={handleEvaluateEscalations}
                className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Evaluate Escalations Now</span>
              </button>
              <button
                type="button"
                onClick={openNewRuleModal}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Rule</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/70 text-[11px] uppercase text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Rule Name</th>
                  <th className="px-4 py-3">Trigger</th>
                  <th className="px-4 py-3">Delay</th>
                  <th className="px-4 py-3">Escalation Target</th>
                  <th className="px-4 py-3">Channels</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rules.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                      {r.name}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                      {r.trigger}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold tabular-nums text-amber-700 dark:text-amber-300">
                      +{r.delayHours}h
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                      {r.targetType === 'User' ? r.targetUserName || r.targetUserId : `Role: ${r.targetRole}`}
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-600 dark:text-slate-300">
                      {r.channels.join(', ')}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => handleToggleRuleActive(r)}
                        className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                          r.isActive
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                        }`}
                      >
                        {r.isActive ? 'Active' : 'Paused'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditRuleModal(r)}
                          className="p-1.5 text-slate-500 hover:text-teal-700"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteRuleTarget(r)}
                          className="p-1.5 text-slate-500 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* TAB 5: Delivery Logs & SMS Configuration */}
      {subTab === 'logs' && isAdminOrDirector && (
        <div className="space-y-5">
          <form
            onSubmit={handleSaveSmsConfig}
            className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 flex flex-wrap items-center justify-between gap-4 text-xs"
          >
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-teal-600" />
              <div>
                <div className="font-bold text-slate-900 dark:text-slate-100">
                  SMS Gateway Character Limit Configuration
                </div>
                <div className="text-[11px] text-slate-500">
                  Messages exceeding this threshold are blocked on template save and logged as delivery failures.
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={40}
                max={480}
                value={smsMaxInput}
                onChange={(e) => setSmsMaxInput(e.target.value)}
                className="w-24 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono tabular-nums"
              />
              <button
                type="submit"
                disabled={busy}
                className="px-3 py-1.5 font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg"
              >
                Update Limit
              </button>
            </div>
          </form>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileWarning className="w-4 h-4 text-amber-600" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Notification Delivery & Failure Audit Log
                </h2>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <select
                  value={logStatusFilter}
                  onChange={(e) => setLogStatusFilter(e.target.value as 'All' | 'Delivered' | 'Failed')}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                >
                  <option value="All">All Statuses</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Failed">Failed</option>
                </select>
                <select
                  value={logChannelFilter}
                  onChange={(e) =>
                    setLogChannelFilter(e.target.value as 'All' | 'InApp' | 'Email' | 'SMS')
                  }
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                >
                  <option value="All">All Channels</option>
                  <option value="InApp">In-App</option>
                  <option value="Email">Email</option>
                  <option value="SMS">SMS</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/70 text-[11px] uppercase text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Channel</th>
                    <th className="px-4 py-3">Event</th>
                    <th className="px-4 py-3">Recipient</th>
                    <th className="px-4 py-3">Message / Failure Reason</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-500 tabular-nums whitespace-nowrap">
                        {formatEthiopianDate(log.timestamp, language)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200">
                        <span className="inline-flex items-center gap-1">
                          {log.channel === 'Email' && <Mail className="w-3.5 h-3.5 text-teal-600" />}
                          {log.channel === 'SMS' && <MessageSquare className="w-3.5 h-3.5 text-amber-600" />}
                          {log.channel === 'InApp' && <Bell className="w-3.5 h-3.5 text-slate-500" />}
                          <span>{log.channel}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px]">{log.eventType}</td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                        {log.recipientAddress}
                      </td>
                      <td className="px-4 py-3 max-w-sm">
                        <div className="text-slate-700 dark:text-slate-300 truncate">{log.bodyPreview}</div>
                        {log.errorReason && (
                          <div className="text-[11px] text-rose-600 dark:text-rose-400 font-medium mt-0.5">
                            Error: {log.errorReason}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${
                            log.status === 'Delivered'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Create / Edit Escalation Rule */}
      {isRuleModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveRule}
            className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {editingRule ? 'Edit Escalation Rule' : 'New Escalation Rule'}
              </h3>
              <button
                type="button"
                onClick={() => setIsRuleModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs">
              {ruleError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800">
                  {ruleError}
                </div>
              )}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Rule Name *
                </label>
                <input
                  type="text"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  placeholder="e.g. Procurement SLA Overdue Escalation"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Trigger *
                  </label>
                  <select
                    value={ruleTrigger}
                    onChange={(e) => setRuleTrigger(e.target.value as EscalationTriggerType)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  >
                    <option value="WorkflowOverdue">WorkflowOverdue</option>
                    <option value="VeryUrgentUnacted">VeryUrgentUnacted</option>
                    <option value="PhysicalOverdue">PhysicalOverdue</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Delay Hours (&gt; 0) *
                  </label>
                  <input
                    type="number"
                    min={0.5}
                    step={0.5}
                    value={ruleDelayHours}
                    onChange={(e) => setRuleDelayHours(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Target Type
                  </label>
                  <select
                    value={ruleTargetType}
                    onChange={(e) => setRuleTargetType(e.target.value as 'Role' | 'User')}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  >
                    <option value="Role">Role</option>
                    <option value="User">Specific User</option>
                  </select>
                </div>

                {ruleTargetType === 'Role' ? (
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Target Role
                    </label>
                    <select
                      value={ruleTargetRole}
                      onChange={(e) => setRuleTargetRole(e.target.value as UserRole)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                    >
                      {ROLES_LIST.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Target User
                    </label>
                    <select
                      value={ruleTargetUserId}
                      onChange={(e) => setRuleTargetUserId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                    >
                      {staffUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.fullNameEn} ({u.role})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Alert Channels *
                </label>
                <div className="flex items-center gap-4">
                  {(['InApp', 'Email', 'SMS'] as const).map((ch) => (
                    <label key={ch} className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ruleChannels.includes(ch)}
                        onChange={() =>
                          setRuleChannels((prev) =>
                            prev.includes(ch) ? prev.filter((x) => x !== ch) : [...prev, ch]
                          )
                        }
                        className="w-4 h-4 accent-teal-700"
                      />
                      <span>{ch}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsRuleModalOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg"
              >
                Save Rule
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Delete Rule Confirmation */}
      {deleteRuleTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-xl p-5 space-y-4 text-xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Delete Escalation Rule?
            </h3>
            <p className="text-slate-600 dark:text-slate-300">
              Are you sure you want to delete <strong>{deleteRuleTarget.name}</strong>?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteRuleTarget(null)}
                className="px-3 py-1.5 font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleDeleteRule}
                className="px-4 py-1.5 font-semibold text-white bg-rose-700 hover:bg-rose-800 rounded-lg"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
