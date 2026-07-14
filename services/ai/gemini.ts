import { getEnv } from "@/config/env";
import { ProviderError } from "@/lib/errors";
import { fetchWithTimeout, isRetryableStatus } from "./retry";
import type { AIProvider, AIRequest } from "./types";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
const TIMEOUT_MS = 20_000;

// Gemini's own wire format - private to this file. Nothing outside
// gemini.ts should ever need to know Gemini's JSON shape; every caller
// only sees the plain string this provider returns.
interface GeminiPart {
  text?: string;
}
interface GeminiCandidate {
  content?: { parts?: GeminiPart[] };
  finishReason?: string;
}
interface GeminiResponseBody {
  candidates?: GeminiCandidate[];
}

function buildRequestBody(request: AIRequest): Record<string, unknown> {
  const currentTurnParts: Record<string, unknown>[] = [{ text: request.prompt }];
  for (const attachment of request.attachments ?? []) {
    currentTurnParts.push({ inlineData: { mimeType: attachment.mimeType, data: attachment.data } });
  }

  const priorTurns = (request.history ?? []).map((turn) => ({
    role: turn.role,
    parts: [{ text: turn.text }],
  }));

  const body: Record<string, unknown> = {
    contents: [...priorTurns, { role: "user", parts: currentTurnParts }],
  };

  if (request.systemInstruction) {
    body.systemInstruction = { parts: [{ text: request.systemInstruction }] };
  }
  if (request.jsonMode) {
    // The documented, reliable way to force valid JSON out of Gemini -
    // relying on prompt wording alone ("respond only with JSON") is NOT
    // reliable on its own; this actually constrains decoding.
    body.generationConfig = { responseMimeType: "application/json" };
  }

  return body;
}

export const geminiProvider: AIProvider = {
  name: "gemini",

  isConfigured(): boolean {
    return Boolean(getEnv().GEMINI_API_KEY);
  },

  async complete(request: AIRequest): Promise<string> {
    const { GEMINI_API_KEY } = getEnv();
    let response: Response;

    try {
      response = await fetchWithTimeout(
        `${GEMINI_URL}?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildRequestBody(request)),
        },
        TIMEOUT_MS
      );
    } catch (cause) {
      // Network failure or our own timeout abort firing - both are worth
      // a retry, unlike a definite non-2xx response from Gemini itself.
      throw new ProviderError("Gemini request failed to complete", {
        provider: "gemini",
        retryable: true,
        cause,
      });
    }

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      // Deliberately NOT `statusCode: response.status` - a 429/403/500 here
      // describes Gemini's relationship with US (our API key, our quota),
      // not anything about the end user's request to OUR API. Passing it
      // through would make a caller who sent a perfectly valid request see
      // a confusing 403/429 on OUR endpoint. ProviderError's default (502
      // Bad Gateway) correctly says "an upstream we depend on failed" -
      // the real upstream status is preserved in the message/cause for
      // logs, just not promoted to be OUR response's status.
      throw new ProviderError(`Gemini API error: ${response.status}`, {
        provider: "gemini",
        retryable: isRetryableStatus(response.status),
        cause: errorBody,
      });
    }

    const data = (await response.json()) as GeminiResponseBody;
    const candidate = data.candidates?.[0];

    if (!candidate) {
      throw new ProviderError("Gemini returned no candidates", {
        provider: "gemini",
        retryable: false,
        cause: data,
      });
    }
    if (candidate.finishReason && candidate.finishReason !== "STOP") {
      // e.g. SAFETY, RECITATION, MAX_TOKENS - retrying identically won't
      // produce a different outcome, so this isn't retryable.
      throw new ProviderError(
        `Gemini did not finish normally (finishReason: ${candidate.finishReason})`,
        { provider: "gemini", retryable: false, cause: candidate }
      );
    }

    const text = candidate.content?.parts?.[0]?.text;
    if (typeof text !== "string" || text.length === 0) {
      throw new ProviderError("Gemini response had no text content", {
        provider: "gemini",
        retryable: false,
        cause: candidate,
      });
    }

    return text;
  },
};
