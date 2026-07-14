import { NextRequest, NextResponse } from "next/server";
import { askAI } from "@/services/ai/aiService";
import { CHAT_PROMPT, sanitizeUserInput } from "@/services/ai/prompts";
import { chatRequestSchema, parseRequest } from "@/lib/requestSchemas";
import { toErrorResponse } from "@/lib/http";

const SCOPE = "API:chat";

// Follow-up chat: takes the already-generated report as context so answers
// stay grounded in the same evidence instead of a fresh, ungrounded reply.
// Optionally takes attachments (images/documents) the user attached to this
// specific question - e.g. a chart or filing they want considered alongside
// the report.
export async function POST(req: NextRequest) {
  try {
    const { report, question, attachments } = parseRequest(chatRequestSchema, await req.json());

    const { text } = await askAI({
      prompt: CHAT_PROMPT(JSON.stringify(report), sanitizeUserInput(question)),
      attachments,
    });

    return NextResponse.json({ answer: text });
  } catch (err) {
    return toErrorResponse(err, SCOPE);
  }
}
