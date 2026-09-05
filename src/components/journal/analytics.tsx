"use client";

import { useMemo, useState } from "react";
import { buildJournalAnalytics, type AnalyticsPeriod } from "@/lib/journal/analytics";
import { money } from "@/lib/journal/calculations";
import type { JournalTrade } from "@/lib/journal/types";

export type { AnalyticsPeriod } from "@/lib/journal/analytics";
const PERIODS: [AnalyticsPeriod, string][] = [["all", "All time"], ["7", "Last 7 days"], ["30", "Last 30 days"], ["ytd", "This year"]];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function Stat({ label, value, tone }: { label: string; value: string; tone?: "positive" | "negative" }) {
  return <div className="journal-stat"><span>{label}</span><strong className={tone ? `journal-${tone}` : ""}>{value}</strong></div>;
}
function Bars({ items }: { items: { label: string; value: number }[] }) {
  const maximum = Math.max(1, ...items.map((item) => Math.abs(item.value)));
  return <div className="journal-bars">{items.map((item) => <div className="journal-bar-row" key={item.label}><span title={item.label}>{item.label}</span><div><i className={item.value >= 0 ? "journal-bar-positive" : "journal-bar-negative"} style={{ width: `${Math.max(2, Math.abs(item.value) / maximum * 100)}%` }} /></div><strong className={item.value >= 0 ? "journal-positive" : "journal-negative"}>{money(item.value)}</strong></div>)}</div>;
}

