# Admin Operations Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build accurate customer filters and needs-attention workflows for the private StayFlat admin page.

**Architecture:** Parse and validate admin filters on the server, load all required Clerk account pages, join them with the existing Convex overview, and apply one tested customer-query function. Render a paginated operations ledger whose state lives in the URL. Later phases add funnel data, exports, notes, reconciliation, and an audit log without weakening the existing Clerk and Convex authorization checks.

**Tech Stack:** Next.js 16 App Router, React 19, Clerk, Convex, TypeScript, Vitest, native CSS.

**Spec:** `docs/superpowers/specs/2026-09-03-admin-operations-dashboard.md`

## Global Constraints

- Do not change production customer or payment records while testing filters.
- Keep the route restricted by the existing Next.js and Convex admin checks.
- Read the relevant Next.js 16 documentation in `node_modules/next/dist/docs/` before implementation.
- Keep existing search, manual access grants, report PDF links, and customer details working.
- Preserve filter state in the URL and exclude sensitive customer data from it.
- Reuse the current StayFlat admin visual language and native controls.

---

### Task 1: Define and test the customer filter model

**Files:**
- Create: `src/lib/admin/customer-filters.ts`
- Create: `src/lib/admin/customer-filters.test.ts`

**Interfaces:**
- Consumes: raw `searchParams` from `/admin` and joined customer records.
- Produces: `parseAdminFilters(searchParams)`, `filterAdminCustomers(customers, filters)`, `sortAdminCustomers(customers, sort)`, and `getAttentionReason(customer)`.

- [ ] Define exact union types for access, onboarding, report, journal, payment source, saved view, and sort order.
- [ ] Write failing tests for paid/unpaid, inclusive joined range, inclusive payment range, combined filters, invalid dates, sorting, and all four needs-attention rules.
- [ ] Run `npx vitest run src/lib/admin/customer-filters.test.ts` and confirm the tests fail.
- [ ] Implement parsing with safe defaults and date-only boundaries in the administrator's local calendar.
- [ ] Implement pure filtering, sorting, and attention-rule functions without database calls.
- [ ] Run the focused test file and confirm it passes.

### Task 2: Load the complete customer set safely

**Files:**
- Create: `src/lib/admin/clerk-users.ts`
- Create: `src/lib/admin/clerk-users.test.ts`
- Modify: `src/app/admin/page.tsx`

**Interfaces:**
- Consumes: Clerk `users.getUserList` cursor/offset pages and validated filters.
- Produces: `loadAdminClerkUsers(clerk, options)` returning `{ users, totalCount }` without the current 100-account ceiling.

- [ ] Confirm Clerk's installed SDK pagination contract from its local types and current official documentation.
- [ ] Write failing tests for one page, multiple pages, an empty page, and an upstream Clerk error.
- [ ] Implement bounded server-side pagination with no duplicate users and a clear error on incomplete data.
- [ ] Replace the single `limit: 100` request in `src/app/admin/page.tsx`.
- [ ] Verify headline counts and filter results use the complete joined customer set.
- [ ] Run the focused tests, full test suite, and lint.

### Task 3: Build the filter and saved-view control bar

**Files:**
- Create: `src/components/admin/customer-controls.tsx`
- Modify: `src/app/admin/page.tsx`
- Modify: `src/app/admin/admin.css`

**Interfaces:**
- Consumes: validated filter values, result count, and current URL parameters.
- Produces: an accessible GET form and saved-view links that update `/admin` without client-owned customer state.

- [ ] Render search, Paid/Unpaid, joined From/To, payment From/To, onboarding, report, journal, payment source, and sort controls.
- [ ] Add saved-view links for Paid no report, Paid never returned, Incomplete onboarding, and Payment mismatch.
- [ ] Show active filter chips, matching count, Clear filters, and correct empty-state copy.
- [ ] Keep controls compact on desktop and stack them in a usable order on phones.
- [ ] Verify labels, focus order, hit areas, and status text without relying on color.

### Task 4: Paginate results and preserve admin actions

**Files:**
- Modify: `src/lib/admin/customer-filters.ts`
- Modify: `src/lib/admin/customer-filters.test.ts`
- Modify: `src/app/admin/page.tsx`
- Modify: `src/app/admin/admin.css`

**Interfaces:**
- Consumes: filtered and sorted customers plus `page`.
- Produces: `paginateAdminCustomers(customers, page, pageSize)` and Previous/Next links retaining all filters.

- [ ] Test the first page, middle page, final page, out-of-range page, and retained query parameters.
- [ ] Paginate after filtering and sorting, using 25 customers per page.
- [ ] Keep expanded customer details, manual access grants, and PDF links functional.
- [ ] Add a compact “Showing X–Y of Z” summary.
- [ ] Run focused tests, the full suite, lint, and production build.

### Task 5: Verify Phase 1 with real read-only data

**Files:**
- Modify only if verification reveals a defect in Task 1–4 files.

**Interfaces:**
- Consumes: a production-like read-only dataset and an authenticated admin browser session.
- Produces: evidence that filters and saved views match the underlying records.

- [ ] Compare All, Paid, and Unpaid counts against the unfiltered joined records.
- [ ] Check joined and payment boundary dates using known accounts.
- [ ] Check each needs-attention view and explain every included account from source fields.
- [ ] Test search combined with filters, refresh persistence, clearing, and pagination.
- [ ] Test desktop and phone layouts in the browser.
- [ ] Confirm no payment, account, report, journal, or onboarding record changed.

### Task 6: Add Phase 2 funnel and safe export after separate approval

**Files:**
- Create: `src/lib/admin/funnel.ts`
- Create: `src/lib/admin/funnel.test.ts`
- Create: `src/app/api/admin/customers/export/route.ts`
- Create: `src/app/api/admin/customers/export/route.test.ts`
- Create: `src/components/admin/customer-funnel.tsx`
- Modify: `src/app/admin/page.tsx`
- Modify: `src/app/admin/admin.css`

**Interfaces:**
- Consumes: joined customer activity, selected 7/30/90-day window, and current filters.
- Produces: tested funnel counts/rates and an authenticated CSV response containing only approved columns.

- [ ] Test each funnel stage and conversion denominator, including zero-data windows.
- [ ] Add the compact funnel above the customer ledger with explicit stage definitions.
- [ ] Test export authorization, filter parity, escaping, filename, and exclusion of onboarding answers.
- [ ] Export email, access state, joined date, payment date/source, onboarding state, report count, journal trade count, and last sign-in only.
- [ ] Run full verification before deployment.

### Task 7: Add Phase 3 reconciliation and audit trail after separate approval

**Files:**
- Modify: `convex/schema.ts`
- Modify: `convex/admin.ts`
- Create: `src/lib/admin/reconciliation.ts`
- Create: `src/lib/admin/reconciliation.test.ts`
- Modify: `src/app/admin/actions.ts`
- Modify: `src/app/admin/page.tsx`

**Interfaces:**
- Consumes: verified BoomFi payment data, StayFlat payments, Clerk accounts, and authenticated admin actions.
- Produces: reconciliation issues and append-only `adminAuditEvents` records.

- [ ] Define issue types for paid-without-access, duplicate provider payment, unmatched owner, mismatched email, and manual grant.
- [ ] Add an append-only audit table containing actor, action, target, safe metadata, and timestamp.
- [ ] Record existing manual grants in the audit log.
- [ ] Add a retry action only for a payment already verified by BoomFi; make it idempotent and require explicit confirmation.
- [ ] Do not add access removal until its policy is separately approved.
- [ ] Deploy Convex before the matching Vercel build and verify both versions are compatible.
