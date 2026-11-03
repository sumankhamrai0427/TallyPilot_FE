import React, { useState, useEffect } from 'react';
import {
  Scale, CheckCircle2, AlertCircle, RefreshCw,
  ArrowRight, Link2, Sparkles, Building, Landmark,
  Check, ArrowUpRight, ArrowDownLeft, Clock, Copy,
  Calendar, Layers, Filter, CheckCheck, Loader2
} from 'lucide-react';
import { api } from '../services/api';
import {
  ReconciliationSummary, ReconMatchedItem, ReconUnmatchedBankItem,
  ReconUnmatchedBookItem, ReconDuplicateItem, ReconDateDiffItem
} from '../types';

export const ReconciliationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'matched' | 'unmatched_bank' | 'unmatched_books' | 'duplicates' | 'date_differences' | 'studio'>('matched');
  const [summary, setSummary] = useState<ReconciliationSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [autoReconciling, setAutoReconciling] = useState<boolean>(false);
  const [generatingTxId, setGeneratingTxId] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Tab Data States
  const [matchedItems, setMatchedItems] = useState<ReconMatchedItem[]>([]);
  const [unmatchedBankItems, setUnmatchedBankItems] = useState<ReconUnmatchedBankItem[]>([]);
  const [unmatchedBookItems, setUnmatchedBookItems] = useState<ReconUnmatchedBookItem[]>([]);
  const [duplicateItems, setDuplicateItems] = useState<ReconDuplicateItem[]>([]);
  const [dateDiffItems, setDateDiffItems] = useState<ReconDateDiffItem[]>([]);

  // Manual Studio State
  const [unmatchedData, setUnmatchedData] = useState<{ bank_transactions: any[]; voucher_lines: any[] }>({
    bank_transactions: [],
    voucher_lines: []
  });
  const [selectedTxId, setSelectedTxId] = useState<number | null>(null);
  const [selectedLineId, setSelectedLineId] = useState<number | null>(null);
  const [matchingInProgress, setMatchingInProgress] = useState<boolean>(false);

  const loadReconData = async () => {
    setLoading(true);
    try {
      const sum = await api.getReconSummary();
      setSummary(sum);

      if (activeTab === 'matched') {
        const res = await api.getReconViews('matched');
        setMatchedItems(res.items);
      } else if (activeTab === 'unmatched_bank') {
        const res = await api.getReconViews('unmatched_bank');
        setUnmatchedBankItems(res.items);
      } else if (activeTab === 'unmatched_books') {
        const res = await api.getReconViews('unmatched_books');
        setUnmatchedBookItems(res.items);
      } else if (activeTab === 'duplicates') {
        const res = await api.getReconViews('duplicates');
        setDuplicateItems(res.items);
      } else if (activeTab === 'date_differences') {
        const res = await api.getReconViews('date_differences');
        setDateDiffItems(res.items);
      } else if (activeTab === 'studio') {
        const unmatched = await api.getReconUnmatched();
        setUnmatchedData(unmatched);
      }
    } catch (err) {
      console.error('Failed to load bank reconciliation:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReconData();

    const handleFocus = () => {
      loadReconData();
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [activeTab]);

  const handleRunAutoReconcile = async () => {
    setAutoReconciling(true);
    try {
      const res = await api.runAutoReconciliation();
      setSuccessMessage(res.message);
      setTimeout(() => setSuccessMessage(''), 5000);
      loadReconData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to run auto-reconciliation');
    } finally {
      setAutoReconciling(false);
    }
  };

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
    setGeneratingTxId(txId);
    try {
      const res = await api.generateVoucherFromTx(txId);
      setSuccessMessage(res.message);
      setTimeout(() => setSuccessMessage(''), 4000);
      await loadReconData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to generate voucher');
    } finally {
      setGeneratingTxId(null);
    }
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }).replace(/ /g, '-');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Scale className="w-6 h-6 text-blue-600" />
            Bank Statement Reconciliation (BRS)
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time reconciliation between bank statement feeds and General Ledger books (HLA Section 11).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRunAutoReconcile}
            disabled={autoReconciling}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-all shadow-sm shadow-emerald-500/20 cursor-pointer"
          >
            {autoReconciling ? 'Reconciling...' : 'Auto-Reconcile with Books'}
          </button>

          <button
            onClick={loadReconData}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-semibold transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
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
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Unreconciled Bank Items</div>
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
            General Ledger Bank Account Book Balances
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
          <Check className="w-4 h-4 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* 6 Structured HLA Part 11 Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('matched')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${activeTab === 'matched'
            ? 'border-blue-600 text-blue-600 dark:text-blue-400'
            : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
        >
          <CheckCheck className="w-4 h-4 text-emerald-600" />
          Matched Transactions
        </button>
        <button
          onClick={() => setActiveTab('unmatched_bank')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${activeTab === 'unmatched_bank'
            ? 'border-blue-600 text-blue-600 dark:text-blue-400'
            : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
        >
          <Landmark className="w-4 h-4 text-amber-500" />
          Unmatched Bank Entries
        </button>
        <button
          onClick={() => setActiveTab('unmatched_books')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${activeTab === 'unmatched_books'
            ? 'border-blue-600 text-blue-600 dark:text-blue-400'
            : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
        >
          <Clock className="w-4 h-4 text-purple-600" />
          Unmatched Books (Unpresented)
        </button>
        <button
          onClick={() => setActiveTab('duplicates')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${activeTab === 'duplicates'
            ? 'border-blue-600 text-blue-600 dark:text-blue-400'
            : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
        >
          <Copy className="w-4 h-4 text-rose-500" />
          Duplicate Transactions
        </button>
        <button
          onClick={() => setActiveTab('date_differences')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${activeTab === 'date_differences'
            ? 'border-blue-600 text-blue-600 dark:text-blue-400'
            : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
        >
          <Calendar className="w-4 h-4 text-indigo-500" />
          Date Differences (Lag)
        </button>
        <button
          onClick={() => setActiveTab('studio')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${activeTab === 'studio'
            ? 'border-blue-600 text-blue-600 dark:text-blue-400'
            : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
        >
          <Layers className="w-4 h-4 text-slate-600" />
          Manual Matching Studio
        </button>
      </div>

      {/* Main Tab Body */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">

        {/* ======================================================== */}
        {/* TAB 1: MATCHED TRANSACTIONS */}
        {/* ======================================================== */}
        {activeTab === 'matched' && (
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Bank Date</th>
                    <th className="px-4 py-3">Clearance Date</th>
                    <th className="px-4 py-3">Bank Reference</th>
                    <th className="px-4 py-3">Narration</th>
                    <th className="px-4 py-3 text-right">Amount (₹)</th>
                    <th className="px-4 py-3">Matched Voucher #</th>
                    <th className="px-4 py-3">Voucher Date</th>
                    <th className="px-4 py-3 text-center">Recon Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {loading ? (
                    <tr><td colSpan={8} className="p-8 text-center text-slate-400 font-sans">Loading matched transactions...</td></tr>
                  ) : matchedItems.length === 0 ? (
                    <tr><td colSpan={8} className="p-8 text-center text-slate-400 font-sans">No matched transactions yet. Click "Auto-Reconcile with Books" or use the Manual Matching Studio.</td></tr>
                  ) : (
                    matchedItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-2.5 font-sans font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {formatDate(item.date)}
                        </td>
                        <td className="px-4 py-2.5 font-sans text-slate-500 whitespace-nowrap">
                          {formatDate(item.clearance_date)}
                        </td>
                        <td className="px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {item.bank_reference || '—'}
                        </td>
                        <td className="px-4 py-2.5 font-sans text-slate-600 dark:text-slate-300 max-w-[220px] truncate" title={item.narration}>
                          {item.narration}
                        </td>
                        <td className="px-4 py-2.5 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-2.5 font-sans font-bold text-blue-600 whitespace-nowrap">
                          {item.voucher_number}
                        </td>
                        <td className="px-4 py-2.5 font-sans text-slate-500 whitespace-nowrap">
                          {formatDate(item.voucher_date)}
                        </td>
                        <td className="px-4 py-2.5 text-center font-sans">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            RECONCILED
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: UNMATCHED BANK ENTRIES */}
        {/* ======================================================== */}
        {activeTab === 'unmatched_bank' && (
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Bank Reference</th>
                    <th className="px-4 py-3">Narration</th>
                    <th className="px-4 py-3 text-right">Amount (₹)</th>
                    <th className="px-4 py-3">Suggested Ledger</th>
                    <th className="px-4 py-3">Suggested Type</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {loading ? (
                    <tr><td colSpan={7} className="p-8 text-center text-slate-400 font-sans">Loading unmatched bank entries...</td></tr>
                  ) : unmatchedBankItems.length === 0 ? (
                    <tr><td colSpan={7} className="p-8 text-center text-slate-400 font-sans">All bank entries are accounted for!</td></tr>
                  ) : (
                    unmatchedBankItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-2.5 font-sans font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {formatDate(item.date)}
                        </td>
                        <td className="px-4 py-2.5 font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {item.bank_reference || '—'}
                        </td>
                        <td className="px-4 py-2.5 font-sans text-slate-600 dark:text-slate-300 max-w-[260px] truncate" title={item.narration}>
                          {item.narration}
                        </td>
                        <td className={`px-4 py-2.5 text-right font-bold whitespace-nowrap ${item.transaction_type === 'CREDIT' ? 'text-emerald-600' : 'text-blue-600'
                          }`}>
                          ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-2.5 font-sans font-semibold text-slate-800 dark:text-slate-200">
                          {item.suggested_ledger || 'Unassigned'}
                        </td>
                        <td className="px-4 py-2.5 font-sans">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {item.suggested_voucher_type}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-sans whitespace-nowrap">
                          <button
                            onClick={() => handleAutoGenerateVoucher(item.id)}
                            disabled={generatingTxId !== null}
                            className="px-2.5 py-1 text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white rounded transition-colors cursor-pointer flex items-center gap-1.5 ml-auto shadow-xs"
                          >
                            {generatingTxId === item.id ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Generating...</span>
                              </>
                            ) : (
                              <>
                                <span>Generate Voucher</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: UNMATCHED BOOKS (UNPRESENTED CHEQUES) */}
        {/* ======================================================== */}
        {activeTab === 'unmatched_books' && (
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Voucher #</th>
                    <th className="px-4 py-3">Voucher Date</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Bank Ledger</th>
                    <th className="px-4 py-3 text-right">Amount (₹)</th>
                    <th className="px-4 py-3">Nature</th>
                    <th className="px-4 py-3">Narration</th>
                    <th className="px-4 py-3 text-center">Clearing Age</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {loading ? (
                    <tr><td colSpan={8} className="p-8 text-center text-slate-400 font-sans">Loading unmatched book vouchers...</td></tr>
                  ) : unmatchedBookItems.length === 0 ? (
                    <tr><td colSpan={8} className="p-8 text-center text-slate-400 font-sans">No open book vouchers pending clearance.</td></tr>
                  ) : (
                    unmatchedBookItems.map((item) => (
                      <tr key={item.voucher_line_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-2.5 font-bold text-blue-600 whitespace-nowrap">
                          {item.voucher_number}
                        </td>
                        <td className="px-4 py-2.5 font-sans font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {formatDate(item.voucher_date)}
                        </td>
                        <td className="px-4 py-2.5 font-sans">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {item.voucher_type}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-sans font-semibold text-slate-800 dark:text-slate-200">
                          {item.ledger_name}
                        </td>
                        <td className="px-4 py-2.5 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-2.5 font-sans text-xs">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${item.nature.includes('Payment') ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                            {item.nature}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-sans text-slate-600 dark:text-slate-300 max-w-[220px] truncate" title={item.narration}>
                          {item.narration}
                        </td>
                        <td className="px-4 py-2.5 text-center font-sans">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            {item.age_days} days open
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: DUPLICATE TRANSACTIONS */}
        {/* ======================================================== */}
        {activeTab === 'duplicates' && (
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Bank Reference</th>
                    <th className="px-4 py-3">Narration</th>
                    <th className="px-4 py-3 text-right">Amount (₹)</th>
                    <th className="px-4 py-3">Flag Reason</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {loading ? (
                    <tr><td colSpan={6} className="p-8 text-center text-slate-400 font-sans">Loading duplicate check...</td></tr>
                  ) : duplicateItems.length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center text-slate-400 font-sans">No duplicate transactions detected. Clean statement feed!</td></tr>
                  ) : (
                    duplicateItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-2.5 font-sans font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {formatDate(item.date)}
                        </td>
                        <td className="px-4 py-2.5 font-semibold text-rose-600 whitespace-nowrap">
                          {item.bank_reference || '—'}
                        </td>
                        <td className="px-4 py-2.5 font-sans text-slate-600 dark:text-slate-300 max-w-[260px] truncate" title={item.narration}>
                          {item.narration}
                        </td>
                        <td className="px-4 py-2.5 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-2.5 font-sans text-rose-600 font-medium">
                          {item.flag_reason}
                        </td>
                        <td className="px-4 py-2.5 text-center font-sans">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            DUPLICATE
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 5: DATE DIFFERENCES (CLEARING LAG) */}
        {/* ======================================================== */}
        {activeTab === 'date_differences' && (
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/80 font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Voucher #</th>
                    <th className="px-4 py-3">Voucher Date</th>
                    <th className="px-4 py-3">Bank Clearance Date</th>
                    <th className="px-4 py-3 text-right">Amount (₹)</th>
                    <th className="px-4 py-3">Narration</th>
                    <th className="px-4 py-3 text-center">Clearing Variance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {loading ? (
                    <tr><td colSpan={6} className="p-8 text-center text-slate-400 font-sans">Loading date differences...</td></tr>
                  ) : dateDiffItems.length === 0 ? (
                    <tr><td colSpan={6} className="p-8 text-center text-slate-400 font-sans">No clearing date differences found. All items cleared on entry date!</td></tr>
                  ) : (
                    dateDiffItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-2.5 font-bold text-blue-600 whitespace-nowrap">
                          {item.voucher_number}
                        </td>
                        <td className="px-4 py-2.5 font-sans font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {formatDate(item.voucher_date)}
                        </td>
                        <td className="px-4 py-2.5 font-sans font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                          {formatDate(item.clearance_date)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-2.5 font-sans text-slate-600 dark:text-slate-300 max-w-[260px] truncate" title={item.narration}>
                          {item.narration}
                        </td>
                        <td className="px-4 py-2.5 text-center font-sans whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${Math.abs(item.lag_days) > 3 ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-slate-100 text-slate-700'
                            }`}>
                            {item.lag_description}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 6: MANUAL MATCHING STUDIO */}
        {/* ======================================================== */}
        {activeTab === 'studio' && (
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Unreconciled Bank Transactions */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs flex flex-col">
                <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-blue-600" />
                    Unreconciled Bank Statement Feed ({unmatchedData.bank_transactions.length})
                  </div>
                  <span className="text-xs text-slate-400">Click to Select</span>
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
                          className={`p-4 transition-colors cursor-pointer flex items-center justify-between gap-3 ${isSelected
                            ? 'bg-blue-50/80 dark:bg-blue-950/40 border-l-4 border-blue-600'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                            }`}
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                              <span>{formatDate(tx.date)}</span>
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
                            <div className={`font-mono font-bold text-sm flex items-center gap-1 ${tx.transaction_type === 'CREDIT' ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'
                              }`}>
                              {tx.transaction_type === 'CREDIT' ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                              ₹{Number(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </div>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAutoGenerateVoucher(tx.id);
                              }}
                              className="px-2 py-0.5 text-[11px] font-semibold bg-blue-100 hover:bg-blue-200 text-blue-800 dark:bg-blue-950 dark:hover:bg-blue-900 dark:text-blue-300 rounded flex items-center gap-1 cursor-pointer transition-colors"
                            >
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
                  <span className="text-xs text-slate-400">Click to Select</span>
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
                          className={`p-4 transition-colors cursor-pointer flex items-center justify-between gap-3 ${isSelected
                            ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-l-4 border-emerald-600'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                            }`}
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                              <span>{formatDate(vl.voucher_date)}</span>
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
        )}

      </div>
    </div>
  );
};
