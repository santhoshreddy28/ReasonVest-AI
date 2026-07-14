import { getEnv } from "@/config/env";
import { ProviderError } from "@/lib/errors";
import { fetchWithTimeout, isRetryableStatus, retry } from "@/lib/retry";
import type { Company, CompanyProfile } from "@/types/company";
import type { FinancialMetrics } from "@/types/finance";

const BASE_URL = "https://www.alphavantage.co/query";
const TIMEOUT_MS = 10_000;

interface AlphaVantageErrorFields {
  Note?: string;
  Information?: string;
}

async function alphaVantageGet<T>(params: Record<string, string>): Promise<T> {
  const { ALPHAVANTAGE_API_KEY } = getEnv();
  if (!ALPHAVANTAGE_API_KEY) {
    throw new ProviderError("Alpha Vantage is not configured", {
      provider: "alphavantage",
      retryable: false,
    });
  }

  const query = new URLSearchParams({ ...params, apikey: ALPHAVANTAGE_API_KEY }).toString();
  const url = `${BASE_URL}?${query}`;

  return retry(async () => {
    let response: Response;
    try {
      response = await fetchWithTimeout(url, { method: "GET" }, TIMEOUT_MS);
    } catch (cause) {
      throw new ProviderError("Alpha Vantage request failed to complete", {
        provider: "alphavantage",
        retryable: true,
        cause,
      });
    }

    if (!response.ok) {
      // See services/ai/gemini.ts for why statusCode is deliberately omitted here.
      throw new ProviderError(`Alpha Vantage API error: ${response.status}`, {
        provider: "alphavantage",
        retryable: isRetryableStatus(response.status),
      });
    }

    const data = (await response.json()) as T & AlphaVantageErrorFields;
    // Alpha Vantage's free tier returns HTTP 200 even when it's rate
    // limiting you - the real error signal is a "Note"/"Information" field
    // in an otherwise-200 body, which has to be checked explicitly.
    if (data.Note || data.Information) {
      throw new ProviderError(`Alpha Vantage rate limit: ${data.Note ?? data.Information}`, {
        provider: "alphavantage",
        retryable: true,
      });
    }

    return data;
  });
}

interface AlphaVantageSearchMatch {
  "1. symbol"?: string;
  "2. name"?: string;
  "4. region"?: string;
}
interface AlphaVantageSearchResponse {
  bestMatches?: AlphaVantageSearchMatch[];
}

/**
 * Fallback for Finnhub's /search - Alpha Vantage's SYMBOL_SEARCH by company
 * name, returning all ranked candidates (not just the top one) so they can
 * be merged into suggestions when nothing is a confident match.
 */
export async function searchCandidatesAlphaVantage(query: string, limit = 8): Promise<Company[]> {
  const data = await alphaVantageGet<AlphaVantageSearchResponse>({
    function: "SYMBOL_SEARCH",
    keywords: query,
  });
  return (data.bestMatches ?? [])
    .filter((m) => m["1. symbol"])
    .slice(0, limit)
    .map((m) => ({
      name: m["2. name"] ?? query,
      ticker: m["1. symbol"]!,
      exchange: m["4. region"] ?? "",
      country: "",
    }));
}


interface AlphaVantageOverview {
  Exchange?: string;
  Country?: string;
  Sector?: string;
  Industry?: string;
  MarketCapitalization?: string;
  PERatio?: string;
  EPS?: string;
  DividendYield?: string;
  ProfitMargin?: string;
  "52WeekHigh"?: string;
  "52WeekLow"?: string;
}

function toNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/** Backs both the profile and finance fallbacks - one OVERVIEW call covers both domains. */
export async function getOverviewAlphaVantage(ticker: string): Promise<AlphaVantageOverview> {
  return alphaVantageGet<AlphaVantageOverview>({ function: "OVERVIEW", symbol: ticker });
}

/** Maps an Alpha Vantage OVERVIEW response onto our CompanyProfile shape. */
export function overviewToProfile(overview: AlphaVantageOverview): CompanyProfile {
  return {
    ceo: "Unknown", // not returned by OVERVIEW either
    ipo: "Unknown",
    industry: overview.Industry ?? "Unknown",
    website: "",
    logo: "",
    marketCap: toNumber(overview.MarketCapitalization) ?? 0,
    currency: "USD",
    country: overview.Country ?? "Unknown",
  };
}

/** Maps an Alpha Vantage OVERVIEW response onto our FinancialMetrics shape. */
export function overviewToFinancials(overview: AlphaVantageOverview): FinancialMetrics {
  const dividendYield = toNumber(overview.DividendYield);
  const profitMargin = toNumber(overview.ProfitMargin);

  return {
    peRatio: toNumber(overview.PERatio),
    eps: toNumber(overview.EPS),
    marketCap: toNumber(overview.MarketCapitalization),
    // Alpha Vantage returns these as decimal fractions (e.g. "0.005"),
    // unlike Finnhub's already-percentage values - normalize to a
    // percentage here so BOTH providers produce the same units for
    // formatPercent() downstream, regardless of which one answered.
    dividendYield: dividendYield !== undefined ? dividendYield * 100 : undefined,
    profitMargin: profitMargin !== undefined ? profitMargin * 100 : undefined,
    debtRatio: undefined, // not returned by OVERVIEW
    week52High: toNumber(overview["52WeekHigh"]),
    week52Low: toNumber(overview["52WeekLow"]),
    revenue: undefined, // not returned by OVERVIEW
  };
}
