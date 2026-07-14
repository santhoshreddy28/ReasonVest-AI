/**
 * A small leveled logger, not a full logging library. WHY hand-rolled
 * instead of pulling in pino/winston: this app runs on Next.js's own
 * server runtime (and Vercel's log pipeline in production), which already
 * captures stdout/stderr and timestamps every line - a heavier logger
 * would mostly be re-solving a problem the hosting platform already
 * solves, in exchange for a real dependency and its own config surface.
 * If this ever needs to ship structured logs to an external aggregator,
 * `emit()` below is the one place to swap `console.*` for that client.
 */

type LogLevel = "debug" | "info" | "success" | "warn" | "error";

/** Arbitrary structured context attached to a log line - request ids, provider names, durations, etc. */
type LogFields = Record<string, unknown>;

const LEVEL_PREFIX: Record<LogLevel, string> = {
  debug: "⚪",
  info: "🔵",
  success: "🟢",
  warn: "🟡",
  error: "🔴",
};

function emit(level: LogLevel, scope: string, message: string, fields?: LogFields): void {
  const line = `${LEVEL_PREFIX[level]} [${scope}] ${message}`;
  const hasFields = fields && Object.keys(fields).length > 0;

  // Routed to the matching console method (not always console.log) so
  // platform log pipelines that bucket by stream/severity - Vercel,
  // Datadog, CloudWatch - sort these correctly without extra config.
  switch (level) {
    case "error":
      if (hasFields) console.error(line, fields);
      else console.error(line);
      break;
    case "warn":
      if (hasFields) console.warn(line, fields);
      else console.warn(line);
      break;
    default:
      if (hasFields) console.log(line, fields);
      else console.log(line);
  }
}

export const logger = {
  /** Verbose diagnostic detail - safe to be noisy, not shown by default log levels in most platforms. */
  debug: (scope: string, message: string, fields?: LogFields) => emit("debug", scope, message, fields),
  /** Routine, expected events worth a record - "falling back to X", "cache miss". */
  info: (scope: string, message: string, fields?: LogFields) => emit("info", scope, message, fields),
  /** Something that was attempted and worked - a provider call, a cache write. */
  success: (scope: string, message: string, fields?: LogFields) => emit("success", scope, message, fields),
  /** A recoverable problem - a single provider/attempt failed but the app is handling it (retrying, falling back). */
  warn: (scope: string, message: string, fields?: LogFields) => emit("warn", scope, message, fields),
  /** An unrecoverable problem for this request - every fallback exhausted, an unexpected exception. */
  error: (scope: string, message: string, fields?: LogFields) => emit("error", scope, message, fields),
};
