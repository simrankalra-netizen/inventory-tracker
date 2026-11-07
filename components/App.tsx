"use client";

import { useState } from "react";
import Dashboard from "./Dashboard";
import OnboardingForm from "./OnboardingForm";
import { clear, load, save } from "@/lib/storage";
import type { Movement, Setup } from "@/lib/types";

const NOT_SAVING = "This browser won't save your data. It will be lost when you close the page.";

// Only ever runs in the browser (see app/page.tsx), so it can read browser storage straight away.
export default function App() {
  const [initial] = useState(load);
  const [setup, setSetup] = useState<Setup | null>(initial.status === "ok" ? initial.data.setup : null);
  const [movements, setMovements] = useState<Movement[]>(initial.status === "ok" ? initial.data.movements : []);
  const [warning, setWarning] = useState(initial.status === "unavailable" ? NOT_SAVING : "");
  const [corrupt, setCorrupt] = useState(initial.status === "corrupt");

  function persist(nextSetup: Setup, nextMovements: Movement[]) {
    setSetup(nextSetup);
    setMovements(nextMovements);
    if (!save({ setup: nextSetup, movements: nextMovements })) setWarning(NOT_SAVING);
  }

  // The dashboard asks "are you sure?" on screen before calling this.
  function startAgain() {
    clear();
    setSetup(null);
    setMovements([]);
  }

  if (corrupt) {
    return (
      <main className="mx-auto max-w-md px-4 py-10">
        <p className="rounded-lg bg-red-50 p-3 text-red-800">Your saved data couldn&apos;t be read.</p>
        <button
          onClick={() => {
            clear();
            setCorrupt(false);
          }}
          className="mt-4 w-full rounded-lg bg-emerald-700 px-4 py-3 font-semibold text-white"
        >
          Start fresh
        </button>
      </main>
    );
  }

  return (
    <>
      {warning && <p className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-900">{warning}</p>}
      {setup ? (
        <Dashboard
          setup={setup}
          movements={movements}
          onRecord={(m) => persist(setup, [...movements, m])}
          onAddLocation={(l) => persist({ ...setup, locations: [...setup.locations, l] }, movements)}
          onStartAgain={startAgain}
        />
      ) : (
        <OnboardingForm onDone={(s) => persist(s, [])} />
      )}
    </>
  );
}
