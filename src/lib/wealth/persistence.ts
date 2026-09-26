import type { Data } from "./types";
import { validateWorkspace } from "./validate";
export const MAX_WEALTH_BYTES = 3_000_000;
export type WealthRecord = {
  kind: string;
  recordId: string;
  part: number;
  payload: string;
};
const collections = [
  "accounts",
  "holdings",
  "transactions",
  "snapshots",
  "events",
  "sources",
  "cards",
  "holdingHistory",
] as const;
export function encodeWealth(value: unknown) {
  const data = validateWorkspace({ version: 1, data: value, audit: [] }).data;
  if (new TextEncoder().encode(JSON.stringify(data)).length > MAX_WEALTH_BYTES)
    throw new Error("WEALTH_TOO_LARGE");
  const settings: Record<string, unknown> = { ...data };
  const records: WealthRecord[] = [];
  for (const kind of collections) {
    delete settings[kind];
    const ids = new Set<string>();
    for (const row of data[kind] ?? []) {
      if (ids.has(row.id)) throw new Error("Duplicate record identifiers.");
      ids.add(row.id);
      const payload = JSON.stringify(row);
      let part = 0;
      for (let offset = 0; offset < payload.length;) {
        let end = Math.min(offset + 60_000, payload.length);
        if (
          end < payload.length &&
          payload.charCodeAt(end - 1) >= 0xd800 &&
          payload.charCodeAt(end - 1) <= 0xdbff
        )
          end--;
        records.push({
          kind,
          recordId: row.id,
          part: part++,
          payload: payload.slice(offset, end),
        });
        offset = end;
      }
    }
  }
  // Bound reads/writes below Convex transaction limits.
  if (records.length > 6000) throw new Error("WEALTH_TOO_LARGE");
  const encodedSettings = JSON.stringify(settings);
  if (new TextEncoder().encode(encodedSettings).length > 200_000)
    throw new Error("WEALTH_TOO_LARGE");
  return { settings: encodedSettings, records };
}
export function decodeWealth(settings: string, records: WealthRecord[]): Data {
  const data = JSON.parse(settings);
  for (const kind of collections) {
    const rows = new Map<string, WealthRecord[]>();
    for (const row of records.filter((r) => r.kind === kind))
      rows.set(row.recordId, [...(rows.get(row.recordId) ?? []), row]);
    data[kind] = [...rows.values()].map((parts) =>
      JSON.parse(
        parts
          .sort((a, b) => a.part - b.part)
          .map((p) => p.payload)
          .join(""),
      ),
    );
  }
  return validateWorkspace({ version: 1, data, audit: [] }).data;
}
