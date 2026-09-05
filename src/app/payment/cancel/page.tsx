import Link from "next/link";
import { AccountMenu } from "@/components/brand/account-menu";

export default function PaymentCancel() {
  return (
    <main className="payment-placeholder">
      <div className="account-control"><AccountMenu /></div>
      <p>Payment not completed</p>
      <h1>No payment was taken.</h1>
      <p>You can return to onboarding and try the BoomFi checkout again.</p>
      <Link className="landing-button" href="/onboarding">
        Return to onboarding
      </Link>
    </main>
  );
}
