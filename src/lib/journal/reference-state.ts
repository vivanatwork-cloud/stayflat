import { tradingViewChart } from "./tradingview";
import { parseJournalTarget, type JournalTarget } from "./target";
import type { JournalState } from "./types";

export type ReferenceTrade = {
  id: string; entryTime: number; exitTime: number | null; coin: string;
  dir: "Long" | "Short"; entryPx: string; exitPx: string; units: number | null;
  sizeUsd: string; sizeMode: "usd" | "units"; stopPx: string; tpPx: string;
  fees: string; strategy: string; emo: number | null; reason: string; note: string;
  source?: "hyperliquid" | "arcus"; sourceAddress?: string;
  emotionScale?: "composure-v1" | "tilt-v1";
  syncReview?: boolean;
  sourceLabel?: string;
  chartUrl?: string;
};
export type ReferenceRules = {
  currency: string; maxDailyLoss: number | null; maxRiskPct: number | null;
  maxTrades: number | null; cooldownMins: number | null;
  stop: "every" | "most" | "optional"; noTradeStart: number | null; noTradeEnd: number | null;
};
export type SyncWallet = { label?: string; address: string; from: number; connectedAt: number; lastSync: number | null };
export type ReferenceState = {
  tradingCapital: number | null; cryptoValue: number | null; netWorth: number | null;
  rules: ReferenceRules | null;
  sync: Partial<Record<"hyperliquid" | "arcus", SyncWallet[]>>;
  trades: ReferenceTrade[];
  target?: JournalTarget | null;
};

const object = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
const positive = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x) && x >= 0;
const nullable = (x: unknown) => x === null || positive(x);
const currencies = ["USD", "EUR", "GBP", "INR", "AUD", "CAD", "JPY", "SGD", "AED"];
const decimal = (x: unknown, signed = false) => typeof x === "string" && x.length <= 40 && (x === "" || (x.trim() !== "" && Number.isFinite(Number(x)) && (signed || Number(x) >= 0)));
const text = (x: unknown, max: number) => typeof x === "string" && x.length <= max;
export const walletAddress = (x: unknown): x is string => typeof x === "string" && /^0x[\da-f]{40}$/i.test(x);

