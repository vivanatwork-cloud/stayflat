"use client";

import { useMutation } from "convex/react";
import type { FunctionArgs } from "convex/server";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { FlatlineMark } from "@/components/brand/flatline-mark";
import { AccountMenu } from "@/components/brand/account-menu";

export type Answers = FunctionArgs<typeof api.onboarding.save>["answers"];
type Question = {
  key: Exclude<keyof Answers, "venuesOther">;
  title: string;
  help?: string;
  type: "single" | "multi";
  options: string[];
  other?: boolean;
};
const questions: Question[] = [
  {
    key: "markets",
    title: "What do you trade?",
    help: "Choose all that apply.",
    type: "multi",
    options: [
      "Crypto perpetuals",
      "Crypto spot",
      "Stocks",
      "Stock options",
      "Futures",
      "Forex",
    ],
  },
  {
    key: "venues",
    title: "Where do you trade?",
    help: "Choose your main exchanges or brokers.",
    type: "multi",
    options: ["Hyperliquid", "Bybit", "Coinbase", "Zerodha", "Other"],
    other: true,
  },
  {
    key: "tenure",
    title: "How long have you been trading?",
    type: "single",
    options: [
      "Under 6 months",
      "6 to 12 months",
      "1 to 3 years",
      "More than 3 years",
    ],
  },
  {
    key: "stop",
    title: "How often do you set a stop-loss before entering?",
    type: "single",
    options: ["Every trade", "Most trades", "Sometimes", "Never"],
  },
  {
    key: "risk",
    title: "How do you normally limit the loss on one trade?",
    help: "Choose the answer closest to what you actually do.",
    type: "single",
    options: [
      "A stop-loss and fixed account percentage",
      "Position size",
      "A manual exit",
      "A hedge",
      "Liquidation price",
      "I do not have a clear limit",
    ],
  },
  {
    key: "leaks",
    title: "Where does it tend to fall apart?",
    help: "Choose all that apply.",
    type: "multi",
    options: [
      "Overtrading",
      "Revenge trading after a loss",
      "Oversizing",
      "Moving or removing stops",
      "Holding losers too long",
      "Chasing entries",
      "Trading tired or emotional",
      "Trading without a plan",
    ],
  },
  {
    key: "flags",
    title: "In the last 12 months, has any of this been true?",
    help: "This helps us understand whether coaching is the right kind of support. Choose all that apply.",
    type: "multi",
    options: [
      "I traded with money I could not afford to lose",
      "I increased my size to win back losses",
      "I tried to cut back or stop and could not",
      "I hid my trading or losses from people close to me",
      "Trading harmed my sleep, relationships, or work",
      "None of these",
    ],
  },
  {
    key: "goal",
    title: "What would better trading behavior look like for you?",
    type: "single",
    options: [
      "Stop blowing up accounts",
      "Take smaller, calmer losses",
      "Stick to my plan",
      "Trade less",
      "Feel more in control",
    ],
  },
  {
    key: "profitability",
    title: "Are you profitable?",
    help: "Choose the answer that best describes your trading today.",
    type: "single",
    options: ["Yes", "No", "I don't know", "Break even"],
  },
];

function hasValue(question: Question, answers: Answers) {
  const value = answers[question.key];
  if (
    question.type === "multi" &&
    (!Array.isArray(value) || value.length === 0)
  )
    return false;
  if (question.type === "single" && typeof value !== "string") return false;
  return !(
    question.other &&
    Array.isArray(value) &&
    (value as readonly string[]).includes("Other") &&
    !String(answers.venuesOther || "").trim()
  );
}

