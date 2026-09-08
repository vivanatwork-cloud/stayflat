import { mutation, query, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { multiVenueMetricsValidator, reportMetricsValidator } from "./reportValidators";
import { requireOwnerId } from "./auth";

async function claimAccountByEmail(
  ctx: MutationCtx,
  ownerId: string,
  emailAddress: string,
) {
    const email = emailAddress.trim().toLowerCase();
    const currentPayment = await ctx.db
      .query("payments")
      .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
      .first();
    const legacyPayments = (await ctx.db
      .query("payments")
      .withIndex("by_email", (q) => q.eq("email", email))
      .collect()).filter((payment) => payment.ownerId !== ownerId);
    if (legacyPayments.length === 0) {
      return { migrated: false, hasPaid: Boolean(currentPayment) };
    }

    const legacyOwnerIds = [...new Set(legacyPayments.map((payment) => payment.ownerId))];
    for (const payment of legacyPayments) {
      await ctx.db.patch(payment._id, { ownerId });
    }

    const [currentOnboarding, currentJournal, currentWallets] = await Promise.all([
      ctx.db.query("onboarding").withIndex("by_owner", (q) => q.eq("ownerId", ownerId)).first(),
      ctx.db.query("journals").withIndex("by_owner", (q) => q.eq("ownerId", ownerId)).first(),
      ctx.db.query("reportWallets").withIndex("by_owner", (q) => q.eq("ownerId", ownerId)).collect(),
    ]);
    const currentAddresses = new Set(currentWallets.map((wallet) => wallet.address));
    let onboardingClaimed = Boolean(currentOnboarding);
    let journalClaimed = Boolean(currentJournal);

    for (const legacyOwnerId of legacyOwnerIds) {
      const [onboarding, journals, wallets, requests] = await Promise.all([
        ctx.db.query("onboarding").withIndex("by_owner", (q) => q.eq("ownerId", legacyOwnerId)).collect(),
        ctx.db.query("journals").withIndex("by_owner", (q) => q.eq("ownerId", legacyOwnerId)).collect(),
        ctx.db.query("reportWallets").withIndex("by_owner", (q) => q.eq("ownerId", legacyOwnerId)).collect(),
        ctx.db.query("exchangeRequests").withIndex("by_owner", (q) => q.eq("ownerId", legacyOwnerId)).collect(),
      ]);
      if (!onboardingClaimed && onboarding[0]) {
        await ctx.db.patch(onboarding[0]._id, { ownerId });
        onboardingClaimed = true;
      }
      if (!journalClaimed && journals[0]) {
        await ctx.db.patch(journals[0]._id, { ownerId });
        journalClaimed = true;
      }
      for (const wallet of wallets) {
        if (!currentAddresses.has(wallet.address)) {
          await ctx.db.patch(wallet._id, { ownerId });
          currentAddresses.add(wallet.address);
        }
      }
      for (const request of requests) {
        await ctx.db.patch(request._id, { ownerId });
      }
    }
    return { migrated: true, hasPaid: true };
}

export const claimLegacyAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    const email = identity.email;
    if (!email) {
      const payment = await ctx.db
        .query("payments")
        .withIndex("by_owner", (q) => q.eq("ownerId", identity.subject))
        .first();
      return { migrated: false, hasPaid: Boolean(payment) };
    }
    return claimAccountByEmail(ctx, identity.subject, email);
  },
});

export const claimLegacyAccountByEmail = mutation({
  args: {
    writeSecret: v.string(),
    ownerId: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const expectedSecret = process.env.PAYMENT_WRITE_SECRET;
    if (!expectedSecret || args.writeSecret !== expectedSecret) {
      throw new Error("Unauthorized account recovery");
    }
    return claimAccountByEmail(ctx, args.ownerId, args.email);
  },
});

export const hasPaid = query({
  args: {},
  handler: async (ctx) => {
    const ownerId = await requireOwnerId(ctx);
    const payment = await ctx.db
      .query("payments")
      .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
      .first();
    return Boolean(payment);
  },
});

export const reportAccess = query({
  args: {},
  handler: async (ctx) => {
    const ownerId = await requireOwnerId(ctx);
    const [wallets, blocks] = await Promise.all([
      ctx.db.query("reportWallets").withIndex("by_owner", (q) => q.eq("ownerId", ownerId)).collect(),
      ctx.db.query("accessBlocks").withIndex("by_owner", (q) => q.eq("ownerId", ownerId)).collect(),
    ]);
    return {
      used: wallets.length,
      limit: Number.MAX_SAFE_INTEGER,
      unlimited: true,
      blocked: blocks.some((record) => record.unblockedAt == null),
      addresses: wallets.map((wallet) => wallet.address),
    };
  },
});

