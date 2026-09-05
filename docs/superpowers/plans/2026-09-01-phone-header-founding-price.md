# Phone Header and Founding Price Implementation Plan

> **For agentic workers:** Implement this plan task-by-task and verify each result in a real browser.

**Goal:** Fix the landing-page phone header below 768px and add the founding-price note anywhere the visible $3 offer appears.

**Architecture:** Keep the existing server-rendered header and Clerk-backed account component. Use separate desktop and phone wrappers whose visibility is controlled at the requested breakpoint, then measure the rendered page with browser automation.

**Tech Stack:** Next.js 16, React 19, Clerk, CSS, Vitest

**Spec:** User request in the current conversation.

## Global Constraints

- Do not change desktop layout above 768px.
- Do not change colours, fonts, or Clerk authentication behaviour.
- Below 768px, show only the logo and one menu icon while the menu is closed.
- The phone menu must contain How it works, Who it's for, and the account action.
- Add “Founding price for the first 20 traders.” immediately below every visible $3 price.

---

### Task 1: Header structure and responsive visibility

**Files:**
- Modify: `src/components/brand/site-header.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: existing `AccountActions`, `SiteHeader`, and Clerk session state
- Produces: `.site-desktop-account` and `.site-mobile-menu` responsive regions

- [ ] Wrap the existing desktop account action without changing its contents.
- [ ] Put an account action after both section links inside the existing phone menu.
- [ ] At widths up to 767px, hide desktop links and account wrapper and show the menu icon on the right.
- [ ] At 768px and above, preserve the existing desktop navigation and hide the phone menu.

### Task 2: Founding-price note

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/payment/page.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: existing landing and checkout price blocks
- Produces: visible `.founding-price-note` text directly beneath each price

- [ ] Add the exact note beneath the hero price.
- [ ] Add the exact note beneath the closing offer price.
- [ ] Add the exact note beneath the checkout price description.
- [ ] Include the exact note in the $3 FAQ answer beneath its question.

### Task 3: Automated and browser verification

**Files:**
- Test: existing project test suite and browser-measurement output

**Interfaces:**
- Consumes: the built landing page
- Produces: test results and measurements at 390px, 768px, and 1440px

- [ ] Run `npm test` and require all tests to pass.
- [ ] Run `npm run build` and require a successful production build.
- [ ] Measure DOM presence, visibility, and bounding boxes at all three widths.
- [ ] At 390px, test closed and open menu states, overlap, viewport overflow, menu links, and rendered price text.
