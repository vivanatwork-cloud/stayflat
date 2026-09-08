export type BatchWalletInput = {
  address: string;
  includeLighter: boolean;
  lighterToken: string;
};

const walletPattern = /^0x[0-9a-fA-F]{40}$/;

export function parseBatchWallets(value: unknown): BatchWalletInput[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 10) return null;
  const wallets: BatchWalletInput[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const input = item as Record<string, unknown>;
    if (typeof input.address !== "string" || typeof input.includeLighter !== "boolean") return null;
    const address = input.address.trim().toLowerCase();
    const lighterToken = typeof input.lighterToken === "string" ? input.lighterToken.trim() : "";
    if (!walletPattern.test(address) || seen.has(address) || (input.includeLighter && !lighterToken)) return null;
    seen.add(address);
    wallets.push({ address, includeLighter: input.includeLighter, lighterToken });
  }
  return wallets;
}
