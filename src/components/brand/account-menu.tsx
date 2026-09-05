"use client";

import { UserButton } from "@clerk/nextjs";
import { useConvexAuth, useQuery } from "convex/react";
import { useEffect, useState, type ReactNode } from "react";
import { api } from "../../../convex/_generated/api";
import { FeedbackGroupPrompt } from "./feedback-group-prompt";

function ReportIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16" fill="none">
      <path d="M3 13V8m5 5V3m5 10V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function JournalIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16" fill="none">
      <path d="M4 2.5h8v11H4zM6.5 6h3M6.5 9h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16" fill="none">
      <path d="M2.5 3.5h11v7h-6l-3.5 2v-2H2.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <span className="account-lock" aria-label="Unlock after payment" tabIndex={0}>
      <span aria-hidden="true">🔒</span>
      <span className="account-lock-tooltip" role="tooltip">
        Unlock after payment
      </span>
    </span>
  );
}

export function AccountMenu({
  accessConfirmed = false,
  initialHasPaid,
  showFeedbackPrompt = true,
}: {
  accessConfirmed?: boolean;
  initialHasPaid?: boolean;
  showFeedbackPrompt?: boolean;
}) {
  const { isAuthenticated } = useConvexAuth();
  const knownPaid = accessConfirmed ? true : initialHasPaid;
  const [accessChecked, setAccessChecked] = useState(knownPaid !== undefined);
  const [recoveredHasPaid, setRecoveredHasPaid] = useState<boolean | undefined>(
    knownPaid,
  );
  const hasPaid = useQuery(
    api.payments.hasPaid,
    isAuthenticated && knownPaid === undefined ? {} : "skip",
  );
  useEffect(() => {
    if (!isAuthenticated || knownPaid !== undefined) return;
    const controller = new AbortController();
    async function checkAccess() {
      try {
        const response = await fetch("/api/account/access", {
          method: "POST",
          signal: controller.signal,
        });
        if (response.ok) {
          const result = await response.json() as { hasPaid?: boolean };
          if (!controller.signal.aborted) {
            setRecoveredHasPaid(result.hasPaid === true);
          }
        }
      } catch {
        // The live Convex query remains the fallback if recovery is unavailable.
      } finally {
        if (!controller.signal.aborted) setAccessChecked(true);
      }
    }
    void checkAccess();
    return () => controller.abort();
  }, [isAuthenticated, knownPaid]);

  const paid = knownPaid ?? recoveredHasPaid ?? hasPaid;
  const locked = accessChecked && paid === false;
  const destination = (unlockedHref: string) => locked ? "/payment" : unlockedHref;
  const icon = (unlockedIcon: ReactNode) => locked ? <LockIcon /> : unlockedIcon;

  return <>
    <UserButton>
      <UserButton.MenuItems>
        <UserButton.Link label="Trading journal" labelIcon={icon(<JournalIcon />)} href={destination("/journal")} />
        <UserButton.Link label="Wallet Analytics" labelIcon={icon(<ReportIcon />)} href={destination("/report")} />
        <UserButton.Link label="Schedule a call" labelIcon={icon(<MessageIcon />)} href={destination("https://t.me/VivanLiveTeam")} />
      </UserButton.MenuItems>
    </UserButton>
    {showFeedbackPrompt ? <FeedbackGroupPrompt hasPaid={paid === true} /> : null}
  </>;
}
