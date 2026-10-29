import React, { useEffect, useState } from 'react';
import { CheckCircle2, ShieldCheck, RefreshCw, Send, AlertCircle, FileCheck } from 'lucide-react';
import { api } from '../services/api';
import { BankTransaction } from '../types';

export const ApprovalQueuePage: React.FC = () => {
  const [items, setItems] = useState<BankTransaction[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [postingId, setPostingId] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  useEffect(() => {
    loadQueue();
  }, []);

  const loadQueue = async () => {
    try {
      setLoading(true);
      const res = await api.getTransactions({ status: 'PENDING_APPROVAL', page_size: 50 });
      setItems(res.items);
      setSelectedIds([]);
    } catch (err) {
      console.error("Failed to load approval queue", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(items.map(t => t.id));
    } else {
      setSelectedIds([]);
    }
  };

  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleApproveSingle = async (txId: number) => {
    try {
      setPostingId(txId);
      setStatusMessage(null);
      const res = await api.approveTransaction(txId);
      if (res.success) {
        setStatusMessage({ text: `Transaction #${txId} posted to Tally Prime successfully! (Voucher ID: ${res.guid})` });
        loadQueue();
      } else {
        setStatusMessage({ text: `Posting failed: ${res.error}`, isError: true });
      }
    } catch (err: any) {
      setStatusMessage({ text: err.response?.data?.detail || err.message || "Approval failed", isError: true });
    } finally {
      setPostingId(null);
    }
  };

  const handleBatchApprove = async () => {
    if (selectedIds.length === 0) return;
    try {
      setLoading(true);
      setStatusMessage(null);
      const res = await api.batchApprove(selectedIds);
      const successCount = res.results.filter(r => r.success).length;
      setStatusMessage({ text: `Batch Complete: ${successCount} of ${selectedIds.length} vouchers posted to Tally Prime!` });
      loadQueue();
    } catch (err: any) {
      setStatusMessage({ text: err.response?.data?.detail || err.message || "Batch approval failed", isError: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Voucher Authorization Queue</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Review double-entry accounting balanced vouchers before authorizing posting to Tally Prime.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {selectedIds.length > 0 && (
            <button
              onClick={handleBatchApprove}
              disabled={loading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Authorize & Post Selected ({selectedIds.length})</span>
            </button>
          )}

          <button
            onClick={loadQueue}
            disabled={loading}
            className="p-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className={`p-4 rounded-xl text-sm font-semibold flex items-center gap-2 ${
          statusMessage.isError
            ? 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-900'
            : 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900'
        }`}>
          {statusMessage.isError ? <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" /> : <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {items.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-xl border border-slate-200 dark:border-slate-800 text-center shadow-xs transition-colors">
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/60 rounded-full flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400 mb-3">
            <FileCheck className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-white">No Vouchers Awaiting Approval</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            All validated transactions have been authorized or posted.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300 transition-colors">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedIds.length === items.length && items.length > 0}
                onChange={handleSelectAll}
                className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
              />
              <span>Select All Vouchers ({items.length})</span>
            </label>
            <span className="text-slate-400 dark:text-slate-500 font-normal">Deterministic validation confirmed balanced debits and credits</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map((tx) => {
              const debit = Number(tx.debit_amount);
              const credit = Number(tx.credit_amount);
              const amount = debit > 0 ? debit : credit;
              const isSelected = selectedIds.includes(tx.id);

              const targetLedger = tx.reviews && tx.reviews.length > 0
                ? tx.reviews[tx.reviews.length - 1].selected_ledger
                : tx.classification?.suggested_ledger || "Expense / Party Account";

              const voucherType = tx.reviews && tx.reviews.length > 0
                ? tx.reviews[tx.reviews.length - 1].corrected_voucher_type
                : tx.classification?.suggested_voucher_type || (debit > 0 ? "Payment" : "Receipt");

              const contraLedger = "HDFC Bank";
              const isDebit = debit > 0;

              return (
                <div
                  key={tx.id}
                  className={`bg-white dark:bg-slate-900 rounded-xl border p-5 shadow-xs transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'border-blue-500 ring-2 ring-blue-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div>
                    {/* Top Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(tx.id)}
                          className="rounded border-slate-300 dark:border-slate-700 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">#{tx.id} • {tx.transaction_date}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                        {voucherType} Voucher
                      </span>
                    </div>

                    {/* Narration */}
                    <div className="py-3">
                      <div className="text-xs text-slate-400 dark:text-slate-500 font-medium">Bank Narration</div>
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 line-clamp-2 mt-0.5">
                        {tx.narration}
                      </div>
                    </div>

                    {/* Proposed Double-Entry Accounting Ledger Breakdown */}
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                      <div className="flex justify-between items-center text-slate-500 dark:text-slate-400 pb-1 border-b border-slate-200/60 dark:border-slate-700/60 font-semibold">
                        <span>Ledger Accounts</span>
                        <div className="flex gap-8">
                          <span>Dr (₹)</span>
                          <span>Cr (₹)</span>
                        </div>
                      </div>

                      {/* Line 1: Primary Target Ledger */}
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                          {targetLedger}
                        </span>
                        <div className="flex gap-8 font-mono">
                          <span className={isDebit ? "text-rose-600 dark:text-rose-400 font-bold" : "text-slate-300 dark:text-slate-600"}>
                            {isDebit ? amount.toFixed(2) : "-"}
                          </span>
                          <span className={!isDebit ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-slate-300 dark:text-slate-600"}>
                            {!isDebit ? amount.toFixed(2) : "-"}
                          </span>
                        </div>
                      </div>

                      {/* Line 2: Contra Bank Ledger */}
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                          {contraLedger}
                        </span>
                        <div className="flex gap-8 font-mono">
                          <span className={!isDebit ? "text-rose-600 dark:text-rose-400 font-bold" : "text-slate-300 dark:text-slate-600"}>
                            {!isDebit ? amount.toFixed(2) : "-"}
                          </span>
                          <span className={isDebit ? "text-emerald-600 dark:text-emerald-400 font-bold" : "text-slate-300 dark:text-slate-600"}>
                            {isDebit ? amount.toFixed(2) : "-"}
                          </span>
                        </div>
                      </div>

                      {/* Balanced Total */}
                      <div className="pt-1 border-t border-slate-200/60 dark:border-slate-700/60 flex justify-between font-bold text-slate-700 dark:text-slate-200">
                        <span>Total (Balanced)</span>
                        <div className="flex gap-8 font-mono">
                          <span>₹{amount.toFixed(2)}</span>
                          <span>₹{amount.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 dark:text-slate-500">
                      {tx.reviews?.length ? "Clarified by Accountant" : "Auto-categorized by System"}
                    </span>
                    <button
                      onClick={() => handleApproveSingle(tx.id)}
                      disabled={postingId === tx.id}
                      className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{postingId === tx.id ? "Posting..." : "Post to Tally"}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
