import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { analyzeRepo } from "@/src/lib/scoring";
import type { RepoSnapshot } from "@/src/types";

const projectRoot = process.cwd();
const ignoredDirectories = new Set([".git", ".next", "node_modules"]);

describe("repo-health-analyzer publish readiness", () => {
  it("scores 90+ under its own deterministic checks once pushed to GitHub", () => {
    const snapshot: RepoSnapshot = {
      input: {
        owner: "ammar31mawassi",
        repo: "repo-health-analyzer",
        normalizedUrl: "https://github.com/ammar31mawassi/repo-health-analyzer"
      },
      metadata: {
        id: 1,
        name: "repo-health-analyzer",
        full_name: "ammar31mawassi/repo-health-analyzer",
        html_url: "https://github.com/ammar31mawassi/repo-health-analyzer",
        description: null,
        homepage: null,
        default_branch: "main",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        pushed_at: new Date().toISOString(),
        stargazers_count: 0,
        forks_count: 0,
        open_issues_count: 0,
        topics: [],
        license: {
          key: "mit",
          name: "MIT License",
          spdx_id: "MIT"
        }
      },
      readme: readFileSync(join(projectRoot, "README.md"), "utf8"),
      languages: {
        TypeScript: 1,
        CSS: 1
      },
      treePaths: collectProjectPaths(projectRoot),
      recentCommits: [
        {
          sha: "local",
          message: "Initial recruiter-readable analyzer",
          authorName: "Ammar Mawassi",
          committedAt: new Date().toISOString(),
          url: "https://github.com/ammar31mawassi/repo-health-analyzer/commit/local"
        }
      ]
    };

    const report = analyzeRepo(snapshot);
    expect(report.overallScore).toBeGreaterThanOrEqual(90);
  });
});

function collectProjectPaths(directory: string): string[] {
  const paths: string[] = [];

  for (const entry of readdirSync(directory)) {
    if (ignoredDirectories.has(entry) || entry.startsWith("dev-server")) continue;

    const absolutePath = join(directory, entry);
    const relativePath = relative(projectRoot, absolutePath).split(sep).join("/");
    const stats = statSync(absolutePath);

    if (stats.isDirectory()) {
      paths.push(...collectProjectPaths(absolutePath));
    } else {
      paths.push(relativePath);
    }
  }

  return paths;
}
