import { auth, currentUser } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { fetchQuery } from "convex/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { api } from "../../../../../convex/_generated/api";
import { getConvexToken } from "@/lib/convex-auth";
import { buildReportPdf } from "@/lib/report-pdf";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session.userId) return NextResponse.json({ error: "Sign in to download your report." }, { status: 401 });
  const address = request.nextUrl.searchParams.get("address")?.trim().toLowerCase();
  if (!address) return NextResponse.json({ error: "Wallet address is required." }, { status: 400 });

  const [token, user] = await Promise.all([getConvexToken(session), currentUser()]);
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const writeSecret = process.env.PAYMENT_WRITE_SECRET;
  if (!token || !convexUrl || !writeSecret) return NextResponse.json({ error: "PDF download is unavailable right now." }, { status: 503 });

  const saved = await fetchQuery(api.payments.savedReport, { address }, { token });
  const metrics = saved?.report?.combined ?? saved?.metrics;
  if (!saved || !metrics || metrics.empty) return NextResponse.json({ error: "Saved report not found." }, { status: 404 });
  const accountEmail = user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses[0]?.emailAddress ?? "unknown";
  const bytes = await buildReportPdf({ address: saved.address, metrics, report: saved.report, accountEmail });

  const convex = new ConvexHttpClient(convexUrl);
  await convex.mutation(api.payments.recordReportDownload, { writeSecret, ownerId: session.userId, address, accountEmail });
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="stayflat-${address.slice(0, 8)}-report.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
