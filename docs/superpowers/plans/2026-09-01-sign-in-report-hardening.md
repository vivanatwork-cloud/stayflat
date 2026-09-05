# Sign-in and Report Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the combined account entry clear, preserve return destinations, secure Convex user data with Clerk identity, and make report states easier to understand and recover from.

**Architecture:** Keep Clerk as the only account system and configure Convex to validate Clerk tokens. User-owned Convex functions derive ownership from authenticated identity instead of accepting an `ownerId`. Keep the report server-rendered for initial data, then use the existing client component for generation and local state.

**Tech Stack:** Next.js 16, React 19, Clerk 7, Convex 1.45, TypeScript, CSS

**Spec:** `docs/reviews/2026-09-01-sign-in-report-review.md`

## Global Constraints

- Do not install `@convex-dev/auth`; Clerk remains the single identity provider.
- Never accept a browser-supplied owner ID for user-owned Convex data.
- Redirect only to validated same-origin paths beginning with `/` and not `//`.
- Preserve the existing paper, ink, teal, and loss-red tokens.
- Keep `/report` protected and payment-gated.
- Verify sign-in with a real development account before production deployment.

---

### Task 1: Connect Clerk identity to Convex

**Files:**
- Create: `convex/auth.config.ts`
- Modify: `src/components/providers.tsx`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Consumes: Clerk `useAuth`, `CLERK_JWT_ISSUER_DOMAIN`, `NEXT_PUBLIC_CONVEX_URL`
- Produces: authenticated Convex requests and a server identity whose `subject` is the Clerk user ID

- [ ] **Step 1: Add the Convex auth configuration**

Create `convex/auth.config.ts`:

```ts
import type { AuthConfig } from "convex/server";

export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN!,
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
```

- [ ] **Step 2: Pass Clerk tokens to Convex**

Update the client provider to use `ConvexProviderWithClerk`:

```tsx
"use client";

import { useAuth } from "@clerk/nextjs";
import { ConvexProviderWithClerk, ConvexReactClient } from "convex/react-clerk";
import { useState } from "react";

export function DataProvider({ children }: { children: React.ReactNode }) {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  const [client] = useState(() => (url ? new ConvexReactClient(url) : null));
  if (!client) return children;
  return (
    <ConvexProviderWithClerk client={client} useAuth={useAuth}>
      {children}
    </ConvexProviderWithClerk>
  );
}
```

Place `DataProvider` inside `ClerkProvider` so `useAuth` always has Clerk context.

- [ ] **Step 3: Configure development and production issuers**

Set `CLERK_JWT_ISSUER_DOMAIN` on both Convex deployments to the matching Clerk Frontend API URL, then run `npx convex dev --once` for development and `npx convex deploy` for production.

- [ ] **Step 4: Verify identity round-trip**

Add a temporary development query returning `identity?.subject`, call it after sign-in, confirm it matches the Clerk user ID, then remove the query before commit.

### Task 2: Remove caller-supplied ownership from Convex functions

**Files:**
- Modify: `convex/payments.ts`
- Modify: `convex/onboarding.ts`
- Modify: `convex/journals.ts`
- Modify: `src/app/report/page.tsx`
- Modify: `src/app/payment/page.tsx`
- Modify: `src/app/wallet-history/page.tsx`
- Modify: `src/components/onboarding/onboarding-flow.tsx`
- Modify: `src/app/api/hyperliquid/report/route.ts`

**Interfaces:**
- Consumes: authenticated Convex identity
- Produces: `requireOwnerId(ctx): Promise<string>` and user-owned queries with no `ownerId` argument

- [ ] **Step 1: Add one ownership helper**

Create `convex/auth.ts`:

```ts
import type { QueryCtx, MutationCtx } from "./_generated/server";

export async function requireOwnerId(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  return identity.subject;
}
```

- [ ] **Step 2: Refactor user-owned Convex functions**

For `reportAccess`, `reportHistory`, `savedReport`, onboarding reads/writes, and journal reads/writes, remove `ownerId` from `args` and call `const ownerId = await requireOwnerId(ctx)`. Keep write-secret checks only for trusted payment-provider writes.

- [ ] **Step 3: Pass Clerk JWTs from server code**

Create `src/lib/convex-auth.ts`:

```ts
import { auth } from "@clerk/nextjs/server";

export async function getConvexToken() {
  const session = await auth();
  return (await session.getToken()) ?? undefined;
}
```

Use `fetchQuery`/`fetchMutation` from `convex/nextjs` with `{ token }` in server components and route handlers.

- [ ] **Step 4: Verify cross-user isolation**

