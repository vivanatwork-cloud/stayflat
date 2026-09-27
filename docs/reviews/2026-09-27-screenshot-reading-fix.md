# Crypto screenshot reading fix

The original reader matched only 12 coin names and quantities immediately before the symbol. It discarded screenshot layout and never populated holding values. That was inadequate for ordinary wallet tables.

The revised reader enlarges small text, normalises dark backgrounds, uses two text-layout passes, and retains word positions. The parser associates asset rows with quantity and value columns, distinguishes market prices from holding values, recognises unfamiliar tickers, tolerates ticker letter-case errors, reads Indian/international digit grouping, and recognises labelled card fields. Missing tickers on subsequent numeric rows stay separate instead of lending their values to the previous coin. Cost is only extracted from an explicit cost field; unknown fields remain for review. A no-match message now explains when coin rows were not detected.

## Validation
- 35 test files / 187 tests passed.
- TypeScript, lint on the changed reader/UI files, and production build passed.
- Real Chrome read light and dark four-coin screenshots, including HYPE, ARB, BTC and an unfamiliar XYZ ticker, tiny quantities, and formatted holding values. The original implementation could not read these layouts.
- Browser regression: wallet creation, manual holding, CSV import, labelled screenshot cost/value, reviewed save, reload and mobile passed against a mocked Wealth API.
- Local fixture removed before publishing; unrelated pre-existing files unchanged.

## Limits
The user has not attached the failing screenshot to this conversation. Its exact layout remains untested. Text recognition is fallible, and review remains required before saving. Unlabelled/ambiguous prices or costs are not inferred. No external image service or new data storage was introduced.

## Release
Production `dpl_2mpp8NXAdKx8TCVKxVotoa7JteqP` is READY and assigned to stayflat.xyz. The private API still returns 401/no-store without a session; the public reader worker and language model are available.
