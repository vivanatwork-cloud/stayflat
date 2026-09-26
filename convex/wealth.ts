import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requirePaidOwner } from "./auth";
import {
  encodeWealth,
  decodeWealth,
  MAX_WEALTH_BYTES,
} from "../src/lib/wealth/persistence";
export const get = query({
  args: {},
  handler: async (ctx) => {
    const ownerId = await requirePaidOwner(ctx);
    const settings = await ctx.db
      .query("wealthSettings")
      .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
      .unique();
    if (!settings) return { data: null, revision: 0 };
    const records = await ctx.db
      .query("wealthRecords")
      .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
      .collect();
    return {
      data: JSON.stringify(decodeWealth(settings.settings, records)),
      revision: settings.revision,
    };
  },
});
export const save = mutation({
  args: { data: v.string(), revision: v.number(), expectedOwner: v.string() },
  handler: async (ctx, args) => {
    const ownerId = await requirePaidOwner(ctx);
    if (ownerId !== args.expectedOwner) throw new Error("ACCOUNT_CHANGED");
    if (!Number.isSafeInteger(args.revision) || args.revision < 0)
      throw new Error("INVALID_REVISION");
    if (args.data.length > MAX_WEALTH_BYTES)
      throw new Error("WEALTH_TOO_LARGE");
    const next = encodeWealth(JSON.parse(args.data));
    const current = await ctx.db
      .query("wealthSettings")
      .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
      .unique();
    if ((current?.revision ?? 0) !== args.revision)
      throw new Error("WEALTH_CONFLICT");
    const records = await ctx.db
      .query("wealthRecords")
      .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
      .collect();
    const key = (r: { kind: string; recordId: string; part: number }) =>
      JSON.stringify([r.kind, r.recordId, r.part]);
    const existing = new Map(records.map((r) => [key(r), r]));
    for (const row of next.records) {
      const prior = existing.get(key(row));
      if (prior) {
        if (prior.payload !== row.payload)
          await ctx.db.patch(prior._id, { payload: row.payload });
        existing.delete(key(row));
      } else await ctx.db.insert("wealthRecords", { ownerId, ...row });
    }
    for (const row of existing.values()) await ctx.db.delete(row._id);
    const revision = args.revision + 1;
    if (current)
      await ctx.db.patch(current._id, {
        settings: next.settings,
        revision,
        updatedAt: Date.now(),
      });
    else
      await ctx.db.insert("wealthSettings", {
        ownerId,
        settings: next.settings,
        revision,
        updatedAt: Date.now(),
      });
    return { revision };
  },
});