export const reportHistory = query({
  args: {},
  handler: async (ctx) => {
    const ownerId = await requireOwnerId(ctx);
    const wallets = await ctx.db
      .query("reportWallets")
      .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
      .collect();
    return wallets
      .sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt))
      .map(({ address, metrics, report, createdAt, updatedAt }) => ({ address, metrics, report, createdAt, updatedAt }));
  },
});

export const savedPortfolioReport = query({
  args: {},
  handler: async (ctx) => {
    const ownerId = await requireOwnerId(ctx);
    return ctx.db.query("portfolioReports").withIndex("by_owner", (q) => q.eq("ownerId", ownerId)).first();
  },
});

export const savedReport = query({
  args: { address: v.string() },
  handler: async (ctx, args) => {
    const ownerId = await requireOwnerId(ctx);
    const wallet = await ctx.db
      .query("reportWallets")
      .withIndex("by_owner_address", (q) => q.eq("ownerId", ownerId).eq("address", args.address.toLowerCase()))
      .unique();
    return wallet?.report
      ? { address: wallet.address, report: wallet.report }
      : wallet?.metrics ? { address: wallet.address, metrics: wallet.metrics } : null;
  },
});

export const recordReportDownload = mutation({
  args: { writeSecret: v.string(), ownerId: v.string(), address: v.string(), accountEmail: v.string() },
  handler: async (ctx, args) => {
    const expectedSecret = process.env.PAYMENT_WRITE_SECRET;
    if (!expectedSecret || args.writeSecret !== expectedSecret) throw new Error("Unauthorized download write");
    const address = args.address.trim().toLowerCase();
    const wallet = await ctx.db.query("reportWallets").withIndex("by_owner_address", (q) => q.eq("ownerId", args.ownerId).eq("address", address)).unique();
    const savedMetrics = wallet?.report?.combined ?? wallet?.metrics;
    if (!savedMetrics || savedMetrics.empty) throw new Error("REPORT_NOT_FOUND");
    return ctx.db.insert("reportDownloads", {
      ownerId: args.ownerId,
      address,
      accountEmail: args.accountEmail.trim().toLowerCase(),
      downloadedAt: Date.now(),
    });
  },
});

export const reportPageData = query({
  args: { address: v.optional(v.string()) },
  handler: async (ctx, { address }) => {
    const ownerId = await requireOwnerId(ctx);
    const [wallets, blocks] = await Promise.all([
      ctx.db.query("reportWallets").withIndex("by_owner", (q) => q.eq("ownerId", ownerId)).collect(),
      ctx.db.query("accessBlocks").withIndex("by_owner", (q) => q.eq("ownerId", ownerId)).collect(),
    ]);
    const history = wallets
      .toSorted((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt))
      .map(({ address: walletAddress, metrics, report, createdAt, updatedAt }) => ({
        address: walletAddress,
        metrics,
        report,
        createdAt,
        updatedAt,
      }));
    const normalizedAddress = address?.toLowerCase();
    const wallet = normalizedAddress
      ? wallets.find((item) => item.address === normalizedAddress)
      : undefined;
    return {
      access: {
        used: wallets.length,
        limit: Number.MAX_SAFE_INTEGER,
        unlimited: true,
        blocked: blocks.some((record) => record.unblockedAt == null),
        addresses: wallets.map((item) => item.address),
      },
      history,
      portfolio: await ctx.db.query("portfolioReports").withIndex("by_owner", (q) => q.eq("ownerId", ownerId)).first(),
      saved: wallet?.report
        ? { address: wallet.address, report: wallet.report }
        : wallet?.metrics ? { address: wallet.address, metrics: wallet.metrics } : null,
    };
  },
});

export const recordPortfolioReport = mutation({
  args: {
    writeSecret: v.string(),
    ownerId: v.string(),
    addresses: v.array(v.string()),
    report: multiVenueMetricsValidator,
  },
  handler: async (ctx, args) => {
    const expectedSecret = process.env.PAYMENT_WRITE_SECRET;
    if (!expectedSecret || args.writeSecret !== expectedSecret) throw new Error("Unauthorized portfolio write");
    const activeBlock = (await ctx.db.query("accessBlocks").withIndex("by_owner", (q) => q.eq("ownerId", args.ownerId)).collect())
      .some((record) => record.unblockedAt == null);
    if (activeBlock) throw new Error("ACCESS_BLOCKED");
    const addresses = [...new Set(args.addresses.map((address) => address.toLowerCase()))].toSorted();
    if (addresses.length < 2) throw new Error("PORTFOLIO_ADDRESSES_REQUIRED");
    const existing = await ctx.db.query("portfolioReports").withIndex("by_owner", (q) => q.eq("ownerId", args.ownerId)).first();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { addresses, report: args.report, updatedAt: now });
      return existing._id;
    }
    return ctx.db.insert("portfolioReports", { ownerId: args.ownerId, addresses, report: args.report, createdAt: now, updatedAt: now });
  },
});

