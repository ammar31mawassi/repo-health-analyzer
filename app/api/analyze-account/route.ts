import { NextResponse } from "next/server";
import { analyzeAccount } from "@/src/lib/accountAnalysis";
import { fetchAccountRepoSnapshots, GitHubApiError } from "@/src/lib/github";
import { parseGitHubAccountInput } from "@/src/lib/parseRepo";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { account?: unknown };

    if (typeof body.account !== "string") {
      return NextResponse.json({ error: "Request body must include an account string." }, { status: 400 });
    }

    const input = parseGitHubAccountInput(body.account);
    const snapshots = await fetchAccountRepoSnapshots(input);
    const report = analyzeAccount(input, snapshots);

    return NextResponse.json({ report });
  } catch (error) {
    if (error instanceof GitHubApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: "Unexpected account analysis error." }, { status: 500 });
  }
}
