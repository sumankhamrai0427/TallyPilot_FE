import React, { useState, useEffect } from 'react';
import {
  Building2,
  Calendar,
  Plus,
  Edit2,
  Check,
  X,
  Server,
  Lock,
  Unlock,
  Radio,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Globe,
  Sliders,
  ShieldCheck,
  Clock
} from 'lucide-react';
import { api } from '../services/api';
import { Company, FinancialYear } from '../types';
import { useCompany } from '../context/CompanyContext';

export const CompanyMasterPage: React.FC = () => {
  const { refreshTenantData, setActiveCompany } = useCompany();
  const [activeTab, setActiveTab] = useState<'companies' | 'years'>('companies');

  // Companies state
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoadingCompanies, setIsLoadingCompanies] = useState<boolean>(true);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [showAddCompanyModal, setShowAddCompanyModal] = useState<boolean>(false);
  const [tallyTestResults, setTallyTestResults] = useState<Record<number, { testing: boolean; result?: any }>>({});

  // Financial Years state
  const [financialYears, setFinancialYears] = useState<FinancialYear[]>([]);
  const [isLoadingFys, setIsLoadingFys] = useState<boolean>(true);
  const [showAddFyModal, setShowAddFyModal] = useState<boolean>(false);

  // New Company Form state
  const [newCompany, setNewCompany] = useState({
    name: '',
    code: '',
    pan: '',
    gstin: '',
    currency: 'INR',
    financial_year_start_month: 4,
    tally_company_name: '',
    tally_url: 'http://localhost:9000',
    default_bank_ledger: 'HDFC Bank',
    tally_simulation_mode: true
  });

  // New FY Form state
  const [newFy, setNewFy] = useState({
    fy_code: '',
    start_date: '',
    end_date: '',
    is_current: false
  });

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Load Companies
  const loadCompanies = async () => {
    try {
      setIsLoadingCompanies(true);
      const data = await api.getCompanies();
      setCompanies(data);
    } catch (err: any) {
      showNotification('error', err.response?.data?.detail || 'Failed to load companies');
    } finally {
      setIsLoadingCompanies(false);
    }
  };

  // Load Financial Years
  const loadFinancialYears = async () => {
    try {
      setIsLoadingFys(true);
      const data = await api.getFinancialYears();
      setFinancialYears(data);
    } catch (err: any) {
      showNotification('error', err.response?.data?.detail || 'Failed to load financial years');
    } finally {
      setIsLoadingFys(false);
    }
  };

  useEffect(() => {
    loadCompanies();
    loadFinancialYears();
  }, []);

  // Test live connection to Tally for a company
  const handleTestTally = async (companyId: number) => {
    setTallyTestResults(prev => ({ ...prev, [companyId]: { testing: true } }));
    try {
      const res = await api.testCompanyTally(companyId);
      setTallyTestResults(prev => ({
        ...prev,
        [companyId]: { testing: false, result: res }
      }));
    } catch (err: any) {
      setTallyTestResults(prev => ({
        ...prev,
        [companyId]: {
          testing: false,
          result: { connected: false, message: err.response?.data?.detail || 'Connection test failed' }
        }
      }));
    }
  };

  // Handle Save Edited Company
  const handleSaveCompanyEdit = async (company: Company) => {
    try {
      await api.updateCompany(company.id, company);
      showNotification('success', `Company "${company.company_name}" credentials updated successfully!`);
      setEditingCompany(null);
      await loadCompanies();
      await refreshTenantData();
    } catch (err: any) {
      showNotification('error', err.response?.data?.detail || 'Failed to update company');
    }
  };

  // Handle Create Company
  const handleCreateCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompany.name.trim()) {
      showNotification('error', 'Company Legal Name is required');
      return;
    }
    try {
      await api.createCompany(newCompany);
      showNotification('success', `Company "${newCompany.name}" created successfully with default Chart of Accounts!`);
      setShowAddCompanyModal(false);
      setNewCompany({
        name: '',
        code: '',
        pan: '',
        gstin: '',
        currency: 'INR',
        financial_year_start_month: 4,
        tally_company_name: '',
        tally_url: 'http://localhost:9000',
        default_bank_ledger: 'HDFC Bank',
        tally_simulation_mode: true
      });
      await loadCompanies();
      await refreshTenantData();
    } catch (err: any) {
      showNotification('error', err.response?.data?.detail || 'Failed to create company');
    }
  };

  // Handle Create FY
  const handleCreateFySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFy.fy_code.trim() || !newFy.start_date || !newFy.end_date) {
      showNotification('error', 'FY Code, Start Date, and End Date are required');
      return;
    }
    try {
      await api.createFinancialYear(newFy);
      showNotification('success', `Financial Year "${newFy.fy_code}" created successfully!`);
      setShowAddFyModal(false);
      setNewFy({ fy_code: '', start_date: '', end_date: '', is_current: false });
      await loadFinancialYears();
      await refreshTenantData();
    } catch (err: any) {
      showNotification('error', err.response?.data?.detail || 'Failed to create financial year');
    }
  };

  // Handle Set Current FY
  const handleSetCurrentFy = async (fyId: number, fyCode: string) => {
    try {
      await api.setCurrentFinancialYear(fyId);
      showNotification('success', `Financial Year "${fyCode}" is now the active accounting year.`);
      await loadFinancialYears();
      await refreshTenantData();
    } catch (err: any) {
      showNotification('error', err.response?.data?.detail || 'Failed to set active FY');
    }
  };

  // Handle Toggle FY Lock (Closing Control)
  const handleToggleFyLock = async (fyId: number, currentClosed: boolean, fyCode: string) => {
    const confirmMsg = currentClosed
      ? `Are you sure you want to RE-OPEN ${fyCode}? New vouchers can then be posted.`
      : `Are you sure you want to LOCK / CLOSE ${fyCode}? No retrospective vouchers can be posted once locked.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await api.toggleFinancialYearLock(fyId, !currentClosed);
      showNotification('success', `Financial Year "${fyCode}" is now ${!currentClosed ? 'Locked / Closed' : 'Re-opened'}.`);
      await loadFinancialYears();
    } catch (err: any) {
      showNotification('error', err.response?.data?.detail || 'Failed to toggle lock status');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <span>Company Master & Accounting Years</span>
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage multi-company profiles, Tally Prime live connection credentials, and financial year audit locking controls (HLA Part 5).
          </p>
        </div>

        {/* Tab Navigation Pill */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('companies')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'companies'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Company Master ({companies.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('years')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'years'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Accounting Years ({financialYears.length})</span>
          </button>
        </div>
      </div>

      {/* Floating Notification */}
      {notification && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-xs font-semibold shadow-md transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: COMPANY MASTER */}
      {/* ========================================================================= */}
      {activeTab === 'companies' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white">Registered Companies</h3>
              <p className="text-xs text-slate-400">Configure legal details, GSTIN, and individual Tally Prime credentials.</p>
            </div>
            <button
              onClick={() => setShowAddCompanyModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Company</span>
            </button>
          </div>

          {isLoadingCompanies ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <i className="pi pi-spin pi-spinner text-2xl text-blue-600"></i>
              <span className="text-xs font-semibold">Loading companies from database...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {companies.map((comp) => {
                const isEditing = editingCompany?.id === comp.id;
                const testState = tallyTestResults[comp.id];

                return (
                  <div
                    key={comp.id}
                    className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs transition-colors space-y-5"
                  >
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold shadow-xs">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-bold text-slate-900 dark:text-white">
                              {comp.company_name}
                            </h4>
                            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                              {comp.company_code}
                            </span>
                            {comp.is_active ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                Active Tenant
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                Inactive
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Currency: <span className="font-semibold text-slate-700 dark:text-slate-300">{comp.currency}</span> &bull; FY Start Month: <span className="font-semibold text-slate-700 dark:text-slate-300">April</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <button
                          onClick={() => setActiveCompany(comp)}
                          className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        >
                          Select as Active
                        </button>
                        {!isEditing && (
                          <button
                            onClick={() => setEditingCompany({ ...comp })}
                            className="px-3 py-1.5 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Edit Credentials</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* View Mode vs Edit Mode */}
                    {isEditing ? (
                      <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-xl border border-blue-200 dark:border-blue-900/40 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                            <Sliders className="w-3.5 h-3.5" />
                            <span>Edit Credentials & Connection Parameters</span>
                          </span>
                          <button
                            onClick={() => setEditingCompany(null)}
                            className="text-slate-400 hover:text-slate-600 p-1"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                          <div>
                            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Company Legal Name</label>
                            <input
                              type="text"
                              value={editingCompany.company_name}
                              onChange={(e) => setEditingCompany({ ...editingCompany, company_name: e.target.value })}
                              className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">GSTIN</label>
                            <input
                              type="text"
                              value={editingCompany.gstin || ''}
                              onChange={(e) => setEditingCompany({ ...editingCompany, gstin: e.target.value })}
                              placeholder="29AAAAA0000A1Z5"
                              className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-mono uppercase"
                            />
                          </div>
                          <div>
                            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">PAN Number</label>
                            <input
                              type="text"
                              value={editingCompany.pan || ''}
                              onChange={(e) => setEditingCompany({ ...editingCompany, pan: e.target.value })}
                              placeholder="AAAAA0000A"
                              className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-mono uppercase"
                            />
                          </div>

                          <div>
                            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tally XML URL / Host</label>
                            <input
                              type="text"
                              value={editingCompany.tally_url || 'http://localhost:9000'}
                              onChange={(e) => setEditingCompany({ ...editingCompany, tally_url: e.target.value })}
                              placeholder="http://localhost:9000"
                              className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg font-mono"
                            />
                          </div>

                          <div>
                            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tally Company Name</label>
                            <input
                              type="text"
                              value={editingCompany.tally_company_name || ''}
                              onChange={(e) => setEditingCompany({ ...editingCompany, tally_company_name: e.target.value })}
                              placeholder="Exact name opened in Tally Prime"
                              className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                            />
                          </div>

                          <div>
                            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Default Bank Ledger</label>
                            <input
                              type="text"
                              value={editingCompany.default_bank_ledger || 'HDFC Bank'}
                              onChange={(e) => setEditingCompany({ ...editingCompany, default_bank_ledger: e.target.value })}
                              placeholder="HDFC Bank Current A/c"
                              className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                            <input
                              type="checkbox"
                              checked={editingCompany.tally_simulation_mode}
                              onChange={(e) => setEditingCompany({ ...editingCompany, tally_simulation_mode: e.target.checked })}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span>Enable Tally Simulation Mode (Simulate without active Tally Prime)</span>
                          </label>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingCompany(null)}
                              className="px-4 py-2 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-semibold"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveCompanyEdit(editingCompany)}
                              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Save Changes</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                        <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                          <span className="text-slate-400 block font-medium">GSTIN & PAN:</span>
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200 block truncate mt-0.5">
                            {comp.gstin || 'Not Configured'}
                          </span>
                          <span className="font-mono text-[11px] text-slate-500 block truncate">
                            PAN: {comp.pan || 'N/A'}
                          </span>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                          <span className="text-slate-400 block font-medium">Tally Target Company:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 block truncate mt-0.5">
                            {comp.tally_company_name || comp.company_name}
                          </span>
                          <span className="text-[11px] text-slate-500 block truncate font-mono">
                            {comp.tally_url || 'http://localhost:9000'}
                          </span>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                          <span className="text-slate-400 block font-medium">Default Bank Ledger:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 block truncate mt-0.5">
                            {comp.default_bank_ledger || 'HDFC Bank'}
                          </span>
                          <span className="text-[11px] text-slate-500 block truncate">
                            Mode: {comp.tally_simulation_mode ? 'Simulation Mode' : 'Live Tally Prime'}
                          </span>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 block font-medium">Connection Test:</span>
                            <button
                              onClick={() => handleTestTally(comp.id)}
                              disabled={testState?.testing}
                              className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              <RefreshCw className={`w-3 h-3 ${testState?.testing ? 'animate-spin' : ''}`} />
                              <span>{testState?.testing ? 'Pinging...' : 'Test Now'}</span>
                            </button>
                          </div>
                          
                          <div className="mt-1">
                            {testState?.result ? (
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                                  testState.result.connected
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                }`}
                                title={testState.result.message}
                              >
                                {testState.result.connected ? (
                                  <>
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>Connected ({testState.result.response_time_ms}ms)</span>
                                  </>
                                ) : (
                                  <>
                                    <AlertCircle className="w-3 h-3 text-rose-600" />
                                    <span>Tally Offline</span>
                                  </>
                                )}
                              </span>
                            ) : (
                              <span className="text-[11px] text-slate-400">Click Test to check live Tally ping</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ACCOUNTING YEARS */}
      {/* ========================================================================= */}
      {activeTab === 'years' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white">Accounting Years & Closing Controls</h3>
              <p className="text-xs text-slate-400">
                Manage financial periods, set active financial year, and lock closed years to prevent retrospective edits (HLA Part 5.2).
              </p>
            </div>
            <button
              onClick={() => setShowAddFyModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Financial Year</span>
            </button>
          </div>

          {isLoadingFys ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <i className="pi pi-spin pi-spinner text-2xl text-blue-600"></i>
              <span className="text-xs font-semibold">Loading financial years...</span>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px] bg-slate-50/50 dark:bg-slate-800/40">
                    <th className="py-3 px-4">Financial Year</th>
                    <th className="py-3 px-4">Start Date</th>
                    <th className="py-3 px-4">End Date</th>
                    <th className="py-3 px-4 text-center">Current Active FY</th>
                    <th className="py-3 px-4">Closing / Lock Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {financialYears.map((fy) => (
                    <tr
                      key={fy.id}
                      className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors ${
                        fy.is_current ? 'bg-blue-50/30 dark:bg-blue-950/20' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-sm">{fy.fy_code}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-mono">
                        {fy.start_date}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-mono">
                        {fy.end_date}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {fy.is_current ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            <Radio className="w-3 h-3 text-blue-600 animate-pulse" />
                            <span>Active / Current</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSetCurrentFy(fy.id, fy.fy_code)}
                            className="px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                          >
                            Set as Current
                          </button>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {fy.is_closed ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            <Lock className="w-3 h-3 text-amber-600" />
                            <span>Locked & Closed</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <Unlock className="w-3 h-3 text-emerald-600" />
                            <span>Open for Posting</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleToggleFyLock(fy.id, fy.is_closed, fy.fy_code)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center gap-1.5 ml-auto cursor-pointer ${
                            fy.is_closed
                              ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400'
                              : 'border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400'
                          }`}
                        >
                          {fy.is_closed ? (
                            <>
                              <Unlock className="w-3.5 h-3.5" />
                              <span>Re-open FY</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-3.5 h-3.5" />
                              <span>Lock Year (Audit)</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD NEW COMPANY */}
      {/* ========================================================================= */}
      {showAddCompanyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="font-bold text-base text-slate-800 dark:text-white">Create New Company</h3>
              </div>
              <button
                onClick={() => setShowAddCompanyModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCompanySubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Company Legal Name *</label>
                <input
                  type="text"
                  required
                  value={newCompany.name}
                  onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                  placeholder="e.g. Acme Corporation Pvt Ltd"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Company Code</label>
                  <input
                    type="text"
                    value={newCompany.code}
                    onChange={(e) => setNewCompany({ ...newCompany, code: e.target.value })}
                    placeholder="e.g. ACM-01"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Currency</label>
                  <input
                    type="text"
                    value={newCompany.currency}
                    onChange={(e) => setNewCompany({ ...newCompany, currency: e.target.value })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">GSTIN</label>
                  <input
                    type="text"
                    value={newCompany.gstin}
                    onChange={(e) => setNewCompany({ ...newCompany, gstin: e.target.value })}
                    placeholder="29AAAAA0000A1Z5"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">PAN Number</label>
                  <input
                    type="text"
                    value={newCompany.pan}
                    onChange={(e) => setNewCompany({ ...newCompany, pan: e.target.value })}
                    placeholder="AAAAA0000A"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono uppercase"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-3">
                <span className="font-bold text-blue-600 dark:text-blue-400 block text-[11px] uppercase tracking-wider">
                  Tally Prime Credentials
                </span>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tally URL / Host</label>
                  <input
                    type="text"
                    value={newCompany.tally_url}
                    onChange={(e) => setNewCompany({ ...newCompany, tally_url: e.target.value })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tally Company Name</label>
                  <input
                    type="text"
                    value={newCompany.tally_company_name}
                    onChange={(e) => setNewCompany({ ...newCompany, tally_company_name: e.target.value })}
                    placeholder="Name opened in Tally Prime"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddCompanyModal(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg font-semibold text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Create Company</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD NEW FINANCIAL YEAR */}
      {/* ========================================================================= */}
      {showAddFyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="font-bold text-base text-slate-800 dark:text-white">Add Financial Year</h3>
              </div>
              <button
                onClick={() => setShowAddFyModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFySubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Financial Year Code *</label>
                <input
                  type="text"
                  required
                  value={newFy.fy_code}
                  onChange={(e) => setNewFy({ ...newFy, fy_code: e.target.value })}
                  placeholder="e.g. FY 2027-28"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-100 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={newFy.start_date}
                    onChange={(e) => setNewFy({ ...newFy, start_date: e.target.value })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={newFy.end_date}
                    onChange={(e) => setNewFy({ ...newFy, end_date: e.target.value })}
                    className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={newFy.is_current}
                    onChange={(e) => setNewFy({ ...newFy, is_current: e.target.checked })}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Set as Active / Current Financial Year immediately</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddFyModal(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg font-semibold text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Create Financial Year</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

