import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { FlatlineMark } from "@/components/brand/flatline-mark";
import { SiteFooter } from "@/components/brand/site-footer";
import { SiteHeader } from "@/components/brand/site-header";

export const metadata: Metadata = {
  title: "Find the trading pattern costing you money",
  description:
    "Turn your trading history into one clear behavior pattern and a practical rule to stop repeating it. $3 once, with a report, journal, and 30-minute call.",
  alternates: { canonical: "/" },
};

const leaks = [
  "Sizing up after a loss.",
  "Dragging the stop.",
  "Revenge-trading a red candle.",
];

const steps = [
  ["Tell us how you trade", "Complete a short onboarding about your habits, goals, and the moments where discipline tends to break."],
  ["Add your trading record", "Connect a public Hyperliquid wallet or start a private manual journal. StayFlat looks for repeated behavior, not one bad trade."],
  ["Get your pattern and guardrail", "Review the evidence, use the journal, and turn the first pattern into one practical rule during a 30-minute call with Vivan."],
];

const forYou = [
  "You keep breaking rules you already understand.",
  "You have felt a late-night revenge trade take over.",
  "You suspect behavior—not another indicator—is the next thing to examine.",
];

const notForYou = [
  "You want signals, calls, or a trading system.",
  "You want someone else to decide when you should trade.",
  "You need guaranteed returns or performance promises.",
];

const questions = [
  ["What do I get for $3?", "You get a full behavior report, access to the trading journal, and one 30-minute intro call with Vivan. It is a one-time $3 payment, not a subscription."],
  ["Which trading records can I use?", "Automatic with a public Hyperliquid wallet. Other platforms start with the manual journal. You can also request support for your exchange or broker."],
  ["Do you need access to my funds?", "No. A public wallet address is read-only. StayFlat never needs your seed phrase, private key, or permission to place a trade."],
  ["Is this financial advice or therapy?", "No. StayFlat is educational coaching focused on reviewing your own record. It does not provide signals, investment advice, clinical care, or guarantees."],
];

