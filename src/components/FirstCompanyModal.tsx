import React, { useState } from 'react';
import { Building2, Landmark, Loader2, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';

interface FirstCompanyModalProps {
  onCompanyCreated: () => Promise<void>;
}

export const FirstCompanyModal: React.FC<FirstCompanyModalProps> = ({ onCompanyCreated }) => {
  const [name, setName] = useState('');
  const [bankLedger, setBankLedger] = useState('');
  const [gstin, setGstin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsSubmitting(true);
      setError(null);
      await api.createCompany({
        name: name.trim(),
        currency: 'INR',
        financial_year_start_month: 4,
        tally_company_name: name.trim(),
        tally_url: 'http://localhost:9000',
        default_bank_ledger: bankLedger.trim() || undefined,
        gstin: gstin.trim() || undefined,
        tally_simulation_mode: true,
        is_active: true
      });
      // Brief pause for visual feedback
      await new Promise((r) => setTimeout(r, 600));
      await onCompanyCreated();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create company. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8">
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Welcome to TallyPilot
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                <Sparkles className="w-3 h-3" /> Initial Setup
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              No active company found. Setup your first company to start automated accounting.
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Company Legal Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
              placeholder="e.g. Demo Company Pvt Ltd or Apex Retailers"
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white disabled:opacity-60"
            />
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              Should match your exact Company Name in Tally Prime.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Primary Bank Ledger <span className="text-slate-400 font-normal">(as in Tally)</span>
            </label>
            <div className="relative">
              <Landmark className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                value={bankLedger}
                onChange={(e) => setBankLedger(e.target.value)}
                disabled={isSubmitting}
                placeholder="e.g. State Bank of India, HDFC Bank, ICICI Bank"
                className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white disabled:opacity-60"
              />
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              No account numbers or sensitive credentials required.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              GSTIN <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <input
              type="text"
              value={gstin}
              onChange={(e) => setGstin(e.target.value.toUpperCase())}
              disabled={isSubmitting}
              placeholder="e.g. 19ABCDE1234F1Z5"
              maxLength={15}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white uppercase disabled:opacity-60"
            />
          </div>

          <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 rounded-xl flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-blue-800 dark:text-blue-300 leading-relaxed">
              Upon creation, the backend will automatically initialize standard Tally account groups (Bank, Cash, Debtors, Creditors, Expenses) and activate Current Financial Year.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !name.trim()}
            className="w-full mt-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Initializing Company & Chart of Accounts...</span>
              </>
            ) : (
              <>
                <span>Create Company & Launch</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

