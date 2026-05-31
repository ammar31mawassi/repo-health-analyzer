import type { RepoHealthReport } from "@/src/types";

export async function getOptionalAiSuggestions(report: RepoHealthReport): Promise<string[] | undefined> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return undefined;

  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
  const deterministicSummary = {
    repo: report.repo.fullName,
    score: report.overallScore,
    detectedTechStack: report.detectedTechStack,
    strengths: report.strengths,
    gaps: report.gaps,
    deterministicSuggestions: report.suggestions
  };

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "system",
            content:
              "You help students improve public GitHub projects for recruiter readability. Return only concise, practical suggestions."
          },
          {
            role: "user",
            content: `Suggest 3 extra improvements based only on this deterministic public-repo summary:\n${JSON.stringify(
              deterministicSummary,
              null,
              2
            )}`
          }
        ]
      })
    });

    if (!response.ok) return undefined;

    const data = (await response.json()) as {
      output_text?: string;
      output?: Array<{
        content?: Array<{
          text?: string;
        }>;
      }>;
    };

    const text =
      data.output_text ??
      data.output?.flatMap((item) => item.content?.map((content) => content.text ?? "") ?? []).join("\n") ??
      "";

    return text
      .split(/\n+/)
      .map((line) => line.replace(/^[-*\d.\s]+/, "").trim())
      .filter(Boolean)
      .slice(0, 3);
  } catch {
    return undefined;
  }
}
