import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const submit = mutation({
  args: { writeSecret: v.string(), ownerId: v.string(), exchange: v.string() },
  handler: async (ctx, args) => {
    if (!process.env.PAYMENT_WRITE_SECRET || args.writeSecret !== process.env.PAYMENT_WRITE_SECRET)
      throw new Error("Unauthorized request");
    const exchange = args.exchange.trim().slice(0, 80);
    if (!exchange) throw new Error("Exchange is required");
    const existing = await ctx.db
      .query("exchangeRequests")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.ownerId))
      .collect();
    if (existing.some((request) => request.exchange.toLowerCase() === exchange.toLowerCase()))
      return existing.find((request) => request.exchange.toLowerCase() === exchange.toLowerCase())!._id;
    return ctx.db.insert("exchangeRequests", { ownerId: args.ownerId, exchange, createdAt: Date.now() });
  },
});
