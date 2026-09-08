import { describe, expect, it, vi } from "vitest";
import { fetchLighterReport, LighterAuthError, normalizeLighterTrades, parseLighterReadOnlyToken, type LighterTrade } from "./client";

const token = "ro:1483:all:2000000000:abcdef12";

const trade = (overrides: Partial<LighterTrade> = {}): LighterTrade => ({
  trade_id: 9,
  market_id: 24,
  size: "2",
  price: "100",
  usd_amount: "200",
  ask_account_id: 1483,
  bid_account_id: 88,
  is_maker_ask: true,
  timestamp: 1_800_000_000,
  maker_fee: 40,
  taker_fee: 280,
  maker_position_size_before: "2",
  ask_account_pnl: "15",
  ...overrides,
});

describe("parseLighterReadOnlyToken", () => {
  it("parses a valid read-only token", () => {
    expect(parseLighterReadOnlyToken(token, 1_900_000_000)).toEqual({ accountIndex: 1483, scope: "all", expiresAt: 2_000_000_000 });
  });

  it("rejects write-capable, malformed, and expired credentials", () => {
    expect(() => parseLighterReadOnlyToken("secret", 1)).toThrow(LighterAuthError);
    expect(() => parseLighterReadOnlyToken("ro:1483:all:2:abcd", 2)).toThrow("expired");
  });
});

describe("normalizeLighterTrades", () => {
  it("maps ask maker fills, PnL, fees, timestamps, and market names", () => {
    const fills = normalizeLighterTrades([trade(), trade()], 1483, new Map([[24, "HYPE"]]));
    expect(fills).toHaveLength(1);
    expect(fills[0]).toMatchObject({ venue: "lighter", coin: "HYPE", side: "A", dir: "Close", crossed: false, closedPnl: "15", fee: "0.008", time: 1_800_000_000_000 });
  });

  it("maps bid taker fills and uses the queried account PnL", () => {
    const fills = normalizeLighterTrades([trade({ ask_account_id: 88, bid_account_id: 1483, is_maker_ask: true, taker_position_size_before: "-3", bid_account_pnl: "-4" })], 1483, new Map([[24, "HYPE"]]));
    expect(fills[0]).toMatchObject({ side: "B", dir: "Close", crossed: true, closedPnl: "-4", fee: "0.056" });
  });
});

describe("fetchLighterReport", () => {
  it("rejects a token that belongs to a different wallet", async () => {
    const fetcher = vi.fn(async () => Response.json({ code: 200, sub_accounts: [{ index: 7, status: 1 }] })) as unknown as typeof fetch;
    await expect(fetchLighterReport("0xabc", token, new AbortController().signal, fetcher)).rejects.toThrow("different wallet");
  });

  it("fetches all linked accounts, normalizes trades, and combines PnL", async () => {
    const pnlRequests: URL[] = [];
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("accountsByL1Address")) return Response.json({ code: 200, sub_accounts: [{ index: 1483, status: 1 }, { index: 1484, status: 1 }] });
      if (url.pathname.endsWith("orderBookDetails")) return Response.json({ code: 200, order_book_details: [{ market_id: 24, symbol: "HYPE", market_type: "perp" }] });
      if (url.pathname.endsWith("/trades")) {
        const accountIndex = Number(url.searchParams.get("account_index"));
        return Response.json({ code: 200, trades: [trade({ trade_id: accountIndex, ask_account_id: accountIndex })] });
      }
      if (url.pathname.endsWith("/pnl")) {
        pnlRequests.push(url);
        const latestPnl = Number(url.searchParams.get("value")) === 1483 ? 10 : 5;
        return Response.json({ code: 200, pnl: [{ timestamp: 200, trade_pnl: latestPnl, volume: 150 }, { timestamp: 100, trade_pnl: 999, volume: 100 }] });
      }
      return Response.json({ code: 404 }, { status: 404 });
    }) as unknown as typeof fetch;
    const result = await fetchLighterReport("0xabc", token, new AbortController().signal, fetcher);
    expect(result.rawFills).toHaveLength(2);
    expect(result.portfolioPnl).toBe(15);
    expect(result.portfolioVolume).toBe(500);
    expect(result.historyLimited).toBe(true);
    expect(result.active).toBe(true);
    expect(pnlRequests).toHaveLength(2);
    expect(pnlRequests.every((url) => url.searchParams.get("ignore_transfers") === "false")).toBe(true);
  });
});
