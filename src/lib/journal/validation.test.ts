import { describe, expect, it } from "vitest";
import { parseJournalState } from "./validation";

const legacyTrade = {
  id: "trade-1",
  entryTime: 1_788_197_460_000,
  coin: "HYPE",
  strategy: "",
  dir: "Short",
  entryPx: "84.166",
  sizeUsd: "2696.85",
  stopPx: "90",
  tpPx: "75",
  exitPx: "",
  exitTime: null,
  fees: "",
  emo: 3,
  reason: "",
  note: "",
};

describe("parseJournalState", () => {
  it("normalizes the production legacy trade format", () => {
    const result = parseJournalState({ startingCapital: 10_000, trades: [legacyTrade], updatedAt: 123 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.trades[0].sizeMode).toBe("usd");
      expect(result.value.trades[0].units).toBe("");
    }
  });

  it("rejects a negative starting balance", () => {
    expect(parseJournalState({ startingCapital: -1, trades: [] })).toEqual({
      ok: false,
      error: "Starting trading balance must be zero or more.",
    });
  });

  it("rejects an exit price without an exit time", () => {
    const result = parseJournalState({
      startingCapital: 10_000,
      trades: [{ ...legacyTrade, exitPx: "80" }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("both an exit price and exit time");
  });

  it("rejects trading-state scores outside 1 to 10", () => {
    const result = parseJournalState({
      startingCapital: 10_000,
      trades: [{ ...legacyTrade, emo: 11 }],
    });
    expect(result.ok).toBe(false);
  });
});
