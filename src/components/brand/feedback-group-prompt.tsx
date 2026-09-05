"use client";

import { useEffect, useRef } from "react";

const JOINED_KEY = "stayflat-feedback-group-2026-09-03-joined";
const DISMISSED_KEY = "stayflat-feedback-group-2026-09-03-dismissed-at";
const REMIND_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

export function FeedbackGroupPrompt({ hasPaid }: { hasPaid: boolean }) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!hasPaid) return;
    const joined = localStorage.getItem(JOINED_KEY) === "true";
    const dismissedAt = Number(localStorage.getItem(DISMISSED_KEY) ?? 0);
    if (joined || Date.now() - dismissedAt < REMIND_AFTER_MS) return;
    const timer = window.setTimeout(() => dialogRef.current?.showModal(), 700);
    return () => window.clearTimeout(timer);
  }, [hasPaid]);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    dialogRef.current?.close();
  };

  const joined = () => {
    localStorage.setItem(JOINED_KEY, "true");
    dialogRef.current?.close();
  };

  return (
    <dialog className="feedback-group-dialog" ref={dialogRef} onCancel={dismiss}>
      <button className="feedback-group-close" type="button" onClick={dismiss} aria-label="Close feedback group invitation">×</button>
      <p className="feedback-group-eyebrow">Paid member feedback group</p>
      <h2>Our Telegram group has a new link.</h2>
      <p>The old invite had an issue. Join the private paid-member group using this new link to share feedback and help shape StayFlat.</p>
      <div className="feedback-group-actions">
        <a href="https://t.me/+Nisy7n-riYwxNDVl" target="_blank" rel="noreferrer" onClick={joined}>Join the new group</a>
        <button type="button" onClick={dismiss}>Not now</button>
      </div>
      <small>Not now will remind you again in seven days.</small>
    </dialog>
  );
}
