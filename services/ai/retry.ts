/**
 * The AI layer's retry utilities. Re-exported from lib/retry.ts rather
 * than implemented here: retry-with-backoff, request timeouts, and status
 * classification aren't actually AI-specific - services/data/* needs the
 * exact same logic for Finnhub/Alpha Vantage/NewsAPI, and duplicating it
 * per layer would violate the DRY principle this whole refactor is meant
 * to uphold. This file exists so `retry()` still lives at
 * `services/ai/retry.ts`, importable exactly where the AI layer's
 * structure calls for it - only the implementation's home moved.
 */
export { retry, fetchWithTimeout, isRetryableStatus } from "@/lib/retry";
