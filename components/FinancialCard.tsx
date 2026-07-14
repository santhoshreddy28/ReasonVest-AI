import type { FinancialMetrics } from "@/types/finance";
import { formatCurrency, formatPercent, formatNumber } from "@/lib/helpers";

export default function FinancialCard({ finance }: { finance: FinancialMetrics }) {
  const rows: [string, string][] = [
    ["Market Cap", formatCurrency(finance.marketCap)],
    ["P/E Ratio", formatNumber(finance.peRatio)],
    ["EPS", formatNumber(finance.eps)],
    ["Dividend Yield", formatPercent(finance.dividendYield)],
    ["Profit Margin", formatPercent(finance.profitMargin)],
    ["Debt Ratio", formatNumber(finance.debtRatio)],
    ["52-Week High", formatCurrency(finance.week52High)],
    ["52-Week Low", formatCurrency(finance.week52Low)],
  ];

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5">
      <h3 className="text-white font-semibold mb-3">Financial Overview</h3>
      <div className="grid grid-cols-2 gap-3 text-sm">
        {rows.map(([label, value]) => (
          <div key={label}>
            <p className="text-slate-500">{label}</p>
            <p className="text-white font-medium">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
