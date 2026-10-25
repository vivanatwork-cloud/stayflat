"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { AccountMenu } from "@/components/brand/account-menu";
import { parseJournalTarget, type JournalTarget } from "@/lib/journal/target";
import type { JournalTrade } from "@/lib/journal/types";
import { parseReferenceState, referenceToLegacy } from "@/lib/journal/reference-state";

const TargetTracker = dynamic(() => import("./target-tracker").then((m) => m.TargetTracker));
const ChartPreview = dynamic(() => import("./chart-preview").then((m) => m.ChartPreview));

const CalendarView = dynamic(() => import("./pnl-calendar").then((m) => m.CalendarView), { loading: () => <p role="status">Loading calendar…</p> });

const Analytics = dynamic(() => import("./analytics").then((m) => m.Analytics));

export function ReferenceJournal({ document, trades, initialTarget = null, initialCapital = 0 }: { document: string; trades: JournalTrade[]; initialTarget?: JournalTarget | null; initialCapital?: number }) {
  const [slots, setSlots] = useState<{ calendar: HTMLElement; analytics: HTMLElement; chart: HTMLElement; target: HTMLElement } | null>(null);
  const [target, setTarget] = useState(initialTarget);
  const [capital, setCapital] = useState(initialCapital);
  const [chartLink, setChartLink] = useState("");
  const [savedTrades, setSavedTrades] = useState(trades);
  const [dirty, setDirty] = useState(false);
  const [dark, setDark] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  const [period, setPeriod] = useState<"all" | "7" | "30" | "ytd">("all");
  useEffect(() => {
    const iframe = frame.current;
    if (!iframe) return;
    let active = true;
    function connectJournal() {
      if (!active) return;
      const content = iframe?.contentDocument;
      if (!content) return;
      const calendar = content.getElementById("journal-calendar-slot");
      const analytics = content.getElementById("journal-extended-slot");
      const chart = content.getElementById("journal-chart-slot");
      const targetSlot = content.getElementById("journal-target-slot");
      if (!calendar || !analytics || !chart || !targetSlot) return;
      setSlots((current) => current?.calendar === calendar && current.analytics === analytics
        ? current : { calendar, analytics, chart, target: targetSlot });
      setChartLink((content.getElementById("f_chartUrl") as HTMLInputElement | null)?.value ?? "");
      // The journal can finish loading before React attaches its listeners.
      // Recover the theme from the document as well as listening for updates.
      const nextDark = content.documentElement.dataset.theme === "dark";
      setDark(nextDark);
      window.document.documentElement.dataset.theme = nextDark ? "dark" : "light";
      window.document.documentElement.style.colorScheme = nextDark ? "dark" : "light";
    }
    iframe.addEventListener("load", connectJournal);
    queueMicrotask(connectJournal);
    return () => {
      active = false;
      iframe.removeEventListener("load", connectJournal);
    };
  }, [document]);
  useEffect(() => {
    function receive(event: MessageEvent) {
      if (event.source !== frame.current?.contentWindow || event.origin !== location.origin) return;
      if (event.data?.type === "stayflat-journal-chart") {
        if (typeof event.data.link === "string" && event.data.link.length <= 2048) setChartLink(event.data.link);
        return;
      }
      if (event.data?.type === "stayflat-journal-theme") {
        const next = event.data.theme === "dark";
        setDark(next);
        window.document.documentElement.dataset.theme = next ? "dark" : "light";
        window.document.documentElement.style.colorScheme = next ? "dark" : "light";
        return;
      }
      if (event.data?.type === "stayflat-journal-period") {
        const next = event.data.period;
        if (next === "all" || next === "7" || next === "30" || next === "ytd") setPeriod(next);
        return;
      }
      if (event.data?.type === "stayflat-journal-dirty") { setDirty(true); return; }
      if (event.data?.type !== "stayflat-journal-saved") return;
      try { const next = parseReferenceState(event.data.state); setSavedTrades(referenceToLegacy(next, Date.now()).trades); setTarget(parseJournalTarget(next.target)); setCapital(next.tradingCapital ?? 0); setDirty(event.data.dirty === true); } catch { /* Ignore malformed frame messages. */ }
    }
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, []);
  useEffect(() => {
    function leaving(event: BeforeUnloadEvent) { if (dirty) { event.preventDefault(); event.returnValue = ""; } }
    window.addEventListener("beforeunload", leaving);
    return () => window.removeEventListener("beforeunload", leaving);
  }, [dirty]);
  return <main className="reference-journal-shell">
    <nav className="reference-journal-nav" aria-label="Account navigation">
      <Link href="/report" onClick={(event) => { if (dirty && !window.confirm("Some journal changes are not saved. Leave this page?")) event.preventDefault(); }}>← Wallet reports</Link>
      <div inert={dirty} title={dirty ? "Save your changes before opening the account menu" : undefined}><AccountMenu accessConfirmed showFeedbackPrompt={false} /></div>
    </nav>
    <div className="reference-journal-workspace">
      <iframe ref={frame} title="StayFlat trading journal" srcDoc={document} sandbox="allow-scripts allow-same-origin allow-downloads allow-modals allow-forms allow-popups allow-popups-to-escape-sandbox" />
    </div>
    {slots ? createPortal(<section className={`journal-page reference-inline${dark ? " journal-dark" : ""}`} aria-label="Trading target">
      {dirty ? <p className="journal-calendar-save-notice" role="status">Changes are waiting to save. Trade progress uses your saved results.</p> : null}
      <TargetTracker target={target} trades={savedTrades} capital={capital} onChange={(next) => {
        setTarget(next);
        frame.current?.contentWindow?.postMessage({ type: "stayflat-journal-target-update", target: next }, location.origin);
      }} />
    </section>, slots.target) : null}
    {slots ? createPortal(<section className={`journal-page reference-chart-preview${dark ? " journal-dark" : ""}`}><ChartPreview key={chartLink} link={chartLink} /></section>, slots.chart) : null}
    {slots ? createPortal(<section className={`journal-page reference-inline${dark ? " journal-dark" : ""}`} aria-label="Trading calendar">
      {dirty ? <p role="status" className="journal-calendar-save-notice">Showing saved trades. Recent changes will appear after they are saved.</p> : null}
      <CalendarView trades={savedTrades} />
    </section>, slots.calendar) : null}
    {slots ? createPortal(<section className={`journal-page reference-inline${dark ? " journal-dark" : ""}`} aria-label="Extended analytics">
      <h2>Extended analytics</h2>
      <p>More detail from your saved trades. Trading-state comparisons use composure: higher means calmer. Unrated trades are excluded.</p>
      {dirty ? <p role="status" className="journal-calendar-save-notice">Showing saved trades. Recent changes will appear after they are saved.</p> : null}
      <Analytics trades={savedTrades} period={period} onPeriodChange={setPeriod} showCalendar={false} showPeriodControls={false} />
    </section>, slots.analytics) : null}
  </main>;
}
