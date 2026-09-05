# Arcus multi-venue report specification

## Goal

One pasted Ethereum address produces a StayFlat report covering Hyperliquid and Arcus. If the address traded on both venues, the result contains three views: Combined, Hyperliquid, and Arcus.

## Product rules

- One unique wallet address consumes one paid wallet slot, regardless of how many supported venues contain activity.
- Query Hyperliquid and Arcus in parallel.
- A failure from one venue must not hide a successful result from the other venue.
- Combined metrics are computed from normalized fills from both venues, not by adding percentages or averages.
- Show only venues with active perp access and fills. Show Combined only when both venues are active; otherwise open the single active venue directly.
- If neither venue has activity, explain that no perpetual fills were found on either venue.
- Existing saved Hyperliquid reports remain readable and are upgraded on their next refresh.
- Clerk remains the user sign-in system. Convex continues to authorize reads with the Clerk-issued Convex token. No new authentication provider is added.

## Arcus data contract

- Mainnet base URL: `https://api.arcus.xyz`.
- Fills: `GET /v1/fills?address=<address>&limit=1000`, newest first, with optional microsecond `to` pagination.
- Portfolio: `GET /v1/portfolio?address=<address>`; use the final `perpAll` PnL point when present.
- No Arcus API key is required for these documented public reads.
- Normalize `createdAt / 1000` to milliseconds, `marketDisplayName` to the market name, `BUY/SELL` to `B/S`, `positionEffect` to an open/close direction, `role` to maker/taker, and decimal strings to numbers.
- Deduplicate Arcus fills by `tradeId`.

## Report shape

```ts
type Venue = "hyperliquid" | "arcus";
type VenueReport = {
  venue: Venue;
  status: "ready" | "empty" | "unavailable";
  metrics: ReportMetrics;
  error?: string;
};
type MultiVenueReport = {
  address: string;
  combined: ReportMetrics;
  venues: { hyperliquid: VenueReport; arcus: VenueReport };
  access: { used: number; limit: number };
};
```

Saved reports store `combinedMetrics`, `hyperliquidMetrics`, and `arcusMetrics` plus venue availability. The legacy `metrics` field stays optional during migration.

## Interface direction

Intent: an active perp trader pastes one address and needs to see where their behavior changes across venues. The interface should feel forensic and calm, like reconciling two exchange ledgers.

Domain: fills, positions, venues, reconciliation, realized P/L, trading rhythm, wallet identity.

Color world: existing StayFlat paper and ink, Hyperliquid cyan, Arcus green, muted graphite, restrained profit/loss colors.

Signature: a three-position venue rail—Combined / Hyperliquid / Arcus—with a thin two-source track that visually joins into Combined.

Rejecting: three duplicate dashboards → one reusable report body; colored card grids → color only identifies source; separate wallet searches → one address and one slot.

Layout:

```text
[ wallet address ................................ ] [Read my trading]
                     ┌──────── joined source rail ────────┐
                     [ Combined ] [ Hyperliquid ] [ Arcus ]
                     └─────────────────────────────────────┘
[primary finding]
[performance record]
[calendar] [rhythm] [entry method]
```

Copy:

- Heading: “One wallet. Every supported perp venue.”
- Supporting text: “Paste one address to read its Hyperliquid and Arcus history together. If it trades on both, you’ll also get a combined view.”
- CTA: “Read my trading”
- Fine print: “One wallet uses one slot. StayFlat reads public Hyperliquid and Arcus data and can’t touch your funds.”

## Performance and security

- Start independent venue requests together with `Promise.allSettled`.
- Apply one request-level 45-second timeout and shorter per-provider timeouts.
- Keep all third-party calls server-side.
- Authenticate before any paid report read or write.
- Validate the address before calling either provider.
- Pass only the finished report payload into the interactive client component.

## Acceptance checks

- Hyperliquid-only, Arcus-only, both-active, both-empty, and one-provider-down cases are tested.
- Combined calculations use all normalized fills once and preserve chronological order.
- Refreshing a saved address does not consume a new slot.
- Desktop and mobile show an accessible venue selector with loading, empty, unavailable, and ready states.
- Existing legacy saved reports render without a Convex validation failure.
