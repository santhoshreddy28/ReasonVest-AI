import { MemoryCache } from "./memoryCache";
import { getMongoClient } from "@/lib/db/mongoClient";
import { logger } from "@/lib/logger";
import type { ResearchReport } from "@/types/analysis";

const SCOPE = "ReportCache";

// 15 minutes: long enough to absorb repeat searches for the same company in
// a short window (the exact case that matters - avoiding running the full
// pipeline, including a Gemini call, twice for the same input seconds
// apart), short enough that the live news and analysis inside a report
// don't go stale.
const TTL_MS = 15 * 60 * 1000;
const COLLECTION = "research_report_cache";

interface CachedDocument {
  _id: string;
  report: ResearchReport;
  cachedAt: Date;
  expiresAt: Date;
}

const memory = new MemoryCache<ResearchReport>(TTL_MS);

export function normalizeReportCacheKey(query: string): string {
  return query.trim().toLowerCase();
}

/**
 * Reads a cached report for `query`, checking the fast in-memory tier
 * first (private to this one server instance) and falling back to Mongo
 * (shared across every instance, survives restarts) when it's configured.
 * A Mongo hit is written back into memory so the next request on this
 * instance skips the database round-trip entirely.
 */
export async function getCachedReport(query: string): Promise<ResearchReport | null> {
  const key = normalizeReportCacheKey(query);

  const inMemory = memory.get(key);
  if (inMemory) return inMemory;

  const client = await getMongoClient().catch(() => null);
  if (!client) return null;

  const doc = await client
    .db()
    .collection<CachedDocument>(COLLECTION)
    .findOne({ _id: key, expiresAt: { $gt: new Date() } });

  if (!doc) return null;

  memory.set(key, doc.report);
  return doc.report;
}

/**
 * Writes `report` to both cache tiers. Failure to persist to Mongo is
 * logged and swallowed rather than thrown - caching is a performance
 * optimization, not a correctness requirement, and a cache write failing
 * should never fail a request that already has a valid report to return.
 */
export async function setCachedReport(query: string, report: ResearchReport): Promise<void> {
  const key = normalizeReportCacheKey(query);
  memory.set(key, report);

  const client = await getMongoClient().catch(() => null);
  if (!client) return;

  const now = new Date();
  await client
    .db()
    .collection<CachedDocument>(COLLECTION)
    .updateOne(
      { _id: key },
      { $set: { _id: key, report, cachedAt: now, expiresAt: new Date(now.getTime() + TTL_MS) } },
      { upsert: true }
    )
    .catch((error: unknown) => {
      logger.warn(SCOPE, "Failed to persist report to MongoDB", { error });
    });
}
