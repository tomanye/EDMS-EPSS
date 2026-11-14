import React from 'react';
import { useApp } from '../../context/AppContext.js';

interface LoadingSkeletonProps {
  variant?: 'dashboard' | 'table' | 'cards';
  label?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  variant = 'dashboard',
  label
}) => {
  const { language, t } = useApp();
  const statusText =
    label || (language === 'am' ? t('loadingData') : t('loadingData'));

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={statusText}
      className="space-y-6 animate-pulse max-w-7xl mx-auto"
    >
      <span className="sr-only">{statusText}</span>

      {variant === 'dashboard' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className="h-28 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3"
              >
                <div className="h-3 w-28 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-7 w-16 rounded bg-slate-200 dark:bg-slate-800" />
                <div className="h-2.5 w-36 rounded bg-slate-100 dark:bg-slate-800/70" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 h-64 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
              <div className="h-4 w-48 rounded bg-slate-200 dark:bg-slate-800" />
              {[0, 1, 2, 3, 4].map((row) => (
                <div key={row} className="h-8 rounded bg-slate-100 dark:bg-slate-800/60" />
              ))}
            </div>
            <div className="h-64 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
              <div className="h-4 w-36 rounded bg-slate-200 dark:bg-slate-800" />
              {[0, 1, 2].map((card) => (
                <div key={card} className="h-14 rounded bg-slate-100 dark:bg-slate-800/60" />
              ))}
            </div>
          </div>
        </>
      )}

      {variant === 'table' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
          <div className="flex items-center justify-between gap-4 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="h-4 w-44 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-8 w-32 rounded bg-slate-200 dark:bg-slate-800" />
          </div>
          {[0, 1, 2, 3, 4, 5].map((row) => (
            <div key={row} className="h-10 rounded bg-slate-100 dark:bg-slate-800/60" />
          ))}
        </div>
      )}

      {variant === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2, 3, 4, 5].map((card) => (
            <div
              key={card}
              className="h-36 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3"
            >
              <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="h-3 w-full rounded bg-slate-100 dark:bg-slate-800/70" />
              <div className="h-3 w-1/2 rounded bg-slate-100 dark:bg-slate-800/70" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
