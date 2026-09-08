import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FlatlineMark } from "@/components/brand/flatline-mark";
import { WalletReport } from "@/components/report/wallet-report";
import { AccountMenu } from "@/components/brand/account-menu";
import { ThemeToggle } from "@/components/brand/theme-toggle";
import { api } from "../../../convex/_generated/api";
import { getConvexToken } from "@/lib/convex-auth";
import { legacyMultiVenueMetrics } from "@/lib/report/multi-venue";

export const metadata: Metadata = {
  title: "Multi-venue Trading Read",
  description:
    "Read one wallet's Hyperliquid, Arcus, and Lighter perpetual trading history, separately and together.",
};

export default async function Report({ searchParams }: { searchParams: Promise<{ address?: string }> }) {
  const session = await auth();
  const { userId } = session;
  if (!userId) redirect("/sign-in?redirect_url=/report");
  const [{ address }, token] = await Promise.all([
    searchParams,
    getConvexToken(session),
  ]);
  if (!token) redirect("/sign-in?redirect_url=/report");
  if (!process.env.NEXT_PUBLIC_CONVEX_URL)
    throw new Error("Report data is unavailable right now.");
  const { access, history, saved } = await fetchQuery(
    api.payments.reportPageData,
    { address },
    { token },
  );
  if (access.limit === 0) redirect("/payment");

  return (
    <main className="report-home">
      <div className="report-wrap">
        <header className="report-brandbar">
          <Link className="site-brand" href="/" aria-label="StayFlat home">
            <FlatlineMark />
            StayFlat
          </Link>
          <div className="report-header-actions">
            <ThemeToggle />
            <AccountMenu />
          </div>
        </header>
        <WalletReport
          key={address || "new-report"}
          initialAccess={{ used: access.used, limit: access.limit }}
          initialReport={saved ? {
            address: saved.address,
            report: saved.report ?? legacyMultiVenueMetrics(saved.metrics!),
            access: { used: access.used, limit: access.limit },
          } : null}
          initialAddress={address || ""}
          initialHistory={history}
        />
      </div>
    </main>
  );
}
