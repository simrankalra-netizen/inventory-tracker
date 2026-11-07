"use client";

import dynamic from "next/dynamic";

// The app keeps its data in browser storage, so it is only drawn in the browser, never on the server.
const App = dynamic(() => import("@/components/App"), {
  ssr: false,
  loading: () => <p className="mt-24 text-center text-slate-500">Loading your stock…</p>,
});

export default function Home() {
  return <App />;
}
