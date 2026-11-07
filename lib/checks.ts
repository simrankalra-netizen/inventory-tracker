// Plain-code input checks that run before any AI call.

export const MAX_DESCRIPTION = 300;
export const VAGUE_MESSAGE = "Please tell us a bit more, e.g. what you sell and where you keep stock.";

// Catches empty, very short or random-letter descriptions. Anything subtler is left to the AI's "unclear" answer.
export function checkDescription(text: string): string | null {
  const t = text.trim();
  if (!t) return "Please describe your business.";
  if (t.length > MAX_DESCRIPTION) return `Please keep it under ${MAX_DESCRIPTION} characters.`;
  const words = t.match(/[a-zA-Zऀ-ॿ]+/g) ?? [];
  // A "real" word has a vowel (or is Hindi script): this filters out keyboard mashing like "xkqzv plmw".
  const realWords = words.filter((w) => /[aeiouyऀ-ॿ]/i.test(w) && w.length >= 2);
  if (realWords.length < 4) return VAGUE_MESSAGE;
  return null;
}
