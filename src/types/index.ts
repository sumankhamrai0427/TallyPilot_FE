export interface TransactionClassification {
  id: number;
  model_name: string;
  transaction_type: string;
  suggested_voucher_type: string;
  suggested_ledger: string | null;
  contra_ledger: string | null;
  confidence: number;
  explanation: string | null;
  ambiguity_reason: string | null;
  requires_human_review: boolean;
  is_fallback_rule: boolean;
  created_at: string;
}

export interface HumanReview {
  id: number;
  reviewer_user: string;
  corrected_transaction_type: string;
  corrected_voucher_type: string;
  selected_ledger: string;
  contra_ledger: string | null;
  reviewer_notes: string | null;
  resolution_action: string;
  created_at: string;
}

export interface BankTransaction {
  id: number;
  batch_id: number;
  source_row_index: number;
  transaction_date: string;
  value_date: string | null;
  bank_reference: string | null;
  cheque_number: string | null;
  narration: string;
  debit_amount: string | number;
  credit_amount: string | number;
  balance: string | number | null;
  status: 'RECEIVED' | 'PARSED' | 'CLASSIFIED' | 'NEEDS_CLARIFICATION' | 'VALIDATED' | 'PENDING_APPROVAL' | 'APPROVED' | 'SUBMITTING' | 'PROCESSED' | 'FAILED' | 'SKIPPED';
  requires_review: boolean;
  is_skipped: boolean;
  skip_reason: string | null;
  created_at: string;
  classification?: TransactionClassification;
  reviews?: HumanReview[];
}

export interface ImportBatch {
  id: number;
  batch_id: string;
  filename: string;
  file_size_bytes: number;
  total_rows: number;
  parsed_rows: number;
  failed_rows: number;
  status: string;
  error_message: string | null;
  created_at: string;
}

export interface TallyLedger {
  id: number;
  name: string;
  parent_group: string;
  is_active: boolean;
}

export interface AuditLog {
  id: number;
  timestamp: string;
  actor: string;
  action: string;
  batch_id: number | null;
  transaction_id: number | null;
  previous_status: string | null;
  new_status: string | null;
  summary: string;
  details?: Record<string, any>;
}

export interface DashboardSummary {
  total_transactions: number;
  processed_transactions: number;
  clarification_queue_count: number;
  approval_queue_count: number;
  failed_transactions: number;
  skipped_transactions: number;
  tally_connection_status: string;
  llm_connection_status: string;
  recent_batches: ImportBatch[];
  status_distribution: Record<string, number>;
}



// ============================================================================
// TallyPilot v2.0 Clean Architecture DTOs
// ============================================================================

export interface Company {
  id: number;
  company_code: string;
  company_name: string;
  currency: string;
  pan?: string | null;
  gstin?: string | null;
  financial_year_start_month?: number;
  tally_company_name?: string | null;
  tally_url?: string | null;
  default_bank_ledger?: string | null;
  tally_simulation_mode?: boolean;
  is_active?: boolean;
}

export interface FinancialYear {
  id: number;
  company_id: number;
  fy_code: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  is_closed: boolean;
}

export interface AccountGroupNode {
  id: number;
  name: string;
  code: string | null;
  group_type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';
  nature: 'DEBIT' | 'CREDIT';
  parent_id: number | null;
  children: AccountGroupNode[];
  ledgers: LedgerItem[];
}

export interface LedgerItem {
  id: number;
  name: string;
  code: string | null;
  group_id: number;
  group_name?: string;
  opening_balance: number;
  current_balance: number;
  is_bank_account?: boolean;
  is_active: boolean;
}

export interface Party {
  id: number;
  company_id: number;
  ledger_id: number;
  party_name: string;
  party_type: 'CUSTOMER' | 'VENDOR' | 'BOTH';
  gstin: string | null;
  pan: string | null;
  credit_limit: number;
  is_active: boolean;
}

