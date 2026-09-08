# Mindset Channel Prompt Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a WhatsApp mindset-channel invitation for signed-in members who have generated a report.

**Architecture:** A small client component owns display timing and browser-level dismissal state. The report page supplies eligibility from saved report history or a newly generated report. The prompt reuses the existing dialog styles and has its own storage keys.

**Tech Stack:** Next.js, React, TypeScript, native HTML dialog, CSS.

**Spec:** `docs/superpowers/specs/2026-09-08-mindset-channel-prompt.md`

## Global Constraints

- Do not change paid access or authentication.
- Do not stack this prompt over the Telegram prompt.
- Keep the join link and dismissal state separate from Telegram.

---

## Task 1: Build the prompt

- [x] Add the client dialog component.
- [x] Store joined and dismissed state with versioned keys.
- [x] Delay opening and skip it when another dialog is open.

## Task 2: Connect report eligibility

- [x] Show it to members with saved report history.
- [x] Show it after a newly generated report appears.

## Task 3: Style and verify

- [x] Reuse the existing StayFlat dialog design with a restrained WhatsApp-green action.
- [x] Run tests, lint, and a production build.
- [ ] Deploy to production and verify the domain points to the new deployment.
