import { describe, expect, it } from "vitest";
import { analyzeAccount } from "@/src/lib/accountAnalysis";
import type { ParsedAccountInput, RepoSnapshot } from "@/src/types";

const account: ParsedAccountInput = {
  username: "student",
  normalizedUrl: "https://github.com/student"
};

function makeSnapshot(name: string, overrides: Partial<RepoSnapshot> = {}): RepoSnapshot {
  const base: RepoSnapshot = {
    input: {
      owner: "student",
      repo: name,
      normalizedUrl: `https://github.com/student/${name}`
    },
    metadata: {
      id: Math.random(),
      name,
      full_name: `student/${name}`,
      html_url: `https://github.com/student/${name}`,
      description: `${name} helps students understand project quality`,
      homepage: "https://example.com",
      default_branch: "main",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: new Date().toISOString(),
      pushed_at: new Date().toISOString(),
      stargazers_count: 0,
      forks_count: 0,
      open_issues_count: 0,
      topics: ["portfolio"],
      license: {
        key: "mit",
        name: "MIT",
        spdx_id: "MIT"
      }
    },
    readme: `
# ${name}

${name} helps students analyze public GitHub repositories for recruiter readability and improve portfolio proof.

## Tech Stack

Built with TypeScript and Next.js.

## Quick start

npm install
npm run dev
npm test

## Demo

![Screenshot](./docs/screenshot.png)
`,
    languages: { TypeScript: 100 },
    treePaths: [
      "README.md",
      "package.json",
      "tsconfig.json",
      "next.config.ts",
      "app/page.tsx",
      "src/lib/scoring.ts",
      "tests/scoring.test.ts",
      "docs/screenshot.png"
    ],
    recentCommits: [
      {
        sha: "abc",
        message: "Initial project",
        authorName: "Student",
        committedAt: new Date().toISOString(),
        url: `https://github.com/student/${name}/commit/abc`
      }
    ]
  };

  return { ...base, ...overrides };
}

describe("analyzeAccount", () => {
  it("scores every provided repo and builds an account summary", () => {
    const report = analyzeAccount(account, [
      makeSnapshot("strong-repo"),
      makeSnapshot("needs-readme", {
        readme: "# TODO",
        treePaths: ["README.md"],
        languages: {}
      })
    ]);

    expect(report.repoCount).toBe(2);
    expect(report.reports).toHaveLength(2);
    expect(report.averageScore).toBeGreaterThan(0);
    expect(report.strongestRepos[0].score).toBeGreaterThanOrEqual(report.strongestRepos[1].score);
    expect(report.suggestions.length).toBeGreaterThan(0);
  });
});
