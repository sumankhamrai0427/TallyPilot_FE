import React from 'react';
import { Server, Building2, Sun, Moon, SlidersHorizontal } from 'lucide-react';
import { DashboardSummary } from '../types';
import { useTheme } from '../context/ThemeContext';

interface NavbarProps {
  summary?: DashboardSummary;
}

export const Navbar: React.FC<NavbarProps> = ({ summary }) => {
  const { theme, toggleTheme } = useTheme();
  const tallyConnected = summary?.tally_connection_status === 'connected';
  const llmConnected = summary?.llm_connection_status === 'connected';

  return (
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 sticky top-0 z-20 transition-colors duration-200">
      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          {/* Constant Branding Logo with Geometric Font */}
          <span className="text-[20px] font-logo font-black tracking-tight leading-tight select-none">
            <span className="text-[#38bdf8]">Tally</span>
            <span className="text-amber-400">Pilot</span>
          </span>
          <span className="text-xs text-slate-400 font-medium">Accounting Automation</span>
        </div>
      </div>

      <div className="flex items-center gap-3.5">
        {/* Company Pill */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-full text-xs font-medium text-slate-600 dark:text-slate-300">
          <Building2 className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
          <span>Demo Company (FY 2026-27)</span>
        </div>

        {/* Automation Status — Business Friendly */}
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
          llmConnected 
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60' 
            : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/60'
        }`}>
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>{llmConnected ? 'Automation: Smart' : 'Automation: Active'}</span>
        </div>

        {/* Tally Prime Status */}
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
          tallyConnected 
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60' 
            : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
        }`}>
          <Server className="w-3.5 h-3.5" />
          <span>{tallyConnected ? 'Tally: Connected' : 'Tally: Simulation'}</span>
        </div>

        {/* Appearance Toggle Button (Icon only) */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="w-9 h-9 rounded-full flex items-center justify-center border border-slate-200 dark:border-slate-800 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-amber-400 transition-all shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-600" />
          )}
        </button>
      </div>
    </header>
  );
};