export interface VoucherLineItem {
  id?: number;
  line_number: number;
  ledger_id: number;
  ledger_name?: string;
  party_id?: number | null;
  party_name?: string | null;
  debit_amount: number;
  credit_amount: number;
  narration?: string;
}

export interface Voucher {
  id: number;
  company_id: number;
  fy_id: number;
  voucher_number: string;
  voucher_type: 'Payment' | 'Receipt' | 'Contra' | 'Journal' | 'Sales' | 'Purchase';
  voucher_date: string;
  total_amount: number;
  narration: string;
  bank_transaction_id?: number | null;
  status: 'DRAFT' | 'APPROVED' | 'POSTED' | 'REVERSED' | 'CANCELLED';
  created_by: string;
  posted_at?: string | null;
  created_at?: string;
  lines: VoucherLineItem[];
  approvals?: any[];
}

export interface GeneralLedgerEntry {
  id: number;
  company_id: number;
  fy_id: number;
  voucher_id: number;
  voucher_number?: string;
  voucher_type?: string;
  posting_date: string;
  ledger_id: number;
  ledger_name: string;
  debit_amount: number;
  credit_amount: number;
  running_balance: number;
  is_reversed: boolean;
  created_at: string;
}

export interface LedgerBalance {
  ledger_id: number;
  ledger_name: string;
  total_debit: number;
  total_credit: number;
  net_balance: number;
  balance_nature: 'DR' | 'CR';
}

export interface BankAccountSummary {
  ledger_id: number;
  ledger_name: string;
  opening_balance: number;
  book_balance: number;
  current_balance: number;
}

export interface ReconciliationSummary {
  company_id: number;
  reconciled_transactions: number;
  unreconciled_transactions: number;
  partially_reconciled: number;
  bank_accounts: BankAccountSummary[];
}


// ============================================================================
// HLA Financial Reports & AI Assistant DTOs
// ============================================================================

export interface TrialBalanceItem {
  ledger_id: number;
  ledger_name: string;
  ledger_code: string | null;
  group_name: string;
  group_type: string;
  opening_debit: number;
  opening_credit: number;
  period_debit: number;
  period_credit: number;
  closing_debit: number;
  closing_credit: number;
}

export interface TrialBalanceResponse {
  items: TrialBalanceItem[];
  grand_opening_debit: number;
  grand_opening_credit: number;
  grand_period_debit: number;
  grand_period_credit: number;
  grand_closing_debit: number;
  grand_closing_credit: number;
  is_balanced: boolean;
  discrepancy: number;
}

export interface ProfitLossReport {
  income: {
    items: Array<{ ledger_id: number; ledger_name: string; group_name: string; amount: number }>;
    total: number;
  };
  expenses: {
    items: Array<{ ledger_id: number; ledger_name: string; group_name: string; amount: number }>;
    total: number;
  };
  net_profit_loss: number;
  status: 'PROFIT' | 'LOSS';
}

export interface BalanceSheetReport {
  assets: {
    items: Array<{ ledger_id: number; ledger_name: string; group_name: string; amount: number }>;
    total: number;
  };
  liabilities: {
    items: Array<{ ledger_id: number; ledger_name: string; group_name: string; amount: number }>;
    total: number;
  };
  equity: {
    items: Array<{ ledger_id: number; ledger_name: string; group_name: string; amount: number }>;
    total: number;
  };
  total_assets: number;
  total_liabilities_and_equity: number;
  is_balanced: boolean;
  discrepancy: number;
}

export interface DayBookItem {
  date: string;
  voucher_number: string;
  voucher_type: string;
  narration: string;
  line_number: number;
  ledger_id: number;
  ledger_name: string;
  debit_amount: number;
  credit_amount: number;
  status: string;
}

export interface ChatSessionItem {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessageItem {
  id: number;
  sender: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  tool_calls?: any;
  created_at: string;
}
