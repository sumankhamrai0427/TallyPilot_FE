import React, { useState, useEffect } from 'react';
import { 
  Network, ChevronRight, ChevronDown, Folder, 
  FolderOpen, FileText, Building, RefreshCw, Search,
  ArrowUpRight, ArrowDownRight, Wallet
} from 'lucide-react';
import { api } from '../services/api';
import { AccountGroupNode, LedgerBalance } from '../types';

export const ChartOfAccountsPage: React.FC = () => {
  const [treeData, setTreeData] = useState<AccountGroupNode[]>([]);
  const [balances, setBalances] = useState<LedgerBalance[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [expandedNodes, setExpandedNodes] = useState<Record<number, boolean>>({});

  const loadChartOfAccounts = async () => {
    setLoading(true);
    try {
      const [tree, bList] = await Promise.all([
        api.getChartOfAccounts(),
        api.getLedgerBalances()
      ]);
      setTreeData(tree);
      setBalances(bList);

      // Auto-expand root and first level nodes
      const initialExpanded: Record<number, boolean> = {};
      tree.forEach((root) => {
        initialExpanded[root.id] = true;
        root.children?.forEach((child) => {
          initialExpanded[child.id] = true;
        });
      });
      setExpandedNodes(initialExpanded);
    } catch (err) {
      console.error('Failed to load chart of accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChartOfAccounts();
  }, []);

  const toggleNode = (nodeId: number) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  // Balance lookup helper
  const getBalance = (ledgerId: number) => {
    return balances.find(b => b.ledger_id === ledgerId);
  };

  // Recursive tree renderer
  const renderGroup = (group: AccountGroupNode, level: number = 0) => {
    const isExpanded = !!expandedNodes[group.id];
    const hasChildren = (group.children && group.children.length > 0) || (group.ledgers && group.ledgers.length > 0);

    const typeColor = 
      group.group_type === 'ASSET' ? 'text-blue-600 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-400' :
      group.group_type === 'LIABILITY' ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-400' :
      group.group_type === 'EXPENSE' ? 'text-rose-600 bg-rose-50 dark:bg-rose-950/60 dark:text-rose-400' :
      group.group_type === 'INCOME' ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-400' :
      'text-purple-600 bg-purple-50 dark:bg-purple-950/60 dark:text-purple-400';

    return (
      <div key={`group-${group.id}`} className="space-y-1">
        <div
          onClick={() => toggleNode(group.id)}
          style={{ paddingLeft: `${level * 20 + 8}px` }}
          className="flex items-center justify-between py-2 pr-4 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer select-none group"
        >
          <div className="flex items-center gap-2">
            {hasChildren ? (
              <span className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-white">
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </span>
            ) : (
              <span className="w-4" />
            )}

            {isExpanded ? (
              <FolderOpen className="w-4 h-4 text-amber-500 flex-shrink-0" />
            ) : (
              <Folder className="w-4 h-4 text-amber-500 flex-shrink-0" />
            )}

            <span className="font-bold text-sm text-slate-800 dark:text-slate-200">
              {group.name}
            </span>

            {group.code && (
              <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
                ({group.code})
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${typeColor}`}>
              {group.group_type}
            </span>
            <span className="text-[11px] font-medium text-slate-400">
              {group.nature}
            </span>
          </div>
        </div>

        {/* Nested Ledgers and Children */}
        {isExpanded && (
          <div className="space-y-1">
            {/* Subgroups */}
            {group.children?.map(child => renderGroup(child, level + 1))}

            {/* Ledgers inside this group */}
            {group.ledgers?.map(ledger => {
              const bal = getBalance(ledger.id);
              return (
                <div
                  key={`ledger-${ledger.id}`}
                  style={{ paddingLeft: `${(level + 1) * 20 + 24}px` }}
                  className="flex items-center justify-between py-1.5 pr-4 rounded hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {ledger.name}
                    </span>
                    {ledger.code && (
                      <span className="text-xs font-mono text-slate-400">
                        {ledger.code}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 font-mono text-xs">
                    {bal ? (
                      <span className={`font-semibold ${
                        bal.balance_nature === 'DR' 
                          ? 'text-emerald-600 dark:text-emerald-400' 
                          : 'text-blue-600 dark:text-blue-400'
                      }`}>
                        ₹{Math.abs(bal.net_balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })} {bal.balance_nature}
                      </span>
                    ) : (
                      <span className="text-slate-400">₹0.00</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Network className="w-6 h-6 text-blue-600" />
            Chart of Accounts Hierarchy
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Structured 5-tier double-entry ledger hierarchy (Assets, Liabilities, Equity, Income, Expenses).
          </p>
        </div>

        <button
          onClick={loadChartOfAccounts}
          className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-semibold transition-all cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh Tree
        </button>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Assets Groups</div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">Active</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Liabilities Groups</div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">Active</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
            <ArrowDownRight className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Revenue Accounts</div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">Active</div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
            <ArrowUpRight className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Expense Accounts</div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">Active</div>
          </div>
        </div>
      </div>

      {/* Tree View Container */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs">
        {loading ? (
          <div className="text-center py-12 text-slate-400">
            Loading Chart of Accounts tree...
          </div>
        ) : treeData.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            No account groups found for this company.
          </div>
        ) : (
          <div className="space-y-2">
            {treeData.map(rootNode => renderGroup(rootNode, 0))}
          </div>
        )}
      </div>
    </div>
  );
};

