# Personal wealth goals and profile emojis

New real workspaces start without a target. The overview invites the member to set a goal; the goal form starts blank and saves the chosen amount plus an explicit goalSet flag to their existing private account storage. Goal progress and projections appear only after a goal is chosen. Zero or unset goals cannot report “Goal reached.”

Legacy targets that differ from the former automatic 100,000,000 INR remain visible. The inherited default without an explicit choice flag is shown as unset; an old deliberate choice of that exact amount cannot be distinguished from the old default and must be confirmed again. Newly choosing that same amount is preserved. Demo workspaces retain an explicitly marked illustrative target.

Profile menu markers: 🪪 Manage account, 🌱 Wealth, 📓 Trading journal, 🔎 Wallet analytics, 🗓️ Schedule a call, 👋 Sign out. Clerk's built-in account-management and sign-out actions are retained, with appearance overrides for their icons. Paid-route checks are unchanged.

Validation: 162 tests pass and production build passes. Headless Chrome checked blank initial target, custom goal saving/reloading, deliberately choosing the former default, legacy default handling, and 390 px mobile overflow; no browser errors. These UI checks use a mocked storage endpoint; cloud persistence and isolation are covered separately by backend tests. The signed-in Clerk popup was not visually exercised.

Published to production Convex and Vercel deployment `dpl_9YjsqH2xRso6bupBsZGTPcVKMgTS`. Verified stayflat.xyz points to this release; Wealth still redirects signed-out visitors to sign-in.
