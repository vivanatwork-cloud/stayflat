import { auth } from "@clerk/nextjs/server";
import { fetchMutation } from "convex/nextjs";
import { api } from "../../../../../convex/_generated/api";
import { getConvexToken } from "@/lib/convex-auth";
import { parseReferenceState } from "@/lib/journal/reference-state";

export async function PUT(request: Request) {
  const session = await auth();
  if (!session.userId) return Response.json({ error: "Sign in again before saving." }, { status: 401 });
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  const token = await getConvexToken(session);
  if (!token) return Response.json({ error: "Sign in again before saving." }, { status: 401 });
  let state: ReturnType<typeof parseReferenceState>, revision: number;
  try {
    const raw = await request.text();
    if (raw.length > 3_100_000) return Response.json({ error: "This update is too large. Export a backup and reduce the import window." }, { status: 413 });
    const body = JSON.parse(raw);
    if (body.ownerId !== session.userId) return Response.json({ error: "The signed-in account changed. Reopen your journal." }, { status: 409 });
    state = parseReferenceState(body.state);
    revision = body.revision;
    if (!Number.isSafeInteger(revision) || revision < 0) throw new Error("Invalid journal revision.");
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Invalid journal data." }, { status: 400 });
  }
  try {
    const result = await fetchMutation(api.journals.referenceSave, { state: JSON.stringify(state), revision, expectedOwner: session.userId }, { token });
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("JOURNAL_CONFLICT")) return Response.json({ error: "This journal changed on another tab or device. Export your unsaved work, then reload." }, { status: 409 });
    if (message.includes("PAYMENT_REQUIRED")) return Response.json({ error: "Paid access is required to save this journal." }, { status: 402 });
    if (message.includes("ACCOUNT_CHANGED")) return Response.json({ error: "The signed-in account changed. Reopen your journal." }, { status: 409 });
    return Response.json({ error: "Your changes could not be saved. Keep this page open and retry." }, { status: 503 });
  }
}
