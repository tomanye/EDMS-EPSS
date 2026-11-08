import React, { useState } from 'react';
import { 
  PlusCircle, 
  Search, 
  Filter, 
  QrCode, 
  FileText, 
  ArrowUpRight, 
  ExternalLink,
  Building,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import { formatEthiopianDate } from '../../lib/translations.js';
import { DocumentItem } from '../../types/index.js';

export const IncomingCorrespondenceView: React.FC = () => {
  const { documents, branches, departments, setSelectedDocument, openRegisterModal, language, t } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');

  // Filter incoming letters only
  const incomingDocs = documents.filter(d => d.type === 'IncomingLetter');

  const filteredDocs = incomingDocs.filter(d => {
    if (selectedBranch !== 'all' && d.branchId !== selectedBranch) return false;
    if (selectedDept !== 'all' && d.departmentId !== selectedDept) return false;
    if (selectedStatus !== 'all' && d.status !== selectedStatus) return false;
    if (selectedPriority !== 'all' && d.priority !== selectedPriority) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        d.registrationNumber.toLowerCase().includes(q) ||
        d.referenceNumber.toLowerCase().includes(q) ||
        d.subjectEn.toLowerCase().includes(q) ||
        d.subjectAm.toLowerCase().includes(q) ||
        d.senderOrganization.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header and Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t('navIncoming')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {language === 'am' 
              ? 'ከመንግሥት መሥሪያ ቤቶች፣ ከአጋር ድርጅቶች እና ከአምራቾች የገቡ ይፋዊ ደብዳቤዎች መዝገብ'
              : 'Official registry of external letters received from Ministry of Health, EFDA, WHO, and suppliers.'}
          </p>
        </div>
        <button
          onClick={() => openRegisterModal('IncomingLetter')}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-700 rounded-lg shadow-xs transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{language === 'am' ? 'አዲስ ገቢ ደብዳቤ መዝግብ' : 'Register Incoming Letter'}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* Search text input */}
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {/* Branch Filter */}
          <div>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full py-2 px-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="all">{language === 'am' ? 'ሁሉም 19 ቅርንጫፎች' : 'All Branches (19 Hubs)'}</option>
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.nameEn}</option>
              ))}
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full py-2 px-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="all">{language === 'am' ? 'ሁሉም ዳይሬክቶሬቶች' : 'All Directorates'}</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.nameEn}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full py-2 px-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="all">{language === 'am' ? 'ሁሉም የሂደት ደረጃዎች' : 'All Statuses'}</option>
              <option value="Received">Received</option>
              <option value="UnderReview">Under Review</option>
              <option value="Assigned">Assigned</option>
              <option value="InProgress">In Progress</option>
              <option value="AwaitingApproval">Awaiting Approval</option>
              <option value="Approved">Approved</option>
              <option value="Dispatched">Dispatched</option>
              <option value="Archived">Archived</option>
            </select>
          </div>
        </div>

        {/* Active Filters Summary */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
          <span>
            {language === 'am' ? `የተገኙ ሰነዶች፦ ` : `Showing `}
            <strong className="font-mono tabular-nums text-slate-900 dark:text-slate-100">{filteredDocs.length}</strong>
            {language === 'am' ? ` ደብዳቤዎች` : ` registered correspondence records`}
          </span>
          {(selectedBranch !== 'all' || selectedDept !== 'all' || selectedStatus !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedBranch('all');
                setSelectedDept('all');
                setSelectedStatus('all');
                setSelectedPriority('all');
                setSearchQuery('');
              }}
              className="text-teal-700 dark:text-teal-400 hover:underline font-medium"
            >
              {t('reset')}
            </button>
          )}
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3 font-semibold">{t('regNumber')}</th>
                <th className="px-4 py-3 font-semibold">{t('subject')}</th>
                <th className="px-4 py-3 font-semibold">{t('sender')}</th>
                <th className="px-4 py-3 font-semibold">{t('department')}</th>
                <th className="px-4 py-3 font-semibold">{t('registrationDate')}</th>
                <th className="px-4 py-3 font-semibold">{t('priority')}</th>
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
                filteredDocs.map((doc) => (
                  <tr
                    key={doc.id}
                    onClick={() => setSelectedDocument(doc)}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    {/* Reg No + Ref */}
                    <td className="px-4 py-3 font-mono tabular-nums whitespace-nowrap">
                      <div className="font-bold text-slate-900 dark:text-slate-100">
                        {doc.registrationNumber}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {doc.referenceNumber}
                      </div>
                    </td>

                    {/* Subject */}
                    <td className="px-4 py-3 max-w-xs">
                      <div className="font-medium text-slate-900 dark:text-slate-100 line-clamp-2">
                        {language === 'am' ? doc.subjectAm : doc.subjectEn}
                      </div>
                      {doc.tags?.length > 0 && (
                        <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
                          {doc.tags.slice(0, 3).map((tag, idx) => (
                            <span key={idx}>
                              #{tag} {idx < 2 && idx < doc.tags.length - 1 ? '·' : ''}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Sender */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-medium text-slate-800 dark:text-slate-200">
                        {doc.senderOrganization}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {doc.senderPerson || 'Official Dispatch'}
                      </div>
                    </td>

                    {/* Department / Assigned */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-slate-800 dark:text-slate-200">
                        {doc.assignedDepartmentName || 'Central Registry'}
                      </div>
                      <div className="text-[11px] text-teal-700 dark:text-teal-400">
                        {doc.assignedUserName || 'Unassigned'}
                      </div>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 font-mono tabular-nums whitespace-nowrap text-slate-600 dark:text-slate-400">
                      {formatEthiopianDate(doc.registrationDate, language)}
                    </td>

                    {/* Priority */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-[11px] font-semibold ${
                        doc.priority === 'VeryUrgent'
                          ? 'text-rose-600 dark:text-rose-400'
                          : doc.priority === 'Urgent'
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-slate-500'
                      }`}>
                        {doc.priority}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-semibold text-teal-700 dark:text-teal-300">
                        {doc.status}
                      </span>
                    </td>

                    {/* Actions */}
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
    </div>
  );
};
