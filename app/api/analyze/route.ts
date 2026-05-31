import { NextResponse } from "next/server";
import { fetchRepoSnapshot, GitHubApiError } from "@/src/lib/github";
import { getOptionalAiSuggestions } from "@/src/lib/optionalAi";
import { parseGitHubRepoInput } from "@/src/lib/parseRepo";
import { analyzeRepo } from "@/src/lib/scoring";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { repo?: unknown };

    if (typeof body.repo !== "string") {
      return NextResponse.json({ error: "Request body must include a repo string." }, { status: 400 });
    }

    const input = parseGitHubRepoInput(body.repo);
    const snapshot = await fetchRepoSnapshot(input);
    const report = analyzeRepo(snapshot);
    const optionalAiSuggestions = await getOptionalAiSuggestions(report);

    return NextResponse.json({
      report: {
        ...report,
        optionalAiSuggestions
      }
    });
  } catch (error) {
    if (error instanceof GitHubApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: "Unexpected analysis error." }, { status: 500 });
  }
}
