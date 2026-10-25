import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requirePaidOwner } from "./auth";
import { tradeValidator } from "./journalValidators";
import { migrateLegacyJournal, parseReferenceState } from "../src/lib/journal/reference-state";
import { parseJournalState } from "../src/lib/journal/validation";

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
    const upgraded = await ctx.db.query("journalSettings").withIndex("by_owner", (q) => q.eq("ownerId", ownerId)).unique();
    if (upgraded) throw new Error("JOURNAL_UPGRADED: Reload to use the new journal.");
    if (args.startingCapital < 0 || args.trades.length > 10000) throw new Error("Invalid journal data");
    const existing = await ctx.db.query("journals").withIndex("by_owner", (q) => q.eq("ownerId", ownerId)).unique();
    const value = { startingCapital: args.startingCapital, trades: args.trades, updatedAt: Date.now() };
    if (existing) await ctx.db.patch(existing._id, value);
    else await ctx.db.insert("journals", { ownerId, ...value });
    return { updatedAt: value.updatedAt };
  },
});

export const referenceGet = query({
  args: {},
  handler: async (ctx) => {
    const ownerId = await requirePaidOwner(ctx);
    const settings = await ctx.db.query("journalSettings").withIndex("by_owner", (q) => q.eq("ownerId", ownerId)).unique();
    if (settings) {
      const entries = await ctx.db.query("journalEntries").withIndex("by_owner", (q) => q.eq("ownerId", ownerId)).collect();
      return { state: JSON.stringify({ ...JSON.parse(settings.settings), trades: entries.map((e) => JSON.parse(e.trade)) }), revision: settings.revision };
    }
    const legacy = await ctx.db.query("journals").withIndex("by_owner", (q) => q.eq("ownerId", ownerId)).unique();
    const parsed = parseJournalState(legacy ?? { startingCapital: 10000, trades: [], updatedAt: 0 });
    if (!parsed.ok) throw new Error("Your saved journal needs review before it can be opened. No data was changed.");
    return { state: JSON.stringify(migrateLegacyJournal(parsed.value)), revision: legacy?.updatedAt ?? 0 };
  },
});

export const referenceSave = mutation({
  args: { state: v.string(), revision: v.number(), expectedOwner: v.string() },
  handler: async (ctx, args) => {
    const ownerId = await requirePaidOwner(ctx);
    if (ownerId !== args.expectedOwner) throw new Error("ACCOUNT_CHANGED");
    if (args.state.length > 3_000_000) throw new Error("This update is too large. Export a backup and reduce the import window.");
    const state = parseReferenceState(JSON.parse(args.state));
    const existing = await ctx.db.query("journalSettings").withIndex("by_owner", (q) => q.eq("ownerId", ownerId)).unique();
    const legacy = existing ? null : await ctx.db.query("journals").withIndex("by_owner", (q) => q.eq("ownerId", ownerId)).unique();
    if ((existing?.revision ?? legacy?.updatedAt ?? 0) !== args.revision) throw new Error("JOURNAL_CONFLICT");
    const entries = await ctx.db.query("journalEntries").withIndex("by_owner", (q) => q.eq("ownerId", ownerId)).collect();
    const byId = new Map(entries.map((e) => [e.tradeId, e]));
    for (const trade of state.trades) {
      const previous = byId.get(trade.id);
      const serialized = JSON.stringify(trade);
      if (!previous) await ctx.db.insert("journalEntries", { ownerId, tradeId: trade.id, trade: serialized });
      else if (serialized !== previous.trade) await ctx.db.patch(previous._id, { trade: serialized });
      byId.delete(trade.id);
    }
    for (const removed of byId.values()) await ctx.db.delete(removed._id);
    const settings = { tradingCapital: state.tradingCapital, cryptoValue: state.cryptoValue, netWorth: state.netWorth, rules: state.rules, sync: state.sync, target: state.target ?? null };
    const value = { settings: JSON.stringify(settings), revision: args.revision + 1, updatedAt: Date.now() };
    if (existing) await ctx.db.patch(existing._id, value);
    else await ctx.db.insert("journalSettings", { ownerId, ...value });
    // Retain the original journals record as a migration backup.
    return { revision: value.revision };
  },
});
