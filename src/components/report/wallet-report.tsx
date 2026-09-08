"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { FlatlineMark } from "@/components/brand/flatline-mark";
import type { ReportMetrics } from "@/lib/hyperliquid/metrics";
import type { MultiVenueMetrics, VenueName } from "@/lib/report/multi-venue";

type Access = { used: number; limit: number; unlimited?: boolean; blocked?: boolean };
type ReportResponse = { address: string; addresses?: string[]; report: MultiVenueMetrics; access: Access };
type HistoryItem = { address: string; metrics?: ReportMetrics; report?: MultiVenueMetrics; createdAt: number; updatedAt?: number };
type SavedPortfolio = { addresses: string[]; report: MultiVenueMetrics; createdAt: number; updatedAt: number };
const walletPattern = /^0x[0-9a-fA-F]{40}$/;
const money = (value: number | null) =>
  value == null
    ? "—"
    : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: Math.abs(value) < 100 ? 2 : 0, maximumFractionDigits: 2 }).format(value);
const compactMoney = (value: number) => new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: Math.abs(value) >= 10_000 ? "compact" : "standard",
  maximumFractionDigits: Math.abs(value) >= 10_000 ? 1 : 2,
}).format(value);
const calendarMoney = (value: number) => new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: Math.abs(value) >= 1_000 ? "compact" : "standard",
  minimumFractionDigits: 0,
  maximumFractionDigits: Math.abs(value) >= 1_000 ? 1 : 2,
}).format(value);
const minutes = (value: number) =>
  value < 1
    ? "<1 min"
    : value < 60
      ? `${Math.round(value)} min`
      : `${(value / 60).toFixed(1)} hr`;
const hour = (value: number) =>
  `${value % 12 || 12}${value < 12 ? "am" : "pm"}`;
const date = (value: number) =>
  new Date(value).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
const calendarDate = (value: string) =>
  new Intl.DateTimeFormat("en-US", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })
    .format(new Date(`${value}T00:00:00Z`));

function historySummary(item: HistoryItem) {
  const metrics = item.report?.combined ?? item.metrics;
  if (!metrics) return "Generate saved result";
  if (metrics.empty) return "No perpetual fills found";
  const venues = item.report ? ` · ${item.report.activeVenues.length} ${item.report.activeVenues.length === 1 ? "venue" : "venues"}` : "";
  return `${money(metrics.perpPnl)} all-time PnL · ${metrics.fillCount} fills${venues}`;
}

