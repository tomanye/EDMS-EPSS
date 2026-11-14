import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Copy,
  Cpu,
  Database,
  KeyRound,
  Mail,
  Network,
  Plus,
  RefreshCw,
  Send,
  Server,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Trash2,
  Webhook,
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import { apiFetch } from '../../lib/apiFetch.js';
import { formatEthiopianDate } from '../../lib/translations.js';
import {
  ConnectorExchangeLog,
  EnterpriseConnector,
  IntegrationApiKey,
  IntegrationApiScope,
  IntegrationEventType,
  WebhookDeliveryRecord,
  WebhookSubscription
} from '../../types/index.js';

type ConsoleTab = 'connectors' | 'webhooks' | 'apikeys' | 'gateway';

const INTEGRATION_EVENTS: { id: IntegrationEventType; label: string }[] = [
  { id: 'document.registered', label: 'document.registered' },
  { id: 'document.approved', label: 'document.approved' },
  { id: 'document.dispatched', label: 'document.dispatched' },
  { id: 'workflow.escalated', label: 'workflow.escalated' },
  { id: 'disposal.executed', label: 'disposal.executed' },
  { id: 'connector.sync', label: 'connector.sync' }
];

const API_SCOPES: { id: IntegrationApiScope; label: string }[] = [
  { id: 'correspondence:ingest', label: 'correspondence:ingest' },
  { id: 'correspondence:read', label: 'correspondence:read' },
  { id: 'efda:clearance', label: 'efda:clearance' },
  { id: 'erp:sync', label: 'erp:sync' }
];

