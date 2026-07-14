import { NextRequest, NextResponse } from "next/server";
import { runResearchPipeline } from "@/services/research/researchPipeline";
import { researchRequestSchema, parseRequest } from "@/lib/requestSchemas";
import { toErrorResponse } from "@/lib/http";

const SCOPE = "API:research";

export async function POST(req: NextRequest) {
  try {
    const { query } = parseRequest(researchRequestSchema, await req.json());
    const report = await runResearchPipeline(query);
    return NextResponse.json(report);
  } catch (err) {
    return toErrorResponse(err, SCOPE);
  }
}
