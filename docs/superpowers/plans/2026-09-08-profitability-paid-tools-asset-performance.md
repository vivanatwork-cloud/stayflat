# Profitability, Paid Tools, and Asset Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add profitability onboarding, correctly gate paid tools, and show best and worst assets in every report view.

**Architecture:** Extend the optional onboarding data shape without rewriting old rows, use the existing owner-scoped payment query at server boundaries, and calculate per-asset net results inside the shared metrics engine so venue and combined reports inherit the same behavior.

**Tech Stack:** Next.js, React, TypeScript, Clerk, Convex, Vitest, CSS

**Spec:** `docs/superpowers/specs/2026-09-08-profitability-paid-tools-asset-performance.md`

## Global Constraints

- Reports stay free and unlimited.
- Journal and call booking require confirmed payment.
- Existing onboarding records remain readable.
- Asset results use net realized P&L after recorded fees.

---

### Task 1: Add the profitability answer

**Files:**
- Modify: `convex/onboardingValidators.ts`
- Modify: `convex/onboarding.ts`
- Modify: `src/components/onboarding/onboarding-flow.tsx`

**Interfaces:**
- Adds: `answers.profitability?: "Yes" | "No" | "I don't know" | "Break even"`.

- [ ] Add the optional validator field and ninth question.
- [ ] Increase the valid final step from 9 to 10.
- [ ] Update intro count and review summary.

### Task 2: Correct paid-feature access

**Files:**
- Modify: `src/app/payment/page.tsx`
- Modify: `src/app/report/page.tsx`
- Modify: `src/components/report/wallet-report.tsx`

**Interfaces:**
- Consumes: `payments.hasPaid`.

- [ ] Replace the free-report-limit payment test with the payment query.
- [ ] Pass paid status from the report server page to the report client.
- [ ] Send unpaid journal and call actions to `/payment`; keep report actions free.

### Task 3: Calculate and display asset performance

**Files:**
- Modify: `src/lib/hyperliquid/metrics.ts`
- Modify: `src/lib/hyperliquid/metrics.test.ts`
- Modify: `convex/reportValidators.ts`
- Modify: `src/components/report/wallet-report.tsx`

**Interfaces:**
- Adds: `bestAsset` and `worstAsset` as optional `{ coin: string; pnl: number } | null` metrics.

- [ ] Add a test with profitable, losing, and flat assets.
- [ ] Sum completed-position net P&L by asset.
- [ ] Return only positive best and negative worst results.
- [ ] Add the two values to every selected venue or combined report view.

### Task 4: Verify and deploy

**Files:**
- Modify only files required by verification fixes.

**Interfaces:**
- Produces: deployed onboarding, access, and report changes.

- [ ] Run Convex generation, tests, lint, and build.
- [ ] Deploy Convex before Vercel.
- [ ] Point both production domains to the new deployment.
