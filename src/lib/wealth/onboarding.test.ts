import { describe, it, expect } from "vitest";
import { emptyData } from "./engine";
import {
  isNewWealthWorkspace,
  shouldShowSetup,
  setupSummary,
  updateSetup,
} from "./onboarding";
import { encodeWealth, decodeWealth } from "./persistence";
describe("guided setup", () => {
  it("automatically opens for a new account, but does not interrupt established users", () => {
    const data = emptyData();
    expect(isNewWealthWorkspace(data)).toBe(true);
    expect(shouldShowSetup(data)).toBe(true);
    data.goal = "2500000";
    data.goalSet = true;
    expect(shouldShowSetup(data)).toBe(false);
  });
  it("persists pause, step and skipped sections across devices", () => {
    const data = emptyData();
    updateSetup(data, "investments", { skip: "cash", paused: true });
    const stored = encodeWealth(data);
    const loaded = decodeWealth(stored.settings, stored.records);
    expect(loaded.onboarding).toEqual({
      version: 1,
      step: "investments",
      skipped: ["cash"],
      paused: true,
    });
    expect(shouldShowSetup(loaded)).toBe(false);
    updateSetup(loaded, "investments");
    expect(shouldShowSetup(loaded)).toBe(true);
    expect(loaded.onboarding?.skipped).toEqual(["cash"]);
  });
  it("finishes explicitly and can be reopened without deleting records", () => {
    const data = emptyData();
    data.goal = "3000000";
    data.goalSet = true;
    updateSetup(data, "review", { complete: true });
    expect(shouldShowSetup(data)).toBe(false);
    expect(data.onboarding?.completedAt).toBeTruthy();
    updateSetup(data, "cash");
    expect(shouldShowSetup(data)).toBe(true);
    expect(data.goal).toBe("3000000");
  });
  it("flags investment accounts with no values and non-INR records", () => {
    const data = emptyData();
    data.accounts = [
      {
        id: "broker",
        name: "Broker",
        institution: "Test",
        type: "US Stocks",
        currency: "USD",
        balance: "0",
        ownership: "Personal",
        updatedAt: "2026-09-26",
        archived: false,
      },
    ];
    expect(setupSummary(data).foreign).toBe(true);
    expect(setupSummary(data).missingInvestments).toHaveLength(1);
    data.holdings = [
      {
        id: "h",
        accountId: "broker",
        name: "Fund",
        symbol: "ETF",
        type: "US Stocks",
        currency: "USD",
        quantity: "1",
        invested: "10",
        value: "12",
        updatedAt: "2026-09-26",
      },
    ];
    expect(setupSummary(data).missingInvestments).toHaveLength(0);
  });
});
