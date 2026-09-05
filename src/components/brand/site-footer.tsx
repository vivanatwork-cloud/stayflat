import Link from "next/link";
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <p>Master the trader, not the trade.</p>
        <nav aria-label="Footer navigation">
          <Link href="/sign-in">Sign in</Link>
          <Link href="/sign-up">Create account</Link>
          <Link href="/privacy-and-terms">Privacy and Terms</Link>
          <a href="mailto:hello@stayflat.xyz">Contact</a>
        </nav>
        <small>
          StayFlat is educational coaching, not financial or clinical advice.
          Trading involves risk and losses can exceed expectations.
        </small>
      </div>
    </footer>
  );
}
