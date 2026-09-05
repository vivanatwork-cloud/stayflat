# Journal Hardening and Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the StayFlat journal payment-protected, safe against malformed journal data, fast to load, and usable with mouse, keyboard, and mobile screens.

**Architecture:** Replace the public iframe document with a first-party React journal route. Check paid access on the server before rendering, repeat that authorization inside Convex, validate every saved trade, and keep Convex as the source of truth while an explicitly marked browser copy supports temporary connection loss.

**Tech Stack:** Next.js 16 App Router, React 19, Clerk, Convex, TypeScript, CSS

**Spec:** Review request in this conversation dated 2026-09-01

## Global Constraints

- Trading Journal is available only after payment.
- Returning customers must recover paid access through their verified Clerk email.
- Journal actions and status copy use plain, direct language.
- Preserve StayFlat's trading-state insight as the journal's signature feature.
- Do not expose the working journal through a public static HTML file.

---

### Task 1: Enforce paid access at every journal boundary

**Files:**
- Modify: `src/app/journal/page.tsx`
- Modify: `src/app/api/journal/route.ts`
- Modify: `convex/journals.ts`
- Modify: `convex/schema.ts`
- Delete: `public/reference/stayflat-journal.html`
- Test: `src/app/api/journal/route.test.ts`

**Interfaces:**
- Consumes: Clerk user ID, verified primary email, Convex token, `payments.claimLegacyAccountByEmail`.
- Produces: `requirePaidOwner(ctx) -> Promise<string>` and journal routes that return `402` for authenticated unpaid accounts.

- [ ] **Step 1: Write failing access tests**

Cover signed-out `401`, signed-in unpaid `402`, and paid `200` responses for both `GET` and `PUT`. Also assert that `/reference/stayflat-journal.html` returns `404` after migration.

- [ ] **Step 2: Add a shared paid-owner guard**

Create this helper in `convex/auth.ts` and use it in both journal functions:

```ts
export async function requirePaidOwner(ctx: QueryCtx | MutationCtx) {
  const ownerId = await requireOwnerId(ctx);
  const payment = await ctx.db
    .query("payments")
    .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
    .first();
  if (!payment) throw new Error("PAYMENT_REQUIRED");
  return ownerId;
}
```

- [ ] **Step 3: Recover legacy payment before the page access check**

In `src/app/journal/page.tsx`, read Clerk auth and the verified primary email, call `claimLegacyAccountByEmail` through the server-held write secret, then query `payments.hasPaid` with the Clerk Convex token. Redirect unpaid users to `/payment` before rendering journal UI.

- [ ] **Step 4: Repeat authorization in the data API**

Map `PAYMENT_REQUIRED` from Convex to this response in both handlers:

```ts
return NextResponse.json(
  { error: "Complete payment to use the trading journal." },
  { status: 402 },
);
```

- [ ] **Step 5: Remove the static bypass**

Delete `public/reference/stayflat-journal.html` after its interface has moved into React components.

- [ ] **Step 6: Run the access tests**

Run: `npm test -- src/app/api/journal/route.test.ts`

Expected: all journal authentication and payment cases pass.

### Task 2: Validate journal data and prevent unsafe rendering

**Files:**
- Create: `src/lib/journal/types.ts`
- Create: `src/lib/journal/validation.ts`
- Create: `src/lib/journal/csv.ts`
- Modify: `convex/journals.ts`
- Modify: `convex/schema.ts`
- Test: `src/lib/journal/validation.test.ts`
- Test: `src/lib/journal/csv.test.ts`

**Interfaces:**
- Produces: `JournalTrade`, `JournalState`, `parseJournalState(value)`, and `exportJournalCsv(state)`.
- Consumes: typed values in the React journal and Convex mutation.

- [ ] **Step 1: Write failing validation tests**

Test invalid dates, non-positive entry prices and sizes, mismatched exit price/time, more than 10,000 trades, and valid open and closed trades.

- [ ] **Step 2: Define one exact trade shape**

Replace `v.any()` with a `v.array(v.object({...}))` validator covering ID, timestamps, market, strategy, direction, prices, size mode, fees, trading-state score, reason, and note. Mirror it with TypeScript types in `src/lib/journal/types.ts`.

- [ ] **Step 3: Validate before saving**

