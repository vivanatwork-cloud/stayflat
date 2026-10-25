import { deriveTrade } from "./calculations";
import type { JournalTrade } from "./types";

export type JournalTarget = { amount: number; deadline: string; startedOn: string; mode: "profit" | "balance" };
export function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function dayNumber(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1970 || year > 9999) return NaN;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toISOString().slice(0, 10) === value ? date.getTime() / 86_400_000 : NaN;
}
export function parseJournalTarget(input: unknown): JournalTarget | null {
  if (input == null) return null;
  if (typeof input !== "object") throw new Error("Check your target amount and date.");
  const target = input as Record<string, unknown>;
  if (typeof target.amount !== "number" || !Number.isFinite(target.amount) || target.amount <= 0 || target.amount > 1_000_000_000_000)
    throw new Error("Enter a target above $0 and no more than $1 trillion.");
  if ((target.mode !== "profit" && target.mode !== "balance") || typeof target.deadline !== "string" || typeof target.startedOn !== "string" || !Number.isFinite(dayNumber(target.deadline)) || !Number.isFinite(dayNumber(target.startedOn)) || target.deadline < target.startedOn)
    throw new Error("Choose a valid target date on or after its start date.");
  return { amount: target.amount, deadline: target.deadline, startedOn: target.startedOn, mode: target.mode };
}
export function targetProgress(target: JournalTarget, trades: JournalTrade[], capital: number, now = new Date()) {
  let net = 0;
  for (const trade of trades) {
    if (!trade.exitTime || trade.exitTime > now.getTime()) continue;
    if (target.mode === "profit" && localDateKey(new Date(trade.exitTime)) < target.startedOn) continue;
    const result = deriveTrade(trade);
    if (result.closed) net += result.net ?? 0;
  }
  const current = (target.mode === "balance" ? capital : 0) + net;
  const remaining = Math.max(0, target.amount - current);
  const today = localDateKey(now);
  const days = Math.max(0, dayNumber(target.deadline) - dayNumber(today > target.startedOn ? today : target.startedOn) + 1);
  const daily = remaining === 0 ? 0 : days > 0 ? remaining / days : null;
  return { current, remaining, days, daily, weekly: daily === null ? null : daily * Math.min(7, days), monthly: daily === null ? null : daily * Math.min(30, days), percent: Math.max(0, Math.min(100, current / target.amount * 100)), reached: remaining === 0, expired: days === 0 && remaining > 0 };
}
