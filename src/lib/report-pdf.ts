import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { ReportMetrics } from "@/lib/hyperliquid/metrics";
import type { MultiVenueMetrics } from "@/lib/report/multi-venue";

type FilledMetrics = Extract<ReportMetrics, { empty: false }>;
export type ReportPdfInput = { address: string; metrics: FilledMetrics; report?: MultiVenueMetrics; accountEmail?: string };

const ink = rgb(0.10, 0.14, 0.13);
const muted = rgb(0.35, 0.40, 0.38);
const teal = rgb(0.11, 0.29, 0.27);
const paper = rgb(0.97, 0.96, 0.92);
const line = rgb(0.82, 0.81, 0.76);

const money = (value: number | null | undefined) => value == null ? "-" : `${value < 0 ? "-" : ""}$${Math.abs(value).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
const date = (value: number) => new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(value);
const hour = (value: number) => `${String(value).padStart(2, "0")}:00`;
const duration = (minutes: number | null | undefined) => minutes == null ? "-" : minutes < 60 ? `${Math.round(minutes)} min` : minutes < 1440 ? `${(minutes / 60).toFixed(1)} hr` : `${(minutes / 1440).toFixed(1)} days`;
const weekday = (value: { day: string; net: number } | null | undefined) => value ? `${value.day} (${money(value.net)})` : "-";

export function reportPdfRows(metrics: FilledMetrics) {
  return [
    ["Perps P&L (all-time)", money(metrics.perpPnl)],
    ["Win rate", metrics.winRate == null ? "-" : `${Math.round(metrics.winRate * 100)}%`],
    ["Completed positions", String(metrics.positionCount ?? 0)],
    ["Fills read", String(metrics.fillCount)],
    ["Fees paid", money(metrics.fees)],
    ["Biggest realized win", money(metrics.biggestWin)],
    ["Biggest realized loss", money(metrics.biggestLoss)],
    ["Best entry window", metrics.profitBand ? `${hour(metrics.profitBand.start)}-${hour(metrics.profitBand.end)}` : "-"],
    ["Worst entry window", metrics.dangerBand ? `${hour(metrics.dangerBand.start)}-${hour(metrics.dangerBand.end)}` : "-"],
    ["Busiest-day result", `${money(metrics.busyDayPnl)}${metrics.busyDayDate ? ` (${metrics.busyDayDate})` : ""}`],
    ["Best net weekday - closed", weekday(metrics.bestCloseNetWeekday)],
    ["Worst net weekday - closed", weekday(metrics.worstCloseNetWeekday)],
    ["Best net weekday - opened", weekday(metrics.bestOpenNetWeekday)],
    ["Worst net weekday - opened", weekday(metrics.worstOpenNetWeekday)],
    ["Longest win streak", `${metrics.longestWinStreak ?? 0} days${metrics.longestWinStreakMonth ? ` (${metrics.longestWinStreakMonth})` : ""}`],
    ["Longest losing streak", `${metrics.longestLossStreak ?? 0} days${metrics.longestLossStreakMonth ? ` (${metrics.longestLossStreakMonth})` : ""}`],
    ["Average trade duration", duration(metrics.avgTradeDurationMinutes)],
    ["Total perps volume", money(metrics.totalPerpsVolume)],
  ] as const;
}

export function reportPdfVenueRows(report?: MultiVenueMetrics) {
  if (!report) return [] as [string, string][];
  return report.activeVenues.flatMap((venue): [string, string][] => {
    const snapshot = report[venue];
    if (!snapshot) return [];
    const metrics = snapshot.metrics;
    const label = venue === "hyperliquid" ? "Hyperliquid" : venue === "arcus" ? "Arcus" : "Lighter";
    return [[label, metrics.empty ? "No active fills" : `${metrics.fillCount} fills | ${money(metrics.perpPnl)} all-time P&L`]];
  });
}

function fitText(text: string, font: PDFFont, size: number, width: number) {
  if (font.widthOfTextAtSize(text, size) <= width) return text;
  let value = text;
  while (value.length && font.widthOfTextAtSize(`${value}...`, size) > width) value = value.slice(0, -1);
  return `${value}...`;
}

export async function buildReportPdf({ address, metrics, report, accountEmail }: ReportPdfInput) {
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  let page!: PDFPage;
  let y = 0;

  const addPage = () => {
    page = document.addPage([595.28, 841.89]);
    page.drawRectangle({ x: 0, y: 0, width: 595.28, height: 841.89, color: paper });
    y = 744;
  };
  const ensure = (height: number) => { if (y - height < 58) addPage(); };
  const heading = (text: string) => {
    ensure(42);
    page.drawText(text.toUpperCase(), { x: 48, y, size: 9, font: bold, color: teal });
    y -= 24;
  };
  const row = (label: string, value: string) => {
    ensure(34);
    page.drawText(label, { x: 48, y, size: 10, font: regular, color: muted });
    page.drawText(fitText(value, bold, 10, 235), { x: 312, y, size: 10, font: bold, color: ink });
    page.drawLine({ start: { x: 48, y: y - 10 }, end: { x: 547, y: y - 10 }, thickness: 0.35, color: line });
    y -= 28;
  };

  addPage();
  page.drawText("Your trading record, made readable.", { x: 48, y, size: 25, font: bold, color: ink });
  y -= 28;
  page.drawText(`${address.slice(0, 10)}...${address.slice(-8)}  |  ${date(metrics.dateFrom)} - ${date(metrics.dateTo)}`, { x: 48, y, size: 10, font: regular, color: muted });
  y -= 17;
  if (accountEmail) page.drawText(accountEmail, { x: 48, y, size: 9, font: regular, color: muted });
  y -= 38;

  heading("Report summary");
  if (report && report.activeVenues.length >= 2) {
    const venueNames = report.activeVenues.map((venue) => venue === "hyperliquid" ? "Hyperliquid" : venue === "arcus" ? "Arcus" : "Lighter");
    row("View", `Combined | ${venueNames.join(" + ")}`);
    for (const [label, value] of reportPdfVenueRows(report)) row(label, value);
  }
  for (const [label, value] of reportPdfRows(metrics).slice(0, 10)) row(label, value);
  heading("Trading rhythm");
  for (const [label, value] of reportPdfRows(metrics).slice(10)) row(label, value);

  heading("More observations");
  row("Size after a loss", metrics.revengeRatio == null ? "-" : `${metrics.revengeRatio.toFixed(1)}x median fill size`);
  row("Cool-down after a loss", duration(metrics.medianCooldown));
  row("Average win / average loss", `${money(metrics.avgWin)} / ${money(-metrics.avgLoss)}`);
  row("Long / short net P&L", `${money(metrics.longPnl)} / ${money(metrics.shortPnl)}`);
  row("Fee weight", metrics.feeMultiple == null ? "-" : `${metrics.feeMultiple.toFixed(1)}x net result`);
  row("Loss concentration", metrics.lossShare == null ? "-" : `${Math.round(metrics.lossShare * 100)}% in five worst losses`);
  row("Markets", `${metrics.coinCount}${metrics.topCoin ? ` | most active: ${metrics.topCoin}` : ""}`);
  row("Confidence", `${metrics.confidence ?? "-"}${metrics.historyLimited ? " | history limit reached" : ""}`);

  if (metrics.entryType) {
    ensure(110);
    heading("How positions were opened");
    const entry = metrics.entryType;
    row("Market orders", `${entry.marketTrades} positions | ${money(entry.marketPnl)} net | ${money(entry.marketFees)} fees`);
    row("Limit orders", `${entry.limitTrades} positions | ${money(entry.limitPnl)} net | ${money(entry.limitFees)} fees`);
  }

  ensure(70);
  y -= 10;
  page.drawText("A measured review of public trading records - not financial advice or proof of intent.", { x: 48, y, size: 8, font: regular, color: muted });
  page.drawText(`Generated ${date(Date.now())}  |  stayflat.xyz`, { x: 48, y: y - 16, size: 8, font: regular, color: muted });

  const pages = document.getPages();
  pages.forEach((item, index) => {
    item.drawText("STAYFLAT", { x: 48, y: 792, size: 11, font: bold, color: teal });
    item.drawText("Master the trader, not the trade.", { x: 355, y: 792, size: 8, font: regular, color: muted });
    item.drawLine({ start: { x: 48, y: 776 }, end: { x: 547, y: 776 }, thickness: 0.6, color: line });
    item.drawText(`${index + 1} / ${pages.length}`, { x: 510, y: 32, size: 8, font: regular, color: muted });
  });
  document.setTitle("StayFlat trading report");
  document.setAuthor("StayFlat");
  return document.save();
}
