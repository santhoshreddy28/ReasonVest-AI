import { logger } from "@/lib/logger";
import { ProviderError } from "@/lib/errors";

export interface FallbackStep<T> {
  /** Human-readable name for logs, e.g. "Finnhub", "Alpha Vantage". */
  label: string;
  /** Whether this step can even be attempted (e.g. its API key is configured). */
  isAvailable: boolean;
  run: () => Promise<T>;
}

/**
 * Tries each available step in order, returning the first success and
 * logging progress the same way the AI provider chain does (success/warn/
 * info) so "which source actually answered this" is visible in server
 * logs for every fallback in the app, not just AI calls.
 *
 * WHY this is separate from services/ai/providers.ts's own loop rather
 * than one shared implementation: the AI chain needs two things this
 * simpler version deliberately doesn't do - per-provider RETRY before
 * moving to the next provider (a 429 is usually worth a couple of quick
 * retries before switching models), and it needs to report back WHICH
 * provider answered. Market-data sources here already retry internally
 * (see finnhubClient.ts / alphaVantage.ts, both wrap their own calls in
 * retry()), and callers only need the normalized data back, not
 * provenance - so a plain ordered attempt list is the right amount of
 * mechanism, not a reason to force both use cases through one abstraction.
 */
export async function withFallback<T>(scope: string, steps: FallbackStep<T>[]): Promise<T> {
  const available = steps.filter((step) => step.isAvailable);
  let lastError: unknown;

  for (let i = 0; i < available.length; i++) {
    const step = available[i];
    try {
      const result = await step.run();
      logger.success(scope, `${step.label} succeeded`);
      return result;
    } catch (error) {
      lastError = error;
      logger.warn(scope, `${step.label} failed`, {
        message: error instanceof Error ? error.message : String(error),
      });

      const next = available[i + 1];
      if (next) {
        logger.info(scope, `Falling back to ${next.label}`);
      }
    }
  }

  if (lastError instanceof Error) throw lastError;
  throw new ProviderError(`All data sources failed for ${scope}`, {
    provider: scope,
    retryable: false,
    cause: lastError,
  });
}
