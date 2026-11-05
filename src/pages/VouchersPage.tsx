import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  BookOpen, Plus, CheckCircle, AlertCircle, Filter,
  Search, Eye, RefreshCw, ArrowRightLeft, FileSpreadsheet,
  Check, X, Edit3, RotateCcw, AlertTriangle
} from 'lucide-react';
import { api } from '../services/api';
import { Voucher, LedgerItem, Party, GeneralLedgerEntry } from '../types';

export const VouchersPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'vouchers' | 'gl'>('vouchers');
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [glEntries, setGlEntries] = useState<GeneralLedgerEntry[]>([]);
  const [ledgers, setLedgers] = useState<LedgerItem[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [showReverseModal, setShowReverseModal] = useState<boolean>(false);
  const [editingVoucherId, setEditingVoucherId] = useState<number | null>(null);
  const [activeVoucher, setActiveVoucher] = useState<Voucher | null>(null);

  // Reversal Form State
  const [reversalReason, setReversalReason] = useState<string>('');
  const [isReversing, setIsReversing] = useState<boolean>(false);
  const [reverseError, setReverseError] = useState<string>('');

  // Create / Edit Form State
  const [voucherType, setVoucherType] = useState<string>('Payment');
  const [voucherDate, setVoucherDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [narration, setNarration] = useState<string>('');
  const [autoPost, setAutoPost] = useState<boolean>(true);
  const [lines, setLines] = useState<Array<{ ledger_id: number; party_id?: number | null; debit_amount: number; credit_amount: number; narration: string }>>([
    { ledger_id: 0, debit_amount: 0, credit_amount: 0, narration: '' },
    { ledger_id: 0, debit_amount: 0, credit_amount: 0, narration: '' },
  ]);
  const [formError, setFormError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fetchVouchers = async () => {
    setLoading(true);
    try {
      if (activeTab === 'vouchers') {
        const res = await api.getVouchers({
          page,
          limit: 20,
          voucher_type: selectedType || undefined,
          status: selectedStatus || undefined,
          search: searchTerm || undefined
        });
        setVouchers(res.items);
        setTotalCount(res.total);
      } else {
        const res = await api.getGLEntries({ page, limit: 50 });
        setGlEntries(res.items);
        setTotalCount(res.total);
      }
    } catch (err: any) {
      console.error('Error fetching vouchers:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMasters = async () => {
    try {
      const [lList, pList] = await Promise.all([
        api.getChartLedgers(),
        api.getParties()
      ]);
      setLedgers(lList);
      setParties(pList);
    } catch (err) {
      console.error('Error loading master data:', err);
    }
  };

  useEffect(() => {
    loadMasters();
  }, []);

  useEffect(() => {
    fetchVouchers();
  }, [activeTab, page, selectedType, selectedStatus, searchTerm]);

  // Double-Entry Calculations
  const totalDebit = lines.reduce((sum, l) => sum + (Number(l.debit_amount) || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (Number(l.credit_amount) || 0), 0);
  const isBalanced = totalDebit > 0 && Math.abs(totalDebit - totalCredit) < 0.001;
  const discrepancy = Math.abs(totalDebit - totalCredit);

  // General Ledger Postings Totals (Double-Entry Verification)
  const glTotalDebit = glEntries.reduce((sum, e) => sum + (Number(e.debit_amount) || 0), 0);
  const glTotalCredit = glEntries.reduce((sum, e) => sum + (Number(e.credit_amount) || 0), 0);
  const isGLBalanced = glEntries.length > 0 && Math.abs(glTotalDebit - glTotalCredit) < 0.01;
  const glDiscrepancy = Math.abs(glTotalDebit - glTotalCredit);

  // Vouchers List Total Amount
  const vouchersTotalAmount = vouchers.reduce((sum, v) => sum + (Number(v.total_amount) || 0), 0);

  const handleAddLine = () => {
    setLines([...lines, { ledger_id: 0, debit_amount: 0, credit_amount: 0, narration: '' }]);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length <= 2) return;
    setLines(lines.filter((_, idx) => idx !== index));
  };

  const handleLineChange = (index: number, field: string, value: any) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: value };
    setLines(updated);
  };

  const openCreateModal = () => {
    setEditingVoucherId(null);
    setVoucherType('Payment');
    setVoucherDate(new Date().toISOString().split('T')[0]);
    setNarration('');
    setAutoPost(true);
    setLines([
      { ledger_id: 0, debit_amount: 0, credit_amount: 0, narration: '' },
      { ledger_id: 0, debit_amount: 0, credit_amount: 0, narration: '' },
    ]);
    setFormError('');
    setShowCreateModal(true);
  };

  const openEditModal = (v: Voucher) => {
    setEditingVoucherId(v.id);
    setVoucherType(v.voucher_type);
    setVoucherDate(v.voucher_date.split('T')[0]);
    setNarration(v.narration || '');
    setAutoPost(false);
    if (v.lines && v.lines.length >= 2) {
      setLines(v.lines.map(l => ({
        ledger_id: l.ledger_id,
        party_id: l.party_id,
        debit_amount: l.debit_amount,
        credit_amount: l.credit_amount,
        narration: l.narration || ''
      })));
    } else {
      setLines([
        { ledger_id: 0, debit_amount: 0, credit_amount: 0, narration: '' },
        { ledger_id: 0, debit_amount: 0, credit_amount: 0, narration: '' },
      ]);
    }
    setFormError('');
    setShowCreateModal(true);
  };

  const handleSaveVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!isBalanced) {
      setFormError(`Double-entry out of balance! Discrepancy: ₹${discrepancy.toFixed(2)}`);
      return;
    }

    const invalidLine = lines.find(l => !l.ledger_id || (l.debit_amount === 0 && l.credit_amount === 0));
    if (invalidLine) {
      setFormError('All lines must have a selected ledger and a non-zero debit or credit amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payloadLines = lines.map(l => ({
        ledger_id: Number(l.ledger_id),
        party_id: l.party_id ? Number(l.party_id) : null,
        debit_amount: Number(l.debit_amount) || 0,
        credit_amount: Number(l.credit_amount) || 0,
        narration: l.narration || narration
      }));

      if (editingVoucherId) {
        // HLA 7.6 Draft edit
        await api.updateVoucherDraft(editingVoucherId, {
          voucher_type: voucherType,
          voucher_date: voucherDate,
          narration: narration,
          lines: payloadLines
        });
      } else {
        // New creation
        await api.createVoucher({
          voucher_type: voucherType,
          voucher_date: voucherDate,
          narration: narration,
          lines: payloadLines,
          auto_post: autoPost
        });
      }

      setShowCreateModal(false);
      fetchVouchers();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || err.message || 'Failed to save voucher');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePostVoucher = async (id: number) => {
    try {
      await api.postVoucher(id);
      fetchVouchers();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to post voucher');
    }
  };

  const openReverseModal = (v: Voucher) => {
    setActiveVoucher(v);
    setReversalReason('');
    setReverseError('');
    setShowReverseModal(true);
  };

  const handleConfirmReverse = async () => {
    if (!activeVoucher) return;
    if (!reversalReason.trim()) {
      setReverseError('Please enter a clear reason for reversing this voucher.');
      return;
    }

    setIsReversing(true);
    setReverseError('');
    try {
      await api.reverseVoucher(activeVoucher.id, reversalReason.trim());
      setShowReverseModal(false);
      fetchVouchers();
    } catch (err: any) {
      setReverseError(err.response?.data?.detail || err.message || 'Failed to reverse voucher');
    } finally {
      setIsReversing(false);
    }
  };

  const formatDate = (dateStr?: string) => {
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
            <BookOpen className="w-6 h-6 text-blue-600" />
            Vouchers & Operational Journal
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Create, edit drafts, post, and reverse double-entry vouchers (Debit = Credit) with full audit preservation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Double-Entry Voucher
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('vouchers')}
          className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${activeTab === 'vouchers'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
        >
          <BookOpen className="w-4 h-4" />
          Vouchers Journal ({activeTab === 'vouchers' ? totalCount : '...'})
        </button>
        <button
          onClick={() => setActiveTab('gl')}
          className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${activeTab === 'gl'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          General Ledger Postings
        </button>
      </div>

      {/* Filters */}
      {activeTab === 'vouchers' && (
        <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Search voucher #, narration..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            <option value="">All Voucher Types (13)</option>
            <option value="Payment">Payment</option>
            <option value="Receipt">Receipt</option>
            <option value="Contra">Contra</option>
            <option value="Journal">Journal</option>
            <option value="Sales">Sales</option>
            <option value="Purchase">Purchase</option>
            <option value="Debit Note">Debit Note</option>
            <option value="Credit Note">Credit Note</option>
            <option value="Payroll">Payroll</option>
            <option value="Opening Balance">Opening Balance</option>
            <option value="Fixed Asset">Fixed Asset</option>
            <option value="Depreciation">Depreciation</option>
            <option value="Adjustment">Adjustment</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="POSTED">Posted</option>
            <option value="REVERSED">Reversed</option>
            <option value="APPROVED">Approved</option>
          </select>

          <button
            onClick={() => { setSelectedType(''); setSelectedStatus(''); setSearchTerm(''); }}
            className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
            title="Reset Filters"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        {activeTab === 'vouchers' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">Voucher #</th>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5">Type</th>
                  <th className="px-5 py-3.5">Narration</th>
                  <th className="px-5 py-3.5 text-right">Amount (₹)</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-center">Lines</th>
                  <th className="px-5 py-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-16 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <i className="pi pi-spin pi-spinner text-blue-600 dark:text-blue-400" style={{ fontSize: '2rem' }}></i>
                        <span className="text-xs font-medium">Loading vouchers...</span>
                      </div>
                    </td>
                  </tr>
                ) : vouchers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-8 text-center text-slate-400">
                      No vouchers found. Click "New Double-Entry Voucher" to record one.
                    </td>
                  </tr>
                ) : (
                  vouchers.map((v) => (
                    <tr
                      key={v.id}
                      onClick={() => { setActiveVoucher(v); setShowDetailModal(true); }}
                      className="hover:bg-blue-50/60 dark:hover:bg-slate-800/60 transition-colors cursor-pointer group"
                      title="Click row to view voucher details"
                    >
                      <td className="px-5 py-3 font-semibold text-blue-600 dark:text-blue-400 group-hover:underline whitespace-nowrap">
                        {v.voucher_number}
                      </td>
                      <td className="px-5 py-3 text-slate-500 whitespace-nowrap">
                        {formatDate(v.voucher_date)}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                          v.voucher_type === 'Payment' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                          v.voucher_type === 'Receipt' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                          v.voucher_type === 'Contra' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' :
                          v.voucher_type === 'Sales' ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300' :
                          v.voucher_type === 'Purchase' ? 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300' :
                          'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        }`}>
                          {v.voucher_type}
                        </span>
                      </td>
                      <td className="px-5 py-3 max-w-[260px] truncate text-slate-700 dark:text-slate-300" title={v.narration}>
                        {v.narration || '—'}
                      </td>
                      <td className="px-5 py-3 text-right font-mono font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                        ₹{Number(v.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          v.status === 'POSTED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400' :
                          v.status === 'REVERSED' ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400' :
                          v.status === 'DRAFT' ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' :
                          'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
                        }`}>
                          {v.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center font-medium">
                        {v.lines?.length || 0}
                      </td>
                      <td
                        className="px-5 py-3 text-center space-x-1.5 whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* HLA 7.6 Draft edit */}
                        {v.status === 'DRAFT' && (
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation(); openEditModal(v); }}
                              className="px-2.5 py-1 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300 rounded transition-colors cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handlePostVoucher(v.id); }}
                              className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors cursor-pointer shadow-xs"
                            >
                              Post
                            </button>
                          </>
                        )}

                        {/* HLA 7.5 Controlled Reversal */}
                        {v.status === 'POSTED' && (
                          <button
                            onClick={(e) => { e.stopPropagation(); openReverseModal(v); }}
                            className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-600 hover:text-white dark:bg-rose-950/40 dark:text-rose-300 rounded transition-colors cursor-pointer"
                            title="Reverse this posted voucher"
                          >
                            Reverse
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {vouchers.length > 0 && (
                <tfoot className="bg-slate-50 dark:bg-slate-800/80 font-bold border-t-2 border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200">
                  <tr>
                    <td colSpan={3} className="px-5 py-3.5 text-right font-sans uppercase tracking-wider text-slate-600 dark:text-slate-400">
                      Total Vouchers ({vouchers.length}) :
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-sm font-bold text-slate-900 dark:text-white">
                      ₹{vouchersTotalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td colSpan={3} className="px-5 py-3.5"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">Post Date</th>
                  <th className="px-5 py-3.5">Voucher</th>
                  <th className="px-5 py-3.5">Ledger Account</th>
                  <th className="px-5 py-3.5 text-right text-emerald-600 dark:text-emerald-400">Debit (₹)</th>
                  <th className="px-5 py-3.5 text-right text-blue-600 dark:text-blue-400">Credit (₹)</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-16 text-center text-slate-400 font-sans">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <i className="pi pi-spin pi-spinner text-blue-600 dark:text-blue-400" style={{ fontSize: '2rem' }}></i>
                        <span className="text-xs font-medium">Loading General Ledger entries...</span>
                      </div>
                    </td>
                  </tr>
                ) : glEntries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-slate-400 font-sans">
                      No General Ledger postings yet. Post vouchers to see ledger entries.
                    </td>
                  </tr>
                ) : (
                  glEntries.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-3 font-sans text-slate-500 whitespace-nowrap">
                        {formatDate(e.posting_date)}
                      </td>
                      <td className="px-5 py-3 font-sans font-semibold text-slate-900 dark:text-white">
                        {e.voucher_number || `VCH #${e.voucher_id}`}
                      </td>
                      <td className="px-5 py-3 font-sans text-slate-800 dark:text-slate-200">
                        {e.ledger_name}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                        {e.debit_amount > 0 ? `₹${Number(e.debit_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold text-blue-600 dark:text-blue-400">
                        {e.credit_amount > 0 ? `₹${Number(e.credit_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td className="px-5 py-3 text-center font-sans">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          e.is_reversed ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                        }`}>
                          {e.is_reversed ? 'REVERSED' : 'POSTED'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {glEntries.length > 0 && (
                <tfoot className="bg-slate-50 dark:bg-slate-800/90 font-bold border-t-2 border-slate-300 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200">
                  <tr>
                    <td colSpan={3} className="px-5 py-3.5 text-right font-sans uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      Total Ledger Postings ({glEntries.length} Lines) :
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-sm font-bold text-emerald-700 dark:text-emerald-400">
                      ₹{glTotalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-sm font-bold text-blue-700 dark:text-blue-400">
                      ₹{glTotalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3.5 text-center font-sans">
                      {isGLBalanced ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                          BALANCED
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                          DIFF: ₹{glDiscrepancy.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      )}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* CREATE / EDIT VOUCHER MODAL (HLA Part 7.4 & 7.6) */}
      {/* ======================================================== */}
      {showCreateModal && createPortal(
        <div
          className="fixed inset-0 z-[100] bg-slate-950/45 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                {editingVoucherId ? 'Edit Draft Voucher' : 'Create Double-Entry Voucher'}
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVoucher} className="p-6 space-y-6">
              {/* Form Header Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Voucher Type (HLA 7.2)
                  </label>
                  <select
                    value={voucherType}
                    onChange={(e) => setVoucherType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="Payment">Payment Voucher</option>
                    <option value="Receipt">Receipt Voucher</option>
                    <option value="Contra">Contra Voucher</option>
                    <option value="Journal">Journal Voucher</option>
                    <option value="Purchase">Purchase Voucher</option>
                    <option value="Sales">Sales Voucher</option>
                    <option value="Debit Note">Debit Note</option>
                    <option value="Credit Note">Credit Note</option>
                    <option value="Payroll">Payroll Voucher</option>
                    <option value="Opening Balance">Opening Balance Voucher</option>
                    <option value="Fixed Asset">Fixed Asset Voucher</option>
                    <option value="Depreciation">Depreciation Voucher</option>
                    <option value="Adjustment">Adjustment Voucher</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Voucher Date
                  </label>
                  <input
                    type="date"
                    value={voucherDate}
                    onChange={(e) => setVoucherDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-900 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Narration / Memo
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Monthly office rent payment"
                    value={narration}
                    onChange={(e) => setNarration(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white"
                    required
                  />
                </div>
              </div>

              {/* Line Items Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800/70 text-xs font-bold uppercase text-slate-500 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-2.5">#</th>
                      <th className="px-4 py-2.5">Ledger Account</th>
                      <th className="px-4 py-2.5">Party (Optional)</th>
                      <th className="px-4 py-2.5 text-right w-36 text-emerald-600">Debit Amount (₹)</th>
                      <th className="px-4 py-2.5 text-right w-36 text-blue-600">Credit Amount (₹)</th>
                      <th className="px-4 py-2.5 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {lines.map((line, idx) => (
                      <tr key={idx} className="bg-white dark:bg-slate-900">
                        <td className="px-4 py-2 text-slate-400 font-bold">{idx + 1}</td>
                        <td className="px-4 py-2">
                          <select
                            value={line.ledger_id}
                            onChange={(e) => handleLineChange(idx, 'ledger_id', Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm text-slate-900 dark:text-white font-medium"
                            required
                          >
                            <option value={0}>-- Select Ledger --</option>
                            {ledgers.map(l => (
                              <option key={l.id} value={l.id}>
                                {l.name} ({l.group_name || 'Ledger'})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <select
                            value={line.party_id || ''}
                            onChange={(e) => handleLineChange(idx, 'party_id', e.target.value ? Number(e.target.value) : null)}
                            className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm text-slate-900 dark:text-white"
                          >
                            <option value="">None</option>
                            {parties.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.party_name} ({p.party_type})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={line.debit_amount || ''}
                            onChange={(e) => handleLineChange(idx, 'debit_amount', parseFloat(e.target.value) || 0)}
                            className="w-full text-right px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm font-mono font-semibold text-emerald-600 dark:text-emerald-400"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={line.credit_amount || ''}
                            onChange={(e) => handleLineChange(idx, 'credit_amount', parseFloat(e.target.value) || 0)}
                            className="w-full text-right px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-sm font-mono font-semibold text-blue-600 dark:text-blue-400"
                          />
                        </td>
                        <td className="px-4 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(idx)}
                            disabled={lines.length <= 2}
                            className="text-slate-400 hover:text-red-500 disabled:opacity-30 cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={handleAddLine}
                  className="px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors cursor-pointer"
                >
                  + Add Line Item
                </button>

                {/* Double-Entry Balancing Card (HLA 7.1) */}
                <div className={`flex items-center gap-6 px-4 py-2.5 rounded-xl border font-mono text-sm ${isBalanced
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                    : 'bg-red-50 text-red-900 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800'
                  }`}>
                  <div>
                    <span className="text-xs text-slate-500 block">Total Debit:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">₹{totalDebit.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block">Total Credit:</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">₹{totalCredit.toFixed(2)}</span>
                  </div>
                  <div className="pl-3 border-l border-slate-300 dark:border-slate-700 flex items-center gap-1.5">
                    {isBalanced ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span className="font-bold text-emerald-600">BALANCED</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 text-red-600" />
                        <span className="font-bold text-red-600">Diff: ₹{discrepancy.toFixed(2)}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {formError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                {!editingVoucherId ? (
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoPost}
                      onChange={(e) => setAutoPost(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Post immediately to General Ledger</span>
                  </label>
                ) : <div />}

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !isBalanced}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-semibold text-sm shadow-sm transition-all cursor-pointer"
                  >
                    {isSubmitting ? 'Saving...' : (editingVoucherId ? 'Save Changes' : 'Record Voucher')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ======================================================== */}
      {/* REVERSAL CONFIRMATION MODAL (HLA Part 7.5) */}
      {/* ======================================================== */}
      {showReverseModal && activeVoucher && createPortal(
        <div
          className="fixed inset-0 z-[100] bg-slate-950/45 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowReverseModal(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Controlled Voucher Reversal
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Reversing voucher <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{activeVoucher.voucher_number}</span> (₹{Number(activeVoucher.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}).
                </p>
              </div>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              Per <strong>HLA Section 7.5</strong>, posted transactions are immutable and never silently deleted. A reverse entry with opposite debits and credits will be generated and posted to the General Ledger, preserving full audit history.
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                Reversal Reason (Required)
              </label>
              <textarea
                rows={3}
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                placeholder="State the reason (e.g. Incorrect ledger applied, duplicate entry, invoice cancelled)..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
            </div>

            {reverseError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                {reverseError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowReverseModal(false)}
                className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-semibold text-sm hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReverse}
                disabled={isReversing || !reversalReason.trim()}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg font-semibold text-sm cursor-pointer transition-colors shadow-xs"
              >
                {isReversing ? 'Reversing...' : 'Confirm Reversal'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ======================================================== */}
      {/* VOUCHER DETAIL MODAL */}
      {/* ======================================================== */}
      {showDetailModal && activeVoucher && createPortal(
        <div
          className="fixed inset-0 z-[100] bg-slate-950/45 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowDetailModal(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Voucher: {activeVoucher.voucher_number}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    activeVoucher.status === 'POSTED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                    activeVoucher.status === 'REVERSED' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {activeVoucher.status}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {activeVoucher.voucher_type} Voucher on {formatDate(activeVoucher.voucher_date)}
                </p>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-slate-700 dark:text-slate-300">
              <span className="font-semibold">Narration:</span> {activeVoucher.narration || '—'}
            </p>

            {activeVoucher.reversal_reason && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-xs text-rose-800 dark:text-rose-300">
                <span className="font-bold">Reversal Audit:</span> {activeVoucher.reversal_reason}
              </div>
            )}

            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800 text-xs font-bold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-2">Line</th>
                    <th className="px-4 py-2">Ledger Account</th>
                    <th className="px-4 py-2 text-right text-emerald-600">Debit (₹)</th>
                    <th className="px-4 py-2 text-right text-blue-600">Credit (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {activeVoucher.lines?.map((l, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2 text-slate-400 font-sans">{l.line_number}</td>
                      <td className="px-4 py-2 font-sans font-medium text-slate-900 dark:text-white">
                        {l.ledger_name}
                      </td>
                      <td className="px-4 py-2 text-right text-emerald-600 dark:text-emerald-400">
                        {l.debit_amount > 0 ? `₹${Number(l.debit_amount).toFixed(2)}` : '—'}
                      </td>
                      <td className="px-4 py-2 text-right text-blue-600 dark:text-blue-400">
                        {l.credit_amount > 0 ? `₹${Number(l.credit_amount).toFixed(2)}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
