# Journal Analytics Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make trade entry easier to scan and turn journal analytics into a graphical, calendar, strategy, and StayFlat-report view.

**Architecture:** Keep the existing authenticated journal and stored trade shape. Add pure calculation helpers for daily, strategy, equity, and behavior metrics; render those through small accessible React components without adding a chart library.

**Tech Stack:** Next.js 16, React 19, TypeScript, Convex/Clerk, CSS, Vitest.

**Spec:** User request in this conversation dated 2026-09-01.

## Global Constraints

- Keep Clerk authentication and Convex ownership checks unchanged.
- Use only the user’s journal trades for journal analytics.
- Keep existing light/dark StayFlat journal tokens and responsive behavior.
- Charts must have a text or table equivalent and must not rely on color alone.

---

### Task 1: Tested analytics model

**Files:**
- Create: `src/lib/journal/analytics.ts`
- Create: `src/lib/journal/analytics.test.ts`

**Interfaces:**
- Consumes: `JournalTrade`, `deriveTrade()`.
- Produces: `buildJournalAnalytics(trades, period, now)` with summary, equity, daily, strategy, and report-equivalent observations.

- [ ] Write tests covering cumulative P/L order, same-day P/L grouping, blank strategy grouping, win rate, loss sizing, cool-down, loss concentration, and empty trades.
- [ ] Run `npm test -- src/lib/journal/analytics.test.ts` and confirm the new tests fail.
- [ ] Implement the typed one-pass aggregation and deterministic date keys.
- [ ] Run the test file and confirm it passes.

### Task 2: Trade form information order

**Files:**
- Modify: `src/components/journal/trade-form.tsx`
- Modify: `src/app/journal/journal.css`

**Interfaces:**
- Consumes: existing `JournalTrade.sizeMode`, `sizeUsd`, and `units`.
- Produces: a single `Position size` field group containing the Dollar value/Units control and its matching input side by side.

- [ ] Move the size mode control beside the matching size input.
- [ ] Group entry price, position size, and fees under a clear `Price and size` section.
- [ ] Keep stop-loss and take-profit together under `Trade plan`.
- [ ] Add responsive CSS so the size control stacks cleanly below 600px.

### Task 3: Graph, calendar, and strategy analytics

**Files:**
- Rewrite: `src/components/journal/analytics.tsx`
- Modify: `src/app/journal/journal.css`

**Interfaces:**
- Consumes: `buildJournalAnalytics()` output.
- Produces: accessible equity SVG, monthly P/L calendar, and strategy performance table.

- [ ] Render a cumulative P/L line with zero line, start/end values, and an accessible summary.
- [ ] Render the current relevant month as a Monday-first calendar; each traded day shows net P/L and trade count.
- [ ] Render strategies with trades, win rate, net P/L, average result, and profit factor.
- [ ] Add empty states that tell the user which missing trade fields are needed.

### Task 4: StayFlat report observations in Analytics

**Files:**
- Modify: `src/components/journal/analytics.tsx`
- Modify: `src/app/journal/journal.css`

**Interfaces:**
- Consumes: report-equivalent observations from `buildJournalAnalytics()`.
- Produces: size after loss, cool-down, loss cluster, average win/loss, long vs short, busy-day P/L, fees, and loss concentration.

- [ ] Render all available observations with measured figures and plain explanations.
- [ ] Show `Not enough data yet` where a metric cannot honestly be calculated.
- [ ] Keep statements descriptive, not prescriptive.

### Task 5: Verification and release

**Files:**
- Modify only if verification finds defects.

**Interfaces:**
- Consumes: complete journal implementation.
- Produces: tested production deployment on `stayflat.xyz/journal`.

- [ ] Run `git diff --check`, lint, TypeScript, tests, and production build.
- [ ] Test desktop and mobile layouts in a browser with sample trades.
- [ ] Deploy Convex only if its files changed; deploy Vercel and point `stayflat.xyz` to the new build.
- [ ] Verify production route authentication and deployment identity.
