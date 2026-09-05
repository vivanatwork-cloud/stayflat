import { describe, expect, it } from "vitest";
import type { RawFill } from "@/lib/hyperliquid/metrics";
import { buildMultiVenueMetrics } from "./multi-venue";

const pair = (venue: "hyperliquid" | "arcus", pnl: number, time: number): RawFill[] => [
  { venue, time, px: "100", sz: "1", closedPnl: "0", fee: "0", coin: "BTC", tid: `${venue}-open`, side: "B", dir: "Open Long", crossed: true },
  { venue, time: time + 1, px: "100", sz: "1", closedPnl: String(pnl), fee: "0", coin: "BTC", tid: `${venue}-close`, side: "A", dir: "Close Long", crossed: true },
];

describe("buildMultiVenueMetrics", () => {
  it("keeps same-market positions separate across venues and recomputes combined metrics", () => {
    const result = buildMultiVenueMetrics({
      hyperliquid: { rawFills: pair("hyperliquid", 10, 1), portfolioPnl: 10, historyLimited: false },
      arcus: { rawFills: pair("arcus", -5, 2), portfolioPnl: -5, historyLimited: false },
    });
    expect(result.activeVenues).toEqual(["hyperliquid", "arcus"]);
    expect(result.combined.empty).toBe(false);
    if (!result.combined.empty) {
      expect(result.combined.positionCount).toBe(2);
      expect(result.combined.winRate).toBe(0.5);
      expect(result.combined.perpPnl).toBe(5);
    }
  });

  it("does not mark unavailable or fill-less venues active", () => {
    const result = buildMultiVenueMetrics({
      hyperliquid: { rawFills: pair("hyperliquid", 10, 1), portfolioPnl: 10, historyLimited: false },
      arcus: { rawFills: [], portfolioPnl: null, historyLimited: false, unavailable: true },
    });
    expect(result.activeVenues).toEqual(["hyperliquid"]);
    expect(result.arcus.active).toBe(false);
  });
});
