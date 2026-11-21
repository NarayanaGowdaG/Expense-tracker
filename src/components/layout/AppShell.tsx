import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowDownLeft,
  BarChart3,
  Bell,
  LayoutDashboard,
  ListOrdered,
  LogOut,
  Menu,
  Moon,
  PiggyBank,
  PlusCircle,
  Settings,
  Sun,
  Target,
  Wallet,
  X,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext.tsx';
import { formatINR, getMonthLabel } from '../../lib/format.ts';
import type { NavSection } from '../../types/finance.ts';

interface NavItem {
  id: NavSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'transactions', label: 'Transactions', icon: ListOrdered },
  { id: 'add-transaction', label: 'Add Transaction', icon: PlusCircle },
  { id: 'budgets', label: 'Budgets', icon: Target },
  { id: 'income', label: 'Income', icon: ArrowDownLeft },
  { id: 'savings', label: 'Savings Goals', icon: PiggyBank },
  { id: 'analytics', label: 'Analytics & Reports', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const {
    user,
    profile,
    activeNav,
    setActiveNav,
    setEditingTransaction,
    selectedMonthKey,
    setSelectedMonthKey,
    budgetAlerts,
    theme,
    toggleTheme,
    logout,
    toast,
    clearToast,
  } = useFinance();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);

  const handleSelectNav = (id: NavSection) => {
    if (id === 'add-transaction') {
      setEditingTransaction(null);
    }
    setActiveNav(id);
    setMobileOpen(false);
  };

  const currentNavLabel = NAV_ITEMS.find((n) => n.id === activeNav)?.label ?? 'Dashboard';

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white dark:bg-[#070B16] border-r border-slate-200 dark:border-[#1E2E4D]">
      {/* Brand header */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200 dark:border-[#1E2E4D]">
        <button
          type="button"
          onClick={() => handleSelectNav('dashboard')}
          className="flex items-center gap-3 text-left cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#287BFF] to-[#38BDF8] flex items-center justify-center text-white shadow-[0_0_20px_rgba(40,123,255,0.35)] shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
            MyExpense
          </span>
        </button>

        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-slate-800 dark:hover:text-white cursor-pointer"
          aria-label="Close navigation menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation links */}
      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto" aria-label="Main Navigation">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeNav === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelectNav(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-gradient-to-r from-[#287BFF]/15 to-[#38BDF8]/10 text-[#287BFF] dark:text-[#38BDF8] border border-[#287BFF]/30 shadow-[0_0_16px_rgba(40,123,255,0.12)]'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#111C32] hover:text-slate-900 dark:hover:text-white border border-transparent'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Account footer */}
      <div className="p-4 border-t border-slate-200 dark:border-[#1E2E4D] space-y-3">
        <div className="px-2">
          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
            {profile?.displayName || user?.displayName || 'Account'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {profile?.email || user?.email}
          </p>
        </div>

        <button
          type="button"
          onClick={() => void logout()}
          className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-[#1E2E4D] text-slate-700 dark:text-slate-300 hover:bg-red-500/10 hover:text-red-600 dark:hover:text-[#F87171] hover:border-red-500/30 transition-colors cursor-pointer whitespace-nowrap"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] dark:bg-[#080D1B] text-slate-900 dark:text-slate-100">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 sticky top-0 h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] h-full z-10">{sidebarContent}</div>
        </div>
      )}

      {/* Main workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 px-4 sm:px-8 flex items-center justify-between gap-4 bg-white/90 dark:bg-[#0B1224]/90 backdrop-blur-md border-b border-slate-200 dark:border-[#1E2E4D]">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-xl border border-slate-200 dark:border-[#1E2E4D] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#17243B] cursor-pointer"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white truncate">
                {currentNavLabel}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            {/* Active month picker */}
            <input
              type="month"
              value={selectedMonthKey}
              onChange={(e) => e.target.value && setSelectedMonthKey(e.target.value)}
              aria-label="Select active month"
              className="hidden sm:block px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 dark:bg-[#17243B] border border-slate-200 dark:border-[#243656] text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#287BFF]"
            />

            {/* Budget alerts dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setAlertsOpen((o) => !o)}
                className="relative p-2.5 rounded-xl border border-slate-200 dark:border-[#1E2E4D] bg-slate-50 dark:bg-[#111C32] text-slate-700 dark:text-slate-200 hover:border-[#287BFF]/50 transition-colors cursor-pointer"
                aria-label="Budget alerts"
              >
                <Bell className="w-4 h-4" />
                {budgetAlerts.length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center font-mono">
                    {budgetAlerts.length}
                  </span>
                )}
              </button>

              {alertsOpen && (
                <div className="absolute right-0 mt-2 w-80 max-w-[90vw] rounded-2xl border border-slate-200 dark:border-[#1E2E4D] bg-white dark:bg-[#111C32] shadow-2xl p-4 z-40">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Budget Notifications · {getMonthLabel(selectedMonthKey, true)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setAlertsOpen(false)}
                      className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {budgetAlerts.length === 0 ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400 py-3">
                      All budgets for {getMonthLabel(selectedMonthKey)} are below the 80% threshold.
                    </p>
                  ) : (
                    <div className="space-y-2.5 max-h-64 overflow-y-auto">
                      {budgetAlerts.map((alert) => (
                        <div
                          key={alert.id}
                          className={`p-3 rounded-xl border text-xs ${
                            alert.severity === 'exceeded'
                              ? 'border-red-300 dark:border-red-500/40 bg-red-50 dark:bg-red-500/10'
                              : 'border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 font-semibold">
                            <span className="flex items-center gap-1.5 text-slate-900 dark:text-white truncate">
                              <AlertTriangle
                                className={`w-3.5 h-3.5 shrink-0 ${
                                  alert.severity === 'exceeded'
                                    ? 'text-red-500'
                                    : 'text-amber-500'
                                }`}
                              />
                              {alert.categoryName}
                            </span>
                            <span
                              className={`font-mono tabular-nums ${
                                alert.severity === 'exceeded'
                                  ? 'text-red-600 dark:text-[#F87171]'
                                  : 'text-amber-600 dark:text-amber-400'
                              }`}
                            >
                              {alert.percentage.toFixed(0)}%
                            </span>
                          </div>
                          <p className="mt-1 text-slate-600 dark:text-slate-300 font-mono tabular-nums">
                            {formatINR(alert.spent)} of {formatINR(alert.limit)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setAlertsOpen(false);
                      handleSelectNav('budgets');
                    }}
                    className="mt-3 w-full py-2 rounded-xl text-xs font-semibold text-[#287BFF] dark:text-[#38BDF8] hover:bg-[#287BFF]/10 transition-colors cursor-pointer"
                  >
                    Manage Budgets
                  </button>
                </div>
              )}
            </div>

            {/* Theme toggle */}
            <button
              type="button"
              onClick={() => void toggleTheme()}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-[#1E2E4D] bg-slate-50 dark:bg-[#111C32] text-slate-700 dark:text-slate-200 hover:border-[#287BFF]/50 transition-colors cursor-pointer"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-[#38BDF8]" />
              ) : (
                <Moon className="w-4 h-4 text-[#287BFF]" />
              )}
            </button>

            {/* Primary CTA */}
            <button
              type="button"
              onClick={() => handleSelectNav('add-transaction')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-[#287BFF] to-[#1D5ED8] hover:shadow-[0_0_20px_rgba(40,123,255,0.45)] transition-all whitespace-nowrap shrink-0 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Add Transaction</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>
        </header>

        {/* Main content viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Global Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 max-w-sm rounded-xl border px-4 py-3 shadow-2xl flex items-center justify-between gap-3 text-sm font-medium ${
            toast.type === 'success'
              ? 'bg-white dark:bg-[#111C32] border-emerald-300 dark:border-[#22C55E]/40 text-emerald-700 dark:text-[#22C55E]'
              : 'bg-white dark:bg-[#111C32] border-red-300 dark:border-[#F87171]/40 text-red-700 dark:text-[#F87171]'
          }`}
          role="status"
        >
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={clearToast}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
            aria-label="Dismiss message"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
