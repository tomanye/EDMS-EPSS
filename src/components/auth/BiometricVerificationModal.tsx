import React, { useState, useEffect } from 'react';
import { 
  Fingerprint, 
  Scan, 
  ShieldCheck, 
  ShieldAlert, 
  Lock, 
  Unlock, 
  KeyRound, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Cpu, 
  Smartphone,
  Eye,
  RefreshCw
} from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import { authenticateWithBiometrics, detectDeviceBiometricName, isPlatformBiometricAvailable } from '../../lib/webauthn.js';

interface BiometricVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: () => void;
  documentTitle?: string;
  registrationNumber?: string;
  confidentialityLevel?: string;
  actionReason?: string;
}

type ScanMode = 'fingerprint' | 'face';
type ScanStatus = 'idle' | 'scanning' | 'analyzing' | 'success' | 'failed';

export const BiometricVerificationModal: React.FC<BiometricVerificationModalProps> = ({
  isOpen,
  onClose,
  onVerified,
  documentTitle,
  registrationNumber,
  confidentialityLevel = 'Confidential',
  actionReason = 'Access Sensitive Pharmaceutical Dossier'
}) => {
  const { currentUser, language, refreshData, markMfaVerifiedLocal } = useApp();
  const [scanMode, setScanMode] = useState<ScanMode>('fingerprint');
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [deviceName, setDeviceName] = useState<string>('Platform Biometric Sensor');
  const [hasPlatformHardware, setHasPlatformHardware] = useState<boolean>(true);
  const [pinFallbackOpen, setPinFallbackOpen] = useState<boolean>(false);
  const [officerPin, setOfficerPin] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setStatus('idle');
      setStatusMessage('');
      setDeviceName(detectDeviceBiometricName());
      setPinFallbackOpen(false);
      setOfficerPin('');
      setPinError('');

      isPlatformBiometricAvailable().then((res) => {
        setHasPlatformHardware(res.supported);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartBiometricScan = async () => {
    setStatus('scanning');
    setStatusMessage(
      language === 'am' 
        ? 'የባዮሜትሪክ ዳሳሽ በመጠባበቅ ላይ... እባክዎ የጣት አሻራዎን ወይም የፊት ገጽታዎን ያቅርቡ'
        : 'Awaiting biometric sensor touch or facial scan...'
    );

    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      setStatus('analyzing');
      setStatusMessage(
        language === 'am'
          ? 'የባዮሜትሪክ ምስልና የ FIDO2 ቁልፍ እየተረጋገጠ ነው...'
          : 'Validating WebAuthn cryptographic signature...'
      );

      const result = await authenticateWithBiometrics(
        currentUser?.id || 'usr-dg',
        `${actionReason} (${registrationNumber || 'Sensitive Record'})`
      );

      if (result.verified) {
        setStatus('success');
        setStatusMessage(
          language === 'am'
            ? 'የባዮሜትሪክ ማንነት በስኬት ተረጋግጧል! ሰነዱ ተከፍቷል።'
            : 'Biometric identity verified successfully! Access granted.'
        );
        markMfaVerifiedLocal();
        await refreshData();
        setTimeout(() => {
          onVerified();
        }, 700);
      } else {
        throw new Error('Biometric signature mismatch');
      }
    } catch (err: any) {
      console.error('Biometric authentication error:', err);
      setStatus('failed');
      setStatusMessage(
        err.message || (
          language === 'am' 
            ? 'የባዮሜትሪክ ማረጋገጫ አልተሳካም። እባክዎ ደግመው ይሞክሩ ወይም የይለፍ ቃል ይጠቀሙ።'
            : 'Biometric verification failed. Please try again or use officer fallback passcode.'
        )
      );
    }
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (officerPin.length < 4) {
      setPinError('PIN must be at least 4 digits');
      return;
    }

    setStatus('analyzing');
    setPinError('');
    try {
      const res = await fetch('/api/v1/auth/elevate-mfa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'pin', pin: officerPin.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus('failed');
        setPinError(data.error || 'Invalid officer authorization PIN');
        return;
      }

      setStatus('success');
      setStatusMessage(
        language === 'am' 
          ? 'የመጠባበቂያ የይለፍ ቃል ተረጋግጧል!'
          : 'Officer MFA PIN verified. Access authorized.'
      );
      markMfaVerifiedLocal();
      await refreshData();
      setTimeout(() => {
        onVerified();
      }, 600);
    } catch {
      setStatus('failed');
      setPinError('Failed to verify officer authorization PIN');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden relative flex flex-col">
        {/* Top Security Banner */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-teal-400">
                {language === 'am' ? 'የባዮሜትሪክ ደህንነት ማረጋገጫ' : 'WebAuthn Biometric Security'}
              </h2>
              <p className="text-[10px] text-slate-400">
                EPSS FIDO2 / Hardware Security Layer
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sensitive Record Context Card */}
        <div className="p-4 bg-amber-500/10 border-b border-amber-500/20 px-5 flex items-start gap-3 text-xs">
          <Lock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                {registrationNumber || 'EPSS/SEC/2026/01'}
              </span>
              <span className="px-1.5 py-0.2 bg-amber-200 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-semibold rounded text-[10px] uppercase">
                {confidentialityLevel}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
              {documentTitle || 'Sensitive Pharmaceutical Allocation Dossier'}
            </p>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {actionReason}
            </p>
          </div>
        </div>

        {/* Biometric Scanner Visual Area */}
        <div className="p-6 flex flex-col items-center justify-center text-center space-y-5">
          {/* Scanner Mode Toggle: Fingerprint vs Face */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => { setScanMode('fingerprint'); setStatus('idle'); }}
              className={`px-3 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all ${
                scanMode === 'fingerprint'
                  ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Fingerprint className="w-3.5 h-3.5" />
              <span>{language === 'am' ? 'የጣት አሻራ' : 'Fingerprint'}</span>
            </button>
            <button
              onClick={() => { setScanMode('face'); setStatus('idle'); }}
              className={`px-3 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all ${
                scanMode === 'face'
                  ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Scan className="w-3.5 h-3.5" />
              <span>{language === 'am' ? 'የፊት ገጽታ' : 'Face ID'}</span>
            </button>
          </div>

          {/* Visual Scanner HUD Animation */}
          <div className="relative w-36 h-36 flex items-center justify-center">
            {/* Outer Pulsing Rings */}
            <div className={`absolute inset-0 rounded-full border-2 transition-all duration-700 ${
              status === 'scanning' || status === 'analyzing'
                ? 'border-teal-500 animate-ping opacity-30'
                : status === 'success'
                ? 'border-emerald-500 scale-105'
                : status === 'failed'
                ? 'border-rose-500'
                : 'border-slate-200 dark:border-slate-700'
            }`} />

            <div className={`w-32 h-32 rounded-2xl flex items-center justify-center relative overflow-hidden transition-all duration-500 ${
              status === 'scanning' || status === 'analyzing'
                ? 'bg-teal-50 dark:bg-teal-950/40 border-2 border-teal-500 shadow-lg shadow-teal-500/20'
                : status === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500 shadow-lg shadow-emerald-500/20'
                : status === 'failed'
                ? 'bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-500 shadow-lg shadow-rose-500/20'
                : 'bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700'
            }`}>
              {/* Animated Laser Scanning Beam */}
              {(status === 'scanning' || status === 'analyzing') && (
                <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-teal-400 to-transparent shadow-[0_0_12px_#14b8a6] animate-pulse z-10 transition-all duration-1000"
                  style={{
                    animation: 'bounce 1.5s infinite'
                  }}
                />
              )}

              {/* Scanner Graphic Icon */}
              {status === 'success' ? (
                <CheckCircle2 className="w-16 h-16 text-emerald-600 dark:text-emerald-400 animate-in zoom-in-75 duration-300" />
              ) : status === 'failed' ? (
                <AlertCircle className="w-16 h-16 text-rose-600 dark:text-rose-400 animate-in zoom-in-75 duration-300" />
              ) : scanMode === 'fingerprint' ? (
                <Fingerprint className={`w-16 h-16 transition-colors duration-300 ${
                  status === 'scanning' || status === 'analyzing'
                    ? 'text-teal-600 dark:text-teal-400'
                    : 'text-slate-400 dark:text-slate-500'
                }`} />
              ) : (
                <div className="relative">
                  <Scan className={`w-16 h-16 transition-colors duration-300 ${
                    status === 'scanning' || status === 'analyzing'
                      ? 'text-teal-600 dark:text-teal-400'
                      : 'text-slate-400 dark:text-slate-500'
                  }`} />
                  <Eye className="w-6 h-6 absolute inset-0 m-auto text-teal-600 dark:text-teal-400 opacity-60" />
                </div>
              )}
            </div>
          </div>

          {/* Device & Status Text */}
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
              <Cpu className="w-3.5 h-3.5 text-teal-600" />
              <span>{deviceName}</span>
            </div>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 min-h-[2.5rem] flex items-center justify-center">
              {statusMessage || (
                language === 'am'
                  ? 'ለመቀጠል የባዮሜትሪክ ዳሳሹን ይንኩ'
                  : 'Touch platform sensor or glance at camera to verify'
              )}
            </p>
          </div>

          {/* Action Trigger Button */}
          {!pinFallbackOpen ? (
            <div className="w-full space-y-2.5">
              <button
                type="button"
                onClick={handleStartBiometricScan}
                disabled={status === 'scanning' || status === 'analyzing' || status === 'success'}
                className="w-full py-2.5 px-4 bg-teal-700 hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                {status === 'scanning' || status === 'analyzing' ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{language === 'am' ? 'እየተረጋገጠ ነው...' : 'Authenticating WebAuthn...'}</span>
                  </>
                ) : status === 'success' ? (
                  <>
                    <Unlock className="w-4 h-4" />
                    <span>{language === 'am' ? 'ተረጋግጧል' : 'Access Granted'}</span>
                  </>
                ) : (
                  <>
                    <Fingerprint className="w-4 h-4" />
                    <span>
                      {language === 'am' ? 'የባዮሜትሪክ ቅኝት ጀምር' : 'Trigger Biometric Verification'}
                    </span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setPinFallbackOpen(true)}
                className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium transition-colors flex items-center justify-center gap-1 mx-auto"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>{language === 'am' ? 'የይለፍ ቃል (PIN) ተጠቀም' : 'Use Officer Passcode Fallback'}</span>
              </button>
            </div>
          ) : (
            /* Emergency PIN Fallback Form */
            <form onSubmit={handlePinSubmit} className="w-full space-y-3 pt-2 text-left">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {language === 'am' ? 'የኃላፊነት የይለፍ ቃል (Officer Security PIN)' : 'Officer Authorization PIN'}
                </label>
                <input
                  type="password"
                  maxLength={6}
                  autoFocus
                  placeholder="Enter 4-6 digit passcode (e.g. 2026)"
                  value={officerPin}
                  onChange={(e) => { setOfficerPin(e.target.value); setPinError(''); }}
                  className="w-full px-3 py-2 text-center tracking-widest font-mono text-base bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
                {pinError && (
                  <p className="mt-1 text-[11px] text-rose-500 font-medium">{pinError}</p>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPinFallbackOpen(false)}
                  className="flex-1 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-lg"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 dark:bg-teal-600 rounded-lg"
                >
                  Verify PIN
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer Notes */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-500 flex items-center justify-between">
          <span>Security Standard: FIDO2 / WebAuthn Level 3</span>
          <span className="font-mono text-teal-600 dark:text-teal-400">EPSS-BIO-VAULT</span>
        </div>
      </div>
    </div>
  );
};
