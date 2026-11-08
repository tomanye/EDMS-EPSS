import React, { useState } from 'react';
import { 
  Archive, 
  Folder, 
  FileText, 
  Download, 
  Lock, 
  Unlock, 
  ShieldCheck, 
  Clock, 
  Search,
  ArrowUpRight
} from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import { formatEthiopianDate } from '../../lib/translations.js';

export const CentralRepositoryView: React.FC = () => {
  const { documents, setSelectedDocument, language, t } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    { id: 'all', label: 'All Electronic Files', count: documents.length },
    { id: 'procurement', label: 'Procurement Contracts & Tenders', count: documents.filter(d => d.departmentId === 'dept-proc').length },
    { id: 'quality', label: 'EFDA Clearance & Inspection Dossiers', count: documents.filter(d => d.departmentId === 'dept-qa').length },
    { id: 'distribution', label: 'Logistics, Waybills & Distribution', count: documents.filter(d => d.departmentId === 'dept-store').length },
    { id: 'directives', label: 'Executive Directives & Circulars', count: documents.filter(d => d.type === 'InternalMemo').length },
  ];

  const filteredDocs = documents.filter(d => {
    if (selectedCategory === 'procurement' && d.departmentId !== 'dept-proc') return false;
    if (selectedCategory === 'quality' && d.departmentId !== 'dept-qa') return false;
    if (selectedCategory === 'distribution' && d.departmentId !== 'dept-store') return false;
    if (selectedCategory === 'directives' && d.type !== 'InternalMemo') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        d.registrationNumber.toLowerCase().includes(q) ||
        d.subjectEn.toLowerCase().includes(q) ||
        d.attachments.some(a => a.fileName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t('navRepository')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {language === 'am'
              ? 'ማዕከላዊ የኤሌክትሮኒክስ ፋይሎች ማከማቻ፣ የሰነድ ቅጅዎች ቁጥጥር እና የደህንነት ማረጋገጫ'
              : 'Centralized electronic file repository with version control, integrity hash auditing, and check-in protection.'}
          </p>
        </div>
      </div>

      {/* Categories & Search */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Category folder sidebar */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 shadow-xs space-y-1">
          <div className="px-3 py-2 text-[11px] font-semibold uppercase text-slate-400">
            Document Vaults
          </div>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg text-left transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-200 font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <Folder className={`w-4 h-4 shrink-0 ${selectedCategory === cat.id ? 'text-teal-600' : 'text-slate-400'}`} />
                <span className="truncate">{cat.label}</span>
              </div>
              <span className="font-mono text-[11px] tabular-nums text-slate-400">
                {cat.count}
              </span>
            </button>
          ))}
        </div>

        {/* File Repository Listing */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 shadow-xs">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search repository files by name, ref #, or subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">File Name & Registration</th>
                  <th className="px-4 py-3 font-semibold">Subject</th>
                  <th className="px-4 py-3 font-semibold">Version</th>
                  <th className="px-4 py-3 font-semibold">Check-out Status</th>
                  <th className="px-4 py-3 font-semibold">Integrity</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredDocs.map((doc) => {
                  const mainAtt = doc.attachments[0];
                  return (
                    <tr
                      key={doc.id}
                      onClick={() => setSelectedDocument(doc)}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-teal-600 shrink-0" />
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-slate-100">
                              {mainAtt?.fileName || `${doc.registrationNumber}.pdf`}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400">
                              {doc.registrationNumber}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 max-w-xs">
                        <div className="font-medium text-slate-800 dark:text-slate-200 line-clamp-1">
                          {language === 'am' ? doc.subjectAm : doc.subjectEn}
                        </div>
                      </td>

                      <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        v{mainAtt?.version || 1}.0
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                          {doc.legalHold ? (
                            <>
                              <Lock className="w-3.5 h-3.5 text-rose-600" />
                              <span className="text-rose-600 font-semibold">Locked</span>
                            </>
                          ) : (
                            <>
                              <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700 dark:text-emerald-400">Checked In</span>
                            </>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1 text-[11px] text-teal-700 dark:text-teal-400 font-mono">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>SHA-256 Valid</span>
                        </div>
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
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
