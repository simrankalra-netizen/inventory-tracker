// All stock counting is plain arithmetic over the logbook. No AI here.
import { DAMAGED, type ItemType, type Movement, type MovementType, type Setup } from "./types";

const WHOLE_UNITS = ["pieces", "pairs", "sets", "boxes"];
const SINGULAR: Record<string, string> = {
  pieces: "piece",
  meters: "meter",
  litres: "litre",
  pairs: "pair",
  sets: "set",
  boxes: "box",
};

// Avoids 0.1 + 0.2 = 0.30000000000000004 style noise for meters and kg.
const round = (n: number) => Math.round(n * 1000) / 1000;

export function unitWord(n: number, unit: string) {
  return n === 1 ? (SINGULAR[unit] ?? unit) : unit;
}

// "101 Shirts" for pieces, "50 meters of Cloth" for anything else.
export function qtyText(n: number, item: ItemType) {
  if (item.unit !== "pieces") return `${round(n)} ${unitWord(n, item.unit)} of ${item.name}`;
  // Item names are plural ("Shirts"), so drop the s for exactly one: "1 Shirt".
  return n === 1 && /s$/i.test(item.name) ? `1 ${item.name.slice(0, -1)}` : `${round(n)} ${item.name}`;
}

function totalIn(movements: Movement[], locationId: string, itemId: string) {
  return round(movements.filter((m) => m.to === locationId && m.itemId === itemId).reduce((s, m) => s + m.qty, 0));
}

function totalOut(movements: Movement[], locationId: string, itemId: string) {
  return round(movements.filter((m) => m.from === locationId && m.itemId === itemId).reduce((s, m) => s + m.qty, 0));
}

export function stockAt(movements: Movement[], locationId: string, itemId: string) {
  return round(totalIn(movements, locationId, itemId) - totalOut(movements, locationId, itemId));
}

// Anything still sitting with a job worker is pending.
export function pendingWithWorkers(setup: Setup, movements: Movement[]) {
  const pending: { locationId: string; itemId: string; qty: number }[] = [];
  for (const loc of setup.locations.filter((l) => l.kind === "job_worker")) {
    for (const item of setup.itemTypes) {
      const qty = stockAt(movements, loc.id, item.id);
      if (qty > 0) pending.push({ locationId: loc.id, itemId: item.id, qty });
    }
  }
  return pending;
}

export type MovementInput = { type: MovementType; itemId: string; qty: number; from: string | null; to: string };

// Returns a plain-language reason the movement is not allowed, or null if it is fine.
export function checkMovement(input: MovementInput, setup: Setup, movements: Movement[]): string | null {
  const item = setup.itemTypes.find((i) => i.id === input.itemId);
  if (!item) return "Choose an item.";
  if (!Number.isFinite(input.qty) || input.qty <= 0) return "Enter a number above 0.";
  if (WHOLE_UNITS.includes(item.unit) && !Number.isInteger(input.qty)) {
    return `${item.name} are counted in whole ${item.unit}. Enter a whole number.`;
  }
  if (input.type !== "add" && !input.from) return "Choose where it is coming from.";
  if (!input.to) return "Choose where it is going.";
  if (input.from && input.from === input.to) return "From and To must be different places.";
  if (!input.from) return null;

  const fromLoc = setup.locations.find((l) => l.id === input.from);
  if (!fromLoc) return "Choose where it is coming from.";
  const available = stockAt(movements, fromLoc.id, item.id);
  if (input.qty <= available) return null;

  // Talk about what is there right now, not lifetime totals, so the number matches what the owner just did.
  const verb = input.type === "damaged" ? "mark" : input.type === "receive" ? "receive" : "move";
  const tail = input.type === "damaged" ? " as damaged" : ` from ${fromLoc.name}`;
  const where = fromLoc.kind === "job_worker" ? `with ${fromLoc.name}` : `in ${fromLoc.name}`;
  const have = available === 0 ? `No ${item.name} are` : available === 1 && item.unit === "pieces" ? "Only 1 is" : `Only ${qtyText(available, item)} ${available === 1 ? "is" : "are"}`;
  return `You can't ${verb} ${qtyText(input.qty, item)}${tail}. ${have} ${where} right now.`;
}

export function damagedTotal(movements: Movement[], itemId: string) {
  return totalIn(movements, DAMAGED, itemId);
}
