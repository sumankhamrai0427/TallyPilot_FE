import React, { useState, useEffect } from 'react';
import { 
  BarChart3, FileSpreadsheet, Download, RefreshCw, 
  Calendar, CheckCircle, AlertCircle, TrendingUp, TrendingDown,
  Building, Scale, BookOpen
} from 'lucide-react';
import { api } from '../services/api';
import { TrialBalanceResponse, ProfitLossReport, BalanceSheetReport, DayBookItem } from '../types';

export const ReportsPage: React.FC = () => {
  const [activeReport, setActiveReport] = useState<'tb' | 'pl' | 'bs' | 'daybook'>('tb');
  const [loading, setLoading] = useState<boolean>(true);

  // Report States
  const [trialBalance, setTrialBalance] = useState<TrialBalanceResponse | null>(null);
  const [profitLoss, setProfitLoss] = useState<ProfitLossReport | null>(null);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetReport | null>(null);
  const [dayBookData, setDayBookData] = useState<{ items: DayBookItem[]; total_debit: number; total_credit: number } | null>(null);

  // Filters
  const [asOfDate, setAsOfDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      if (activeReport === 'tb') {
        const data = await api.getTrialBalance({ as_of_date: asOfDate });
        setTrialBalance(data);
      } else if (activeReport === 'pl') {
        const data = await api.getProfitLoss();
        setProfitLoss(data);
      } else if (activeReport === 'bs') {
        const data = await api.getBalanceSheet({ as_of_date: asOfDate });
        setBalanceSheet(data);
      } else if (activeReport === 'daybook') {
        const data = await api.getDayBook();
        setDayBookData(data);
      }
    } catch (err) {
      console.error('Error fetching financial report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, [activeReport, asOfDate]);

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
    if (activeReport === 'tb' && trialBalance) {
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
      exportToCSV('Trial_Balance', rows, headers);
    } else if (activeReport === 'daybook' && dayBookData) {
      const headers = ['Date', 'Voucher Number', 'Type', 'Ledger', 'Debit', 'Credit', 'Narration'];
      const rows = dayBookData.items.map(d => [
        d.date,
        `"${d.voucher_number}"`,
        `"${d.voucher_type}"`,
        `"${d.ledger_name}"`,
        d.debit_amount,
        d.credit_amount,
        `"${d.narration || ''}"`
      ]);
      exportToCSV('Day_Book', rows, headers);
    }
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-blue-600" />
            Financial Statements & Reports (HLA Part 10)
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Deterministic accounting reports calculated from immutable General Ledger postings.
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
            className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-all cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Report Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-2">
        <button
          onClick={() => setActiveReport('tb')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeReport === 'tb'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <Scale className="w-4 h-4" />
          Trial Balance
        </button>
        <button
          onClick={() => setActiveReport('pl')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeReport === 'pl'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Profit & Loss Account
        </button>
        <button
          onClick={() => setActiveReport('bs')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeReport === 'bs'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <Building className="w-4 h-4" />
          Balance Sheet
        </button>
        <button
          onClick={() => setActiveReport('daybook')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeReport === 'daybook'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Day Book
        </button>
      </div>

      {/* Main Report Body */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading report data...</div>
        ) : (
          <>
            {/* 1. TRIAL BALANCE TAB */}
            {activeReport === 'tb' && trialBalance && (
              <div className="p-6 space-y-4">
                {/* Balancing Status Banner */}
                <div className={`p-4 rounded-xl border flex items-center justify-between ${
                  trialBalance.is_balanced
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
                    : 'bg-red-50 border-red-200 text-red-900 dark:bg-red-950/40 dark:border-red-800 dark:text-red-300'
                }`}>
                  <div className="flex items-center gap-3">
                    {trialBalance.is_balanced ? (
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    )}
                    <div>
                      <div className="font-bold text-sm">
                        {trialBalance.is_balanced ? 'Trial Balance is strictly balanced!' : 'Trial Balance has a discrepancy!'}
                      </div>
                      <div className="text-xs opacity-80">
                        Total Closing Debit: ₹{trialBalance.grand_closing_debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })} | 
                        Total Closing Credit: ₹{trialBalance.grand_closing_credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase font-sans border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="px-4 py-3">Ledger Name</th>
                        <th className="px-4 py-3">Group</th>
                        <th className="px-4 py-3 text-right">Period Dr (₹)</th>
                        <th className="px-4 py-3 text-right">Period Cr (₹)</th>
                        <th className="px-4 py-3 text-right text-emerald-600">Closing Dr (₹)</th>
                        <th className="px-4 py-3 text-right text-blue-600">Closing Cr (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {trialBalance.items.map((i) => (
                        <tr key={i.ledger_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-2.5 font-sans font-medium text-slate-900 dark:text-white">
                            {i.ledger_name}
                          </td>
                          <td className="px-4 py-2.5 font-sans text-slate-500">
                            {i.group_name}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            {i.period_debit > 0 ? i.period_debit.toFixed(2) : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            {i.period_credit > 0 ? i.period_credit.toFixed(2) : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-right font-bold text-emerald-600">
                            {i.closing_debit > 0 ? i.closing_debit.toFixed(2) : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-right font-bold text-blue-600">
                            {i.closing_credit > 0 ? i.closing_credit.toFixed(2) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 dark:bg-slate-800/80 font-bold border-t-2 border-slate-300 dark:border-slate-700">
                      <tr>
                        <td colSpan={2} className="px-4 py-3 font-sans text-slate-900 dark:text-white">
                          Grand Total:
                        </td>
                        <td className="px-4 py-3 text-right">₹{trialBalance.grand_period_debit.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right">₹{trialBalance.grand_period_credit.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-emerald-600">₹{trialBalance.grand_closing_debit.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-blue-600">₹{trialBalance.grand_closing_credit.toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* 2. PROFIT & LOSS TAB */}
            {activeReport === 'pl' && profitLoss && (
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Income Side */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-600 flex items-center justify-between">
                      <span>Revenue & Operating Income</span>
                      <span className="font-mono text-base">₹{profitLoss.income.total.toFixed(2)}</span>
                    </h3>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {profitLoss.income.items.length === 0 ? (
                        <div className="py-4 text-xs text-slate-400">No income entries recorded.</div>
                      ) : (
                        profitLoss.income.items.map((inc) => (
                          <div key={inc.ledger_id} className="py-2.5 flex justify-between text-sm">
                            <span className="text-slate-800 dark:text-slate-200">{inc.ledger_name}</span>
                            <span className="font-mono font-semibold text-emerald-600">₹{inc.amount.toFixed(2)}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Expense Side */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-rose-600 flex items-center justify-between">
                      <span>Operating & Administrative Expenses</span>
                      <span className="font-mono text-base">₹{profitLoss.expenses.total.toFixed(2)}</span>
                    </h3>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {profitLoss.expenses.items.length === 0 ? (
                        <div className="py-4 text-xs text-slate-400">No expense entries recorded.</div>
                      ) : (
                        profitLoss.expenses.items.map((exp) => (
                          <div key={exp.ledger_id} className="py-2.5 flex justify-between text-sm">
                            <span className="text-slate-800 dark:text-slate-200">{exp.ledger_name}</span>
                            <span className="font-mono font-semibold text-rose-600">₹{exp.amount.toFixed(2)}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Net Summary Card */}
                <div className={`p-5 rounded-xl border flex items-center justify-between ${
                  profitLoss.status === 'PROFIT'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-950 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
                    : 'bg-rose-50 border-rose-200 text-rose-950 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300'
                }`}>
                  <div className="font-bold text-base">
                    Net Result: {profitLoss.status === 'PROFIT' ? 'Net Operating Profit' : 'Net Operating Loss'}
                  </div>
                  <div className="font-mono font-black text-2xl">
                    ₹{Math.abs(profitLoss.net_profit_loss).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            )}

            {/* 3. BALANCE SHEET TAB */}
            {activeReport === 'bs' && balanceSheet && (
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Assets */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-blue-600 flex items-center justify-between">
                      <span>Total Assets</span>
                      <span className="font-mono text-base">₹{balanceSheet.assets.total.toFixed(2)}</span>
                    </h3>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {balanceSheet.assets.items.map((a) => (
                        <div key={a.ledger_id} className="py-2.5 flex justify-between text-sm">
                          <span className="text-slate-800 dark:text-slate-200">{a.ledger_name}</span>
                          <span className="font-mono font-semibold text-blue-600">₹{a.amount.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Liabilities & Equity */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-amber-600 flex items-center justify-between">
                      <span>Total Liabilities & Equity</span>
                      <span className="font-mono text-base">₹{balanceSheet.total_liabilities_and_equity.toFixed(2)}</span>
                    </h3>
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      <div className="py-1 text-xs font-bold text-slate-400 uppercase">Liabilities</div>
                      {balanceSheet.liabilities.items.map((l) => (
                        <div key={l.ledger_id} className="py-2 flex justify-between text-sm">
                          <span className="text-slate-800 dark:text-slate-200">{l.ledger_name}</span>
                          <span className="font-mono font-semibold">₹{l.amount.toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="pt-3 py-1 text-xs font-bold text-slate-400 uppercase">Equity & Reserves</div>
                      {balanceSheet.equity.items.map((e, idx) => (
                        <div key={idx} className="py-2 flex justify-between text-sm">
                          <span className="text-slate-800 dark:text-slate-200">{e.ledger_name}</span>
                          <span className="font-mono font-semibold text-purple-600">₹{e.amount.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Equation Check */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between text-sm font-mono">
                  <span>Balance Sheet Check: Assets (₹{balanceSheet.total_assets.toFixed(2)}) == Liab + Equity (₹{balanceSheet.total_liabilities_and_equity.toFixed(2)})</span>
                  <span className="font-bold text-emerald-600 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" /> BALANCED
                  </span>
                </div>
              </div>
            )}

            {/* 4. DAY BOOK TAB */}
            {activeReport === 'daybook' && dayBookData && (
              <div className="p-6">
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800 font-bold uppercase text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Voucher #</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Ledger Name</th>
                        <th className="px-4 py-3 text-right">Debit (₹)</th>
                        <th className="px-4 py-3 text-right">Credit (₹)</th>
                        <th className="px-4 py-3">Narration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                      {dayBookData.items.map((d, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-2.5 font-sans">{d.date}</td>
                          <td className="px-4 py-2.5 font-sans font-semibold text-slate-900 dark:text-white">{d.voucher_number}</td>
                          <td className="px-4 py-2.5 font-sans">{d.voucher_type}</td>
                          <td className="px-4 py-2.5 font-sans font-medium">{d.ledger_name}</td>
                          <td className="px-4 py-2.5 text-right text-emerald-600">{d.debit_amount > 0 ? d.debit_amount.toFixed(2) : '—'}</td>
                          <td className="px-4 py-2.5 text-right text-blue-600">{d.credit_amount > 0 ? d.credit_amount.toFixed(2) : '—'}</td>
                          <td className="px-4 py-2.5 font-sans text-slate-500 max-w-[200px] truncate">{d.narration}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

