// Saves everything in this browser only (no database for the demo).
import type { Movement, Setup } from "./types";

const KEY = "stock-tracker-v1";

export type Saved = { setup: Setup; movements: Movement[] };
export type LoadResult =
  | { status: "ok"; data: Saved }
  | { status: "empty" }
  | { status: "corrupt" }
  | { status: "unavailable" };

export function load(): LoadResult {
  let raw: string | null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return { status: "unavailable" };
  }
  if (!raw) return { status: "empty" };
  try {
    const data = JSON.parse(raw) as Saved;
    if (!data?.setup?.locations || !Array.isArray(data.movements)) return { status: "corrupt" };
    return { status: "ok", data };
  } catch {
    return { status: "corrupt" };
  }
}

// Returns false if the browser refused to save.
export function save(data: Saved): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function clear() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
}
