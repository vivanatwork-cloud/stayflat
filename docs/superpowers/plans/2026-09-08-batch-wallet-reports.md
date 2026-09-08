# Batch Wallet Reports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scan up to ten wallets at once, always include Hyperliquid and Arcus, optionally include Lighter per wallet, and show individual plus combined reports.

**Architecture:** A batch API validates and reads wallets concurrently, builds per-wallet reports, then merges their venue sources for the combined report. One authenticated Convex mutation saves every individual report and the optional combined portfolio atomically.

**Tech Stack:** Next.js 16, React 19, TypeScript, Convex, Clerk, CSS, Vitest

**Spec:** `docs/superpowers/specs/2026-09-08-batch-wallet-reports.md`

## Global Constraints

- Every wallet scans Hyperliquid and Arcus.
- Lighter is opt-in per wallet and requires a read-only token.
- Each run accepts 1–10 unique valid addresses.
- Existing Clerk and Convex authorization checks stay unchanged.
- Lighter tokens are never persisted.
- Batch writes are atomic.

---

### Task 1: Normalize automatic venues and batch inputs

**Files:**
- Modify: `src/lib/report/venue-selection.ts`
- Modify: `src/lib/report/venue-selection.test.ts`
- Create: `src/lib/report/batch-input.ts`
- Create: `src/lib/report/batch-input.test.ts`

**Interfaces:**
- Produces: `requestedWalletVenues(includeLighter: boolean): VenueName[]`
- Produces: `parseBatchWallets(value: unknown): BatchWalletInput[] | null`

- [ ] Test that public venues are always present, Lighter is optional, addresses normalize, duplicates and more than ten wallets fail, and missing Lighter tokens fail.
- [ ] Run the focused tests and confirm they fail before implementation.
- [ ] Implement the two pure validation helpers.
- [ ] Run the focused tests and confirm they pass.

### Task 2: Save a batch atomically

**Files:**
- Modify: `convex/payments.ts`

**Interfaces:**
- Produces: `payments.recordReportBatch({ writeSecret, ownerId, reports, portfolio })`.

- [ ] Add validators for individual reports and an optional combined portfolio.
- [ ] Recheck the active account block inside the mutation.
- [ ] Upsert every normalized wallet and replace or insert the saved portfolio in one mutation.
- [ ] Run Convex code generation and TypeScript checks.

### Task 3: Build the batch report API

**Files:**
- Create: `src/app/api/report/batch/route.ts`
- Modify: `src/lib/report/fetch-wallet.ts`

**Interfaces:**
- Consumes: `parseBatchWallets`, `requestedWalletVenues`, `fetchWalletVenueSources`, and `recordReportBatch`.
- Produces: `{ address, addresses, report, walletReports, access }`.

- [ ] Authenticate and check the existing account block before exchange requests.
- [ ] Fetch all wallets concurrently, with Hyperliquid and Arcus always enabled.
- [ ] Return exact missing/invalid Lighter key and failed-wallet errors.
- [ ] Build every individual report and the combined report from the same source data.
- [ ] Save through the atomic Convex mutation and return updated access.

### Task 4: Build the 10-wallet form and report switcher

**Files:**
- Modify: `src/components/report/wallet-report.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/app/report/page.tsx`

**Interfaces:**
- Sends: `{ wallets: [{ address, includeLighter, lighterToken }], timezoneOffsetMinutes }`.
- Consumes: the batch response including `walletReports`.

- [ ] Replace exchange cards with address tickets and an “Add another wallet” control.
- [ ] Show the Lighter token only inside rows where Lighter is enabled.
- [ ] Validate empty, malformed, duplicate, and missing-token rows before sending.
- [ ] Add “All wallets” and individual-wallet switching to the result.
- [ ] Update the page metadata and plain-language helper copy.
- [ ] Add responsive, focus, hover, disabled, loading, and error styles.

### Task 5: Verify and deploy

**Files:**
- Modify only files required by verification fixes.

**Interfaces:**
- Produces: a deployed batch reporting flow.

- [ ] Run all tests, lint, and the production build.
- [ ] Check one-wallet, multi-wallet, optional-Lighter, duplicate, ten-wallet, desktop, and phone states in a browser when available.
- [ ] Commit and push the tested changes.
- [ ] Deploy to Vercel and point both StayFlat custom domains at the new deployment.
