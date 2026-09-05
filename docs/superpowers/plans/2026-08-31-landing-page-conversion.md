# Landing Page Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the StayFlat landing page clearer, more trustworthy, easier to use, and cacheable without changing the product flow.

**Architecture:** Keep the homepage as a server component containing static marketing content and route every primary call to action through `/sign-up`, where existing Clerk routing handles signed-in visitors. Reorder and rewrite the existing sections, add factual trust and FAQ content, add sharing metadata, and extend the existing CSS system rather than adding a new UI library.

**Tech Stack:** Next.js 16, React 19, TypeScript, CSS, Clerk

**Spec:** `docs/reviews/2026-08-31-four-page-frontend-review.md` plus the landing-page review in the active conversation

## Global Constraints

- Preserve existing user changes in the dirty worktree.
- Do not invent customer testimonials, performance claims, or founder credentials.
- Keep StayFlat positioned as educational coaching, not financial or clinical advice.
- Keep the existing paper, ink, and teal visual system.
- Verify with `npm run lint` and `npm run build`.

---

### Task 1: Static, clearer landing page

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: existing `/sign-up`, `SiteHeader`, `SiteFooter`, `FlatlineMark`, and `/vivan.jpg`
- Produces: a static homepage whose primary CTA is “Find my trading pattern”

- [ ] **Step 1: Remove request-time authentication from the homepage**

Delete the `auth` import and `await auth()` call. Use `/sign-up` for every primary CTA so the existing auth flow owns redirect behavior.

- [ ] **Step 2: Reorder and rewrite the page**

Place the sample report after the hero, reduce the process to three steps, soften accusatory lines, state the $3 offer in the hero, add factual trust details, add an FAQ, and keep the safety guidance.

- [ ] **Step 3: Extend the existing CSS**

Add styles for the hero offer, report timeline detail, trust strip, FAQ, skip link, 44px hit areas, pressed button feedback, balanced headings, and responsive behavior.

- [ ] **Step 4: Verify page semantics**

Run: `npm run lint`

Expected: exit code 0 with no ESLint errors.

### Task 2: Trust and sharing metadata

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/components/brand/site-footer.tsx`

**Interfaces:**
- Consumes: `metadataBase`, existing footer navigation, and the global type and color tokens
- Produces: social sharing metadata and factual trust information on the landing page

- [ ] **Step 1: Add Open Graph and Twitter metadata**

Use the existing title and landing-page description with `https://stayflat.xyz` as the canonical URL.

- [ ] **Step 2: Verify the production result**

Run: `npm run build`

Expected: exit code 0 and `/` shown as a static route (`○`) rather than a dynamic route (`ƒ`).

### Task 3: Final review

**Files:**
- Review: `src/app/page.tsx`
- Review: `src/app/globals.css`
- Review: `src/app/layout.tsx`
- Review: `src/components/brand/site-footer.tsx`

**Interfaces:**
- Consumes: output from Tasks 1 and 2
- Produces: verified implementation with no accidental changes outside the landing-page scope

- [ ] **Step 1: Inspect the focused diff**

Run: `git diff -- src/app/page.tsx src/app/globals.css src/app/layout.tsx src/components/brand/site-footer.tsx`

Expected: only the planned copy, layout, accessibility, metadata, and legal-page changes.

- [ ] **Step 2: Re-run all checks after the diff review**

Run: `npm run lint && npm run build`

Expected: both commands exit with code 0 and the homepage remains static.