Return `400` with a field-specific message when `parseJournalState` rejects the request. Require finite numbers, a starting balance of zero or more, and strings with explicit maximum lengths.

- [ ] **Step 4: Render user data through React text nodes**

Do not use `innerHTML` for markets, notes, chart labels, table cells, or error messages. Pass all journal values as JSX text so React escapes them.

- [ ] **Step 5: Protect CSV exports**

Prefix cells beginning with `=`, `+`, `-`, or `@` with a single quote before CSV quoting so spreadsheet applications do not run them as formulas.

- [ ] **Step 6: Run validation and export tests**

Run: `npm test -- src/lib/journal/validation.test.ts src/lib/journal/csv.test.ts`

Expected: malformed data is rejected and exported formula-like cells are inert.

### Task 3: Replace the iframe with a resilient React journal

**Files:**
- Create: `src/components/journal/journal.tsx`
- Create: `src/components/journal/trade-form.tsx`
- Create: `src/components/journal/trade-table.tsx`
- Create: `src/components/journal/analytics.tsx`
- Create: `src/components/journal/journal.css`
- Modify: `src/app/journal/page.tsx`
- Test: `src/components/journal/journal.test.tsx`

**Interfaces:**
- Consumes: `JournalState`, `GET /api/journal`, `PUT /api/journal`.
- Produces: a first-party journal with explicit `loading`, `saved`, `offline`, and `error` states.

- [ ] **Step 1: Write failing behavior tests**

Test loading, empty journal, logging a trade, editing a trade, deleting with confirmation, switching analytics periods, failed save retry, and keyboard closing/focus return for the trade dialog.

- [ ] **Step 2: Build the journal shell**

Keep `Log a trade` as the primary action, show the current save state beside it, and move the account menu into the same header layout so it cannot overlap controls.

- [ ] **Step 3: Build accessible controls**

Use a native `<dialog>`, associated `<label htmlFor>`, `aria-pressed` for segmented controls, and tab semantics (`role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`). Make each trade row reachable by keyboard through an explicit `Edit trade` button.

- [ ] **Step 4: Make the mobile trade log readable**

Below 720px, replace the 780px-wide scrolling table with compact trade rows that lead with market, side, net P/L, and entry date. Keep every control's hit area at least 44px.

- [ ] **Step 5: Use clear interface copy**

Use `Starting trading balance`, `Trading state`, `Why did you enter?`, `Saved to your account`, `Saved in this browser—reconnect to sync`, and `Save failed. Try again.`

- [ ] **Step 6: Run component tests**

Run: `npm test -- src/components/journal/journal.test.tsx`

Expected: all mouse, keyboard, loading, empty, error, and mobile behavior tests pass.

### Task 4: Prevent lost updates and reduce page work

**Files:**
- Modify: `src/components/journal/journal.tsx`
- Modify: `src/components/journal/analytics.tsx`
- Modify: `src/app/journal/page.tsx`
- Test: `src/components/journal/journal-sync.test.tsx`

**Interfaces:**
- Produces: ordered saves with one in-flight request, a retryable pending state, and analytics loaded only when requested.

- [ ] **Step 1: Write failing synchronization tests**

Simulate two quick edits with the first response arriving last, an offline edit followed by reconnection, and server data arriving after a local edit. Assert that the newest edit always wins.

- [ ] **Step 2: Serialize saves**

Keep one save request in flight and coalesce later changes into the next request. Do not send overlapping full-journal writes.

- [ ] **Step 3: Track browser-copy freshness**

Store `updatedAt` and `pendingSync` with the browser copy. Never replace a newer pending browser copy with an older server response; show a choice if both sides changed.

- [ ] **Step 4: Remove duplicate document work**

Use the app's existing Next.js fonts and CSS tokens instead of loading Google Fonts inside a second iframe document. Dynamically import analytics when the Analytics tab is first selected.

- [ ] **Step 5: Run all checks**

Run: `npm run lint && npx tsc --noEmit && npm test && npm run build`

Expected: lint, types, tests, and the production build all pass.

- [ ] **Step 6: Verify signed-in production states**

Check paid and unpaid accounts at desktop and mobile widths. Confirm the public static URL returns `404`, an unpaid user reaches `/payment`, and a paid user can save, reload, export, and recover from a failed request without losing the latest trade.
