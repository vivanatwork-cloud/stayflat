import { describe, expect, it } from "vitest";
import { computeMetrics, type RawFill } from "./metrics";

let tid = 0;
function fill(overrides: Partial<RawFill> = {}): RawFill {
  tid += 1;
  return { time: Date.UTC(2026, 7, 1, 10) + tid * 60_000, px: "100", sz: "1", closedPnl: "0", fee: "1", coin: "BTC", tid, side: "B", dir: "Open Long", crossed: true, ...overrides };
}
function roundTrip(pnl = 10, overrides: Partial<RawFill> = {}) {
  const open = fill(overrides);
  const close = fill({ ...overrides, time: Number(open.time) + 60_000, side: "A", dir: "Close Long", closedPnl: String(pnl) });
  return [open, close];
}

describe("computeMetrics", () => {
  it("groups partial closes into one completed position", () => {
    const open = fill({ sz: "2" });
    const partial = fill({ side: "A", dir: "Close Long", sz: "1", closedPnl: "5" });
    const close = fill({ side: "A", dir: "Close Long", sz: "1", closedPnl: "7" });
    const result = computeMetrics([open, partial, close], null);
    expect(result.empty).toBe(false);
    if (!result.empty) {
      expect(result.positionCount).toBe(1);
      expect(result.winRate).toBe(1);
      expect(result.biggestWin).toBe(9);
    }
  });

  it("deduplicates fills and records a flip as two positions", () => {
    const open = fill();
    const flip = fill({ side: "A", sz: "2", dir: "Long > Short", closedPnl: "9" });
    const close = fill({ side: "B", dir: "Close Short", closedPnl: "4" });
    const result = computeMetrics([open, flip, flip, close], null);
    expect(result.empty).toBe(false);
    if (!result.empty) expect(result.positionCount).toBe(2);
  });

  it("requires three post-loss samples before behavioral timing claims", () => {
    const result = computeMetrics([...roundTrip(-10), ...roundTrip(8)], null);
    expect(result.empty).toBe(false);
    if (!result.empty) {
      expect(result.revengeRatio).toBeNull();
      expect(result.medianCooldown).toBeNull();
      expect(result.dangerBand).toBeNull();
    }
  });

  it("creates daily and cumulative position-level series in the trader timezone", () => {
    const result = computeMetrics(roundTrip(15), null, -330);
    expect(result.empty).toBe(false);
    if (!result.empty) {
      expect(result.cumulativePnl?.at(-1)?.value).toBe(13);
      expect(result.dailyPnl?.[0].pnl).toBe(13);
      expect(result.dailyPnl).toHaveLength(1);
      expect(result.confidence).toBe("low");
    }
  });

  it("calculates trading rhythm metrics from completed positions", () => {
    const result = computeMetrics([
      ...roundTrip(12),
      ...roundTrip(8),
      ...roundTrip(7),
      ...roundTrip(-10),
    ], null);
    expect(result.empty).toBe(false);
    if (!result.empty) {
      expect(result.bestCloseNetWeekday).toEqual({ day: "Saturday", net: 2 });
      expect(result.worstCloseNetWeekday).toEqual({ day: "Saturday", net: 2 });
      expect(result.bestOpenNetWeekday).toEqual({ day: "Saturday", net: 2 });
      expect(result.worstOpenNetWeekday).toEqual({ day: "Saturday", net: 2 });
      expect(result.longestWinStreak).toBe(1);
      expect(result.longestLossStreak).toBe(0);
      expect(result.longestWinStreakMonth).toBe("August 2026");
      expect(result.longestLossStreakMonth).toBeNull();
      expect(result.avgTradeDurationMinutes).toBe(1);
      expect(result.totalPerpsVolume).toBe(800);
      expect(result.profitBand).toEqual({ start: 10, end: 13 });
      expect(result.entryType?.marketFees).toBe(8);
    }
  });

  it("calculates net weekdays separately for opening and closing days", () => {
    const result = computeMetrics([
      ...roundTrip(12, { time: Date.UTC(2026, 7, 3, 23, 59) }),
      ...roundTrip(-8, { time: Date.UTC(2026, 7, 4, 10) }),
      ...roundTrip(15, { time: Date.UTC(2026, 7, 4, 12) }),
    ], null);
    expect(result.empty).toBe(false);
    if (!result.empty) {
      expect(result.bestOpenNetWeekday).toEqual({ day: "Monday", net: 1 });
      expect(result.worstOpenNetWeekday).toEqual({ day: "Tuesday", net: 0 });
      expect(result.bestCloseNetWeekday).toEqual({ day: "Tuesday", net: 1 });
      expect(result.worstCloseNetWeekday).toEqual({ day: "Tuesday", net: 1 });
    }
  });

  it("returns a typed empty snapshot", () => {
    expect(computeMetrics([], null)).toEqual({ empty: true, positionCount: 0, confidence: "low", cumulativePnl: [], dailyPnl: [] });
  });

  it("uses one day with the most completed positions for the busiest-day result", () => {
    const firstDay = Date.UTC(2026, 7, 1, 10);
    const secondDay = Date.UTC(2026, 7, 2, 10);
    const result = computeMetrics([
      ...roundTrip(10, { time: firstDay }),
      ...roundTrip(20, { time: secondDay }),
      ...roundTrip(-5, { time: secondDay + 3_600_000 }),
    ], null);
    expect(result.empty).toBe(false);
    if (!result.empty) {
      expect(result.busyDayCount).toBe(2);
      expect(result.busyDayPnl).toBe(11);
      expect(result.busyDayDate).toBe("2026-08-02");
    }
  });

  it("assigns best and worst result windows by position opening time", () => {
    const result = computeMetrics([
      ...roundTrip(25, { time: Date.UTC(2026, 7, 1, 9) }),
      ...roundTrip(15, { time: Date.UTC(2026, 7, 2, 10) }),
      ...roundTrip(-60, { time: Date.UTC(2026, 7, 3, 18) }),
    ], null);
    expect(result.empty).toBe(false);
    if (!result.empty) {
      expect(result.profitBand).toEqual({ start: 9, end: 12 });
      expect(result.dangerBand).toEqual({ start: 18, end: 21 });
    }
  });

  it("finds the best and worst assets by net realized PnL", () => {
    const result = computeMetrics([
      ...roundTrip(10, { coin: "BTC" }),
      ...roundTrip(-5, { coin: "ETH" }),
      ...roundTrip(2, { coin: "SOL" }),
    ], null);
    expect(result.empty).toBe(false);
    if (!result.empty) {
      expect(result.bestAsset).toEqual({ coin: "BTC", pnl: 8 });
      expect(result.worstAsset).toEqual({ coin: "ETH", pnl: -7 });
    }
  });

  it("calculates streaks from consecutive active trading days", () => {
    const result = computeMetrics([
      ...roundTrip(10, { time: Date.UTC(2026, 6, 30, 10) }),
      ...roundTrip(10, { time: Date.UTC(2026, 7, 2, 10) }),
      ...roundTrip(-10, { time: Date.UTC(2026, 7, 4, 10) }),
      ...roundTrip(-10, { time: Date.UTC(2026, 7, 6, 10) }),
    ], null);
    expect(result.empty).toBe(false);
    if (!result.empty) {
      expect(result.longestWinStreak).toBe(2);
      expect(result.longestWinStreakMonth).toBe("July–August 2026");
      expect(result.longestLossStreak).toBe(2);
      expect(result.longestLossStreakMonth).toBe("August 2026");
    }
  });
});
