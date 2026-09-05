# Report PDF Downloads Implementation Plan

> **For agentic workers:** Implement each checked step in order and verify the PDF visually before release.

**Goal:** Let paid users download their saved wallet report as a PDF and let the private admin see report ownership, download history, and last StayFlat login.

**Architecture:** A protected Next.js route loads the signed-in user's saved Convex report, creates the PDF on the server, records a successful download, then returns the file. Convex stores one audit row per download. The existing admin page joins Clerk account activity, saved reports, and download rows without exposing reports to other users.

**Tech Stack:** Next.js, Clerk, Convex, React, pdf-lib, Vitest, Poppler.

**Spec:** User request from 2 September 2026.

## Global Constraints

- Preserve existing report calculations and paid-access rules.
- A user may download only a report owned by their signed-in Clerk account.
- Only `vivanatwork@gmail.com` may read the admin dashboard.
- Record a download only after the PDF is generated successfully.
- Keep PDF generation on the server so it does not increase the report page's browser bundle.

---

### Task 1: PDF document builder

**Files:**
- Create: `src/lib/report-pdf.ts`
- Test: `src/lib/report-pdf.test.ts`

**Interfaces:**
- Consumes: `ReportMetrics` and a wallet address.
- Produces: `buildReportPdf(input): Promise<Uint8Array>`.

- [ ] Write tests for the PDF signature, wallet label, headline metrics, rhythm metrics, and empty-report rejection.
- [ ] Implement a paginated StayFlat PDF using embedded standard fonts and vector drawing.
- [ ] Run the focused tests and render a representative PDF to PNG.

### Task 2: Secure download and audit data

**Files:**
- Modify: `convex/schema.ts`
- Modify: `convex/payments.ts`
- Create: `src/app/api/report/pdf/route.ts`

**Interfaces:**
- Consumes: authenticated Clerk token and normalized wallet address.
- Produces: owned saved report query, PDF response, and `reportDownloads` audit row.

- [ ] Add `reportDownloads` indexed by owner and wallet.
- [ ] Add an owned report query and a write-secret-protected download recorder.
- [ ] Build a protected GET endpoint that rejects signed-out, unpaid, missing, empty, and unowned reports.
- [ ] Return a stable filename and record the download after PDF generation.

### Task 3: User download control

**Files:**
- Modify: `src/components/report/wallet-report.tsx`
- Modify: report CSS used by the component.

**Interfaces:**
- Consumes: the current saved report address.
- Produces: a 44px `Download PDF` link to the secure endpoint.

- [ ] Add the link beside existing report actions only when a filled report exists.
- [ ] Preserve current actions, theme, and phone layout.

### Task 4: Admin report and activity view

**Files:**
- Modify: `convex/admin.ts`
- Modify: `src/app/admin/page.tsx`
- Modify: `src/app/admin/admin.css`

**Interfaces:**
- Consumes: download rows, report rows, and Clerk `lastSignInAt`.
- Produces: report owner, report link, download count, last download time, downloader, and last StayFlat login.

- [ ] Return compact download history from the admin query.
- [ ] Join downloads to Clerk accounts and wallet reports.
- [ ] Add a report activity table and per-account history with empty states.

### Task 5: Verification and release

**Files:**
- Modify: generated Convex bindings.

- [ ] Run Convex code generation, tests, lint, and build.
- [ ] Generate a representative PDF, inspect its text, page count, and PNG renders for clipping or overlap.
- [ ] Deploy Convex first, then Vercel, point `stayflat.xyz` to the release, and verify signed-out protection.
