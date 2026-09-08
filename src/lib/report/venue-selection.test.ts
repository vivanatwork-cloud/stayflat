import { describe, expect, it } from "vitest";
import { parseRequestedVenues, requestedWalletVenues } from "./venue-selection";

describe("parseRequestedVenues", () => {
  it("accepts multiple supported venues", () => {
    expect(parseRequestedVenues(["hyperliquid", "arcus", "lighter"]))
      .toEqual(["hyperliquid", "arcus", "lighter"]);
  });

  it("removes duplicate venues", () => {
    expect(parseRequestedVenues(["arcus", "arcus"])).toEqual(["arcus"]);
  });

  it("uses a legacy fallback that does not require a Lighter token", () => {
    expect(parseRequestedVenues(undefined)).toEqual(["hyperliquid", "arcus"]);
  });

  it("rejects an empty selection and unsupported exchanges", () => {
    expect(parseRequestedVenues([])).toBeNull();
    expect(parseRequestedVenues(["other"])).toBeNull();
  });
});

describe("requestedWalletVenues", () => {
  it("always scans both public venues", () => {
    expect(requestedWalletVenues(false)).toEqual(["hyperliquid", "arcus"]);
  });

  it("adds Lighter only when requested", () => {
    expect(requestedWalletVenues(true)).toEqual(["hyperliquid", "arcus", "lighter"]);
  });
});
