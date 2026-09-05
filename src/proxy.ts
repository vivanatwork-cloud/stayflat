import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getSafeHandshakeRedirect } from "@/lib/clerk-handshake";

const isProtectedRoute = createRouteMatcher([
  "/admin(.*)",
  "/onboarding(.*)",
  "/journal(.*)",
  "/payment(.*)",
  "/report(.*)",
  "/request-exchange(.*)",
  "/wallet-history(.*)",
]);
const withClerk = clerkMiddleware(
  async (auth, request) => {
    const handshakeRedirect = getSafeHandshakeRedirect(request.nextUrl);
    if (handshakeRedirect) return NextResponse.redirect(handshakeRedirect);

    const { userId } = await auth();

    if (userId && request.nextUrl.pathname.startsWith("/sign-up")) {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }

    if (isProtectedRoute(request) && !userId) {
      const signInUrl = new URL("/sign-in", request.url);
      signInUrl.searchParams.set(
        "redirect_url",
        `${request.nextUrl.pathname}${request.nextUrl.search}`,
      );
      return NextResponse.redirect(signInUrl);
    }
  },
  {
    frontendApiProxy: {
      enabled: false,
    },
  },
);
export default process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  ? withClerk
  : () => NextResponse.next();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