/** Shared by the route and Convex: never trust a browser snapshot. */
export function parseReferenceState(input: unknown): ReferenceState {
  if (!object(input) || !nullable(input.tradingCapital) || !nullable(input.cryptoValue) || !nullable(input.netWorth)) throw new Error("Enter valid capital amounts.");
  if (!Array.isArray(input.trades) || input.trades.length > 10_000) throw new Error("A journal supports up to 10,000 trades.");
  const seen = new Set<string>();
  const trades = input.trades.map((value): ReferenceTrade => {
    if (!object(value) || typeof value.id !== "string" || !/^[\w:.\-]{1,200}$/.test(value.id) || seen.has(value.id)) throw new Error("Trade IDs must be unique.");
    seen.add(value.id);
    if (!text(value.coin, 50) || !/^[\w:./\-]+$/.test(value.coin as string)) throw new Error("Enter a valid market.");
    if (!positive(value.entryTime) || value.entryTime === 0 || !nullable(value.exitTime) || (typeof value.exitTime === "number" && value.exitTime < value.entryTime)) throw new Error("Enter valid trade dates.");
    if (value.dir !== "Long" && value.dir !== "Short") throw new Error("Enter a valid direction.");
    for (const key of ["entryPx", "exitPx", "sizeUsd", "stopPx", "tpPx", "fees"]) if (!decimal(value[key], key === "fees")) throw new Error("Enter valid prices and fees.");
    if (Number(value.entryPx) <= 0 || !nullable(value.units) || (value.sizeMode !== "usd" && value.sizeMode !== "units")) throw new Error("Enter a valid entry and size.");
    if (value.units === null ? !(Number(value.sizeUsd) > 0) : !(Number(value.units) > 0)) throw new Error("Enter a positive position size.");
    if (Boolean(value.exitPx) !== Boolean(value.exitTime)) throw new Error("Add both exit price and exit time, or leave both blank.");
    if (value.emo !== null && (!positive(value.emo) || !Number.isInteger(value.emo) || value.emo < 1 || value.emo > 10)) throw new Error("Emotion must be unrated or between 1 and 10.");
    for (const [key, max] of [["strategy",120],["reason",1000],["note",2000]] as const) if (!text(value[key], max)) throw new Error("Trade notes are too long.");
    if (value.source !== undefined && value.source !== "hyperliquid" && value.source !== "arcus") throw new Error("Unknown exchange.");
    if (value.source && !walletAddress(value.sourceAddress)) throw new Error("Synced trades need a source wallet.");
    if (value.emotionScale !== undefined && value.emotionScale !== "composure-v1" && value.emotionScale !== "tilt-v1") throw new Error("Unknown emotion scale.");
    if (value.syncReview !== undefined && typeof value.syncReview !== "boolean") throw new Error("Invalid sync review status.");
    if (value.sourceLabel !== undefined && !text(value.sourceLabel, 40)) throw new Error("Wallet names must be 40 characters or fewer.");
    const chart = typeof value.chartUrl === "string" && value.chartUrl.trim() ? tradingViewChart(value.chartUrl) : null;
    if (value.chartUrl !== undefined && (typeof value.chartUrl !== "string" || (value.chartUrl.trim() && !chart))) throw new Error("Add a valid HTTPS TradingView chart or snapshot link.");
    return {
      ...(chart ? { chartUrl: chart.url } : {}),
      ...(typeof value.sourceLabel === "string" && value.sourceLabel.trim() ? { sourceLabel: value.sourceLabel.trim() } : {}),
      ...(value.syncReview === true ? { syncReview: true } : {}),
      id: value.id, entryTime: value.entryTime, exitTime: value.exitTime as number | null, coin: value.coin as string,
      dir: value.dir, entryPx: value.entryPx as string, exitPx: value.exitPx as string, units: value.units as number | null,
      sizeUsd: value.sizeUsd as string, sizeMode: value.sizeMode, stopPx: value.stopPx as string, tpPx: value.tpPx as string,
      fees: value.fees as string, strategy: value.strategy as string, emo: value.emo as number | null,
      reason: value.reason as string, note: value.note as string,
      ...(value.source ? { source: value.source, sourceAddress: (value.sourceAddress as string).toLowerCase() } : {}),
      emotionScale: value.emotionScale === "composure-v1" ? "composure-v1" : "tilt-v1",
    };
  });
  const rules = input.rules;
  if (rules !== null) {
    if (!object(rules) || !currencies.includes(rules.currency as string) || !["every", "most", "optional"].includes(rules.stop as string)) throw new Error("Check your journal rules.");
    for (const key of ["maxDailyLoss", "maxRiskPct", "maxTrades", "cooldownMins", "noTradeStart", "noTradeEnd"]) if (!nullable(rules[key])) throw new Error("Rule limits must be zero or more.");
    for (const key of ["maxTrades", "cooldownMins", "noTradeStart", "noTradeEnd"]) if (rules[key] !== null && !Number.isInteger(rules[key])) throw new Error("Activity limits must be whole numbers.");
    for (const key of ["noTradeStart", "noTradeEnd"]) if (rules[key] !== null && Number(rules[key]) > 23) throw new Error("Choose a valid no-trade hour.");
  }
  if (!object(input.sync)) throw new Error("Invalid sync settings.");
  const sync: ReferenceState["sync"] = {};
  for (const venue of ["hyperliquid", "arcus"] as const) {
    const value = input.sync[venue];
    if (value === undefined) continue;
    const wallets = Array.isArray(value) ? value : [value];
    if (wallets.length > 5) throw new Error("Connect up to five wallets per exchange.");
    const addresses = new Set<string>();
    sync[venue] = wallets.map((cfg): SyncWallet => {
      if (!object(cfg) || !walletAddress(cfg.address) || !positive(cfg.from) || !positive(cfg.connectedAt) || !nullable(cfg.lastSync)) throw new Error("Check the connected wallet and dates.");
      if (cfg.label !== undefined && !text(cfg.label, 40)) throw new Error("Wallet names must be 40 characters or fewer.");
      const address = cfg.address.toLowerCase();
      if (addresses.has(address)) throw new Error("This wallet is already connected to this exchange.");
      addresses.add(address);
      return { ...(typeof cfg.label === "string" && cfg.label.trim() ? { label: cfg.label.trim() } : {}), address, from: cfg.from, connectedAt: cfg.connectedAt, lastSync: cfg.lastSync as number | null };
    });
  }
  return { tradingCapital: input.tradingCapital as number | null, cryptoValue: input.cryptoValue as number | null, netWorth: input.netWorth as number | null, rules: rules as ReferenceRules | null, sync, trades, ...(input.target !== undefined ? { target: parseJournalTarget(input.target) } : {}) };
}

export function migrateLegacyJournal(journal: JournalState): ReferenceState {
  return parseReferenceState({
    tradingCapital: journal.startingCapital, cryptoValue: null, netWorth: null, rules: null, sync: {},
    trades: journal.trades.map((t) => ({ ...t, units: t.sizeMode === "units" ? Number(t.units) : null, emotionScale: "composure-v1" })),
  });
}

export function referenceToLegacy(state: ReferenceState, updatedAt: number): JournalState {
  return { startingCapital: state.tradingCapital ?? 0, updatedAt, trades: state.trades.filter((t) => !t.syncReview).map((t) => ({
    ...t, units: t.units === null ? "" : String(t.units),
    // This adapter is only for existing extended analytics, whose scale is composure.
    emo: t.emo === null ? 0 : t.emotionScale === "composure-v1" ? t.emo : 11 - t.emo,
  })) };
}
