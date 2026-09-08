import type { MoonPerformance, MoonPeriodMetrics } from "@/lib/moon/performance";

const money = (value: number | null | undefined) => value == null ? "—" : new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD", maximumFractionDigits: 2,
}).format(value);

function Period({ name, note, metrics, moon }: { name: string; note: string; metrics: MoonPeriodMetrics; moon: "new" | "full" }) {
  return (
    <section className="moon-period" data-moon={moon}>
      <header><span className="moon-mark" aria-hidden="true" /><div><h3>{name}</h3><p>{note}</p></div></header>
      <strong className={metrics.pnl < 0 ? "negative" : metrics.pnl > 0 ? "positive" : undefined}>{money(metrics.pnl)}</strong>
      <span>Net realized P&L</span>
      <dl>
        <div><dt>Long net P&L</dt><dd className={metrics.longPnl != null && metrics.longPnl < 0 ? "negative" : metrics.longPnl != null && metrics.longPnl > 0 ? "positive" : undefined}>{money(metrics.longPnl)}</dd></div>
        <div><dt>Short net P&L</dt><dd className={metrics.shortPnl != null && metrics.shortPnl < 0 ? "negative" : metrics.shortPnl != null && metrics.shortPnl > 0 ? "positive" : undefined}>{money(metrics.shortPnl)}</dd></div>
        <div><dt>Win rate</dt><dd>{metrics.winRate == null ? "—" : `${Math.round(metrics.winRate * 100)}%`}</dd></div>
        <div><dt>Average position</dt><dd>{money(metrics.averagePnl)}</dd></div>
        <div><dt>Completed positions</dt><dd>{metrics.positions}</dd></div>
      </dl>
    </section>
  );
}

export function MoonCyclePerformance({ performance, onRefresh }: { performance?: MoonPerformance; onRefresh: () => void }) {
  if (!performance) return (
    <article className="report-entry-card moon-cycle-card moon-cycle-empty">
      <header><span>Moon-cycle performance</span><small>roughly 15 days per period</small></header>
      <p>Moon-cycle analysis is not available in this saved report yet. <button type="button" onClick={onRefresh}>Refresh this report</button></p>
    </article>
  );
  const result = !performance.comparisonReady
    ? "Not enough completed positions for a reliable comparison."
    : performance.betterPeriod === "tie"
      ? "Both moon periods produced the same net result."
      : `Your ${performance.betterPeriod === "new" ? "New Moon" : "Full Moon"} periods produced the stronger net result.`;
  return (
    <article className="report-entry-card moon-cycle-card">
      <header><span>Moon-cycle performance</span><small>roughly 15 days per period</small></header>
      <div className="moon-cycle-strip" aria-hidden="true"><span>New Moon period</span><span>Full Moon period</span></div>
      <p className="moon-cycle-definition">Each position is grouped by when it closed: new moon to full moon, then full moon to the next new moon.</p>
      <div className="moon-period-grid">
        <Period name="New Moon period" note="New moon → full moon" metrics={performance.newMoon} moon="new" />
        <Period name="Full Moon period" note="Full moon → new moon" metrics={performance.fullMoon} moon="full" />
      </div>
      <p className="moon-cycle-result"><strong>{result}</strong> This is an observed timing pattern, not evidence that moon phases caused the result.</p>
    </article>
  );
}
