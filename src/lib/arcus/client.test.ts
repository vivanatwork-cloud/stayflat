import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchArcusReport, normalizeArcusFills, type ArcusFill } from "./client";

const base: ArcusFill = {
  tradeId: "3208586", side: "BUY", size: "0.01951787", price: "78182.6",
  fee: "1.25", closedPnl: "-1.1710722", role: "MAKER",
  positionEffect: "CLOSE_SHORT", marketDisplayName: "BTC-USD", createdAt: 1788438722323636,
};

describe("normalizeArcusFills", () => {
  it("maps Arcus units and semantics into report fills", () => {
    expect(normalizeArcusFills([base])).toEqual([expect.objectContaining({
      venue: "arcus", time: 1788438722323, coin: "BTC", side: "B",
      dir: "Close", crossed: false, tid: "arcus:3208586",
    })]);
  });

  it("marks taker sells and removes duplicate trade ids", () => {
    const result = normalizeArcusFills([{ ...base, side: "SELL", role: "TAKER", positionEffect: "OPEN_SHORT" }, base]);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(expect.objectContaining({ side: "A", dir: "Open", crossed: true }));
  });
});

describe("fetchArcusReport", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("reads active public fills and all-time perp PnL", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: URL | RequestInfo) => {
      const url = String(input);
      if (url.includes("/portfolio")) return Response.json({ data: [["perpAll", { pnlHistory: [[1, "0"], [2, "42.5"]] }]] });
      return Response.json({ fills: [base] });
    }));
    const result = await fetchArcusReport("0x0000000000000000000000000000000000000001", new AbortController().signal);
    expect(result.active).toBe(true);
    expect(result.portfolioPnl).toBe(42.5);
    expect(result.rawFills).toHaveLength(1);
  });

  it("treats an address outside Arcus perp access as inactive", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: URL | RequestInfo) => {
      if (String(input).includes("/portfolio")) return Response.json({ error: "address not on access whitelist" }, { status: 400 });
      return Response.json({ error: "address not on access whitelist" }, { status: 400 });
    }));
    await expect(fetchArcusReport("0x0000000000000000000000000000000000000001", new AbortController().signal)).resolves.toEqual({
      rawFills: [], portfolioPnl: null, historyLimited: false, active: false,
    });
  });
});
