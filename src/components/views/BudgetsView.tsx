import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext.tsx';
import { formatINR, getMonthLabel } from '../../lib/format.ts';
import { VALIDATION_LIMITS } from '../../lib/validation.ts';
import type { Budget } from '../../types/finance.ts';
import { ConfirmDeleteModal } from '../ConfirmDeleteModal.tsx';

export function BudgetsView() {
  const {
    profile,
    categories,
    transactions,
    budgets,
    selectedMonthKey,
    setSelectedMonthKey,
    upsertBudget,
    deleteBudget,
    showToast,
  } = useFinance();

  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === 'expense'),
    [categories],
  );

  const [selectedCategoryId, setSelectedCategoryId] = useState('overall');
  const [limitAmount, setLimitAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Budget | null>(null);
  const [deleting, setDeleting] = useState(false);

  const monthExpenses = useMemo(
    () =>
      transactions.filter(
        (t) => t.type === 'expense' && t.monthKey === selectedMonthKey,
      ),
    [selectedMonthKey, transactions],
  );

  const totalMonthSpent = useMemo(
    () => monthExpenses.reduce((sum, t) => sum + t.amount, 0),
    [monthExpenses],
  );

  const monthBudgets = useMemo(
    () => budgets.filter((b) => b.monthKey === selectedMonthKey),
    [budgets, selectedMonthKey],
  );

  const overallBudgetDoc = monthBudgets.find((b) => b.categoryId === 'overall');
  const overallLimit = overallBudgetDoc?.limitAmount ?? profile?.monthlyBudgetLimit ?? 0;

  const categoryBudgets = useMemo(() => {
    return monthBudgets
      .filter((b) => b.categoryId !== 'overall')
      .map((b) => {
        const spent = monthExpenses
          .filter((t) => t.categoryId === b.categoryId || t.categoryName === b.categoryName)
          .reduce((sum, t) => sum + t.amount, 0);
        const remaining = b.limitAmount - spent;
        const pct = b.limitAmount > 0 ? (spent / b.limitAmount) * 100 : 0;
        const status: 'exceeded' | 'warning' | 'healthy' =
          pct >= 100 ? 'exceeded' : pct >= 80 ? 'warning' : 'healthy';
        return { budget: b, spent, remaining, pct, status };
      });
  }, [monthBudgets, monthExpenses]);

  const overallPct = overallLimit > 0 ? (totalMonthSpent / overallLimit) * 100 : 0;
  const overallStatus: 'exceeded' | 'warning' | 'healthy' =
    overallPct >= 100 ? 'exceeded' : overallPct >= 80 ? 'warning' : 'healthy';

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = Number(limitAmount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('Enter a valid positive budget limit.');
      return;
    }

    let categoryName = 'Overall Monthly Budget';
    if (selectedCategoryId !== 'overall') {
      const cat = expenseCategories.find((c) => c.id === selectedCategoryId);
      if (!cat) {
        setError('Selected expense category was not found.');
        return;
      }
      categoryName = cat.name;
    }

    setSaving(true);
    try {
      await upsertBudget(selectedCategoryId, categoryName, selectedMonthKey, parsed);
      showToast('success', `Budget saved for ${categoryName}.`);
      setLimitAmount('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save budget.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteBudget(deleteTarget.id);
      showToast('success', 'Budget removed.');
      setDeleteTarget(null);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Unable to delete budget.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Month selector + Add/Update Budget Form */}
      <section className="rounded-2xl border border-slate-200 dark:border-[#1E2E4D] bg-white dark:bg-[#111C32] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Set Monthly & Category Budgets
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Receive automatic alerts when spending reaches 80% or exceeds 100% of any limit.
            </p>
          </div>
          <input
            type="month"
            value={selectedMonthKey}
            onChange={(e) => e.target.value && setSelectedMonthKey(e.target.value)}
            className="px-3.5 py-2 rounded-xl text-xs font-medium bg-slate-50 dark:bg-[#17243B] border border-slate-200 dark:border-[#243656] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#287BFF]"
          />
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl border border-red-300 dark:border-red-500/40 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-[#F87171] text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSaveBudget} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Budget Scope / Category
            </label>
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-[#17243B] border border-slate-200 dark:border-[#243656] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#287BFF]"
            >
              <option value="overall">Overall Monthly Budget</option>
              {expenseCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-4">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Spending Limit (₹ INR)
            </label>
            <input
              type="number"
              step="1"
              min="1"
              max={VALIDATION_LIMITS.AMOUNT_MAX}
              value={limitAmount}
              onChange={(e) => setLimitAmount(e.target.value)}
              placeholder="e.g. 15000"
              required
              className="w-full px-4 py-2.5 rounded-xl text-sm font-mono tabular-nums bg-slate-50 dark:bg-[#17243B] border border-slate-200 dark:border-[#243656] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#287BFF]"
            />
          </div>

          <div className="sm:col-span-3">
            <button
              type="submit"
              disabled={saving}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#287BFF] to-[#1D5ED8] hover:shadow-[0_0_20px_rgba(40,123,255,0.45)] disabled:opacity-60 transition-all cursor-pointer whitespace-nowrap"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>Save Limit</span>
            </button>
          </div>
        </form>
      </section>

      {/* Overall Monthly Budget Card */}
      <section className="rounded-2xl border border-[#287BFF]/30 bg-white dark:bg-[#111C32] p-6 shadow-sm dark:shadow-[0_0_24px_rgba(40,123,255,0.1)]">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
          <div>
            <p className="text-xs font-semibold text-[#287BFF] dark:text-[#38BDF8]">
              Overall Budget · {getMonthLabel(selectedMonthKey)}
            </p>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5 font-mono tabular-nums">
              {formatINR(totalMonthSpent)} spent of {formatINR(overallLimit)}
            </h3>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                overallStatus === 'exceeded'
                  ? 'text-red-600 dark:text-[#F87171]'
                  : overallStatus === 'warning'
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-600 dark:text-[#22C55E]'
              }`}
            >
              {overallStatus === 'healthy' ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <AlertTriangle className="w-4 h-4" />
              )}
              {overallStatus === 'exceeded'
                ? 'Budget Exceeded'
                : overallStatus === 'warning'
                  ? '80% Alert Reached'
                  : 'On Track'}
            </span>
          </div>
        </div>

        <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-[#17243B] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              overallStatus === 'exceeded'
                ? 'bg-red-500'
                : overallStatus === 'warning'
                  ? 'bg-amber-500'
                  : 'bg-gradient-to-r from-[#287BFF] to-[#38BDF8]'
            }`}
            style={{ width: `${Math.min(100, Math.max(0, overallPct))}%` }}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
          <span>Utilization: {overallPct.toFixed(1)}%</span>
          <span>
            {overallLimit - totalMonthSpent >= 0
              ? `Remaining: ${formatINR(overallLimit - totalMonthSpent)}`
              : `Over budget by ${formatINR(totalMonthSpent - overallLimit)}`}
          </span>
        </div>
      </section>

      {/* Category Budgets Grid */}
      <section className="space-y-3">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          Category-wise Budgets ({categoryBudgets.length})
        </h3>

        {categoryBudgets.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 dark:border-[#1E2E4D] bg-white dark:bg-[#111C32] p-10 text-center">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              No category budgets configured for {getMonthLabel(selectedMonthKey)}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Choose a category above (such as Food & Dining or Shopping) to cap monthly spending.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categoryBudgets.map(({ budget, spent, remaining, pct, status }) => (
              <div
                key={budget.id}
                className="rounded-2xl border border-slate-200 dark:border-[#1E2E4D] bg-white dark:bg-[#111C32] p-5 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {budget.categoryName}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums mt-0.5">
                      {formatINR(spent)} / {formatINR(budget.limitAmount)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-semibold font-mono tabular-nums ${
                        status === 'exceeded'
                          ? 'text-red-600 dark:text-[#F87171]'
                          : status === 'warning'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-emerald-600 dark:text-[#22C55E]'
                      }`}
                    >
                      {pct.toFixed(0)}% ·{' '}
                      {status === 'exceeded'
                        ? 'Exceeded'
                        : status === 'warning'
                          ? 'Warning'
                          : 'Healthy'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(budget)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-[#F87171] hover:bg-slate-100 dark:hover:bg-[#17243B] cursor-pointer"
                      aria-label={`Delete ${budget.categoryName} budget`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-[#17243B] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      status === 'exceeded'
                        ? 'bg-red-500'
                        : status === 'warning'
                          ? 'bg-amber-500'
                          : 'bg-[#22C55E]'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                  <span>
                    {remaining >= 0
                      ? `${formatINR(remaining)} remaining`
                      : `${formatINR(Math.abs(remaining))} over limit`}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategoryId(budget.categoryId);
                      setLimitAmount(String(budget.limitAmount));
                    }}
                    className="font-sans font-semibold text-[#287BFF] dark:text-[#38BDF8] hover:underline cursor-pointer"
                  >
                    Adjust
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        title="Delete Budget"
        description={
          deleteTarget
            ? `Remove the spending limit for "${deleteTarget.categoryName}" in ${getMonthLabel(deleteTarget.monthKey)}?`
            : ''
        }
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
