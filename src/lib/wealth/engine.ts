import {
  assetTypes,
  type Currency,
  type Data,
  type Ownership,
  type Snapshot,
  type Transaction,
} from "./types";
export function minor(value: string): bigint {
  if (!/^-?\d+(\.\d{1,2})?$/.test(value))
    throw new Error("Enter an amount with up to two decimal places.");
  const negative = value.startsWith("-");
  const [whole, part = ""] = value.replace("-", "").split(".");
  return (
    (BigInt(whole) * 100n + BigInt(part.padEnd(2, "0"))) * (negative ? -1n : 1n)
  );
}
export function decimal(value: bigint): string {
  const sign = value < 0n ? "-" : "";
  const n = value < 0n ? -value : value;
  return `${sign}${n / 100n}.${String(n % 100n).padStart(2, "0")}`;
}
export function inr(value: string, currency: Currency, fx: string): bigint {
  const n = minor(value);
  return currency === "INR"
    ? n
    : (n * minor(fx) + (n >= 0n ? 50n : -50n)) / 100n;
}
export function allocation(
  data: Data,
  owner: "All" | Ownership = "All",
): Record<string, bigint> {
  const amounts = Object.fromEntries(assetTypes.map((t) => [t, 0n]));
  const accounts = data.accounts.filter(
    (a) => !a.archived && (owner === "All" || a.ownership === owner),
  );
  const ids = new Set(accounts.map((a) => a.id));
  for (const a of accounts)
    if (a.type === "Cash") amounts.Cash += inr(a.balance, a.currency, data.fx);
  for (const h of data.holdings)
    if (ids.has(h.accountId))
      amounts[h.type] += inr(
        h.type === "FDs" ? h.invested : h.value,
        h.currency,
        data.fx,
      );
  return amounts;
}
export function total(data: Data, owner: "All" | Ownership = "All"): bigint {
  return Object.values(allocation(data, owner)).reduce((a, b) => a + b, 0n);
}
export function snapshot(
  data: Data,
  date = new Date().toISOString(),
): Snapshot {
  return {
    id: crypto.randomUUID(),
    date,
    total: decimal(total(data)),
    fx: data.fx,
    composition: Object.fromEntries(
      Object.entries(allocation(data)).map(([k, v]) => [k, decimal(v)]),
    ),
  };
}
export function flow(data: Data, rows: Transaction[] = data.transactions) {
  let income = 0n,
    expenses = 0n;
  for (const t of rows) {
    const n = inr(t.amount, t.currency, data.fx);
    if (t.direction === "Income") income += n;
    if (t.direction === "Expense") expenses += n;
  }
  return { income, expenses, net: income - expenses };
}
export function pnl(data: Data) {
  return data.holdings
    .filter((h) => !["FDs", "EPF"].includes(h.type))
    .reduce(
      (n, h) =>
        n +
        inr(h.value, h.currency, data.fx) -
        inr(h.invested, h.currency, data.fx),
      0n,
    );
}
export function projection(current: bigint, goal: string, growth: string) {
  const value = Number(current) / 100,
    target = Number(goal),
    rate = Number(growth) / 100;
  if (!Number.isFinite(target) || target <= 0) return null;
  if (value >= target) return 0;
  if (value <= 0 || rate <= 0) return null;
  return Math.log(target / value) / Math.log(1 + rate);
}
export function formatMoney(
  value: bigint | string,
  currency = "INR",
  hidden = false,
  compact = false,
) {
  if (hidden) return "••••••";
  const n = typeof value === "bigint" ? Number(value) / 100 : Number(value);
  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency: currency === "USDC" || currency === "USDT" ? "USD" : currency,
    maximumFractionDigits: compact ? 1 : 0,
    notation: compact ? "compact" : "standard",
  }).format(n);
}
export function transactionKey(
  t: Pick<
    Transaction,
    "accountId" | "date" | "amount" | "merchant" | "direction"
  >,
) {
  return [
    t.accountId,
    t.date,
    t.amount,
    t.merchant.trim().toLowerCase(),
    t.direction,
  ].join("|");
}
export function emptyData(): Data {
  return {
    accounts: [],
    holdings: [],
    transactions: [],
    snapshots: [],
    events: [],
    sources: [],
    cards: [],
    fx: "85.00",
    fxDate: "",
    goal: "0.00",
    goalSet: false,
    growth: "10",
    targets: {
      Cash: 15,
      "Indian Stocks": 25,
      "US Stocks": 20,
      "Mutual Funds": 20,
      Crypto: 10,
      FDs: 5,
      EPF: 5,
    },
    staleDays: 30,
  };
}
export const categoryColors: Record<string, string> = {
  Cash: "#a7d9c4",
  "Indian Stocks": "#91acdf",
  "US Stocks": "#b8a5d6",
  "Mutual Funds": "#ddc18c",
  Crypto: "#d69483",
  FDs: "#8bbcc7",
  EPF: "#939fa9",
};
