# Wallet Report Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make wallet reports accurate at position level, safer to store, easier to understand, refreshable, graphical, and accessible.

**Architecture:** Normalize Hyperliquid fills, reconstruct flat-to-flat positions, and calculate report metrics from those completed positions. Store a validated report snapshot and render one main finding followed by evidence, visual history, secondary observations, and actions.

**Tech Stack:** Next.js 16, React 19, TypeScript, Clerk, Convex, Vitest, CSS.

**Spec:** The report review delivered in this conversation on 2026-09-01.

## Global Constraints

- Do not infer behavior that the public fill record cannot prove.
- Keep all report APIs authenticated and all stored reports scoped to the signed-in owner.
- Existing saved reports must remain readable after the schema change.
- Use the existing paper, ink, teal, editorial, UI, and mono design tokens.
- Do not add a chart library.

---

### Task 1: Position-level report calculations

**Files:** create `src/lib/hyperliquid/metrics.test.ts`; modify `src/lib/hyperliquid/metrics.ts`.

**Interfaces:** `computeMetrics(rawFills, portfolioPnl, timezoneOffsetMinutes)` continues returning `ReportMetrics`, now with completed-position counts, daily P/L, cumulative P/L, confidence, and coverage fields.

- [ ] Test partial closes as one completed position, a direction flip as two positions, duplicates, time zones, empty history, confidence levels, and insufficient samples.
- [ ] Add `reconstructPositions()` and calculate win rate, post-loss size, cooldown, loss window, entry method, busy days, and concentration from completed positions.
- [ ] Require several observations before showing behavioral labels and use neutral names such as “Busiest-day result.”

### Task 2: Valid report storage and secure routing

**Files:** create `convex/reportValidators.ts`; modify `convex/schema.ts`, `convex/payments.ts`, `src/app/report/page.tsx`.

**Interfaces:** `reportMetricsValidator` accepts current snapshots and optional new snapshot fields so existing records remain valid.

- [ ] Replace `v.any()` report metrics with the exact validator in schema and mutation arguments.
- [ ] Preserve `/report` through sign-in and send missing auth tokens back to sign-in instead of payment.
- [ ] Keep payment checks server-side and owner-scoped.

### Task 3: Bounded generation and refresh

**Files:** modify `src/app/api/hyperliquid/report/route.ts`, `src/components/report/wallet-report.tsx`.

**Interfaces:** generation returns snapshot time, coverage status, position-level metrics, and graph series; the result view exposes refresh and cancellation actions.

- [ ] Bound the complete upstream read, preserve parallel portfolio fetching, and return specific timeout copy.
- [ ] Add client cancellation with `AbortController` and a “Cancel” action.
- [ ] Add “Refresh this report” without consuming another wallet slot.
- [ ] Clarify that only new addresses use slots.

### Task 4: StayFlat read hierarchy and evidence

**Files:** modify `src/components/report/wallet-report.tsx`, `src/app/globals.css`.

**Interfaces:** the result renders a focusable heading, primary finding, confidence/coverage strip, P/L graph, daily calendar, secondary observations, entry-method table, and existing actions.

- [ ] Promote one supported observation to the main finding and demote the rest.
- [ ] Add freshness, date coverage, completed positions, and confidence.
- [ ] Render cumulative P/L and daily P/L calendar with screen-reader summaries.
- [ ] Make P/L, win rate, and biggest loss primary; fills, fees, and markets supporting.
- [ ] Announce only “Report ready,” move focus to the result heading, and respect reduced motion.

### Task 5: Verification and production

**Files:** modify only where verification exposes defects.

**Interfaces:** production `/report` and saved report snapshots remain compatible.

- [ ] Run diff checks, lint, TypeScript, all tests, and the production build.
- [ ] Deploy Convex first and confirm production schema validation.
- [ ] Deploy Vercel, point `stayflat.xyz` to the exact deployment, and verify auth redirect behavior.
