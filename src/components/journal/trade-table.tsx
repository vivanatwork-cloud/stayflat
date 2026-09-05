import { deriveTrade, emotionLabel, money, price, rValue } from "@/lib/journal/calculations";
import type { JournalTrade } from "@/lib/journal/types";

function tradeDate(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
  }).format(timestamp);
}

export function TradeTable({ trades, onEdit }: { trades: JournalTrade[]; onEdit: (trade: JournalTrade) => void }) {
  if (trades.length === 0)
    return <div className="journal-empty"><p>No trades yet. Log your next trade while the decision is still fresh.</p></div>;

  const rows = trades.toSorted((a, b) => b.entryTime - a.entryTime);
  return (
    <>
      <div className="journal-table-wrap">
        <table className="journal-table">
          <thead><tr><th>Entry</th><th>Market</th><th>Side</th><th>Entry</th><th>Exit</th><th>Size</th><th>R</th><th>Net P/L</th><th>State</th><th><span className="journal-sr-only">Actions</span></th></tr></thead>
          <tbody>
            {rows.map((trade) => {
              const result = deriveTrade(trade);
              return <tr key={trade.id}>
                <td className="journal-mono">{tradeDate(trade.entryTime)}</td>
                <td>{trade.coin}</td>
                <td><span className={`journal-tag journal-tag-${trade.dir.toLowerCase()}`}>{trade.dir}</span></td>
                <td className="journal-mono">{price(trade.entryPx)}</td>
                <td className="journal-mono">{result.closed ? price(trade.exitPx) : <span className="journal-tag journal-tag-open">Open</span>}</td>
                <td className="journal-mono">{money(result.sizeUsd)}</td>
                <td className="journal-mono">{rValue(result.r)}</td>
                <td className={`journal-mono ${result.net === null ? "" : result.net >= 0 ? "journal-positive" : "journal-negative"}`}>{money(result.net)}</td>
                <td>{emotionLabel(trade.emo)}</td>
                <td><button className="journal-edit" type="button" onClick={() => onEdit(trade)} aria-label={`Edit ${trade.coin} trade`}>Edit</button></td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>

      <div className="journal-trade-cards">
        {rows.map((trade) => {
          const result = deriveTrade(trade);
          return <button className="journal-trade-card" key={trade.id} type="button" onClick={() => onEdit(trade)}>
            <span><strong>{trade.coin}</strong><small>{tradeDate(trade.entryTime)}</small></span>
            <span><span className={`journal-tag journal-tag-${trade.dir.toLowerCase()}`}>{trade.dir}</span><small>{result.closed ? "Closed" : "Open"}</small></span>
            <span className={result.net === null ? "" : result.net >= 0 ? "journal-positive" : "journal-negative"}><strong>{money(result.net)}</strong><small>{rValue(result.r)}</small></span>
          </button>;
        })}
      </div>
    </>
  );
}
