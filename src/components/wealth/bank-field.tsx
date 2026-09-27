"use client";
import { useState } from "react";
import { Choice, Field } from "./ui";
export function BankField({
  value,
  onChange,
  banks,
  label = "Bank or provider",
}: {
  value: string;
  onChange: (v: string) => void;
  banks: string[];
  label?: string;
}) {
  const [adding, setAdding] = useState(
    banks.length === 0 || Boolean(value && !banks.includes(value)),
  );
  return (
    <>
      <Field label={label}>
        <Choice
          label={label}
          value={adding ? "new" : value ? `saved:${value}` : ""}
          onChange={(v) => {
            setAdding(v === "new");
            onChange(v === "new" ? "" : v.slice(6));
          }}
          options={[
            ...banks.map((bank) => ({ value: `saved:${bank}`, label: bank })),
            { value: "new", label: `+ Add a new ${label.toLowerCase()}` },
          ]}
        />
      </Field>
      {adding ? (
        <Field label={`New ${label.toLowerCase()} name`}>
          <input
            required
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Enter the name once"
          />
        </Field>
      ) : null}
    </>
  );
}
