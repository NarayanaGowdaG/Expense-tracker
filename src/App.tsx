import { Loader2 } from 'lucide-react';
import { AuthScreen } from './components/AuthScreen.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { AppShell } from './components/layout/AppShell.tsx';
import { AnalyticsView } from './components/views/AnalyticsView.tsx';
import { BudgetsView } from './components/views/BudgetsView.tsx';
import { DashboardView } from './components/views/DashboardView.tsx';
import { IncomeView } from './components/views/IncomeView.tsx';
import { SavingsGoalsView } from './components/views/SavingsGoalsView.tsx';
import { SettingsView } from './components/views/SettingsView.tsx';
import { TransactionFormView } from './components/views/TransactionFormView.tsx';
import { TransactionsView } from './components/views/TransactionsView.tsx';
import { FinanceProvider, useFinance } from './context/FinanceContext.tsx';

function MyExpenseRouter() {
  const { user, authReady, activeNav, dataError } = useFinance();

  if (!authReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-[#080D1B] text-slate-600 dark:text-slate-300">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#287BFF]" />
          <span className="text-sm font-medium">Loading MyExpense...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <AppShell>
      {dataError && (
        <div className="mb-6 p-4 rounded-2xl border border-red-300 dark:border-red-500/40 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-[#F87171] text-sm">
          {dataError}
        </div>
      )}

      {activeNav === 'dashboard' && <DashboardView />}
      {activeNav === 'transactions' && <TransactionsView />}
      {activeNav === 'add-transaction' && <TransactionFormView />}
      {activeNav === 'budgets' && <BudgetsView />}
      {activeNav === 'income' && <IncomeView />}
      {activeNav === 'savings' && <SavingsGoalsView />}
      {activeNav === 'analytics' && <AnalyticsView />}
      {activeNav === 'settings' && <SettingsView />}
    </AppShell>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <FinanceProvider>
        <MyExpenseRouter />
      </FinanceProvider>
    </ErrorBoundary>
  );
}
