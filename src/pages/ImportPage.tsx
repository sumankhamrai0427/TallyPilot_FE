import React, { useState, useEffect } from 'react';
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
  CheckCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { ImportBatch } from '../types';

const ALLOWED_EXTENSIONS = ['xlsx', 'xls', 'csv', 'pdf', 'txt'];

export const ImportPage: React.FC = () => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadResults, setUploadResults] = useState<ImportBatch[]>([]);
  const [failedFiles, setFailedFiles] = useState<{ filename: string; error: string }[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Persistent batches loaded from Database
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [isLoadingBatches, setIsLoadingBatches] = useState<boolean>(true);

  const loadBatches = async () => {
    try {
      setIsLoadingBatches(true);
      const data = await api.getBatches();
      setBatches(data || []);
    } catch (err: any) {
      console.error("Failed to load batches from database:", err);
    } finally {
      setIsLoadingBatches(false);
    }
  };

  useEffect(() => {
    loadBatches();
  }, []);

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
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    try {
      setIsUploading(true);
      setErrorMessage(null);
      setUploadResults([]);
      setFailedFiles([]);

      const res = await api.uploadFiles(selectedFiles);

      if (res.batches && res.batches.length > 0) {
        setUploadResults(res.batches);
      } else if ((res as any).batch_id) {
        // Backward compatibility if single object returned
        setUploadResults([res as unknown as ImportBatch]);
      }

      if (res.failed_files && res.failed_files.length > 0) {
        setFailedFiles(res.failed_files);
      }

      setSelectedFiles([]);
      // Refresh persistent database batches list
      loadBatches();
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || err.message || "Failed to process bank statement(s)");
    } finally {
      setIsUploading(false);
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

      {/* Upload Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`bg-white dark:bg-slate-900 p-8 rounded-xl border-2 border-dashed transition-all text-center shadow-xs ${
          isDragging
            ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30'
            : 'border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400'
        }`}
      >
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

            {/* Upload Action Area with requested PrimeIcons spinner */}
            <div className="mt-5 flex flex-col items-center justify-center gap-3">
              {isUploading ? (
                <div className="flex flex-col items-center justify-center py-3 text-blue-600 dark:text-blue-400 gap-2">
                  <i className="pi pi-spin pi-spinner" style={{ fontSize: '2rem' }}></i>
                  <span className="text-sm font-semibold animate-pulse">
                    Parsing & Ingesting {selectedFiles.length} statement(s) with Local AI...
                  </span>
                </div>
              ) : (
                <button
                  onClick={handleUpload}
                  disabled={isUploading}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 shadow-sm cursor-pointer"
                >
                  <FileUp className="w-4 h-4" />
                  <span>Parse & Ingest All ({selectedFiles.length})</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Input Watcher Folder Box */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-2">
            <FolderSync className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h4 className="font-semibold text-slate-800 dark:text-white text-sm">Background Folder Watcher</h4>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Monitoring directory <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300 font-mono">./input</code> for new statements (.xlsx, .xls, .csv, .pdf, .txt).
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

      {/* Error alert */}
      {errorMessage && (
        <div className="p-4 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 flex items-start gap-3 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Notice:</span> {errorMessage}
          </div>
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
                All statement files ingested and stored in the database.
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
          <div className="py-8 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 gap-2">
            <i className="pi pi-spin pi-spinner text-xl text-blue-600 dark:text-blue-400"></i>
            <span className="text-xs">Loading imported statement batches...</span>
          </div>
        ) : batches.length === 0 ? (
          <div className="py-10 text-center text-slate-400 dark:text-slate-500 text-xs">
            <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <span>No statements imported yet. Upload a statement file above or scan the ./input directory.</span>
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
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                          batch.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                            : batch.status === 'FAILED'
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                            : 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                        }`}>
                          {batch.status === 'COMPLETED' && <CheckCheck className="w-3 h-3" />}
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
                        <Link
                          to={`/transactions?batch_id=${batch.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline"
                        >
                          <span>Review</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};