export default function Home() {
  return (
    <div className="landing-page">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <SiteHeader />
      <main className="landing-wrap" id="main-content">
        <section className="landing-hero" aria-labelledby="hero-title">
          <p className="landing-eyebrow">Trading psychology, made practical</p>
          <h1 id="hero-title">Master the trader, not the <em>trade.</em></h1>
          <p className="landing-stand">
            Find the trading behavior costing you money, see the evidence in
            your own history, and build one rule to stop repeating it.
          </p>
          <p className="landing-hero-offer">
            <strong>Full report + journal + 30-minute call</strong>
            <span>$3 once · no subscription</span>
          </p>
          <div className="landing-actions">
            <div className="landing-primary-action">
              <Link className="landing-button" href="/sign-up">Find my trading pattern</Link>
            </div>
            <Link className="landing-text-link" href="/#sample">See a sample read <span aria-hidden="true">→</span></Link>
          </div>
          <p className="landing-cta-note">No signals. No access to your funds. Payment comes after onboarding.</p>
          <div className="landing-hero-line" aria-hidden="true"><FlatlineMark variant="wide" /></div>
        </section>

        <div className="landing-rule" />
        <section className="landing-section landing-sample" id="sample">
          <p className="landing-eyebrow">A clear read, not another chart wall</p>
          <h2>See the pattern behind the trades.</h2>
          <p className="landing-small-copy">
            A StayFlat read connects position size, timing, and recent outcomes
            so you can see what tends to happen before discipline breaks.
          </p>
          <div className="landing-sheet">
            <div className="landing-sheet-head"><span>Sample behavior read</span><span>Last 90 days · local time</span></div>
            <div className="landing-timeline" aria-hidden="true">
              <span>LOSS · 01:08</span><i /><span>NEXT FILL · 01:12</span><i /><span>SIZE ↑ 2.8×</span>
            </div>
            <div className="landing-finding"><strong>2.8×</strong><div><span>Sizing after a loss</span><p>The next position was larger than the trader&apos;s typical size.</p></div></div>
            <div className="landing-finding"><strong>4 min</strong><div><span>No cool-down</span><p>Median time from a losing fill to the next fill.</p></div></div>
            <div className="landing-finding"><strong>1–4am</strong><div><span>Loss cluster</span><p>The three-hour window where the deepest realized losses appeared.</p></div></div>
            <p className="landing-sheet-foot">Illustrative only. A real read uses your record and clearly separates observations from interpretations.</p>
          </div>
          <div className="landing-actions landing-sample-action">
            <Link className="landing-button" href="/sign-up">Find my trading pattern</Link>
          </div>
        </section>

        <div className="landing-rule" />
        <section className="landing-section landing-measure">
          <p className="landing-eyebrow">The pattern is often the problem</p>
          <h2>Your strategy may not be the part that keeps <em>failing.</em></h2>
          <p className="landing-punch">Most traders look for another indicator first. Sometimes the strategy is not the part causing the damage.</p>
          <p className="landing-cue">One bad trade hurts. A repeated response to it does more damage:</p>
          <ul className="landing-leaks">{leaks.map((item) => <li key={item}>{item}</li>)}</ul>
          <p className="landing-close">StayFlat helps you find the behavior quietly bleeding your account, then turn it into a rule you can use under pressure. <strong>Losing less is the edge we work on.</strong></p>
        </section>

        <div className="landing-rule" />
        <section className="landing-section landing-measure" id="how">
          <p className="landing-eyebrow">How it works</p>
          <h2>From trading history to one usable <em>guardrail.</em></h2>
          <ol className="landing-steps">
            {steps.map(([title, copy], index) => (
              <li className="landing-step" key={title}>
                <span className="landing-step-number" aria-hidden="true">{index + 1}</span>
                <div><h3>{title}</h3><p>{copy}</p></div>
              </li>
            ))}
          </ol>
        </section>

        <div className="landing-rule" />
        <section className="landing-section landing-trust" aria-labelledby="trust-title">
          <p className="landing-eyebrow">Know what you are agreeing to</p>
          <h2 id="trust-title">Your record helps you—not the platform.</h2>
          <div className="landing-trust-grid">
            <article><span>01 · Read-only</span><h3>No access to your funds</h3><p>A public wallet lets StayFlat read trading history. It cannot place trades or move money.</p></article>
            <article><span>02 · Transparent</span><h3>Observations, not verdicts</h3><p>The report shows the record behind each finding and separates measured facts from interpretation.</p></article>
            <article><span>03 · Narrow</span><h3>One pattern at a time</h3><p>The call turns the first useful pattern into a practical guardrail—not a new trading system.</p></article>
          </div>
        </section>

        <div className="landing-rule" />
        <section className="landing-section landing-coach">
          <div className="landing-coach-photo">
            <Image src="/vivan.jpg" alt="Vivan, founder of StayFlat" width={600} height={750} sizes="(max-width: 760px) 280px, 42vw" />
          </div>
          <div>
            <p className="landing-eyebrow">The human behind StayFlat</p>
            <h2>Meet Vivan.</h2>
            <p className="landing-prose landing-dim">Vivan has traded since 2016, learning the hard way—and entirely on his own.</p>
            <p className="landing-prose landing-dim">After blowing account after account, he realised that finding another strategy wasn&apos;t the answer. The same decisions kept producing the same losses. StayFlat was built to help traders see those patterns clearly, without selling them another signal or system.</p>
            <p className="landing-prose landing-dim">Today, Vivan trades with a prop firm, works with one of the world&apos;s largest decentralised exchanges, and shares what he has learned with more than 30,000 traders across his channels.</p>
            <p className="landing-prose landing-dim">Your intro call is private and one-to-one. With your trading history on screen, you&apos;ll identify the first repeated pattern worth working on.</p>
          </div>
        </section>

        <div className="landing-rule" />
        <section className="landing-section landing-measure" id="who">
          <p className="landing-eyebrow">Read this before you sign up</p>
          <h2>Who this is for.</h2>
          <div className="landing-split">
            <div><h3>This may help if</h3><ul>{forYou.map((item) => <li key={item}>{item}</li>)}</ul></div>
            <div className="landing-not"><h3>This is not built for you if</h3><ul>{notForYou.map((item) => <li key={item}>{item}</li>)}</ul></div>
          </div>
        </section>

        <div className="landing-rule" />
        <section className="landing-section landing-faq" id="faq">
          <p className="landing-eyebrow">Before you start</p>
          <h2>Questions worth asking.</h2>
          <div className="landing-faq-list">
            {questions.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}
          </div>
        </section>

        <div className="landing-rule" />
        <section className="landing-book" id="signup">
          <p className="landing-eyebrow">Start here</p>
          <h2>Find the pattern. Build the rule that stops it.</h2>
          <p className="landing-prose landing-dim">Complete the short onboarding first. Payment follows before the full report and journal are unlocked.</p>
          <p className="landing-offer"><strong>Full report + journal · $3 one-time</strong> · 30-minute intro call included</p>
          <div className="landing-actions landing-centered">
            <Link className="landing-button" href="/sign-up">Find my trading pattern</Link>
            <a className="landing-text-link" href="#sample">Review the sample <span aria-hidden="true">→</span></a>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
