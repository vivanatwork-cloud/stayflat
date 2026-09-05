import { auth } from "@clerk/nextjs/server";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { NextResponse } from "next/server";
import { api } from "../../../../convex/_generated/api";
import { getConvexToken } from "@/lib/convex-auth";
import { parseJournalState } from "@/lib/journal/validation";

function journalError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("PAYMENT_REQUIRED"))
    return NextResponse.json(
      { error: "Complete payment to use the trading journal." },
      { status: 402 },
    );
  return NextResponse.json(
    { error: "Journal sync is unavailable right now." },
    { status: 503 },
  );
}

export async function GET() {
  const session = await auth();
  const { userId } = session;
  if (!userId) return NextResponse.json({ error: "Sign in to open your journal." }, { status: 401 });
  const token = await getConvexToken(session);
  if (!token || !process.env.NEXT_PUBLIC_CONVEX_URL)
    return NextResponse.json({ error: "Journal sync is unavailable." }, { status: 503 });
  try {
    const journal = await fetchQuery(api.journals.get, {}, { token });
    return NextResponse.json({ journal });
  } catch (error) {
    return journalError(error);
  }
}

export async function PUT(request: Request) {
  const session = await auth();
  const { userId } = session;
  if (!userId) return NextResponse.json({ error: "Sign in to save your journal." }, { status: 401 });
  const token = await getConvexToken(session);
  if (!token || !process.env.NEXT_PUBLIC_CONVEX_URL)
    return NextResponse.json({ error: "Journal sync is unavailable." }, { status: 503 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Journal data is not valid JSON." }, { status: 400 });
  }
  const parsed = parseJournalState(body);
  if (!parsed.ok)
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  try {
    const result = await fetchMutation(
      api.journals.save,
      { startingCapital: parsed.value.startingCapital, trades: parsed.value.trades },
      { token },
    );
    return NextResponse.json({ ok: true, updatedAt: result.updatedAt });
  } catch (error) {
    return journalError(error);
  }
}
