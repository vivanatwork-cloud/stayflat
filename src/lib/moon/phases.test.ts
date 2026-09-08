import { describe, expect, it } from "vitest";
import { moonPhaseBoundaries } from "./phases";

describe("moonPhaseBoundaries", () => {
  it("matches published September 2026 moon phase times", () => {
    const boundaries = moonPhaseBoundaries(Date.UTC(2026, 8, 1), Date.UTC(2026, 9, 1));
    const newMoon = boundaries.find((item) => item.phase === "new" && new Date(item.occursAt).getUTCMonth() === 8)!;
    const fullMoon = boundaries.find((item) => item.phase === "full" && new Date(item.occursAt).getUTCMonth() === 8)!;
    expect(Math.abs(newMoon.occursAt - Date.parse("2026-09-11T03:27:00Z"))).toBeLessThan(2 * 60_000);
    expect(Math.abs(fullMoon.occursAt - Date.parse("2026-09-26T16:49:00Z"))).toBeLessThan(2 * 60_000);
  });

  it("covers the range and alternates boundaries across years", () => {
    const from = Date.UTC(2025, 11, 20);
    const to = Date.UTC(2026, 1, 10);
    const boundaries = moonPhaseBoundaries(from, to);
    expect(boundaries[0].occursAt).toBeLessThanOrEqual(from);
    expect(boundaries.at(-1)!.occursAt).toBeGreaterThan(to);
    boundaries.slice(1).forEach((item, index) => expect(item.phase).not.toBe(boundaries[index].phase));
  });
});
