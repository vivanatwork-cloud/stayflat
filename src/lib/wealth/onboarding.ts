import type { Data } from "./types";
import { hasWealthGoal } from "./goal";
export const setupSteps = [
  "cash",
  "investments",
  "activity",
  "commitments",
  "goal",
  "review",
] as const;
export type SetupStep = (typeof setupSteps)[number];
export type SetupProgress = {
  version: 1;
  step: "welcome" | SetupStep;
  skipped: SetupStep[];
  paused: boolean;
  completedAt?: string;
};
export function isNewWealthWorkspace(data: Data) {
  return (
    !data.onboarding &&
    !data.accounts.length &&
    !data.holdings.length &&
    !data.transactions.length &&
    !data.events.length &&
    !data.cards.length &&
    !data.sources.length &&
    !hasWealthGoal(data)
  );
}
export function shouldShowSetup(data: Data) {
  return data.onboarding
    ? !data.onboarding.paused && !data.onboarding.completedAt
    : isNewWealthWorkspace(data);
}
export function setupSummary(data: Data) {
  const accounts = data.accounts.filter((a) => !a.archived);
  const missing = accounts.filter(
    (a) =>
      a.type !== "Cash" && !data.holdings.some((h) => h.accountId === a.id),
  );
  return {
    cash: accounts.filter((a) => a.type === "Cash").length,
    investments: data.holdings.length,
    missingInvestments: missing,
    activity: data.transactions.length,
    commitments: data.cards.length + data.events.length,
    goal: hasWealthGoal(data),
    foreign: [...accounts, ...data.holdings, ...data.events].some(
      (a) => a.currency !== "INR",
    ),
  };
}
export function updateSetup(
  data: Data,
  step: SetupProgress["step"],
  options: { skip?: SetupStep; paused?: boolean; complete?: boolean } = {},
) {
  const skipped = new Set(data.onboarding?.skipped ?? []);
  if (options.skip) skipped.add(options.skip);
  data.onboarding = {
    version: 1,
    step,
    skipped: [...skipped],
    paused: options.paused ?? false,
    ...(options.complete ? { completedAt: new Date().toISOString() } : {}),
  };
}
