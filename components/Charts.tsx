"use client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import type { FinancialMetrics } from "@/types/finance";
import type { AIAnalysis } from "@/types/analysis";

// Bar chart of the percentage-based metrics we actually have from Finnhub
// (profit margin, dividend yield). Other metrics (P/E, EPS, market cap) sit
// on very different scales and aren't meaningfully comparable on one chart -
// those are shown as plain numbers in FinancialCard instead. A historical
// revenue line chart isn't included: that needs Finnhub's financials-reported
// endpoint, a heavier integration not wired up here, rather than fake data.
export function FinancialBarChart({ finance }: { finance: FinancialMetrics }) {
  const data = [
    { name: "Profit Margin", value: finance.profitMargin ?? 0 },
    { name: "Dividend Yield", value: finance.dividendYield ?? 0 },
  ];

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data}>
        <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
        <YAxis stroke="#94a3b8" fontSize={12} />
        <Tooltip />
        <Bar dataKey="value" fill="#3B82F6" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// Radar chart of AI-derived signal scores (not raw financial data) - a quick
// visual read of confidence/score/risk alongside the written analysis.
export function SignalRadarChart({ analysis }: { analysis: AIAnalysis }) {
  const riskIndex = Math.max(0, 100 - analysis.risks.length * 20);

  const data = [
    { subject: "Confidence", value: analysis.confidence },
    { subject: "Score", value: analysis.investmentScore },
    { subject: "Low Risk", value: riskIndex },
    { subject: "Opportunities", value: Math.min(100, analysis.opportunities.length * 25) },
    { subject: "Bull Strength", value: Math.min(100, analysis.bullCase.length * 25) },
  ];

  return (
    <ResponsiveContainer width="100%" height={220}>
      <RadarChart data={data}>
        <PolarGrid stroke="#334155" />
        <PolarAngleAxis dataKey="subject" stroke="#94a3b8" fontSize={11} />
        <PolarRadiusAxis domain={[0, 100]} stroke="#334155" tick={false} />
        <Radar dataKey="value" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.4} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
