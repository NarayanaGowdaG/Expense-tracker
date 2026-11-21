import React, { useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  Edit3,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext.tsx';
import {
  formatDateTimeDisplay,
  formatINR,
  getCurrentDateTimeLocal,
  getMonthLabel,
} from '../../lib/format.ts';
import { PAYMENT_METHODS, VALIDATION_LIMITS } from '../../lib/validation.ts';
import type { PaymentMethod, Transaction } from '../../types/finance.ts';
import { ConfirmDeleteModal } from '../ConfirmDeleteModal.tsx';

export function IncomeView() {
  const {
    categories,
    transactions,
    selectedMonthKey,
    addTransaction,
    deleteTransaction,
    setEditingTransaction,
    setActiveNav,
    showToast,
  } = useFinance();

  const incomeCategories = useMemo(
    () => categories.filter((c) => c.type === 'income'),
    [categories],
  );

  const incomeTransactions = useMemo(
    () => transactions.filter((t) => t.type === 'income'),
    [transactions],
  );

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Bank Transfer');
  const [dateTime, setDateTime] = useState(getCurrentDateTimeLocal());
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState(false);

  const activeCategoryId = categoryId || incomeCategories[0]?.id || '';

  const summary = useMemo(() => {
    const totalAllTime = incomeTransactions.reduce((s, t) => s + t.amount, 0);
    const totalMonth = incomeTransactions
      .filter((t) => t.monthKey === selectedMonthKey)
      .reduce((s, t) => s + t.amount, 0);

    const bySource = new Map<string, number>();
    incomeCategories.forEach((c) => bySource.set(c.name, 0));
    incomeTransactions.forEach((t) => {
      bySource.set(t.categoryName, (bySource.get(t.categoryName) ?? 0) + t.amount);
    });

    const sourceBreakdown = Array.from(bySource.entries())
      .map(([name, total]) => ({
        name,
        total,
        color: incomeCategories.find((c) => c.name === name)?.color ?? '#22C55E',
      }))
      .sort((a, b) => b.total - a.total);

    return {
      totalAllTime,
      totalMonth,
      topSource: sourceBreakdown[0],
      sourceBreakdown,
    };
  }, [incomeCategories, incomeTransactions, selectedMonthKey]);

  const handleAddIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cat = incomeCategories.find((c) => c.id === activeCategoryId);
    if (!cat) {
      setError('Select a valid income source.');
      return;
    }

    setSaving(true);
    try {
      await addTransaction({
        title: title.trim(),
        amount: Number(amount),
        type: 'income',
        categoryId: cat.id,
        categoryName: cat.name,
        dateTime,
        paymentMethod,
        notes: notes.trim(),
      });
      showToast('success', `Income "${title.trim()}" recorded.`);
      setTitle('');
      setAmount('');
      setNotes('');
      setDateTime(getCurrentDateTimeLocal());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save income.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteTransaction(deleteTarget);
      showToast('success', 'Income entry deleted.');
      setDeleteTarget(null);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Unable to delete entry.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-emerald-500/30 bg-white dark:bg-[#111C32] p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Total Income (All Time)
            </span>
            <ArrowDownLeft className="w-4 h-4 text-emerald-600 dark:text-[#22C55E]" />
          </div>
          <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-[#22C55E]">
            {formatINR(summary.totalAllTime)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-[#1E2E4D] bg-white dark:bg-[#111C32] p-5">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {getMonthLabel(selectedMonthKey)} Income
          </span>
          <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {formatINR(summary.totalMonth)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-[#1E2E4D] bg-white dark:bg-[#111C32] p-5">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Top Income Source
          </span>
          <p className="mt-2 text-xl font-bold text-slate-900 dark:text-white truncate">
            {summary.topSource && summary.topSource.total > 0 ? summary.topSource.name : '—'}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums mt-0.5">
            {summary.topSource && summary.topSource.total > 0
              ? formatINR(summary.topSource.total)
              : 'No income logged'}
          </p>
        </div>
      </section>

      {/* Income Sources Breakdown + Quick Log Form */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Source Breakdown */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-[#1E2E4D] bg-white dark:bg-[#111C32] p-6">
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4">
            Income by Source
          </h2>
          <div className="space-y-3.5">
            {summary.sourceBreakdown.map((src) => {
              const share =
                summary.totalAllTime > 0 ? (src.total / summary.totalAllTime) * 100 : 0;
              return (
                <div key={src.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {src.name}
                    </span>
                    <span className="font-mono tabular-nums text-slate-600 dark:text-slate-300">
                      {formatINR(src.total)} · {share.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-[#17243B] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, share)}%`,
                        backgroundColor: src.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Log Income Form */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-[#1E2E4D] bg-white dark:bg-[#111C32] p-6">
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">
            Record Income
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
            Track salary, freelancing, business payouts, investments, or allowances.
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-xl border border-red-300 dark:border-red-500/40 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-[#F87171] text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleAddIncome} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Income Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. November Salary"
                  maxLength={VALIDATION_LIMITS.TITLE_MAX}
                  required
                  className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-[#17243B] border border-slate-200 dark:border-[#243656] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#287BFF]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Amount (₹ INR)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={VALIDATION_LIMITS.AMOUNT_MAX}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  className="w-full px-4 py-2.5 rounded-xl text-sm font-mono tabular-nums bg-slate-50 dark:bg-[#17243B] border border-slate-200 dark:border-[#243656] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#287BFF]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Income Source
                </label>
                <select
                  value={activeCategoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-[#17243B] border border-slate-200 dark:border-[#243656] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#287BFF]"
                >
                  {incomeCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Received Via
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-[#17243B] border border-slate-200 dark:border-[#243656] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#287BFF]"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm font-mono bg-slate-50 dark:bg-[#17243B] border border-slate-200 dark:border-[#243656] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#287BFF]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Notes (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={VALIDATION_LIMITS.NOTES_MAX}
                placeholder="Client name, dividend period, or bonus reference..."
                className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-[#17243B] border border-slate-200 dark:border-[#243656] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#287BFF]"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#287BFF] to-[#1D5ED8] hover:shadow-[0_0_20px_rgba(40,123,255,0.45)] disabled:opacity-60 transition-all cursor-pointer"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                <span>Add Income</span>
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Income History */}
      <section className="rounded-2xl border border-slate-200 dark:border-[#1E2E4D] bg-white dark:bg-[#111C32] overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-[#1E2E4D]">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Income History ({incomeTransactions.length})
          </h3>
        </div>

        {incomeTransactions.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">
            No income entries recorded yet. Use the form above to record your first income source.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-[#1E2E4D]">
            {incomeTransactions.map((tx) => (
              <div
                key={tx.id}
                className="px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-[#17243B]/50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    {tx.title}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {tx.categoryName} · {tx.paymentMethod} · {formatDateTimeDisplay(tx.dateTime)}
                  </p>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                  <span className="text-sm font-bold font-mono tabular-nums text-emerald-600 dark:text-[#22C55E]">
                    +{formatINR(tx.amount)}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTransaction(tx);
                        setActiveNav('add-transaction');
                      }}
                      className="p-2 rounded-lg text-slate-400 hover:text-[#287BFF] dark:hover:text-[#38BDF8] hover:bg-slate-100 dark:hover:bg-[#17243B] cursor-pointer"
                      aria-label={`Edit ${tx.title}`}
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(tx)}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-[#F87171] hover:bg-slate-100 dark:hover:bg-[#17243B] cursor-pointer"
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
        title="Delete Income Entry"
        description={
          deleteTarget
            ? `Permanently remove "${deleteTarget.title}" (${formatINR(deleteTarget.amount)})?`
            : ''
        }
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => void handleConfirmDelete()}
      />
    </div>
  );
}
