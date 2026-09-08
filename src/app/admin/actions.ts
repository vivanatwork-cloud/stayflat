"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { fetchMutation } from "convex/nextjs";
import { revalidatePath } from "next/cache";
import { api } from "../../../convex/_generated/api";
import { isAdminEmail } from "@/lib/admin";
import { getConvexToken } from "@/lib/convex-auth";

export async function grantPaidAccess(formData: FormData) {
  const session = await auth();
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses[0]?.emailAddress;
  if (!session.userId || !user || !isAdminEmail(email)) throw new Error("Not authorized");

  const ownerId = String(formData.get("ownerId") ?? "");
  const accountEmail = String(formData.get("accountEmail") ?? "");
  const paymentEmail = String(formData.get("paymentEmail") ?? "");
  if (!ownerId || !accountEmail || !paymentEmail) throw new Error("Both emails are required");

  const token = await getConvexToken(session);
  if (!token) throw new Error("Admin access is unavailable");
  await fetchMutation(api.admin.grantPaidAccess, { ownerId, accountEmail, paymentEmail }, { token });
  revalidatePath("/admin");
}

async function requireAdminToken() {
  const session = await auth();
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses[0]?.emailAddress;
  if (!session.userId || !user || !isAdminEmail(email)) throw new Error("Not authorized");
  const token = await getConvexToken(session);
  if (!token) throw new Error("Admin access is unavailable");
  return token;
}

export async function blockUser(formData: FormData) {
  const ownerId = String(formData.get("ownerId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!ownerId || !reason) throw new Error("A block reason is required");
  const token = await requireAdminToken();
  await fetchMutation(api.admin.blockUser, { ownerId, reason }, { token });
  revalidatePath("/admin");
}

export async function unblockUser(formData: FormData) {
  const ownerId = String(formData.get("ownerId") ?? "");
  if (!ownerId) throw new Error("Account is required");
  const token = await requireAdminToken();
  await fetchMutation(api.admin.unblockUser, { ownerId }, { token });
  revalidatePath("/admin");
}
