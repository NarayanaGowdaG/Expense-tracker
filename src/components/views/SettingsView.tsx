import React, { useEffect, useState } from 'react';
import {
  Check,
  Loader2,
  Mail,
  Moon,
  Plus,
  Sun,
  Trash2,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext.tsx';
import { CATEGORY_COLOR_SWATCHES } from '../../lib/defaults.ts';
import { VALIDATION_LIMITS } from '../../lib/validation.ts';
import type { Category, ThemeMode, TransactionType } from '../../types/finance.ts';
import { ConfirmDeleteModal } from '../ConfirmDeleteModal.tsx';

export function SettingsView() {
  const {
    user,
    profile,
    categories,
    theme,
    updateProfileSettings,
    addCategory,
    deleteCategory,
    sendResetEmail,
    resendVerification,
    showToast,
  } = useFinance();

  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [monthlyBudgetLimit, setMonthlyBudgetLimit] = useState(
    String(profile?.monthlyBudgetLimit ?? 50000),
  );
  const [selectedTheme, setSelectedTheme] = useState<ThemeMode>(theme);
  const [savingProfile, setSavingProfile] = useState(false);

  const [newCatName, setNewCatName] = useState('');
  const [newCatType, setNewCatType] = useState<TransactionType>('expense');
  const [newCatColor, setNewCatColor] = useState(CATEGORY_COLOR_SWATCHES[0]);
  const [savingCat, setSavingCat] = useState(false);

  const [deleteCatTarget, setDeleteCatTarget] = useState<Category | null>(null);
  const [deletingCat, setDeletingCat] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName);
      setMonthlyBudgetLimit(String(profile.monthlyBudgetLimit));
      setSelectedTheme(profile.theme);
    }
  }, [profile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateProfileSettings(
        displayName,
        Number(monthlyBudgetLimit || 0),
        selectedTheme,
      );
      showToast('success', 'Account settings saved.');
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Unable to save settings.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCat(true);
    try {
      const created = await addCategory(newCatName, newCatType, newCatColor);
      setNewCatName('');
      showToast('success', `Custom category "${created.name}" added.`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Unable to add category.');
    } finally {
      setSavingCat(false);
    }
  };

  const handleConfirmDeleteCategory = async () => {
    if (!deleteCatTarget) return;
    setDeletingCat(true);
    try {
      await deleteCategory(deleteCatTarget.id);
      showToast('success', `Category "${deleteCatTarget.name}" removed.`);
      setDeleteCatTarget(null);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Unable to delete category.');
    } finally {
      setDeletingCat(false);
    }
  };

  const handleSendPasswordReset = async () => {
    const email = profile?.email || user?.email;
    if (!email) return;
    try {
      await sendResetEmail(email);
      showToast('success', `Password reset link sent to ${email}.`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Unable to send reset link.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile & Preferences */}
      <section className="rounded-2xl border border-slate-200 dark:border-[#1E2E4D] bg-white dark:bg-[#111C32] p-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
          Account & Preferences
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
          Manage your profile, default monthly budget, and visual appearance.
        </p>

        <form onSubmit={handleSaveProfile} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={VALIDATION_LIMITS.DISPLAY_NAME_MAX}
                required
                className="w-full px-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-[#17243B] border border-slate-200 dark:border-[#243656] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#287BFF]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Default Overall Monthly Budget (₹)
              </label>
              <input
                type="number"
                step="1"
                min="0"
                max={VALIDATION_LIMITS.AMOUNT_MAX}
                value={monthlyBudgetLimit}
                onChange={(e) => setMonthlyBudgetLimit(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-xl text-sm font-mono tabular-nums bg-slate-50 dark:bg-[#17243B] border border-slate-200 dark:border-[#243656] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#287BFF]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Interface Theme
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-100 dark:bg-[#0B1224] border border-slate-200 dark:border-[#1E2E4D]">
                <button
                  type="button"
                  onClick={() => setSelectedTheme('dark')}
                  className={`inline-flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
                    selectedTheme === 'dark'
                      ? 'bg-white dark:bg-[#17243B] text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5 text-[#38BDF8]" />
                  Dark Midnight
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTheme('light')}
                  className={`inline-flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
                    selectedTheme === 'light'
                      ? 'bg-white dark:bg-[#17243B] text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  Light Mode
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Registered Email
              </label>
              <div className="px-4 py-2.5 rounded-xl text-sm bg-slate-100 dark:bg-[#0B1224] border border-slate-200 dark:border-[#1E2E4D] text-slate-600 dark:text-slate-300 truncate">
                {profile?.email || user?.email}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-[#1E2E4D] flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void handleSendPasswordReset()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-[#243656] text-slate-700 dark:text-slate-200 hover:border-[#287BFF]/50 cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5" />
                Send Password Reset Email
              </button>

              {user && !user.emailVerified && (
                <button
                  type="button"
                  onClick={() => void resendVerification()}
                  className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                >
                  Verify Email Address
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#287BFF] to-[#1D5ED8] hover:shadow-[0_0_20px_rgba(40,123,255,0.45)] disabled:opacity-60 transition-all cursor-pointer"
            >
              {savingProfile && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Save Settings</span>
            </button>
          </div>
        </form>
      </section>

      {/* Custom Categories Manager */}
      <section className="rounded-2xl border border-slate-200 dark:border-[#1E2E4D] bg-white dark:bg-[#111C32] p-6 space-y-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
            Expense & Income Categories
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Create custom categories for specialized expenses or income streams.
          </p>
        </div>

        <form onSubmit={handleAddCategory} className="p-4 rounded-xl bg-slate-50 dark:bg-[#0B1224] border border-slate-200 dark:border-[#1E2E4D] space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-6">
              <input
                type="text"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="New category name (e.g. Subscriptions)"
                maxLength={VALIDATION_LIMITS.CATEGORY_NAME_MAX}
                required
                className="w-full px-3.5 py-2 rounded-xl text-sm bg-white dark:bg-[#17243B] border border-slate-200 dark:border-[#243656] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#287BFF]"
              />
            </div>

            <div className="sm:col-span-3">
              <select
                value={newCatType}
                onChange={(e) => setNewCatType(e.target.value as TransactionType)}
                className="w-full px-3.5 py-2 rounded-xl text-sm bg-white dark:bg-[#17243B] border border-slate-200 dark:border-[#243656] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#287BFF]"
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>

            <div className="sm:col-span-3">
              <button
                type="submit"
                disabled={savingCat}
                className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl text-sm font-semibold text-white bg-[#287BFF] hover:bg-[#1D5ED8] disabled:opacity-60 cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-500 dark:text-slate-400 mr-1">Color:</span>
            {CATEGORY_COLOR_SWATCHES.map((swatch) => (
              <button
                key={swatch}
                type="button"
                onClick={() => setNewCatColor(swatch)}
                className={`w-6 h-6 rounded-full flex items-center justify-center cursor-pointer transition-transform ${
                  newCatColor === swatch ? 'scale-110 ring-2 ring-offset-2 ring-[#287BFF]' : ''
                }`}
                style={{ backgroundColor: swatch }}
                aria-label={`Pick color ${swatch}`}
              >
                {newCatColor === swatch && <Check className="w-3 h-3 text-white" />}
              </button>
            ))}
          </div>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Expense categories */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-3">
              Expense Categories
            </h3>
            <div className="divide-y divide-slate-100 dark:divide-[#1E2E4D] border border-slate-200 dark:border-[#1E2E4D] rounded-xl overflow-hidden">
              {categories
                .filter((c) => c.type === 'expense')
                .map((cat) => (
                  <div
                    key={cat.id}
                    className="px-4 py-2.5 flex items-center justify-between gap-3 text-sm"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-3 h-3 rounded-sm shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                        {cat.name}
                      </span>
                    </div>
                    {cat.isDefault ? (
                      <span className="text-[11px] text-slate-400">Default</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeleteCatTarget(cat)}
                        className="p-1 text-slate-400 hover:text-red-500 cursor-pointer"
                        aria-label={`Delete ${cat.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
            </div>
          </div>

          {/* Income categories */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-3">
              Income Categories
            </h3>
            <div className="divide-y divide-slate-100 dark:divide-[#1E2E4D] border border-slate-200 dark:border-[#1E2E4D] rounded-xl overflow-hidden">
              {categories
                .filter((c) => c.type === 'income')
                .map((cat) => (
                  <div
                    key={cat.id}
                    className="px-4 py-2.5 flex items-center justify-between gap-3 text-sm"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="w-3 h-3 rounded-sm shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                        {cat.name}
                      </span>
                    </div>
                    {cat.isDefault ? (
                      <span className="text-[11px] text-slate-400">Default</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeleteCatTarget(cat)}
                        className="p-1 text-slate-400 hover:text-red-500 cursor-pointer"
                        aria-label={`Delete ${cat.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>
      </section>

      <ConfirmDeleteModal
        open={Boolean(deleteCatTarget)}
        title="Delete Custom Category"
        description={
          deleteCatTarget
            ? `Remove custom category "${deleteCatTarget.name}"? Existing transactions using it will remain in your history.`
            : ''
        }
        loading={deletingCat}
        onCancel={() => setDeleteCatTarget(null)}
        onConfirm={() => void handleConfirmDeleteCategory()}
      />
    </div>
  );
}
