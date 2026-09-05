import { describe, expect, it } from "vitest";
import { deriveTrade } from "./calculations";
import type { JournalTrade } from "./types";

describe("deriveTrade", () => {
  it("calculates short-trade net P/L after fees", () => {
    const trade: JournalTrade = {
      id: "1", entryTime: 1, coin: "BTC", strategy: "", dir: "Short",
      entryPx: "100", sizeMode: "usd", sizeUsd: "1000", units: "", stopPx: "110",
      tpPx: "80", exitPx: "90", exitTime: 2, fees: "5", emo: 8, reason: "", note: "",
    };
    const result = deriveTrade(trade);
    expect(result.net).toBe(95);
    expect(result.r).toBe(0.95);
  });
});
