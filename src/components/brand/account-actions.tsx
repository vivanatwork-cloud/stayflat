"use client";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { AccountMenu } from "./account-menu";

export function AccountActions() {
  const { isLoaded, isSignedIn } = useAuth();

  if (isLoaded && isSignedIn) return <AccountMenu />;

  return (
    <>
      <Link className="site-account-sign-in" href="/sign-in">Sign in</Link>
      <Link className="site-nav-button" href="/sign-up">Create account</Link>
    </>
  );
}
