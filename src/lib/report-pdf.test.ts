import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { buildReportPdf, reportPdfRows, reportPdfVenueRows } from "./report-pdf";
import { buildMultiVenueMetrics } from "./report/multi-venue";
import type { ReportMetrics } from "./hyperliquid/metrics";

const metrics = {
  empty: false, fillCount: 20, winRate: .55, fees: 15, biggestLoss: -120, biggestWin: 180,
  coinCount: 3, topCoin: "BTC", dateFrom: 1704067200000, dateTo: 1706745600000,
  revengeRatio: 1.1, medianCooldown: 20, dangerBand: { start: 0, end: 3 }, profitBand: { start: 9, end: 12 },
  entryType: null, perpPnl: 420, avgWin: 80, avgLoss: 60, longPnl: 300, shortPnl: 120,
  longCount: 7, shortCount: 5, busyDayCount: 4, busyDayPnl: 90, busyDayDate: "2024-01-08",
  feeMultiple: .04, lossShare: .5, lossCount: 8, positionCount: 12, longestWinStreak: 3,
  longestLossStreak: 2, avgTradeDurationMinutes: 90, totalPerpsVolume: 125000,
} satisfies ReportMetrics;

describe("report PDF", () => {
  it("includes the expected report rows", () => {
    const rows = reportPdfRows(metrics);
    expect(rows).toContainEqual(["Perps P&L (all-time)", "$420"]);
    expect(rows).toContainEqual(["Best entry window", "09:00-12:00"]);
  });

  it("creates a readable, paginated PDF", async () => {
    const bytes = await buildReportPdf({ address: "0x1234567890abcdef", metrics });
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    const document = await PDFDocument.load(bytes);
    expect(document.getPageCount()).toBeGreaterThanOrEqual(1);
    expect(document.getTitle()).toBe("StayFlat trading report");
  });

  it("lists both active venues in a combined PDF", () => {
    const report = buildMultiVenueMetrics({
      hyperliquid: { rawFills: [{ time: 1, px: "1", sz: "1", coin: "BTC", tid: "h", side: "B", dir: "Open", crossed: true }], portfolioPnl: 2, historyLimited: false },
      arcus: { rawFills: [{ venue: "arcus", time: 2, px: "1", sz: "1", coin: "ETH", tid: "a", side: "B", dir: "Open", crossed: true }], portfolioPnl: 3, historyLimited: false },
    });
    expect(reportPdfVenueRows(report).map(([venue]) => venue)).toEqual(["Hyperliquid", "Arcus"]);
  });
});
