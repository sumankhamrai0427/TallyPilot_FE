import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  UploadCloud,
  FileSpreadsheet,
  HelpCircle,
  CheckCircle2,
  Share2,
  History,
  FileText,
  Settings as SettingsIcon,
  Compass
} from 'lucide-react';
import { DashboardSummary } from '../types';

interface SidebarProps {
  summary?: DashboardSummary;
}

export const Sidebar: React.FC<SidebarProps> = ({ summary }) => {
  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Import Statements', path: '/import', icon: UploadCloud },
    { label: 'Transactions', path: '/transactions', icon: FileSpreadsheet },
    {
      label: 'Clarification Queue',
      path: '/clarification',
      icon: HelpCircle,
      badge: summary?.clarification_queue_count,
      badgeColor: 'bg-amber-500'
    },
    {
      label: 'Approval Queue',
      path: '/approvals',
      icon: CheckCircle2,
      badge: summary?.approval_queue_count,
      badgeColor: 'bg-blue-600'
    },
    { label: 'Tally Integration', path: '/tally', icon: Share2 },
    { label: 'Import History', path: '/history', icon: History },
    { label: 'Audit Logs', path: '/audit-logs', icon: FileText },
    { label: 'Settings', path: '/settings', icon: SettingsIcon },
  ];

  return (
    <aside className="w-64 sticky top-0 h-screen bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 flex flex-col flex-shrink-0 z-30 transition-colors duration-200">
      {/* Brand Header with 2nd Image Geometric Logo Font */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-amber-500 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20 flex-shrink-0">
          <Compass className="w-5 h-5" />
        </div>
        <div className="overflow-hidden">
          <h1 className="text-[19px] font-logo font-black tracking-tight leading-none select-none">
            <span className="text-[#38bdf8]">Tally</span>
            <span className="text-amber-400">Pilot</span>
          </h1>
          <p className="text-[10px] text-slate-400 font-medium mt-1 truncate tracking-wide">Accounting Automation</p>
        </div>
      </div>

      {/* Nav List with internal scroll if window is small */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 ? (
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full text-white ${item.badgeColor || 'bg-slate-700'}`}>
                  {item.badge}
                </span>
              ) : null}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-400 dark:text-slate-500 flex-shrink-0">
        <div className="flex items-center justify-between">
          <span className="font-medium">TallyPilot 1.0</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Ready</span>
        </div>
      </div>
    </aside>
  );
};
