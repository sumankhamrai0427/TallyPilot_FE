import React, { useEffect, useState } from 'react';
import { Search, Filter, RefreshCw, CheckCircle, HelpCircle, AlertCircle, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { api } from '../services/api';
import { BankTransaction } from '../types';

export const TransactionsPage: React.FC = () => {
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTransactions();
  }, [page, statusFilter]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const res = await api.getTransactions({
        status: statusFilter || undefined,
        search: search || undefined,
        page,
        page_size: 25
      });
      setTransactions(res.items);
      setTotal(res.total);
    } catch (err) {
      console.error("Failed to load transactions", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadTransactions();
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'PROCESSED':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">Processed</span>;
      case 'NEEDS_CLARIFICATION':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">Needs Review</span>;
      case 'PENDING_APPROVAL':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">Pending Approval</span>;
      case 'SUBMITTING':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">Submitting</span>;
      case 'FAILED':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">Failed</span>;
      case 'SKIPPED':
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">Skipped</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">{status}</span>;
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Transaction Processing</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            View, audit and manage normalized bank transactions and AI suggestions.
          </p>
        </div>

        <button
          onClick={loadTransactions}
          disabled={loading}
          className="p-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between transition-colors">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by narration or reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder-slate-400 dark:placeholder-slate-500"
          />
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="NEEDS_CLARIFICATION">Needs Review</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="PROCESSED">Processed</option>
            <option value="FAILED">Failed</option>
            <option value="SKIPPED">Skipped</option>
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="text-xs uppercase bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Narration & Ref</th>
                <th className="py-3 px-3 text-right">Debit (₹)</th>
                <th className="py-3 px-3 text-right">Credit (₹)</th>
                <th className="py-3 px-3">Suggested Ledger</th>
                <th className="py-3 px-3">Confidence</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {transactions.length > 0 ? (
                transactions.map((t) => {
                  const debit = Number(t.debit_amount);
                  const credit = Number(t.credit_amount);
                  const confidence = t.classification?.confidence ? (Number(t.classification.confidence) * 100).toFixed(0) : null;

                  return (
                    <tr key={t.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50">
                      <td className="py-3 px-3 whitespace-nowrap text-xs font-medium text-slate-700 dark:text-slate-300">
                        {t.transaction_date}
                      </td>
                      <td className="py-3 px-3 max-w-xs">
                        <div className="font-medium text-slate-800 dark:text-slate-100 line-clamp-2">{t.narration}</div>
                        {t.bank_reference && (
                          <div className="text-[11px] font-mono text-slate-400 dark:text-slate-500 mt-0.5">Ref: {t.bank_reference}</div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-rose-600 dark:text-rose-400 font-medium whitespace-nowrap">
                        {debit > 0 ? debit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-emerald-600 dark:text-emerald-400 font-medium whitespace-nowrap">
                        {credit > 0 ? credit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-medium text-slate-800 dark:text-slate-200 text-xs">
                          {t.classification?.suggested_ledger || <span className="text-amber-600 dark:text-amber-400 italic">Unassigned</span>}
                        </div>
                        <div className="text-[11px] text-slate-400 dark:text-slate-500">
                          {t.classification?.suggested_voucher_type || 'Payment'}
                        </div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {confidence ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                            Number(confidence) >= 80 
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' 
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                          }`}>
                            {confidence}%
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">--</span>
                        )}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {statusBadge(t.status)}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        {t.status === 'NEEDS_CLARIFICATION' && (
                          <a
                            href="/clarification"
                            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded text-xs font-semibold shadow-xs"
                          >
                            Clarify
                          </a>
                        )}
                        {t.status === 'PENDING_APPROVAL' && (
                          <a
                            href="/approvals"
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold shadow-xs"
                          >
                            Approve
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 dark:text-slate-500 text-sm">
                    {loading ? "Loading transactions..." : "No transactions found matching criteria."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Showing {transactions.length} of {total} transactions</span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-2.5 py-1 border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
            >
              Previous
            </button>
            <span className="px-2.5 py-1 font-semibold text-slate-700 dark:text-slate-300">Page {page}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={transactions.length < 25}
              className="px-2.5 py-1 border border-slate-200 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
