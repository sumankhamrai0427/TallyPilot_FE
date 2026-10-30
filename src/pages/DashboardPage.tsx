import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileSpreadsheet,
  CheckCircle2,
  HelpCircle,
  Clock,
  AlertTriangle,
  ArrowRight,
  Server,
  SlidersHorizontal,
  ShieldCheck
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
    // Only fetch if parent has not already provided summary
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

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 dark:from-[#23201c] dark:via-[#2b2722] dark:to-[#1f1d1a] p-6 rounded-2xl text-white shadow-md border border-blue-600/30 dark:border-amber-500/10 transition-colors">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Accounting Automation Overview</h2>
          <p className="text-sm text-blue-100 dark:text-stone-300 mt-1">
            Real-time synchronization between bank statements, smart transaction categorization, and Tally Prime.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/import')}
            className="px-4 py-2 bg-white text-blue-700 hover:bg-blue-50 dark:bg-amber-500 dark:text-stone-950 dark:hover:bg-amber-400 rounded-lg text-sm font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-blue-600 dark:text-stone-950" />
            <span>Import Statement</span>
          </button>
          <button
            onClick={() => navigate('/approvals')}
            className="px-4 py-2 bg-white/15 hover:bg-white/25 dark:bg-stone-800/80 dark:hover:bg-stone-700 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer border border-white/20 dark:border-stone-700"
          >
            <span>Review Approvals</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Total */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Total Imported</span>
            <FileSpreadsheet className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
            {summary?.total_transactions || 0}
          </div>
          <div className="mt-1 text-xs text-slate-400 dark:text-slate-500">Recorded transactions</div>
        </div>

        {/* Processed */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 text-xs font-semibold uppercase tracking-wider">
            <span>Posted in Tally</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-700 dark:text-emerald-400">
            {summary?.processed_transactions || 0}
          </div>
          <div className="mt-1 text-xs text-emerald-600 dark:text-emerald-500">Vouchers created</div>
        </div>

        {/* Clarification */}
        <div
          className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs cursor-pointer hover:border-amber-400 dark:hover:border-amber-500 transition-colors"
          onClick={() => navigate('/clarification')}
        >
          <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 text-xs font-semibold uppercase tracking-wider">
            <span>Needs Review</span>
            <HelpCircle className="w-4 h-4 text-amber-500 dark:text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
            {summary?.clarification_queue_count || 0}
          </div>
          <div className="mt-1 text-xs text-amber-600 dark:text-amber-500">Ambiguous entries</div>
        </div>

        {/* Approval Queue */}
        <div
          className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-colors"
          onClick={() => navigate('/approvals')}
        >
          <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 text-xs font-semibold uppercase tracking-wider">
            <span>Pending Post</span>
            <Clock className="w-4 h-4 text-blue-500 dark:text-blue-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-blue-600 dark:text-blue-400">
            {summary?.approval_queue_count || 0}
          </div>
          <div className="mt-1 text-xs text-blue-600 dark:text-blue-400">Ready for approval</div>
        </div>

        {/* Failed */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-rose-600 dark:text-rose-400 text-xs font-semibold uppercase tracking-wider">
            <span>Failed Post</span>
            <AlertTriangle className="w-4 h-4 text-rose-500 dark:text-rose-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400">
            {summary?.failed_transactions || 0}
          </div>
          <div className="mt-1 text-xs text-rose-500 dark:text-rose-400">Requires retry</div>
        </div>

        {/* Skipped */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Skipped</span>
            <span className="text-xs font-mono text-slate-400">--</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-600 dark:text-slate-300">
            {summary?.skipped_transactions || 0}
          </div>
          <div className="mt-1 text-xs text-slate-400 dark:text-slate-500">Non-accounting items</div>
        </div>
      </div>

      {/* Main Grid: Chart & System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Distribution Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800 dark:text-white text-base">Transaction Status Distribution</h3>
              <span className="text-xs text-slate-400 dark:text-slate-500">Real-time summary</span>
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
                <span>No transactions loaded yet. Import an Excel file to get started.</span>
              </div>
            )}
          </div>
        </div>

        {/* System Status Card (Replaced technical jargon) */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between transition-colors">
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-white text-base mb-4">System Status</h3>
            <div className="space-y-4">
              {/* Categorization Engine Card */}
              <div className="p-3.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Transaction Matching</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    summary?.llm_connection_status === 'connected'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                  }`}>
                    {summary?.llm_connection_status === 'connected' ? 'Smart Mode' : 'Standard Rules'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  {summary?.llm_connection_status === 'connected'
                    ? 'Intelligent ledger matching and auto-allocation active.'
                    : 'Standard rules-based accounting ledger matching is operational.'}
                </p>
              </div>

              {/* Tally Card */}
              <div className="p-3.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850/60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Tally Integration</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                    summary?.tally_connection_status === 'connected'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}>
                    {summary?.tally_connection_status === 'connected' ? 'Connected' : 'Simulation'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  {summary?.tally_connection_status === 'connected'
                    ? 'Connected directly to Tally Prime accounting environment.'
                    : 'Voucher synchronization interface active in test mode.'}
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => navigate('/tally')}
              className="w-full text-center text-xs font-semibold text-blue-600 dark:text-amber-400 hover:text-blue-700 dark:hover:text-amber-300 py-1 cursor-pointer"
            >
              Manage Integrations &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Recent Batches Section */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800 dark:text-white text-base">Recent Import Batches</h3>
          <button onClick={() => navigate('/history')} className="text-xs font-semibold text-blue-600 dark:text-amber-400 hover:underline cursor-pointer">
            View All Batches
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
                      <span className={`inline-block px-2 py-0.5 text-xs rounded-full font-semibold ${
                        b.status === 'COMPLETED'
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
