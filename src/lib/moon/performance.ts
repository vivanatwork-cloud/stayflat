import type { Position } from "../hyperliquid/metrics";

export type MoonPhaseBoundary = { phase: "new" | "full"; occursAt: number };
export type MoonPeriodMetrics = {
  pnl: number;
  positions: number;
  wins: number;
  losses: number;
  winRate: number | null;
  averagePnl: number | null;
};
export type MoonPerformance = {
  newMoon: MoonPeriodMetrics;
  fullMoon: MoonPeriodMetrics;
  comparisonReady: boolean;
  betterPeriod: "new" | "full" | "tie" | null;
};

export function classifyMoonPeriod(timestamp: number, boundaries: MoonPhaseBoundary[]) {
  let result: "new" | "full" | null = null;
  for (const boundary of boundaries) {
    if (boundary.occursAt > timestamp) break;
    result = boundary.phase;
  }
  return result;
}

const emptyPeriod = (): MoonPeriodMetrics => ({ pnl: 0, positions: 0, wins: 0, losses: 0, winRate: null, averagePnl: null });

export function computeMoonPerformance(positions: Position[], boundaries: MoonPhaseBoundary[]): MoonPerformance {
  const newMoon = emptyPeriod();
  const fullMoon = emptyPeriod();
  for (const position of positions) {
    const phase = classifyMoonPeriod(position.closedAt, boundaries);
    if (!phase) continue;
    const bucket = phase === "new" ? newMoon : fullMoon;
    const pnl = position.pnl - position.fees;
    bucket.pnl += pnl;
    bucket.positions += 1;
    if (pnl > 0) bucket.wins += 1;
    if (pnl < 0) bucket.losses += 1;
  }
  for (const bucket of [newMoon, fullMoon]) {
    bucket.winRate = bucket.positions ? bucket.wins / bucket.positions : null;
    bucket.averagePnl = bucket.positions ? bucket.pnl / bucket.positions : null;
  }
  const comparisonReady = newMoon.positions >= 5 && fullMoon.positions >= 5;
  const betterPeriod = !comparisonReady ? null : newMoon.pnl === fullMoon.pnl ? "tie" : newMoon.pnl > fullMoon.pnl ? "new" : "full";
  return { newMoon, fullMoon, comparisonReady, betterPeriod };
}
