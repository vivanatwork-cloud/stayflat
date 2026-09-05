"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { AccountMenu } from "@/components/brand/account-menu";
import { FlatlineMark } from "@/components/brand/flatline-mark";
import { deriveTrade, emotionLabel, money, rValue } from "@/lib/journal/calculations";
import { journalCsv } from "@/lib/journal/csv";
import type { JournalState, JournalTrade, StoredJournal } from "@/lib/journal/types";
import { parseJournalState } from "@/lib/journal/validation";
import type { AnalyticsPeriod } from "./analytics";
import { TradeForm } from "./trade-form";
import { TradeTable } from "./trade-table";

const Analytics = dynamic(
  () => import("./analytics").then((module) => module.Analytics),
  { loading: () => <div className="journal-chart journal-chart-full"><div className="journal-empty"><p>Preparing analytics…</p></div></div> },
);

const STORAGE_KEY = "stayflat_journal_v2";

type SyncState = "saved" | "saving" | "offline" | "error";

function Summary({ state }: { state: JournalState }) {
  const closed = state.trades.map((trade) => ({ trade, result: deriveTrade(trade) })).filter((item) => item.result.closed);
  const net = closed.reduce((sum, item) => sum + (item.result.net ?? 0), 0);
  const wins = closed.filter((item) => item.result.win).length;
  const rs = closed.map((item) => item.result.r).filter((value): value is number => value !== null);
  const emotions = new Map<string, number>();
  state.trades.forEach((trade) => emotions.set(emotionLabel(trade.emo), (emotions.get(emotionLabel(trade.emo)) ?? 0) + 1));
  const commonState = [...emotions].toSorted((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
  const stats = [
    ["Net P/L", money(net), net >= 0 ? "journal-positive" : "journal-negative"],
    ["Win rate", closed.length ? `${Math.round(wins / closed.length * 100)}%` : "—", ""],
    ["Avg R", rs.length ? rValue(rs.reduce((sum, value) => sum + value, 0) / rs.length) : "—", ""],
    ["Closed trades", String(closed.length), ""],
    ["Balance", money(state.startingCapital + net), ""],
    ["Common state", commonState, ""],
  ];
  return <div className="journal-summary">{stats.map(([label, value, className]) => <div className="journal-stat" key={label}><span>{label}</span><strong className={className}>{value}</strong></div>)}</div>;
}

export function Journal({ initialJournal }: { initialJournal: JournalState }) {
  const [journal, setJournal] = useState(initialJournal);
  const [view, setView] = useState<"trades" | "analytics">("trades");
  const [period, setPeriod] = useState<AnalyticsPeriod>("all");
  const [editing, setEditing] = useState<JournalTrade | "new" | null>(null);
  const [sync, setSync] = useState<SyncState>("saved");
  const [dark, setDark] = useState(false);
  const [online, setOnline] = useState(true);
  const journalRef = useRef(initialJournal);
  const saveChain = useRef(Promise.resolve());
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTrigger = useRef<HTMLElement | null>(null);

  const store = useCallback((state: JournalState, pendingSync: boolean) => {
    try {
      const stored: StoredJournal = { version: 2, state, pendingSync };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    } catch {
      // Server saving still works when browser storage is unavailable.
    }
  }, []);

  const enqueueSave = useCallback((state: JournalState) => {
    store(state, true);
    setSync("saving");
    saveChain.current = saveChain.current.then(async () => {
      try {
        const response = await fetch("/api/journal", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(state),
        });
        if (!response.ok) {
          const body = await response.json().catch(() => null) as { error?: string } | null;
          throw new Error(body?.error || "Save failed");
        }
        const body = await response.json() as { updatedAt: number };
        if (journalRef.current.updatedAt === state.updatedAt) {
          const saved = { ...journalRef.current, updatedAt: body.updatedAt };
          journalRef.current = saved;
          setJournal(saved);
          store(saved, false);
          setSync("saved");
        }
      } catch {
        store(journalRef.current, true);
        setSync(navigator.onLine ? "error" : "offline");
      }
    });
  }, [store]);

  const scheduleSave = useCallback((state: JournalState) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => enqueueSave(state), 500);
  }, [enqueueSave]);

  useEffect(() => {
    let active = true;
    try {
      const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem("stayflat_journal_v1");
      if (raw) {
        const decoded = JSON.parse(raw) as StoredJournal | unknown;
        const wrapped = typeof decoded === "object" && decoded !== null && "state" in decoded
          ? decoded as StoredJournal
          : null;
        const parsed = parseJournalState(wrapped?.state ?? decoded);
        const shouldRestore = parsed.ok && (
          (wrapped?.pendingSync && parsed.value.updatedAt > initialJournal.updatedAt) ||
          (!wrapped && initialJournal.trades.length === 0 && parsed.value.trades.length > 0)
        );
        if (shouldRestore && parsed.ok) {
          const restored = { ...parsed.value, updatedAt: parsed.value.updatedAt || Date.now() };
          journalRef.current = restored;
          queueMicrotask(() => {
            if (!active) return;
            setJournal(restored);
            setSync(navigator.onLine ? "saving" : "offline");
            enqueueSave(restored);
          });
        } else store(initialJournal, false);
      } else store(initialJournal, false);
      const prefersDark = localStorage.getItem("stayflat_theme") === "dark";
      queueMicrotask(() => { if (active) setDark(prefersDark); });
    } catch {
      queueMicrotask(() => { if (active) setSync("offline"); });
    }
    return () => { active = false; };
  }, [enqueueSave, initialJournal, store]);

  useEffect(() => {
    const cameOnline = () => {
      setOnline(true);
      if (sync === "offline" || sync === "error") enqueueSave(journalRef.current);
    };
    const wentOffline = () => setOnline(false);
    window.addEventListener("online", cameOnline);
    window.addEventListener("offline", wentOffline);
    return () => {
      window.removeEventListener("online", cameOnline);
      window.removeEventListener("offline", wentOffline);
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [enqueueSave, sync]);

  function update(next: Omit<JournalState, "updatedAt">) {
    const state = { ...next, updatedAt: Date.now() };
    journalRef.current = state;
    setJournal(state);
    store(state, true);
    scheduleSave(state);
  }

  function saveTrade(trade: JournalTrade) {
    const exists = journal.trades.some((item) => item.id === trade.id);
    const trades = exists
      ? journal.trades.map((item) => item.id === trade.id ? trade : item)
      : [...journal.trades, trade];
    update({ startingCapital: journal.startingCapital, trades });
  }

  function deleteTrade(id: string) {
    update({ startingCapital: journal.startingCapital, trades: journal.trades.filter((trade) => trade.id !== id) });
  }

  function openTrade(trade: JournalTrade | "new") {
    lastTrigger.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    setEditing(trade);
  }

  function exportCsv() {
    const blob = new Blob([journalCsv(journal)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "stayflat-journal.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  const syncCopy = sync === "saved" ? "Saved to your account" : sync === "saving" ? "Saving…" : sync === "offline" ? "Saved in this browser—reconnect to sync" : "Save failed. Try again.";

  return <main className={`journal-page${dark ? " journal-dark" : ""}`}>
    <header className="journal-header">
      <div className="journal-header-inner">
        <div className="journal-brand"><FlatlineMark /><strong>StayFlat</strong><span>Journal</span></div>
        <div className="journal-actions">
          <span className={`journal-sync journal-sync-${sync}`} role="status">{syncCopy}</span>
          {(sync === "offline" || sync === "error") && online ? <button className="journal-retry" type="button" onClick={() => enqueueSave(journalRef.current)}>Retry</button> : null}
          <button className="journal-icon-button" type="button" aria-label={`Use ${dark ? "light" : "dark"} theme`} onClick={() => setDark((current) => { const next = !current; localStorage.setItem("stayflat_theme", next ? "dark" : "light"); return next; })}>{dark ? "☀" : "☾"}</button>
          <button className="journal-button journal-button-secondary journal-export" type="button" onClick={exportCsv}>Export CSV</button>
          <button className="journal-button" type="button" onClick={() => openTrade("new")}>Log a trade</button>
          <div className="journal-account"><AccountMenu accessConfirmed /></div>
        </div>
      </div>
    </header>

    <div className="journal-wrap">
      <div className="journal-tabs" role="tablist" aria-label="Journal views">
        <button role="tab" aria-selected={view === "trades"} aria-controls="journal-trades" type="button" onClick={() => setView("trades")}>Trades</button>
        <button role="tab" aria-selected={view === "analytics"} aria-controls="journal-analytics" type="button" onClick={() => setView("analytics")}>Analytics</button>
      </div>

      <section className="journal-intro" aria-labelledby="journal-title"><h1 id="journal-title">Keep the evidence. Catch the pattern.</h1><p>Record the trade, the decision behind it, and how you felt in the moment. Over time, your journal shows which habits help—and which keep costing you.</p></section>

      <label className="journal-balance">Starting trading balance<span><b>$</b><input className="journal-mono" inputMode="decimal" value={journal.startingCapital} onChange={(event) => { const value = Number(event.target.value); if (Number.isFinite(value) && value >= 0) update({ startingCapital: value, trades: journal.trades }); }} /></span></label>

      {view === "trades" ? <section id="journal-trades" role="tabpanel">
        <Summary state={journal} />
        <div className="journal-section-heading"><h2>Trade log</h2><span>{journal.trades.length} {journal.trades.length === 1 ? "trade" : "trades"}</span></div>
        <TradeTable trades={journal.trades} onEdit={openTrade} />
      </section> : <div id="journal-analytics" role="tabpanel"><Analytics trades={journal.trades} period={period} onPeriodChange={setPeriod} /></div>}

      <p className="journal-footnote">Your journal syncs to your StayFlat account and keeps a browser copy for temporary connection loss. CSV export is always available as your own backup.</p>
    </div>

    {editing ? <TradeForm key={editing === "new" ? "new" : editing.id} trade={editing === "new" ? undefined : editing} onSave={saveTrade} onDelete={deleteTrade} onClose={() => { setEditing(null); requestAnimationFrame(() => lastTrigger.current?.focus()); }} /> : null}
  </main>;
}
