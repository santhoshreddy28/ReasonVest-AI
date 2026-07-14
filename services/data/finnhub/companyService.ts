import type { Company } from "@/types/company";
import { finnhubGet } from "./finnhubClient";

interface FinnhubSearchResult {
  result?: Array<{ description?: string; symbol?: string; displaySymbol?: string; type?: string }>;
}

/**
 * Returns Finnhub's ranked /search candidates as Companies, most relevant
 * first. Used both for the "confident match" path (caller checks the top
 * few against the query) and to populate suggestions when nothing is a
 * confident match. Skips non-tradable result types (e.g. "Index") - a
 * user's search shouldn't surface an index as if it were a buyable stock.
 */
export async function searchCandidatesFinnhub(query: string, limit = 8): Promise<Company[]> {
  const data = await finnhubGet<FinnhubSearchResult>("/search", { q: query });
  return (data.result ?? [])
    .filter((r) => r.symbol && r.type !== "Index")
    .slice(0, limit)
    .map((r) => ({
      name: r.description ?? query,
      ticker: r.symbol!,
      exchange: r.displaySymbol ?? r.symbol!,
      country: "", // not returned by /search - filled in by profileDataService
    }));
}

