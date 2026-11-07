// The exact shape Claude must answer in. Shared by the AI route and the checks after it.
import { z } from "zod";

export const UNITS = ["pieces", "meters", "kg", "litres", "pairs", "sets", "boxes"] as const;

export const AiSetupSchema = z.object({
  status: z.enum(["ok", "unclear"]),
  question: z.string(),
  businessLabel: z.string(),
  locations: z.array(z.object({ name: z.string(), kind: z.enum(["own_storage", "job_worker"]) })),
  itemTypes: z.array(z.object({ name: z.string(), unit: z.enum(UNITS), details: z.array(z.string()) })),
});

export type AiSetup = z.infer<typeof AiSetupSchema>;

// What the route sends back to the browser.
export type SuggestResponse =
  | { status: "ok"; setup: Omit<AiSetup, "status" | "question"> }
  | { status: "unclear"; question: string }
  | { status: "error"; message: string };

// Second check on an "ok" answer: sensible sizes and no blank names. Returns a reason if it fails.
export function problemWithSetup(s: AiSetup): string | null {
  if (!s.businessLabel.trim()) return "missing business label";
  if (s.locations.length < 1 || s.locations.length > 6) return "wrong number of locations";
  if (s.itemTypes.length < 1 || s.itemTypes.length > 5) return "wrong number of item types";
  if (s.locations.some((l) => !l.name.trim()) || s.itemTypes.some((i) => !i.name.trim())) return "blank name";
  if (new Set(s.locations.map((l) => l.name.trim().toLowerCase())).size !== s.locations.length) return "duplicate location";
  if (s.itemTypes.some((i) => i.details.length > 4)) return "too many details";
  return null;
}
