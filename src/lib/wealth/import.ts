import { decimal, minor, transactionKey } from "./engine";
import type { Transaction, Account } from "./types";
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [],
    field = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        field += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === "," && !quoted) {
      row.push(field.trim());
      field = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (quoted) throw new Error("The CSV contains an unclosed quotation mark.");
  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}
export function classify(merchant: string): {
  direction: Transaction["direction"];
  category: string;
} {
  const n = merchant.toLowerCase();
  if (/self transfer|own account|credit card payment|card repayment/.test(n))
    return { direction: "Transfer", category: "Transfer" };
  const entries = [
    ["Food", /swiggy|zomato|restaurant|grocery|foods/],
    ["Transport", /uber|ola|metro|fuel/],
    ["Subscriptions", /netflix|spotify|figma|adobe/],
    ["Travel", /flight|airways|hotel/],
    ["Household", /rent|electric|water/],
    ["Health", /hospital|pharmacy/],
  ] as const;
  return {
    direction: "Expense",
    category: entries.find(([, r]) => r.test(n))?.[0] ?? "Other",
  };
}
export function importTransactions(
  text: string,
  account: Account,
  sourceId: string,
): { transactions: Transaction[]; closing?: string } {
  const [header, ...rows] = parseCsv(text);
  if (!header) throw new Error("This file is empty.");
  const columns = header.map((s) => s.toLowerCase().replace(/[^a-z]/g, ""));
  const find = (...names: string[]) =>
    names.map((n) => columns.indexOf(n)).find((n) => n >= 0) ?? -1;
  const date = find("date", "transactiondate", "valuedate");
  const desc = find("description", "narration", "merchant", "particulars");
  const amount = find("amount");
  const debit = find("debit", "withdrawal", "withdrawalamount");
  const credit = find("credit", "deposit", "depositamount");
  const balance = find("balance", "closingbalance");
  const dir = find("direction", "type");
  if (date < 0 || desc < 0 || (amount < 0 && debit < 0 && credit < 0))
    throw new Error(
      "Required columns: date, description, and amount (or debit and credit).",
    );
  if (rows.length > 10000) throw new Error("Import up to 10,000 rows at once.");
  const transactions = rows.map((r, i) => {
    let day = r[date];
    if (/^\d{2}[/-]\d{2}[/-]\d{4}$/.test(day))
      day = day.split(/[/-]/).reverse().join("-");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || isNaN(Date.parse(day)))
      throw new Error(`Row ${i + 2}: use dates in YYYY-MM-DD format.`);
    const clean = (v: string | undefined) => (v ?? "").replace(/[,₹$\s]/g, "");
    const debitVal = clean(r[debit]),
      creditVal = clean(r[credit]);
    const signed =
      amount >= 0
        ? clean(r[amount])
        : debitVal && Number(debitVal) !== 0
          ? "-" + debitVal
          : creditVal;
    minor(signed);
    const guessed = classify(r[desc]);
    let direction: Transaction["direction"] =
      Number(signed) < 0 ? "Expense" : "Income";
    if (guessed.direction === "Transfer") direction = "Transfer";
    const explicit = r[dir]?.toLowerCase();
    if (explicit === "expense" || explicit === "debit") direction = "Expense";
    if (explicit === "income" || explicit === "credit") direction = "Income";
    if (explicit === "transfer") direction = "Transfer";
    const t: Transaction = {
      id: crypto.randomUUID(),
      accountId: account.id,
      date: day,
      amount: decimal(minor(signed) < 0n ? -minor(signed) : minor(signed)),
      direction,
      currency: account.currency,
      merchant: r[desc],
      category:
        direction === "Expense"
          ? guessed.category
          : direction === "Transfer"
            ? "Transfer"
            : "Other",
      ownership: account.ownership,
      note: "Imported; review category and transfer matches.",
      sourceId,
    };
    t.fingerprint = transactionKey(t);
    return t;
  });
  const latestIndex = transactions.reduce((best, t, i) => !transactions[best] || t.date >= transactions[best].date ? i : best, 0);
  const last = rows[latestIndex];
  let closing =
    balance >= 0 && last ? last[balance].replace(/[,₹$\s]/g, "") : undefined;
  if (closing) minor(closing);
  else closing = undefined;
  return { transactions, closing };
}
export function csvEscape(s: string) {
  const safe = /^[=+@\t\r]/.test(s) ? `'${s}` : s;
  return '"' + safe.replaceAll('"', '""') + '"';
}
export function download(
  name: string,
  text: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
