# Guided Wealth Setup Implementation Plan

**Goal:** Give new Wealth members a clear, resumable path from an empty dashboard to their own financial picture.
**Architecture:** Store setup progress alongside the member's existing Convex wealth settings. Use confirmed server state for navigation, so failed saves never advance or complete setup. Reuse the existing record forms with guided defaults and wait for save confirmation. Keep example mode separate.
**Tech stack:** Next.js, React, Clerk, Convex, Zod, Vitest, headless Chrome.
**Spec:** User request for easy guided onboarding covering the Wealth dashboard.

- [x] Add optional versioned setup state to Data/validation, with welcome, cash, investments, activity, commitments, goal and review steps. New empty real workspaces open setup; existing and paused workspaces can opt in. Pure helpers determine eligibility and summarize gaps.
- [x] Extend the workspace store with confirmed data and awaitable commits; record forms accept defaults and wait for successful saves. All existing callers remain compatible. Failed saves retain pending data and enable existing retry/export behavior.
- [x] Build native StayFlat setup with one step per screen, progress, back, skip and save-and-pause. Reuse manual entry and CSV import. Explain account vs holding, current cash vs past transactions, and card dues vs assets. Capture personal goal and verify exchange rate for non-INR records before completion.
- [x] Present saved record summaries and an editable review checklist. Mark skipped areas honestly; keep setup accessible after completion.
- [x] Test eligibility, saved progress, skip/resume, validation, failed-save navigation and completion. Inspect desktop/mobile browser flows. Remove temporary fixtures, run full tests/build, deploy backend/frontend and verify live domain.

Constraints: No browser storage for financial data or setup progress. No preset financial target. Preserve user records and existing unrelated working files. Do not claim automatic bank connections, debt-inclusive net worth, or complete data when sections were skipped.
