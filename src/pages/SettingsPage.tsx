import React, { useEffect, useState } from 'react';
import { Settings as SettingsIcon, Save, SlidersHorizontal, Server, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await api.getSettings();
      setSettings(res.configurations);
      setDiagnostics(res.diagnostics);
    } catch (err) {
      console.error("Failed to load settings", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.updateSettings(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Failed to save settings", err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key: string, val: string) => {
    setSettings(prev => ({ ...prev, [key]: val }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Application Settings & Configuration</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Manage Tally Prime HTTP interface, local LLM thresholds, and runtime parameters.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Tally Prime Configurations */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Server className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="font-semibold text-slate-800 dark:text-white text-base">Tally Prime Settings</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Tally XML Host</label>
              <input
                type="text"
                value={settings.tally_host || 'localhost'}
                onChange={(e) => handleChange('tally_host', e.target.value)}
                className="w-full text-sm border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Tally XML Port</label>
              <input
                type="text"
                value={settings.tally_port || '9000'}
                onChange={(e) => handleChange('tally_port', e.target.value)}
                className="w-full text-sm border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Tally Active Company</label>
              <input
                type="text"
                value={settings.tally_company || 'Demo Company'}
                onChange={(e) => handleChange('tally_company', e.target.value)}
                className="w-full text-sm border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Default Bank Ledger</label>
              <input
                type="text"
                value={settings.bank_ledger_name || 'HDFC Bank'}
                onChange={(e) => handleChange('bank_ledger_name', e.target.value)}
                className="w-full text-sm border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              />
            </div>
          </div>
        </div>

        {/* Classifier Settings */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 transition-colors">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <SlidersHorizontal className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="font-semibold text-slate-800 dark:text-white text-base">Transaction Classification Settings</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Classifier Model</label>
              <input
                type="text"
                value={settings.ai_model || 'mistral'}
                onChange={(e) => handleChange('ai_model', e.target.value)}
                className="w-full text-sm border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              />
              <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">Active engine model</span>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Confidence Review Threshold</label>
              <input
                type="text"
                value={settings.ai_confidence_threshold || '0.80'}
                onChange={(e) => handleChange('ai_confidence_threshold', e.target.value)}
                className="w-full text-sm border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              />
              <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">Between 0.00 and 1.00 (triggers human clarification)</span>
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-between">
          {saved && (
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Settings updated successfully!</span>
            </div>
          )}
          <div className="ml-auto">
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Configuration</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
