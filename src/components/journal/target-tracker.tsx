"use client";

import { useEffect, useState } from "react";
import { localDateKey, parseJournalTarget, targetProgress, type JournalTarget } from "../../lib/journal/target";
import type { JournalTrade } from "../../lib/journal/types";

const dollars = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const dateLabel = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

function TargetForm({ initial, onSave, onCancel }: { initial: JournalTarget | null; onSave: (target: JournalTarget) => void; onCancel: () => void }) {
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [mode, setMode] = useState<JournalTarget["mode"]>(initial?.mode ?? "balance");
  const [deadline, setDeadline] = useState(initial?.deadline ?? "");
  const [error, setError] = useState("");
  const today = localDateKey(new Date());
  return <form className="journal-target-form" onSubmit={(event) => {
    event.preventDefault();
    try {
      if (deadline < today) throw new Error("Choose today or a future date.");
      const target = parseJournalTarget({ amount: Number(amount.replaceAll(",", "")), mode, deadline, startedOn: initial && initial.mode === mode ? initial.startedOn : today });
      if (target) onSave(target);
    } catch (err) { setError(err instanceof Error ? err.message : "Check your target."); }
  }}>
    <div className="journal-target-fields">
      <label>Target type<select value={mode} onChange={(event) => setMode(event.target.value as JournalTarget["mode"])}><option value="balance">Total account balance</option><option value="profit">New profit</option></select></label>
      <label>{mode === "profit" ? "Profit to earn ($)" : "Balance to reach ($)"}<input autoFocus inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="e.g. 5,000" required /></label>
      <label>Target date<input type="date" min={today} value={deadline} onInput={(event) => setDeadline(event.currentTarget.value)} onChange={(event) => setDeadline(event.target.value)} required /></label>
    </div>
    <p className="journal-chart-hint">{mode === "profit" ? `Counts net profit from closed trades since ${dateLabel(initial && initial.mode === mode ? initial.startedOn : today)}.` : "Uses trading capital plus net profit from all closed trades."}</p>
    {error ? <p className="journal-negative" role="alert">{error}</p> : null}
    <div className="journal-target-actions"><button className="journal-button" type="submit">Save target</button><button className="journal-button journal-button-secondary" type="button" onClick={onCancel}>Cancel</button></div>
  </form>;
}

export function TargetTracker({ target, trades, capital, onChange }: { target: JournalTarget | null; trades: JournalTrade[]; capital: number; onChange: (target: JournalTarget | null) => void }) {
  const [editing, setEditing] = useState(false);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);
  const progress = target ? targetProgress(target, trades, capital, now) : null;
  return <article className="journal-chart journal-target-card">
    <header className="journal-target-header"><div><span className="journal-target-eyebrow">Your next milestone · optional</span><h2>{target ? `${dollars.format(target.amount)} ${target.mode === "profit" ? "profit" : "balance"}` : "Give your progress a destination"}</h2><p>{target ? `By ${dateLabel(target.deadline)}` : "Set the total account balance you want to reach and a target date."}</p></div>
      {!editing ? <button className="journal-button journal-button-secondary" type="button" onClick={() => setEditing(true)}>{target ? "Edit target" : "Set a target"}</button> : null}
    </header>
    {editing ? <TargetForm initial={target} onSave={(next) => { onChange(next); setEditing(false); }} onCancel={() => setEditing(false)} /> : target && progress ? <>
      <div className="journal-target-progress"><div><span>{target.mode === "profit" ? `Net profit since ${dateLabel(target.startedOn)}` : "Current journal balance"}</span><strong>{dollars.format(progress.current)}</strong></div><div><span>{progress.reached ? "Target reached" : "Still to go"}</span><strong className={progress.reached ? "journal-positive" : ""}>{dollars.format(progress.remaining)}</strong></div></div>
      <div className="journal-target-track" role="progressbar" aria-label="Target progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress.percent)} aria-valuetext={`${dollars.format(progress.current)} of ${dollars.format(target.amount)}`}><span style={{ width: `${progress.percent}%` }} /></div>
      {progress.expired ? <p className="journal-target-expired">The target date has passed. Edit the date to see a new pace.</p> : <><div className="journal-target-pace">{[["Per day", progress.daily], ["Per week", progress.weekly], ["Per month", progress.monthly]].map(([label, amount]) => <div key={String(label)}><span>{label}</span><strong>{dollars.format(Number(amount))}</strong></div>)}</div><p className="journal-chart-hint">{progress.reached ? "You’ve reached this target." : `${progress.days} calendar ${progress.days === 1 ? "day" : "days"} left, including today. Week: up to 7 days · month: up to 30.`} A planning pace, not a requirement to trade.</p></>}
      <button type="button" className="journal-target-remove" onClick={() => onChange(null)}>Remove target</button>
    </> : null}
  </article>;
}
