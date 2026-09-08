import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { fetchQuery } from "convex/nextjs";
import { NextResponse } from "next/server";
import { api } from "../../../../../convex/_generated/api";
import { getConvexToken } from "@/lib/convex-auth";
import { LighterAuthError } from "@/lib/lighter/client";
import { parseBatchWallets } from "@/lib/report/batch-input";
import { fetchWalletVenueSources, LighterTokenRequiredError } from "@/lib/report/fetch-wallet";
import { buildMultiVenueMetrics, mergeVenueSources } from "@/lib/report/multi-venue";
import { requestedWalletVenues } from "@/lib/report/venue-selection";

export const maxDuration = 120;

const shortAddress = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`;

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session.userId) return NextResponse.json({ error: "Sign in to generate reports." }, { status: 401 });
    const token = await getConvexToken(session);
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    const writeSecret = process.env.PAYMENT_WRITE_SECRET;
    if (!token || !convexUrl || !writeSecret) return NextResponse.json({ error: "Wallet reports are unavailable right now." }, { status: 503 });

    const access = await fetchQuery(api.payments.reportAccess, {}, { token });
    if (access.blocked)
      return NextResponse.json({ error: "Report generation is blocked for this account. Contact support if you think this is a mistake.", code: "ACCESS_BLOCKED" }, { status: 403 });

    const body = await request.json() as { wallets?: unknown; timezoneOffsetMinutes?: unknown };
    const wallets = parseBatchWallets(body.wallets);
    if (!wallets)
      return NextResponse.json({ error: "Enter 1 to 10 unique wallet addresses. Add a read-only key for every wallet using Lighter." }, { status: 400 });
    const offset = typeof body.timezoneOffsetMinutes === "number" && Math.abs(body.timezoneOffsetMinutes) <= 840 ? body.timezoneOffsetMinutes : 0;
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(110_000)]);
    const settled = await Promise.allSettled(wallets.map((wallet) => fetchWalletVenueSources(
      wallet.address,
      wallet.lighterToken,
      signal,
      requestedWalletVenues(wallet.includeLighter),
    )));

    const missingKey = settled.findIndex((result) => result.status === "rejected" && result.reason instanceof LighterTokenRequiredError);
    if (missingKey >= 0)
      return NextResponse.json({ error: `Add a Lighter read-only key for ${shortAddress(wallets[missingKey].address)}.`, code: "LIGHTER_TOKEN_REQUIRED", address: wallets[missingKey].address }, { status: 428 });
    const invalidKey = settled.findIndex((result) => result.status === "rejected" && result.reason instanceof LighterAuthError);
    if (invalidKey >= 0)
      return NextResponse.json({ error: `The Lighter key for ${shortAddress(wallets[invalidKey].address)} is not valid.`, code: "LIGHTER_TOKEN_INVALID", address: wallets[invalidKey].address }, { status: 400 });
    const failed = settled.flatMap((result, index) => result.status === "rejected" ? [wallets[index].address] : []);
    if (failed.length)
      return NextResponse.json({ error: `We couldn't read ${failed.map(shortAddress).join(", ")}. No wallet was omitted or saved.` }, { status: 502 });

    const sources = settled.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
    const walletReports = wallets.map((wallet, index) => ({
      address: wallet.address,
      report: buildMultiVenueMetrics(sources[index], offset),
    }));
    const combined = buildMultiVenueMetrics({
      hyperliquid: mergeVenueSources(sources.map((source) => source.hyperliquid)),
      arcus: mergeVenueSources(sources.map((source) => source.arcus)),
      lighter: mergeVenueSources(sources.map((source) => source.lighter)),
    }, offset);
    const convex = new ConvexHttpClient(convexUrl);
    await convex.mutation(api.payments.recordReportBatch, {
      writeSecret,
      ownerId: session.userId,
      reports: walletReports,
      ...(wallets.length > 1 ? { portfolio: { addresses: wallets.map((wallet) => wallet.address), report: combined } } : {}),
    });
    const updatedAccess = await fetchQuery(api.payments.reportAccess, {}, { token });
    return NextResponse.json({
      address: wallets[0].address,
      ...(wallets.length > 1 ? { addresses: wallets.map((wallet) => wallet.address) } : {}),
      report: wallets.length > 1 ? combined : walletReports[0].report,
      walletReports,
      access: { used: updatedAccess.used, limit: updatedAccess.limit, unlimited: true, blocked: updatedAccess.blocked },
    });
  } catch (error) {
    const timeout = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    return NextResponse.json({ error: timeout ? "The exchanges took too long to respond. Try fewer wallets or try again." : "We couldn't build these reports right now. Try again shortly." }, { status: 502 });
  }
}
