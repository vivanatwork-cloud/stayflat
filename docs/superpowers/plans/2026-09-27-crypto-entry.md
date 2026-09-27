# Crypto entry and section wording Implementation Plan

> Execute inline; the referenced superpowers execution skills are not installed.

**Goal:** Offer manual, CSV and screenshot entry for crypto, using wallets and exchanges rather than banks; tailor all investment forms to their asset.
**Architecture:** Shared asset wording drives forms and tables. A dedicated crypto entry flow owns wallet creation and imports. Browser text recognition reads screenshots locally; editable rows require explicit confirmation before the existing private cloud save.
**Tech Stack:** Next.js, React, TypeScript, Tesseract.js, existing Convex persistence.
**Spec:** User request in this conversation, 27 September 2026.

## Constraints
- Keep financial records in the existing signed-in cloud workspace.
- Never attach crypto to a cash account, infer purchase cost, or overwrite existing holdings without review.
- Keep original images on the device; save reviewed holdings and extracted text only.
- Keep bank reuse and dedicated FD fields intact.

### Task 1: Asset wording
- [x] Add a shared mapping for bank, brokerage, fund, wallet/exchange, FD and provident-fund labels.
- [x] Use it in account forms, holding forms and record columns; show recurring fund contributions only for mutual funds.
- [x] Filter providers and holding destinations to compatible account types; hide cash balances on investment accounts.

### Task 2: Crypto entry
- [x] Add a three-choice entry dialog and an inline wallet-creation step which resumes the chosen method.
- [x] Parse required CSV columns into editable drafts; reject missing quantities, currencies and amounts.
- [x] Load screenshot text recognition only on demand; show the image and editable extracted text, identify coin names conservatively, leave financial amounts for explicit review.
- [x] Default imports to append, require confirmation, detect duplicate existing symbols, and offer explicit replacement with saved history.
- [x] Save through the existing commit function, prevent duplicate submissions and preserve retry behavior.

### Task 3: Verification and release
- [x] Unit-test validation, crypto-only destinations, replacement isolation and screenshot suggestions.
- [x] Test real browser manual, CSV, image recognition, reload, mobile and FD regression.
- [x] Run full tests/build, remove local fixtures, deploy and verify stayflat.xyz; commit only task files.
