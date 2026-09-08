# Exchange Selection Spec

Users choose one or more supported perpetual exchanges before entering a wallet. Hyperliquid is selected by default. Arcus and Lighter are optional, and the Lighter read-only token field is rendered and required only when Lighter is selected.

The server accepts only `hyperliquid`, `arcus`, and `lighter`, fetches only those venues, and rejects an empty or invalid selection. Requests from older clients default to Hyperliquid and Arcus, deliberately excluding Lighter so they cannot become blocked by a missing token.

Refreshing a saved report reuses that report's active venues. Portfolio reports reuse each saved wallet's venues and request Lighter tokens only for wallets whose saved report includes Lighter. “Other” links to the existing exchange-request page and is not sent as a venue.

The selector uses native checkboxes, the existing paper/ink/teal palette, quiet borders, 44-pixel hit areas, visible focus states, and the existing responsive form layout.
