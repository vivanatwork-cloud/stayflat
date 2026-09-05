"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { deriveTrade, money, rValue } from "@/lib/journal/calculations";
import type { JournalTrade, TradeDirection, TradeSizeMode } from "@/lib/journal/types";

const EMOTIONS = [
  "", "Fear, revenge, or panic is driving the decision.",
  "Highly reactive. You feel pulled to act now.",
  "Rattled. Urgency or FOMO is shaping the trade.",
  "Uneasy. You see the setup, but emotion is loud.",
  "Mixed. Part plan, part pressure.",
  "Settled enough to pause and check the trade.",
  "Focused. The setup and risk are mostly clear.",
  "Disciplined. You know the entry, stop, and size.",
  "Calm and prepared. The loss is defined and acceptable.",
  "Fully composed. Planned, positioned, and ready to accept the loss.",
];

function localDateTime(timestamp: number | null) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function initialTrade(trade?: JournalTrade): JournalTrade {
  return trade ?? {
    id: globalThis.crypto?.randomUUID?.() ?? `trade-${Date.now()}`,
    entryTime: Date.now(), coin: "", strategy: "", dir: "Long", entryPx: "",
    sizeMode: "usd", sizeUsd: "", units: "", stopPx: "", tpPx: "",
    exitPx: "", exitTime: null, fees: "", emo: 5, reason: "", note: "",
  };
}

function positive(value: string) {
  const number = Number(value.replaceAll(",", ""));
  return Number.isFinite(number) && number > 0;
}

