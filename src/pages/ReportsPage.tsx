import React, { useState, useEffect } from 'react';
import {
  BarChart3, FileSpreadsheet, Download, RefreshCw,
  Calendar, CheckCircle, AlertCircle, TrendingUp, TrendingDown,
  Building, Scale, BookOpen, Search, Filter, RotateCcw, FileText
} from 'lucide-react';
import { api } from '../services/api';
import {
  TrialBalanceResponse, ProfitLossReport, BalanceSheetReport,
  DayBookItem, LedgerItem, LedgerReportResponse
} from '../types';

export const ReportsPage: React.FC = () => {
  const [activeReport, setActiveReport] = useState<'daybook' | 'ledger' | 'tb' | 'pl' | 'bs'>('daybook');
  const [loading, setLoading] = useState<boolean>(true);

  // Master Data
  const [ledgers, setLedgers] = useState<LedgerItem[]>([]);

  // Report States
  const [dayBookData, setDayBookData] = useState<{ items: DayBookItem[]; total_count: number; total_debit: number; total_credit: number } | null>(null);
  const [ledgerReport, setLedgerReport] = useState<LedgerReportResponse | null>(null);
  const [trialBalance, setTrialBalance] = useState<TrialBalanceResponse | null>(null);
  const [profitLoss, setProfitLoss] = useState<ProfitLossReport | null>(null);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetReport | null>(null);

  // Filters
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [asOfDate, setAsOfDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedVoucherType, setSelectedVoucherType] = useState<string>('');
  const [selectedLedgerId, setSelectedLedgerId] = useState<number | ''>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debitCreditFilter, setDebitCreditFilter] = useState<string>('ALL');

  // Load master ledgers list once
  useEffect(() => {
    api.getChartLedgers()
      .then(list => {
        setLedgers(list);
        if (list.length > 0 && selectedLedgerId === '') {
          setSelectedLedgerId(list[0].id);
        }
      })
      .catch(err => console.error('Error loading ledgers:', err));
  }, []);

  const loadReportData = async () => {
    setLoading(true);
    try {
      if (activeReport === 'daybook') {
        const data = await api.getDayBook({
          from_date: fromDate || undefined,
          to_date: toDate || undefined,
          voucher_type: selectedVoucherType || undefined,
          ledger_id: selectedLedgerId ? Number(selectedLedgerId) : undefined,
          status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
          search: searchTerm || undefined,
          debit_credit: debitCreditFilter !== 'ALL' ? debitCreditFilter : undefined
        });
        setDayBookData(data);
      } else if (activeReport === 'ledger') {
        if (selectedLedgerId) {
          const data = await api.getLedgerReport(Number(selectedLedgerId), {
            from_date: fromDate || undefined,
            to_date: toDate || undefined,
            voucher_type: selectedVoucherType || undefined
          });
          setLedgerReport(data);
        }
      } else if (activeReport === 'tb') {
        const data = await api.getTrialBalance({ as_of_date: asOfDate });
        setTrialBalance(data);
      } else if (activeReport === 'pl') {
        const data = await api.getProfitLoss({
          from_date: fromDate || undefined,
          to_date: toDate || undefined
        });
        setProfitLoss(data);
      } else if (activeReport === 'bs') {
        const data = await api.getBalanceSheet({ as_of_date: asOfDate });
        setBalanceSheet(data);
      }
    } catch (err) {
      console.error('Error fetching financial report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, [activeReport, asOfDate, selectedLedgerId]);

  const handleApplyFilter = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    loadReportData();
  };

  const handleResetFilters = () => {
    setFromDate('');
    setToDate('');
    setSelectedVoucherType('');
    setSelectedStatus('ALL');
    setSearchTerm('');
    setDebitCreditFilter('ALL');
    setTimeout(() => {
      loadReportData();
    }, 50);
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

  // CSV Export utility
  const exportToCSV = (filename: string, rows: (string | number)[][], headers: string[]) => {
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExport = () => {
    if (activeReport === 'daybook' && dayBookData) {
      const headers = ['Date', 'Voucher Number', 'Type', 'Ledger Name', 'Debit (₹)', 'Credit (₹)', 'Source Document', 'Status', 'Narration'];
      const rows = dayBookData.items.map(d => [
        d.date,
        `"${d.voucher_number}"`,
        `"${d.voucher_type}"`,
        `"${d.ledger_name}"`,
        d.debit_amount,
        d.credit_amount,
        `"${d.source_document || ''}"`,
        `"${d.status}"`,
        `"${(d.narration || '').replace(/"/g, '""')}"`
      ]);
      exportToCSV('Day_Book_Report', rows, headers);
    } else if (activeReport === 'ledger' && ledgerReport) {
      const headers = ['Date', 'Voucher Number', 'Voucher Type', 'Particulars', 'Debit (₹)', 'Credit (₹)', 'Running Balance (₹)', 'Nature'];
      const rows = ledgerReport.items.map(item => [
        item.date,
        `"${item.voucher_number}"`,
        `"${item.voucher_type}"`,
        `"${item.particulars.replace(/"/g, '""')}"`,
        item.debit_amount,
        item.credit_amount,
        item.running_balance,
        item.balance_nature
      ]);
      exportToCSV(`Ledger_${ledgerReport.ledger_name.replace(/\s+/g, '_')}`, rows, headers);
    } else if (activeReport === 'tb' && trialBalance) {
      const headers = ['Ledger Code', 'Ledger Name', 'Group', 'Type', 'Opening Dr', 'Opening Cr', 'Period Dr', 'Period Cr', 'Closing Dr', 'Closing Cr'];
      const rows = trialBalance.items.map(i => [
        `"${i.ledger_code || ''}"`,
        `"${i.ledger_name}"`,
        `"${i.group_name}"`,
        `"${i.group_type}"`,
        i.opening_debit,
        i.opening_credit,
        i.period_debit,
        i.period_credit,
        i.closing_debit,
        i.closing_credit
      ]);
      exportToCSV('Trial_Balance_Report', rows, headers);
    } else if (activeReport === 'pl' && profitLoss) {
      const headers = ['Category', 'Ledger Name', 'Group', 'Amount (₹)'];
      const rows = [
        ...profitLoss.income.items.map(i => ['Income', `"${i.ledger_name}"`, `"${i.group_name}"`, i.amount]),
        ...profitLoss.expenses.items.map(e => ['Expense', `"${e.ledger_name}"`, `"${e.group_name}"`, e.amount])
      ];
      exportToCSV('Profit_Loss_Statement', rows, headers);
    } else if (activeReport === 'bs' && balanceSheet) {
      const headers = ['Section', 'Ledger Name', 'Group', 'Amount (₹)'];
      const rows = [
        ...balanceSheet.assets.items.map(i => ['Asset', `"${i.ledger_name}"`, `"${i.group_name}"`, i.amount]),
        ...balanceSheet.liabilities.items.map(i => ['Liability', `"${i.ledger_name}"`, `"${i.group_name}"`, i.amount]),
        ...balanceSheet.equity.items.map(i => ['Equity', `"${i.ledger_name}"`, `"${i.group_name}"`, i.amount])
      ];
      exportToCSV('Balance_Sheet_Report', rows, headers);
    }
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            Financial Statements & Reports
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Deterministic accounting reports calculated directly from immutable double-entry General Ledger postings.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-semibold transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button
            onClick={loadReportData}
            className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-all cursor-pointer shadow-xs"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Report Tabs (HLA Part 10 Structure) */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-1 overflow-x-auto">
        <button
          onClick={() => setActiveReport('daybook')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${activeReport === 'daybook'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
        >
          <BookOpen className="w-4 h-4" />
          Day Book
        </button>
        <button
          onClick={() => setActiveReport('ledger')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${activeReport === 'ledger'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
        >
          <FileText className="w-4 h-4" />
          Ledger Report
        </button>
        <button
          onClick={() => setActiveReport('tb')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${activeReport === 'tb'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
        >
          <Scale className="w-4 h-4" />
          Trial Balance
        </button>
        <button
          onClick={() => setActiveReport('pl')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${activeReport === 'pl'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
        >
          <TrendingUp className="w-4 h-4" />
          Profit & Loss
        </button>
        <button
          onClick={() => setActiveReport('bs')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${activeReport === 'bs'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
        >
          <Building className="w-4 h-4" />
          Balance Sheet
        </button>
      </div>

      {/* Main Report Body */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">

        {/* ======================================================== */}
        {/* 1. DAY BOOK TAB (HLA Part 10.1) */}
        {/* ======================================================== */}
        {activeReport === 'daybook' && (
          <div className="p-6 space-y-5">
            {/* HLA 10.1 Filter Bar */}
            <form onSubmit={handleApplyFilter} className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  From:
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-xs text-slate-800 dark:text-slate-200 font-medium focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  To:
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-xs text-slate-800 dark:text-slate-200 font-medium focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <select
                  value={selectedVoucherType}
                  onChange={(e) => setSelectedVoucherType(e.target.value)}
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  <option value="">All Voucher Types</option>
                  <option value="Payment">Payment</option>
                  <option value="Receipt">Receipt</option>
                  <option value="Contra">Contra</option>
                  <option value="Journal">Journal</option>
                  <option value="Purchase">Purchase</option>
                  <option value="Sales">Sales</option>
                  <option value="Debit Note">Debit Note</option>
                  <option value="Credit Note">Credit Note</option>
                  <option value="Payroll">Payroll</option>
                  <option value="Opening Balance">Opening Balance</option>
                  <option value="Fixed Asset">Fixed Asset</option>
                  <option value="Depreciation">Depreciation</option>
                  <option value="Adjustment">Adjustment</option>
                </select>

                <select
                  value={selectedLedgerId}
                  onChange={(e) => setSelectedLedgerId(e.target.value ? Number(e.target.value) : '')}
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 max-w-[200px] truncate"
                >
                  <option value="">All Ledgers</option>
                  {ledgers.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>

                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="POSTED">Posted</option>
                  <option value="DRAFT">Draft</option>
                  <option value="REVERSED">Reversed</option>
                </select>

                <select
                  value={debitCreditFilter}
                  onChange={(e) => setDebitCreditFilter(e.target.value)}
                  className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  <option value="ALL">Debit & Credit</option>
                  <option value="DEBIT">Debit Lines Only</option>
                  <option value="CREDIT">Credit Lines Only</option>
                </select>

                <div className="relative flex-1 min-w-[160px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search voucher #, narration..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                >
                  Apply
                </button>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                  title="Reset Filters"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </form>

            {/* Summary Cards */}
            {dayBookData && (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Entries</div>
                  <div className="text-xl font-black text-slate-900 dark:text-white mt-1">{dayBookData.total_count} lines</div>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="text-xs font-bold uppercase tracking-wider text-emerald-600">Total Debit</div>
                  <div className="text-xl font-black text-emerald-600 mt-1">₹{dayBookData.total_debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="text-xs font-bold uppercase tracking-wider text-blue-600">Total Credit</div>
                  <div className="text-xl font-black text-blue-600 mt-1">₹{dayBookData.total_credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Double-Entry Balance</div>
                  <div className="mt-1 flex items-center gap-1.5 text-xs font-bold text-emerald-600">
                    <CheckCircle className="w-4 h-4" /> Balanced & Reconciled
                  </div>
                </div>
              </div>
            )}

            {/* Day Book Table */}
            {loading ? (
              <div className="p-12 text-center text-slate-400">Loading Day Book entries...</div>
            ) : !dayBookData || dayBookData.items.length === 0 ? (
              <div className="p-12 text-center text-slate-400">No Day Book entries found matching filters.</div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Voucher #</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Ledger Name</th>
                      <th className="px-4 py-3 text-right text-emerald-600">Debit (₹)</th>
                      <th className="px-4 py-3 text-right text-blue-600">Credit (₹)</th>
                      <th className="px-4 py-3">Narration</th>
                      <th className="px-4 py-3">Source Document</th>
                      <th className="px-4 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                    {dayBookData.items.map((d, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-2.5 font-sans font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {formatDate(d.date)}
                        </td>
                        <td className="px-4 py-2.5 font-sans font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          {d.voucher_number}
                        </td>
                        <td className="px-4 py-2.5 font-sans">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {d.voucher_type}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-sans font-semibold text-slate-800 dark:text-slate-200">
                          {d.ledger_name}
                        </td>
                        <td className="px-4 py-2.5 text-right font-bold text-emerald-600">
                          {d.debit_amount > 0 ? `₹${d.debit_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-right font-bold text-blue-600">
                          {d.credit_amount > 0 ? `₹${d.credit_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                        </td>
                        <td className="px-4 py-2.5 font-sans text-slate-500 max-w-[220px] truncate" title={d.narration}>
                          {d.narration || '—'}
                        </td>
                        <td className="px-4 py-2.5 font-sans text-slate-500 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 text-[10px] font-medium">
                            {d.source_document || 'Bank Tx'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-center font-sans">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${d.status === 'POSTED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              d.status === 'REVERSED' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                                'bg-slate-100 text-slate-700'
                            }`}>
                            {d.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* 2. LEDGER REPORT TAB (HLA Part 10.2) */}
        {/* ======================================================== */}
        {activeReport === 'ledger' && (
          <div className="p-6 space-y-5">
            {/* Filter Bar */}
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700/60 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[240px]">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Select Ledger Account
                </label>
                <select
                  value={selectedLedgerId}
                  onChange={(e) => setSelectedLedgerId(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-semibold text-slate-800 dark:text-slate-200"
                >
                  {ledgers.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.name} {l.group_name ? `(${l.group_name})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                From:
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-xs text-slate-800 dark:text-slate-200 font-medium"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
                To:
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-xs text-slate-800 dark:text-slate-200 font-medium"
                />
              </div>

              <select
                value={selectedVoucherType}
                onChange={(e) => setSelectedVoucherType(e.target.value)}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                <option value="">All Voucher Types</option>
                <option value="Payment">Payment</option>
                <option value="Receipt">Receipt</option>
                <option value="Contra">Contra</option>
                <option value="Journal">Journal</option>
                <option value="Purchase">Purchase</option>
                <option value="Sales">Sales</option>
              </select>

              <button
                type="button"
                onClick={handleApplyFilter}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
              >
                Filter
              </button>
            </div>

            {/* KPI Cards */}
            {ledgerReport && (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Opening Balance</div>
                  <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
                    ₹{ledgerReport.opening_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}{' '}
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                      {ledgerReport.opening_balance_nature}
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="text-xs font-bold uppercase tracking-wider text-emerald-600">Total Period Debit</div>
                  <div className="text-xl font-black text-emerald-600 mt-1">
                    ₹{ledgerReport.total_period_debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="text-xs font-bold uppercase tracking-wider text-blue-600">Total Period Credit</div>
                  <div className="text-xl font-black text-blue-600 mt-1">
                    ₹{ledgerReport.total_period_credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="text-xs font-bold uppercase tracking-wider text-indigo-600">Closing Balance</div>
                  <div className="text-xl font-black text-indigo-600 mt-1">
                    ₹{ledgerReport.closing_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}{' '}
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                      {ledgerReport.closing_balance_nature}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Statement Table */}
            {loading ? (
              <div className="p-12 text-center text-slate-400">Loading ledger report...</div>
            ) : !ledgerReport || ledgerReport.items.length === 0 ? (
              <div className="p-12 text-center text-slate-400">No transactions recorded for this ledger in the selected period.</div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Voucher #</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Particulars (Opposing Account)</th>
                      <th className="px-4 py-3 text-right text-emerald-600">Debit (₹)</th>
                      <th className="px-4 py-3 text-right text-blue-600">Credit (₹)</th>
                      <th className="px-4 py-3 text-right">Running Balance (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                    {ledgerReport.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-2.5 font-sans font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {formatDate(item.date)}
                        </td>
                        <td className="px-4 py-2.5 font-sans font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          {item.voucher_number}
                        </td>
                        <td className="px-4 py-2.5 font-sans">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {item.voucher_type}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-sans font-semibold text-slate-800 dark:text-slate-200">
                          {item.particulars}
                        </td>
                        <td className="px-4 py-2.5 text-right font-bold text-emerald-600">
                          {item.debit_amount > 0 ? `₹${item.debit_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-right font-bold text-blue-600">
                          {item.credit_amount > 0 ? `₹${item.credit_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-right font-bold text-slate-900 dark:text-white">
                          ₹{item.running_balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}{' '}
                          <span className="text-[10px] font-bold text-slate-500">
                            {item.balance_nature}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* 3. TRIAL BALANCE TAB (HLA Part 10.3) */}
        {/* ======================================================== */}
        {activeReport === 'tb' && trialBalance && (
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between pb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">As of Date:</span>
                <input
                  type="date"
                  value={asOfDate}
                  onChange={(e) => setAsOfDate(e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium"
                />
              </div>

              {trialBalance.is_balanced ? (
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle className="w-4 h-4" />
                  Trial Balance Satisfies Equality Rule (Debit == Credit)
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-800">
                  <AlertCircle className="w-4 h-4" />
                  Out of Balance! Discrepancy: ₹{trialBalance.discrepancy.toFixed(2)}
                </div>
              )}
            </div>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800 font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3" rowSpan={2}>Ledger Account</th>
                    <th className="px-4 py-3" rowSpan={2}>Group</th>
                    <th className="px-4 py-3 text-center border-b border-slate-200 dark:border-slate-800" colSpan={2}>Opening Balance</th>
                    <th className="px-4 py-3 text-center border-b border-slate-200 dark:border-slate-800" colSpan={2}>Transactions</th>
                    <th className="px-4 py-3 text-center border-b border-slate-200 dark:border-slate-800" colSpan={2}>Closing Balance</th>
                  </tr>
                  <tr>
                    <th className="px-3 py-2 text-right">Debit (₹)</th>
                    <th className="px-3 py-2 text-right">Credit (₹)</th>
                    <th className="px-3 py-2 text-right">Debit (₹)</th>
                    <th className="px-3 py-2 text-right">Credit (₹)</th>
                    <th className="px-3 py-2 text-right">Debit (₹)</th>
                    <th className="px-3 py-2 text-right">Credit (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {trialBalance.items.map((row) => (
                    <tr key={row.ledger_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-2 font-sans font-semibold text-slate-800 dark:text-slate-200">{row.ledger_name}</td>
                      <td className="px-4 py-2 font-sans text-slate-500">{row.group_name}</td>
                      <td className="px-3 py-2 text-right">{row.opening_debit > 0 ? row.opening_debit.toFixed(2) : '—'}</td>
                      <td className="px-3 py-2 text-right">{row.opening_credit > 0 ? row.opening_credit.toFixed(2) : '—'}</td>
                      <td className="px-3 py-2 text-right text-emerald-600 font-semibold">{row.period_debit > 0 ? row.period_debit.toFixed(2) : '—'}</td>
                      <td className="px-3 py-2 text-right text-blue-600 font-semibold">{row.period_credit > 0 ? row.period_credit.toFixed(2) : '—'}</td>
                      <td className="px-3 py-2 text-right font-bold text-slate-900 dark:text-white">{row.closing_debit > 0 ? row.closing_debit.toFixed(2) : '—'}</td>
                      <td className="px-3 py-2 text-right font-bold text-slate-900 dark:text-white">{row.closing_credit > 0 ? row.closing_credit.toFixed(2) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-100 dark:bg-slate-800 font-mono font-bold text-slate-900 dark:text-white border-t-2 border-slate-300 dark:border-slate-700">
                  <tr>
                    <td className="px-4 py-3 font-sans" colSpan={2}>Grand Total</td>
                    <td className="px-3 py-3 text-right">{trialBalance.grand_opening_debit.toFixed(2)}</td>
                    <td className="px-3 py-3 text-right">{trialBalance.grand_opening_credit.toFixed(2)}</td>
                    <td className="px-3 py-3 text-right text-emerald-600">{trialBalance.grand_period_debit.toFixed(2)}</td>
                    <td className="px-3 py-3 text-right text-blue-600">{trialBalance.grand_period_credit.toFixed(2)}</td>
                    <td className="px-3 py-3 text-right">{trialBalance.grand_closing_debit.toFixed(2)}</td>
                    <td className="px-3 py-3 text-right">{trialBalance.grand_closing_credit.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 4. PROFIT & LOSS TAB (HLA Part 10.4) */}
        {/* ======================================================== */}
        {activeReport === 'pl' && profitLoss && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Income */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 bg-slate-50/50 dark:bg-slate-800/30">
                <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-3 flex items-center justify-between">
                  <span>Revenue & Income</span>
                  <span className="font-mono">₹{profitLoss.income.total.toFixed(2)}</span>
                </h3>
                <div className="space-y-2 font-mono text-xs">
                  {profitLoss.income.items.map((i) => (
                    <div key={i.ledger_id} className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                      <span className="font-sans text-slate-700 dark:text-slate-300">{i.ledger_name}</span>
                      <span>₹{i.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Expenses */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 bg-slate-50/50 dark:bg-slate-800/30">
                <h3 className="text-sm font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 mb-3 flex items-center justify-between">
                  <span>Expenses & Costs</span>
                  <span className="font-mono">₹{profitLoss.expenses.total.toFixed(2)}</span>
                </h3>
                <div className="space-y-2 font-mono text-xs">
                  {profitLoss.expenses.items.map((e) => (
                    <div key={e.ledger_id} className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                      <span className="font-sans text-slate-700 dark:text-slate-300">{e.ledger_name}</span>
                      <span>₹{e.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Net P&L Summary Banner */}
            <div className={`p-4 rounded-xl flex items-center justify-between font-bold ${profitLoss.status === 'PROFIT' ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200' : 'bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200'
              }`}>
              <span className="text-sm">Net {profitLoss.status === 'PROFIT' ? 'Profit' : 'Loss'} for the Period</span>
              <span className="text-lg font-mono">₹{Math.abs(profitLoss.net_profit_loss).toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* 5. BALANCE SHEET TAB (HLA Part 10.5) */}
        {/* ======================================================== */}
        {activeReport === 'bs' && balanceSheet && (
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs text-slate-500">As of Date: {asOfDate}</span>
              {balanceSheet.is_balanced ? (
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-200">
                  <CheckCircle className="w-4 h-4" />
                  Balance Sheet Rule Satisfied: Total Assets = Total Liabilities & Equity
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-3 py-1.5 rounded-lg border border-rose-200">
                  <AlertCircle className="w-4 h-4" />
                  Imbalance Detected: ₹{balanceSheet.discrepancy.toFixed(2)}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Assets */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 bg-slate-50/50 dark:bg-slate-800/30">
                <h3 className="text-sm font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 mb-3 flex items-center justify-between">
                  <span>Assets</span>
                  <span className="font-mono">₹{balanceSheet.assets.total.toFixed(2)}</span>
                </h3>
                <div className="space-y-2 font-mono text-xs">
                  {balanceSheet.assets.items.map((i, idx) => (
                    <div key={idx} className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                      <span className="font-sans text-slate-700 dark:text-slate-300">{i.ledger_name}</span>
                      <span>₹{i.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Liabilities & Equity */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 bg-slate-50/50 dark:bg-slate-800/30">
                <h3 className="text-sm font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400 mb-3 flex items-center justify-between">
                  <span>Liabilities & Equity</span>
                  <span className="font-mono">₹{balanceSheet.total_liabilities_and_equity.toFixed(2)}</span>
                </h3>
                <div className="space-y-2 font-mono text-xs">
                  <div className="text-[11px] font-bold text-slate-400 uppercase pt-1">Liabilities</div>
                  {balanceSheet.liabilities.items.map((i, idx) => (
                    <div key={idx} className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                      <span className="font-sans text-slate-700 dark:text-slate-300">{i.ledger_name}</span>
                      <span>₹{i.amount.toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="text-[11px] font-bold text-slate-400 uppercase pt-3">Equity & Reserves</div>
                  {balanceSheet.equity.items.map((i, idx) => (
                    <div key={idx} className="flex justify-between py-1 border-b border-slate-200/60 dark:border-slate-700/60">
                      <span className="font-sans text-slate-700 dark:text-slate-300">{i.ledger_name}</span>
                      <span>₹{i.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
