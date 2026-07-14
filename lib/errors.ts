/**
 * Application-wide error hierarchy.
 *
 * WHY one file for all four classes rather than one file each: they're
 * small, always imported together at every call site (a route rarely
 * wants ValidationError without also handling ProviderError/AIError), and
 * grouping them here means the full shape of "every error this app throws
 * on purpose" is visible in one scroll - splitting them into four files
 * would trade that overview for a directory listing, for no real benefit
 * at this size. Add a fifth subclass here the same way if a new error
 * category is ever needed.
 *
 * Every deliberate throw in this codebase should be one of these, not a
 * bare `new Error(...)` - that's what lets lib/http.ts's toErrorResponse()
 * treat "errors we expected and have a safe message for" (AppError and
 * subclasses) differently from "something actually went wrong that we
 * didn't plan for" (anything else), without inspecting error messages.
 */

export interface AppErrorOptions {
  /** Machine-readable identifier for clients/logs, e.g. "VALIDATION_ERROR". */
  code: string;
  /** HTTP status this error should map to. Defaults to 500. */
  statusCode?: number;
  /**
   * True for expected, "operational" failures (bad input, an upstream API
   * being down) that are a normal part of running the app - as opposed to
   * a programming bug. Reserved for future use by process-level handlers
   * that might want to keep running after an operational error but crash
   * loudly on a non-operational one; every error defined in this file is
   * operational by definition.
   */
  isOperational?: boolean;
  /** The original error/value that caused this, kept for server-side logs only - never serialized to a client. */
  cause?: unknown;
}

/**
 * Base class for every deliberate error in this app. Carries enough
 * structure (code + statusCode) for API routes to respond correctly
 * without string-matching messages, and a toClientResponse() method so
 * "what's safe to show the user" is decided once, next to the error
 * itself, instead of re-derived at every catch block.
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, options: AppErrorOptions) {
    super(message, { cause: options.cause });
    this.name = new.target.name;
    this.code = options.code;
    this.statusCode = options.statusCode ?? 500;
    this.isOperational = options.isOperational ?? true;

    // V8-specific, but harmless to call unconditionally elsewhere - keeps
    // this constructor frame out of the stack trace for cleaner logs.
    Error.captureStackTrace?.(this, this.constructor);
  }

  /**
   * What's safe to send to the client: the message and a machine-readable
   * code, nothing else. Subclasses override this when even the default
   * message is too internal to show as-is (see AIError below).
   */
  toClientResponse(): { error: string; code: string } {
    return { error: this.message, code: this.code };
  }
}

/**
 * Bad input - a request body that failed schema validation, or (via
 * config/env.ts) a missing/malformed required environment variable at
 * startup. Always a 400: the caller sent something the API can't accept,
 * as opposed to the API failing on its own.
 */
export class ValidationError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, { code: "VALIDATION_ERROR", statusCode: 400, cause });
  }
}

/**
 * A single external provider call failed - one HTTP request to Gemini,
 * OpenRouter, Finnhub, Alpha Vantage, or NewsAPI. Carries `provider` (which
 * one) and `retryable` (whether the failure looks transient) so retry.ts
 * and the fallback orchestrators (services/ai/providers.ts,
 * lib/withFallback.ts) can make decisions without re-deriving that from a
 * raw status code every time. Default statusCode is 502 (Bad Gateway):
 * OUR API is fine, an upstream we depend on isn't.
 */
export class ProviderError extends AppError {
  public readonly provider: string;
  public readonly retryable: boolean;

  constructor(
    message: string,
    params: { provider: string; retryable?: boolean; statusCode?: number; cause?: unknown }
  ) {
    super(message, {
      code: "PROVIDER_ERROR",
      statusCode: params.statusCode ?? 502,
      cause: params.cause,
    });
    this.provider = params.provider;
    this.retryable = params.retryable ?? false;
  }
}

/**
 * The AI layer as a whole failed - every configured provider in the
 * fallback chain was tried (each with its own retries) and none
 * succeeded. Distinct from ProviderError (one attempt failing) vs this
 * (the entire chain exhausted). Carries the individual ProviderErrors for
 * server-side logs, but overrides toClientResponse() because "Gemini said
 * X, then OpenRouter said Y" is internal diagnostic detail, not something
 * a user needs - they just need to know to try again shortly.
 */
/**
 * A search query didn't confidently resolve to a public company/ticker.
 * Carries `suggestions` (near-miss candidates from the search providers)
 * and an optional `subsidiary` hint (see CompanyNotFoundInfo) so the client
 * can render a helpful "here's what we found instead" screen rather than a
 * bare error message. Always a 404: the API is working fine, the query
 * just doesn't map to a tradable company.
 */
export class CompanyNotFoundError extends AppError {
  public readonly info: import("@/types/company").CompanyNotFoundInfo;

  constructor(info: import("@/types/company").CompanyNotFoundInfo) {
    super(`No publicly traded company matched "${info.query}"`, {
      code: "COMPANY_NOT_FOUND",
      statusCode: 404,
    });
    this.info = info;
  }

  toClientResponse() {
    return { error: this.message, code: this.code, ...this.info };
  }
}

export class AIError extends AppError {
  public readonly attempts: ProviderError[];

  constructor(message: string, attempts: ProviderError[] = [], cause?: unknown) {
    super(message, { code: "AI_UNAVAILABLE", statusCode: 503, cause });
    this.attempts = attempts;
  }

  toClientResponse(): { error: string; code: string } {
    return {
      error: "The AI assistant is temporarily unavailable. Please try again shortly.",
      code: this.code,
    };
  }
}
