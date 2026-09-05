import type { MutationCtx, QueryCtx } from "./_generated/server";

export async function requireOwnerId(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  return identity.subject;
}

export async function requirePaidOwner(ctx: QueryCtx | MutationCtx) {
  const ownerId = await requireOwnerId(ctx);
  const payment = await ctx.db
    .query("payments")
    .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
    .first();
  if (!payment) throw new Error("PAYMENT_REQUIRED");
  return ownerId;
}
