import { getEnv } from "@/config/env";
import { searchCandidatesFinnhub } from "./finnhub/companyService";
import { searchCandidatesAlphaVantage } from "./alphaVantage";
import { askAIJson } from "@/services/ai/aiService";
import { SUBSIDIARY_LOOKUP_PROMPT } from "@/services/ai/prompts";
import { CompanyNotFoundError, ProviderError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { Company, CompanyNotFoundInfo } from "@/types/company";

const SCOPE = "Data:Company";
const MAX_SUGGESTIONS = 5;

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Heuristic "is this candidate actually what the user meant" check, not a
 * full fuzzy-match library - deliberately simple since a false "confident
 * match" (silently researching the wrong company) is worse than an
 * occasional unnecessary "not found" that still shows the same candidate
 * as a one-click suggestion. Matches on exact ticker, or the candidate's
 * name and the query sharing a meaningful prefix/substring once both are
 * normalized (so "Apple", "apple inc", and "APPLE INC." all match "Apple Inc").
 */
function isConfidentMatch(query: string, candidate: Company): boolean {
  const nq = normalize(query);
  if (nq.length < 2) return false;
  const nName = normalize(candidate.name);
  const nTicker = normalize(candidate.ticker);
  if (nq === nTicker) return true;
  if (nName.startsWith(nq) || nq.startsWith(nName)) return true;
  if (nq.length >= 4 && nName.includes(nq)) return true;
  return false;
}

/** Dedupes candidates from multiple providers by ticker, preserving order (most relevant first). */
function mergeCandidates(lists: Company[][]): Company[] {
  const seen = new Set<string>();
  const merged: Company[] = [];
  for (const list of lists) {
    for (const candidate of list) {
      const key = candidate.ticker.toUpperCase();
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(candidate);
    }
  }
  return merged;
}

/**
 * Best-effort check for whether an unmatched query is a brand/product/
 * subsidiary of a company that DOES trade publicly (e.g. "Instagram" ->
 * Meta Platforms). Never throws - a failure here should degrade to "no
 * subsidiary info" rather than breaking the whole not-found response, since
 * it's a nice-to-have on top of the suggestions list, not the main signal.
 */
async function lookupSubsidiary(query: string): Promise<CompanyNotFoundInfo["subsidiary"]> {
  try {
    const result = await askAIJson<{
      isSubsidiary: boolean;
      parentName: string | null;
      parentTicker: string | null;
      note: string | null;
    }>(SUBSIDIARY_LOOKUP_PROMPT(query));

    if (!result.isSubsidiary || !result.parentName || !result.note) return null;
    return { parentName: result.parentName, parentTicker: result.parentTicker, note: result.note };
  } catch (error) {
    logger.warn(SCOPE, "Subsidiary lookup failed - continuing without it", {
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Resolves a free-text company name/ticker to a canonical Company.
 * Queries Finnhub and (if configured) Alpha Vantage in parallel and merges
 * their candidates, rather than a first-wins fallback - this is what lets
 * suggestions come from either source, so a company one provider doesn't
 * cover isn't silently dropped.
 *
 * If nothing is a confident match, this ALWAYS resolves with a helpful
 * response rather than a bare failure: it throws CompanyNotFoundError
 * carrying up to 5 candidate suggestions plus (best-effort) a note on
 * whether the query is a subsidiary/brand of a public company - see
 * lib/errors.ts and types/company.ts CompanyNotFoundInfo.
 *
 * Only throws a different error (ProviderError) when every data source
 * failed outright (e.g. both APIs down/misconfigured) - that's a real
 * infrastructure problem, distinct from "the company just isn't public,"
 * and callers/UI should treat the two differently.
 */
export async function findCompany(query: string): Promise<Company> {
  const results = await Promise.allSettled([
    searchCandidatesFinnhub(query),
    getEnv().ALPHAVANTAGE_API_KEY ? searchCandidatesAlphaVantage(query) : Promise.resolve<Company[]>([]),
  ]);

  const succeeded = results.filter((r) => r.status === "fulfilled") as PromiseFulfilledResult<Company[]>[];
  if (succeeded.length === 0) {
    const firstFailure = results.find((r) => r.status === "rejected") as PromiseRejectedResult | undefined;
    throw new ProviderError("All company search sources failed", {
      provider: SCOPE,
      retryable: true,
      cause: firstFailure?.reason,
    });
  }

  const candidates = mergeCandidates(succeeded.map((r) => r.value));
  const strongMatch = candidates.find((c) => isConfidentMatch(query, c));
  if (strongMatch) {
    logger.success(SCOPE, `Confident match for "${query}": ${strongMatch.ticker}`);
    return strongMatch;
  }

  logger.info(SCOPE, `No confident match for "${query}" - building suggestions + subsidiary check`);
  const subsidiary = await lookupSubsidiary(query);
  throw new CompanyNotFoundError({
    query,
    suggestions: candidates.slice(0, MAX_SUGGESTIONS),
    subsidiary,
  });
}
