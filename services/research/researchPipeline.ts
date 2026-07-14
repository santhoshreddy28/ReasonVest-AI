// The real LangGraph.js workflow.
//
//        START
//          |
//       validate
//        / | \
//  profile finance news   <- run IN PARALLEL (none depend on each other,
//        \ | /                only on the ticker resolved by "validate")
//        analyze
//          |
//         END
//
// Deviation from a strictly sequential pipeline: profile/finance/news each
// only need the resolved ticker, not each other's output, so parallelizing
// them is a genuine speed win and the actual reason to use LangGraph here
// instead of one long prompt or a plain linear chain.

import { StateGraph, START, END, Annotation } from "@langchain/langgraph";
import { findCompany } from "@/services/data/companyDataService";
import { getCompanyProfile } from "@/services/data/profileDataService";
import { getFinancialMetrics } from "@/services/data/financeDataService";
import { getCompanyNews } from "@/services/data/newsDataService";
import { askAIJson } from "@/services/ai/aiService";
import { ANALYSIS_PROMPT } from "@/services/ai/prompts";
import { getCachedReport, setCachedReport } from "@/lib/cache/reportCache";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { Company, CompanyProfile } from "@/types/company";
import type { FinancialMetrics } from "@/types/finance";
import type { NewsArticle } from "@/types/news";
import type { AIAnalysis, ResearchReport } from "@/types/analysis";

const SCOPE = "Research";

// Expected shape of the AI's parsed JSON response (see ANALYSIS_PROMPT).
// Declared as Partial since we can't fully trust the model followed the
// format - every field is validated explicitly below before use.
interface RawAnalysisJson {
  recommendation: string;
  confidence: number;
  investmentScore: number;
  summary: string;
  bullCase: string[];
  bearCase: string[];
  risks: string[];
  opportunities: string[];
  newsImpact: string;
  verdict: string;
  futureOutlook: string;
}

const REQUIRED_ANALYSIS_FIELDS: (keyof RawAnalysisJson)[] = [
  "recommendation",
  "confidence",
  "investmentScore",
  "summary",
  "bullCase",
  "bearCase",
  "risks",
  "opportunities",
  "newsImpact",
  "verdict",
  "futureOutlook",
];

/**
 * Validates and narrows the AI's parsed JSON into a trustworthy AIAnalysis.
 * No fallback objects: if a required field is missing or the recommendation
 * isn't one of the three allowed values, this throws with the actual parsed
 * response attached, so the real problem is visible in server logs instead
 * of quietly shipping a fake "successful" HOLD/50/50 result to the user.
 */
function toValidatedAnalysis(parsed: Partial<RawAnalysisJson>): AIAnalysis {
  const missingFields = REQUIRED_ANALYSIS_FIELDS.filter((field) => parsed[field] === undefined);
  if (missingFields.length > 0) {
    throw new AppError(`AI analysis response is missing required fields: ${missingFields.join(", ")}`, {
      code: "INVALID_ANALYSIS_RESPONSE",
      statusCode: 502,
      cause: parsed,
    });
  }

  if (parsed.recommendation !== "BUY" && parsed.recommendation !== "HOLD" && parsed.recommendation !== "SELL") {
    throw new AppError(
      `AI returned an invalid "recommendation" value: ${JSON.stringify(parsed.recommendation)}`,
      { code: "INVALID_ANALYSIS_RESPONSE", statusCode: 502, cause: parsed }
    );
  }

  return {
    recommendation: parsed.recommendation,
    confidence: parsed.confidence as number,
    investmentScore: parsed.investmentScore as number,
    summary: parsed.summary as string,
    bullCase: parsed.bullCase as string[],
    bearCase: parsed.bearCase as string[],
    risks: parsed.risks as string[],
    opportunities: parsed.opportunities as string[],
    newsImpact: parsed.newsImpact as string,
    verdict: parsed.verdict as string,
    futureOutlook: parsed.futureOutlook as string,
  };
}

const StateAnnotation = Annotation.Root({
  query: Annotation<string>,
  company: Annotation<Company | undefined>,
  profile: Annotation<CompanyProfile | undefined>,
  finance: Annotation<FinancialMetrics | undefined>,
  news: Annotation<NewsArticle[] | undefined>,
  analysis: Annotation<AIAnalysis | undefined>,
});

type PipelineState = typeof StateAnnotation.State;

const graph = new StateGraph(StateAnnotation)
  .addNode("validate", async (state) => {
    // findCompany() always resolves to a confident match or throws
    // CompanyNotFoundError itself (with suggestions + subsidiary info
    // attached) - see services/data/companyDataService.ts - so there's no
    // null case to branch on here anymore.
    const company = await findCompany(state.query);
    return { company };
  })
  // Node names below are prefixed ("fetchProfile" not "profile") because
  // LangGraph doesn't allow a node name to collide with a state field name -
  // the state already has a "profile"/"finance"/"news" channel.
  .addNode("fetchProfile", async (state) => ({
    profile: await getCompanyProfile(state.company!.ticker),
  }))
  .addNode("fetchFinance", async (state) => ({
    finance: await getFinancialMetrics(state.company!.ticker),
  }))
  .addNode("fetchNews", async (state) => ({
    news: await getCompanyNews(state.company!.ticker, state.company!.name),
  }))
  .addNode("analyze", async (state) => {
    const context = JSON.stringify({
      company: state.company,
      profile: state.profile,
      finance: state.finance,
      news: state.news,
    });

    const parsed = await askAIJson<Partial<RawAnalysisJson>>(ANALYSIS_PROMPT(context));
    return { analysis: toValidatedAnalysis(parsed) };
  })
  .addEdge(START, "validate")
  .addEdge("validate", "fetchProfile")
  .addEdge("validate", "fetchFinance")
  .addEdge("validate", "fetchNews")
  .addEdge("fetchProfile", "analyze")
  .addEdge("fetchFinance", "analyze")
  .addEdge("fetchNews", "analyze")
  .addEdge("analyze", END);

const compiledGraph = graph.compile();

/**
 * Narrows the graph's final state (where every field is technically
 * optional, per Annotation's typing) into a fully-populated ResearchReport.
 * The missing-field branch here should be unreachable - the graph's edges
 * guarantee every fetch node ran before "analyze" returned - but this fails
 * loudly instead of silently shipping a report with missing sections if
 * that invariant is ever broken by a future edit to the graph.
 */
function toResearchReport(state: PipelineState, query: string): ResearchReport {
  const { company, profile, finance, news, analysis } = state;
  if (!company || !profile || !finance || !news || !analysis) {
    throw new AppError(`Research pipeline for "${query}" completed without producing a full report`, {
      code: "INCOMPLETE_PIPELINE_RESULT",
      statusCode: 500,
      cause: state,
    });
  }
  return { company, profile, finance, news, analysis };
}

/**
 * Runs the full research pipeline for `query`, or returns a cached report
 * from the last 15 minutes if one exists. This is the ONLY exported entry
 * point - both app/api/research/route.ts and services/research/
 * compareService.ts call this, so both automatically get caching and the
 * same validated, typed report shape without duplicating any of this logic.
 */
export async function runResearchPipeline(query: string): Promise<ResearchReport> {
  const cached = await getCachedReport(query);
  if (cached) {
    logger.info(SCOPE, `Cache hit for "${query}"`);
    return cached;
  }

  logger.info(SCOPE, `Cache miss for "${query}" - running pipeline`);
  const state = (await compiledGraph.invoke({ query })) as PipelineState;
  const report = toResearchReport(state, query);

  await setCachedReport(query, report);
  return report;
}
