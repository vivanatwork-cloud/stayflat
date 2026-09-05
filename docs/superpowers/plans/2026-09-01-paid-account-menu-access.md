# Paid Account Menu Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Match older paid records to a returning Clerk account and show a clear, accessible payment-lock tooltip only to unpaid users.

**Architecture:** A signed-in Next.js route reads the verified Clerk email on the server and calls a secret-protected Convex mutation. The mutation moves matching legacy payment and product data to the current Clerk user ID. The account menu checks this route once, avoids a false locked state while access is loading, and uses a styled hover/focus tooltip.

**Tech Stack:** Next.js 16 App Router, React 19, Clerk, Convex, CSS

**Spec:** User request in this conversation, 2026-09-01

## Global Constraints

- A returning paid customer must retain access after signing in with a newer Clerk account ID.
- The lock hint must read exactly `Unlock after payment`.
- Paid tools are Trading journal, Wallet Analytics, and Schedule a call.
- Keep the existing StayFlat visual system and avoid new dependencies.

---

### Task 1: Secure paid-account recovery

**Files:**
- Modify: `convex/payments.ts`
- Create: `src/app/api/account/access/route.ts`

**Interfaces:**
- Consumes: Clerk `currentUser()` verified primary email and `auth()` user ID.
- Produces: `payments.claimLegacyAccountByEmail({ writeSecret, ownerId, email }) -> { migrated: boolean, hasPaid: boolean }` and `POST /api/account/access -> { hasPaid: boolean }`.

- [ ] **Step 1: Confirm the production legacy payment exists**

Run: `npx convex data payments --prod --limit 100 --format json`

Expected: a paid record for the example customer with the older owner ID.

- [ ] **Step 2: Extract the existing migration into one shared Convex helper**

Use one helper for both the authenticated Convex-token path and the secret-protected server path so related onboarding, journal, wallet, and request data move together.

- [ ] **Step 3: Add the authenticated server route**

Return `401` without a Clerk user, `422` without a verified primary email, `503` without server configuration, and the mutation result on success.

- [ ] **Step 4: Run static checks**

Run: `npm run lint && npx tsc --noEmit`

Expected: both commands exit successfully.

### Task 2: Accurate menu locks and tooltip

**Files:**
- Modify: `src/components/brand/account-menu.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `POST /api/account/access` and live `payments.hasPaid` Convex query.
- Produces: paid links without locks; unpaid links routed to `/payment`; tooltip shown on mouse hover and keyboard focus.

- [ ] **Step 1: Check account access once after authentication**

Keep access unknown while the check is running so a paid user never sees a false lock flash. Prefer the server result, then let the live Convex query keep the state current.

- [ ] **Step 2: Replace the emoji title with an accessible tooltip**

Use a focusable lock wrapper, a `role="tooltip"` label, semantic palette tokens, a short opacity/transform transition, and reduced-motion support.

- [ ] **Step 3: Build the production bundle**

Run: `npm run build`

Expected: Next.js finishes without type, route, or rendering errors.

- [ ] **Step 4: Verify in browser**

Check desktop and mobile menu states. Hover and keyboard-focus the lock as an unpaid account; confirm no locks on the paid account.

### Task 3: Deploy and production verification

**Files:**
- Modify: generated Convex deployment state and Vercel production deployment only.

**Interfaces:**
- Consumes: verified local build.
- Produces: updated `stayflat.xyz` production application.

- [ ] **Step 1: Deploy Convex functions**

Run: `npx convex deploy`

Expected: schema and functions deploy successfully.

- [ ] **Step 2: Deploy and alias Vercel production**

Run: `npx vercel --prod`, then `npx vercel alias set <deployment>.vercel.app stayflat.xyz`.

Expected: `https://stayflat.xyz` points to the new deployment.

- [ ] **Step 3: Verify the public route and signed-in behavior**

Open `https://stayflat.xyz`, confirm the deployment loads, then test the account menu with the paid account.
