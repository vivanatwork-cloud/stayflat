# Native Four-Page Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild StayFlat's four existing designs as native, accessible Next.js pages connected to Clerk and Convex without losing their visual identity.

**Architecture:** Keep routes server-rendered by default and use small client components only for interaction. Share one design system and application shell, use Clerk's user ID as ownership identity, use Convex for saved onboarding and journal data, and place the Hyperliquid request behind a server route.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Clerk, Convex, CSS, Vitest, Testing Library, Playwright.

**Spec:** `docs/reviews/2026-08-31-four-page-frontend-review.md`

## Global Constraints

- Preserve the current paper, typography, teal, rule, spacing, and flatline design direction.
- Do not add a component library unless an existing requirement cannot be met with the current stack.
- Default to Server Components; add `"use client"` only to interactive leaves.
- Never expose `CLERK_SECRET_KEY` or other server-only values to client code.
- All Convex reads and writes must be scoped to the authenticated Clerk user.
- Use plain, non-diagnostic language for behavioral interpretations.

---

### Task 1: Test foundation and shared design system

**Files:**
- Modify: `package.json`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`
- Create: `src/styles/tokens.css`
- Create: `src/components/brand/flatline-mark.tsx`
- Create: `src/components/brand/site-header.tsx`
- Create: `src/components/brand/site-footer.tsx`
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`
- Test: `src/components/brand/site-header.test.tsx`

**Interfaces:**
- Produces: `FlatlineMark`, `SiteHeader`, and `SiteFooter` shared by later pages.

- [ ] Install Vitest, Testing Library, user-event, jsdom, and Playwright as development dependencies.
- [ ] Add `test`, `test:watch`, and `test:e2e` scripts to `package.json`.
- [ ] Write a failing header test that checks the brand link, signed-out actions, and signed-in account slot.
- [ ] Run the test and verify it fails because the shared header does not exist.
- [ ] Add local Next.js font definitions for Newsreader, Hanken Grotesk, and JetBrains Mono in the root layout.
- [ ] Define shared color, type, spacing, border, shadow, and motion variables in `tokens.css`.
- [ ] Build the mark, header, and footer with semantic links and visible keyboard focus.
- [ ] Run the component test, lint, and production build.
- [ ] Commit the shared foundation.

### Task 2: Native landing page

**Files:**
- Replace: `src/app/page.tsx`
- Create: `src/components/landing/hero.tsx`
- Create: `src/components/landing/how-it-works.tsx`
- Create: `src/components/landing/sample-read.tsx`
- Create: `src/components/landing/suitability.tsx`
- Create: `src/components/landing/coach-section.tsx`
- Create: `src/components/landing/signup-section.tsx`
- Create: `src/app/page.test.tsx`

**Interfaces:**
- Consumes: shared brand components and design tokens from Task 1.
- Produces: a static `/` route whose primary actions point to `/sign-up`.

- [ ] Write a failing page test for one `h1`, working signup links, section anchors, and absence of editor notes.
- [ ] Run the test and verify the iframe implementation fails it.
- [ ] Rebuild each landing section as a Server Component using the reviewed copy.
- [ ] Recreate the flatline draw and section reveal with CSS and a small reduced-motion-safe client component only if needed.
- [ ] Add route metadata, canonical URL, and social description.
- [ ] Run component tests, lint, and build.
- [ ] Compare desktop and mobile screenshots to the reference HTML.
- [ ] Commit the native landing page.

### Task 3: Saved and safe onboarding

**Files:**
- Replace: `src/app/onboarding/page.tsx`
- Create: `src/components/onboarding/onboarding-flow.tsx`
- Create: `src/components/onboarding/question-step.tsx`
- Create: `src/components/onboarding/onboarding-summary.tsx`
- Create: `src/components/onboarding/support-screen.tsx`
- Create: `src/lib/onboarding/questions.ts`
- Modify: `convex/schema.ts`
- Create: `convex/onboarding.ts`
- Test: `src/components/onboarding/onboarding-flow.test.tsx`
- Test: `convex/onboarding.test.ts`

**Interfaces:**
- Produces: `getMyOnboarding`, `saveMyOnboardingStep`, and `submitMyOnboarding`, all deriving ownership from Clerk identity rather than accepting a user ID from the browser.

- [ ] Write failing tests for progress, back navigation, no automatic advance, saved answers, summary editing, and the support-first branch.
- [ ] Write failing Convex tests proving one user cannot read or update another user's answers.
- [ ] Add the onboarding schema with answer values, current step, submission state, and timestamps.
- [ ] Implement authenticated Convex queries and mutations.
- [ ] Build the native flow with Continue confirmation and debounced progress saving.
- [ ] Build the support-first result without a paid coaching action.
- [ ] Build the normal result with a real report link and a booking action only when a real booking destination exists.
- [ ] Add route metadata and accessible status announcements.
- [ ] Run unit tests, Convex tests, lint, and build.
- [ ] Test refresh recovery and keyboard navigation in a browser.
- [ ] Commit saved onboarding.

