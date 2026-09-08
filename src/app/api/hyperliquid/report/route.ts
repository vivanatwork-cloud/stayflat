import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { fetchQuery } from "convex/nextjs";
import { NextResponse } from "next/server";
import type { RawFill } from "@/lib/hyperliquid/metrics";
import { fetchArcusReport } from "@/lib/arcus/client";
import { buildMultiVenueMetrics, type VenueSource } from "@/lib/report/multi-venue";
import { fetchLighterReport, inspectLighterAddress, LighterAuthError } from "@/lib/lighter/client";
import { api } from "../../../../../convex/_generated/api";
import { getConvexToken } from "@/lib/convex-auth";

const API = "https://api.hyperliquid.xyz/info";
const walletPattern = /^0x[0-9a-fA-F]{40}$/;
export const maxDuration = 60;

async function postInfo(body: object, signal: AbortSignal) {
  const response = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.any([signal, AbortSignal.timeout(12_000)]), cache: "no-store" });
  if (!response.ok) throw new Error(`Hyperliquid returned ${response.status}`);
  return response.json();
}

async function fetchFills(address: string, signal: AbortSignal) {
  const fills: RawFill[] = []; const seen = new Set<string>(); let startTime = 0;
  let historyLimited = false;
  for (let page = 0; page < 6; page += 1) {
    const batch = await postInfo({ type: "userFillsByTime", user: address, startTime, aggregateByTime: true }, signal);
    if (!Array.isArray(batch) || !batch.length) break;
    let latest = startTime;
    batch.forEach((fill: RawFill & { hash?: string; oid?: string }) => { const key = fill.tid == null ? `${fill.hash}-${fill.oid}-${fill.time}` : String(fill.tid); if (!seen.has(key)) { seen.add(key); fills.push({ ...fill, venue: "hyperliquid" }); } latest = Math.max(latest, Number(fill.time)); });
    if (batch.length < 2000 || latest <= startTime) break;
    if (page === 5) historyLimited = true;
    startTime = latest + 1;
  }
  return { fills, historyLimited };
}

async function fetchPortfolio(address: string, signal: AbortSignal) {
  try { const data = await postInfo({ type: "portfolio", user: address }, signal); if (!Array.isArray(data)) return null; const allTime = data.find((item) => Array.isArray(item) && item[0] === "perpAllTime"); const history = allTime?.[1]?.pnlHistory; return Array.isArray(history) && history.length ? Number(history.at(-1)[1]) : null; } catch { return null; }
}

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
    const [hyperliquidResult, arcusResult, lighterResult] = await Promise.allSettled([
      Promise.all([fetchFills(address, reportSignal), fetchPortfolio(address, reportSignal)]),
      fetchArcusReport(address, reportSignal),
      trimmedLighterToken
        ? fetchLighterReport(address, trimmedLighterToken, reportSignal)
        : inspectLighterAddress(address, reportSignal),
    ]);
    if (!trimmedLighterToken && lighterResult.status === "fulfilled" && lighterResult.value.active)
      return NextResponse.json({
        error: "This wallet has Lighter activity. Add a Lighter read-only token to include its complete history.",
        code: "LIGHTER_TOKEN_REQUIRED",
      }, { status: 428 });
    if (trimmedLighterToken && lighterResult.status === "rejected" && lighterResult.reason instanceof LighterAuthError)
      return NextResponse.json({ error: lighterResult.reason.message, code: "LIGHTER_TOKEN_INVALID" }, { status: 400 });
    const unavailable = (): VenueSource => ({ rawFills: [], portfolioPnl: null, historyLimited: false, unavailable: true });
    const hyperliquid: VenueSource = hyperliquidResult.status === "fulfilled"
      ? { rawFills: hyperliquidResult.value[0].fills, portfolioPnl: hyperliquidResult.value[1], historyLimited: hyperliquidResult.value[0].historyLimited }
      : unavailable();
    const arcus: VenueSource = arcusResult.status === "fulfilled"
      ? { rawFills: arcusResult.value.rawFills, portfolioPnl: arcusResult.value.portfolioPnl, historyLimited: arcusResult.value.historyLimited }
      : unavailable();
    const lighter: VenueSource = trimmedLighterToken && lighterResult.status === "fulfilled" && "rawFills" in lighterResult.value
      ? {
          rawFills: lighterResult.value.rawFills,
          portfolioPnl: lighterResult.value.portfolioPnl,
          portfolioVolume: lighterResult.value.portfolioVolume,
          historyLimited: lighterResult.value.historyLimited,
        }
      : trimmedLighterToken && lighterResult.status === "rejected" ? unavailable() : { rawFills: [], portfolioPnl: null, historyLimited: false };
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
