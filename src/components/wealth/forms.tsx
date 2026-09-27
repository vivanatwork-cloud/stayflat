"use client";
import { useState } from "react";
import { assetWords, assetProviders } from "@/lib/wealth/asset-words";
import { BankField } from "./bank-field";
import { fixedDeposit } from "@/lib/wealth/fixed-deposit";
import { Button, Choice, Field, Modal } from "./ui";
import {
  assetTypes,
  type Data,
  type Account,
  type Holding,
  type Transaction,
  type RecurringEvent,
  type Card,
} from "@/lib/wealth/types";
import { decimal, minor, transactionKey } from "@/lib/wealth/engine";
import { download, importTransactions } from "@/lib/wealth/import";
export type EntryKind =
  "account" | "holding" | "transaction" | "event" | "card";
export type Entry = Account | Holding | Transaction | RecurringEvent | Card;
export function EntryForm({
  kind,
  data,
  initial,
  defaults,
  affectCashInitially = true,
  onClose,
  onSaved,
  onSaveFailed,
  commit,
}: {
  kind: EntryKind;
  data: Data;
  initial?: Entry;
  defaults?: Record<string, string>;
  affectCashInitially?: boolean;
  onClose: () => void;
  onSaved?: (entry: Entry) => void;
  onSaveFailed?: () => void;
  commit: (
    action: string,
    change: (d: Data) => void,
  ) => void | Promise<boolean>;
}) {
  const sourceAccount = data.accounts.find(
    (a) =>
      a.id ===
      (initial && "accountId" in initial
        ? initial.accountId
        : defaults?.accountId),
  );
  const [values, setValues] = useState<Record<string, string>>(() => ({
    name: "",
    institution: "",
    type: kind === "event" ? "Rent" : "Cash",
    currency:
      kind === "holding"
        ? (data.accounts.find((a) => a.type !== "Cash" && !a.archived)
            ?.currency ?? "INR")
        : "INR",
    ownership: "Personal",
    balance: "0",
    accountId:
      (kind === "holding"
        ? data.accounts.find((a) => a.type !== "Cash" && !a.archived)?.id
        : data.accounts.find((a) => !a.archived)?.id) ?? "",
    quantity: "1",
    invested: "0",
    value: "0",
    symbol: "",
    merchant: "",
    amount: "",
    direction: "Income",
    category: "Arcus",
    note: "",
    date: new Date().toISOString().slice(0, 10),
    title: "",
    frequency: "Monthly",
    limit: "0",
    available: "0",
    spend: "0",
    due: "0",
    dueDate: new Date().toISOString().slice(0, 10),
    ...(sourceAccount
      ? {
          institution: sourceAccount.institution,
          ownership: sourceAccount.ownership,
          currency: sourceAccount.currency,
        }
      : {}),
    ...defaults,
    ...Object.fromEntries(
      Object.entries(initial ?? {}).filter(([, v]) => typeof v === "string"),
    ),
  }));
  const selectedAccount = data.accounts.find((a) => a.id === values.accountId);
  const isFD =
    kind === "holding" &&
    (values.type === "FDs" || selectedAccount?.type === "FDs");
  const isEPF = kind === "holding" && !isFD && selectedAccount?.type === "EPF";
  const assetType =
    kind === "account"
      ? values.type
      : isFD
        ? "FDs"
        : (selectedAccount?.type ?? values.type);
  const words = assetWords(assetType);
  const banks = assetProviders(data, assetType);
  const currencies =
    assetType === "Crypto" ? ["INR", "USD", "USDC", "USDT"] : ["INR", "USD"];
  const [error, setError] = useState("");
  const [affectCash, setAffectCash] = useState(affectCashInitially);
  const [saving, setSaving] = useState(false);
  const put = (key: string, v: string) =>
    setValues((p) => ({ ...p, [key]: v }));
  const input = (
    key: string,
    label: string,
    type = "text",
    required = true,
  ) => (
    <Field label={label}>
      <input
        name={key}
        value={values[key] ?? ""}
        onChange={(e) => put(key, e.target.value)}
        type={type}
        required={required}
        step={
          type === "number" ? (key === "quantity" ? "any" : "0.01") : undefined
        }
      />
    </Field>
  );
  const choice = (
    key: string,
    label: string,
    opts: (string | { value: string; label: string })[],
  ) => (
    <Field label={label}>
      <Choice
        label={label}
        value={values[key]}
        onChange={(v) => {
          put(key, v);
          if (key === "type")
            setValues((p) => ({
              ...p,
              type: v,
              institution: "",
              balance: "0",
            }));
          if (key === "accountId") {
            const chosen = data.accounts.find((a) => a.id === v);
            if (chosen)
              setValues((p) => ({
                ...p,
                accountId: v,
                type: chosen.type,
                institution: chosen.institution,
                currency: chosen.currency,
                ownership: chosen.ownership,
              }));
          }
        }}
        options={opts}
      />
    </Field>
  );
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setError("");
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const id = initial?.id ?? crypto.randomUUID();
      const money = (key: string, negative = false) => {
        const n = minor(values[key]);
        if (!negative && n < 0n) throw new Error(`${key} cannot be negative.`);
        return decimal(n);
      };
      const account = data.accounts.find((a) => a.id === values.accountId);
      let entry: Entry;
      let fdAccount: Account | undefined;
      if (kind === "account") {
        if (!values.institution.trim())
          throw new Error(
            `Choose a ${words.provider.toLowerCase()}, or add a new one.`,
          );
        entry = {
          id,
          name: values.name,
          institution: values.institution.trim(),
          type: values.type as Account["type"],
          currency: values.currency as Account["currency"],
          balance:
            values.type === "Cash"
              ? money("balance")
              : ((initial as Account | undefined)?.balance ?? "0"),
          ownership: values.ownership as Account["ownership"],
          updatedAt: now,
          archived: false,
        };
      } else if (kind === "holding" && isFD) {
        const deposit = fixedDeposit(data, values, id, now);
        entry = deposit.holding;
        fdAccount = deposit.account;
      } else if (kind === "holding") {
        if (!account) throw new Error("Create an account first.");
        if (account.type === "Cash")
          throw new Error("Choose an investment, FD or EPF account.");
        if (
          !Number.isFinite(Number(values.quantity)) ||
          Number(values.quantity) <= 0
        )
          throw new Error("Quantity must be positive.");
        entry = {
          id,
          accountId: account.id,
          name: values.name,
          symbol:
            values.symbol.trim().toUpperCase() ||
            values.name.slice(0, 5).toUpperCase(),
          type: account.type,
          currency: values.currency as Holding["currency"],
          quantity: values.quantity,
          invested: money("invested"),
          value: money("value"),
          updatedAt: now,
          ...(account.type === "Mutual Funds" && values.sip
            ? { sip: money("sip") }
            : {}),
          ...(account.type === "Mutual Funds" && values.nextSip
            ? { nextSip: values.nextSip }
            : {}),
          ...(values.maturity ? { maturity: values.maturity } : {}),
          ...(values.rate ? { rate: values.rate } : {}),
        };
      } else if (kind === "transaction") {
        if (!account) throw new Error("Create an account first.");
        entry = {
          ...(initial as Transaction | undefined),
          id,
          accountId: account.id,
          date: values.date,
          direction: values.direction as Transaction["direction"],
          amount: money("amount", true),
          currency: account.currency,
          merchant: values.merchant,
          category: values.category,
          ownership: values.ownership as Transaction["ownership"],
          note: values.note,
        };
      } else if (kind === "event") {
        entry = {
          id,
          title: values.title,
          date: values.date,
          amount: money("amount"),
          currency: values.currency as RecurringEvent["currency"],
          type: values.type,
          frequency: values.frequency as RecurringEvent["frequency"],
        };
      } else {
        entry = {
          id,
          name: values.name,
          limit: money("limit"),
          available: money("available"),
          spend: money("spend"),
          due: money("due"),
          dueDate: values.dueDate,
          updatedAt: now,
        };
        if (minor(values.available) > minor(values.limit))
          throw new Error("Available limit cannot exceed the total limit.");
      }
      const saved = await commit(
        `${initial ? "Updated" : "Added"} ${kind}`,
        (d) => {
          if (kind === "account") {
            d.accounts = initial
              ? d.accounts.map((a) => (a.id === id ? (entry as Account) : a))
              : [...d.accounts, entry as Account];
          } else if (kind === "holding") {
            if (fdAccount) d.accounts.push(fdAccount);
            d.holdings = initial
              ? d.holdings.map((h) => (h.id === id ? (entry as Holding) : h))
              : [...d.holdings, entry as Holding];
          } else if (kind === "transaction") {
            const t = entry as Transaction;
            d.transactions = initial
              ? d.transactions.map((x) => (x.id === id ? t : x))
              : [...d.transactions, t];
            if (
              affectCash &&
              !initial &&
              account?.type === "Cash" &&
              t.direction !== "Transfer"
            ) {
              d.accounts = d.accounts.map((a) =>
                a.id === t.accountId
                  ? {
                      ...a,
                      balance: decimal(
                        minor(a.balance) +
                          (t.direction === "Income" ? 1n : -1n) *
                            minor(t.amount),
                      ),
                      updatedAt: now,
                    }
                  : a,
              );
            }
          } else if (kind === "event") {
            d.events = initial
              ? d.events.map((x) =>
                  x.id === id ? (entry as RecurringEvent) : x,
                )
              : [...d.events, entry as RecurringEvent];
          } else
            d.cards = initial
              ? d.cards.map((c) => (c.id === id ? (entry as Card) : c))
              : [...d.cards, entry as Card];
        },
      );
      // Keep pending data in the main workspace on a failed cloud save; retry there.
      if (saved === false) {
        (onSaveFailed ?? onClose)();
        return;
      }
      if (onSaved) onSaved(entry);
      else onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Check these details.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <Modal
      open
      onClose={() => {
        if (!saving) onClose();
      }}
      title={`${initial ? "Edit" : "Add"} ${isFD ? "fixed deposit" : kind === "account" ? words.account.toLowerCase() : assetType === "Crypto" && kind === "holding" ? "crypto holding" : isEPF ? "provident fund balance" : kind}`}
      description={
        isFD
          ? "Record the deposit amount, bank, annual interest rate and maturity date. This does not change your cash balance."
          : kind === "transaction"
            ? "Transfers do not count as income or spending. Use negative expenses for refunds."
            : undefined
      }
    >
      <form onSubmit={submit} className="entry-form">
        <div className="form-grid">
          {kind === "holding" && !initial && !defaults?.type ? (
            <Field label="Investment type">
              <Choice
                label="Investment type"
                value={isFD ? "FDs" : (selectedAccount?.type ?? values.type)}
                options={[
                  ...new Set([
                    ...data.accounts
                      .filter((a) => a.type !== "Cash" && !a.archived)
                      .map((a) => a.type),
                    "FDs",
                  ]),
                ]}
                onChange={(type) => {
                  const a = data.accounts.find(
                    (a) => a.type === type && !a.archived,
                  );
                  setValues((p) => ({
                    ...p,
                    type,
                    accountId: a?.id ?? "",
                    institution: a?.institution ?? "",
                    currency: a?.currency ?? "INR",
                    ownership: a?.ownership ?? "Personal",
                  }));
                }}
              />
            </Field>
          ) : null}
          {kind === "account" ? (
            <>
              {!defaults?.type && !initial
                ? choice("type", "Account type", [...assetTypes])
                : null}
              {input("name", `${words.account} name`)}
              <BankField
                key={assetType}
                label={words.provider}
                value={values.institution}
                onChange={(v) => put("institution", v)}
                banks={banks}
              />
              {choice("currency", "Value currency", currencies)}
              {choice("ownership", "Belongs to", ["Personal", "Business"])}
              {assetType === "Cash" ? (
                input("balance", "Cash balance", "number")
              ) : (
                <p className="hint">
                  Save this {words.account.toLowerCase()}, then add its holdings
                  and values.
                </p>
              )}
            </>
          ) : null}
          {kind === "holding" && isFD ? (
            <>
              {input("name", "FD name")}
              <BankField
                label="Bank"
                value={values.institution}
                onChange={(v) => put("institution", v)}
                banks={banks}
              />
              {input("invested", "Deposit amount", "number")}
              {choice("currency", "Currency", ["INR", "USD"])}
              {input("rate", "Annual interest rate (%)", "number")}
              {input("maturity", "Maturity date", "date")}
              {choice("ownership", "Belongs to", ["Personal", "Business"])}
            </>
          ) : null}
          {kind === "holding" && !isFD ? (
            <>
              {choice(
                "accountId",
                words.account,
                data.accounts
                  .filter(
                    (a) =>
                      a.type !== "Cash" && !a.archived && a.type === assetType,
                  )
                  .map((a) => ({ value: a.id, label: a.name })),
              )}
              {input("name", words.asset)}
              {!isEPF
                ? input(
                    "symbol",
                    assetType === "Crypto"
                      ? "Token symbol (e.g. BTC)"
                      : "Symbol",
                    "text",
                    assetType === "Crypto",
                  )
                : null}
              {choice("currency", "Value currency", currencies)}
              {!isEPF ? input("quantity", words.quantity, "number") : null}
              {input(
                "invested",
                isEPF ? "Total contributions" : "Total purchase cost",
                "number",
              )}
              {input(
                "value",
                isEPF ? "Current balance" : "Total current value",
                "number",
              )}
              {assetType === "Mutual Funds" ? (
                <>
                  {input(
                    "sip",
                    "Monthly fund contribution (SIP)",
                    "number",
                    false,
                  )}
                  {input("nextSip", "Next contribution date", "date", false)}
                </>
              ) : null}
              {isEPF
                ? input("rate", "Interest rate (%)", "number", false)
                : null}
            </>
          ) : null}
          {kind === "transaction" ? (
            <>
              {choice(
                "accountId",
                "Account",
                data.accounts
                  .filter((a) => !a.archived)
                  .map((a) => ({ value: a.id, label: a.name })),
              )}
              {choice("direction", "Money movement", [
                "Income",
                "Expense",
                "Transfer",
              ])}
              {input("merchant", "Merchant or income source")}
              {input("amount", "Amount in account currency", "number")}
              {input("date", "Date", "date")}
              {choice("ownership", "Belongs to", ["Personal", "Business"])}
              {input("category", "Category or income source")}
              {input("note", "Note", "text", false)}
            </>
          ) : null}
          {kind === "event" ? (
            <>
              {input("title", "Event name")}
              {choice("type", "Event type", [
                "Rent",
                "SIP",
                "Card due",
                "FD maturity",
                "Subscription",
                "Other",
              ])}
              {input("date", "Next date", "date")}
              {input("amount", "Amount", "number")}
              {choice("currency", "Currency", ["INR", "USD"])}
              {choice("frequency", "Repeats", ["Once", "Monthly", "Yearly"])}
            </>
          ) : null}
          {kind === "card" ? (
            <>
              {input("name", "Card name")}
              {input("limit", "Credit limit (INR)", "number")}
              {input("available", "Available limit (INR)", "number")}
              {input("spend", "Statement spending (INR)", "number")}
              {input("due", "Amount due (INR)", "number")}
              {input("dueDate", "Payment due", "date")}
            </>
          ) : null}
        </div>
        {kind === "transaction" && !initial ? (
          <label className="checkline">
            <input
              type="checkbox"
              checked={affectCash}
              onChange={(e) => setAffectCash(e.target.checked)}
            />
            Update the cash balance for this income or expense
          </label>
        ) : null}
        {initial && kind === "transaction" ? (
          <p className="hint">
            Editing a transaction does not rewrite a statement’s closing
            balance. Correct the account balance separately if needed.
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="error">
            {error}
          </p>
        ) : null}
        <div className="form-actions">
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving
              ? "Saving…"
              : `Save ${isFD ? "fixed deposit" : kind === "account" ? words.account.toLowerCase() : assetType === "Crypto" && kind === "holding" ? "crypto holding" : isEPF ? "provident fund balance" : kind}`}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
