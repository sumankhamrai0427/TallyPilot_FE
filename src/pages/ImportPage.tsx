import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  UploadCloud,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  FolderSync,
  X,
  FileUp,
  Files,
  Database,
  ArrowRight,
  Clock,
  CheckCheck,
  Sparkles,
  Check,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Landmark,
  Loader2
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useCompany } from '../context/CompanyContext';
import { api } from '../services/api';
import { ImportBatch, BankTransaction } from '../types';

const ALLOWED_EXTENSIONS = ['xlsx', 'xls', 'csv', 'pdf', 'txt'];

const formatINR = (val: number | string | null | undefined): string => {
  const num = Number(val || 0);
  if (num === 0) return '—';
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatAccountingDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d.getDate().toString().padStart(2, '0')}-${months[d.getMonth()]}-${d.getFullYear()}`;
  } catch {
    return dateStr;
  }
};

export const ImportPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeCompany } = useCompany();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStage, setUploadStage] = useState<string>('');
  const [isScanning, setIsScanning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadResults, setUploadResults] = useState<ImportBatch[]>([]);
  const [failedFiles, setFailedFiles] = useState<{ filename: string; error: string }[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Post-Ingestion Journal Summary Modal State
  const [summaryModalData, setSummaryModalData] = useState<{
    batch: ImportBatch;
    transactions: BankTransaction[];
  } | null>(null);
  const [modalFilter, setModalFilter] = useState<'all' | 'posted' | 'clarification'>('all');

  // Dedicated Duplicate Warning State
  const [duplicateWarning, setDuplicateWarning] = useState<{
    filename: string;
    message: string;
    batchId?: string;
  } | null>(null);

  // Persistent batches loaded from Database
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [isLoadingBatches, setIsLoadingBatches] = useState<boolean>(true);

  // Dynamic Bank Ledger selection state (Tally-compatible)
  const [bankLedgers, setBankLedgers] = useState<any[]>([]);
  const [selectedBankLedgerId, setSelectedBankLedgerId] = useState<number | null>(null);
  const [isLoadingBanks, setIsLoadingBanks] = useState<boolean>(false);
  const [showNewBankModal, setShowNewBankModal] = useState<boolean>(false);
  const [newBankName, setNewBankName] = useState<string>('');
  const [isCreatingBank, setIsCreatingBank] = useState<boolean>(false);
  const [bankSuccessNotice, setBankSuccessNotice] = useState<string | null>(null);

  const loadBankLedgers = async () => {
    try {
      setIsLoadingBanks(true);
      const data = await api.getBankLedgers();
      setBankLedgers(data || []);
      if (data && data.length > 0) {
        // Auto-select company default bank ledger if matches, otherwise first active bank
        const matched = data.find((b: any) => b.name === activeCompany?.default_bank_ledger) || data[0];
        setSelectedBankLedgerId(matched.id);
      } else {
        setSelectedBankLedgerId(null);
      }
    } catch (err) {
      console.error("Failed to load bank ledgers:", err);
    } finally {
      setIsLoadingBanks(false);
    }
  };

  const loadBatches = async () => {
    try {
      setIsLoadingBatches(true);
      const data = await api.getBatches();
      setBatches(data || []);
      if (data && data.length > 0) {
        setErrorMessage(null);
      }
    } catch (err: any) {
      console.error("Failed to load batches from database:", err);
    } finally {
      setIsLoadingBatches(false);
    }
  };

  // Load batches and bank ledgers when tenant company changes
  useEffect(() => {
    loadBatches();
    loadBankLedgers();
    setDuplicateWarning(null);
    setErrorMessage(null);
    setSelectedFiles([]);
    setUploadingFiles([]);
    setUploadResults([]);
  }, [activeCompany?.id]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileBadgeColor = (ext: string): string => {
    switch (ext) {
      case 'xlsx':
      case 'xls':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'csv':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'pdf':
        return 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      case 'txt':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  const validateAndAddFiles = (fileList: FileList | File[]) => {
    const newFiles: File[] = [];
    const rejectedNames: string[] = [];

    Array.from(fileList).forEach(file => {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      if (ALLOWED_EXTENSIONS.includes(ext)) {
        // Prevent duplicate selection in the same upload batch
        if (!selectedFiles.some(f => f.name === file.name && f.size === file.size)) {
          newFiles.push(file);
        }
      } else {
        rejectedNames.push(file.name);
      }
    });

    if (rejectedNames.length > 0) {
      setErrorMessage(`Unsupported file format for: ${rejectedNames.join(', ')}. Supported: .xlsx, .xls, .csv, .pdf, .txt`);
    } else {
      setErrorMessage(null);
    }

    if (newFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...newFiles]);
      setUploadResults([]);
      setFailedFiles([]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndAddFiles(e.target.files);
      e.target.value = ''; // Reset input to allow re-selecting same file if removed
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndAddFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleClearAll = () => {
    setSelectedFiles([]);
    setErrorMessage(null);
    setDuplicateWarning(null);
  };

  const handleViewDuplicateBatch = async (batchId?: string) => {
    if (!batchId) return;
    try {
      let targetBatch = batches.find(b => b.batch_id === batchId);
      if (!targetBatch) {
        const freshBatches = await api.getBatches();
        setBatches(freshBatches || []);
        targetBatch = freshBatches?.find(b => b.batch_id === batchId);
      }
      if (targetBatch) {
        const txRes = await api.getTransactions({ batch_id: targetBatch.id, page_size: 100 });
        setSummaryModalData({
          batch: targetBatch,
          transactions: txRes.items || []
        });
        setDuplicateWarning(null);
      } else {
        navigate(`/transactions?search=${batchId}`);
      }
    } catch (err) {
      console.error("Failed to load duplicate batch details:", err);
      navigate(`/transactions?search=${batchId}`);
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    const fileNames = selectedFiles.map(f => f.name);
    setUploadingFiles(fileNames);
    let progressInterval: any = null;
    try {
      setIsUploading(true);
      setUploadProgress(12);
      setUploadStage('Uploading statement file...');
      setErrorMessage(null);
      setDuplicateWarning(null);
      setUploadResults([]);
      setFailedFiles([]);

      // Start dynamic progress progression (accounting-friendly labels)
      progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev < 32) {
            setUploadStage('Uploading statement file...');
            return prev + 4;
          } else if (prev < 62) {
            setUploadStage('Reading statement transactions...');
            return prev + 3;
          } else if (prev < 84) {
            setUploadStage('Matching ledger accounts...');
            return prev + 2;
          } else if (prev < 94) {
            setUploadStage('Recording journal entries...');
            return prev + 1;
          }
          return 94;
        });
      }, 260);

      const res = await api.uploadFiles(selectedFiles, selectedBankLedgerId || undefined);

      // Check if file is duplicate (from HTTP 200 structured response)
      const dupFailure = res.failed_files?.find((f: any) => f.is_duplicate || f.error?.includes('Duplicate file'));
      if (res.is_duplicate || dupFailure) {
        if (progressInterval) clearInterval(progressInterval);
        setIsUploading(false);
        setUploadProgress(0);
        setUploadStage('');
        setUploadingFiles([]);

        const msg = dupFailure?.error || res.detail || "Duplicate file detected.";
        const batchMatch = msg.match(/batch '([^']+)'/);
        setDuplicateWarning({
          filename: dupFailure?.filename || fileNames[0] || 'Statement file',
          message: msg,
          batchId: batchMatch ? batchMatch[1] : undefined
        });
        setSelectedFiles([]);
        loadBatches();
        return;
      }

      if (progressInterval) clearInterval(progressInterval);
      setUploadProgress(100);
      setUploadStage('Completed 100%! All transactions processed and synced.');

      // Allow user to clearly see 100% completed status bar
      await new Promise(r => setTimeout(r, 650));

      let uploadedBatch: ImportBatch | null = null;
      if (res.batches && res.batches.length > 0) {
        setUploadResults(res.batches);
        uploadedBatch = res.batches[0];
      } else if ((res as any).batch_id) {
        const singleBatch = res as unknown as ImportBatch;
        setUploadResults([singleBatch]);
        uploadedBatch = singleBatch;
      }

      if (res.failed_files && res.failed_files.length > 0) {
        setFailedFiles(res.failed_files);
      }

      setSelectedFiles([]);
      setUploadingFiles([]);
      // Refresh persistent database batches list
      loadBatches();

      // Automatically open Post-Ingestion Journal Summary Modal
      if (uploadedBatch && uploadedBatch.id) {
        try {
          const txRes = await api.getTransactions({ batch_id: uploadedBatch.id, page_size: 100 });
          setSummaryModalData({
            batch: uploadedBatch,
            transactions: txRes.items || []
          });
        } catch (fetchErr) {
          console.error("Failed to load batch transactions for popup modal:", fetchErr);
        }
      }
    } catch (err: any) {
      if (progressInterval) clearInterval(progressInterval);
      const failed = err.response?.data?.failed_files || [];
      let detail = '';
      if (err.response?.data) {
        if (typeof err.response.data === 'string') {
          detail = err.response.data.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);
        } else {
          detail = err.response.data.detail || err.response.data.error || err.response.data.message || '';
        }
      }
      if (!detail && failed.length > 0 && failed[0]?.error) {
        detail = failed[0].error;
      }
      if (!detail) {
        detail = err.message || 'Failed to process bank statement(s)';
      }

      const dupFailure = failed.find((f: any) => f.is_duplicate || f.error?.includes('Duplicate file')) ||
        (detail.includes('Duplicate file') ? { filename: fileNames[0] || 'Statement file', error: detail } : null);

      if (dupFailure) {
        const batchMatch = dupFailure.error.match(/batch '([^']+)'/);
        setDuplicateWarning({
          filename: dupFailure.filename,
          message: dupFailure.error,
          batchId: batchMatch ? batchMatch[1] : undefined
        });
        setErrorMessage(null);
        setSelectedFiles([]);
        loadBatches();
      } else {
        setErrorMessage(detail);
      }
    } finally {
      if (progressInterval) clearInterval(progressInterval);
      setIsUploading(false);
      setUploadProgress(0);
      setUploadStage('');
      setUploadingFiles([]);
    }
  };

  const handleScanFolder = async () => {
    try {
      setIsScanning(true);
      setErrorMessage(null);
      const res = await api.scanInputFolder();
      if (res.length > 0) {
        setUploadResults(res);
        loadBatches();
        try {
          const firstBatch = res[0];
          const txRes = await api.getTransactions({ batch_id: firstBatch.id, page_size: 100 });
          setSummaryModalData({
            batch: firstBatch,
            transactions: txRes.items || []
          });
        } catch (fetchErr) {
          console.error("Failed to load scanned batch transactions:", fetchErr);
        }
      } else {
        setErrorMessage("No new statement files (.xlsx, .xls, .csv, .pdf, .txt) found in the ./input watcher directory.");
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || err.message || "Failed to scan folder");
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Import Bank Statements</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Upload single or multiple bank statements (.xlsx, .xls, .csv, .pdf, .txt) or scan the background input directory.
        </p>
      </div>

      {/* Target Bank Ledger Selection Card (Separate, on top of upload box) */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        {bankSuccessNotice && (
          <div className="flex items-center gap-2 p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs font-semibold text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{bankSuccessNotice}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <Landmark className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <label className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                  Target Bank Ledger <span className="text-xs font-normal text-slate-500">(as in Tally Prime)</span>
                </label>
              </div>
              {isLoadingBanks && (
                <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-medium">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                  <span>Loading banks...</span>
                </div>
              )}
            </div>
            <select
              value={selectedBankLedgerId || ''}
              onChange={(e) => setSelectedBankLedgerId(Number(e.target.value) || null)}
              disabled={isLoadingBanks}
              className="w-full text-xs sm:text-sm font-semibold px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
            >
              {bankLedgers.length === 0 ? (
                <option value="">No Bank Ledger found (Create one using + New Bank button)</option>
              ) : (
                bankLedgers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} (Current Balance: ₹{Number(b.current_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })})
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="sm:self-end">
            <button
              type="button"
              onClick={() => {
                setNewBankName('');
                setShowNewBankModal(true);
              }}
              className="w-full sm:w-auto px-4 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>New Bank</span>
            </button>
          </div>
        </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">
              Uploaded statement transactions and double-entry postings will be mapped against this bank ledger.
            </p>
          </div>

          {/* Upload Dropzone */}
          <div
            onDragOver={isUploading ? undefined : handleDragOver}
            onDragLeave={isUploading ? undefined : handleDragLeave}
            onDrop={isUploading ? undefined : handleDrop}
            className={`bg-white dark:bg-slate-900 p-8 rounded-xl border-2 border-dashed transition-all text-center shadow-xs ${isUploading
              ? 'border-blue-400 dark:border-blue-500 bg-blue-50/20 dark:bg-blue-950/10'
              : isDragging
                ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30'
                : 'border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400'
              }`}
          >
            {isUploading ? (
              /* Processing State: Direct Centered Spinner & Dynamic Progress (No inner box, no AI/LLM jargon) */
              <div className="py-6 px-4 max-w-md mx-auto flex flex-col items-center justify-center text-center space-y-4">
                {uploadProgress === 100 ? (
                  <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                    <Check className="w-8 h-8" />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center">
                    <i className="pi pi-spin pi-spinner text-blue-600 dark:text-blue-400" style={{ fontSize: '2.5rem' }}></i>
                  </div>
                )}

                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-white">
                    {uploadProgress === 100 ? 'Statement Processed Successfully' : 'Processing Bank Statement...'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-xs sm:max-w-sm mt-1 font-medium">
                    {(uploadingFiles.length > 0 ? uploadingFiles : selectedFiles.map(f => f.name)).join(', ')}
                  </p>
                </div>

                {/* Dynamic Progress Bar & Percentage */}
                <div className="w-full space-y-2 pt-1">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <span className="truncate max-w-[260px] text-slate-500 dark:text-slate-400 font-normal">
                      {uploadStage}
                    </span>
                    <span className="text-sm font-bold font-mono text-blue-600 dark:text-blue-400">
                      {uploadProgress}%
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200 dark:border-slate-700">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ease-out ${uploadProgress === 100
                        ? 'bg-emerald-500'
                        : 'bg-gradient-to-r from-blue-500 to-indigo-600'
                        }`}
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* Normal Dropzone Area */
              <>
                <div className="w-14 h-14 bg-blue-50 dark:bg-blue-950/60 rounded-full flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400 mb-4">
                  <UploadCloud className="w-7 h-7" />
                </div>

                <h3 className="text-base font-semibold text-slate-800 dark:text-white">
                  Select or drop your Bank Statement files
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 mb-5">
                  Supports CSV, Excel (.xlsx, .xls), PDF (.pdf) and TXT (.txt) up to 25MB each &bull; Multiple files supported
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <label className="cursor-pointer px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-lg transition-colors flex items-center gap-2">
                    <Files className="w-4 h-4 text-slate-500" />
                    <span>Browse Files</span>
                    <input
                      type="file"
                      multiple
                      accept=".xlsx,.xls,.csv,.pdf,.txt"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Selected Files List */}
                {selectedFiles.length > 0 && (
                  <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-5 text-left">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Selected Statements ({selectedFiles.length})
                      </span>
                      <button
                        type="button"
                        onClick={handleClearAll}
                        className="text-xs text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
                      >
                        Clear All
                      </button>
                    </div>

                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {selectedFiles.map((file, idx) => {
                        const ext = file.name.split('.').pop()?.toLowerCase() || '';
                        return (
                          <div
                            key={`${file.name}-${idx}`}
                            className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/80 text-xs transition-colors"
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] uppercase border ${getFileBadgeColor(ext)}`}>
                                {ext}
                              </span>
                              <span className="font-medium text-slate-800 dark:text-slate-200 truncate max-w-[280px] sm:max-w-md">
                                {file.name}
                              </span>
                              <span className="text-slate-400 dark:text-slate-500 text-[11px]">
                                ({formatFileSize(file.size)})
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveFile(idx)}
                              disabled={isUploading}
                              className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 transition-colors cursor-pointer"
                              title="Remove file"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {/* Upload Action Area */}
                    <div className="mt-5 flex justify-center">
                      <button
                        type="button"
                        onClick={handleUpload}
                        disabled={isUploading}
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
                      >
                        <FileUp className="w-4 h-4" />
                        <span>Parse & Ingest All ({selectedFiles.length})</span>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Input Watcher Folder Box */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
            <div>
              <div className="flex items-center gap-2">
                <FolderSync className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h4 className="font-semibold text-slate-800 dark:text-white text-sm">Company Folder Watcher</h4>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                  Company #{activeCompany?.id || 1} Isolated
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Monitoring directory <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300 font-mono">backend/storage/companies/{activeCompany?.id || 1}/input/</code> for {activeCompany?.company_name || 'active company'} statements (.xlsx, .xls, .csv, .pdf, .txt).
              </p>
            </div>

            <button
              onClick={handleScanFolder}
              disabled={isScanning || isUploading}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 self-start sm:self-auto disabled:opacity-50 cursor-pointer"
            >
              {isScanning ? (
                <i className="pi pi-spin pi-spinner" style={{ fontSize: '1rem' }}></i>
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              <span>Scan Folder Now</span>
            </button>
          </div>

          {/* Dedicated Duplicate File Warning Alert Card */}
          {duplicateWarning && (
            <div className="p-5 rounded-2xl bg-amber-50/90 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 shadow-sm space-y-3 animate-in fade-in duration-200">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 dark:bg-amber-500/25 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                        Duplicate Bank Statement Detected
                      </h4>
                      {duplicateWarning.batchId && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-200/80 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200">
                          {duplicateWarning.batchId}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-amber-800/90 dark:text-amber-300/90 mt-1">
                      {duplicateWarning.message}
                    </p>
                    <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-0.5">
                      File: <span className="font-semibold">{duplicateWarning.filename}</span> &bull; Identical statements are blocked to protect General Ledger double-entry integrity.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setDuplicateWarning(null)}
                  className="text-amber-500 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-200 p-1.5 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors cursor-pointer"
                  title="Dismiss warning"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2 pt-1 border-t border-amber-200/60 dark:border-amber-800/60">
                {duplicateWarning.batchId && (
                  <button
                    onClick={() => handleViewDuplicateBatch(duplicateWarning.batchId)}
                    className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>View Existing Journal Entries</span>
                  </button>
                )}
                <button
                  onClick={() => setDuplicateWarning(null)}
                  className="px-3.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-amber-100/60 dark:hover:bg-slate-700 text-amber-900 dark:text-amber-200 rounded-lg text-xs font-semibold border border-amber-300 dark:border-amber-700 transition-colors cursor-pointer"
                >
                  Choose Another File
                </button>
              </div>
            </div>
          )}

          {/* Error alert */}
          {errorMessage && (
            <div className="p-4 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 flex items-center justify-between gap-3 text-sm">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                <div>
                  <span className="font-semibold">Notice:</span> {errorMessage}
                </div>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-rose-500 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-200 p-1 cursor-pointer"
                title="Dismiss notice"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Failed Files Alert (Partial failures in multi-upload) */}
          {failedFiles.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-sm text-amber-800 dark:text-amber-300">
                <AlertCircle className="w-4 h-4" />
                <span>Some files could not be imported ({failedFiles.length}):</span>
              </div>
              <ul className="list-disc list-inside space-y-1 pl-1">
                {failedFiles.map((ff, idx) => (
                  <li key={idx}>
                    <span className="font-semibold">{ff.filename}:</span> {ff.error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Success Batches Results */}
          {uploadResults.length > 0 && (
            <div className="p-5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-base">
                  <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <span>{uploadResults.length} Statement Batch(es) Ingested Successfully!</span>
                </div>
                <div className="flex gap-3">
                  <a
                    href="/clarification"
                    className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
                  >
                    Clarification Queue &rarr;
                  </a>
                  <span className="text-emerald-400 dark:text-emerald-600">|</span>
                  <a
                    href="/transactions"
                    className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
                  >
                    Transactions &rarr;
                  </a>
                </div>
              </div>

              <div className="space-y-3">
                {uploadResults.map((batch) => (
                  <div
                    key={batch.id}
                    className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs bg-white/80 dark:bg-slate-900/70 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800/60 items-center"
                  >
                    <div>
                      <span className="text-emerald-700 dark:text-emerald-400 block font-medium">File Name:</span>
                      <span className="font-bold text-slate-800 dark:text-white truncate block max-w-[150px]" title={batch.filename}>
                        {batch.filename}
                      </span>
                    </div>
                    <div>
                      <span className="text-emerald-700 dark:text-emerald-400 block font-medium">Batch ID:</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-white">{batch.batch_id}</span>
                    </div>
                    <div>
                      <span className="text-emerald-700 dark:text-emerald-400 block font-medium">Total Rows:</span>
                      <span className="font-bold text-slate-800 dark:text-white">{batch.total_rows}</span>
                    </div>
                    <div>
                      <span className="text-emerald-700 dark:text-emerald-400 block font-medium">Valid Parsed:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{batch.parsed_rows}</span>
                    </div>
                    <div>
                      <span className="text-emerald-700 dark:text-emerald-400 block font-medium">Status:</span>
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        {batch.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Persistent Documents & Batches In Database */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                    Imported Documents & Statement Batches
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    All statement files ingested and stored for <span className="font-semibold text-slate-600 dark:text-slate-300">{activeCompany?.company_name || 'the active company'}</span>.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={loadBatches}
                  disabled={isLoadingBatches}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBatches ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
                <Link
                  to="/transactions"
                  className="px-3 py-1.5 text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-lg transition-colors flex items-center gap-1.5 border border-blue-200 dark:border-blue-800 cursor-pointer"
                >
                  <span>Transaction Review</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {isLoadingBatches ? (
              <div className="py-16 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 gap-3">
                <i className="pi pi-spin pi-spinner text-blue-600 dark:text-blue-400" style={{ fontSize: '2rem' }}></i>
                <span className="text-xs font-medium">Loading imported statement batches...</span>
              </div>
            ) : batches.length === 0 ? (
              <div className="py-10 text-center text-slate-400 dark:text-slate-500 text-xs">
                <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <span>No statements imported yet for {activeCompany?.company_name || 'this company'}. Upload a statement file above.</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[11px] bg-slate-50/50 dark:bg-slate-800/40">
                      <th className="py-2.5 px-3">Batch ID</th>
                      <th className="py-2.5 px-3">Source File</th>
                      <th className="py-2.5 px-3 text-center">Total Rows</th>
                      <th className="py-2.5 px-3 text-center">Valid Parsed</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Import Date</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {batches.map((batch) => {
                      const ext = batch.filename.split('.').pop()?.toLowerCase() || '';
                      return (
                        <tr
                          key={batch.id}
                          className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3 px-3">
                            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                              {batch.batch_id}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <span className={`px-1.5 py-0.5 rounded font-mono font-bold text-[10px] uppercase border ${getFileBadgeColor(ext)}`}>
                                {ext || 'FILE'}
                              </span>
                              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px]" title={batch.filename}>
                                {batch.filename}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center font-medium text-slate-600 dark:text-slate-400">
                            {batch.total_rows}
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                            {batch.parsed_rows}
                          </td>
                          <td className="py-3 px-3">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${batch.status === 'COMPLETED'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : batch.status === 'FAILED'
                                ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                                : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 animate-pulse'
                              }`}>
                              {batch.status === 'COMPLETED' && <CheckCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />}
                              {batch.status === 'PROCESSING' && <i className="pi pi-spin pi-spinner text-[10px] text-blue-600 dark:text-blue-400"></i>}
                              {batch.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 text-[11px]">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>{batch.created_at ? new Date(batch.created_at).toLocaleString() : 'N/A'}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={async () => {
                                  try {
                                    const txRes = await api.getTransactions({ batch_id: batch.id, page_size: 100 });
                                    setSummaryModalData({
                                      batch,
                                      transactions: txRes.items || []
                                    });
                                  } catch (err) {
                                    console.error("Failed to load batch summary:", err);
                                  }
                                }}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline cursor-pointer"
                                title="View Journal Entries and Ingestion Summary"
                              >
                                <BookOpen className="w-3.5 h-3.5" />
                                <span>View Journal</span>
                              </button>
                              <span className="text-slate-300 dark:text-slate-700">|</span>
                              <Link
                                to={`/transactions?batch_id=${batch.id}`}
                                className="inline-flex items-center gap-0.5 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                                title="Open in All Transactions Feed"
                              >
                                <span>Feed</span>
                                <ArrowRight className="w-3 h-3" />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Post-Ingestion Journal Review Modal (Rendered via createPortal to document.body) */}
          {summaryModalData && createPortal(
            <div
              className="fixed inset-0 bg-slate-950/45 backdrop-blur-sm z-[100] flex items-center justify-center p-3 sm:p-6"
              onClick={() => setSummaryModalData(null)}
            >
              <div
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-shrink-0 bg-slate-50/70 dark:bg-slate-800/40">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          Journal Entries & Ingestion Summary
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                          {summaryModalData.batch.batch_id}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        File: <span className="font-semibold text-slate-700 dark:text-slate-200">{summaryModalData.batch.filename}</span> &bull; {summaryModalData.transactions.length} transactions processed
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setSummaryModalData(null)}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Quick KPI Cards & Table */}
                {(() => {
                  const txs = summaryModalData.transactions;
                  const totalCount = txs.length;
                  const postedCount = txs.filter(t => t.status === 'PROCESSED' || t.status === 'APPROVED').length;
                  const clarificationCount = txs.filter(t => t.status === 'NEEDS_CLARIFICATION').length;
                  const totalDebit = txs.reduce((acc, t) => acc + Number(t.debit_amount || 0), 0);
                  const totalCredit = txs.reduce((acc, t) => acc + Number(t.credit_amount || 0), 0);

                  return (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/40 flex-shrink-0">
                        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
                          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-semibold">
                            <span>Total Transactions</span>
                            <FileSpreadsheet className="w-4 h-4 text-blue-500" />
                          </div>
                          <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-slate-900 dark:text-white font-mono">{totalCount}</span>
                            <span className="text-xs text-slate-400">rows parsed</span>
                          </div>
                          <div className="mt-1 text-[11px] text-slate-400 truncate">
                            Debit: {formatINR(totalDebit)} &bull; Credit: {formatINR(totalCredit)}
                          </div>
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-emerald-200/80 dark:border-emerald-800/80 shadow-2xs">
                          <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                            <span>Auto-Approved & Posted</span>
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          </div>
                          <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">{postedCount}</span>
                            <span className="text-xs text-emerald-500/80">vouchers created</span>
                          </div>
                          <div className="mt-1 text-[11px] text-emerald-600/70 dark:text-emerald-400/70">
                            Recorded in General Ledger & Tally
                          </div>
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-amber-200/80 dark:border-amber-800/80 shadow-2xs">
                          <div className="flex items-center justify-between text-xs text-amber-600 dark:text-amber-400 font-semibold">
                            <span>Requires Clarification</span>
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                          </div>
                          <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-2xl font-bold text-amber-600 dark:text-amber-400 font-mono">{clarificationCount}</span>
                            <span className="text-xs text-amber-500/80">needing review</span>
                          </div>
                          <div className="mt-1 text-[11px] text-amber-600/70 dark:text-amber-400/70">
                            Ambiguous narration or verification
                          </div>
                        </div>
                      </div>

                      {/* Filter Tabs Toolbar */}
                      <div className="flex items-center justify-between px-5 py-2.5 bg-slate-50/60 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setModalFilter('all')}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${modalFilter === 'all'
                              ? 'bg-blue-600 text-white shadow-2xs'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                              }`}
                          >
                            All Entries ({totalCount})
                          </button>
                          <button
                            type="button"
                            onClick={() => setModalFilter('posted')}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${modalFilter === 'posted'
                              ? 'bg-emerald-600 text-white shadow-2xs'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                              }`}
                          >
                            Posted Double-Entries ({postedCount})
                          </button>
                          <button
                            type="button"
                            onClick={() => setModalFilter('clarification')}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${modalFilter === 'clarification'
                              ? 'bg-amber-600 text-white shadow-2xs'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                              }`}
                          >
                            Needs Clarification ({clarificationCount})
                          </button>
                        </div>

                        <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium hidden sm:inline">
                          Double-entry accounting journal ledger view
                        </span>
                      </div>

                      {/* Scrollable True Double-Entry Journal Table */}
                      <div className="overflow-y-auto flex-1 p-5">
                        {(() => {
                          interface JournalRow {
                            key: string;
                            postDate: string;
                            voucherNumber: string;
                            voucherType?: string;
                            ledgerAccount: string;
                            debitAmount: number;
                            creditAmount: number;
                            status: 'POSTED' | 'NEED CLARIFICATION';
                            narration?: string;
                            txId: number;
                            isPairStart?: boolean;
                          }

                          const rows: JournalRow[] = [];

                          txs.forEach((tx) => {
                            const isPosted = tx.status === 'PROCESSED' || tx.status === 'APPROVED';
                            const postDate = formatAccountingDate(tx.transaction_date);

                            if (isPosted) {
                              if (modalFilter === 'clarification') return;

                              const rawType = (tx.classification?.suggested_voucher_type || '').toLowerCase();
                              const isPayment = Number(tx.debit_amount) > 0;
                              const isReceipt = Number(tx.credit_amount) > 0;
                              const amount = isPayment ? Number(tx.debit_amount) : Number(tx.credit_amount);
                              const vType = rawType.includes('contra') ? 'Contra' : (isPayment ? 'Payment' : 'Receipt');

                              let defaultPrefix = isPayment ? 'PV' : (isReceipt ? 'RV' : 'CV');
                              if (vType === 'Contra') defaultPrefix = 'CV';
                              const vNum = tx.voucher_number || `${defaultPrefix}-${String(tx.id).padStart(4, '0')}`;
                              const activeBankObj = selectedBankLedgerId ? bankLedgers.find(b => b.id === selectedBankLedgerId) : null;
                              const bankLedger = tx.bank_ledger_name || activeBankObj?.name || activeCompany?.default_bank_ledger || 'Bank Account';
                              const partyLedger = tx.classification?.suggested_ledger || (vType === 'Contra' ? 'Cash' : (isPayment ? 'Direct Expenses' : 'Sales Accounts'));

                              if (vType === 'Contra') {
                                if (isPayment) {
                                  rows.push({
                                    key: `tx-${tx.id}-line-1`,
                                    postDate,
                                    voucherNumber: vNum,
                                    voucherType: vType,
                                    ledgerAccount: bankLedger,
                                    debitAmount: 0,
                                    creditAmount: amount,
                                    status: 'POSTED',
                                    txId: tx.id,
                                    isPairStart: true
                                  });
                                  rows.push({
                                    key: `tx-${tx.id}-line-2`,
                                    postDate,
                                    voucherNumber: vNum,
                                    voucherType: vType,
                                    ledgerAccount: partyLedger,
                                    debitAmount: amount,
                                    creditAmount: 0,
                                    status: 'POSTED',
                                    txId: tx.id,
                                    isPairStart: false
                                  });
                                } else {
                                  rows.push({
                                    key: `tx-${tx.id}-line-1`,
                                    postDate,
                                    voucherNumber: vNum,
                                    voucherType: vType,
                                    ledgerAccount: partyLedger,
                                    debitAmount: 0,
                                    creditAmount: amount,
                                    status: 'POSTED',
                                    txId: tx.id,
                                    isPairStart: true
                                  });
                                  rows.push({
                                    key: `tx-${tx.id}-line-2`,
                                    postDate,
                                    voucherNumber: vNum,
                                    voucherType: vType,
                                    ledgerAccount: bankLedger,
                                    debitAmount: amount,
                                    creditAmount: 0,
                                    status: 'POSTED',
                                    txId: tx.id,
                                    isPairStart: false
                                  });
                                }
                              } else if (isPayment) {
                                rows.push({
                                  key: `tx-${tx.id}-line-1`,
                                  postDate,
                                  voucherNumber: vNum,
                                  voucherType: vType,
                                  ledgerAccount: bankLedger,
                                  debitAmount: 0,
                                  creditAmount: amount,
                                  status: 'POSTED',
                                  txId: tx.id,
                                  isPairStart: true
                                });
                                rows.push({
                                  key: `tx-${tx.id}-line-2`,
                                  postDate,
                                  voucherNumber: vNum,
                                  voucherType: vType,
                                  ledgerAccount: partyLedger,
                                  debitAmount: amount,
                                  creditAmount: 0,
                                  status: 'POSTED',
                                  txId: tx.id,
                                  isPairStart: false
                                });
                              } else {
                                rows.push({
                                  key: `tx-${tx.id}-line-1`,
                                  postDate,
                                  voucherNumber: vNum,
                                  voucherType: vType,
                                  ledgerAccount: partyLedger,
                                  debitAmount: 0,
                                  creditAmount: amount,
                                  status: 'POSTED',
                                  txId: tx.id,
                                  isPairStart: true
                                });
                                rows.push({
                                  key: `tx-${tx.id}-line-2`,
                                  postDate,
                                  voucherNumber: vNum,
                                  voucherType: vType,
                                  ledgerAccount: bankLedger,
                                  debitAmount: amount,
                                  creditAmount: 0,
                                  status: 'POSTED',
                                  txId: tx.id,
                                  isPairStart: false
                                });
                              }
                            } else {
                              if (modalFilter === 'posted') return;

                              const dr = Number(tx.debit_amount || 0);
                              const cr = Number(tx.credit_amount || 0);
                              let suggested = tx.classification?.suggested_ledger || 'Unassigned / Needs Review';
                              if (tx.classification?.requires_new_ledger && tx.classification.suggested_ledger) {
                                suggested = `${tx.classification.suggested_ledger} (Proposed: ${tx.classification.suggested_group_name || 'Indirect Expenses'})`;
                              }
                              rows.push({
                                key: `tx-${tx.id}-clarify`,
                                postDate,
                                voucherNumber: 'PENDING',
                                ledgerAccount: suggested,
                                debitAmount: dr,
                                creditAmount: cr,
                                status: 'NEED CLARIFICATION',
                                narration: tx.narration,
                                txId: tx.id,
                                isPairStart: true
                              });
                            }
                          });

                          if (rows.length === 0) {
                            return (
                              <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs">
                                No entries found for the selected filter tab ({modalFilter}).
                              </div>
                            );
                          }

                          return (
                            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs">
                              <table className="w-full text-left text-xs border-collapse">
                                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider text-[11px] border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                                  <tr>
                                    <th className="px-5 py-3">Post Date</th>
                                    <th className="px-5 py-3">Voucher</th>
                                    <th className="px-5 py-3">Ledger Account</th>
                                    <th className="px-5 py-3 text-right text-emerald-600 dark:text-emerald-400 font-bold">Debit (₹)</th>
                                    <th className="px-5 py-3 text-right text-blue-600 dark:text-blue-400 font-bold">Credit (₹)</th>
                                    <th className="px-5 py-3 text-center">Status</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900 font-mono">
                                  {rows.map((row) => (
                                    <tr
                                      key={row.key}
                                      className={`transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/50 ${row.isPairStart ? 'border-t-2 border-slate-100 dark:border-slate-800/90' : ''
                                        } ${row.status === 'NEED CLARIFICATION'
                                          ? 'bg-amber-50/30 dark:bg-amber-950/20'
                                          : ''
                                        }`}
                                    >
                                      <td className="px-5 py-3 font-sans text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                        {row.postDate}
                                      </td>
                                      <td className="px-5 py-3 font-sans font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                                        {row.voucherNumber === 'PENDING' ? (
                                          <span className="font-mono text-[10px] text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/80 px-2 py-0.5 rounded font-bold border border-amber-300 dark:border-amber-700">
                                            PENDING
                                          </span>
                                        ) : (
                                          <span className="font-mono text-slate-800 dark:text-slate-100 font-bold tracking-tight">
                                            {row.voucherNumber}
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-5 py-3 font-sans text-slate-800 dark:text-slate-200">
                                        <div className="font-semibold text-slate-900 dark:text-white">
                                          {row.ledgerAccount}
                                        </div>
                                        {row.narration && (
                                          <div
                                            className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-sm mt-0.5 font-normal"
                                            title={row.narration}
                                          >
                                            {row.narration}
                                          </div>
                                        )}
                                      </td>
                                      <td className="px-5 py-3 text-right font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                                        {row.debitAmount > 0
                                          ? `₹${row.debitAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                          : '—'}
                                      </td>
                                      <td className="px-5 py-3 text-right font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                                        {row.creditAmount > 0
                                          ? `₹${row.creditAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                          : '—'}
                                      </td>
                                      <td className="px-5 py-3 text-center font-sans whitespace-nowrap">
                                        {row.status === 'POSTED' ? (
                                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                            <span>POSTED</span>
                                          </span>
                                        ) : (
                                          <div className="flex items-center justify-center gap-2">
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                              <AlertTriangle className="w-3 h-3 text-amber-500" />
                                              <span>NEED CLARIFICATION</span>
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setSummaryModalData(null);
                                                navigate(`/review?search=${row.txId}`);
                                              }}
                                              className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-[10px] font-bold transition-colors cursor-pointer shadow-2xs"
                                              title="Open in Clarification Queue to resolve"
                                            >
                                              Resolve
                                            </button>
                                          </div>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Modal Footer with Actions */}
                      <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between flex-shrink-0 bg-slate-50/70 dark:bg-slate-800/40">
                        <button
                          onClick={() => setSummaryModalData(null)}
                          className="px-4 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                        >
                          Close
                        </button>

                        <div className="flex items-center gap-3">
                          {clarificationCount > 0 && (
                            <button
                              onClick={() => {
                                setSummaryModalData(null);
                                navigate('/review');
                              }}
                              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                            >
                              <AlertTriangle className="w-4 h-4" />
                              <span>Resolve Clarifications ({clarificationCount})</span>
                            </button>
                          )}

                          <button
                            onClick={() => {
                              setSummaryModalData(null);
                              navigate('/vouchers');
                            }}
                            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                          >
                            <BookOpen className="w-4 h-4 text-emerald-300" />
                            <span>Go to Vouchers Journal</span>
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>,
            document.body
          )}

      {/* Modal: Add New Bank Ledger (Tally-compatible) */}
      {showNewBankModal && createPortal(
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-xs"
          onClick={() => !isCreatingBank && setShowNewBankModal(false)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-50 dark:bg-blue-950/50 rounded-lg text-blue-600 dark:text-blue-400">
                  <Landmark className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Add Bank Ledger (Tally Native)
                </h3>
              </div>
              <button
                type="button"
                disabled={isCreatingBank}
                onClick={() => setShowNewBankModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg disabled:opacity-30"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const bankName = newBankName.trim();
                if (!bankName) return;
                try {
                  setIsCreatingBank(true);
                  const res = await api.createLedger({
                    name: bankName,
                    group_name: 'Bank Accounts'
                  });
                  // Brief pause (500ms) so user gets visible feedback of creation and verification
                  await new Promise((resolve) => setTimeout(resolve, 500));
                  const freshBanks = await api.getBankLedgers();
                  setBankLedgers(freshBanks || []);
                  if (res && res.id) {
                    setSelectedBankLedgerId(res.id);
                  } else if (freshBanks && freshBanks.length > 0) {
                    const targetLedger = freshBanks.find((b: any) => b.name?.toLowerCase() === bankName.toLowerCase());
                    if (targetLedger) setSelectedBankLedgerId(targetLedger.id);
                  }
                  setShowNewBankModal(false);
                  setNewBankName('');
                  setBankSuccessNotice(`Bank Ledger "${bankName}" created successfully and selected for import.`);
                  setTimeout(() => setBankSuccessNotice(null), 5000);
                } catch (err: any) {
                  alert(err.response?.data?.detail || 'Failed to create bank ledger');
                } finally {
                  setIsCreatingBank(false);
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Bank Ledger Name (as in Tally Prime):
                </label>
                <input
                  type="text"
                  value={newBankName}
                  onChange={(e) => setNewBankName(e.target.value)}
                  disabled={isCreatingBank}
                  placeholder="e.g. State Bank of India, ICICI Bank, or Axis Bank"
                  required
                  autoFocus
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-900 dark:text-white disabled:opacity-60"
                />
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5 leading-relaxed">
                  This creates a Ledger under 'Bank Accounts' for <strong>{activeCompany?.company_name || 'this company'}</strong>. No account number or IFSC is needed.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  disabled={isCreatingBank}
                  onClick={() => setShowNewBankModal(false)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingBank || !newBankName.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-2"
                >
                  {isCreatingBank ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                      <span>Creating Bank Ledger...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Save & Select Bank</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};