import axios from 'axios';
import {
  DashboardSummary,
  BankTransaction,
  ImportBatch,
  TallyLedger,
  AuditLog,
  Company,
  FinancialYear,
  AccountGroupNode,
  LedgerItem,
  Party,
  Voucher,
  GeneralLedgerEntry,
  LedgerBalance,
  ReconciliationSummary
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to inject active Company ID and FY ID into request headers
apiClient.interceptors.request.use((config) => {
  const activeCompanyId = localStorage.getItem('tallypilot_active_company_id');
  const activeFyId = localStorage.getItem('tallypilot_active_fy_id');
  if (activeCompanyId) {
    config.headers['X-Company-Id'] = activeCompanyId;
  }
  if (activeFyId) {
    config.headers['X-Financial-Year-Id'] = activeFyId;
  }
  return config;
});

export const api = {
  // Companies & Financial Years CRUD
  getCompanies: () => apiClient.get<Company[]>('/companies').then(r => r.data),
  getCompany: (id: number) => apiClient.get<Company>(`/companies/${id}`).then(r => r.data),
  createCompany: (data: Partial<Company> & { name?: string }) => apiClient.post<{ message: string; company: Company }>('/companies', data).then(r => r.data),
  updateCompany: (id: number, data: Partial<Company>) => apiClient.put<{ message: string; company: Company }>(`/companies/${id}`, data).then(r => r.data),
  testCompanyTally: (id: number) => apiClient.post<{ connected: boolean; status: string; tally_url: string; message: string; response_time_ms?: number }>(`/companies/${id}/test-tally`).then(r => r.data),

  getFinancialYears: () => apiClient.get<FinancialYear[]>('/financial-years').then(r => r.data),
  createFinancialYear: (data: { fy_code: string; start_date: string; end_date: string; is_current?: boolean; is_closed?: boolean }) =>
    apiClient.post<{ message: string; financial_year: FinancialYear }>('/financial-years', data).then(r => r.data),
  setCurrentFinancialYear: (fy_id: number) => apiClient.put<{ message: string; fy_id: number; fy_code: string }>(`/financial-years/${fy_id}/set-current`).then(r => r.data),
  toggleFinancialYearLock: (fy_id: number, is_closed?: boolean) => apiClient.put<{ message: string; fy_id: number; is_closed: boolean }>(`/financial-years/${fy_id}/toggle-lock`, { is_closed }).then(r => r.data),

  // Chart of Accounts & Clean Ledgers
  getChartOfAccounts: () => apiClient.get<AccountGroupNode[]>('/chart-of-accounts').then(r => r.data),
  getChartLedgers: () => apiClient.get<LedgerItem[]>('/ledgers').then(r => r.data),
  getParties: (partyType?: string) => apiClient.get<Party[]>('/parties', { params: { party_type: partyType } }).then(r => r.data),

  // Double-Entry Vouchers
  getVouchers: (params?: { page?: number; limit?: number; voucher_type?: string; status?: string; search?: string }) =>
    apiClient.get<{ items: Voucher[]; total: number; page: number; limit: number }>('/vouchers', { params }).then(r => r.data),
  getVoucher: (id: number) => apiClient.get<Voucher>(`/vouchers/${id}`).then(r => r.data),
  createVoucher: (data: {
    voucher_type: string;
    voucher_date: string;
    narration: string;
    lines: Array<{ ledger_id: number; party_id?: number | null; debit_amount: number; credit_amount: number; narration?: string }>;
    bank_transaction_id?: number;
    auto_post?: boolean;
  }) => apiClient.post<{ message: string; voucher_id: number; voucher_number: string; status: string }>('/vouchers', data).then(r => r.data),
  postVoucher: (id: number) => apiClient.post<{ message: string; voucher_id: number; status: string }>(`/vouchers/${id}/post`).then(r => r.data),
  generateVoucherFromTx: (txId: number) => apiClient.post<{ message: string; voucher_id: number; voucher_number: string; status: string }>(`/vouchers/generate-from-transaction/${txId}`).then(r => r.data),

  // General Ledger & Balances
  getGLEntries: (params?: { ledger_id?: number; voucher_id?: number; from_date?: string; to_date?: string; page?: number; limit?: number }) =>
    apiClient.get<{ items: GeneralLedgerEntry[]; total: number; page: number; limit: number }>('/gl-entries', { params }).then(r => r.data),
  getLedgerBalances: () => apiClient.get<LedgerBalance[]>('/ledger-balances').then(r => r.data),

  // Bank Reconciliation
  getReconSummary: () => apiClient.get<ReconciliationSummary>('/reconciliation/summary').then(r => r.data),
  getReconUnmatched: () => apiClient.get<{ bank_transactions: any[]; voucher_lines: any[] }>('/reconciliation/unmatched').then(r => r.data),
  matchReconTransaction: (transaction_id: number, voucher_line_id: number) =>
    apiClient.post<{ message: string; transaction_id: number; reconciliation_status: string }>('/reconciliation/match', { transaction_id, voucher_line_id }).then(r => r.data),

  // Dashboard
  getDashboardSummary: () => apiClient.get<DashboardSummary>('/dashboard/summary').then(r => r.data),

  // Files
  uploadFile: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post<ImportBatch>('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(r => r.data);
  },
  uploadFiles: (files: File[]) => {
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    return apiClient.post<{
      batches: ImportBatch[];
      total_files: number;
      successful_count: number;
      failed_files: { filename: string; error: string }[];
    }>('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(r => r.data);
  },
  scanInputFolder: () => apiClient.post<ImportBatch[]>('/files/scan').then(r => r.data),
  getBatches: () => apiClient.get<ImportBatch[]>('/files/batches').then(r => r.data),

  // Transactions
  getTransactions: (params: {
    batch_id?: number;
    status?: string;
    search?: string;
    requires_review?: boolean;
    page?: number;
    page_size?: number;
  }) => apiClient.get<{ items: BankTransaction[]; total: number; page: number; total_pages: number }>('/transactions', { params }).then(r => r.data),

  getTransaction: (id: number) => apiClient.get<BankTransaction>(`/transactions/${id}`).then(r => r.data),

  clarifyTransaction: (id: number, data: {
    selected_ledger: string;
    corrected_voucher_type: string;
    corrected_transaction_type: string;
    reviewer_notes?: string;
  }) => apiClient.post<BankTransaction>(`/transactions/${id}/clarify`, data).then(r => r.data),

  approveTransaction: (id: number, data?: { approver_user?: string; approval_notes?: string }) =>
    apiClient.post<{ success: boolean; guid?: string; error?: string }>(`/transactions/${id}/approve`, data || {}).then(r => r.data),

  batchApprove: (transaction_ids: number[]) =>
    apiClient.post<{ results: Array<{ transaction_id: number; success: boolean; error?: string }> }>('/transactions/batch-approve', { transaction_ids }).then(r => r.data),

  skipTransaction: (id: number, reason: string) =>
    apiClient.post<BankTransaction>(`/transactions/${id}/skip`, { reason }).then(r => r.data),

  retryTransaction: (id: number) =>
    apiClient.post<BankTransaction>(`/transactions/${id}/retry`).then(r => r.data),

  // Tally
  getTallyHealth: () => apiClient.get('/tally/health').then(r => r.data),
  testTallyConnection: () => apiClient.post('/tally/test-connection').then(r => r.data),
  syncLedgers: () => apiClient.post<TallyLedger[]>('/tally/sync-ledgers').then(r => r.data),
  getLedgers: () => apiClient.get<TallyLedger[]>('/tally/ledgers').then(r => r.data),
  getTallyCachedLedgers: () => apiClient.get<TallyLedger[]>('/tally/ledgers').then(r => r.data),
  getSubmissions: () => apiClient.get<any[]>('/tally/submissions').then(r => r.data),

  // Audit Logs
  getAuditLogs: (params: { action?: string; transaction_id?: number; page?: number; page_size?: number }) =>
    apiClient.get<{ items: AuditLog[]; total: number; page: number }>('/logs', { params }).then(r => r.data),

  // Settings
  getSettings: () => apiClient.get<{ configurations: Record<string, string>; diagnostics: any }>('/settings').then(r => r.data),
  updateSettings: (settings: Record<string, string>) => apiClient.put('/settings', { settings }).then(r => r.data),

  // Financial Reports (HLA Part 10)
  getDayBook: (params?: { from_date?: string; to_date?: string; voucher_type?: string; ledger_id?: number }) =>
    apiClient.get<{ items: any[]; total_count: number; total_debit: number; total_credit: number }>('/reports/day-book', { params }).then(r => r.data),
  getTrialBalance: (params?: { as_of_date?: string }) =>
    apiClient.get<any>('/reports/trial-balance', { params }).then(r => r.data),
  getProfitLoss: (params?: { from_date?: string; to_date?: string }) =>
    apiClient.get<any>('/reports/profit-loss', { params }).then(r => r.data),
  getBalanceSheet: (params?: { as_of_date?: string }) =>
    apiClient.get<any>('/reports/balance-sheet', { params }).then(r => r.data),

  // AI Conversational Assistant (HLA Part 9 & 12)
  getAssistantSessions: () => apiClient.get<any[]>('/assistant/sessions').then(r => r.data),
  getAssistantHistory: (sessionId: number) => apiClient.get<any>(`/assistant/history/${sessionId}`).then(r => r.data),
  sendAssistantMessage: (data: { message: string; session_id?: number | null }) =>
    apiClient.post<{ session_id: number; reply: string; tool_calls?: any }>('/assistant/chat', data).then(r => r.data),
};
