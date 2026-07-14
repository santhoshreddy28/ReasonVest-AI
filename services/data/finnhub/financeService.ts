import type { FinancialMetrics } from "@/types/finance";
import { finnhubGet } from "./finnhubClient";

interface FinnhubMetricResponse {
  metric?: {
    peBasicExclExtraTTM?: number;
    epsBasicExclExtraItemsTTM?: number;
    marketCapitalization?: number;
    dividendYieldIndicatedAnnual?: number;
    netProfitMarginTTM?: number;
    "totalDebt/totalEquityQuarterly"?: number;
    "52WeekHigh"?: number;
    "52WeekLow"?: number;
  };
}

export async function getFinancialMetricsFinnhub(ticker: string): Promise<FinancialMetrics> {
  const data = await finnhubGet<FinnhubMetricResponse>("/stock/metric", { symbol: ticker, metric: "all" });
  const metric = data.metric ?? {};

  return {
    peRatio: metric.peBasicExclExtraTTM,
    eps: metric.epsBasicExclExtraItemsTTM,
    // Finnhub returns marketCapitalization in MILLIONS (confirmed against
    // real examples, e.g. 21794.52 for a company worth ~$21.8B) - convert to
    // raw dollars here so downstream formatCurrency() displays it correctly.
    marketCap:
      metric.marketCapitalization !== undefined ? metric.marketCapitalization * 1_000_000 : undefined,
    // dividendYieldIndicatedAnnual and netProfitMarginTTM are already
    // expressed as percentages (e.g. 2.5 means 2.5%), not decimal fractions -
    // passed through as-is; see lib/helpers.ts formatPercent().
    dividendYield: metric.dividendYieldIndicatedAnnual,
    profitMargin: metric.netProfitMarginTTM,
    debtRatio: metric["totalDebt/totalEquityQuarterly"],
    week52High: metric["52WeekHigh"],
    week52Low: metric["52WeekLow"],
    // NOTE (known gap): raw revenue isn't in this endpoint - Finnhub's
    // free "metric=all" returns ratios, not raw financial statement line
    // items. Getting revenue would need /stock/financials-reported, which
    // is a separate, heavier integration. Left undefined rather than faked.
    revenue: undefined,
  };
}
