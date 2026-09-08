import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { fetchQuery } from "convex/nextjs";
import { NextResponse } from "next/server";
import { buildMultiVenueMetrics } from "@/lib/report/multi-venue";
import { fetchWalletVenueSources, LighterTokenRequiredError } from "@/lib/report/fetch-wallet";
import { LighterAuthError } from "@/lib/lighter/client";
import { api } from "../../../../../convex/_generated/api";
import { getConvexToken } from "@/lib/convex-auth";

const walletPattern = /^0x[0-9a-fA-F]{40}$/;
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const reportSignal = AbortSignal.any([request.signal, AbortSignal.timeout(45_000)]);
    const session = await auth();
    const { userId } = session;
    if (!userId)
      return NextResponse.json({ error: "Sign in to generate your report." }, { status: 401 });

    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl)
      return NextResponse.json({ error: "Payment verification is unavailable right now." }, { status: 503 });
    const token = await getConvexToken(session);
    if (!token)
      return NextResponse.json({ error: "Sign in again to generate your report." }, { status: 401 });
    const convex = new ConvexHttpClient(convexUrl);
    const access = await fetchQuery(api.payments.reportAccess, {}, { token });
    if (access.limit === 0)
      return NextResponse.json({ error: "Complete payment to generate your report." }, { status: 402 });

    const { address, timezoneOffsetMinutes, lighterToken } = await request.json();
    if (typeof address !== "string" || !walletPattern.test(address)) return NextResponse.json({ error: "Enter a valid 42-character wallet address." }, { status: 400 });
    const normalizedAddress = address.toLowerCase();
    const existingAddress = access.addresses.includes(normalizedAddress);
    if (!existingAddress && access.used >= access.limit)
      return NextResponse.json(
        { error: `You have used all ${access.limit} address slots. Buy another report bundle to check three more addresses.`, code: "REPORT_LIMIT_REACHED" },
        { status: 402 },
      );
    const offset = typeof timezoneOffsetMinutes === "number" && Math.abs(timezoneOffsetMinutes) <= 840 ? timezoneOffsetMinutes : 0;
    if (lighterToken != null && typeof lighterToken !== "string")
      return NextResponse.json({ error: "The Lighter token is not valid.", code: "LIGHTER_TOKEN_INVALID" }, { status: 400 });
    const trimmedLighterToken = typeof lighterToken === "string" ? lighterToken.trim() : "";
    let sources;
    try {
      sources = await fetchWalletVenueSources(normalizedAddress, trimmedLighterToken, reportSignal);
    } catch (error) {
      if (error instanceof LighterTokenRequiredError)
        return NextResponse.json({ error: "This wallet has Lighter activity. Add a Lighter read-only token to include its complete history.", code: "LIGHTER_TOKEN_REQUIRED" }, { status: 428 });
      if (error instanceof LighterAuthError)
        return NextResponse.json({ error: error.message, code: "LIGHTER_TOKEN_INVALID" }, { status: 400 });
      throw error;
    }
    const { hyperliquid, arcus, lighter } = sources;
    if (hyperliquid.unavailable && arcus.unavailable && lighter.unavailable) throw new Error("All venues unavailable");
    const report = buildMultiVenueMetrics({ hyperliquid, arcus, lighter }, offset);
    const writeSecret = process.env.PAYMENT_WRITE_SECRET;
    if (!writeSecret) throw new Error("Payment write is unavailable");
    try {
      await convex.mutation(api.payments.recordReportWallet, { writeSecret, ownerId: userId, address: normalizedAddress, report });
    } catch (error) {
      if (error instanceof Error && error.message.includes("REPORT_LIMIT_REACHED"))
        return NextResponse.json({ error: "Your address limit was reached. Buy another report bundle to continue.", code: "REPORT_LIMIT_REACHED" }, { status: 402 });
      throw error;
    }
    const updatedAccess = await fetchQuery(api.payments.reportAccess, {}, { token });
    return NextResponse.json({ address: normalizedAddress, report, access: { used: updatedAccess.used, limit: updatedAccess.limit } });
  } catch (error) {
    const timeout = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    return NextResponse.json({ error: timeout ? "The exchanges took too long to respond. Try again." : "We couldn't read the exchanges right now. Try again shortly." }, { status: 502 });
  }
}
