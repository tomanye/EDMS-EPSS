import React, { useState, useEffect } from 'react';
import { 
  FolderArchive, 
  Lock, 
  Unlock, 
  ShieldCheck, 
  FileText, 
  AlertTriangle, 
  Trash2, 
  CheckCircle2, 
  Clock 
} from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import { formatEthiopianDate } from '../../lib/translations.js';
import { DocumentItem, RetentionSchedule } from '../../types/index.js';

export const RecordsArchivalView: React.FC = () => {
  const { documents, setSelectedDocument, refreshData, language, t } = useApp();
  const [schedules, setSchedules] = useState<RetentionSchedule[]>([]);
  const [activeTab, setActiveTab] = useState<'retention' | 'legalHold' | 'archiveVault'>('retention');

  useEffect(() => {
    fetch('/api/v1/records/schedules')
      .then(r => r.json())
      .then(data => setSchedules(data || []))
      .catch(console.error);
  }, []);

  const heldDocs = documents.filter(d => d.legalHold);
  const archivedDocs = documents.filter(d => d.isArchived || d.status === 'Archived');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t('navArchives')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {language === 'am'
              ? 'የሰነድ ማቆያ መመሪያዎች፣ የህግ ከለላ (Legal Hold) እና የቋሚ ማህደር አስተዳደር'
              : 'Records retention policy schedules, legal hold litigation protection, and archival preservation governance.'}
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg self-start sm:self-auto border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveTab('retention')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'retention'
                ? 'bg-white dark:bg-slate-700 text-teal-800 dark:text-teal-200 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Retention Schedules ({schedules.length})
          </button>
          <button
            onClick={() => setActiveTab('legalHold')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'legalHold'
                ? 'bg-white dark:bg-slate-700 text-teal-800 dark:text-teal-200 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Legal Holds ({heldDocs.length})
          </button>
          <button
            onClick={() => setActiveTab('archiveVault')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              activeTab === 'archiveVault'
                ? 'bg-white dark:bg-slate-700 text-teal-800 dark:text-teal-200 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Permanent Archive ({archivedDocs.length})
          </button>
        </div>
      </div>

      {/* Tab 1: Retention Schedules */}
      {activeTab === 'retention' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              EPSS Mandated Records Retention Schedules
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {schedules.map((sc) => (
                <div
                  key={sc.id}
                  className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {sc.documentCategory}
                    </span>
                    <span className="font-mono font-bold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 px-2 py-0.5 rounded">
                      {sc.retentionPeriodYears} Years Mandatory
                    </span>
                  </div>

                  <div className="text-slate-600 dark:text-slate-300">
                    <strong>Governing Law:</strong> {sc.governingLegislation}
                  </div>

                  <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                    {sc.notes}
                  </p>

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Maturity Action:</span>
                    <strong className="text-teal-800 dark:text-teal-300">{sc.disposalAction}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Legal Holds */}
      {activeTab === 'legalHold' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-rose-600" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Documents Protected by Legal Hold
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            Records placed under legal hold cannot be purged, destroyed, or modified under any circumstances during active regulatory audits or judicial inquiries.
          </p>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {heldDocs.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                No active legal holds at this time.
              </div>
            ) : (
              heldDocs.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDocument(doc)}
                  className="py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 px-2 rounded-lg cursor-pointer"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-mono font-bold text-slate-900 dark:text-slate-100">
                      <span>{doc.registrationNumber}</span>
                      <span className="text-rose-600 text-[10px] bg-rose-50 dark:bg-rose-950 px-2 py-0.5 rounded">IMMUTABLE LEGAL HOLD</span>
                    </div>
                    <div className="text-slate-700 dark:text-slate-300 font-medium">
                      {doc.subjectEn}
                    </div>
                  </div>
                  <span className="font-mono text-slate-500 text-[11px]">
                    {formatEthiopianDate(doc.registrationDate, language)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Permanent Archive Vault */}
      {activeTab === 'archiveVault' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <FolderArchive className="w-4 h-4 text-teal-600" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Permanent Electronic & Physical Archive
            </h2>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {archivedDocs.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                No closed records transitioned to permanent archive yet.
              </div>
            ) : (
              archivedDocs.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDocument(doc)}
                  className="py-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 px-2 rounded-lg cursor-pointer"
                >
                  <div className="space-y-1">
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                      {doc.registrationNumber}
                    </span>
                    <div className="text-slate-700 dark:text-slate-300 font-medium">
                      {doc.subjectEn}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-slate-500 text-[11px]">
                      Preserved until {doc.retentionExpiryDate ? formatEthiopianDate(doc.retentionExpiryDate, language) : 'Permanent'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
