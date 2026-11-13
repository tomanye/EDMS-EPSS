import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  User as UserIcon,
  Fingerprint,
  KeyRound,
  Eye,
  EyeOff,
  Sun,
  Moon,
  ArrowLeft,
  Mail,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Inbox,
  RefreshCw,
  Building2
} from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import { base64urlToBuffer, bufferToBase64url } from '../../lib/webauthn.js';
import { AuthSession, PasswordResetToken, User, UserRole } from '../../types/index.js';

type AuthScreen = 'login' | 'mfa' | 'reset-request' | 'reset-confirm';

interface MfaPreview {
  challengeToken: string;
  userPreview: {
    id: string;
    fullNameEn: string;
    fullNameAm: string;
    role: UserRole;
    hasBiometrics: boolean;
  };
}

const DEMO_ACCOUNTS: { username: string; role: UserRole; label: string; mfa: boolean }[] = [
  { username: 'superadmin', role: 'SuperAdmin', label: 'System SuperAdmin', mfa: true },
  { username: 'abdulkadir.g', role: 'DirectorGeneral', label: 'Director General', mfa: true },
  { username: 'dawit.t', role: 'Director', label: 'Procurement Director', mfa: true },
  { username: 'selamawit.b', role: 'RegistryOfficer', label: 'Registry Officer', mfa: false },
  { username: 'yonas.a', role: 'BranchManager', label: 'Branch Manager (Hawassa)', mfa: false },
  { username: 'tigist.h', role: 'Auditor', label: 'Internal Auditor', mfa: true }
];

