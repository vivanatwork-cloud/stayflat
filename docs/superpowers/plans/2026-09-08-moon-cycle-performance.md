# Moon-Cycle Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compare realized trading performance during the roughly 15-day New Moon and Full Moon halves of every lunar cycle.

**Architecture:** Calculate exact phase boundaries locally with the free `astronomy-engine` package. Pass those boundaries into the existing position reconstruction so every venue, wallet, and combined report receives the same deterministic calculation. Store the optional result with report snapshots for backward compatibility, then render one restrained comparison section.

**Tech Stack:** Next.js 16, React, TypeScript, Convex, Astronomy Engine, Vitest, CSS.

**Spec:** `docs/superpowers/specs/2026-09-08-moon-cycle-performance.md`

## Global Constraints

- A New Moon period runs from a new moon until the next full moon; a Full Moon period runs from a full moon until the next new moon.
- Classify completed positions by exact close timestamp.
- P&L is net of recorded fees.
- Do not name a winner unless both periods contain at least five completed positions.
- Treat the result as correlation, not causation or trading advice.
- Do not make external moon-phase network requests.
- The calculation must work for historical and future dates without stored calendars or yearly maintenance.
- Existing saved reports must remain readable.

---

### Task 1: Define and test phase classification

**Files:**
- Create: `src/lib/moon/performance.ts`
- Create: `src/lib/moon/performance.test.ts`
- Modify: `src/lib/hyperliquid/metrics.ts`

**Interfaces:**
- Consumes: completed positions from `reconstructPositions` and ordered `MoonPhaseBoundary[]`.
- Produces: `computeMoonPerformance(positions, boundaries): MoonPerformance`.

- [ ] **Step 1: Add failing tests for the exact boundary rules**

Test these cases with fixed UTC timestamps:

```ts
const boundaries = [
  { phase: "new" as const, occursAt: 1_000 },
  { phase: "full" as const, occursAt: 2_000 },
  { phase: "new" as const, occursAt: 3_000 },
];

expect(classifyMoonPeriod(1_000, boundaries)).toBe("new");
expect(classifyMoonPeriod(1_999, boundaries)).toBe("new");
expect(classifyMoonPeriod(2_000, boundaries)).toBe("full");
expect(classifyMoonPeriod(2_999, boundaries)).toBe("full");
expect(classifyMoonPeriod(999, boundaries)).toBeNull();
```

Also test fee subtraction, wins and losses, average P&L, empty periods, a position that opens in one period and closes in another, and the five-position comparison threshold.

- [ ] **Step 2: Run the focused test and confirm it fails**

Run: `npx vitest run src/lib/moon/performance.test.ts`

Expected: failure because the moon performance module does not exist.

- [ ] **Step 3: Add the shared types and pure calculation**

Use these public shapes:

```ts
export type MoonPhaseBoundary = {
  phase: "new" | "full";
  occursAt: number;
};

export type MoonPeriodMetrics = {
  pnl: number;
  positions: number;
  wins: number;
  losses: number;
  winRate: number | null;
  averagePnl: number | null;
};

export type MoonPerformance = {
  newMoon: MoonPeriodMetrics;
  fullMoon: MoonPeriodMetrics;
  comparisonReady: boolean;
  betterPeriod: "new" | "full" | "tie" | null;
};
```

`classifyMoonPeriod` must find the latest boundary at or before `closedAt`. `computeMoonPerformance` must use `position.pnl - position.fees`, count zero-P&L positions in the sample size but not as wins or losses, and set `comparisonReady` only when each period has at least five positions.

- [ ] **Step 4: Attach the result to report metrics**

Make `Position` exportable from `src/lib/hyperliquid/metrics.ts`. Extend `SnapshotFields` with `moonPerformance?: MoonPerformance` and extend `computeMetrics` with an optional final `moonBoundaries: MoonPhaseBoundary[] = []` parameter. Only set `moonPerformance` when the boundaries cover the report's full `dateFrom` through `dateTo` range.

- [ ] **Step 5: Run focused and existing metric tests**

Run: `npx vitest run src/lib/moon/performance.test.ts src/lib/hyperliquid/metrics.test.ts src/lib/report/multi-venue.test.ts`

Expected: all tests pass.

