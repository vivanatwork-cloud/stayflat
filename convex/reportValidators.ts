import { v } from "convex/values";

const entryTypeValidator = v.object({
  marketTrades: v.number(),
  limitTrades: v.number(),
  marketPnl: v.number(),
  limitPnl: v.number(),
  marketWins: v.number(),
  marketLosses: v.number(),
  limitWins: v.number(),
  limitLosses: v.number(),
  marketFills: v.number(),
  limitFills: v.number(),
  marketFees: v.number(),
  limitFees: v.number(),
});
const moonPeriodValidator = v.object({
  pnl: v.number(),
  positions: v.number(),
  wins: v.number(),
  losses: v.number(),
  winRate: v.union(v.number(), v.null()),
  averagePnl: v.union(v.number(), v.null()),
});
const moonPerformanceValidator = v.object({
  newMoon: moonPeriodValidator,
  fullMoon: moonPeriodValidator,
  comparisonReady: v.boolean(),
  betterPeriod: v.union(v.literal("new"), v.literal("full"), v.literal("tie"), v.null()),
});
const snapshotFields = {
  generatedAt: v.optional(v.number()),
  historyLimited: v.optional(v.boolean()),
  positionCount: v.optional(v.number()),
  confidence: v.optional(v.union(v.literal("low"), v.literal("medium"), v.literal("high"))),
  cumulativePnl: v.optional(v.array(v.object({ time: v.number(), value: v.number() }))),
  dailyPnl: v.optional(v.array(v.object({ date: v.string(), pnl: v.number(), positions: v.number() }))),
  mostWinsDay: v.optional(v.union(v.string(), v.null())),
  mostLossesDay: v.optional(v.union(v.string(), v.null())),
  bestCloseNetWeekday: v.optional(v.union(v.object({ day: v.string(), net: v.number() }), v.null())),
  worstCloseNetWeekday: v.optional(v.union(v.object({ day: v.string(), net: v.number() }), v.null())),
  bestOpenNetWeekday: v.optional(v.union(v.object({ day: v.string(), net: v.number() }), v.null())),
  worstOpenNetWeekday: v.optional(v.union(v.object({ day: v.string(), net: v.number() }), v.null())),
  longestWinStreak: v.optional(v.number()),
  longestLossStreak: v.optional(v.number()),
  longestWinStreakMonth: v.optional(v.union(v.string(), v.null())),
  longestLossStreakMonth: v.optional(v.union(v.string(), v.null())),
  avgTradeDurationMinutes: v.optional(v.union(v.number(), v.null())),
  totalPerpsVolume: v.optional(v.number()),
  profitBand: v.optional(v.union(v.object({ start: v.number(), end: v.number() }), v.null())),
  busyDayDate: v.optional(v.union(v.string(), v.null())),
  bestAsset: v.optional(v.union(v.object({ coin: v.string(), pnl: v.number() }), v.null())),
  worstAsset: v.optional(v.union(v.object({ coin: v.string(), pnl: v.number() }), v.null())),
  moonPerformance: v.optional(moonPerformanceValidator),
};

export const reportMetricsValidator = v.union(
  v.object({ empty: v.literal(true), ...snapshotFields }),
  v.object({
    empty: v.literal(false),
    fillCount: v.number(),
    winRate: v.union(v.number(), v.null()),
    fees: v.number(),
    biggestLoss: v.number(),
    biggestWin: v.number(),
    coinCount: v.number(),
    topCoin: v.union(v.string(), v.null()),
    dateFrom: v.number(),
    dateTo: v.number(),
    revengeRatio: v.union(v.number(), v.null()),
    medianCooldown: v.union(v.number(), v.null()),
    dangerBand: v.union(v.object({ start: v.number(), end: v.number() }), v.null()),
    entryType: v.union(entryTypeValidator, v.null()),
    perpPnl: v.union(v.number(), v.null()),
    avgWin: v.number(),
    avgLoss: v.number(),
    longPnl: v.number(),
    shortPnl: v.number(),
    longCount: v.number(),
    shortCount: v.number(),
    busyDayCount: v.number(),
    busyDayPnl: v.number(),
    feeMultiple: v.union(v.number(), v.null()),
    lossShare: v.union(v.number(), v.null()),
    lossCount: v.number(),
    ...snapshotFields,
  }),
);

export const venueNameValidator = v.union(v.literal("hyperliquid"), v.literal("arcus"), v.literal("lighter"));
export const venueSnapshotValidator = v.object({
  venue: venueNameValidator,
  active: v.boolean(),
  metrics: reportMetricsValidator,
  unavailable: v.optional(v.boolean()),
});
export const multiVenueMetricsValidator = v.object({
  combined: reportMetricsValidator,
  hyperliquid: venueSnapshotValidator,
  arcus: venueSnapshotValidator,
  lighter: v.optional(venueSnapshotValidator),
  activeVenues: v.array(venueNameValidator),
});
