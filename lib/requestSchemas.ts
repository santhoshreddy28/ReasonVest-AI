import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { ValidationError } from "@/lib/errors";

/**
 * Every API route's request body is validated against a schema here before
 * any business logic runs - "validate every input" applied uniformly
 * instead of ad-hoc `if (!x) return 400` checks scattered per route (the
 * previous version of every route in this app did exactly that).
 */

export const attachmentSchema = z.object({
  mimeType: z.string().min(1).max(100),
  // Base64 payloads are large; this is a sanity ceiling (~15MB of base64
  // text), not a precise byte limit - the real per-file size limit is
  // enforced client-side (see lib/constants.ts MAX_ATTACHMENT_BYTES) where
  // it can be checked before spending bandwidth uploading an oversized file.
  data: z.string().min(1).max(20_000_000),
});

export const historyTurnSchema = z.object({
  role: z.enum(["user", "model"]),
  text: z.string().max(8_000),
});

export const researchRequestSchema = z.object({
  query: z.string().trim().min(1, "query is required").max(200),
});

export const chatRequestSchema = z.object({
  // The report is produced by our own pipeline and round-tripped through
  // the client as context for follow-up questions - it isn't re-validated
  // field-by-field here (that would just re-duplicate types/analysis.ts);
  // the AI prompt itself instructs the model to only use what's present,
  // so a malformed report degrades the answer quality, not security.
  report: z.unknown(),
  question: z.string().trim().min(1, "question is required").max(2_000),
  attachments: z.array(attachmentSchema).max(4).optional().default([]),
});

export const assistantRequestSchema = z.object({
  message: z.string().trim().min(1, "message is required").max(2_000),
  history: z.array(historyTurnSchema).max(40).optional().default([]),
  attachments: z.array(attachmentSchema).max(4).optional().default([]),
});

export const compareRequestSchema = z.object({
  queryA: z.string().trim().min(1, "queryA is required").max(200),
  queryB: z.string().trim().min(1, "queryB is required").max(200),
});

/**
 * Parses `data` against `schema`, throwing a readable ValidationError (400)
 * on failure instead of returning a Zod result every call site has to
 * branch on. Keeps every route's happy path a straight line: parse, then
 * use the result - failure already threw before the next line runs.
 */
export function parseRequest<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ValidationError(fromZodError(result.error, { prefix: "Invalid request" }).message);
  }
  return result.data;
}
