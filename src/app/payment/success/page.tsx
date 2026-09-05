import { auth, currentUser } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import Link from "next/link";
import { api } from "../../../../convex/_generated/api";
import { AccountMenu } from "@/components/brand/account-menu";

type Payment = { status?: string; customer?: { email?: string } };

export default async function PaymentSuccess({
  searchParams,
}: {
  searchParams: Promise<{ pid?: string }>;
}) {
  const { pid } = await searchParams;
  const apiKey = process.env.BOOMFI_API_KEY;
  const writeSecret = process.env.PAYMENT_WRITE_SECRET;
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const { userId } = await auth();
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress?.toLowerCase();
  let payment: Payment | null = null;

  if (pid && apiKey) {
    const response = await fetch(
      `https://mapi.boomfi.xyz/v1/payments/${encodeURIComponent(pid)}`,
      { headers: { "X-API-KEY": apiKey }, cache: "no-store" },
    );
    if (response.ok) {
      const result = (await response.json()) as Payment & { data?: Payment };
      payment = result.data || result;
    }
  }

  const paid =
    payment?.status === "Succeeded" &&
    Boolean(email) &&
    payment.customer?.email?.toLowerCase() === email;
  let saved = false;
  if (paid && userId && email && pid && writeSecret && convexUrl) {
    try {
      const convex = new ConvexHttpClient(convexUrl);
      await convex.mutation(api.payments.recordVerified, {
        writeSecret,
        ownerId: userId,
        providerPaymentId: pid,
        email,
      });
      saved = true;
    } catch (error) {
      console.error("BoomFi browser confirmation could not be recorded", {
        paymentId: pid,
        error,
      });
      saved = false;
    }
  }

  if (!paid || !saved)
    return (
      <main className="payment-placeholder">
        <div className="account-control"><AccountMenu /></div>
        <p>Payment verification</p>
        <h1>We could not confirm this payment yet.</h1>
        <p>
          Return to BoomFi if the payment is still processing. If you paid
          successfully, keep the payment receipt and contact StayFlat so we can
          unlock your report.
        </p>
        <Link className="landing-button" href="/onboarding">
          Return to onboarding
        </Link>
      </main>
    );
  return (
    <main className="payment-placeholder">
      <div className="account-control"><AccountMenu /></div>
      <p>Payment confirmed</p>
      <h1>Your next step is ready.</h1>
      <p>
        BoomFi confirmed your payment. Continue to generate your trading report.
      </p>
      <Link className="landing-button" href="/report">
        Generate my trading report
      </Link>
    </main>
  );
}
