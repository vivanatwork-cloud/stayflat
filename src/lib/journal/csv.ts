import { deriveTrade, emotionLabel } from "./calculations";
import type { JournalState } from "./types";

function safeCell(value: unknown) {
  let cell = value == null ? "" : String(value);
  if (/^[=+\-@]/.test(cell)) cell = `'${cell}`;
  return `"${cell.replaceAll('"', '""')}"`;
}

export function journalCsv(state: JournalState) {
  const headings = ["Entry time", "Market", "Strategy", "Direction", "Entry price", "Position size $", "Units", "Stop", "Take profit", "Exit price", "Exit time", "Fees", "Gross P/L", "Net P/L", "R", "Win/Loss", "Duration (h)", "Trading state", "Reason", "Note"];
  const rows = state.trades
    .toSorted((a, b) => a.entryTime - b.entryTime)
    .map((trade) => {
      const result = deriveTrade(trade);
      return [
        new Date(trade.entryTime).toISOString(), trade.coin, trade.strategy, trade.dir,
        trade.entryPx, result.sizeUsd.toFixed(2), result.units.toFixed(8), trade.stopPx,
        trade.tpPx, trade.exitPx, trade.exitTime ? new Date(trade.exitTime).toISOString() : "",
        trade.fees, result.gross?.toFixed(2) ?? "", result.net?.toFixed(2) ?? "",
        result.r?.toFixed(3) ?? "", result.win === null ? "" : result.win ? "Win" : "Loss",
        result.duration?.toFixed(2) ?? "", emotionLabel(trade.emo), trade.reason, trade.note,
      ].map(safeCell).join(",");
    });
  return [headings.map(safeCell).join(","), ...rows].join("\n");
}
