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
      <h1>{hasPreviousBundle ? "Your paid tools are already unlocked." : "Add the private journal and a call."}</h1>
      <p>
        {hasPreviousBundle
          ? "Wallet reports are free and unlimited. Your payment already includes the private journal and 30-minute intro call."
          : "Wallet reports are free. Pay $3 once to unlock the private journal and one 30-minute intro call."}
      </p>
      {hasPreviousBundle ? <Link className="landing-button" href="/journal">Open my journal</Link> : <form action="/api/boomfi/checkout" method="post">
        <button className="landing-button" type="submit">Continue to secure checkout</button>
      </form>}
      <Link className="payment-back" href="/onboarding">
        Return to onboarding
      </Link>
    </main>
  );
}
