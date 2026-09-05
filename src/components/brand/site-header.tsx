import Link from "next/link";
import { AccountActions } from "./account-actions";
import { FlatlineMark } from "./flatline-mark";
import { MobileSiteMenu } from "./mobile-site-menu";

function SignedOutActions() {
  return <><Link className="site-account-sign-in" href="/sign-in">Sign in</Link><Link className="site-nav-button" href="/sign-up">Create account</Link></>;
}

export function SiteHeader() {
  const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  return <header className="site-header"><div className="site-header-inner">
    <Link className="site-brand" href="/" aria-label="StayFlat home"><FlatlineMark />StayFlat</Link>
    <nav className="site-nav" aria-label="Main navigation">
      <Link className="site-nav-link site-nav-section-link" href="#how">How it works</Link>
      <Link className="site-nav-link site-nav-section-link" href="#who">Who it&apos;s for</Link>
      <MobileSiteMenu>
          <Link href="#how">How it works</Link>
          <Link href="#who">Who it&apos;s for</Link>
          {clerkEnabled ? <AccountActions /> : <SignedOutActions />}
      </MobileSiteMenu>
      <div className="site-desktop-account">
        {clerkEnabled ? <AccountActions /> : <SignedOutActions />}
      </div>
    </nav>
  </div></header>;
}
