import type { NewsArticle } from "@/types/news";
import { finnhubGet } from "./finnhubClient";

// Shape of Finnhub's raw company-news items - fields are optional here
// since the exact response hasn't been verified against a live call.
interface FinnhubNewsItem {
  headline?: string;
  summary?: string;
  source?: string;
  datetime?: number;
  url?: string;
}

function formatDateParam(date: Date): string {
  return date.toISOString().split("T")[0];
}

export async function getCompanyNewsFinnhub(ticker: string): Promise<NewsArticle[]> {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);

  const items = await finnhubGet<FinnhubNewsItem[]>("/company-news", {
    symbol: ticker,
    from: formatDateParam(from),
    to: formatDateParam(to),
  });

  const list = Array.isArray(items) ? items : [];

  return list.slice(0, 10).map((item) => ({
    title: item.headline ?? "Untitled",
    summary: item.summary ?? "",
    source: item.source ?? "Unknown",
    date: item.datetime ? new Date(item.datetime * 1000).toISOString() : "",
    url: item.url ?? "",
  }));
}
