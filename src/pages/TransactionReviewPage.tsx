import React, { useState, useEffect, useRef } from 'react';
import { 
  HelpCircle, FileSpreadsheet, 
  RefreshCw, Download 
} from 'lucide-react';
import { ClarificationQueuePage } from './ClarificationQueuePage';
import { TransactionsPage } from './TransactionsPage';

interface TransactionReviewPageProps {
  initialTab?: 'review' | 'approvals' | 'clarification' | 'all';
}

export const TransactionReviewPage: React.FC<TransactionReviewPageProps> = ({ initialTab = 'clarification' }) => {
  const normalizedTab: 'clarification' | 'all' = 
    (initialTab === 'review' || initialTab === 'approvals' || initialTab === 'clarification') ? 'clarification' : 'all';
  const [activeTab, setActiveTab] = useState<'clarification' | 'all'>(normalizedTab);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  
  // Ref holding the active child's exact filter-aware CSV export function
  const exportHandlerRef = useRef<(() => void) | null>(null);

  // Sync state if navigation prop changes
  useEffect(() => {
    setActiveTab(normalizedTab);
    setRefreshKey(k => k + 1);
  }, [normalizedTab]);

  // Auto-refresh when user switches back to this browser tab
  useEffect(() => {
    const handleFocus = () => {
      setRefreshKey(k => k + 1);
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const handleTabChange = (tab: 'clarification' | 'all') => {
    setActiveTab(tab);
    setRefreshKey(k => k + 1);
  };

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setRefreshKey(k => k + 1);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const handleExportCSV = () => {
    if (exportHandlerRef.current) {
      exportHandlerRef.current();
    } else {
      alert("No data available to export in current tab.");
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Unified Tab Navigation Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleTabChange('clarification')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'clarification'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
            <span>Clarification Queue</span>
          </button>

          <button
            onClick={() => handleTabChange('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-blue-400" />
            <span>All Transactions Feed</span>
          </button>
        </div>

        {/* Global Tab Actions (Export CSV & Refresh View) */}
        <div className="flex items-center gap-2 pr-1">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-colors flex items-center gap-2 cursor-pointer shadow-2xs"
            title="Export filtered table data to CSV file"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleManualRefresh}
            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-colors flex items-center gap-2 cursor-pointer shadow-2xs"
            title="Refresh current view"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-600 dark:text-blue-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh View</span>
          </button>
        </div>
      </div>

      {/* Render Active View with remount key and filter-aware export registration */}
      <div>
        {activeTab === 'clarification' && (
          <ClarificationQueuePage 
            key={`clarification-${refreshKey}`} 
            onRegisterExport={(fn) => { exportHandlerRef.current = fn; }}
          />
        )}
        {activeTab === 'all' && (
          <TransactionsPage 
            key={`all-${refreshKey}`} 
            onRegisterExport={(fn) => { exportHandlerRef.current = fn; }}
          />
        )}
      </div>
    </div>
  );
};