Sign in as account A and create a saved report. Sign in as account B and confirm report history is empty and account A's address cannot be loaded by query parameter.

### Task 3: Preserve the requested destination through sign-in

**Files:**
- Modify: `src/proxy.ts`
- Modify: `src/components/auth-card.tsx`
- Modify: `src/components/auth-shell.tsx`

**Interfaces:**
- Consumes: protected request pathname and query string
- Produces: validated `redirect_url` and neutral account-entry copy

- [ ] **Step 1: Add the return path in middleware**

When redirecting an unauthenticated request, build `/sign-in?redirect_url=${encodeURIComponent(pathname + search)}`.

- [ ] **Step 2: Validate the return path**

Accept the redirect only when it starts with `/` and not `//`; otherwise use `/journal`.

- [ ] **Step 3: Stop forcing every sign-in to the journal**

Replace `forceRedirectUrl="/journal"` with the validated `fallbackRedirectUrl` and Clerk's supported return URL behavior.

- [ ] **Step 4: Use neutral shell copy**

Use eyebrow `Your StayFlat account`, heading `Continue to StayFlat.`, and body `Sign in or create an account to keep your reports and journal together.`

- [ ] **Step 5: Test both entry paths**

Open `/sign-in` directly and confirm completion lands on `/journal`. Open `/report`, sign in, and confirm completion returns to `/report`.

### Task 4: Clarify and harden report states

**Files:**
- Modify: `src/components/report/wallet-report.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `initialAccess`, report API JSON, current report query string
- Produces: clear available/limited/loading/error/result states

- [ ] **Step 1: Replace causal copy**

Use heading `Find the behavior pattern worth reviewing first.` and body `Paste a public Hyperliquid wallet address. StayFlat turns fills, timing, and realized outcomes into observations you can review.`

- [ ] **Step 2: Prevent known limit failures**

When `limitReached` is true and the entered address is not already in history, disable the generator and show a primary `Add 3 report slots` link to `/payment`.

- [ ] **Step 3: Keep context while loading**

Disable the input and submit button, change button text to `Reading public fills…`, and render the progress line below the form instead of replacing the full panel.

- [ ] **Step 4: Guarantee a useful error**

Use `data.error || "We couldn't generate this report. Check the address and try again."` and handle non-JSON responses with the same fallback.

- [ ] **Step 5: Make reset agree with the URL**

Use `useRouter().replace('/report')`, clear the address, and focus `#wallet-address` after choosing `Check another address`.

- [ ] **Step 6: Use client navigation for history**

Replace each saved-report `<a>` with Next.js `<Link>`.

### Task 5: Remove the report data waterfall

**Files:**
- Modify: `src/app/report/page.tsx`
- Modify: `convex/payments.ts`

**Interfaces:**
- Consumes: authenticated Convex token and optional address
- Produces: access, history, and saved report loaded from one consistent Convex query

- [ ] **Step 1: Resolve cheap request inputs first**

Await Clerk auth, Convex token, and `searchParams` before starting data reads.

- [ ] **Step 2: Add one page-data query**

Add `reportPageData({ address: v.optional(v.string()) })` in `convex/payments.ts`. Derive the owner from `requireOwnerId(ctx)`, read payments and wallets in one query, select the requested saved report from the wallet collection, and return `{ access, history, saved }`.

- [ ] **Step 3: Fetch one authenticated snapshot**

Call `fetchQuery(api.payments.reportPageData, { address }, { token })` once from the report page. This removes the waterfall and prevents access, history, and the saved report from reflecting different database snapshots.

- [ ] **Step 4: Verify behavior and performance**

Run `npm run lint && npm run build`, then compare the `/report?address=…` server response time before and after using the same saved address.

### Task 6: Visual and interaction verification

**Files:**
- Review: `src/components/auth-shell.tsx`
- Review: `src/components/auth-card.tsx`
- Review: `src/components/report/wallet-report.tsx`
- Review: `src/app/globals.css`

**Interfaces:**
- Consumes: completed Tasks 1–5
- Produces: verified desktop/mobile auth and report flows

- [ ] **Step 1: Verify sign-in at 390px and 1440px**

Confirm the brand, neutral heading, Clerk form, sign-up route, focus ring, and error copy are visible without overlap.

- [ ] **Step 2: Verify every report state at 390px and 1440px**

Check empty form, invalid address, loading, server error, limit reached, no fills, populated report, saved history, and the horizontally scrollable order table.

- [ ] **Step 3: Run final checks**

Run `npm run lint && npm run build`. Expected: both exit 0; `/report` remains dynamic and protected; unauthenticated `/report` returns a redirect containing its original destination.
