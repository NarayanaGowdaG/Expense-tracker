import type { TransactionType } from '../types/finance.ts';

export interface DefaultCategorySeed {
  id: string;
  name: string;
  type: TransactionType;
  color: string;
}

export const DEFAULT_EXPENSE_CATEGORIES: DefaultCategorySeed[] = [
  { id: 'exp_food_dining', name: 'Food & Dining', type: 'expense', color: '#F97316' },
  { id: 'exp_transportation', name: 'Transportation', type: 'expense', color: '#38BDF8' },
  { id: 'exp_shopping', name: 'Shopping', type: 'expense', color: '#A855F7' },
  { id: 'exp_education', name: 'Education', type: 'expense', color: '#287BFF' },
  { id: 'exp_healthcare', name: 'Healthcare', type: 'expense', color: '#F87171' },
  { id: 'exp_entertainment', name: 'Entertainment', type: 'expense', color: '#EC4899' },
  { id: 'exp_rent_bills', name: 'Rent & Bills', type: 'expense', color: '#EAB308' },
  { id: 'exp_travel', name: 'Travel', type: 'expense', color: '#22D3EE' },
  { id: 'exp_groceries', name: 'Groceries', type: 'expense', color: '#22C55E' },
  { id: 'exp_personal_care', name: 'Personal Care', type: 'expense', color: '#6366F1' },
  { id: 'exp_other', name: 'Other', type: 'expense', color: '#94A3B8' },
];

export const DEFAULT_INCOME_CATEGORIES: DefaultCategorySeed[] = [
  { id: 'inc_salary', name: 'Salary', type: 'income', color: '#22C55E' },
  { id: 'inc_freelancing', name: 'Freelancing', type: 'income', color: '#22D3EE' },
  { id: 'inc_business', name: 'Business', type: 'income', color: '#287BFF' },
  { id: 'inc_investments', name: 'Investments', type: 'income', color: '#A855F7' },
  { id: 'inc_allowance', name: 'Allowance', type: 'income', color: '#38BDF8' },
  { id: 'inc_other', name: 'Other Income', type: 'income', color: '#10B981' },
];

export const ALL_DEFAULT_CATEGORIES: DefaultCategorySeed[] = [
  ...DEFAULT_EXPENSE_CATEGORIES,
  ...DEFAULT_INCOME_CATEGORIES,
];

export const CATEGORY_COLOR_SWATCHES = [
  '#287BFF',
  '#38BDF8',
  '#22D3EE',
  '#22C55E',
  '#A855F7',
  '#F97316',
  '#F87171',
  '#EC4899',
  '#EAB308',
  '#6366F1',
];
