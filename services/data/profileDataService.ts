import { getEnv } from "@/config/env";
import { withFallback } from "@/lib/withFallback";
import { getCompanyProfileFinnhub } from "./finnhub/profileService";
import { getOverviewAlphaVantage, overviewToProfile } from "./alphaVantage";
import type { CompanyProfile } from "@/types/company";

export async function getCompanyProfile(ticker: string): Promise<CompanyProfile> {
  return withFallback<CompanyProfile>("Data:Profile", [
    { label: "Finnhub", isAvailable: true, run: () => getCompanyProfileFinnhub(ticker) },
    {
      label: "Alpha Vantage",
      isAvailable: Boolean(getEnv().ALPHAVANTAGE_API_KEY),
      run: async () => overviewToProfile(await getOverviewAlphaVantage(ticker)),
    },
  ]);
}
