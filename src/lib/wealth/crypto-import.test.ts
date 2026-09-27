import { expect, it } from "vitest";
import { emptyData } from "./engine";
import type { Account } from "./types";
import {
  cryptoCsv,
  cryptoCsvExample,
  screenshotDrafts,
  verifiedCrypto,
  saveCryptoImport,
} from "./crypto-import";
import { encodeWealth, decodeWealth } from "./persistence";
import { assetProviders, assetWords } from "./asset-words";
const wallet: Account = {
  id: "wallet",
  name: "My wallet",
  institution: "Ledger",
  type: "Crypto",
  currency: "USD",
  balance: "0",
  ownership: "Personal",
  archived: false,
  updatedAt: "2026-09-27",
};
it("keeps fractional quantities and stores checked crypto in the cloud format", () => {
  const d = emptyData();
  d.accounts.push(wallet);
  const rows = cryptoCsv(cryptoCsvExample, "INR");
  saveCryptoImport(d, wallet.id, rows, false, {
    name: "coins.csv",
    raw: cryptoCsvExample,
  });
  const stored = encodeWealth(d),
    restored = decodeWealth(stored.settings, stored.records);
  expect(restored.holdings[0]).toMatchObject({
    type: "Crypto",
    accountId: "wallet",
    quantity: "0.01",
    invested: "700.00",
    currency: "USD",
  });
  expect(restored.sources[0].raw).toBe(cryptoCsvExample);
});
it("rejects cash, brokerage and archived destinations", () => {
  const rows = cryptoCsv(cryptoCsvExample, "USD");
  for (const account of [
    { ...wallet, type: "Cash" as const },
    { ...wallet, type: "US Stocks" as const },
    { ...wallet, archived: true },
  ])
    expect(() => verifiedCrypto(rows, account)).toThrow("active crypto");
});
it("requires real costs, values, positive quantities and supported currencies", () => {
  const rows = cryptoCsv(cryptoCsvExample, "USD");
  for (const patch of [
    { invested: "" },
    { value: "" },
    { quantity: "0" },
    { quantity: "-1" },
    { value: "1e4" },
    { currency: "BTC" },
    { invested: "-2" },
    { symbol: "" },
  ])
    expect(() => verifiedCrypto([{ ...rows[0], ...patch }], wallet)).toThrow();
  expect(() =>
    verifiedCrypto([rows[0], { ...rows[0], symbol: "btc" }], wallet),
  ).toThrow("combine");
});
it("never guesses financial amounts from a screenshot", () => {
  const rows = screenshotDrafts(
    "Bitcoin BTC\n0.00425 BTC\n$500.00\nMarket price $120,000\nEthereum\n2.5 ETH",
    "USD",
  );
  expect(rows.map((r) => r.symbol)).toEqual(["BTC", "ETH"]);
  expect(rows[0]).toMatchObject({
    quantity: "0.00425",
    invested: "",
    value: "",
  });
  expect(screenshotDrafts("Wallet balance $500", "USD")).toEqual([]);
});
it("blocks accidental duplicates and replaces only the selected wallet with history", () => {
  const d = emptyData();
  d.accounts.push(wallet, { ...wallet, id: "other" });
  const rows = cryptoCsv(cryptoCsvExample, "USD");
  saveCryptoImport(d, "wallet", rows, false, { name: "a", raw: "" });
  saveCryptoImport(d, "other", rows, false, { name: "b", raw: "" });
  const other = structuredClone(
    d.holdings.filter((h) => h.accountId === "other"),
  );
  expect(() =>
    saveCryptoImport(d, "wallet", rows, false, { name: "c", raw: "" }),
  ).toThrow("already has");
  saveCryptoImport(d, "wallet", [rows[0]], true, { name: "d", raw: "" });
  expect(d.holdings.filter((h) => h.accountId === "other")).toEqual(other);
  expect(d.holdings.filter((h) => h.accountId === "wallet")).toHaveLength(1);
  expect(d.holdingHistory?.[0].holdings).toHaveLength(2);
});
it("keeps remembered banks out of wallet and brokerage provider lists", () => {
  const d = emptyData();
  d.accounts.push(wallet, {
    ...wallet,
    id: "bank",
    type: "Cash",
    institution: "Axis",
  });
  expect(assetProviders(d, "Crypto")).toEqual(["Ledger"]);
  expect(assetProviders(d, "FDs")).toEqual(["Axis"]);
  expect(assetWords("Crypto").account).toBe("Wallet or exchange");
});
it("rejects malformed and missing-column CSVs", () => {
  for (const text of [
    "",
    "name,symbol\nBitcoin,BTC",
    'name,symbol,quantity,invested,value\n"unclosed',
  ])
    expect(() => cryptoCsv(text, "USD")).toThrow();
});
