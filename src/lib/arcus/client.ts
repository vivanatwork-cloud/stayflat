import type { RawFill } from "@/lib/hyperliquid/metrics";

const ARCUS_API = "https://api.arcus.xyz";
const MAX_PAGES = 6;

export type ArcusFill = {
  tradeId: string;
  side: "BUY" | "SELL";
  size: string;
  price: string;
  fee: string;
  closedPnl: string;
  role: "MAKER" | "TAKER";
  positionEffect: string;
  marketDisplayName: string;
  createdAt: number;
};

type ArcusFillsResponse = { fills?: ArcusFill[]; error?: string };
type ArcusPortfolioResponse = { data?: [string, { pnlHistory?: [number, string][] }][] };

export type ArcusReportSource = {
  rawFills: RawFill[];
  portfolioPnl: number | null;
  historyLimited: boolean;
  active: boolean;
};

export function normalizeArcusFills(fills: ArcusFill[]): RawFill[] {
  const seen = new Set<string>();
  return fills.flatMap((fill) => {
    if (seen.has(fill.tradeId)) return [];
    seen.add(fill.tradeId);
    return [{
      venue: "arcus" as const,
      time: Math.floor(fill.createdAt / 1_000),
      px: fill.price,
      sz: fill.size,
      closedPnl: fill.closedPnl,
      fee: fill.fee,
      coin: fill.marketDisplayName.replace(/-USD$/i, ""),
      tid: `arcus:${fill.tradeId}`,
      side: fill.side === "BUY" ? "B" : "A",
      dir: fill.positionEffect.startsWith("CLOSE") ? "Close" : "Open",
      crossed: fill.role === "TAKER",
    }];
  });
}

function getPortfolioPnl(portfolio: ArcusPortfolioResponse): number | null {
  const history = portfolio.data?.find(([range]) => range === "perpAll")?.[1].pnlHistory;
  if (!history?.length) return null;
  const value = Number(history.at(-1)?.[1]);
  return Number.isFinite(value) ? value : null;
}

async function getJson<T>(url: URL, signal: AbortSignal): Promise<{ response: Response; data: T }> {
  const response = await fetch(url, { signal: AbortSignal.any([signal, AbortSignal.timeout(12_000)]), cache: "no-store" });
  return { response, data: await response.json() as T };
}

export async function fetchArcusReport(address: string, signal: AbortSignal): Promise<ArcusReportSource> {
  const portfolioUrl = new URL("/v1/portfolio", ARCUS_API);
  portfolioUrl.searchParams.set("address", address);
  const portfolioPromise = getJson<ArcusPortfolioResponse & { error?: string }>(portfolioUrl, signal);
  const rows: ArcusFill[] = [];
  const seen = new Set<string>();
  let to: number | undefined;
  let historyLimited = false;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const url = new URL("/v1/fills", ARCUS_API);
    url.searchParams.set("address", address);
    url.searchParams.set("limit", "1000");
    if (to != null) url.searchParams.set("to", String(to));
    const { response, data } = await getJson<ArcusFillsResponse>(url, signal);
    if (!response.ok) {
      if (response.status === 400 && data.error?.toLowerCase().includes("access whitelist")) {
        await portfolioPromise.catch(() => null);
        return { rawFills: [], portfolioPnl: null, historyLimited: false, active: false };
      }
      throw new Error(`Arcus returned ${response.status}`);
    }
    const batch = Array.isArray(data.fills) ? data.fills : [];
    for (const fill of batch) if (!seen.has(fill.tradeId)) { seen.add(fill.tradeId); rows.push(fill); }
    if (batch.length < 1000) break;
    const oldest = Math.min(...batch.map((fill) => fill.createdAt));
    if (to != null && oldest >= to) break;
    to = oldest - 1;
    if (page === MAX_PAGES - 1) historyLimited = true;
  }

  const portfolio = await portfolioPromise;
  const rawFills = normalizeArcusFills(rows);
  return {
    rawFills,
    portfolioPnl: portfolio.response.ok ? getPortfolioPnl(portfolio.data) : null,
    historyLimited,
    active: rawFills.length > 0,
  };
}
