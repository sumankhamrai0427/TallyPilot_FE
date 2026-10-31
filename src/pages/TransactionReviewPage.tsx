import React, { useState } from 'react';
import { 
  CheckCircle2, HelpCircle, FileSpreadsheet, 
  Sparkles, Filter, RefreshCw 
} from 'lucide-react';
import { ApprovalQueuePage } from './ApprovalQueuePage';
import { ClarificationQueuePage } from './ClarificationQueuePage';
import { TransactionsPage } from './TransactionsPage';

interface TransactionReviewPageProps {
  initialTab?: 'approvals' | 'clarification' | 'all';
}

export const TransactionReviewPage: React.FC<TransactionReviewPageProps> = ({ initialTab = 'approvals' }) => {
  const [activeTab, setActiveTab] = useState<'approvals' | 'clarification' | 'all'>(initialTab);

  return (
    <div className="space-y-4">
      {/* Top Unified Tab Navigation Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('approvals')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'approvals'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Approval Queue</span>
          </button>

          <button
            onClick={() => setActiveTab('clarification')}
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
            onClick={() => setActiveTab('all')}
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
      </div>

      {/* Render Active View */}
      <div>
        {activeTab === 'approvals' && <ApprovalQueuePage />}
        {activeTab === 'clarification' && <ClarificationQueuePage />}
        {activeTab === 'all' && <TransactionsPage />}
      </div>
    </div>
  );
};