- [ ] **Step 6: Commit the calculation**

```bash
git add src/lib/moon/performance.ts src/lib/moon/performance.test.ts src/lib/hyperliquid/metrics.ts
git commit -m "Add moon-cycle performance calculation"
```

---

### Task 2: Generate moon phase boundaries locally

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/lib/moon/phases.ts`
- Create: `src/lib/moon/phases.test.ts`

**Interfaces:**
- Consumes: report start and end timestamps.
- Produces: `moonPhaseBoundaries(dateFrom, dateTo): MoonPhaseBoundary[]`.

- [ ] **Step 1: Install the free calculation package**

Run: `npm install astronomy-engine`

Expected: `astronomy-engine` is added as a production dependency. It is required while reports are generated, so it must not be development-only.

- [ ] **Step 2: Add failing phase-generation tests**

Test that the function returns alternating new/full boundaries in ascending order, includes a boundary before `dateFrom` and after `dateTo`, and works across a year boundary.

Add fixed accuracy checks against Timeanddate's published New York values for September 2026:

```ts
expect(findBoundary("new", "2026-09")).toBeWithinMinutes("2026-09-11T03:27:00Z", 2);
expect(findBoundary("full", "2026-09")).toBeWithinMinutes("2026-09-26T16:49:00Z", 2);
```

These UTC values convert Timeanddate's published New York local times using the September daylight-saving offset.

- [ ] **Step 3: Run the focused test and confirm it fails**

Run: `npx vitest run src/lib/moon/phases.test.ts`

Expected: failure because `moonPhaseBoundaries` does not exist.

- [ ] **Step 4: Implement deterministic boundary generation**

Call `SearchMoonQuarter` shortly before `dateFrom`, then repeatedly call `NextMoonQuarter`. Map quarter `0` to `new`, quarter `2` to `full`, discard quarters `1` and `3`, and stop after obtaining the first new/full boundary later than `dateTo`. Return epoch milliseconds in ascending order.

- [ ] **Step 5: Run the focused test**

Run: `npx vitest run src/lib/moon/phases.test.ts`

Expected: all tests pass with no network access.

- [ ] **Step 6: Commit the calculation source**

```bash
git add package.json package-lock.json src/lib/moon/phases.ts src/lib/moon/phases.test.ts
git commit -m "Calculate moon phase boundaries locally"
```

---

### Task 3: Add phase calculations to every report level

**Files:**
- Modify: `src/app/api/report/batch/route.ts`
- Modify: `src/lib/report/multi-venue.ts`
- Modify: `src/lib/report/multi-venue.test.ts`

**Interfaces:**
- Consumes: locally calculated boundaries from Task 2.
- Produces: optional `moonBoundaries` input for `buildMultiVenueMetrics`.

- [ ] **Step 1: Add failing multi-venue propagation tests**

Pass known boundaries to `buildMultiVenueMetrics`. Assert Hyperliquid, Arcus, Lighter, combined exchange, individual wallet, and combined-wallet calculations use the same boundaries without merging trades across venues incorrectly.

- [ ] **Step 2: Update the report builder signature**

Change the interface to:

```ts
buildMultiVenueMetrics(
  sources,
  timezoneOffsetMinutes?: number,
  moonBoundaries?: MoonPhaseBoundary[],
): MultiVenueMetrics
```

Forward the boundaries to every `computeMetrics` call.

- [ ] **Step 3: Generate boundaries once per batch request**

In the batch route, derive the earliest and latest fill timestamps after exchange reads complete. Call `moonPhaseBoundaries` once for that range, then use the same array for every individual wallet report and the combined portfolio report.

This calculation is local and deterministic, so it needs no credentials, database cache, network fallback, or separate loading state.

- [ ] **Step 4: Run report tests**

Run: `npx vitest run src/lib/report/multi-venue.test.ts src/lib/moon`

Expected: all tests pass without network access.

- [ ] **Step 5: Commit propagation**

```bash
git add src/app/api/report/batch/route.ts src/lib/report/multi-venue.ts src/lib/report/multi-venue.test.ts
git commit -m "Add moon cycles to venue reports"
```

---

### Task 4: Store the optional result safely

**Files:**
- Modify: `convex/reportValidators.ts`
- Modify: `convex/reportValidators.test.ts`

**Interfaces:**
- Consumes: `MoonPerformance` stored inside `ReportMetrics`.
- Produces: backward-compatible validation for saved reports.

- [ ] **Step 1: Add a failing validator test**

Test both a new report containing `moonPerformance` and an older saved report without it. Both must validate.

- [ ] **Step 2: Add optional validators**

Add validators mirroring `MoonPeriodMetrics` and `MoonPerformance`, then add `moonPerformance: v.optional(moonPerformanceValidator)` to the shared snapshot fields used by both empty and filled metrics.

- [ ] **Step 3: Run validator and storage tests**

Run: `npx vitest run convex/reportValidators.test.ts`

Expected: both old and new report shapes pass.

- [ ] **Step 4: Commit storage compatibility**

```bash
git add convex/reportValidators.ts convex/reportValidators.test.ts
git commit -m "Store optional moon performance metrics"
```

---

### Task 5: Build the report section

**Files:**
- Create: `src/components/report/moon-cycle-performance.tsx`
- Modify: `src/components/report/wallet-report.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `MoonPerformance | undefined` from the currently selected wallet and venue metrics.
- Produces: accessible `MoonCyclePerformance` report section with ready, low-data, and unavailable states.

