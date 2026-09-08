import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireOwnerId } from "./auth";
import { onboardingAnswersValidator } from "./onboardingValidators";

export const get = query({
  args: {},
  handler: async (ctx) => {
    const ownerId = await requireOwnerId(ctx);
    return ctx.db
      .query("onboarding")
      .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
      .unique();
  },
});

export const save = mutation({
  args: {
    answers: onboardingAnswersValidator,
    step: v.number(),
    completed: v.boolean(),
  },
  handler: async (ctx, args) => {
    const ownerId = await requireOwnerId(ctx);
    if (!Number.isInteger(args.step) || args.step < 0 || args.step > 10)
      throw new Error("Invalid onboarding step");
    if (args.completed !== (args.step === 10))
      throw new Error("Invalid onboarding completion state");
    const multipleChoiceAnswers = [
      args.answers.markets,
      args.answers.venues,
      args.answers.leaks,
      args.answers.flags,
    ];
    if (multipleChoiceAnswers.some(
      (answer) => answer && new Set(answer).size !== answer.length,
    )) throw new Error("Duplicate onboarding answer");
    if (
      args.answers.flags?.includes("None of these") &&
      args.answers.flags.length > 1
    ) throw new Error("Choose ‘None of these’ by itself");
    if ((args.answers.venuesOther?.trim().length ?? 0) > 80)
      throw new Error("Exchange or broker name is too long");
    if (args.answers.venues?.includes("Other")) {
      const customVenue = args.answers.venuesOther?.trim();
      if (!customVenue || customVenue.length > 80)
        throw new Error("Enter an exchange or broker name");
    }
    const existing = await ctx.db
      .query("onboarding")
      .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
      .unique();
    const value = { ...args, updatedAt: Date.now() };
    if (existing) {
      await ctx.db.patch(existing._id, value);
      return existing._id;
    }
    return ctx.db.insert("onboarding", { ownerId, ...value });
  },
});
