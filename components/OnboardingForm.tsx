"use client";

import { useState } from "react";
import { checkDescription, MAX_DESCRIPTION } from "@/lib/checks";
import type { SuggestResponse } from "@/lib/setupSchema";
import { newId, type Setup } from "@/lib/types";

export default function OnboardingForm({ onDone }: { onDone: (setup: Setup) => void }) {
  const [name, setName] = useState("");
  const [owner, setOwner] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<{ name?: string; owner?: string; description?: string }>({});
  const [aiMessage, setAiMessage] = useState<{ kind: "unclear" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setAiMessage(null);
    const next = {
      name: name.trim() ? undefined : "Please enter your business name.",
      owner: owner.trim() ? undefined : "Please enter your name.",
      description: checkDescription(description) ?? undefined,
    };
    setErrors(next);
    if (next.name || next.owner || next.description) return;

    setLoading(true);
    let data: SuggestResponse;
    try {
      const res = await fetch("/api/suggest-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
      data = await res.json();
    } catch {
      data = { status: "error", message: "We couldn't reach the server. Check your internet and tap Try again." };
    }
    setLoading(false);

    if (data.status === "unclear") return setAiMessage({ kind: "unclear", text: data.question });
    if (data.status === "error") return setAiMessage({ kind: "error", text: data.message });
    onDone({
      businessName: name.trim(),
      ownerName: owner.trim(),
      description: description.trim(),
      businessLabel: data.setup.businessLabel,
      locations: data.setup.locations.map((l) => ({ ...l, id: newId() })),
      itemTypes: data.setup.itemTypes.map((i) => ({ ...i, id: newId() })),
    });
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 py-8">
      <h1 className="text-2xl font-bold">Set up your stock tracker</h1>
      <p className="mt-1 text-slate-600">A few quick details and your dashboard is ready.</p>

      <form onSubmit={submit} className="mt-6 space-y-5" noValidate>
        <label className="block">
          <span className="font-medium">Business name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sharma Tyres"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-3 text-base"
          />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
        </label>

        <label className="block">
          <span className="font-medium">Your name</span>
          <input
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            placeholder="e.g. Rajesh Sharma"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-3 text-base"
          />
          {errors.owner && <p className="mt-1 text-sm text-red-600">{errors.owner}</p>}
        </label>

        <label className="block">
          <span className="font-medium">Describe your business in 1–2 sentences</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={MAX_DESCRIPTION}
            rows={3}
            placeholder="e.g. I sell tyres and keep stock in two godowns"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-3 text-base"
          />
          <span className="block text-right text-xs text-slate-500">
            {description.length}/{MAX_DESCRIPTION}
          </span>
          <span className="block text-sm text-slate-500">
            Another example: “I make school uniforms. I send cloth to a cutting master and shirts to an embroidery worker.”
          </span>
          {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
        </label>

        {aiMessage && (
          <p
            role="alert"
            className={`rounded-lg p-3 text-sm ${aiMessage.kind === "unclear" ? "bg-amber-50 text-amber-900" : "bg-red-50 text-red-800"}`}
          >
            {aiMessage.kind === "unclear" && <strong>We need a bit more detail. </strong>}
            {aiMessage.text}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-emerald-700 px-4 py-3 text-lg font-semibold text-white disabled:opacity-60"
        >
          {loading ? "Setting up your dashboard…" : aiMessage?.kind === "error" ? "Try again" : "Create my dashboard"}
        </button>
        {loading && <p className="text-center text-sm text-slate-500">This can take up to 30 seconds.</p>}
      </form>
    </main>
  );
}
