import { describe, expect, it } from "vitest";
import { classifyMoonPeriod, computeMoonPerformance } from "./performance";
import type { Position } from "../hyperliquid/metrics";

const boundaries = [
  { phase: "new" as const, occursAt: 1_000 },
  { phase: "full" as const, occursAt: 2_000 },
  { phase: "new" as const, occursAt: 3_000 },
];
const position = (closedAt: number, pnl: number, fees = 0): Position => ({ coin: "BTC", direction: "long", openedAt: 0, closedAt, openingNotional: 100, pnl, fees, opening: "market" });

describe("moon performance", () => {
  it("uses exact phase boundaries", () => {
    expect(classifyMoonPeriod(999, boundaries)).toBeNull();
    expect(classifyMoonPeriod(1_000, boundaries)).toBe("new");
    expect(classifyMoonPeriod(1_999, boundaries)).toBe("new");
    expect(classifyMoonPeriod(2_000, boundaries)).toBe("full");
  });

  it("calculates net results and requires five positions in each period", () => {
    const positions = [
      ...Array.from({ length: 5 }, (_, index) => position(1_100 + index, 10, 1)),
      ...Array.from({ length: 5 }, (_, index) => position(2_100 + index, index ? -2 : 6, 1)),
    ];
    const result = computeMoonPerformance(positions, boundaries);
    expect(result.newMoon).toMatchObject({ pnl: 45, positions: 5, wins: 5, losses: 0, winRate: 1, averagePnl: 9 });
    expect(result.fullMoon.positions).toBe(5);
    expect(result.comparisonReady).toBe(true);
    expect(result.betterPeriod).toBe("new");
  });
});
