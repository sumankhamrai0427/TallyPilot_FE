import React, { useEffect, useState, useMemo } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Edit2,
  Trash2,
  PauseCircle,
  PlayCircle,
  FileText,
  Send,
  Eye,
  Filter,
  Search,
  RefreshCw,
  X,
  Check,
  CheckCheck,
  ShieldCheck,
  FileSpreadsheet,
  Layers,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import { BankTransaction, TransactionSource, LedgerItem } from '../types';

interface VoucherReviewTableProps {
  onRegisterExport?: (exporter: () => void) => void;
}

export const VoucherReviewTable: React.FC<VoucherReviewTableProps> = ({ onRegisterExport }) => {
  const [items, setItems] = useState<BankTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [ledgers, setLedgers] = useState<LedgerItem[]>([]);

  // Action States
  const [sourceModalData, setSourceModalData] = useState<TransactionSource | null>(null);
  const [loadingSourceId, setLoadingSourceId] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<{
    id: number;
    transaction_date: string;
    suggested_voucher_type: string;
    suggested_ledger: string;
    debit_amount: number;
    credit_amount: number;
    narration: string;
  } | null>(null);

  const [rejectingItem, setRejectingItem] = useState<BankTransaction | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const res = await api.getTransactions({
        page_size: 200
      });
      setItems(res.items);
      setSelectedIds([]);
    } catch (err: any) {
      showNotification('error', err.response?.data?.detail || 'Failed to load proposed vouchers');
    } finally {
      setLoading(false);
    }
  };

  const loadLedgers = async () => {
    try {
      const data = await api.getChartLedgers();
      setLedgers(data);
    } catch (err) {
      console.error('Failed to load ledgers', err);
    }
  };

  useEffect(() => {
    loadTransactions();
    loadLedgers();
  }, []);

  // Convert any date / GMT timestamp to clean accounting DD-MMM-YYYY (IST)
  const formatAccountingDate = (dateVal: string | null | undefined): string => {
    if (!dateVal) return '-';
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (typeof dateVal === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateVal)) {
      const parts = dateVal.substring(0, 10).split('-');
      const year = parts[0];
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parts[2];
      if (monthIdx >= 0 && monthIdx < 12) {
        return `${day}-${months[monthIdx]}-${year}`;
      }
    }
    try {
      const d = new Date(dateVal);
      if (!isNaN(d.getTime())) {
        const day = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit' }).format(d);
        const month = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', month: 'short' }).format(d);
        const year = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric' }).format(d);
        return `${day}-${month}-${year}`;
      }
    } catch { }
    return String(dateVal);
  };

  // Convert date to YYYY-MM-DD for HTML <input type="date">
  const toInputDate = (dateVal: string | null | undefined): string => {
    if (!dateVal) return '';
    if (typeof dateVal === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateVal)) {
      return dateVal.substring(0, 10);
    }
    try {
      const d = new Date(dateVal);
      if (!isNaN(d.getTime())) {
        const year = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric' }).format(d);
        const month = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', month: '2-digit' }).format(d);
        const day = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit' }).format(d);
        return `${year}-${month}-${day}`;
      }
    } catch { }
    return '';
  };

  // Format INR Currency
  const formatINR = (val: string | number) => {
    const num = Number(val || 0);
    return num > 0
      ? `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : '-';
  };

  // Real-time live filtering on every keystroke and filter change
  const filteredItems = useMemo(() => {
    return items.filter((tx) => {
      // 1. Status Filter
      if (statusFilter && tx.status !== statusFilter) return false;

      // 2. Voucher Type Filter
      const voucherType = tx.classification?.suggested_voucher_type || (Number(tx.debit_amount) > 0 ? 'Payment' : 'Receipt');
      if (typeFilter && voucherType !== typeFilter) return false;

      // 3. Live Text Search across Narration, Ledger, Voucher #, Bank Ref, Cheque, Amounts, and Date
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const voucherNum = `prop-${tx.id.toString().padStart(4, '0')}`;
        const rawId = String(tx.id);
        const ledgerName = (tx.classification?.suggested_ledger || '').toLowerCase();
        const narration = (tx.narration || '').toLowerCase();
        const bankRef = (tx.bank_reference || '').toLowerCase();
        const chequeNo = (tx.cheque_number || '').toLowerCase();
        const debit = String(tx.debit_amount || '');
        const credit = String(tx.credit_amount || '');
        const dateFormatted = formatAccountingDate(tx.transaction_date).toLowerCase();
        const dateRaw = String(tx.transaction_date || '').toLowerCase();

        const matches =
          voucherNum.includes(q) ||
          rawId.includes(q) ||
          ledgerName.includes(q) ||
          narration.includes(q) ||
          bankRef.includes(q) ||
          chequeNo.includes(q) ||
          debit.includes(q) ||
          credit.includes(q) ||
          dateFormatted.includes(q) ||
          dateRaw.includes(q) ||
          voucherType.toLowerCase().includes(q);

        if (!matches) return false;
      }

      return true;
    });
  }, [items, search, statusFilter, typeFilter]);

  // Register filter-accurate CSV exporter matching UI 1:1
  useEffect(() => {
    if (onRegisterExport) {
      onRegisterExport(() => {
        const headers = [
          'Voucher #',
          'Date',
          'Type',
          'Ledger Account',
          'Debit (₹)',
          'Credit (₹)',
          'Narration',
          'Source',
          'Match',
          'Status'
        ];
        const rows = filteredItems.map(tx => {
          const vNum = `PROP-${tx.id.toString().padStart(4, '0')}`;
          const vType = (tx.classification?.suggested_voucher_type || (Number(tx.debit_amount) > 0 ? 'PAYMENT' : 'RECEIPT')).toUpperCase();
          const ledgerName = tx.classification?.suggested_ledger || (Number(tx.debit_amount) > 0 ? 'Bank Charges / Expense' : 'Suspense / Income');
          const debit = Number(tx.debit_amount || 0);
          const credit = Number(tx.credit_amount || 0);
          const match = tx.classification ? `${Math.round(Number(tx.classification.confidence) * 100)}%` : '85%';
          const statusStr = tx.status === 'PROCESSED' ? 'Posted in Tally' : tx.status === 'PENDING_APPROVAL' ? 'Pending Approval' : tx.status === 'HOLD' ? 'On Hold' : tx.status === 'REJECTED' ? 'Rejected' : 'Needs Review';

          return [
            vNum,
            `"${formatAccountingDate(tx.transaction_date)}"`,
            `"${vType}"`,
            `"${ledgerName.replace(/"/g, '""')}"`,
            debit > 0 ? `"${debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}"` : `"-"`,
            credit > 0 ? `"${credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}"` : `"-"`,
            `"${(tx.narration || '').replace(/"/g, '""')}"`,
            `"Row #${tx.source_row_index}"`,
            `"${match}"`,
            `"${statusStr}"`
          ];
        });

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Proposed_Vouchers_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      });
    }
  }, [onRegisterExport, filteredItems]);

  // Actions
  // 1. Approve & Post
  const handlePost = async (txId: number) => {
    try {
      setLoading(true);
      const res = await api.approveTransaction(txId);
      if (res.success) {
        showNotification('success', `Voucher posted to Tally Prime successfully! (ID: ${res.guid || txId})`);
        loadTransactions();
      } else {
        showNotification('error', `Posting failed: ${res.error}`);
      }
    } catch (err: any) {
      showNotification('error', err.response?.data?.detail || 'Post failed');
    } finally {
      setLoading(false);
    }
  };

  // 2. Reject
  const handleConfirmReject = async () => {
    if (!rejectingItem) return;
    try {
      setLoading(true);
      await api.rejectTransaction(rejectingItem.id, rejectReason || 'Rejected by reviewer');
      showNotification('success', `Proposed voucher #${rejectingItem.id} marked as REJECTED.`);
      setRejectingItem(null);
      setRejectReason('');
      loadTransactions();
    } catch (err: any) {
      showNotification('error', err.response?.data?.detail || 'Reject failed');
    } finally {
      setLoading(false);
    }
  };

  // 3. Hold / Unhold
  const handleToggleHold = async (tx: BankTransaction) => {
    try {
      setLoading(true);
      if (tx.status === 'HOLD') {
        await api.unholdTransaction(tx.id);
        showNotification('success', `Voucher #${tx.id} resumed to Pending Approval.`);
      } else {
        await api.holdTransaction(tx.id);
        showNotification('success', `Voucher #${tx.id} placed ON HOLD.`);
      }
      loadTransactions();
    } catch (err: any) {
      showNotification('error', err.response?.data?.detail || 'Hold toggle failed');
    } finally {
      setLoading(false);
    }
  };

  // 4. View Source Document
  const handleViewSource = async (txId: number) => {
    try {
      setLoadingSourceId(txId);
      const data = await api.getTransactionSource(txId);
      setSourceModalData(data);
    } catch (err: any) {
      showNotification('error', err.response?.data?.detail || 'Failed to fetch source details');
    } finally {
      setLoadingSourceId(null);
    }
  };

  // 5. Delete Draft
  const handleDeleteDraft = async (txId: number) => {
    if (!window.confirm(`Are you sure you want to permanently delete draft voucher #${txId}?`)) return;
    try {
      setLoading(true);
      await api.deleteTransaction(txId);
      showNotification('success', `Draft voucher #${txId} deleted.`);
      loadTransactions();
    } catch (err: any) {
      showNotification('error', err.response?.data?.detail || 'Delete failed');
    } finally {
      setLoading(false);
    }
  };

  // 6. Save Edit
  const handleSaveEdit = async () => {
    if (!editingItem) return;
    try {
      setLoading(true);
      await api.editTransaction(editingItem.id, {
        transaction_date: editingItem.transaction_date,
        narration: editingItem.narration,
        suggested_ledger: editingItem.suggested_ledger,
        suggested_voucher_type: editingItem.suggested_voucher_type,
        debit_amount: editingItem.debit_amount,
        credit_amount: editingItem.credit_amount
      });
      showNotification('success', `Proposed voucher #${editingItem.id} updated successfully.`);
      setEditingItem(null);
      loadTransactions();
    } catch (err: any) {
      showNotification('error', err.response?.data?.detail || 'Edit failed');
    } finally {
      setLoading(false);
    }
  };

  // Batch Select
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredItems.filter(i => i.status !== 'PROCESSED').map(i => i.id));
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

  const handleBatchPost = async () => {
    if (selectedIds.length === 0) return;
    try {
      setLoading(true);
      const res = await api.batchApprove(selectedIds);
      const successCount = res.results.filter(r => r.success).length;
      showNotification('success', `Batch complete: ${successCount} of ${selectedIds.length} vouchers posted!`);
      loadTransactions();
    } catch (err: any) {
      showNotification('error', err.response?.data?.detail || 'Batch post failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Voucher Review & Authorization
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Verify and authorize double-entry vouchers, inspect source entries, edit ledgers, or post to books.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <button
              onClick={handleBatchPost}
              disabled={loading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Approve Selected ({selectedIds.length})</span>
            </button>
          )}

          <button
            onClick={loadTransactions}
            disabled={loading}
            className="p-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300 cursor-pointer"
            title="Refresh Table"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Floating Notification */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl flex items-center gap-3 text-xs font-semibold shadow-md transition-all ${notification.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
            }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          )}
          <span>{notification.text}</span>
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Live search narration, ledger, ref..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
              title="Clear Search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="NEEDS_CLARIFICATION">Needs Review</option>
            <option value="HOLD">On Hold</option>
            <option value="REJECTED">Rejected</option>
            <option value="PROCESSED">Posted to Tally</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 cursor-pointer"
          >
            <option value="">All Voucher Types</option>
            <option value="Payment">Payment</option>
            <option value="Receipt">Receipt</option>
            <option value="Contra">Contra</option>
            <option value="Journal">Journal</option>
            <option value="Sales">Sales</option>
            <option value="Purchase">Purchase</option>
          </select>

          {(statusFilter || typeFilter || search) && (
            <button
              onClick={() => { setStatusFilter(''); setTypeFilter(''); setSearch(''); }}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-bold px-2 py-1 cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Proposed Vouchers Review Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase font-semibold tracking-wider text-[11px] border-b border-slate-200 dark:border-slate-800 select-none">
              <tr>
                <th className="py-3 px-3 w-8 text-center">
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={filteredItems.length > 0 && selectedIds.length === filteredItems.filter(i => i.status !== 'PROCESSED').length}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-3">Voucher #</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Ledger Account</th>
                <th className="py-3 px-3 text-right">Debit (₹)</th>
                <th className="py-3 px-3 text-right">Credit (₹)</th>
                <th className="py-3 px-3">Narration</th>
                <th className="py-3 px-3 text-center">Source</th>
                <th className="py-3 px-3 text-center">Match</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-center whitespace-nowrap min-w-[195px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading && items.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    <i className="pi pi-spin pi-spinner text-xl text-blue-600 mb-2"></i>
                    <div>Loading proposed vouchers...</div>
                  </td>
                </tr>
              ): filteredItems.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-12 text-center text-slate-400">
                  <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <div>No proposed vouchers found matching "{search || 'selected filters'}".</div>
                </td>
              </tr>
              ) : (
                filteredItems.map((tx) => {
                  const voucherNum = `PROP-${tx.id.toString().padStart(4, '0')}`;
                  const voucherType = tx.classification?.suggested_voucher_type || (Number(tx.debit_amount) > 0 ? 'Payment' : 'Receipt');
                  const ledgerName = tx.classification?.suggested_ledger || (Number(tx.debit_amount) > 0 ? 'Bank Charges / Expense' : 'Suspense / Income');
                  const confidenceVal = tx.classification ? Math.round(Number(tx.classification.confidence) * 100) : 85;
                  const isSelectable = tx.status !== 'PROCESSED';

                  return (
                    <tr
                      key={tx.id}
                      className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors ${selectedIds.includes(tx.id) ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                        }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3 text-center">
                        {isSelectable && (
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(tx.id)}
                            onChange={() => toggleSelect(tx.id)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        )}
                      </td>

                      {/* 1. Voucher Number */}
                      <td className="py-3 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                        {voucherNum}
                      </td>

                      {/* 2. Date (Clean DD-MMM-YYYY in IST) */}
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {formatAccountingDate(tx.transaction_date)}
                      </td>

                      {/* 3. Voucher Type */}
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase border inline-block ${voucherType === 'Payment'
                            ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                            : voucherType === 'Receipt'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                              : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
                          }`}>
                          {voucherType}
                        </span>
                      </td>

                      {/* 4. Ledger */}
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800 dark:text-slate-100 max-w-[170px] truncate" title={ledgerName}>
                          {ledgerName}
                        </div>
                      </td>

                      {/* 5. Debit */}
                      <td className="py-3 px-3 text-right font-bold text-rose-600 dark:text-rose-400">
                        {formatINR(tx.debit_amount)}
                      </td>

                      {/* 6. Credit */}
                      <td className="py-3 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {formatINR(tx.credit_amount)}
                      </td>

                      {/* 7. Narration (2-line clamp with tooltip) */}
                      <td className="py-2.5 px-3 max-w-[170px]">
                        <div
                          className="line-clamp-2 text-slate-700 dark:text-slate-300 text-xs leading-snug break-words"
                          title={tx.narration}
                        >
                          {tx.narration}
                        </div>
                      </td>

                      {/* 8. Source Document */}
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => handleViewSource(tx.id)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-mono cursor-pointer border border-slate-200 dark:border-slate-700 whitespace-nowrap"
                          title="Click to view full source document entry"
                        >
                          <FileText className="w-3 h-3 text-blue-500" />
                          <span>Row #{tx.source_row_index}</span>
                        </button>
                      </td>

                      {/* 9. Match Score */}
                      <td className="py-2.5 px-3 text-center">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full font-bold text-[10px] ${confidenceVal >= 90
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                            : confidenceVal >= 75
                              ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200'
                          }`}>
                          {confidenceVal}%
                        </span>
                      </td>

                      {/* 10. Status (Stacked 2-line badge) */}
                      <td className="py-2.5 px-3 text-center">
                        {tx.status === 'PROCESSED' ? (
                          <span className="inline-flex flex-col items-center justify-center px-2 py-0.5 rounded-lg font-bold text-[9px] leading-tight border border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800 tracking-wider">
                            <span>POSTED</span>
                            <span>IN TALLY</span>
                          </span>
                        ) : tx.status === 'PENDING_APPROVAL' ? (
                          <span className="inline-flex flex-col items-center justify-center px-2 py-0.5 rounded-lg font-bold text-[9px] leading-tight border border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800 tracking-wider">
                            <span>PENDING</span>
                            <span>APPROVAL</span>
                          </span>
                        ) : tx.status === 'HOLD' ? (
                          <span className="inline-flex flex-col items-center justify-center px-2 py-0.5 rounded-lg font-bold text-[9px] leading-tight border border-purple-200 bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800 tracking-wider">
                            <span>ON</span>
                            <span>HOLD</span>
                          </span>
                        ) : tx.status === 'REJECTED' ? (
                          <span className="inline-flex flex-col items-center justify-center px-2 py-0.5 rounded-lg font-bold text-[9px] leading-tight border border-rose-200 bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800 tracking-wider">
                            <span>VOUCHER</span>
                            <span>REJECTED</span>
                          </span>
                        ) : (
                          <span className="inline-flex flex-col items-center justify-center px-2 py-0.5 rounded-lg font-bold text-[9px] leading-tight border border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 tracking-wider">
                            <span>NEEDS</span>
                            <span>REVIEW</span>
                          </span>
                        )}
                      </td>

                      {/* Available Actions */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center justify-center gap-1.5">
                          {/* Approve & Post Action: Bold Single Checkmark Icon without text */}
                          {tx.status !== 'PROCESSED' && tx.status !== 'REJECTED' && (
                            <button
                              onClick={() => handlePost(tx.id)}
                              className="w-7 h-7 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg transition-all duration-150 cursor-pointer flex items-center justify-center shadow-xs hover:shadow hover:scale-105"
                              title="Approve & Post directly to Tally Prime & Books"
                            >
                              <Check className="w-4 h-4 text-white" strokeWidth={3} />
                            </button>
                          )}

                          {/* Edit Action */}
                          <button
                            onClick={() => setEditingItem({
                              id: tx.id,
                              transaction_date: toInputDate(tx.transaction_date),
                              suggested_voucher_type: voucherType,
                              suggested_ledger: ledgerName,
                              debit_amount: Number(tx.debit_amount || 0),
                              credit_amount: Number(tx.credit_amount || 0),
                              narration: tx.narration
                            })}
                            className="w-7 h-7 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white border border-blue-200/80 hover:border-blue-600 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-900/60 dark:hover:bg-blue-600 dark:hover:text-white rounded-lg transition-all duration-150 flex items-center justify-center cursor-pointer shadow-xs hover:shadow"
                            title="Edit Proposed Voucher"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* View Source Action */}
                          <button
                            onClick={() => handleViewSource(tx.id)}
                            className="w-7 h-7 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white border border-indigo-200/80 hover:border-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 dark:border-indigo-900/60 dark:hover:bg-indigo-600 dark:hover:text-white rounded-lg transition-all duration-150 flex items-center justify-center cursor-pointer shadow-xs hover:shadow"
                            title="View Source Document & Raw Entry"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Hold / Resume Action */}
                          {tx.status !== 'PROCESSED' && (
                            <button
                              onClick={() => handleToggleHold(tx)}
                              className={`w-7 h-7 rounded-lg border transition-all duration-150 flex items-center justify-center cursor-pointer shadow-xs hover:shadow ${tx.status === 'HOLD'
                                  ? 'bg-purple-50 hover:bg-purple-600 text-purple-600 hover:text-white border-purple-200/80 hover:border-purple-600 dark:bg-purple-950/50 dark:text-purple-400 dark:border-purple-900/60 dark:hover:bg-purple-600 dark:hover:text-white'
                                  : 'bg-amber-50 hover:bg-amber-600 text-amber-600 hover:text-white border-amber-200/80 hover:border-amber-600 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-900/60 dark:hover:bg-amber-600 dark:hover:text-white'
                                }`}
                              title={tx.status === 'HOLD' ? 'Resume from Hold' : 'Place on Hold'}
                            >
                              {tx.status === 'HOLD' ? (
                                <PlayCircle className="w-3.5 h-3.5" />
                              ) : (
                                <PauseCircle className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}

                          {/* Reject Action */}
                          {tx.status !== 'PROCESSED' && tx.status !== 'REJECTED' && (
                            <button
                              onClick={() => setRejectingItem(tx)}
                              className="w-7 h-7 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200/80 hover:border-rose-600 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-900/60 dark:hover:bg-rose-600 dark:hover:text-white rounded-lg transition-all duration-150 flex items-center justify-center cursor-pointer shadow-xs hover:shadow"
                              title="Reject Proposed Voucher"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Delete Draft Action */}
                          {tx.status !== 'PROCESSED' && (
                            <button
                              onClick={() => handleDeleteDraft(tx.id)}
                              className="w-7 h-7 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border border-red-200/80 hover:border-red-600 dark:bg-red-950/50 dark:text-red-400 dark:border-red-900/60 dark:hover:bg-red-600 dark:hover:text-white rounded-lg transition-all duration-150 flex items-center justify-center cursor-pointer shadow-xs hover:shadow"
                              title="Delete Draft Voucher"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: VIEW SOURCE DOCUMENT (HLA 9.4 Action) */}
      {/* ========================================================================= */}
      {sourceModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-xl w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="font-bold text-base text-slate-800 dark:text-white">
                  Source Document & Audit Trail
                </h3>
              </div>
              <button
                onClick={() => setSourceModalData(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Document Info */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="font-bold uppercase tracking-wider text-[10px] text-blue-600 dark:text-blue-400 block">
                  Source File Metadata
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400 block">Filename:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {sourceModalData.source_document.filename}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Batch ID:</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                      {sourceModalData.source_document.batch_id}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Row Index in Sheet:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      Row #{sourceModalData.source_document.source_row_index}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Ingestion Time:</span>
                    <span className="text-slate-800 dark:text-slate-200">
                      {sourceModalData.source_document.imported_at
                        ? new Date(sourceModalData.source_document.imported_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) + ' IST'
                        : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Raw Bank Entry */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <span className="font-bold uppercase tracking-wider text-[10px] text-indigo-600 dark:text-indigo-400 block">
                  Original Raw Bank Statement Row
                </span>
                <div className="space-y-1.5">
                  <div>
                    <span className="text-slate-400 block">Raw Narration:</span>
                    <span className="font-medium text-slate-800 dark:text-slate-200 block bg-white dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-700">
                      {sourceModalData.raw_bank_entry.raw_narration}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="text-slate-400 block">Bank Ref / UTR:</span>
                      <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {sourceModalData.raw_bank_entry.bank_reference || 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Cheque Number:</span>
                      <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {sourceModalData.raw_bank_entry.cheque_number || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setSourceModalData(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT PROPOSED VOUCHER (HLA 9.4 Action) */}
      {/* ========================================================================= */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="font-bold text-base text-slate-800 dark:text-white">
                  Edit Proposed Voucher #PROP-{editingItem.id.toString().padStart(4, '0')}
                </h3>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Date</label>
                  <input
                    type="date"
                    value={editingItem.transaction_date}
                    onChange={(e) => setEditingItem({ ...editingItem, transaction_date: e.target.value })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Voucher Type</label>
                  <select
                    value={editingItem.suggested_voucher_type}
                    onChange={(e) => setEditingItem({ ...editingItem, suggested_voucher_type: e.target.value })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-semibold"
                  >
                    <option value="Payment">Payment</option>
                    <option value="Receipt">Receipt</option>
                    <option value="Contra">Contra</option>
                    <option value="Journal">Journal</option>
                    <option value="Sales">Sales</option>
                    <option value="Purchase">Purchase</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Ledger Account</label>
                <select
                  value={editingItem.suggested_ledger}
                  onChange={(e) => setEditingItem({ ...editingItem, suggested_ledger: e.target.value })}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-semibold"
                >
                  {ledgers.map((l) => (
                    <option key={l.id} value={l.name}>
                      {l.name} ({l.group_name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Debit Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingItem.debit_amount}
                    onChange={(e) => setEditingItem({ ...editingItem, debit_amount: Number(e.target.value) })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Credit Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingItem.credit_amount}
                    onChange={(e) => setEditingItem({ ...editingItem, credit_amount: Number(e.target.value) })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Narration</label>
                <textarea
                  rows={2}
                  value={editingItem.narration}
                  onChange={(e) => setEditingItem({ ...editingItem, narration: e.target.value })}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-xs"
              >
                <Check className="w-4 h-4" />
                <span>Save Voucher</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: REJECT PROPOSED VOUCHER (HLA 9.4 Action) */}
      {/* ========================================================================= */}
      {rejectingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertCircle className="w-5 h-5" />
                <h3 className="font-bold text-base text-slate-800 dark:text-white">
                  Reject Proposed Voucher #{rejectingItem.id}
                </h3>
              </div>
              <button
                onClick={() => setRejectingItem(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600 dark:text-slate-300">
                Are you sure you want to reject this proposed voucher? Rejected vouchers will not be posted to Tally Prime.
              </p>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Rejection Reason / Audit Notes *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Duplicate bank line / Invalid expense account / Needs re-scan"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setRejectingItem(null)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-xs"
              >
                <X className="w-4 h-4" />
                <span>Confirm Rejection</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

