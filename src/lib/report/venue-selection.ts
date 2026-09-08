import type { VenueName } from "./multi-venue";

export const DEFAULT_REPORT_VENUES: readonly VenueName[] = ["hyperliquid", "arcus"];
const supportedVenues = new Set<VenueName>(["hyperliquid", "arcus", "lighter"]);

export function parseRequestedVenues(
  value: unknown,
  fallback: readonly VenueName[] = DEFAULT_REPORT_VENUES,
): VenueName[] | null {
  if (value == null) return [...fallback];
  if (!Array.isArray(value) || value.length === 0) return null;

  const venues: VenueName[] = [];
  for (const venue of value) {
    if (typeof venue !== "string" || !supportedVenues.has(venue as VenueName)) return null;
    if (!venues.includes(venue as VenueName)) venues.push(venue as VenueName);
  }
  return venues;
}
