# Private Admin Dashboard Implementation Plan

> **For agentic workers:** Implement this plan task-by-task and verify each result in a real browser. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a read-only `/admin` dashboard that only `vivanatwork@gmail.com` can access.

**Architecture:** The Next.js server page verifies the signed-in Clerk user before rendering. A second authorization check inside Convex protects the underlying query, so the data cannot be fetched by visiting Convex directly. The dashboard joins the latest Clerk users with compact Convex summaries and never sends entire journals or report histories to the browser.

**Tech Stack:** Next.js 16, React 19, Clerk, Convex, route-specific CSS, Vitest

**Spec:** Private admin dashboard requested in the current conversation for `vivanatwork@gmail.com`.

## Global Constraints

- Only `vivanatwork@gmail.com` may access admin data.
- Keep Clerk as the authentication provider.
- Protect the page and the Convex query independently.
- Version one is read-only: no delete, payment override, or account mutation controls.
- Limit large records to compact summaries and five recent journal trades.

---

### Task 1: Shared administrator authorization

**Files:**
- Create: `src/lib/admin.ts`
- Modify: `src/proxy.ts`
- Create: `convex/admin.ts`

**Interfaces:**
- Produces: `ADMIN_EMAIL`, `isAdminEmail(email)`, and `api.admin.overview`

- [ ] Add the exact email allowlist check in Next.js.
- [ ] Add `/admin(.*)` to Clerk-protected routes.
- [ ] Require the same normalized email inside the Convex query.
- [ ] Return compact payment, wallet, onboarding, journal, exchange-request, and legacy-trade summaries.

### Task 2: Server-rendered dashboard

**Files:**
- Create: `src/app/admin/page.tsx`
- Create: `src/app/admin/admin.css`

**Interfaces:**
- Consumes: Clerk `currentUser`, Clerk user list, Convex admin overview
- Produces: `/admin?q=` with summary cards, searchable users, payments, wallet reports, and exchange requests

- [ ] Redirect signed-out visitors to `/sign-in?redirect_url=/admin`.
- [ ] Return a not-found page for every signed-in email except the administrator.
- [ ] Fetch Clerk users and Convex data in parallel after authorization.
- [ ] Show operational totals and searchable user rows.
- [ ] Show compact activity details without rendering full report arrays or full journals.
- [ ] Use the existing paper, ink, teal, mono-label, and border-led design system.

### Task 3: Verification and production release

**Files:**
- Test: existing Vitest suite, lint, build, and browser output

**Interfaces:**
- Consumes: local and production `/admin`
- Produces: verified protected dashboard

- [ ] Run `npm test`, `npm run lint`, and `npm run build`.
- [ ] Verify a signed-out request redirects to sign-in.
- [ ] Verify the admin account can render dashboard data.
- [ ] Verify phone and desktop layouts have no horizontal overflow.
- [ ] Deploy and confirm `stayflat.xyz/admin` is protected.
