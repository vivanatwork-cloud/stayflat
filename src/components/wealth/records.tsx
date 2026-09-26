"use client";
import { useState } from "react";
import { hasWealthGoal } from "@/lib/wealth/goal";
import {
  Search,
  Plus,
  ArrowUpRight,
  Pencil,
  Archive,
  FileText,
  Download,
  RefreshCw,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/wealth/ui-kit/table";
import { Button, Choice, Panel, Empty, Field } from "./ui";
import {
  allocation,
  categoryColors,
  decimal,
  flow,
  inr,
  minor,
  projection,
  total,
} from "@/lib/wealth/engine";
import type { Data, Ownership, Workspace } from "@/lib/wealth/types";
import type { Money } from "./overview";
import type { EntryKind } from "./forms";
import { csvEscape, download } from "@/lib/wealth/import";
type Edit = (kind: EntryKind, entry?: any) => void;
export function Records({
  page,
  data,
  money,
  owner,
  edit,
  commit,
  importHoldings,
}: {
  page: string;
  data: Data;
  money: Money;
  owner: "All" | Ownership;
  edit: Edit;
  importHoldings: () => void;
  commit: (a: string, c: (d: Data) => void) => void;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const accounts = data.accounts.filter(
    (a) => owner === "All" || a.ownership === owner,
  );
  const ids = new Set(accounts.map((a) => a.id));
  const transactions = data.transactions.filter(
    (t) =>
      (owner === "All" || t.ownership === owner) &&
      (page === "Income"
        ? t.direction === "Income"
        : page === "Expenses"
          ? t.direction === "Expense"
          : true) &&
      `${t.merchant} ${t.category} ${t.note}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (filter === "All" || t.ownership === filter),
  );
  const holdings = data.holdings.filter(
    (h) =>
      ids.has(h.accountId) &&
      (page === "Assets" ||
        (page === "FDs / EPF"
          ? ["FDs", "EPF"].includes(h.type)
          : h.type === page)) &&
      `${h.name} ${h.symbol}`.toLowerCase().includes(search.toLowerCase()),
  );
  const isTransactions = page === "Income" || page === "Expenses";
  const isCash = page === "Cash";
  const cols = isTransactions
    ? ["Date", "Description", "Category", "Ownership", "Amount", ""]
    : isCash
      ? ["Account", "Bank", "Ownership", "Balance", "Last updated", ""]
      : [
          "Asset",
          "Account",
          "Quantity",
          "Invested",
          "Current value",
          "Gain / loss",
          "",
        ];
  return (
    <>
      <div className="section-toolbar">
        <div className="search-box">
          <Search size={16} />
          <input
            placeholder={
              isTransactions
                ? "Search transactions…"
                : isCash
                  ? "Search accounts…"
                  : "Search holdings…"
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {isTransactions ? (
          <Choice
            value={filter}
            onChange={setFilter}
            options={["All", "Personal", "Business"]}
            label="Ownership filter"
          />
        ) : null}
        {!isTransactions && !isCash ? (
          <Button variant="outline" onClick={importHoldings}>
            Import holdings
          </Button>
        ) : null}
        <Button
          onClick={() =>
            edit(
              isTransactions ? "transaction" : isCash ? "account" : "holding",
            )
          }
        >
          <Plus size={16} />
          Add {isTransactions ? "entry" : isCash ? "account" : "holding"}
        </Button>
      </div>
      {isTransactions ? (
        <div className="summary-band">
          <div>
            <span>
              {page === "Income" ? "Total income" : "Total spending"} · matching
              records
            </span>
            <strong>
              {money(
                page === "Income"
                  ? flow(data, transactions).income
                  : flow(data, transactions).expenses,
              )}
            </strong>
          </div>
          <div>
            <span>Transactions</span>
            <strong>{transactions.length}</strong>
          </div>
          <div>
            <span>Largest category</span>
            <strong>
              {Object.entries(
                transactions.reduce<Record<string, number>>((r, t) => {
                  r[t.category] =
                    (r[t.category] ?? 0) +
                    Number(inr(t.amount, t.currency, data.fx));
                  return r;
                }, {}),
              ).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—"}
            </strong>
          </div>
        </div>
      ) : null}
      <Panel className="table-panel">
        <Table>
          <TableHeader>
            <TableRow>
              {cols.map((c, i) => (
                <TableHead key={i}>{c}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isTransactions
              ? transactions
                  .slice()
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="muted nowrap">{t.date}</TableCell>
                      <TableCell>
                        <b>{t.merchant}</b>
                        {t.note ? (
                          <small className="record-note">{t.note}</small>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <span className="category-pill">{t.category}</span>
                      </TableCell>
                      <TableCell>{t.ownership}</TableCell>
                      <TableCell
                        className={
                          page === "Income" ? "positive numeric" : "numeric"
                        }
                      >
                        {money(t.amount, t.currency)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Edit ${t.merchant}`}
                          onClick={() => edit("transaction", t)}
                        >
                          <Pencil size={14} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
              : isCash
                ? accounts
                    .filter(
                      (a) =>
                        a.type === "Cash" &&
                        a.name.toLowerCase().includes(search.toLowerCase()),
                    )
                    .map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>
                          <b>{a.name}</b>
                          {a.archived ? (
                            <small className="record-note">
                              Archived · excluded from total
                            </small>
                          ) : null}
                        </TableCell>
                        <TableCell>{a.institution}</TableCell>
                        <TableCell>{a.ownership}</TableCell>
                        <TableCell className="numeric">
                          {money(a.balance, a.currency)}
                        </TableCell>
                        <TableCell>
                          {new Date(a.updatedAt).toLocaleDateString("en-IN")}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={`Edit ${a.name}`}
                            onClick={() => edit("account", a)}
                          >
                            <Pencil size={14} />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            aria-label={`${a.archived ? "Restore" : "Archive"} ${a.name}`}
                            onClick={() =>
                              commit(
                                `${a.archived ? "Restored" : "Archived"} ${a.name}`,
                                (d) => {
                                  d.accounts = d.accounts.map((x) =>
                                    x.id === a.id
                                      ? { ...x, archived: !x.archived }
                                      : x,
                                  );
                                },
                              )
                            }
                          >
                            <Archive size={14} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                : holdings.map((h) => {
                    const gain = minor(h.value) - minor(h.invested);
                    return (
                      <TableRow key={h.id}>
                        <TableCell>
                          <div className="asset-cell">
                            <span
                              className="asset-avatar"
                              style={{ color: categoryColors[h.type] }}
                            >
                              {h.symbol.slice(0, 2)}
                            </span>
                            <span>
                              <b>{h.name}</b>
                              <small>
                                {h.symbol} · {h.type}
                                {h.sip
                                  ? ` · SIP ${money(h.sip, h.currency)}`
                                  : ""}
                                {h.maturity ? ` · Matures ${h.maturity}` : ""}
                              </small>
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {
                            data.accounts.find((a) => a.id === h.accountId)
                              ?.name
                          }
                        </TableCell>
                        <TableCell className="numeric">{h.quantity}</TableCell>
                        <TableCell className="numeric">
                          {money(h.invested, h.currency)}
                        </TableCell>
                        <TableCell className="numeric">
                          {money(
                            h.type === "FDs" ? h.invested : h.value,
                            h.currency,
                          )}
                        </TableCell>
                        <TableCell
                          className={
                            gain >= 0n ? "positive numeric" : "negative numeric"
                          }
                        >
                          {h.type === "FDs"
                            ? `${h.rate ?? "—"}% interest`
                            : money(gain, h.currency)}
                          {!["FDs", "EPF"].includes(h.type) &&
                          Number(h.invested) > 0 ? (
                            <small className="record-note">
                              {(
                                (Number(h.value) / Number(h.invested)) * 100 -
                                100
                              ).toFixed(2)}
                              %
                            </small>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Edit ${h.name}`}
                            onClick={() => edit("holding", h)}
                          >
                            <Pencil size={14} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
          </TableBody>
        </Table>
        {(isTransactions
          ? transactions.length
          : isCash
            ? accounts.filter((a) => a.type === "Cash").length
            : holdings.length) === 0 ? (
          <Empty
            title={search ? "No matching records" : "Nothing here yet"}
            text="Add a record or import a statement to get started."
          />
        ) : null}
      </Panel>
      {page === "Crypto" ? (
        <p className="hint">
          Each saved update creates a dated portfolio snapshot. Enter verified
          screenshot values manually until screenshot reading is connected.
        </p>
      ) : null}
      {page === "Crypto" && data.holdingHistory?.length ? (
        <Panel title="Approved portfolio snapshots">
          <div className="recent-list">
            {data.holdingHistory
              .filter((s) =>
                data.accounts.some(
                  (a) => a.id === s.accountId && a.type === "Crypto",
                ),
              )
              .slice()
              .reverse()
              .map((s) => (
                <div className="source-row" key={s.id}>
                  <span>{new Date(s.date).toLocaleString("en-IN")}</span>
                  <span>{s.holdings.length} holdings</span>
                  <strong>
                    {money(
                      s.holdings.reduce(
                        (sum, h) => sum + inr(h.value, h.currency, data.fx),
                        0n,
                      ),
                    )}
                  </strong>
                </div>
              ))}
          </div>
        </Panel>
      ) : null}
      {isCash ? (
        <Panel title="Recent account movements">
          <div className="recent-list">
            {data.transactions
              .filter((t) => ids.has(t.accountId))
              .slice(-8)
              .reverse()
              .map((t) => (
                <button key={t.id} onClick={() => edit("transaction", t)}>
                  <span>
                    <b>{t.merchant}</b>
                    <small>
                      {t.date} ·{" "}
                      {data.accounts.find((a) => a.id === t.accountId)?.name} ·{" "}
                      {t.direction}
                    </small>
                  </span>
                  <strong>{money(t.amount, t.currency)}</strong>
                </button>
              ))}
          </div>
        </Panel>
      ) : null}
    </>
  );
}
export function CalendarView({
  data,
  money,
  edit,
}: {
  data: Data;
  money: Money;
  edit: Edit;
}) {
  const all = [
    ...data.events,
    ...data.holdings
      .filter((h) => h.nextSip && h.sip)
      .map((h) => ({
        id: h.id,
        title: `${h.name} SIP`,
        date: h.nextSip!,
        amount: h.sip!,
        currency: h.currency,
        type: "SIP",
        frequency: "Monthly",
      })),
    ...data.holdings
      .filter((h) => h.maturity)
      .map((h) => ({
        id: h.id,
        title: `${h.name} maturity`,
        date: h.maturity!,
        amount: h.invested,
        currency: h.currency,
        type: "FD maturity",
        frequency: "Once",
      })),
  ].sort((a, b) => a.date.localeCompare(b.date));
  return (
    <>
      <div className="section-toolbar">
        <p className="muted">Your financial dates, in one place.</p>
        <Button onClick={() => edit("event")}>
          <Plus size={16} />
          Add event
        </Button>
      </div>
      <Panel title="Upcoming & recorded dates">
        {all.length ? (
          <div className="calendar-list">
            {all.map((e) => (
              <div key={e.id}>
                <div className="date-tile">
                  <span>
                    {new Date(e.date + "T12:00:00").toLocaleDateString(
                      "en-IN",
                      { month: "short" },
                    )}
                  </span>
                  <strong>{e.date.slice(8, 10)}</strong>
                </div>
                <div className="event-info">
                  <b>{e.title}</b>
                  <span>
                    {e.type} · {e.frequency}
                    {e.date < new Date().toISOString().slice(0, 10)
                      ? " · Review date"
                      : ""}
                  </span>
                </div>
                <strong className="numeric">
                  {money(e.amount, e.currency)}
                </strong>
                {data.events.some((x) => x.id === e.id) ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Edit ${e.title}`}
                    onClick={() => edit("event", e)}
                  >
                    <Pencil size={15} />
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <Empty
            title="No upcoming events"
            text="Add rent, subscriptions or another recurring payment."
          />
        )}
      </Panel>
    </>
  );
}
export function CardsView({
  data,
  money,
  edit,
}: {
  data: Data;
  money: Money;
  edit: Edit;
}) {
  return (
    <>
      <div className="section-toolbar">
        <p className="muted">
          Card purchases count as expenses. Repayments are transfers.
        </p>
        <Button onClick={() => edit("card")}>
          <Plus size={16} />
          Add card
        </Button>
      </div>
      <div className="cards-grid">
        {data.cards.map((c) => (
          <Panel
            key={c.id}
            title={c.name}
            aside={
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Edit ${c.name}`}
                onClick={() => edit("card", c)}
              >
                <Pencil size={15} />
              </Button>
            }
          >
            <div className="card-amount">
              <span>Payment due</span>
              <strong>{money(c.due)}</strong>
              <p>Due {c.dueDate}</p>
            </div>
            <div className="allocation-bar">
              <span
                style={{
                  width: `${Math.max(0, Math.min(100, (Number(c.available) / Number(c.limit)) * 100))}%`,
                  background: "var(--ledger-mint)",
                }}
              />
            </div>
            <div className="card-meta">
              <span>Available {money(c.available)}</span>
              <span>Limit {money(c.limit)}</span>
            </div>
            <p className="hint">
              Statement spend {money(c.spend)} · Updated{" "}
              {c.updatedAt.slice(0, 10)}
            </p>
          </Panel>
        ))}
      </div>
      {!data.cards.length ? (
        <Empty
          title="Add your first credit card"
          text="Keep its due date, spending and available limit together."
        />
      ) : null}
    </>
  );
}
export function GoalView({
  data,
  money,
  commit,
}: {
  data: Data;
  money: Money;
  commit: (a: string, c: (d: Data) => void) => void;
}) {
  const [growth, setGrowth] = useState(data.growth);
  const [goal, setGoal] = useState(hasWealthGoal(data) ? data.goal : "");
  const [error, setError] = useState("");
  const value = total(data);
  const years = projection(value, goal, growth);
  return (
    <div className="goal-page">
      <Panel title="Make room for the life you want">
        <span className="eyebrow">YOUR WEALTH GOAL</span>
        {Number(goal) > 0 ? (
          <>
            <h2 className="goal-title">{money(goal)}</h2>
            <div className="goal-progress">
              <span
                style={{
                  width: `${Math.max(0, Math.min(100, (Number(value) / 100 / Number(goal)) * 100))}%`,
                }}
              />
            </div>
            <div className="card-meta">
              <span>{money(value)} today</span>
              <span>
                {money(
                  Math.max(0, Number(goal) - Number(value) / 100).toFixed(2),
                )}{" "}
                remaining
              </span>
            </div>
            <div className="projection-result">
              <span>Estimated time to your goal</span>
              <strong>
                {years === null
                  ? "Not enough growth to project"
                  : years === 0
                    ? "Goal reached"
                    : `${years.toFixed(1)} years`}
              </strong>
              <p>
                Uses your current assets and a constant annual growth rate.
                Future income and spending are not added separately.
              </p>
            </div>
          </>
        ) : (
          <div className="goal-empty">
            <span aria-hidden="true">🌱</span>
            <h2>Start with what matters to you.</h2>
            <p className="muted">
              A home, more freedom, or a comfortable retirement. Set your own
              amount and change it whenever your plans change.
            </p>
          </div>
        )}
      </Panel>
      <Panel title="Set your own target">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            try {
              if (
                minor(goal) <= 0n ||
                !Number.isFinite(Number(growth)) ||
                Number(growth) < 0 ||
                Number(growth) > 100
              )
                throw new Error(
                  "Use a positive goal and a growth rate from 0 to 100%.",
                );
              commit("Updated your wealth goal", (d) => {
                d.goal = goal;
                d.goalSet = true;
                d.growth = growth;
              });
              setError("");
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          <Field label="Goal amount (INR)">
            <input
              type="number"
              min="1"
              step=".01"
              required
              placeholder="Enter your target amount"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
            />
          </Field>
          <Field label="Expected annual growth (%)">
            <input
              type="number"
              min="0"
              max="100"
              step=".5"
              value={growth}
              onChange={(e) => setGrowth(e.target.value)}
            />
          </Field>
          <Button type="submit" className="full-width">
            Save my goal
          </Button>
          {error ? (
            <p role="alert" className="error">
              {error}
            </p>
          ) : null}
        </form>
        <p className="hint">
          This is an estimate. Actual market performance, currency changes,
          income and spending will change the outcome.
        </p>
        <div className="insight-note">
          <p>
            A history-based projection needs at least six months of reliable
            records.
          </p>
        </div>
      </Panel>
    </div>
  );
}
export function SourcesView({
  workspace,
  money,
  commit,
  openImport,
  restore,
  undo,
}: {
  workspace: Workspace;
  money: Money;
  commit: (a: string, c: (d: Data) => void) => void;
  openImport: () => void;
  restore: (w: Workspace) => void;
  undo: () => void;
}) {
  const { data } = workspace;
  const [fx, setFx] = useState(data.fx);
  const [days, setDays] = useState(String(data.staleDays));
  const [error, setError] = useState("");
  return (
    <>
      <div className="section-toolbar">
        <p className="muted">Know where every number comes from.</p>
        <Button onClick={openImport}>
          <Plus size={16} />
          Import statement
        </Button>
      </div>
      <div className="source-grid">
        <Panel title="Accounts & freshness">
          {data.accounts.length ? (
            data.accounts.map((a) => {
              const stale =
                Date.now() - new Date(a.updatedAt).getTime() >
                data.staleDays * 86400000;
              return (
                <div className="source-row" key={a.id}>
                  <div className="source-icon">
                    <RefreshCw size={16} />
                  </div>
                  <div>
                    <b>{a.name}</b>
                    <small>
                      {a.institution} · {a.type}
                    </small>
                  </div>
                  <span className={stale ? "warning" : "muted"}>
                    {a.archived
                      ? "Archived"
                      : stale
                        ? "Update needed"
                        : a.updatedAt.slice(0, 10)}
                  </span>
                </div>
              );
            })
          ) : (
            <Empty
              title="No sources yet"
              text="Create an account, then import its statement."
            />
          )}
        </Panel>
        <Panel title="Reporting settings">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              try {
                if (minor(fx) <= 0n || Number(days) < 1)
                  throw new Error("Use a positive rate and at least one day.");
                commit("Updated reporting settings", (d) => {
                  d.fx = fx;
                  d.fxDate = new Date().toISOString().slice(0, 10);
                  d.staleDays = Number(days);
                });
                setError("");
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            <Field label="USD to INR exchange rate">
              <input
                type="number"
                step=".01"
                min=".01"
                value={fx}
                onChange={(e) => setFx(e.target.value)}
              />
            </Field>
            <p className="hint">
              Manually maintained ·{" "}
              {data.fxDate
                ? `Updated ${data.fxDate}`
                : "Set a verified rate before using real data"}
              . Earlier snapshots keep their original rate.
            </p>
            <Field label="Warn when a source is older than (days)">
              <input
                type="number"
                min="1"
                value={days}
                onChange={(e) => setDays(e.target.value)}
              />
            </Field>
            <Button type="submit">Save settings</Button>
          </form>
        </Panel>
      </div>
      <Panel title="Imported statements">
        <div className="recent-list">
          {data.sources.map((s) => (
            <div className="source-row" key={s.id}>
              <FileText size={18} />
              <span>
                <b>{s.name}</b>
                <small>
                  {s.rows} records · {s.date.slice(0, 10)}
                </small>
              </span>
              <Button
                variant="outline"
                onClick={() => download(s.name, s.raw, "text/csv")}
              >
                <Download size={14} />
                Original file
              </Button>
            </div>
          ))}
        </div>
        {!data.sources.length ? (
          <p className="muted pad-block">
            No imported statements. CSV files are retained when you confirm an
            import.
          </p>
        ) : null}
      </Panel>
      <Panel title="Your StayFlat workspace">
        <p className="muted">
          Your records and imported statements are stored privately in your
          StayFlat account. Sign in on another device to access them. You can
          also export a backup or bring over a backup from the original WealthOS
          site.
        </p>
      </Panel>
      <div className="source-grid">
        <Panel title="Your data, yours to keep">
          <div className="export-actions">
            <Button
              variant="outline"
              onClick={() =>
                download(
                  "wealthos-backup.json",
                  JSON.stringify(workspace, null, 2),
                )
              }
            >
              <Download size={15} />
              Full backup
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const rows = [
                  [
                    "Date",
                    "Description",
                    "Direction",
                    "Amount",
                    "Currency",
                    "Category",
                    "Ownership",
                  ],
                  ...data.transactions.map((t) => [
                    t.date,
                    t.merchant,
                    t.direction,
                    t.amount,
                    t.currency,
                    t.category,
                    t.ownership,
                  ]),
                ];
                download(
                  "wealthos-transactions.csv",
                  rows.map((r) => r.map(csvEscape).join(",")).join("\n"),
                  "text/csv",
                );
              }}
            >
              <Download size={15} />
              Transactions CSV
            </Button>
            <label className="restore-label">
              Restore backup
              <input
                type="file"
                accept=".json"
                onChange={async (e) => {
                  try {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    if (f.size > 15000000)
                      throw new Error("Backup is too large.");
                    restore(JSON.parse(await f.text()));
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              />
            </label>
          </div>
          <p className="hint">
            A full backup includes holdings, accounts, history and original CSV
            files. Restoring replaces the records saved to your account.
          </p>
        </Panel>
        <Panel
          title="This session’s changes"
          aside={
            <Button
              variant="ghost"
              disabled={!workspace.audit.length}
              onClick={undo}
            >
              Undo latest
            </Button>
          }
        >
          {workspace.audit.length ? (
            <div className="audit-list">
              {workspace.audit.slice(0, 6).map((a) => (
                <div key={a.id}>
                  <b>{a.action}</b>
                  <small>{new Date(a.date).toLocaleString("en-IN")}</small>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted pad-block">
              Changes you save will appear here.
            </p>
          )}
        </Panel>
      </div>
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}
export function AllocationSettings({
  data,
  commit,
}: {
  data: Data;
  commit: (a: string, c: (d: Data) => void) => void;
}) {
  const [targets, setTargets] = useState(data.targets);
  const sum = Object.values(targets).reduce((a, b) => a + b, 0);
  return (
    <Panel title="Target allocation">
      <p className="muted">
        Choose your own targets. A difference above 5 percentage points is
        highlighted.
      </p>
      <div className="target-grid">
        {Object.entries(targets).map(([k, v]) => (
          <Field key={k} label={k}>
            <input
              type="number"
              min="0"
              max="100"
              value={v}
              onChange={(e) =>
                setTargets((p) => ({ ...p, [k]: Number(e.target.value) }))
              }
            />
          </Field>
        ))}
      </div>
      <div className="form-actions">
        <span className={sum === 100 ? "muted" : "warning"}>Total {sum}%</span>
        <Button
          disabled={
            sum !== 100 || Object.values(targets).some((v) => v < 0 || v > 100)
          }
          onClick={() =>
            commit("Updated allocation targets", (d) => {
              d.targets = targets;
            })
          }
        >
          Save targets
        </Button>
      </div>
    </Panel>
  );
}
