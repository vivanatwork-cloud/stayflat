# Portfolio Reports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate, save, reopen, and download one accurate report across two or more saved wallet addresses.

**Architecture:** Extract the existing per-wallet venue reader into a shared server module. The portfolio endpoint reads selected wallets concurrently, tags fills with their wallet, merges each venue, and calls the existing metric builder once. Convex stores only the finished portfolio snapshot.

**Tech Stack:** Next.js 16, React 19, TypeScript, Convex, Clerk, Vitest, pdf-lib

**Spec:** `docs/superpowers/specs/2026-09-08-portfolio-reports.md`

## Global Constraints

- Portfolio generation accepts only addresses already saved by the signed-in owner.
- At least two unique addresses are required.
- Lighter tokens are request-only secrets and are never logged, returned, or stored.
- Deduplicate only by venue-issued trade identity; tag fills by wallet before position reconstruction.
- Existing single-wallet reports and payment slot accounting remain unchanged.

---

### Task 1: Wallet-safe metric aggregation

**Files:**
- Modify: `src/lib/hyperliquid/metrics.ts`
- Modify: `src/lib/report/multi-venue.ts`
- Test: `src/lib/report/multi-venue.test.ts`

**Interfaces:**
- Consumes: `RawFill`
- Produces: `RawFill.wallet?: string` and `mergeVenueSources(sources: VenueSource[]): VenueSource`

- [ ] Add a wallet field to normalized fills and include it in the position key.
- [ ] Add a venue-source merge helper that concatenates fills and sums authoritative PnL and volume.
- [ ] Test that identical BTC fills on two wallets form separate positions, while the same venue trade ID is counted once.
- [ ] Run `npm test -- src/lib/report/multi-venue.test.ts` and expect PASS.

### Task 2: Shared wallet reader and portfolio endpoint

**Files:**
- Create: `src/lib/report/fetch-wallet.ts`
- Create: `src/app/api/report/portfolio/route.ts`
- Modify: `src/app/api/hyperliquid/report/route.ts`
- Test: `src/lib/report/fetch-wallet.test.ts`

**Interfaces:**
- Produces: `fetchWalletVenueSources(address, lighterToken, signal): Promise<Record<VenueName, VenueSource>>`
- Portfolio request: `{ addresses: string[], lighterTokens: Record<string,string>, timezoneOffsetMinutes: number }`
- Portfolio response: `{ addresses: string[], report: MultiVenueMetrics }`

- [ ] Move venue fetching into the shared reader without changing single-wallet behavior.
- [ ] Validate authentication, payment, ownership, unique addresses, and minimum selection in the portfolio route.
- [ ] Read wallets concurrently and return `LIGHTER_TOKENS_REQUIRED` with affected addresses when needed.
- [ ] Merge sources by venue, calculate once, and save the result.
- [ ] Run endpoint and reader tests and expect PASS.

### Task 3: Save and load portfolio snapshots

**Files:**
- Modify: `convex/schema.ts`
- Modify: `convex/payments.ts`

**Interfaces:**
- Produces: `payments.savedPortfolioReport` and `payments.recordPortfolioReport`

- [ ] Add a `portfolioReports` table indexed by owner.
- [ ] Add an authenticated read query returning the owner’s latest snapshot.
- [ ] Add a secret-protected upsert mutation that verifies at least two normalized addresses.
- [ ] Include the saved portfolio in `reportPageData` without changing wallet slot counts.
- [ ] Deploy to development and run TypeScript generation.

### Task 4: Portfolio selection and result UI

**Files:**
- Modify: `src/app/report/page.tsx`
- Modify: `src/components/report/wallet-report.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: saved wallet history and optional saved portfolio snapshot.

- [ ] Add an all-selected-by-default checklist above wallet history when at least two reports exist.
- [ ] Submit selected addresses to the portfolio endpoint and show per-wallet Lighter token fields only after requested.
- [ ] Reuse the report result with a Portfolio label, wallet count, venue tabs, refresh, and return action.
- [ ] Add loading, error, empty, focus, mobile, hover, and keyboard states using existing tokens.
- [ ] Verify desktop and mobile layouts.

### Task 5: Portfolio PDF and release

**Files:**
- Create: `src/app/api/report/portfolio/pdf/route.ts`
- Modify: `src/lib/report-pdf.ts`

**Interfaces:**
- Produces: authenticated portfolio PDF download from the saved snapshot.

- [ ] Add a portfolio PDF title and included-address list while reusing venue sections.
- [ ] Add the portfolio download action to the result.
- [ ] Run `npm test`, `npm run lint`, and `npm run build`; expect all to pass.
- [ ] Deploy Convex production, deploy Vercel production, point both domains to the release, and verify live responses.