export function ImportForm({
  data,
  onClose,
  commit,
}: {
  data: Data;
  onClose: () => void;
  commit: (action: string, change: (d: Data) => void) => void;
}) {
  const [accountId, setAccount] = useState(
    data.accounts.find((a) => a.type === "Cash")?.id ?? "",
  );
  const [raw, setRaw] = useState("");
  const [file, setFile] = useState("");
  const [rows, setRows] = useState<Transaction[]>([]);
  const [closing, setClosing] = useState("");
  const [error, setError] = useState("");
  const [sourceId] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const existing = new Set(
    data.transactions.map((t) => t.fingerprint ?? transactionKey(t)),
  );
  const seen = new Set<string>();
  const unique = rows.filter((t) => {
    const k = t.fingerprint!;
    if (existing.has(k) || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const duplicates = rows.length - unique.length;
  async function read(f: File | undefined) {
    if (!f) return;
    setError("");
    setBusy(true);
    try {
      if (f.size > 5000000) throw new Error("Choose a CSV smaller than 5 MB.");
      const a = data.accounts.find((a) => a.id === accountId);
      if (!a) throw new Error("Create and select a cash account first.");
      const text = await f.text();
      const result = importTransactions(text, a, sourceId);
      setRaw(text);
      setFile(f.name);
      setRows(result.transactions);
      setClosing(result.closing ?? "");
      setReviewed(false);
    } catch (e) {
      setError((e as Error).message);
      setRows([]);
    } finally {
      setBusy(false);
    }
  }
  function save() {
    try {
      if (!reviewed)
        throw new Error("Confirm that you reviewed the imported records.");
      if (closing) minor(closing);
      commit(`Imported ${unique.length} transactions from ${file}`, (d) => {
        d.transactions.push(...unique);
        d.sources.push({
          id: sourceId,
          name: file,
          date: new Date().toISOString(),
          accountId,
          rows: unique.length,
          raw,
        });
        if (closing)
          d.accounts = d.accounts.map((a) =>
            a.id === accountId
              ? { ...a, balance: closing, updatedAt: new Date().toISOString() }
              : a,
          );
      });
      onClose();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <Modal
      open
      onClose={onClose}
      title="Import a bank statement"
      description="Upload a CSV, review the categories, then save. Your original file is kept with the import."
    >
      <Field label="Cash account">
        <Choice
          value={accountId}
          onChange={(v) => {
            setAccount(v);
            setRows([]);
          }}
          options={data.accounts
            .filter((a) => a.type === "Cash" && !a.archived)
            .map((a) => ({ value: a.id, label: a.name }))}
        />
      </Field>
      <label className="dropzone">
        <span>Choose a CSV statement</span>
        <small>Date, description, amount • up to 5 MB</small>
        <input
          aria-label="CSV statement"
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => read(e.target.files?.[0])}
        />
      </label>
      <Button
        variant="ghost"
        onClick={() =>
          download(
            "wealthos-example.csv",
            "date,description,amount,balance\n2026-09-01,Arcus payment,420000,420000\n2026-09-02,Monthly rent,-35000,385000",
            "text/csv",
          )
        }
      >
        Download example CSV
      </Button>
      {busy ? <p>Reading statement…</p> : null}
      {rows.length ? (
        <>
          <p>
            {unique.length} new transactions · {duplicates} matching rows
            skipped
          </p>
          <div className="import-preview">
            {rows.slice(0, 30).map((t) => (
              <div key={t.id}>
                <span>
                  {t.date}
                  <b>{t.merchant}</b>
                </span>
                <Choice
                  value={t.direction}
                  onChange={(direction) =>
                    setRows((old) =>
                      old.map((x) =>
                        x.id === t.id
                          ? {
                              ...x,
                              direction: direction as Transaction["direction"],
                            }
                          : x,
                      ),
                    )
                  }
                  options={["Income", "Expense", "Transfer"]}
                />
                <span>{t.amount}</span>
              </div>
            ))}
          </div>
          {rows.length > 30 ? (
            <p className="hint">
              First 30 rows shown. Review all records in Income and Expenses
              after import.
            </p>
          ) : null}
          <Field label="Latest closing cash balance (leave blank to keep current balance)">
            <input
              value={closing}
              onChange={(e) => setClosing(e.target.value)}
              inputMode="decimal"
            />
          </Field>
          <label className="checkline">
            <input
              type="checkbox"
              checked={reviewed}
              onChange={(e) => setReviewed(e.target.checked)}
            />
            I reviewed the amounts and transfer classifications
          </label>
        </>
      ) : null}
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="form-actions">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={!rows.length || !reviewed} onClick={save}>
          Import {unique.length} transactions
        </Button>
      </div>
      <p className="hint">
        PDF statements and screenshot extraction need a document-reading
        service. CSV import works now.
      </p>
    </Modal>
  );
}
