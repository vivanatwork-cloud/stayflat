import { describe, expect, it } from "vitest";
import type { RawFill } from "@/lib/hyperliquid/metrics";
import { buildMultiVenueMetrics, mergeVenueSources } from "./multi-venue";

const pair = (venue: "hyperliquid" | "arcus" | "lighter", pnl: number, time: number): RawFill[] => [
  { venue, time, px: "100", sz: "1", closedPnl: "0", fee: "0", coin: "BTC", tid: `${venue}-open`, side: "B", dir: "Open Long", crossed: true },
  { venue, time: time + 1, px: "100", sz: "1", closedPnl: String(pnl), fee: "0", coin: "BTC", tid: `${venue}-close`, side: "A", dir: "Close Long", crossed: true },
];

describe("buildMultiVenueMetrics", () => {
  it("keeps positions on different wallets separate", () => {
    const first = pair("hyperliquid", 10, 1).map((fill) => ({ ...fill, wallet: "0xaaa", tid: `a-${fill.tid}` }));
    const second = pair("hyperliquid", -5, 2).map((fill) => ({ ...fill, wallet: "0xbbb", tid: `b-${fill.tid}` }));
    const merged = mergeVenueSources([
      { rawFills: first, portfolioPnl: 10, historyLimited: false },
      { rawFills: second, portfolioPnl: -5, historyLimited: false },
    ]);
    const result = buildMultiVenueMetrics({
      hyperliquid: merged,
      arcus: { rawFills: [], portfolioPnl: null, historyLimited: false, unavailable: true },
    });
    expect(result.combined.empty).toBe(false);
    if (!result.combined.empty) expect(result.combined.positionCount).toBe(2);
  });

  it("keeps matching trade IDs from different exchanges", () => {
    const hyperliquid = pair("hyperliquid", 10, 1).map((fill) => ({ ...fill, tid: "shared" }));
    const arcus = pair("arcus", 5, 2).map((fill) => ({ ...fill, tid: "shared" }));
    const result = buildMultiVenueMetrics({
      hyperliquid: { rawFills: hyperliquid, portfolioPnl: 10, historyLimited: false },
      arcus: { rawFills: arcus, portfolioPnl: 5, historyLimited: false },
    });
    expect(result.combined.empty).toBe(false);
    if (!result.combined.empty) expect(result.combined.fillCount).toBe(2);
  });
  it("uses an exchange's authoritative volume when its trade rows are incomplete", () => {
    const result = buildMultiVenueMetrics({
      hyperliquid: { rawFills: [], portfolioPnl: null, historyLimited: false, unavailable: true },
      arcus: { rawFills: [], portfolioPnl: null, historyLimited: false, unavailable: true },
      lighter: {
        rawFills: pair("lighter", -25, 1),
        portfolioPnl: -25,
        portfolioVolume: 7_327_359.13,
        historyLimited: true,
      },
    });

    const lighterMetrics = result.lighter?.metrics;
    expect(lighterMetrics?.empty).toBe(false);
    if (lighterMetrics && !lighterMetrics.empty) expect(lighterMetrics.totalPerpsVolume).toBe(7_327_359.13);
    expect(result.combined.empty).toBe(false);
    if (!result.combined.empty) expect(result.combined.totalPerpsVolume).toBe(7_327_359.13);
  });

  it("keeps same-market positions separate across venues and recomputes combined metrics", () => {
    const result = buildMultiVenueMetrics({
      hyperliquid: { rawFills: pair("hyperliquid", 10, 1), portfolioPnl: 10, historyLimited: false },
      arcus: { rawFills: pair("arcus", -5, 2), portfolioPnl: -5, historyLimited: false },
      lighter: { rawFills: [], portfolioPnl: null, historyLimited: false },
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
      lighter: { rawFills: [], portfolioPnl: null, historyLimited: false, unavailable: true },
    });
    expect(result.activeVenues).toEqual(["hyperliquid"]);
    expect(result.arcus.active).toBe(false);
  });

  it("supports Lighter-only reports", () => {
    const result = buildMultiVenueMetrics({
      hyperliquid: { rawFills: [], portfolioPnl: null, historyLimited: false },
      arcus: { rawFills: [], portfolioPnl: null, historyLimited: false },
      lighter: { rawFills: pair("lighter", 7, 3), portfolioPnl: 7, historyLimited: false },
    });
    expect(result.activeVenues).toEqual(["lighter"]);
    expect(result.lighter?.active).toBe(true);
  });

  it("recomputes combined metrics across all three venues", () => {
    const result = buildMultiVenueMetrics({
      hyperliquid: { rawFills: pair("hyperliquid", 10, 1), portfolioPnl: 10, historyLimited: false },
      arcus: { rawFills: pair("arcus", -5, 2), portfolioPnl: -5, historyLimited: false },
      lighter: { rawFills: pair("lighter", 7, 3), portfolioPnl: 7, historyLimited: false },
    });
    expect(result.activeVenues).toEqual(["hyperliquid", "arcus", "lighter"]);
    expect(result.combined.empty).toBe(false);
    if (!result.combined.empty) {
      expect(result.combined.positionCount).toBe(3);
      expect(result.combined.perpPnl).toBe(12);
    }
  });
});
