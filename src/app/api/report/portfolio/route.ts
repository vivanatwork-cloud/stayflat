import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { fetchQuery } from "convex/nextjs";
import { NextResponse } from "next/server";
import { api } from "../../../../../convex/_generated/api";
import { getConvexToken } from "@/lib/convex-auth";
import { LighterAuthError } from "@/lib/lighter/client";
import { fetchWalletVenueSources, LighterTokenRequiredError } from "@/lib/report/fetch-wallet";
import { buildMultiVenueMetrics, mergeVenueSources } from "@/lib/report/multi-venue";
import { parseRequestedVenues } from "@/lib/report/venue-selection";

const walletPattern = /^0x[0-9a-fA-F]{40}$/;
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session.userId) return NextResponse.json({ error: "Sign in to generate your portfolio report." }, { status: 401 });
    const token = await getConvexToken(session);
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    const writeSecret = process.env.PAYMENT_WRITE_SECRET;
    if (!token || !convexUrl || !writeSecret) return NextResponse.json({ error: "Portfolio reports are unavailable right now." }, { status: 503 });
    const body = await request.json() as { addresses?: unknown; lighterTokens?: unknown; venuesByAddress?: unknown; timezoneOffsetMinutes?: unknown };
    const rawAddresses: unknown[] = Array.isArray(body.addresses) ? body.addresses : [];
    const addresses: string[] = [...new Set(rawAddresses.filter((value): value is string => typeof value === "string").map((value) => value.toLowerCase()))];
    if (addresses.length < 2 || addresses.some((address) => !walletPattern.test(address)))
      return NextResponse.json({ error: "Select at least two valid saved wallet addresses." }, { status: 400 });
    const access = await fetchQuery(api.payments.reportAccess, {}, { token });
    if (access.blocked)
      return NextResponse.json({ error: "Report generation is blocked for this account. Contact support if you think this is a mistake.", code: "ACCESS_BLOCKED" }, { status: 403 });
    if (addresses.some((address) => !access.addresses.includes(address)))
      return NextResponse.json({ error: "Portfolio reports can only include your saved wallets." }, { status: 403 });
    const lighterTokens = body.lighterTokens && typeof body.lighterTokens === "object" ? body.lighterTokens as Record<string, unknown> : {};
    const venuesByAddress = body.venuesByAddress && typeof body.venuesByAddress === "object" ? body.venuesByAddress as Record<string, unknown> : {};
    const requestedVenues = addresses.map((address) => parseRequestedVenues(venuesByAddress[address]));
    if (requestedVenues.some((venues) => !venues))
      return NextResponse.json({ error: "Choose at least one supported exchange for every wallet." }, { status: 400 });
    const offset = typeof body.timezoneOffsetMinutes === "number" && Math.abs(body.timezoneOffsetMinutes) <= 840 ? body.timezoneOffsetMinutes : 0;
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(110_000)]);
    const settled = await Promise.allSettled(addresses.map((address, index) => {
      const lighterToken = lighterTokens[address];
      return fetchWalletVenueSources(address, typeof lighterToken === "string" ? lighterToken.trim() : "", signal, requestedVenues[index]!);
    }));
    const required = settled.flatMap((result) => result.status === "rejected" && result.reason instanceof LighterTokenRequiredError ? [result.reason.address] : []);
    if (required.length)
      return NextResponse.json({ error: "Add a Lighter read-only token for the marked wallets.", code: "LIGHTER_TOKENS_REQUIRED", addresses: required }, { status: 428 });
    const invalidToken = settled.find((result) => result.status === "rejected" && result.reason instanceof LighterAuthError);
    if (invalidToken?.status === "rejected")
      return NextResponse.json({ error: invalidToken.reason.message, code: "LIGHTER_TOKEN_INVALID" }, { status: 400 });
    const failed = settled.flatMap((result, index) => result.status === "rejected" ? [addresses[index]] : []);
    if (failed.length)
      return NextResponse.json({ error: `We couldn't read ${failed.map((address) => `${address.slice(0, 6)}…${address.slice(-4)}`).join(", ")}. No wallet was omitted.` }, { status: 502 });
    const sources = settled.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
    const report = buildMultiVenueMetrics({
      hyperliquid: mergeVenueSources(sources.map((source) => source.hyperliquid)),
      arcus: mergeVenueSources(sources.map((source) => source.arcus)),
      lighter: mergeVenueSources(sources.map((source) => source.lighter)),
    }, offset);
    const convex = new ConvexHttpClient(convexUrl);
    await convex.mutation(api.payments.recordPortfolioReport, { writeSecret, ownerId: session.userId, addresses, report });
    return NextResponse.json({ addresses, report });
  } catch (error) {
    const timeout = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    return NextResponse.json({ error: timeout ? "The exchanges took too long to build this portfolio. Try again." : "We couldn't build the portfolio report right now." }, { status: 502 });
  }
}
