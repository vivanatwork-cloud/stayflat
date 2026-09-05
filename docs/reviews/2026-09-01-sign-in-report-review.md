# StayFlat Sign-in and Report Review

## Intent

- Sign-in human: a new or returning trader entering through the combined account button.
- Sign-in job: choose sign-in or account creation without wondering whether they are on the wrong page.
- Report human: a paid trader who wants one useful behavior pattern from a public record.
- Report job: move from wallet address to evidence, interpretation, and one next action.
- Feel: calm post-trade debrief, not a live trading terminal and not a therapy intake form.

## Design direction

- Domain: fills, realized losses, position size, cooldown, time clusters, drawdown, guardrails.
- Color world: paper journal `#ECE6D9`, inset sheet `#E6DFCF`, trading ink `#23201A`, muted annotation `#6B6459`, review teal `#1C4A44`, loss red `#8A2F2A`.
- Signature: every report finding follows `evidence → interpretation → guardrail`.
- Rejecting: generic auth card floating alone, dashboard card grids, red/green trading-terminal decoration.

## Findings

### P0 — Convex trusts caller-supplied user IDs

`convex/payments.ts` exposes report access, report history, and saved reports as public queries taking `ownerId`. `convex/onboarding.ts` exposes public read and write functions with the same pattern. Convex has no `auth.config.ts`, and the client uses `ConvexProvider` rather than `ConvexProviderWithClerk`. The UI is protected by Clerk, but Convex does not independently verify the caller.

Fix: configure Clerk as the Convex identity provider, pass Clerk tokens to Convex, remove `ownerId` arguments from user-owned functions, and derive the owner from `ctx.auth.getUserIdentity().subject`.

### P1 — The combined account doorway leads to returning-user copy

The header says “Sign in or create account,” but `/sign-in` says “Welcome back.” Account creation is delegated to a smaller Clerk footer link. New visitors can reasonably think they reached the wrong page.

Fix: use neutral shell copy such as “Continue to StayFlat” and “Sign in or create an account to keep your reports and journal together.” Keep Clerk's sign-up link visible and plainly worded.

### P1 — Authentication loses the intended destination

The proxy redirects `/report` to `/sign-in` without a return URL, and Clerk forces every completed sign-in to `/journal`. A person who asked for the report lands elsewhere.

Fix: preserve the original path in `redirect_url`, validate it as a same-origin relative path, and use Clerk's fallback redirect rather than a forced `/journal` redirect.

### P1 — A used-up report allowance still presents an active generator

When all address slots are used, the form remains active and failure arrives only after a request. The page knows the limit before submission.

Fix: disable generation for a new address when the limit is reached, explain the limit in plain words, and make “Add 3 report slots” the primary action.

### P1 — Report copy overstates causality

“What your trading says about your head” is clever but vague, while “patterns costing you the most” implies causation the report does not prove. The result cards correctly call their contents observations.

Fix: lead with “Find the behavior pattern worth reviewing first” and use “observations” consistently.

### P2 — Saved-report navigation and reset disagree

Past reports use plain anchors, causing full page reloads. “Check another address” clears React state but leaves `?address=` in the URL, so refresh restores the saved report.

Fix: use `next/link`; on reset, clear the query string with `router.replace('/report')` and focus the wallet input.

### P2 — Report loading and errors need firmer states

Loading replaces the whole form, so the user loses context. A non-JSON or empty server error can produce an empty message. There is no retry-focused error treatment.

Fix: keep the form visible and disabled, show progress below it, use a stable fallback message, and return focus to the error or result heading.

### P2 — The server request has a preventable waterfall

The report page waits for access and history, then reads `searchParams`, then queries a saved report. Read the address first and start independent Convex reads together with an authenticated token.

## Visual notes from source

The paper/teal type system is consistent and the report has a clear 720px reading measure. Mobile rules stack findings and stats sensibly. The report still relies heavily on bordered boxes; stronger grouping through spacing and one explicit “first pattern” focal block would make the hierarchy clearer. Browser screenshots were unavailable, so overlap, Clerk's final rendered card, and real mobile text wrapping remain unverified.
