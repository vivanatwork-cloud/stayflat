import { describe, expect, it } from "vitest";
import { journalCsv } from "./csv";
import type { JournalState } from "./types";

describe("journalCsv", () => {
  it("neutralizes spreadsheet formulas in user-entered cells", () => {
    const state: JournalState = {
      startingCapital: 10_000,
      updatedAt: 1,
      trades: [{
        id: "1", entryTime: 1_700_000_000_000, coin: "BTC", strategy: "=CMD()",
        dir: "Long", entryPx: "100", sizeMode: "usd", sizeUsd: "1000", units: "",
        stopPx: "90", tpPx: "120", exitPx: "", exitTime: null, fees: "", emo: 8,
        reason: "+malicious", note: "@formula",
      }],
    };
    const csv = journalCsv(state);
    expect(csv).toContain("\"'=CMD()\"");
    expect(csv).toContain("\"'+malicious\"");
    expect(csv).toContain("\"'@formula\"");
  });
});
