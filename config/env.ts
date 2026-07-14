import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { ValidationError } from "@/lib/errors";

/**
 * The full set of environment variables this app understands. Split into
 * required vs optional rather than one flat schema: GEMINI_API_KEY and
 * FINNHUB_API_KEY are load-bearing for the core product (AI analysis,
 * company data) and the app genuinely cannot serve a request without them,
 * so we fail loudly and immediately. Everything else gates a specific
 * fallback or enhancement (a second AI provider, a second data source, a
 * cross-instance cache) - missing one of those should degrade that one
 * feature, not take the whole app down, which is why they're optional here
 * and checked individually at the point of use (see hasOpenRouter() etc.
 * and each provider's isConfigured()/isAvailable check).
 */
const envSchema = z.object({
  // --- Required: the app cannot function without these ---
  GEMINI_API_KEY: z
    .string({ message: "GEMINI_API_KEY is required - it's the primary AI provider" })
    .min(1, "GEMINI_API_KEY is required - it's the primary AI provider"),
  FINNHUB_API_KEY: z
    .string({ message: "FINNHUB_API_KEY is required - it's the primary market-data provider" })
    .min(1, "FINNHUB_API_KEY is required - it's the primary market-data provider"),

  // --- Optional: each one unlocks exactly one fallback/feature ---
  OPENROUTER_API_KEY: z.string().min(1).optional(),
  ALPHAVANTAGE_API_KEY: z.string().min(1).optional(),
  NEWS_API: z.string().min(1).optional(),
  MONGODB_URI: z.string().min(1).optional(),

  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

/**
 * Validates and returns process.env, memoized after the first successful
 * call. WHY validate lazily (on first use) instead of at module import
 * time with a bare `parse()`: this file is imported by server-only code
 * paths (services, API routes), and lazy validation means a missing key
 * surfaces as one clear, readable error on the first request that actually
 * needs it, in a normal request/response flow that our error handling
 * (lib/http.ts) can catch and log - not as an uncaught exception during
 * module evaluation that's harder to attribute to a specific request.
 */
export function getEnv(): Env {
  if (cachedEnv) return cachedEnv;

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const readable = fromZodError(result.error, {
      prefix: "Environment validation failed",
      issueSeparator: "; ",
    });
    throw new ValidationError(readable.message);
  }

  cachedEnv = result.data;
  return cachedEnv;
}

/** True when a second AI provider is available to fall back to. */
export function hasOpenRouter(): boolean {
  return Boolean(getEnv().OPENROUTER_API_KEY);
}

/** True when Alpha Vantage can serve as a fallback for company/financial data. */
export function hasAlphaVantage(): boolean {
  return Boolean(getEnv().ALPHAVANTAGE_API_KEY);
}

/** True when NewsAPI can serve as a fallback for company news. */
export function hasNewsApi(): boolean {
  return Boolean(getEnv().NEWS_API);
}

/** True when a MongoDB-backed second cache tier is available. */
export function hasMongo(): boolean {
  return Boolean(getEnv().MONGODB_URI);
}
