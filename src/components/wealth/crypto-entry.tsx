"use client";
import { useEffect, useRef, useState } from "react";
import { Button, Choice, Field, Modal } from "./ui";
import { EntryForm } from "./forms";
import type { Data } from "@/lib/wealth/types";
import {
  blankCrypto,
  cryptoCsv,
  cryptoCsvExample,
  saveCryptoImport,
  screenshotDrafts,
  type CryptoDraft,
} from "@/lib/wealth/crypto-import";
import { download } from "@/lib/wealth/import";

type Method = "manual" | "csv" | "screenshot";
export function CryptoEntry({
  data,
  commit,
  onClose,
}: {
  data: Data;
  commit: (action: string, change: (d: Data) => void) => Promise<boolean>;
  onClose: () => void;
}) {
  const wallets = data.accounts.filter(
    (a) => a.type === "Crypto" && !a.archived,
  );
  const [method, setMethod] = useState<Method | null>(null);
  const [accountId, setAccountId] = useState(wallets[0]?.id ?? "");
  const [creating, setCreating] = useState(false);
  const [manual, setManual] = useState(false);
  const [rows, setRows] = useState<CryptoDraft[]>([]);
  const [raw, setRaw] = useState("");
  const [filename, setFilename] = useState("");
  const [preview, setPreview] = useState("");
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  const [progress, setProgress] = useState("");
  const [saving, setSaving] = useState(false);
  const [verified, setVerified] = useState(false);
  const [replace, setReplace] = useState(false);
  const job = useRef<AbortController | null>(null);
  const busy = useRef(false);
  const account = wallets.find((a) => a.id === accountId);
  useEffect(
    () => () => {
      job.current?.abort();
    },
    [],
  );
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  const update = (id: string, key: keyof CryptoDraft, value: string) => {
    setVerified(false);
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, [key]: value } : r)));
  };
  function reset() {
    job.current?.abort();
    setReading(false);
    setRows([]);
    setRaw("");
    setFilename("");
    setPreview("");
    setError("");
    setVerified(false);
    setReplace(false);
  }
  function choose(value: Method) {
    reset();
    setMethod(value);
    if (!account) setCreating(true);
  }
  async function read(file?: File) {
    if (!file || !account || reading) return;
    reset();
    const controller = new AbortController();
    job.current = controller;
    setReading(true);
    let validImage = false;
    const timeout = setTimeout(() => controller.abort(), 90000);
    try {
      if (file.size > 5_000_000)
        throw new Error("Choose a file smaller than 5 MB.");
      if (method === "screenshot") {
        if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
          throw new Error("Choose a PNG, JPG or WebP screenshot.");
        const bitmap = await createImageBitmap(file);
        const tooLarge = bitmap.width * bitmap.height > 20_000_000;
        bitmap.close();
        if (tooLarge)
          throw new Error(
            "Crop this screenshot to your holdings before uploading.",
          );
        validImage = true;
        setPreview(URL.createObjectURL(file));
        setFilename(file.name);
        const { readScreenshot } = await import("@/lib/wealth/read-screenshot");
        const reading = await readScreenshot(
          file,
          setProgress,
          controller.signal,
        );
        if (controller.signal.aborted) return;
        setRaw(reading.text);
        const found = screenshotDrafts(reading, account.currency);
        if (!found.length)
          setError(
            "We could not identify any coin rows in this image. Try a clearer crop with the coin names and column headings visible, or enter the details below.",
          );
        setRows(found.length ? found : [blankCrypto(account.currency)]);
      } else {
        const text = await file.text();
        if (controller.signal.aborted) return;
        setRows(cryptoCsv(text, account.currency));
        setRaw(text);
        setFilename(file.name);
      }
    } catch (e) {
      if (job.current === controller) {
        setError(
          controller.signal.aborted
            ? "Reading stopped. Try a smaller image, or enter the details below."
            : (e as Error).message,
        );
        if (validImage) setRows([blankCrypto(account.currency)]);
      }
    } finally {
      clearTimeout(timeout);
      if (job.current === controller) setReading(false);
    }
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!verified || busy.current) return;
    busy.current = true;
    setSaving(true);
    setError("");
    try {
      // Validate before invoking commit, which owns cloud failure/retry behavior.
      saveCryptoImport(structuredClone(data), accountId, rows, replace, {
        name: filename,
        raw,
      });
      await commit(`Imported ${rows.length} crypto holdings`, (d) =>
        saveCryptoImport(d, accountId, rows, replace, {
          name:
            method === "screenshot" ? `${filename} (extracted text)` : filename,
          raw,
        }),
      );
      // On a failed cloud save, the main workspace retains the pending change and Retry.
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }
  if (creating)
    return (
      <EntryForm
        kind="account"
        data={data}
        defaults={{ type: "Crypto", currency: "USD" }}
        commit={commit}
        onClose={() => {
          setCreating(false);
          if (!account) setMethod(null);
        }}
        onSaveFailed={onClose}
        onSaved={(entry) => {
          setAccountId(entry.id);
          setCreating(false);
        }}
      />
    );
  if (manual && account)
    return (
      <EntryForm
        kind="holding"
        data={data}
        defaults={{
          type: "Crypto",
          accountId,
          currency: account.currency,
          quantity: "",
          invested: "",
          value: "",
        }}
        commit={commit}
        onClose={onClose}
      />
    );
  return (
    <Modal
      open
      onClose={() => {
        if (!saving) onClose();
      }}
      title="Add crypto holdings"
      description="Keep your coins in the right wallet or exchange. Choose how you want to add them."
    >
      <div
        className="crypto-methods"
        role="group"
        aria-label="How to add crypto"
      >
        {(
          [
            ["manual", "✍️", "Enter manually", "Add one coin at a time."],
            ["csv", "🗂️", "Upload CSV", "Bring in a list of holdings."],
            [
              "screenshot",
              "📷",
              "Upload screenshot",
              "Read an image, then check the details.",
            ],
          ] as const
        ).map(([value, emoji, title, text]) => (
          <button
            type="button"
            key={value}
            aria-pressed={method === value}
            disabled={saving || reading}
            onClick={() => choose(value)}
          >
            <span aria-hidden>{emoji}</span>
            <strong>{title}</strong>
            <small>{text}</small>
          </button>
        ))}
      </div>
      {method ? (
        <>
          <fieldset disabled={saving || reading} className="crypto-destination">
            <Field label="Wallet or exchange">
              <Choice
                label="Wallet or exchange"
                value={accountId}
                options={wallets.map((a) => ({ value: a.id, label: a.name }))}
                onChange={(v) => {
                  reset();
                  setAccountId(v);
                }}
              />
            </Field>
            <Button
              variant="outline"
              onClick={() => {
                reset();
                setCreating(true);
              }}
            >
              Add a wallet or exchange
            </Button>
          </fieldset>
          {method === "manual" ? (
            <Button disabled={!account} onClick={() => setManual(true)}>
              Continue to coin details
            </Button>
          ) : (
            <>
              <label className="dropzone">
                <span>
                  {method === "csv"
                    ? "Choose a holdings CSV"
                    : "Choose a holdings screenshot"}
                </span>
                <small>
                  {method === "csv"
                    ? "Use the example format below · up to 5 MB"
                    : "PNG, JPG or WebP · up to 5 MB"}
                </small>
                <input
                  disabled={!account || reading || saving}
                  aria-label={
                    method === "csv" ? "Crypto CSV" : "Crypto screenshot"
                  }
                  type="file"
                  accept={
                    method === "csv"
                      ? ".csv,text/csv"
                      : "image/png,image/jpeg,image/webp"
                  }
                  onChange={(e) => {
                    void read(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </label>
              {method === "csv" ? (
                <Button
                  variant="ghost"
                  onClick={() =>
                    download(
                      "stayflat-crypto-example.csv",
                      cryptoCsvExample,
                      "text/csv",
                    )
                  }
                >
                  Download example crypto CSV
                </Button>
              ) : (
                <p className="hint">
                  The image is read on your device and is not stored. Checked
                  holdings and extracted text are saved to your StayFlat
                  account.
                </p>
              )}
              {reading ? (
                <div role="status">
                  <p>{progress || "Reading file…"}</p>
                  <Button
                    variant="outline"
                    onClick={() => job.current?.abort()}
                  >
                    Stop reading
                  </Button>
                </div>
              ) : null}
              {preview ? (
                <details className="crypto-source" open>
                  <summary>Original screenshot</summary>
                  {/* Local object URL stays on this device; never use the remote image optimizer. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="Your uploaded holdings screenshot" />
                </details>
              ) : null}
              {method === "screenshot" && raw ? (
                <details className="crypto-source">
                  <summary>Text read from screenshot</summary>
                  <pre>{raw}</pre>
                </details>
              ) : null}
              {(rows.length > 0 || Boolean(filename)) && !reading ? (
                <form onSubmit={save} className="crypto-review">
                  <p>
                    {method === "screenshot"
                      ? "Check the coins, quantities and holding values against the image, and add any coins we missed. Fill any blank amounts; purchase cost is only filled when the image shows it."
                      : "Check every row. Amounts are totals for your holding, not the price of one coin."}
                  </p>
                  <fieldset disabled={saving}>
                    {rows.map((row, index) => (
                      <section
                        className="crypto-row"
                        key={row.id}
                        aria-label={`Holding ${index + 1}`}
                      >
                        <div className="crypto-row-heading">
                          <b>Holding {index + 1}</b>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              setVerified(false);
                              setRows((rs) =>
                                rs.filter((r) => r.id !== row.id),
                              );
                            }}
                          >
                            Remove holding {index + 1}
                          </Button>
                        </div>
                        <div className="form-grid">
                          {(
                            [
                              ["name", "Coin or token name"],
                              ["symbol", "Token symbol"],
                              ["quantity", "Quantity"],
                              ["invested", "Total purchase cost"],
                              ["value", "Total current value"],
                            ] as const
                          ).map(([key, label]) => (
                            <Field key={key} label={label}>
                              <input
                                required
                                value={row[key]}
                                type={
                                  ["quantity", "invested", "value"].includes(
                                    key,
                                  )
                                    ? "number"
                                    : "text"
                                }
                                min={
                                  key === "quantity"
                                    ? "0.000000000000000001"
                                    : "0"
                                }
                                step={key === "quantity" ? "any" : "0.01"}
                                onChange={(e) =>
                                  update(row.id, key, e.target.value)
                                }
                              />
                            </Field>
                          ))}
                          <Field label="Value currency">
                            <Choice
                              label={`Value currency for holding ${index + 1}`}
                              value={row.currency}
                              options={["INR", "USD", "USDC", "USDT"]}
                              onChange={(v) => update(row.id, "currency", v)}
                            />
                          </Field>
                        </div>
                      </section>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setVerified(false);
                        setRows((rs) => [
                          ...rs,
                          blankCrypto(account?.currency),
                        ]);
                      }}
                    >
                      Add another coin
                    </Button>
                    <Field label="How to save">
                      <Choice
                        label="How to save"
                        value={replace ? "replace" : "add"}
                        options={[
                          { value: "add", label: "Add to existing holdings" },
                          {
                            value: "replace",
                            label: "Replace all holdings in this wallet",
                          },
                        ]}
                        onChange={(v) => {
                          setReplace(v === "replace");
                          setVerified(false);
                        }}
                      />
                    </Field>
                    {replace ? (
                      <p className="hint">
                        This replaces all{" "}
                        {
                          data.holdings.filter((h) => h.accountId === accountId)
                            .length
                        }{" "}
                        current holdings in {account?.name}. Include every coin
                        you want to keep. Previous holdings stay in import
                        history.
                      </p>
                    ) : null}
                    <label className="checkline">
                      <input
                        type="checkbox"
                        checked={verified}
                        onChange={(e) => setVerified(e.target.checked)}
                      />
                      I checked the coins, quantities, currencies and total
                      amounts
                      {replace
                        ? ", and approve replacing this wallet’s holdings"
                        : ""}
                      .
                    </label>
                    <Button type="submit" disabled={!verified || !rows.length}>
                      {saving ? "Saving…" : "Save checked crypto holdings"}
                    </Button>
                  </fieldset>
                </form>
              ) : null}
            </>
          )}
        </>
      ) : null}
      {error ? (
        <p role="alert" className="error">
          {error}
        </p>
      ) : null}
    </Modal>
  );
}
