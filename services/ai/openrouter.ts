import { getEnv } from "@/config/env";
import { ProviderError } from "@/lib/errors";
import { fetchWithTimeout, isRetryableStatus } from "./retry";
import type { AIProvider, AIRequest } from "./types";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const TIMEOUT_MS = 20_000;

// A solid, inexpensive general-purpose model as the fallback target -
// deliberately NOT a Gemini model. If the primary provider is failing
// because of a Google-side outage or a Google-account-specific quota,
// routing to another Gemini instance wouldn't help; a different underlying
// model is what makes this a REAL fallback rather than the same failure
// twice. Swap this constant if a different quality/cost tradeoff is wanted.
const FALLBACK_MODEL = "openai/gpt-4o-mini";

// OpenRouter's wire format (OpenAI-compatible chat completions) - private
// to this file, same reasoning as gemini.ts's GeminiResponseBody.
type ChatContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | ChatContentPart[];
}

interface OpenRouterResponseBody {
  choices?: Array<{ message?: { content?: string } }>;
}

function buildMessages(request: AIRequest): ChatMessage[] {
  const messages: ChatMessage[] = [];

  if (request.systemInstruction) {
    messages.push({ role: "system", content: request.systemInstruction });
  }

  for (const turn of request.history ?? []) {
    messages.push({ role: turn.role === "model" ? "assistant" : "user", content: turn.text });
  }

  const imageAttachments = (request.attachments ?? []).filter((a) =>
    a.mimeType.startsWith("image/")
  );
  // Non-image attachments (PDF/text/etc.) aren't forwarded here - not
  // every fallback-capable model has Gemini's document understanding, and
  // silently dropping an unsupported mime type is safer than sending one
  // the model can't use. This is a known, accepted gap: Gemini (the
  // primary provider) is what actually handles documents; OpenRouter only
  // needs to be "good enough to keep answering" while Gemini is down.
  if (imageAttachments.length === 0) {
    messages.push({ role: "user", content: request.prompt });
  } else {
    const content: ChatContentPart[] = [{ type: "text", text: request.prompt }];
    for (const image of imageAttachments) {
      content.push({ type: "image_url", image_url: { url: `data:${image.mimeType};base64,${image.data}` } });
    }
    messages.push({ role: "user", content });
  }

  return messages;
}

export const openRouterProvider: AIProvider = {
  name: "openrouter",

  isConfigured(): boolean {
    return Boolean(getEnv().OPENROUTER_API_KEY);
  },

  async complete(request: AIRequest): Promise<string> {
    const { OPENROUTER_API_KEY } = getEnv();
    if (!OPENROUTER_API_KEY) {
      throw new ProviderError("OpenRouter is not configured", {
        provider: "openrouter",
        retryable: false,
      });
    }

    const body: Record<string, unknown> = {
      model: FALLBACK_MODEL,
      messages: buildMessages(request),
    };
    if (request.jsonMode) {
      body.response_format = { type: "json_object" };
    }

    let response: Response;
    try {
      response = await fetchWithTimeout(
        OPENROUTER_URL,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            // Both optional, but OpenRouter asks integrators to identify
            // their app - good citizenship, and it shows up in their
            // dashboard's usage attribution.
            "HTTP-Referer": "https://reasonvest.ai",
            "X-Title": "ReasonVest AI",
          },
          body: JSON.stringify(body),
        },
        TIMEOUT_MS
      );
    } catch (cause) {
      throw new ProviderError("OpenRouter request failed to complete", {
        provider: "openrouter",
        retryable: true,
        cause,
      });
    }

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      // See gemini.ts for why statusCode is deliberately omitted here.
      throw new ProviderError(`OpenRouter API error: ${response.status}`, {
        provider: "openrouter",
        retryable: isRetryableStatus(response.status),
        cause: errorBody,
      });
    }

    const data = (await response.json()) as OpenRouterResponseBody;
    const text = data.choices?.[0]?.message?.content;

    if (typeof text !== "string" || text.length === 0) {
      throw new ProviderError("OpenRouter response had no text content", {
        provider: "openrouter",
        retryable: false,
        cause: data,
      });
    }

    return text;
  },
};
