# Free Reports and Admin Blocking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every signed-in user unlimited free wallet reports and let admins block abusive accounts.

**Architecture:** Convex owns the current block state and its audit history. Report reads expose `blocked` and `unlimited`; all report writes and API routes reject blocked owners. Existing payment records and paid-only product areas remain unchanged.

**Tech Stack:** Next.js 16, React 19, TypeScript, Convex, Clerk, Vitest

**Spec:** `docs/superpowers/specs/2026-09-08-free-reports-admin-blocking.md`

## Global Constraints

- Sign-in remains required.
- Report access never depends on a payment row.
- Address count is unlimited.
- Blocking is server-enforced and auditable.
- Journal and paid call behavior remain unchanged.

---

### Task 1: Block state and audit history

**Files:**
- Modify: `convex/schema.ts`
- Modify: `convex/admin.ts`
- Modify: `convex/payments.ts`

**Interfaces:**
- Produces: `accessBlocks` records, `admin.blockUser`, `admin.unblockUser`, and `reportAccess.blocked`.

- [ ] Add the indexed access-block table with block and unblock audit fields.
- [ ] Add admin-only block and unblock mutations.
- [ ] Return block status from report access queries and admin overview.
- [ ] Reject blocked report and portfolio writes inside Convex.

### Task 2: Free unlimited report access

**Files:**
- Modify: `src/app/report/page.tsx`
- Modify: `src/app/api/hyperliquid/report/route.ts`
- Modify: `src/app/api/report/portfolio/route.ts`
- Modify: `src/components/report/wallet-report.tsx`
- Modify: `src/app/wallet-history/page.tsx`
- Modify: `src/components/brand/account-menu.tsx`

**Interfaces:**
- Consumes: `{ used, unlimited: true, blocked, addresses }`.

- [ ] Remove payment redirects and wallet-slot checks from reports.
- [ ] Reject blocked generation with a clear 403 response.
- [ ] Show Unlimited in report and history interfaces.
- [ ] Keep the report link unlocked in the account menu.

### Task 3: Admin controls and release

**Files:**
- Modify: `src/app/admin/actions.ts`
- Modify: `src/app/admin/page.tsx`
- Modify: `src/app/admin/admin.css`

**Interfaces:**
- Produces: reasoned Block and direct Unblock forms.

- [ ] Add authenticated server actions for block and unblock.
- [ ] Show current access status and audit details per user.
- [ ] Add complete keyboard, focus, destructive, and disabled states.
- [ ] Run `npm test`, `npm run lint`, and `npm run build`.
- [ ] Deploy Convex and Vercel production, then verify both production domains.

