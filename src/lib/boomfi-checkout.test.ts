import { describe, expect, it } from "vitest";
import { buildBoomFiCheckoutUrl } from "./boomfi-checkout";

describe("buildBoomFiCheckoutUrl", () => {
  it("links checkout to the stable Clerk user ID", () => {
    const checkout = buildBoomFiCheckoutUrl({
      userId: "user_123",
      email: "buyer@example.com",
      name: "Buyer",
      origin: "https://stayflat.xyz",
    });
    expect(checkout.searchParams.get("customer_ident")).toBe("user_123");
    expect(checkout.searchParams.get("email")).toBe("buyer@example.com");
    expect(checkout.searchParams.get("redirect_to")).toBe(
      "https://stayflat.xyz/payment/success",
    );
  });
});
