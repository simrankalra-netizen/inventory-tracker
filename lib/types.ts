// "own_storage" = the owner's own godown or shop. "job_worker" = an outside worker who gets goods and sends them back.
export type LocationKind = "own_storage" | "job_worker";

export type Location = { id: string; name: string; kind: LocationKind };

export type ItemType = { id: string; name: string; unit: string; details: string[] };

export type Setup = {
  businessName: string;
  ownerName?: string; // optional so data saved before this field existed still loads
  logo?: string; // no longer asked for; kept so setups saved with a logo still show it
  description: string;
  businessLabel: string;
  locations: Location[];
  itemTypes: ItemType[];
};

export type MovementType = "add" | "send" | "receive" | "damaged";

// One line in the logbook. Stock is never stored directly: it is always added up from these.
export type Movement = {
  id: string;
  type: MovementType;
  itemId: string;
  qty: number;
  from: string | null; // null when stock is first added
  to: string; // a location id, or DAMAGED
  at: number;
};

export const DAMAGED = "damaged";

export function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
