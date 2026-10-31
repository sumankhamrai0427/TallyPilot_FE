import React, { useState, useEffect } from 'react';
import {
  BookOpen, Plus, CheckCircle, AlertCircle, Filter,
  Search, Eye, RefreshCw, ArrowRightLeft, FileSpreadsheet,
  Check, X
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
  const [activeVoucher, setActiveVoucher] = useState<Voucher | null>(null);

  // Form State
  const [newVoucherType, setNewVoucherType] = useState<string>('Payment');
  const [newVoucherDate, setNewVoucherDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newNarration, setNewNarration] = useState<string>('');
  const [newAutoPost, setNewAutoPost] = useState<boolean>(true);
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
      console.error('Error fetching data:', err);
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

  const handleCreateVoucher = async (e: React.FormEvent) => {
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
      await api.createVoucher({
        voucher_type: newVoucherType,
        voucher_date: newVoucherDate,
        narration: newNarration,
        lines: lines.map(l => ({
          ledger_id: Number(l.ledger_id),
          party_id: l.party_id ? Number(l.party_id) : null,
          debit_amount: Number(l.debit_amount) || 0,
          credit_amount: Number(l.credit_amount) || 0,
          narration: l.narration || newNarration
        })),
        auto_post: newAutoPost
      });

      setShowCreateModal(false);
      // Reset form
      setNewNarration('');
      setLines([
        { ledger_id: 0, debit_amount: 0, credit_amount: 0, narration: '' },
        { ledger_id: 0, debit_amount: 0, credit_amount: 0, narration: '' },
      ]);
      fetchVouchers();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || err.message || 'Failed to create voucher');
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

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-600" />
            Double-Entry Accounting & General Ledger
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Enforces strict balance constraints (Debit = Credit) with multi-tenant company isolation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
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
            <option value="">All Voucher Types</option>
            <option value="Payment">Payment</option>
            <option value="Receipt">Receipt</option>
            <option value="Contra">Contra</option>
            <option value="Journal">Journal</option>
            <option value="Sales">Sales</option>
            <option value="Purchase">Purchase</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="POSTED">Posted</option>
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
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-center">Lines</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-8 text-center text-slate-400">
                      Loading vouchers...
                    </td>
                  </tr>
                ) : vouchers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-8 text-center text-slate-400">
                      No vouchers found. Click "New Double-Entry Voucher" to create one.
                    </td>
                  </tr>
                ) : (
                  vouchers.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-3 font-semibold text-slate-900 dark:text-white">
                        {v.voucher_number}
                      </td>
                      <td className="px-5 py-3 text-slate-500 whitespace-nowrap">
                        {v.voucher_date}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${v.voucher_type === 'Payment' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                            v.voucher_type === 'Receipt' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                              v.voucher_type === 'Contra' ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' :
                                'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          }`}>
                          {v.voucher_type}
                        </span>
                      </td>
                      <td className="px-5 py-3 max-w-[280px] truncate text-slate-700 dark:text-slate-300">
                        {v.narration || '—'}
                      </td>
                      <td className="px-5 py-3 text-right font-mono font-semibold text-slate-900 dark:text-white">
                        ₹{Number(v.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${v.status === 'POSTED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400' :
                            v.status === 'DRAFT' ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' :
                              'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
                          }`}>
                          {v.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center font-medium">
                        {v.lines?.length || 0}
                      </td>
                      <td className="px-5 py-3 text-right space-x-2">
                        <button
                          onClick={() => { setActiveVoucher(v); setShowDetailModal(true); }}
                          className="px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                        >
                          Details
                        </button>
                        {v.status === 'DRAFT' && (
                          <button
                            onClick={() => handlePostVoucher(v.id)}
                            className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors"
                          >
                            Post to GL
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
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
                  <th className="px-5 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                {glEntries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-slate-400 font-sans">
                      No General Ledger postings yet. Post vouchers to see ledger entries.
                    </td>
                  </tr>
                ) : (
                  glEntries.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-3 font-sans text-slate-500 whitespace-nowrap">
                        {e.posting_date}
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
                      <td className="px-5 py-3 font-sans">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
                          POSTED
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE VOUCHER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden my-8">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                Create Double-Entry Voucher
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateVoucher} className="p-6 space-y-6">
              {/* Form Header Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Voucher Type
                  </label>
                  <select
                    value={newVoucherType}
                    onChange={(e) => setNewVoucherType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-semibold text-slate-900 dark:text-white"
                  >
                    <option value="Payment">Payment</option>
                    <option value="Receipt">Receipt</option>
                    <option value="Contra">Contra</option>
                    <option value="Journal">Journal</option>
                    <option value="Sales">Sales</option>
                    <option value="Purchase">Purchase</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Voucher Date
                  </label>
                  <input
                    type="date"
                    value={newVoucherDate}
                    onChange={(e) => setNewVoucherDate(e.target.value)}
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
                    placeholder="e.g. Vendor payment for invoice #1029"
                    value={newNarration}
                    onChange={(e) => setNewNarration(e.target.value)}
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
                      <th className="px-4 py-2.5 text-right w-36">Debit Amount (₹)</th>
                      <th className="px-4 py-2.5 text-right w-36">Credit Amount (₹)</th>
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
                  + Add Voucher Line
                </button>

                {/* Double-Entry Balancing Card */}
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
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newAutoPost}
                    onChange={(e) => setNewAutoPost(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Post immediately to General Ledger</span>
                </label>

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
                    {isSubmitting ? 'Saving...' : 'Save & Record Voucher'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {showDetailModal && activeVoucher && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                  Voucher: {activeVoucher.voucher_number}
                </h3>
                <p className="text-xs text-slate-500">
                  {activeVoucher.voucher_type} Voucher on {activeVoucher.voucher_date}
                </p>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-slate-700 dark:text-slate-300">
              <span className="font-semibold">Narration:</span> {activeVoucher.narration}
            </p>

            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800 text-xs font-bold uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-2">Line</th>
                    <th className="px-4 py-2">Ledger</th>
                    <th className="px-4 py-2 text-right">Debit (₹)</th>
                    <th className="px-4 py-2 text-right">Credit (₹)</th>
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
        </div>
      )}
    </div>
  );
};