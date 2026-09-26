import { expect, it } from "vitest";
import { hasWealthGoal } from "./goal";
import { emptyData, projection } from "./engine";
import { encodeWealth, decodeWealth } from "./persistence";
it("starts without a preset goal or a misleading reached projection", () => {
  expect(hasWealthGoal(emptyData())).toBe(false);
  expect(projection(1000n, "0", "10")).toBeNull();
});
it("hides the old inherited target and preserves custom targets", () => {
  expect(hasWealthGoal({ goal: "100000000.00" })).toBe(false);
  expect(hasWealthGoal({ goal: "2500000.00" })).toBe(true);
  expect(hasWealthGoal({ goal: "100000000.00", goalSet: true })).toBe(true);
});
it("saves the member choice including a deliberate choice of the old amount", () => {
  const data = { ...emptyData(), goal: "100000000.00", goalSet: true };
  const stored = encodeWealth(data);
  const restored = decodeWealth(stored.settings, stored.records);
  expect(restored.goal).toBe(data.goal);
  expect(hasWealthGoal(restored)).toBe(true);
});
