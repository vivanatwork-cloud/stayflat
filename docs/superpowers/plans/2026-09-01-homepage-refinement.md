# Homepage Refinement Implementation Plan

> **For agentic workers:** Implement this plan task-by-task and verify each result in a real browser. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the StayFlat homepage and account handoff clearer, shorter, more accessible, and faster without changing Clerk authentication or the established visual direction.

**Architecture:** Keep the homepage server-rendered and preserve its existing components and tokens. Add one small client component for phone-menu state, revise only approved copy and section structure, and use CSS rendering containment for distant sections.

**Tech Stack:** Next.js 16, React 19, Clerk, Convex, CSS, Vitest

**Spec:** Homepage recommendations approved in the current conversation, with the founding-price label removed and the platform disclosure moved to the FAQ.

## Global Constraints

- Preserve Clerk authentication behaviour and all existing routes.
- Preserve the paper, ink, and teal palette, current fonts, and desktop composition.
- Remove every “Founding price for the first 20 traders.” label.
- Remove the platform disclosure beneath the primary CTA and place it in the FAQ.
- Do not invent social links, employer names, or proof claims.

---

### Task 1: Account wording and handoff

**Files:**
- Modify: `src/components/brand/account-actions.tsx`
- Modify: `src/components/brand/site-header.tsx`
- Modify: `src/components/auth-shell.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: Clerk `useAuth`, existing `/sign-in` and `/sign-up` routes
- Produces: a “Sign in” text link, a “Create account” button, and a distinct account-page introduction

- [ ] Change the signed-out desktop actions to “Sign in” and “Create account” while retaining the signed-in Clerk account menu.
- [ ] Change the outer sign-up heading to “Start your StayFlat review.” and keep Clerk’s form heading unchanged.
- [ ] Verify both account routes and the Privacy and Terms link.

### Task 2: Accessible phone menu

**Files:**
- Create: `src/components/brand/mobile-site-menu.tsx`
- Modify: `src/components/brand/site-header.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: phone navigation links and account actions as `ReactNode`
- Produces: `MobileSiteMenu({ children }: { children: ReactNode })`

- [ ] Use a native button with `aria-expanded` and an open/close label.
- [ ] Close the menu after a link is selected, when Escape is pressed, or when the user clicks outside.
- [ ] Keep the closed phone header limited to the StayFlat logo and menu button.

### Task 3: Landing-page copy and flow

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/payment/page.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: existing landing sections and CTA styles
- Produces: revised FAQ copy, one post-sample CTA, and no founding-price labels

- [ ] Remove the founding-price label from the hero, closing offer, FAQ, and payment screen.
- [ ] Remove the platform note below “Find my trading pattern.”
- [ ] Put the exact platform disclosure in the trading-records FAQ answer.
- [ ] Add a “Find my trading pattern” CTA immediately after the sample report.
- [ ] Reduce the repeated-loss examples from four to three.
- [ ] Change “Your record stays yours.” to “Your record helps you—not the platform.” and support the read-only promise.
- [ ] Reorder the $3 FAQ answer so contents come before price.

### Task 4: Safe rendering improvement and verification

**Files:**
- Modify: `src/app/globals.css`
- Test: existing Vitest suite and live browser measurements

**Interfaces:**
- Consumes: long below-the-fold landing sections
- Produces: deferred rendering through `content-visibility: auto` with a reserved intrinsic size

- [ ] Apply rendering containment only to landing sections below the sample.
- [ ] Run `npm test`, `npm run lint`, and `npm run build`.
- [ ] Verify 390px and 1440px screenshots, phone-menu states, account links, FAQ text, and CTA placement.
