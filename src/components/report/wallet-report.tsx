"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { FlatlineMark } from "@/components/brand/flatline-mark";
import type { ReportMetrics } from "@/lib/hyperliquid/metrics";
import type { MultiVenueMetrics, VenueName } from "@/lib/report/multi-venue";

type Access = { used: number; limit: number; unlimited?: boolean; blocked?: boolean };
type WalletReportItem = { address: string; report: MultiVenueMetrics };
type ReportResponse = { address: string; addresses?: string[]; report: MultiVenueMetrics; walletReports?: WalletReportItem[]; access: Access };
type HistoryItem = { address: string; metrics?: ReportMetrics; report?: MultiVenueMetrics; createdAt: number; updatedAt?: number };
type SavedPortfolio = { addresses: string[]; report: MultiVenueMetrics; createdAt: number; updatedAt: number };
type WalletDraft = { id: number; address: string; includeLighter: boolean; lighterToken: string; tokenVisible: boolean };
const walletPattern = /^0x[0-9a-fA-F]{40}$/;
const newWallet = (id: number, address = "", includeLighter = false): WalletDraft => ({ id, address, includeLighter, lighterToken: "", tokenVisible: false });
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

export function WalletReport({ initialAccess, initialReport = null, initialAddress = "", initialHistory = [], savedPortfolio = null, openSavedPortfolio = false, initialHasPaid = false }: { initialAccess: Access; initialReport?: ReportResponse | null; initialAddress?: string; initialHistory?: HistoryItem[]; savedPortfolio?: SavedPortfolio | null; openSavedPortfolio?: boolean; initialHasPaid?: boolean }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const lighterTokenRef = useRef<HTMLInputElement>(null);
  const nextWalletId = useRef(2);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const [wallets, setWallets] = useState<WalletDraft[]>(() => [newWallet(1, initialAddress, Boolean(initialReport?.report.activeVenues.includes("lighter")))]);
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
  const [availablePortfolio, setAvailablePortfolio] = useState(savedPortfolio);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const newAddressBlocked = Boolean(access.blocked);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);
  useEffect(() => () => requestRef.current?.abort(), []);

  async function generate(drafts: WalletDraft[]) {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setStatus("loading");
    setAnnouncement("Reading this wallet. This usually takes less than 30 seconds.");
    setError("");
    try {
      const response = await fetch("/api/report/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallets: drafts.map(({ address, includeLighter, lighterToken }) => ({ address: address.trim(), includeLighter, ...(includeLighter ? { lighterToken: lighterToken.trim() } : {}) })),
          timezoneOffsetMinutes: new Date().getTimezoneOffset(),
        }),
        signal: controller.signal,
      });
      const data = await response.json().catch(() => null) as ReportResponse & { error?: string; code?: string; address?: string } | null;
      if (!response.ok) {
        if (data?.code === "LIGHTER_TOKEN_REQUIRED" || data?.code === "LIGHTER_TOKEN_INVALID") {
          window.setTimeout(() => lighterTokenRef.current?.focus(), 0);
        }
        throw new Error(data?.error || "We couldn't generate the report. Try again.");
      }
      if (!data) throw new Error("We couldn't generate the report. Try again.");
      setReport(data);
      setAccess(data.access);
      setHistory((current) => {
        const generated = (data.walletReports ?? [{ address: data.address, report: data.report }])
          .map((item) => ({ ...item, createdAt: Date.now(), updatedAt: Date.now() }));
        const generatedAddresses = new Set(generated.map((item) => item.address));
        return [...generated, ...current.filter((item) => !generatedAddresses.has(item.address))];
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
    if (wallets.some((wallet) => !walletPattern.test(wallet.address.trim()))) {
      setError("Every wallet should start with 0x and contain 42 characters.");
      return;
    }
    const normalized = wallets.map((wallet) => wallet.address.trim().toLowerCase());
    if (new Set(normalized).size !== normalized.length) {
      setError("Each wallet can appear only once.");
      return;
    }
    if (newAddressBlocked) {
      setError("Report generation is blocked for this account. Contact support if you think this is a mistake.");
      return;
    }
    if (wallets.some((wallet) => wallet.includeLighter && !wallet.lighterToken.trim())) {
      setError("Add a Lighter read-only key for every wallet where Lighter is enabled.");
      window.setTimeout(() => lighterTokenRef.current?.focus(), 0);
      return;
    }
    await generate(wallets);
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
        body: JSON.stringify({
          addresses: selectedAddresses,
          lighterTokens: portfolioTokens,
          venuesByAddress: Object.fromEntries(selectedAddresses.map((wallet) => {
            const savedVenues = history.find((item) => item.address === wallet)?.report?.activeVenues;
            return [wallet, savedVenues?.length ? savedVenues : ["hyperliquid"]];
          })),
          timezoneOffsetMinutes: new Date().getTimezoneOffset(),
        }),
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

  async function deleteSavedReport(target: { address?: string; portfolio?: true }) {
    setDeleting(true);
    setError("");
    try {
      const response = await fetch("/api/report/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(target),
      });
      const data = await response.json().catch(() => null) as { walletDeleted?: boolean; portfolioDeleted?: boolean; error?: string } | null;
      if (!response.ok) throw new Error(data?.error || "We couldn't delete this report.");
      if (target.address && data?.walletDeleted) {
        const normalized = target.address.toLowerCase();
        setHistory((current) => current.filter((item) => item.address !== normalized));
        setSelectedAddresses((current) => current.filter((address) => address !== normalized));
        setAccess((current) => ({ ...current, used: Math.max(0, current.used - 1) }));
      }
      if (data?.portfolioDeleted) setAvailablePortfolio(null);
      const openTargetDeleted = target.portfolio
        ? Boolean(report?.addresses && report.addresses.length > 1)
        : Boolean(target.address && (report?.address === target.address || report?.walletReports?.some((item) => item.address === target.address)));
      setPendingDelete(null);
      if (openTargetDeleted) reset();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We couldn't delete this report.");
    } finally {
      setDeleting(false);
    }
  }

  function reset() {
    requestRef.current?.abort();
    setReport(null);
    setWallets([newWallet(nextWalletId.current++)]);
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
      onRefresh={() => report.walletReports
        ? generate(report.walletReports.map((item, index) => {
            const existing = wallets.find((wallet) => wallet.address.trim().toLowerCase() === item.address);
            return existing ?? newWallet(nextWalletId.current + index, item.address, item.report.activeVenues.includes("lighter"));
          }))
        : report.addresses && report.addresses.length > 1 ? generatePortfolio() : generate([wallets[0]])}
      onCancel={() => requestRef.current?.abort()}
      refreshing={status === "loading"}
      error={error}
      readyKey={reportReadyKey}
      blocked={Boolean(access.blocked)}
      onDelete={deleteSavedReport}
      deleting={deleting}
      hasPaid={initialHasPaid}
    />
  </>;

  return (
    <section className="report-panel" aria-labelledby="report-title">
      <p className="report-eyebrow">Your report</p>
      <h1 id="report-title">
        Up to ten wallets. <em>One complete trading read.</em>
      </h1>
      <p className="report-sub">
        Hyperliquid and Arcus are scanned automatically. Add Lighter only for wallets where you have a read-only key.
      </p>
      <div className="report-allowance" aria-label="Wallet report usage">
        <strong>{access.used}</strong>
        <span>saved wallets · unlimited</span>
      </div>
      <form className="report-wallet-form" onSubmit={submit} noValidate>
        <div className="report-wallet-list-heading">
          <div><strong>Wallets to scan</strong><span>Hyperliquid + Arcus included</span></div>
          <b>{wallets.length} of 10 wallets</b>
        </div>
        <div className="report-wallet-list">
          {wallets.map((wallet, index) => (
            <section className="report-wallet-ticket" key={wallet.id} aria-labelledby={`wallet-${wallet.id}-label`}>
              <header>
                <span id={`wallet-${wallet.id}-label`}>Wallet {index + 1}</span>
                <small>Hyperliquid + Arcus</small>
                {wallets.length > 1 ? <button type="button" onClick={() => setWallets((current) => current.filter((item) => item.id !== wallet.id))} disabled={status === "loading"} aria-label={`Remove wallet ${index + 1}`}>Remove</button> : null}
              </header>
              <label className="sr-only" htmlFor={`wallet-address-${wallet.id}`}>Wallet {index + 1} address</label>
              <input
                ref={index === 0 ? inputRef : undefined}
                id={`wallet-address-${wallet.id}`}
                value={wallet.address}
                onChange={(event) => {
                  const value = event.target.value;
                  setWallets((current) => current.map((item) => item.id === wallet.id ? { ...item, address: value } : item));
                  if (error) setError("");
                }}
                spellCheck={false}
                autoComplete="off"
                autoCapitalize="none"
                placeholder="0x… wallet address"
                aria-describedby={`wallet-help${error ? " wallet-error" : ""}`}
                aria-invalid={Boolean(error)}
                disabled={status === "loading"}
              />
              <label className="report-lighter-toggle">
                <input type="checkbox" checked={wallet.includeLighter} onChange={() => setWallets((current) => current.map((item) => item.id === wallet.id ? { ...item, includeLighter: !item.includeLighter } : item))} disabled={status === "loading"} />
                <span><strong>Also scan Lighter</strong><small>Requires this wallet&apos;s read-only key</small></span>
              </label>
              {wallet.includeLighter ? <div className="report-ticket-token">
                <label htmlFor={`lighter-token-${wallet.id}`}>Lighter read-only key</label>
                <div className="report-token-row">
                  <input
                    ref={wallets.find((item) => item.includeLighter)?.id === wallet.id ? lighterTokenRef : undefined}
                    id={`lighter-token-${wallet.id}`}
                    type={wallet.tokenVisible ? "text" : "password"}
                    value={wallet.lighterToken}
                    onChange={(event) => {
                      const value = event.target.value;
                      setWallets((current) => current.map((item) => item.id === wallet.id ? { ...item, lighterToken: value } : item));
                      if (error) setError("");
                    }}
                    placeholder="ro:…"
                    spellCheck={false}
                    autoComplete="off"
                    required
                    disabled={status === "loading"}
                  />
                  <button type="button" onClick={() => setWallets((current) => current.map((item) => item.id === wallet.id ? { ...item, tokenVisible: !item.tokenVisible } : item))} aria-label={`${wallet.tokenVisible ? "Hide" : "Show"} Lighter key for wallet ${index + 1}`}>
                    {wallet.tokenVisible ? "Hide" : "Show"}
                  </button>
                </div>
                <p>Used once and never saved. <a href="https://app.lighter.xyz/apikeys" target="_blank" rel="noreferrer">Generate a key <span aria-hidden="true">↗</span></a></p>
              </div> : null}
            </section>
          ))}
        </div>
        <div className="report-wallet-form-actions">
          <button type="button" className="report-add-wallet" onClick={() => setWallets((current) => [...current, newWallet(nextWalletId.current++)])} disabled={wallets.length >= 10 || status === "loading"}>+ Add another wallet</button>
          <button type="submit" disabled={status === "loading" || newAddressBlocked}>
            {status === "loading" ? `Reading ${wallets.length} ${wallets.length === 1 ? "wallet" : "wallets"}…` : wallets.length === 1 ? "Read this wallet" : "Build combined report"}
          </button>
        </div>
        <p className="report-wallet-auto-note"><i aria-hidden="true" /> Every wallet is checked on both Hyperliquid and Arcus.</p>
        <div className="report-options">
          <p><Link href="/request-exchange">Request another exchange →</Link></p>
        </div>
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
      </div>
      {history.length > 0 && (
        <section className="report-history-inline" aria-labelledby="past-reports-title">
          {history.length >= 2 ? (
            <div className="report-portfolio-builder">
              <p className="report-eyebrow">Portfolio report</p>
              <h2>Read your wallets as one book.</h2>
              <p>Select 2 to 10 saved wallets. StayFlat rebuilds their trades together.</p>
              <div className="report-portfolio-wallets">
                {history.map((item) => {
                  const checked = selectedAddresses.includes(item.address);
                  return <label key={item.address}><input type="checkbox" checked={checked} disabled={!checked && selectedAddresses.length >= 10} onChange={() => setSelectedAddresses((current) => checked ? current.filter((address) => address !== item.address) : [...current, item.address])} /><span>{item.address.slice(0, 8)}…{item.address.slice(-6)}</span></label>;
                })}
              </div>
              {lighterWallets.map((wallet) => <label className="report-portfolio-token" key={wallet}><span>Lighter key for {wallet.slice(0, 8)}…{wallet.slice(-6)}</span><input type="password" value={portfolioTokens[wallet] ?? ""} onChange={(event) => setPortfolioTokens((current) => ({ ...current, [wallet]: event.target.value }))} placeholder="ro:…" autoComplete="off" /></label>)}
              <div className="report-portfolio-actions">
                <button type="button" onClick={generatePortfolio} disabled={selectedAddresses.length < 2 || selectedAddresses.length > 10 || status === "loading" || access.blocked}>{status === "loading" ? "Building portfolio…" : `Build portfolio · ${selectedAddresses.length} wallets`}</button>
                {availablePortfolio ? <button type="button" className="report-link-button" onClick={() => { setReport({ address: availablePortfolio.addresses[0], addresses: availablePortfolio.addresses, report: availablePortfolio.report, access }); router.replace("/report?portfolio=1"); }}>View saved portfolio</button> : null}
              </div>
            </div>
          ) : null}
          <div>
            <p className="report-eyebrow">Wallet history</p>
            <h2 id="past-reports-title">Your past reports</h2>
          </div>
          <div className="report-history-inline-list">
            {history.map((item) => (
              <div className="report-history-row" key={item.address}>
                <Link href={`/report?address=${encodeURIComponent(item.address)}`}>
                  <span>{item.address.slice(0, 8)}…{item.address.slice(-6)}</span>
                  <small>{historySummary(item)}</small>
                  <strong>View report <span aria-hidden="true">→</span></strong>
                </Link>
                {pendingDelete === item.address ? <div className="report-delete-confirm"><span>Delete this saved report?</span><button type="button" onClick={() => deleteSavedReport({ address: item.address })} disabled={deleting}>{deleting ? "Deleting…" : "Delete permanently"}</button><button type="button" onClick={() => setPendingDelete(null)} disabled={deleting}>Cancel</button></div> : <button className="report-history-delete" type="button" onClick={() => setPendingDelete(item.address)}>Delete</button>}
              </div>
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
  onDelete,
  deleting,
  hasPaid,
}: {
  report: ReportResponse;
  onReset: () => void;
  onRefresh: () => void;
  onCancel: () => void;
  refreshing: boolean;
  error: string;
  readyKey: number;
  blocked: boolean;
  onDelete: (target: { address?: string; portfolio?: true }) => Promise<void>;
  deleting: boolean;
  hasPaid: boolean;
}) {
  const hasWalletSwitcher = Boolean(report.walletReports && report.walletReports.length > 1);
  const [selectedWallet, setSelectedWallet] = useState<"all" | string>(report.addresses && report.addresses.length > 1 ? "all" : report.address);
  const selectedWalletReport = selectedWallet === "all" ? null : report.walletReports?.find((item) => item.address === selectedWallet);
  const currentReport = selectedWalletReport?.report ?? report.report;
  const currentAddress = selectedWalletReport?.address ?? report.address;
  const hasCombined = currentReport.activeVenues.length >= 2;
  const isPortfolio = selectedWallet === "all" && Boolean(report.addresses && report.addresses.length > 1);
  const initialVenue: "combined" | VenueName = hasCombined ? "combined" : (currentReport.activeVenues[0] ?? "combined");
  const [selectedVenue, setSelectedVenue] = useState<"combined" | VenueName>(initialVenue);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const visibleVenue = selectedVenue === "combined" && !hasCombined ? initialVenue : selectedVenue;
  const venueSnapshot = visibleVenue === "combined" ? null : currentReport[visibleVenue];
  const metrics = visibleVenue === "combined" ? currentReport.combined : (venueSnapshot?.metrics ?? currentReport.combined);
  const venueLabel = visibleVenue === "combined" ? (isPortfolio ? "Portfolio" : "Combined") : visibleVenue === "hyperliquid" ? "Hyperliquid" : visibleVenue === "arcus" ? "Arcus" : "Lighter";
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (readyKey > 0) headingRef.current?.focus();
  }, [readyKey]);
  if (metrics.empty)
    return (
      <section className="report-empty">
        <button className="report-back-button" type="button" onClick={onReset}><span aria-hidden="true">←</span> Back to reports</button>
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
        <div className="report-result-delete">
          {confirmDelete ? <div className="report-delete-confirm"><span>{isPortfolio ? "Delete this combined portfolio? Individual reports will stay saved." : "Delete this saved wallet report?"}</span><button type="button" onClick={() => onDelete(isPortfolio ? { portfolio: true } : { address: currentAddress })} disabled={deleting}>{deleting ? "Deleting…" : "Delete permanently"}</button><button type="button" onClick={() => setConfirmDelete(false)} disabled={deleting}>Cancel</button></div> : <button type="button" onClick={() => setConfirmDelete(true)}>Delete this report</button>}
        </div>
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
      <button className="report-back-button" type="button" onClick={onReset}><span aria-hidden="true">←</span> Back to reports</button>
      {hasWalletSwitcher ? <nav className="report-wallet-rail" aria-label="Report wallet">
        <button type="button" aria-current={selectedWallet === "all" ? "page" : undefined} onClick={() => { setSelectedWallet("all"); setSelectedVenue(report.report.activeVenues.length >= 2 ? "combined" : (report.report.activeVenues[0] ?? "combined")); }}>All wallets</button>
        {report.walletReports!.map((item, index) => <button type="button" key={item.address} aria-current={selectedWallet === item.address ? "page" : undefined} onClick={() => { setSelectedWallet(item.address); setSelectedVenue(item.report.activeVenues.length >= 2 ? "combined" : (item.report.activeVenues[0] ?? "combined")); }}>Wallet {index + 1} <small>{item.address.slice(0, 6)}…{item.address.slice(-4)}</small></button>)}
      </nav> : null}
      <nav className="report-venue-rail" aria-label="Report venue">
        {hasCombined ? <button type="button" data-venue="combined" aria-current={visibleVenue === "combined" ? "page" : undefined} onClick={() => setSelectedVenue("combined")}><span />Combined</button> : null}
        {currentReport.hyperliquid.active ? <button type="button" data-venue="hyperliquid" aria-current={visibleVenue === "hyperliquid" ? "page" : undefined} onClick={() => setSelectedVenue("hyperliquid")}><span />Hyperliquid</button> : null}
        {currentReport.arcus.active ? <button type="button" data-venue="arcus" aria-current={visibleVenue === "arcus" ? "page" : undefined} onClick={() => setSelectedVenue("arcus")}><span />Arcus</button> : null}
        {currentReport.lighter?.active ? <button type="button" data-venue="lighter" aria-current={visibleVenue === "lighter" ? "page" : undefined} onClick={() => setSelectedVenue("lighter")}><span />Lighter</button> : null}
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
            {isPortfolio ? `${report.addresses!.length} wallets` : `${currentAddress.slice(0, 6)}…${currentAddress.slice(-4)}`}
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
          <Stat label="Best asset" value={metrics.bestAsset ? `${metrics.bestAsset.coin} · ${money(metrics.bestAsset.pnl)}` : "—"} />
          <Stat label="Largest asset drag" value={metrics.worstAsset ? `${metrics.worstAsset.coin} · ${money(metrics.worstAsset.pnl)}` : "—"} />
        </div>
        <div className="report-coverage">
          <span><b>{confidence} confidence</b> · based on {positionCount || "an unknown number of"} completed positions{isPortfolio ? ` across ${report.addresses!.length} wallets` : visibleVenue === "combined" ? ` across ${currentReport.activeVenues.length} venues` : ""}</span>
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
        <span>{hasPaid ? "Your 30-minute call is ready to schedule." : "Want a private journal and a 30-minute trading call?"}</span>
        {hasPaid ? <a href="https://t.me/VivanLiveTeam" target="_blank" rel="noreferrer">Schedule my call</a> : <Link href="/payment">Unlock journal + call</Link>}
      </div>
      <div className="report-actions">
        <a href={isPortfolio ? "/api/report/portfolio/pdf" : `/api/report/pdf?address=${encodeURIComponent(currentAddress)}`} download>Download PDF</a>
        <Link href={hasPaid ? "/journal" : "/payment"}>{hasPaid ? "Open my trading journal" : "Unlock my trading journal"}</Link>
        <button className="report-link-button" type="button" onClick={refreshing ? onCancel : onRefresh} disabled={blocked}>
          {refreshing ? "Cancel refresh" : "Refresh this report"}
        </button>
        <button className="report-link-button" onClick={onReset}>
          Check another address
        </button>
      </div>
      <div className="report-result-delete">
        {confirmDelete ? <div className="report-delete-confirm"><span>{isPortfolio ? "Delete this combined portfolio? Individual reports will stay saved." : "Delete this saved wallet report?"}</span><button type="button" onClick={() => onDelete(isPortfolio ? { portfolio: true } : { address: currentAddress })} disabled={deleting}>{deleting ? "Deleting…" : "Delete permanently"}</button><button type="button" onClick={() => setConfirmDelete(false)} disabled={deleting}>Cancel</button></div> : <button type="button" onClick={() => setConfirmDelete(true)}>Delete this report</button>}
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
