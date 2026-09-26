# Paid Wealth release

Wealth uses StayFlat's existing Clerk sign-in and paid membership checks. The page recovers legacy paid accounts through the existing verified-email server flow, then redirects unpaid members to payment. Every Convex read and write independently requires payment and takes the owner from the authenticated identity. Writes also check the expected account and a revision number; stale device changes cannot overwrite a newer copy.

Financial data now lives in production Convex: `wealthSettings` contains reporting settings and revision; `wealthRecords` contains separately identified account, holding, transaction, snapshot, source, card, event and holding-history records. Records can be retrieved by authenticated owner and collection for future features. Large records are split into ordered Unicode-safe chunks. The server returns serialized data to preserve arbitrary asset-category keys. Browser storage is only read to offer migration; the legacy copy is removed only after the server confirms the save. Theme preference remains in browser storage.

Failed saves remain in memory for retry/export and trigger a leave-page warning. Example mode never saves example edits to the account. Undo is limited to ten changes in the current session. Current safety bounds are 3 MB and 6,000 record chunks per workspace (reporting settings limited to 200 KB); exceeding them rejects the whole save. No broker connections, live quotes or LLM access were added.

The interface uses StayFlat's mark, shared paper/teal colours, Hanken Grotesk, Newsreader, JetBrains Mono, account menu and theme preference. Separate WealthOS branding and browser-only copy have been removed from the main interface.

Validation:
- 159 tests pass, including paid/anonymous restrictions, owner isolation, second-session retrieval, stale revision rejection, atomic record deletion, large Unicode statement round trips and size validation.
- Production Next.js build passes; no temporary preview route is included.
- Headless Chrome verified all 14 sections, account saving/reloading, no financial localStorage writes, failed-save retry, migration failure preservation and successful migration removal. Desktop light/dark and 390 px mobile layouts inspected, no horizontal overflow or browser errors.
- Browser UI checks used a mocked account-storage endpoint; backend behavior was independently exercised with convex-test. A real paid-member browser login was not exercised.
- Existing unrelated working files were preserved; schema only gains the two Wealth tables.

Production Convex deployed to the existing StayFlat production deployment (youthful-mole-178). Frontend deployed as `dpl_5UqrtxrdUrEMqLmApWUvEY9w6vdm`; `stayflat.xyz` points to this release. Live backend rejects anonymous reads and reads from a synthetic unpaid identity; the same identity returns false from the payment check. Live domain checks: homepage 200, /wealth redirects to sign-in, /api/wealth returns 401 with no-store caching. No real member records were accessed in release checks.
