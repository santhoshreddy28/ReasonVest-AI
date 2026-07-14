import { logger } from "@/lib/logger";
import { AIError, ProviderError } from "@/lib/errors";
import { retry } from "./retry";
import { geminiProvider } from "./gemini";
import { openRouterProvider } from "./openrouter";
import type { AIProvider, AIProviderName, AIRequest } from "./types";

const SCOPE = "AI";

/**
 * The fallback chain, in priority order. Adding a new provider later
 * (Groq, Claude, GPT, ...) is a two-step change: implement AIProvider in
 * its own file (see gemini.ts/openrouter.ts for the shape), then add it
 * here. No other file in the app - not aiService.ts, not any route, not
 * any page - needs to know it exists.
 */
const PROVIDER_CHAIN: AIProvider[] = [geminiProvider, openRouterProvider];

function friendlyName(provider: AIProvider): string {
  return provider.name === "gemini" ? "Gemini" : "OpenRouter";
}

function toProviderError(error: unknown, provider: AIProviderName): ProviderError {
  if (error instanceof ProviderError) return error;
  return new ProviderError(error instanceof Error ? error.message : "Unknown provider failure", {
    provider,
    retryable: false,
    cause: error,
  });
}

/**
 * Runs `request` through the AI provider fallback chain. Each configured
 * provider gets its own retry budget (transient errors - 429, 500, 503,
 * timeouts - are retried in place, see lib/retry.ts) before moving on to
 * the NEXT provider entirely.
 *
 * WHY per-provider retry before cross-provider fallback, rather than one
 * flat retry loop across all providers: a 429 from Gemini is very likely
 * to clear up within a second or two, so it's worth a couple of quick
 * retries before paying the cost - and quality difference - of switching
 * models; a hard failure (invalid request, safety block) is never worth
 * retrying and should fall through to the next provider immediately
 * instead of wasting the retry budget on a failure that won't change.
 */
export async function completeWithFallback(
  request: AIRequest
): Promise<{ text: string; provider: AIProviderName }> {
  const candidates = PROVIDER_CHAIN.filter((provider) => provider.isConfigured());

  if (candidates.length === 0) {
    throw new AIError(
      "No AI provider is configured. Set GEMINI_API_KEY (and optionally OPENROUTER_API_KEY) in your environment."
    );
  }

  const attempts: ProviderError[] = [];

  for (let i = 0; i < candidates.length; i++) {
    const provider = candidates[i];
    const label = friendlyName(provider);

    try {
      const text = await retry(() => provider.complete(request), {
        onRetry: (error, attempt) => {
          const reason = error instanceof ProviderError ? error.message : "transient error";
          logger.warn(SCOPE, `${label} attempt ${attempt} failed (${reason}), retrying…`);
        },
      });

      logger.success(SCOPE, `${label} succeeded`);
      return { text, provider: provider.name };
    } catch (error) {
      const providerError = toProviderError(error, provider.name);
      attempts.push(providerError);

      const isQuota = providerError.statusCode === 429;
      logger.warn(SCOPE, isQuota ? `${label} quota exceeded` : `${label} failed (${providerError.message})`);

      const next = candidates[i + 1];
      if (next) {
        logger.info(SCOPE, `Falling back to ${friendlyName(next)}`);
      }
    }
  }

  logger.error(SCOPE, "All AI providers exhausted", {
    attempts: attempts.map((a) => ({ provider: a.provider, message: a.message, statusCode: a.statusCode })),
  });
  throw new AIError("All configured AI providers failed to respond.", attempts);
}
