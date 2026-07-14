import { runResearchPipeline } from "./researchPipeline";
import { askAIJson } from "@/services/ai/aiService";
import { COMPARE_PROMPT } from "@/services/ai/prompts";
import type { ResearchReport, ComparisonResult } from "@/types/analysis";

export interface CompareResult {
  reportA: ResearchReport;
  reportB: ResearchReport;
  comparison: ComparisonResult;
}

/**
 * Runs the research pipeline for both companies in parallel (they're
 * completely independent - no reason to make the second wait on the
 * first), then asks the AI layer for a structured comparison of the two
 * finished reports. Both underlying runResearchPipeline() calls benefit
 * from report caching automatically, so comparing two already-recently-
 * researched companies is close to instant.
 */
export async function compareCompanies(queryA: string, queryB: string): Promise<CompareResult> {
  const [reportA, reportB] = await Promise.all([
    runResearchPipeline(queryA),
    runResearchPipeline(queryB),
  ]);

  const comparison = await askAIJson<ComparisonResult>(
    COMPARE_PROMPT(JSON.stringify(reportA), JSON.stringify(reportB))
  );

  return { reportA, reportB, comparison };
}
