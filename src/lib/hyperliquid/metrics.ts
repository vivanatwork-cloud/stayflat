export type RawFill = {
  venue?: "hyperliquid" | "arcus";
  time: number | string;
  px: string;
  sz: string;
  closedPnl?: string;
  fee?: string;
  coin?: string;
  tid?: number | string;
  side?: string;
  dir?: string;
  crossed?: boolean;
};

export type EntryTypeMetrics = {
  marketTrades: number;
  limitTrades: number;
  marketPnl: number;
  limitPnl: number;
  marketWins: number;
  marketLosses: number;
  limitWins: number;
  limitLosses: number;
  marketFills: number;
  limitFills: number;
  marketFees: number;
  limitFees: number;
};

export type ReportSeriesPoint = { time: number; value: number };
export type ReportDay = { date: string; pnl: number; positions: number };
export type WeekdayNet = { day: string; net: number };
type SnapshotFields = {
  generatedAt?: number;
  historyLimited?: boolean;
  positionCount?: number;
  confidence?: "low" | "medium" | "high";
  cumulativePnl?: ReportSeriesPoint[];
  dailyPnl?: ReportDay[];
  mostWinsDay?: string | null;
  mostLossesDay?: string | null;
  bestCloseNetWeekday?: WeekdayNet | null;
  worstCloseNetWeekday?: WeekdayNet | null;
  bestOpenNetWeekday?: WeekdayNet | null;
  worstOpenNetWeekday?: WeekdayNet | null;
  longestWinStreak?: number;
  longestLossStreak?: number;
  longestWinStreakMonth?: string | null;
  longestLossStreakMonth?: string | null;
  avgTradeDurationMinutes?: number | null;
  totalPerpsVolume?: number;
  profitBand?: { start: number; end: number } | null;
  busyDayDate?: string | null;
};
export type ReportMetrics = SnapshotFields & (
  | { empty: true }
  | {
      empty: false;
      fillCount: number;
      winRate: number | null;
      fees: number;
      biggestLoss: number;
      biggestWin: number;
      coinCount: number;
      topCoin: string | null;
      dateFrom: number;
      dateTo: number;
      revengeRatio: number | null;
      medianCooldown: number | null;
      dangerBand: { start: number; end: number } | null;
      entryType: EntryTypeMetrics | null;
      perpPnl: number | null;
      avgWin: number;
      avgLoss: number;
      longPnl: number;
      shortPnl: number;
      longCount: number;
      shortCount: number;
      busyDayCount: number;
      busyDayPnl: number;
      feeMultiple: number | null;
      lossShare: number | null;
      lossCount: number;
    }
);

type Fill = {
  venue: "hyperliquid" | "arcus";
  time: number;
  price: number;
  size: number;
  pnl: number;
  fee: number;
  coin: string;
  side: string;
  dir: string;
  crossed: boolean;
  notional: number;
};
type Position = {
  coin: string;
  direction: "long" | "short";
  openedAt: number;
  closedAt: number;
  openingNotional: number;
  pnl: number;
  fees: number;
  opening: "market" | "limit";
};
type OpenPosition = Omit<Position, "closedAt"> & { quantity: number };

