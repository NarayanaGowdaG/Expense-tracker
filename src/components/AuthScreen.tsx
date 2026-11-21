import React, { useState } from 'react';
import {
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Moon,
  ShieldCheck,
  Sun,
  User as UserIcon,
  Wallet,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext.tsx';

type AuthMode = 'login' | 'register' | 'reset';

export function AuthScreen() {
  const {
    signInWithEmail,
    registerWithEmail,
    signInWithGoogle,
    sendResetEmail,
    theme,
    toggleTheme,
  } = useFinance();

  const [mode, setMode] = useState<AuthMode>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setError(null);
    setSuccessMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (mode === 'reset') {
      setLoading(true);
      try {
        await sendResetEmail(trimmedEmail);
        setSuccessMsg(
          `Password reset instructions have been sent to ${trimmedEmail}. Check your inbox and spam folder.`,
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to send password reset email.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (mode === 'register') {
      if (!displayName.trim()) {
        setError('Please enter your full name.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await signInWithEmail(trimmedEmail, password);
      } else {
        await registerWithEmail(displayName.trim(), trimmedEmail, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setSuccessMsg(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] dark:bg-[#080D1B] text-slate-900 dark:text-slate-100 relative overflow-hidden">
      {/* Subtle midnight blue ambient gradients */}
      <div
        className="pointer-events-none absolute -top-48 -left-48 w-[520px] h-[520px] rounded-full opacity-20 dark:opacity-30 blur-3xl"
        style={{ background: 'radial-gradient(circle, #287BFF 0%, transparent 70%)' }}
      />
      <div
        className="pointer-events-none absolute -bottom-48 -right-48 w-[520px] h-[520px] rounded-full opacity-15 dark:opacity-25 blur-3xl"
        style={{ background: 'radial-gradient(circle, #38BDF8 0%, transparent 70%)' }}
      />

      {/* Top minimal bar */}
      <header className="relative z-10 flex items-center justify-between px-6 sm:px-10 py-5 border-b border-slate-200/80 dark:border-[#1E2E4D]/70">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#287BFF] to-[#38BDF8] flex items-center justify-center text-white shadow-[0_0_20px_rgba(40,123,255,0.4)]">
            <Wallet className="w-5 h-5" />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
            MyExpense
          </span>
        </div>

        <button
          type="button"
          onClick={() => void toggleTheme()}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-[#1E2E4D] bg-white dark:bg-[#111C32] text-slate-700 dark:text-slate-200 hover:border-[#287BFF]/50 transition-colors cursor-pointer whitespace-nowrap"
          aria-label="Toggle color theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-[#38BDF8]" /> : <Moon className="w-4 h-4 text-[#287BFF]" />}
          <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
      </header>

      {/* Main split grid */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left editorial column */}
          <div className="lg:col-span-6 space-y-6">
            <p className="text-xs font-semibold tracking-wider text-[#287BFF] dark:text-[#38BDF8]">
              Personal Finance & Budget Intelligence
            </p>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight [text-wrap:balance]">
              Command every rupee with clarity and control.
            </h1>
            <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-lg">
              Track daily expenses in Indian Rupees, monitor multiple income streams, enforce category spending limits with instant 80% alerts, and visualize savings growth in real time.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-[#1E2E4D] bg-white/80 dark:bg-[#111C32]/80 backdrop-blur-md">
                <p className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                  Private Account Isolation
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Every transaction, budget, and receipt is strictly scoped to your authenticated account in cloud storage.
                </p>
              </div>
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-[#1E2E4D] bg-white/80 dark:bg-[#111C32]/80 backdrop-blur-md">
                <p className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                  PDF & CSV Statements
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Export monthly financial summaries, category breakdowns, and tax-ready ledgers in one click.
                </p>
              </div>
            </div>
          </div>

          {/* Right auth card */}
          <div className="lg:col-span-6">
            <div className="rounded-2xl border border-slate-200 dark:border-[#1E2E4D] bg-white dark:bg-[#111C32] p-7 sm:p-8 shadow-xl dark:shadow-[0_0_40px_rgba(40,123,255,0.12)]">
              {/* Mode switcher */}
              {mode !== 'reset' && (
                <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-[#0B1224] border border-slate-200/70 dark:border-[#1E2E4D] mb-6">
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className={`py-2.5 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                      mode === 'login'
                        ? 'bg-white dark:bg-[#17243B] text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => switchMode('register')}
                    className={`py-2.5 text-sm font-semibold rounded-lg transition-all cursor-pointer ${
                      mode === 'register'
                        ? 'bg-white dark:bg-[#17243B] text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Create Account
                  </button>
                </div>
              )}

              <div className="mb-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {mode === 'login'
                    ? 'Welcome back'
                    : mode === 'register'
                      ? 'Create your MyExpense account'
                      : 'Reset your password'}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {mode === 'login'
                    ? 'Sign in to access your synced financial dashboard.'
                    : mode === 'register'
                      ? 'Start tracking budgets, income, and savings across devices.'
                      : 'Enter your registered email to receive a password reset link.'}
                </p>
              </div>

              {error && (
                <div className="mb-5 p-3.5 rounded-xl border border-red-300 dark:border-red-500/40 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-[#F87171] text-xs leading-relaxed">
                  {error}
                </div>
              )}

              {successMsg && (
                <div className="mb-5 p-3.5 rounded-xl border border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-[#22C55E] text-xs leading-relaxed">
                  {successMsg}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'register' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Full Name
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Aarav Sharma"
                        maxLength={80}
                        required
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-[#17243B] border border-slate-200 dark:border-[#243656] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#287BFF]"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-[#17243B] border border-slate-200 dark:border-[#243656] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#287BFF]"
                    />
                  </div>
                </div>

                {mode !== 'reset' && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Password
                      </label>
                      {mode === 'login' && (
                        <button
                          type="button"
                          onClick={() => switchMode('reset')}
                          className="text-xs font-medium text-[#287BFF] dark:text-[#38BDF8] hover:underline cursor-pointer"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Minimum 6 characters"
                        required
                        minLength={6}
                        className="w-full pl-10 pr-11 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-[#17243B] border border-slate-200 dark:border-[#243656] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#287BFF]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {mode === 'register' && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        required
                        minLength={6}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-[#17243B] border border-slate-200 dark:border-[#243656] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#287BFF]"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || googleLoading}
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#287BFF] to-[#1D5ED8] hover:shadow-[0_0_24px_rgba(40,123,255,0.45)] disabled:opacity-60 transition-all cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Please wait...</span>
                    </>
                  ) : (
                    <>
                      <span>
                        {mode === 'login'
                          ? 'Sign In'
                          : mode === 'register'
                            ? 'Create Account'
                            : 'Send Reset Link'}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {mode === 'reset' ? (
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="mt-4 w-full text-center text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-[#287BFF] dark:hover:text-[#38BDF8] cursor-pointer"
                >
                  Back to Sign In
                </button>
              ) : (
                <>
                  <div className="relative my-5">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200 dark:border-[#1E2E4D]" />
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="px-3 bg-white dark:bg-[#111C32] text-slate-400">
                        Or continue quickly
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogle}
                    disabled={loading || googleLoading}
                    className="w-full inline-flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl text-sm font-semibold border border-slate-200 dark:border-[#243656] bg-slate-50 dark:bg-[#17243B] text-slate-800 dark:text-white hover:bg-slate-100 dark:hover:bg-[#1D2D4A] disabled:opacity-60 transition-colors cursor-pointer"
                  >
                    {googleLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                    )}
                    <span>Continue with Google</span>
                  </button>
                </>
              )}

              <div className="mt-6 pt-4 border-t border-slate-200 dark:border-[#1E2E4D] flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <ShieldCheck className="w-4 h-4 text-[#22C55E] shrink-0" />
                <span>Your ledger is encrypted in transit and accessible only to your account.</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
