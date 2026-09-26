export type Currency = "INR" | "USD" | "USDC" | "USDT";
export type Ownership = "Personal" | "Business";
export const assetTypes = [
  "Cash",
  "Indian Stocks",
  "US Stocks",
  "Mutual Funds",
  "Crypto",
  "FDs",
  "EPF",
] as const;
export type AssetType = (typeof assetTypes)[number];
export interface Account {
  id: string;
  name: string;
  institution: string;
  type: AssetType;
  currency: Currency;
  balance: string;
  ownership: Ownership;
  updatedAt: string;
  archived: boolean;
}
export interface Holding {
  id: string;
  accountId: string;
  name: string;
  symbol: string;
  type: AssetType;
  currency: Currency;
  quantity: string;
  invested: string;
  value: string;
  updatedAt: string;
  sip?: string;
  nextSip?: string;
  maturity?: string;
  rate?: string;
}
export interface Transaction {
  id: string;
  accountId: string;
  date: string;
  direction: "Income" | "Expense" | "Transfer";
  amount: string;
  currency: Currency;
  merchant: string;
  category: string;
  ownership: Ownership;
  note: string;
  fingerprint?: string;
  sourceId?: string;
  tags?: string;
}
export interface Snapshot {
  id: string;
  date: string;
  total: string;
  fx: string;
  composition: Record<string, string>;
}
export interface RecurringEvent {
  id: string;
  title: string;
  date: string;
  amount: string;
  currency: Currency;
  type: string;
  frequency: "Once" | "Monthly" | "Yearly";
}
export interface Source {
  id: string;
  name: string;
  date: string;
  accountId: string;
  rows: number;
  raw: string;
}
export interface Card {
  id: string;
  name: string;
  limit: string;
  available: string;
  spend: string;
  due: string;
  dueDate: string;
  updatedAt: string;
}
export interface Data {
  holdingHistory?: {
    id: string;
    date: string;
    accountId: string;
    holdings: Holding[];
  }[];
  accounts: Account[];
  holdings: Holding[];
  transactions: Transaction[];
  snapshots: Snapshot[];
  events: RecurringEvent[];
  sources: Source[];
  cards: Card[];
  fx: string;
  fxDate: string;
  goal: string;
  goalSet?: boolean;
  growth: string;
  targets: Record<string, number>;
  staleDays: number;
}
export interface Audit {
  id: string;
  date: string;
  action: string;
  before: Data;
}
export interface Workspace {
  version: 1;
  data: Data;
  audit: Audit[];
}