export const recordReportBatch = mutation({
  args: {
    writeSecret: v.string(),
    ownerId: v.string(),
    reports: v.array(v.object({ address: v.string(), report: multiVenueMetricsValidator })),
    portfolio: v.optional(v.object({ addresses: v.array(v.string()), report: multiVenueMetricsValidator })),
  },
  handler: async (ctx, args) => {
    const expectedSecret = process.env.PAYMENT_WRITE_SECRET;
    if (!expectedSecret || args.writeSecret !== expectedSecret) throw new Error("Unauthorized batch write");
    const activeBlock = (await ctx.db.query("accessBlocks").withIndex("by_owner", (q) => q.eq("ownerId", args.ownerId)).collect())
      .some((record) => record.unblockedAt == null);
    if (activeBlock) throw new Error("ACCESS_BLOCKED");
    if (args.reports.length < 1 || args.reports.length > 10) throw new Error("BATCH_SIZE_INVALID");

    const normalizedReports = args.reports.map((item) => ({ ...item, address: item.address.toLowerCase() }));
    if (new Set(normalizedReports.map((item) => item.address)).size !== normalizedReports.length) throw new Error("DUPLICATE_WALLETS");
    const existingWallets = await ctx.db.query("reportWallets").withIndex("by_owner", (q) => q.eq("ownerId", args.ownerId)).collect();
    const existingByAddress = new Map(existingWallets.map((wallet) => [wallet.address, wallet]));
    const now = Date.now();
    for (const item of normalizedReports) {
      const existing = existingByAddress.get(item.address);
      if (existing) await ctx.db.patch(existing._id, { report: item.report, updatedAt: now });
      else await ctx.db.insert("reportWallets", { ownerId: args.ownerId, address: item.address, report: item.report, createdAt: now, updatedAt: now });
    }

    if (args.portfolio) {
      const addresses = [...new Set(args.portfolio.addresses.map((address) => address.toLowerCase()))].toSorted();
      if (addresses.length < 2 || addresses.length > 10) throw new Error("PORTFOLIO_ADDRESSES_INVALID");
      const existingPortfolio = await ctx.db.query("portfolioReports").withIndex("by_owner", (q) => q.eq("ownerId", args.ownerId)).first();
      if (existingPortfolio) await ctx.db.patch(existingPortfolio._id, { addresses, report: args.portfolio.report, updatedAt: now });
      else await ctx.db.insert("portfolioReports", { ownerId: args.ownerId, addresses, report: args.portfolio.report, createdAt: now, updatedAt: now });
    }

    return { saved: normalizedReports.length, portfolioSaved: Boolean(args.portfolio) };
  },
});

export const recordReportWallet = mutation({
  args: {
    writeSecret: v.string(),
    ownerId: v.string(),
    address: v.string(),
    metrics: v.optional(reportMetricsValidator),
    report: v.optional(multiVenueMetricsValidator),
  },
  handler: async (ctx, args) => {
    const expectedSecret = process.env.PAYMENT_WRITE_SECRET;
    if (!expectedSecret || args.writeSecret !== expectedSecret)
      throw new Error("Unauthorized report write");

    const address = args.address.toLowerCase();
    const activeBlock = (await ctx.db.query("accessBlocks").withIndex("by_owner", (q) => q.eq("ownerId", args.ownerId)).collect())
      .some((record) => record.unblockedAt == null);
    if (activeBlock) throw new Error("ACCESS_BLOCKED");
    if (!args.metrics && !args.report) throw new Error("REPORT_DATA_REQUIRED");
    const existing = await ctx.db
      .query("reportWallets")
      .withIndex("by_owner_address", (q) => q.eq("ownerId", args.ownerId).eq("address", address))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        ...(args.metrics ? { metrics: args.metrics } : {}),
        ...(args.report ? { report: args.report } : {}),
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    const now = Date.now();
    return ctx.db.insert("reportWallets", {
      ownerId: args.ownerId,
      address,
      ...(args.metrics ? { metrics: args.metrics } : {}),
      ...(args.report ? { report: args.report } : {}),
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const recordVerified = mutation({
  args: {
    writeSecret: v.string(),
    ownerId: v.string(),
    providerPaymentId: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const expectedSecret = process.env.PAYMENT_WRITE_SECRET;
    if (!expectedSecret || args.writeSecret !== expectedSecret) {
      throw new Error("Unauthorized payment write");
    }

    const existing = await ctx.db
      .query("payments")
      .withIndex("by_provider_payment", (q) =>
        q.eq("providerPaymentId", args.providerPaymentId),
      )
      .unique();

    if (existing) {
      if (existing.ownerId !== args.ownerId) {
        throw new Error("Payment is already linked to another account");
      }
      return existing._id;
    }

    return ctx.db.insert("payments", {
      ownerId: args.ownerId,
      provider: "boomfi",
      providerPaymentId: args.providerPaymentId,
      email: args.email.toLowerCase(),
      status: "paid",
      paidAt: Date.now(),
    });
  },
});
