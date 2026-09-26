import { it, expect } from "vitest";
import { wealthStorageKey } from "./access";
it("keeps legacy migration keys isolated by account", () =>
  expect(wealthStorageKey("one")).not.toBe(wealthStorageKey("two")));
