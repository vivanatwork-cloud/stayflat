"use client";
import { assetWords } from "@/lib/wealth/asset-words";
import { useState } from "react";
import { Button, Choice, Field, Modal } from "./ui";
import { parseCsv, download } from "@/lib/wealth/import";
import { decimal, minor } from "@/lib/wealth/engine";
import type { Data, Holding } from "@/lib/wealth/types";
export function HoldingsImport({
  data,
  assetType,
  onClose,
  commit,
}: {
  data: Data;
  assetType?: string;
  onClose: () => void;
  commit: (a: string, c: (d: Data) => void) => void;
}) {
  const accounts = data.accounts.filter(
    (a) =>
      !a.archived &&
      a.type !== "Cash" &&
      (!assetType ||
        assetType === "Assets" ||
        (assetType === "FDs / EPF"
          ? ["FDs", "EPF"].includes(a.type)
          : a.type === assetType)),
  );
  const [accountId, setAccount] = useState(accounts[0]?.id ?? "");
  const [rows, setRows] = useState<Holding[]>([]);
  const [raw, setRaw] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [verified, setVerified] = useState(false);
  async function read(file: File | undefined) {
    if (!file) return;
    try {
      setError("");
      if (file.size > 5000000) throw new Error("Use a file smaller than 5 MB.");
      const account = data.accounts.find((a) => a.id === accountId);
      if (!account) throw new Error("Choose an investment account first.");
      const text = await file.text();
      const [headers, ...records] = parseCsv(text);
      const keys = headers.map((h) => h.toLowerCase().trim());
      for (const k of ["name", "symbol", "quantity", "invested", "value"])
        if (!keys.includes(k))
          throw new Error(`Missing ${k} column. Use the example CSV.`);
      const items = records.map((r, i) => {
        const get = (k: string) => r[keys.indexOf(k)] ?? "";
        const q = Number(get("quantity"));
        if (!Number.isFinite(q) || q <= 0)
          throw new Error(`Row ${i + 2}: quantity must be positive.`);
        const value = minor(get("value")),
          cost = minor(get("invested"));
        if (value < 0n || cost < 0n)
          throw new Error(`Row ${i + 2}: amounts cannot be negative.`);
        const currency = get("currency") || account.currency;
        if (!["INR", "USD", "USDC", "USDT"].includes(currency))
          throw new Error(`Row ${i + 2}: unsupported currency.`);
        return {
          id: crypto.randomUUID(),
          accountId,
          name: get("name"),
          symbol: get("symbol"),
          type: account.type,
          currency: currency as Holding["currency"],
          quantity: get("quantity"),
          invested: decimal(cost),
          value: decimal(value),
          updatedAt: new Date().toISOString(),
        };
      });
      if (!items.length) throw new Error("No holdings found.");
      const symbols = new Set(items.map((h) => h.symbol));
      if (symbols.size !== items.length)
        throw new Error(
          "Combine duplicate symbols in this file before importing.",
        );
      setRows(items);
      setRaw(text);
      setName(file.name);
      setVerified(false);
    } catch (e) {
      setRows([]);
      setError((e as Error).message);
    }
  }
  return (
    <Modal
      open
      onClose={onClose}
      title="Import a holdings snapshot"
      description="Review the file before replacing the current holdings in this account. Earlier approved snapshots stay in history."
    >
      <Field label={assetWords(assetType ?? "").account}>
        <Choice
          value={accountId}
          onChange={(v) => {
            setAccount(v);
            setRows([]);
          }}
          options={accounts.map((a) => ({ value: a.id, label: a.name }))}
        />
      </Field>
      <label className="dropzone">
        <span>Choose a holdings CSV</span>
        <small>
          {assetType && assetType !== "Assets"
            ? assetType
            : "Investment holdings"}{" "}
          · up to 5 MB
        </small>
        <input
          type="file"
          aria-label="Holdings CSV"
          accept=".csv"
          onChange={(e) => read(e.target.files?.[0])}
        />
      </label>
      <Button
        variant="ghost"
        onClick={() =>
          download(
            "wealthos-holdings.csv",
            `name,symbol,quantity,invested,value,currency\nExample holding,EXAMPLE,1,1000,1100,${accounts.find((a) => a.id === accountId)?.currency ?? "INR"}`,
            "text/csv",
          )
        }
      >
        Download example holdings CSV
      </Button>
      {rows.length ? (
        <>
          <div className="import-preview">
            {rows.map((h) => (
              <div key={h.id}>
                <span>
                  <b>{h.name}</b>
                  {h.symbol} · {h.quantity} units
                </span>
                <span>
                  {h.currency} {h.value}
                </span>
              </div>
            ))}
          </div>
          <label className="checkline">
            <input
              type="checkbox"
              checked={verified}
              onChange={(e) => setVerified(e.target.checked)}
            />
            Replace this account’s current holdings with these {rows.length}{" "}
            verified records
          </label>
        </>
      ) : null}
      {error ? (
        <p role="alert" className="error">
          {error}
        </p>
      ) : null}
      <Button
        disabled={!rows.length || !verified}
        onClick={() => {
          commit(`Imported ${rows.length} holdings from ${name}`, (d) => {
            const history = d.holdingHistory ?? [];
            const old = d.holdings.filter((h) => h.accountId === accountId);
            if (old.length && !history.some((s) => s.accountId === accountId))
              history.push({
                id: crypto.randomUUID(),
                date: new Date().toISOString(),
                accountId,
                holdings: structuredClone(old),
              });
            history.push({
              id: crypto.randomUUID(),
              date: new Date().toISOString(),
              accountId,
              holdings: structuredClone(rows),
            });
            d.holdingHistory = history;
            d.holdings = [
              ...d.holdings.filter((h) => h.accountId !== accountId),
              ...rows,
            ];
            d.sources.push({
              id: crypto.randomUUID(),
              name,
              date: new Date().toISOString(),
              accountId,
              rows: rows.length,
              raw,
            });
            d.accounts = d.accounts.map((a) =>
              a.id === accountId
                ? { ...a, updatedAt: new Date().toISOString() }
                : a,
            );
          });
          onClose();
        }}
      >
        Save verified snapshot
      </Button>
    </Modal>
  );
}
