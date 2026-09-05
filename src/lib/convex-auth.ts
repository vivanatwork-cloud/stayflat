import { auth } from "@clerk/nextjs/server";

type ClerkAuth = Awaited<ReturnType<typeof auth>>;

export async function getConvexToken(session?: ClerkAuth) {
  const currentSession = session ?? (await auth());
  return (await currentSession.getToken()) ?? undefined;
}
