import React from 'react';
import { Server, Building2, Sun, Moon, SlidersHorizontal, ChevronDown } from 'lucide-react';
import { DashboardSummary } from '../types';
import { useTheme } from '../context/ThemeContext';
import { useCompany } from '../context/CompanyContext';

interface NavbarProps {
  summary?: DashboardSummary;
}

export const Navbar: React.FC<NavbarProps> = ({ summary }) => {
  const { theme, toggleTheme } = useTheme();
  const { companies, activeCompany, setActiveCompany, financialYears, activeFinancialYear, setActiveFinancialYear } = useCompany();
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
        {/* Dynamic Company & FY Selector */}
        <div className="flex items-center gap-2">
          {/* Company Dropdown */}
          <div className="relative flex items-center">
            <Building2 className="w-4 h-4 text-slate-400 absolute left-2.5 pointer-events-none" />
            <select
              value={activeCompany?.id || ''}
              onChange={(e) => {
                const selected = companies.find(c => c.id === Number(e.target.value));
                if (selected) setActiveCompany(selected);
              }}
              className="appearance-none pl-8 pr-7 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
            >
              {companies.map((comp) => (
                <option key={comp.id} value={comp.id}>
                  {comp.company_name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 pointer-events-none" />
          </div>

          {/* FY Dropdown */}
          {financialYears.length > 0 && (
            <div className="relative flex items-center">
              <select
                value={activeFinancialYear?.id || ''}
                onChange={(e) => {
                  const selected = financialYears.find(f => f.id === Number(e.target.value));
                  if (selected) setActiveFinancialYear(selected);
                }}
                className="appearance-none px-3 pr-7 py-1.5 bg-blue-50 dark:bg-slate-800 border border-blue-200 dark:border-blue-900/40 rounded-lg text-xs font-semibold text-blue-700 dark:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              >
                {financialYears.map((fy) => (
                  <option key={fy.id} value={fy.id}>
                    {fy.fy_code} {fy.is_current ? '(Current)' : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-blue-500 absolute right-2 pointer-events-none" />
            </div>
          )}
        </div>

        {/* Automation Status */}
        <div className={`hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
          llmConnected 
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60' 
            : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/60'
        }`}>
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>{llmConnected ? 'Automation: Smart' : 'Automation: Active'}</span>
        </div>

        {/* Tally Prime Status */}
        <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
          tallyConnected 
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/60' 
            : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
        }`}>
          <Server className="w-3.5 h-3.5" />
          <span>{tallyConnected ? 'Tally: Connected' : 'Tally: Simulation'}</span>
        </div>

        {/* Appearance Toggle Button */}
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
