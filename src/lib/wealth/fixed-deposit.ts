import type { Account, Data, Holding } from "./types";
import { decimal, minor } from "./engine";
export function rememberedInstitutions(data: Data, banksOnly = false) {
  const names = new Map<string, string>();
  for (const a of data.accounts) {
    if (banksOnly && !["Cash", "FDs"].includes(a.type)) continue;
    const name = a.institution.trim();
    if (name && !names.has(name.toLowerCase()))
      names.set(name.toLowerCase(), name);
  }
  return [...names.values()].sort((a, b) => a.localeCompare(b));
}
export function fixedDeposit(
  data: Data,
  values: Record<string, string>,
  id: string,
  now: string,
): { account?: Account; holding: Holding } {
  const bank = values.institution.trim(),
    name = values.name.trim();
  if (!bank || !name) throw Error("Enter the FD name and choose its bank.");
  if (
    !values.rate.trim() ||
    !Number.isFinite(Number(values.rate)) ||
    Number(values.rate) < 0 ||
    Number(values.rate) > 100
  )
    throw Error("Enter an annual interest rate from 0 to 100%.");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(values.maturity ?? "") ||
    !Number.isFinite(Date.parse(values.maturity)) ||
    new Date(values.maturity).toISOString().slice(0, 10) !== values.maturity
  )
    throw Error("Enter a valid maturity date.");
  const principal = minor(values.invested);
  if (principal <= 0n) throw Error("Enter a deposit amount greater than zero.");
  const currency = values.currency as Account["currency"],
    ownership = values.ownership as Account["ownership"];
  const existing = data.accounts.find(
    (a) =>
      !a.archived &&
      a.type === "FDs" &&
      a.institution.trim().toLowerCase() === bank.toLowerCase() &&
      a.currency === currency &&
      a.ownership === ownership,
  );
  const account = existing ?? {
    id: crypto.randomUUID(),
    name: `${bank} fixed deposits`,
    institution: bank,
    type: "FDs" as const,
    currency,
    ownership,
    balance: "0.00",
    updatedAt: now,
    archived: false,
  };
  return {
    account: existing ? undefined : account,
    holding: {
      id,
      accountId: account.id,
      name,
      symbol: "FD",
      type: "FDs",
      currency,
      quantity: "1",
      invested: decimal(principal),
      value: decimal(principal),
      rate: values.rate.trim(),
      maturity: values.maturity,
      updatedAt: now,
    },
  };
}
