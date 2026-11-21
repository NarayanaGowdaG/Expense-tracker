import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Edit3,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext.tsx';
import {
  formatDateShort,
  formatINR,
  getFutureDate,
  getLastNMonthKeys,
  getMonthLabel,
} from '../../lib/format.ts';
import { VALIDATION_LIMITS } from '../../lib/validation.ts';
import type { SavingsGoal } from '../../types/finance.ts';
import { ConfirmDeleteModal } from '../ConfirmDeleteModal.tsx';
import { SpendingTrendChart } from '../charts/FinanceCharts.tsx';

export function SavingsGoalsView() {
  const {
    transactions,
    savingsGoals,
    selectedMonthKey,
    addSavingsGoal,
    updateSavingsGoal,
    deleteSavingsGoal,
    showToast,
  } = useFinance();

  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [monthlyTarget, setMonthlyTarget] = useState('');
  const [targetDate, setTargetDate] = useState(getFutureDate(6));
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<SavingsGoal | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [contributionInputs, setContributionInputs] = useState<Record<string, string>>({});

  const monthlyStats = useMemo(() => {
    const months = getLastNMonthKeys(6, selectedMonthKey);
    const monthlySeries = months.map((mk) => {
      const mTxs = transactions.filter((t) => t.monthKey === mk);
      const inc = mTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const exp = mTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      return { monthKey: mk, label: getMonthLabel(mk, true), savings: inc - exp, income: inc };
    });

    const current = monthlySeries[monthlySeries.length - 1] ?? { savings: 0, income: 0 };
    const previous = monthlySeries[monthlySeries.length - 2] ?? { savings: 0, income: 0 };
    const totalGoalsTarget = savingsGoals.reduce((s, g) => s + g.targetAmount, 0);
    const totalGoalsSaved = savingsGoals.reduce((s, g) => s + g.currentAmount, 0);
    const totalMonthlyGoalTarget = savingsGoals.reduce((s, g) => s + g.monthlyTarget, 0);

    return {
      monthlySeries,
      actualMonthSavings: current.savings,
      prevMonthSavings: previous.savings,
      savingsRate: current.income > 0 ? (current.savings / current.income) * 100 : 0,
      totalGoalsTarget,
      totalGoalsSaved,
      totalMonthlyGoalTarget,
    };
  }, [savingsGoals, selectedMonthKey, transactions]);

  const resetForm = () => {
    setEditingGoal(null);
    setTitle('');
    setTargetAmount('');
    setCurrentAmount('');
    setMonthlyTarget('');
    setTargetDate(getFutureDate(6));
    setNotes('');
    setError(null);
  };

  const startEdit = (goal: SavingsGoal) => {
    setEditingGoal(goal);
    setTitle(goal.title);
    setTargetAmount(String(goal.targetAmount));
    setCurrentAmount(String(goal.currentAmount));
    setMonthlyTarget(String(goal.monthlyTarget));
    setTargetDate(goal.targetDate);
    setNotes(goal.notes);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const payload = {
      title: title.trim(),
      targetAmount: Number(targetAmount),
      currentAmount: Number(currentAmount || 0),
      monthlyTarget: Number(monthlyTarget || 0),
      targetDate,
      notes: notes.trim(),
    };

    setSaving(true);
    try {
      if (editingGoal) {
        await updateSavingsGoal(editingGoal.id, payload);
        showToast('success', 'Savings goal updated.');
      } else {
        await addSavingsGoal(payload);
        showToast('success', 'Savings goal created.');
      }
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save goal.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddContribution = async (goal: SavingsGoal) => {
    const raw = Number(contributionInputs[goal.id] ?? 0);
    if (!Number.isFinite(raw) || raw <= 0) {
      showToast('error', 'Enter a positive contribution amount.');
      return;
    }
    try {
      await updateSavingsGoal(goal.id, {
        title: goal.title,
        targetAmount: goal.targetAmount,
        currentAmount: goal.currentAmount + raw,
        monthlyTarget: goal.monthlyTarget,
        targetDate: goal.targetDate,
        notes: goal.notes,
      });
      setContributionInputs((prev) => ({ ...prev, [goal.id]: '' }));
      showToast('success', `Added ${formatINR(raw)} to "${goal.title}".`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to update goal.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteSavingsGoal(deleteTarget.id);
      showToast('success', 'Savings goal deleted.');
      setDeleteTarget(null);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Unable to delete goal.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary KPIs */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-cyan-500/30 bg-white dark:bg-[#111C32] p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Actual Savings ({getMonthLabel(selectedMonthKey, true)})
          </p>
          <p
            className={`mt-2 text-2xl font-bold font-mono tabular-nums ${
              monthlyStats.actualMonthSavings >= 0
                ? 'text-cyan-600 dark:text-[#22D3EE]'
                : 'text-red-600 dark:text-[#F87171]'
            }`}
          >
            {formatINR(monthlyStats.actualMonthSavings)}
          </p>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            Savings Rate: {monthlyStats.savingsRate.toFixed(1)}%
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-[#1E2E4D] bg-white dark:bg-[#111C32] p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Previous Month Savings
          </p>
          <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {formatINR(monthlyStats.prevMonthSavings)}
          </p>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            Diff:{' '}
            {monthlyStats.actualMonthSavings - monthlyStats.prevMonthSavings >= 0 ? '+' : ''}
            {formatINR(monthlyStats.actualMonthSavings - monthlyStats.prevMonthSavings)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-[#1E2E4D] bg-white dark:bg-[#111C32] p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Monthly Savings Target
          </p>
          <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {formatINR(monthlyStats.totalMonthlyGoalTarget)}
          </p>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
            Combined goal commitments
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-[#1E2E4D] bg-white dark:bg-[#111C32] p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Saved Across Goals
          </p>
          <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-[#22C55E]">
            {formatINR(monthlyStats.totalGoalsSaved)}
          </p>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            Target: {formatINR(monthlyStats.totalGoalsTarget)}
          </p>
        </div>
      </section>

      {/* Savings Trend Chart + Create Goal Form */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 rounded-2xl border border-slate-200 dark:border-[#1E2E4D] bg-white dark:bg-[#111C32] p-6">
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">
            Monthly Savings Comparison
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Net savings per month across the last 6 months
          </p>
          <SpendingTrendChart
            data={monthlyStats.monthlySeries.map((m) => ({
              label: m.label,
              value: Math.max(0, m.savings),
            }))}
            strokeColor="#22D3EE"
            gradientId="savingsCompareGrad"
            seriesLabel="Monthly Savings"
          />
        </div>

        <div className="lg:col-span-6 rounded-2xl border border-slate-200 dark:border-[#1E2E4D] bg-white dark:bg-[#111C32] p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {editingGoal ? 'Edit Savings Goal' : 'Create Savings Goal'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Set targets for emergencies, travel, investments, or purchases
              </p>
            </div>
            {editingGoal && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                Cancel Edit
              </button>
            )}
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl border border-red-300 dark:border-red-500/40 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-[#F87171] text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Goal Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Emergency Fund"
                maxLength={VALIDATION_LIMITS.GOAL_TITLE_MAX}
                required
                className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-[#17243B] border border-slate-200 dark:border-[#243656] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#287BFF]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Target (₹)
                </label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  max={VALIDATION_LIMITS.AMOUNT_MAX}
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  placeholder="100000"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm font-mono tabular-nums bg-slate-50 dark:bg-[#17243B] border border-slate-200 dark:border-[#243656] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#287BFF]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Saved So Far (₹)
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  max={VALIDATION_LIMITS.AMOUNT_MAX}
                  value={currentAmount}
                  onChange={(e) => setCurrentAmount(e.target.value)}
                  placeholder="0"
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm font-mono tabular-nums bg-slate-50 dark:bg-[#17243B] border border-slate-200 dark:border-[#243656] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#287BFF]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Monthly Goal (₹)
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  max={VALIDATION_LIMITS.AMOUNT_MAX}
                  value={monthlyTarget}
                  onChange={(e) => setMonthlyTarget(e.target.value)}
                  placeholder="10000"
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm font-mono tabular-nums bg-slate-50 dark:bg-[#17243B] border border-slate-200 dark:border-[#243656] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#287BFF]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Target Date
                </label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm font-mono bg-slate-50 dark:bg-[#17243B] border border-slate-200 dark:border-[#243656] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#287BFF]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={VALIDATION_LIMITS.GOAL_NOTES_MAX}
                  placeholder="6-month living cushion"
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-[#17243B] border border-slate-200 dark:border-[#243656] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#287BFF]"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#287BFF] to-[#1D5ED8] hover:shadow-[0_0_20px_rgba(40,123,255,0.45)] disabled:opacity-60 transition-all cursor-pointer"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                <span>{editingGoal ? 'Update Goal' : 'Create Goal'}</span>
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Goals Grid */}
      <section className="space-y-3">
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          Your Savings Goals ({savingsGoals.length})
        </h3>

        {savingsGoals.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 dark:border-[#1E2E4D] bg-white dark:bg-[#111C32] p-10 text-center">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              No savings goals created yet
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Create your first savings goal above to track milestones and monthly progress.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savingsGoals.map((goal) => {
              const pct = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
              const achieved = goal.currentAmount >= goal.targetAmount;
              return (
                <div
                  key={goal.id}
                  className="rounded-2xl border border-slate-200 dark:border-[#1E2E4D] bg-white dark:bg-[#111C32] p-5 space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-slate-900 dark:text-white truncate">
                          {goal.title}
                        </h4>
                        {achieved && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Target Date: {formatDateShort(goal.targetDate)} · Monthly Goal:{' '}
                        <span className="font-mono tabular-nums">{formatINR(goal.monthlyTarget)}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => startEdit(goal)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-[#287BFF] dark:hover:text-[#38BDF8] hover:bg-slate-100 dark:hover:bg-[#17243B] cursor-pointer"
                        aria-label={`Edit ${goal.title}`}
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(goal)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-[#F87171] hover:bg-slate-100 dark:hover:bg-[#17243B] cursor-pointer"
                        aria-label={`Delete ${goal.title}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs font-mono tabular-nums mb-1.5">
                      <span className="font-bold text-cyan-600 dark:text-[#22D3EE]">
                        {formatINR(goal.currentAmount)}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">
                        {pct.toFixed(1)}% of {formatINR(goal.targetAmount)}
                      </span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-[#17243B] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          achieved
                            ? 'bg-[#22C55E]'
                            : 'bg-gradient-to-r from-[#287BFF] to-[#22D3EE]'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                      />
                    </div>
                  </div>

                  {goal.notes && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">{goal.notes}</p>
                  )}

                  {/* Quick Add Contribution */}
                  <div className="pt-3 border-t border-slate-100 dark:border-[#1E2E4D] flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={contributionInputs[goal.id] ?? ''}
                      onChange={(e) =>
                        setContributionInputs((prev) => ({
                          ...prev,
                          [goal.id]: e.target.value,
                        }))
                      }
                      placeholder="Add ₹ amount..."
                      className="flex-1 px-3 py-2 rounded-xl text-xs font-mono tabular-nums bg-slate-50 dark:bg-[#17243B] border border-slate-200 dark:border-[#243656] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#287BFF]"
                    />
                    <button
                      type="button"
                      onClick={() => void handleAddContribution(goal)}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-[#287BFF] hover:bg-[#1D5ED8] transition-colors whitespace-nowrap cursor-pointer"
                    >
                      + Contribute
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        title="Delete Savings Goal"
        description={
          deleteTarget
            ? `Permanently delete savings goal "${deleteTarget.title}"?`
            : ''
        }
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void handleConfirmDelete()}
      />
    </div>
  );
}
