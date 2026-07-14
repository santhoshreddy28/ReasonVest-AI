import { NextRequest, NextResponse } from "next/server";
import { compareCompanies } from "@/services/research/compareService";
import { compareRequestSchema, parseRequest } from "@/lib/requestSchemas";
import { toErrorResponse } from "@/lib/http";

const SCOPE = "API:compare";

export async function POST(req: NextRequest) {
  try {
    const { queryA, queryB } = parseRequest(compareRequestSchema, await req.json());
    const result = await compareCompanies(queryA, queryB);
    return NextResponse.json(result);
  } catch (err) {
    return toErrorResponse(err, SCOPE);
  }
}
