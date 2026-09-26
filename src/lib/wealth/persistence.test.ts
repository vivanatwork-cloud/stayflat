import { describe, it, expect } from "vitest";
import { encodeWealth, decodeWealth } from "./persistence";
import { demoWorkspace } from "./demo";
describe("durable wealth records", () => {
  it("round trips records independently of order and splits large original statements", () => {
    const data = demoWorkspace().data;
    data.sources = [
      {
        id: "source",
        accountId: data.accounts[0].id,
        name: "statement.csv",
        date: "2026-09-26",
        rows: 1,
        raw: "🙂".repeat(80000),
      },
    ];
    const saved = encodeWealth(data);
    expect(
      saved.records.filter((r) => r.kind === "sources").length,
    ).toBeGreaterThan(1);
    for (const row of saved.records)
      expect(row.payload.isWellFormed()).toBe(true);
    expect(decodeWealth(saved.settings, saved.records)).toEqual({
      ...data,
      holdingHistory: data.holdingHistory ?? [],
    });
  });
  it("rejects duplicates and missing account references", () => {
    const data = demoWorkspace().data;
    data.holdings.push(data.holdings[0]);
    expect(() => encodeWealth(data)).toThrow("Duplicate");
    data.accounts = [];
    expect(() => encodeWealth(data)).toThrow("missing account");
  });
  it("rejects oversize data before saving", () => {
    const data = demoWorkspace().data;
    data.sources = [
      {
        id: "s",
        accountId: data.accounts[0].id,
        name: "x",
        date: "2026-09-26",
        rows: 1,
        raw: "x".repeat(3000001),
      },
    ];
    expect(() => encodeWealth(data)).toThrow("WEALTH_TOO_LARGE");
  });
});
