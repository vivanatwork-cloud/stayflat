# Portfolio Reports Specification

## Goal

Let a paid member select two or more saved wallet addresses and generate one accurate report across those wallets and all supported perp venues.

## Product rules

- Every saved address is selected by default; members may remove addresses.
- A portfolio report uses only existing wallet slots and never consumes a new slot.
- Trades are merged before metrics are calculated. Existing report summaries are never added together.
- A trade is deduplicated only by venue plus its venue-issued trade ID. Matching time, market, price, or size is not enough.
- Every fill carries its source wallet so positions on different wallets cannot be joined.
- The result keeps Combined, Hyperliquid, Arcus, and Lighter tabs.
- Lighter read-only tokens are requested only for selected wallets with Lighter activity and are never stored.
- A failed wallet is named; the report must not silently omit it.
- The generated portfolio snapshot is saved and can be reopened and downloaded as a PDF.

## Interface direction

Add a Portfolio report panel above wallet history. It uses the existing paper, ink, teal, and quiet-border system. Address selection is a compact checklist with shortened address labels. The primary action states the selected count. The result header says “Portfolio read” and lists the included wallet count; venue tabs remain the second level of navigation.

## Data model

Store one latest portfolio snapshot per owner: selected normalized addresses, multi-venue report, created and updated timestamps. Never store raw fills or Lighter tokens.

