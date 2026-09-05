# Onboarding Reliability and Trust Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make onboarding load immediately, preserve returning users' answers, save reliably, and make every question and promise match what StayFlat actually does.

**Architecture:** Load Clerk identity, legacy-account recovery, saved onboarding, and payment access on the server before rendering. Pass validated initial state to a focused client flow, use exact Convex validators, and remove sensitive screening questions until StayFlat has a real non-sales support path for those answers.

**Tech Stack:** Next.js 16 App Router, React 19, Clerk, Convex, TypeScript, Vitest, CSS

**Spec:** Review request in this conversation dated 2026-09-01

## Global Constraints

- Existing onboarding answers must not be overwritten or silently replaced.
- A returning customer must recover data through a verified Clerk email before onboarding renders.
- Do not claim onboarding personalizes the report unless report code consumes the answers.
- Do not collect sensitive loss-of-control signals without a real response path.
- Keep the existing StayFlat paper, ink, teal, editorial type, and flatline progress language.

---

### Task 1: Restore account and onboarding data before rendering

**Files:**
- Modify: `src/app/onboarding/page.tsx`
- Modify: `src/components/onboarding/onboarding-flow.tsx`
- Test: `src/app/onboarding/page.test.tsx`

**Interfaces:**
- Consumes: Clerk `auth()`, `currentUser()`, verified primary email, `payments.claimLegacyAccountByEmail`, `onboarding.get`, and `payments.reportAccess`.
- Produces: `OnboardingFlow({ initialAnswers, initialStep, reportLimit })` with no client recovery waterfall.

- [ ] **Step 1: Write failing restoration tests**

Test a new user, a current user with saved answers, and a returning user whose payment and onboarding records use an older Clerk owner ID. Assert that saved answers are present in the first rendered onboarding screen.

- [ ] **Step 2: Recover the legacy account on the server**

Use the same verified-email mutation already used by the journal:

```ts
const access = await convex.mutation(api.payments.claimLegacyAccountByEmail, {
  writeSecret,
  ownerId: session.userId,
  email,
});
```

- [ ] **Step 3: Fetch saved answers after recovery**

Read `onboarding.get` and `payments.reportAccess` with the Clerk Convex token after the recovery mutation. Pass only `answers`, `step`, and `reportLimit` into the client component.

- [ ] **Step 4: Remove the client loading waterfall**

Delete `claimLegacyAccount`, `accountChecked`, `ready`, and the full-screen `Loading your answers` gate from `OnboardingFlow`. Initialize state from server props.

- [ ] **Step 5: Run restoration tests**

Run: `npm test -- src/app/onboarding/page.test.tsx`

Expected: all new, current, and legacy-account cases render the correct first state.

### Task 2: Validate and save each step reliably

**Files:**
- Create: `convex/onboardingValidators.ts`
- Create: `src/lib/onboarding/validation.ts`
- Modify: `convex/onboarding.ts`
- Modify: `convex/schema.ts`
- Modify: `src/components/onboarding/onboarding-flow.tsx`
- Test: `src/lib/onboarding/validation.test.ts`

**Interfaces:**
- Produces: `OnboardingAnswers`, `parseOnboardingAnswers(value)`, and `onboarding.save({ answers, step, completed }) -> { updatedAt }`.

- [ ] **Step 1: Write failing validation tests**

Cover unknown answer keys, values outside the listed options, blank `venuesOther`, steps below zero or above the final step, and valid partial and completed answers.

- [ ] **Step 2: Replace `v.any()` with exact validators**

Define optional fields for markets, venues, `venuesOther`, tenure, stop-loss use, loss limit, behavior patterns, and goal. Restrict every value to its displayed option literals and cap free text at 80 characters.

- [ ] **Step 3: Add an explicit save state**

Disable Continue while saving and show `Saving…`, `Saved`, or `Couldn’t save. Try again.`. Advance only after the mutation succeeds.

- [ ] **Step 4: Prevent repeated and stale saves**

Use one pending mutation at a time. Build the mutation payload from the current answer snapshot passed to the action, not a stale render closure.

- [ ] **Step 5: Run validation tests**

Run: `npm test -- src/lib/onboarding/validation.test.ts`

Expected: malformed answers and invalid steps are rejected while valid partial progress saves.

### Task 3: Align sensitive questions with the real product

**Files:**
- Modify: `src/components/onboarding/onboarding-flow.tsx`
- Modify: `src/app/page.tsx`
- Test: `src/components/onboarding/onboarding-copy.test.tsx`

