"use client";
import { assetWords } from "@/lib/wealth/asset-words";
import { useEffect, useRef, useState } from "react";
import { Button, Choice, Field, Panel } from "./ui";
import { EntryForm, ImportForm, type EntryKind, type Entry } from "./forms";
import { HoldingsImport } from "./holdings-import";
import { formatMoney, minor } from "@/lib/wealth/engine";
import { hasWealthGoal } from "@/lib/wealth/goal";
import {
  setupSteps,
  setupSummary,
  updateSetup,
  type SetupStep,
} from "@/lib/wealth/onboarding";
import type { Data } from "@/lib/wealth/types";
type Commit = (
  action: string,
  change: (data: Data) => void,
  options?: { snapshot?: boolean },
) => Promise<boolean>;
const copy: Record<
  SetupStep,
  { title: string; short: string; emoji: string; description: string }
> = {
  cash: {
    short: "Cash",
    emoji: "🏦",
    title: "Start with the money you can use.",
    description:
      "Add your bank accounts and cash balances as they stand today. Keep personal and business accounts separate if that helps.",
  },
  investments: {
    short: "Investments",
    emoji: "🌿",
    title: "Bring your investments into the picture.",
    description:
      "First add where you hold an investment. Then add what it is worth. Include stocks, funds, crypto, fixed deposits and your provident fund.",
  },
  activity: {
    short: "Income & spending",
    emoji: "↔️",
    title: "Give your money a little history.",
    description:
      "Add recent income and expenses, or upload a bank statement as a CSV file. A few real records are enough to start.",
  },
  commitments: {
    short: "Bills & cards",
    emoji: "🗓️",
    title: "Make room for what is coming up.",
    description:
      "Add credit card dues and repeating payments, such as rent, subscriptions or monthly investments. These become dated entries in your calendar.",
  },
  goal: {
    short: "Your goal",
    emoji: "🎯",
    title: "What would you like to work towards?",
    description:
      "Choose your own target amount. You can change it later, or leave it open for now.",
  },
  review: {
    short: "Review",
    emoji: "✨",
    title: "Here is your starting picture.",
    description:
      "Check what you have added. Anything you skipped can be filled in later; your dashboard will use only the records you have saved.",
  },
};
export function WealthOnboarding({
  data,
  confirmedData,
  status,
  commit,
}: {
  data: Data;
  confirmedData: Data;
  status: string;
  commit: Commit;
}) {
  const step = confirmedData.onboarding?.step ?? "welcome";
  const index = step === "welcome" ? -1 : setupSteps.indexOf(step);
  const summary = setupSummary(confirmedData);
  const disabled = status !== "saved";
  const [entry, setEntry] = useState<{
    kind: EntryKind;
    defaults?: Record<string, string>;
    initial?: Entry;
  } | null>(null);
  const [upload, setUpload] = useState<"bank" | "holdings" | null>(null);
  const [investmentType, setInvestmentType] = useState("Indian Stocks");
  const [goal, setGoal] = useState(hasWealthGoal(data) ? data.goal : "");
  const [growth, setGrowth] = useState(data.growth);
  const [fx, setFx] = useState(data.fxDate ? data.fx : "");
  const [verifiedFx, setVerifiedFx] = useState(Boolean(data.fxDate));
  const [error, setError] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
    setError("");
  }, [step]);
  async function move(target: typeof step, skip?: SetupStep, paused = false) {
    setError("");
    try {
      await commit(
        paused ? "Paused guided setup" : "Updated guided setup",
        (d) => updateSetup(d, target, { skip, paused }),
        { snapshot: false },
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const next = (skip = false) => {
    if (step !== "welcome")
      void move(setupSteps[index + 1] ?? "review", skip ? step : undefined);
  };
  const count = (n: number, label: string) =>
    `${n} ${n === 1 ? label : label.endsWith("y") ? label.slice(0, -1) + "ies" : label + "s"}`;
  const detail = (key: SetupStep) =>
    key === "cash"
      ? count(summary.cash, "cash account")
      : key === "investments"
        ? `${count(summary.investments, "investment")}${summary.missingInvestments.length ? ` · ${summary.missingInvestments.length} account(s) still need values` : ""}`
        : key === "activity"
          ? count(summary.activity, "transaction")
          : key === "commitments"
            ? `${count(confirmedData.events.length, "calendar entry")} · ${count(confirmedData.cards.length, "card")}`
            : key === "goal"
              ? summary.goal
                ? formatMoney(confirmedData.goal)
                : "Not set yet"
              : "";
  const savedList = (
    rows: { id: string; name: string; detail: string; onEdit?: () => void }[],
  ) =>
    rows.length ? (
      <ul className="setup-records">
        {rows.map((r) => (
          <li key={r.id}>
            <span aria-hidden="true">✓</span>
            <div>
              <strong>{r.name}</strong>
              <small>{r.detail}</small>
            </div>
            <span className="setup-saved">Saved</span>
            {r.onEdit ? (
              <Button
                variant="ghost"
                disabled={disabled}
                onClick={r.onEdit}
                aria-label={`Edit ${r.name}`}
              >
                Edit
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    ) : null;
  async function saveGoal(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      if (
        minor(goal) <= 0n ||
        !Number.isFinite(Number(growth)) ||
        Number(growth) < 0 ||
        Number(growth) > 100
      )
        throw Error(
          "Enter a positive target and a growth estimate from 0 to 100%.",
        );
      await commit(
        "Set your wealth goal",
        (d) => {
          d.goal = goal;
          d.goalSet = true;
          d.growth = growth;
          updateSetup(d, "review");
        },
        { snapshot: false },
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function finish(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      if (summary.foreign && (!verifiedFx || minor(fx) <= 0n))
        throw Error(
          "Check and confirm a positive USD to INR rate before finishing.",
        );
      await commit("Finished guided setup", (d) => {
        if (summary.foreign) {
          d.fx = fx;
          d.fxDate = new Date().toISOString().slice(0, 10);
        }
        updateSetup(d, "review", { complete: true });
      });
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <section className="wealth-setup" aria-label="Guided Wealth setup">
      <div className="setup-topline">
        <span>
          {step === "welcome"
            ? "YOUR FIRST STEPS"
            : `STEP ${index + 1} OF ${setupSteps.length}`}
        </span>
        <Button
          variant="ghost"
          disabled={disabled}
          onClick={() => void move(step, undefined, true)}
        >
          Finish later
        </Button>
      </div>
      {step !== "welcome" ? (
        <>
          <div
            className="setup-progress"
            role="progressbar"
            aria-label="Setup progress"
            aria-valuemin={0}
            aria-valuemax={6}
            aria-valuenow={index + 1}
          >
            <span style={{ width: `${((index + 1) / 6) * 100}%` }} />
          </div>
          <ol className="setup-step-list">
            {setupSteps.map((key, i) => (
              <li key={key} aria-current={key === step ? "step" : undefined}>
                <span>{i + 1}</span>
                {copy[key].short}
              </li>
            ))}
          </ol>
        </>
      ) : null}
      <Panel className="setup-card">
        <div className="setup-intro">
          <span className="setup-emoji" aria-hidden="true">
            {step === "welcome" ? "🌱" : copy[step].emoji}
          </span>
          <h2 ref={heading} tabIndex={-1}>
            {step === "welcome"
              ? "Let’s build your money picture."
              : copy[step].title}
          </h2>
          <p>
            {step === "welcome"
              ? "We’ll take this one step at a time. Add what you know, skip what does not apply, and pick up later from any device."
              : copy[step].description}
          </p>
        </div>
        {step === "welcome" ? (
          <>
            <div className="setup-welcome-grid">
              {setupSteps.slice(0, 5).map((key) => (
                <div key={key}>
                  <span aria-hidden="true">{copy[key].emoji}</span>
                  {copy[key].short}
                </div>
              ))}
            </div>
            <p className="setup-note">
              Have a bank balance handy to begin. No account numbers, passwords
              or bank connections are needed. Each saved entry belongs to your
              private StayFlat account.
            </p>
            <Button disabled={disabled} onClick={() => void move("cash")}>
              Let’s get started
            </Button>
          </>
        ) : null}
        {step === "cash" ? (
          <>
            {savedList(
              confirmedData.accounts
                .filter((a) => a.type === "Cash" && !a.archived)
                .map((a) => ({
                  id: a.id,
                  name: a.name,
                  detail: `${a.ownership} · ${formatMoney(a.balance, a.currency)}`,
                  onEdit: () => setEntry({ kind: "account", initial: a }),
                })),
            )}
            <Button
              disabled={disabled}
              onClick={() =>
                setEntry({
                  kind: "account",
                  defaults: { type: "Cash", balance: "" },
                })
              }
            >
              + Add a bank or cash account
            </Button>
            <p className="setup-note">
              Use today’s available balance. Investments come next, so there is
              no need to include them here.
            </p>
          </>
        ) : null}
        {step === "investments" ? (
          <>
            <div className="setup-actions">
              <Field label="What kind of investment?">
                <Choice
                  label="What kind of investment?"
                  value={investmentType}
                  onChange={setInvestmentType}
                  options={[
                    "Indian Stocks",
                    "US Stocks",
                    "Mutual Funds",
                    "Crypto",
                    { value: "FDs", label: "Fixed deposits" },
                    { value: "EPF", label: "Provident fund" },
                  ]}
                />
              </Field>
              <Button
                disabled={disabled}
                onClick={() =>
                  setEntry({
                    kind: "account",
                    defaults: {
                      type: investmentType,
                      currency: ["US Stocks", "Crypto"].includes(investmentType)
                        ? "USD"
                        : "INR",
                      balance: "0",
                    },
                  })
                }
              >
                + Add {assetWords(investmentType).account.toLowerCase()}
              </Button>
            </div>
            <p className="setup-note">
              Add your {assetWords(investmentType).account.toLowerCase()} first,
              then record its holdings and values below.
            </p>
            <ul className="setup-records">
              {confirmedData.accounts
                .filter((a) => a.type !== "Cash" && !a.archived)
                .map((a) => (
                  <li key={a.id}>
                    <div>
                      <strong>{a.name}</strong>
                      <small>
                        {a.type} ·{" "}
                        {count(
                          confirmedData.holdings.filter(
                            (h) => h.accountId === a.id,
                          ).length,
                          "holding",
                        )}
                      </small>
                    </div>
                    <Button
                      variant="outline"
                      disabled={disabled}
                      onClick={() =>
                        setEntry({
                          kind: "holding",
                          defaults: {
                            type: a.type,
                            accountId: a.id,
                            currency: a.currency,
                          },
                        })
                      }
                    >
                      Add value
                    </Button>
                  </li>
                ))}
            </ul>
            {savedList(
              confirmedData.holdings.map((h) => ({
                id: h.id,
                name: h.name,
                detail: formatMoney(h.value, h.currency),
                onEdit: () => setEntry({ kind: "holding", initial: h }),
              })),
            )}
            {summary.investments > 0 ? (
              <p className="setup-note">
                ✓ {count(summary.investments, "investment")} saved. Add another
                account or holding if you have more.
              </p>
            ) : null}
            {confirmedData.accounts.some(
              (a) => a.type !== "Cash" && !a.archived,
            ) ? (
              <Button
                variant="outline"
                disabled={disabled}
                onClick={() => setUpload("holdings")}
              >
                Import investment CSV
              </Button>
            ) : null}
            <p className="setup-note">
              Only know the total value? Add one holding named “Portfolio total”
              with quantity 1. Replace it with individual holdings later to
              avoid counting both.
            </p>
          </>
        ) : null}
        {step === "activity" ? (
          <>
            <div className="setup-actions">
              <Button
                disabled={
                  disabled || !confirmedData.accounts.some((a) => !a.archived)
                }
                onClick={() =>
                  setEntry({
                    kind: "transaction",
                    defaults: { direction: "Income", category: "Salary" },
                  })
                }
              >
                + Add income
              </Button>
              <Button
                variant="outline"
                disabled={
                  disabled || !confirmedData.accounts.some((a) => !a.archived)
                }
                onClick={() =>
                  setEntry({
                    kind: "transaction",
                    defaults: { direction: "Expense", category: "Other" },
                  })
                }
              >
                + Add expense
              </Button>
              <Button
                variant="outline"
                disabled={disabled || !summary.cash}
                onClick={() => setUpload("bank")}
              >
                Import bank CSV
              </Button>
            </div>
            {!confirmedData.accounts.length ? (
              <p className="setup-note">
                Add an account first so each payment has a home.{" "}
                <button
                  className="setup-text-link"
                  disabled={disabled}
                  onClick={() => void move("cash")}
                >
                  Go to accounts
                </button>
              </p>
            ) : null}
            <p className="setup-note">
              We start with “Update cash balance” off for past payments, because
              you already entered today’s balance. Turn it on only for a new
              payment that has not been included. A bank import can replace the
              balance with the statement’s closing balance; review it before
              confirming.
            </p>
            {savedList(
              confirmedData.transactions.slice(-5).map((t) => ({
                id: t.id,
                name: t.merchant,
                detail: `${t.direction} · ${formatMoney(t.amount, t.currency)}`,
                onEdit: () => setEntry({ kind: "transaction", initial: t }),
              })),
            )}
            {summary.activity > 5 ? (
              <p className="setup-note">
                {summary.activity} transactions saved in total.
              </p>
            ) : null}
          </>
        ) : null}
        {step === "commitments" ? (
          <>
            <div className="setup-actions">
              <Button
                disabled={disabled}
                onClick={() => setEntry({ kind: "event" })}
              >
                + Add a regular payment
              </Button>
              <Button
                variant="outline"
                disabled={disabled}
                onClick={() => setEntry({ kind: "card" })}
              >
                + Add a credit card
              </Button>
            </div>
            {savedList([
              ...confirmedData.events.map((e) => ({
                id: e.id,
                name: e.title,
                detail: `${e.frequency} · ${formatMoney(e.amount, e.currency)} · ${e.date}`,
                onEdit: () => setEntry({ kind: "event", initial: e }),
              })),
              ...confirmedData.cards.map((c) => ({
                id: c.id,
                name: c.name,
                detail: `${formatMoney(c.due)} due · ${c.dueDate}`,
                onEdit: () => setEntry({ kind: "card", initial: c }),
              })),
            ])}
            <p className="setup-note">
              Calendar entries help you plan; they do not create expenses
              automatically or send notifications. Credit card limits are not
              assets, and card dues are tracked separately from your total
              assets.
            </p>
          </>
        ) : null}
        {step === "goal" ? (
          <form onSubmit={saveGoal} className="setup-goal-form">
            <Field label="What amount would you like to reach? (INR)">
              <input
                type="number"
                required
                min="1"
                step=".01"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                placeholder="Enter your own amount"
              />
            </Field>
            <Field label="Annual growth estimate (%)">
              <input
                type="number"
                required
                min="0"
                max="100"
                step=".5"
                value={growth}
                onChange={(e) => setGrowth(e.target.value)}
              />
            </Field>
            <p className="setup-note">
              This estimate is for planning, not a promised return. Use 0 if you
              do not want to assume growth.
            </p>
            <Button disabled={disabled} type="submit">
              Save goal and continue
            </Button>
          </form>
        ) : null}
        {step === "review" ? (
          <form onSubmit={finish}>
            <ul className="setup-review">
              {setupSteps.slice(0, 5).map((key) => (
                <li key={key}>
                  <span aria-hidden="true">{copy[key].emoji}</span>
                  <div>
                    <strong>{copy[key].short}</strong>
                    <small>{detail(key)}</small>
                    {confirmedData.onboarding?.skipped.includes(key) ? (
                      <small>Skipped earlier · you can revisit this</small>
                    ) : null}
                  </div>
                  <Button
                    variant="ghost"
                    type="button"
                    disabled={disabled}
                    onClick={() => void move(key)}
                  >
                    Review
                  </Button>
                </li>
              ))}
            </ul>
            {summary.missingInvestments.length ? (
              <p className="setup-note">
                {summary.missingInvestments.map((a) => a.name).join(", ")} still
                need investment values. They will not contribute to total assets
                until you add holdings.
              </p>
            ) : null}
            {summary.foreign ? (
              <div className="setup-fx">
                <Field label="USD to INR rate for your dashboard">
                  <input
                    type="number"
                    required
                    min=".01"
                    step=".01"
                    value={fx}
                    onChange={(e) => {
                      setFx(e.target.value);
                      setVerifiedFx(false);
                    }}
                  />
                </Field>
                <p className="setup-note">
                  This is a manually entered rate. USD, USDC and USDT values use
                  it for INR totals; live exchange rates are not connected.
                </p>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={verifiedFx}
                    onChange={(e) => setVerifiedFx(e.target.checked)}
                    required
                  />
                  I checked this exchange rate
                </label>
              </div>
            ) : null}
            <p className="setup-note">
              Your total shows assets, not assets minus debts. You can edit
              records, import statements and return to this guide from the
              overview at any time.
            </p>
            <Button type="submit" disabled={disabled}>
              Open my dashboard
            </Button>
          </form>
        ) : null}
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
        {step !== "welcome" ? (
          <div className="setup-footer">
            <Button
              variant="ghost"
              disabled={disabled}
              onClick={() =>
                void move(index > 0 ? setupSteps[index - 1] : "welcome")
              }
            >
              ← Back
            </Button>
            <div>
              {step !== "review" ? (
                <Button
                  variant="ghost"
                  disabled={disabled}
                  onClick={() => next(true)}
                >
                  Skip for now
                </Button>
              ) : null}
              {!["goal", "review"].includes(step) ? (
                <Button
                  disabled={
                    disabled ||
                    (step === "cash"
                      ? !summary.cash
                      : step === "investments"
                        ? !summary.investments ||
                          summary.missingInvestments.length > 0
                        : step === "activity"
                          ? !summary.activity
                          : !summary.commitments)
                  }
                  onClick={() => next()}
                >
                  Continue →
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </Panel>
      <p className="setup-footnote">
        {status === "saving"
          ? "Saving before we move on…"
          : status === "error"
            ? "Your changes are not saved yet. Use Retry above to continue safely."
            : "Your saved progress follows your StayFlat account."}
      </p>
      {entry ? (
        <EntryForm
          key={
            entry.kind + (entry.initial?.id ?? JSON.stringify(entry.defaults))
          }
          kind={entry.kind}
          data={data}
          defaults={entry.defaults}
          initial={entry.initial}
          affectCashInitially={false}
          onClose={() => setEntry(null)}
          commit={commit}
        />
      ) : null}
      {upload === "bank" ? (
        <ImportForm
          data={data}
          onClose={() => setUpload(null)}
          commit={commit}
        />
      ) : null}
      {upload === "holdings" ? (
        <HoldingsImport
          data={data}
          onClose={() => setUpload(null)}
          commit={commit}
        />
      ) : null}
    </section>
  );
}