const EPSILON = 1e-10;
const median = (values: number[]) => {
  if (!values.length) return 0;
  const sorted = values.toSorted((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};
const localDateKey = (timestamp: number, offset: number) =>
  new Date(timestamp - offset * 60_000).toISOString().slice(0, 10);
const monthRangeLabel = (start: string, end: string) => {
  const startDate = new Date(`${start}T00:00:00Z`);
  const endDate = new Date(`${end}T00:00:00Z`);
  const month = new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" });
  const monthYear = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  if (startDate.getUTCFullYear() !== endDate.getUTCFullYear())
    return `${monthYear.format(startDate)}–${monthYear.format(endDate)}`;
  if (startDate.getUTCMonth() !== endDate.getUTCMonth())
    return `${month.format(startDate)}–${monthYear.format(endDate)}`;
  return monthYear.format(endDate);
};

function normalizeFills(rawFills: RawFill[]) {
  const seen = new Set<string>();
  return rawFills
    .map((fill) => ({
      time: Number(fill.time),
      price: Number(fill.px),
      size: Math.abs(Number(fill.sz)),
      pnl: Number(fill.closedPnl || 0),
      fee: Number(fill.fee || 0),
      coin: fill.coin || "",
      tid: fill.tid,
      side: fill.side || "",
      dir: fill.dir || "",
      crossed: Boolean(fill.crossed),
      venue: fill.venue ?? "hyperliquid",
    }))
    .filter((fill) => !fill.coin.startsWith("@") && !fill.coin.includes("/") && Number.isFinite(fill.time) && Number.isFinite(fill.price) && Number.isFinite(fill.size) && fill.size > 0)
    .filter((fill) => {
      if (fill.tid == null) return true;
      const key = `${fill.venue ?? "hyperliquid"}:${String(fill.tid)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .toSorted((a, b) => a.time - b.time)
    .map((fill): Fill => ({ ...fill, notional: fill.price * fill.size }));
}

export function reconstructPositions(fills: Fill[]) {
  const open = new Map<string, OpenPosition>();
  const completed: Position[] = [];
  const close = (state: OpenPosition, fill: Fill) => completed.push({
    coin: state.coin,
    direction: state.direction,
    openedAt: state.openedAt,
    closedAt: fill.time,
    openingNotional: state.openingNotional,
    pnl: state.pnl,
    fees: state.fees,
    opening: state.opening,
  });

  for (const fill of fills) {
    const signed = (fill.side === "B" ? 1 : -1) * fill.size;
    const positionKey = `${fill.venue}:${fill.coin}`;
    const state = open.get(positionKey);
    if (!state) {
      if (fill.dir.toLowerCase().startsWith("close")) continue;
      open.set(positionKey, {
        coin: fill.coin,
        direction: signed > 0 ? "long" : "short",
        openedAt: fill.time,
        openingNotional: fill.notional,
        pnl: fill.pnl,
        fees: fill.fee,
        opening: fill.crossed ? "market" : "limit",
        quantity: signed,
      });
      continue;
    }

    const nextQuantity = state.quantity + signed;
    const sameDirection = Math.sign(state.quantity) === Math.sign(signed);
    state.pnl += fill.pnl;
    state.fees += fill.fee;
    if (sameDirection) {
      state.quantity = nextQuantity;
      state.openingNotional += fill.notional;
      continue;
    }
    if (Math.abs(nextQuantity) <= EPSILON) {
      close(state, fill);
      open.delete(positionKey);
      continue;
    }
    if (Math.sign(nextQuantity) !== Math.sign(state.quantity)) {
      close(state, fill);
      open.set(positionKey, {
        coin: fill.coin,
        direction: nextQuantity > 0 ? "long" : "short",
        openedAt: fill.time,
        openingNotional: Math.abs(nextQuantity) * fill.price,
        pnl: 0,
        fees: 0,
        opening: fill.crossed ? "market" : "limit",
        quantity: nextQuantity,
      });
      continue;
    }
    state.quantity = nextQuantity;
  }
  return completed.toSorted((a, b) => a.closedAt - b.closedAt);
}

export function computeMetrics(rawFills: RawFill[], portfolioPnl: number | null, timezoneOffsetMinutes = 0): ReportMetrics {
  const fills = normalizeFills(rawFills);
  if (!fills.length) return { empty: true, positionCount: 0, confidence: "low", cumulativePnl: [], dailyPnl: [] };
  const positions = reconstructPositions(fills);
  const netPnlFor = (position: Position) => position.pnl - position.fees;
  const wins = positions.filter((position) => netPnlFor(position) > 0);
  const losses = positions.filter((position) => netPnlFor(position) < 0);
  const fees = fills.reduce((sum, fill) => sum + fill.fee, 0);
  const realizedPnl = positions.reduce((sum, position) => sum + netPnlFor(position), 0);
  const medianNotional = median(positions.map((position) => position.openingNotional));
  const afterLoss: number[] = [];
  const cooldowns: number[] = [];
  for (let index = 0; index < positions.length - 1; index += 1) {
    if (netPnlFor(positions[index]) < 0) {
      afterLoss.push(positions[index + 1].openingNotional);
      cooldowns.push(Math.max(0, (positions[index + 1].openedAt - positions[index].closedAt) / 60_000));
    }
  }

  const entryHourPnl = Array.from({ length: 24 }, () => 0);
  positions.forEach((position) => {
    const entryHour = new Date(position.openedAt - timezoneOffsetMinutes * 60_000).getUTCHours();
    entryHourPnl[entryHour] += netPnlFor(position);
  });
  let dangerBand: { start: number; end: number } | null = null;
  let profitBand: { start: number; end: number } | null = null;
  if (positions.length >= 3) {
    let worstStart = 0;
    let worstSum = Number.POSITIVE_INFINITY;
    let bestStart = 0;
    let bestSum = Number.NEGATIVE_INFINITY;
    entryHourPnl.forEach((_, hour) => {
      const sum = entryHourPnl[hour] + entryHourPnl[(hour + 1) % 24] + entryHourPnl[(hour + 2) % 24];
      if (sum <= worstSum) { worstSum = sum; worstStart = hour; }
      if (sum >= bestSum) { bestSum = sum; bestStart = hour; }
    });
    if (worstSum < 0) dangerBand = { start: worstStart, end: (worstStart + 3) % 24 };
    if (bestSum > 0) profitBand = { start: bestStart, end: (bestStart + 3) % 24 };
  }

  let marketFills = 0, limitFills = 0;
  fills.forEach((fill) => {
    if (fill.crossed) marketFills += 1;
    else limitFills += 1;
  });
  const entry: EntryTypeMetrics = { marketTrades: 0, limitTrades: 0, marketPnl: 0, limitPnl: 0, marketWins: 0, marketLosses: 0, limitWins: 0, limitLosses: 0, marketFills, limitFills, marketFees: 0, limitFees: 0 };
  positions.forEach((position) => {
    const prefix = position.opening;
    entry[prefix === "market" ? "marketTrades" : "limitTrades"] += 1;
    entry[prefix === "market" ? "marketFees" : "limitFees"] += position.fees;
    const positionNet = netPnlFor(position);
    entry[prefix === "market" ? "marketPnl" : "limitPnl"] += positionNet;
    const result = positionNet > 0 ? "Wins" : "Losses";
    entry[`${prefix}${result}` as "marketWins" | "marketLosses" | "limitWins" | "limitLosses"] += 1;
  });

  const winPnls = wins.map(netPnlFor);
  const lossPnls = losses.map((position) => Math.abs(netPnlFor(position)));
  const avgWin = winPnls.length ? winPnls.reduce((sum, pnl) => sum + pnl, 0) / winPnls.length : 0;
  const avgLoss = lossPnls.length ? lossPnls.reduce((sum, pnl) => sum + pnl, 0) / lossPnls.length : 0;
  const long = positions.filter((position) => position.direction === "long");
  const short = positions.filter((position) => position.direction === "short");
  const longPnl = long.reduce((sum, position) => sum + netPnlFor(position), 0);
  const shortPnl = short.reduce((sum, position) => sum + netPnlFor(position), 0);
  const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const closeWeekdays = new Map<number, { wins: number; losses: number }>();
  const openWeekdays = new Map<number, { wins: number; losses: number }>();
  positions.forEach((position) => {
    const net = netPnlFor(position);
    if (net === 0) return;
    const closeWeekday = new Date(position.closedAt - timezoneOffsetMinutes * 60_000).getUTCDay();
    const openWeekday = new Date(position.openedAt - timezoneOffsetMinutes * 60_000).getUTCDay();
    for (const [counts, weekday] of [[closeWeekdays, closeWeekday], [openWeekdays, openWeekday]] as const) {
      const result = counts.get(weekday) ?? { wins: 0, losses: 0 };
      if (net > 0) result.wins += 1;
      else result.losses += 1;
      counts.set(weekday, result);
    }
  });
  const netWeekday = (counts: Map<number, { wins: number; losses: number }>, best: boolean): WeekdayNet | null => {
    const result = [...counts]
      .map(([weekday, totals]) => ({ weekday, net: totals.wins - totals.losses }))
      .toSorted((a, b) => (best ? b.net - a.net : a.net - b.net) || a.weekday - b.weekday)[0];
    return result ? { day: weekdayNames[result.weekday], net: result.net } : null;
  };
  const avgTradeDurationMinutes = positions.length
    ? positions.reduce((sum, position) => sum + Math.max(0, position.closedAt - position.openedAt), 0) / positions.length / 60_000
    : null;
  const totalPerpsVolume = fills.reduce((sum, fill) => sum + fill.notional, 0);
  const days = new Map<string, ReportDay>();
  positions.forEach((position) => {
    const key = localDateKey(position.closedAt, timezoneOffsetMinutes);
    const day = days.get(key) || { date: key, pnl: 0, positions: 0 };
    day.pnl += netPnlFor(position);
    day.positions += 1;
    days.set(key, day);
  });
  const dailyPnl = [...days.values()].toSorted((a, b) => a.date.localeCompare(b.date));
  let currentWinStreak = 0, currentLossStreak = 0, longestWinStreak = 0, longestLossStreak = 0;
  let currentWinStart = "", currentLossStart = "";
  let longestWinStreakMonth: string | null = null, longestLossStreakMonth: string | null = null;
  for (const day of dailyPnl) {
    if (day.pnl > 0) {
      if (currentWinStreak === 0) currentWinStart = day.date;
      currentWinStreak += 1;
      currentLossStreak = 0;
      if (currentWinStreak > longestWinStreak) {
        longestWinStreak = currentWinStreak;
        longestWinStreakMonth = monthRangeLabel(currentWinStart, day.date);
      }
    } else if (day.pnl < 0) {
      if (currentLossStreak === 0) currentLossStart = day.date;
      currentLossStreak += 1;
      currentWinStreak = 0;
      if (currentLossStreak > longestLossStreak) {
        longestLossStreak = currentLossStreak;
        longestLossStreakMonth = monthRangeLabel(currentLossStart, day.date);
      }
    } else {
      currentWinStreak = 0;
      currentLossStreak = 0;
    }
  }
  let busyDayCount = 0, busyDayPnl = 0, busyDayDate: string | null = null;
  for (const day of dailyPnl) {
    if (day.positions >= busyDayCount) {
      busyDayCount = day.positions;
      busyDayPnl = day.pnl;
      busyDayDate = day.date;
    }
  }
  const sortedLosses = lossPnls.toSorted((a, b) => b - a);
  const totalLoss = lossPnls.reduce((sum, pnl) => sum + pnl, 0);
  const lossShare = totalLoss > 0 && losses.length >= 6 ? sortedLosses.slice(0, 5).reduce((sum, pnl) => sum + pnl, 0) / totalLoss : null;
  const coinCounts = new Map<string, number>();
  positions.forEach((position) => coinCounts.set(position.coin, (coinCounts.get(position.coin) || 0) + 1));
  const topCoin = [...coinCounts].toSorted((a, b) => b[1] - a[1])[0]?.[0] || null;
  let cumulative = 0;
  const cumulativePnl = positions.map((position) => ({ time: position.closedAt, value: cumulative += netPnlFor(position) }));
  const positionCount = positions.length;
  const confidence = positionCount >= 30 ? "high" : positionCount >= 10 ? "medium" : "low";
  const netPnl = realizedPnl;

  return {
    empty: false,
    fillCount: fills.length,
    positionCount,
    confidence,
    cumulativePnl,
    dailyPnl,
    bestCloseNetWeekday: netWeekday(closeWeekdays, true),
    worstCloseNetWeekday: netWeekday(closeWeekdays, false),
    bestOpenNetWeekday: netWeekday(openWeekdays, true),
    worstOpenNetWeekday: netWeekday(openWeekdays, false),
    longestWinStreak,
    longestLossStreak,
    longestWinStreakMonth,
    longestLossStreakMonth,
    avgTradeDurationMinutes,
    totalPerpsVolume,
    winRate: positionCount ? wins.length / positionCount : null,
    fees,
    biggestLoss: positions.reduce((minimum, position) => Math.min(minimum, netPnlFor(position)), 0),
    biggestWin: positions.reduce((maximum, position) => Math.max(maximum, netPnlFor(position)), 0),
    coinCount: coinCounts.size,
    topCoin,
    dateFrom: fills[0].time,
    dateTo: fills.at(-1)!.time,
    revengeRatio: medianNotional > 0 && afterLoss.length >= 3 ? median(afterLoss) / medianNotional : null,
    medianCooldown: cooldowns.length >= 3 ? median(cooldowns) : null,
    dangerBand,
    profitBand,
    entryType: positions.length ? entry : null,
    perpPnl: portfolioPnl ?? netPnl,
    avgWin,
    avgLoss,
    longPnl,
    shortPnl,
    longCount: long.length,
    shortCount: short.length,
    busyDayCount,
    busyDayPnl,
    busyDayDate,
    feeMultiple: netPnl !== 0 ? fees / Math.abs(netPnl) : null,
    lossShare,
    lossCount: lossPnls.length,
  };
}
