import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileSpreadsheet,
  CheckCircle2,
  HelpCircle,
  Clock,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Wallet,
  Building2,
  Scale,
  DollarSign,
  FileText,
  SlidersHorizontal,
  Server,
  Layers,
  BookOpen
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { api } from '../services/api';
import { DashboardSummary } from '../types';
import { useTheme } from '../context/ThemeContext';

interface DashboardPageProps {
  summary?: DashboardSummary | null;
  onRefresh?: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ summary: propSummary, onRefresh }) => {
  const [localSummary, setLocalSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { theme } = useTheme();

  const summary = propSummary || localSummary;

  useEffect(() => {
    if (!propSummary && !localSummary) {
      loadSummary();
    }
  }, [propSummary]);

  const loadSummary = async () => {
    if (onRefresh) {
      onRefresh();
      return;
    }
    try {
      setLoading(true);
      const data = await api.getDashboardSummary();
      setLocalSummary(data);
    } catch (err) {
      console.error("Failed to load dashboard summary:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatINR = (val?: number | string) => {
    const num = Number(val || 0);
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const statusColors: Record<string, string> = {
    PROCESSED: '#10b981',
    PENDING_APPROVAL: '#2563eb',
    NEEDS_CLARIFICATION: '#f59e0b',
    CLASSIFIED: '#6366f1',
    PARSED: '#8b5cf6',
    FAILED: '#ef4444',
    SKIPPED: '#94a3b8'
  };

  const chartData = summary?.status_distribution
    ? Object.entries(summary.status_distribution).map(([status, count]) => ({
      name: status.replace('_', ' '),
      rawStatus: status,
      count
    }))
    : [];

  const isNetProfit = (Number(summary?.current_profit_loss) || 0) >= 0;

  if (loading || !summary) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-400 gap-3">
        <i className="pi pi-spin pi-spinner text-blue-600 dark:text-blue-400" style={{ fontSize: '2rem' }}></i>
        <span className="text-xs font-medium">Loading Dashboard overview...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 dark:from-[#23201c] dark:via-[#2b2722] dark:to-[#1f1d1a] p-6 rounded-2xl text-white shadow-md border border-blue-600/30 dark:border-amber-500/10 transition-colors">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Financial & Operations Overview</h2>
          <p className="text-xs text-blue-100 dark:text-stone-300 mt-0.5">
            Real-time balance synchronization across books, automated statement processing, and Tally Prime.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/documents')}
            className="px-4 py-2 bg-white text-blue-700 hover:bg-blue-50 dark:bg-amber-500 dark:text-stone-950 dark:hover:bg-amber-400 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-blue-600 dark:text-stone-950" />
            <span>Documents Hub</span>
          </button>
          <button
            onClick={() => navigate('/review')}
            className="px-4 py-2 bg-white/15 hover:bg-white/25 dark:bg-stone-800/80 dark:hover:bg-stone-700 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer border border-white/20 dark:border-stone-700"
          >
            <span>Review Queue</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate('/reports')}
            className="px-4 py-2 bg-white/15 hover:bg-white/25 dark:bg-stone-800/80 dark:hover:bg-stone-700 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer border border-white/20 dark:border-stone-700"
          >
            <span>Financial Reports</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: FINANCIAL OVERVIEW (HLA 9.5 Core Financial KPIs) */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Financial Overview & Balances
            </h3>
          </div>
          <span className="text-xs text-slate-400">Current Accounting Year</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Current Year Profit / Loss */}
          <div
            onClick={() => navigate('/reports')}
            className={`p-5 rounded-xl border shadow-xs transition-all cursor-pointer relative overflow-hidden ${isNetProfit
              ? 'bg-gradient-to-br from-emerald-50/80 to-white dark:from-emerald-950/30 dark:to-slate-900 border-emerald-200 dark:border-emerald-800/60 hover:border-emerald-400'
              : 'bg-gradient-to-br from-rose-50/80 to-white dark:from-rose-950/30 dark:to-slate-900 border-rose-200 dark:border-rose-800/60 hover:border-rose-400'
              }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Current Year Profit / Loss
              </span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${isNetProfit
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                }`}>
                {isNetProfit ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                <span>{isNetProfit ? 'Net Profit' : 'Net Loss'}</span>
              </span>
            </div>

            <div className={`mt-3 text-2xl font-black ${isNetProfit ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
              }`}>
              {formatINR(summary?.current_profit_loss)}
            </div>
            <div className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
              Total Income minus Total Expenditure
            </div>
          </div>

          {/* 2. Income vs Expenditure */}
          <div
            onClick={() => navigate('/reports')}
            className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-blue-400 dark:hover:border-blue-500 transition-all cursor-pointer space-y-3"
          >
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <span>Income & Expenditure</span>
              <Scale className="w-4 h-4 text-blue-500" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>Total Income:</span>
                </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {formatINR(summary?.total_income)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  <span>Total Expenditure:</span>
                </span>
                <span className="font-bold text-rose-600 dark:text-rose-400">
                  {formatINR(summary?.total_expenditure)}
                </span>
              </div>
            </div>
            <div className="pt-1 text-[11px] text-slate-400">Deterministic P&L ledgers</div>
          </div>

          {/* 3. Cash & Bank Balances */}
          <div
            onClick={() => navigate('/reconciliation')}
            className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-blue-400 dark:hover:border-blue-500 transition-all cursor-pointer space-y-3"
          >
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <span>Liquid Cash & Bank</span>
              <Wallet className="w-4 h-4 text-emerald-500" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-blue-500" />
                  <span>Bank Balance:</span>
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {formatINR(summary?.bank_balance)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Wallet className="w-3.5 h-3.5 text-amber-500" />
                  <span>Cash Balance:</span>
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {formatINR(summary?.cash_balance)}
                </span>
              </div>
            </div>
            <div className="pt-1 text-[11px] text-slate-400">Current liquid asset accounts</div>
          </div>

          {/* 4. Outstanding Receivables & Payables */}
          <div
            onClick={() => navigate('/chart-of-accounts')}
            className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-blue-400 dark:hover:border-blue-500 transition-all cursor-pointer space-y-3"
          >
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <span>Outstanding Balances</span>
              <Layers className="w-4 h-4 text-indigo-500" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Receivables (Debtors):</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {formatINR(summary?.outstanding_receivables)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Payables (Creditors):</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  {formatINR(summary?.outstanding_payables)}
                </span>
              </div>
            </div>
            <div className="pt-1 text-[11px] text-slate-400">Party ledgers & balance book</div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 2: DOCUMENT & VOUCHER PIPELINE (HLA 9.5 Operational KPIs) */}
      {/* ========================================================================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Document & Voucher Ingestion Pipeline
            </h3>
          </div>
          <span className="text-xs text-slate-400">Real-time status</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Needs Clarification */}
          <div
            onClick={() => navigate('/review')}
            className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-amber-400 dark:hover:border-amber-500 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 text-xs font-semibold uppercase tracking-wider">
              <span>Needs Clarification</span>
              <HelpCircle className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
              {summary?.clarification_queue_count ?? 0}
            </div>
            <div className="mt-1 text-xs text-slate-400 dark:text-slate-500">Awaiting user clarification</div>
          </div>

          {/* 2. Unprocessed Documents */}
          <div
            onClick={() => navigate('/documents')}
            className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-amber-400 dark:hover:border-amber-500 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 text-xs font-semibold uppercase tracking-wider">
              <span>Unprocessed Documents</span>
              <FileText className="w-4 h-4 text-amber-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
              {summary?.unprocessed_documents || 0}
            </div>
            <div className="mt-1 text-xs text-slate-400 dark:text-slate-500">In input drop directory</div>
          </div>

          {/* 3. Documents Requiring Attention */}
          <div
            onClick={() => navigate('/review')}
            className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-rose-400 dark:hover:border-rose-500 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 text-xs font-semibold uppercase tracking-wider">
              <span>Requires Attention</span>
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400">
              {summary?.documents_requiring_attention ?? summary?.clarification_queue_count ?? 0}
            </div>
            <div className="mt-1 text-xs text-slate-400 dark:text-slate-500">Ambiguous / validation error</div>
          </div>

          {/* 4. Posted in Tally */}
          <div
            onClick={() => navigate('/vouchers')}
            className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs hover:border-emerald-400 dark:hover:border-emerald-500 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 text-xs font-semibold uppercase tracking-wider">
              <span>Posted Vouchers</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="mt-2 text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              {summary?.processed_transactions || 0}
            </div>
            <div className="mt-1 text-xs text-emerald-600 dark:text-emerald-500">Synchronized with Tally</div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3: STATUS DISTRIBUTION CHART & SYSTEM INTEGRATION */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800 dark:text-white text-base">
                Transaction Status Distribution
              </h3>
              <span className="text-xs text-slate-400 dark:text-slate-500">Real-time pipeline breakdown</span>
            </div>
            {chartData.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" stroke={theme === 'dark' ? '#a8a29e' : '#94a3b8'} fontSize={12} tickLine={false} />
                    <YAxis stroke={theme === 'dark' ? '#a8a29e' : '#94a3b8'} fontSize={12} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      cursor={{ fill: theme === 'dark' ? '#282520' : '#f1f5f9' }}
                      contentStyle={{
                        backgroundColor: theme === 'dark' ? '#1f1d1a' : '#ffffff',
                        borderColor: theme === 'dark' ? '#342f29' : '#e2e8f0',
                        color: theme === 'dark' ? '#f5f5f4' : '#0f172a',
                        borderRadius: '0.5rem'
                      }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={statusColors[entry.rawStatus] || '#3b82f6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 text-sm">
                <FileSpreadsheet className="w-10 h-10 mb-2 stroke-1 text-slate-300 dark:text-slate-600" />
                <span>No transactions loaded yet. Import a statement to get started.</span>
              </div>
            )}
          </div>
        </div>

        {/* System Status Card */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between transition-colors">
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-white text-base mb-4">Integration Diagnostics</h3>
            <div className="space-y-4">
              {/* Categorization Engine Card */}
              <div className="p-3.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Smart Categorization</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${summary?.llm_connection_status === 'connected'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                    }`}>
                    {summary?.llm_connection_status === 'connected' ? 'Active' : 'Standard Rules'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  {summary?.llm_connection_status === 'connected'
                    ? 'Automated ledger matching and rule allocation active for transactions.'
                    : 'Standard rules-based accounting ledger matching is operational.'}
                </p>
              </div>

              {/* Tally Card */}
              <div className="p-3.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Tally Prime Link</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${summary?.tally_connection_status === 'connected'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}>
                    {summary?.tally_connection_status === 'connected' ? 'Connected' : 'Simulation'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  {summary?.tally_connection_status === 'connected'
                    ? 'XML interface connected directly to Tally Prime accounting environment.'
                    : 'Voucher synchronization interface active in local simulation mode.'}
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => navigate('/company-master')}
              className="w-full text-center text-xs font-semibold text-blue-600 dark:text-amber-400 hover:text-blue-700 dark:hover:text-amber-300 py-1 cursor-pointer"
            >
              Configure Company & Integrations &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 4: RECENT STATEMENT BATCHES */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-white text-base">Recent Import Batches</h3>
            <p className="text-xs text-slate-400">Statement files ingested into database</p>
          </div>
          <button
            onClick={() => navigate('/documents')}
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
          >
            View Documents Hub &rarr;
          </button>
        </div>
        {summary?.recent_batches && summary.recent_batches.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="text-xs uppercase bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Batch ID</th>
                  <th className="py-2.5 px-3">File Name</th>
                  <th className="py-2.5 px-3">Total Rows</th>
                  <th className="py-2.5 px-3">Parsed</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {summary.recent_batches.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-3 font-mono text-xs text-slate-700 dark:text-slate-300">{b.batch_id}</td>
                    <td className="py-3 px-3 font-medium text-slate-800 dark:text-slate-100">{b.filename}</td>
                    <td className="py-3 px-3">{b.total_rows}</td>
                    <td className="py-3 px-3 text-emerald-600 dark:text-emerald-400 font-semibold">{b.parsed_rows}</td>
                    <td className="py-3 px-3">
                      <span className={`inline-block px-2 py-0.5 text-xs rounded-full font-semibold ${b.status === 'COMPLETED'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800'
                        : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950 dark:text-rose-400 dark:border-rose-800'
                        }`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-400 dark:text-slate-500">
                      {new Date(b.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-sm">
            No batch history recorded yet.
          </div>
        )}
      </div>
    </div>
  );
};
