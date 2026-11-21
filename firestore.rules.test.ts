/**
 * Verification suite specification for MyExpense Firestore Security Rules.
 * Maps the 12 adversarial ("Dirty Dozen") payloads against rule invariants.
 */
export interface DirtyDozenCase {
  id: number;
  name: string;
  actorUid: string | null;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  path: string;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const dirtyDozenCases: DirtyDozenCase[] = [
  {
    id: 1,
    name: 'Cross-user transaction list',
    actorUid: 'userB',
    operation: 'list',
    path: '/users/userA/transactions',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Cross-user transaction create',
    actorUid: 'userB',
    operation: 'create',
    path: '/users/userA/transactions/tx1',
    payload: { userId: 'userB', title: 'Steal', amount: 100 },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Identity spoofing on create',
    actorUid: 'userA',
    operation: 'create',
    path: '/users/userA/transactions/tx2',
    payload: { userId: 'userB', title: 'Spoof', amount: 100 },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Shadow field injection',
    actorUid: 'userA',
    operation: 'create',
    path: '/users/userA/transactions/tx3',
    payload: { userId: 'userA', title: 'Dinner', amount: 500, isAdmin: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Negative transaction amount',
    actorUid: 'userA',
    operation: 'create',
    path: '/users/userA/transactions/tx4',
    payload: { userId: 'userA', title: 'Hack', amount: -500 },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Invalid payment method',
    actorUid: 'userA',
    operation: 'create',
    path: '/users/userA/transactions/tx5',
    payload: { userId: 'userA', title: 'Dinner', amount: 400, paymentMethod: 'Crypto' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Path ID poisoning',
    actorUid: 'userA',
    operation: 'create',
    path: '/users/userA/transactions/invalid$id!',
    payload: { userId: 'userA', title: 'Dinner', amount: 400 },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Immutable userId mutation on update',
    actorUid: 'userA',
    operation: 'update',
    path: '/users/userA/transactions/tx1',
    payload: { userId: 'userB' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Client timestamp spoofing',
    actorUid: 'userA',
    operation: 'create',
    path: '/users/userA/budgets/b1',
    payload: { userId: 'userA', limitAmount: 5000, createdAt: '2020-01-01T00:00:00Z' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'PII user collection listing',
    actorUid: 'userA',
    operation: 'list',
    path: '/users',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Oversized notes denial of wallet',
    actorUid: 'userA',
    operation: 'create',
    path: '/users/userA/transactions/tx6',
    payload: { userId: 'userA', title: 'Note bomb', amount: 10, notes: 'x'.repeat(5000) },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Zero budget limit rejection',
    actorUid: 'userA',
    operation: 'create',
    path: '/users/userA/budgets/b2',
    payload: { userId: 'userA', limitAmount: 0 },
    expectedResult: 'PERMISSION_DENIED',
  },
];
