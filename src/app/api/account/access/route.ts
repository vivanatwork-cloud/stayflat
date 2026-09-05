import { auth, currentUser } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";
import { api } from "../../../../../convex/_generated/api";

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Sign in to check access." }, { status: 401 });
  }

  const user = await currentUser();
  const primaryEmail = user?.primaryEmailAddress;
  const email = primaryEmail?.emailAddress?.trim().toLowerCase();
  if (!email || primaryEmail?.verification?.status !== "verified") {
    return NextResponse.json(
      { error: "Verify your primary email to restore paid access." },
      { status: 422 },
    );
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const writeSecret = process.env.PAYMENT_WRITE_SECRET;
  if (!convexUrl || !writeSecret) {
    return NextResponse.json(
      { error: "Account access is unavailable right now." },
      { status: 503 },
    );
  }

  const convex = new ConvexHttpClient(convexUrl);
  const result = await convex.mutation(api.payments.claimLegacyAccountByEmail, {
    writeSecret,
    ownerId: userId,
    email,
  });
  return NextResponse.json(result);
}
