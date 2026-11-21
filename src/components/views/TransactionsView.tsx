import { useMemo, useState } from 'react';
import {
  ArrowDownUp,
  Download,
  Edit3,
  FileText,
  Plus,
  Receipt as ReceiptIcon,
  Search,
  Trash2,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext.tsx';
import { exportReportToPDF, exportTransactionsToCSV } from '../../lib/exporters.ts';
import {
  formatDateTimeDisplay,
  formatINR,
  getCurrentMonthKey,
  getCurrentYearKey,
  getMonthLabel,
} from '../../lib/format.ts';
import type { Transaction, TransactionType } from '../../types/finance.ts';
import { ConfirmDeleteModal } from '../ConfirmDeleteModal.tsx';
import { ReceiptViewerModal } from '../ReceiptViewerModal.tsx';

type PeriodScope = 'all' | 'monthly' | 'yearly';
type SortOption = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';

export function TransactionsView() {
  const {
    user,
    profile,
    transactions,
    categories,
    setActiveNav,
    setEditingTransaction,
    deleteTransaction,
    showToast,
  } = useFinance();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [periodScope, setPeriodScope] = useState<PeriodScope>('all');
  const [monthFilter, setMonthFilter] = useState(getCurrentMonthKey());
  const [yearFilter, setYearFilter] = useState(getCurrentYearKey());
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');

  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [receiptTarget, setReceiptTarget] = useState<{ id: string; title: string } | null>(null);

  const availableYears = useMemo(() => {
    const years = new Set<string>([getCurrentYearKey()]);
    transactions.forEach((t) => years.add(t.yearKey));
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [transactions]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return transactions
      .filter((tx) => {
        if (q && !tx.title.toLowerCase().includes(q) && !tx.notes.toLowerCase().includes(q)) {
          return false;
        }
        if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
        if (categoryFilter !== 'all' && tx.categoryName !== categoryFilter) return false;
        if (periodScope === 'monthly' && tx.monthKey !== monthFilter) return false;
        if (periodScope === 'yearly' && tx.yearKey !== yearFilter) return false;
        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'date-asc':
            return a.dateTime.localeCompare(b.dateTime);
          case 'amount-desc':
            return b.amount - a.amount;
          case 'amount-asc':
            return a.amount - b.amount;
          case 'date-desc':
          default:
            return b.dateTime.localeCompare(a.dateTime);
        }
      });
  }, [categoryFilter, monthFilter, periodScope, search, sortBy, transactions, typeFilter, yearFilter]);

  const totals = useMemo(() => {
    const income = filtered
      .filter((t) => t.type === 'income')
      .reduce((s, t) => s + t.amount, 0);
    const expense = filtered
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0);
    return { income, expense, net: income - expense };
  }, [filtered]);

  const periodLabel =
    periodScope === 'monthly'
      ? getMonthLabel(monthFilter)
      : periodScope === 'yearly'
        ? `Year ${yearFilter}`
        : 'All History';

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

  return (
    <div className="space-y-6">
      {/* Filter Toolbar */}
      <section className="rounded-2xl border border-slate-200 dark:border-[#1E2E4D] bg-white dark:bg-[#111C32] p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Period segmented control */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-[#0B1224] border border-slate-200 dark:border-[#1E2E4D]">
              {(['all', 'monthly', 'yearly'] as PeriodScope[]).map((scope) => (
                <button
                  key={scope}
                  type="button"
                  onClick={() => setPeriodScope(scope)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors cursor-pointer whitespace-nowrap ${
                    periodScope === scope
                      ? 'bg-white dark:bg-[#17243B] text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {scope === 'all' ? 'All Time' : scope}
                </button>
              ))}
            </div>

            {periodScope === 'monthly' && (
              <input
                type="month"
                value={monthFilter}
                onChange={(e) => e.target.value && setMonthFilter(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs font-medium bg-slate-50 dark:bg-[#17243B] border border-slate-200 dark:border-[#243656] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#287BFF]"
              />
            )}

            {periodScope === 'yearly' && (
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs font-medium bg-slate-50 dark:bg-[#17243B] border border-slate-200 dark:border-[#243656] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#287BFF]"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Export actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => exportTransactionsToCSV(filtered, periodLabel)}
              disabled={filtered.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-[#243656] bg-slate-50 dark:bg-[#17243B] text-slate-700 dark:text-slate-200 hover:border-[#287BFF]/50 disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
            <button
              type="button"
              onClick={() =>
                exportReportToPDF(
                  filtered,
                  `Transaction History (${periodLabel})`,
                  profile?.email || user?.email || '',
                )
              }
              disabled={filtered.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-[#243656] bg-slate-50 dark:bg-[#17243B] text-slate-700 dark:text-slate-200 hover:border-[#287BFF]/50 disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap"
            >
              <FileText className="w-3.5 h-3.5" />
              Export PDF
            </button>
          </div>
        </div>

        {/* Search, Type, Category, Sort */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by transaction name or note..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-[#17243B] border border-slate-200 dark:border-[#243656] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#287BFF]"
            />
          </div>

          <div className="lg:col-span-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as 'all' | TransactionType)}
              aria-label="Filter by transaction type"
              className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-[#17243B] border border-slate-200 dark:border-[#243656] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#287BFF]"
            >
              <option value="all">All Types</option>
              <option value="expense">Expenses</option>
              <option value="income">Income</option>
            </select>
          </div>

          <div className="lg:col-span-3">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filter by category"
              className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-[#17243B] border border-slate-200 dark:border-[#243656] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#287BFF]"
            >
              <option value="all">All Categories</option>
              {Array.from(new Set(categories.map((c) => c.name)))
                .sort()
                .map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
            </select>
          </div>

          <div className="lg:col-span-3 relative">
            <ArrowDownUp className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              aria-label="Sort transactions"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-[#17243B] border border-slate-200 dark:border-[#243656] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#287BFF]"
            >
              <option value="date-desc">Newest First</option>
              <option value="date-asc">Oldest First</option>
              <option value="amount-desc">Amount: High to Low</option>
              <option value="amount-asc">Amount: Low to High</option>
            </select>
          </div>
        </div>
      </section>

      {/* Summary Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 dark:border-[#1E2E4D] bg-white dark:bg-[#111C32] px-5 py-4 flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Filtered Income
          </span>
          <span className="text-base font-bold font-mono tabular-nums text-emerald-600 dark:text-[#22C55E]">
            +{formatINR(totals.income)}
          </span>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-[#1E2E4D] bg-white dark:bg-[#111C32] px-5 py-4 flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Filtered Expenses
          </span>
          <span className="text-base font-bold font-mono tabular-nums text-red-600 dark:text-[#F87171]">
            -{formatINR(totals.expense)}
          </span>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-[#1E2E4D] bg-white dark:bg-[#111C32] px-5 py-4 flex items-center justify-between">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Net ({filtered.length} entries)
          </span>
          <span className="text-base font-bold font-mono tabular-nums text-cyan-600 dark:text-[#22D3EE]">
            {formatINR(totals.net)}
          </span>
        </div>
      </section>

      {/* Transactions Table */}
      <section className="rounded-2xl border border-slate-200 dark:border-[#1E2E4D] bg-white dark:bg-[#111C32] overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-semibold text-slate-800 dark:text-white">
              No matching transactions found
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-5">
              Adjust your search filters or record a new transaction.
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
              Add Transaction
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-[#1E2E4D] bg-slate-50/70 dark:bg-[#0B1224] text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <th className="py-3.5 px-5">Transaction</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Method</th>
                  <th className="py-3.5 px-4">Date & Time</th>
                  <th className="py-3.5 px-4 text-right">Amount</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#1E2E4D] text-sm">
                {filtered.map((tx) => (
                  <tr
                    key={tx.id}
                    className="hover:bg-slate-50 dark:hover:bg-[#17243B]/50 transition-colors"
                  >
                    <td className="py-3.5 px-5 max-w-[260px]">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-white truncate">
                          {tx.title}
                        </span>
                        {tx.receiptId && (
                          <button
                            type="button"
                            onClick={() => setReceiptTarget({ id: tx.receiptId, title: tx.title })}
                            className="text-[#287BFF] dark:text-[#38BDF8] hover:opacity-80 cursor-pointer shrink-0"
                            title="View receipt"
                          >
                            <ReceiptIcon className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      {tx.notes && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {tx.notes}
                        </p>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {tx.categoryName}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {tx.paymentMethod}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {formatDateTimeDisplay(tx.dateTime)}
                    </td>
                    <td
                      className={`py-3.5 px-4 text-right font-mono tabular-nums font-bold whitespace-nowrap ${
                        tx.type === 'income'
                          ? 'text-emerald-600 dark:text-[#22C55E]'
                          : 'text-red-600 dark:text-[#F87171]'
                      }`}
                    >
                      {tx.type === 'income' ? '+' : '-'}
                      {formatINR(tx.amount)}
                    </td>
                    <td className="py-3.5 px-5 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        title="Delete Transaction"
        description={
          deleteTarget
            ? `Permanently delete "${deleteTarget.title}" (${formatINR(deleteTarget.amount)}) from your history?`
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
