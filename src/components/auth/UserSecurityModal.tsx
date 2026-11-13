import React, { useEffect, useState } from 'react';
import {
  X,
  User as UserIcon,
  KeyRound,
  ShieldCheck,
  Users,
  History,
  Fingerprint,
  Monitor,
  Trash2,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Clock
} from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import { registerBiometricAuthenticator } from '../../lib/webauthn.js';
import { AuthSession, BiometricCredential, DelegationRecord, LoginHistoryEntry, User } from '../../types/index.js';

export type SecurityModalTab = 'profile' | 'password' | 'security' | 'delegation' | 'history';

interface UserSecurityModalProps {
  isOpen: boolean;
  initialTab?: SecurityModalTab;
  onClose: () => void;
}

export const UserSecurityModal: React.FC<UserSecurityModalProps> = ({
  isOpen,
  initialTab = 'profile',
  onClose
}) => {
  const { currentUser, session, delegations, refreshData, refreshSession } = useApp();
  const [activeTab, setActiveTab] = useState<SecurityModalTab>(initialTab);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Security / Sessions State
  const [sessions, setSessions] = useState<AuthSession[]>([]);
  const [biometrics, setBiometrics] = useState<BiometricCredential[]>([]);

  // Delegation State
  const [staffUsers, setStaffUsers] = useState<User[]>([]);
  const [delegateId, setDelegateId] = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
  const [delegationReason, setDelegationReason] = useState('');

  // Login History State
  const [loginHistory, setLoginHistory] = useState<LoginHistoryEntry[]>([]);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setFeedback(null);
      loadTabData(initialTab);
    }
  }, [isOpen, initialTab]);

  const loadTabData = async (tab: SecurityModalTab) => {
    try {
      if (tab === 'security') {
        const [sessRes, bioRes] = await Promise.all([
          fetch('/api/v1/auth/sessions'),
          fetch('/api/v1/auth/webauthn/credentials')
        ]);
        if (sessRes.ok) setSessions(await sessRes.json());
        if (bioRes.ok) {
          const bioJson = await bioRes.json();
          setBiometrics(bioJson.credentials || []);
        }
      } else if (tab === 'delegation') {
        const usrRes = await fetch('/api/v1/organizations/users');
        if (usrRes.ok) {
          const list: User[] = await usrRes.json();
          const eligible = list.filter(u => u.id !== currentUser?.id && u.status !== 'Inactive');
          setStaffUsers(eligible);
          if (eligible.length > 0 && !delegateId) setDelegateId(eligible[0].id);
        }
      } else if (tab === 'history') {
        const histRes = await fetch('/api/v1/auth/login-history');
        if (histRes.ok) setLoginHistory(await histRes.json());
      }
    } catch (err) {
      console.error('Failed loading security panel data:', err);
    }
  };

  const handleTabSwitch = (tab: SecurityModalTab) => {
    setActiveTab(tab);
    setFeedback(null);
    loadTabData(tab);
  };

  if (!isOpen || !currentUser) return null;

  const passwordRules = [
    { label: 'Min 10 characters', ok: newPassword.length >= 10 },
    { label: 'Uppercase letter', ok: /[A-Z]/.test(newPassword) },
    { label: 'Lowercase letter', ok: /[a-z]/.test(newPassword) },
    { label: 'Numeric digit', ok: /[0-9]/.test(newPassword) },
    { label: 'Special character', ok: /[^A-Za-z0-9]/.test(newPassword) },
    { label: 'Not equal to username', ok: newPassword.length > 0 && newPassword.toLowerCase() !== currentUser.username.toLowerCase() }
  ];

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (newPassword !== confirmPassword) {
      setFeedback({ type: 'error', text: 'New password confirmation does not match.' });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/v1/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', text: data.error || 'Password change failed.' });
        return;
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setFeedback({ type: 'success', text: data.message || 'Password updated successfully.' });
    } catch {
      setFeedback({ type: 'error', text: 'Network error while updating password.' });
    } finally {
      setBusy(false);
    }
  };

  const handleEnrollBiometric = async () => {
    setFeedback(null);
    setBusy(true);
    try {
      const res = await registerBiometricAuthenticator(currentUser.id);
      if (res.success) {
        setFeedback({ type: 'success', text: `Enrolled biometric key on ${res.deviceName}.` });
        await loadTabData('security');
        await refreshSession();
      } else {
        setFeedback({ type: 'error', text: 'Biometric enrollment could not be completed.' });
      }
    } catch {
      setFeedback({ type: 'error', text: 'WebAuthn enrollment failed.' });
    } finally {
      setBusy(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    setFeedback(null);
    try {
      const res = await fetch(`/api/v1/auth/sessions/${sessionId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', text: data.error || 'Failed to revoke session.' });
        return;
      }
      setFeedback({ type: 'success', text: 'Session revoked and invalidated.' });
      await loadTabData('security');
    } catch {
      setFeedback({ type: 'error', text: 'Failed to revoke session.' });
    }
  };

  const handleCreateDelegation = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setBusy(true);
    try {
      const res = await fetch('/api/v1/auth/delegations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          delegateId,
          startDate: new Date(`${startDate}T00:00:00Z`).toISOString(),
          endDate: new Date(`${endDate}T23:59:59Z`).toISOString(),
          reason: delegationReason
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', text: data.error || 'Failed to create delegation.' });
        return;
      }
      setDelegationReason('');
      setFeedback({ type: 'success', text: 'Acting authority delegation recorded and activated.' });
      await refreshSession();
      await refreshData();
    } catch {
      setFeedback({ type: 'error', text: 'Network error creating delegation.' });
    } finally {
      setBusy(false);
    }
  };

  const handleRevokeDelegation = async (id: string) => {
    setFeedback(null);
    try {
      const res = await fetch(`/api/v1/auth/delegations/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', text: data.error || 'Failed to revoke delegation.' });
        return;
      }
      setFeedback({ type: 'success', text: 'Delegation revoked.' });
      await refreshSession();
    } catch {
      setFeedback({ type: 'error', text: 'Failed to revoke delegation.' });
    }
  };

  const tabs: { id: SecurityModalTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'profile', label: 'My Profile', icon: UserIcon },
    { id: 'password', label: 'Change Password', icon: KeyRound },
    { id: 'security', label: 'Security & Sessions', icon: ShieldCheck },
    { id: 'delegation', label: 'Delegation', icon: Users },
    { id: 'history', label: 'Login History', icon: History }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-3xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Account Profile & Security Settings
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {currentUser.fullNameEn} · <span className="font-mono">{currentUser.username}</span> · {currentUser.role}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-nav tabs */}
        <div className="px-6 pt-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-1 overflow-x-auto bg-white dark:bg-slate-900">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabSwitch(tab.id)}
                className={`px-3 py-2 text-xs font-semibold border-b-2 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                  active
                    ? 'border-teal-700 dark:border-teal-400 text-teal-800 dark:text-teal-300'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
          {feedback && (
            <div
              className={`p-3 rounded-lg border flex items-center gap-2 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}

          {/* TAB 1: PROFILE */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-[11px] text-slate-400 block">Full Name (English / Amharic)</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {currentUser.fullNameEn} ({currentUser.fullNameAm})
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Username & Email</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">
                    {currentUser.username} · {currentUser.email}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Branch & Directorate</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {currentUser.branchNameEn} — {currentUser.departmentNameEn}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block">Role & MFA Session State</span>
                  <span className="font-semibold text-teal-700 dark:text-teal-400">
                    {currentUser.role} · {session?.mfaVerified ? 'MFA Verified Session' : 'Standard Session'}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <h3 className="font-bold text-slate-900 dark:text-slate-100">Effective RBAC Permissions</h3>
                <div className="flex flex-wrap gap-1.5">
                  {currentUser.permissions.map((p) => (
                    <span
                      key={p}
                      className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-[11px] text-slate-700 dark:text-slate-300"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CHANGE PASSWORD */}
          {activeTab === 'password' && (
            <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-1.5">
                {passwordRules.map((r) => (
                  <div
                    key={r.label}
                    className={`flex items-center gap-1.5 text-[11px] ${
                      r.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500'
                    }`}
                  >
                    <CheckCircle2 className={`w-3.5 h-3.5 ${r.ok ? 'opacity-100' : 'opacity-30'}`} />
                    <span>{r.label}</span>
                  </div>
                ))}
              </div>

              <button
                type="submit"
                disabled={busy}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-lg shadow-xs disabled:opacity-50"
              >
                {busy ? 'Updating...' : 'Update Institutional Password'}
              </button>
            </form>
          )}

          {/* TAB 3: SECURITY & ACTIVE SESSIONS */}
          {activeTab === 'security' && (
            <div className="space-y-5">
              {/* Biometric Hardware Keys */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Fingerprint className="w-4 h-4 text-teal-600" />
                      <span>Registered WebAuthn Platform Authenticators</span>
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Required for MFA step-up when opening Confidential or Secret correspondence.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleEnrollBiometric}
                    className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-semibold inline-flex items-center gap-1.5 shrink-0"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Enroll This Device</span>
                  </button>
                </div>

                {biometrics.length === 0 ? (
                  <div className="text-slate-500 text-[11px] py-2">
                    No hardware biometric passkeys enrolled yet.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {biometrics.map((b) => (
                      <div key={b.id} className="py-2 flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-slate-800 dark:text-slate-200">{b.deviceName}</div>
                          <div className="text-[10px] font-mono text-slate-400">
                            ID: {b.credentialId} · Uses: {b.counter}
                          </div>
                        </div>
                        <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400">ACTIVE</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Active Sessions */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Monitor className="w-4 h-4 text-teal-600" />
                  <span>Active Authenticated Sessions ({sessions.length})</span>
                </h3>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {sessions.map((s) => (
                    <div key={s.id} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <span className="truncate">{s.userAgent}</span>
                          {s.isCurrent && (
                            <span className="text-[10px] font-mono font-bold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-1.5 py-0.5 rounded">
                              CURRENT
                            </span>
                          )}
                          {s.mfaVerified && (
                            <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400">MFA</span>
                          )}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 mt-0.5 tabular-nums">
                          IP: {s.ipAddress} · Last active: {new Date(s.lastActiveAt).toLocaleString()} · Idle exp:{' '}
                          {new Date(s.idleExpiresAt).toLocaleTimeString()}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRevokeSession(s.id)}
                        className="px-2.5 py-1 text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 rounded border border-rose-200 dark:border-rose-900 font-semibold shrink-0 inline-flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Revoke</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DELEGATION */}
          {activeTab === 'delegation' && (
            <div className="space-y-5">
              <form
                onSubmit={handleCreateDelegation}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3"
              >
                <h3 className="font-bold text-slate-900 dark:text-slate-100">
                  Assign Acting Authority Delegation (Max 90 Days)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-3">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Acting Delegate Officer *
                    </label>
                    <select
                      required
                      value={delegateId}
                      onChange={(e) => setDelegateId(e.target.value)}
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                    >
                      {staffUsers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.fullNameEn} ({u.role} — {u.departmentNameEn})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      End Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Official Reason / Leave Reference *
                    </label>
                    <input
                      type="text"
                      required
                      minLength={5}
                      value={delegationReason}
                      onChange={(e) => setDelegationReason(e.target.value)}
                      placeholder="e.g. Official regional cold-chain inspection mission to Hawassa"
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={busy}
                    className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50"
                  >
                    {busy ? 'Activating...' : 'Create Acting Delegation'}
                  </button>
                </div>
              </form>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-900 dark:text-slate-100">
                  Active & Historical Delegations ({delegations.length})
                </div>
                {delegations.length === 0 ? (
                  <div className="p-6 text-center text-slate-400">No delegations recorded for your account.</div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {delegations.map((d: DelegationRecord) => (
                      <div key={d.id} className="p-3.5 flex items-center justify-between gap-3">
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {d.delegatorName} ({d.delegatorRole}) → {d.delegateName} ({d.delegateRole})
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {d.reason} · <span className="font-mono">{d.startDate.slice(0, 10)} → {d.endDate.slice(0, 10)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`font-mono font-bold text-[11px] ${
                              d.status === 'Active'
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : d.status === 'Revoked'
                                  ? 'text-rose-600'
                                  : 'text-slate-500'
                            }`}
                          >
                            {d.status}
                          </span>
                          {(d.status === 'Active' || d.status === 'Scheduled') &&
                            (d.delegatorId === currentUser.id || currentUser.role === 'SuperAdmin') && (
                              <button
                                type="button"
                                onClick={() => handleRevokeDelegation(d.id)}
                                className="px-2 py-1 text-[11px] font-semibold text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40"
                              >
                                Revoke
                              </button>
                            )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: LOGIN HISTORY */}
          {activeTab === 'history' && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Timestamp</th>
                    <th className="px-4 py-2.5 font-semibold">Method</th>
                    <th className="px-4 py-2.5 font-semibold">Status</th>
                    <th className="px-4 py-2.5 font-semibold">IP Address</th>
                    <th className="px-4 py-2.5 font-semibold">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loginHistory.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                        No recent login history events recorded.
                      </td>
                    </tr>
                  ) : (
                    loginHistory.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                        <td className="px-4 py-2.5 font-mono tabular-nums text-slate-500 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(h.timestamp).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-slate-700 dark:text-slate-300">{h.method}</td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`font-semibold ${
                              h.status === 'Success'
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : h.status === 'Locked' || h.status === 'Failed'
                                  ? 'text-rose-600'
                                  : 'text-amber-600'
                            }`}
                          >
                            {h.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-slate-500">{h.ipAddress}</td>
                        <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">{h.reason || 'Authenticated'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
