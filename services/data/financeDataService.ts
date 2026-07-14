import { getEnv } from "@/config/env";
import { withFallback } from "@/lib/withFallback";
import { getFinancialMetricsFinnhub } from "./finnhub/financeService";
import { getOverviewAlphaVantage, overviewToFinancials } from "./alphaVantage";
import type { FinancialMetrics } from "@/types/finance";

export async function getFinancialMetrics(ticker: string): Promise<FinancialMetrics> {
  return withFallback<FinancialMetrics>("Data:Finance", [
    { label: "Finnhub", isAvailable: true, run: () => getFinancialMetricsFinnhub(ticker) },
    {
      label: "Alpha Vantage",
      isAvailable: Boolean(getEnv().ALPHAVANTAGE_API_KEY),
      run: async () => overviewToFinancials(await getOverviewAlphaVantage(ticker)),
    },
  ]);
}
