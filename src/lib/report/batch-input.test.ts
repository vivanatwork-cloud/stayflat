import { describe, expect, it } from "vitest";
import { parseBatchWallets } from "./batch-input";

const first = "0xbe74E8E6fa8F47cf01d9a6C9F6cf4458720FFC33";
const second = "0xcea431a20cd70b0aa6380b31835f4022e749529d";

describe("parseBatchWallets", () => {
  it("normalizes one to ten wallets", () => {
    expect(parseBatchWallets([{ address: first, includeLighter: false }])).toEqual([
      { address: first.toLowerCase(), includeLighter: false, lighterToken: "" },
    ]);
  });

  it("accepts a Lighter token only as request data", () => {
    expect(parseBatchWallets([{ address: second, includeLighter: true, lighterToken: " ro:key " }])?.[0])
      .toEqual({ address: second, includeLighter: true, lighterToken: "ro:key" });
  });

  it("rejects duplicates, missing Lighter tokens, and more than ten wallets", () => {
    expect(parseBatchWallets([{ address: first, includeLighter: false }, { address: first.toLowerCase(), includeLighter: false }])).toBeNull();
    expect(parseBatchWallets([{ address: first, includeLighter: true }])).toBeNull();
    expect(parseBatchWallets(Array.from({ length: 11 }, (_, index) => ({ address: `0x${String(index).padStart(40, "0")}`, includeLighter: false })))).toBeNull();
  });
});
