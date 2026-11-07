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

const MAX_LOGO_BYTES = 10 * 1024 * 1024;
const LOGO_SIZE = 256;

// Checks the file really is an image the browser can open, then shrinks it so it fits in browser storage.
export async function readLogo(file: File): Promise<{ logo: string } | { error: string }> {
  if (!file.type.startsWith("image/")) return { error: "This file is not an image. Please choose a JPG, PNG or WEBP." };
  if (file.size > MAX_LOGO_BYTES) return { error: "This image is too big. Please choose one under 10 MB." };
  try {
    const url = URL.createObjectURL(file);
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject();
      img.src = url;
    });
    URL.revokeObjectURL(url);
    const scale = Math.min(1, LOGO_SIZE / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return { logo: canvas.toDataURL("image/png") };
  } catch {
    return { error: "We couldn't open this image. Please try a JPG or PNG." };
  }
}
