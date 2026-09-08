"use client";

import { useEffect, useRef } from "react";

const JOINED_KEY = "stayflat-mindset-channel-2026-09-08-joined";
const DISMISSED_KEY = "stayflat-mindset-channel-2026-09-08-dismissed-at";
const REMIND_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

export function MindsetChannelPrompt({ eligible }: { eligible: boolean }) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!eligible) return;
    const joined = localStorage.getItem(JOINED_KEY) === "true";
    const dismissedAt = Number(localStorage.getItem(DISMISSED_KEY) ?? 0);
    if (joined || Date.now() - dismissedAt < REMIND_AFTER_MS) return;

    const timer = window.setTimeout(() => {
      const dialog = dialogRef.current;
      if (!document.querySelector("dialog[open]") && dialog && !dialog.open) dialog.showModal();
    }, 1400);

    return () => window.clearTimeout(timer);
  }, [eligible]);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    dialogRef.current?.close();
  };

  const joined = () => {
    localStorage.setItem(JOINED_KEY, "true");
    dialogRef.current?.close();
  };

  return (
    <dialog className="feedback-group-dialog mindset-channel-dialog" ref={dialogRef} onCancel={dismiss}>
      <button className="feedback-group-close" type="button" onClick={dismiss} aria-label="Close mindset tips invitation">×</button>
      <p className="feedback-group-eyebrow">Daily mindset practice</p>
      <h2>Build the mindset behind better trades.</h2>
      <p>Join the StayFlat WhatsApp channel for short, practical mindset-building tips delivered daily.</p>
      <div className="feedback-group-actions mindset-channel-actions">
        <a href="https://whatsapp.com/channel/0029Vb82NvZHFxOzQgAoqn0R" target="_blank" rel="noreferrer" onClick={joined}>Join the WhatsApp channel</a>
        <button type="button" onClick={dismiss}>Not now</button>
      </div>
      <small>Not now will remind you again in seven days.</small>
    </dialog>
  );
}
