# User Report Deletion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let signed-in users safely delete their own wallet and portfolio reports.

**Architecture:** An authenticated API calls one owner-scoped Convex mutation. The client uses a two-step inline confirmation and removes deleted records from local state after the server confirms.

**Tech Stack:** Next.js, React, TypeScript, Clerk, Convex, CSS

**Spec:** `docs/superpowers/specs/2026-09-08-user-report-deletion.md`

## Global Constraints

- Only the signed-in owner can delete a report.
- Every delete action requires confirmation.
- Deleting a wallet also deletes a saved portfolio containing it.
- Failed requests do not remove client state.

---

### Task 1: Owner-scoped deletion

**Files:**
- Modify: `convex/payments.ts`
- Create: `src/app/api/report/delete/route.ts`

**Interfaces:**
- Produces: `payments.deleteSavedReport({ writeSecret, ownerId, address?, portfolio? })`.
- Produces: `DELETE /api/report/delete`.

- [ ] Validate that exactly one deletion target is supplied.
- [ ] Find records through owner-scoped indexes and delete only matching records.
- [ ] Remove a portfolio containing a deleted wallet.
- [ ] Return whether a wallet and portfolio were deleted.

### Task 2: Confirm and update the interface

**Files:**
- Modify: `src/components/report/wallet-report.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `DELETE /api/report/delete`.

- [ ] Add two-step delete controls to result actions and saved report rows.
- [ ] Keep 44-pixel targets, visible focus states, and plain confirmation copy.
- [ ] Remove confirmed records from history state and reset an open deleted report.
- [ ] Show request errors without hiding the report.

### Task 3: Verify and deploy

**Files:**
- Modify only files required by verification fixes.

**Interfaces:**
- Produces: deployed owner-safe report deletion.

- [ ] Run Convex generation, tests, lint, and build.
- [ ] Deploy Convex before the website.
- [ ] Point both StayFlat domains to the verified deployment.
