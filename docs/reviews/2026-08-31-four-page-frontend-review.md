# StayFlat Four-Page Frontend Review

## Product direction

StayFlat should feel like a calm intervention, not another trading terminal. Keep the paper texture, editorial typography, restrained teal, thin rules, and direct tone. The journal can remain more utilitarian, but it should still feel like the same product.

The four-page journey should be:

1. Understand the promise on the landing page.
2. Create an account.
3. Complete onboarding without losing progress.
4. Generate a wallet report or start a journal.
5. Book a call only when coaching is appropriate.

## Changes that apply everywhere

### Must change

- Replace the four full-page iframes with native Next.js and React pages. Preserve the current appearance while making navigation, metadata, Clerk, and Convex part of one application.
- Load Newsreader, Hanken Grotesk, and JetBrains Mono once through `next/font`; remove the Google Fonts links from the page documents.
- Create shared color, type, spacing, border, and motion tokens. The landing, onboarding, and report currently duplicate the same CSS; the journal uses a related but separate set.
- Give every route its own title, description, canonical URL, and social preview metadata.
- Use normal Next.js links for internal navigation and real routes for every call to action. Remove dead `#book` links.
- Add clear loading, empty, error, and success states. Keep the visitor's previous input when an operation fails.
- Meet keyboard and screen-reader basics: connected labels, visible focus, focus-contained dialogs, keyboard-operable rows, announced errors, and reduced-motion support.
- Remove all editor notes and placeholders from the visible product.

### Keep

- Warm paper palette and subtle texture.
- Newsreader-led editorial voice on marketing and intake pages.
- Teal as the only strong accent.
- Flat edges, thin borders, generous spacing, and minimal decoration.
- The flatline mark and restrained motion.

## Page 1: Landing

### What works

- The opening line is memorable and specific.
- The page has a clear point of view and does not look like a generic software template.
- The numbered explanation and sample read make an abstract service easier to understand.
- The suitability section correctly discourages signal-seekers.

### What should change

- Make every primary “Create account” action open `/sign-up`; do not mix signup actions with page scrolling.
- Replace the emoji-led “account dies” line with typography that fits the otherwise restrained design.
- Reduce repeated statements about self-sabotage. The first section establishes the problem; later sections should add evidence, method, trust, and outcome.
- Replace the placeholder portrait, biography note, price, and signup note before launch.
- Add proof: Vivan's real experience, an anonymized example, or a precise explanation of how the read is produced. Do not invent testimonials or results.
- Add a short privacy statement near signup and the report entry point.
- Add a footer with Privacy, Terms, risk disclosure, and contact links.

### Suggested copy changes

- Keep: “Master the trader, not the trade.”
- Keep the direct tone, but change “Your strategy isn't the problem. You are.” to “Your strategy may not be the part that keeps failing.” This challenges the visitor without turning shame into the product promise.
- Change “This is what StayFlat reads” to “This is what StayFlat helps you review.” The product should not imply psychological certainty from trade data.
- Use one primary label throughout: “Create your account.”

## Page 2: Onboarding

### What works

- One question per screen lowers mental load.
- The progress indicator and plain-language options are easy to scan.
- The questions collect useful context before presenting a report or coaching offer.

### What should change

- Save each answer to Convex under the signed-in Clerk user so refresh and device changes do not erase progress.
- Remove automatic advancement after a single choice. Let the user confirm with Continue so accidental taps are reversible.
- Explain why sensitive questions are asked before the screening section.
- Do not route a high-risk answer directly into “Let's get you on a call.” That can make coaching look like treatment. Show a clear support-first screen, state that StayFlat is not clinical or crisis care, provide suitable support resources by country, and do not show a paid coaching action on that screen.
- Ask for confirmation before final submission and allow answers to be edited from the summary.
- Replace the dead booking anchor with an actual booking route or disabled “Booking coming soon” state.
- Add a signed-in account control and a safe “Save and leave” action.

### Suggested copy changes

- Change “No judgement. Answer straight.” to “Answer honestly. Your response helps us decide whether coaching is the right kind of support.”
- Change the normal result heading from “You're a fit” to “Here is where we would start.” This avoids claiming suitability before a human review.
- Keep the final summary factual; avoid “Vivan walks in already knowing where to push.” Use “Vivan can review this before your call.”

## Page 3: Wallet report

### What works

- One wallet address is a low-friction input.
- Read-only language addresses the most likely wallet concern.
- The staged loading messages make a network request feel purposeful.
- The card is compact and shareable.

### What should change

- Fetch Hyperliquid data through a server route with a timeout, clear error categories, basic rate limiting, and monitored failures. Do not make the browser own the full request and calculation path.
- Correct the language from “trades” to “fills” where the code counts fills. A fill is one execution and multiple fills can belong to one trade.
- Explain each metric and its limits. “Revenge sizing” is an inference, not a verified state of mind.
- Display the timezone used for “danger hours.”
- State whether the address or report is saved. If saved, require consent and connect it to the user; if not, say it is processed without being stored.
- Preserve the entered wallet when retrying after network failure.
- Replace the dead booking anchor with a real route.
- Add a copy fallback when clipboard access is unavailable and show an announced success or failure message.
- Add a report skeleton and a cancel/retry path for slow requests.

### Suggested copy changes

- Change “shows you the patterns costing you the most” to “highlights patterns worth reviewing.” The current metrics do not prove cause.
- Change “Textbook revenge sizing” to “Your next fill after a realized loss was typically larger than your median fill.” Follow it with a separate, clearly labeled interpretation.
- Change “Reading the chain…” to “Reading public Hyperliquid activity…” for accuracy.

## Page 4: Journal

### What works

- The journal combines trade facts with emotion and decision context.
- Summary numbers, table, filters, and analytics form a useful core product.
- Light and dark themes are coherent.
- Empty states and inline trade warnings are already present.

### What should change

- Store trades in Convex under the signed-in Clerk user. Browser storage must not remain the source of truth.
- Split the large page into focused React parts: header, summary, trade table, analytics, trade form, and export.
- Remove `innerHTML` rendering of user and API data. Render values as React text to prevent injected markup.
- Connect every label to its field and add names, descriptions, and error relationships.
- Make table rows keyboard-operable or place an explicit Edit button in each row.
- Keep keyboard focus inside the trade dialog, focus the first field on open, return focus to the opening control on close, and warn before discarding changes.
- Confirm deletion and explain that it cannot be undone.
- On small screens, render trades as readable cards instead of requiring a wide horizontal table.
- Treat open trades separately from completed trades; do not mix unavailable figures into closed-trade analytics.
- Add server-backed loading, saving, saved, offline, and retry states.
- Remove the visible prototype/paywall note.
- Prevent spreadsheet formula execution in CSV exports by escaping cells beginning with `=`, `+`, `-`, or `@`.

## Build order

1. Shared design system and native application shell.
2. Landing page and real authentication navigation.
3. Onboarding with saved progress and support-first screening.
4. Wallet report with a server data boundary and honest metric language.
5. Journal with Convex persistence, accessible forms, and responsive views.
6. Cross-page accessibility, metadata, performance, and production testing.

## Definition of done

- No route uses a full-page iframe.
- The four pages match the present visual direction at desktop and mobile sizes.
- All visible calls to action reach a working destination.
- User data survives refresh and is isolated by Clerk user ID.
- No sensitive server key is sent to the browser.
- Keyboard-only use covers the entire onboarding, report, and journal flows.
- `npm run lint` and `npm run build` pass.
- Browser tests cover the main journey and important failure states.
- A Lighthouse check is recorded for performance, accessibility, best practices, and SEO.
