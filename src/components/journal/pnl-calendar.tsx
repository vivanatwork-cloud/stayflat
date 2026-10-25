"use client";

import { useMemo, useState } from "react";
import { buildJournalAnalytics, type DailyPerformance } from "../../lib/journal/analytics";
import type { JournalTrade } from "../../lib/journal/types";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const dollars = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", signDisplay: "exceptZero" });
const compactDollars = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1, signDisplay: "exceptZero" });
const tone = (pnl: number) => pnl > 0 ? "positive" : pnl < 0 ? "negative" : "flat";

export function calendarMonth(daily: DailyPerformance[], month: Date) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const prefix = `${year}-${String(monthIndex + 1).padStart(2, "0")}-`;
  const performance = daily.filter((day) => day.date.startsWith(prefix));
  const byDate = new Map(performance.map((day) => [day.date, day]));
  const offset = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const days = new Date(year, monthIndex + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((offset + days) / 7) * 7 }, (_, index) => {
    const day = index - offset + 1;
    if (day < 1 || day > days) return null;
    const date = `${prefix}${String(day).padStart(2, "0")}`;
    return { day, date, performance: byDate.get(date) };
  });
  return {
    cells,
    net: performance.reduce((sum, day) => sum + day.pnl, 0),
    trades: performance.reduce((sum, day) => sum + day.trades, 0),
    winningDays: performance.filter((day) => day.pnl > 0).length,
    losingDays: performance.filter((day) => day.pnl < 0).length,
    flatDays: performance.filter((day) => day.pnl === 0).length,
  };
}

export function PnlCalendar({ daily }: { daily: DailyPerformance[] }) {
  const [month, setMonth] = useState(() => {
    const latest = daily.reduce((date, day) => day.date > date ? day.date : date, "");
    const initial = latest ? new Date(`${latest}T12:00:00`) : new Date();
    return new Date(initial.getFullYear(), initial.getMonth(), 1);
  });
  const result = calendarMonth(daily, month);
  const monthName = month.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const move = (offset: number) => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  const today = new Date();
  const currentMonth = month.getFullYear() === today.getFullYear() && month.getMonth() === today.getMonth();
  const rows = Array.from({ length: result.cells.length / 7 }, (_, index) => result.cells.slice(index * 7, index * 7 + 7));

  return <article className="journal-chart journal-calendar-card">
    <header className="journal-calendar-head">
      <div><h2>Daily P/L calendar</h2><p>Net profit and loss after recorded fees, by closing date. Dates use your local time.</p></div>
      <div><button type="button" onClick={() => move(-1)} aria-label="Previous month">←</button><strong aria-live="polite">{monthName}</strong><button type="button" onClick={() => move(1)} aria-label="Next month">→</button></div>
    </header>
    <div className="journal-calendar-overview">
      <div><span>Month net P/L</span><strong className={`journal-${tone(result.net)}`}>{dollars.format(result.net)}</strong></div>
      <p>{result.trades} closed {result.trades === 1 ? "trade" : "trades"}<span>{result.winningDays} winning · {result.losingDays} losing · {result.flatDays} flat days</span></p>
      <button className="journal-button journal-button-secondary" type="button" disabled={currentMonth} onClick={() => setMonth(new Date(today.getFullYear(), today.getMonth(), 1))}>This month</button>
    </div>
    <div className="journal-calendar-scroll" tabIndex={0} role="region" aria-label="Monthly calendar">
      <div className="journal-calendar" role="table" aria-label={`Daily profit and loss for ${monthName}`}>
        <div className="journal-calendar-row" role="row">{WEEKDAYS.map((day) => <span className="journal-calendar-weekday" role="columnheader" key={day}>{day}</span>)}</div>
        {rows.map((row, index) => <div className="journal-calendar-row" role="row" key={index}>{row.map((cell, column) => {
          if (!cell) return <div role="cell" className="journal-calendar-day is-empty" key={`empty-${column}`} />;
          const performance = cell.performance;
          const isToday = currentMonth && cell.day === today.getDate();
          return <div role="cell" className={`journal-calendar-day${performance ? ` is-${tone(performance.pnl)}` : ""}${isToday ? " is-today" : ""}`} aria-current={isToday ? "date" : undefined} aria-label={`${monthName} ${cell.day}, ${performance ? `${performance.trades} closed trades, ${dollars.format(performance.pnl)}` : "no closed trades"}`} key={cell.date}>
            <span>{cell.day}{isToday ? <em>Today</em> : null}</span>
            {performance ? <><strong className={`journal-${tone(performance.pnl)}`}><span className="journal-calendar-full-value">{dollars.format(performance.pnl)}</span><span className="journal-calendar-compact-value" aria-hidden="true">{compactDollars.format(performance.pnl)}</span></strong><small>{performance.trades} {performance.trades === 1 ? "trade" : "trades"}{performance.pnl === 0 ? " · Flat" : ""}</small></> : <small className="journal-calendar-inactive">—</small>}
          </div>;
        })}</div>)}
      </div>
    </div>
    {result.trades > 0 ? <div className="journal-calendar-mobile-details"><p>Calendar amounts in USD · daily totals below</p><dl>{result.cells.map((cell) => cell?.performance ? <div key={cell.date}><dt>{new Date(`${cell.date}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}<small>{cell.performance.trades} {cell.performance.trades === 1 ? "trade" : "trades"}</small></dt><dd className={`journal-${tone(cell.performance.pnl)}`}>{dollars.format(cell.performance.pnl)}</dd></div> : null)}</dl></div> : null}
    {!result.trades ? <p className="journal-calendar-empty">No closed trades this month. Results appear here when a saved trade has an exit price and closing time.</p> : null}
  </article>;
}

export function CalendarView({ trades }: { trades: JournalTrade[] }) {
  const daily = useMemo(() => buildJournalAnalytics(trades, "all").daily, [trades]);
  return <PnlCalendar daily={daily} />;
}
