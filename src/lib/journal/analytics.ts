import { deriveTrade, emotionLabel } from "./calculations";
import type { JournalTrade } from "./types";

export type AnalyticsPeriod = "all" | "7" | "30" | "ytd";
export type ClosedJournalTrade = {
  trade: JournalTrade;
  net: number;
  sizeUsd: number;
  win: boolean;
};
export type DailyPerformance = { date: string; pnl: number; trades: number };
export type StrategyPerformance = {
  strategy: string;
  trades: number;
  wins: number;
  winRate: number;
  net: number;
  average: number;
  profitFactor: number | null;
};

const DAY = 86_400_000;
const dateKey = (timestamp: number) => {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const median = (values: number[]) => {
  if (!values.length) return null;
  const sorted = values.toSorted((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

function inPeriod(timestamp: number, period: AnalyticsPeriod, now: number) {
  if (period === "all") return true;
  if (period === "7") return timestamp >= now - 7 * DAY;
  if (period === "30") return timestamp >= now - 30 * DAY;
  return new Date(timestamp).getFullYear() === new Date(now).getFullYear();
}

export function buildJournalAnalytics(trades: JournalTrade[], period: AnalyticsPeriod, now = Date.now()) {
  const closed: ClosedJournalTrade[] = trades.flatMap((trade) => {
    const result = deriveTrade(trade);
    return result.closed && trade.exitTime && inPeriod(trade.exitTime, period, now)
      ? [{ trade, net: result.net ?? 0, sizeUsd: result.sizeUsd, win: result.win === true }]
      : [];
  }).toSorted((a, b) => (a.trade.exitTime ?? 0) - (b.trade.exitTime ?? 0));

  let cumulative = 0;
  let peak = 0;
  let maxDrawdown = 0;
  const equity = closed.map((item) => {
    cumulative += item.net;
    peak = Math.max(peak, cumulative);
    maxDrawdown = Math.max(maxDrawdown, peak - cumulative);
    return { time: item.trade.exitTime!, value: cumulative };
  });
  const wins = closed.filter((item) => item.net > 0);
  const losses = closed.filter((item) => item.net <= 0);
  const grossProfit = wins.reduce((sum, item) => sum + item.net, 0);
  const grossLoss = Math.abs(losses.reduce((sum, item) => sum + item.net, 0));

  const dailyMap = new Map<string, DailyPerformance>();
  const strategyMap = new Map<string, ClosedJournalTrade[]>();
  const emotionMap = new Map<string, number>();
  const marketMap = new Map<string, number>();
  for (const item of closed) {
    const day = dateKey(item.trade.exitTime!);
    const daily = dailyMap.get(day) ?? { date: day, pnl: 0, trades: 0 };
    daily.pnl += item.net;
    daily.trades += 1;
    dailyMap.set(day, daily);
    const strategy = item.trade.strategy.trim() || "No strategy recorded";
    strategyMap.set(strategy, [...(strategyMap.get(strategy) ?? []), item]);
    const emotion = emotionLabel(item.trade.emo);
    emotionMap.set(emotion, (emotionMap.get(emotion) ?? 0) + item.net);
    marketMap.set(item.trade.coin, (marketMap.get(item.trade.coin) ?? 0) + item.net);
  }
  const strategies: StrategyPerformance[] = [...strategyMap].map(([strategy, items]) => {
    const strategyWins = items.filter((item) => item.net > 0);
    const strategyLoss = Math.abs(items.filter((item) => item.net <= 0).reduce((sum, item) => sum + item.net, 0));
    const net = items.reduce((sum, item) => sum + item.net, 0);
    return {
      strategy,
      trades: items.length,
      wins: strategyWins.length,
      winRate: strategyWins.length / items.length,
      net,
      average: net / items.length,
      profitFactor: strategyLoss ? strategyWins.reduce((sum, item) => sum + item.net, 0) / strategyLoss : null,
    };
  }).toSorted((a, b) => b.net - a.net);

  const afterLossSizes: number[] = [];
  const cooldowns: number[] = [];
  for (let index = 0; index < closed.length - 1; index += 1) {
    if (closed[index].net < 0) {
      afterLossSizes.push(closed[index + 1].sizeUsd);
      cooldowns.push((closed[index + 1].trade.entryTime - closed[index].trade.exitTime!) / 60_000);
    }
  }
  const normalSize = median(closed.map((item) => item.sizeUsd));
  const afterLossSize = median(afterLossSizes);
  const lossHours = Array.from({ length: 24 }, () => 0);
  for (const item of closed) if (item.net < 0) lossHours[new Date(item.trade.exitTime!).getHours()] += item.net;
  let dangerStart: number | null = null;
  let worstWindow = 0;
  for (let hour = 0; hour < 24; hour += 1) {
    const value = lossHours[hour] + lossHours[(hour + 1) % 24] + lossHours[(hour + 2) % 24];
    if (value < worstWindow) { worstWindow = value; dangerStart = hour; }
  }
  const daily = [...dailyMap.values()].toSorted((a, b) => a.date.localeCompare(b.date));
  let busiestDay: DailyPerformance | null = null;
  for (const day of daily) {
    if (!busiestDay || day.trades >= busiestDay.trades) busiestDay = day;
  }
  const lossValues = losses.map((item) => Math.abs(item.net)).toSorted((a, b) => b - a);
  const totalLoss = lossValues.reduce((sum, value) => sum + value, 0);
  const long = closed.filter((item) => item.trade.dir === "Long");
  const short = closed.filter((item) => item.trade.dir === "Short");
  const fees = closed.reduce((sum, item) => sum + Number(item.trade.fees || 0), 0);

  return {
    closed,
    equity,
    daily,
    strategies,
    byEmotion: [...emotionMap].map(([label, value]) => ({ label, value })),
    byMarket: [...marketMap].map(([label, value]) => ({ label, value })).toSorted((a, b) => Math.abs(b.value) - Math.abs(a.value)),
    summary: {
      net: cumulative,
      winRate: closed.length ? wins.length / closed.length : null,
      expectancy: closed.length ? cumulative / closed.length : null,
      profitFactor: grossLoss ? grossProfit / grossLoss : null,
      averageWin: wins.length ? grossProfit / wins.length : null,
      averageLoss: losses.length ? -grossLoss / losses.length : null,
      maxDrawdown,
      closedTrades: closed.length,
    },
    report: {
      biggestLoss: losses.length ? -Math.max(...lossValues) : null,
      marketCount: marketMap.size,
      sizeAfterLossRatio: normalSize && afterLossSize != null ? afterLossSize / normalSize : null,
      medianCooldownMinutes: median(cooldowns.filter((value) => value >= 0)),
      dangerStart,
      longPnl: long.reduce((sum, item) => sum + item.net, 0),
      shortPnl: short.reduce((sum, item) => sum + item.net, 0),
      longCount: long.length,
      shortCount: short.length,
      busyDayPnl: busiestDay?.pnl ?? null,
      busyDayCount: busiestDay?.trades ?? 0,
      fees,
      feeMultiple: cumulative !== 0 ? fees / Math.abs(cumulative) : null,
      lossShare: totalLoss && losses.length >= 6 ? lossValues.slice(0, 5).reduce((sum, value) => sum + value, 0) / totalLoss : null,
    },
  };
}
