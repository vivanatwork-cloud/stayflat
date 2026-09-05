import { describe, expect, it, vi } from "vitest";
import { BoomFiWebhookError } from "../../../../lib/boomfi-webhook";
import { processBoomFiWebhook } from "./route";

function request() {
  return new Request("https://stayflat.xyz/api/boomfi/webhook", {
    method: "POST",
    headers: {
      "X-BoomFi-Timestamp": "1800000000",
      "X-BoomFi-Signature": "signed",
    },
    body: "raw-body",
  });
}

function dependencies() {
  const findById = vi.fn<
    (id: string) => Promise<{ id: string; emails: string[] } | null>
  >(async () => ({ id: "user_123", emails: ["buyer@example.com"] }));
  const findByEmail = vi.fn<
    (email: string) => Promise<{ id: string; emails: string[] }[]>
  >(async () => []);
  return {
    verify: vi.fn(() => ({
      paymentId: "pay_123",
      email: "buyer@example.com",
      customerReference: "user_123",
    })),
    findById,
    findByEmail,
    recordPayment: vi.fn(async () => undefined),
    config: {
      publicKey: "key" as string | undefined,
      orgId: "org",
      planId: "plan",
    },
  };
}

describe("processBoomFiWebhook", () => {
  it("records a verified payment against its Clerk reference", async () => {
    const deps = dependencies();
    const response = await processBoomFiWebhook(request(), deps);
    expect(response.status).toBe(200);
    expect(deps.recordPayment).toHaveBeenCalledWith(
      expect.objectContaining({ paymentId: "pay_123" }),
      "user_123",
    );
    expect(deps.findByEmail).not.toHaveBeenCalled();
  });

  it("falls back to an exact email match", async () => {
    const deps = dependencies();
    deps.findById.mockResolvedValue(null);
    deps.findByEmail.mockResolvedValue([{ id: "user_email", emails: ["buyer@example.com"] }]);
    const response = await processBoomFiWebhook(request(), deps);
    expect(response.status).toBe(200);
    expect(deps.recordPayment).toHaveBeenCalledWith(expect.anything(), "user_email");
  });

  it("rejects a signature error", async () => {
    const deps = dependencies();
    deps.verify.mockImplementation(() => {
      throw new BoomFiWebhookError("Invalid webhook signature", "authentication");
    });
    const response = await processBoomFiWebhook(request(), deps);
    expect(response.status).toBe(401);
    expect(deps.recordPayment).not.toHaveBeenCalled();
  });

  it("returns a retryable error when no unique account exists", async () => {
    const deps = dependencies();
    deps.findById.mockResolvedValue(null);
    const response = await processBoomFiWebhook(request(), deps);
    expect(response.status).toBe(409);
    expect(deps.recordPayment).not.toHaveBeenCalled();
  });

  it("fails closed when webhook configuration is missing", async () => {
    const deps = dependencies();
    deps.config.publicKey = undefined;
    const response = await processBoomFiWebhook(request(), deps);
    expect(response.status).toBe(503);
  });
});