- [ ] **Step 1: Create the section component**

Render a header, a thin two-part cycle strip, and two comparison columns. Each column shows net P&L first, followed by win rate, average position result, and completed positions. Use labels “New Moon period” and “Full Moon period,” with the boundary definition directly below the heading.

When `comparisonReady` is true, show one sentence such as “Your New Moon periods produced the stronger net result.” When false, show “Not enough completed positions for a reliable comparison.” Always include the correlation warning from the spec.

- [ ] **Step 2: Add the missing-data state**

If `moonPerformance` is absent, render: “Moon-cycle analysis is not available in this saved report yet.” Include the existing refresh action supplied by the parent. Do not show zeros, because an absent calculation is different from zero performance.

- [ ] **Step 3: Place it in the report hierarchy**

Render the component after `ReportVisuals` and `TradingRhythm`, before “More observations.” Because it reads the currently selected `metrics`, it will update automatically when the member changes wallet or exchange tabs.

- [ ] **Step 4: Add restrained visual styling**

Reuse the report's paper, ink, typography, spacing, positive, and negative tokens. The cycle strip may use one muted moonlit blue-gray accent and light/dark circular marks. Do not use star fields, gradients, animations, or astrology symbols. On narrow screens, stack the two comparison columns while keeping the phase labels visible.

- [ ] **Step 5: Verify accessibility and responsive behavior**

Confirm heading order, text contrast, keyboard navigation, 44px mobile refresh target, no horizontal overflow at 320px, and readable negative/positive values without relying only on color.

- [ ] **Step 6: Commit the section**

```bash
git add src/components/report/moon-cycle-performance.tsx src/components/report/wallet-report.tsx src/app/globals.css
git commit -m "Add moon-cycle report section"
```

---

### Task 6: Complete verification and staged release

**Files:**
- Modify: `docs/superpowers/plans/2026-09-08-moon-cycle-performance.md`

**Interfaces:**
- Consumes: all completed tasks.
- Produces: a tested preview deployment ready for product approval.

- [ ] **Step 1: Run the full automated checks**

Run: `npm test && npm run lint && npm run build`

Expected: all tests pass, ESLint reports no errors, and the Next.js production build completes.

- [ ] **Step 2: Verify four real report states in a preview deployment**

Check: a single exchange, combined exchanges, multiple wallets, and an old saved report without moon data. For each populated period, independently total several positions around a known phase boundary and compare the UI result.

- [ ] **Step 3: Confirm historical range handling**

Generate reports whose fills cross a year boundary and span multiple years. Confirm every completed position is assigned exactly once and the two bucket position counts add up to the report's completed-position count.

- [ ] **Step 4: Review product wording**

Confirm no heading or result implies prediction, causation, or guaranteed performance. Confirm the two periods are described as roughly 15 days rather than exactly 15 days.

- [ ] **Step 5: Mark the plan complete and commit**

```bash
git add docs/superpowers/plans/2026-09-08-moon-cycle-performance.md
git commit -m "Document moon-cycle report verification"
```
