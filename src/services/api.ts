import axios from 'axios';
import {
  DashboardSummary,
  BankTransaction,
  ImportBatch,
  TallyLedger,
  AuditLog
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const api = {
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
  getSubmissions: () => apiClient.get<any[]>('/tally/submissions').then(r => r.data),

  // Audit Logs
  getAuditLogs: (params: { action?: string; transaction_id?: number; page?: number; page_size?: number }) =>
    apiClient.get<{ items: AuditLog[]; total: number; page: number }>('/logs', { params }).then(r => r.data),

  // Settings
  getSettings: () => apiClient.get<{ configurations: Record<string, string>; diagnostics: any }>('/settings').then(r => r.data),
  updateSettings: (settings: Record<string, string>) => apiClient.put('/settings', { settings }).then(r => r.data),
};

