import { useMemo, useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext.tsx';
import { exportReportToPDF, exportTransactionsToCSV } from '../../lib/exporters.ts';
import {
  formatINR,
  getCurrentYearKey,
  getLastNMonthKeys,
  getMonthLabel,
} from '../../lib/format.ts';
import {
  CategoryDonutChart,
  DailySpendingBarChart,
  IncomeVsExpenseChart,
} from '../charts/FinanceCharts.tsx';

export function AnalyticsView() {
  const { user, profile, transactions, categories, selectedMonthKey } = useFinance();

  const availableYears = useMemo(() => {
    const set = new Set<string>([getCurrentYearKey()]);
    transactions.forEach((t) => set.add(t.yearKey));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [transactions]);

  const [selectedYear, setSelectedYear] = useState(getCurrentYearKey());
  const [monthCount, setMonthCount] = useState<6 | 12>(6);

  const monthSeries = useMemo(() => {
    const keys = getLastNMonthKeys(monthCount, selectedMonthKey);
    return keys.map((mk) => {
      const mTxs = transactions.filter((t) => t.monthKey === mk);
      const income = mTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const expense = mTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      return {
        monthKey: mk,
        label: getMonthLabel(mk, true),
        income,
        expense,
        savings: income - expense,
      };
    });
  }, [monthCount, selectedMonthKey, transactions]);

  const activeMonthTxs = useMemo(
    () => transactions.filter((t) => t.monthKey === selectedMonthKey),
    [selectedMonthKey, transactions],
  );

  const analyticsMetrics = useMemo(() => {
    const income = activeMonthTxs
      .filter((t) => t.type === 'income')
      .reduce((s, t) => s + t.amount, 0);
    const expense = activeMonthTxs
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0);
    const savings = income - expense;
    const savingsPct = income > 0 ? (savings / income) * 100 : 0;

    // Days in selectedMonthKey
    const [y, m] = selectedMonthKey.split('-').map(Number);
    const daysInMonth = y && m ? new Date(y, m, 0).getDate() : 30;
    const avgDailyExpense = expense / daysInMonth;

    // Category breakdown
    const catTotals = new Map<string, number>();
    activeMonthTxs
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        catTotals.set(t.categoryName, (catTotals.get(t.categoryName) ?? 0) + t.amount);
      });

    const colorMap = new Map<string, string>();
    categories.forEach((c) => colorMap.set(c.name, c.color));

    const slices = Array.from(catTotals.entries())
      .map(([name, amount]) => ({
        name,
        amount,
        color: colorMap.get(name) ?? '#287BFF',
      }))
      .sort((a, b) => b.amount - a.amount);

    const highestCategory = slices[0] ?? null;

    // Daily spending pattern (day 01 .. daysInMonth)
    const dailyTotals = Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      value: 0,
    }));
    activeMonthTxs
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        const dayNum = Number(t.dateTime.slice(8, 10));
        if (dayNum >= 1 && dayNum <= daysInMonth) {
          dailyTotals[dayNum - 1].value += t.amount;
        }
      });

    return {
      income,
      expense,
      savings,
      savingsPct,
      avgDailyExpense,
      highestCategory,
      slices,
      dailyPattern: dailyTotals.map((d) => ({
        label: String(d.day).padStart(2, '0'),
        value: d.value,
      })),
    };
  }, [activeMonthTxs, categories, selectedMonthKey]);

  const yearlySummary = useMemo(() => {
    const yearTxs = transactions.filter((t) => t.yearKey === selectedYear);
    const months = Array.from({ length: 12 }, (_, idx) => {
      const mk = `${selectedYear}-${String(idx + 1).padStart(2, '0')}`;
      const mTxs = yearTxs.filter((t) => t.monthKey === mk);
      const income = mTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
      const expense = mTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      return {
        monthKey: mk,
        label: getMonthLabel(mk),
        income,
        expense,
        savings: income - expense,
        count: mTxs.length,
      };
    });

    const totalIncome = months.reduce((s, m) => s + m.income, 0);
    const totalExpense = months.reduce((s, m) => s + m.expense, 0);
    const totalSavings = totalIncome - totalExpense;

    return {
      yearTxs,
      months: months.filter((m) => m.count > 0),
      totalIncome,
      totalExpense,
      totalSavings,
    };
  }, [selectedYear, transactions]);

  return (
    <div className="space-y-6">
      {/* Top Export & Range Controls */}
      <section className="rounded-2xl border border-slate-200 dark:border-[#1E2E4D] bg-white dark:bg-[#111C32] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Financial Analytics & Reports
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Active Focus: {getMonthLabel(selectedMonthKey)} · Annual Summary: {selectedYear}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-[#0B1224] border border-slate-200 dark:border-[#1E2E4D]">
            <button
              type="button"
              onClick={() => setMonthCount(6)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                monthCount === 6
                  ? 'bg-white dark:bg-[#17243B] text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              6 Months
            </button>
            <button
              type="button"
              onClick={() => setMonthCount(12)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                monthCount === 12
                  ? 'bg-white dark:bg-[#17243B] text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              12 Months
            </button>
          </div>

          <button
            type="button"
            onClick={() =>
              exportTransactionsToCSV(
                activeMonthTxs.length > 0 ? activeMonthTxs : transactions,
                getMonthLabel(selectedMonthKey),
              )
            }
            disabled={transactions.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-[#243656] bg-slate-50 dark:bg-[#17243B] text-slate-700 dark:text-slate-200 hover:border-[#287BFF]/50 disabled:opacity-50 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>

          <button
            type="button"
            onClick={() =>
              exportReportToPDF(
                activeMonthTxs.length > 0 ? activeMonthTxs : transactions,
                `${getMonthLabel(selectedMonthKey)} Financial Report`,
                profile?.email || user?.email || '',
              )
            }
            disabled={transactions.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#287BFF] to-[#1D5ED8] hover:shadow-[0_0_20px_rgba(40,123,255,0.45)] disabled:opacity-50 transition-all cursor-pointer whitespace-nowrap"
          >
            <FileText className="w-3.5 h-3.5" />
            Export PDF
          </button>
        </div>
      </section>

      {/* Analytical Highlights */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 dark:border-[#1E2E4D] bg-white dark:bg-[#111C32] p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Highest Spending Category
          </p>
          <p className="mt-2 text-lg font-bold text-slate-900 dark:text-white truncate">
            {analyticsMetrics.highestCategory ? analyticsMetrics.highestCategory.name : '—'}
          </p>
          <p className="mt-1 text-xs font-mono tabular-nums text-red-600 dark:text-[#F87171]">
            {analyticsMetrics.highestCategory
              ? formatINR(analyticsMetrics.highestCategory.amount)
              : 'No expenses'}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-[#1E2E4D] bg-white dark:bg-[#111C32] p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Average Daily Expense
          </p>
          <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-purple-600 dark:text-[#A855F7]">
            {formatINR(analyticsMetrics.avgDailyExpense)}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Per day in {getMonthLabel(selectedMonthKey, true)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-[#1E2E4D] bg-white dark:bg-[#111C32] p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Savings Percentage
          </p>
          <p className="mt-2 text-2xl font-bold font-mono tabular-nums text-cyan-600 dark:text-[#22D3EE]">
            {analyticsMetrics.savingsPct.toFixed(1)}%
          </p>
          <p className="mt-1 text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
            Net: {formatINR(analyticsMetrics.savings)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-[#1E2E4D] bg-white dark:bg-[#111C32] p-5">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Year {selectedYear} Net Cashflow
          </p>
          <p
            className={`mt-2 text-2xl font-bold font-mono tabular-nums ${
              yearlySummary.totalSavings >= 0
                ? 'text-emerald-600 dark:text-[#22C55E]'
                : 'text-red-600 dark:text-[#F87171]'
            }`}
          >
            {formatINR(yearlySummary.totalSavings)}
          </p>
          <p className="mt-1 text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
            In: {formatINR(yearlySummary.totalIncome)}
          </p>
        </div>
      </section>

      {/* Monthly Income & Expenses + Category Breakdown */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-200 dark:border-[#1E2E4D] bg-white dark:bg-[#111C32] p-6">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
            Monthly Income & Expenses
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            {monthCount}-month income vs expense comparison
          </p>
          <IncomeVsExpenseChart data={monthSeries} />
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-[#1E2E4D] bg-white dark:bg-[#111C32] p-6">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
            Category-wise Spending Breakdown
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Distribution for {getMonthLabel(selectedMonthKey)}
          </p>
          <CategoryDonutChart slices={analyticsMetrics.slices} />
        </div>
      </section>

      {/* Daily Spending Patterns */}
      <section className="rounded-2xl border border-slate-200 dark:border-[#1E2E4D] bg-white dark:bg-[#111C32] p-6">
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
          Daily Spending Pattern
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Day-by-day expense intensity for {getMonthLabel(selectedMonthKey)}
        </p>
        <DailySpendingBarChart data={analyticsMetrics.dailyPattern} />
      </section>

      {/* Yearly Financial Summary Table */}
      <section className="rounded-2xl border border-slate-200 dark:border-[#1E2E4D] bg-white dark:bg-[#111C32] overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-[#1E2E4D] flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Yearly Financial Summary
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Month-by-month performance for {selectedYear}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              aria-label="Select summary year"
              className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-50 dark:bg-[#17243B] border border-slate-200 dark:border-[#243656] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#287BFF]"
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() =>
                exportReportToPDF(
                  yearlySummary.yearTxs,
                  `Annual Financial Report ${selectedYear}`,
                  profile?.email || user?.email || '',
                )
              }
              disabled={yearlySummary.yearTxs.length === 0}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-[#243656] text-slate-700 dark:text-slate-200 hover:border-[#287BFF]/50 disabled:opacity-50 cursor-pointer"
            >
              Year PDF
            </button>
          </div>
        </div>

        {yearlySummary.months.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">
            No transactions recorded for {selectedYear}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-[#1E2E4D] bg-slate-50/70 dark:bg-[#0B1224] text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-5">Month</th>
                  <th className="py-3 px-4 text-right">Entries</th>
                  <th className="py-3 px-4 text-right">Income</th>
                  <th className="py-3 px-4 text-right">Expenses</th>
                  <th className="py-3 px-5 text-right">Net Savings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#1E2E4D] text-sm">
                {yearlySummary.months.map((row) => (
                  <tr key={row.monthKey} className="hover:bg-slate-50 dark:hover:bg-[#17243B]/40">
                    <td className="py-3 px-5 font-semibold text-slate-900 dark:text-white">
                      {row.label}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      {row.count}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-600 dark:text-[#22C55E]">
                      {formatINR(row.income)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-red-600 dark:text-[#F87171]">
                      {formatINR(row.expense)}
                    </td>
                    <td
                      className={`py-3 px-5 text-right font-mono tabular-nums font-bold ${
                        row.savings >= 0
                          ? 'text-cyan-600 dark:text-[#22D3EE]'
                          : 'text-red-600 dark:text-[#F87171]'
                      }`}
                    >
                      {formatINR(row.savings)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 dark:border-[#1E2E4D] bg-slate-50/80 dark:bg-[#0B1224] text-sm font-bold">
                  <td className="py-3.5 px-5 text-slate-900 dark:text-white">
                    {selectedYear} Total
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-500 dark:text-slate-400">
                    {yearlySummary.yearTxs.length}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-emerald-600 dark:text-[#22C55E]">
                    {formatINR(yearlySummary.totalIncome)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums text-red-600 dark:text-[#F87171]">
                    {formatINR(yearlySummary.totalExpense)}
                  </td>
                  <td className="py-3.5 px-5 text-right font-mono tabular-nums text-cyan-600 dark:text-[#22D3EE]">
                    {formatINR(yearlySummary.totalSavings)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
