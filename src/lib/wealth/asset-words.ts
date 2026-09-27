import type { Data } from "./types";
const words = {
  Cash: {
    account: "Bank or cash account",
    provider: "Bank",
    asset: "Cash",
    quantity: "Quantity",
  },
  "Indian Stocks": {
    account: "Brokerage account",
    provider: "Broker",
    asset: "Stock name",
    quantity: "Number of shares",
  },
  "US Stocks": {
    account: "Brokerage account",
    provider: "Broker",
    asset: "Stock name",
    quantity: "Number of shares",
  },
  "Mutual Funds": {
    account: "Fund account",
    provider: "Fund platform or fund house",
    asset: "Fund name",
    quantity: "Fund units",
  },
  Crypto: {
    account: "Wallet or exchange",
    provider: "Wallet or exchange provider",
    asset: "Coin or token name",
    quantity: "Coin or token quantity",
  },
  FDs: {
    account: "Fixed deposit account",
    provider: "Bank",
    asset: "FD name",
    quantity: "Deposits",
  },
  EPF: {
    account: "Provident fund account",
    provider: "Provident fund provider",
    asset: "Fund name",
    quantity: "Quantity",
  },
};
export function assetWords(type: string) {
  return (
    words[type as keyof typeof words] ?? {
      account: "Investment account",
      provider: "Provider",
      asset: "Asset name",
      quantity: "Quantity",
    }
  );
}
export function assetProviders(data: Data, type: string) {
  const compatible =
    type === "Cash" || type === "FDs"
      ? ["Cash", "FDs"]
      : type.includes("Stocks")
        ? ["Indian Stocks", "US Stocks"]
        : [type];
  const names = new Map<string, string>();
  for (const a of data.accounts) {
    const name = a.institution.trim();
    if (compatible.includes(a.type) && name && !names.has(name.toLowerCase()))
      names.set(name.toLowerCase(), name);
  }
  return [...names.values()].sort((a, b) => a.localeCompare(b));
}
