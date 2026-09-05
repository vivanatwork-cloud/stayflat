import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";
import { api } from "../../../../convex/_generated/api";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in to send a request." }, { status: 401 });
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const writeSecret = process.env.PAYMENT_WRITE_SECRET;
  if (!convexUrl || !writeSecret)
    return NextResponse.json({ error: "Requests are unavailable right now." }, { status: 503 });
  const body = await request.json();
  if (typeof body.exchange !== "string" || !body.exchange.trim())
    return NextResponse.json({ error: "Enter the exchange you want us to support." }, { status: 400 });
  const convex = new ConvexHttpClient(convexUrl);
  await convex.mutation(api.exchangeRequests.submit, { writeSecret, ownerId: userId, exchange: body.exchange });
  return NextResponse.json({ ok: true });
}
