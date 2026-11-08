import React, { useState } from 'react';
import { 
  Building2, 
  Globe, 
  Moon, 
  Sun, 
  UserCheck, 
  PlusCircle, 
  CheckCircle2, 
  FileText,
  Bell,
  Check,
  ArrowRight
} from 'lucide-react';
import { useApp } from '../../context/AppContext.js';
import { formatEthiopianDate } from '../../lib/translations.js';

export const Header: React.FC = () => {
  const { 
    language, 
    setLanguage, 
    theme, 
    toggleTheme, 
    currentUser, 
    availablePersonas, 
    switchUser,
    openRegisterModal,
    notifications,
    unreadNotificationsCount,
    markNotificationAsRead,
    documents,
    setSelectedDocument,
    t
  } = useApp();

  const [isNotifOpen, setIsNotifOpen] = useState(false);

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 flex items-center justify-between gap-8 sticky top-0 z-30 transition-colors">
      {/* Zone 1: Brand Wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-9 h-9 rounded-lg bg-teal-700 text-white flex items-center justify-center font-bold text-base shadow-sm">
          <span>EP</span>
        </div>
        <div className="flex flex-col">
          <span className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap">
            {language === 'am' ? 'ኢ.መ.አ.አ ሰ.መ.አ.ስ' : 'EPSS EDRMS'}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap hidden sm:inline">
            {language === 'am' ? 'የኢትዮጵያ መድኃኒት አቅራቢ አገልግሎት' : 'Ethiopian Pharmaceutical Supply Service'}
          </span>
        </div>
      </div>

      {/* Zone 2: Navigation Links / Hub Status */}
      <div className="hidden lg:flex items-center gap-6 text-xs text-slate-600 dark:text-slate-300">
        <div className="flex items-center gap-1.5 font-medium">
          <Building2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          <span>{currentUser?.branchNameEn || 'EPSS Head Office'}</span>
        </div>
        <span className="text-slate-300 dark:text-slate-700">·</span>
        <div className="flex items-center gap-1.5 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>{language === 'am' ? '19 የክልል ማዕከላት ተገናኝተዋል' : '19 Regional Hubs Synchronized'}</span>
        </div>
      </div>

      {/* Zone 3: Controls & Primary Action */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Language Toggle */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setLanguage('en')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              language === 'en'
                ? 'bg-white dark:bg-slate-700 text-teal-800 dark:text-teal-200 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            EN
          </button>
          <button
            onClick={() => setLanguage('am')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
              language === 'am'
                ? 'bg-white dark:bg-slate-700 text-teal-800 dark:text-teal-200 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            አማ
          </button>
        </div>

        {/* Notifications Bell & Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            aria-label="Toggle notifications"
            className="relative p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between font-bold text-slate-900 dark:text-slate-100">
                <div className="flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-teal-600" />
                  <span>{t('notifications')}</span>
                  {unreadNotificationsCount > 0 && (
                    <span className="font-mono text-[10px] text-teal-800 bg-teal-100 dark:bg-teal-950 px-1.5 py-0.5 rounded">
                      {unreadNotificationsCount} new
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setIsNotifOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-slate-400">
                    No new system notifications.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        markNotificationAsRead(n.id);
                        if (n.documentId) {
                          const target = documents.find(d => d.id === n.documentId || d.registrationNumber === n.registrationNumber);
                          if (target) {
                            setSelectedDocument(target);
                            setIsNotifOpen(false);
                          }
                        }
                      }}
                      className={`p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors ${
                        !n.isRead ? 'bg-teal-50/40 dark:bg-teal-950/20' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {language === 'am' ? n.titleAm : n.titleEn}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">
                          {formatEthiopianDate(n.timestamp, language)}
                        </span>
                      </div>
                      <p className="mt-1 text-slate-600 dark:text-slate-300 leading-snug line-clamp-2">
                        {language === 'am' ? n.messageAm : n.messageEn}
                      </p>
                      {n.registrationNumber && (
                        <div className="mt-1 flex items-center justify-between">
                          <span className="font-mono text-[10px] text-teal-700 dark:text-teal-400 font-semibold">
                            {n.registrationNumber}
                          </span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                            View <ArrowRight className="w-2.5 h-2.5" />
                          </span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Theme Switcher */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>

        {/* Persona Switcher Dropdown */}
        <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
          <UserCheck className="w-4 h-4 text-slate-400" />
          <select
            value={currentUser?.id || ''}
            onChange={(e) => switchUser(e.target.value)}
            className="text-xs bg-transparent border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500 font-medium"
          >
            {availablePersonas.map((p) => (
              <option key={p.id} value={p.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                {language === 'am' ? p.fullNameAm : p.fullNameEn} ({p.role})
              </option>
            ))}
          </select>
        </div>

        {/* Primary CTA: Register Document */}
        <button
          onClick={() => openRegisterModal('IncomingLetter')}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-700 rounded-lg shadow-xs transition-colors whitespace-nowrap shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{t('register')}</span>
        </button>
      </div>
    </header>
  );
};
