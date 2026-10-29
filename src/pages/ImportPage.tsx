import React, { useState } from 'react';
import { UploadCloud, FileSpreadsheet, RefreshCw, AlertCircle, CheckCircle, FolderSync } from 'lucide-react';
import { api } from '../services/api';
import { ImportBatch } from '../types';

export const ImportPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [uploadResult, setUploadResult] = useState<ImportBatch | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext !== 'xlsx' && ext !== 'xls') {
        setErrorMessage("Unsupported file format. Please upload an Excel (.xlsx or .xls) file.");
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setErrorMessage(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    try {
      setIsUploading(true);
      setErrorMessage(null);
      setUploadResult(null);
      const res = await api.uploadFile(selectedFile);
      setUploadResult(res);
      setSelectedFile(null);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.detail || err.message || "Failed to process bank statement");
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
        setUploadResult(res[0]);
      } else {
        setErrorMessage("No new Excel files found in the ./input watcher directory.");
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
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Import Bank Statement</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Upload an Excel bank statement (.xlsx or .xls) or trigger the input folder watcher to ingest transactions.
        </p>
      </div>

      {/* Upload Box */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 transition-colors text-center shadow-xs">
        <div className="w-14 h-14 bg-blue-50 dark:bg-blue-950/60 rounded-full flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400 mb-4">
          <UploadCloud className="w-7 h-7" />
        </div>
        <h3 className="text-base font-semibold text-slate-800 dark:text-white">
          {selectedFile ? selectedFile.name : 'Select or drop your Bank Statement'}
        </h3>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 mb-5">
          Supports HDFC, ICICI, SBI, Axis and generic bank statement exports (.xlsx, .xls up to 25MB)
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <label className="cursor-pointer px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-lg transition-colors">
            <span>Browse Files</span>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          {selectedFile && (
            <button
              onClick={handleUpload}
              disabled={isUploading}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing Transactions...</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Parse & Ingest</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Input Watcher Folder Box */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-2">
            <FolderSync className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h4 className="font-semibold text-slate-800 dark:text-white text-sm">Background Folder Watcher</h4>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Monitoring directory <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-300 font-mono">./input</code> for new incoming statements.
          </p>
        </div>

        <button
          onClick={handleScanFolder}
          disabled={isScanning}
          className="px-4 py-2 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 self-start sm:self-auto disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
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

      {/* Success Result */}
      {uploadResult && (
        <div className="p-5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 shadow-xs">
          <div className="flex items-center gap-2 font-bold text-base mb-2">
            <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>Batch Successfully Ingested!</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mt-3 bg-white/70 dark:bg-slate-900/60 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800/60">
            <div>
              <span className="text-emerald-700 dark:text-emerald-400 block font-medium">Batch ID:</span>
              <span className="font-mono font-bold text-slate-800 dark:text-white">{uploadResult.batch_id}</span>
            </div>
            <div>
              <span className="text-emerald-700 dark:text-emerald-400 block font-medium">Total Rows:</span>
              <span className="font-bold text-slate-800 dark:text-white">{uploadResult.total_rows}</span>
            </div>
            <div>
              <span className="text-emerald-700 dark:text-emerald-400 block font-medium">Parsed Valid:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{uploadResult.parsed_rows}</span>
            </div>
            <div>
              <span className="text-emerald-700 dark:text-emerald-400 block font-medium">Status:</span>
              <span className="font-bold text-slate-800 dark:text-white">{uploadResult.status}</span>
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <a
              href="/clarification"
              className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
            >
              Open Clarification Queue &rarr;
            </a>
            <span className="text-emerald-400 dark:text-emerald-600">|</span>
            <a
              href="/transactions"
              className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
            >
              View Transactions &rarr;
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
