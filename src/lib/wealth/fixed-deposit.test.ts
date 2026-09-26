import { it, expect } from "vitest";
import { emptyData, total } from "./engine";
import { fixedDeposit, rememberedInstitutions } from "./fixed-deposit";
import { encodeWealth, decodeWealth } from "./persistence";
const values = {
  name: "Home deposit",
  institution: "Axis",
  invested: "100000",
  rate: "7.25",
  maturity: "2028-09-26",
  currency: "INR",
  ownership: "Personal",
};
it("records deposit terms atomically without changing cash or adding SIP fields", () => {
  const data = emptyData();
  const result = fixedDeposit(data, values, "fd", "2026-09-26");
  data.accounts.push(result.account!);
  data.holdings.push(result.holding);
  const encoded = encodeWealth(data),
    restored = decodeWealth(encoded.settings, encoded.records);
  expect(restored.holdings[0]).toMatchObject({
    name: "Home deposit",
    rate: "7.25",
    maturity: "2028-09-26",
    type: "FDs",
    invested: "100000.00",
  });
  expect(restored.holdings[0].sip).toBeUndefined();
  expect(total(restored)).toBe(10000000n);
  expect(restored.accounts[0].institution).toBe("Axis");
});
it("reuses the bank deposit account and deduplicates remembered names", () => {
  const data = emptyData();
  data.accounts.push(fixedDeposit(data, values, "a", "2026-09-26").account!);
  data.accounts.push({
    ...data.accounts[0],
    id: "cash",
    type: "Cash",
    institution: " AXIS ",
  });
  expect(rememberedInstitutions(data, true)).toEqual(["Axis"]);
  expect(
    fixedDeposit(data, { ...values, institution: "axis" }, "b", "2026-09-26")
      .account,
  ).toBeUndefined();
});
it("keeps ownership and currencies separate", () => {
  const data = emptyData();
  data.accounts.push(fixedDeposit(data, values, "a", "2026-09-26").account!);
  expect(
    fixedDeposit(data, { ...values, ownership: "Business" }, "b", "2026-09-26")
      .account,
  ).toBeDefined();
});
it("rejects missing terms, invalid dates and negative rates", () => {
  for (const change of [
    { rate: "" },
    { rate: "-1" },
    { maturity: "2028-02-31" },
    { institution: "" },
    { invested: "0" },
  ])
    expect(() =>
      fixedDeposit(emptyData(), { ...values, ...change }, "a", "2026-09-26"),
    ).toThrow();
});
