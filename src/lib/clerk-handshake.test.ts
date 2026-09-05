import { describe, expect, it } from "vitest";
import { getSafeHandshakeRedirect } from "./clerk-handshake";

describe("getSafeHandshakeRedirect", () => {
  it("returns a same-site destination for an old Clerk handshake", () => {
    const request = new URL(
      "https://stayflat.xyz/__clerk/v1/client/handshake?redirect_url=https%3A%2F%2Fstayflat.xyz%2Freport",
    );

    expect(getSafeHandshakeRedirect(request)?.href).toBe(
      "https://stayflat.xyz/report",
    );
  });

  it("does not redirect users to another site", () => {
    const request = new URL(
      "https://stayflat.xyz/__clerk/v1/client/handshake?redirect_url=https%3A%2F%2Fevil.example%2F",
    );

    expect(getSafeHandshakeRedirect(request)?.href).toBe("https://stayflat.xyz/");
  });

  it("ignores unrelated Clerk paths", () => {
    const request = new URL("https://stayflat.xyz/__clerk/v1/client");

    expect(getSafeHandshakeRedirect(request)).toBeNull();
  });
});
