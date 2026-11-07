"use client";

import { useState } from "react";
import { checkMovement } from "@/lib/stock";
import { DAMAGED, newId, type Movement, type MovementType, type Setup } from "@/lib/types";

export type MovementDraft = { type: MovementType; itemId?: string; qty?: number; from?: string; to?: string };

const TABS: { type: MovementType; label: string }[] = [
  { type: "add", label: "Add stock" },
  { type: "send", label: "Send" },
  { type: "receive", label: "Receive back" },
];

export default function MovementForm({
  setup,
  movements,
  initial,
  onSave,
  onCancel,
}: {
  setup: Setup;
  movements: Movement[];
  initial: MovementDraft;
  onSave: (m: Movement) => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState<MovementType>(initial.type);
  const [itemId, setItemId] = useState(initial.itemId ?? setup.itemTypes[0]?.id ?? "");
  const [qty, setQty] = useState(initial.qty ? String(initial.qty) : "");
  const [from, setFrom] = useState(initial.from ?? "");
  const [to, setTo] = useState(initial.to ?? "");
  const [error, setError] = useState("");

  const own = setup.locations.filter((l) => l.kind === "own_storage");
  const workers = setup.locations.filter((l) => l.kind === "job_worker");
  const fromOptions = type === "add" ? [] : type === "send" ? setup.locations : workers;
  // Fall back to the first choice whenever the saved choice isn't in the list (e.g. after switching tabs).
  const fromId = fromOptions.some((l) => l.id === from) ? from : (fromOptions[0]?.id ?? "");
  const toOptions = type === "damaged" ? [] : type === "send" ? setup.locations.filter((l) => l.id !== fromId) : own;
  const toId = type === "damaged" ? DAMAGED : toOptions.some((l) => l.id === to) ? to : (toOptions[0]?.id ?? "");
  const unit = setup.itemTypes.find((i) => i.id === itemId)?.unit ?? "";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const input = { type, itemId, qty: qty.trim() === "" ? NaN : Number(qty), from: type === "add" ? null : fromId, to: toId };
    const problem = checkMovement(input, setup, movements);
    if (problem) return setError(problem);
    onSave({ ...input, id: newId(), at: Date.now() });
  }

  const select = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-base";

  return (
    <div className="fixed inset-0 z-10 flex items-end justify-center bg-black/40 sm:items-center" onClick={onCancel}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-md space-y-4 overflow-y-auto rounded-t-2xl bg-white p-4 sm:rounded-2xl"
        noValidate
      >
        <h2 className="text-lg font-bold">{type === "damaged" ? "Mark as damaged" : "Record movement"}</h2>

        {type !== "damaged" && (
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1">
            {TABS.map((t) => (
              <button
                key={t.type}
                type="button"
                onClick={() => {
                  setType(t.type);
                  setError("");
                }}
                className={`rounded-md px-2 py-2 text-sm font-medium ${type === t.type ? "bg-white shadow" : "text-slate-600"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        <label className="block">
          <span className="font-medium">Item</span>
          <select value={itemId} onChange={(e) => setItemId(e.target.value)} className={select} disabled={type === "damaged"}>
            {setup.itemTypes.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} ({i.unit})
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="font-medium">How many {unit && `(${unit})`}</span>
          <input
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            inputMode="decimal"
            placeholder="e.g. 100"
            className={select}
          />
        </label>

        {type !== "add" && (
          <label className="block">
            <span className="font-medium">From</span>
            <select value={fromId} onChange={(e) => setFrom(e.target.value)} className={select} disabled={type === "damaged"}>
              {fromOptions.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
            {fromOptions.length === 0 && <p className="mt-1 text-sm text-slate-500">You have no job workers set up.</p>}
          </label>
        )}

        {type !== "damaged" && (
          <label className="block">
            <span className="font-medium">To</span>
            <select value={toId} onChange={(e) => setTo(e.target.value)} className={select}>
              {toOptions.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
        )}

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="flex-1 rounded-lg border border-slate-300 px-4 py-3 font-medium">
            Cancel
          </button>
          <button
            type="submit"
            className={`flex-1 rounded-lg px-4 py-3 font-semibold text-white ${type === "damaged" ? "bg-red-700" : "bg-emerald-700"}`}
          >
            {type === "damaged" ? "Mark damaged" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
