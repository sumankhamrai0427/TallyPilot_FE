import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { CompanyProvider } from './context/CompanyContext';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { DashboardPage } from './pages/DashboardPage';
import { AIAssistantPage } from './pages/AIAssistantPage';
import { ImportPage } from './pages/ImportPage';
import { TransactionReviewPage } from './pages/TransactionReviewPage';
import { VouchersPage } from './pages/VouchersPage';
import { ChartOfAccountsPage } from './pages/ChartOfAccountsPage';
import { ReconciliationPage } from './pages/ReconciliationPage';
import { ReportsPage } from './pages/ReportsPage';
import { CompanyMasterPage } from './pages/CompanyMasterPage';
import { TallyPage } from './pages/TallyPage';
import { ImportHistoryPage } from './pages/ImportHistoryPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { SettingsPage } from './pages/SettingsPage';
import { api } from './services/api';
import { DashboardSummary } from './types';

export const App: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummary | undefined>(undefined);

  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async () => {
    try {
      const data = await api.getDashboardSummary();
      setSummary(data);
    } catch {
      // Ignore background refresh errors
    }
  };

  return (
    <ThemeProvider>
      <CompanyProvider>
        <BrowserRouter>
          <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased transition-colors duration-200">
            <Sidebar summary={summary} />
            <div className="flex-1 flex flex-col min-w-0">
              <Navbar summary={summary} />
              <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
                <Routes>
                  {/* HLA Section 9.2 Core Navigation Modules */}
                  <Route path="/" element={<DashboardPage summary={summary} onRefresh={loadSummary} />} />
                  <Route path="/assistant" element={<AIAssistantPage />} />
                  <Route path="/documents" element={<ImportPage />} />
                  <Route path="/review" element={<TransactionReviewPage />} />
                  <Route path="/vouchers" element={<VouchersPage />} />
                  <Route path="/chart-of-accounts" element={<ChartOfAccountsPage />} />
                  <Route path="/company-master" element={<CompanyMasterPage />} />
                  <Route path="/reconciliation" element={<ReconciliationPage />} />
                  <Route path="/reports" element={<ReportsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />

                  {/* Backward-Compatible Routing Aliases */}
                  <Route path="/import" element={<ImportPage />} />
                  <Route path="/transactions" element={<TransactionReviewPage initialTab="all" />} />
                  <Route path="/clarification" element={<TransactionReviewPage initialTab="clarification" />} />
                  <Route path="/approvals" element={<TransactionReviewPage initialTab="approvals" />} />
                  <Route path="/tally" element={<TallyPage />} />
                  <Route path="/history" element={<ImportHistoryPage />} />
                  <Route path="/audit-logs" element={<AuditLogsPage />} />

                  {/* Fallback */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
            </div>
          </div>
        </BrowserRouter>
      </CompanyProvider>
    </ThemeProvider>
  );
};
