# Fixed deposit entry and remembered banks

Adding a holding from FDs / EPF now opens a dedicated fixed-deposit form: FD name, saved/new bank, deposit amount, currency, annual interest rate, maturity date and personal/business ownership. It has no SIP, next-SIP, ticker, quantity or live-price fields. Saving creates or reuses the matching FD account and writes the deposit atomically, without changing cash balances. An explicit Add EPF balance action preserves the provident-fund path. Other asset pages preselect the matching account type.

Banks/providers are remembered from the member's cloud-saved accounts, with case-insensitive deduplication. Both account and FD entry offer a dropdown and an add-new option. Editing an FD restores its bank and terms. Fixed deposit rows show the bank and hide inappropriate legacy SIP details; fixed deposits are excluded from generated SIP calendar entries.

Validation: 170 tests pass, including retained deposit terms, principal totals, account reuse, currency/ownership separation and invalid inputs. Chrome checks covered first FD from an empty workspace, reload and edit, second FD using the saved bank without duplicate FD accounts, a cash account reusing the same bank, a new bank saved and offered after reload, absence of SIP/quantity/ticker fields, and mobile overflow. UI checks used a mocked storage endpoint; existing backend format is unchanged. Temporary preview route removed before release.

Production build passed. Deployed as `dpl_87H1p38sRmCzcFK7PuFgExQu5pgX`; verified stayflat.xyz points to this READY release and signed-out Wealth remains protected.
