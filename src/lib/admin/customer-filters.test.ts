import { describe, expect, it } from "vitest";
import { filterAdminCustomers, filtersToSearchParams, getAttentionReason, paginateAdminCustomers, parseAdminFilters, sortAdminCustomers, type AdminCustomer } from "./customer-filters";

const when = (date: string) => Date.parse(`${date}T12:00:00+05:30`);
const customer = (values: Partial<AdminCustomer> & Pick<AdminCustomer, "id">): AdminCustomer => ({
  id: values.id,
  email: values.email ?? `${values.id}@example.com`,
  createdAt: values.createdAt ?? when("2026-09-01"),
  lastSignInAt: values.lastSignInAt ?? null,
  payments: values.payments ?? [],
  wallets: values.wallets ?? [],
  onboarding: values.onboarding,
  journal: values.journal,
});

describe("admin customer filters", () => {
  it("parses known values and rejects unsafe ones", () => {
    expect(parseAdminFilters({ access: "paid", joinedFrom: "2026-09-01", sort: "paid-desc", page: "2" })).toMatchObject({ access: "paid", joinedFrom: "2026-09-01", sort: "paid-desc", page: 2 });
    expect(parseAdminFilters({ access: "owner", joinedFrom: "yesterday", page: "-4" })).toMatchObject({ access: "all", joinedFrom: "", page: 1 });
  });

  it("combines access, joined, payment, and activity filters", () => {
    const filters = parseAdminFilters({ access: "paid", joinedFrom: "2026-09-01", joinedTo: "2026-09-02", paidFrom: "2026-09-02", paidTo: "2026-09-02", reports: "yes", journal: "yes", onboarding: "complete", source: "boomfi" });
    const match = customer({ id: "match", createdAt: when("2026-09-01"), payments: [{ paidAt: when("2026-09-02"), provider: "boomfi" }], wallets: [{}], journal: { tradeCount: 1 }, onboarding: { completed: true } });
    const wrong = customer({ id: "wrong", createdAt: when("2026-09-01"), payments: [{ paidAt: when("2026-09-03"), provider: "boomfi" }], wallets: [{}], journal: { tradeCount: 1 }, onboarding: { completed: true } });
    expect(filterAdminCustomers([match, wrong], filters).map(({ id }) => id)).toEqual(["match"]);
  });

  it("identifies each needs-attention reason", () => {
    expect(getAttentionReason(customer({ id: "paid", email: "member@example.com", payments: [{ paidAt: 20, provider: "boomfi", accountEmail: "old@example.com" }], lastSignInAt: 10, onboarding: { completed: false } }))).toEqual(["paid-no-report", "paid-never-returned", "incomplete-onboarding", "payment-mismatch"]);
  });

  it("does not treat a different payment email as an account mismatch", () => {
    expect(getAttentionReason(customer({ id: "paid", email: "member@example.com", payments: [{ paidAt: 20, provider: "boomfi" }], wallets: [{}], lastSignInAt: 30 }))).not.toContain("payment-mismatch");
  });

  it("sorts by latest payment and puts unpaid customers last", () => {
    const result = sortAdminCustomers([
      customer({ id: "unpaid" }),
      customer({ id: "old", payments: [{ paidAt: 10, provider: "boomfi" }] }),
      customer({ id: "new", payments: [{ paidAt: 30, provider: "manual" }] }),
    ], "paid-desc");
    expect(result.map(({ id }) => id)).toEqual(["new", "old", "unpaid"]);
  });

  it("clamps pagination and keeps filters in links", () => {
    expect(paginateAdminCustomers([1, 2, 3, 4, 5], 99, 2)).toEqual({ items: [5], currentPage: 3, totalPages: 3, start: 4 });
    const params = filtersToSearchParams(parseAdminFilters({ access: "paid", q: "sam" }), { page: 2 });
    expect(params.toString()).toContain("access=paid");
    expect(params.toString()).toContain("q=sam");
    expect(params.toString()).toContain("page=2");
  });
});
