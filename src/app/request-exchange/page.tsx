import Link from "next/link";
import { FlatlineMark } from "@/components/brand/flatline-mark";
import { AccountMenu } from "@/components/brand/account-menu";
import { ExchangeRequestForm } from "@/components/report/exchange-request-form";

export default function RequestExchangePage() {
  return (
    <main className="report-home">
      <div className="report-wrap">
        <header className="report-brandbar">
          <Link className="site-brand" href="/"><FlatlineMark />StayFlat</Link>
          <AccountMenu />
        </header>
        <section className="exchange-request">
          <p className="report-eyebrow">Coming soon</p>
          <h1>Which exchange should StayFlat support next?</h1>
          <p>Tell us where you trade. Your request helps us decide what to build after Hyperliquid.</p>
          <ExchangeRequestForm />
          <Link className="report-link-button" href="/report">Return to wallet report</Link>
        </section>
      </div>
    </main>
  );
}
