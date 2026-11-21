export type TransactionType = 'income' | 'expense';

export type PaymentMethod =
  | 'Cash'
  | 'UPI'
  | 'Debit Card'
  | 'Credit Card'
  | 'Bank Transfer';

export type ThemeMode = 'dark' | 'light';

export type NavSection =
  | 'dashboard'
  | 'transactions'
  | 'add-transaction'
  | 'budgets'
  | 'income'
  | 'savings'
  | 'analytics'
  | 'settings';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  currency: 'INR';
  monthlyBudgetLimit: number;
  theme: ThemeMode;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  type: TransactionType;
  color: string;
  isDefault: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Transaction {
  id: string;
  userId: string;
  title: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  categoryName: string;
  dateTime: string; // YYYY-MM-DDTHH:mm
  monthKey: string; // YYYY-MM
  yearKey: string; // YYYY
  paymentMethod: PaymentMethod;
  notes: string;
  receiptId: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Receipt {
  id: string;
  userId: string;
  fileName: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  dataUrl: string;
  createdAt?: unknown;
}

export interface Budget {
  id: string;
  userId: string;
  categoryId: string; // 'overall' or category ID
  categoryName: string;
  monthKey: string; // YYYY-MM
  limitAmount: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface SavingsGoal {
  id: string;
  userId: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  monthlyTarget: number;
  targetDate: string; // YYYY-MM-DD
  notes: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface BudgetAlert {
  id: string;
  budgetId: string;
  categoryName: string;
  monthKey: string;
  spent: number;
  limit: number;
  percentage: number;
  severity: 'warning' | 'exceeded';
}