export function OnboardingFlow({
  initialAnswers,
  initialStep,
  hasPaid,
}: {
  initialAnswers: Answers;
  initialStep: number;
  hasPaid: boolean;
}) {
  const save = useMutation(api.onboarding.save);
  const [step, setStep] = useState(initialStep);
  const [answers, setAnswers] = useState<Answers>(initialAnswers);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [returnToReview, setReturnToReview] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const finalStep = questions.length + 1;

  useEffect(() => {
    heading.current?.focus();
  }, [step]);

  async function persist(nextStep: number, nextAnswers = answers) {
    if (saving) return;
    const destination = returnToReview ? finalStep : nextStep;
    setSaving(true);
    setSaveError("");
    try {
      await save({
        answers: nextAnswers,
        step: destination,
        completed: destination === finalStep,
      });
      setStep(destination);
      setReturnToReview(false);
    } catch {
      setSaveError("Couldn’t save your answers. Try again.");
    } finally {
      setSaving(false);
    }
  }
  function choose(question: Question, option: string) {
    setAnswers((current) => {
      if (question.type === "single")
        return { ...current, [question.key]: option } as Answers;
      const selected = Array.isArray(current[question.key])
        ? (current[question.key] as string[])
        : [];
      let next: string[];
      if (option === "None of these")
        next = selected.includes(option) ? [] : [option];
      else
        next = selected.includes(option)
          ? selected.filter((item) => item !== option)
          : [...selected.filter((item) => item !== "None of these"), option];
      return { ...current, [question.key]: next } as Answers;
    });
    setSaveError("");
  }
  const progress = Math.round((step / finalStep) * 100);
  const question = questions[step - 1];
  return (
    <div className="onboarding-page">
      <header className="onboarding-top">
        <div className="onboarding-top-inner">
          <Link className="site-brand" href="/">
            <FlatlineMark />
            StayFlat
          </Link>
          <div className="onboarding-account">
            <span>
              {step === 0
                ? "Onboarding"
                : step === finalStep
                  ? "Complete"
                  : `Question ${step} of ${questions.length}`}
            </span>
            <AccountMenu initialHasPaid={hasPaid} />
          </div>
        </div>
        <div
          className="onboarding-progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={questions.length}
          aria-valuenow={Math.min(step, questions.length)}
          aria-label={`${progress}% complete`}
        >
          <span style={{ width: `${progress}%` }} />
        </div>
      </header>
      <main className="onboarding-shell">
        {step === 0 && (
          <section>
            <p className="onboarding-eyebrow">Before the trades</p>
            <h1 ref={heading} tabIndex={-1}>
              First, we understand the <em>trader</em>.
            </h1>
            <p className="onboarding-lead">
              Nine honest questions help us understand you better and shape the
              report around what you actually need.
            </p>
            <div className="onboarding-privacy">
              <strong>How your answers are used</strong>
              <p>
                Your answers are saved to your StayFlat account and used to
                prepare your report and coaching. They are not a diagnosis. You
                can ask us to delete them.
              </p>
            </div>
          </section>
        )}
        {question && (
          <section>
            <p className="onboarding-eyebrow">
              {String(step).padStart(2, "0")}
            </p>
            <h1 ref={heading} tabIndex={-1}>
              {question.title}
            </h1>
            {question.help && (
              <p className="onboarding-lead">{question.help}</p>
            )}
            <div
              className="onboarding-options"
              role="group"
              aria-label={question.title}
            >
              {question.options.map((option) => {
                const value = answers[question.key];
                const selected = Array.isArray(value)
                  ? (value as readonly string[]).includes(option)
                  : value === option;
                return (
                  <button
                    type="button"
                    className={`onboarding-option${selected ? " selected" : ""}`}
                    aria-pressed={selected}
                    onClick={() => choose(question, option)}
                    key={option}
                  >
                    <span
                      className={question.type === "single" ? "radio" : "check"}
                      aria-hidden="true"
                    />
                    {option}
                  </button>
                );
              })}
            </div>
            {question.other &&
              Array.isArray(answers[question.key]) &&
              (answers[question.key] as readonly string[] | undefined)?.includes("Other") && (
                <label className="onboarding-other">
                  Exchange or broker name
                  <input
                    value={String(answers.venuesOther || "")}
                    onChange={(event) =>
                      setAnswers((current) => ({
                        ...current,
                        venuesOther: event.target.value.slice(0, 80),
                      }))
                    }
                  />
                </label>
              )}
          </section>
        )}
        {step === finalStep && (
          <OnboardingSummary
            answers={answers}
            heading={heading}
            onEdit={(editStep) => {
              setReturnToReview(true);
              setSaveError("");
              setStep(editStep);
            }}
          />
        )}
      </main>
      <footer className="onboarding-nav">
        <div>
          {step > 0 && (
            <button
              type="button"
              className="onboarding-back"
              onClick={() => {
                setSaveError("");
                if (returnToReview) {
                  setReturnToReview(false);
                  setStep(finalStep);
                  return;
                }
                setStep(step - 1);
              }}
            >
              {returnToReview ? "Cancel edit" : "← Back"}
            </button>
          )}
          {step !== finalStep && <button
            type="button"
            className="landing-button"
            disabled={
              saving ||
              Boolean(question && !hasValue(question, answers))
            }
            onClick={() => persist(step + 1)}
          >
            {saving
              ? "Saving…"
              : saveError
                ? "Try again"
                : returnToReview
                  ? "Save change"
                  : step === 0
              ? "Start"
              : step === questions.length
                ? "Review answers"
                : "Continue"}
          </button>}
        </div>
        {saveError && <p className="onboarding-save-error" role="alert">{saveError}</p>}
      </footer>
    </div>
  );
}

function OnboardingSummary({
  answers,
  heading,
  onEdit,
}: {
  answers: Answers;
  heading: React.RefObject<HTMLHeadingElement | null>;
  onEdit: (step: number) => void;
}) {
  const rows: [string, string | string[] | undefined, number][] = [
    ["Trades", answers.markets, 1],
    ["Where", answers.venues, 2],
    ["Experience", answers.tenure, 3],
    ["Stop-loss", answers.stop, 4],
    ["Loss limit", answers.risk, 5],
    ["Patterns", answers.leaks, 6],
    ["Support check", answers.flags, 7],
    ["Goal", answers.goal, 8],
    ["Profitability", answers.profitability, 9],
  ];
  return (
    <section>
      <p className="onboarding-eyebrow">Your starting point</p>
      <h1 ref={heading} tabIndex={-1}>
        Here’s what we’ll focus on first.
      </h1>
      <p className="onboarding-lead">
        Review your answers before continuing. You can change any answer below.
      </p>
      <dl className="onboarding-summary">
        {rows.map(([label, value, editStep]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>
              {label === "Where" && Array.isArray(value)
                ? value.map((item) => item === "Other" && answers.venuesOther ? `Other — ${answers.venuesOther}` : item).join(", ")
                : Array.isArray(value) ? value.join(", ") : String(value || "—")}
            </dd>
            <button
              type="button"
              onClick={() => onEdit(editStep)}
              aria-label={`Edit ${label}`}
            >
              Edit
            </button>
          </div>
        ))}
      </dl>
      <Link className="landing-button onboarding-payment" href="/report">
        Continue to my free wallet report
      </Link>
    </section>
  );
}
