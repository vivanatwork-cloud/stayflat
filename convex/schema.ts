import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { tradeValidator } from "./journalValidators";
import { onboardingAnswersValidator } from "./onboardingValidators";
import { multiVenueMetricsValidator, reportMetricsValidator } from "./reportValidators";
export default defineSchema({
  trades: defineTable({
    wallet: v.string(),
    market: v.string(),
    direction: v.union(v.literal("long"), v.literal("short")),
    entry: v.number(),
    exit: v.optional(v.number()),
    size: v.number(),
    fees: v.number(),
    emotion: v.string(),
    note: v.optional(v.string()),
    openedAt: v.number(),
  }).index("by_wallet", ["wallet"]),
  onboarding: defineTable({
    ownerId: v.string(),
    answers: onboardingAnswersValidator,
    step: v.number(),
    completed: v.boolean(),
    updatedAt: v.number(),
  }).index("by_owner", ["ownerId"]),
  payments: defineTable({
    ownerId: v.string(),
    provider: v.union(v.literal("boomfi"), v.literal("manual")),
    providerPaymentId: v.string(),
    email: v.string(),
    accountEmail: v.optional(v.string()),
    grantedBy: v.optional(v.string()),
    status: v.literal("paid"),
    paidAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_email", ["email"])
    .index("by_provider_payment", ["providerPaymentId"]),
  accessBlocks: defineTable({
    ownerId: v.string(),
    reason: v.string(),
    blockedAt: v.number(),
    blockedBy: v.string(),
    unblockedAt: v.optional(v.number()),
    unblockedBy: v.optional(v.string()),
  }).index("by_owner", ["ownerId"]),
  reportWallets: defineTable({
    ownerId: v.string(),
    address: v.string(),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
    metrics: v.optional(reportMetricsValidator),
    report: v.optional(multiVenueMetricsValidator),
  })
    .index("by_owner", ["ownerId"])
    .index("by_owner_address", ["ownerId", "address"]),
  portfolioReports: defineTable({
    ownerId: v.string(),
    addresses: v.array(v.string()),
    report: multiVenueMetricsValidator,
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_owner", ["ownerId"]),
  reportDownloads: defineTable({
    ownerId: v.string(),
    address: v.string(),
    accountEmail: v.string(),
    downloadedAt: v.number(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_owner_address", ["ownerId", "address"]),
  exchangeRequests: defineTable({
    ownerId: v.string(),
    exchange: v.string(),
    createdAt: v.number(),
  }).index("by_owner", ["ownerId"]),
  journals: defineTable({
    ownerId: v.string(),
    startingCapital: v.number(),
    trades: v.array(tradeValidator),
    updatedAt: v.number(),
  }).index("by_owner", ["ownerId"]),
});