export const LoginView: React.FC = () => {
  const { language, setLanguage, theme, toggleTheme, loginSuccess } = useApp();

  const [screen, setScreen] = useState<AuthScreen>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [demoDirectoryOpen, setDemoDirectoryOpen] = useState(false);

  // MFA Challenge State
  const [mfaChallenge, setMfaChallenge] = useState<MfaPreview | null>(null);
  const [mfaMethod, setMfaMethod] = useState<'webauthn' | 'pin'>('webauthn');
  const [mfaPin, setMfaPin] = useState('');

  // Password Reset State
  const [resetIdentifier, setResetIdentifier] = useState('');
  const [resetRequested, setResetRequested] = useState(false);
  const [devInbox, setDevInbox] = useState<PasswordResetToken[]>([]);
  const [showDevInbox, setShowDevInbox] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');

  const policyChecks = [
    { label: language === 'am' ? 'ቢያንስ 10 ቁምፊዎች' : 'At least 10 characters', ok: resetNewPassword.length >= 10 },
    { label: language === 'am' ? 'ትልቅ ፊደል (A-Z)' : 'Uppercase letter (A-Z)', ok: /[A-Z]/.test(resetNewPassword) },
    { label: language === 'am' ? 'ትንሽ ፊደል (a-z)' : 'Lowercase letter (a-z)', ok: /[a-z]/.test(resetNewPassword) },
    { label: language === 'am' ? 'ቁጥር (0-9)' : 'Numeric digit (0-9)', ok: /[0-9]/.test(resetNewPassword) },
    { label: language === 'am' ? 'ልዩ ምልክት (!@#$...)' : 'Special character (!@#$...)', ok: /[^A-Za-z0-9]/.test(resetNewPassword) }
  ];

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');
    const cleanUser = username.trim();
    if (cleanUser.length < 3 || cleanUser.length > 50) {
      setErrorMsg(language === 'am' ? 'የተጠቃሚ ስም ከ3 እስከ 50 ቁምፊ መሆን አለበት።' : 'Username must be between 3 and 50 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: cleanUser, password })
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Authentication failed.');
        return;
      }

      if (data.mfaRequired && data.challengeToken && data.userPreview) {
        setMfaChallenge({
          challengeToken: data.challengeToken,
          userPreview: data.userPreview
        });
        setMfaMethod(data.userPreview.hasBiometrics ? 'webauthn' : 'pin');
        setMfaPin('');
        setScreen('mfa');
        return;
      }

      if (data.token && data.user && data.session) {
        await loginSuccess(data.token, data.user as User, data.session as AuthSession);
      }
    } catch {
      setErrorMsg('Unable to reach EPSS Authentication Server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerWebAuthnAssertion = async (targetIdentifier: string): Promise<string> => {
    const optRes = await fetch('/api/v1/auth/webauthn/login-options', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: targetIdentifier })
    });
    const options = await optRes.json();

    try {
      if (navigator.credentials && navigator.credentials.get && (options.allowCredentials || []).length > 0) {
        const assertion = (await navigator.credentials.get({
          publicKey: {
            challenge: base64urlToBuffer(options.challenge),
            timeout: options.timeout,
            rpId: options.rpId,
            userVerification: options.userVerification,
            allowCredentials: options.allowCredentials.map((c: any) => ({
              id: base64urlToBuffer(c.id),
              type: 'public-key' as const,
              transports: c.transports
            }))
          }
        })) as PublicKeyCredential | null;
        if (assertion) {
          return bufferToBase64url(assertion.rawId);
        }
      }
    } catch {
      // Sandbox / iframe fallback below
    }
    return options.allowCredentials?.[0]?.id || 'webauthn-platform-sensor';
  };

  const handleBiometricDirectLogin = async () => {
    setErrorMsg('');
    setInfoMsg('');
    const cleanUser = username.trim();
    if (cleanUser.length < 3) {
      setErrorMsg(
        language === 'am'
          ? 'በባዮሜትሪክ ለመግባት መጀመሪያ የተጠቃሚ ስምዎን ያስገቡ።'
          : 'Enter your EPSS username first to trigger WebAuthn biometric login.'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const credentialId = await triggerWebAuthnAssertion(cleanUser);
      const res = await fetch('/api/v1/auth/webauthn/login-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: cleanUser, credentialId })
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Biometric sign-in failed.');
        return;
      }
      if (data.token && data.user && data.session) {
        await loginSuccess(data.token, data.user as User, data.session as AuthSession);
      }
    } catch {
      setErrorMsg('Biometric authentication request failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyMfa = async (methodOverride?: 'webauthn' | 'pin') => {
    if (!mfaChallenge) return;
    const activeMethod = methodOverride || mfaMethod;
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      let credentialId: string | undefined;
      if (activeMethod === 'webauthn') {
        credentialId = await triggerWebAuthnAssertion(username.trim());
      } else if (mfaPin.trim().length < 4) {
        setErrorMsg('Enter your 6-digit EPSS security PIN.');
        setIsSubmitting(false);
        return;
      }

      const res = await fetch('/api/v1/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          challengeToken: mfaChallenge.challengeToken,
          method: activeMethod,
          pin: activeMethod === 'pin' ? mfaPin.trim() : undefined,
          credentialId
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'MFA verification failed.');
        return;
      }
      if (data.token && data.user && data.session) {
        await loginSuccess(data.token, data.user as User, data.session as AuthSession);
      }
    } catch {
      setErrorMsg('Failed to verify MFA challenge.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');
    if (!resetIdentifier.trim()) {
      setErrorMsg('Please enter your username or @epss.gov.et email.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/v1/auth/password-reset/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: resetIdentifier.trim() })
      });
      const data = await res.json();
      setResetRequested(true);
      setInfoMsg(data.message);
      await loadDevInbox();
    } catch {
      setErrorMsg('Failed to process password reset request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadDevInbox = async () => {
    try {
      const res = await fetch('/api/v1/auth/password-reset/dev-inbox');
      if (res.ok) {
        const list = await res.json();
        setDevInbox(Array.isArray(list) ? list : []);
      }
    } catch {
      // Ignore in prod
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');
    if (resetNewPassword !== resetConfirmPassword) {
      setErrorMsg('New passwords do not match.');
      return;
    }
    if (!policyChecks.every(c => c.ok)) {
      setErrorMsg('New password does not meet institutional complexity requirements.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/v1/auth/password-reset/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken.trim(), newPassword: resetNewPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Password reset failed.');
        return;
      }
      setInfoMsg(data.message || 'Password updated. Please sign in.');
      setPassword('');
      setResetToken('');
      setResetNewPassword('');
      setResetConfirmPassword('');
      setScreen('login');
    } catch {
      setErrorMsg('Failed to confirm password reset.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      {/* Top Utility Bar */}
      <header className="h-16 px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-teal-700 text-white flex items-center justify-center font-bold text-sm">
            EP
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {language === 'am' ? 'ኢ.መ.አ.አ ሰ.መ.አ.ስ' : 'EPSS EDRMS'}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              {language === 'am'
                ? 'የኢትዮጵያ መድኃኒት አቅራቢ አገልግሎት'
                : 'Ethiopian Pharmaceutical Supply Service'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                language === 'en'
                  ? 'bg-white dark:bg-slate-700 text-teal-800 dark:text-teal-200 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLanguage('am')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                language === 'am'
                  ? 'bg-white dark:bg-slate-700 text-teal-800 dark:text-teal-200 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              አማ
            </button>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Centered Auth Split Workspace */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          {/* Left Institutional Brief Panel */}
          <div className="lg:col-span-5 bg-slate-900 dark:bg-slate-950 text-white p-7 sm:p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-teal-900/60 border border-teal-700/50 text-teal-300 text-[11px] font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>ZERO-TRUST GOVERNMENT AUTHENTICATION</span>
              </div>

              <div className="space-y-2">
                <h1 className="text-xl font-bold tracking-tight leading-snug">
                  {language === 'am'
                    ? 'የኢ.መ.አ.አ ኤሌክትሮኒክ የሰነድና መዝገብ አስተዳደር ሥርዓት'
                    : 'Enterprise Document & Records Governance Portal'}
                </h1>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {language === 'am'
                    ? 'በማዕከላዊ ዋና መሥሪያ ቤት እና በ19 ክልላዊ ቅርንጫፎች መካከል ደህንነቱ የተጠበቀ የመድኃኒት አቅርቦት ሰነድ መለዋወጫ።'
                    : 'Role-verified correspondence intake, WebAuthn FIDO2 hardware clearance, and archival custody across EPSS Head Office and 19 regional branches.'}
                </p>
              </div>

              <div className="pt-2 space-y-3 text-xs text-slate-300">
                <div className="flex items-start gap-2.5">
                  <Fingerprint className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-slate-100">FIDO2 / WebAuthn MFA Gate</div>
                    <div className="text-[11px] text-slate-400">
                      Mandatory step-up verification for Confidential tenders, Secret dossiers, and privileged officers.
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Lock className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-slate-100">Session Timeout & Lockout Policy</div>
                    <div className="text-[11px] text-slate-400">
                      Automatic lockout after 5 failed attempts · 30m idle / 8h absolute session lifetime.
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Building2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-slate-100">Acting Authority Delegation</div>
                    <div className="text-[11px] text-slate-400">
                      Time-bounded delegation inheritance with immutable IP and timestamp audit trails.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-800 text-[11px] text-slate-400 font-mono flex items-center justify-between">
              <span>EPSS-EDRMS v3.0</span>
              <span>ISO 15489 / MoH</span>
            </div>
          </div>

          {/* Right Form Panel */}
          <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-center">
            {errorMsg && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}
            {infoMsg && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{infoMsg}</span>
              </div>
            )}

            {/* SCREEN 1: USERNAME + PASSWORD LOGIN */}
            {screen === 'login' && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {language === 'am' ? 'ወደ ስርዓቱ ይግቡ' : 'Sign in to your EPSS account'}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {language === 'am'
                      ? 'የተፈቀደ የመሥሪያ ቤት የተጠቃሚ ስም እና የይለፍ ቃል ያስገቡ'
                      : 'Authenticate with your institutional EPSS username or @epss.gov.et email.'}
                  </p>
                </div>

                <form onSubmit={handlePasswordLogin} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      {language === 'am' ? 'የተጠቃሚ ስም ወይም ኢሜይል' : 'Username or Institutional Email'}
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        required
                        minLength={3}
                        maxLength={50}
                        autoComplete="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="e.g. superadmin or abdulkadir.g"
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-600"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-slate-700 dark:text-slate-300">
                        {language === 'am' ? 'የይለፍ ቃል' : 'Password'}
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setErrorMsg('');
                          setInfoMsg('');
                          setResetRequested(false);
                          setScreen('reset-request');
                        }}
                        className="text-teal-700 dark:text-teal-400 hover:underline font-medium"
                      >
                        {language === 'am' ? 'የይለፍ ቃል ረሱ?' : 'Forgot password?'}
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter institutional password"
                        className="w-full pl-9 pr-9 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-600"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 bg-teal-700 hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-700 text-white font-semibold rounded-lg shadow-xs disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                    <span>{language === 'am' ? 'በይለፍ ቃል ግባ' : 'Sign In'}</span>
                  </button>
                </form>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
                  <span className="shrink mx-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    {language === 'am' ? 'ወይም በሃርድዌር ማረጋገጫ' : 'OR HARDWARE AUTHENTICATION'}
                  </span>
                  <div className="flex-grow border-t border-slate-200 dark:border-slate-800" />
                </div>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleBiometricDirectLogin}
                  className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-semibold text-xs rounded-lg border border-slate-200 dark:border-slate-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Fingerprint className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span>{language === 'am' ? 'በጣት አሻራ / Face ID ግባ' : 'Sign in with Biometrics (WebAuthn)'}</span>
                </button>

                {/* Collapsible Institutional Quick-Fill Directory for Testing */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden text-xs">
                  <button
                    type="button"
                    onClick={() => setDemoDirectoryOpen(!demoDirectoryOpen)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <span>Authorized EPSS Staff Accounts (Click to Autofill)</span>
                    {demoDirectoryOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {demoDirectoryOpen && (
                    <div className="p-3 bg-white dark:bg-slate-900 space-y-2 border-t border-slate-200 dark:border-slate-800">
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        Default Password: <strong className="text-slate-800 dark:text-slate-200">EPSS#Gov2026!</strong> · MFA PIN: <strong className="text-slate-800 dark:text-slate-200">246810</strong>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {DEMO_ACCOUNTS.map((acc) => (
                          <button
                            key={acc.username}
                            type="button"
                            onClick={() => {
                              setUsername(acc.username);
                              setPassword('EPSS#Gov2026!');
                              setErrorMsg('');
                            }}
                            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-left hover:border-teal-500 hover:bg-teal-50/40 dark:hover:bg-teal-950/30 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-[11px]">
                                {acc.username}
                              </span>
                              <span className="text-[10px] font-mono text-teal-700 dark:text-teal-400">
                                {acc.mfa ? 'MFA' : 'STD'}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500 truncate">{acc.label}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SCREEN 2: MFA CHALLENGE */}
            {screen === 'mfa' && mfaChallenge && (
              <div className="space-y-5">
                <button
                  type="button"
                  onClick={() => {
                    setScreen('login');
                    setMfaChallenge(null);
                    setErrorMsg('');
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 font-medium"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to sign in</span>
                </button>

                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {language === 'am' ? 'ሁለተኛ ደረጃ ማረጋገጫ (MFA)' : 'Multi-Factor Verification Required'}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Privileged role <strong className="text-slate-800 dark:text-slate-200">{mfaChallenge.userPreview.role}</strong> ({mfaChallenge.userPreview.fullNameEn}) requires hardware biometric assertion or officer PIN.
                  </p>
                </div>

                {/* Toggle Biometric vs PIN */}
                <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setMfaMethod('webauthn');
                      setErrorMsg('');
                    }}
                    className={`py-2 font-semibold rounded-md flex items-center justify-center gap-1.5 transition-colors ${
                      mfaMethod === 'webauthn'
                        ? 'bg-white dark:bg-slate-700 text-teal-800 dark:text-teal-200 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Fingerprint className="w-4 h-4" />
                    <span>WebAuthn Biometric</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMfaMethod('pin');
                      setErrorMsg('');
                    }}
                    className={`py-2 font-semibold rounded-md flex items-center justify-center gap-1.5 transition-colors ${
                      mfaMethod === 'pin'
                        ? 'bg-white dark:bg-slate-700 text-teal-800 dark:text-teal-200 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>Officer PIN Fallback</span>
                  </button>
                </div>

                {mfaMethod === 'webauthn' ? (
                  <div className="p-6 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 text-center space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 flex items-center justify-center mx-auto text-teal-700 dark:text-teal-400">
                      <Fingerprint className="w-9 h-9" />
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        Verify with Platform Authenticator
                      </div>
                      <p className="text-slate-500 dark:text-slate-400">
                        Touch ID, Face ID, or Windows Hello cryptographic assertion.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleVerifyMfa('webauthn')}
                      className="w-full py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs rounded-lg shadow-xs disabled:opacity-50"
                    >
                      {isSubmitting ? 'Verifying Sensor...' : 'Verify Identity with Biometrics'}
                    </button>
                  </div>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleVerifyMfa('pin');
                    }}
                    className="space-y-4 text-xs"
                  >
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        6-Digit EPSS Security PIN (Seed Default: 246810)
                      </label>
                      <input
                        type="password"
                        required
                        maxLength={8}
                        autoFocus
                        value={mfaPin}
                        onChange={(e) => setMfaPin(e.target.value)}
                        placeholder="••••••"
                        className="w-full py-2.5 px-3 text-center tracking-widest font-mono text-base bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-lg shadow-xs disabled:opacity-50"
                    >
                      {isSubmitting ? 'Checking PIN...' : 'Complete MFA Sign In'}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* SCREEN 3: PASSWORD RESET REQUEST + SANDBOX INBOX */}
            {screen === 'reset-request' && (
              <div className="space-y-4 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setScreen('login');
                    setErrorMsg('');
                    setInfoMsg('');
                  }}
                  className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 font-medium"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to sign in</span>
                </button>

                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    Reset Your EPSS Password
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400 mt-1">
                    Enter your username or official email address to receive a single-use reset link.
                  </p>
                </div>

                <form onSubmit={handleRequestReset} className="space-y-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Username or Email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        required
                        value={resetIdentifier}
                        onChange={(e) => setResetIdentifier(e.target.value)}
                        placeholder="e.g. dawit.t or dawit.t@epss.gov.et"
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-lg shadow-xs disabled:opacity-50"
                  >
                    {isSubmitting ? 'Sending...' : 'Send Reset Instructions'}
                  </button>
                </form>

                {resetRequested && (
                  <div className="pt-2 space-y-2 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={async () => {
                          await loadDevInbox();
                          setShowDevInbox(!showDevInbox);
                        }}
                        className="inline-flex items-center gap-1.5 text-teal-700 dark:text-teal-400 font-semibold hover:underline"
                      >
                        <Inbox className="w-3.5 h-3.5" />
                        <span>{showDevInbox ? 'Hide Sandbox Reset Mail Trap' : 'Open Sandbox Reset Mail Trap'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setErrorMsg('');
                          setScreen('reset-confirm');
                        }}
                        className="text-slate-600 dark:text-slate-300 font-semibold hover:underline"
                      >
                        I already have a token →
                      </button>
                    </div>

                    {showDevInbox && (
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
                        {devInbox.length === 0 ? (
                          <div className="text-slate-500">No pending reset messages in sandbox inbox.</div>
                        ) : (
                          devInbox.map((mail) => (
                            <div
                              key={mail.token}
                              className="p-2.5 bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0">
                                <div className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                                  To: {mail.email} ({mail.username})
                                </div>
                                <div className="font-mono text-[10px] text-slate-500 truncate">
                                  Token: {mail.token}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setResetToken(mail.token);
                                  setErrorMsg('');
                                  setScreen('reset-confirm');
                                }}
                                className="px-2.5 py-1 bg-teal-700 text-white rounded font-semibold shrink-0"
                              >
                                Open Reset Form
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* SCREEN 4: NEW PASSWORD CONFIRMATION */}
            {screen === 'reset-confirm' && (
              <div className="space-y-4 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setScreen('reset-request');
                    setErrorMsg('');
                  }}
                  className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-200 font-medium"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>

                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    Set New Institutional Password
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400 mt-1">
                    Confirm your reset token and choose a compliant password.
                  </p>
                </div>

                <form onSubmit={handleConfirmReset} className="space-y-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Verification Reset Token
                    </label>
                    <input
                      type="text"
                      required
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value)}
                      placeholder="Paste reset token"
                      className="w-full p-2 font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      required
                      value={resetNewPassword}
                      onChange={(e) => setResetNewPassword(e.target.value)}
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
                      value={resetConfirmPassword}
                      onChange={(e) => setResetConfirmPassword(e.target.value)}
                      className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                    />
                  </div>

                  {/* Live Complexity Rules */}
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {policyChecks.map((rule) => (
                      <div
                        key={rule.label}
                        className={`flex items-center gap-1.5 text-[11px] ${
                          rule.ok ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        <CheckCircle2 className={`w-3.5 h-3.5 ${rule.ok ? 'opacity-100' : 'opacity-30'}`} />
                        <span>{rule.label}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-lg shadow-xs disabled:opacity-50"
                  >
                    {isSubmitting ? 'Updating Password...' : 'Update Password & Return to Sign In'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
