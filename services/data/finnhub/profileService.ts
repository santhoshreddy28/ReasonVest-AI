import type { CompanyProfile } from "@/types/company";
import { finnhubGet } from "./finnhubClient";

interface FinnhubProfile {
  ipo?: string;
  finnhubIndustry?: string;
  weburl?: string;
  logo?: string;
  marketCapitalization?: number;
  currency?: string;
  country?: string;
}

export async function getCompanyProfileFinnhub(ticker: string): Promise<CompanyProfile> {
  const data = await finnhubGet<FinnhubProfile>("/stock/profile2", { symbol: ticker });

  return {
    // NOTE (known gap): Finnhub's free profile2 endpoint does not actually
    // include a CEO name field. Left as "Unknown" rather than fabricated -
    // a paid endpoint or a different data source would be needed for this.
    ceo: "Unknown",
    ipo: data.ipo ?? "Unknown",
    industry: data.finnhubIndustry ?? "Unknown",
    website: data.weburl ?? "",
    logo: data.logo ?? "",
    // Finnhub returns marketCapitalization in MILLIONS - convert to raw
    // dollars for consistency with financeService.ts and formatCurrency().
    marketCap: data.marketCapitalization !== undefined ? data.marketCapitalization * 1_000_000 : 0,
    currency: data.currency ?? "USD",
    country: data.country ?? "Unknown",
  };
}
