import { generateKeyPairSync, sign } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  BoomFiWebhookError,
  verifyBoomFiWebhook,
} from "./boomfi-webhook";

const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
});

const nowSeconds = 1_800_000_000;

function fixture(overrides: Record<string, unknown> = {}) {
  const payload = {
    id: "pay_sagar",
    org_id: "org_stayflat",
    status: "Succeeded",
    event: "Payment.Updated",
    properties: { test_mode: false },
    plan: { id: "plan_stayflat" },
    customer: {
      email: "customer@example.com",
      reference: "user_sagar",
    },
    ...overrides,
  };
  const body = JSON.stringify(payload);
  const timestamp = String(nowSeconds);
  const signature = sign(
    "sha256",
    Buffer.from(`${timestamp}.${body}`),
    privateKey,
  ).toString("base64");
  return { body, timestamp, signature };
}

function verify(overrides: Record<string, unknown> = {}) {
  const event = fixture(overrides);
  return verifyBoomFiWebhook({
    ...event,
    publicKey: publicKey.export({ type: "spki", format: "pem" }).toString(),
    expectedOrgId: "org_stayflat",
    expectedPlanId: "plan_stayflat",
    nowMs: nowSeconds * 1000,
  });
}

describe("verifyBoomFiWebhook", () => {
  it("accepts a signed live succeeded payment", () => {
    expect(verify()).toEqual({
      paymentId: "sagar",
      email: "customer@example.com",
      customerReference: "user_sagar",
    });
  });

  it("uses a top-level customer reference when BoomFi omits it from customer", () => {
    expect(
      verify({
        reference: "user_top_level",
        customer: { email: "customer@example.com" },
      }),
    ).toEqual({
      paymentId: "sagar",
      email: "customer@example.com",
      customerReference: "user_top_level",
    });
  });

  it("rejects an altered body", () => {
    const event = fixture();
    expect(() =>
      verifyBoomFiWebhook({
        ...event,
        body: event.body.replace("Succeeded", "Failed"),
        publicKey: publicKey.export({ type: "spki", format: "pem" }).toString(),
        expectedOrgId: "org_stayflat",
        expectedPlanId: "plan_stayflat",
        nowMs: nowSeconds * 1000,
      }),
    ).toThrowError(BoomFiWebhookError);
  });

  it("rejects stale timestamps", () => {
    const event = fixture();
    expect(() =>
      verifyBoomFiWebhook({
        ...event,
        publicKey: publicKey.export({ type: "spki", format: "pem" }).toString(),
        expectedOrgId: "org_stayflat",
        expectedPlanId: "plan_stayflat",
        nowMs: (nowSeconds + 301) * 1000,
      }),
    ).toThrow("Webhook timestamp is stale");
  });

  it.each([
    [{ org_id: "org_other" }, "Unexpected BoomFi organization"],
    [{ plan: { id: "plan_other" } }, "Unexpected BoomFi plan"],
    [{ properties: { test_mode: true } }, "Test payments cannot grant access"],
    [{ event: "Payment.Created" }, "Unexpected BoomFi event"],
    [{ status: "Pending" }, "Payment has not succeeded"],
  ])("rejects invalid payment data %#", (overrides, message) => {
    expect(() => verify(overrides)).toThrow(message);
  });

  it("accepts BoomFi's current payload when the event name is omitted", () => {
    expect(verify({ event: undefined })).toMatchObject({ paymentId: "sagar" });
  });
});
