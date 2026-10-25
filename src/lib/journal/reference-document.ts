import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ReferenceState } from "./reference-state";

export function serializeJournalBootstrap(value: unknown) {
  return JSON.stringify(value).replaceAll("<", "\\u003c").replaceAll("\u2028", "\\u2028").replaceAll("\u2029", "\\u2029");
}

export async function referenceDocument(state: ReferenceState, revision: number, ownerId: string) {
  const [document, styles] = await Promise.all([
    readFile(path.join(process.cwd(), "src/lib/journal/reference/journal.html"), "utf8"),
    readFile(path.join(process.cwd(), "src/app/journal/journal.css"), "utf8"),
  ]);
  return document.replace("</head>", `<style>${styles}</style></head>`).replace("/* JOURNAL_BOOTSTRAP */", `window.__journal=${serializeJournalBootstrap({ state, revision, ownerId })};`);
}
