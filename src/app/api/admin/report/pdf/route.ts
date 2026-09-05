import { auth, currentUser } from "@clerk/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { api } from "../../../../../../convex/_generated/api";
import type { Id } from "../../../../../../convex/_generated/dataModel";
import { isAdminEmail } from "@/lib/admin";
import { getConvexToken } from "@/lib/convex-auth";
import { buildReportPdf } from "@/lib/report-pdf";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await auth();
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses[0]?.emailAddress;
  if (!session.userId || !isAdminEmail(email)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const walletId = request.nextUrl.searchParams.get("id") as Id<"reportWallets"> | null;
  const token = await getConvexToken(session);
  if (!walletId || !token) return NextResponse.json({ error: "Report is required." }, { status: 400 });
  const report = await fetchQuery(api.admin.reportForAdmin, { walletId }, { token });
  if (!report || report.metrics.empty) return NextResponse.json({ error: "Report not found." }, { status: 404 });
  const bytes = await buildReportPdf({ address: report.address, metrics: report.metrics });
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="stayflat-${report.address.slice(0, 8)}-report.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
