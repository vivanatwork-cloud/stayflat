import { describe, expect, it } from "vitest";
import { buildJournalAnalytics } from "./analytics";
import type { JournalTrade } from "./types";

const DAY = 86_400_000;
function trade(overrides: Partial<JournalTrade> = {}): JournalTrade {
  return { id: crypto.randomUUID(), entryTime: Date.UTC(2026, 7, 30, 10), coin: "BTC", strategy: "Breakout", dir: "Long", entryPx: "100", sizeMode: "usd", sizeUsd: "1000", units: "", stopPx: "90", tpPx: "", exitPx: "110", exitTime: Date.UTC(2026, 7, 30, 11), fees: "0", emo: 8, reason: "", note: "", ...overrides };
}

describe("buildJournalAnalytics", () => {
  it("orders equity by exit time and groups P/L by day", () => {
    const later = trade({ exitTime: Date.UTC(2026, 7, 31, 11), exitPx: "90" });
    const earlier = trade({ exitTime: Date.UTC(2026, 7, 30, 11), exitPx: "110" });
    const result = buildJournalAnalytics([later, earlier], "all");
    expect(result.equity.map((point) => point.value)).toEqual([100, 0]);
    expect(result.daily).toEqual([
      { date: "2026-08-30", pnl: 100, trades: 1 },
      { date: "2026-08-31", pnl: -100, trades: 1 },
    ]);
  });

  it("groups blank strategies and calculates strategy results", () => {
    const result = buildJournalAnalytics([trade({ strategy: "" }), trade({ strategy: "", exitPx: "90" })], "all");
    expect(result.strategies[0]).toMatchObject({ strategy: "No strategy recorded", trades: 2, wins: 1, winRate: 0.5, net: 0, average: 0, profitFactor: 1 });
  });

  it("calculates report-style behavior observations", () => {
    const first = trade({ exitPx: "90", sizeUsd: "1000", exitTime: Date.UTC(2026, 7, 30, 11) });
    const second = trade({ sizeUsd: "2000", entryTime: Date.UTC(2026, 7, 30, 12), exitTime: Date.UTC(2026, 7, 30, 13) });
    const result = buildJournalAnalytics([first, second], "all");
    expect(result.report.sizeAfterLossRatio).toBeCloseTo(4 / 3);
    expect(result.report.medianCooldownMinutes).toBe(60);
    const localLossHour = new Date(Date.UTC(2026, 7, 30, 11)).getHours();
    expect(result.report.dangerStart).toBe((localLossHour + 22) % 24);
  });

  it("returns honest empty values and filters periods", () => {
    expect(buildJournalAnalytics([], "all").summary.winRate).toBeNull();
    const old = trade({ exitTime: Date.now() - 40 * DAY });
    expect(buildJournalAnalytics([old], "30").closed).toHaveLength(0);
  });

  it("uses the net result from one day with the most completed trades", () => {
    const quietDay = Date.UTC(2026, 7, 29, 11);
    const busyDay = Date.UTC(2026, 7, 30, 11);
    const result = buildJournalAnalytics([
      trade({ exitTime: quietDay, exitPx: "120" }),
      trade({ exitTime: busyDay, exitPx: "110", fees: "5" }),
      trade({ exitTime: busyDay + 3_600_000, exitPx: "90", fees: "5" }),
    ], "all");
    expect(result.report.busyDayCount).toBe(2);
    expect(result.report.busyDayPnl).toBe(-10);
  });
});
