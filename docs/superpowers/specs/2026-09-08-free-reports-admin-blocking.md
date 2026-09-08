# Free Reports and Admin Blocking Specification

## Goal

Make wallet reports free with unlimited saved addresses for every signed-in user, while allowing an admin to block and unblock specific accounts that abuse report generation.

## Rules

- Report access requires sign-in but never payment.
- Wallet address slots are unlimited.
- Existing payments remain stored and still govern paid-only features such as the journal and call.
- Blocking is enforced by Convex mutations and both report-generation routes, not only the interface.
- Blocked users may open saved reports but cannot generate, refresh, or build portfolio reports.
- Every block records the administrator, time, and reason. Unblocking records the administrator and time without deleting history.
- The admin page shows current status and Block/Unblock controls for each user.

