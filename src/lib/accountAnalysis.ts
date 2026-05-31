import type { GitHubAccountReport, ParsedAccountInput, RepoSnapshot } from "@/src/types";
import { analyzeRepo } from "@/src/lib/scoring";

export function analyzeAccount(input: ParsedAccountInput, snapshots: RepoSnapshot[]): GitHubAccountReport {
  const reports = snapshots.map(analyzeRepo).sort((a, b) => b.overallScore - a.overallScore);
  const averageScore = reports.length
    ? Math.round(reports.reduce((sum, report) => sum + report.overallScore, 0) / reports.length)
    : 0;
  const commonGaps = mostCommon(reports.flatMap((report) => report.gaps), 5);
  const suggestions = buildAccountSuggestions(reports, commonGaps);

  return {
    generatedAt: new Date().toISOString(),
    account: {
      username: input.username,
      url: input.normalizedUrl
    },
    repoCount: reports.length,
    averageScore,
    strongestRepos: reports.slice(0, 5).map((report) => ({
      name: report.repo.name,
      url: report.repo.url,
      score: report.overallScore,
      grade: report.grade
    })),
    mostImportantGaps: commonGaps,
    suggestions,
    reports
  };
}

function buildAccountSuggestions(reports: ReturnType<typeof analyzeRepo>[], commonGaps: string[]): string[] {
  const suggestions: string[] = [];
  const reposWithoutTests = reports.filter((report) => !report.tests.present);
  const reposWithoutSetup = reports.filter((report) => !report.setupInstructions.present);
  const reposWithoutDemo = reports.filter((report) => !report.screenshotsOrDemo.present);
  const weakestRepos = reports.slice().sort((a, b) => a.overallScore - b.overallScore).slice(0, 3);

  if (reposWithoutTests.length > 0) {
    suggestions.push(`Add visible tests to ${reposWithoutTests.length} repo(s), starting with ${reposWithoutTests[0].repo.name}.`);
  }

  if (reposWithoutSetup.length > 0) {
    suggestions.push(`Add quick-start setup steps to ${reposWithoutSetup.length} repo(s), starting with ${reposWithoutSetup[0].repo.name}.`);
  }

  if (reposWithoutDemo.length > 0) {
    suggestions.push(`Add screenshots or demo links to ${reposWithoutDemo.length} repo(s), starting with ${reposWithoutDemo[0].repo.name}.`);
  }

  if (weakestRepos.length > 0) {
    suggestions.push(`Polish the lowest-scoring repo first: ${weakestRepos[0].repo.name} (${weakestRepos[0].overallScore}/100).`);
  }

  if (commonGaps.length > 0) {
    suggestions.push(`Profile-wide pattern to fix: ${commonGaps[0]}`);
  }

  return Array.from(new Set(suggestions)).slice(0, 5);
}

function mostCommon(items: string[], limit: number): string[] {
  const counts = new Map<string, number>();

  for (const item of items) {
    counts.set(item, (counts.get(item) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([item, count]) => `${item} (${count} repo${count === 1 ? "" : "s"})`);
}
