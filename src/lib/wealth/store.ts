"use client";
import { useEffect, useState } from "react";
import { emptyData, snapshot } from "./engine";
import { demoWorkspace } from "./demo";
import type { Data, Workspace } from "./types";
import { validateWorkspace } from "./validate";
export { validateWorkspace } from "./validate";
import {wealthStorageKey} from "./access";
export function useWorkspace(ownerId:string) {
  const STORE_KEY=wealthStorageKey(ownerId);
  const [workspace, setWorkspace] = useState<Workspace>({
    version: 1,
    data: emptyData(),
    audit: [],
  });
  const [mode, setMode] = useState<"local" | "demo">("local");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) setWorkspace(validateWorkspace(JSON.parse(raw)));
      else {
        setWorkspace(demoWorkspace());
        setMode("demo");
      }
    } catch {
      setError(
        "Saved data could not be opened. Export a backup before resetting.",
      );
    }
    setReady(true);
  }, [STORE_KEY]);
  function commit(action: string, change: (d: Data) => void) {
    setWorkspace((prev) => {
      const data = structuredClone(prev.data);
      change(data);
      data.snapshots.push(snapshot(data));
      const next: Workspace = {
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
        ].slice(0, 50),
      };
      if (mode === "local") {
        try {
          localStorage.setItem(STORE_KEY, JSON.stringify(next));
        } catch {
          setError(
            "Your browser could not save this change. Export a backup now.",
          );
        }
      }
      return next;
    });
  }
  function undo() {
    setWorkspace((prev) => {
      if (!prev.audit.length) return prev;
      const next: Workspace = {
        version: 1,
        data: prev.audit[0].before,
        audit: [
          {
            id: crypto.randomUUID(),
            date: new Date().toISOString(),
            action: `Undid: ${prev.audit[0].action}`,
            before: prev.data,
          },
          ...prev.audit,
        ].slice(0, 50),
      };
      if (mode === "local")
        localStorage.setItem(STORE_KEY, JSON.stringify(next));
      return next;
    });
  }
  function switchMode(target: "local" | "demo") {
    try {
      if (target === "demo") setWorkspace(demoWorkspace());
      else {
        const raw = localStorage.getItem(STORE_KEY);
        const next = raw
          ? validateWorkspace(JSON.parse(raw))
          : { version: 1 as const, data: emptyData(), audit: [] };
        localStorage.setItem(STORE_KEY, JSON.stringify(next));
        setWorkspace(next);
      }
      setMode(target);
    } catch {
      setError("Could not open the saved workspace.");
    }
  }
  function restore(next: Workspace) {
    validateWorkspace(next);
    localStorage.setItem(STORE_KEY, JSON.stringify(next));
    setWorkspace(next);
    setMode("local");
  }
  return {
    workspace,
    mode,
    ready,
    error,
    setError,
    commit,
    undo,
    switchMode,
    restore,
  };
}
