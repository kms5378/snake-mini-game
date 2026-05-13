import { NextRequest, NextResponse } from "next/server";
import { getScoreSubmitLimiter } from "@/lib/rate-limit";
import { addScore, getTopScores } from "@/lib/scores";
import { normalizeSubmission } from "@/lib/score-schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function getClientIdentifier(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "anonymous";
}

export async function GET(request: NextRequest) {
  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : 20;

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    return jsonError("Invalid limit.", 400);
  }

  const scores = await getTopScores(limit);

  return NextResponse.json(
    { scores },
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}

export async function POST(request: NextRequest) {
  const limiter = getScoreSubmitLimiter();

  if (limiter) {
    const result = await limiter.limit(getClientIdentifier(request));

    if (!result.success) {
      return jsonError("Too many score submissions. Try again soon.", 429);
    }
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError("Request body must be valid JSON.", 400);
  }

  const parsed = normalizeSubmission(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid score submission.",
        issues: parsed.error.issues.map((issue) => issue.message)
      },
      { status: 400 }
    );
  }

  const entry = await addScore(parsed.data);

  return NextResponse.json(
    { entry, rank: entry.rank },
    {
      status: 201,
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
