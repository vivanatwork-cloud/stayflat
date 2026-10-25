import { describe, expect, it } from "vitest";
import { calendarMonth } from "./pnl-calendar";
import { buildJournalAnalytics } from "../../lib/journal/analytics";
import type { JournalTrade } from "../../lib/journal/types";

describe("P/L calendar", () => {
  it("aligns leap February to Monday-first weeks and includes February 29", () => {
    const result = calendarMonth([], new Date(2024, 1, 1));
    expect(result.cells.slice(0, 3)).toEqual([null, null, null]);
    expect(result.cells[3]?.date).toBe("2024-02-01");
    expect(result.cells.filter(Boolean)).toHaveLength(29);
    expect(result.cells).toHaveLength(35);
    expect(result.cells[31]?.date).toBe("2024-02-29");
  });

  it("supports six-week months and year boundaries", () => {
    expect(calendarMonth([], new Date(2026, 2, 1)).cells).toHaveLength(42);
    expect(calendarMonth([], new Date(2026, 12, 1)).cells.find(Boolean)?.date).toBe("2027-01-01");
    expect(calendarMonth([], new Date(2026, -1, 1)).cells.find(Boolean)?.date).toBe("2025-12-01");
  });

  it("totals only the displayed month and distinguishes flat days from inactive days", () => {
    const result = calendarMonth([
      { date: "2026-09-01", pnl: 101.25, trades: 2 },
      { date: "2026-09-02", pnl: -40.5, trades: 1 },
      { date: "2026-09-03", pnl: 0, trades: 2 },
      { date: "2026-08-31", pnl: 900, trades: 9 },
    ], new Date(2026, 8, 1));
    expect(result).toMatchObject({ net: 60.75, trades: 5, winningDays: 1, losingDays: 1, flatDays: 1 });
    expect(result.cells.find((cell) => cell?.day === 3)?.performance?.pnl).toBe(0);
    expect(result.cells.find((cell) => cell?.day === 4)?.performance).toBeUndefined();
  });

  it("uses local exit dates, subtracts fees, combines trades and excludes open trades", () => {
    const trade: JournalTrade = { id: "1", entryTime: new Date(2026, 7, 31, 20).getTime(), exitTime: new Date(2026, 8, 1, 0, 15).getTime(), coin: "BTC", strategy: "", dir: "Long", entryPx: "100", sizeMode: "units", units: "2", sizeUsd: "", stopPx: "", tpPx: "", exitPx: "110", fees: "1.25", emo: 5, reason: "", note: "" };
    const daily = buildJournalAnalytics([trade, { ...trade, id: "2", exitPx: "95", fees: "0.5" }, { ...trade, id: "open", exitPx: "", exitTime: null }], "all").daily;
    expect(daily).toEqual([{ date: "2026-09-01", pnl: 8.25, trades: 2 }]);
    expect(calendarMonth(daily, new Date(2026, 8, 1))).toMatchObject({ net: 8.25, trades: 2 });
  });

  it("keeps empty months navigable with zero totals", () => {
    expect(calendarMonth([], new Date(2026, 8, 1))).toMatchObject({ net: 0, trades: 0, winningDays: 0, losingDays: 0, flatDays: 0 });
  });
});
