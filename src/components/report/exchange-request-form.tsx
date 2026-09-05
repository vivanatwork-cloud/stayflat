"use client";

import { FormEvent, useState } from "react";

export function ExchangeRequestForm() {
  const [exchange, setExchange] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setStatus("sending");
    setError("");
    try {
      const response = await fetch("/api/exchange-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exchange }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setStatus("sent");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We couldn't save your request.");
      setStatus("error");
    }
  }

  if (status === "sent")
    return <p className="exchange-success" role="status">Request received. We&apos;ll use it to decide which exchange ships next.</p>;
  return (
    <form className="exchange-form" onSubmit={submit}>
      <label htmlFor="exchange">Exchange name</label>
      <input id="exchange" value={exchange} onChange={(event) => setExchange(event.target.value)} placeholder="For example: Binance or Bybit" maxLength={80} required />
      <button type="submit" disabled={status === "sending"}>{status === "sending" ? "Sending…" : "Request this exchange"}</button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
