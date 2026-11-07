// Server only. Works out which AI service to use from the key itself, so a key under the "wrong" name still works,
// and turns every setup mistake into one plain sentence.
import Anthropic from "@anthropic-ai/sdk";

export type Provider =
  | { ok: true; name: "anthropic" | "openrouter"; client: Anthropic; model: string }
  | { ok: false; problem: string };

const PLACEHOLDER = "paste-your-key-here";

export function getProvider(): Provider {
  const keys = [process.env.OPENROUTER_API_KEY, process.env.ANTHROPIC_API_KEY]
    .map((k) => k?.trim().replace(/^["']|["']$/g, "") ?? "")
    .filter((k) => k && k !== PLACEHOLDER);

  // Decide by what the key looks like, not by which line it was put on.
  const openrouter = keys.find((k) => k.startsWith("sk-or-"));
  const anthropic = keys.find((k) => k.startsWith("sk-ant-"));
  // 25 second limit and no retries keep the whole setup under 30 seconds.
  const limits = { timeout: 25_000, maxRetries: 0 };

  if (openrouter) {
    return {
      ok: true,
      name: "openrouter",
      // OpenRouter speaks Claude's own API at /api/v1/messages and wants the key as a Bearer token.
      client: new Anthropic({ apiKey: null, authToken: openrouter, baseURL: "https://openrouter.ai/api", ...limits }),
      model: "anthropic/claude-opus-5.5",
    };
  }
  if (anthropic) {
    return { ok: true, name: "anthropic", client: new Anthropic({ apiKey: anthropic, ...limits }), model: "claude-opus-5-5" };
  }
  if (keys.length > 0) {
    return { ok: false, problem: "The AI key in .env.local doesn't look right. It should start with sk-or- (OpenRouter) or sk-ant- (Anthropic). Run: npm run check-key" };
  }
  return { ok: false, problem: "The AI key isn't set up yet. Put it in .env.local after OPENROUTER_API_KEY= and restart the app. Run: npm run check-key" };
}

// Turns an error from the AI service into something the owner (or you, while building) can act on.
export function explainAiError(error: unknown): string | null {
  if (error instanceof Anthropic.AuthenticationError) return "The AI key was refused. It may be revoked or mistyped. Run: npm run check-key";
  if (error instanceof Anthropic.APIError && error.status === 402) return "The AI account has run out of credit. Add credit, then tap Try again.";
  if (error instanceof Anthropic.RateLimitError) return "The AI service is busy. Wait a minute, then tap Try again.";
  return null;
}
