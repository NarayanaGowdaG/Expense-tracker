import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  ImagePlus,
  Loader2,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext.tsx';
import { CATEGORY_COLOR_SWATCHES } from '../../lib/defaults.ts';
import { getCurrentDateTimeLocal } from '../../lib/format.ts';
import { compressReceiptImage, type CompressedReceipt } from '../../lib/receipts.ts';
import { PAYMENT_METHODS, VALIDATION_LIMITS } from '../../lib/validation.ts';
import type { PaymentMethod, TransactionType } from '../../types/finance.ts';
import { ConfirmDeleteModal } from '../ConfirmDeleteModal.tsx';

export function TransactionFormView() {
  const {
    categories,
    editingTransaction,
    setEditingTransaction,
    setActiveNav,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addCategory,
    showToast,
  } = useFinance();

  const [type, setType] = useState<TransactionType>('expense');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [dateTime, setDateTime] = useState(getCurrentDateTimeLocal());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [notes, setNotes] = useState('');

  // Receipt image state
  const [receipt, setReceipt] = useState<CompressedReceipt | null>(null);
  const [existingReceiptId, setExistingReceiptId] = useState('');
  const [removeExistingReceipt, setRemoveExistingReceipt] = useState(false);
  const [compressing, setCompressing] = useState(false);

  // Quick inline custom category modal/form
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState(CATEGORY_COLOR_SWATCHES[0]);
  const [creatingCat, setCreatingCat] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const filteredCategories = useMemo(
    () => categories.filter((c) => c.type === type),
    [categories, type],
  );

  // Populate form when editing
  useEffect(() => {
    if (editingTransaction) {
      setType(editingTransaction.type);
      setTitle(editingTransaction.title);
      setAmount(String(editingTransaction.amount));
      setCategoryId(editingTransaction.categoryId);
      setDateTime(editingTransaction.dateTime);
      setPaymentMethod(editingTransaction.paymentMethod);
      setNotes(editingTransaction.notes || '');
      setExistingReceiptId(editingTransaction.receiptId || '');
      setReceipt(null);
      setRemoveExistingReceipt(false);
    } else {
      setType('expense');
      setTitle('');
      setAmount('');
      setDateTime(getCurrentDateTimeLocal());
      setPaymentMethod('UPI');
      setNotes('');
      setExistingReceiptId('');
      setReceipt(null);
      setRemoveExistingReceipt(false);
    }
    setError(null);
  }, [editingTransaction]);

  // Keep categoryId synced with active type
  useEffect(() => {
    if (filteredCategories.length === 0) return;
    const existsInType = filteredCategories.some((c) => c.id === categoryId);
    if (!existsInType) {
      setCategoryId(filteredCategories[0].id);
    }
  }, [categoryId, filteredCategories]);

  const handleReceiptSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setCompressing(true);
    try {
      const compressed = await compressReceiptImage(file);
      setReceipt(compressed);
      setRemoveExistingReceipt(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to attach receipt image.');
    } finally {
      setCompressing(false);
      e.target.value = '';
    }
  };

  const handleCreateCustomCategory = async () => {
    if (!newCatName.trim()) {
      setError('Enter a name for the custom category.');
      return;
    }
    setError(null);
    setCreatingCat(true);
    try {
      const created = await addCategory(newCatName.trim(), type, newCatColor);
      setCategoryId(created.id);
      setNewCatName('');
      setShowNewCat(false);
      showToast('success', `Category "${created.name}" created.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create category.');
    } finally {
      setCreatingCat(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedAmount = Number(amount);
    const selectedCategory = filteredCategories.find((c) => c.id === categoryId);
    if (!selectedCategory) {
      setError('Please select a category.');
      return;
    }

    const payload = {
      title: title.trim(),
      amount: parsedAmount,
      type,
      categoryId: selectedCategory.id,
      categoryName: selectedCategory.name,
      dateTime,
      paymentMethod,
      notes: notes.trim(),
    };

    setSaving(true);
    try {
      if (editingTransaction) {
        await updateTransaction(
          editingTransaction.id,
          existingReceiptId,
          payload,
          receipt,
          removeExistingReceipt,
        );
        showToast('success', 'Transaction updated and saved.');
        setEditingTransaction(null);
        setActiveNav('transactions');
      } else {
        await addTransaction(payload, receipt);
        showToast('success', `${type === 'income' ? 'Income' : 'Expense'} saved to your ledger.`);
        setTitle('');
        setAmount('');
        setNotes('');
        setReceipt(null);
        setDateTime(getCurrentDateTimeLocal());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save transaction.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingTransaction) return;
    setDeleting(true);
    try {
      await deleteTransaction(editingTransaction);
      showToast('success', 'Transaction deleted.');
      setConfirmDeleteOpen(false);
      setEditingTransaction(null);
      setActiveNav('transactions');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Delete failed.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="rounded-2xl border border-slate-200 dark:border-[#1E2E4D] bg-white dark:bg-[#111C32] p-6 sm:p-8 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 mb-6 border-b border-slate-200 dark:border-[#1E2E4D]">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {editingTransaction ? 'Edit Transaction' : 'Record New Transaction'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Every entry updates your balance, category budgets, and analytics immediately.
            </p>
          </div>
          {editingTransaction && (
            <button
              type="button"
              onClick={() => setConfirmDeleteOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-red-300 dark:border-red-500/40 text-red-600 dark:text-[#F87171] hover:bg-red-500/10 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Entry
            </button>
          )}
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-xl border border-red-300 dark:border-red-500/40 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-[#F87171] text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Type Segmented Toggle */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Transaction Type
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-[#0B1224] border border-slate-200 dark:border-[#1E2E4D]">
              <button
                type="button"
                onClick={() => setType('expense')}
                className={`py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                  type === 'expense'
                    ? 'bg-red-500/15 text-red-600 dark:text-[#F87171] border border-red-500/30'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-transparent'
                }`}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => setType('income')}
                className={`py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                  type === 'income'
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-[#22C55E] border border-emerald-500/30'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-transparent'
                }`}
              >
                Income
              </button>
            </div>
          </div>

          {/* Title & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-7">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Transaction Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={type === 'expense' ? 'e.g. BigBasket Groceries' : 'e.g. Monthly Salary'}
                maxLength={VALIDATION_LIMITS.TITLE_MAX}
                required
                className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-[#17243B] border border-slate-200 dark:border-[#243656] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#287BFF]"
              />
            </div>

            <div className="sm:col-span-5">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Amount (₹ INR)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-mono font-semibold text-slate-400">
                  ₹
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={VALIDATION_LIMITS.AMOUNT_MAX}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm font-mono tabular-nums bg-slate-50 dark:bg-[#17243B] border border-slate-200 dark:border-[#243656] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#287BFF]"
                />
              </div>
            </div>
          </div>

          {/* Category & Date/Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Category
                </label>
                <button
                  type="button"
                  onClick={() => setShowNewCat((prev) => !prev)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#287BFF] dark:text-[#38BDF8] hover:underline cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Custom Category
                </button>
              </div>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-[#17243B] border border-slate-200 dark:border-[#243656] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#287BFF]"
              >
                {filteredCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
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
                className="w-full px-4 py-2.5 rounded-xl text-sm font-mono bg-slate-50 dark:bg-[#17243B] border border-slate-200 dark:border-[#243656] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#287BFF]"
              />
            </div>
          </div>

          {/* Inline Custom Category Creator */}
          {showNewCat && (
            <div className="p-4 rounded-xl border border-[#287BFF]/30 bg-blue-50/60 dark:bg-[#0B1224] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-900 dark:text-white">
                  New {type === 'expense' ? 'Expense' : 'Income'} Category
                </span>
                <button
                  type="button"
                  onClick={() => setShowNewCat(false)}
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Category name (e.g. Subscriptions)"
                  maxLength={VALIDATION_LIMITS.CATEGORY_NAME_MAX}
                  className="flex-1 px-3.5 py-2 rounded-xl text-sm bg-white dark:bg-[#17243B] border border-slate-200 dark:border-[#243656] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#287BFF]"
                />
                <button
                  type="button"
                  onClick={() => void handleCreateCustomCategory()}
                  disabled={creatingCat}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#287BFF] hover:bg-[#1D5ED8] disabled:opacity-60 cursor-pointer whitespace-nowrap"
                >
                  {creatingCat ? 'Saving...' : 'Create Category'}
                </button>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {CATEGORY_COLOR_SWATCHES.map((swatch) => (
                  <button
                    key={swatch}
                    type="button"
                    onClick={() => setNewCatColor(swatch)}
                    className={`w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transition-transform ${
                      newCatColor === swatch ? 'scale-110 ring-2 ring-offset-2 ring-[#287BFF]' : ''
                    }`}
                    style={{ backgroundColor: swatch }}
                    aria-label={`Select color ${swatch}`}
                  >
                    {newCatColor === swatch && <Check className="w-3 h-3 text-white" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Payment Method
            </label>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer whitespace-nowrap ${
                    paymentMethod === method
                      ? 'bg-[#287BFF] text-white border-[#287BFF] shadow-[0_0_16px_rgba(40,123,255,0.3)]'
                      : 'bg-slate-50 dark:bg-[#17243B] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#243656] hover:border-[#287BFF]/50'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Description & Notes (Optional)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={VALIDATION_LIMITS.NOTES_MAX}
              placeholder="Add merchant details, invoice reference, or personal notes..."
              className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-[#17243B] border border-slate-200 dark:border-[#243656] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#287BFF]"
            />
          </div>

          {/* Optional Receipt Upload */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Receipt Image (Optional)
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold border border-dashed border-slate-300 dark:border-[#243656] bg-slate-50 dark:bg-[#17243B] text-slate-700 dark:text-slate-200 hover:border-[#287BFF] transition-colors cursor-pointer">
                {compressing ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#287BFF]" />
                ) : (
                  <ImagePlus className="w-4 h-4 text-[#287BFF]" />
                )}
                <span>{compressing ? 'Optimizing image...' : 'Attach Receipt Image'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleReceiptSelect}
                  className="hidden"
                />
              </label>

              {receipt && (
                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <img
                    src={receipt.dataUrl}
                    alt="Receipt preview"
                    className="w-10 h-10 rounded-lg object-cover border border-slate-200 dark:border-[#243656]"
                  />
                  <span className="truncate max-w-[180px]">{receipt.fileName}</span>
                  <button
                    type="button"
                    onClick={() => setReceipt(null)}
                    className="p-1 text-slate-400 hover:text-red-500 cursor-pointer"
                    aria-label="Remove attached receipt"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {!receipt && existingReceiptId && !removeExistingReceipt && (
                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                  <span>Existing receipt attached</span>
                  <button
                    type="button"
                    onClick={() => setRemoveExistingReceipt(true)}
                    className="text-red-600 dark:text-[#F87171] hover:underline cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-[#1E2E4D] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setEditingTransaction(null);
                setActiveNav('transactions');
              }}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 dark:border-[#243656] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#17243B] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || compressing}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#287BFF] to-[#1D5ED8] hover:shadow-[0_0_24px_rgba(40,123,255,0.45)] disabled:opacity-60 transition-all cursor-pointer"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{editingTransaction ? 'Update Transaction' : 'Save Transaction'}</span>
            </button>
          </div>
        </form>
      </div>

      <ConfirmDeleteModal
        open={confirmDeleteOpen}
        title="Delete Transaction"
        description={
          editingTransaction
            ? `Permanently delete "${editingTransaction.title}"? This action cannot be undone.`
            : ''
        }
        loading={deleting}
        onCancel={() => setConfirmDeleteOpen(false)}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
