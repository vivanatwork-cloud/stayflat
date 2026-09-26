// Read only for migration from the earlier browser-only workspace.
export function wealthStorageKey(ownerId: string) {
  return `stayflat.wealth.v1:${ownerId}`;
}
