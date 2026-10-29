import React, { useEffect, useState } from 'react';
import { Download, RefreshCw, Filter, FileText, User, Shield } from 'lucide-react';
import { api } from '../services/api';
import { AuditLog } from '../types';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadLogs();
  }, [page, actionFilter]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const res = await api.getAuditLogs({
        action: actionFilter || undefined,
        page,
        page_size: 50
      });
      setLogs(res.items);
      setTotal(res.total);
    } catch (err) {
      console.error("Failed to load audit logs", err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    window.open('/api/logs/export-csv', '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Audit Trail & Compliance Logs</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Tamper-evident log of all system and human actions, status transitions, and integration responses.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export to CSV</span>
          </button>

          <button
            onClick={loadLogs}
            disabled={loading}
            className="p-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3 transition-colors">
        <Filter className="w-4 h-4 text-slate-400 dark:text-slate-500" />
        <select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(1);
          }}
          className="text-xs border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-pointer"
        >
          <option value="">All Actions</option>
          <option value="BATCH_PROCESSED">Batch Processed</option>
          <option value="TRANSACTION_CLARIFIED">Transaction Clarified</option>
          <option value="TALLY_VOUCHER_POSTED">Tally Voucher Posted</option>
          <option value="TRANSACTION_SKIPPED">Transaction Skipped</option>
          <option value="TALLY_POSTING_FAILED">Tally Posting Failed</option>
          <option value="TALLY_LEDGERS_SYNCED">Tally Ledgers Synced</option>
        </select>
        <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto">Total entries: {total}</span>
      </div>

      {/* Log Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800 uppercase">
              <tr>
                <th className="py-3 px-3">Timestamp</th>
                <th className="py-3 px-3">Actor</th>
                <th className="py-3 px-3">Action</th>
                <th className="py-3 px-3">Tx ID</th>
                <th className="py-3 px-3">Status Change</th>
                <th className="py-3 px-3">Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-3 whitespace-nowrap text-slate-500 dark:text-slate-400 font-mono">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-700 dark:text-slate-200">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                        <span>{log.actor}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-100">{log.action}</td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-700 dark:text-slate-300">
                      {log.transaction_id ? `#${log.transaction_id}` : '-'}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      {log.previous_status && log.new_status ? (
                        <div className="flex items-center gap-1 font-mono text-[11px]">
                          <span className="text-slate-400 dark:text-slate-500">{log.previous_status}</span>
                          <span>&rarr;</span>
                          <span className="font-bold text-blue-600 dark:text-blue-400">{log.new_status}</span>
                        </div>
                      ) : (
                        <span className="text-slate-300 dark:text-slate-600">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 max-w-md text-slate-800 dark:text-slate-200">
                      {log.summary}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs">
                    {loading ? "Loading audit logs..." : "No logs available."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
