import type { JournalState, JournalTrade, TradeSizeMode } from "./types";

type ParseResult =
  | { ok: true; value: JournalState }
  | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function text(value: unknown, limit: number) {
  return typeof value === "string" && value.length <= limit ? value : null;
}

function numericText(value: unknown, required = false) {
  if (typeof value !== "string" || value.length > 40) return null;
  const normalized = value.replace(/,/g, "").trim();
  if (!normalized) return required ? null : "";
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? normalized : null;
}

function parseTrade(value: unknown, index: number): JournalTrade | string {
  if (!isRecord(value)) return `Trade ${index + 1} is not valid.`;
  const id = text(value.id, 80);
  const coin = text(value.coin, 30);
  const strategy = text(value.strategy ?? "", 120);
  const reason = text(value.reason ?? "", 1_000);
  const note = text(value.note ?? "", 2_000);
  const entryPx = numericText(value.entryPx, true);
  const sizeMode: TradeSizeMode = value.sizeMode === "units" ? "units" : "usd";
  const sizeUsd = numericText(value.sizeUsd ?? "", sizeMode === "usd");
  const units = numericText(value.units ?? "", sizeMode === "units");
  const stopPx = numericText(value.stopPx ?? "");
  const tpPx = numericText(value.tpPx ?? "");
  const exitPx = numericText(value.exitPx ?? "");
  const fees = numericText(value.fees ?? "");
  const entryTime = value.entryTime;
  const exitTime = value.exitTime ?? null;
  const emo = value.emo;

  if (!id || !coin?.trim()) return `Trade ${index + 1} needs an ID and market.`;
  if (!finiteNumber(entryTime) || entryTime <= 0)
    return `Trade ${index + 1} needs a valid entry time.`;
  if (value.dir !== "Long" && value.dir !== "Short")
    return `Trade ${index + 1} needs a valid direction.`;
  if (entryPx === null || Number(entryPx) <= 0)
    return `Trade ${index + 1} needs a positive entry price.`;
  if (sizeUsd === null || units === null)
    return `Trade ${index + 1} needs a valid position size.`;
  if (sizeMode === "usd" && Number(sizeUsd) <= 0)
    return `Trade ${index + 1} needs a positive dollar position size.`;
  if (sizeMode === "units" && Number(units) <= 0)
    return `Trade ${index + 1} needs a positive unit size.`;
  if ([stopPx, tpPx, exitPx, fees].some((item) => item === null))
    return `Trade ${index + 1} contains an invalid price or fee.`;
  if ((exitPx !== "" && exitTime === null) || (exitPx === "" && exitTime !== null))
    return `Trade ${index + 1} needs both an exit price and exit time.`;
  if (exitTime !== null && (!finiteNumber(exitTime) || exitTime < entryTime))
    return `Trade ${index + 1} has an invalid exit time.`;
  if (!finiteNumber(emo) || !Number.isInteger(emo) || emo < 1 || emo > 10)
    return `Trade ${index + 1} needs a trading-state score from 1 to 10.`;
  if (strategy === null || reason === null || note === null)
    return `Trade ${index + 1} contains text that is too long.`;

  return {
    id,
    entryTime,
    coin: coin.trim().toUpperCase(),
    strategy,
    dir: value.dir,
    entryPx,
    sizeMode,
    sizeUsd,
    units,
    stopPx: stopPx as string,
    tpPx: tpPx as string,
    exitPx: exitPx as string,
    exitTime: exitTime as number | null,
    fees: fees as string,
    emo,
    reason,
    note,
  };
}

export function parseJournalState(value: unknown): ParseResult {
  if (!isRecord(value)) return { ok: false, error: "Journal data is not valid." };
  const startingCapital = value.startingCapital;
  if (!finiteNumber(startingCapital) || startingCapital < 0)
    return { ok: false, error: "Starting trading balance must be zero or more." };
  if (!Array.isArray(value.trades) || value.trades.length > 10_000)
    return { ok: false, error: "Journal must contain 10,000 trades or fewer." };

  const trades: JournalTrade[] = [];
  for (let index = 0; index < value.trades.length; index += 1) {
    const trade = parseTrade(value.trades[index], index);
    if (typeof trade === "string") return { ok: false, error: trade };
    trades.push(trade);
  }
  return {
    ok: true,
    value: {
      startingCapital,
      trades,
      updatedAt: finiteNumber(value.updatedAt) ? value.updatedAt : Date.now(),
    },
  };
}
