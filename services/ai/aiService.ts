import { completeWithFallback } from "./providers";
import { AIError, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { AIRequest, AIResponse } from "./types";

const SCOPE = "AI";

/**
 * The ONLY function the rest of the app should call to get an AI
 * completion - every page/route asks THIS for "AI thinking," never a
 * specific vendor SDK directly. That single choke point is what makes the
 * fallback chain (Gemini -> OpenRouter -> future providers), any future
 * retry-policy change, and response caching all one-file changes instead
 * of a grep-and-replace across the codebase.
 */
export async function askAI(request: AIRequest): Promise<AIResponse> {
  if (!request.prompt || !request.prompt.trim()) {
    throw new ValidationError("askAI() requires a non-empty prompt");
  }

  const startedAt = Date.now();
  const { text, provider } = await completeWithFallback(request);
  logger.info(SCOPE, `Completed via ${provider} in ${Date.now() - startedAt}ms`);

  return { text, provider };
}

/**
 * Convenience wrapper for the common case of a single prompt with no
 * conversation history or attachments - avoids every simple call site
 * (analysis, compare, follow-up chat) building a full AIRequest object
 * literal just to set one field.
 */
export async function askAISimple(
  prompt: string,
  options: { systemInstruction?: string; jsonMode?: boolean } = {}
): Promise<string> {
  const { text } = await askAI({ prompt, ...options });
  return text;
}

/**
 * Gemini (and its fallback) are instructed to return only JSON, but LLMs
 * don't always obey formatting instructions perfectly - occasional code
 * fences or stray preamble text. This strips the common wrapping and
 * parses safely, throwing a clear AIError instead of returning null for
 * callers to remember to check.
 *
 * WHY this lives in the AI layer instead of a generic helpers file: "get
 * structured data out of the AI" is the AI layer's job end-to-end, not
 * something every caller (the research pipeline, the compare service)
 * should re-implement parsing for - they just want a typed object back.
 */
function extractJson(text: string): unknown {
  const cleaned = text.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return undefined;
  }
}

/**
 * Like askAISimple(), but requests JSON mode and parses the result.
 * Throws AIError (not a type error or a silent null) if the model's
 * response isn't valid JSON, since that's a real failure the caller needs
 * to know about, not a value it should have to null-check.
 */
export async function askAIJson<T = Record<string, unknown>>(
  prompt: string,
  options: { systemInstruction?: string } = {}
): Promise<T> {
  const text = await askAISimple(prompt, { ...options, jsonMode: true });
  const parsed = extractJson(text);

  if (parsed === undefined) {
    throw new AIError(`AI did not return valid JSON. Raw response (truncated): ${text.slice(0, 500)}`);
  }

  return parsed as T;
}
