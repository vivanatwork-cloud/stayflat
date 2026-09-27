# Screenshot reading fix

**Goal:** Read wallet and exchange screenshots beyond a short coin list and one inline quantity format.
**Approach:** Preserve recognised word positions, group table columns and coin rows, support unknown tickers and labelled quantities/values, enlarge small images and invert dark backgrounds before reading. Keep review mandatory; never infer purchase cost from market price.
**Verification:** Parser cases for tables, cards, commas, tiny quantities, unknown tokens, value-versus-price separation, and ambiguous values. Real Chrome reading of light/dark multi-row screenshots. Production build and deployed reader check. User's exact image remains needed to reproduce their layout.

- [x] Add failing representative layout tests.
- [x] Replace the fixed-list parser with row/column and labelled-field extraction.
- [x] Improve screenshot preparation and preserve word positions.
- [x] Update review wording and handle no recognised holdings explicitly.
- [x] Verify and release without changing unrelated files.