**Interfaces:**
- Produces: seven behavior-focused questions that are used to prepare coaching, without collecting unsupported loss-of-control screening data.

- [ ] **Step 1: Write a failing question-set test**

Assert that onboarding does not collect `flags` answers and that the opening copy does not say the wallet report is personalized by onboarding data.

- [ ] **Step 2: Remove the unsupported sensitive screening question**

Remove `In the last 12 months, has any of this been true?` and its six options until StayFlat has a qualified-support branch that changes the next step rather than continuing to payment.

- [ ] **Step 3: Correct the product promise**

Replace:

```text
Eight honest questions help us understand you better and shape the report around what you actually need.
```

with:

```text
Seven short questions give us context for your coaching call and help you name the behavior you want to change.
```

- [ ] **Step 4: Clarify answer use**

Use:

```text
Your answers are saved to your StayFlat account and used to prepare for your coaching call. They do not change the wallet analytics and are not a diagnosis.
```

- [ ] **Step 5: Decide separately whether to delete stored `flags` fields**

Before any production deletion, list the affected onboarding record IDs and obtain explicit approval. Do not delete historical answers as part of this implementation without that approval.

- [ ] **Step 6: Run copy tests**

Run: `npm test -- src/components/onboarding/onboarding-copy.test.tsx`

Expected: no unsupported personalization or coaching-suitability claims remain.

### Task 4: Make review and completion frictionless

**Files:**
- Modify: `src/components/onboarding/onboarding-flow.tsx`
- Modify: `src/app/globals.css`
- Test: `src/components/onboarding/onboarding-flow.test.tsx`

**Interfaces:**
- Produces: `editFromReview(step)` and `returnToReview` state that returns directly to the summary after one edited answer.

- [ ] **Step 1: Write failing review-flow tests**

Test editing a summary answer, selecting a replacement, returning directly to review, preserving all other answers, and displaying the custom venue instead of only `Other`.

- [ ] **Step 2: Return directly to review after an edit**

When Edit is selected, store `returnToReview = true`. Change the primary action on that question to `Save change`, persist the answer, then return to the summary.

- [ ] **Step 3: Show every retained answer clearly**

Use labels `Markets`, `Trading platforms`, `Experience`, `Stop-loss use`, `Loss limit`, `Patterns`, and `Goal`. Render `Other — {venuesOther}` for a custom venue.

- [ ] **Step 4: Correct completion CTAs**

Use `Continue to Wallet Analytics` for paid users and `Unlock StayFlat tools` for unpaid users. Do not say a call is booked before the user opens the scheduler.

- [ ] **Step 5: Improve the opening action**

Replace `Start` with `Answer 7 questions` so the button states the effort and result.

- [ ] **Step 6: Run review-flow tests**

Run: `npm test -- src/components/onboarding/onboarding-flow.test.tsx`

Expected: an edited answer saves once and returns directly to a complete summary.

### Task 5: Polish progress, mobile states, and accessibility

**Files:**
- Modify: `src/components/onboarding/onboarding-flow.tsx`
- Modify: `src/app/globals.css`
- Test: `src/components/onboarding/onboarding-accessibility.test.tsx`

**Interfaces:**
- Produces: a semantic progress bar and keyboard-readable question state.

- [ ] **Step 1: Write failing accessibility tests**

Check `progressbar` name and values, 44px minimum Back/Edit targets, visible save errors, question heading focus, and mobile summary ordering.

- [ ] **Step 2: Make progress semantic**

Add `role="progressbar"`, `aria-valuemin={0}`, `aria-valuemax={questions.length}`, and `aria-valuenow={Math.min(step, questions.length)}` while keeping the flatline-thin visual treatment.

- [ ] **Step 3: Increase secondary hit areas**

Give Back and summary Edit controls a minimum 44px height without increasing their visual weight.

- [ ] **Step 4: Keep payment access off the critical path**

Use the server-provided `reportLimit`; do not subscribe to `payments.reportAccess` during all question steps.

- [ ] **Step 5: Run all checks**

Run: `npm run lint && npx tsc --noEmit && npm test && npm run build`

Expected: lint, types, tests, and production build pass.

- [ ] **Step 6: Verify signed-in production behavior**

Check new, returning, paid, unpaid, desktop, mobile, keyboard, failed-save, and slow-network cases before deployment.
