import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const ADMIN_CLERK_USER_ID = "user_3IhGmEcnUmdKgawvvRzBLtRoH1A";

async function requireAdmin(ctx: { auth: { getUserIdentity: () => Promise<{ subject: string } | null> } }) {
  const identity = await ctx.auth.getUserIdentity();
  if (identity?.subject !== ADMIN_CLERK_USER_ID) throw new Error("Not authorized");
  return identity;
}

export const grantPaidAccess = mutation({
  args: { ownerId: v.string(), accountEmail: v.string(), paymentEmail: v.string() },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const accountEmail = args.accountEmail.trim().toLowerCase();
    const paymentEmail = args.paymentEmail.trim().toLowerCase();
    if (!accountEmail || !paymentEmail) throw new Error("Both emails are required");
    const existing = await ctx.db.query("payments").withIndex("by_owner", (q) => q.eq("ownerId", args.ownerId)).first();
    if (existing) return { created: false, paymentId: existing._id };
    const paidAt = Date.now();
    const paymentId = await ctx.db.insert("payments", {
      ownerId: args.ownerId,
      provider: "manual",
      providerPaymentId: `manual:${args.ownerId}:${paidAt}`,
      email: paymentEmail,
      accountEmail,
      grantedBy: admin.subject,
      status: "paid",
      paidAt,
    });
    return { created: true, paymentId };
  },
});

export const blockUser = mutation({
  args: { ownerId: v.string(), reason: v.string() },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const reason = args.reason.trim();
    if (!reason) throw new Error("A block reason is required");
    const existing = (await ctx.db.query("accessBlocks").withIndex("by_owner", (q) => q.eq("ownerId", args.ownerId)).collect())
      .find((record) => record.unblockedAt == null);
    if (existing) return { changed: false };
    await ctx.db.insert("accessBlocks", { ownerId: args.ownerId, reason, blockedAt: Date.now(), blockedBy: admin.subject });
    return { changed: true };
  },
});

export const unblockUser = mutation({
  args: { ownerId: v.string() },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const active = (await ctx.db.query("accessBlocks").withIndex("by_owner", (q) => q.eq("ownerId", args.ownerId)).collect())
      .find((record) => record.unblockedAt == null);
    if (!active) return { changed: false };
    await ctx.db.patch(active._id, { unblockedAt: Date.now(), unblockedBy: admin.subject });
    return { changed: true };
  },
});

export const reportForAdmin = query({
  args: { walletId: v.id("reportWallets") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const wallet = await ctx.db.get(args.walletId);
    if (!wallet) return null;
    const metrics = wallet.report?.combined ?? wallet.metrics;
    if (!metrics) return null;
    return { address: wallet.address, metrics };
  },
});

export const overview = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const [payments, wallets, onboarding, journals, exchangeRequests, legacyTrades, downloads, accessBlocks] =
      await Promise.all([
        ctx.db.query("payments").collect(),
        ctx.db.query("reportWallets").collect(),
        ctx.db.query("onboarding").collect(),
        ctx.db.query("journals").collect(),
        ctx.db.query("exchangeRequests").collect(),
        ctx.db.query("trades").collect(),
        ctx.db.query("reportDownloads").collect(),
        ctx.db.query("accessBlocks").collect(),
      ]);

    return {
      generatedAt: Date.now(),
      payments: payments.map((payment) => ({
        id: payment._id,
        ownerId: payment.ownerId,
        email: payment.email,
        accountEmail: payment.accountEmail,
        provider: payment.provider,
        providerPaymentId: payment.providerPaymentId,
        paidAt: payment.paidAt,
      })),
      wallets: wallets.map((wallet) => {
        const metrics = wallet.report?.combined ?? wallet.metrics;
        return {
          id: wallet._id,
          ownerId: wallet.ownerId,
          address: wallet.address,
          createdAt: wallet.createdAt,
          updatedAt: wallet.updatedAt,
          report: !metrics || metrics.empty
            ? null
            : {
                pnl: metrics.perpPnl,
                winRate: metrics.winRate,
                fills: metrics.fillCount,
                fees: metrics.fees,
              },
        };
      }),
      onboarding: onboarding.map((record) => ({
        id: record._id,
        ownerId: record.ownerId,
        step: record.step,
        completed: record.completed,
        updatedAt: record.updatedAt,
        answers: record.answers,
      })),
      journals: journals.map((journal) => ({
        id: journal._id,
        ownerId: journal.ownerId,
        startingCapital: journal.startingCapital,
        tradeCount: journal.trades.length,
        updatedAt: journal.updatedAt,
        latestTrades: journal.trades
          .toSorted((a, b) => b.entryTime - a.entryTime)
          .slice(0, 5)
          .map(({ id, entryTime, coin, strategy, dir, exitTime, fees, emo }) => ({
            id,
            entryTime,
            coin,
            strategy,
            dir,
            exitTime,
            fees,
            emotion: emo,
          })),
      })),
      exchangeRequests: exchangeRequests.map((request) => ({
        id: request._id,
        ownerId: request.ownerId,
        exchange: request.exchange,
        createdAt: request.createdAt,
      })),
      downloads: downloads.map((download) => ({
        id: download._id,
        ownerId: download.ownerId,
        address: download.address,
        accountEmail: download.accountEmail,
        downloadedAt: download.downloadedAt,
      })),
      accessBlocks: accessBlocks.map((record) => ({
        id: record._id,
        ownerId: record.ownerId,
        reason: record.reason,
        blockedAt: record.blockedAt,
        blockedBy: record.blockedBy,
        unblockedAt: record.unblockedAt,
        unblockedBy: record.unblockedBy,
      })),
      legacyTradeCount: legacyTrades.length,
    };
  },
});
