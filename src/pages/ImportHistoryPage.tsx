import React, { useEffect, useState } from 'react';
import { History, RefreshCw, FileSpreadsheet, CheckCircle, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';
import { ImportBatch } from '../types';

export const ImportHistoryPage: React.FC = () => {
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadBatches();
  }, []);

  const loadBatches = async () => {
    try {
      setLoading(true);
      const res = await api.getBatches();
      setBatches(res);
    } catch (err) {
      console.error("Failed to load batches", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Import Batch History</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Audit history of all imported Excel bank statement files.
          </p>
        </div>
        <button
          onClick={loadBatches}
          disabled={loading}
          className="p-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="text-xs uppercase bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Batch ID</th>
                <th className="py-3 px-4">Filename</th>
                <th className="py-3 px-4">Size</th>
                <th className="py-3 px-4">Total Rows</th>
                <th className="py-3 px-4">Parsed</th>
                <th className="py-3 px-4">Failed</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Imported At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {batches.length > 0 ? (
                batches.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono text-xs font-bold text-slate-700 dark:text-slate-300">{b.batch_id}</td>
                    <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-100">{b.filename}</td>
                    <td className="py-3 px-4 text-xs text-slate-400 dark:text-slate-500">{(b.file_size_bytes / 1024).toFixed(1)} KB</td>
                    <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-200">{b.total_rows}</td>
                    <td className="py-3 px-4 font-semibold text-emerald-600 dark:text-emerald-400">{b.parsed_rows}</td>
                    <td className="py-3 px-4 font-semibold text-rose-600 dark:text-rose-400">{b.failed_rows}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        b.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                      }`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-400 dark:text-slate-500">
                      {new Date(b.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 dark:text-slate-500 text-sm">
                    {loading ? "Loading batches..." : "No import history available."}
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
