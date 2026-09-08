import { computeMetrics, type RawFill, type ReportMetrics } from "../hyperliquid/metrics";

export type VenueName = "hyperliquid" | "arcus" | "lighter";
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
  lighter?: VenueSnapshot;
  activeVenues: VenueName[];
};
export type VenueSource = {
  rawFills: RawFill[];
  portfolioPnl: number | null;
  portfolioVolume?: number | null;
  historyLimited: boolean;
  unavailable?: boolean;
};

export function mergeVenueSources(sources: VenueSource[]): VenueSource {
  const available = sources.filter((source) => !source.unavailable);
  if (!available.length)
    return { rawFills: [], portfolioPnl: null, portfolioVolume: null, historyLimited: false, unavailable: true };
  const pnl = available.map((source) => source.portfolioPnl).filter((value): value is number => value != null);
  const volume = available.map((source) => source.portfolioVolume).filter((value): value is number => value != null);
  return {
    rawFills: available.flatMap((source) => source.rawFills),
    portfolioPnl: pnl.length ? pnl.reduce((sum, value) => sum + value, 0) : null,
    portfolioVolume: volume.length === available.length ? volume.reduce((sum, value) => sum + value, 0) : null,
    historyLimited: available.some((source) => source.historyLimited),
  };
}

const emptyMetrics = (): ReportMetrics => computeMetrics([], null);

export function buildMultiVenueMetrics(
  sources: { hyperliquid: VenueSource; arcus: VenueSource; lighter?: VenueSource },
  timezoneOffsetMinutes = 0,
): MultiVenueMetrics {
  const normalizedSources: Record<VenueName, VenueSource> = {
    hyperliquid: sources.hyperliquid,
    arcus: sources.arcus,
    lighter: sources.lighter ?? { rawFills: [], portfolioPnl: null, historyLimited: false, unavailable: true },
  };
  const metricFor = (venue: VenueName) => {
    const source = normalizedSources[venue];
    const metrics = source.unavailable
      ? emptyMetrics()
      : { ...computeMetrics(source.rawFills, source.portfolioPnl, timezoneOffsetMinutes, source.portfolioVolume), historyLimited: source.historyLimited, generatedAt: Date.now() };
    return { venue, active: !source.unavailable && source.rawFills.length > 0, metrics, ...(source.unavailable ? { unavailable: true } : {}) };
  };
  const hyperliquid = metricFor("hyperliquid");
  const arcus = metricFor("arcus");
  const lighter = metricFor("lighter");
  const snapshots = { hyperliquid, arcus, lighter };
  const activeVenues = (["hyperliquid", "arcus", "lighter"] as const).filter((venue) => snapshots[venue].active);
  const readySources = activeVenues.map((venue) => normalizedSources[venue]);
  const allFills = readySources.flatMap((source) => source.rawFills).toSorted((a, b) => Number(a.time) - Number(b.time));
  const pnlValues = readySources.map((source) => source.portfolioPnl).filter((value): value is number => value != null);
  const combinedVolume = readySources.reduce((sum, source) => sum + (source.portfolioVolume ?? source.rawFills.reduce((venueSum, fill) => venueSum + Number(fill.px) * Number(fill.sz), 0)), 0);
  const combined = {
    ...computeMetrics(allFills, pnlValues.length ? pnlValues.reduce((sum, value) => sum + value, 0) : null, timezoneOffsetMinutes, combinedVolume),
    historyLimited: readySources.some((source) => source.historyLimited),
    generatedAt: Date.now(),
  };
  return { combined, hyperliquid, arcus, lighter, activeVenues };
}

export function legacyMultiVenueMetrics(metrics: ReportMetrics): MultiVenueMetrics {
  return {
    combined: metrics,
    hyperliquid: { venue: "hyperliquid", active: !metrics.empty, metrics },
    arcus: { venue: "arcus", active: false, unavailable: true, metrics: emptyMetrics() },
    lighter: { venue: "lighter", active: false, unavailable: true, metrics: emptyMetrics() },
    activeVenues: metrics.empty ? [] : ["hyperliquid"],
  };
}
