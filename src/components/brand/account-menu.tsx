"use client";

import { UserButton } from "@clerk/nextjs";
import { useConvexAuth, useQuery } from "convex/react";
import { useEffect, useState, type ReactNode } from "react";
import { api } from "../../../convex/_generated/api";
import { FeedbackGroupPrompt } from "./feedback-group-prompt";

function MenuEmoji({ children }: { children: ReactNode }) {
  return (
    <span className="account-menu-emoji" aria-hidden="true">
      {children}
    </span>
  );
}

function LockIcon() {
  return (
    <span
      className="account-lock"
      aria-label="Unlock after payment"
      tabIndex={0}
    >
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
          const result = (await response.json()) as { hasPaid?: boolean };
          if (!controller.signal.aborted) {
            setRecoveredHasPaid(result.hasPaid === true);
          }
        }
      } catch {
        // The live Convex query remains the fallback if recovery is unavailable.
      }
    }
    void checkAccess();
    return () => controller.abort();
  }, [isAuthenticated, knownPaid]);

  const paid = knownPaid ?? recoveredHasPaid ?? hasPaid;
  const locked = paid !== true;
  const destination = (unlockedHref: string) =>
    locked ? "/payment" : unlockedHref;
  const icon = (unlockedIcon: ReactNode) =>
    locked ? <LockIcon /> : unlockedIcon;

  return (
    <>
      <UserButton
        appearance={{
          elements: {
            userButtonPopoverActionButtonIconBox__manageAccount:
              "account-menu-manage-emoji",
            userButtonPopoverActionButtonIcon__manageAccount: {
              display: "none",
            },
            userButtonPopoverActionButtonIconBox__signOut:
              "account-menu-signout-emoji",
            userButtonPopoverActionButtonIcon__signOut: { display: "none" },
            userButtonPopoverActionButtonIconBox__signOutAll:
              "account-menu-signout-emoji",
            userButtonPopoverActionButtonIcon__signOutAll: { display: "none" },
          },
        }}
      >
        <UserButton.MenuItems>
          <UserButton.Link
            label="Wealth"
            labelIcon={icon(<MenuEmoji>🌱</MenuEmoji>)}
            href={destination("/wealth")}
          />
          <UserButton.Link
            label="Trading journal"
            labelIcon={icon(<MenuEmoji>📓</MenuEmoji>)}
            href={destination("/journal")}
          />
          <UserButton.Link
            label="Wallet Analytics"
            labelIcon={<MenuEmoji>🔎</MenuEmoji>}
            href="/report"
          />
          <UserButton.Link
            label="Schedule a call"
            labelIcon={icon(<MenuEmoji>🗓️</MenuEmoji>)}
            href={destination("https://t.me/VivanLiveTeam")}
          />
        </UserButton.MenuItems>
      </UserButton>
      {showFeedbackPrompt ? (
        <FeedbackGroupPrompt hasPaid={paid === true} />
      ) : null}
    </>
  );
}
