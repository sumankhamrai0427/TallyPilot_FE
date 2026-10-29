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

