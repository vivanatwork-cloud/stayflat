"use client";
import { useState } from "react";
import {
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  MoveUpRight,
  Target,
  Info,
  Clock3,
} from "lucide-react";
import { Button, Panel, Empty } from "./ui";
import {
  allocation,
  categoryColors,
  decimal,
  flow,
  formatMoney,
  inr,
  pnl,
  projection,
  total,
} from "@/lib/wealth/engine";
import type { Data, Ownership } from "@/lib/wealth/types";
export type Money = (
  v: bigint | string,
  currency?: string,
  compact?: boolean,
) => string;
export function WealthChart({ data, hidden }: { data: Data; hidden: boolean }) {
  const [range, setRange] = useState("3M");
  const [hover, setHover] = useState<number | null>(null);
  const days: Record<string, number> = {
    "1D": 1,
    "1W": 7,
    "1M": 30,
    "3M": 90,
    "6M": 180,
    "1Y": 365,
    ALL: Infinity,
  };
  const cut = Date.now() - days[range] * 86400000;
  const points = data.snapshots
    .filter((s) => new Date(s.date).getTime() >= cut)
    .sort((a, b) => a.date.localeCompare(b.date));
  const values = points.map((s) => Number(s.total));
  const min = Math.min(...values) * 0.97,
    max = Math.max(...values) * 1.015;
  const y = (v: number) => 190 - ((v - min) / (max - min || 1)) * 160;
  const x = (i: number) => 20 + (i / (points.length - 1 || 1)) * 810;
  const line = values
    .map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`)
    .join(" ");
  const active = hover !== null ? points[hover] : null;
  return (
    <>
      <div className="chart-toolbar">
        <span className="muted">
          Wealth over time <span className="tiny-tag">INR</span>
        </span>
        <div className="range-selector" aria-label="Chart period">
          {Object.keys(days).map((r) => (
            <button
              key={r}
              className={r === range ? "selected" : ""}
              onClick={() => {
                setRange(r);
                setHover(null);
              }}
              aria-pressed={r === range}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      {points.length < 2 ? (
        <Empty
          title="Your history starts here"
          text="Each saved balance creates a dated record. Your chart will grow as you update your accounts."
        />
      ) : (
        <div className="chart-box">
          <div className="chart-y">
            {[max, (max + min) / 2, min].map((v, i) => (
              <span key={i}>
                {formatMoney(v.toFixed(2), "INR", hidden, true)}
              </span>
            ))}
          </div>
          <svg
            className="wealth-chart"
            viewBox="0 0 860 230"
            role="img"
            aria-label="Asset value history"
            onMouseLeave={() => setHover(null)}
            onMouseMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setHover(
                Math.min(
                  points.length - 1,
                  Math.max(
                    0,
                    Math.round(
                      ((((e.clientX - r.left) / r.width) * 860 - 20) / 810) *
                        (points.length - 1),
                    ),
                  ),
                ),
              );
            }}
          >
            <defs>
              <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--ledger-mint)"
                  stopOpacity=".16"
                />
                <stop
                  offset="100%"
                  stopColor="var(--ledger-mint)"
                  stopOpacity="0"
                />
              </linearGradient>
            </defs>
            {[30, 110, 190].map((n) => (
              <line
                key={n}
                x1="20"
                x2="830"
                y1={n}
                y2={n}
                className="grid-line"
              />
            ))}
            <path d={`${line} L830,210 L20,210 Z`} fill="url(#chart-fill)" />
            <path
              d={line}
              fill="none"
              stroke="var(--ledger-mint)"
              strokeWidth="2.5"
              vectorEffect="non-scaling-stroke"
            />
            {hover !== null ? (
              <>
                <line
                  x1={x(hover)}
                  x2={x(hover)}
                  y1="15"
                  y2="210"
                  stroke="var(--secondary)"
                  strokeDasharray="3 4"
                />
                <circle
                  cx={x(hover)}
                  cy={y(values[hover])}
                  r="5"
                  fill="var(--ledger-mint)"
                />
              </>
            ) : null}
          </svg>
          <div className="chart-dates">
            {[
              0,
              Math.floor((points.length - 1) / 3),
              Math.floor((2 * (points.length - 1)) / 3),
              points.length - 1,
            ].map((i, k) => (
              <span key={k}>
                {new Date(points[i].date).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            ))}
          </div>
          {active ? (
            <div className="chart-tooltip">
              <b>
                {new Date(active.date).toLocaleDateString("en-IN")} ·{" "}
                {formatMoney(active.total, "INR", hidden)}
              </b>
              <div>
                {Object.entries(active.composition)
                  .filter(([, v]) => Number(v) > 0)
                  .map(([k, v]) => (
                    <span key={k}>
                      {k}: {formatMoney(v, "INR", hidden, true)}
                    </span>
                  ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </>
  );
}
export function Overview({
  data,
  owner,
  hidden,
  money,
  navigate,
  add,
}: {
  data: Data;
  owner: "All" | Ownership;
  hidden: boolean;
  money: Money;
  navigate: (p: string) => void;
  add: () => void;
}) {
  const amount = total(data, owner);
  const parts = allocation(data, owner);
  const month = new Date().toISOString().slice(0, 7);
  const rows = data.transactions.filter(
    (t) =>
      t.date.startsWith(month) && (owner === "All" || t.ownership === owner),
  );
  const cashflow = flow(data, rows);
  const opening = data.snapshots
    .filter((s) => s.date.slice(0, 7) < month)
    .at(-1);
  const change =
    opening && owner === "All"
      ? amount - inr(opening.total, "INR", data.fx)
      : null;
  const years = projection(amount, data.goal, data.growth);
  const percent = Math.min(
    100,
    (Number(amount) / 100 / Number(data.goal)) * 100,
  );
  const ranked = data.holdings
    .filter((h) => !["FDs", "EPF"].includes(h.type))
    .map((h) => ({
      ...h,
      gain:
        inr(h.value, h.currency, data.fx) -
        inr(h.invested, h.currency, data.fx),
    }))
    .sort((a, b) => Number(b.gain - a.gain));
  return (
    <>
      <div className="overview-grid">
        <Panel className="wealth-panel">
          <div className="hero-label">
            <span>Total assets</span>
            <span className="subtle-badge">
              {owner === "All" ? "Personal + business" : owner}
            </span>
          </div>
          <div className="wealth-hero">
            <div>
              <h2 className="hero-number">{money(amount)}</h2>
              <div className="usd-total">
                {money(
                  decimal((amount * 100n) / inr("1", "USD", data.fx)),
                  "USD",
                )}{" "}
                <span>USD</span>
              </div>
            </div>
            <div className="month-change">
              <span>This month</span>
              <strong
                className={
                  change !== null && change < 0n ? "negative" : "positive"
                }
              >
                {change !== null ? (
                  <>
                    {change >= 0n ? (
                      <ArrowUpRight size={17} />
                    ) : (
                      <ArrowDownRight size={17} />
                    )}{" "}
                    {money(change)}
                  </>
                ) : (
                  "—"
                )}
              </strong>
              <small>
                {change !== null
                  ? "Change in total assets"
                  : "Waiting for a prior month"}
              </small>
            </div>
          </div>
          {owner === "All" ? (
            <WealthChart data={data} hidden={hidden} />
          ) : (
            <p className="scope-note">
              Current balances are filtered. Historical chart is available in
              the combined view.
            </p>
          )}
          <div className="hero-footnote">
            <Info size={13} />
            Debts are excluded. Values reflect the latest saved balances.
          </div>
        </Panel>
        <Panel
          title={hidden ? "Your wealth goal" : `The ${money(data.goal,"INR",true)} goal`}
          aside={<Target size={17} />}
          className="goal-panel"
        >
          <div
            className="goal-ring"
            style={{
              background: `conic-gradient(var(--ledger-mint) ${percent}%,var(--graphite) 0)`,
            }}
          >
            <div>
              <strong>
                {hidden ? "••" : percent.toFixed(1)}
                <small>%</small>
              </strong>
              <span>of your goal</span>
            </div>
          </div>
          <div className="goal-copy">
            <p>
              {money(
                (Number(data.goal) - Number(amount) / 100).toFixed(2),
                undefined,
                true,
              )}{" "}
              <span>to go</span>
            </p>
            <span>
              {years === null
                ? "Add assets to see an estimate"
                : years === 0
                  ? "Goal reached"
                  : `About ${years.toFixed(1)} years at ${data.growth}% growth`}
            </span>
          </div>
          <Button
            variant="outline"
            className="full-width"
            onClick={() => navigate("Goal")}
          >
            Explore your goal <ArrowRight size={14} />
          </Button>
          <small className="hint centered">Projection, not a promise.</small>
        </Panel>
      </div>
      <div className="metrics-row">
        {[
          {
            label: "Income this month",
            v: cashflow.income,
            cls: "positive",
            icon: ArrowDownRight,
            to: "Income",
          },
          {
            label: "Expenses this month",
            v: cashflow.expenses,
            cls: "",
            icon: ArrowUpRight,
            to: "Expenses",
          },
          {
            label: "Unrealized investment gain",
            v: pnl(data),
            cls: pnl(data) >= 0n ? "positive" : "negative",
            icon: MoveUpRight,
            to: "Assets",
          },
          {
            label: "Available cash",
            v: parts.Cash,
            cls: "",
            icon: Clock3,
            to: "Cash",
          },
        ].map((m) => (
          <button
            className="metric"
            onClick={() => navigate(m.to)}
            key={m.label}
          >
            <div>
              <span>{m.label}</span>
              <m.icon size={16} />
            </div>
            <strong className={m.cls}>{money(m.v)}</strong>
            <small>
              View supporting records <ArrowRight size={12} />
            </small>
          </button>
        ))}
      </div>
      <div className="lower-grid">
        <Panel
          title="Where your money is"
          aside={
            <button className="text-button" onClick={() => navigate("Assets")}>
              All assets <ArrowUpRight size={14} />
            </button>
          }
        >
          {amount === 0n ? (
            <Empty
              title="Add your first account"
              text="Start with a bank balance, an investment or your provident fund."
              action="Add account"
              onClick={add}
            />
          ) : (
            <>
              <div className="allocation-bar">
                {Object.entries(parts)
                  .filter(([, v]) => v > 0n)
                  .map(([k, v]) => (
                    <span
                      key={k}
                      title={`${k}: ${money(v)}`}
                      style={{
                        width: `${(Number(v) / Number(amount)) * 100}%`,
                        background: categoryColors[k],
                      }}
                    />
                  ))}
              </div>
              <div className="allocation-list">
                {Object.entries(parts).map(([k, v]) => {
                  const actual = amount
                    ? (Number(v) / Number(amount)) * 100
                    : 0;
                  const drift = actual - (data.targets[k] ?? 0);
                  return (
                    <button
                      key={k}
                      onClick={() =>
                        navigate(k === "FDs" || k === "EPF" ? "FDs / EPF" : k)
                      }
                    >
                      <span
                        className="asset-dot"
                        style={{ background: categoryColors[k] }}
                      />
                      <span>{k}</span>
                      <strong>{money(v)}</strong>
                      <span className="allocation-percent">
                        {hidden ? "••" : actual.toFixed(1)}%
                      </span>
                      {Math.abs(drift) > 5 ? (
                        <span
                          className="drift"
                          title={`Target ${data.targets[k]}%`}
                        >
                          {drift > 0 ? "+" : ""}
                          {drift.toFixed(0)} pp
                        </span>
                      ) : (
                        <span className="drift balanced">On target</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </Panel>
        <Panel
          title="Portfolio movers"
          aside={<span className="muted small">Since purchase</span>}
        >
          {ranked.length ? (
            <div className="movers">
              {ranked.slice(0, 4).map((h) => (
                <button key={h.id} onClick={() => navigate(h.type)}>
                  <span
                    className="asset-avatar"
                    style={{ color: categoryColors[h.type] }}
                  >
                    {h.symbol.slice(0, 2)}
                  </span>
                  <span className="mover-name">
                    <b>{h.name}</b>
                    <small>
                      {h.symbol} · {h.type}
                    </small>
                  </span>
                  <span className={h.gain >= 0n ? "positive" : "negative"}>
                    <b>{money(h.gain)}</b>
                    <small>
                      {Number(h.invested) > 0
                        ? `${((Number(h.value) / Number(h.invested)) * 100 - 100).toFixed(1)}%`
                        : "No cost recorded"}
                    </small>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <Empty
              title="No investments yet"
              text="Add holdings to compare their changes in value."
            />
          )}
          <div className="insight-note">
            <span className="sparkle">✧</span>
            <p>
              {amount > 0n ? (
                <>
                  Cash makes up{" "}
                  <strong>
                    {hidden
                      ? "••"
                      : ((Number(parts.Cash) / Number(amount)) * 100).toFixed(
                          1,
                        )}
                    %
                  </strong>{" "}
                  of your assets. Your cash target is {data.targets.Cash}%.
                </>
              ) : (
                "Your insights will appear as you add financial records."
              )}
            </p>
          </div>
        </Panel>
      </div>
      <Panel
        title="This month’s movement"
        aside={
          <span className="muted small">Unexplained changes stay visible</span>
        }
      >
        <div className="reconciliation">
          <div>
            <span>Opening assets</span>
            <b>{opening ? money(opening.total) : "Not recorded"}</b>
          </div>
          <span>+</span>
          <button onClick={() => navigate("Income")}>
            <span>Income</span>
            <b className="positive">{money(cashflow.income)}</b>
          </button>
          <span>−</span>
          <button onClick={() => navigate("Expenses")}>
            <span>Expenses</span>
            <b>{money(cashflow.expenses)}</b>
          </button>
          <span>+</span>
          <div>
            <span>Other changes*</span>
            <b>
              {change !== null ? money(change - cashflow.net) : "Not available"}
            </b>
          </div>
          <span>=</span>
          <div>
            <span>Closing assets</span>
            <b>{money(amount)}</b>
          </div>
        </div>
        <p className="hint">
          * Includes investment movements, currency changes, balance corrections
          and unexplained differences. Unrealized gains since purchase are not
          treated as this month’s return.
        </p>
      </Panel>
    </>
  );
}
