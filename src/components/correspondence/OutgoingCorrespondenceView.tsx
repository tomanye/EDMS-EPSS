import React, { useState } from 'react';
import { 
  Send, 
  PlusCircle, 
  Search, 
  CheckCircle2, 
  FileCheck, 
  ShieldCheck, 
  ArrowUpRight,
  Download
} from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import { formatEthiopianDate } from '../../lib/translations.js';

export const OutgoingCorrespondenceView: React.FC = () => {
  const { documents, setSelectedDocument, openRegisterModal, language, t } = useApp();
  const [searchQuery, setSearchQuery] = useState('');

  const outgoingDocs = documents.filter(d => d.type === 'OutgoingLetter');

  const filteredDocs = outgoingDocs.filter(d => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        d.registrationNumber.toLowerCase().includes(q) ||
        d.referenceNumber.toLowerCase().includes(q) ||
        d.subjectEn.toLowerCase().includes(q) ||
        d.subjectAm.toLowerCase().includes(q) ||
        d.recipientOrganization.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t('navOutgoing')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {language === 'am'
              ? 'በኢ.መ.አ.አ ዋና ዳይሬክተር እና ዳይሬክቶሬቶች የተፈረሙ እና የተላኩ ይፋዊ ደብዳቤዎች መዝገብ'
              : 'Outbound official correspondence dispatched with electronic signature validation.'}
          </p>
        </div>
        <button
          onClick={() => openRegisterModal('OutgoingLetter')}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-700 rounded-lg shadow-xs transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{language === 'am' ? 'አዲስ ወጪ ደብዳቤ አዘጋጅ' : 'Draft Outgoing Letter'}</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3 font-semibold">{t('regNumber')}</th>
                <th className="px-4 py-3 font-semibold">{t('subject')}</th>
                <th className="px-4 py-3 font-semibold">{t('recipient')}</th>
                <th className="px-4 py-3 font-semibold">{t('department')}</th>
                <th className="px-4 py-3 font-semibold">{t('registrationDate')}</th>
                <th className="px-4 py-3 font-semibold">Digital Seal</th>
                <th className="px-4 py-3 font-semibold">{t('status')}</th>
                <th className="px-4 py-3 font-semibold text-right">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    {t('noDocumentsFound')}
                  </td>
                </tr>
              ) : (
                filteredDocs.map((doc) => {
                  const hasSignature = doc.workflowHistory.some(w => w.digitalSignature?.verified);
                  return (
                    <tr
                      key={doc.id}
                      onClick={() => setSelectedDocument(doc)}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-mono tabular-nums whitespace-nowrap">
                        <div className="font-bold text-slate-900 dark:text-slate-100">
                          {doc.registrationNumber}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {doc.referenceNumber}
                        </div>
                      </td>

                      <td className="px-4 py-3 max-w-xs">
                        <div className="font-medium text-slate-900 dark:text-slate-100 line-clamp-2">
                          {language === 'am' ? doc.subjectAm : doc.subjectEn}
                        </div>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {doc.recipientOrganization}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {doc.recipientPerson || 'External Recipient'}
                        </div>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-400">
                        {doc.assignedDepartmentName || 'Directorate'}
                      </td>

                      <td className="px-4 py-3 font-mono tabular-nums whitespace-nowrap text-slate-600 dark:text-slate-400">
                        {formatEthiopianDate(doc.registrationDate, language)}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {hasSignature ? (
                          <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>PKI Verified</span>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">Pending Sign</span>
                        )}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-semibold text-teal-700 dark:text-teal-300">
                          {doc.status}
                        </span>
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
