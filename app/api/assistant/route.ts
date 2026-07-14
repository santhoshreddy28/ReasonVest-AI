import { NextRequest, NextResponse } from "next/server";
import { askAI } from "@/services/ai/aiService";
import { ASSISTANT_SYSTEM_PROMPT, sanitizeUserInput } from "@/services/ai/prompts";
import { assistantRequestSchema, parseRequest } from "@/lib/requestSchemas";
import { toErrorResponse } from "@/lib/http";

const SCOPE = "API:assistant";

// General-purpose assistant chat (voice + text), not grounded in a single
// research report. Takes the running conversation history so follow-ups
// stay coherent, and optional attachments (images/documents) for this turn.
export async function POST(req: NextRequest) {
  try {
    const { message, history, attachments } = parseRequest(assistantRequestSchema, await req.json());

    const { text } = await askAI({
      prompt: sanitizeUserInput(message),
      systemInstruction: ASSISTANT_SYSTEM_PROMPT,
      history: history.map((turn) => ({ role: turn.role, text: sanitizeUserInput(turn.text) })),
      attachments,
    });

    return NextResponse.json({ answer: text });
  } catch (err) {
    return toErrorResponse(err, SCOPE);
  }
}
