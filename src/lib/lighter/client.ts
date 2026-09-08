import type { RawFill } from "@/lib/hyperliquid/metrics";

const LIGHTER_API = "https://mainnet.zklighter.elliot.ai";
const MAX_TRADE_PAGES = 60;
const MAINNET_GENESIS_SECONDS = 1_737_072_000;

export class LighterAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LighterAuthError";
  }
}

export type LighterTokenDetails = {
  accountIndex: number;
  scope: "single" | "all";
  expiresAt: number;
};

type LighterAccount = {
  index: number;
  status: number;
  account_type: number;
  total_order_count?: number;
  collateral?: string;
};

type AccountsResponse = {
  code: number;
  message?: string;
  sub_accounts?: LighterAccount[];
};

type Market = {
  market_id: number;
  symbol: string;
  market_type: "perp" | "spot";
};

type MarketsResponse = {
  code: number;
  message?: string;
  order_book_details?: Market[];
};

export type LighterTrade = {
  trade_id: number;
  trade_id_str?: string;
  market_id: number;
  size: string;
  price: string;
  usd_amount: string;
  ask_account_id: number;
  bid_account_id: number;
  is_maker_ask: boolean;
  timestamp: number;
  transaction_time?: number;
  taker_fee?: number;
  maker_fee?: number;
  taker_position_size_before?: string;
  maker_position_size_before?: string;
  taker_position_sign_changed?: boolean;
  maker_position_sign_changed?: boolean;
  bid_account_pnl?: string;
  ask_account_pnl?: string;
};

type TradesResponse = {
  code: number;
  message?: string;
  next_cursor?: string;
  trades?: LighterTrade[];
};

type PnlResponse = {
  code: number;
  message?: string;
  pnl?: { timestamp?: number; trade_pnl: number }[];
};

export type LighterAddressState = {
  active: boolean;
  accountIndexes: number[];
};

export type LighterReportSource = {
  rawFills: RawFill[];
  portfolioPnl: number | null;
  historyLimited: boolean;
  active: boolean;
};

type Fetcher = typeof fetch;

export function parseLighterReadOnlyToken(token: string, nowSeconds = Math.floor(Date.now() / 1_000)): LighterTokenDetails {
  const value = token.trim();
  if (/\s/.test(value)) throw new LighterAuthError("Remove spaces or line breaks from the Lighter token.");
  const match = /^ro:(\d+):(single|all):(\d+):([a-fA-F0-9]+)$/.exec(value);
  if (!match) throw new LighterAuthError("Enter a valid Lighter read-only token beginning with ro:.");
  const accountIndex = Number(match[1]);
  const expiresAt = Number(match[3]);
  if (!Number.isSafeInteger(accountIndex) || !Number.isSafeInteger(expiresAt))
    throw new LighterAuthError("The Lighter token is not valid.");
  if (expiresAt <= nowSeconds) throw new LighterAuthError("This Lighter read-only token has expired. Generate a new one.");
  return { accountIndex, scope: match[2] as "single" | "all", expiresAt };
}

function requestSignal(signal: AbortSignal) {
  return AbortSignal.any([signal, AbortSignal.timeout(12_000)]);
}

async function getJson<T>(url: URL, signal: AbortSignal, fetcher: Fetcher, token?: string): Promise<T> {
  const response = await fetcher(url, {
    headers: token ? { Authorization: token } : undefined,
    signal: requestSignal(signal),
    cache: "no-store",
  });
  const data = await response.json() as T & { code?: number; message?: string };
  if (!response.ok || (data.code != null && data.code !== 200)) {
    if (token && (response.status === 401 || response.status === 403 || data.code === 20001 || data.code === 21100))
      throw new LighterAuthError("Lighter rejected this read-only token. Generate a new token and try again.");
    throw new Error(`Lighter returned ${response.status}: ${data.message ?? "request failed"}`);
  }
  return data;
}

async function getAccounts(address: string, signal: AbortSignal, fetcher: Fetcher) {
  const url = new URL("/api/v1/accountsByL1Address", LIGHTER_API);
  url.searchParams.set("l1_address", address);
  const data = await getJson<AccountsResponse>(url, signal, fetcher);
  return data.sub_accounts ?? [];
}

export async function inspectLighterAddress(address: string, signal: AbortSignal, fetcher: Fetcher = fetch): Promise<LighterAddressState> {
  const accounts = await getAccounts(address, signal, fetcher);
  return {
    active: accounts.some((account) => account.status === 1),
    accountIndexes: accounts.map((account) => account.index),
  };
}

function isUserMaker(trade: LighterTrade, accountIndex: number) {
  const userIsAsk = trade.ask_account_id === accountIndex;
  return userIsAsk === trade.is_maker_ask;
}

function directionFor(trade: LighterTrade, accountIndex: number, maker: boolean) {
  const side = trade.bid_account_id === accountIndex ? "B" : "A";
  const before = Number(maker ? trade.maker_position_size_before : trade.taker_position_size_before);
  const size = Number(trade.size);
  if (!Number.isFinite(before) || !Number.isFinite(size)) return { side, dir: "Open" };
  const delta = side === "B" ? size : -size;
  const after = before + delta;
  const closes = before !== 0 && (Math.sign(before) !== Math.sign(delta) || Math.abs(after) < Math.abs(before));
  return { side, dir: closes ? "Close" : "Open" };
}

