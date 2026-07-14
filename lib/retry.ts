/**
 * Generic HTTP resilience utilities - retry-with-backoff, request timeouts,
 * and status-code classification. Deliberately provider-agnostic: nothing
 * in this file knows about Gemini, Finnhub, or any other vendor, which is
 * what lets both the AI layer (services/ai/*) and the market-data layer
 * (services/data/*) share one battle-tested implementation instead of each
 * hand-rolling their own. See services/ai/retry.ts for why that file
 * re-exports this one rather than duplicating it.
 */

import type { RetryOptions } from "@/services/ai/types";

const DEFAULT_RETRIES = 2; // up to 3 total attempts
const DEFAULT_BASE_DELAY_MS = 400;
const DEFAULT_MAX_DELAY_MS = 4_000;

/**
 * The status codes worth retrying: 429 (rate limited - clears up quickly),
 * 500/502/503/504 (server-side/gateway errors, often transient). 4xx
 * codes other than 429 mean the request itself was wrong and retrying
 * identically will just fail the same way again.
 */
const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);

export function isRetryableStatus(status: number): boolean {
  return RETRYABLE_STATUS_CODES.has(status);
}

function defaultIsRetryable(error: unknown): boolean {
  // ProviderError (and anything shaped like it) carries an explicit
  // `retryable` flag set by the code that actually knows what its status
  // code meant - trust that instead of re-guessing from the error here.
  if (error && typeof error === "object" && "retryable" in error) {
    return Boolean((error as { retryable?: boolean }).retryable);
  }
  return false;
}

function delayWithJitter(attempt: number, baseMs: number, maxMs: number): number {
  const exponential = Math.min(maxMs, baseMs * 2 ** attempt);
  // Full jitter (random between 0 and the exponential ceiling) rather than
  // a fixed backoff, so many concurrent requests hitting the same failure
  // don't all retry in lockstep and re-create the load spike they're
  // trying to back off from.
  return Math.random() * exponential;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Runs `fn`, retrying on transient failures with exponential backoff and
 * jitter. `fn` receives the current attempt number (0-based) but can
 * ignore it - `retry(async () => ...)` is a complete, valid call.
 *
 * WHY this exists as our own helper instead of a library: it needs to
 * plug into our own ProviderError.retryable flag - which each provider
 * sets based on ITS real status codes and error semantics - rather than a
 * generic library policy of "retry on any throw" or "retry on any 5xx",
 * neither of which is quite right here (some upstream errors are
 * definitely not worth retrying, e.g. an invalid API key).
 */
export async function retry<T>(
  fn: (attempt: number) => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const retries = options.retries ?? DEFAULT_RETRIES;
  const baseDelayMs = options.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const maxDelayMs = options.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;
  const isRetryable = options.isRetryable ?? defaultIsRetryable;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      const attemptsLeft = retries - attempt;

      if (attemptsLeft <= 0 || !isRetryable(error)) {
        throw error;
      }

      options.onRetry?.(error, attempt + 1);
      await sleep(delayWithJitter(attempt, baseDelayMs, maxDelayMs));
    }
  }

  // Unreachable - the loop above always either returns or throws - but
  // TypeScript can't prove that, so this satisfies control-flow analysis
  // without an unsound non-null assertion.
  throw lastError;
}

/**
 * `fetch` with a hard timeout. Plain `fetch` never times out on its own,
 * which means a hung upstream connection would hang the whole request
 * indefinitely; this turns that into a normal, catchable, retryable
 * failure via AbortController instead.
 */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}
