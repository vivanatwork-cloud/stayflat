# Lighter Read-only Reports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Execute this plan task-by-task with tests before implementation.

**Goal:** Add optional read-only-token Lighter history to StayFlat's multi-venue reports without storing the credential.

**Architecture:** A focused Lighter server client discovers account indexes, validates token ownership, fetches authenticated perp trades and PnL, and normalizes them to the existing `RawFill` contract. The report route queries all three venues concurrently and stores only computed metrics. The existing report component gains one request-scoped token input and a third venue tab.

**Tech Stack:** Next.js 16 Route Handlers, React 19, TypeScript, Vitest, Convex, Lighter REST API.

**Spec:** `docs/superpowers/specs/2026-09-08-lighter-read-only-reports.md`

## Global Constraints

- Do not store, log, return, or serialize the Lighter read-only token outside its request.
- Keep current Clerk and Convex payment authorization unchanged.
- Keep legacy saved reports valid.
- Deploy only to a Vercel preview until the user approves production.

---

### Task 1: Lighter API client and normalization

**Files:**
- Create: `src/lib/lighter/client.ts`
- Create: `src/lib/lighter/client.test.ts`
- Modify: `src/lib/hyperliquid/metrics.ts`

**Interfaces:**
- Produces: `fetchLighterReport(address, token, signal): Promise<LighterReportSource>`.
- Produces: `LighterReportSource` with normalized `rawFills`, `portfolioPnl`, `historyLimited`, and `active`.

- [ ] Write tests for token parsing, account ownership, bid/ask side, maker/taker role, closed PnL, market names, duplicate fills, and pagination.
- [ ] Run `npm test -- src/lib/lighter/client.test.ts` and verify the new tests fail.
- [ ] Implement account discovery, token validation, market lookup, paginated trade retrieval, PnL retrieval, and normalization.
- [ ] Run the focused tests and verify they pass.

### Task 2: Three-venue report model and storage validation

**Files:**
- Modify: `src/lib/report/multi-venue.ts`
- Modify: `src/lib/report/multi-venue.test.ts`
- Modify: `convex/reportValidators.ts`

**Interfaces:**
- Extend: `VenueName` with `lighter`.
- Extend: `MultiVenueMetrics` with `lighter: VenueSnapshot`.
- Consume: the same `VenueSource` shape for all three venues.

- [ ] Add failing tests for Lighter-only, three active venues, unavailable Lighter, and legacy two-venue conversion.
- [ ] Extend the model and combined calculation across three venues.
- [ ] Extend Convex validators while retaining the required legacy-compatible report shape.
- [ ] Run the focused report tests.

### Task 3: Secure report-route integration

**Files:**
- Modify: `src/app/api/hyperliquid/report/route.ts`
- Create: `src/app/api/hyperliquid/report/route.test.ts`

**Interfaces:**
- Accept: optional request JSON field `lighterToken`.
- Return: the existing response with a three-venue `report`; never return `lighterToken`.

- [ ] Add route tests proving no-token compatibility, token forwarding only to the server client, mismatch errors, partial-provider resilience, and response redaction.
- [ ] Start Hyperliquid, Arcus, and conditional Lighter work together with `Promise.allSettled`.
- [ ] Map Lighter authentication failures to a specific safe error code and message.
- [ ] Save only computed report data through the existing Convex mutation.
- [ ] Run route tests.

### Task 4: Request-scoped token interface

**Files:**
- Modify: `src/components/report/wallet-report.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/app/report/page.tsx`

**Interfaces:**
- Submit: `{ address, timezoneOffsetMinutes, lighterToken? }`.
- Display: Combined for two or more active venues and a Lighter tab when active.

- [ ] Add a password-style token input, “Read-only” seal, show/hide control, official generation link, and plain security copy.
- [ ] Keep the token in React state only; clear it after reset and never put it in navigation or storage.
- [ ] Update loading, empty, metadata, and supported-venue copy.
- [ ] Add the Lighter venue tab and label using the existing rail pattern.
- [ ] Verify keyboard focus, 44px controls, error state, desktop, and mobile layouts.

### Task 5: PDF and regression verification

**Files:**
- Modify: `src/lib/report-pdf.ts`
- Modify: `src/lib/report-pdf.test.ts`

**Interfaces:**
- Consume: any one-to-three active venue combination.

- [ ] Add PDF-row tests for Lighter and three-venue Combined summaries.
- [ ] Update PDF labels without embedding token-related information.
- [ ] Run `npm test`, `npm run lint`, and `npm run build`.
- [ ] Test the active wallet `0xcea431a20cd70b0aa6380b31835f4022e749529d` for public discovery.
- [ ] Deploy a Vercel preview and verify desktop/mobile behavior; do not promote it to production.

