import type { Metadata } from "next";
import { auth, currentUser } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { fetchQuery } from "convex/nextjs";
import { redirect } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import { ReferenceJournal } from "@/components/journal/reference-journal";
import { getConvexToken } from "@/lib/convex-auth";
import { parseReferenceState, referenceToLegacy } from "@/lib/journal/reference-state";
import { referenceDocument } from "@/lib/journal/reference-document";
import "./journal.css";

export const metadata: Metadata = {
  title: "Trading Journal",
  description: "Record each trade, the decision behind it, and the state you were in.",
};

export default async function JournalPage() {
  const session = await auth();
  if (!session.userId) redirect("/sign-in?redirect_url=/journal");

  const [user, token] = await Promise.all([currentUser(), getConvexToken(session)]);
  if (!token) redirect("/sign-in?redirect_url=/journal");

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const writeSecret = process.env.PAYMENT_WRITE_SECRET;
  const primaryEmail = user?.primaryEmailAddress;
  const email = primaryEmail?.verification?.status === "verified"
    ? primaryEmail.emailAddress.trim().toLowerCase()
    : undefined;

  let hasPaid: boolean | undefined;
  if (convexUrl && writeSecret && email) {
    const convex = new ConvexHttpClient(convexUrl);
    const access = await convex.mutation(api.payments.claimLegacyAccountByEmail, {
      writeSecret,
      ownerId: session.userId,
      email,
    });
    hasPaid = access.hasPaid;
  }
  if (hasPaid === undefined)
    hasPaid = await fetchQuery(api.payments.hasPaid, {}, { token });
  if (!hasPaid) redirect("/payment");

  const saved = await fetchQuery(api.journals.referenceGet, {}, { token });
  const state = parseReferenceState(JSON.parse(saved.state));
  const document = await referenceDocument(state, saved.revision, session.userId);
  return <ReferenceJournal document={document} trades={referenceToLegacy(state, 0).trades} initialTarget={state.target ?? null} initialCapital={state.tradingCapital ?? 0} />;
}
