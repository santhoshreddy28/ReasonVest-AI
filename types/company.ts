export interface Company {
  name: string;
  ticker: string;
  exchange: string;
  country: string;
}

/**
 * Returned when a search doesn't confidently resolve to one public company,
 * so the UI can offer a next step instead of a dead end. `subsidiary` is
 * only present when the AI (see services/ai/prompts.ts SUBSIDIARY_LOOKUP_PROMPT)
 * is reasonably confident the query is a brand/product/division owned by a
 * public company - e.g. searching "Instagram" surfaces Meta Platforms.
 */
export interface CompanyNotFoundInfo {
  query: string;
  suggestions: Company[];
  subsidiary: {
    parentName: string;
    parentTicker: string | null;
    note: string;
  } | null;
}

export interface CompanyProfile {
  ceo: string;
  ipo: string;
  industry: string;
  website: string;
  logo: string;
  marketCap: number;
  currency: string;
  country: string;
}
