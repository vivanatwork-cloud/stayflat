import type { Metadata } from "next";
import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { fetchQuery } from "convex/nextjs";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import { AccountMenu } from "@/components/brand/account-menu";
import { FlatlineMark } from "@/components/brand/flatline-mark";
import { isAdminEmail } from "@/lib/admin";
import { getConvexToken } from "@/lib/convex-auth";
import { blockUser, grantPaidAccess, unblockUser } from "./actions";
import { CustomerControls } from "@/components/admin/customer-controls";
import { loadAllClerkUsers } from "@/lib/admin/clerk-users";
import { filterAdminCustomers, filtersToSearchParams, getAttentionReason, paginateAdminCustomers, parseAdminFilters, sortAdminCustomers, type AdminSearchParams } from "@/lib/admin/customer-filters";
import "./admin.css";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

const date = (value: number | null | undefined) =>
  value
    ? new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(value)
    : "—";

const dateTimeIst = (value: number | null | undefined) =>
  value
    ? new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
        timeZone: "Asia/Kolkata",
        timeZoneName: "short",
      }).format(value)
    : "Never signed in";

const money = (value: number | null | undefined) =>
  value == null
    ? "—"
    : `${value < 0 ? "-" : ""}$${Math.abs(value).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

const shortId = (value: string) => value.length > 24 ? `${value.slice(0, 12)}…${value.slice(-8)}` : value;

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const [session, user, rawSearchParams] = await Promise.all([auth(), currentUser(), searchParams]);
  if (!session.userId || !user) redirect("/sign-in?redirect_url=/admin");

  const adminEmail = user.primaryEmailAddress?.emailAddress
    ?? user.emailAddresses[0]?.emailAddress;
  if (!isAdminEmail(adminEmail)) notFound();

  const token = await getConvexToken(session);
  if (!token || !process.env.NEXT_PUBLIC_CONVEX_URL) {
    throw new Error("Admin data is unavailable right now.");
  }

  const filters = parseAdminFilters(rawSearchParams);
  const clerk = await clerkClient();
  const [overview, clerkUsers] = await Promise.all([
    fetchQuery(api.admin.overview, {}, { token }),
    loadAllClerkUsers((options) => clerk.users.getUserList(options)),
  ]);

  const paymentsByOwner = new Map<string, typeof overview.payments>();
  const walletsByOwner = new Map<string, typeof overview.wallets>();
  const onboardingByOwner = new Map(overview.onboarding.map((record) => [record.ownerId, record]));
  const journalsByOwner = new Map(overview.journals.map((record) => [record.ownerId, record]));
  const downloadsByReport = new Map<string, typeof overview.downloads>();
  const blocksByOwner = new Map<string, typeof overview.accessBlocks>();
  for (const payment of overview.payments) {
    paymentsByOwner.set(payment.ownerId, [...(paymentsByOwner.get(payment.ownerId) ?? []), payment]);
  }
  for (const wallet of overview.wallets) {
    walletsByOwner.set(wallet.ownerId, [...(walletsByOwner.get(wallet.ownerId) ?? []), wallet]);
  }
  for (const download of overview.downloads) {
    const key = `${download.ownerId}:${download.address}`;
    downloadsByReport.set(key, [...(downloadsByReport.get(key) ?? []), download]);
  }
  for (const block of overview.accessBlocks) {
    blocksByOwner.set(block.ownerId, [...(blocksByOwner.get(block.ownerId) ?? []), block]);
  }

  const allUsers = clerkUsers.users
    .map((clerkUser) => {
      const email = clerkUser.primaryEmailAddress?.emailAddress
        ?? clerkUser.emailAddresses[0]?.emailAddress
        ?? "No email";
      return {
        id: clerkUser.id,
        email,
        createdAt: clerkUser.createdAt,
        lastSignInAt: clerkUser.lastSignInAt,
        payments: paymentsByOwner.get(clerkUser.id) ?? [],
        wallets: walletsByOwner.get(clerkUser.id) ?? [],
        onboarding: onboardingByOwner.get(clerkUser.id),
        journal: journalsByOwner.get(clerkUser.id),
        blocks: blocksByOwner.get(clerkUser.id) ?? [],
      };
    });
  const filteredUsers = sortAdminCustomers(filterAdminCustomers(allUsers, filters), filters.sort);
  const pagination = paginateAdminCustomers(filteredUsers, filters.page);
  const users = pagination.items;
  const attentionCounts = Object.fromEntries(
    ["paid-no-report", "paid-never-returned", "incomplete-onboarding", "payment-mismatch"].map((reason) => [
      reason,
      allUsers.filter((record) => getAttentionReason(record).includes(reason as never)).length,
    ]),
  );

  const completedOnboarding = overview.onboarding.filter((record) => record.completed).length;
  const journalTrades = overview.journals.reduce((total, journal) => total + journal.tradeCount, 0);
  const ownersInClerk = new Set(clerkUsers.users.map((clerkUser) => clerkUser.id));
  const unmatchedPayments = overview.payments.filter((payment) => !ownersInClerk.has(payment.ownerId));

  return (
    <main className="admin-page">
      <header className="admin-header">
        <Link className="site-brand" href="/" aria-label="StayFlat home"><FlatlineMark />StayFlat</Link>
        <div>
          <span>Private admin</span>
          <AccountMenu accessConfirmed showFeedbackPrompt={false} />
        </div>
      </header>

      <section className="admin-intro">
        <p className="admin-eyebrow">Operations ledger</p>
        <h1>StayFlat at a glance.</h1>
        <p>Account activity, paid access, saved reports, journals, and requests.</p>
      </section>

      <section className="admin-stats" aria-label="StayFlat totals">
        <article><span>Clerk accounts</span><strong>{clerkUsers.totalCount}</strong><small>All accounts loaded</small></article>
        <article><span>Paid accounts</span><strong>{new Set(overview.payments.map((payment) => payment.ownerId)).size}</strong><small>{overview.payments.length} payments</small></article>
        <article><span>Wallet reports</span><strong>{overview.wallets.length}</strong><small>Across all accounts</small></article>
        <article><span>PDF downloads</span><strong>{overview.downloads.length}</strong><small>Across all reports</small></article>
        <article><span>Journal trades</span><strong>{journalTrades}</strong><small>{overview.journals.length} journals</small></article>
        <article><span>Onboarding complete</span><strong>{completedOnboarding}</strong><small>of {overview.onboarding.length} started</small></article>
        <article><span>Exchange requests</span><strong>{overview.exchangeRequests.length}</strong><small>{overview.legacyTradeCount} legacy trades</small></article>
      </section>

      <section className="admin-panel">
        <header className="admin-panel-heading"><div><p className="admin-eyebrow">Accounts</p><h2>Users and access</h2></div></header>
        <CustomerControls filters={filters} resultCount={filteredUsers.length} attentionCounts={attentionCounts} />

        <div className="admin-user-list">
          {users.length === 0 ? <p className="admin-empty">No customers match these filters.</p> : users.map((record) => (
            <details className="admin-user" key={record.id}>
              <summary>
                <span><strong>{record.email}</strong><small>{shortId(record.id)}</small></span>
                {record.blocks.some((block) => block.unblockedAt == null)
                  ? <span className="admin-status admin-status-blocked">Blocked · {record.payments.length ? "Paid" : "Unpaid"}</span>
                  : <span className="admin-status admin-status-paid">Active · {record.payments.length ? "Paid" : "Unpaid"}</span>}
                <span><small>Joined</small>{date(record.createdAt)}</span>
                <span><small>Reports</small>{record.wallets.length}</span>
                <span><small>Journal trades</small>{record.journal?.tradeCount ?? 0}</span>
              </summary>
              <div className="admin-user-detail">
                <article>
                  <h3>Account</h3>
                  <dl><div><dt>Last sign-in</dt><dd>{dateTimeIst(record.lastSignInAt)}</dd></div><div><dt>Report access</dt><dd>{record.blocks.some((block) => block.unblockedAt == null) ? "Blocked" : "Free · unlimited"}</dd></div><div><dt>Onboarding</dt><dd>{record.onboarding?.completed ? "Complete" : record.onboarding ? `Step ${record.onboarding.step} of 9` : "Not started"}</dd></div></dl>
                  {(() => {
                    const activeBlock = record.blocks.find((block) => block.unblockedAt == null);
                    return activeBlock ? <form action={unblockUser} className="admin-access-form"><input type="hidden" name="ownerId" value={record.id} /><p><strong>Blocked {date(activeBlock.blockedAt)}</strong><br />{activeBlock.reason}</p><button type="submit">Unblock report access</button></form> : <form action={blockUser} className="admin-access-form admin-access-form-danger"><input type="hidden" name="ownerId" value={record.id} /><label htmlFor={`block-reason-${record.id}`}>Reason for blocking</label><input id={`block-reason-${record.id}`} name="reason" required minLength={3} placeholder="Example: repeated automated requests" /><button type="submit">Block report generation</button><small>Saved reports remain visible. New reports and refreshes stop immediately.</small></form>;
                  })()}
                  {record.payments.length === 0 ? <form action={grantPaidAccess} className="admin-grant-form"><input type="hidden" name="ownerId" value={record.id} /><input type="hidden" name="accountEmail" value={record.email} /><label htmlFor={`payment-email-${record.id}`}>Payment email</label><input id={`payment-email-${record.id}`} name="paymentEmail" type="email" placeholder="Email used to pay" required /><button type="submit">Grant paid access</button><small>Use only after checking the payment receipt.</small></form> : null}
                </article>
                <article>
                  <h3>Wallet reports</h3>
                  {record.wallets.length ? <ul>{record.wallets.map((wallet) => { const downloads = downloadsByReport.get(`${record.id}:${wallet.address}`) ?? []; const latest = downloads.toSorted((a, b) => b.downloadedAt - a.downloadedAt)[0]; return <li key={wallet.id}><span><a href={`/api/admin/report/pdf?id=${wallet.id}`} target="_blank"><code>{shortId(wallet.address)}</code></a><small>{wallet.report ? `${money(wallet.report.pnl)} · ${wallet.report.fills} fills` : "No saved metrics"}</small></span><span>{downloads.length} download{downloads.length === 1 ? "" : "s"}{latest ? ` · ${date(latest.downloadedAt)}` : ""}</span></li>; })}</ul> : <p>No wallet reports.</p>}
                </article>
                <article>
                  <h3>Journal</h3>
                  {record.journal ? <><p>{money(record.journal.startingCapital)} starting capital · updated {date(record.journal.updatedAt)}</p>{record.journal.latestTrades.length ? <ul>{record.journal.latestTrades.map((trade) => <li key={trade.id}><span>{trade.coin} · {trade.dir}</span><span>{date(trade.entryTime)} · {trade.strategy || "No strategy"}</span></li>)}</ul> : null}</> : <p>No journal.</p>}
                </article>
                <article>
                  <h3>Onboarding answers</h3>
                  {record.onboarding ? <dl>{Object.entries(record.onboarding.answers).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{Array.isArray(value) ? value.join(", ") : value}</dd></div>)}</dl> : <p>No onboarding answers.</p>}
                </article>
              </div>
            </details>
          ))}
        </div>
        {filteredUsers.length ? <nav className="admin-pagination" aria-label="Customer pages">
          <span>Showing {pagination.start + 1}–{pagination.start + users.length} of {filteredUsers.length}</span>
          <div>
            {pagination.currentPage > 1 ? <Link href={`/admin?${filtersToSearchParams(filters, { page: pagination.currentPage - 1 })}`}>Previous</Link> : <span>Previous</span>}
            <strong>Page {pagination.currentPage} of {pagination.totalPages}</strong>
            {pagination.currentPage < pagination.totalPages ? <Link href={`/admin?${filtersToSearchParams(filters, { page: pagination.currentPage + 1 })}`}>Next</Link> : <span>Next</span>}
          </div>
        </nav> : null}
      </section>

      <div className="admin-lower-grid">
        <section className="admin-panel admin-report-activity">
          <header className="admin-panel-heading"><div><p className="admin-eyebrow">Reports</p><h2>Report activity</h2></div></header>
          <div className="admin-table-wrap"><table><thead><tr><th>Account</th><th>Wallet report</th><th>Downloads</th><th>Last download</th><th>Last login</th></tr></thead><tbody>{filteredUsers.flatMap((record) => record.wallets.map((wallet) => { const downloads = downloadsByReport.get(`${record.id}:${wallet.address}`) ?? []; const latest = downloads.toSorted((a, b) => b.downloadedAt - a.downloadedAt)[0]; return <tr key={wallet.id}><td>{record.email}</td><td><a href={`/api/admin/report/pdf?id=${wallet.id}`} target="_blank"><code>{shortId(wallet.address)}</code> · View PDF</a></td><td>{downloads.length}</td><td>{latest ? `${latest.accountEmail} · ${date(latest.downloadedAt)}` : "Never"}</td><td>{date(record.lastSignInAt)}</td></tr>; }))}</tbody></table></div>
          {overview.wallets.length === 0 ? <p className="admin-empty">No saved reports.</p> : null}
        </section>
        <section className="admin-panel">
          <header className="admin-panel-heading"><div><p className="admin-eyebrow">Payments</p><h2>Recent payments</h2></div></header>
          <div className="admin-table-wrap"><table><thead><tr><th>Payment email</th><th>Account</th><th>Source</th><th>Paid</th><th>Reference</th></tr></thead><tbody>{overview.payments.toSorted((a, b) => b.paidAt - a.paidAt).slice(0, 50).map((payment) => <tr key={payment.id}><td>{payment.email}</td><td>{payment.accountEmail ?? "—"}</td><td>{payment.provider === "manual" ? "Admin grant" : "BoomFi"}</td><td>{date(payment.paidAt)}</td><td><code>{shortId(payment.providerPaymentId)}</code></td></tr>)}</tbody></table></div>
          {overview.payments.length === 0 ? <p className="admin-empty">No payments recorded.</p> : null}
        </section>

        <section className="admin-panel">
          <header className="admin-panel-heading"><div><p className="admin-eyebrow">Demand</p><h2>Exchange requests</h2></div></header>
          <div className="admin-table-wrap"><table><thead><tr><th>Exchange</th><th>Requested</th><th>User</th></tr></thead><tbody>{overview.exchangeRequests.toSorted((a, b) => b.createdAt - a.createdAt).slice(0, 50).map((request) => <tr key={request.id}><td>{request.exchange}</td><td>{date(request.createdAt)}</td><td><code>{shortId(request.ownerId)}</code></td></tr>)}</tbody></table></div>
          {overview.exchangeRequests.length === 0 ? <p className="admin-empty">No exchange requests.</p> : null}
        </section>
      </div>

      {unmatchedPayments.length ? <p className="admin-note">{unmatchedPayments.length} payment record{unmatchedPayments.length === 1 ? " is" : "s are"} still linked to a legacy account ID.</p> : null}
      <footer className="admin-footer">Updated {new Date(overview.generatedAt).toLocaleString("en", { dateStyle: "medium", timeStyle: "short" })}</footer>
    </main>
  );
}
