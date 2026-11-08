/**
 * EPSS Enterprise Document and Records Management System (EDRMS)
 * Ethiopian Pharmaceutical Supply Service / የኢትዮጵያ መድኃኒት አቅራቢ አገልግሎት
 *
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext.js';
import { Header } from './components/layout/Header.js';
import { Sidebar } from './components/layout/Sidebar.js';
import { ExecutiveDashboard } from './components/dashboard/ExecutiveDashboard.js';
import { IncomingCorrespondenceView } from './components/correspondence/IncomingCorrespondenceView.js';
import { OutgoingCorrespondenceView } from './components/correspondence/OutgoingCorrespondenceView.js';
import { InternalMemosView } from './components/correspondence/InternalMemosView.js';
import { ApplicationsView } from './components/correspondence/ApplicationsView.js';
import { WorkflowInboxView } from './components/workflow/WorkflowInboxView.js';
import { PhysicalTrackingView } from './components/tracking/PhysicalTrackingView.js';
import { CentralRepositoryView } from './components/repository/CentralRepositoryView.js';
import { AdvancedSearchView } from './components/search/AdvancedSearchView.js';
import { RecordsArchivalView } from './components/records/RecordsArchivalView.js';
import { ReportsView } from './components/analytics/ReportsView.js';
import { OrganizationAdminView } from './components/admin/OrganizationAdminView.js';
import { AuditSecurityView } from './components/admin/AuditSecurityView.js';
import { EnterpriseIntegrationsView } from './components/integrations/EnterpriseIntegrationsView.js';
import { DocumentDetailModal } from './components/correspondence/DocumentDetailModal.js';
import { RegisterDocumentModal } from './components/correspondence/RegisterDocumentModal.js';

function MainLayout() {
  const { activeTab, isLoading, documents, setSelectedDocument } = useApp();

  // Handle direct QR code scans / verification URLs (?verifyDoc=EPSS%2FIN%2F...)
  React.useEffect(() => {
    if (typeof window !== 'undefined' && documents.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const verifyRegNo = params.get('verifyDoc');
      if (verifyRegNo) {
        const found = documents.find(d => 
          d.registrationNumber.toLowerCase() === verifyRegNo.toLowerCase() ||
          d.referenceNumber.toLowerCase() === verifyRegNo.toLowerCase()
        );
        if (found) {
          setSelectedDocument(found);
        }
      }
    }
  }, [documents, setSelectedDocument]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      <Header />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-2 border-teal-700 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-slate-500 font-mono">Synchronizing EPSS EDRMS...</span>
              </div>
            </div>
          ) : (
            <div className="max-w-7xl mx-auto">
              {activeTab === 'dashboard' && <ExecutiveDashboard />}
              {activeTab === 'incoming' && <IncomingCorrespondenceView />}
              {activeTab === 'outgoing' && <OutgoingCorrespondenceView />}
              {activeTab === 'memos' && <InternalMemosView />}
              {activeTab === 'applications' && <ApplicationsView />}
              {activeTab === 'workflows' && <WorkflowInboxView />}
              {activeTab === 'tracking' && <PhysicalTrackingView />}
              {activeTab === 'repository' && <CentralRepositoryView />}
              {activeTab === 'search' && <AdvancedSearchView />}
              {activeTab === 'archives' && <RecordsArchivalView />}
              {activeTab === 'reports' && <ReportsView />}
              {activeTab === 'organization' && <OrganizationAdminView />}
              {activeTab === 'integrations' && <EnterpriseIntegrationsView />}
              {activeTab === 'security' && <AuditSecurityView />}
            </div>
          )}
        </main>
      </div>

      {/* Global Modals */}
      <DocumentDetailModal />
      <RegisterDocumentModal />
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
