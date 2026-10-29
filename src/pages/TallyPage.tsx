import React, { useEffect, useState } from 'react';
import { Server, RefreshCw, CheckCircle, AlertTriangle, ArrowRight, Database, Send } from 'lucide-react';
import { api } from '../services/api';
import { TallyLedger } from '../types';

export const TallyPage: React.FC = () => {
  const [health, setHealth] = useState<any>(null);
  const [ledgers, setLedgers] = useState<TallyLedger[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    loadTallyData();
  }, []);

  const loadTallyData = async () => {
    try {
      const [healthRes, ledgerRes, subRes] = await Promise.all([
        api.getTallyHealth(),
        api.getLedgers(),
        api.getSubmissions()
      ]);
      setHealth(healthRes);
      setLedgers(ledgerRes);
      setSubmissions(subRes);
    } catch (err) {
      console.error("Failed to load Tally data", err);
    }
  };

  const handleTestConnection = async () => {
    try {
      setTesting(true);
      setStatusMessage(null);
      const res = await api.testTallyConnection();
      setHealth(res);
      setStatusMessage(res.message);
    } catch (err: any) {
      setStatusMessage(err.message || "Connection failed");
    } finally {
      setTesting(false);
    }
  };

  const handleSyncLedgers = async () => {
    try {
      setSyncing(true);
      setStatusMessage(null);
      const res = await api.syncLedgers();
      setLedgers(res);
      setStatusMessage(`Successfully synchronized ${res.length} ledger masters from Tally Prime.`);
    } catch (err: any) {
      setStatusMessage(err.response?.data?.detail || err.message || "Failed to sync ledgers");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Tally Prime Integration</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Configure XML-over-HTTP connection, synchronize master ledgers, and audit voucher submissions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleTestConnection}
            disabled={testing}
            className="px-4 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
            <span>Test Connection</span>
          </button>

          <button
            onClick={handleSyncLedgers}
            disabled={syncing}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Database className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>Sync Ledgers</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 text-blue-900 dark:text-blue-200 text-sm font-medium">
          {statusMessage}
        </div>
      )}

      {/* Connection Specs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
          <div className="text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">
            Connection State
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${health?.success ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            <span className="text-lg font-bold text-slate-800 dark:text-white">
              {health?.status === 'connected' ? 'Connected (Live)' : health?.is_mock ? 'Simulation Mode' : 'Offline'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            {health?.message || "Running Tally Prime XML HTTP adapter."}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
          <div className="text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">
            Target Company
          </div>
          <div className="mt-2 text-lg font-bold text-slate-800 dark:text-white">
            {health?.company || "Demo Company"}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Configured in <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">TALLY_COMPANY</code>
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs transition-colors">
          <div className="text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider">
            Endpoint URL
          </div>
          <div className="mt-2 text-lg font-bold text-slate-800 dark:text-white font-mono">
            {health?.endpoint || "http://localhost:9000"}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
            Standard Tally XML HTTP server interface
          </p>
        </div>
      </div>

      {/* Synchronized Ledgers & Submissions Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Ledgers Master Cache */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col h-[500px] transition-colors">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 dark:text-white text-sm">Synchronized Ledgers ({ledgers.length})</h3>
            <span className="text-xs text-slate-400 dark:text-slate-500">Master Cache</span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 overflow-y-auto flex-1">
            {ledgers.map((l) => (
              <div key={l.id} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center justify-between text-xs transition-colors">
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">{l.name}</span>
                  <span className="text-slate-400 dark:text-slate-500">{l.parent_group}</span>
                </div>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 rounded text-[11px] font-semibold">
                  Active
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Voucher Submissions Audit */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col h-[500px] transition-colors">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 dark:text-white text-sm">Voucher Submissions & Idempotency Log</h3>
            <span className="text-xs text-slate-400 dark:text-slate-500">Durable Records</span>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800 uppercase">
                <tr>
                  <th className="py-2.5 px-3">Tx ID</th>
                  <th className="py-2.5 px-3">Voucher</th>
                  <th className="py-2.5 px-3">GUID / Reference</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {submissions.length > 0 ? (
                  submissions.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-700 dark:text-slate-300">#{s.transaction_id}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">{s.voucher_type}</td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-400 truncate max-w-[150px]">
                        {s.tally_voucher_guid || s.payload_hash.slice(0, 10)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          s.status === 'SUCCESS'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 dark:text-slate-500">
                        {new Date(s.submitted_at).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs">
                      No vouchers posted to Tally Prime yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
