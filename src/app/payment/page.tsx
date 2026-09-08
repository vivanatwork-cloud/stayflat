import { auth } from "@clerk/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import Link from "next/link";
import { api } from "../../../convex/_generated/api";
import { AccountMenu } from "@/components/brand/account-menu";
import { getConvexToken } from "@/lib/convex-auth";

export default async function Payment() {
  const session = await auth();
  let hasPaid = false;
  if (session.userId && process.env.NEXT_PUBLIC_CONVEX_URL) {
    const token = await getConvexToken(session);
    if (token) hasPaid = await fetchQuery(api.payments.hasPaid, {}, { token });
  }
  return (
    <main className="payment-placeholder">
      <div className="account-control"><AccountMenu /></div>
      <p>Secure checkout</p>
      <h1>{hasPaid ? "Your paid tools are already unlocked." : "Unlock your journal and coaching call."}</h1>
      <p>
        {hasPaid
          ? "Your private journal and 30-minute call are ready. Wallet reports remain free and unlimited."
          : "Wallet reports are free. Pay $3 once to use the private journal and schedule one 30-minute call."}
      </p>
      {hasPaid ? <Link className="landing-button" href="/journal">Open my journal</Link> : <form action="/api/boomfi/checkout" method="post">
        <button className="landing-button" type="submit">Continue to secure checkout</button>
      </form>}
      <Link className="payment-back" href="/onboarding">
        Return to onboarding
      </Link>
    </main>
  );
}
