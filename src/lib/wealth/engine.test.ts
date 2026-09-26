import { test } from "vitest";
import assert from "node:assert/strict";
import {
  minor,
  decimal,
  inr,
  emptyData,
  total,
  flow,
  snapshot,
  projection,
} from "./engine";
import { importTransactions, parseCsv } from "./import";
const account = {
  id: "cash",
  name: "Bank",
  institution: "Axis",
  type: "Cash" as const,
  currency: "INR" as const,
  balance: "100.10",
  ownership: "Personal" as const,
  updatedAt: "2026-09-01",
  archived: false,
};
test("money arithmetic preserves paise and rounds currency conversion", () => {
  assert.equal(decimal(minor("0.10") + minor("0.20")), "0.30");
  assert.equal(decimal(inr("1.25", "USD", "85.23")), "106.54");
  assert.equal(decimal(inr("-1.25", "USD", "85.23")), "-106.54");
  assert.throws(() => minor("12.345"));
});
test("assets exclude archived accounts and value FD at principal", () => {
  const d = emptyData();
  d.accounts = [
    account,
    { ...account, id: "fd", type: "FDs" },
    { ...account, id: "archived", archived: true },
  ];
  d.holdings = [
    {
      id: "h",
      accountId: "fd",
      name: "FD",
      symbol: "FD",
      type: "FDs",
      currency: "INR",
      quantity: "1",
      invested: "500",
      value: "550",
      updatedAt: "2026-09-01",
    },
  ];
  assert.equal(decimal(total(d)), "600.10");
});
test("transfers and repayments do not distort flow; refunds reduce spending", () => {
  const d = emptyData();
  const row = {
    id: "t",
    accountId: "cash",
    date: "2026-09-01",
    currency: "INR" as const,
    merchant: "Entry",
    category: "Other",
    ownership: "Personal" as const,
    note: "",
  };
  d.transactions = [
    { ...row, direction: "Income", amount: "1000" },
    { ...row, direction: "Expense", amount: "200" },
    { ...row, direction: "Expense", amount: "-50" },
    { ...row, direction: "Transfer", amount: "800" },
  ];
  assert.deepEqual(flow(d), { income: 100000n, expenses: 15000n, net: 85000n });
});
test("snapshots retain their original exchange rate and composition", () => {
  const d = emptyData();
  d.accounts = [{ ...account, currency: "USD", balance: "100" }];
  d.fx = "80";
  const s = snapshot(d);
  d.fx = "90";
  assert.equal(s.fx, "80");
  assert.equal(s.total, "8000.00");
  assert.equal(decimal(total(d)), "9000.00");
});
test("CSV supports quoted merchant commas and transfer classification", () => {
  const text =
    'date,description,amount,balance\n2026-09-01,"Shop, Mumbai",-100,900\n2026-09-02,Credit card payment,-50,850';
  const r = importTransactions(text, account, "s");
  assert.equal(r.transactions[0].merchant, "Shop, Mumbai");
  assert.equal(r.transactions[0].direction, "Expense");
  assert.equal(r.transactions[1].direction, "Transfer");
  assert.equal(r.closing, "850");
  assert.throws(() => parseCsv('"unclosed'));
  assert.equal(
    r.transactions[0].fingerprint,
    importTransactions(text, account, "s2").transactions[0].fingerprint,
  );
});
test("goal forecasts handle no growth, zero assets and completed goal", () => {
  assert.equal(projection(0n, "100", "10"), null);
  assert.equal(projection(10000n, "100", "10"), 0);
  assert.equal(projection(100n, "100", "0"), null);
});

test('newest-first CSV uses the newest closing balance',()=>{const result=importTransactions('date,description,amount,balance\n2026-09-03,Latest,-10,90\n2026-09-01,Earlier,100,100',account,'s');assert.equal(result.closing,'90');});