function EquityChart({ points }: { points: { time: number; value: number }[] }) {
  const width = 720, height = 220, pad = 18;
  const values = [0, ...points.map((point) => point.value)];
  const minimum = Math.min(...values), maximum = Math.max(...values), range = maximum - minimum || 1;
  const x = (index: number) => pad + index / Math.max(points.length - 1, 1) * (width - pad * 2);
  const y = (value: number) => pad + (maximum - value) / range * (height - pad * 2);
  const path = points.map((point, index) => `${index ? "L" : "M"}${x(index).toFixed(1)},${y(point.value).toFixed(1)}`).join(" ");
  const final = points.at(-1)?.value ?? 0;
  return <article className="journal-chart journal-equity-card">
    <header><div><h2>Cumulative P/L</h2><p>How each closed trade changed your running result.</p></div><strong className={final >= 0 ? "journal-positive" : "journal-negative"}>{money(final)}</strong></header>
    <svg className="journal-equity" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Cumulative profit and loss across ${points.length} closed trades, ending at ${money(final)}`}><line x1={pad} x2={width - pad} y1={y(0)} y2={y(0)} className="journal-equity-zero" /><path d={path} className={final >= 0 ? "journal-equity-positive" : "journal-equity-negative"} />{points.map((point, index) => <circle key={`${point.time}-${index}`} cx={x(index)} cy={y(point.value)} r="3"><title>{new Date(point.time).toLocaleDateString()} · {money(point.value)}</title></circle>)}</svg>
    <div className="journal-chart-axis"><span>{new Date(points[0].time).toLocaleDateString()}</span><span>{new Date(points.at(-1)!.time).toLocaleDateString()}</span></div>
  </article>;
}

function Calendar({ daily }: { daily: { date: string; pnl: number; trades: number }[] }) {
  const latest = daily.at(-1)?.date;
  const initial = latest ? new Date(`${latest}T12:00:00`) : new Date();
  const [month, setMonth] = useState(() => new Date(initial.getFullYear(), initial.getMonth(), 1));
  const byDate = new Map(daily.map((day) => [day.date, day]));
  const firstOffset = (month.getDay() + 6) % 7;
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((firstOffset + days) / 7) * 7 }, (_, index) => {
    const day = index - firstOffset + 1;
    if (day < 1 || day > days) return null;
    const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return { day, key, performance: byDate.get(key) };
  });
  const move = (offset: number) => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  const monthName = month.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  return <article className="journal-chart journal-calendar-card"><header className="journal-calendar-head"><div><h2>Daily P/L calendar</h2><p>See profitable, losing, and inactive days at a glance.</p></div><div><button type="button" onClick={() => move(-1)} aria-label="Previous month">←</button><strong>{monthName}</strong><button type="button" onClick={() => move(1)} aria-label="Next month">→</button></div></header><div className="journal-calendar" role="grid" aria-label={`Daily profit and loss for ${monthName}`}>{WEEKDAYS.map((day) => <span className="journal-calendar-weekday" role="columnheader" key={day}>{day}</span>)}{cells.map((cell, index) => cell ? <div role="gridcell" className={`journal-calendar-day${cell.performance ? cell.performance.pnl >= 0 ? " is-positive" : " is-negative" : ""}`} aria-label={`${monthName} ${cell.day}${cell.performance ? `, ${cell.performance.trades} trades, ${money(cell.performance.pnl)}` : ", no closed trades"}`} key={cell.key}><span>{cell.day}</span>{cell.performance ? <><strong>{money(cell.performance.pnl)}</strong><small>{cell.performance.trades} {cell.performance.trades === 1 ? "trade" : "trades"}</small></> : null}</div> : <span className="journal-calendar-day is-empty" aria-hidden="true" key={`empty-${index}`} />)}</div></article>;
}

function StrategyTable({ rows }: { rows: ReturnType<typeof buildJournalAnalytics>["strategies"] }) {
  return <article className="journal-chart journal-strategy-card"><h2>Performance by strategy</h2><p>Compare the setups you actually recorded.</p><div className="journal-strategy-wrap"><table className="journal-strategy-table"><thead><tr><th>Strategy</th><th>Trades</th><th>Win rate</th><th>Average</th><th>Profit factor</th><th>Net P/L</th></tr></thead><tbody>{rows.map((row) => <tr key={row.strategy}><td><strong>{row.strategy}</strong></td><td>{row.trades}</td><td>{Math.round(row.winRate * 100)}%</td><td>{money(row.average)}</td><td>{row.profitFactor?.toFixed(2) ?? "—"}</td><td className={row.net >= 0 ? "journal-positive" : "journal-negative"}>{money(row.net)}</td></tr>)}</tbody></table></div></article>;
}

function ReportObservations({ analytics }: { analytics: ReturnType<typeof buildJournalAnalytics> }) {
  const { report, summary } = analytics;
  const hour = (value: number) => new Date(2020, 0, 1, value).toLocaleTimeString([], { hour: "numeric" });
  const observations = [
    ["Biggest realized loss", money(report.biggestLoss), report.biggestLoss == null ? "No losing trades in this period." : "Your largest net loss on one recorded trade."],
    ["Markets traded", String(report.marketCount), report.marketCount === 1 ? "One market appears in this period." : `${report.marketCount} markets appear in this period.`],
    ["Size after a loss", report.sizeAfterLossRatio == null ? "—" : `${report.sizeAfterLossRatio.toFixed(1)}×`, report.sizeAfterLossRatio == null ? "Close a losing trade and then another trade to compare position sizes." : "Median position size after a loss compared with your usual size."],
    ["Cool-down after a loss", report.medianCooldownMinutes == null ? "—" : report.medianCooldownMinutes < 60 ? `${Math.round(report.medianCooldownMinutes)} min` : `${(report.medianCooldownMinutes / 60).toFixed(1)} hr`, report.medianCooldownMinutes == null ? "More trades are needed to measure the pause after losses." : "Median time from a losing exit to the next entry."],
    ["Loss cluster", report.dangerStart == null ? "—" : `${hour(report.dangerStart)}–${hour((report.dangerStart + 3) % 24)}`, report.dangerStart == null ? "No losing time window appears in this period." : "The three-hour window where recorded losses were highest."],
    ["Losses vs wins", summary.averageWin == null || summary.averageLoss == null ? "—" : `${(Math.abs(summary.averageLoss) / summary.averageWin).toFixed(1)}×`, summary.averageWin == null || summary.averageLoss == null ? "Record both winning and losing trades to compare them." : `Average loss ${money(summary.averageLoss)}. Average win ${money(summary.averageWin)}.`],
    ["Long vs short", report.longCount && report.shortCount ? (report.longPnl >= report.shortPnl ? "Longs" : "Shorts") : "—", report.longCount && report.shortCount ? `Longs netted ${money(report.longPnl)}. Shorts netted ${money(report.shortPnl)}.` : "Record closed trades in both directions to compare them."],
    ["Busiest-day result", report.busyDayPnl == null ? "—" : money(report.busyDayPnl), report.busyDayPnl == null ? "Close a trade to calculate this." : `Net P/L on the day you completed ${report.busyDayCount} ${report.busyDayCount === 1 ? "trade" : "trades"}. Fees are included.`],
    ["Fees paid", money(report.fees), report.feeMultiple == null ? "Total fees recorded in this period." : `${report.feeMultiple.toFixed(1)}× the size of your net result.`],
    ["Loss concentration", report.lossShare == null ? "—" : `${Math.round(report.lossShare * 100)}%`, report.lossShare == null ? "At least six losing trades are needed." : "Share of all losses caused by your five worst trades."],
  ];
  return <section className="journal-report-block" aria-labelledby="journal-report-title"><header><p>StayFlat report</p><h2 id="journal-report-title">Behavior observations from your journal</h2><span>Measured from the trades and context you recorded.</span></header><div className="journal-observations">{observations.map(([label, figure, copy]) => <article key={label}><strong>{figure}</strong><div><h3>{label}</h3><p>{copy}</p></div></article>)}</div></section>;
}

export function Analytics({ trades, period, onPeriodChange }: { trades: JournalTrade[]; period: AnalyticsPeriod; onPeriodChange: (period: AnalyticsPeriod) => void }) {
  const analytics = useMemo(() => buildJournalAnalytics(trades, period), [trades, period]);
  const { closed, summary } = analytics;
  return <section aria-label="Journal analytics"><div className="journal-filters" aria-label="Analytics period">{PERIODS.map(([value, label]) => <button type="button" key={value} aria-pressed={period === value} onClick={() => onPeriodChange(value)}>{label}</button>)}</div>{closed.length === 0 ? <div className="journal-chart journal-chart-full"><div className="journal-empty"><p>No closed trades in this period. Add an exit price and exit time to a trade, or choose a wider range.</p></div></div> : <><div className="journal-summary journal-analytics-summary"><Stat label="Net P/L" value={money(summary.net)} tone={summary.net >= 0 ? "positive" : "negative"} /><Stat label="Win rate" value={`${Math.round((summary.winRate ?? 0) * 100)}%`} /><Stat label="Expectancy" value={money(summary.expectancy)} tone={(summary.expectancy ?? 0) >= 0 ? "positive" : "negative"} /><Stat label="Profit factor" value={summary.profitFactor?.toFixed(2) ?? "—"} /><Stat label="Avg win" value={money(summary.averageWin)} tone="positive" /><Stat label="Avg loss" value={money(summary.averageLoss)} tone="negative" /><Stat label="Max drawdown" value={money(-summary.maxDrawdown)} tone="negative" /><Stat label="Closed trades" value={String(summary.closedTrades)} /></div><div className="journal-analytics-stack"><EquityChart points={analytics.equity} /><Calendar daily={analytics.daily} /><StrategyTable rows={analytics.strategies} /></div><div className="journal-charts"><article className="journal-chart"><h2>P/L by trading state</h2><p>See how your state of mind relates to your result.</p><Bars items={analytics.byEmotion} /></article><article className="journal-chart"><h2>P/L by market</h2><p>See where gains and losses are concentrated.</p><Bars items={analytics.byMarket.slice(0, 7)} /></article></div><ReportObservations analytics={analytics} /></>}</section>;
}
