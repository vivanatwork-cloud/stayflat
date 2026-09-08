import { v } from "convex/values";

const markets = v.union(
  v.literal("Crypto perpetuals"), v.literal("Crypto spot"), v.literal("Stocks"),
  v.literal("Stock options"), v.literal("Futures"), v.literal("Forex"),
);
const venues = v.union(
  v.literal("Hyperliquid"), v.literal("Bybit"), v.literal("Coinbase"),
  v.literal("Zerodha"), v.literal("Other"),
);
const tenure = v.union(
  v.literal("Under 6 months"), v.literal("6 to 12 months"),
  v.literal("1 to 3 years"), v.literal("More than 3 years"),
);
const stop = v.union(
  v.literal("Every trade"), v.literal("Most trades"),
  v.literal("Sometimes"), v.literal("Never"),
);
const risk = v.union(
  v.literal("A stop-loss and fixed account percentage"), v.literal("Position size"),
  v.literal("A manual exit"), v.literal("A hedge"), v.literal("Liquidation price"),
  v.literal("I do not have a clear limit"),
);
const leaks = v.union(
  v.literal("Overtrading"), v.literal("Revenge trading after a loss"),
  v.literal("Oversizing"), v.literal("Moving or removing stops"),
  v.literal("Holding losers too long"), v.literal("Chasing entries"),
  v.literal("Trading tired or emotional"), v.literal("Trading without a plan"),
);
const flags = v.union(
  v.literal("I traded with money I could not afford to lose"),
  v.literal("I increased my size to win back losses"),
  v.literal("I tried to cut back or stop and could not"),
  v.literal("I hid my trading or losses from people close to me"),
  v.literal("Trading harmed my sleep, relationships, or work"),
  v.literal("None of these"),
);
const goal = v.union(
  v.literal("Stop blowing up accounts"), v.literal("Take smaller, calmer losses"),
  v.literal("Stick to my plan"), v.literal("Trade less"),
  v.literal("Feel more in control"),
);
const profitability = v.union(
  v.literal("Yes"), v.literal("No"), v.literal("I don't know"), v.literal("Break even"),
);

export const onboardingAnswersValidator = v.object({
  markets: v.optional(v.array(markets)),
  venues: v.optional(v.array(venues)),
  venuesOther: v.optional(v.string()),
  tenure: v.optional(tenure),
  stop: v.optional(stop),
  risk: v.optional(risk),
  leaks: v.optional(v.array(leaks)),
  flags: v.optional(v.array(flags)),
  goal: v.optional(goal),
  profitability: v.optional(profitability),
});
