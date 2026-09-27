import type { Account, Data, Holding } from "./types";
import { parseCsv } from "./import";
import { decimal, minor } from "./engine";

export type CryptoDraft = {
  id: string;
  name: string;
  symbol: string;
  quantity: string;
  invested: string;
  value: string;
  currency: string;
};
export const cryptoCsvExample =
  "name,symbol,quantity,invested,value,currency\nBitcoin,BTC,0.01,700,850,USD\nEthereum,ETH,0.25,600,750,USD";
export function blankCrypto(currency = "USD"): CryptoDraft {
  return {
    id: crypto.randomUUID(),
    name: "",
    symbol: "",
    quantity: "",
    invested: "",
    value: "",
    currency,
  };
}
export function cryptoCsv(text: string, currency: string): CryptoDraft[] {
  const [header, ...records] = parseCsv(text.replace(/^\uFEFF/, ""));
  if (!header) throw new Error("This CSV is empty.");
  const keys = header.map((h) => h.toLowerCase().trim());
  for (const key of ["name", "symbol", "quantity", "invested", "value"]) {
    if (!keys.includes(key))
      throw new Error(
        `Missing ${key} column. Download the example CSV to see the format.`,
      );
    if (keys.filter((k) => k === key).length > 1)
      throw new Error(`The ${key} column appears more than once.`);
  }
  if (!records.length || records.length > 500)
    throw new Error("Upload between 1 and 500 holdings at a time.");
  return records.map((row) => {
    const get = (key: string) => (row[keys.indexOf(key)] ?? "").trim();
    return {
      ...blankCrypto(currency),
      name: get("name"),
      symbol: get("symbol").toUpperCase(),
      quantity: get("quantity"),
      invested: get("invested"),
      value: get("value"),
      currency: (get("currency") || currency).toUpperCase(),
    };
  });
}

export { screenshotDrafts } from "./crypto-screenshot";
export function verifiedCrypto(
  rows: CryptoDraft[],
  account: Account,
): Holding[] {
  if (account.type !== "Crypto" || account.archived)
    throw new Error("Choose an active crypto wallet or exchange.");
  if (!rows.length || rows.length > 500)
    throw new Error("Add between 1 and 500 holdings.");
  const symbols = new Set<string>();
  return rows.map((row, i) => {
    const fail = (message: string): never => {
      throw new Error(`Holding ${i + 1}: ${message}`);
    };
    const name = row.name.trim(),
      symbol = row.symbol.trim().toUpperCase();
    if (!name || !symbol) fail("enter a coin name and symbol.");
    if (symbols.has(symbol))
      fail(`combine the ${symbol} entries into one total.`);
    symbols.add(symbol);
    if (
      !/^\d+(?:\.\d+)?$/.test(row.quantity) ||
      !Number.isFinite(Number(row.quantity)) ||
      Number(row.quantity) <= 0
    )
      fail("enter a positive quantity.");
    for (const key of ["invested", "value"] as const) {
      if (!/^\d+(?:\.\d{1,2})?$/.test(row[key]))
        fail(
          `enter ${key === "invested" ? "the total purchase cost" : "the total current value"} with up to two decimal places. Use 0 only if it is really zero.`,
        );
    }
    if (!["INR", "USD", "USDC", "USDT"].includes(row.currency))
      fail("choose INR, USD, USDC or USDT as the value currency.");
    return {
      ...row,
      name,
      symbol,
      accountId: account.id,
      type: "Crypto",
      currency: row.currency as Holding["currency"],
      invested: decimal(minor(row.invested)),
      value: decimal(minor(row.value)),
      updatedAt: new Date().toISOString(),
    };
  });
}
export function saveCryptoImport(
  data: Data,
  accountId: string,
  drafts: CryptoDraft[],
  replace: boolean,
  source: { name: string; raw: string },
) {
  const account = data.accounts.find((a) => a.id === accountId);
  if (!account) throw new Error("Choose a crypto wallet or exchange.");
  const rows = verifiedCrypto(drafts, account);
  const old = data.holdings.filter((h) => h.accountId === accountId);
  if (
    !replace &&
    rows.some((row) =>
      old.some((h) => h.symbol.trim().toUpperCase() === row.symbol),
    )
  )
    throw new Error(
      "This wallet already has one of these coins. Edit its existing holding, or choose to replace the wallet’s holdings with a complete list.",
    );
  if (replace && old.length) {
    (data.holdingHistory ??= []).push({
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      accountId,
      holdings: structuredClone(old),
    });
  }
  data.holdings = [
    ...data.holdings.filter((h) => !replace || h.accountId !== accountId),
    ...rows,
  ];
  data.sources.push({
    id: crypto.randomUUID(),
    date: new Date().toISOString(),
    accountId,
    name: source.name,
    rows: rows.length,
    raw: source.raw,
  });
  account.updatedAt = new Date().toISOString();
}
