# Crypto entry and section wording

Crypto Add holding and the page Import action now offer manual, CSV and screenshot entry. New users create a wallet/exchange within the flow and continue their chosen method. Only crypto destinations appear. Manual coin quantities support fractional precision.

Screenshots use Tesseract.js 7 locally, loaded on demand with self-hosted worker/core/English assets. Known coin names and explicitly labelled quantities are suggested. Total purchase cost and current value are deliberately left for review rather than inferred from market prices. Unknown coins can be added manually. Originals stay on the device; reviewed holdings and extracted text use existing private cloud persistence. CSV uses a documented template with editable rows.

Imports append by default. Existing symbols are rejected to prevent double counting. Explicit replacement is limited to the selected wallet and preserves the old holdings in history. Confirmation resets when records, destination or save mode change. Failed cloud saves retain the existing workspace Retry path.

Shared wording distinguishes bank/cash accounts, brokers, fund providers, crypto wallets/exchanges, fixed deposits and provident funds. Cash balance inputs appear only for cash accounts; fund contribution/SIP fields appear only for mutual funds. Providers are remembered within compatible account types. FD maturity and contributions have relevant table headings.

## Verification
- Full Vitest suite: 34 files, 177 tests passed.
- TypeScript and production build passed; local test route removed before release.
- Real headless Chrome: manual fractional crypto, new wallet continuation, CSV, actual screenshot text recognition, explicit cost/value review, cloud-format records, reload, mobile layout.
- Error/edge browser checks: bank/broker destinations excluded, malformed CSV, required review, duplicate prevention, explicit replacement/history, destination reset, simulated cloud failure and successful Retry.
- Browser regression: FD name/bank/rate/maturity, no SIP, remembered bank dropdown including new provider after reload, mobile; stock/fund/provident-fund fields.
- Screenshots visually reviewed. Browser API saves used an in-memory mock; production signed-in member flow was not directly exercised.
- Existing unrelated file hashes unchanged. No auth or backend schema changes.

## Release
- Production deployment: `dpl_DptWBbL4BgUVpHHowyKNoQXAmeDU` (`stayflat-o4hj3eau1-stay-flat.vercel.app`).
- stayflat.xyz alias independently inspected: READY on this deployment.
- Anonymous Wealth page redirects to sign-in; Wealth API returns 401 with no-store.
- All five recognition assets served from `/ocr-assets/` have the same SHA-256 hashes as the local files.
- Real Chrome running against stayflat.xyz successfully read a generated Bitcoin screenshot using the deployed worker, core and English model.
- Public recognition assets use a path outside the protected `/wealth` route prefix; no authentication rules were relaxed.
- First unscoped publish returned Not authorized; explicitly choosing the already-authorized StayFlat team succeeded.
- Paid member browser interactions were tested locally with mocked API responses, not through a live signed-in member session.
