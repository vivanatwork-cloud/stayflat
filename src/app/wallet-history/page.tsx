import { auth } from "@clerk/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountMenu } from "@/components/brand/account-menu";
import { FlatlineMark } from "@/components/brand/flatline-mark";
import { api } from "../../../convex/_generated/api";
import { getConvexToken } from "@/lib/convex-auth";

const shortAddress = (address: string) => `${address.slice(0, 8)}…${address.slice(-6)}`;
const money = (value: number | null | undefined) =>
  value == null
    ? "—"
    : `${value < 0 ? "-" : ""}$${Math.abs(value).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

export default async function WalletHistoryPage() {
  const session = await auth();
  const { userId } = session;
  if (!userId) redirect("/sign-in");
  const token = await getConvexToken(session);
  if (!token || !process.env.NEXT_PUBLIC_CONVEX_URL) redirect("/report");
  const { history, access } = await fetchQuery(
    api.payments.reportPageData,
    {},
    { token },
  );

  return (
    <main className="report-home">
      <div className="report-wrap">
        <header className="report-brandbar">
          <Link className="site-brand" href="/"><FlatlineMark />StayFlat</Link>
          <AccountMenu />
        </header>
        <section className="wallet-history">
          <p className="report-eyebrow">Wallet history</p>
          <h1>Your past wallet reports.</h1>
          <p>{access.used} of {access.limit} unique address slots used. Each payment adds three slots.</p>
          {history.length === 0 ? (
            <div className="wallet-history-empty">
              <h2>No reports yet.</h2>
              <p>Your first generated wallet report will appear here.</p>
              <Link href="/report">Generate a wallet report</Link>
            </div>
          ) : (
            <div className="wallet-history-list">
              {history.map((item) => {
                const metrics = item.report?.combined ?? item.metrics;
                const venueCount = item.report?.activeVenues.length;
                return (
                  <article key={item.address}>
                    <header>
                      <h2>{shortAddress(item.address)}</h2>
                      <span>{new Date(item.updatedAt || item.createdAt).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}</span>
                    </header>
                    {metrics && !metrics.empty ? (
                      <div className="wallet-history-stats">
                        <span><small>All-time PnL</small><strong>{money(metrics.perpPnl)}</strong></span>
                        <span><small>Win rate</small><strong>{metrics.winRate == null ? "—" : `${Math.round(metrics.winRate * 100)}%`}</strong></span>
                        <span><small>Fills{venueCount ? ` · ${venueCount} ${venueCount === 1 ? "venue" : "venues"}` : ""}</small><strong>{metrics.fillCount}</strong></span>
                      </div>
                    ) : (
                      <p>{metrics?.empty ? "No active perpetual fills were found." : "This address was checked before saved reports were added."}</p>
                    )}
                    <Link href={`/report?address=${encodeURIComponent(item.address)}`}>
                      {metrics ? "View saved report" : "Generate saved report"} <span aria-hidden="true">→</span>
                    </Link>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
