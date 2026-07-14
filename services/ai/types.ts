/**
 * Every interface used by the AI provider layer (services/ai/*), collected
 * here rather than declared inline in each file - gemini.ts, openrouter.ts,
 * providers.ts, and aiService.ts all import from this single source of
 * truth instead of each redefining (and risking drifting) the same shapes.
 *
 * This deliberately does NOT include vendor wire-format types (Gemini's or
 * OpenRouter's raw JSON response shapes) - those are an implementation
 * detail private to gemini.ts/openrouter.ts respectively, not part of the
 * AI layer's public contract, so they stay unexported in those files.
 */

export type AIProviderName = "gemini" | "openrouter";

/** An image or document attached to a single AI request. */
export interface AIAttachment {
  mimeType: string;
  /** Raw base64 payload - no "data:mime;base64," prefix. */
  data: string;
}

/** One prior turn of a multi-turn conversation. */
export interface AIHistoryTurn {
  role: "user" | "model";
  text: string;
}

export interface AIRequest {
  /** The current turn's text - the only required field. */
  prompt: string;
  /** Persona/behavior instructions, kept separate from the conversation itself. */
  systemInstruction?: string;
  /** Prior turns, oldest first. Omit for a single-shot (non-conversational) request. */
  history?: AIHistoryTurn[];
  /** Images/documents attached to THIS turn only. */
  attachments?: AIAttachment[];
  /** Ask the provider to constrain output to valid JSON. */
  jsonMode?: boolean;
}

export interface AIResponse {
  text: string;
  /** Which provider in the fallback chain actually produced this response. */
  provider: AIProviderName;
}

/**
 * The contract every AI backend implements. providers.ts (the fallback
 * orchestrator) only ever depends on THIS interface, never a concrete
 * vendor SDK - which is what makes adding a new provider later (Groq,
 * Claude, GPT, ...) a two-step, single-file-plus-one-line change:
 * implement this interface in its own file, then add it to the chain in
 * providers.ts. No other file in the app needs to change.
 */
export interface AIProvider {
  readonly name: AIProviderName;
  /** Whether this provider has everything it needs (API key, etc.) to be attempted. */
  isConfigured(): boolean;
  /** Performs one completion. Throws ProviderError on any failure. */
  complete(request: AIRequest): Promise<string>;
}

export interface RetryOptions {
  /** Number of retries AFTER the first attempt. Default: 2 (3 total attempts). */
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  /** Decides whether a given failure is worth retrying. Defaults to checking `error.retryable`. */
  isRetryable?: (error: unknown) => boolean;
  /** Called before each retry sleep - used for logging, not control flow. */
  onRetry?: (error: unknown, attempt: number) => void;
}
