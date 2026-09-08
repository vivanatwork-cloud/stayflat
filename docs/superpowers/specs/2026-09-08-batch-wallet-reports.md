# Batch Wallet Reports Spec

## Behavior

- Every submitted wallet is scanned on Hyperliquid and Arcus. Users do not choose between these public exchanges.
- Lighter is opt-in per wallet. Its read-only token field is hidden until that wallet's Lighter option is enabled, and the token is never stored.
- A run accepts 1–10 unique, valid EVM-style addresses.
- One wallet produces its individual multi-exchange report.
- Two to ten wallets produce one saved individual report per wallet and a combined report across all wallets and active exchanges.
- The combined result lets the user switch between “All wallets” and every individual wallet without starting another scan.
- A failed wallet never disappears silently. The whole batch fails with a clear address-specific message.
- Existing saved-report and saved-portfolio refresh paths continue to work.

## Security and access

- Existing Clerk sign-in, Convex identity checks, account blocking, and server write-secret checks remain in force.
- The server validates the 10-wallet maximum and does not trust client-side limits.
- The batch save is one Convex operation so individual and combined records cannot be partly saved.

## Interface and copy

- The address list is the focal control and shows an exact “N of 10 wallets” counter.
- Each row uses native inputs and buttons, 44-pixel minimum controls, the existing paper/ink/teal palette, quiet borders, and the existing 4-pixel spacing rhythm.
- The primary action reads “Read this wallet” for one address and “Build combined report” for multiple addresses.
- Helper text states that Hyperliquid and Arcus are always scanned and Lighter is optional.
