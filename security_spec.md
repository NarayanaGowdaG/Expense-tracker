# MyExpense Security Specification

## 1. Data Invariants
1. Every document under `/users/{userId}` and its subcollections (`categories`, `transactions`, `receipts`, `budgets`, `savingsGoals`) strictly belongs to the authenticated user whose `request.auth.uid == userId`.
2. Subcollection documents cannot be created unless the parent `/users/{userId}` document exists, preventing orphaned records.
3. No user can list `/users` (PII protection) or read/write/delete documents belonging to another `userId`.
4. All string fields enforce explicit `.size()` bounds and regex formats matching `firebase-blueprint.json`.
5. Numeric amounts (`amount`, `limitAmount`, `targetAmount`) must be strictly positive (`> 0` and `<= 1000000000`), and `currentAmount`, `monthlyTarget`, `monthlyBudgetLimit` must be `>= 0` and `<= 1000000000`.
6. Creation and update timestamps (`createdAt`, `updatedAt`) are strictly validated against `request.time`, and `createdAt` + `userId` / `uid` are immutable after creation.
7. Updates enforce `affectedKeys().hasOnly(...)` action allowlists alongside full `isValid[Entity](incoming())` checks so no shadow fields or type poisoning can occur.

## 2. Dirty Dozen Adversarial Payloads (Expected: PERMISSION_DENIED)
1. **Cross-user transaction read**: User B attempts `get` or `list` on `/users/userA/transactions`.
2. **Cross-user transaction write**: User B attempts `create` on `/users/userA/transactions/tx1` with `userId: "userB"`.
3. **Identity spoofing on create**: User A attempts `create` on `/users/userA/transactions/tx2` with `userId: "userB"`.
4. **Shadow field injection**: User A attempts `create` on `/users/userA/transactions/tx3` with extra field `isAdmin: true`.
5. **Negative transaction amount**: User A attempts `create` on `/users/userA/transactions/tx4` with `amount: -500`.
6. **Invalid payment method**: User A attempts `create` on `/users/userA/transactions/tx5` with `paymentMethod: "Crypto"`.
7. **ID poisoning**: User A attempts `create` on `/users/userA/transactions/invalid$id!` with invalid path characters or >128 chars.
8. **Immutable field mutation**: User A attempts `update` on `/users/userA/transactions/tx1` changing `userId` or `createdAt`.
9. **Client timestamp spoofing**: User A attempts `create` on `/users/userA/budgets/b1` with `createdAt` != `request.time`.
10. **PII user collection listing**: Authenticated User A attempts `list` on `/users`.
11. **Oversized notes payload (Denial of Wallet)**: User A attempts `create` on `/users/userA/transactions/tx6` with a 5,000-character `notes` string.
12. **Zero/negative budget limit**: User A attempts `create` on `/users/userA/budgets/b2` with `limitAmount: 0`.
