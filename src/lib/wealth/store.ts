"use client";
import { useEffect, useRef, useState } from "react";
import { emptyData, snapshot } from "./engine";
import { demoWorkspace } from "./demo";
import type { Data, Workspace } from "./types";
import { validateWorkspace } from "./validate";
import { encodeWealth } from "./persistence";
import { wealthStorageKey } from "./access";
export { validateWorkspace } from "./validate";
const blank = (): Workspace => ({ version: 1, data: emptyData(), audit: [] });
export function useWorkspace(ownerId: string) {
  const [workspace, setWorkspace] = useState<Workspace>(blank);
  const [mode, setMode] = useState<"local" | "demo">("local");
  const [ready, setReady] = useState(false),
    [error, setError] = useState("");
  const [status, setStatus] = useState<
    "loading" | "saved" | "saving" | "error"
  >("loading");
  const [legacy, setLegacy] = useState<Workspace | null>(null);
  const current = useRef(workspace),
    saved = useRef(workspace),
    revision = useRef(0),
    busy = useRef(false),
    unsaved = useRef(false),
    migration = useRef(false),
    active = useRef(true);
  const show = (next: Workspace) => {
    current.current = next;
    setWorkspace(next);
  };
  useEffect(() => {
    active.current = true;
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/wealth", {
          cache: "no-store",
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        if (result.ownerId !== ownerId)
          throw new Error("Your signed-in account changed. Reload this page.");
        const next = result.data
          ? validateWorkspace({
              version: 1,
              data: JSON.parse(result.data),
              audit: [],
            })
          : blank();
        if (controller.signal.aborted) return;
        revision.current = result.revision;
        saved.current = next;
        show(next);
        setReady(true);
        setStatus("saved");
        try {
          const raw = localStorage.getItem(wealthStorageKey(ownerId));
          if (raw) setLegacy(validateWorkspace(JSON.parse(raw)));
        } catch {
          setError(
            "An older browser copy could not be read. It has been left untouched.",
          );
        }
      } catch (e) {
        if (!controller.signal.aborted) {
          setError((e as Error).message);
          setStatus("error");
        }
      }
    }
    void load();
    return () => {
      active.current = false;
      controller.abort();
    };
  }, [ownerId]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (unsaved.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);
  async function persist(next: Workspace) {
    busy.current = true;
    unsaved.current = true;
    setStatus("saving");
    setError("");
    try {
      const response = await fetch("/api/wealth", {
        method: "PUT",
        signal: AbortSignal.timeout(25000),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerId,
          revision: revision.current,
          data: next.data,
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Your changes have not been saved.");
      if (!active.current) return;
      revision.current = result.revision;
      saved.current = next;
      unsaved.current = false;
      setStatus("saved");
      if (migration.current) {
        try {
          localStorage.removeItem(wealthStorageKey(ownerId));
          setLegacy(null);
        } catch {
          setError(
            "Saved to your account. The older browser copy could not be removed.",
          );
        }
        migration.current = false;
      }
    } catch (e) {
      if (active.current) {
        setError(
          (e as Error).message +
            " Keep this page open to retry or export a backup.",
        );
        setStatus("error");
      }
    } finally {
      busy.current = false;
    }
  }
  function ensureEditable() {
    if (!ready) throw new Error("Wait for your account records to load.");
    if (busy.current || unsaved.current)
      throw new Error(
        "Save or export your pending changes before editing again.",
      );
  }
  function apply(next: Workspace) {
    encodeWealth(next.data);
    show(next);
    if (mode === "local") void persist(next);
  }
  function commit(action: string, change: (d: Data) => void) {
    ensureEditable();
    const prev = current.current;
    const data = structuredClone(prev.data);
    change(data);
    data.snapshots.push(snapshot(data));
    apply({
      version: 1,
      data,
      audit: [
        {
          id: crypto.randomUUID(),
          date: new Date().toISOString(),
          action,
          before: prev.data,
        },
        ...prev.audit,
      ].slice(0, 10),
    });
  }
  function undo() {
    ensureEditable();
    const prev = current.current;
    if (!prev.audit.length) return;
    apply({
      version: 1,
      data: prev.audit[0].before,
      audit: prev.audit.slice(1),
    });
  }
  function switchMode(target: "local" | "demo") {
    ensureEditable();
    show(target === "demo" ? demoWorkspace() : saved.current);
    setMode(target);
  }
  function restore(next: Workspace) {
    ensureEditable();
    validateWorkspace(next);
    encodeWealth(next.data);
    if (
      !window.confirm(
        "Replace your account records with this backup? Export your current records first if you want to keep them.",
      )
    )
      return;
    setMode("local");
    show(next);
    void persist(next);
  }
  function migrate() {
    ensureEditable();
    if (!legacy) return;
    if (
      !window.confirm(
        "Move the older browser copy into your StayFlat account? This replaces your current account records. Export a backup first if you need both.",
      )
    )
      return;
    migration.current = true;
    setMode("local");
    show(legacy);
    void persist(legacy);
  }
  function retry() {
    if (!busy.current && unsaved.current) void persist(current.current);
    else if (!ready) window.location.reload();
  }
  return {
    workspace,
    mode,
    ready,
    error,
    setError,
    status,
    legacy,
    commit,
    undo,
    switchMode,
    restore,
    migrate,
    retry,
  };
}
