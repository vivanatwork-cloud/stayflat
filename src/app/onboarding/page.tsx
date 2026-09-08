import type { Metadata } from "next";
import { auth, currentUser } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { fetchQuery } from "convex/nextjs";
import { redirect } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import { OnboardingFlow, type Answers } from "@/components/onboarding/onboarding-flow";
import { getConvexToken } from "@/lib/convex-auth";

export const metadata: Metadata = { title: "Onboarding" };

export default async function Onboarding() {
  const session = await auth();
  if (!session.userId) redirect("/sign-in?redirect_url=/onboarding");

  const [user, token] = await Promise.all([currentUser(), getConvexToken(session)]);
  if (!token) redirect("/sign-in?redirect_url=/onboarding");

  const primaryEmail = user?.primaryEmailAddress;
  const email = primaryEmail?.verification?.status === "verified"
    ? primaryEmail.emailAddress.trim().toLowerCase()
    : undefined;
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const writeSecret = process.env.PAYMENT_WRITE_SECRET;
  let hasPaid: boolean | undefined;

  if (email && convexUrl && writeSecret) {
    const convex = new ConvexHttpClient(convexUrl);
    const recovered = await convex.mutation(api.payments.claimLegacyAccountByEmail, {
      writeSecret,
      ownerId: session.userId,
      email,
    });
    hasPaid = recovered.hasPaid;
  }

  const [saved, paid] = await Promise.all([
    fetchQuery(api.onboarding.get, {}, { token }),
    hasPaid === undefined
      ? fetchQuery(api.payments.hasPaid, {}, { token })
      : Promise.resolve(hasPaid),
  ]);

  return (
    <OnboardingFlow
      initialAnswers={(saved?.answers ?? {}) as Answers}
      initialStep={Math.min(saved?.step ?? 0, 10)}
      hasPaid={paid}
    />
  );
}
