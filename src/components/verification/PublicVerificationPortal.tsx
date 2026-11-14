import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  FileCheck2,
  Fingerprint,
  Lock,
  QrCode,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sun,
  Moon
} from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import { formatEthiopianDate } from '../../lib/translations.js';
import { PublicVerificationResponse, PublicVerificationSample } from '../../types/index.js';

interface PublicVerificationPortalProps {
  mode: 'public' | 'embedded';
  initialDocQuery?: string;
  initialSealQuery?: string;
  onBackToLogin?: () => void;
}

export const PublicVerificationPortal: React.FC<PublicVerificationPortalProps> = ({
  mode,
  initialDocQuery = '',
  initialSealQuery = '',
  onBackToLogin
}) => {
  const { language, setLanguage, theme, toggleTheme } = useApp();
  const [docQuery, setDocQuery] = useState(initialDocQuery);
  const [sealQuery, setSealQuery] = useState(initialSealQuery);
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<PublicVerificationResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [samples, setSamples] = useState<PublicVerificationSample[]>([]);

  const runVerification = useCallback(async (docVal: string, sealVal?: string) => {
    const clean = docVal.trim();
    if (clean.length < 3) {
      setErrorMsg(
        language === 'am'
          ? 'እባክዎ ትክክለኛ የEPSS የምዝገባ ወይም የማጣቀሻ ቁጥር ያስገቡ።'
          : 'Enter an official EPSS Registration Number or Reference Number (minimum 3 characters).'
      );
      setResult(null);
      return;
    }

    setIsChecking(true);
    setErrorMsg(null);
    try {
      const qs = new URLSearchParams({ doc: clean });
      if (sealVal && sealVal.trim()) {
        qs.set('seal', sealVal.trim());
      }
      const res = await fetch(`/api/v1/public/verify?${qs.toString()}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setResult(null);
        setErrorMsg(data.error || `Verification lookup failed (HTTP ${res.status}).`);
        return;
      }
      setResult(data as PublicVerificationResponse);
    } catch {
      setResult(null);
      setErrorMsg('Unable to reach EPSS PKI Verification Authority.');
    } finally {
      setIsChecking(false);
    }
  }, [language]);

  useEffect(() => {
    fetch('/api/v1/public/verify/samples')
      .then(r => (r.ok ? r.json() : []))
      .then(data => setSamples(Array.isArray(data) ? data : []))
      .catch(() => setSamples([]));
  }, []);

  useEffect(() => {
    if (initialDocQuery.trim().length >= 3) {
      setDocQuery(initialDocQuery);
      setSealQuery(initialSealQuery);
      runVerification(initialDocQuery, initialSealQuery);
    }
  }, [initialDocQuery, initialSealQuery, runVerification]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runVerification(docQuery, sealQuery);
  };

  const getStatusBannerStyle = (res: PublicVerificationResponse) => {
    if (res.sealMatchStatus === 'mismatched' || res.integrityStatus === 'Tampered') {
      return {
        wrapper: 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200',
        badge: 'INTEGRITY ALERT',
        title: 'Tampering Detected or Seal Mismatch'
      };
    }
    if (res.integrityStatus === 'CertificateRevoked') {
      return {
        wrapper: 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200',
        badge: 'REVOKED CERTIFICATE',
        title: 'Signer Certificate Administratively Revoked'
      };
    }
    if (res.integrityStatus === 'Verified') {
      return {
        wrapper: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200',
        badge: 'VERIFIED OFFICIAL RECORD',
        title: 'Cryptographically Verified Official EPSS Record'
      };
    }
    if (res.integrityStatus === 'Superseded') {
      return {
        wrapper: 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200',
        badge: 'RE-APPROVAL PENDING',
        title: 'Prior Signatures Superseded by Authorized Edit'
      };
    }
    return {
      wrapper: 'bg-sky-50 dark:bg-sky-950/40 border-sky-300 dark:border-sky-800 text-sky-900 dark:text-sky-200',
      badge: 'REGISTERED METADATA',
      title: 'Official EPSS Registration Confirmed (No PKI Approvals Recorded Yet)'
    };
  };

  const content = (
    <div className="space-y-6">
      {/* Page / Portal Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-700 text-white flex items-center justify-center shrink-0">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {language === 'am'
                ? 'የEPSS የሰነድ ትክክለኛነት እና የQR ማረጋገጫ ፖርታል'
                : 'EPSS Official Document & QR Authenticity Verifier'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {language === 'am'
                ? 'የሰነድ መለያ ቁጥር ወይም የSHA-256 ዲጂታል ማህተም በማስገባት ትክክለኛነቱን ያረጋግጡ'
                : 'Zero-leakage public registry verification against RSA-SHA256 PKI signatures and canonical digests.'}
            </p>
          </div>
        </div>

        {mode === 'public' && onBackToLogin && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setLanguage(language === 'en' ? 'am' : 'en')}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
            >
              {language === 'en' ? 'አማርኛ' : 'English'}
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onBackToLogin}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Staff Sign In</span>
            </button>
          </div>
        )}
      </div>

      {/* Verification Lookup Form */}
      <form
        onSubmit={handleSubmit}
        className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
          <div className="md:col-span-6">
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Official Registration or Reference Number *
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                value={docQuery}
                onChange={e => setDocQuery(e.target.value)}
                placeholder="e.g. EPSS/IN/2026/0001"
                className="w-full pl-9 pr-3 py-2 font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="md:col-span-4">
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              SHA-256 Digest / Seal Prefix (Optional)
            </label>
            <input
              type="text"
              value={sealQuery}
              onChange={e => setSealQuery(e.target.value)}
              placeholder="Optional first 8+ hex chars of digest"
              className="w-full px-3 py-2 font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="md:col-span-2 flex items-end">
            <button
              type="submit"
              disabled={isChecking}
              className="w-full py-2 px-4 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-lg flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isChecking ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5" />
              )}
              <span>{isChecking ? 'Checking...' : 'Verify'}</span>
            </button>
          </div>
        </div>

        {/* Sample quick-lookup buttons (non-confidential documents only) */}
        {samples.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
            <span className="text-slate-500 dark:text-slate-400 font-medium">
              Quick Sample Records:
            </span>
            {samples.map(s => (
              <button
                key={s.registrationNumber}
                type="button"
                onClick={() => {
                  setDocQuery(s.registrationNumber);
                  setSealQuery('');
                  runVerification(s.registrationNumber);
                }}
                className="px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:border-teal-600 text-slate-800 dark:text-slate-200 font-mono transition-colors"
              >
                {s.registrationNumber}
              </button>
            ))}
          </div>
        )}
      </form>

      {/* Error State */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-start gap-3 text-xs text-rose-900 dark:text-rose-200">
          <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">Verification Lookup Failed</div>
            <p className="mt-0.5">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Result Certificate Card */}
      {result && (() => {
        const style = getStatusBannerStyle(result);
        return (
          <div className="space-y-4">
            <div className={`p-4 rounded-xl border flex items-start gap-3 ${style.wrapper}`}>
              {result.verified ? (
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              ) : result.integrityStatus === 'Tampered' || result.sealMatchStatus === 'mismatched' ? (
                <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 space-y-1 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-sm">{style.title}</span>
                  <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded border border-current/25 tabular-nums">
                    {style.badge} · {result.validSignatures}/{result.totalSignatures} VALID SIGS
                  </span>
                </div>
                <p className="opacity-90">{result.summaryMessage}</p>
              </div>
            </div>

            {result.redacted && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-center gap-2">
                <Lock className="w-4 h-4 shrink-0" />
                <span>
                  Classification is <strong>{result.confidentiality}</strong>. Subject text and counterparty names are redacted for external privacy while cryptographic authenticity remains verifiable.
                </span>
              </div>
            )}

            {/* Metadata + Canonical Digest */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-4 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <h2 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <FileCheck2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <span>Official Registry Record Summary</span>
                  </h2>
                  <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                    Checked {new Date(result.verifiedAt).toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">Registration Number</div>
                    <div className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100 tabular-nums">
                      {result.registrationNumber}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">External Reference</div>
                    <div className="font-mono font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
                      {result.referenceNumber}
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">Official Subject</div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                      {language === 'am' ? result.subjectAm : result.subjectEn}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">Sender Organization</div>
                    <div className="font-medium text-slate-800 dark:text-slate-200">{result.senderOrganization}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">Recipient Organization</div>
                    <div className="font-medium text-slate-800 dark:text-slate-200">{result.recipientOrganization}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">Issuing EPSS Hub &amp; Directorate</div>
                    <div className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                      <span>{result.issuingBranchEn} · {result.issuingDepartmentEn}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">Status &amp; Issue Date</div>
                    <div className="font-mono text-slate-800 dark:text-slate-200 tabular-nums">
                      {result.status} · {formatEthiopianDate(result.registrationDate, language)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3 text-xs">
                <h3 className="font-bold text-slate-900 dark:text-slate-100">
                  Canonical SHA-256 Digest Seal
                </h3>
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono text-[10px] text-teal-700 dark:text-teal-400 break-all tabular-nums">
                  {result.currentDocumentDigestSha256}
                </div>
                <div className="text-[11px] space-y-1 text-slate-600 dark:text-slate-400">
                  <div>
                    Seal Prefix Match:{' '}
                    <strong
                      className={
                        result.sealMatchStatus === 'matched'
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : result.sealMatchStatus === 'mismatched'
                          ? 'text-rose-700 dark:text-rose-400'
                          : 'text-slate-500 dark:text-slate-400'
                      }
                    >
                      {result.sealMatchStatus === 'matched'
                        ? 'MATCHED OFFICIAL DIGEST'
                        : result.sealMatchStatus === 'mismatched'
                        ? 'MISMATCHED SEAL'
                        : 'NOT PROVIDED'}
                    </strong>
                  </div>
                  <div>Confidentiality: <strong>{result.confidentiality}</strong></div>
                  <div>Document Type: <strong>{result.documentType}</strong></div>
                </div>
              </div>
            </div>

            {/* Signer Chain */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Authorized PKI Digital Signature Chain ({result.signers.length})
                </h3>
                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  RSA-SHA256 / 2048-bit
                </span>
              </div>
              {result.signers.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
                  This record is officially registered in EPSS EDRMS and has not required an RSA-2048 approval signature yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-[11px] text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-2.5 px-4 font-semibold">Signer &amp; Role</th>
                        <th className="py-2.5 px-4 font-semibold">Stage &amp; Signing Meaning</th>
                        <th className="py-2.5 px-4 font-semibold">Certificate Serial</th>
                        <th className="py-2.5 px-4 font-semibold">Signed Timestamp</th>
                        <th className="py-2.5 px-4 font-semibold">Verification</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {result.signers.map((sig, idx) => (
                        <tr key={`${sig.certificateSerial}-${idx}`} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 px-4">
                            <div className="font-bold text-slate-900 dark:text-slate-100">{sig.signedBy}</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                              <span>{sig.signedByRole || 'Authorized Officer'}</span>
                              {sig.biometricVerified && (
                                <span className="inline-flex items-center gap-0.5 text-teal-700 dark:text-teal-400 font-semibold">
                                  <Fingerprint className="w-3 h-3" />
                                  MFA
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-4 text-slate-700 dark:text-slate-300">
                            <div className="font-medium">{sig.signingMeaning || 'Approved for Official Issuance'}</div>
                            {sig.stageName && (
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">{sig.stageName}</div>
                            )}
                          </td>
                          <td className="py-2.5 px-4 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                            <div>{sig.certificateSerial}</div>
                            <div className="text-[10px] text-slate-500 dark:text-slate-400">Cert: {sig.certificateStatus}</div>
                          </td>
                          <td className="py-2.5 px-4 font-mono tabular-nums text-[11px] text-slate-600 dark:text-slate-300">
                            {new Date(sig.signedAt).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-4">
                            <span
                              className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border ${
                                sig.status === 'Valid'
                                  ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800'
                                  : 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800'
                              }`}
                            >
                              {sig.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );

  if (mode === 'public') {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 sm:p-8">
        <div className="max-w-5xl mx-auto">{content}</div>
      </div>
    );
  }

  return content;
};
