import React, { useState, useEffect } from 'react';
import { 
  Scale, CheckCircle2, AlertCircle, RefreshCw, 
  ArrowRight, Link2, Sparkles, Building, Landmark,
  Check, ArrowUpRight, ArrowDownLeft
} from 'lucide-react';
import { api } from '../services/api';
import { ReconciliationSummary } from '../types';

export const ReconciliationPage: React.FC = () => {
  const [summary, setSummary] = useState<ReconciliationSummary | null>(null);
  const [unmatchedData, setUnmatchedData] = useState<{ bank_transactions: any[]; voucher_lines: any[] }>({
    bank_transactions: [],
    voucher_lines: []
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedTxId, setSelectedTxId] = useState<number | null>(null);
  const [selectedLineId, setSelectedLineId] = useState<number | null>(null);
  const [matchingInProgress, setMatchingInProgress] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');

  const loadReconData = async () => {
    setLoading(true);
    try {
      const [sum, unmatched] = await Promise.all([
        api.getReconSummary(),
        api.getReconUnmatched()
      ]);
      setSummary(sum);
      setUnmatchedData(unmatched);
    } catch (err) {
      console.error('Failed to load bank reconciliation:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReconData();
  }, []);

  const handleManualMatch = async () => {
    if (!selectedTxId || !selectedLineId) return;
    setMatchingInProgress(true);
    try {
      const res = await api.matchReconTransaction(selectedTxId, selectedLineId);
      setSuccessMessage(res.message);
      setSelectedTxId(null);
      setSelectedLineId(null);
      setTimeout(() => setSuccessMessage(''), 4000);
      loadReconData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to match items');
    } finally {
      setMatchingInProgress(false);
    }
  };

  const handleAutoGenerateVoucher = async (txId: number) => {
    try {
      const res = await api.generateVoucherFromTx(txId);
      setSuccessMessage(res.message);
      setTimeout(() => setSuccessMessage(''), 4000);
      loadReconData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to generate voucher');
    }
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Scale className="w-6 h-6 text-blue-600" />
            Bank Statement Reconciliation
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time reconciliation between bank statement feed and General Ledger book balance.
          </p>
        </div>

        <button
          onClick={loadReconData}
          className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-semibold transition-all cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Reconciled Transactions</div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {summary?.reconciled_transactions || 0}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Unreconciled Items</div>
          <div className="text-2xl font-black text-amber-500 mt-1">
            {summary?.unreconciled_transactions || 0}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Partially Matched</div>
          <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
            {summary?.partially_reconciled || 0}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Bank Accounts Monitored</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {summary?.bank_accounts?.length || 0}
          </div>
        </div>
      </div>

      {/* Bank Account Balances Comparison */}
      {summary?.bank_accounts && summary.bank_accounts.length > 0 && (
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Landmark className="w-4 h-4 text-blue-600" />
            Bank Accounts General Ledger Book Balances
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {summary.bank_accounts.map((acc) => (
              <div key={acc.ledger_id} className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm text-slate-900 dark:text-white">{acc.ledger_name}</div>
                  <div className="text-xs text-slate-400">GL Book Balance</div>
                </div>
                <div className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                  ₹{Number(acc.book_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Success Notification */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 text-sm font-semibold flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Side-by-Side Matching Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Unreconciled Bank Transactions */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs flex flex-col">
          <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Landmark className="w-4 h-4 text-blue-600" />
              Unreconciled Bank Statement Feed ({unmatchedData.bank_transactions.length})
            </div>
            <span className="text-xs text-slate-400">Click to Select for Matching</span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 overflow-y-auto max-h-[500px]">
            {unmatchedData.bank_transactions.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                All bank transactions are fully reconciled!
              </div>
            ) : (
              unmatchedData.bank_transactions.map((tx) => {
                const isSelected = selectedTxId === tx.id;
                return (
                  <div
                    key={tx.id}
                    onClick={() => setSelectedTxId(isSelected ? null : tx.id)}
                    className={`p-4 transition-colors cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-blue-50/80 dark:bg-blue-950/40 border-l-4 border-blue-600'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span>{tx.date}</span>
                        <span>•</span>
                        <span className="font-mono">{tx.bank_reference || 'No Ref'}</span>
                      </div>
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {tx.narration}
                      </div>
                      <div className="text-xs text-slate-500">
                        Classified Ledger: <span className="font-medium text-slate-700 dark:text-slate-300">{tx.suggested_ledger || 'Unassigned'}</span>
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end gap-1.5 flex-shrink-0">
                      <div className={`font-mono font-bold text-sm flex items-center gap-1 ${
                        tx.transaction_type === 'CREDIT' ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'
                      }`}>
                        {tx.transaction_type === 'CREDIT' ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                        ₹{Number(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAutoGenerateVoucher(tx.id);
                        }}
                        title="Auto-create balanced voucher for this transaction"
                        className="px-2 py-0.5 text-[11px] font-semibold bg-blue-100 hover:bg-blue-200 text-blue-800 dark:bg-blue-950 dark:hover:bg-blue-900 dark:text-blue-300 rounded flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Sparkles className="w-3 h-3" />
                        Create Voucher
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Open Voucher Lines */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs flex flex-col">
          <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Scale className="w-4 h-4 text-emerald-600" />
              Open Bank Voucher Postings ({unmatchedData.voucher_lines.length})
            </div>
            <span className="text-xs text-slate-400">Click to Select for Matching</span>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 overflow-y-auto max-h-[500px]">
            {unmatchedData.voucher_lines.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                No open bank voucher lines available.
              </div>
            ) : (
              unmatchedData.voucher_lines.map((vl) => {
                const isSelected = selectedLineId === vl.id;
                const amount = vl.debit_amount > 0 ? vl.debit_amount : vl.credit_amount;
                const isDebit = vl.debit_amount > 0;
                return (
                  <div
                    key={vl.id}
                    onClick={() => setSelectedLineId(isSelected ? null : vl.id)}
                    className={`p-4 transition-colors cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-l-4 border-emerald-600'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span>{vl.voucher_date || 'Date'}</span>
                        <span>•</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{vl.voucher_number}</span>
                        <span>•</span>
                        <span>{vl.voucher_type}</span>
                      </div>
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {vl.ledger_name}
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        {vl.narration || 'No narration'}
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 font-mono font-bold text-sm">
                      <div className={isDebit ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'}>
                        ₹{Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        <span className="text-[10px] ml-1">{isDebit ? 'DR' : 'CR'}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Floating Match Action Bar */}
      {(selectedTxId || selectedLineId) && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white px-6 py-3.5 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-6">
          <div className="flex items-center gap-3 text-sm">
            <span className={selectedTxId ? 'text-blue-400 font-semibold' : 'text-slate-400'}>
              Tx #{selectedTxId || 'None selected'}
            </span>
            <Link2 className="w-4 h-4 text-slate-500" />
            <span className={selectedLineId ? 'text-emerald-400 font-semibold' : 'text-slate-400'}>
              Voucher Line #{selectedLineId || 'None selected'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { setSelectedTxId(null); setSelectedLineId(null); }}
              className="px-3 py-1.5 text-xs text-slate-300 hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              disabled={!selectedTxId || !selectedLineId || matchingInProgress}
              onClick={handleManualMatch}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm"
            >
              {matchingInProgress ? 'Matching...' : 'Confirm Reconciliation Match'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

