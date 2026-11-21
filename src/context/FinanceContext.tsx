import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db, firebaseProjectId, googleProvider } from '../lib/firebase.ts';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors.ts';
import { ALL_DEFAULT_CATEGORIES } from '../lib/defaults.ts';
import { getCurrentMonthKey } from '../lib/format.ts';
import type { CompressedReceipt } from '../lib/receipts.ts';
import {
  type SavingsGoalInput,
  type TransactionInput,
  validateBudgetInput,
  validateCategoryInput,
  validateSavingsGoalInput,
  validateTransactionInput,
  VALIDATION_LIMITS,
} from '../lib/validation.ts';
import type {
  Budget,
  BudgetAlert,
  Category,
  NavSection,
  Receipt,
  SavingsGoal,
  ThemeMode,
  Transaction,
  TransactionType,
  UserProfile,
} from '../types/finance.ts';

interface FinanceContextValue {
  user: User | null;
  authReady: boolean;
  profile: UserProfile | null;
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  savingsGoals: SavingsGoal[];
  budgetAlerts: BudgetAlert[];
  loadingData: boolean;
  dataError: string | null;
  theme: ThemeMode;
  activeNav: NavSection;
  selectedMonthKey: string;
  editingTransaction: Transaction | null;
  toast: { id: number; type: 'success' | 'error'; message: string } | null;
  setActiveNav: (nav: NavSection) => void;
  setSelectedMonthKey: (monthKey: string) => void;
  setEditingTransaction: (tx: Transaction | null) => void;
  showToast: (type: 'success' | 'error', message: string) => void;
  clearToast: () => void;
  toggleTheme: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (displayName: string, email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  sendResetEmail: (email: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  logout: () => Promise<void>;
  addTransaction: (input: TransactionInput, receipt?: CompressedReceipt | null) => Promise<void>;
  updateTransaction: (
    id: string,
    existingReceiptId: string,
    input: TransactionInput,
    newReceipt?: CompressedReceipt | null,
    removeReceipt?: boolean,
  ) => Promise<void>;
  deleteTransaction: (tx: Transaction) => Promise<void>;
  fetchReceipt: (receiptId: string) => Promise<Receipt | null>;
  addCategory: (name: string, type: TransactionType, color: string) => Promise<Category>;
  deleteCategory: (categoryId: string) => Promise<void>;
  upsertBudget: (
    categoryId: string,
    categoryName: string,
    monthKey: string,
    limitAmount: number,
  ) => Promise<void>;
  deleteBudget: (budgetId: string) => Promise<void>;
  addSavingsGoal: (input: SavingsGoalInput) => Promise<void>;
  updateSavingsGoal: (goalId: string, input: SavingsGoalInput) => Promise<void>;
  deleteSavingsGoal: (goalId: string) => Promise<void>;
  updateProfileSettings: (
    displayName: string,
    monthlyBudgetLimit: number,
    nextTheme: ThemeMode,
  ) => Promise<void>;
}

const FinanceContext = createContext<FinanceContextValue | undefined>(undefined);

function mapFirebaseAuthError(error: unknown): string {
  const code = (error as { code?: string })?.code ?? '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid email or password. Please check your credentials and try again.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Try signing in instead.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters long.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in popup was closed before completion.';
    case 'auth/operation-not-allowed':
      return `Email/Password sign-in is not yet enabled in Firebase Console for project "${firebaseProjectId}". Enable it under Authentication -> Sign-in method, or use Continue with Google.`;
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment before trying again.';
    default:
      return error instanceof Error ? error.message : 'Authentication failed. Please try again.';
  }
}

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemeMode>('dark');
  const [activeNav, setActiveNav] = useState<NavSection>('dashboard');
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(getCurrentMonthKey());
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [toast, setToast] = useState<{
    id: number;
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ id: Date.now(), type, message });
  }, []);

  const clearToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // Sync theme class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  // Monitor auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
      if (!nextUser) {
        setProfile(null);
        setCategories([]);
        setTransactions([]);
        setBudgets([]);
        setSavingsGoals([]);
        setLoadingData(false);
        setDataError(null);
      }
    });
    return () => unsub();
  }, []);

  // Bootstrap user profile + default categories and subscribe to user subcollections
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoadingData(true);
    setDataError(null);

    const uid = user.uid;
    const userDocRef = doc(db, 'users', uid);

    let unsubProfile: (() => void) | undefined;
    let unsubCategories: (() => void) | undefined;
    let unsubTransactions: (() => void) | undefined;
    let unsubBudgets: (() => void) | undefined;
    let unsubGoals: (() => void) | undefined;

    const initUserWorkspace = async () => {
      try {
        const existingProfile = await getDoc(userDocRef);
        if (!existingProfile.exists()) {
          const safeEmail = (user.email || `${uid}@myexpense.app`).slice(0, VALIDATION_LIMITS.EMAIL_MAX);
          const safeName = (
            user.displayName ||
            safeEmail.split('@')[0] ||
            'MyExpense User'
          )
            .trim()
            .slice(0, VALIDATION_LIMITS.DISPLAY_NAME_MAX);

          await setDoc(userDocRef, {
            uid,
            email: safeEmail,
            displayName: safeName,
            currency: 'INR',
            monthlyBudgetLimit: 50000,
            theme: 'dark',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }

        // Seed default categories if user has none
        const catPath = `users/${uid}/categories`;
        const catQuery = query(collection(db, catPath), where('userId', '==', uid));
        const catSnap = await getDocs(catQuery);
        if (catSnap.empty) {
          const batch = writeBatch(db);
          for (const seed of ALL_DEFAULT_CATEGORIES) {
            const ref = doc(db, catPath, seed.id);
            batch.set(ref, {
              userId: uid,
              name: seed.name,
              type: seed.type,
              color: seed.color,
              isDefault: true,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
          await batch.commit();
        }

        if (cancelled) return;

        unsubProfile = onSnapshot(
          userDocRef,
          (snap) => {
            if (snap.exists()) {
              const data = snap.data() as UserProfile;
              setProfile(data);
              if (data.theme === 'dark' || data.theme === 'light') {
                setTheme(data.theme);
              }
            }
          },
          (err) => handleFirestoreError(err, OperationType.GET, `users/${uid}`),
        );

        unsubCategories = onSnapshot(
          query(collection(db, `users/${uid}/categories`), where('userId', '==', uid)),
          (snap) => {
            const list: Category[] = snap.docs
              .map((d) => ({ id: d.id, ...(d.data() as Omit<Category, 'id'>) }))
              .sort((a, b) => a.name.localeCompare(b.name));
            setCategories(list);
          },
          (err) => handleFirestoreError(err, OperationType.LIST, `users/${uid}/categories`),
        );

        unsubTransactions = onSnapshot(
          query(collection(db, `users/${uid}/transactions`), where('userId', '==', uid)),
          (snap) => {
            const list: Transaction[] = snap.docs
              .map((d) => ({ id: d.id, ...(d.data() as Omit<Transaction, 'id'>) }))
              .sort((a, b) => b.dateTime.localeCompare(a.dateTime));
            setTransactions(list);
            setLoadingData(false);
          },
          (err) => handleFirestoreError(err, OperationType.LIST, `users/${uid}/transactions`),
        );

        unsubBudgets = onSnapshot(
          query(collection(db, `users/${uid}/budgets`), where('userId', '==', uid)),
          (snap) => {
            const list: Budget[] = snap.docs
              .map((d) => ({ id: d.id, ...(d.data() as Omit<Budget, 'id'>) }))
              .sort((a, b) => a.categoryName.localeCompare(b.categoryName));
            setBudgets(list);
          },
          (err) => handleFirestoreError(err, OperationType.LIST, `users/${uid}/budgets`),
        );

        unsubGoals = onSnapshot(
          query(collection(db, `users/${uid}/savingsGoals`), where('userId', '==', uid)),
          (snap) => {
            const list: SavingsGoal[] = snap.docs
              .map((d) => ({ id: d.id, ...(d.data() as Omit<SavingsGoal, 'id'>) }))
              .sort((a, b) => a.targetDate.localeCompare(b.targetDate));
            setSavingsGoals(list);
          },
          (err) => handleFirestoreError(err, OperationType.LIST, `users/${uid}/savingsGoals`),
        );
      } catch (err) {
        if (!cancelled) {
          setLoadingData(false);
          setDataError(
            err instanceof Error ? err.message : 'Unable to initialize your financial workspace.',
          );
        }
      }
    };

    void initUserWorkspace();

    return () => {
      cancelled = true;
      unsubProfile?.();
      unsubCategories?.();
      unsubTransactions?.();
      unsubBudgets?.();
      unsubGoals?.();
    };
  }, [user]);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      throw new Error(mapFirebaseAuthError(err));
    }
  }, []);

  const registerWithEmail = useCallback(
    async (displayName: string, email: string, password: string) => {
      try {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const safeName = displayName.trim().slice(0, VALIDATION_LIMITS.DISPLAY_NAME_MAX);
        if (safeName) {
          await updateProfile(cred.user, { displayName: safeName });
        }
        try {
          await sendEmailVerification(cred.user);
        } catch {
          // Non-fatal if verification email dispatch is throttled
        }
      } catch (err) {
        throw new Error(mapFirebaseAuthError(err));
      }
    },
    [],
  );

  const signInWithGoogle = useCallback(async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      throw new Error(mapFirebaseAuthError(err));
    }
  }, []);

  const sendResetEmail = useCallback(async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (err) {
      throw new Error(mapFirebaseAuthError(err));
    }
  }, []);

  const resendVerification = useCallback(async () => {
    if (!auth.currentUser) return;
    await sendEmailVerification(auth.currentUser);
    showToast('success', 'Verification link sent to your email address.');
  }, [showToast]);

  const logout = useCallback(async () => {
    await signOut(auth);
    setActiveNav('dashboard');
    setEditingTransaction(null);
  }, []);

  const toggleTheme = useCallback(async () => {
    const next: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    if (!user) return;
    const path = `users/${user.uid}`;
    try {
      await updateDoc(doc(db, path), {
        theme: next,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  }, [theme, user]);

  const addTransaction = useCallback(
    async (input: TransactionInput, receipt?: CompressedReceipt | null) => {
      if (!user) throw new Error('You must be signed in.');
      const validationErr = validateTransactionInput(input);
      if (validationErr) throw new Error(validationErr);

      const uid = user.uid;
      const batch = writeBatch(db);
      const txRef = doc(collection(db, `users/${uid}/transactions`));
      let receiptId = '';

      if (receipt) {
        const recRef = doc(collection(db, `users/${uid}/receipts`));
        receiptId = recRef.id;
        batch.set(recRef, {
          userId: uid,
          fileName: receipt.fileName.slice(0, VALIDATION_LIMITS.RECEIPT_FILE_NAME_MAX),
          mimeType: receipt.mimeType,
          dataUrl: receipt.dataUrl,
          createdAt: serverTimestamp(),
        });
      }

      batch.set(txRef, {
        userId: uid,
        title: input.title.trim().slice(0, VALIDATION_LIMITS.TITLE_MAX),
        amount: Number(input.amount.toFixed(2)),
        type: input.type,
        categoryId: input.categoryId,
        categoryName: input.categoryName.trim().slice(0, VALIDATION_LIMITS.CATEGORY_NAME_MAX),
        dateTime: input.dateTime,
        monthKey: input.dateTime.slice(0, 7),
        yearKey: input.dateTime.slice(0, 4),
        paymentMethod: input.paymentMethod,
        notes: input.notes.trim().slice(0, VALIDATION_LIMITS.NOTES_MAX),
        receiptId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${uid}/transactions/${txRef.id}`);
      }
    },
    [user],
  );

  const updateTransaction = useCallback(
    async (
      id: string,
      existingReceiptId: string,
      input: TransactionInput,
      newReceipt?: CompressedReceipt | null,
      removeReceipt = false,
    ) => {
      if (!user) throw new Error('You must be signed in.');
      const validationErr = validateTransactionInput(input);
      if (validationErr) throw new Error(validationErr);

      const uid = user.uid;
      const batch = writeBatch(db);
      let nextReceiptId = existingReceiptId;

      if ((removeReceipt || newReceipt) && existingReceiptId) {
        batch.delete(doc(db, `users/${uid}/receipts`, existingReceiptId));
        nextReceiptId = '';
      }

      if (newReceipt) {
        const recRef = doc(collection(db, `users/${uid}/receipts`));
        nextReceiptId = recRef.id;
        batch.set(recRef, {
          userId: uid,
          fileName: newReceipt.fileName.slice(0, VALIDATION_LIMITS.RECEIPT_FILE_NAME_MAX),
          mimeType: newReceipt.mimeType,
          dataUrl: newReceipt.dataUrl,
          createdAt: serverTimestamp(),
        });
      }

      const txRef = doc(db, `users/${uid}/transactions`, id);
      batch.update(txRef, {
        title: input.title.trim().slice(0, VALIDATION_LIMITS.TITLE_MAX),
        amount: Number(input.amount.toFixed(2)),
        type: input.type,
        categoryId: input.categoryId,
        categoryName: input.categoryName.trim().slice(0, VALIDATION_LIMITS.CATEGORY_NAME_MAX),
        dateTime: input.dateTime,
        monthKey: input.dateTime.slice(0, 7),
        yearKey: input.dateTime.slice(0, 4),
        paymentMethod: input.paymentMethod,
        notes: input.notes.trim().slice(0, VALIDATION_LIMITS.NOTES_MAX),
        receiptId: nextReceiptId,
        updatedAt: serverTimestamp(),
      });

      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${uid}/transactions/${id}`);
      }
    },
    [user],
  );

  const deleteTransaction = useCallback(
    async (tx: Transaction) => {
      if (!user) throw new Error('You must be signed in.');
      const uid = user.uid;
      const batch = writeBatch(db);
      batch.delete(doc(db, `users/${uid}/transactions`, tx.id));
      if (tx.receiptId) {
        batch.delete(doc(db, `users/${uid}/receipts`, tx.receiptId));
      }
      try {
        await batch.commit();
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${uid}/transactions/${tx.id}`);
      }
    },
    [user],
  );

  const fetchReceipt = useCallback(
    async (receiptId: string): Promise<Receipt | null> => {
      if (!user || !receiptId) return null;
      const path = `users/${user.uid}/receipts/${receiptId}`;
      try {
        const snap = await getDoc(doc(db, path));
        if (!snap.exists()) return null;
        return { id: snap.id, ...(snap.data() as Omit<Receipt, 'id'>) };
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, path);
      }
    },
    [user],
  );

  const addCategory = useCallback(
    async (name: string, type: TransactionType, color: string): Promise<Category> => {
      if (!user) throw new Error('You must be signed in.');
      const errMsg = validateCategoryInput(name, type, color);
      if (errMsg) throw new Error(errMsg);

      const uid = user.uid;
      const catRef = doc(collection(db, `users/${uid}/categories`));
      const trimmed = name.trim().slice(0, VALIDATION_LIMITS.CATEGORY_NAME_MAX);
      const payload = {
        userId: uid,
        name: trimmed,
        type,
        color,
        isDefault: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      try {
        await setDoc(catRef, payload);
        return {
          id: catRef.id,
          userId: uid,
          name: trimmed,
          type,
          color,
          isDefault: false,
        };
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${uid}/categories/${catRef.id}`);
      }
    },
    [user],
  );

  const deleteCategory = useCallback(
    async (categoryId: string) => {
      if (!user) throw new Error('You must be signed in.');
      const path = `users/${user.uid}/categories/${categoryId}`;
      try {
        await deleteDoc(doc(db, path));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    },
    [user],
  );

  const upsertBudget = useCallback(
    async (categoryId: string, categoryName: string, monthKey: string, limitAmount: number) => {
      if (!user) throw new Error('You must be signed in.');
      const errMsg = validateBudgetInput(categoryId, monthKey, limitAmount);
      if (errMsg) throw new Error(errMsg);

      const uid = user.uid;
      const docId = `${monthKey}_${categoryId}`;
      const path = `users/${uid}/budgets/${docId}`;
      const ref = doc(db, path);
      const existing = budgets.find((b) => b.id === docId);

      try {
        if (existing) {
          await updateDoc(ref, {
            limitAmount: Number(limitAmount.toFixed(2)),
            categoryName: categoryName.trim().slice(0, VALIDATION_LIMITS.CATEGORY_NAME_MAX),
            monthKey,
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(ref, {
            userId: uid,
            categoryId,
            categoryName: categoryName.trim().slice(0, VALIDATION_LIMITS.CATEGORY_NAME_MAX),
            monthKey,
            limitAmount: Number(limitAmount.toFixed(2)),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        handleFirestoreError(err, existing ? OperationType.UPDATE : OperationType.CREATE, path);
      }
    },
    [budgets, user],
  );

  const deleteBudget = useCallback(
    async (budgetId: string) => {
      if (!user) throw new Error('You must be signed in.');
      const path = `users/${user.uid}/budgets/${budgetId}`;
      try {
        await deleteDoc(doc(db, path));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    },
    [user],
  );

  const addSavingsGoal = useCallback(
    async (input: SavingsGoalInput) => {
      if (!user) throw new Error('You must be signed in.');
      const errMsg = validateSavingsGoalInput(input);
      if (errMsg) throw new Error(errMsg);

      const uid = user.uid;
      const ref = doc(collection(db, `users/${uid}/savingsGoals`));
      try {
        await setDoc(ref, {
          userId: uid,
          title: input.title.trim().slice(0, VALIDATION_LIMITS.GOAL_TITLE_MAX),
          targetAmount: Number(input.targetAmount.toFixed(2)),
          currentAmount: Number(input.currentAmount.toFixed(2)),
          monthlyTarget: Number(input.monthlyTarget.toFixed(2)),
          targetDate: input.targetDate,
          notes: input.notes.trim().slice(0, VALIDATION_LIMITS.GOAL_NOTES_MAX),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${uid}/savingsGoals/${ref.id}`);
      }
    },
    [user],
  );

  const updateSavingsGoal = useCallback(
    async (goalId: string, input: SavingsGoalInput) => {
      if (!user) throw new Error('You must be signed in.');
      const errMsg = validateSavingsGoalInput(input);
      if (errMsg) throw new Error(errMsg);

      const path = `users/${user.uid}/savingsGoals/${goalId}`;
      try {
        await updateDoc(doc(db, path), {
          title: input.title.trim().slice(0, VALIDATION_LIMITS.GOAL_TITLE_MAX),
          targetAmount: Number(input.targetAmount.toFixed(2)),
          currentAmount: Number(input.currentAmount.toFixed(2)),
          monthlyTarget: Number(input.monthlyTarget.toFixed(2)),
          targetDate: input.targetDate,
          notes: input.notes.trim().slice(0, VALIDATION_LIMITS.GOAL_NOTES_MAX),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    },
    [user],
  );

  const deleteSavingsGoal = useCallback(
    async (goalId: string) => {
      if (!user) throw new Error('You must be signed in.');
      const path = `users/${user.uid}/savingsGoals/${goalId}`;
      try {
        await deleteDoc(doc(db, path));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    },
    [user],
  );

  const updateProfileSettings = useCallback(
    async (displayName: string, monthlyBudgetLimit: number, nextTheme: ThemeMode) => {
      if (!user) throw new Error('You must be signed in.');
      const safeName = displayName.trim().slice(0, VALIDATION_LIMITS.DISPLAY_NAME_MAX);
      if (!safeName) throw new Error('Display name cannot be empty.');
      if (!Number.isFinite(monthlyBudgetLimit) || monthlyBudgetLimit < 0 || monthlyBudgetLimit > VALIDATION_LIMITS.AMOUNT_MAX) {
        throw new Error('Monthly budget limit must be ₹0 or greater.');
      }
      setTheme(nextTheme);
      const path = `users/${user.uid}`;
      try {
        await updateDoc(doc(db, path), {
          displayName: safeName,
          monthlyBudgetLimit: Number(monthlyBudgetLimit.toFixed(2)),
          theme: nextTheme,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    },
    [user],
  );

  // Real-time budget alerts for selectedMonthKey (80% warning, 100% exceeded)
  const budgetAlerts = useMemo<BudgetAlert[]>(() => {
    const monthExpenses = transactions.filter(
      (t) => t.type === 'expense' && t.monthKey === selectedMonthKey,
    );
    const totalMonthExpense = monthExpenses.reduce((sum, t) => sum + t.amount, 0);

    const alerts: BudgetAlert[] = [];
    const monthBudgets = budgets.filter((b) => b.monthKey === selectedMonthKey);

    // Check explicit overall budget or fallback profile.monthlyBudgetLimit
    const explicitOverall = monthBudgets.find((b) => b.categoryId === 'overall');
    const overallLimit = explicitOverall?.limitAmount ?? profile?.monthlyBudgetLimit ?? 0;

    if (overallLimit > 0) {
      const pct = (totalMonthExpense / overallLimit) * 100;
      if (pct >= 80) {
        alerts.push({
          id: `overall_${selectedMonthKey}`,
          budgetId: explicitOverall?.id ?? 'profile_overall',
          categoryName: 'Overall Monthly Budget',
          monthKey: selectedMonthKey,
          spent: totalMonthExpense,
          limit: overallLimit,
          percentage: pct,
          severity: pct >= 100 ? 'exceeded' : 'warning',
        });
      }
    }

    for (const budget of monthBudgets) {
      if (budget.categoryId === 'overall') continue;
      const spent = monthExpenses
        .filter((t) => t.categoryId === budget.categoryId || t.categoryName === budget.categoryName)
        .reduce((sum, t) => sum + t.amount, 0);
      const pct = budget.limitAmount > 0 ? (spent / budget.limitAmount) * 100 : 0;
      if (pct >= 80) {
        alerts.push({
          id: budget.id,
          budgetId: budget.id,
          categoryName: budget.categoryName,
          monthKey: selectedMonthKey,
          spent,
          limit: budget.limitAmount,
          percentage: pct,
          severity: pct >= 100 ? 'exceeded' : 'warning',
        });
      }
    }

    return alerts.sort((a, b) => b.percentage - a.percentage);
  }, [budgets, profile?.monthlyBudgetLimit, selectedMonthKey, transactions]);

  const value: FinanceContextValue = {
    user,
    authReady,
    profile,
    categories,
    transactions,
    budgets,
    savingsGoals,
    budgetAlerts,
    loadingData,
    dataError,
    theme,
    activeNav,
    selectedMonthKey,
    editingTransaction,
    toast,
    setActiveNav,
    setSelectedMonthKey,
    setEditingTransaction,
    showToast,
    clearToast,
    toggleTheme,
    signInWithEmail,
    registerWithEmail,
    signInWithGoogle,
    sendResetEmail,
    resendVerification,
    logout,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    fetchReceipt,
    addCategory,
    deleteCategory,
    upsertBudget,
    deleteBudget,
    addSavingsGoal,
    updateSavingsGoal,
    deleteSavingsGoal,
    updateProfileSettings,
  };

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance must be used inside FinanceProvider');
  return ctx;
}