export function WalletReport({ initialAccess, initialReport = null, initialAddress = "", initialHistory = [], savedPortfolio = null, openSavedPortfolio = false }: { initialAccess: Access; initialReport?: ReportResponse | null; initialAddress?: string; initialHistory?: HistoryItem[]; savedPortfolio?: SavedPortfolio | null; openSavedPortfolio?: boolean }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const lighterTokenRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const [address, setAddress] = useState(initialAddress);
  const [lighterToken, setLighterToken] = useState("");
  const [lighterTokenVisible, setLighterTokenVisible] = useState(false);
  const [lighterTokenNeeded, setLighterTokenNeeded] = useState(false);
  const [report, setReport] = useState<ReportResponse | null>(() => openSavedPortfolio && savedPortfolio ? { address: savedPortfolio.addresses[0], addresses: savedPortfolio.addresses, report: savedPortfolio.report, access: initialAccess } : initialReport);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");
  const [access, setAccess] = useState(initialAccess);
  const [history, setHistory] = useState(initialHistory);
  const [announcement, setAnnouncement] = useState("");
  const [reportReadyKey, setReportReadyKey] = useState(0);
  const [selectedAddresses, setSelectedAddresses] = useState(() => initialHistory.map((item) => item.address));
  const [portfolioTokens, setPortfolioTokens] = useState<Record<string, string>>({});
  const [lighterWallets, setLighterWallets] = useState<string[]>([]);
  const newAddressBlocked = Boolean(access.blocked);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);
  useEffect(() => () => requestRef.current?.abort(), []);

  async function generate(value: string) {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setStatus("loading");
    setAnnouncement("Reading this wallet. This usually takes less than 30 seconds.");
    setError("");
    try {
      const response = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: value,
          timezoneOffsetMinutes: new Date().getTimezoneOffset(),
          ...(lighterToken.trim() ? { lighterToken: lighterToken.trim() } : {}),
        }),
        signal: controller.signal,
      });
      const data = await response.json().catch(() => null) as ReportResponse & { error?: string; code?: string } | null;
      if (!response.ok) {
        if (data?.code === "LIGHTER_TOKEN_REQUIRED" || data?.code === "LIGHTER_TOKEN_INVALID") {
          setLighterTokenNeeded(true);
          window.setTimeout(() => lighterTokenRef.current?.focus(), 0);
        }
        throw new Error(data?.error || "We couldn't generate the report. Try again.");
      }
      if (!data) throw new Error("We couldn't generate the report. Try again.");
      setReport(data);
      setAccess(data.access);
      setHistory((current) => {
      const next = { address: data.address, report: data.report, createdAt: Date.now(), updatedAt: Date.now() };
        return [next, ...current.filter((item) => item.address !== data.address)];
      });
      setStatus("idle");
      setAnnouncement("Report ready.");
      setReportReadyKey((key) => key + 1);
    } catch (reason) {
      if (controller.signal.aborted) {
        setStatus("idle");
        setAnnouncement("Report generation cancelled.");
        return;
      }
      const message = reason instanceof Error ? reason.message : "We couldn't generate the report. Try again.";
      setError(message);
      setAnnouncement(message);
      setStatus("error");
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    const value = address.trim();
    if (!walletPattern.test(value)) {
      setError(
        "That doesn't look like a wallet address. It should start with 0x and be 42 characters.",
      );
      return;
    }
    if (newAddressBlocked) {
      setError("Report generation is blocked for this account. Contact support if you think this is a mistake.");
      return;
    }
    await generate(value);
  }

  async function generatePortfolio() {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setStatus("loading");
    setError("");
    setAnnouncement(`Reading ${selectedAddresses.length} wallets.`);
    try {
      const response = await fetch("/api/report/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addresses: selectedAddresses, lighterTokens: portfolioTokens, timezoneOffsetMinutes: new Date().getTimezoneOffset() }),
        signal: controller.signal,
      });
      const data = await response.json().catch(() => null) as { addresses?: string[]; report?: MultiVenueMetrics; error?: string; code?: string } | null;
      if (!response.ok) {
        if (data?.code === "LIGHTER_TOKENS_REQUIRED" && data.addresses) setLighterWallets(data.addresses);
        throw new Error(data?.error || "We couldn't generate the portfolio report.");
      }
      if (!data?.addresses || !data.report) throw new Error("We couldn't generate the portfolio report.");
      setReport({ address: data.addresses[0], addresses: data.addresses, report: data.report, access });
      setStatus("idle");
      setAnnouncement("Portfolio report ready.");
      setReportReadyKey((key) => key + 1);
      router.replace("/report?portfolio=1");
    } catch (reason) {
      if (controller.signal.aborted) { setStatus("idle"); return; }
      setError(reason instanceof Error ? reason.message : "We couldn't generate the portfolio report.");
      setStatus("error");
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
    }
  }

  function reset() {
    requestRef.current?.abort();
    setReport(null);
    setAddress("");
    setLighterToken("");
    setLighterTokenNeeded(false);
    setStatus("idle");
    setError("");
    router.replace("/report");
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  if (report) return <>
    <p className="sr-only" aria-live="polite">{announcement}</p>
    <ReportResult
      report={report}
      onReset={reset}
      onRefresh={() => report.addresses && report.addresses.length > 1 ? generatePortfolio() : generate(report.address)}
      onCancel={() => requestRef.current?.abort()}
      refreshing={status === "loading"}
      error={error}
      readyKey={reportReadyKey}
      blocked={Boolean(access.blocked)}
    />
  </>;

  return (
    <section className="report-panel" aria-labelledby="report-title">
      <p className="report-eyebrow">Your report</p>
      <h1 id="report-title">
        One wallet. <em>Every supported perp venue.</em>
      </h1>
      <p className="report-sub">
        Paste one address to read its Hyperliquid, Arcus, and Lighter history together.
        If it trades across venues, you&apos;ll also get a combined view.
      </p>
      <div className="report-allowance" aria-label="Wallet report usage">
        <strong>{access.used}</strong>
        <span>saved wallets · unlimited</span>
      </div>
      <form className="report-wallet-form" onSubmit={submit} noValidate>
        <div className="report-address-row">
          <label className="sr-only" htmlFor="wallet-address">Wallet address</label>
          <input
            ref={inputRef}
            id="wallet-address"
            value={address}
            onChange={(event) => {
              setAddress(event.target.value);
              if (error) setError("");
            }}
            spellCheck={false}
            autoComplete="off"
            autoCapitalize="none"
            placeholder="0x… your wallet address"
            aria-describedby={`wallet-help${error ? " wallet-error" : ""}`}
            aria-invalid={Boolean(error)}
            disabled={status === "loading"}
          />
          <button type="submit" disabled={status === "loading" || newAddressBlocked}>
            {status === "loading" ? "Reading venues…" : "Read my trading"}
          </button>
        </div>
        <details className="report-lighter-access" open={lighterTokenNeeded} onToggle={(event) => setLighterTokenNeeded(event.currentTarget.open)}>
          <summary>
            <span><i aria-hidden="true" /> Add Lighter history</span>
            <small>Read-only token</small>
          </summary>
          <div className="report-lighter-access-body">
            <div>
              <label htmlFor="lighter-token">Lighter read-only token</label>
              <p>Needed only when this wallet trades on Lighter. StayFlat uses it once and never saves it.</p>
            </div>
            <div className="report-token-row">
              <input
                ref={lighterTokenRef}
                id="lighter-token"
                type={lighterTokenVisible ? "text" : "password"}
                value={lighterToken}
                onChange={(event) => {
                  setLighterToken(event.target.value);
                  if (error) setError("");
                }}
                placeholder="ro:…"
                spellCheck={false}
                autoComplete="off"
                aria-describedby="lighter-token-help"
                disabled={status === "loading"}
              />
              <button type="button" onClick={() => setLighterTokenVisible((visible) => !visible)} aria-label={`${lighterTokenVisible ? "Hide" : "Show"} Lighter token`}>
                {lighterTokenVisible ? "Hide" : "Show"}
              </button>
            </div>
            <p id="lighter-token-help" className="report-token-help">
              Generate it on <a href="https://app.lighter.xyz/apikeys" target="_blank" rel="noreferrer">Lighter <span aria-hidden="true">↗</span></a>. Read-only tokens cannot trade or withdraw.
            </p>
          </div>
        </details>
      </form>
      <p className="sr-only" aria-live="polite">{announcement}</p>
      {status === "loading" && <ReportLoading onCancel={() => requestRef.current?.abort()} />}
      {error && <p ref={errorRef} tabIndex={-1} className="report-error" id="wallet-error" role="alert">{error}</p>}
      <p className="report-fineprint" id="wallet-help">
        Reports are free with unlimited wallets. StayFlat reads public venue data and can&apos;t touch your funds.
      </p>
      <div className="report-options">
        {access.blocked && (
          <p className="report-limit-message">
            Report generation is blocked for this account. Contact support if you think this is a mistake.
          </p>
        )}
        <p>
          Don&apos;t use Hyperliquid? <Link href="/request-exchange">Request another exchange.</Link>
        </p>
      </div>
      {history.length > 0 && (
        <section className="report-history-inline" aria-labelledby="past-reports-title">
          {history.length >= 2 ? (
            <div className="report-portfolio-builder">
              <p className="report-eyebrow">Portfolio report</p>
              <h2>Read your wallets as one book.</h2>
              <p>Select at least two saved wallets. StayFlat rebuilds their trades together; this does not use another wallet slot.</p>
              <div className="report-portfolio-wallets">
                {history.map((item) => {
                  const checked = selectedAddresses.includes(item.address);
                  return <label key={item.address}><input type="checkbox" checked={checked} onChange={() => setSelectedAddresses((current) => checked ? current.filter((address) => address !== item.address) : [...current, item.address])} /><span>{item.address.slice(0, 8)}…{item.address.slice(-6)}</span></label>;
                })}
              </div>
              {lighterWallets.map((wallet) => <label className="report-portfolio-token" key={wallet}><span>Lighter key for {wallet.slice(0, 8)}…{wallet.slice(-6)}</span><input type="password" value={portfolioTokens[wallet] ?? ""} onChange={(event) => setPortfolioTokens((current) => ({ ...current, [wallet]: event.target.value }))} placeholder="ro:…" autoComplete="off" /></label>)}
              <div className="report-portfolio-actions">
                <button type="button" onClick={generatePortfolio} disabled={selectedAddresses.length < 2 || status === "loading" || access.blocked}>{status === "loading" ? "Building portfolio…" : `Build portfolio · ${selectedAddresses.length} wallets`}</button>
                {savedPortfolio ? <button type="button" className="report-link-button" onClick={() => { setReport({ address: savedPortfolio.addresses[0], addresses: savedPortfolio.addresses, report: savedPortfolio.report, access }); router.replace("/report?portfolio=1"); }}>View saved portfolio</button> : null}
              </div>
            </div>
          ) : null}
          <div>
            <p className="report-eyebrow">Wallet history</p>
            <h2 id="past-reports-title">Your past reports</h2>
          </div>
          <div className="report-history-inline-list">
            {history.map((item) => (
              <Link href={`/report?address=${encodeURIComponent(item.address)}`} key={item.address}>
                <span>{item.address.slice(0, 8)}…{item.address.slice(-6)}</span>
                <small>
                  {historySummary(item)}
                </small>
                <strong>View report <span aria-hidden="true">→</span></strong>
              </Link>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}

function ReportLoading({ onCancel }: { onCancel: () => void }) {
  const messages = ["Reading the chain…", "Rebuilding your trades…", "Scoring the patterns…"];
  const [messageIndex, setMessageIndex] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(
      () => setMessageIndex((index) => (index + 1) % messages.length),
      1400,
    );
    return () => window.clearInterval(timer);
  }, [messages.length]);
  return (
    <section className="report-loading" aria-live="polite" aria-busy="true">
      <div className="report-pulse" aria-hidden="true"><FlatlineMark variant="wide" /></div>
      <div><p>{messages[messageIndex]}</p><small>This usually takes less than 30 seconds.</small></div>
      <button className="report-cancel" type="button" onClick={onCancel}>Cancel</button>
    </section>
  );
}

function ReportResult({
  report,
  onReset,
  onRefresh,
  onCancel,
  refreshing,
  error,
  readyKey,
  blocked,
}: {
  report: ReportResponse;
  onReset: () => void;
  onRefresh: () => void;
  onCancel: () => void;
  refreshing: boolean;
  error: string;
  readyKey: number;
  blocked: boolean;
}) {
  const hasCombined = report.report.activeVenues.length >= 2;
  const isPortfolio = Boolean(report.addresses && report.addresses.length > 1);
  const initialVenue: "combined" | VenueName = hasCombined ? "combined" : (report.report.activeVenues[0] ?? "combined");
  const [selectedVenue, setSelectedVenue] = useState<"combined" | VenueName>(initialVenue);
  const visibleVenue = selectedVenue === "combined" && !hasCombined ? initialVenue : selectedVenue;
  const venueSnapshot = visibleVenue === "combined" ? null : report.report[visibleVenue];
  const metrics = visibleVenue === "combined" ? report.report.combined : (venueSnapshot?.metrics ?? report.report.combined);
  const venueLabel = visibleVenue === "combined" ? (isPortfolio ? "Portfolio" : "Combined") : visibleVenue === "hyperliquid" ? "Hyperliquid" : visibleVenue === "arcus" ? "Arcus" : "Lighter";
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (readyKey > 0) headingRef.current?.focus();
  }, [readyKey]);
  if (metrics.empty)
    return (
      <section className="report-empty">
        <p className="report-eyebrow">No fills found</p>
        <h1>
          We couldn&apos;t find active perpetual fills for that address.
        </h1>
        <p>
          Check the address or try the wallet that actually trades perps. Only
          venues where this address has perp access and trading activity appear in the report.
        </p>
        <button className="report-link-button" onClick={onReset}>
          Try another address
        </button>
      </section>
    );
  const findings: { figure: string; label: string; copy: string }[] = [];
  if (metrics.revengeRatio != null)
    findings.push({
      figure: `${metrics.revengeRatio.toFixed(1)}×`,
      label: "Size after a loss",
      copy:
        metrics.revengeRatio >= 1.15
          ? "The next fill after a realized loss was typically larger than your median fill."
          : metrics.revengeRatio <= 0.9
            ? "The next fill after a realized loss was typically smaller than your median fill."
            : "Your next-fill size stayed close to your median after realized losses.",
    });
  if (metrics.medianCooldown != null)
    findings.push({
      figure: minutes(metrics.medianCooldown),
      label: "Cool-down after a loss",
      copy: "Median time from a realized losing fill to the next fill.",
    });
  if (metrics.dangerBand)
    findings.push({
      figure: `${hour(metrics.dangerBand.start)}–${hour(metrics.dangerBand.end)}`,
      label: "Worst entry window",
      copy: `Trades opened in this three-hour window produced your lowest total net P&L after closing, shown in ${Intl.DateTimeFormat().resolvedOptions().timeZone}. Fees are included.`,
    });
  if (metrics.profitBand)
    findings.push({
      figure: `${hour(metrics.profitBand.start)}–${hour(metrics.profitBand.end)}`,
      label: "Best entry window",
      copy: `Trades opened in this three-hour window produced your highest total net P&L after closing, shown in ${Intl.DateTimeFormat().resolvedOptions().timeZone}. Fees are included.`,
    });
  const entry = metrics.entryType;
  const moreFindings: { figure: string; label: string; copy: string }[] = [];
  if (metrics.avgWin > 0 && metrics.avgLoss > 0)
    moreFindings.push({
      figure: `${(metrics.avgLoss / metrics.avgWin).toFixed(1)}×`,
      label: "Losses vs wins",
      copy: `Average loss ${money(-metrics.avgLoss)}. Average win ${money(metrics.avgWin)}.`,
    });
  if (metrics.longCount > 0 && metrics.shortCount > 0 && metrics.longPnl !== metrics.shortPnl)
    moreFindings.push({
      figure: metrics.longPnl < metrics.shortPnl ? "Shorts" : "Longs",
      label: "Long vs short",
      copy: `Shorts netted ${money(metrics.shortPnl)}. Longs netted ${money(metrics.longPnl)}.`,
    });
  if (metrics.busyDayCount > 0)
    moreFindings.push({
      figure: compactMoney(metrics.busyDayPnl),
      label: "Busiest-day result",
      copy: `Net P&L on ${metrics.busyDayDate ? calendarDate(metrics.busyDayDate) : "your busiest day"}, when you completed ${metrics.busyDayCount} ${metrics.busyDayCount === 1 ? "trade" : "trades"}. Fees are included.`,
    });
  if (metrics.feeMultiple != null && metrics.feeMultiple >= 0.5)
    moreFindings.push({
      figure: `${metrics.feeMultiple.toFixed(1)}×`,
      label: "Fee weight",
      copy: `${money(metrics.fees)} paid in fees, ${metrics.feeMultiple.toFixed(1)}× the size of your net result.`,
    });
  if (metrics.lossShare != null && metrics.lossCount >= 6)
    moreFindings.push({
      figure: `${Math.round(metrics.lossShare * 100)}%`,
      label: "Loss concentration",
      copy: `Your five worst realized losses make up ${Math.round(metrics.lossShare * 100)}% of all realized losses.`,
    });
  const mainFinding = findings[0] ?? moreFindings[0];
  const supportingFindings = [...findings.slice(mainFinding === findings[0] ? 1 : 0), ...moreFindings.filter((finding) => finding !== mainFinding)];
  const positionCount = metrics.positionCount ?? 0;
  const confidence = metrics.confidence ?? (positionCount >= 30 ? "high" : positionCount >= 10 ? "medium" : "low");
  const generatedAt = metrics.generatedAt ? date(metrics.generatedAt) : "Saved before freshness tracking";
  return (
    <section className="report-results">
      <nav className="report-venue-rail" aria-label="Report venue">
        {hasCombined ? <button type="button" data-venue="combined" aria-current={visibleVenue === "combined" ? "page" : undefined} onClick={() => setSelectedVenue("combined")}><span />Combined</button> : null}
        {report.report.hyperliquid.active ? <button type="button" data-venue="hyperliquid" aria-current={visibleVenue === "hyperliquid" ? "page" : undefined} onClick={() => setSelectedVenue("hyperliquid")}><span />Hyperliquid</button> : null}
        {report.report.arcus.active ? <button type="button" data-venue="arcus" aria-current={visibleVenue === "arcus" ? "page" : undefined} onClick={() => setSelectedVenue("arcus")}><span />Arcus</button> : null}
        {report.report.lighter?.active ? <button type="button" data-venue="lighter" aria-current={visibleVenue === "lighter" ? "page" : undefined} onClick={() => setSelectedVenue("lighter")}><span />Lighter</button> : null}
      </nav>
      <header className="report-result-intro">
        <p className="report-eyebrow">{venueLabel} read</p>
        <h1 ref={headingRef} tabIndex={-1}>The pattern to look at first.</h1>
        <p>One main observation, followed by the record behind it. These are measured patterns, not proof of intent.</p>
      </header>
      <article className="report-card">
        <header className="report-card-top">
          <span>
            <FlatlineMark />
            {venueLabel} read
          </span>
          <small>
            {isPortfolio ? `${report.addresses!.length} wallets` : `${report.address.slice(0, 6)}…${report.address.slice(-4)}`}
            <br />
            {date(metrics.dateFrom)} – {date(metrics.dateTo)} ·{" "}
            {metrics.fillCount} fills
          </small>
        </header>
        {mainFinding ? (
          <div className="report-finding report-main-finding">
            <strong>{mainFinding.figure}</strong>
            <div>
              <span>{mainFinding.label}</span>
              <p>{mainFinding.copy}</p>
            </div>
          </div>
        ) : (
          <div className="report-finding">
            <strong>—</strong>
            <div>
              <span>Not enough closed activity</span>
              <p>
                More realized fills are needed before these observations become
                useful.
              </p>
            </div>
          </div>
        )}
        <div className="report-stats report-primary-stats">
          <Stat label="Perps PnL (all-time)" value={money(metrics.perpPnl)} />
          <Stat
            label="Win rate"
            value={
              metrics.winRate == null
                ? "—"
                : `${Math.round(metrics.winRate * 100)}%`
            }
          />
          <Stat
            label="Biggest realized loss"
            value={money(metrics.biggestLoss)}
          />
        </div>
        <div className="report-stats report-supporting-stats">
          <Stat label="Completed positions" value={positionCount ? String(positionCount) : "—"} />
          <Stat label="Fills read" value={String(metrics.fillCount)} />
          <Stat label="Fees paid" value={money(metrics.fees)} />
          <Stat label="Markets" value={String(metrics.coinCount)} />
        </div>
        <div className="report-coverage">
          <span><b>{confidence} confidence</b> · based on {positionCount || "an unknown number of"} completed positions{isPortfolio ? ` across ${report.addresses!.length} wallets` : visibleVenue === "combined" ? ` across ${report.report.activeVenues.length} venues` : ""}</span>
          <span>Checked {generatedAt}{metrics.historyLimited ? " · history limit reached" : ""}</span>
        </div>
        <footer className="report-card-foot">
          <span>Master the trader, not the trade.</span>
          <span>stayflat.xyz</span>
        </footer>
      </article>
      <ReportVisuals metrics={metrics} onRefresh={onRefresh} />
      <TradingRhythm metrics={metrics} />
      {supportingFindings.length > 0 && (
        <article className="report-entry-card report-observations">
          <header>
            <span>More observations</span>
            <small>from your own trades</small>
          </header>
          {supportingFindings.map((finding) => (
            <div className="report-finding" key={finding.label}>
              <strong>{finding.figure}</strong>
              <div><span>{finding.label}</span><p>{finding.copy}</p></div>
            </div>
          ))}
        </article>
      )}
      {entry && (
        <article className="report-entry-card">
          <header>
            <span>How positions were opened</span>
            <small>
              {entry.marketFills} market fills · {entry.limitFills} limit fills
            </small>
          </header>
          <div className="report-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Entry</th>
                  <th>Positions</th>
                  <th>Realized P/L</th>
                  <th>Fees</th>
                  <th>Win rate</th>
                </tr>
              </thead>
              <tbody>
                <EntryRow
                  name="Market orders"
                  note="taker · usually higher fees"
                  trades={entry.marketTrades}
                  pnl={entry.marketPnl}
                  wins={entry.marketWins}
                  losses={entry.marketLosses}
                  fees={entry.marketFees}
                />
                <EntryRow
                  name="Limit orders"
                  note="maker · usually lower fees"
                  trades={entry.limitTrades}
                  pnl={entry.limitPnl}
                  wins={entry.limitWins}
                  losses={entry.limitLosses}
                  fees={entry.limitFees}
                />
              </tbody>
            </table>
          </div>
          <p>
            Grouped by how each position was opened, not how it was closed. This
            is an observation from public fills, not proof of intent or a
            recommendation.
          </p>
        </article>
      )}
      <div className="report-cta">
        <span>Ready to schedule the call included with your report?</span>
        <a href="https://t.me/VivanLiveTeam" target="_blank" rel="noreferrer">Message Vivan on Telegram</a>
      </div>
      <div className="report-actions">
        <a href={isPortfolio ? "/api/report/portfolio/pdf" : `/api/report/pdf?address=${encodeURIComponent(report.address)}`} download>Download PDF</a>
        <Link href="/journal">Open my trading journal</Link>
        <button className="report-link-button" type="button" onClick={refreshing ? onCancel : onRefresh} disabled={blocked}>
          {refreshing ? "Cancel refresh" : "Refresh this report"}
        </button>
        <button className="report-link-button" onClick={onReset}>
          Check another address
        </button>
      </div>
      {refreshing ? <ReportLoading onCancel={onCancel} /> : null}
      {error ? <p className="report-error" role="alert">{error}</p> : null}
    </section>
  );
}

type FilledReportMetrics = Extract<ReportMetrics, { empty: false }>;

function ReportVisuals({ metrics, onRefresh }: { metrics: FilledReportMetrics; onRefresh: () => void }) {
  const daily = metrics.dailyPnl ?? [];
  if (!daily.length) return (
    <article className="report-entry-card report-visual-empty">
      <header><span>Performance view</span><small>Available after a refresh</small></header>
      <p>This saved report was created before graphical history was added. <button type="button" onClick={onRefresh}>Refresh this report</button> to add it.</p>
    </article>
  );
  return <div className="report-visual-grid report-visual-grid-single">
    <ReportCalendar key={`${daily.at(0)?.date}-${daily.at(-1)?.date}`} days={daily} />
  </div>;
}

function ReportCalendar({ days }: { days: NonNullable<FilledReportMetrics["dailyPnl"]> }) {
  const monthKeys = days.map((day) => day.date.slice(0, 7));
  const earliestMonthKey = monthKeys.reduce((earliest, key) => key < earliest ? key : earliest);
  const latestMonthKey = monthKeys.reduce((latest, key) => key > latest ? key : latest);
  const latest = new Date(`${latestMonthKey}-01T00:00:00Z`);
  const [month, setMonth] = useState(() => latest);
  const lookup = new Map(days.map((day) => [day.date, day]));
  const year = month.getUTCFullYear();
  const monthIndex = month.getUTCMonth();
  const monthKey = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
  const atEarliestMonth = monthKey <= earliestMonthKey;
  const atLatestMonth = monthKey >= latestMonthKey;
  const offset = (month.getUTCDay() + 6) % 7;
  const dayCount = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const cells = Array.from({ length: Math.ceil((offset + dayCount) / 7) * 7 }, (_, index) => {
    const day = index - offset + 1;
    if (day < 1 || day > dayCount) return null;
    const key = `${monthKey}-${String(day).padStart(2, "0")}`;
    return { day, key, result: lookup.get(key) };
  });
  const move = (amount: number) => setMonth((current) => new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth() + amount, 1)));
  const monthName = month.toLocaleDateString(undefined, { month: "long", year: "numeric", timeZone: "UTC" });
  const monthTotal = days.reduce((total, day) => day.date.startsWith(monthKey) ? total + day.pnl : total, 0);
  const monthTotalLabel = `${monthTotal > 0 ? "+" : ""}${money(monthTotal)}`;
  return <article className="report-entry-card report-visual-card report-calendar-card">
    <header><span>Daily net realized P/L</span><div><button type="button" aria-label="Previous month" onClick={() => move(-1)} disabled={atEarliestMonth}>←</button><small>{monthName} <strong className={monthTotal < 0 ? "negative" : "positive"}>({monthTotalLabel})</strong></small><button type="button" aria-label="Next month" onClick={() => move(1)} disabled={atLatestMonth}>→</button></div></header>
    <p className="report-calendar-note">Closed-position P/L after recorded fees.</p>
    <div className="report-calendar" role="grid" aria-label={`Daily net realized profit and loss after recorded fees for ${monthName}`}>
      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((weekday) => <span className="report-calendar-weekday" role="columnheader" key={weekday}>{weekday}</span>)}
      {cells.map((cell, index) => cell ? <div role="gridcell" className={`report-calendar-day${cell.result ? cell.result.pnl >= 0 ? " positive" : " negative" : ""}`} aria-label={`${monthName} ${cell.day}${cell.result ? `, ${cell.result.positions} completed positions, ${money(cell.result.pnl)}` : ", no completed positions"}`} key={cell.key}><span>{cell.day}</span>{cell.result ? <><strong title={money(cell.result.pnl)}>{calendarMoney(cell.result.pnl)}</strong><small>{cell.result.positions} pos.</small></> : null}</div> : <span className="report-calendar-day empty" aria-hidden="true" key={`empty-${index}`} />)}
    </div>
  </article>;
}

