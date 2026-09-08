import { NextMoonQuarter, SearchMoonQuarter } from "astronomy-engine";
import type { MoonPhaseBoundary } from "./performance";

const DAY_MS = 24 * 60 * 60 * 1000;

export function moonPhaseBoundaries(dateFrom: number, dateTo: number): MoonPhaseBoundary[] {
  if (!Number.isFinite(dateFrom) || !Number.isFinite(dateTo) || dateFrom > dateTo) return [];
  const boundaries: MoonPhaseBoundary[] = [];
  let quarter = SearchMoonQuarter(new Date(dateFrom - 40 * DAY_MS));
  let foundAfterRange = false;

  for (let index = 0; index < 10_000 && !foundAfterRange; index += 1) {
    if (quarter.quarter === 0 || quarter.quarter === 2) {
      const boundary = {
        phase: quarter.quarter === 0 ? "new" as const : "full" as const,
        occursAt: quarter.time.date.getTime(),
      };
      boundaries.push(boundary);
      foundAfterRange = boundary.occursAt > dateTo;
    }
    if (!foundAfterRange) quarter = NextMoonQuarter(quarter);
  }

  const firstRelevant = Math.max(0, boundaries.findLastIndex((boundary) => boundary.occursAt <= dateFrom));
  return boundaries.slice(firstRelevant);
}
