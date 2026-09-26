import type { Metadata } from "next";
import { auth, currentUser } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { fetchQuery } from "convex/nextjs";
import { redirect } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import { getConvexToken } from "@/lib/convex-auth";
import WealthApp from "@/components/wealth/app";
import "./wealth.css";
export const metadata: Metadata = {
  title: "Wealth",
  description: "Your money, in one place.",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";
export default async function WealthPage() {
  const session = await auth();
  if (!session.userId) redirect("/sign-in?redirect_url=/wealth");

  const [user, token] = await Promise.all([
    currentUser(),
    getConvexToken(session),
  ]);
  if (!token) redirect("/sign-in?redirect_url=/wealth");

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const writeSecret = process.env.PAYMENT_WRITE_SECRET;
  const primaryEmail = user?.primaryEmailAddress;
  const email =
    primaryEmail?.verification?.status === "verified"
      ? primaryEmail.emailAddress.trim().toLowerCase()
      : undefined;

  let hasPaid: boolean | undefined;
  if (convexUrl && writeSecret && email) {
    const convex = new ConvexHttpClient(convexUrl);
    const access = await convex.mutation(
      api.payments.claimLegacyAccountByEmail,
      {
        writeSecret,
        ownerId: session.userId,
        email,
      },
    );
    hasPaid = access.hasPaid;
  }
  if (hasPaid === undefined)
    hasPaid = await fetchQuery(api.payments.hasPaid, {}, { token });
  if (!hasPaid) redirect("/payment");

  return (
    <section className="wealth-root">
      <WealthApp key={session.userId} ownerId={session.userId} />
    </section>
  );
}