function TradingRhythm({ metrics }: { metrics: FilledReportMetrics }) {
  const duration = metrics.avgTradeDurationMinutes;
  const durationLabel = duration == null
    ? "—"
    : duration < 60
      ? `${Math.round(duration)} min`
      : duration < 1_440
        ? `${(duration / 60).toFixed(1)} hr`
        : `${(duration / 1_440).toFixed(1)} days`;
  const weekdayNet = (value: FilledReportMetrics["bestCloseNetWeekday"]) =>
    value ? `${value.day} (${value.net >= 0 ? "+" : ""}${value.net})` : "—";
  const items = [
    ["Best net weekday — closed", weekdayNet(metrics.bestCloseNetWeekday), "Highest wins minus losses, grouped by closing day"],
    ["Worst net weekday — closed", weekdayNet(metrics.worstCloseNetWeekday), "Lowest wins minus losses, grouped by closing day"],
    ["Best net weekday — opened", weekdayNet(metrics.bestOpenNetWeekday), "Highest wins minus losses, grouped by opening day"],
    ["Worst net weekday — opened", weekdayNet(metrics.worstOpenNetWeekday), "Lowest wins minus losses, grouped by opening day"],
    ["Longest win streak", metrics.longestWinStreak == null ? "—" : `${metrics.longestWinStreak}${metrics.longestWinStreakMonth ? ` (${metrics.longestWinStreakMonth})` : ""}`, "Consecutive profitable trading days"],
    ["Longest losing streak", metrics.longestLossStreak == null ? "—" : `${metrics.longestLossStreak}${metrics.longestLossStreakMonth ? ` (${metrics.longestLossStreakMonth})` : ""}`, "Consecutive losing trading days"],
    ["Average trade duration", durationLabel, "From position opening to full close"],
    ["Total perps volume", metrics.totalPerpsVolume == null ? "—" : compactMoney(metrics.totalPerpsVolume), "Total traded notional across all fills"],
  ];
  return <article className="report-entry-card report-rhythm">
    <header><span>Trading rhythm</span><small>Timing, streaks, and activity</small></header>
    <div>{items.map(([label, value, note]) => <section key={label}><span>{label}</span><strong>{value}</strong><small>{note}</small></section>)}</div>
  </article>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="report-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
function EntryRow({
  name,
  note,
  trades,
  pnl,
  wins,
  losses,
  fees,
}: {
  name: string;
  note: string;
  trades: number;
  pnl: number;
  wins: number;
  losses: number;
  fees: number;
}) {
  const total = wins + losses;
  return (
    <tr>
      <td>
        <strong>{name}</strong>
        <small>{note}</small>
      </td>
      <td>{trades}</td>
      <td className={pnl < 0 ? "negative" : "positive"}>{money(pnl)}</td>
      <td>{money(fees)}</td>
      <td>{total ? `${Math.round((wins / total) * 100)}%` : "—"}</td>
    </tr>
  );
}
