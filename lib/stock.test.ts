import { describe, expect, it } from "vitest";
import { checkDescription, VAGUE_MESSAGE } from "./checks";
import { checkMovement, damagedTotal, pendingWithWorkers, stockAt, type MovementInput } from "./stock";
import { DAMAGED, type Movement, type Setup } from "./types";

const setup: Setup = {
  businessName: "Test Uniforms",
  logo: "",
  description: "",
  businessLabel: "Uniform maker",
  locations: [
    { id: "godown", name: "Main Godown", kind: "own_storage" },
    { id: "emb", name: "Embroidery Worker", kind: "job_worker" },
  ],
  itemTypes: [
    { id: "shirt", name: "Shirts", unit: "pieces", details: [] },
    { id: "cloth", name: "Cloth", unit: "meters", details: [] },
  ],
};

// Mimics the app: check first, only record if allowed.
function record(movements: Movement[], input: MovementInput) {
  const error = checkMovement(input, setup, movements);
  if (!error) movements.push({ ...input, id: String(movements.length), at: 0 });
  return error;
}

describe("test 2: send 100, receive 99", () => {
  const log: Movement[] = [];
  it("records add, send and receive", () => {
    expect(record(log, { type: "add", itemId: "shirt", qty: 100, from: null, to: "godown" })).toBeNull();
    expect(record(log, { type: "send", itemId: "shirt", qty: 100, from: "godown", to: "emb" })).toBeNull();
    expect(record(log, { type: "receive", itemId: "shirt", qty: 99, from: "emb", to: "godown" })).toBeNull();
  });
  it("shows 99 in godown and 1 pending with embroidery", () => {
    expect(stockAt(log, "godown", "shirt")).toBe(99);
    expect(stockAt(log, "emb", "shirt")).toBe(1);
    expect(pendingWithWorkers(setup, log)).toEqual([{ locationId: "emb", itemId: "shirt", qty: 1 }]);
  });
  it("marking the 1 as damaged clears the pending alert", () => {
    expect(record(log, { type: "damaged", itemId: "shirt", qty: 1, from: "emb", to: DAMAGED })).toBeNull();
    expect(pendingWithWorkers(setup, log)).toEqual([]);
    expect(damagedTotal(log, "shirt")).toBe(1);
    expect(stockAt(log, "godown", "shirt")).toBe(99);
  });
});

describe("test 3c: blocks bad movements", () => {
  const log: Movement[] = [];
  record(log, { type: "add", itemId: "shirt", qty: 100, from: null, to: "godown" });
  record(log, { type: "send", itemId: "shirt", qty: 100, from: "godown", to: "emb" });

  it("stops receiving 101 when 100 were sent, and explains why", () => {
    const error = record(log, { type: "receive", itemId: "shirt", qty: 101, from: "emb", to: "godown" });
    expect(error).toBe(
      "You can't receive 101 Shirts from Embroidery Worker. Only 100 Shirts are with Embroidery Worker right now.",
    );
    expect(stockAt(log, "godown", "shirt")).toBe(0);
  });
  it("stops sending more than the godown has", () => {
    expect(record(log, { type: "send", itemId: "shirt", qty: 1, from: "godown", to: "emb" })).toBe(
      "You can't move 1 Shirt from Main Godown. No Shirts are in Main Godown right now.",
    );
  });
  it("uses what is with the worker now, not everything ever sent (send 50, receive 51)", () => {
    const later: Movement[] = [];
    record(later, { type: "add", itemId: "shirt", qty: 100, from: null, to: "godown" });
    record(later, { type: "send", itemId: "shirt", qty: 100, from: "godown", to: "emb" });
    record(later, { type: "receive", itemId: "shirt", qty: 99, from: "emb", to: "godown" });
    record(later, { type: "damaged", itemId: "shirt", qty: 1, from: "emb", to: DAMAGED });
    record(later, { type: "send", itemId: "shirt", qty: 50, from: "godown", to: "emb" });
    expect(record(later, { type: "receive", itemId: "shirt", qty: 51, from: "emb", to: "godown" })).toBe(
      "You can't receive 51 Shirts from Embroidery Worker. Only 50 Shirts are with Embroidery Worker right now.",
    );
    expect(later).toHaveLength(5);
  });
  it("stops zero, negative and half shirts", () => {
    expect(record(log, { type: "add", itemId: "shirt", qty: 0, from: null, to: "godown" })).toBe("Enter a number above 0.");
    expect(record(log, { type: "add", itemId: "shirt", qty: -5, from: null, to: "godown" })).toBe("Enter a number above 0.");
    expect(record(log, { type: "add", itemId: "shirt", qty: 1.5, from: null, to: "godown" })).toMatch(/whole number/);
  });
  it("allows decimals for meters", () => {
    expect(record(log, { type: "add", itemId: "cloth", qty: 12.5, from: null, to: "godown" })).toBeNull();
  });
  it("stops from and to being the same place", () => {
    expect(record(log, { type: "send", itemId: "cloth", qty: 1, from: "godown", to: "godown" })).toMatch(/different/);
  });
});

describe("test 3a: vague descriptions are caught before the AI", () => {
  it.each(["", "   ", "stuff", "asdfgh", "xkqzv plmw brt", "I sell things"])("rejects %j", (text) => {
    expect(checkDescription(text)).not.toBeNull();
  });
  it("lets real descriptions through", () => {
    expect(checkDescription("I sell tyres and keep stock in two godowns")).toBeNull();
    expect(checkDescription("I make school uniforms and send shirts to an embroidery worker")).toBeNull();
  });
  it("uses the friendly message", () => {
    expect(checkDescription("stuff")).toBe(VAGUE_MESSAGE);
  });
});
