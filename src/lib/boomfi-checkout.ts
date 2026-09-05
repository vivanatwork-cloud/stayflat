const STAYFLAT_PAY_LINK = "https://pay.boomfi.xyz/3IgWidT4TP2Z7Pef8bE5izUaFs8";

export function buildBoomFiCheckoutUrl({
  userId,
  email,
  name,
  origin,
}: {
  userId: string;
  email: string;
  name: string;
  origin: string;
}) {
  const checkout = new URL(STAYFLAT_PAY_LINK);
  checkout.searchParams.set("email", email);
  checkout.searchParams.set("name", name);
  checkout.searchParams.set("customer_ident", userId);
  checkout.searchParams.set("redirect_to", `${origin}/payment/success`);
  checkout.searchParams.set("skip_redirect_delay", "1");
  return checkout;
}
