# Arcus Multi-Venue Report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate one paid report from a wallet’s Hyperliquid and Arcus activity, with Combined, Hyperliquid, and Arcus views when appropriate.

**Architecture:** Add an Arcus adapter that converts Arcus fills into the existing normalized metric input. Replace the single-provider route response and saved snapshot with a backward-compatible multi-venue envelope, while keeping one Convex row and one wallet-slot charge per address. Fetch providers in parallel and let either provider succeed independently.

**Tech Stack:** Next.js 16 Route Handlers, React 19, TypeScript, Clerk, Convex, Vitest, native CSS.

**Spec:** `docs/superpowers/specs/2026-09-03-arcus-multi-venue-report.md`

## Global Constraints

- One unique wallet address consumes one wallet slot.
- Clerk remains authentication; do not install `@convex-dev/auth` into this Clerk app.
- Arcus and Hyperliquid calls run in parallel and fail independently.
- Existing saved report rows remain readable.
- Third-party wallet data is fetched only from server code.

---

### Task 1: Arcus fill adapter

**Files:**
- Create: `src/lib/arcus/client.ts`
- Create: `src/lib/arcus/client.test.ts`

**Interfaces:**
- Consumes: Arcus `GET /v1/fills` and `GET /v1/portfolio` responses.
- Produces: `fetchArcusReport(address: string, signal: AbortSignal): Promise<{ rawFills: RawFill[]; portfolioPnl: number | null; historyLimited: boolean }>` and exported response types for fixtures.

- [ ] **Step 1: Write failing normalization tests**

Test that `createdAt: 1788438722323636` becomes millisecond time, `BUY + CLOSE_SHORT` becomes a buy fill that closes a short, maker role produces `crossed: false`, decimal strings remain precise enough for report math, and duplicate `tradeId` rows are removed.

- [ ] **Step 2: Run the focused test**

Run: `npm test -- src/lib/arcus/client.test.ts`
Expected: FAIL because the Arcus adapter does not exist.

- [ ] **Step 3: Implement the Arcus client**

Use `https://api.arcus.xyz/v1/fills?address=${encodeURIComponent(address)}&limit=1000`; page backward with `to=oldestCreatedAt` while deduplicating `tradeId`, for at most six pages. Fetch `/v1/portfolio` alongside the first fills request. Map each fill to `RawFill`:

```ts
{
  time: Math.floor(fill.createdAt / 1000),
  px: fill.price,
  sz: fill.size,
  closedPnl: fill.closedPnl,
  fee: fill.fee,
  coin: fill.marketDisplayName.replace(/-USD$/i, ""),
  tid: `arcus:${fill.tradeId}`,
  side: fill.side === "BUY" ? "B" : "A",
  dir: fill.positionEffect.startsWith("CLOSE") ? "Close" : "Open",
  crossed: fill.role === "TAKER",
}
```

Read the final value in `perpAll.pnlHistory` for all-time P/L. Treat Arcus `400 address not on access whitelist` as inactive perp access and do not show an Arcus report tab.

- [ ] **Step 4: Test success, pagination, empty, 429, and whitelist responses**

Run: `npm test -- src/lib/arcus/client.test.ts`
Expected: PASS.

### Task 2: Shared venue aggregation

**Files:**
- Create: `src/lib/report/multi-venue.ts`
- Create: `src/lib/report/multi-venue.test.ts`
- Modify: `src/lib/hyperliquid/metrics.ts`

**Interfaces:**
- Consumes: raw fills and all-time P/L from each provider.
- Produces: `buildMultiVenueMetrics(inputs, timezoneOffsetMinutes): MultiVenueMetrics` with independent venue status and combined metrics.

- [ ] **Step 1: Write failing aggregation tests**

Cover Hyperliquid-only, Arcus-only, both-active, both-empty, one unavailable, duplicate IDs, and chronological merge. Assert combined win rate is recomputed from all positions rather than averaging venue win rates.

- [ ] **Step 2: Run the focused test**

Run: `npm test -- src/lib/report/multi-venue.test.ts`
Expected: FAIL because aggregation is missing.

- [ ] **Step 3: Add provider-neutral metric input**

Keep `computeMetrics` backward compatible. Prefix venue fill IDs before merging, sort by numeric time, sum non-null venue portfolio P/L values for the combined all-time figure, and call `computeMetrics` once per ready venue plus once for all ready fills.

- [ ] **Step 4: Run metric tests**

Run: `npm test -- src/lib/report/multi-venue.test.ts src/lib/hyperliquid/metrics.test.ts`
Expected: PASS.

### Task 3: Parallel authenticated report route

**Files:**
- Create: `src/lib/hyperliquid/client.ts`
- Create: `src/app/api/report/route.ts`
- Create: `src/app/api/report/route.test.ts`
- Modify: `src/app/api/hyperliquid/report/route.ts`

**Interfaces:**
- Consumes: Clerk session, Convex report access, Hyperliquid adapter, Arcus adapter.
- Produces: `POST /api/report` returning `MultiVenueReport`; old `/api/hyperliquid/report` delegates temporarily for compatibility.

- [ ] **Step 1: Extract and test the current Hyperliquid fetch functions**

Move `postInfo`, fill pagination, and portfolio fetching into `src/lib/hyperliquid/client.ts` without changing behavior.

- [ ] **Step 2: Write route tests**

Assert auth happens before provider calls, invalid addresses make zero provider calls, paid limits are unchanged, provider calls start together, one failure returns the other result, both failures return 502, and the Convex write receives the multi-venue snapshot.

- [ ] **Step 3: Run the route tests and confirm failure**

