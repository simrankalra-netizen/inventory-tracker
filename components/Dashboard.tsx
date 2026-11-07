"use client";

import { useRef, useState } from "react";
import MovementForm, { type MovementDraft } from "./MovementForm";
import { damagedTotal, pendingWithWorkers, qtyText, stockAt, unitWord } from "@/lib/stock";
import { newId, type Location, type LocationKind, type Movement, type Setup } from "@/lib/types";

export default function Dashboard({
  setup,
  movements,
  onRecord,
  onAddLocation,
  onStartAgain,
}: {
  setup: Setup;
  movements: Movement[];
  onRecord: (m: Movement) => void;
  onAddLocation: (l: Location) => void;
  onStartAgain: () => void;
}) {
  const [draft, setDraft] = useState<MovementDraft | null>(null);
  const [lastItemId, setLastItemId] = useState<string | undefined>();
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [confirmReset, setConfirmReset] = useState(false);
  const [addingPlace, setAddingPlace] = useState(false);

  const item = (id: string) => setup.itemTypes.find((i) => i.id === id)!;
  const place = (id: string) => setup.locations.find((l) => l.id === id)!;
  const pending = pendingWithWorkers(setup, movements);
  const pendingTotal = pending.reduce((s, p) => s + p.qty, 0);
  const damaged = setup.itemTypes.map((i) => ({ item: i, qty: damagedTotal(movements, i.id) })).filter((d) => d.qty > 0);

  function saved(m: Movement) {
    onRecord(m);
    setDraft(null);
    setLastItemId(m.itemId);
    const what = qtyText(m.qty, item(m.itemId));
    const text =
      m.type === "add"
        ? `Added ${what} to ${place(m.to).name}`
        : m.type === "send"
          ? `Sent ${what} to ${place(m.to).name}`
          : m.type === "receive"
            ? `Received ${what} from ${place(m.from!).name}`
            : `Marked ${what} as damaged`;
    setToast(`✓ Saved: ${text}`);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 4000);
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 pb-28 pt-4">
      <header className="flex items-center gap-3">
        {setup.logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={setup.logo} alt="" className="h-12 w-12 rounded-lg border object-contain" />
        )}
        <div>
          <h1 className="text-xl font-bold leading-tight">{setup.businessName}</h1>
          {setup.ownerName && <p className="text-sm text-slate-600">Owner: {setup.ownerName}</p>}
        </div>
      </header>

      {/* Shows what the AI suggested and from which words, so a wrong guess is easy to spot. */}
      <section className="mt-4 rounded-lg bg-slate-100 p-3 text-sm">
        <p>
          Set up as <strong>{setup.businessLabel}</strong>, suggested from:
        </p>
        <p className="mt-1 italic text-slate-700">“{setup.description}”</p>
        {confirmReset ? (
          <div className="mt-3 rounded-lg border border-red-200 bg-white p-3">
            <p className="font-medium text-red-800">Delete this setup and every movement you recorded?</p>
            <div className="mt-2 flex gap-2">
              <button onClick={() => setConfirmReset(false)} className="flex-1 rounded-lg border border-slate-300 px-3 py-2 font-medium">
                Keep it
              </button>
              <button onClick={onStartAgain} className="flex-1 rounded-lg bg-red-700 px-3 py-2 font-medium text-white">
                Yes, delete
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setConfirmReset(true)} className="mt-2 font-medium text-emerald-800 underline">
            Not right? Start again
          </button>
        )}
      </section>

      <h2 className="mt-6 font-semibold text-slate-700">
        Pending with workers: <span className={pendingTotal > 0 ? "text-amber-700" : "text-emerald-700"}>{pendingTotal}</span>
      </h2>
      {pending.length === 0 ? (
        <p className="mt-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">✓ Nothing is waiting with any worker.</p>
      ) : (
        <section className="mt-2 space-y-2">
          {pending.map((p) => {
            const i = item(p.itemId);
            return (
              <div key={p.locationId + p.itemId} className="rounded-lg border border-amber-300 bg-amber-50 p-3">
                <p className="font-medium text-amber-900">
                  ⚠ {i.name}: {p.qty} {unitWord(p.qty, i.unit)} still with {place(p.locationId).name}
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => setDraft({ type: "receive", itemId: p.itemId, qty: p.qty, from: p.locationId })}
                    className="flex-1 rounded-lg bg-white px-3 py-2 text-sm font-medium shadow-sm"
                  >
                    Receive
                  </button>
                  <button
                    onClick={() => setDraft({ type: "damaged", itemId: p.itemId, qty: p.qty, from: p.locationId })}
                    className="flex-1 rounded-lg bg-white px-3 py-2 text-sm font-medium text-red-700 shadow-sm"
                  >
                    Mark damaged
                  </button>
                </div>
              </div>
            );
          })}
        </section>
      )}

      <h2 className="mt-6 font-semibold text-slate-700">Stock by location</h2>
      <section className="mt-2 space-y-3">
        {setup.locations.map((loc) => {
          const rows = setup.itemTypes.map((i) => ({ i, qty: stockAt(movements, loc.id, i.id) })).filter((r) => r.qty > 0);
          return (
            <div key={loc.id} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold">{loc.name}</h3>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${loc.kind === "job_worker" ? "bg-violet-100 text-violet-800" : "bg-emerald-100 text-emerald-800"}`}
                >
                  {loc.kind === "job_worker" ? "Job worker" : "Your place"}
                </span>
              </div>
              {rows.length === 0 ? (
                <p className="mt-1 text-sm text-slate-500">No stock</p>
              ) : (
                <ul className="mt-1 text-sm">
                  {rows.map(({ i, qty }) => (
                    <li key={i.id} className="flex justify-between">
                      <span>{i.name}</span>
                      <span className="font-semibold">
                        {qty} {unitWord(qty, i.unit)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <h3 className="font-semibold text-red-800">Damaged</h3>
          {damaged.length === 0 ? (
            <p className="mt-1 text-sm text-red-700/70">None</p>
          ) : (
            <ul className="mt-1 text-sm">
              {damaged.map(({ item: i, qty }) => (
                <li key={i.id} className="flex justify-between">
                  <span>{i.name}</span>
                  <span className="font-semibold">
                    {qty} {unitWord(qty, i.unit)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        {addingPlace ? (
          <AddPlaceForm
            existing={setup.locations}
            onCancel={() => setAddingPlace(false)}
            onSave={(l) => {
              onAddLocation(l);
              setAddingPlace(false);
            }}
          />
        ) : (
          <button
            onClick={() => setAddingPlace(true)}
            className="w-full rounded-lg border border-dashed border-slate-300 px-3 py-3 text-sm font-medium text-slate-700"
          >
            + Add a place or worker
          </button>
        )}
      </section>

      <h2 className="mt-6 font-semibold text-slate-700">What you track</h2>
      <ul className="mt-2 space-y-2 text-sm">
        {setup.itemTypes.map((i) => (
          <li key={i.id} className="rounded-lg border border-slate-200 bg-white p-3">
            <span className="font-medium">{i.name}</span> <span className="text-slate-500">(counted in {i.unit})</span>
            {i.details.length > 0 && <p className="text-slate-600">Details: {i.details.join(", ")}</p>}
          </li>
        ))}
      </ul>

      <div className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-white via-white px-4 pb-4 pt-6">
        {toast && (
          <p role="status" className="mx-auto mb-2 max-w-md rounded-lg bg-slate-900 px-4 py-3 text-sm text-white shadow-lg">
            {toast}
          </p>
        )}
        <button
          onClick={() => setDraft({ type: "add", itemId: lastItemId })}
          className="mx-auto block w-full max-w-md rounded-xl bg-emerald-700 px-4 py-4 text-lg font-semibold text-white shadow-lg"
        >
          + Record movement
        </button>
      </div>

      {draft && (
        <MovementForm setup={setup} movements={movements} initial={draft} onCancel={() => setDraft(null)} onSave={saved} />
      )}
    </main>
  );
}

function AddPlaceForm({
  existing,
  onSave,
  onCancel,
}: {
  existing: Location[];
  onSave: (l: Location) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<LocationKind>("own_storage");
  const [error, setError] = useState("");

  function save() {
    const n = name.trim();
    if (!n) return setError("Please enter a name.");
    if (existing.some((l) => l.name.trim().toLowerCase() === n.toLowerCase())) return setError("You already have a place with this name.");
    onSave({ id: newId(), name: n, kind });
  }

  return (
    <div className="space-y-3 rounded-lg border border-slate-300 bg-white p-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Packing room or Dyer"
        className="w-full rounded-lg border border-slate-300 px-3 py-3 text-base"
      />
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 text-sm">
        {(["own_storage", "job_worker"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={`rounded-md px-2 py-2 font-medium ${kind === k ? "bg-white shadow" : "text-slate-600"}`}
          >
            {k === "own_storage" ? "Your place" : "Job worker"}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button onClick={onCancel} className="flex-1 rounded-lg border border-slate-300 px-3 py-2 font-medium">
          Cancel
        </button>
        <button onClick={save} className="flex-1 rounded-lg bg-emerald-700 px-3 py-2 font-medium text-white">
          Add
        </button>
      </div>
    </div>
  );
}
