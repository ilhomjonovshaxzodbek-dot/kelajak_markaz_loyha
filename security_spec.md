# Kelajak Markazi — Firestore Security Specification

## 1. Data Invariants
1. A non-admin user can NEVER assign themselves `role: 'admin'`, `role: 'administrator'`, or `role: 'teacher'` during account creation or profile updates.
2. Only a verified Super Admin (`isAdmin()`) can create, update, or delete `/staff_roles/{userId}` documents or change a user's `role` field.
3. PII (`email`, `phone`, student contact info, payment logs) is strictly isolated under `/users/{userId}/private/info`, `/center_ops/{docId}`, and `/trial_leads/{leadId}` and is NEVER publicly readable.
4. Every document ID (`userId`, `docId`, `leadId`) must pass `isValidId()` (`<= 128` chars, `^[a-zA-Z0-9_\-]+$`).
5. Every `createdAt` and `updatedAt` timestamp must match `request.time`, and `createdAt` is immutable on updates.
6. Public catalog (`/center_public/{docId}`) contains zero PII and is writable only by verified staff (`isStaff()`).
7. Public trial lesson leads (`/trial_leads/{leadId}`) can be created with `status == 'new'`, and can ONLY be read, updated, or deleted by Admins/Administrators (`isAdministrator()`).

## 2. Dirty Dozen Adversarial Payloads
1. **Self-Privilege Escalation on Create:** Student signs up and writes `/users/{uid}` with `role: 'admin'`. -> REJECTED.
2. **Self-Privilege Escalation on Update:** Student updates `/users/{uid}` changing `role` from `'student'` to `'administrator'`. -> REJECTED.
3. **Ghost Field Injection (Shadow Update):** Attacker sends `{ displayName: 'Test', isVerified: true, updatedAt: request.time }`. -> REJECTED.
4. **PII Blanket Read:** Signed-in student reads `/users/{otherUid}/private/info` or `/center_ops/state`. -> REJECTED.
5. **Unverified Admin Email Spoof:** Attacker sets `email` claim without `email_verified == true`. -> REJECTED.
6. **Direct Staff Role Tampering:** Administrator tries to promote themselves to `'admin'` in `/staff_roles/{uid}`. -> REJECTED.
7. **ID Poisoning:** Attacker writes `/trial_leads/AAAA...1500chars` -> REJECTED.
8. **Timestamp Spoofing:** Attacker submits client-side `createdAt: "2020-01-01"` -> REJECTED.
9. **Public Catalog Tampering by Student:** Signed-in student attempts to overwrite `/center_public/catalog` to inflate rewards or add fake certificates. -> REJECTED (`isStaff()` required).
10. **Confirmed Lead Spoofing:** Visitor submits `/trial_leads/{id}` with `status: 'confirmed'` -> REJECTED (`incoming().status == 'new'` enforced).
11. **Oversized Array DoS:** Staff/attacker pushes 5,000 items into `courses` or `students` -> REJECTED (`size() <= MAX` bounded).
12. **Cross-Owner Student Link Hijack:** Student A writes `/student_links/{studentBUid}` -> REJECTED (`isOwner(userId)` + `incoming().uid == userId`).