export const EnterpriseIntegrationsView: React.FC = () => {
  const { language, currentUser, documents, branches, departments, refreshData } = useApp();
  const [activeTab, setActiveTab] = useState<ConsoleTab>('connectors');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Core data
  const [connectors, setConnectors] = useState<EnterpriseConnector[]>([]);
  const [exchanges, setExchanges] = useState<ConnectorExchangeLog[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookSubscription[]>([]);
  const [deliveries, setDeliveries] = useState<WebhookDeliveryRecord[]>([]);
  const [apiKeys, setApiKeys] = useState<IntegrationApiKey[]>([]);

  // Connector actions
  const [testingId, setTestingId] = useState<string | null>(null);
  const [editingConnector, setEditingConnector] = useState<EnterpriseConnector | null>(null);
  const [cfgEndpoint, setCfgEndpoint] = useState('');
  const [cfgAuthMethod, setCfgAuthMethod] = useState<EnterpriseConnector['authMethod']>('OAuth2');
  const [cfgInterval, setCfgInterval] = useState(15);
  const [cfgTimeout, setCfgTimeout] = useState(5000);
  const [cfgVerifyTls, setCfgVerifyTls] = useState(true);
  const [cfgEnabled, setCfgEnabled] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);

  // Exchange dispatch modal
  const [dispatchConnector, setDispatchConnector] = useState<EnterpriseConnector | null>(null);
  const [dispatchOp, setDispatchOp] = useState('');
  const [dispatchDocId, setDispatchDocId] = useState('');
  const [dispatchExtRef, setDispatchExtRef] = useState('');
  const [dispatching, setDispatching] = useState(false);

  // Webhook creation & one-time secret banner
  const [webhookModalOpen, setWebhookModalOpen] = useState(false);
  const [whName, setWhName] = useState('');
  const [whUrl, setWhUrl] = useState('https://erp.epss.gov.et/hooks/edrms-events');
  const [whConnectorId, setWhConnectorId] = useState('');
  const [whEvents, setWhEvents] = useState<IntegrationEventType[]>(['document.registered', 'connector.sync']);
  const [creatingWh, setCreatingWh] = useState(false);
  const [revealedWebhookSecret, setRevealedWebhookSecret] = useState<{ name: string; secret: string } | null>(null);
  const [deletingWhId, setDeletingWhId] = useState<string | null>(null);
  const [retryingDeliveryId, setRetryingDeliveryId] = useState<string | null>(null);

  // API key issuance & one-time plaintext key banner
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [keyScopes, setKeyScopes] = useState<IntegrationApiScope[]>(['correspondence:ingest', 'efda:clearance']);
  const [keyBranchId, setKeyBranchId] = useState('br-hq');
  const [keyConnectorId, setKeyConnectorId] = useState('');
  const [keyExpiresDays, setKeyExpiresDays] = useState(365);
  const [creatingKey, setCreatingKey] = useState(false);
  const [revealedApiKey, setRevealedApiKey] = useState<{ name: string; key: string } | null>(null);
  const [confirmRevokeKey, setConfirmRevokeKey] = useState<IntegrationApiKey | null>(null);

  // Inbound gateway tester
  const [gwApiKey, setGwApiKey] = useState('');
  const [gwExtRef, setGwExtRef] = useState(`EFDA-CLR-${new Date().getUTCFullYear()}-042`);
  const [gwSenderOrg, setGwSenderOrg] = useState('Ethiopian Food and Drug Authority (EFDA)');
  const [gwSubjectEn, setGwSubjectEn] = useState('Port of Entry Cold-Chain Batch Clearance Authorization');
  const [gwDeptId, setGwDeptId] = useState(departments[0]?.id || 'dept-reg');
  const [gwPriority, setGwPriority] = useState<'Normal' | 'Urgent' | 'Immediate'>('Urgent');
  const [gwTesting, setGwTesting] = useState(false);
  const [gwResponse, setGwResponse] = useState<{ ok: boolean; status: number; body: unknown } | null>(null);

  const canManageIntegrations =
    currentUser?.role === 'SuperAdmin' ||
    currentUser?.role === 'DirectorGeneral' ||
    (currentUser?.permissions || []).includes('manage:organizations');

  const canIssueKeys =
    currentUser?.role === 'SuperAdmin' || currentUser?.role === 'DirectorGeneral';

  const notify = (type: 'success' | 'error', text: string) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 5000);
  };

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      const [cRes, eRes, wRes, dRes, kRes] = await Promise.all([
        apiFetch('/api/v1/integrations/connectors'),
        apiFetch('/api/v1/integrations/exchanges'),
        apiFetch('/api/v1/integrations/webhooks'),
        apiFetch('/api/v1/integrations/webhooks/deliveries'),
        apiFetch('/api/v1/integrations/api-keys')
      ]);

      const [cData, eData, wData, dData, kData] = await Promise.all([
        cRes.json().catch(() => []),
        eRes.json().catch(() => []),
        wRes.json().catch(() => []),
        dRes.json().catch(() => []),
        kRes.json().catch(() => [])
      ]);

      setConnectors(Array.isArray(cData) ? cData : []);
      setExchanges(Array.isArray(eData) ? eData : []);
      setWebhooks(Array.isArray(wData) ? wData : []);
      setDeliveries(Array.isArray(dData) ? dData : []);
      setApiKeys(Array.isArray(kData) ? kData : []);
    } catch (err: any) {
      notify('error', err?.message || 'Failed to synchronize integration telemetry.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const copyToClipboard = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      notify('success', `${label} copied to clipboard.`);
    } catch {
      notify('error', 'Clipboard access denied by browser.');
    }
  };

  const handleTestConnection = async (id: string) => {
    try {
      setTestingId(id);
      const res = await apiFetch(`/api/v1/integrations/connectors/${id}/test`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Ping failed');
      setConnectors(prev => prev.map(c => (c.id === id ? data : c)));
      await loadAll();
      if (data.status === 'Connected') {
        notify('success', `${data.name} verified (${data.pingLatencyMs}ms RTT).`);
      } else {
        notify('error', `${data.name} reported Offline: ${data.lastError || 'Check configuration'}`);
      }
    } catch (err: any) {
      notify('error', err?.message || 'Failed to ping connector.');
    } finally {
      setTestingId(null);
    }
  };

  const openConfigureModal = (conn: EnterpriseConnector) => {
    setEditingConnector(conn);
    setCfgEndpoint(conn.endpoint);
    setCfgAuthMethod(conn.authMethod);
    setCfgInterval(conn.syncIntervalMinutes ?? 15);
    setCfgTimeout(conn.timeoutMs ?? 5000);
    setCfgVerifyTls(conn.verifyTls ?? true);
    setCfgEnabled(conn.enabled ?? true);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingConnector) return;
    try {
      setSavingConfig(true);
      const res = await apiFetch(`/api/v1/integrations/connectors/${editingConnector.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: cfgEndpoint,
          authMethod: cfgAuthMethod,
          syncIntervalMinutes: cfgInterval,
          timeoutMs: cfgTimeout,
          verifyTls: cfgVerifyTls,
          enabled: cfgEnabled
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to update connector configuration.');
      setConnectors(prev => prev.map(c => (c.id === editingConnector.id ? data : c)));
      setEditingConnector(null);
      notify('success', `Configuration saved for ${data.name}.`);
    } catch (err: any) {
      notify('error', err?.message || 'Failed to save configuration.');
    } finally {
      setSavingConfig(false);
    }
  };

  const openDispatchModal = (conn: EnterpriseConnector) => {
    setDispatchConnector(conn);
    setDispatchOp('');
    setDispatchDocId('');
    setDispatchExtRef('');
  };

  const handleDispatchExchange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchConnector) return;
    try {
      setDispatching(true);
      const res = await apiFetch(`/api/v1/integrations/connectors/${dispatchConnector.id}/exchange`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation: dispatchOp.trim() || undefined,
          documentId: dispatchDocId || undefined,
          externalRefId: dispatchExtRef.trim() || undefined
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to dispatch connector payload.');
      setDispatchConnector(null);
      await loadAll();
      notify('success', `Exchange dispatched: ${data.exchange?.externalRefId || 'Confirmed'}.`);
    } catch (err: any) {
      notify('error', err?.message || 'Dispatch failed.');
    } finally {
      setDispatching(false);
    }
  };

  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreatingWh(true);
      const res = await apiFetch('/api/v1/integrations/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: whName,
          targetUrl: whUrl,
          connectorId: whConnectorId || undefined,
          events: whEvents
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to register webhook.');
      setWebhookModalOpen(false);
      setWhName('');
      if (data.oneTimeSecret) {
        setRevealedWebhookSecret({
          name: data.subscription?.name || whName,
          secret: data.oneTimeSecret
        });
      }
      await loadAll();
      notify('success', `Webhook "${data.subscription?.name}" registered with HMAC-SHA256 signing.`);
    } catch (err: any) {
      notify('error', err?.message || 'Webhook creation failed.');
    } finally {
      setCreatingWh(false);
    }
  };

  const handleToggleWebhook = async (sub: WebhookSubscription) => {
    try {
      const res = await apiFetch(`/api/v1/integrations/webhooks/${sub.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !sub.isActive })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to update webhook state.');
      setWebhooks(prev => prev.map(w => (w.id === sub.id ? data : w)));
      notify('success', `Webhook "${sub.name}" ${data.isActive ? 'activated' : 'paused'}.`);
    } catch (err: any) {
      notify('error', err?.message || 'Toggle failed.');
    }
  };

  const handleTestWebhook = async (sub: WebhookSubscription, simulateFailure: boolean) => {
    try {
      const res = await apiFetch(`/api/v1/integrations/webhooks/${sub.id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ simulateFailure })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Webhook test failed.');
      await loadAll();
      if (data.delivery?.status === 'Delivered') {
        notify('success', `Signed payload acknowledged (HTTP ${data.delivery.httpStatus}, ${data.delivery.latencyMs}ms).`);
      } else {
        notify('error', `Simulated endpoint failure recorded (HTTP ${data.delivery?.httpStatus}). Retry available below.`);
      }
    } catch (err: any) {
      notify('error', err?.message || 'Webhook test failed.');
    }
  };

  const handleRetryDelivery = async (deliveryId: string) => {
    try {
      setRetryingDeliveryId(deliveryId);
      const res = await apiFetch(`/api/v1/integrations/webhooks/deliveries/${deliveryId}/retry`, {
        method: 'POST'
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Retry failed.');
      await loadAll();
      notify('success', `Delivery retry attempt #${data.delivery?.attemptCount} succeeded (HTTP 200).`);
    } catch (err: any) {
      notify('error', err?.message || 'Retry failed.');
    } finally {
      setRetryingDeliveryId(null);
    }
  };

  const handleDeleteWebhook = async (sub: WebhookSubscription) => {
    try {
      setDeletingWhId(sub.id);
      const res = await apiFetch(`/api/v1/integrations/webhooks/${sub.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to delete webhook.');
      await loadAll();
      notify('success', `Webhook "${sub.name}" deleted.`);
    } catch (err: any) {
      notify('error', err?.message || 'Delete failed.');
    } finally {
      setDeletingWhId(null);
    }
  };

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreatingKey(true);
      const res = await apiFetch('/api/v1/integrations/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: keyName,
          scopes: keyScopes,
          boundBranchId: keyBranchId || 'br-hq',
          boundConnectorId: keyConnectorId || undefined,
          expiresInDays: keyExpiresDays
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to issue API key.');
      setApiKeyModalOpen(false);
      setKeyName('');
      if (data.oneTimePlaintextKey) {
        setRevealedApiKey({
          name: data.apiKey?.name || keyName,
          key: data.oneTimePlaintextKey
        });
        setGwApiKey(data.oneTimePlaintextKey);
      }
      await loadAll();
      notify('success', `API key "${data.apiKey?.name}" issued. Copy the plaintext key now.`);
    } catch (err: any) {
      notify('error', err?.message || 'Key issuance failed.');
    } finally {
      setCreatingKey(false);
    }
  };

  const handleRevokeApiKey = async () => {
    if (!confirmRevokeKey) return;
    try {
      const res = await apiFetch(`/api/v1/integrations/api-keys/${confirmRevokeKey.id}/revoke`, {
        method: 'POST'
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to revoke API key.');
      setConfirmRevokeKey(null);
      await loadAll();
      notify('success', `API key "${data.name}" permanently revoked.`);
    } catch (err: any) {
      notify('error', err?.message || 'Revocation failed.');
    }
  };

  const handleTestInboundGateway = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setGwTesting(true);
      setGwResponse(null);
      const res = await fetch('/api/v1/integrations/inbound/correspondence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-EPSS-API-Key': gwApiKey.trim()
        },
        body: JSON.stringify({
          externalRefId: gwExtRef.trim(),
          senderOrganization: gwSenderOrg.trim(),
          subjectEn: gwSubjectEn.trim(),
          departmentId: gwDeptId,
          priority: gwPriority,
          confidentiality: 'Internal'
        })
      });
      const body = await res.json().catch(() => ({}));
      setGwResponse({ ok: res.ok, status: res.status, body });
      if (res.ok) {
        await Promise.all([loadAll(), refreshData()]);
        notify('success', `Inbound correspondence ${body.document?.registrationNumber} ingested.`);
      } else {
        notify('error', body.error || `Gateway rejected request (HTTP ${res.status}).`);
      }
    } catch (err: any) {
      notify('error', err?.message || 'Gateway request failed.');
    } finally {
      setGwTesting(false);
    }
  };

  const getConnectorIcon = (type: string) => {
    switch (type) {
      case 'SAP_S4HANA':
        return <Database className="w-4 h-4 text-sky-600 dark:text-sky-400" />;
      case 'ActiveDirectory':
        return <Server className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />;
      case 'EthioTelecom_SMS':
        return <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'GovernmentSMTP':
        return <Mail className="w-4 h-4 text-teal-600 dark:text-teal-400" />;
      default:
        return <Cpu className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
    }
  };

  const activeWebhooksCount = webhooks.filter(w => w.isActive).length;
  const activeKeysCount = apiKeys.filter(k => k.status === 'Active').length;
  const failedDeliveriesCount = deliveries.filter(d => d.status === 'Failed').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Enterprise System Integrations (Module 17)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {language === 'am'
              ? 'ከSAP S/4HANA፣ ከActive Directory፣ ከEFDA ፖርታል እና ከHMAC-SHA256 Webhook አገልግሎቶች ጋር የተደረገ ውህደት'
              : 'SAP S/4HANA ERP sync, EFDA clearance gateway, Active Directory LDAP, HMAC-SHA256 webhooks, and scoped API keys.'}
          </p>
        </div>

        <button
          type="button"
          onClick={loadAll}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      {/* KPI Strip (single elevation, tabular numerals) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Active Connectors</div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
              {connectors.filter(c => c.status === 'Connected').length}/{connectors.length}
            </span>
            <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">TLS Verified</span>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Connector Exchanges</div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
              {exchanges.length}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Inbound &amp; Outbound</span>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">HMAC Webhooks</div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
              {activeWebhooksCount}/{webhooks.length}
            </span>
            <span className={`text-[11px] font-medium ${failedDeliveriesCount > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-teal-700 dark:text-teal-400'}`}>
              {failedDeliveriesCount > 0 ? `${failedDeliveriesCount} failed delivery` : 'SHA-256 Signed'}
            </span>
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Scoped API Keys</div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-slate-100">
              {activeKeysCount}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">SHA-256 Hashed</span>
          </div>
        </div>
      </div>

      {/* Feedback Notice */}
      {notice && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
            notice.type === 'success'
              ? 'bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-200'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
          }`}
        >
          <span className="flex items-center gap-2 font-medium">
            {notice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{notice.text}</span>
          </span>
          <button type="button" onClick={() => setNotice(null)} className="opacity-70 hover:opacity-100">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-slate-200 dark:border-slate-800">
        {[
          { id: 'connectors', label: 'Connectors & Exchanges', icon: Network },
          { id: 'webhooks', label: 'HMAC Webhooks & Deliveries', icon: Webhook },
          { id: 'apikeys', label: 'Integration API Keys', icon: KeyRound },
          { id: 'gateway', label: 'Inbound API Gateway', icon: ArrowDownLeft }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as ConsoleTab)}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border-b-2 transition-colors ${
                isActive
                  ? 'border-teal-700 text-teal-800 dark:border-teal-400 dark:text-teal-300'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: CONNECTORS & EXCHANGES */}
      {activeTab === 'connectors' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {connectors.map(c => {
              const statusColor =
                c.status === 'Connected'
                  ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800'
                  : c.status === 'Offline'
                  ? 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800'
                  : 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800';

              return (
                <div
                  key={c.id}
                  className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-4"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg shrink-0">
                          {getConnectorIcon(c.type)}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                            {c.name}
                          </h3>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                            {c.type}
                          </span>
                        </div>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border shrink-0 ${statusColor}`}>
                        {c.status}
                      </span>
                    </div>

                    <p className="mt-3 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {c.description}
                    </p>

                    <div className="mt-3 p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1.5 text-[11px]">
                      <div className="text-slate-500 dark:text-slate-400 truncate">
                        Endpoint:{' '}
                        <span className="font-mono text-slate-800 dark:text-slate-200">{c.endpoint}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span>
                          Auth: <strong className="text-slate-800 dark:text-slate-200">{c.authMethod}</strong>
                        </span>
                        <span>
                          RTT:{' '}
                          <strong className="font-mono tabular-nums text-teal-700 dark:text-teal-400">
                            {c.pingLatencyMs}ms
                          </strong>
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span>
                          Sync:{' '}
                          <strong className="font-mono tabular-nums text-slate-700 dark:text-slate-300">
                            {c.syncIntervalMinutes ?? 15}m
                          </strong>
                        </span>
                        <span>
                          Dispatches:{' '}
                          <strong className="font-mono tabular-nums text-slate-700 dark:text-slate-300">
                            {c.totalDispatches ?? 0}
                          </strong>
                        </span>
                      </div>
                      {c.lastError && (
                        <div className="text-[10px] text-rose-700 dark:text-rose-400 pt-1 border-t border-slate-200 dark:border-slate-700">
                          {c.lastError}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                      <span>Synced {formatEthiopianDate(c.lastSyncTimestamp, language)}</span>
                      <span>{c.verifyTls !== false ? 'TLS Strict' : 'TLS Relaxed'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleTestConnection(c.id)}
                        disabled={testingId === c.id}
                        className="flex-1 px-2.5 py-1.5 text-[11px] font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        <Activity className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                        <span>{testingId === c.id ? 'Pinging...' : 'Ping'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openDispatchModal(c)}
                        disabled={c.enabled === false}
                        className="flex-1 px-2.5 py-1.5 text-[11px] font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors flex items-center justify-center gap-1 disabled:opacity-40"
                      >
                        <Send className="w-3 h-3" />
                        <span>Dispatch Sync</span>
                      </button>

                      {canManageIntegrations && (
                        <button
                          type="button"
                          onClick={() => openConfigureModal(c)}
                          title="Configure Connector"
                          className="p-1.5 text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        >
                          <Settings2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Recent Exchange Ledger */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Recent Connector Exchange Ledger
              </h2>
              <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                {exchanges.length} recorded transactions
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-[11px] text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Timestamp</th>
                    <th className="py-2.5 px-4 font-semibold">Connector</th>
                    <th className="py-2.5 px-4 font-semibold">Direction</th>
                    <th className="py-2.5 px-4 font-semibold">Operation &amp; Summary</th>
                    <th className="py-2.5 px-4 font-semibold">External Ref</th>
                    <th className="py-2.5 px-4 font-semibold">RTT</th>
                    <th className="py-2.5 px-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {exchanges.slice(0, 20).map(ex => (
                    <tr key={ex.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-4 font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {formatEthiopianDate(ex.timestamp, language)}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        {ex.connectorName}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                          {ex.direction === 'Inbound' ? (
                            <ArrowDownLeft className="w-3 h-3 text-sky-600 dark:text-sky-400" />
                          ) : (
                            <ArrowUpRight className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                          )}
                          {ex.direction}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300 max-w-md">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{ex.operation}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{ex.summary}</div>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {ex.externalRefId || ex.registrationNumber || '—'}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px] tabular-nums text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {ex.latencyMs}ms
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                            ex.status === 'Success'
                              ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800'
                              : 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800'
                          }`}
                        >
                          {ex.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {exchanges.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No connector exchange logs recorded yet. Ping or dispatch a connector sync above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: HMAC WEBHOOKS & DELIVERIES */}
      {activeTab === 'webhooks' && (
        <div className="space-y-6">
          {revealedWebhookSecret && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>One-Time HMAC-SHA256 Signing Secret for "{revealedWebhookSecret.name}"</span>
                </span>
                <button
                  type="button"
                  onClick={() => setRevealedWebhookSecret(null)}
                  className="text-amber-700 dark:text-amber-300 hover:underline font-semibold"
                >
                  Dismiss
                </button>
              </div>
              <p className="text-amber-800 dark:text-amber-300">
                Store this secret in your receiving ERP/portal vault now. For security, it will not be displayed again.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-2 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 rounded-lg font-mono text-[11px] text-slate-900 dark:text-slate-100 break-all">
                  {revealedWebhookSecret.secret}
                </code>
                <button
                  type="button"
                  onClick={() => copyToClipboard(revealedWebhookSecret.secret, 'Webhook signing secret')}
                  className="px-3 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded-lg font-semibold flex items-center gap-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Subscribed Event Webhooks (HMAC-SHA256 Signed)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Every event includes header <code className="font-mono">X-EPSS-Signature: t=&lt;epoch&gt;,v1=&lt;hmac&gt;</code>
              </p>
            </div>
            {canManageIntegrations && (
              <button
                type="button"
                onClick={() => setWebhookModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Register Webhook</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {webhooks.map(sub => (
              <div
                key={sub.id}
                className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {sub.name}
                      </h3>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                          sub.isActive
                            ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800'
                            : 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {sub.isActive ? 'Active' : 'Paused'}
                      </span>
                    </div>
                    <div className="mt-1 font-mono text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {sub.targetUrl}
                    </div>
                  </div>
                  <code className="text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded shrink-0">
                    {sub.signingSecretPreview}
                  </code>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {sub.events.map(ev => (
                    <span
                      key={ev}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                    >
                      {ev}
                    </span>
                  ))}
                </div>

                {canManageIntegrations && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleTestWebhook(sub, false)}
                        className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-md"
                      >
                        Test Delivery
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTestWebhook(sub, true)}
                        className="px-2.5 py-1 text-[11px] font-semibold bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-md"
                      >
                        Simulate 502 Failure
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleToggleWebhook(sub)}
                        className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        {sub.isActive ? 'Pause' : 'Resume'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteWebhook(sub)}
                        disabled={deletingWhId === sub.id}
                        className="p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-md"
                        title="Delete Webhook"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Delivery Attempts Ledger */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Signed Webhook Delivery Ledger
              </h3>
              <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                {deliveries.length} attempts
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-[11px] text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Event &amp; Target</th>
                    <th className="py-2.5 px-4 font-semibold">HMAC-SHA256 Header &amp; Digest</th>
                    <th className="py-2.5 px-4 font-semibold">HTTP</th>
                    <th className="py-2.5 px-4 font-semibold">Attempt</th>
                    <th className="py-2.5 px-4 font-semibold">Status</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {deliveries.slice(0, 20).map(del => (
                    <tr key={del.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-4">
                        <div className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                          {del.eventType}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs">
                          {del.subscriptionName} · {del.targetUrl}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[10px] text-slate-600 dark:text-slate-300 max-w-xs">
                        <div className="truncate">Sig: {del.hmacSignatureHeader}</div>
                        <div className="truncate text-slate-400">SHA256: {del.payloadDigestSha256}</div>
                      </td>
                      <td className="py-2.5 px-4 font-mono tabular-nums text-[11px] text-slate-700 dark:text-slate-300">
                        {del.httpStatus} ({del.latencyMs}ms)
                      </td>
                      <td className="py-2.5 px-4 font-mono tabular-nums text-[11px] text-slate-600 dark:text-slate-300">
                        #{del.attemptCount}
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                            del.status === 'Delivered'
                              ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800'
                              : 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800'
                          }`}
                        >
                          {del.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        {del.status === 'Failed' && canManageIntegrations ? (
                          <button
                            type="button"
                            onClick={() => handleRetryDelivery(del.id)}
                            disabled={retryingDeliveryId === del.id}
                            className="px-2.5 py-1 text-[11px] font-semibold bg-teal-700 hover:bg-teal-800 text-white rounded-md disabled:opacity-50"
                          >
                            {retryingDeliveryId === del.id ? 'Retrying...' : 'Retry'}
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400">Ack</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: INTEGRATION API KEYS */}
      {activeTab === 'apikeys' && (
        <div className="space-y-6">
          {revealedApiKey && (
            <div className="p-4 bg-teal-50 dark:bg-teal-950/40 border border-teal-300 dark:border-teal-800 rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4" />
                  <span>One-Time Integration API Key for "{revealedApiKey.name}"</span>
                </span>
                <button
                  type="button"
                  onClick={() => setRevealedApiKey(null)}
                  className="text-teal-700 dark:text-teal-300 hover:underline font-semibold"
                >
                  Dismiss
                </button>
              </div>
              <p className="text-teal-800 dark:text-teal-300">
                Only the SHA-256 hash of this key is stored on the EPSS server. Save it securely now — it has also been pre-filled in the Inbound API Gateway tester tab.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-2 bg-white dark:bg-slate-900 border border-teal-200 dark:border-teal-800 rounded-lg font-mono text-[11px] text-slate-900 dark:text-slate-100 break-all">
                  {revealedApiKey.key}
                </code>
                <button
                  type="button"
                  onClick={() => copyToClipboard(revealedApiKey.key, 'Integration API Key')}
                  className="px-3 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-semibold flex items-center gap-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Scoped Machine-to-Machine Integration API Keys
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Keys are prefix-indexed (<code className="font-mono">epss_int_...</code>), SHA-256 hashed at rest, branch-bound, and scope-enforced.
              </p>
            </div>
            {canIssueKeys && (
              <button
                type="button"
                onClick={() => setApiKeyModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Issue API Key</span>
              </button>
            )}
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-[11px] text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Key Name &amp; Prefix</th>
                    <th className="py-2.5 px-4 font-semibold">Granted Scopes</th>
                    <th className="py-2.5 px-4 font-semibold">Branch Binding</th>
                    <th className="py-2.5 px-4 font-semibold">Usage</th>
                    <th className="py-2.5 px-4 font-semibold">Expires</th>
                    <th className="py-2.5 px-4 font-semibold">Status</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {apiKeys.map(k => (
                    <tr key={k.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-slate-100">{k.name}</div>
                        <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          {k.keyPrefix}••••••
                        </div>
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {k.scopes.map(sc => (
                            <span
                              key={sc}
                              className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                            >
                              {sc}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                        {k.boundBranchId || 'br-hq'}
                      </td>
                      <td className="py-2.5 px-4 font-mono tabular-nums text-[11px] text-slate-700 dark:text-slate-300">
                        {k.usageCount} calls
                      </td>
                      <td className="py-2.5 px-4 font-mono tabular-nums text-[11px] text-slate-500 dark:text-slate-400">
                        {formatEthiopianDate(k.expiresAt, language)}
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${
                            k.status === 'Active'
                              ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800'
                              : 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800'
                          }`}
                        >
                          {k.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        {k.status === 'Active' && canIssueKeys ? (
                          <button
                            type="button"
                            onClick={() => setConfirmRevokeKey(k)}
                            className="px-2.5 py-1 text-[11px] font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800 rounded-md"
                          >
                            Revoke
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            {k.revokedByName ? `By ${k.revokedByName}` : 'Read-only'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {apiKeys.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        No integration API keys visible or issued yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: INBOUND API GATEWAY */}
      {activeTab === 'gateway' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Inbound Correspondence Ingestion Contract
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                External government portals (EFDA, MoH, SAP S/4HANA) push structured official correspondence directly into the EPSS Registry without interactive user login.
              </p>
            </div>

            <div className="p-3 bg-slate-900 text-slate-100 rounded-lg font-mono text-[11px] space-y-1.5 overflow-x-auto">
              <div className="text-teal-400">POST /api/v1/integrations/inbound/correspondence</div>
              <div className="text-slate-300">X-EPSS-API-Key: epss_int_&lt;64-hex-token&gt;</div>
              <div className="text-slate-300">Content-Type: application/json</div>
              <pre className="pt-2 text-slate-200">{`{
  "externalRefId": "EFDA-CLR-2026-042",
  "senderOrganization": "Ethiopian Food and Drug Authority",
  "subjectEn": "Port of Entry Cold-Chain Batch Clearance",
  "departmentId": "dept-reg",
  "priority": "Urgent",
  "confidentiality": "Internal"
}`}</pre>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
              <div>• Requires active key with scope <code className="font-mono">correspondence:ingest</code>.</div>
              <div>• Automatically generates EPSS registration number, cryptographic chain digest, and audit trail entry.</div>
              <div>• Triggers downstream <code className="font-mono">document.registered</code> HMAC-SHA256 webhooks.</div>
            </div>
          </div>

          <form
            onSubmit={handleTestInboundGateway}
            className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 text-xs"
          >
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Live Inbound Gateway Verification
            </h3>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                X-EPSS-API-Key *
              </label>
              <input
                type="text"
                required
                value={gwApiKey}
                onChange={e => setGwApiKey(e.target.value)}
                placeholder="Paste newly issued epss_int_... token"
                className="w-full p-2 font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  External Reference ID
                </label>
                <input
                  type="text"
                  value={gwExtRef}
                  onChange={e => setGwExtRef(e.target.value)}
                  className="w-full p-2 font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target Directorate
                </label>
                <select
                  value={gwDeptId}
                  onChange={e => setGwDeptId(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                >
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.nameEn}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Sender Organization *
                </label>
                <input
                  type="text"
                  required
                  value={gwSenderOrg}
                  onChange={e => setGwSenderOrg(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Priority
                </label>
                <select
                  value={gwPriority}
                  onChange={e => setGwPriority(e.target.value as 'Normal' | 'Urgent' | 'Immediate')}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                >
                  <option value="Normal">Normal</option>
                  <option value="Urgent">Urgent</option>
                  <option value="Immediate">Immediate</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Correspondence Subject *
              </label>
              <input
                type="text"
                required
                minLength={5}
                value={gwSubjectEn}
                onChange={e => setGwSubjectEn(e.target.value)}
                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>

            <button
              type="submit"
              disabled={gwTesting}
              className="w-full py-2 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-lg disabled:opacity-50"
            >
              {gwTesting ? 'Submitting to Gateway...' : 'Send Signed Inbound Correspondence'}
            </button>

            {gwResponse && (
              <div
                className={`p-3 rounded-lg border font-mono text-[11px] overflow-x-auto ${
                  gwResponse.ok
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                    : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                }`}
              >
                <div className="font-bold mb-1">HTTP {gwResponse.status}</div>
                <pre className="whitespace-pre-wrap break-all">
                  {JSON.stringify(gwResponse.body, null, 2)}
                </pre>
              </div>
            )}
          </form>
        </div>
      )}

      {/* MODAL: Configure Connector */}
      {editingConnector && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Configure {editingConnector.name}
              </h3>
              <button type="button" onClick={() => setEditingConnector(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveConfig} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Endpoint URI (SSRF Protected) *
                </label>
                <input
                  type="text"
                  required
                  value={cfgEndpoint}
                  onChange={e => setCfgEndpoint(e.target.value)}
                  className="w-full p-2 font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Auth Method
                  </label>
                  <select
                    value={cfgAuthMethod}
                    onChange={e => setCfgAuthMethod(e.target.value as EnterpriseConnector['authMethod'])}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  >
                    <option value="OAuth2">OAuth2</option>
                    <option value="Mutual_TLS">Mutual_TLS</option>
                    <option value="API_Key">API_Key</option>
                    <option value="LDAP_SSL">LDAP_SSL</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Sync Interval (min)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={1440}
                    value={cfgInterval}
                    onChange={e => setCfgInterval(Number(e.target.value))}
                    className="w-full p-2 font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Timeout (ms)
                  </label>
                  <input
                    type="number"
                    min={500}
                    max={60000}
                    value={cfgTimeout}
                    onChange={e => setCfgTimeout(Number(e.target.value))}
                    className="w-full p-2 font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>
                <div className="flex flex-col justify-end gap-2 pb-1">
                  <label className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={cfgVerifyTls}
                      onChange={e => setCfgVerifyTls(e.target.checked)}
                    />
                    Verify TLS Certificate
                  </label>
                  <label className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={cfgEnabled}
                      onChange={e => setCfgEnabled(e.target.checked)}
                    />
                    Connector Enabled
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingConnector(null)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingConfig}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-semibold disabled:opacity-50"
                >
                  {savingConfig ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Dispatch Sync */}
      {dispatchConnector && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Dispatch Exchange: {dispatchConnector.name}
              </h3>
              <button type="button" onClick={() => setDispatchConnector(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleDispatchExchange} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Operation Name (Optional)
                </label>
                <input
                  type="text"
                  value={dispatchOp}
                  onChange={e => setDispatchOp(e.target.value)}
                  placeholder="e.g. PO & GRV Correspondence Sync"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Link Correspondence Record (Optional)
                </label>
                <select
                  value={dispatchDocId}
                  onChange={e => setDispatchDocId(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                >
                  <option value="">Directory / Directory Synchronization (No Document)</option>
                  {documents.slice(0, 30).map(doc => (
                    <option key={doc.id} value={doc.id}>
                      {doc.registrationNumber} — {doc.subjectEn.slice(0, 48)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  External Transaction Reference (Optional)
                </label>
                <input
                  type="text"
                  value={dispatchExtRef}
                  onChange={e => setDispatchExtRef(e.target.value)}
                  placeholder="e.g. SAP-PO-450009182"
                  className="w-full p-2 font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setDispatchConnector(null)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={dispatching}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-semibold disabled:opacity-50"
                >
                  {dispatching ? 'Dispatching...' : 'Execute Exchange'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Register Webhook */}
      {webhookModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Register HMAC-SHA256 Webhook
              </h3>
              <button type="button" onClick={() => setWebhookModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateWebhook} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Subscription Name *
                </label>
                <input
                  type="text"
                  required
                  minLength={3}
                  value={whName}
                  onChange={e => setWhName(e.target.value)}
                  placeholder="e.g. EFDA Clearance Event Listener"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Target HTTPS Endpoint *
                </label>
                <input
                  type="url"
                  required
                  value={whUrl}
                  onChange={e => setWhUrl(e.target.value)}
                  className="w-full p-2 font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Bound Connector (Optional)
                </label>
                <select
                  value={whConnectorId}
                  onChange={e => setWhConnectorId(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                >
                  <option value="">All Enterprise Connectors</option>
                  {connectors.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Subscribed Events *
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {INTEGRATION_EVENTS.map(ev => {
                    const checked = whEvents.includes(ev.id);
                    return (
                      <label
                        key={ev.id}
                        className="flex items-center gap-1.5 p-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setWhEvents(prev =>
                              checked ? prev.filter(x => x !== ev.id) : [...prev, ev.id]
                            )
                          }
                        />
                        <span className="font-mono text-[10px]">{ev.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setWebhookModalOpen(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingWh || whEvents.length === 0}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-semibold disabled:opacity-50"
                >
                  {creatingWh ? 'Registering...' : 'Create Webhook'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Issue API Key */}
      {apiKeyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Issue Scoped Integration API Key
              </h3>
              <button type="button" onClick={() => setApiKeyModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateApiKey} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Key Label *
                </label>
                <input
                  type="text"
                  required
                  minLength={3}
                  value={keyName}
                  onChange={e => setKeyName(e.target.value)}
                  placeholder="e.g. EFDA Port Clearance Service Account"
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Branch Binding
                  </label>
                  <select
                    value={keyBranchId}
                    onChange={e => setKeyBranchId(e.target.value)}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  >
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.code} — {b.nameEn}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Validity (Days)
                  </label>
                  <input
                    type="number"
                    min={7}
                    max={730}
                    value={keyExpiresDays}
                    onChange={e => setKeyExpiresDays(Number(e.target.value))}
                    className="w-full p-2 font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Bound Connector (Optional)
                </label>
                <select
                  value={keyConnectorId}
                  onChange={e => setKeyConnectorId(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                >
                  <option value="">General External Gateway</option>
                  {connectors.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Permission Scopes *
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {API_SCOPES.map(sc => {
                    const checked = keyScopes.includes(sc.id);
                    return (
                      <label
                        key={sc.id}
                        className="flex items-center gap-1.5 p-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setKeyScopes(prev =>
                              checked ? prev.filter(x => x !== sc.id) : [...prev, sc.id]
                            )
                          }
                        />
                        <span className="font-mono text-[10px]">{sc.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setApiKeyModalOpen(false)}
                  className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingKey || keyScopes.length === 0}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-semibold disabled:opacity-50"
                >
                  {creatingKey ? 'Issuing...' : 'Issue Key'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Confirm API Key Revocation */}
      {confirmRevokeKey && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-sm w-full border border-slate-200 dark:border-slate-800 p-5 space-y-4 text-xs">
            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-bold text-sm">
              <ShieldAlert className="w-4 h-4" />
              <span>Revoke Integration API Key?</span>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              Revoking <strong>{confirmRevokeKey.name}</strong> (<code className="font-mono">{confirmRevokeKey.keyPrefix}...</code>) immediately invalidates any external service authenticating with this credential. This cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmRevokeKey(null)}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRevokeApiKey}
                className="px-4 py-2 bg-rose-700 hover:bg-rose-800 text-white rounded-lg font-semibold"
              >
                Revoke Key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
