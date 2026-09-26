/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import schema from "../convex/schema";
import { api } from "../convex/_generated/api";
import { emptyData } from "../src/lib/wealth/engine";
const modules = import.meta.glob("../convex/**/*.ts");
async function setup() {
  const t = convexTest(schema, modules);
  await t.run(async (ctx) => {
    for (const ownerId of ["alice", "bob"])
      await ctx.db.insert("payments", {
        ownerId,
        provider: "manual",
        providerPaymentId: ownerId,
        email: ownerId + "@test.example",
        status: "paid",
        paidAt: Date.now(),
      });
  });
  return t;
}
describe("paid Wealth storage", () => {
  it("rejects anonymous and unpaid reads and writes", async () => {
    const t = await setup();
    const args = {
      data: JSON.stringify(emptyData()),
      revision: 0,
      expectedOwner: "unpaid",
    };
    await expect(t.query(api.wealth.get, {})).rejects.toThrow(
      "Not authenticated",
    );
    await expect(t.mutation(api.wealth.save, args)).rejects.toThrow(
      "Not authenticated",
    );
    const unpaid = t.withIdentity({ subject: "unpaid" });
    await expect(unpaid.query(api.wealth.get, {})).rejects.toThrow(
      "PAYMENT_REQUIRED",
    );
    await expect(unpaid.mutation(api.wealth.save, args)).rejects.toThrow(
      "PAYMENT_REQUIRED",
    );
  });
  it("persists across sessions and never exposes another member records", async () => {
    const t = await setup(),
      alice = t.withIdentity({ subject: "alice" }),
      bob = t.withIdentity({ subject: "bob" });
    const data = emptyData();
    data.goal = "456000.00";
    await alice.mutation(api.wealth.save, {
      data: JSON.stringify(data),
      revision: 0,
      expectedOwner: "alice",
    });
    const loaded = await t
      .withIdentity({ subject: "alice" })
      .query(api.wealth.get, {});
    expect(JSON.parse(loaded.data!).goal).toBe("456000.00");
    expect(loaded.revision).toBe(1);
    expect(await bob.query(api.wealth.get, {})).toEqual({
      data: null,
      revision: 0,
    });
    await expect(
      bob.mutation(api.wealth.save, {
        data: JSON.stringify(data),
        revision: 0,
        expectedOwner: "alice",
      }),
    ).rejects.toThrow("ACCOUNT_CHANGED");
  });
  it("rejects a stale device write without losing the saved copy", async () => {
    const t = await setup(),
      alice = t.withIdentity({ subject: "alice" });
    const data = emptyData();
    await alice.mutation(api.wealth.save, {
      data: JSON.stringify(data),
      revision: 0,
      expectedOwner: "alice",
    });
    await expect(
      alice.mutation(api.wealth.save, {
        data: JSON.stringify({ ...data, goal: "1" }),
        revision: 0,
        expectedOwner: "alice",
      }),
    ).rejects.toThrow("WEALTH_CONFLICT");
    expect(JSON.parse((await alice.query(api.wealth.get, {})).data!).goal).toBe(
      data.goal,
    );
  });
  it("updates and deletes individual records atomically", async () => {
    const t = await setup(),
      alice = t.withIdentity({ subject: "alice" });
    const data = emptyData();
    data.accounts = [
      {
        id: "bank",
        name: "Bank",
        institution: "Test",
        type: "Cash",
        currency: "INR",
        balance: "10",
        ownership: "Personal",
        updatedAt: "2026-09-26",
        archived: false,
      },
    ];
    await alice.mutation(api.wealth.save, {
      data: JSON.stringify(data),
      revision: 0,
      expectedOwner: "alice",
    });
    data.accounts = [];
    await alice.mutation(api.wealth.save, {
      data: JSON.stringify(data),
      revision: 1,
      expectedOwner: "alice",
    });
    expect(
      await t.run((ctx) => ctx.db.query("wealthRecords").collect()),
    ).toHaveLength(0);
  });
});
