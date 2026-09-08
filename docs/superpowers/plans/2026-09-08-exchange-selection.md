# Exchange Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users choose the exchanges to read and require a Lighter token only when Lighter is selected.

**Architecture:** A shared parser validates venue selections at both report endpoints. The wallet fetcher skips unselected networks, while the client sends explicit selections for single-wallet and portfolio requests.

**Tech Stack:** Next.js, React, TypeScript, CSS, Vitest

**Spec:** `docs/superpowers/specs/2026-09-08-exchange-selection.md`

## Global Constraints

- Supported API venues are exactly `hyperliquid`, `arcus`, and `lighter`.
- Hyperliquid is selected by default in the new-report form.
- A Lighter token is displayed and required only when Lighter is selected.
- “Other” links to `/request-exchange` and is never sent to the report API.
- Existing saved reports and portfolio reports remain refreshable.

---

### Task 1: Validate venue selections

**Files:**
- Create: `src/lib/report/venue-selection.ts`
- Create: `src/lib/report/venue-selection.test.ts`

**Interfaces:**
- Produces: `parseRequestedVenues(value: unknown, fallback?: readonly VenueName[]): VenueName[] | null`

- [ ] Write tests covering a valid multi-venue selection, duplicate removal, the safe legacy fallback, an empty selection, and `other`.
- [ ] Run `npm test -- src/lib/report/venue-selection.test.ts` and confirm it fails before the module exists.
- [ ] Implement the parser with a fixed supported-venue set and no Lighter in the default fallback.
- [ ] Run the focused test and confirm it passes.

### Task 2: Fetch only selected venues

**Files:**
- Modify: `src/lib/report/fetch-wallet.ts`
- Modify: `src/app/api/hyperliquid/report/route.ts`
- Modify: `src/app/api/report/portfolio/route.ts`

**Interfaces:**
- Consumes: `parseRequestedVenues`
- Produces: `fetchWalletVenueSources(address, lighterToken, signal, requestedVenues)`

- [ ] Validate `venues` in both endpoints and return a 400 response for invalid or empty input.
- [ ] Skip every unselected exchange request and mark that source unavailable.
- [ ] Raise `LighterTokenRequiredError` before network work when Lighter is selected without a token.
- [ ] Pass a per-wallet venue map in portfolio requests.
- [ ] Run the report tests.

### Task 3: Add the exchange selector

**Files:**
- Modify: `src/components/report/wallet-report.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Sends: `venues: VenueName[]` for one wallet and `venuesByAddress: Record<string, VenueName[]>` for portfolios.

- [ ] Add accessible native checkboxes for Hyperliquid, Arcus, and Lighter plus an “Other” request link.
- [ ] Prevent submission with no supported exchange selected.
- [ ] Render and validate the Lighter token field only for Lighter requests.
- [ ] Preserve saved-report venue choices during refresh and portfolio rebuilds.
- [ ] Add responsive selector styles using existing tokens and focus behavior.

### Task 4: Verify and ship

**Files:**
- Modify only files required by fixes found during verification.

**Interfaces:**
- Produces: a production-ready exchange-selection flow.

- [ ] Run `npm test`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
- [ ] Check desktop and mobile form states in a browser if browser access is available.
- [ ] Commit, push, deploy to Vercel, and verify the production route.
