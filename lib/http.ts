import { NextResponse } from "next/server";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

/**
 * Turns any thrown value into a safe NextResponse, and is the ONE place in
 * the app that decides what an error looks like on the wire. Every route
 * handler should funnel its catch block through this instead of
 * hand-rolling `{ error: err.message }` - that pattern is how internal
 * details (stack traces, raw upstream error bodies, file paths) end up
 * leaking to clients, which is exactly what this centralizes against.
 */
export function toErrorResponse(err: unknown, scope: string): NextResponse {
  if (err instanceof AppError) {
    // An AppError is an error we anticipated and already gave a safe,
    // user-facing message (see lib/errors.ts) - log it at "warn" since
    // it's expected operational noise, not a bug, and it's safe to reuse
    // the class's own client-facing response as-is.
    logger.warn(scope, err.message, { code: err.code, statusCode: err.statusCode });
    return NextResponse.json(err.toClientResponse(), { status: err.statusCode });
  }

  // Anything else is unanticipated - log the full detail server-side (this
  // is the only place that should ever see a raw stack trace) but return a
  // generic message. The client never needs to know whether this was a
  // null-pointer bug, a JSON parse failure, or something else entirely.
  logger.error(scope, "Unhandled error", {
    error: err instanceof Error ? { message: err.message, stack: err.stack } : err,
  });
  return NextResponse.json(
    { error: "Something went wrong. Please try again.", code: "INTERNAL_ERROR" },
    { status: 500 }
  );
}