export function normalizeLighterTrades(trades: LighterTrade[], accountIndex: number, markets: Map<number, string>): RawFill[] {
  const seen = new Set<string>();
  return trades.flatMap((trade) => {
    const id = String(trade.trade_id_str ?? trade.trade_id);
    if (seen.has(id) || (trade.ask_account_id !== accountIndex && trade.bid_account_id !== accountIndex)) return [];
    seen.add(id);
    const maker = isUserMaker(trade, accountIndex);
    const userIsAsk = trade.ask_account_id === accountIndex;
    const feeRatePartsPerMillion = maker ? (trade.maker_fee ?? 0) : (trade.taker_fee ?? 0);
    const usdAmount = Number(trade.usd_amount || Number(trade.price) * Number(trade.size));
    const fee = Number.isFinite(usdAmount) ? usdAmount * feeRatePartsPerMillion / 1_000_000 : 0;
    const { side, dir } = directionFor(trade, accountIndex, maker);
    const timestamp = trade.timestamp || Math.floor((trade.transaction_time ?? 0) / 1_000);
    return [{
      venue: "lighter" as const,
      time: timestamp < 1_000_000_000_000 ? timestamp * 1_000 : timestamp,
      px: trade.price,
      sz: trade.size,
      closedPnl: userIsAsk ? (trade.ask_account_pnl ?? "0") : (trade.bid_account_pnl ?? "0"),
      fee: String(fee),
      coin: markets.get(trade.market_id) ?? `Market ${trade.market_id}`,
      tid: `lighter:${accountIndex}:${id}`,
      side,
      dir,
      crossed: !maker,
    }];
  });
}

async function fetchAccountTrades(accountIndex: number, token: string, signal: AbortSignal, fetcher: Fetcher) {
  const rows: LighterTrade[] = [];
  let cursor: string | undefined;
  let historyLimited = false;
  for (let page = 0; page < MAX_TRADE_PAGES; page += 1) {
    const url = new URL("/api/v1/trades", LIGHTER_API);
    url.searchParams.set("account_index", String(accountIndex));
    url.searchParams.set("market_type", "perp");
    url.searchParams.set("sort_by", "timestamp");
    url.searchParams.set("sort_dir", "desc");
    url.searchParams.set("role", "all");
    url.searchParams.set("type", "all");
    url.searchParams.set("limit", "100");
    if (cursor) url.searchParams.set("cursor", cursor);
    const data = await getJson<TradesResponse>(url, signal, fetcher, token);
    const batch = data.trades ?? [];
    rows.push(...batch);
    if (batch.length < 100 || !data.next_cursor || data.next_cursor === cursor) break;
    cursor = data.next_cursor;
    if (page === MAX_TRADE_PAGES - 1) historyLimited = true;
  }
  return { rows, historyLimited };
}

async function fetchAccountPnl(accountIndex: number, token: string, signal: AbortSignal, fetcher: Fetcher) {
  const url = new URL("/api/v1/pnl", LIGHTER_API);
  url.searchParams.set("by", "index");
  url.searchParams.set("value", String(accountIndex));
  url.searchParams.set("resolution", "1d");
  url.searchParams.set("start_timestamp", String(MAINNET_GENESIS_SECONDS));
  url.searchParams.set("end_timestamp", String(Math.floor(Date.now() / 1_000)));
  url.searchParams.set("count_back", "0");
  // Lighter's chart derives lifetime trading PnL from collateral flows. When
  // transfers are ignored, the final point can instead equal current account
  // equity (for example, a nearly empty account can appear close to $0 PnL).
  url.searchParams.set("ignore_transfers", "false");
  const data = await getJson<PnlResponse>(url, signal, fetcher, token);
  const latest = data.pnl?.toSorted((a, b) => Number(a.timestamp ?? 0) - Number(b.timestamp ?? 0)).at(-1);
  const value = Number(latest?.trade_pnl);
  return Number.isFinite(value) ? value : null;
}

export async function fetchLighterReport(address: string, token: string, signal: AbortSignal, fetcher: Fetcher = fetch): Promise<LighterReportSource> {
  const details = parseLighterReadOnlyToken(token);
  const accounts = await getAccounts(address, signal, fetcher);
  if (!accounts.some((account) => account.index === details.accountIndex))
    throw new LighterAuthError("This Lighter token belongs to a different wallet address.");
  const selected = details.scope === "all" ? accounts : accounts.filter((account) => account.index === details.accountIndex);
  const marketUrl = new URL("/api/v1/orderBookDetails", LIGHTER_API);
  const marketsPromise = getJson<MarketsResponse>(marketUrl, signal, fetcher);
  const accountPromises = selected.map(async (account) => {
    const [trades, pnl] = await Promise.all([
      fetchAccountTrades(account.index, token, signal, fetcher),
      fetchAccountPnl(account.index, token, signal, fetcher),
    ]);
    return { accountIndex: account.index, ...trades, pnl };
  });
  const [marketData, accountData] = await Promise.all([marketsPromise, Promise.all(accountPromises)]);
  const markets = new Map((marketData.order_book_details ?? [])
    .filter((market) => market.market_type === "perp")
    .map((market) => [market.market_id, market.symbol]));
  const rawFills = accountData.flatMap((account) => normalizeLighterTrades(account.rows, account.accountIndex, markets));
  const pnlValues = accountData.map((account) => account.pnl).filter((value): value is number => value != null);
  return {
    rawFills,
    portfolioPnl: pnlValues.length ? pnlValues.reduce((sum, value) => sum + value, 0) : null,
    historyLimited: accountData.some((account) => account.historyLimited),
    active: rawFills.length > 0,
  };
}
