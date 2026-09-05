import { v } from "convex/values";

export const tradeValidator = v.object({
  id: v.string(),
  entryTime: v.number(),
  coin: v.string(),
  strategy: v.string(),
  dir: v.union(v.literal("Long"), v.literal("Short")),
  entryPx: v.string(),
  sizeMode: v.optional(v.union(v.literal("usd"), v.literal("units"))),
  sizeUsd: v.string(),
  units: v.optional(v.string()),
  stopPx: v.string(),
  tpPx: v.string(),
  exitPx: v.string(),
  exitTime: v.union(v.number(), v.null()),
  fees: v.string(),
  emo: v.number(),
  reason: v.string(),
  note: v.string(),
});
