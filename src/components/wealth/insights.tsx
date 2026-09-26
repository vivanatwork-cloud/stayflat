"use client";
import { useState } from "react";
import { ArrowUp, Database, Sparkles } from "lucide-react";
import { Button, Panel, Modal } from "./ui";
import { allocation, flow, total, inr } from "@/lib/wealth/engine";
import type { Data } from "@/lib/wealth/types";
import type { Money } from "./overview";
export function Insights({
  data,
  money,
  commit,
}: {
  data: Data;
  money: Money;
  commit: (a: string, c: (d: Data) => void) => void;
}) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<{ q: string; a: string }[]>([]);
  const [proposal, setProposal] = useState(false);
  function ask(q: string) {
    const month = new Date().toISOString().slice(0, 7);
    const rows = data.transactions.filter((t) => t.date.startsWith(month));
    const f = flow(data, rows);
    const text = q.toLowerCase();
    let a =
      "I can answer questions about cash, total assets, monthly income, spending and your largest expenses. Ask one of these questions using the records saved here.";
    if (/cash|bank/.test(text))
      a = `Your latest saved cash balance is ${money(allocation(data).Cash)} across ${data.accounts.filter((a) => a.type === "Cash" && !a.archived).length} active cash accounts.`;
    else if (/arcus/.test(text)) {
      const matching = rows.filter(
        (t) =>
          t.direction === "Income" &&
          /arcus/i.test(t.category + " " + t.merchant),
      );
      a = `Arcus income this month totals ${money(flow(data, matching).income)} from ${matching.length} saved entries.`;
    } else if (/largest|biggest/.test(text)) {
      const sorted = rows
        .filter((t) => t.direction === "Expense")
        .sort((a, b) =>
          Number(
            inr(b.amount, b.currency, data.fx) -
              inr(a.amount, a.currency, data.fx),
          ),
        )
        .slice(0, 3);
      a = sorted.length
        ? `Your largest recorded expenses this month: ${sorted.map((t) => `${t.merchant} (${money(t.amount, t.currency)})`).join(", ")}.`
        : "No expenses have been saved for this month.";
    } else if (/income|earn|paid/.test(text))
      a = `Recorded income this month is ${money(f.income)}. Transfers between your accounts are excluded.`;
    else if (/spen|expense|money go/.test(text))
      a = `Recorded expenses this month total ${money(f.expenses)} across ${rows.filter((t) => t.direction === "Expense").length} entries. Refunds entered as negative expenses reduce this total.`;
    else if (/worth|asset/.test(text))
      a = `Your latest total assets are ${money(total(data))}. Debts are excluded, so this is not debt-adjusted net worth. Monthly market and currency attribution is not yet fully reconciled.`;
    setMessages((old) => [...old, { q, a }]);
    setQuestion("");
  }
  return (
    <div className="insights-layout">
      <Panel className="assistant-panel">
        <div className="assistant-intro">
          <span className="assistant-icon">
            <Sparkles size={25} />
          </span>
          <h2>Understand your money.</h2>
          <p>Answers from your saved financial records.</p>
          <span className="subtle-badge">
            <Database size={12} />
            Structured answers · no language model connected
          </span>
        </div>
        <div className="suggestions">
          {[
            "How much cash do I have?",
            "What were my largest expenses?",
            "How much did Arcus pay?",
            "What are my total assets?",
          ].map((q) => (
            <button onClick={() => ask(q)} key={q}>
              {q}
              <ArrowUp size={14} />
            </button>
          ))}
        </div>
        <div className="messages" aria-live="polite">
          {messages.map((m, i) => (
            <div key={i}>
              <div className="question">{m.q}</div>
              <div className="answer">
                <Sparkles size={16} />
                <p>{m.a}</p>
              </div>
            </div>
          ))}
        </div>
        <form
          className="ask-input"
          onSubmit={(e) => {
            e.preventDefault();
            if (question.trim()) ask(question);
          }}
        >
          <input
            placeholder="Ask about your finances…"
            aria-label="Financial question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <Button
            type="submit"
            size="icon"
            aria-label="Ask question"
            disabled={!question.trim()}
          >
            <ArrowUp size={17} />
          </Button>
        </form>
      </Panel>
      <Panel title="Review suggested corrections">
        <p className="muted">
          Transactions mentioning Netflix, Spotify, Figma or Adobe can be
          grouped under Subscriptions.
        </p>
        <Button
          variant="outline"
          className="full-width"
          onClick={() => setProposal(true)}
        >
          Preview changes
        </Button>
        <p className="hint">
          Nothing changes until you confirm. You can undo the latest change in
          Data sources.
        </p>
      </Panel>
      <Modal
        open={proposal}
        onClose={() => setProposal(false)}
        title="Review category changes"
        description="Only matching expense entries will be changed."
      >
        {(() => {
          const rows = data.transactions.filter(
            (t) =>
              t.direction === "Expense" &&
              /netflix|spotify|figma|adobe/i.test(t.merchant) &&
              t.category !== "Subscriptions",
          );
          return (
            <>
              <div className="recent-list">
                {rows.map((t) => (
                  <div key={t.id}>
                    <b>{t.merchant}</b>
                    <p>{t.category} → Subscriptions</p>
                  </div>
                ))}
              </div>
              {!rows.length ? <p>No category changes are needed.</p> : null}
              <Button
                disabled={!rows.length}
                onClick={() => {
                  const ids = new Set(rows.map((t) => t.id));
                  commit(
                    `Confirmed ${rows.length} subscription category changes`,
                    (d) => {
                      d.transactions = d.transactions.map((t) =>
                        ids.has(t.id) ? { ...t, category: "Subscriptions" } : t,
                      );
                    },
                  );
                  setProposal(false);
                }}
              >
                Confirm {rows.length} changes
              </Button>
            </>
          );
        })()}
      </Modal>
    </div>
  );
}
