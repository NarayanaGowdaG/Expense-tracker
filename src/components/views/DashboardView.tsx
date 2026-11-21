import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Edit3,
  Plus,
  Receipt as ReceiptIcon,
  Trash2,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext.tsx';
import {
  formatDateTimeDisplay,
  formatINR,
  getLastNMonthKeys,
  getMonthLabel,
} from '../../lib/format.ts';
import type { Transaction } from '../../types/finance.ts';
import { ConfirmDeleteModal } from '../ConfirmDeleteModal.tsx';
import { ReceiptViewerModal } from '../ReceiptViewerModal.tsx';
import {
  CategoryDonutChart,
  IncomeVsExpenseChart,
  SpendingTrendChart,
} from '../charts/FinanceCharts.tsx';

export function DashboardView() {
  const {
    profile,
    transactions,
    categories,
    budgets,
    budgetAlerts,
    selectedMonthKey,
    loadingData,
    setActiveNav,
    setEditingTransaction,
    deleteTransaction,
    showToast,
  } = useFinance();

  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [receiptTarget, setReceiptTarget] = useState<{ id: string; title: string } | null>(null);

  const metrics = useMemo(() => {
    const allIncome = transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const allExpenses = transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalBalance = allIncome - allExpenses;

    const monthTxs = transactions.filter((t) => t.monthKey === selectedMonthKey);
    const monthIncome = monthTxs
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const monthExpenses = monthTxs
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    const monthSavings = monthIncome - monthExpenses;

    const explicitOverall = budgets.find(
      (b) => b.monthKey === selectedMonthKey && b.categoryId === 'overall',
    );
    const monthlyBudget = explicitOverall?.limitAmount ?? profile?.monthlyBudgetLimit ?? 0;
    const budgetRemaining = monthlyBudget - monthExpenses;
    const budgetUsedPct = monthlyBudget > 0 ? (monthExpenses / monthlyBudget) * 100 : 0;

    return {
      totalBalance,
      allIncome,
      allExpenses,
      monthIncome,
      monthExpenses,
      monthSavings,
      monthlyBudget,
      budgetRemaining,
      budgetUsedPct,
    };
  }, [budgets, profile?.monthlyBudgetLimit, selectedMonthKey, transactions]);

  const last6Months = useMemo(() => getLastNMonthKeys(6, selectedMonthKey), [selectedMonthKey]);

  const monthlyComparison = useMemo(() => {
    return last6Months.map((mk) => {
      const mTxs = transactions.filter((t) => t.monthKey === mk);
      const income = mTxs
        .filter((t) => t.type === 'income')
        .reduce((s, t) => s + t.amount, 0);
      const expense = mTxs
        .filter((t) => t.type === 'expense')
        .reduce((s, t) => s + t.amount, 0);
      return {
        monthKey: mk,
        label: getMonthLabel(mk, true),
        income,
        expense,
        savings: income - expense,
      };
    });
  }, [last6Months, transactions]);

  const spendingTrend = useMemo(
    () => monthlyComparison.map((m) => ({ label: m.label, value: m.expense })),
    [monthlyComparison],
  );

  const savingsGrowth = useMemo(() => {
    let cumulative = 0;
    return monthlyComparison.map((m) => {
      cumulative += m.savings;
      return { label: m.label, value: Math.max(0, cumulative) };
    });
  }, [monthlyComparison]);

  const categorySlices = useMemo(() => {
    const colorMap = new Map<string, string>();
    categories.forEach((c) => colorMap.set(c.name, c.color));

    const totals = new Map<string, number>();
    transactions
      .filter((t) => t.type === 'expense' && t.monthKey === selectedMonthKey)
      .forEach((t) => {
        totals.set(t.categoryName, (totals.get(t.categoryName) ?? 0) + t.amount);
      });

    return Array.from(totals.entries())
      .map(([name, amount]) => ({
        name,
        amount,
        color: colorMap.get(name) ?? '#287BFF',
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [categories, selectedMonthKey, transactions]);

  const recentTransactions = useMemo(() => transactions.slice(0, 6), [transactions]);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteTransaction(deleteTarget);
      showToast('success', 'Transaction deleted.');
      setDeleteTarget(null);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Unable to delete transaction.');
    } finally {
      setDeleting(false);
    }
  };

  if (loadingData) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-32 rounded-2xl bg-slate-200 dark:bg-[#111C32] border border-slate-200 dark:border-[#1E2E4D]"
            />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-72 rounded-2xl bg-slate-200 dark:bg-[#111C32]" />
          <div className="h-72 rounded-2xl bg-slate-200 dark:bg-[#111C32]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Budget Warning / Exceeded Banner */}
      {budgetAlerts.length > 0 && (
        <div className="rounded-2xl border border-amber-300 dark:border-amber-500/40 bg-amber-50/80 dark:bg-[#111C32] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {budgetAlerts.length} budget {budgetAlerts.length === 1 ? 'limit requires' : 'limits require'} attention in {getMonthLabel(selectedMonthKey)}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                {budgetAlerts
                  .slice(0, 2)
                  .map((a) => `${a.categoryName} (${a.percentage.toFixed(0)}%)`)
                  .join(' · ')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveNav('budgets')}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#287BFF] hover:bg-[#1D5ED8] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Review Budgets
          </button>
        </div>
      )}

      {/* 5 Core KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {/* Total Balance (Glowing focal anchor) */}
        <div className="rounded-2xl border border-[#287BFF]/35 bg-gradient-to-br from-white to-blue-50/60 dark:from-[#111C32] dark:to-[#0B1224] p-5 shadow-sm dark:shadow-[0_0_28px_rgba(40,123,255,0.16)]">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Total Balance
          </p>
          <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white tracking-tight">
            {formatINR(metrics.totalBalance)}
          </p>
          <p className="mt-2 text-xs text-[#287BFF] dark:text-[#38BDF8] font-medium">
            All-time net position
          </p>
        </div>

        {/* Total Income */}
        <div className="rounded-2xl border border-slate-200 dark:border-[#1E2E4D] bg-white dark:bg-[#111C32] p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Total Income
            </p>
            <ArrowDownLeft className="w-4 h-4 text-emerald-600 dark:text-[#22C55E]" />
          </div>
          <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-[#22C55E] tracking-tight">
            {formatINR(metrics.monthIncome)}
          </p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            {getMonthLabel(selectedMonthKey, true)} · All: {formatINR(metrics.allIncome)}
          </p>
        </div>

        {/* Total Expenses */}
        <div className="rounded-2xl border border-slate-200 dark:border-[#1E2E4D] bg-white dark:bg-[#111C32] p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Total Expenses
            </p>
            <ArrowUpRight className="w-4 h-4 text-red-600 dark:text-[#F87171]" />
          </div>
          <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-red-600 dark:text-[#F87171] tracking-tight">
            {formatINR(metrics.monthExpenses)}
          </p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            {getMonthLabel(selectedMonthKey, true)} · All: {formatINR(metrics.allExpenses)}
          </p>
        </div>

        {/* Monthly Savings */}
        <div className="rounded-2xl border border-slate-200 dark:border-[#1E2E4D] bg-white dark:bg-[#111C32] p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Monthly Savings
          </p>
          <p
            className={`mt-2 text-2xl font-bold font-mono tabular-nums tracking-tight ${
              metrics.monthSavings >= 0
                ? 'text-cyan-600 dark:text-[#22D3EE]'
                : 'text-red-600 dark:text-[#F87171]'
            }`}
          >
            {formatINR(metrics.monthSavings)}
          </p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            Rate:{' '}
            {metrics.monthIncome > 0
              ? `${((metrics.monthSavings / metrics.monthIncome) * 100).toFixed(1)}%`
              : '0.0%'}
          </p>
        </div>

        {/* Monthly Budget */}
        <div className="rounded-2xl border border-slate-200 dark:border-[#1E2E4D] bg-white dark:bg-[#111C32] p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Monthly Budget
            </p>
            <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
              {metrics.budgetUsedPct.toFixed(0)}%
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white tracking-tight">
            {formatINR(metrics.monthlyBudget)}
          </p>
          <div className="mt-2.5 h-1.5 w-full rounded-full bg-slate-100 dark:bg-[#17243B] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                metrics.budgetUsedPct >= 100
                  ? 'bg-red-500'
                  : metrics.budgetUsedPct >= 80
                    ? 'bg-amber-500'
                    : 'bg-[#287BFF]'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, metrics.budgetUsedPct))}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            {metrics.budgetRemaining >= 0
              ? `${formatINR(metrics.budgetRemaining)} left`
              : `${formatINR(Math.abs(metrics.budgetRemaining))} over`}
          </p>
        </div>
      </section>

      {/* Primary Charts Row */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-200 dark:border-[#1E2E4D] bg-white dark:bg-[#111C32] p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Income vs Expenses
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                6-month cashflow comparison
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#22C55E]" /> Income
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#F87171]" /> Expenses
              </span>
            </div>
          </div>
          <IncomeVsExpenseChart data={monthlyComparison} />
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-[#1E2E4D] bg-white dark:bg-[#111C32] p-6">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Monthly Spending Trends
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Expense trajectory over the last 6 months
              </p>
            </div>
          </div>
          <SpendingTrendChart
            data={spendingTrend}
            strokeColor="#287BFF"
            gradientId="dashSpendGrad"
            seriesLabel="Expenses"
          />
        </div>
      </section>

      {/* Secondary Charts Row */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-200 dark:border-[#1E2E4D] bg-white dark:bg-[#111C32] p-6">
          <div className="mb-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Category-wise Expenses
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Breakdown for {getMonthLabel(selectedMonthKey)}
            </p>
          </div>
          <CategoryDonutChart slices={categorySlices} />
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-[#1E2E4D] bg-white dark:bg-[#111C32] p-6">
          <div className="mb-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Savings Growth
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Cumulative 6-month net savings trend
            </p>
          </div>
          <SpendingTrendChart
            data={savingsGrowth}
            strokeColor="#22D3EE"
            gradientId="dashSaveGrad"
            seriesLabel="Cumulative Savings"
          />
        </div>
      </section>

      {/* Recent Transactions */}
      <section className="rounded-2xl border border-slate-200 dark:border-[#1E2E4D] bg-white dark:bg-[#111C32] overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-[#1E2E4D] flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Recent Transactions
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Latest activity across all accounts and payment methods
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveNav('transactions')}
            className="text-xs font-semibold text-[#287BFF] dark:text-[#38BDF8] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
          >
            View All History
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              No transactions recorded yet
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-5">
              Log your first income or expense to populate your financial dashboard.
            </p>
            <button
              type="button"
              onClick={() => {
                setEditingTransaction(null);
                setActiveNav('add-transaction');
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#287BFF] to-[#1D5ED8] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add First Transaction
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-[#1E2E4D]">
            {recentTransactions.map((tx) => (
              <div
                key={tx.id}
                className="px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-[#17243B]/50 transition-colors"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {tx.title}
                    </span>
                    {tx.receiptId && (
                      <button
                        type="button"
                        onClick={() => setReceiptTarget({ id: tx.receiptId, title: tx.title })}
                        className="text-[#287BFF] dark:text-[#38BDF8] hover:opacity-80 cursor-pointer"
                        title="View receipt attachment"
                        aria-label={`View receipt for ${tx.title}`}
                      >
                        <ReceiptIcon className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                    {tx.categoryName} · {tx.paymentMethod} · {formatDateTimeDisplay(tx.dateTime)}
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                  <span
                    className={`text-sm font-bold font-mono tabular-nums ${
                      tx.type === 'income'
                        ? 'text-emerald-600 dark:text-[#22C55E]'
                        : 'text-red-600 dark:text-[#F87171]'
                    }`}
                  >
                    {tx.type === 'income' ? '+' : '-'}
                    {formatINR(tx.amount)}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTransaction(tx);
                        setActiveNav('add-transaction');
                      }}
                      className="p-2 rounded-lg text-slate-400 hover:text-[#287BFF] dark:hover:text-[#38BDF8] hover:bg-slate-100 dark:hover:bg-[#17243B] transition-colors cursor-pointer"
                      aria-label={`Edit ${tx.title}`}
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(tx)}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-[#F87171] hover:bg-slate-100 dark:hover:bg-[#17243B] transition-colors cursor-pointer"
                      aria-label={`Delete ${tx.title}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        title="Delete Transaction"
        description={
          deleteTarget
            ? `Are you sure you want to permanently delete "${deleteTarget.title}" (${formatINR(deleteTarget.amount)})?`
            : ''
        }
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void handleConfirmDelete()}
      />

      <ReceiptViewerModal
        receiptId={receiptTarget?.id ?? null}
        transactionTitle={receiptTarget?.title ?? ''}
        onClose={() => setReceiptTarget(null)}
      />
    </div>
  );
}
