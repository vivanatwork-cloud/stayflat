# BoomFi Payment Webhook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Grant StayFlat access from verified BoomFi success events even when the customer never returns to the browser success page, and identify successful BoomFi customers who are still unpaid in StayFlat.

**Architecture:** A public Next.js route receives the raw BoomFi webhook body, verifies BoomFi's RSA signature and timestamp, validates the organization, product, live-mode flag, event, and status, then resolves the Clerk account from the stable customer reference or verified email. The existing Convex payment mutation remains the idempotent write boundary, keyed by BoomFi payment ID. The browser success page remains a backup path.

**Tech Stack:** Next.js 16 Route Handlers, Node crypto, Clerk Backend API, Convex, Vitest, BoomFi Merchant API

**Spec:** `docs/superpowers/plans/2026-09-03-boomfi-payment-webhook.md`

## Global Constraints

- Never trust an unsigned webhook or a stale timestamp.
- Reject the wrong BoomFi organization, wrong plan, test-mode payment, non-payment event, or non-succeeded status.
- Preserve the raw request body for signature verification.
- A repeated webhook for the same BoomFi payment ID must not grant duplicate report slots.
- Match a stable Clerk user ID first; use an exact normalized Clerk email only as a fallback.
- Keep customer redirects as a backup, not the payment source of truth.

---

### Task 1: Pure BoomFi webhook verification

**Files:**
- Create: `src/lib/boomfi-webhook.ts`
- Test: `src/lib/boomfi-webhook.test.ts`

**Interfaces:**
- Consumes: raw request text, `X-BoomFi-Timestamp`, `X-BoomFi-Signature`, BoomFi public key, expected organization ID, expected plan ID.
- Produces: `verifyBoomFiWebhook(input): VerifiedBoomFiPayment` or a typed verification error.

- [ ] Write tests for a valid RSA signature, altered body, stale timestamp, wrong organization, wrong plan, test mode, wrong event, and non-succeeded status.
- [ ] Run `npm test -- src/lib/boomfi-webhook.test.ts` and confirm the tests fail before implementation.
- [ ] Implement signature and payload verification with Node's `crypto.verify` and a five-minute timestamp window.
- [ ] Run `npm test -- src/lib/boomfi-webhook.test.ts` and confirm the tests pass.

### Task 2: Idempotent webhook route

**Files:**
- Create: `src/app/api/boomfi/webhook/route.ts`
- Create: `src/app/api/boomfi/webhook/route.test.ts`
- Modify: `convex/payments.ts`
- Modify: `.env.example`

**Interfaces:**
- Consumes: `verifyBoomFiWebhook`, Clerk user lookup, `payments.recordVerified`, `BOOMFI_WEBHOOK_PUBLIC_KEY`, `BOOMFI_ORG_ID`, `BOOMFI_PLAN_ID`, `PAYMENT_WRITE_SECRET`, and `NEXT_PUBLIC_CONVEX_URL`.
- Produces: public `POST /api/boomfi/webhook`; `200` for processed or already-processed success events, `400` for invalid payloads, `401` for invalid signatures, and `503` for missing server configuration.

- [ ] Write route tests with mocked verification, Clerk, and Convex boundaries.
- [ ] Run `npm test -- src/app/api/boomfi/webhook/route.test.ts` and confirm the tests fail before implementation.
- [ ] Add a payment-recording helper that accepts a verified BoomFi payment and resolves the account by stable Clerk reference or exact email.
- [ ] Keep `payments.recordVerified` idempotent by its existing `by_provider_payment` lookup and allow an already-linked payment to return success.
- [ ] Document the three new production environment variables in `.env.example`.
- [ ] Run the route tests and the full test suite.

### Task 3: Stable checkout identity and resilient success page

**Files:**
- Modify: `src/app/api/boomfi/checkout/route.ts`
- Modify: `src/app/payment/success/page.tsx`
- Test: relevant BoomFi route tests

**Interfaces:**
- Consumes: authenticated Clerk user ID and email.
- Produces: BoomFi checkout URL containing `customer_ident=<Clerk user ID>`; browser fallback recording with clear server logs on failure.

- [ ] Add a failing checkout test asserting `customer_ident` is the Clerk user ID.
- [ ] Set `customer_ident` in the BoomFi checkout URL.
- [ ] Replace the swallowed success-page exception with a safe server error log that contains the payment ID but no secrets.
- [ ] Run the targeted tests and full test suite.

### Task 4: Production customer reconciliation and setup

**Files:**
- No repository files.

**Interfaces:**
- Consumes: BoomFi successful payment list and StayFlat production payment/account records.
- Produces: a list of successful customers missing access; configured BoomFi webhook URL and signing values.

- [ ] Read all live `Succeeded` BoomFi payments for the StayFlat plan.
- [ ] Compare normalized customer emails and payment IDs with production Convex payments and Clerk accounts.
- [ ] Report every mismatch; do not grant access without confirming the receipt and account match.
- [ ] Add `BOOMFI_WEBHOOK_PUBLIC_KEY`, `BOOMFI_ORG_ID`, and `BOOMFI_PLAN_ID` to Vercel production.
- [ ] Configure BoomFi's webhook URL as `https://stayflat.xyz/api/boomfi/webhook`.
- [ ] Send a BoomFi test webhook and confirm a `2xx` response without creating paid access.
- [ ] Deploy the verified code, send a signed live-mode fixture in a controlled environment, and confirm retry-safe behavior.
