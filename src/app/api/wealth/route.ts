import { auth } from "@clerk/nextjs/server";
import { fetchQuery, fetchMutation } from "convex/nextjs";
import { api } from "../../../../convex/_generated/api";
import { getConvexToken } from "@/lib/convex-auth";
import { encodeWealth, MAX_WEALTH_BYTES } from "@/lib/wealth/persistence";
const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
function failure(error: unknown) {
  const message = String(error);
  if (message.includes("PAYMENT_REQUIRED"))
    return json({ error: "Paid membership is required." }, 402);
  if (message.includes("WEALTH_CONFLICT"))
    return json(
      {
        error:
          "Another tab or device saved newer records. Export your unsaved changes, then reload to see the latest copy.",
      },
      409,
    );
  if (message.includes("ACCOUNT_CHANGED"))
    return json(
      { error: "Your signed-in account changed. Reload before editing." },
      409,
    );
  if (message.includes("WEALTH_TOO_LARGE"))
    return json(
      {
        error:
          "This workspace exceeds the current 3 MB or 6,000 record limit. Export a backup before reducing its size.",
      },
      413,
    );
  return json(
    {
      error:
        "Could not reach your account storage. Your changes have not been saved.",
    },
    503,
  );
}
export async function GET() {
  const session = await auth();
  if (!session.userId)
    return json({ error: "Sign in to open your records." }, 401);
  const token = await getConvexToken(session);
  if (!token) return json({ error: "Please sign in again." }, 401);
  try {
    return json({
      ...(await fetchQuery(api.wealth.get, {}, { token })),
      ownerId: session.userId,
    });
  } catch (e) {
    return failure(e);
  }
}
export async function PUT(request: Request) {
  const session = await auth();
  if (!session.userId)
    return json({ error: "Sign in to save your records." }, 401);
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return json({ error: "Invalid request origin." }, 403);
  const token = await getConvexToken(session);
  if (!token) return json({ error: "Please sign in again." }, 401);
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > MAX_WEALTH_BYTES + 10000)
    return failure("WEALTH_TOO_LARGE");
  let body;
  try {
    body = JSON.parse(raw);
    if (body.ownerId !== session.userId) return failure("ACCOUNT_CHANGED");
    if (!Number.isSafeInteger(body.revision) || body.revision < 0)
      throw Error();
    encodeWealth(body.data);
  } catch (e) {
    if (String(e).includes("WEALTH_TOO_LARGE")) return failure(e);
    return json(
      { error: "These records could not be validated. Nothing was saved." },
      400,
    );
  }
  try {
    return json(
      await fetchMutation(
        api.wealth.save,
        {
          data: JSON.stringify(body.data),
          revision: body.revision,
          expectedOwner: session.userId,
        },
        { token },
      ),
    );
  } catch (e) {
    return failure(e);
  }
}
