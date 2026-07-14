import { getEnv } from "@/config/env";
import { withFallback } from "@/lib/withFallback";
import { getCompanyNewsFinnhub } from "./finnhub/newsService";
import { getCompanyNewsFromNewsApi } from "./newsApi";
import type { NewsArticle } from "@/types/news";

/**
 * Needs both `ticker` (Finnhub's /company-news is symbol-based) and
 * `companyName` (NewsAPI's /everything is keyword-based, and has no
 * concept of a ticker symbol) - the two APIs query news completely
 * differently, so the orchestrator has to carry what each one needs.
 */
export async function getCompanyNews(ticker: string, companyName: string): Promise<NewsArticle[]> {
  return withFallback<NewsArticle[]>("Data:News", [
    { label: "Finnhub", isAvailable: true, run: () => getCompanyNewsFinnhub(ticker) },
    {
      label: "NewsAPI",
      isAvailable: Boolean(getEnv().NEWS_API),
      run: () => getCompanyNewsFromNewsApi(companyName),
    },
  ]);
}
