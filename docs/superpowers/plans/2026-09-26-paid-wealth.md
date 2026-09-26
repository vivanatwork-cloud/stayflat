# Paid Wealth Implementation Plan

> **For agentic workers:** Execute inline, preserving pre-existing journal changes.

**Goal:** Every paid member can use Wealth with private, reusable account storage and StayFlat's native visual language.
**Architecture:** Clerk identifies the member; Convex checks payment on every read/write. Store records individually by owner, collection and identifier, chunking large statement/history records. Use revision checks to reject stale device writes. Keep undo in memory and offer existing browser records for explicit import.
**Tech Stack:** Next.js, React, Clerk, Convex, Zod, Vitest.
**Spec:** User request in this conversation, 26 September 2026.

## Constraints
- Preserve unrelated working tree changes.
- No financial data written to browser storage; theme preference remains local.
- No sample data automatically copied into real accounts.
- Never announce saved until server confirms; failed edits stay in memory for retry/export.
- Existing sign-in and payment flow; no extra authentication system.

## Tasks
- [x] Add Convex owner-indexed wealth settings and record tables, validated reads/writes, paid checks, expected-owner guard and revision conflict rejection. Test unpaid/anonymous refusal, owner isolation, round-trip storage, chunking and stale revisions.
- [x] Add authenticated GET/PUT /api/wealth using Clerk tokens. Change useWorkspace to load cloud data, serialize writes, report saving/errors, retry failures, preserve a session undo, and import old owner-keyed browser data only after confirmation. Remove local copy only following successful save.
- [x] Change /wealth page and account menu to existing paid gate, including legacy paid account recovery.
- [x] Use existing StayFlat mark, fonts, paper/teal colours, theme toggle and account menu. Replace browser-only and separate-brand copy. Verify desktop/mobile and both themes.
- [x] Run tests/build. Deploy Convex, then Vercel, update stayflat.xyz alias and verify live route protection.