Run: `npm test -- src/app/api/report/route.test.ts`
Expected: FAIL because `/api/report` does not exist.

- [ ] **Step 4: Implement the route**

After auth, access, and address validation, start both requests before awaiting either:

```ts
const [hyperliquid, arcus] = await Promise.allSettled([
  fetchHyperliquidReport(address, reportSignal),
  fetchArcusReport(address, reportSignal),
]);
```

Build the multi-venue envelope, persist it once, then fetch updated access. Return provider-specific availability without leaking stack traces.

- [ ] **Step 5: Run route and full tests**

Run: `npm test -- src/app/api/report/route.test.ts && npm test`
Expected: PASS.

### Task 4: Backward-compatible Convex storage

**Files:**
- Modify: `convex/reportValidators.ts`
- Modify: `convex/schema.ts`
- Modify: `convex/payments.ts`

**Interfaces:**
- Consumes: `MultiVenueMetrics` snapshots from the route.
- Produces: saved/history/page queries returning the new envelope while adapting legacy `metrics` to a Hyperliquid-only report.

- [ ] **Step 1: Add validators**

Define `venueReportValidator` and `multiVenueReportValidator`. Add optional `report` beside legacy optional `metrics` in `reportWallets`.

- [ ] **Step 2: Update the write mutation**

Change `recordReportWallet` args to accept `report`. Patch existing rows with `report` and leave `metrics` untouched for rollback safety. New rows store `report`.

- [ ] **Step 3: Add a legacy adapter in queries**

For rows containing only `metrics`, return Combined and Hyperliquid as that metric snapshot and Arcus as unavailable with “Refresh to add Arcus.” Do not rewrite rows during reads.

- [ ] **Step 4: Generate and validate Convex types**

Run: `npx convex codegen`
Expected: generated types complete without schema errors.

### Task 5: Venue-ledger report interface and copy

**Files:**
- Modify: `src/components/report/wallet-report.tsx`
- Create: `src/components/report/venue-selector.tsx`
- Modify: `src/app/report/page.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: saved or fresh `MultiVenueReport`.
- Produces: one input experience and Combined / Hyperliquid / Arcus selectable report views.

- [ ] **Step 1: State the component design checkpoint**

Intent: a perp trader reconciles one wallet across venues. Hierarchy: wallet input first, then Combined, then venue detail. Palette: existing paper/ink with source colors used only on the venue rail. Depth: existing subtle shadows. Surfaces: existing report card levels. Typography: existing display/body/mono roles. Spacing: existing 4px grid and current report density.

- [ ] **Step 2: Update input copy**

Use “One wallet. Every supported perp venue.”, “Paste one address to read its Hyperliquid and Arcus history together. If it trades on both, you’ll also get a combined view.”, CTA “Read my trading”, placeholder “0x… your wallet address”, and fine print from the spec.

- [ ] **Step 3: Add the native accessible venue selector**

Use a `<nav aria-label="Report venue">` containing buttons with `aria-current` for Combined, Hyperliquid, and Arcus. Hide a venue button only when it is truly empty; keep unavailable buttons visible and disabled with a plain explanation. Default to Combined.

- [ ] **Step 4: Reuse one report body**

Pass the selected metrics and label into `ReportResult`; do not duplicate the full report markup. Add venue label, source-colored rail marker, and “Combined from Hyperliquid + Arcus” coverage text. Preserve all keyboard, focus, loading, cancel, empty, and error behavior.

- [ ] **Step 5: Update metadata and history summaries**

Change metadata to multi-venue language. History says which venues were found, while still showing combined P/L and fill count.

### Task 6: PDF and regression coverage

**Files:**
- Modify: `src/lib/report-pdf.ts`
- Modify: `src/lib/report-pdf.test.ts`
- Modify: `src/app/api/report/pdf/route.ts`

**Interfaces:**
- Consumes: saved multi-venue report.
- Produces: a Combined PDF with a venue breakdown summary.

- [ ] **Step 1: Write a failing dual-venue PDF test**

Assert the PDF includes “Combined”, “Hyperliquid”, “Arcus”, per-venue fill counts, and combined metrics.

- [ ] **Step 2: Update PDF input and rendering**

Render the Combined result as the main report and add a compact source ledger before the observations. Adapt legacy rows as Hyperliquid-only.

- [ ] **Step 3: Run PDF tests**

Run: `npm test -- src/lib/report-pdf.test.ts`
Expected: PASS.

### Task 7: Quality, browser verification, and release

**Files:**
- Modify only files needed to correct issues found during checks.

**Interfaces:**
- Consumes: complete feature.
- Produces: verified production-ready build.

- [ ] **Step 1: Run automated checks**

Run: `npm test && npm run lint && npm run build`
Expected: all pass.

- [ ] **Step 2: Verify real API behavior**

Use a known Arcus leaderboard address for Arcus-only/active testing and a known Hyperliquid address for its path. Confirm whitelist refusal hides Arcus because the address has no Arcus perp access.

- [ ] **Step 3: Verify in browser at desktop and mobile**

Check 1440px and 390px widths: input, loading, both-active venue rail, single-active, both-empty, unavailable, refresh, history, PDF, focus order, and reduced motion.

- [ ] **Step 4: Run design checks**

Apply swap, squint, signature, and token checks. Confirm source colors communicate venue identity only, report hierarchy remains readable, and the three-position rail appears in the input promise, selector, report header, history, and PDF source ledger.

- [ ] **Step 5: Deploy and smoke test**

Deploy only after checks pass. Generate one production report and confirm one address consumed one slot while both provider results were saved.
