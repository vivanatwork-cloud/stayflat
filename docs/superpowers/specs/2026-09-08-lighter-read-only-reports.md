# Lighter read-only report specification

## Goal

Add Lighter to StayFlat reports. A trader pastes one Ethereum address and may add a Lighter read-only token to include complete Lighter history alongside Hyperliquid and Arcus.

## Product rules

- One wallet still consumes one paid slot, regardless of venue count.
- Hyperliquid and Arcus remain public address-only reads.
- Lighter public account data determines whether the address has a Lighter account.
- A read-only token unlocks complete Lighter fills and PnL. The token is optional when the address has no Lighter activity.
- Never store the token in Convex, logs, analytics, URLs, browser storage, saved reports, or PDFs.
- Send the token only in the report POST body over HTTPS, use it server-side, then discard it.
- Verify the token's account index belongs to the pasted L1 address before using its data.
- Include every active master account and sub-account covered by the token.
- If Lighter authentication fails, return a specific token error without hiding valid Hyperliquid or Arcus results.
- Show Combined when two or more venues are active.

## Data contract

- Account discovery: `GET /api/v1/accountsByL1Address?l1_address=<address>`.
- Trades: `GET /api/v1/trades`, authenticated with the read-only token, filtered to perp markets and the account index.
- PnL: `GET /api/v1/pnl`, authenticated with the same token.
- Market names come from `GET /api/v1/orderBookDetails`.
- Read-only token format: `ro:<account_index>:<single|all>:<expiry_unix>:<random_hex>`.
- Normalize Lighter timestamps to milliseconds, bid/ask ownership to buy/sell, position-before fields to open/close direction, account PnL fields to closed PnL, and maker/taker fees to recorded fee amounts.
- Paginate trades newest-to-oldest until exhausted or the server request budget is reached.

## Interface direction

Intent: an active perp trader should understand why Lighter needs one extra credential without feeling asked to hand StayFlat control of funds.

Domain: wallet identity, venue ledger, read-only access, fills, positions, reconciliation, expiry.

Color world: existing paper, ink, teal, Lighter amber, muted graphite, restrained warning red.

Signature: a compact Lighter access strip under the wallet field with a visible “Read-only” seal and a direct token-generation link.

Rejecting: permanent settings page -> request-scoped field; generic password field -> explicitly labeled read-only credential; three separate searches -> one wallet form.

## Acceptance checks

- Hyperliquid-only and Arcus-only reports still work without a Lighter token.
- A valid Lighter token adds a Lighter view and recomputes Combined from all active venues.
- Mismatched, expired, malformed, and rejected tokens produce clear errors.
- Token values never appear in response payloads, saved Convex data, URLs, or logs.
- Legacy two-venue saved reports remain readable.
- PDF venue summaries support any active combination of the three venues.
- Desktop and mobile token controls are accessible and visually consistent.

