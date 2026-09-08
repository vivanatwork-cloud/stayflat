import { auth, currentUser } from "@clerk/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { NextResponse } from "next/server";
import { api } from "../../../../../../convex/_generated/api";
import { getConvexToken } from "@/lib/convex-auth";
import { buildReportPdf } from "@/lib/report-pdf";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session.userId) return NextResponse.json({ error: "Sign in to download your portfolio report." }, { status: 401 });
  const [token, user] = await Promise.all([getConvexToken(session), currentUser()]);
  if (!token) return NextResponse.json({ error: "Portfolio download is unavailable right now." }, { status: 503 });
  const saved = await fetchQuery(api.payments.savedPortfolioReport, {}, { token });
  const metrics = saved?.report.combined;
  if (!saved || !metrics || metrics.empty) return NextResponse.json({ error: "Saved portfolio report not found." }, { status: 404 });
  const accountEmail = user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses[0]?.emailAddress ?? "unknown";
  const bytes = await buildReportPdf({ address: saved.addresses[0], addresses: saved.addresses, metrics, report: saved.report, accountEmail });
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "attachment; filename=\"stayflat-portfolio-report.pdf\"",
      "Cache-Control": "private, no-store",
    },
  });
}
