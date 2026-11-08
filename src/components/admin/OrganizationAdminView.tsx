import React, { useState } from 'react';
import { Building2, Phone, Mail, MapPin, Network, Users, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import { BranchCluster } from '../../types/index.js';

export const OrganizationAdminView: React.FC = () => {
  const { branches, departments, language, t } = useApp();
  const [selectedCluster, setSelectedCluster] = useState<string>('all');
  const [activeSubTab, setActiveSubTab] = useState<'branches' | 'directorates'>('branches');

  const clusters: { id: string; label: string }[] = [
    { id: 'all', label: 'All 19 Branches + HQ' },
    { id: 'Central', label: 'Central Cluster' },
    { id: 'Northern', label: 'Northern Cluster' },
    { id: 'Western', label: 'Western Cluster' },
    { id: 'SouthernEastern', label: 'Southern & Eastern Cluster' },
  ];

  const filteredBranches = branches.filter(b => {
    if (selectedCluster !== 'all' && b.cluster !== selectedCluster) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t('navOrganization')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {language === 'am'
              ? 'የኢ.መ.አ.አ ዋና መሥሪያ ቤት፣ 19 የክልል ቅርንጫፍ ማዕከላት እና ዳይሬክቶሬቶች መዋቅር'
              : 'Official organizational topology covering the Addis Ababa Head Office and all 19 regional branch hubs.'}
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg self-start sm:self-auto border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveSubTab('branches')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              activeSubTab === 'branches'
                ? 'bg-white dark:bg-slate-700 text-teal-800 dark:text-teal-200 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            19 Regional Branches ({branches.length})
          </button>
          <button
            onClick={() => setActiveSubTab('directorates')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              activeSubTab === 'directorates'
                ? 'bg-white dark:bg-slate-700 text-teal-800 dark:text-teal-200 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Core Directorates ({departments.length})
          </button>
        </div>
      </div>

      {activeSubTab === 'branches' && (
        <div className="space-y-4">
          {/* Cluster Filter Buttons */}
          <div className="flex items-center flex-wrap gap-2">
            {clusters.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCluster(c.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  selectedCluster === c.id
                    ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Branches Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBranches.map((b) => (
              <div
                key={b.id}
                className={`p-5 rounded-xl border shadow-xs flex flex-col justify-between space-y-3 ${
                  b.isHeadOffice
                    ? 'bg-teal-50/50 dark:bg-teal-950/20 border-teal-300 dark:border-teal-800'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-teal-700 dark:text-teal-400">
                      {b.code}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                      {b.cluster} Cluster
                    </span>
                  </div>

                  <h3 className="mt-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                    {language === 'am' ? b.nameAm : b.nameEn}
                  </h3>
                  {b.isHeadOffice && (
                    <span className="text-[10px] font-bold text-teal-800 dark:text-teal-300 bg-teal-100 dark:bg-teal-950 px-2 py-0.5 rounded inline-block mt-1">
                      NATIONAL HEADQUARTERS
                    </span>
                  )}

                  <div className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{b.city}, {b.region}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono">{b.phone}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{b.email}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <span className="text-slate-400 block text-[11px]">Hub Director / Lead:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{b.managerName}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSubTab === 'directorates' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            EPSS Central Directorate Topology
          </h2>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            {departments.map((d) => (
              <div key={d.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <span className="font-mono font-bold text-teal-700 dark:text-teal-400">{d.code}</span>
                  <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                    {language === 'am' ? d.nameAm : d.nameEn}
                  </div>
                  <div className="text-slate-500 text-[11px]">
                    Sector: {d.directorateEn}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 text-[11px] block">Directorate Head</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{d.headNameEn || 'Assigned Director'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
