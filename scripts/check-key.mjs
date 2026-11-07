// Checks .env.local and tests the AI key with one free request. Never prints the key itself.
// Usage: npm run check-key            (look only)
//        npm run check-key -- --fix   (also move a key that sits on its own line to the right place)
import { readFileSync, writeFileSync } from "node:fs";

const FILE = ".env.local";
const PLACEHOLDER = "paste-your-key-here";
const fix = process.argv.includes("--fix");
const mask = (k) => `${k.slice(0, k.indexOf("-", 3) + 1)}… (${k.length} characters)`;
const kind = (k) => (k.startsWith("sk-or-") ? "OpenRouter" : k.startsWith("sk-ant-") ? "Anthropic" : null);

let text;
try {
  text = readFileSync(FILE, "utf8");
} catch {
  console.log(`✗ No ${FILE} file in this folder. Copy .env.example to ${FILE} and put your key in it.`);
  process.exit(1);
}

const lines = text.split(/\r?\n/);
const named = {}; // NAME -> { line, value }
const loose = []; // keys pasted on a line without NAME=
lines.forEach((raw, i) => {
  const line = raw.trim();
  if (!line || line.startsWith("#")) return;
  const m = line.match(/^([A-Z_]+)\s*=\s*(.*)$/);
  if (m) named[m[1]] = { line: i, value: m[2].replace(/^["']|["']$/g, "").trim() };
  else if (kind(line)) loose.push({ line: i, value: line });
  else console.log(`! Line ${i + 1} isn't in NAME=value form, so the app ignores it.`);
});

for (const [name, { line, value }] of Object.entries(named)) {
  if (value === PLACEHOLDER) console.log(`! Line ${line + 1}: ${name} is still the placeholder "${PLACEHOLDER}".`);
  else if (value && !kind(value)) console.log(`! Line ${line + 1}: ${name} doesn't start with sk-or- or sk-ant-, so it isn't a key the app knows.`);
}
for (const { line, value } of loose) {
  console.log(`! Line ${line + 1} has an ${kind(value)} key (${mask(value)}) on its own, with no NAME= in front. The app can't see it there.`);
}

if (fix && loose.length > 0) {
  // Rebuild the file: our two comment lines, then each key under the name that matches what kind of key it is.
  const keep = { ...Object.fromEntries(Object.entries(named).map(([n, v]) => [n, v.value])) };
  for (const { value } of loose) keep[kind(value) === "OpenRouter" ? "OPENROUTER_API_KEY" : "ANTHROPIC_API_KEY"] = value;
  for (const n of Object.keys(keep)) if (!keep[n] || keep[n] === PLACEHOLDER) delete keep[n];
  const out = [
    "# AI key for the setup step. An OpenRouter key (sk-or-...) or an Anthropic key (sk-ant-...) both work.",
    "# This file is ignored by git, so the key is never committed. Restart the app after changing it.",
    ...Object.entries(keep).map(([n, v]) => `${n}=${v}`),
    "",
  ].join("\n");
  writeFileSync(FILE, out);
  console.log(`✓ Fixed ${FILE}: now has ${Object.keys(keep).join(", ") || "no keys"}.`);
  Object.assign(named, Object.fromEntries(Object.entries(keep).map(([n, v]) => [n, { value: v }])));
}

const key = [named.OPENROUTER_API_KEY?.value, named.ANTHROPIC_API_KEY?.value].find((k) => k && kind(k));
if (!key) {
  console.log(`✗ No usable key found.${loose.length && !fix ? " Run: npm run check-key -- --fix" : ""}`);
  process.exit(1);
}

console.log(`Testing your ${kind(key)} key ${mask(key)} …`);
const res =
  kind(key) === "OpenRouter"
    ? await fetch("https://openrouter.ai/api/v1/key", { headers: { Authorization: `Bearer ${key}` } })
    : await fetch("https://api.anthropic.com/v1/models?limit=1", { headers: { "x-api-key": key, "anthropic-version": "2023-06-01" } });

if (res.status === 401 || res.status === 403) {
  console.log("✗ The key was refused. It may be revoked or mistyped. Create a new one and paste it in.");
  process.exit(1);
}
if (!res.ok) {
  console.log(`✗ Couldn't check the key (the service answered ${res.status}). Check your internet and try again.`);
  process.exit(1);
}
if (kind(key) === "OpenRouter") {
  const { data } = await res.json();
  const left = data.limit_remaining == null ? "no spending limit set" : `$${data.limit_remaining} left on this key`;
  console.log(`✓ Key works. ${data.is_free_tier ? "Free tier account (add credit to use Claude). " : ""}${left}.`);
} else {
  console.log("✓ Key works.");
}
console.log("Restart the app (stop it and run npm run dev again) if it was already running.");
