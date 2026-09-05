import { AuthCard } from "./auth-card";
import Link from "next/link";

export function AuthShell({ mode }: { mode: "sign-in" | "sign-up" }) {
  const signingUp = mode === "sign-up";
  return (
    <main className="auth-shell">
      <section>
        <Link className="auth-brand" href="/" aria-label="StayFlat home">
          <svg viewBox="0 0 52 22" aria-hidden="true">
            <path d="M0 16 L7 16 L11 5 L15 19 L19 9 L23 13 L27 11 L52 11" fill="none" stroke="#1C4A44" strokeWidth="1.8" />
          </svg>
          StayFlat
        </Link>
        {signingUp && <p className="auth-eyebrow">Start here</p>}
        <h1>{signingUp ? "Start your StayFlat review." : "Continue to StayFlat."}</h1>
        <p>{signingUp ? "Create one account to save your report, journal, and onboarding answers." : "Sign in to keep your reports and journal together."}</p>
      </section>
      <div className="auth-card-column">
        <AuthCard mode={mode} />
        {signingUp && <p className="auth-policy">By creating an account, you agree to StayFlat&apos;s <Link href="/privacy-and-terms">Privacy and Terms</Link>.</p>}
      </div>
    </main>
  );
}
