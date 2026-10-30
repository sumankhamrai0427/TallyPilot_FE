import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { DashboardPage } from './pages/DashboardPage';
import { ImportPage } from './pages/ImportPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { ClarificationQueuePage } from './pages/ClarificationQueuePage';
import { ApprovalQueuePage } from './pages/ApprovalQueuePage';
import { TallyPage } from './pages/TallyPage';
import { ImportHistoryPage } from './pages/ImportHistoryPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { SettingsPage } from './pages/SettingsPage';
import { api } from './services/api';
import { DashboardSummary } from './types';

export const App: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummary | undefined>(undefined);

  useEffect(() => {
    // Load summary once on initial app load (no repetitive background polling)
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
      <BrowserRouter>
        <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased transition-colors duration-200">
          <Sidebar summary={summary} />
          <div className="flex-1 flex flex-col min-w-0">
            <Navbar summary={summary} />
            <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
              <Routes>
                <Route path="/" element={<DashboardPage summary={summary} onRefresh={loadSummary} />} />
                <Route path="/import" element={<ImportPage />} />
                <Route path="/transactions" element={<TransactionsPage />} />
                <Route path="/clarification" element={<ClarificationQueuePage />} />
                <Route path="/approvals" element={<ApprovalQueuePage />} />
                <Route path="/tally" element={<TallyPage />} />
                <Route path="/history" element={<ImportHistoryPage />} />
                <Route path="/audit-logs" element={<AuditLogsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Routes>
            </main>
          </div>
        </div>
      </BrowserRouter>
    </ThemeProvider>
  );
};
