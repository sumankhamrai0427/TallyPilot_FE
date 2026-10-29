import React, { useEffect, useState } from 'react';
import { HelpCircle, Check, X, AlertTriangle, ArrowRight, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import { BankTransaction, TallyLedger } from '../types';

export const ClarificationQueuePage: React.FC = () => {
  const [items, setItems] = useState<BankTransaction[]>([]);
  const [ledgers, setLedgers] = useState<TallyLedger[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTx, setActiveTx] = useState<BankTransaction | null>(null);

  // Form State
  const [selectedLedger, setSelectedLedger] = useState<string>('');
  const [voucherType, setVoucherType] = useState<string>('Payment');
  const [transactionType, setTransactionType] = useState<string>('supplier_payment');
  const [reviewerNotes, setReviewerNotes] = useState<string>('');
  const [skipReason, setSkipReason] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [txRes, ledgerRes] = await Promise.all([
        api.getTransactions({ status: 'NEEDS_CLARIFICATION', page_size: 50 }),
        api.getLedgers()
      ]);
      setItems(txRes.items);
      setLedgers(ledgerRes);
      if (txRes.items.length > 0) {
        selectTx(txRes.items[0]);
      } else {
        setActiveTx(null);
      }
    } catch (err) {
      console.error("Failed to load clarification queue", err);
    } finally {
      setLoading(false);
    }
  };

  const selectTx = (tx: BankTransaction) => {
    setActiveTx(tx);
    setSelectedLedger(tx.classification?.suggested_ledger || '');
    setVoucherType(tx.classification?.suggested_voucher_type || (Number(tx.debit_amount) > 0 ? 'Payment' : 'Receipt'));
    setTransactionType(tx.classification?.transaction_type || 'supplier_payment');
    setReviewerNotes('');
    setSkipReason('');
    setStatusMessage(null);
  };

  const handleSubmitCorrection = async () => {
    if (!activeTx || !selectedLedger) {
      setStatusMessage({ text: "Please select a valid Tally ledger from the list.", isError: true });
      return;
    }
    try {
      setActionLoading(true);
      await api.clarifyTransaction(activeTx.id, {
        selected_ledger: selectedLedger,
        corrected_voucher_type: voucherType,
        corrected_transaction_type: transactionType,
        reviewer_notes: reviewerNotes
      });
      setStatusMessage({ text: `Transaction #${activeTx.id} clarified and moved to Approval Queue!` });
      loadData();
    } catch (err: any) {
      setStatusMessage({ text: err.response?.data?.detail || err.message || "Failed to clarify", isError: true });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSkip = async () => {
    if (!activeTx || !skipReason) {
      setStatusMessage({ text: "Please provide a reason for skipping this transaction.", isError: true });
      return;
    }
    try {
      setActionLoading(true);
      await api.skipTransaction(activeTx.id, skipReason);
      setStatusMessage({ text: `Transaction #${activeTx.id} skipped.` });
      loadData();
    } catch (err: any) {
      setStatusMessage({ text: err.response?.data?.detail || err.message || "Failed to skip", isError: true });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Clarification Queue</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Resolve ambiguous transaction descriptions and verify ledger assignments.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="p-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {items.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-xl border border-slate-200 dark:border-slate-800 text-center shadow-xs transition-colors">
          <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/60 rounded-full flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400 mb-3">
            <Check className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-white">Clarification Queue is Empty!</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            All bank transactions have been categorized or validated.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Queue List */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col h-[600px] transition-colors">
            <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <span>Ambiguous Transactions ({items.length})</span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 overflow-y-auto flex-1">
              {items.map((tx) => {
                const isSelected = activeTx?.id === tx.id;
                const debit = Number(tx.debit_amount);
                const credit = Number(tx.credit_amount);
                return (
                  <div
                    key={tx.id}
                    onClick={() => selectTx(tx)}
                    className={`p-3.5 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-50/80 dark:bg-blue-950/40 border-l-4 border-blue-600'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{tx.transaction_date}</span>
                      <span className={`font-mono font-bold ${debit > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {debit > 0 ? `-₹${debit.toFixed(2)}` : `+₹${credit.toFixed(2)}`}
                      </span>
                    </div>
                    <div className="text-sm font-medium text-slate-800 dark:text-slate-100 line-clamp-2">
                      {tx.narration}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-1 rounded">
                      <span className="truncate max-w-[220px]">
                        {tx.classification?.ambiguity_reason || "Requires human confirmation"}
                      </span>
                      <span className="font-bold">{((tx.classification?.confidence || 0) * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Resolution Panel */}
          {activeTx && (
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs p-6 flex flex-col justify-between transition-colors">
              <div className="space-y-5">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                      Transaction #{activeTx.id}
                    </span>
                    <h3 className="text-base font-bold text-slate-800 dark:text-white mt-0.5">
                      Human Clarification & Mapping
                    </h3>
                  </div>
                  <span className="px-2.5 py-1 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 rounded-full text-xs font-semibold">
                    Needs Review
                  </span>
                </div>

                {/* Details Card */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-100 dark:border-slate-800 text-sm space-y-2">
                  <div>
                    <span className="text-xs text-slate-400 dark:text-slate-400 block">Bank Description / Narration:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-100">{activeTx.narration}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                    <div>
                      <span className="text-slate-400 dark:text-slate-400 block">Amount:</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-100 text-sm">
                        ₹{Number(activeTx.debit_amount) > 0 ? activeTx.debit_amount : activeTx.credit_amount}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 dark:text-slate-400 block">Direction:</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {Number(activeTx.debit_amount) > 0 ? 'Debit / Outflow (Payment)' : 'Credit / Inflow (Receipt)'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Mapping Rationale */}
                <div className="p-3.5 bg-blue-50/50 dark:bg-blue-950/40 rounded-lg border border-blue-100 dark:border-blue-900/40 text-xs text-blue-900 dark:text-blue-200">
                  <span className="font-bold block mb-1">Suggested Mapping Rationale:</span>
                  <p>{activeTx.classification?.explanation || "Confidence below automated posting threshold."}</p>
                </div>

                {/* Correction Form */}
                <div className="space-y-4 pt-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Target Tally Master Ledger *
                    </label>
                    <select
                      value={selectedLedger}
                      onChange={(e) => setSelectedLedger(e.target.value)}
                      className="w-full text-sm border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value="">-- Select Valid Tally Ledger --</option>
                      {ledgers.map((l) => (
                        <option key={l.id} value={l.name}>
                          {l.name} ({l.parent_group})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Voucher Type
                      </label>
                      <select
                        value={voucherType}
                        onChange={(e) => setVoucherType(e.target.value)}
                        className="w-full text-sm border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                      >
                        <option value="Payment">Payment</option>
                        <option value="Receipt">Receipt</option>
                        <option value="Contra">Contra</option>
                        <option value="Journal">Journal</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Transaction Classification
                      </label>
                      <input
                        type="text"
                        value={transactionType}
                        onChange={(e) => setTransactionType(e.target.value)}
                        className="w-full text-sm border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                        placeholder="e.g. supplier_payment"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Accountant / Reviewer Notes
                    </label>
                    <textarea
                      rows={2}
                      value={reviewerNotes}
                      onChange={(e) => setReviewerNotes(e.target.value)}
                      placeholder="Optional notes or audit explanation..."
                      className="w-full text-sm border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                {statusMessage && (
                  <div className={`p-3 rounded-lg text-xs font-semibold ${
                    statusMessage.isError
                      ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-900'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900'
                  }`}>
                    {statusMessage.text}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Reason to skip..."
                    value={skipReason}
                    onChange={(e) => setSkipReason(e.target.value)}
                    className="text-xs border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-lg px-2.5 py-1.5 w-44"
                  />
                  <button
                    onClick={handleSkip}
                    disabled={actionLoading || !skipReason}
                    className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-semibold disabled:opacity-40 cursor-pointer"
                  >
                    Skip
                  </button>
                </div>

                <button
                  onClick={handleSubmitCorrection}
                  disabled={actionLoading || !selectedLedger}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-2 shadow-xs disabled:opacity-40 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Submit & Revalidate</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
