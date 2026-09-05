import { mkdir, writeFile } from "node:fs/promises";
import { buildReportPdf } from "../src/lib/report-pdf";
import type { ReportMetrics } from "../src/lib/hyperliquid/metrics";

const metrics = {
  empty: false, fillCount: 148, winRate: .57, fees: 428.12, biggestLoss: -2840, biggestWin: 3910,
  coinCount: 8, topCoin: "BTC", dateFrom: 1735689600000, dateTo: 1756684800000,
  revengeRatio: 1.2, medianCooldown: 18, dangerBand: { start: 0, end: 3 }, profitBand: { start: 9, end: 12 },
  entryType: { marketTrades: 42, limitTrades: 31, marketPnl: 7100, limitPnl: 2330, marketWins: 25, marketLosses: 17, limitWins: 17, limitLosses: 14, marketFills: 88, limitFills: 60, marketFees: 310, limitFees: 118 },
  perpPnl: 9430, avgWin: 720, avgLoss: 510, longPnl: 6100, shortPnl: 3330,
  longCount: 39, shortCount: 34, busyDayCount: 9, busyDayPnl: -1100, busyDayDate: "2025-06-18",
  feeMultiple: .05, lossShare: .46, lossCount: 31, positionCount: 73, longestWinStreak: 6,
  longestWinStreakMonth: "March 2025", longestLossStreak: 3, longestLossStreakMonth: "June 2025",
  avgTradeDurationMinutes: 126, totalPerpsVolume: 1840000,
  bestCloseNetWeekday: { day: "Tuesday", net: 4800 }, worstCloseNetWeekday: { day: "Friday", net: -1900 },
  bestOpenNetWeekday: { day: "Monday", net: 5200 }, worstOpenNetWeekday: { day: "Thursday", net: -2300 },
} satisfies ReportMetrics;

await mkdir("tmp/pdfs", { recursive: true });
await writeFile("tmp/pdfs/stayflat-report-preview.pdf", await buildReportPdf({ address: "0x1111111111111111111111111111111111111111", metrics, accountEmail: "trader@example.com" }));
