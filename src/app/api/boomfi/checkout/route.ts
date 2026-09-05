import { auth, currentUser } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { buildBoomFiCheckoutUrl } from "@/lib/boomfi-checkout";

export async function POST(request: NextRequest) {
  const { isAuthenticated } = await auth();
  if (!isAuthenticated)
    return NextResponse.redirect(new URL("/sign-in", request.url), 303);
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;
  if (!email)
    return NextResponse.redirect(
      new URL("/payment/cancel?reason=email", request.url),
      303,
    );
  const checkout = buildBoomFiCheckoutUrl({
    userId: user!.id,
    email,
    name: user?.fullName || user?.firstName || "StayFlat customer",
    origin: request.nextUrl.origin,
  });
  return NextResponse.redirect(checkout, 303);
}
