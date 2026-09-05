import type { JournalTrade } from "./types";

export function numberValue(value: string) {
  return Number(value.replace(/,/g, "")) || 0;
}

export function deriveTrade(trade: JournalTrade) {
  const entryPrice = numberValue(trade.entryPx);
  let sizeUsd = numberValue(trade.sizeUsd);
  const units = trade.sizeMode === "units"
    ? numberValue(trade.units)
    : entryPrice > 0 ? sizeUsd / entryPrice : 0;
  if (trade.sizeMode === "units") sizeUsd = entryPrice * units;
  const closed = Boolean(trade.exitPx && trade.exitTime);
  if (!closed) return { units, sizeUsd, closed, gross: null, net: null, r: null, duration: null, win: null };
  const exitPrice = numberValue(trade.exitPx);
  const gross = trade.dir === "Long"
    ? (exitPrice - entryPrice) * units
    : (entryPrice - exitPrice) * units;
  const net = gross - numberValue(trade.fees);
  const risk = Math.abs(entryPrice - numberValue(trade.stopPx)) * units;
  return {
    units,
    sizeUsd,
    closed,
    gross,
    net,
    r: trade.stopPx && risk > 0 ? net / risk : null,
    duration: trade.exitTime ? (trade.exitTime - trade.entryTime) / 3_600_000 : null,
    win: net > 0,
  };
}

export function money(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: Math.abs(value) < 100 && value !== 0 ? 2 : 0,
  }).format(value);
}

export function price(value: string) {
  const parsed = numberValue(value);
  if (!parsed) return "—";
  return `$${parsed.toLocaleString("en-US", { maximumFractionDigits: parsed < 10 ? 4 : 2 })}`;
}

export function rValue(value: number | null) {
  if (value === null) return "—";
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}R`;
}

export function emotionLabel(value: number) {
  return value <= 3 ? "Reactive" : value <= 7 ? "Mixed" : "Composed";
}