### Task 4: Accurate wallet report

**Files:**
- Replace: `src/app/report/page.tsx`
- Create: `src/app/api/hyperliquid/report/route.ts`
- Create: `src/components/report/wallet-report-form.tsx`
- Create: `src/components/report/report-card.tsx`
- Create: `src/lib/hyperliquid/client.ts`
- Create: `src/lib/hyperliquid/metrics.ts`
- Test: `src/lib/hyperliquid/metrics.test.ts`
- Test: `src/app/api/hyperliquid/report/route.test.ts`

**Interfaces:**
- Produces: `POST /api/hyperliquid/report` accepting `{ address: string }` and returning a typed report whose counts distinguish fills from grouped trades.

- [ ] Extract fixture data with duplicate fills, partial fills, no closes, and network errors.
- [ ] Write failing metric tests for deduplication, PnL, cooldown, size-after-loss, timezone labeling, and empty data.
- [ ] Implement typed metric functions without DOM access.
- [ ] Write failing server-route tests for invalid wallets, upstream timeout, upstream rejection, and successful results.
- [ ] Implement the server request with timeout, response validation, and safe error messages.
- [ ] Build the native form, loading skeleton, report card, metric explanations, copy fallback, retry, and share actions.
- [ ] Use “fills” for fill counts and label behavioral conclusions as interpretations.
- [ ] Add route metadata and wallet-processing privacy copy.
- [ ] Run unit tests, route tests, lint, and build.
- [ ] Test success, invalid wallet, empty wallet, timeout, and mobile layout in a browser.
- [ ] Commit the report flow.

### Task 5: User-owned journal

**Files:**
- Replace: `src/app/journal/page.tsx`
- Create: `src/components/journal/journal-shell.tsx`
- Create: `src/components/journal/trade-summary.tsx`
- Create: `src/components/journal/trade-table.tsx`
- Create: `src/components/journal/trade-card-list.tsx`
- Create: `src/components/journal/trade-dialog.tsx`
- Create: `src/components/journal/analytics.tsx`
- Create: `src/lib/trades/calculations.ts`
- Create: `src/lib/trades/csv.ts`
- Modify: `convex/schema.ts`
- Modify: `convex/trades.ts`
- Test: `src/lib/trades/calculations.test.ts`
- Test: `src/lib/trades/csv.test.ts`
- Test: `src/components/journal/trade-dialog.test.tsx`

**Interfaces:**
- Produces: authenticated Convex trade list, create, update, and delete operations; pure calculation and safe CSV functions.

- [ ] Write calculation tests covering long, short, open, closed, fees, R multiple, and drawdown.
- [ ] Write CSV tests proving formula-like cells are escaped.
- [ ] Write dialog tests for connected labels, initial focus, Escape, focus return, dirty-close warning, validation, and delete confirmation.
- [ ] Add user ownership and indexes to the Convex trade schema and operations.
- [ ] Move calculations and CSV generation into pure typed modules.
- [ ] Build summary, desktop table, mobile cards, analytics, and trade dialog as focused React components.
- [ ] Render all user values as React text; do not use `dangerouslySetInnerHTML`.
- [ ] Add loading, save, saved, error, retry, empty, and offline states.
- [ ] Run unit tests, Convex tests, lint, and build.
- [ ] Test create, edit, delete, refresh persistence, CSV export, keyboard use, and mobile layout in a browser.
- [ ] Commit the Convex-backed journal.

### Task 6: Cross-page production verification

**Files:**
- Create: `src/app/error.tsx`
- Create: `src/app/global-error.tsx`
- Create: `src/app/not-found.tsx`
- Create: `src/app/robots.ts`
- Create: `src/app/sitemap.ts`
- Create: `e2e/core-flow.spec.ts`

**Interfaces:**
- Consumes: all four completed native routes.
- Produces: one automated journey from landing through signup handoff, onboarding, report, and journal.

- [ ] Write failing end-to-end checks for working links, page titles, keyboard focus, and major error states.
- [ ] Add accessible route-level error and not-found pages.
- [ ] Add robots and sitemap output for public routes while excluding private journal content.
- [ ] Run the full unit and end-to-end test suites.
- [ ] Run `npm run lint` and `npm run build`.
- [ ] Run Lighthouse on desktop and mobile and record performance, accessibility, best-practices, and SEO results.
- [ ] Verify no full-page iframe, visible editor note, dead booking link, or client-inserted HTML remains.
- [ ] Commit production verification.
