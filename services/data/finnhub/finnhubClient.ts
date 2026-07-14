import { getEnv } from "@/config/env";
import { ProviderError } from "@/lib/errors";
import { fetchWithTimeout, isRetryableStatus, retry } from "@/lib/retry";

const BASE_URL = "https://finnhub.io/api/v1";
const TIMEOUT_MS = 10_000;

/**
 * Shared GET helper for every Finnhub endpoint. Centralizes the API key,
 * timeout, retry policy, and error wrapping in one place so the four
 * domain-specific Finnhub services (company/profile/finance/news) only
 * need to know their own endpoint path, params, and response shape - not
 * how to fetch resiliently, which was previously copy-pasted (with a
 * plain `throw new Error(...)`, no retry, no timeout) into all four files.
 */
export async function finnhubGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const { FINNHUB_API_KEY } = getEnv();
  const query = new URLSearchParams({ ...params, token: FINNHUB_API_KEY }).toString();
  const url = `${BASE_URL}${path}?${query}`;

  return retry(async () => {
    let response: Response;
    try {
      response = await fetchWithTimeout(url, { method: "GET" }, TIMEOUT_MS);
    } catch (cause) {
      throw new ProviderError("Finnhub request failed to complete", {
        provider: "finnhub",
        retryable: true,
        cause,
      });
    }

    if (!response.ok) {
      // See services/ai/gemini.ts for why statusCode is deliberately
      // omitted here - a Finnhub-side 403/429 isn't a fact about the
      // caller's request to OUR API.
      throw new ProviderError(`Finnhub API error: ${response.status}`, {
        provider: "finnhub",
        retryable: isRetryableStatus(response.status),
      });
    }

    return (await response.json()) as T;
  });
}