export function TradeForm({
  trade,
  onSave,
  onDelete,
  onClose,
}: {
  trade?: JournalTrade;
  onSave: (trade: JournalTrade) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [form, setForm] = useState(() => initialTrade(trade));
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  function update<K extends keyof JournalTrade>(key: K, value: JournalTrade[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function close() {
    dialogRef.current?.close();
    onClose();
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!form.entryTime) return setError("Add an entry date and time.");
    if (!form.coin.trim()) return setError("Add the market you traded.");
    if (!positive(form.entryPx)) return setError("Add a positive entry price.");
    if (form.sizeMode === "usd" && !positive(form.sizeUsd))
      return setError("Add a positive dollar position size.");
    if (form.sizeMode === "units" && !positive(form.units))
      return setError("Add a positive unit size.");
    if (Boolean(form.exitPx) !== Boolean(form.exitTime))
      return setError("Add both an exit price and exit time, or leave both blank.");
    if (form.exitTime && form.exitTime < form.entryTime)
      return setError("Exit time must be after entry time.");
    onSave({ ...form, coin: form.coin.trim().toUpperCase() });
    close();
  }

  const result = deriveTrade(form);
  const entry = Number(form.entryPx);
  const stop = Number(form.stopPx);
  const target = Number(form.tpPx);
  const warning = entry > 0 && form.stopPx && ((form.dir === "Long" && stop >= entry) || (form.dir === "Short" && stop <= entry))
    ? `For a ${form.dir.toLowerCase()}, your stop-loss belongs ${form.dir === "Long" ? "below" : "above"} entry.`
    : entry > 0 && form.tpPx && ((form.dir === "Long" && target <= entry) || (form.dir === "Short" && target >= entry))
      ? `For a ${form.dir.toLowerCase()}, your take-profit belongs ${form.dir === "Long" ? "above" : "below"} entry.`
      : "";

  return (
    <dialog
      className="journal-dialog"
      ref={dialogRef}
      aria-labelledby="trade-dialog-title"
      onCancel={(event) => { event.preventDefault(); close(); }}
      onClick={(event) => { if (event.target === dialogRef.current) close(); }}
    >
      <form className="journal-trade-form" onSubmit={submit}>
        <header className="journal-dialog-header">
          <h2 id="trade-dialog-title">{trade ? "Edit trade" : "Log a trade"}</h2>
          <button className="journal-close" type="button" onClick={close} aria-label="Close trade form">×</button>
        </header>

        <div className="journal-dialog-body">
          <h3 className="journal-form-group">Entry</h3>
          <div className="journal-form-row">
            <label>Entry date and time<input type="datetime-local" value={localDateTime(form.entryTime)} onChange={(event) => update("entryTime", new Date(event.target.value).getTime())} /></label>
            <label>Market<input value={form.coin} maxLength={30} placeholder="BTC" autoComplete="off" onChange={(event) => update("coin", event.target.value)} /></label>
          </div>
          <div className="journal-form-row">
            <fieldset>
              <legend>Direction</legend>
              <div className="journal-segment">
                {(["Long", "Short"] as TradeDirection[]).map((direction) => <button key={direction} type="button" aria-pressed={form.dir === direction} onClick={() => update("dir", direction)}>{direction}</button>)}
              </div>
            </fieldset>
            <label>Strategy<input value={form.strategy} maxLength={120} placeholder="Breakout" onChange={(event) => update("strategy", event.target.value)} /></label>
          </div>
          <h3 className="journal-form-group">Price and size</h3>
          <div className="journal-form-row journal-size-row">
            <label>Entry price ($)<input className="journal-mono" inputMode="decimal" value={form.entryPx} onChange={(event) => update("entryPx", event.target.value)} /></label>
            <fieldset className="journal-size-field">
              <legend>Position size</legend>
              <div className="journal-size-control">
                <div className="journal-segment" aria-label="Size entered as">
                  {([['usd', 'Dollar value'], ['units', 'Units']] as [TradeSizeMode, string][]).map(([mode, label]) => <button key={mode} type="button" aria-pressed={form.sizeMode === mode} onClick={() => update("sizeMode", mode)}>{label}</button>)}
                </div>
                {form.sizeMode === "usd"
                  ? <label><span className="journal-sr-only">Position size in dollars</span><input aria-label="Position size in dollars" className="journal-mono" inputMode="decimal" placeholder="$0" value={form.sizeUsd} onChange={(event) => update("sizeUsd", event.target.value)} /></label>
                  : <label><span className="journal-sr-only">Position size in units</span><input aria-label="Position size in units" className="journal-mono" inputMode="decimal" placeholder="0 units" value={form.units} onChange={(event) => update("units", event.target.value)} /></label>}
              </div>
            </fieldset>
          </div>
          <div className="journal-form-row">
            <label>Fees ($)<input className="journal-mono" inputMode="decimal" value={form.fees} placeholder="0" onChange={(event) => update("fees", event.target.value)} /></label>
            <span aria-hidden="true" />
          </div>
          <h3 className="journal-form-group">Trade plan</h3>
          <div className="journal-form-row">
            <label>Stop-loss price ($)<input className="journal-mono" inputMode="decimal" value={form.stopPx} onChange={(event) => update("stopPx", event.target.value)} /></label>
            <label>Take-profit price ($)<input className="journal-mono" inputMode="decimal" value={form.tpPx} onChange={(event) => update("tpPx", event.target.value)} /></label>
          </div>

          <h3 className="journal-form-group">Exit <span>Leave blank while the trade is open</span></h3>
          <div className="journal-form-row">
            <label>Exit price ($)<input className="journal-mono" inputMode="decimal" value={form.exitPx} onChange={(event) => update("exitPx", event.target.value)} /></label>
            <label>Exit date and time<input type="datetime-local" value={localDateTime(form.exitTime)} onChange={(event) => update("exitTime", event.target.value ? new Date(event.target.value).getTime() : null)} /></label>
          </div>
          <p className="journal-preview" aria-live="polite">
            {result.closed ? `Net P/L ${money(result.net)} · ${rValue(result.r)}` : result.units > 0 ? `${result.units.toLocaleString("en-US", { maximumFractionDigits: 8 })} units · ${money(result.sizeUsd)} position` : ""}
          </p>
          {warning ? <p className="journal-warning">{warning}</p> : null}

          <h3 className="journal-form-group">Trading state</h3>
          <p className="journal-form-help">The numbers show what happened. Your state of mind helps explain why.</p>
          <div className="journal-emotion">
            <div><strong className="journal-emotion-number">{form.emo}</strong><span>{EMOTIONS[form.emo]}</span></div>
            <label htmlFor="trade-emotion" className="journal-sr-only">Trading state from 1 to 10</label>
            <input id="trade-emotion" type="range" min="1" max="10" value={form.emo} onChange={(event) => update("emo", Number(event.target.value))} />
            <div className="journal-emotion-anchors"><span>1 · Reactive</span><span>10 · Composed</span></div>
          </div>
          <label>Why did you enter?<textarea maxLength={1000} placeholder="Describe the setup and the rule you followed." value={form.reason} onChange={(event) => update("reason", event.target.value)} /></label>
          <label>What should you remember? <span className="journal-optional">Optional</span><textarea maxLength={2000} value={form.note} onChange={(event) => update("note", event.target.value)} /></label>
          <p className="journal-form-error" role="alert">{error}</p>
        </div>

        <footer className="journal-dialog-footer">
          {trade ? (
            confirmDelete
              ? <button className="journal-delete-confirm" type="button" onClick={() => { onDelete(form.id); close(); }}>Confirm delete</button>
              : <button className="journal-delete" type="button" onClick={() => setConfirmDelete(true)}>Delete trade</button>
          ) : <span />}
          <div><button className="journal-button journal-button-secondary" type="button" onClick={close}>Cancel</button><button className="journal-button" type="submit">Save trade</button></div>
        </footer>
      </form>
    </dialog>
  );
}
