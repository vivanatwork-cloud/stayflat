import type { Metadata } from "next";
import Link from "next/link";
import { FlatlineMark } from "@/components/brand/flatline-mark";

export const metadata: Metadata = {
  title: "Privacy and Terms | StayFlat",
  description: "How StayFlat handles your account, trading, journal, and payment information, and the terms for using the service.",
};

export default function PrivacyAndTerms() {
  return (
    <main className="policy-page">
      <header>
        <Link className="site-brand" href="/" aria-label="StayFlat home"><FlatlineMark />StayFlat</Link>
        <Link href="/sign-up">Create account</Link>
      </header>
      <p className="landing-eyebrow">Privacy and Terms</p>
      <h1>How StayFlat uses your information.</h1>
      <p className="policy-intro">This page explains what StayFlat collects, why it is needed, and the rules for using the service. It was last updated on 1 September 2026.</p>

      <section id="privacy">
        <h2>Privacy</h2>
        <h3>Information StayFlat collects</h3>
        <p>When you create an account, Clerk handles your sign-in details and gives StayFlat an account identifier. StayFlat also stores your onboarding answers and progress.</p>
        <p>For an automatic report, StayFlat stores the public Hyperliquid wallet address you enter and reads its public trading history. This may include markets, position direction, entry and exit details, trade size, fees, profit or loss, and timing. Blockchain and exchange records tied to a public wallet may remain public even if you delete your StayFlat account.</p>
        <p>If you use the manual journal, StayFlat stores the information you enter, including trades, notes, strategies, emotions, fees, account balance, and trade timing. StayFlat never asks for your wallet seed phrase or private key and cannot move your funds.</p>

        <h3>Why it is used</h3>
        <p>StayFlat uses this information to sign you in, save your answers and journal, create your trading report and analytics, confirm paid access, respond to support requests, and keep the service working securely.</p>

        <h3>Where it is stored</h3>
        <p>StayFlat uses <a href="https://clerk.com/legal/privacy" target="_blank" rel="noreferrer">Clerk</a> for authentication, <a href="https://www.convex.dev/legal/privacy" target="_blank" rel="noreferrer">Convex</a> for application data, and <a href="https://www.boomfi.xyz/legal-pages" target="_blank" rel="noreferrer">BoomFi</a> for checkout. These providers may process information in countries outside your own under their privacy terms.</p>

        <h3>How long information is kept</h3>
        <p>Account, onboarding, wallet, report, and journal information is kept while your account is active. If you request deletion, StayFlat will remove the account data it controls within 30 days after confirming the request. Limited payment records may be kept where required for accounting, fraud prevention, or legal obligations. Copies in provider backups may remain until those backups are replaced under the provider&apos;s normal schedule.</p>

        <h3>Who can access it</h3>
        <p>You can access your account data after signing in. The StayFlat operator may access it only when needed to provide support, investigate a problem, protect the service, or meet a legal obligation. Clerk, Convex, and BoomFi process only the information needed to provide their part of the service. StayFlat does not sell your personal information.</p>

        <h3>Payments</h3>
        <p>BoomFi handles checkout. StayFlat stores the payment status, BoomFi payment reference, payment email, and payment date needed to unlock access. StayFlat does not store your full card number, wallet private key, or other full payment credentials.</p>

        <h3>Deleting your data and account</h3>
        <p>Email <a href="mailto:hello@stayflat.xyz">hello@stayflat.xyz</a> from the address connected to your account and ask to delete both your account and StayFlat data. StayFlat may ask you to confirm your identity before deleting it. Deletion does not remove public blockchain or Hyperliquid records, information another service must keep, or records StayFlat must retain by law.</p>

        <h3>Your choices</h3>
        <p>You may ask for a copy of your StayFlat data, correct inaccurate account information, or request deletion by emailing <a href="mailto:hello@stayflat.xyz">hello@stayflat.xyz</a>. You can choose not to provide a wallet address or journal information, but features that depend on that information will not work.</p>

        <h3>Security</h3>
        <p>StayFlat uses trusted service providers and reasonable safeguards to protect account data. No online service can promise that information will always be completely secure, so do not put passwords, seed phrases, private keys, or other secrets in journal notes.</p>
      </section>

      <section id="terms">
        <h2>Terms</h2>
        <h3>What StayFlat provides</h3>
        <p>StayFlat is an educational coaching and self-review tool. Its reports, analytics, journal, and calls are intended to help you review your own trading behaviour. StayFlat does not provide trading signals, financial advice, therapy, guaranteed returns, or a promise that losses will stop. Trading involves risk, and you remain responsible for every trading decision.</p>

        <h3>Your account</h3>
        <p>You must be at least 18 years old to use StayFlat. Keep your sign-in method secure and give accurate information. You are responsible for activity under your account and for making sure you are allowed to submit any wallet address or journal information you use.</p>

        <h3>Fair use</h3>
        <p>Do not misuse the service, try to access another person&apos;s private account data, interfere with the site, bypass paid access, copy or resell StayFlat&apos;s service, or use it for anything unlawful. StayFlat may suspend access when reasonably needed to protect users or the service.</p>

        <h3>Payment and refunds</h3>
        <p>The price and included access are shown before checkout. Payment unlocks the tools described there. Because access to the digital tools is provided immediately, all purchases are final and non-refundable once access is unlocked, except where a refund is required by law. If you were charged more than once or believe a payment was processed incorrectly, email <a href="mailto:hello@stayflat.xyz">hello@stayflat.xyz</a> so the payment can be investigated.</p>

        <h3>Service availability</h3>
        <p>StayFlat may change, pause, or remove features as the product develops. Public wallet data and third-party services can be delayed, incomplete, or unavailable. StayFlat does not promise uninterrupted access or that every calculation will be error-free. If a result matters to a financial decision, check it against the original trading records.</p>

        <h3>Changes to these terms</h3>
        <p>StayFlat may update this page when the service or its data practices change. The updated date at the top will show when that happens. If a change materially affects your rights or how your information is used, StayFlat will provide a notice on the site or through the email connected to your account before the change takes effect.</p>

        <h3>Contact</h3>
        <p>Questions about privacy, payments, these terms, or your account can be sent to <a href="mailto:hello@stayflat.xyz">hello@stayflat.xyz</a>.</p>
      </section>

      <footer><Link href="/">Return to StayFlat</Link></footer>
    </main>
  );
}
