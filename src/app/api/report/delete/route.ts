import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";
import { api } from "../../../../../convex/_generated/api";

const walletPattern = /^0x[0-9a-fA-F]{40}$/;

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session.userId) return NextResponse.json({ error: "Sign in to delete reports." }, { status: 401 });
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    const writeSecret = process.env.PAYMENT_WRITE_SECRET;
    if (!convexUrl || !writeSecret) return NextResponse.json({ error: "Report deletion is unavailable right now." }, { status: 503 });
    const body = await request.json() as { address?: unknown; portfolio?: unknown };
    const address = typeof body.address === "string" ? body.address.trim().toLowerCase() : undefined;
    const portfolio = body.portfolio === true;
    if (Boolean(address) === portfolio || (address && !walletPattern.test(address)))
      return NextResponse.json({ error: "Choose one valid report to delete." }, { status: 400 });
    const convex = new ConvexHttpClient(convexUrl);
    const result = await convex.mutation(api.payments.deleteSavedReport, { writeSecret, ownerId: session.userId, ...(address ? { address } : { portfolio: true }) });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "We couldn't delete this report. Try again." }, { status: 502 });
  }
}
