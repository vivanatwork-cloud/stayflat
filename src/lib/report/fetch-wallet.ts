import type { RawFill } from "@/lib/hyperliquid/metrics";
import { fetchArcusReport } from "@/lib/arcus/client";
import { fetchLighterReport, LighterAuthError } from "@/lib/lighter/client";
import type { VenueName, VenueSource } from "@/lib/report/multi-venue";

const HYPERLIQUID_API = "https://api.hyperliquid.xyz/info";

export class LighterTokenRequiredError extends Error {
  constructor(public address: string) {
    super("A Lighter read-only token is required.");
    this.name = "LighterTokenRequiredError";
  }
}

async function postInfo(body: object, signal: AbortSignal) {
  const response = await fetch(HYPERLIQUID_API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.any([signal, AbortSignal.timeout(12_000)]),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Hyperliquid returned ${response.status}`);
  return response.json();
}

async function fetchHyperliquidFills(address: string, signal: AbortSignal) {
  const fills: RawFill[] = [];
  const seen = new Set<string>();
  let startTime = 0;
  let historyLimited = false;
  for (let page = 0; page < 6; page += 1) {
    const batch = await postInfo({ type: "userFillsByTime", user: address, startTime, aggregateByTime: true }, signal);
    if (!Array.isArray(batch) || !batch.length) break;
    let latest = startTime;
    batch.forEach((fill: RawFill & { hash?: string; oid?: string }) => {
      const key = fill.tid == null ? `${fill.hash}-${fill.oid}-${fill.time}` : String(fill.tid);
      if (!seen.has(key)) {
        seen.add(key);
        fills.push({ ...fill, venue: "hyperliquid", wallet: address });
      }
      latest = Math.max(latest, Number(fill.time));
    });
    if (batch.length < 2000 || latest <= startTime) break;
    if (page === 5) historyLimited = true;
    startTime = latest + 1;
  }
  return { fills, historyLimited };
}

async function fetchHyperliquidPnl(address: string, signal: AbortSignal) {
  try {
    const data = await postInfo({ type: "portfolio", user: address }, signal);
    if (!Array.isArray(data)) return null;
    const allTime = data.find((item) => Array.isArray(item) && item[0] === "perpAllTime");
    const history = allTime?.[1]?.pnlHistory;
    return Array.isArray(history) && history.length ? Number(history.at(-1)[1]) : null;
  } catch { return null; }
}

const unavailable = (): VenueSource => ({ rawFills: [], portfolioPnl: null, historyLimited: false, unavailable: true });
const tagWallet = (source: VenueSource, wallet: string): VenueSource => ({
  ...source,
  rawFills: source.rawFills.map((fill) => ({ ...fill, wallet })),
});

export async function fetchWalletVenueSources(address: string, lighterToken: string, signal: AbortSignal, requestedVenues: readonly VenueName[]) {
  const normalizedAddress = address.toLowerCase();
  const selected = new Set(requestedVenues);
  if (selected.has("lighter") && !lighterToken) throw new LighterTokenRequiredError(normalizedAddress);
  const [hyperliquidResult, arcusResult, lighterResult] = await Promise.allSettled([
    selected.has("hyperliquid") ? Promise.all([fetchHyperliquidFills(normalizedAddress, signal), fetchHyperliquidPnl(normalizedAddress, signal)]) : Promise.resolve(null),
    selected.has("arcus") ? fetchArcusReport(normalizedAddress, signal) : Promise.resolve(null),
    selected.has("lighter") ? fetchLighterReport(normalizedAddress, lighterToken, signal) : Promise.resolve(null),
  ]);
  if (selected.has("lighter") && lighterResult.status === "rejected" && lighterResult.reason instanceof LighterAuthError)
    throw lighterResult.reason;
  const hyperliquid: VenueSource = selected.has("hyperliquid") && hyperliquidResult.status === "fulfilled" && hyperliquidResult.value
    ? { rawFills: hyperliquidResult.value[0].fills, portfolioPnl: hyperliquidResult.value[1], historyLimited: hyperliquidResult.value[0].historyLimited }
    : unavailable();
  const arcus: VenueSource = selected.has("arcus") && arcusResult.status === "fulfilled" && arcusResult.value
    ? tagWallet({ rawFills: arcusResult.value.rawFills, portfolioPnl: arcusResult.value.portfolioPnl, historyLimited: arcusResult.value.historyLimited }, normalizedAddress)
    : unavailable();
  const lighter: VenueSource = selected.has("lighter") && lighterResult.status === "fulfilled" && lighterResult.value
    ? tagWallet({
        rawFills: lighterResult.value.rawFills,
        portfolioPnl: lighterResult.value.portfolioPnl,
        portfolioVolume: lighterResult.value.portfolioVolume,
        historyLimited: lighterResult.value.historyLimited,
      }, normalizedAddress)
    : unavailable();
  return { hyperliquid, arcus, lighter };
}
