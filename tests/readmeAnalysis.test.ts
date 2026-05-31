import { describe, expect, it } from "vitest";
import { analyzeReadme } from "@/src/lib/readmeAnalysis";

describe("analyzeReadme", () => {
  it("detects setup, demo, stack, and clarity signals", () => {
    const readme = `
# Repo Health Analyzer

Repo Health Analyzer helps students analyze public GitHub repositories for recruiter readability. It checks README quality, tests, setup instructions, and demo proof so developers can improve portfolio projects before applying.

## Tech Stack

Built with TypeScript, Next.js, React, and the GitHub API.

## Quick start

\`\`\`bash
npm install
npm run dev
\`\`\`

## Screenshots

![Score report](./docs/screenshot.png)

## Testing

Run Vitest with npm test.
`;

    const result = analyzeReadme(readme);

    expect(result.explainsProjectClearly).toBe(true);
    expect(result.hasSetupInstructions).toBe(true);
    expect(result.hasUsageInstructions).toBe(true);
    expect(result.hasScreenshotsOrDemoLinks).toBe(true);
    expect(result.mentionsTests).toBe(true);
    expect(result.mentionsTechStack).toBe(true);
  });

  it("keeps weak README files from passing clarity", () => {
    const result = analyzeReadme("# Demo\n\nTODO");

    expect(result.explainsProjectClearly).toBe(false);
    expect(result.wordCount).toBeLessThan(10);
  });
});
