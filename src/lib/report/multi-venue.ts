import { computeMetrics, type RawFill, type ReportMetrics } from "../hyperliquid/metrics";

export type VenueName = "hyperliquid" | "arcus";
export type VenueSnapshot = {
  venue: VenueName;
  active: boolean;
  metrics: ReportMetrics;
  unavailable?: boolean;
};
export type MultiVenueMetrics = {
  combined: ReportMetrics;
  hyperliquid: VenueSnapshot;
  arcus: VenueSnapshot;
  activeVenues: VenueName[];
};
export type VenueSource = {
  rawFills: RawFill[];
  portfolioPnl: number | null;
  historyLimited: boolean;
  unavailable?: boolean;
};

const emptyMetrics = (): ReportMetrics => computeMetrics([], null);

export function buildMultiVenueMetrics(
  sources: { hyperliquid: VenueSource; arcus: VenueSource },
  timezoneOffsetMinutes = 0,
): MultiVenueMetrics {
  const metricFor = (venue: VenueName) => {
    const source = sources[venue];
    const metrics = source.unavailable
      ? emptyMetrics()
      : { ...computeMetrics(source.rawFills, source.portfolioPnl, timezoneOffsetMinutes), historyLimited: source.historyLimited, generatedAt: Date.now() };
    return { venue, active: !source.unavailable && source.rawFills.length > 0, metrics, ...(source.unavailable ? { unavailable: true } : {}) };
  };
  const hyperliquid = metricFor("hyperliquid");
  const arcus = metricFor("arcus");
  const activeVenues = (["hyperliquid", "arcus"] as const).filter((venue) => venue === "hyperliquid" ? hyperliquid.active : arcus.active);
  const readySources = activeVenues.map((venue) => sources[venue]);
  const allFills = readySources.flatMap((source) => source.rawFills).toSorted((a, b) => Number(a.time) - Number(b.time));
  const pnlValues = readySources.map((source) => source.portfolioPnl).filter((value): value is number => value != null);
  const combined = {
    ...computeMetrics(allFills, pnlValues.length ? pnlValues.reduce((sum, value) => sum + value, 0) : null, timezoneOffsetMinutes),
    historyLimited: readySources.some((source) => source.historyLimited),
    generatedAt: Date.now(),
  };
  return { combined, hyperliquid, arcus, activeVenues };
}

export function legacyMultiVenueMetrics(metrics: ReportMetrics): MultiVenueMetrics {
  return {
    combined: metrics,
    hyperliquid: { venue: "hyperliquid", active: !metrics.empty, metrics },
    arcus: { venue: "arcus", active: false, unavailable: true, metrics: emptyMetrics() },
    activeVenues: metrics.empty ? [] : ["hyperliquid"],
  };
}
