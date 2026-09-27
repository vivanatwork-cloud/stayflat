import { expect, it } from "vitest";
import { screenshotDrafts, screenshotLines } from "./crypto-screenshot";
it("reads coins outside the old list, grouped quantities and labelled amounts", () => {
  const rows = screenshotDrafts(
    "Hyperliquid HYPE\nQuantity: 1,234.56789\nCurrent value: $52,000.25\nPurchase cost: $40,000.00\nPepe PEPE\nBalance: 12,000,000 PEPE\nValue: $95.25",
    "INR",
  );
  expect(rows).toHaveLength(2);
  expect(rows[0]).toMatchObject({
    name: "Hyperliquid",
    symbol: "HYPE",
    quantity: "1234.56789",
    value: "52000.25",
    invested: "40000.00",
    currency: "USD",
  });
  expect(rows[1]).toMatchObject({
    symbol: "PEPE",
    quantity: "12000000",
    value: "95.25",
    invested: "",
  });
});
it("reads table columns without confusing token price with holding value", () => {
  const rows = screenshotDrafts(
    "Asset\tPrice\tQuantity\tValue\nBitcoin BTC\t$100,000\t0.025\t$2,500\nArbitrum ARB\t$0.50\t1,250.50\t$625.25",
    "USD",
  );
  expect(rows).toHaveLength(2);
  expect(rows[0]).toMatchObject({
    symbol: "BTC",
    quantity: "0.025",
    value: "2500",
    invested: "",
  });
  expect(rows[1]).toMatchObject({
    symbol: "ARB",
    quantity: "1250.50",
    value: "625.25",
  });
});
it("supports unfamiliar tickers and quantities written after the symbol", () => {
  expect(
    screenshotDrafts(
      "Example Token XYZ\nXYZ 0.000000125\nMarket price: $5\nValue: $0.01",
      "USD",
    )[0],
  ).toMatchObject({
    name: "Example Token",
    symbol: "XYZ",
    quantity: "0.000000125",
    value: "0.01",
  });
});
it("does not infer values or cost from market prices or wallet totals", () => {
  const rows = screenshotDrafts(
    "Total wallet value $12,000\nBitcoin BTC\n0.01 BTC\nPrice $100,000\n24h change +5%\nEthereum ETH\nQuantity: 2",
    "USD",
  );
  expect(rows).toHaveLength(2);
  expect(rows.every((r) => r.value === "" && r.invested === "")).toBe(true);
  expect(screenshotDrafts("Wallet balance $500\nUSD\nBUY SELL", "USD")).toEqual(
    [],
  );
});
it("preserves table columns when OCR returns separate blocks in a different order", () => {
  const w = (text: string, x: number, y: number) => ({
    text,
    bbox: { x0: x, y0: y, x1: x + text.length * 10, y1: y + 20 },
  });
  const words = [
    w("$2500", 600, 60),
    w("BTC", 140, 60),
    w("Value", 600, 10),
    w("Bitcoin", 20, 60),
    w("Quantity", 350, 10),
    w("0.025", 350, 60),
    w("Asset", 20, 10),
  ];
  const lines = screenshotLines(words);
  expect(
    screenshotDrafts(
      { text: lines.map((l) => l.text).join("\n"), lines },
      "USD",
    )[0],
  ).toMatchObject({ symbol: "BTC", quantity: "0.025", value: "2500" });
});
it("reads stacked holdings cells, without inventing a USDT holding from a value column", () => {
  const rows = screenshotDrafts(
    "Coin\tPrice\tHoldings\nHYPE\t42.00 USDT\t12.5 HYPE\nHyperliquid\t\t525.00 USDT\nBTC\t100000 USDT\t0.02 BTC\nBitcoin\t\t2000 USDT",
    "USD",
  );
  expect(rows.map((r) => r.symbol)).toEqual(["HYPE", "BTC"]);
  expect(rows[0]).toMatchObject({
    quantity: "12.5",
    value: "525.00",
    currency: "USDT",
  });
});
it("keeps a missing ticker row separate instead of borrowing its value for another coin", () => {
  const rows = screenshotDrafts(
    "Asset\tQuantity\tValue\nBTC\t0.1\t$10000\n\t25\t$100\nExample Token",
    "USD",
  );
  expect(rows).toHaveLength(2);
  expect(rows[0]).toMatchObject({
    symbol: "BTC",
    quantity: "0.1",
    value: "10000",
  });
  expect(rows[1]).toMatchObject({
    name: "Example Token",
    symbol: "",
    quantity: "25",
    value: "100",
  });
});
it("normalises ticker letter case in data cells", () => {
  expect(
    screenshotDrafts(
      "Asset\tQuantity\tValue\nxyz\t0.000000125\t$0.01\nExample Token",
      "USD",
    )[0],
  ).toMatchObject({
    name: "Example Token",
    symbol: "XYZ",
    quantity: "0.000000125",
  });
});
it("reads Indian digit grouping and tokens beginning with a digit", () => {
  const rows = screenshotDrafts(
    "Asset\tQuantity\tValue\n1INCH\t1,23,456.25\t₹12,34,567.50",
    "USD",
  );
  expect(rows[0]).toMatchObject({
    symbol: "1INCH",
    quantity: "123456.25",
    value: "1234567.50",
    currency: "INR",
  });
});
it("uses the value column currency and ignores portfolio totals after a coin", () => {
  expect(
    screenshotDrafts("Asset\tQuantity\tValue (USDT)\nHYPE\t25\t1000", "USD")[0],
  ).toMatchObject({ currency: "USDT", value: "1000" });
  expect(
    screenshotDrafts(
      "Bitcoin BTC\nQuantity: 0.01\nTotal wallet value $10000",
      "USD",
    )[0].value,
  ).toBe("");
});
