"use client";

import { useState } from "react";
import { tradingViewChart } from "../../lib/journal/tradingview";

export function ChartPreview({ link }: { link: string }) {
  const chart = tradingViewChart(link);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  if (!link.trim()) return null;
  if (!chart) return <p className="journal-chart-hint" role="status">Use an HTTPS TradingView chart or snapshot link.</p>;
  return <div className="journal-trade-chart">
    {chart.imageUrl && !failed ? <>
      {!loaded ? <p className="journal-chart-hint" role="status">Loading your chart…</p> : null}
      {/* A remote snapshot is already an image; retain its original size and attribution. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={chart.imageUrl} alt="TradingView chart attached to this trade" loading="lazy" referrerPolicy="no-referrer" onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />
    </> : <p className="journal-chart-hint" role="status">{failed ? "This chart image is unavailable. Open the original link, or add a new snapshot." : "For an inline preview, use TradingView’s camera icon → Copy link to the chart image."}</p>}
    <a href={chart.url} target="_blank" rel="noopener noreferrer" className="journal-chart-source">Open chart in TradingView ↗</a>
  </div>;
}
