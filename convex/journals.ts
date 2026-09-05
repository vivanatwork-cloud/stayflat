import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requirePaidOwner } from "./auth";
import { tradeValidator } from "./journalValidators";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const ownerId = await requirePaidOwner(ctx);
    return ctx.db.query("journals").withIndex("by_owner", (q) => q.eq("ownerId", ownerId)).unique();
  },
});

export const save = mutation({
  args: { startingCapital: v.number(), trades: v.array(tradeValidator) },
  handler: async (ctx, args) => {
    const ownerId = await requirePaidOwner(ctx);
    if (args.startingCapital < 0 || args.trades.length > 10000) throw new Error("Invalid journal data");
    const existing = await ctx.db.query("journals").withIndex("by_owner", (q) => q.eq("ownerId", ownerId)).unique();
    const value = { startingCapital: args.startingCapital, trades: args.trades, updatedAt: Date.now() };
    if (existing) await ctx.db.patch(existing._id, value);
    else await ctx.db.insert("journals", { ownerId, ...value });
    return { updatedAt: value.updatedAt };
  },
});
