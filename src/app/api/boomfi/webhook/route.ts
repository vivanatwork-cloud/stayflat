import { clerkClient } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import {
  BoomFiWebhookError,
  verifyBoomFiWebhook,
  type VerifiedBoomFiPayment,
} from "../../../../lib/boomfi-webhook";

type WebhookAccount = { id: string; emails: string[] };

type WebhookDependencies = {
  verify: (input: Parameters<typeof verifyBoomFiWebhook>[0]) => VerifiedBoomFiPayment;
  findById: (id: string) => Promise<WebhookAccount | null>;
  findByEmail: (email: string) => Promise<WebhookAccount[]>;
  recordPayment: (payment: VerifiedBoomFiPayment, ownerId: string) => Promise<void>;
  config: {
    publicKey?: string;
    orgId?: string;
    planId?: string;
  };
};

function accountHasEmail(account: WebhookAccount, email: string) {
  const normalized = email.toLowerCase();
  return account.emails.some((item) => item.toLowerCase() === normalized);
}

export async function processBoomFiWebhook(
  request: Request,
  dependencies: WebhookDependencies,
) {
  const { publicKey, orgId, planId } = dependencies.config;
  if (!publicKey || !orgId || !planId) {
    return Response.json({ error: "Webhook is not configured" }, { status: 503 });
  }

  const timestamp = request.headers.get("X-BoomFi-Timestamp");
  const signature = request.headers.get("X-BoomFi-Signature");
  if (!timestamp || !signature) {
    return Response.json({ error: "Missing webhook signature" }, { status: 401 });
  }

  let payment: VerifiedBoomFiPayment;
  try {
    payment = dependencies.verify({
      body: await request.text(),
      timestamp,
      signature,
      publicKey,
      expectedOrgId: orgId,
      expectedPlanId: planId,
    });
  } catch (error) {
    if (error instanceof BoomFiWebhookError) {
      return Response.json(
        { error: error.message },
        { status: error.kind === "authentication" ? 401 : 400 },
      );
    }
    console.error("BoomFi webhook verification failed", error);
    return Response.json({ error: "Webhook verification failed" }, { status: 400 });
  }

  let account: WebhookAccount | null = null;
  if (payment.customerReference) {
    account = await dependencies.findById(payment.customerReference);
    if (account && !accountHasEmail(account, payment.email)) account = null;
  }
  if (!account) {
    const matches = (await dependencies.findByEmail(payment.email)).filter((item) =>
      accountHasEmail(item, payment.email),
    );
    if (matches.length !== 1) {
      console.error("BoomFi payment has no unique Clerk account", {
        paymentId: payment.paymentId,
        matchCount: matches.length,
      });
      return Response.json({ error: "Customer account was not found" }, { status: 409 });
    }
    account = matches[0];
  }

  try {
    await dependencies.recordPayment(payment, account.id);
  } catch (error) {
    console.error("BoomFi payment could not be recorded", {
      paymentId: payment.paymentId,
      error,
    });
    return Response.json({ error: "Payment could not be recorded" }, { status: 500 });
  }
  return Response.json({ received: true });
}

export async function POST(request: Request) {
  const writeSecret = process.env.PAYMENT_WRITE_SECRET;
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!writeSecret || !convexUrl) {
    return Response.json({ error: "Payment storage is not configured" }, { status: 503 });
  }

  const clerk = await clerkClient();
  const convex = new ConvexHttpClient(convexUrl);
  return processBoomFiWebhook(request, {
    verify: verifyBoomFiWebhook,
    config: {
      publicKey: process.env.BOOMFI_WEBHOOK_PUBLIC_KEY,
      orgId: process.env.BOOMFI_ORG_ID,
      planId: process.env.BOOMFI_PLAN_ID,
    },
    findById: async (id) => {
      try {
        const user = await clerk.users.getUser(id);
        return { id: user.id, emails: user.emailAddresses.map((item) => item.emailAddress) };
      } catch {
        return null;
      }
    },
    findByEmail: async (email) => {
      const result = await clerk.users.getUserList({ emailAddress: [email], limit: 2 });
      return result.data.map((user) => ({
        id: user.id,
        emails: user.emailAddresses.map((item) => item.emailAddress),
      }));
    },
    recordPayment: async (payment, ownerId) => {
      await convex.mutation(api.payments.recordVerified, {
        writeSecret,
        ownerId,
        providerPaymentId: payment.paymentId,
        email: payment.email,
      });
    },
  });
}
