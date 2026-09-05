export type AccessFilter = "all" | "paid" | "unpaid";
export type CompletionFilter = "all" | "complete" | "incomplete" | "not-started";
export type PresenceFilter = "all" | "yes" | "no";
export type PaymentSourceFilter = "all" | "boomfi" | "manual";
export type AttentionFilter = "all" | "paid-no-report" | "paid-never-returned" | "incomplete-onboarding" | "payment-mismatch";
export type CustomerSort = "joined-desc" | "joined-asc" | "paid-desc" | "active-desc" | "email-asc";

export type AdminSearchParams = Record<string, string | string[] | undefined>;

export type AdminCustomerPayment = {
  paidAt: number;
  provider: "boomfi" | "manual";
  accountEmail?: string;
};

export type AdminCustomer = {
  id: string;
  email: string;
  createdAt: number;
  lastSignInAt: number | null;
  payments: AdminCustomerPayment[];
  wallets: Array<{ address?: string }>;
  onboarding?: { completed: boolean };
  journal?: { tradeCount: number };
};

export type AdminFilters = {
  q: string;
  access: AccessFilter;
  joinedFrom: string;
  joinedTo: string;
  paidFrom: string;
  paidTo: string;
  onboarding: CompletionFilter;
  reports: PresenceFilter;
  journal: PresenceFilter;
  source: PaymentSourceFilter;
  attention: AttentionFilter;
  sort: CustomerSort;
  page: number;
};

const INDIA_OFFSET = "+05:30";

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] ?? "" : value ?? "";

const oneOf = <T extends string>(value: string, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value as T) ? value as T : fallback;

const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00${INDIA_OFFSET}`));

export function parseAdminFilters(params: AdminSearchParams): AdminFilters {
  const page = Number.parseInt(first(params.page), 10);
  const joinedFrom = first(params.joinedFrom);
  const joinedTo = first(params.joinedTo);
  const paidFrom = first(params.paidFrom);
  const paidTo = first(params.paidTo);
  return {
    q: first(params.q).trim(),
    access: oneOf(first(params.access), ["all", "paid", "unpaid"] as const, "all"),
    joinedFrom: validDate(joinedFrom) ? joinedFrom : "",
    joinedTo: validDate(joinedTo) ? joinedTo : "",
    paidFrom: validDate(paidFrom) ? paidFrom : "",
    paidTo: validDate(paidTo) ? paidTo : "",
    onboarding: oneOf(first(params.onboarding), ["all", "complete", "incomplete", "not-started"] as const, "all"),
    reports: oneOf(first(params.reports), ["all", "yes", "no"] as const, "all"),
    journal: oneOf(first(params.journal), ["all", "yes", "no"] as const, "all"),
    source: oneOf(first(params.source), ["all", "boomfi", "manual"] as const, "all"),
    attention: oneOf(first(params.attention), ["all", "paid-no-report", "paid-never-returned", "incomplete-onboarding", "payment-mismatch"] as const, "all"),
    sort: oneOf(first(params.sort), ["joined-desc", "joined-asc", "paid-desc", "active-desc", "email-asc"] as const, "joined-desc"),
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

const startOfDate = (value: string) => value ? Date.parse(`${value}T00:00:00${INDIA_OFFSET}`) : null;
const endOfDate = (value: string) => value ? Date.parse(`${value}T23:59:59.999${INDIA_OFFSET}`) : null;

export const latestPaymentAt = (customer: AdminCustomer) => {
  let latest: number | null = null;
  for (const payment of customer.payments) {
    if (latest === null || payment.paidAt > latest) latest = payment.paidAt;
  }
  return latest;
};

export function getAttentionReason(customer: AdminCustomer): Exclude<AttentionFilter, "all">[] {
  const reasons: Exclude<AttentionFilter, "all">[] = [];
  const paidAt = latestPaymentAt(customer);
  if (paidAt !== null && customer.wallets.length === 0) reasons.push("paid-no-report");
  if (paidAt !== null && (customer.lastSignInAt === null || customer.lastSignInAt <= paidAt)) reasons.push("paid-never-returned");
  if (customer.onboarding && !customer.onboarding.completed) reasons.push("incomplete-onboarding");
  const email = customer.email.toLowerCase();
  if (customer.payments.some((payment) => payment.accountEmail && payment.accountEmail.toLowerCase() !== email)) reasons.push("payment-mismatch");
  return reasons;
}

export function filterAdminCustomers<T extends AdminCustomer>(customers: T[], filters: AdminFilters): T[] {
  const query = filters.q.toLowerCase();
  const joinedFrom = startOfDate(filters.joinedFrom);
  const joinedTo = endOfDate(filters.joinedTo);
  const paidFrom = startOfDate(filters.paidFrom);
  const paidTo = endOfDate(filters.paidTo);

  return customers.filter((customer) => {
    const isPaid = customer.payments.length > 0;
    if (query && ![customer.email, customer.id, ...customer.wallets.map((wallet) => wallet.address ?? "")].some((value) => value.toLowerCase().includes(query))) return false;
    if (filters.access === "paid" && !isPaid) return false;
    if (filters.access === "unpaid" && isPaid) return false;
    if (joinedFrom !== null && customer.createdAt < joinedFrom) return false;
    if (joinedTo !== null && customer.createdAt > joinedTo) return false;
    if (filters.onboarding === "complete" && !customer.onboarding?.completed) return false;
    if (filters.onboarding === "incomplete" && (!customer.onboarding || customer.onboarding.completed)) return false;
    if (filters.onboarding === "not-started" && customer.onboarding) return false;
    if (filters.reports === "yes" && customer.wallets.length === 0) return false;
    if (filters.reports === "no" && customer.wallets.length > 0) return false;
    const hasJournal = Boolean(customer.journal && customer.journal.tradeCount > 0);
    if (filters.journal === "yes" && !hasJournal) return false;
    if (filters.journal === "no" && hasJournal) return false;
    if (filters.source !== "all" && !customer.payments.some((payment) => payment.provider === filters.source)) return false;
    if ((paidFrom !== null || paidTo !== null) && !customer.payments.some((payment) =>
      (paidFrom === null || payment.paidAt >= paidFrom) && (paidTo === null || payment.paidAt <= paidTo))) return false;
    if (filters.attention !== "all" && !getAttentionReason(customer).includes(filters.attention)) return false;
    return true;
  });
}

export function sortAdminCustomers<T extends AdminCustomer>(customers: T[], sort: CustomerSort): T[] {
  return customers.toSorted((a, b) => {
    if (sort === "joined-asc") return a.createdAt - b.createdAt;
    if (sort === "paid-desc") return (latestPaymentAt(b) ?? -1) - (latestPaymentAt(a) ?? -1);
    if (sort === "active-desc") return (b.lastSignInAt ?? -1) - (a.lastSignInAt ?? -1);
    if (sort === "email-asc") return a.email.localeCompare(b.email);
    return b.createdAt - a.createdAt;
  });
}

export function paginateAdminCustomers<T>(customers: T[], page: number, pageSize = 25) {
  const totalPages = Math.max(1, Math.ceil(customers.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * pageSize;
  return { items: customers.slice(start, start + pageSize), currentPage, totalPages, start };
}

export function filtersToSearchParams(filters: AdminFilters, changes: Partial<AdminFilters> = {}) {
  const merged = { ...filters, ...changes };
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (key === "page" ? value !== 1 : value && value !== "all" && value !== "joined-desc") {
      params.set(key, String(value));
    }
  }
  return params;
}
