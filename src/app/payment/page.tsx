import { auth } from "@clerk/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import Link from "next/link";
import { api } from "../../../convex/_generated/api";
import { AccountMenu } from "@/components/brand/account-menu";
import { getConvexToken } from "@/lib/convex-auth";

export default async function Payment() {
  const session = await auth();
  let hasPreviousBundle = false;
  if (session.userId && process.env.NEXT_PUBLIC_CONVEX_URL) {
    const token = await getConvexToken(session);
    const access = await fetchQuery(api.payments.reportAccess, {}, { token });
    hasPreviousBundle = access.limit > 0;
  }
  return (
    <main className="payment-placeholder">
      <div className="account-control"><AccountMenu /></div>
      <p>Secure checkout</p>
      <h1>{hasPreviousBundle ? "Check three more wallet addresses." : "Your report and call are one step away."}</h1>
      <p>
        {hasPreviousBundle
          ? "Another $3 payment adds three new Hyperliquid address slots to your account."
          : "Pay $3 through BoomFi's secure checkout. Your onboarding answers are already saved."}
      </p>
      <form action="/api/boomfi/checkout" method="post">
        <button className="landing-button" type="submit">
          Continue to secure checkout
        </button>
      </form>
      <Link className="payment-back" href="/onboarding">
        Return to onboarding
      </Link>
    </main>
  );
}
