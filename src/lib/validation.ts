import type { PaymentMethod, TransactionType } from '../types/finance.ts';

// Synchronized verbatim with firebase-blueprint.json & firestore.rules
export const VALIDATION_LIMITS = {
  ID_MAX: 128,
  ID_PATTERN: /^[a-zA-Z0-9_-]+$/,
  DISPLAY_NAME_MIN: 1,
  DISPLAY_NAME_MAX: 80,
  EMAIL_MIN: 3,
  EMAIL_MAX: 254,
  CATEGORY_NAME_MIN: 1,
  CATEGORY_NAME_MAX: 50,
  HEX_COLOR_PATTERN: /^#[0-9a-fA-F]{6}$/,
  TITLE_MIN: 1,
  TITLE_MAX: 100,
  NOTES_MAX: 500,
  GOAL_TITLE_MIN: 1,
  GOAL_TITLE_MAX: 80,
  GOAL_NOTES_MAX: 300,
  AMOUNT_MAX: 1000000000,
  DATE_TIME_PATTERN: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/,
  DATE_PATTERN: /^\d{4}-\d{2}-\d{2}$/,
  MONTH_KEY_PATTERN: /^\d{4}-\d{2}$/,
  YEAR_KEY_PATTERN: /^\d{4}$/,
  RECEIPT_DATA_URL_MAX: 450000,
  RECEIPT_FILE_NAME_MAX: 140,
} as const;

export const PAYMENT_METHODS: PaymentMethod[] = [
  'UPI',
  'Debit Card',
  'Credit Card',
  'Bank Transfer',
  'Cash',
];

export interface TransactionInput {
  title: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  categoryName: string;
  dateTime: string;
  paymentMethod: PaymentMethod;
  notes: string;
}

export function validateTransactionInput(input: TransactionInput): string | null {
  const title = input.title.trim();
  if (title.length < VALIDATION_LIMITS.TITLE_MIN || title.length > VALIDATION_LIMITS.TITLE_MAX) {
    return `Transaction title must be between 1 and ${VALIDATION_LIMITS.TITLE_MAX} characters.`;
  }
  if (!Number.isFinite(input.amount) || input.amount <= 0 || input.amount > VALIDATION_LIMITS.AMOUNT_MAX) {
    return 'Amount must be greater than ₹0 and within ₹100 Crore.';
  }
  if (input.type !== 'income' && input.type !== 'expense') {
    return 'Transaction type must be Income or Expense.';
  }
  if (!input.categoryId || !VALIDATION_LIMITS.ID_PATTERN.test(input.categoryId)) {
    return 'Please select a valid category.';
  }
  if (!input.categoryName.trim() || input.categoryName.trim().length > VALIDATION_LIMITS.CATEGORY_NAME_MAX) {
    return 'Category name is invalid.';
  }
  if (!VALIDATION_LIMITS.DATE_TIME_PATTERN.test(input.dateTime)) {
    return 'Please choose a valid date and time.';
  }
  if (!PAYMENT_METHODS.includes(input.paymentMethod)) {
    return 'Please choose a valid payment method.';
  }
  if (input.notes.trim().length > VALIDATION_LIMITS.NOTES_MAX) {
    return `Notes cannot exceed ${VALIDATION_LIMITS.NOTES_MAX} characters.`;
  }
  return null;
}

export function validateCategoryInput(name: string, type: TransactionType, color: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length < VALIDATION_LIMITS.CATEGORY_NAME_MIN || trimmed.length > VALIDATION_LIMITS.CATEGORY_NAME_MAX) {
    return `Category name must be between 1 and ${VALIDATION_LIMITS.CATEGORY_NAME_MAX} characters.`;
  }
  if (type !== 'expense' && type !== 'income') {
    return 'Invalid category type.';
  }
  if (!VALIDATION_LIMITS.HEX_COLOR_PATTERN.test(color)) {
    return 'Please choose a valid 6-digit hex color.';
  }
  return null;
}

export function validateBudgetInput(categoryId: string, monthKey: string, limitAmount: number): string | null {
  if (!categoryId || !VALIDATION_LIMITS.ID_PATTERN.test(categoryId)) {
    return 'Please select a valid budget category.';
  }
  if (!VALIDATION_LIMITS.MONTH_KEY_PATTERN.test(monthKey)) {
    return 'Please choose a valid month (YYYY-MM).';
  }
  if (!Number.isFinite(limitAmount) || limitAmount <= 0 || limitAmount > VALIDATION_LIMITS.AMOUNT_MAX) {
    return 'Budget limit must be greater than ₹0.';
  }
  return null;
}

export interface SavingsGoalInput {
  title: string;
  targetAmount: number;
  currentAmount: number;
  monthlyTarget: number;
  targetDate: string;
  notes: string;
}

export function validateSavingsGoalInput(input: SavingsGoalInput): string | null {
  const title = input.title.trim();
  if (title.length < VALIDATION_LIMITS.GOAL_TITLE_MIN || title.length > VALIDATION_LIMITS.GOAL_TITLE_MAX) {
    return `Goal title must be between 1 and ${VALIDATION_LIMITS.GOAL_TITLE_MAX} characters.`;
  }
  if (!Number.isFinite(input.targetAmount) || input.targetAmount <= 0 || input.targetAmount > VALIDATION_LIMITS.AMOUNT_MAX) {
    return 'Target amount must be greater than ₹0.';
  }
  if (!Number.isFinite(input.currentAmount) || input.currentAmount < 0 || input.currentAmount > VALIDATION_LIMITS.AMOUNT_MAX) {
    return 'Current saved amount cannot be negative.';
  }
  if (!Number.isFinite(input.monthlyTarget) || input.monthlyTarget < 0 || input.monthlyTarget > VALIDATION_LIMITS.AMOUNT_MAX) {
    return 'Monthly target cannot be negative.';
  }
  if (!VALIDATION_LIMITS.DATE_PATTERN.test(input.targetDate)) {
    return 'Please choose a valid target date.';
  }
  if (input.notes.trim().length > VALIDATION_LIMITS.GOAL_NOTES_MAX) {
    return `Notes cannot exceed ${VALIDATION_LIMITS.GOAL_NOTES_MAX} characters.`;
  }
  return null;
}

export function sanitizeId(raw: string): string {
  return raw
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, VALIDATION_LIMITS.ID_MAX);
}
