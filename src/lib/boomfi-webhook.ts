import { createVerify } from "node:crypto";

const MAX_TIMESTAMP_AGE_SECONDS = 300;

type BoomFiPayload = {
  id?: unknown;
  org_id?: unknown;
  status?: unknown;
  event?: unknown;
  reference?: unknown;
  properties?: { test_mode?: unknown };
  plan?: { id?: unknown };
  customer?: { email?: unknown; reference?: unknown };
};

export type VerifiedBoomFiPayment = {
  paymentId: string;
  email: string;
  customerReference?: string;
};

export class BoomFiWebhookError extends Error {
  constructor(
    message: string,
    readonly kind: "authentication" | "payload",
  ) {
    super(message);
    this.name = "BoomFiWebhookError";
  }
}

function payloadError(message: string): never {
  throw new BoomFiWebhookError(message, "payload");
}

function normalizePublicKey(value: string) {
  return value.replace(/\\n/g, "\n").trim();
}

export function verifyBoomFiWebhook({
  body,
  timestamp,
  signature,
  publicKey,
  expectedOrgId,
  expectedPlanId,
  nowMs = Date.now(),
}: {
  body: string;
  timestamp: string;
  signature: string;
  publicKey: string;
  expectedOrgId: string;
  expectedPlanId: string;
  nowMs?: number;
}): VerifiedBoomFiPayment {
  const timestampSeconds = Number(timestamp);
  if (!Number.isFinite(timestampSeconds)) {
    throw new BoomFiWebhookError("Invalid webhook timestamp", "authentication");
  }
  if (Math.abs(nowMs / 1000 - timestampSeconds) > MAX_TIMESTAMP_AGE_SECONDS) {
    throw new BoomFiWebhookError("Webhook timestamp is stale", "authentication");
  }

  const verifier = createVerify("SHA256");
  verifier.update(Buffer.from(`${timestamp}.${body}`));
  verifier.end();
  let authentic = false;
  try {
    authentic = verifier.verify(normalizePublicKey(publicKey), signature, "base64");
  } catch {
    authentic = false;
  }
  if (!authentic) {
    throw new BoomFiWebhookError("Invalid webhook signature", "authentication");
  }

  let payload: BoomFiPayload;
  try {
    payload = JSON.parse(body) as BoomFiPayload;
  } catch {
    return payloadError("Invalid webhook JSON");
  }

  if (payload.org_id !== expectedOrgId) payloadError("Unexpected BoomFi organization");
  if (payload.plan?.id !== expectedPlanId) payloadError("Unexpected BoomFi plan");
  if (payload.properties?.test_mode === true) payloadError("Test payments cannot grant access");
  if (
    payload.event !== undefined &&
    payload.event !== "Payment.Updated" &&
    payload.event !== "Payment.Settled"
  ) {
    payloadError("Unexpected BoomFi event");
  }
  if (payload.status !== "Succeeded") payloadError("Payment has not succeeded");
  if (typeof payload.id !== "string" || !payload.id) payloadError("Missing payment ID");
  if (typeof payload.customer?.email !== "string" || !payload.customer.email.trim()) {
    payloadError("Missing customer email");
  }

  const reference = payload.customer.reference ?? payload.reference;
  return {
    paymentId: payload.id.replace(/^pay_/, ""),
    email: payload.customer.email.trim().toLowerCase(),
    customerReference:
      typeof reference === "string" && reference.trim()
        ? reference.trim()
        : undefined,
  };
}
