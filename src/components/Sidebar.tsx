import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Bot,
  FolderOpen,
  CheckCircle2,
  BookOpen,
  Network,
  Scale,
  BarChart3,
  Settings as SettingsIcon,
  Compass,
  Building2
} from 'lucide-react';
import { DashboardSummary } from '../types';

interface SidebarProps {
  summary?: DashboardSummary;
}

export const Sidebar: React.FC<SidebarProps> = ({ summary }) => {
  const pendingReviewCount = (summary?.approval_queue_count || 0) + (summary?.clarification_queue_count || 0);

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    {
      label: 'AI Assistant',
      path: '/assistant',
      icon: Bot,
      badge: 'Local AI',
      badgeColor: 'bg-emerald-500/90 text-white'
    },
    { label: 'Documents Hub', path: '/documents', icon: FolderOpen },
    {
      label: 'Transaction Review',
      path: '/review',
      icon: CheckCircle2,
      badge: pendingReviewCount > 0 ? pendingReviewCount : undefined,
      badgeColor: 'bg-blue-600 text-white'
    },
    { label: 'Vouchers & Day Book', path: '/vouchers', icon: BookOpen },
    { label: 'Chart of Accounts', path: '/chart-of-accounts', icon: Network },
    { label: 'Company & FY Master', path: '/company-master', icon: Building2 },
    { label: 'Bank Reconciliation', path: '/reconciliation', icon: Scale },
    { label: 'Financial Reports', path: '/reports', icon: BarChart3 },
    { label: 'Settings & Sync', path: '/settings', icon: SettingsIcon },
  ];

  return (
    <aside className="w-64 sticky top-0 h-screen bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800 flex flex-col flex-shrink-0 z-30 transition-colors duration-200">
      {/* Brand Header */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-amber-500 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20 flex-shrink-0">
          <Compass className="w-5 h-5" />
        </div>
        <div className="overflow-hidden">
          <h1 className="text-[19px] font-logo font-black tracking-tight leading-none select-none">
            <span className="text-[#38bdf8]">Tally</span>
            <span className="text-amber-400">Pilot</span>
          </h1>
          <p className="text-[10px] text-slate-400 font-medium mt-1 truncate tracking-wide">
            HLA Local AI Accounting
          </p>
        </div>
      </div>

      {/* Clean HLA Nav List */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Accounting Modules
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined ? (
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${item.badgeColor || 'bg-slate-700'}`}>
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
          <span className="font-semibold">HLA v1.0 Compliant</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-bold">Double-Entry</span>
        </div>
      </div>
    </aside>
  );
};
