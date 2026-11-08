import React, { useState } from 'react';
import { FileCheck2, PlusCircle, Search, ArrowUpRight, Clock, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import { formatEthiopianDate } from '../../lib/translations.js';

export const ApplicationsView: React.FC = () => {
  const { documents, setSelectedDocument, openRegisterModal, language, t } = useApp();
  const [searchQuery, setSearchQuery] = useState('');

  const appDocs = documents.filter(d => d.type === 'Application');

  const filtered = appDocs.filter(d => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      d.registrationNumber.toLowerCase().includes(q) ||
      d.senderOrganization.toLowerCase().includes(q) ||
      d.subjectEn.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t('navApplications')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {language === 'am'
              ? 'የመድኃኒት አቅራቢዎች ፈቃድ፣ የመጋዘን ፍተሻ እና የአገልግሎት ማመልከቻዎች መከታተያ'
              : 'Supplier pre-qualification requests, warehouse GDP clearance permits, and institutional petitions.'}
          </p>
        </div>
        <button
          onClick={() => openRegisterModal('Application')}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-xs transition-colors self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{language === 'am' ? 'አዲስ ማመልከቻ መዝግብ' : 'Register Application'}</span>
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search applications by applicant organization, ref #, or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="px-4 py-3 font-semibold">{t('regNumber')}</th>
              <th className="px-4 py-3 font-semibold">Applicant Entity</th>
              <th className="px-4 py-3 font-semibold">{t('subject')}</th>
              <th className="px-4 py-3 font-semibold">Assigned Desk</th>
              <th className="px-4 py-3 font-semibold">{t('registrationDate')}</th>
              <th className="px-4 py-3 font-semibold">SLA Deadline</th>
              <th className="px-4 py-3 font-semibold">{t('status')}</th>
              <th className="px-4 py-3 font-semibold text-right">{t('actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-slate-400">
                  No applications currently pending.
                </td>
              </tr>
            ) : (
              filtered.map((doc) => (
                <tr
                  key={doc.id}
                  onClick={() => setSelectedDocument(doc)}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    {doc.registrationNumber}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                    {doc.senderOrganization}
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <div className="font-medium text-slate-900 dark:text-slate-100 line-clamp-1">
                      {language === 'am' ? doc.subjectAm : doc.subjectEn}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-400">
                    {doc.assignedDepartmentName || 'Regulatory Affairs'}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-500 whitespace-nowrap">
                    {formatEthiopianDate(doc.registrationDate, language)}
                  </td>
                  <td className="px-4 py-3 font-mono whitespace-nowrap text-amber-700 dark:text-amber-400">
                    {doc.dueDate ? formatEthiopianDate(doc.dueDate, language) : 'Standard 14d'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap font-semibold text-teal-700 dark:text-teal-400">
                    {doc.status}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setSelectedDocument(doc)}
                      className="px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 transition-colors inline-flex items-center gap-1"
                    >
                      <span>{t('view')}</span>
                      <ArrowUpRight className="w-3 h-3 text-slate-400" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
