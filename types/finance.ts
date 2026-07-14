// Every field is `| null` in addition to optional because that's the real
// shape Finnhub's /stock/metric endpoint returns: it sends an explicit
// `null` (not a missing key) for a ratio that doesn't apply to a given
// company - e.g. P/E for a company with negative trailing earnings. Typing
// these as just `number | undefined` let that null slip past compile-time
// checks straight into a `.toFixed()` call. Always read these through
// formatNumber/formatCurrency/formatPercent (lib/helpers.ts), which handle
// both null and undefined.
export interface FinancialMetrics {
  revenue?: number | null;
  peRatio?: number | null;
  eps?: number | null;
  marketCap?: number | null;
  dividendYield?: number | null;
  profitMargin?: number | null;
  debtRatio?: number | null;
  week52High?: number | null;
  week52Low?: number | null;
}
