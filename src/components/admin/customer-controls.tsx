import Link from "next/link";
import { filtersToSearchParams, type AdminFilters } from "@/lib/admin/customer-filters";

const savedViews = [
  ["paid-no-report", "Paid, no report"],
  ["paid-never-returned", "Paid, never returned"],
  ["incomplete-onboarding", "Onboarding incomplete"],
  ["payment-mismatch", "Payment mismatch"],
] as const;

export function CustomerControls({ filters, resultCount, attentionCounts }: { filters: AdminFilters; resultCount: number; attentionCounts: Record<string, number> }) {
  const href = (changes: Partial<AdminFilters>) => `/admin?${filtersToSearchParams(filters, { ...changes, page: 1 })}`;
  return (
    <div className="admin-controls">
      <nav className="admin-saved-views" aria-label="Needs attention">
        <span>Needs attention</span>
        {savedViews.map(([value, label]) => <Link className={filters.attention === value ? "is-active" : ""} href={href({ attention: value })} key={value}>{label}<strong>{attentionCounts[value] ?? 0}</strong></Link>)}
      </nav>
      <form action="/admin" method="get" className="admin-filter-form">
        <label className="admin-search-field"><span>Search</span><input name="q" defaultValue={filters.q} placeholder="Email, user ID, or wallet" /></label>
        <label><span>Access</span><select name="access" defaultValue={filters.access}><option value="all">All</option><option value="paid">Paid</option><option value="unpaid">Unpaid</option></select></label>
        <label><span>Joined from</span><input type="date" name="joinedFrom" defaultValue={filters.joinedFrom} /></label>
        <label><span>Joined to</span><input type="date" name="joinedTo" defaultValue={filters.joinedTo} /></label>
        <label><span>Paid from</span><input type="date" name="paidFrom" defaultValue={filters.paidFrom} /></label>
        <label><span>Paid to</span><input type="date" name="paidTo" defaultValue={filters.paidTo} /></label>
        <label><span>Onboarding</span><select name="onboarding" defaultValue={filters.onboarding}><option value="all">All</option><option value="complete">Complete</option><option value="incomplete">Incomplete</option><option value="not-started">Not started</option></select></label>
        <label><span>Report</span><select name="reports" defaultValue={filters.reports}><option value="all">All</option><option value="yes">Has report</option><option value="no">No report</option></select></label>
        <label><span>Journal</span><select name="journal" defaultValue={filters.journal}><option value="all">All</option><option value="yes">Has trades</option><option value="no">No trades</option></select></label>
        <label><span>Payment source</span><select name="source" defaultValue={filters.source}><option value="all">All</option><option value="boomfi">BoomFi</option><option value="manual">Admin grant</option></select></label>
        <label><span>Sort</span><select name="sort" defaultValue={filters.sort}><option value="joined-desc">Newest joined</option><option value="joined-asc">Oldest joined</option><option value="paid-desc">Newest payment</option><option value="active-desc">Last active</option><option value="email-asc">Email A–Z</option></select></label>
        {filters.attention !== "all" ? <input type="hidden" name="attention" value={filters.attention} /> : null}
        <div className="admin-filter-actions"><button type="submit">Apply filters</button><Link href="/admin">Clear</Link></div>
      </form>
      <p className="admin-result-count"><strong>{resultCount}</strong> matching customer{resultCount === 1 ? "" : "s"}</p>
    </div>
  );
}
