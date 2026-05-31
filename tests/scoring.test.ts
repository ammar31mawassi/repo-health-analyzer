import { describe, expect, it } from "vitest";
import { analyzeRepo } from "@/src/lib/scoring";
import type { RepoSnapshot } from "@/src/types";

const baseSnapshot: RepoSnapshot = {
  input: {
    owner: "student",
    repo: "portfolio-api",
    normalizedUrl: "https://github.com/student/portfolio-api"
  },
  metadata: {
    id: 1,
    name: "portfolio-api",
    full_name: "student/portfolio-api",
    html_url: "https://github.com/student/portfolio-api",
    description: "API that analyzes portfolio repository readiness",
    homepage: "https://portfolio-api.example.com",
    default_branch: "main",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: new Date().toISOString(),
    pushed_at: new Date().toISOString(),
    stargazers_count: 2,
    forks_count: 0,
    open_issues_count: 1,
    topics: ["portfolio", "github-api"],
    license: {
      key: "mit",
      name: "MIT License",
      spdx_id: "MIT"
    }
  },
  readme: `
# Portfolio API

Portfolio API helps students analyze public GitHub repositories for recruiter readability. It checks README quality, test signals, setup instructions, and demo links so a project can be improved before it appears on a resume.

## Tech Stack

Built with TypeScript, Next.js, React, and the GitHub API.

## Quick start

\`\`\`bash
npm install
npm run dev
npm test
\`\`\`

Copy .env.example to .env for optional configuration.

## Demo

![Dashboard screenshot](./docs/screenshot.png)
`,
  languages: {
    TypeScript: 10000,
    CSS: 2000
  },
  treePaths: [
    "README.md",
    "package.json",
    "tsconfig.json",
    "next.config.ts",
    "app/page.tsx",
    "app/api/analyze/route.ts",
    "src/lib/scoring.ts",
    "src/lib/parseRepo.ts",
    "tests/scoring.test.ts",
    "tests/parseRepo.test.ts",
    ".github/workflows/ci.yml",
    "docs/screenshot.png"
  ],
  recentCommits: [
    {
      sha: "abc123",
      message: "Add analyzer scoring",
      authorName: "Student",
      committedAt: new Date().toISOString(),
      url: "https://github.com/student/portfolio-api/commit/abc123"
    }
  ]
};

describe("analyzeRepo", () => {
  it("scores a recruiter-readable repo highly", () => {
    const report = analyzeRepo(baseSnapshot);

    expect(report.overallScore).toBeGreaterThanOrEqual(85);
    expect(report.tests.present).toBe(true);
    expect(report.setupInstructions.present).toBe(true);
    expect(report.screenshotsOrDemo.present).toBe(true);
    expect(report.detectedTechStack).toContain("Next.js");
    expect(report.resumeBulletDraft).toContain("Built portfolio-api");
  });

  it("surfaces gaps for a sparse repo", () => {
    const sparse = analyzeRepo({
      ...baseSnapshot,
      metadata: {
        ...baseSnapshot.metadata,
        description: null,
        homepage: null,
        license: null,
        topics: [],
        pushed_at: "2024-01-01T00:00:00Z"
      },
      readme: "# TODO\n\nlater",
      languages: {},
      treePaths: ["README.md"],
      recentCommits: []
    });

    expect(sparse.overallScore).toBeLessThan(50);
    expect(sparse.gaps).toEqual(expect.arrayContaining([expect.stringContaining("Setup instructions")]));
    expect(sparse.suggestions).toEqual(expect.arrayContaining([expect.stringContaining("Quick start")]));
  });
});
