import { getEnv } from "@/config/env";
import { ProviderError } from "@/lib/errors";
import { fetchWithTimeout, isRetryableStatus, retry } from "@/lib/retry";
import type { NewsArticle } from "@/types/news";

const BASE_URL = "https://newsapi.org/v2/everything";
const TIMEOUT_MS = 10_000;

interface NewsApiArticle {
  title?: string;
  description?: string;
  source?: { name?: string };
  publishedAt?: string;
  url?: string;
}
interface NewsApiResponse {
  status: string;
  articles?: NewsApiArticle[];
  message?: string;
}

function formatDateParam(date: Date): string {
  return date.toISOString().split("T")[0];
}

/** Fallback for Finnhub's company-news - NewsAPI's /v2/everything, keyword-searched by company name. */
export async function getCompanyNewsFromNewsApi(companyName: string): Promise<NewsArticle[]> {
  const { NEWS_API } = getEnv();
  if (!NEWS_API) {
    throw new ProviderError("NewsAPI is not configured", { provider: "newsapi", retryable: false });
  }

  const from = new Date();
  from.setDate(from.getDate() - 30);

  const query = new URLSearchParams({
    q: companyName,
    from: formatDateParam(from),
    sortBy: "publishedAt",
    language: "en",
    pageSize: "10",
    apiKey: NEWS_API,
  }).toString();

  const data = await retry(async () => {
    let response: Response;
    try {
      response = await fetchWithTimeout(`${BASE_URL}?${query}`, { method: "GET" }, TIMEOUT_MS);
    } catch (cause) {
      throw new ProviderError("NewsAPI request failed to complete", {
        provider: "newsapi",
        retryable: true,
        cause,
      });
    }

    if (!response.ok) {
      // See services/ai/gemini.ts for why statusCode is deliberately omitted here.
      throw new ProviderError(`NewsAPI error: ${response.status}`, {
        provider: "newsapi",
        retryable: isRetryableStatus(response.status),
      });
    }

    return (await response.json()) as NewsApiResponse;
  });

  return (data.articles ?? []).slice(0, 10).map((item) => ({
    title: item.title ?? "Untitled",
    summary: item.description ?? "",
    source: item.source?.name ?? "Unknown",
    date: item.publishedAt ?? "",
    url: item.url ?? "",
  }));
}
