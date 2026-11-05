import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle, Check, X, AlertTriangle, ArrowRight, RefreshCw, CheckCircle2, FileText, Layers, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';
import { BankTransaction } from '../types';

interface ClarificationQueuePageProps {
  onRegisterExport?: (exporter: () => void) => void;
}

export const ClarificationQueuePage: React.FC<ClarificationQueuePageProps> = ({ onRegisterExport }) => {
  const [items, setItems] = useState<BankTransaction[]>([]);
  const [ledgers, setLedgers] = useState<any[]>([]);
  const [accountGroups, setAccountGroups] = useState<any[]>([]);
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

  // New Ledger Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newLedgerName, setNewLedgerName] = useState('');
  const [newLedgerGroup, setNewLedgerGroup] = useState('');

  // Confirmation Modal State for "Create Ledger & Post Voucher"
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmLedgerName, setConfirmLedgerName] = useState('');
  const [confirmGroupName, setConfirmGroupName] = useState('');
  const [confirmVoucherType, setConfirmVoucherType] = useState('Receipt');
  const [confirmNotes, setConfirmNotes] = useState('');

  // Active Transaction directional accounting validation
  const isActiveTxCredit = Number(activeTx?.credit_amount || 0) > 0;
  const isActiveTxDebit = Number(activeTx?.debit_amount || 0) > 0;

  // Primary bank account of company (contra ledger for payments/receipts)
  const primaryBankName = activeTx?.bank_ledger_name || (ledgers.find((l: any) => l.is_bank_account)?.name) || 'State Bank Of India';

  // Check if primary and target ledger are identical on non-Contra vouchers
  const isSameBankError = (selectedLedger && primaryBankName && selectedLedger.trim().toLowerCase() === primaryBankName.trim().toLowerCase() && voucherType !== 'Contra')
    ? `Target ledger cannot be the same bank account ('${primaryBankName}'). For bank charges or expenses, please select or create an expense ledger (e.g. 'Bank Charges' under 'Indirect Expenses').`
    : null;

  // Main Form validation error
  const mainVoucherError = (isActiveTxCredit && voucherType === 'Payment')
    ? 'Bank credit (money inflow) cannot be recorded as a Payment voucher. Please select Receipt.'
    : (isActiveTxDebit && voucherType === 'Receipt')
      ? 'Bank debit (money outflow) cannot be recorded as a Receipt voucher. Please select Payment.'
      : isSameBankError;

  // Confirm Modal validation error
  const confirmVoucherError = (isActiveTxCredit && confirmVoucherType === 'Payment')
    ? 'Bank credit (money inflow) cannot be recorded as a Payment voucher. Please select Receipt.'
    : (isActiveTxDebit && confirmVoucherType === 'Receipt')
      ? 'Bank debit (money outflow) cannot be recorded as a Receipt voucher. Please select Payment.'
      : null;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [txRes, ledgerRes, groupRes] = await Promise.all([
        api.getTransactions({ status: 'NEEDS_CLARIFICATION', page_size: 50 }),
        api.getCompanyLedgers(),
        api.getAccountGroups().catch(() => [])
      ]);
      setItems(txRes.items);
      setLedgers(ledgerRes || []);
      setAccountGroups(groupRes || []);
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

  // Register filter-accurate CSV exporter matching UI 1:1
  useEffect(() => {
    if (onRegisterExport) {
      onRegisterExport(() => {
        const headers = [
          'Transaction ID',
          'Date',
          'Narration',
          'Bank Reference',
          'Amount (₹)',
          'Suggested Ledger',
          'Suggested Voucher Type',
          'Confidence',
          'Ambiguity Reason',
          'Status'
        ];
        const rows = items.map(t => {
          const amt = Number(t.debit_amount || t.credit_amount || 0);
          const conf = t.classification?.confidence ? `${Math.round(Number(t.classification.confidence) * 100)}%` : '--';
          return [
            `"#${t.id}"`,
            `"${t.transaction_date}"`,
            `"${(t.narration || '').replace(/"/g, '""')}"`,
            `"${(t.bank_reference || '').replace(/"/g, '""')}"`,
            `"${amt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}"`,
            `"${(t.classification?.suggested_ledger || 'Unassigned').replace(/"/g, '""')}"`,
            `"${t.classification?.suggested_voucher_type || (Number(t.debit_amount) > 0 ? 'Payment' : 'Receipt')}"`,
            `"${conf}"`,
            `"${(t.classification?.ambiguity_reason || 'Requires human verification').replace(/"/g, '""')}"`,
            `"Needs Review"`
          ];
        });

        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Clarification_Queue_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      });
    }
  }, [onRegisterExport, items]);

  const selectTx = (tx: BankTransaction) => {
    setActiveTx(tx);
    const isCredit = Number(tx.credit_amount) > 0;
    const bankName = tx.bank_ledger_name || 'State Bank Of India';

    // Strict accounting direction enforcement
    let vType = tx.classification?.suggested_voucher_type;
    if (isCredit) {
      vType = (vType === 'Contra') ? 'Contra' : 'Receipt';
    } else {
      vType = (vType === 'Contra') ? 'Contra' : 'Payment';
    }
    setVoucherType(vType);

    // If suggested ledger is same as bank ledger on a payment/receipt, do not pre-select bank!
    let suggested = tx.classification?.suggested_ledger || '';
    if (suggested && suggested.toLowerCase() === bankName.toLowerCase() && vType !== 'Contra') {
      suggested = '';
    }
    setSelectedLedger(suggested);

    let txType = tx.classification?.transaction_type;
    if (isCredit && (!txType || txType === 'supplier_payment')) {
      txType = 'customer_receipt';
    } else if (!isCredit && (!txType || txType === 'customer_receipt')) {
      txType = 'supplier_payment';
    }
    setTransactionType(txType || (isCredit ? 'customer_receipt' : 'supplier_payment'));
    setReviewerNotes('');
    setSkipReason('');
    setStatusMessage(null);
  };

  // Helper to dynamically resolve account group from active company Chart of Accounts
  const getDynamicDefaultGroup = (isCredit: boolean): string => {
    if (!accountGroups || accountGroups.length === 0) return '';
    const groupNames = accountGroups.map((g: any) => g.name);
    if (isCredit) {
      return (
        groupNames.find((n: string) => /debtor|customer|receivable/i.test(n)) ||
        groupNames.find((n: string) => /income|revenue|sales/i.test(n)) ||
        accountGroups.find((g: any) => g.nature === 'Assets' || g.group_type === 'asset')?.name ||
        accountGroups[0]?.name ||
        ''
      );
    } else {
      return (
        groupNames.find((n: string) => /expense/i.test(n)) ||
        groupNames.find((n: string) => /creditor|supplier|payable/i.test(n)) ||
        accountGroups.find((g: any) => g.nature === 'Expenses' || g.group_type === 'expense')?.name ||
        accountGroups[0]?.name ||
        ''
      );
    }
  };

  const handleOpenApproveConfirm = () => {
    if (!activeTx || !selectedLedger) {
      setStatusMessage({ text: "Please select a valid ledger from the list.", isError: true });
      return;
    }
    if (isSameBankError) {
      setStatusMessage({ text: isSameBankError, isError: true });
      return;
    }
    const matchedLedgerObj = ledgers.find((l: any) => l.name === selectedLedger);
    const resolvedGroup = matchedLedgerObj?.group_name || matchedLedgerObj?.parent_group || activeTx.classification?.suggested_group_name || getDynamicDefaultGroup(isActiveTxCredit);
    setConfirmLedgerName(selectedLedger);
    setConfirmGroupName(resolvedGroup);
    setConfirmVoucherType(voucherType);
    setConfirmNotes(reviewerNotes || `Approved and clarified transaction to "${selectedLedger}" (${voucherType})`);
    setIsConfirmModalOpen(true);
  };

  const handleSubmitCorrection = async () => {
    if (!activeTx || !selectedLedger) {
      setStatusMessage({ text: "Please select a valid ledger from the list.", isError: true });
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
      setStatusMessage({ text: `Transaction #${activeTx.id} clarified and posted directly to Vouchers & Tally Prime!` });
      await loadData();
    } catch (err: any) {
      setStatusMessage({ text: err.response?.data?.detail || err.message || "Failed to clarify", isError: true });
    } finally {
      setActionLoading(false);
    }
  };

  const openConfirmModal = (suggestedLedger?: string, suggestedGroup?: string) => {
    if (!activeTx) return;
    const isCredit = Number(activeTx.credit_amount) > 0;
    const ledger = suggestedLedger || activeTx.classification?.suggested_ledger || '';
    
    // Intelligently auto-select group matching money flow direction from active company groups
    let group = suggestedGroup || activeTx.classification?.suggested_group_name;
    const availableGroupNames = accountGroups.map((g: any) => g.name);

    if (group && availableGroupNames.includes(group)) {
      // Validated directly against company's real account groups
    } else {
      group = getDynamicDefaultGroup(isCredit);
    }

    const defaultVType = isCredit ? 'Receipt' : 'Payment';

    setConfirmLedgerName(ledger);
    setConfirmGroupName(group);
    setConfirmVoucherType(defaultVType);
    setConfirmNotes(`Verified and mapped "${ledger}" under "${group}"`);
    setIsConfirmModalOpen(true);
  };

  const handleConfirmAndPost = async () => {
    if (!activeTx || !confirmLedgerName.trim()) {
      setStatusMessage({ text: "Ledger name cannot be blank.", isError: true });
      return;
    }
    try {
      setActionLoading(true);
      const ledgerName = confirmLedgerName.trim();
      
      // 1. Create ledger in database if not existing
      await api.createLedger({ name: ledgerName, group_name: confirmGroupName });

      // 2. Derive direction-consistent transaction type
      const isCredit = Number(activeTx.credit_amount) > 0;
      let txType = isCredit ? 'customer_receipt' : 'supplier_payment';
      if (confirmVoucherType === 'Contra') txType = 'contra_transfer';

      // 3. Clarify and auto-post voucher
      await api.clarifyTransaction(activeTx.id, {
        selected_ledger: ledgerName,
        corrected_voucher_type: confirmVoucherType,
        corrected_transaction_type: txType,
        reviewer_notes: confirmNotes || `Created new ledger "${ledgerName}" under "${confirmGroupName}" and posted`
      });

      setStatusMessage({ text: `Ledger "${ledgerName}" created/linked and Transaction #${activeTx.id} posted directly to General Ledger!` });
      setIsConfirmModalOpen(false);
      await loadData();
    } catch (err: any) {
      setStatusMessage({ text: err.response?.data?.detail || err.message || "Failed to create ledger and post voucher", isError: true });
    } finally {
      setActionLoading(false);
    }
  };

  const handleManualCreateLedger = async () => {
    if (!newLedgerName.trim()) return;
    try {
      setActionLoading(true);
      await api.createLedger({ name: newLedgerName.trim(), group_name: newLedgerGroup });
      const updatedLedgers = await api.getCompanyLedgers();
      setLedgers(updatedLedgers || []);
      setSelectedLedger(newLedgerName.trim());
      setIsCreateModalOpen(false);
      setNewLedgerName('');
      setStatusMessage({ text: `Ledger "${newLedgerName.trim()}" created successfully and selected.` });
    } catch (err: any) {
      setStatusMessage({ text: err.response?.data?.detail || err.message || "Failed to create ledger", isError: true });
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

      {loading ? (
        <div className="bg-white dark:bg-slate-900 p-16 rounded-xl border border-slate-200 dark:border-slate-800 text-center shadow-xs flex flex-col items-center justify-center gap-3">
          <i className="pi pi-spin pi-spinner text-blue-600 dark:text-blue-400" style={{ fontSize: '2rem' }}></i>
          <span className="text-xs text-slate-400 font-medium">Loading Clarification Queue...</span>
        </div>
      ) : items.length === 0 ? (
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

                {/* AI New Ledger Suggestion Banner (Clean button, no emoji) */}
                {activeTx.classification?.requires_new_ledger && activeTx.classification.suggested_ledger && (
                  <div className="p-3 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        Suggested New Ledger: <span className="font-bold text-blue-600 dark:text-blue-400">{activeTx.classification.suggested_ledger}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Parent Group: {activeTx.classification.suggested_group_name || getDynamicDefaultGroup(isActiveTxCredit)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openConfirmModal(activeTx.classification!.suggested_ledger!, activeTx.classification?.suggested_group_name || getDynamicDefaultGroup(isActiveTxCredit))}
                      disabled={actionLoading}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md shadow-xs transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
                    >
                      Create Ledger & Post Voucher
                    </button>
                  </div>
                )}

                {/* Correction Form */}
                <div className="space-y-4 pt-2">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Target Tally Master Ledger *
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setNewLedgerName(activeTx.classification?.suggested_ledger || '');
                          setNewLedgerGroup(activeTx.classification?.suggested_group_name || getDynamicDefaultGroup(isActiveTxCredit));
                          setIsCreateModalOpen(true);
                        }}
                        className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline cursor-pointer"
                      >
                        + New Ledger
                      </button>
                    </div>
                    <select
                      value={selectedLedger}
                      onChange={(e) => setSelectedLedger(e.target.value)}
                      className={`w-full text-sm border rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                        isSameBankError ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      <option value="">-- Select Valid Ledger --</option>
                      {ledgers.map((l: any) => (
                        <option key={l.id} value={l.name}>
                          {l.name} ({l.group_name || l.parent_group || 'General'})
                        </option>
                      ))}
                    </select>
                    {isSameBankError && (
                      <div className="mt-1.5 flex items-start justify-between gap-2 p-2 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-md text-[11px] text-rose-700 dark:text-rose-300 leading-tight">
                        <div className="flex items-start gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                          <span>{isSameBankError}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setNewLedgerName('Bank Charges');
                            setNewLedgerGroup(getDynamicDefaultGroup(false));
                            setIsCreateModalOpen(true);
                          }}
                          className="shrink-0 font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                        >
                          + Create Bank Charges
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                        Voucher Type
                      </label>
                      <select
                        value={voucherType}
                        onChange={(e) => setVoucherType(e.target.value)}
                        className={`w-full text-sm border rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 ${
                          mainVoucherError ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-300 dark:border-slate-700'
                        }`}
                      >
                        <option value="Payment">Payment</option>
                        <option value="Receipt">Receipt</option>
                        <option value="Contra">Contra</option>
                        <option value="Journal">Journal</option>
                      </select>
                      {mainVoucherError && (
                        <div className="mt-1.5 flex items-start gap-1.5 p-2 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-md text-[11px] text-rose-700 dark:text-rose-300 leading-tight">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                          <span>{mainVoucherError}</span>
                        </div>
                      )}
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
                  onClick={handleOpenApproveConfirm}
                  disabled={actionLoading || !selectedLedger || !!mainVoucherError}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-2 shadow-xs disabled:opacity-40 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Approve & Post to Vouchers</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal for One-Click Create Ledger & Post Voucher (Rendered via createPortal to body) */}
      {isConfirmModalOpen && activeTx && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-lg">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                    Confirm Ledger & Voucher Post
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Verify accounting parameters before recording to General Ledger
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Transaction Preview Card */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Date: {activeTx.transaction_date}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  Number(activeTx.credit_amount) > 0
                    ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                    : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                }`}>
                  {Number(activeTx.credit_amount) > 0 ? 'Credit / Inflow (Receipt)' : 'Debit / Outflow (Payment)'}
                </span>
              </div>
              <div className="font-medium text-slate-700 dark:text-slate-300 text-xs">
                {activeTx.narration}
              </div>
              <div className="text-sm font-mono font-bold text-slate-900 dark:text-white">
                ₹{Number(Number(activeTx.debit_amount) > 0 ? activeTx.debit_amount : activeTx.credit_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>

            {/* Editable Configuration */}
            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Ledger Name *
                </label>
                <input
                  type="text"
                  value={confirmLedgerName}
                  onChange={(e) => setConfirmLedgerName(e.target.value)}
                  className="w-full text-sm border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  placeholder="e.g. Global Retail Corp"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Parent Account Group *
                  </label>
                  <select
                    value={confirmGroupName}
                    onChange={(e) => setConfirmGroupName(e.target.value)}
                    className="w-full text-sm border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                  >
                    {accountGroups.length > 0 ? (
                      accountGroups.map((g: any) => (
                        <option key={g.id} value={g.name}>
                          {g.name} ({g.nature || g.category || 'Group'})
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="Sundry Debtors">Sundry Debtors (Customer / Inflow)</option>
                        <option value="Sundry Creditors">Sundry Creditors (Supplier / Outflow)</option>
                        <option value="Indirect Expenses">Indirect Expenses</option>
                        <option value="Direct Expenses">Direct Expenses</option>
                        <option value="Sales Accounts">Sales Accounts</option>
                        <option value="Purchase Accounts">Purchase Accounts</option>
                        <option value="Indirect Incomes">Indirect Incomes</option>
                        <option value="Bank Accounts">Bank Accounts</option>
                        <option value="Cash-in-hand">Cash-in-hand</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Voucher Type *
                  </label>
                  <select
                    value={confirmVoucherType}
                    onChange={(e) => setConfirmVoucherType(e.target.value)}
                    className={`w-full text-sm border rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 ${
                      confirmVoucherError ? 'border-rose-500 ring-1 ring-rose-500' : 'border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    <option value="Receipt">Receipt (Inflow)</option>
                    <option value="Payment">Payment (Outflow)</option>
                    <option value="Contra">Contra (Bank / Cash)</option>
                    <option value="Journal">Journal</option>
                  </select>
                  {confirmVoucherError && (
                    <div className="mt-1.5 flex items-start gap-1.5 p-2 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-md text-[11px] text-rose-700 dark:text-rose-300 leading-tight">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                      <span>{confirmVoucherError}</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Audit / Reviewer Notes
                </label>
                <input
                  type="text"
                  value={confirmNotes}
                  onChange={(e) => setConfirmNotes(e.target.value)}
                  className="w-full text-sm border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs"
                  placeholder="e.g. Verified customer invoice collection"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-3.5 py-1.5 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-semibold rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAndPost}
                disabled={!confirmLedgerName.trim() || !!confirmVoucherError || actionLoading}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md shadow-xs disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirm & Post Voucher</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal for creating a new ledger (Rendered via createPortal to body) */}
      {isCreateModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">Create New Ledger</h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Ledger Name</label>
                <input
                  type="text"
                  value={newLedgerName}
                  onChange={(e) => setNewLedgerName(e.target.value)}
                  className="w-full text-sm border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                  placeholder="e.g. Office / Pantry Expenses"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Parent Account Group</label>
                <select
                  value={newLedgerGroup}
                  onChange={(e) => setNewLedgerGroup(e.target.value)}
                  className="w-full text-sm border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
                >
                  {accountGroups.length > 0 ? (
                    accountGroups.map((g: any) => (
                      <option key={g.id} value={g.name}>
                        {g.name} ({g.nature || g.category || 'Group'})
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="Indirect Expenses">Indirect Expenses</option>
                      <option value="Sundry Creditors">Sundry Creditors (Suppliers)</option>
                      <option value="Sundry Debtors">Sundry Debtors (Customers)</option>
                      <option value="Direct Expenses">Direct Expenses</option>
                      <option value="Bank Accounts">Bank Accounts</option>
                      <option value="Cash-in-hand">Cash-in-hand</option>
                      <option value="Duties & Taxes">Duties & Taxes</option>
                      <option value="Capital Account">Capital Account</option>
                    </>
                  )}
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-semibold rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleManualCreateLedger}
                disabled={!newLedgerName.trim() || actionLoading}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md shadow-xs disabled:opacity-50 cursor-pointer"
              >
                Create & Select
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
