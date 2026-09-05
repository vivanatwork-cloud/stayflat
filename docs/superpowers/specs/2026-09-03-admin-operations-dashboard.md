# Admin Operations Dashboard Specification

## Goal

Turn the private admin page into a reliable daily operations screen for finding customers, checking payment access, and spotting members who need help.

## Current state

- The page shows headline totals, the newest 100 Clerk accounts, payment records, reports, journals, onboarding, downloads, and exchange requests.
- Search covers email, Clerk user ID, and wallet address.
- An unpaid account can be granted access manually.
- The account list cannot be filtered or sorted.
- Clerk supplies account creation and last-sign-in dates. Convex supplies payment and product-activity dates.
- Because only the newest 100 Clerk accounts are loaded, filters and account totals can become incomplete as the customer base grows.

## Approved direction to plan

### Phase 1: Customer operations

- Filter by access: All, Paid, Unpaid.
- Filter by joined date using From and To dates.
- Filter by payment date using From and To dates.
- Add useful filters: onboarding state, report state, journal state, and payment source.
- Sort by newest joined, oldest joined, newest payment, last active, and email.
- Preserve every filter in the URL so a filtered view can be bookmarked or shared with a future administrator.
- Load every matching Clerk account through server-side pagination rather than silently limiting results to 100.
- Paginate the visible results to keep the page fast.
- Show the active filters, result count, and a one-click Clear filters action.

### Phase 1 signature: Needs attention

Add saved views that answer operational questions instead of showing raw data only:

- Paid, no report: paid customers with no wallet report.
- Paid, never returned: paid customers whose last sign-in was before payment, or who have no later sign-in.
- Started onboarding, not finished.
- Payment mismatch: payment records whose owner is missing from Clerk or whose payment email differs from the current account email.

The rules must be explained beside each view so the counts are trustworthy.

### Phase 2: Growth and support

- Funnel: signed up → finished onboarding → paid → created report → downloaded report → used journal.
- Time-window selector: 7, 30, and 90 days.
- Conversion rates between funnel steps.
- Customer detail drawer or page with a chronological activity timeline.
- Internal customer notes, with author and timestamp.
- CSV export of the currently filtered customer list.
- Copy buttons for email, wallet, user ID, and payment reference.

### Phase 3: Payment reliability

- Reconciliation view comparing BoomFi payments with StayFlat access records.
- Highlight paid transactions with missing access, duplicate payment records, and manual grants.
- Safe retry for a verified payment that did not grant access.
- Audit log for every admin action, including who acted, what changed, and when.
- Access removal is excluded until an explicit policy and confirmation flow are approved.

## Interface direction

- The administrator is the founder checking the product between customer messages; the screen should feel like a compact operations ledger, not a generic analytics dashboard.
- Keep the current paper, ink, and teal visual language.
- Make the customer table the focal point. Totals support it rather than dominate it.
- Put search, saved views, filters, sorting, and export into one compact control bar.
- Use clear text statuses, not color alone.
- Use native date fields and accessible buttons; all controls need keyboard focus, loading, empty, and error states.

## Safety and privacy

- Keep the route restricted to the existing administrator identity in both Next.js and Convex.
- Do not expose onboarding answers, payment references, or customer notes in URLs or exports unless explicitly selected.
- Record manual access grants, payment retries, and future edits in an audit log.
- CSV export uses the current filtered result and must not include sensitive onboarding answers.

## Acceptance criteria

- Filters return correct results across the full customer list, not only the latest 100.
- Joined dates use the Clerk account creation time.
- Payment dates use the successful payment time; unpaid users are excluded when a payment-date filter is active.
- Filters combine predictably and survive refresh.
- Needs-attention counts link to the exact matching customers.
- Existing search, manual access grant, report PDF links, and account details continue working.
- Desktop and phone layouts remain usable.
- No production customer or payment data is changed while testing filters.
