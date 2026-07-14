import type { Company, CompanyProfile } from "./company";
import type { FinancialMetrics } from "./finance";
import type { NewsArticle } from "./news";

// This is the exact JSON shape we ask Gemini to return (see lib/prompts.ts),
// after we validate/reword its output in aiService.ts.
export interface AIAnalysis {
  recommendation: "BUY" | "HOLD" | "SELL";
  confidence: number; // 0-100
  investmentScore: number; // 0-100
  summary: string;
  bullCase: string[];
  bearCase: string[];
  risks: string[];
  opportunities: string[];
  newsImpact: string;
  verdict: string;
  futureOutlook: string;
}

// Full result returned by /api/research once the whole pipeline finishes.
export interface ResearchReport {
  company: Company;
  profile: CompanyProfile;
  finance: FinancialMetrics;
  news: NewsArticle[];
  analysis: AIAnalysis;
}

// This is the exact JSON shape we ask the AI to return for the compare
// feature (see services/ai/prompts.ts COMPARE_PROMPT).
export interface ComparisonResult {
  verdict: string;
  revenueComparison: string;
  growthComparison: string;
  riskComparison: string;
  innovationComparison: string;
}
