import type {
  BooleanSignal,
  RecentActivitySignal,
  RepoHealthReport,
  RepoSnapshot,
  ScoreCheck,
  ScoreCheckStatus
} from "@/src/types";
import { analyzeReadme } from "@/src/lib/readmeAnalysis";

type FileSignal = {
  present: boolean;
  evidence: string[];
};

export function analyzeRepo(snapshot: RepoSnapshot): RepoHealthReport {
  const readmeSignals = analyzeReadme(snapshot.readme);
  const paths = snapshot.treePaths.map((path) => path.replace(/\\/g, "/"));
  const detectedTechStack = detectTechStack(snapshot.languages, paths, snapshot.readme);
  const tests = detectTests(paths, readmeSignals.mentionsTests);
  const ci = detectCi(paths);
  const structure = detectStructure(paths);
  const manifests = detectManifests(paths);
  const docs = detectDocs(paths);
  const recentActivity = analyzeRecentActivity(snapshot);

  const setupInstructions: BooleanSignal = {
    present: readmeSignals.hasSetupInstructions,
    evidence: readmeSignals.hasSetupInstructions
      ? ["README includes setup or installation guidance."]
      : ["README does not clearly show setup or installation steps."]
  };

  const screenshotsOrDemo: BooleanSignal = {
    present: readmeSignals.hasScreenshotsOrDemoLinks || Boolean(snapshot.metadata.homepage),
    evidence: [
      ...(readmeSignals.hasScreenshotsOrDemoLinks ? ["README references screenshots, media, links, or a demo."] : []),
      ...(snapshot.metadata.homepage ? [`Repository homepage is set to ${snapshot.metadata.homepage}.`] : [])
    ].length
      ? [
          ...(readmeSignals.hasScreenshotsOrDemoLinks ? ["README references screenshots, media, links, or a demo."] : []),
          ...(snapshot.metadata.homepage ? [`Repository homepage is set to ${snapshot.metadata.homepage}.`] : [])
        ]
      : ["No obvious screenshot, demo, video, or homepage link was detected."]
  };

  const readmeClarity: BooleanSignal = {
    present: readmeSignals.explainsProjectClearly,
    evidence: readmeSignals.explainsProjectClearly
      ? [`README has a title and ${readmeSignals.wordCount} words with project-purpose language.`]
      : [`README has ${readmeSignals.wordCount} words and needs a clearer opening explanation.`]
  };

  const checks: ScoreCheck[] = [
    buildCheck("metadata", "Repository metadata", 10, [
      points(Boolean(snapshot.metadata.description), 5, "Repository description is present.", "Repository description is missing."),
      points(Boolean(snapshot.metadata.homepage), 2, "Homepage/demo URL is configured.", "Homepage/demo URL is not configured."),
      points(Boolean(snapshot.metadata.license), 2, "License is configured.", "License is missing."),
      points((snapshot.metadata.topics?.length ?? 0) > 0, 1, "GitHub topics are configured.", "GitHub topics are missing.")
    ]),
    buildCheck("readme", "README clarity", 20, [
      points(readmeSignals.explainsProjectClearly, 12, "README explains what the project does and who it helps.", "README opening does not clearly explain the project."),
      points(readmeSignals.hasTitle, 3, "README has a title.", "README title is missing."),
      points(readmeSignals.mentionsTechStack, 3, "README mentions the tech stack.", "README does not mention the tech stack."),
      points(readmeSignals.wordCount >= 250, 2, "README has enough detail for a quick review.", "README is still light on detail.")
    ]),
    buildCheck("setup", "Setup and usage", 15, [
      points(readmeSignals.hasSetupInstructions, 10, "Setup instructions are present.", "Setup instructions are missing."),
      points(readmeSignals.hasUsageInstructions, 3, "Usage or run instructions are present.", "Usage or run instructions are missing."),
      points(readmeSignals.hasEnvironmentNotes, 2, "Environment variable notes are present.", "Environment variable notes are missing.")
    ]),
    buildCheck("demo", "Screenshots and demo proof", 10, [
      points(readmeSignals.hasScreenshotsOrDemoLinks, 8, "README includes screenshots, media, links, or demo language.", "README lacks screenshots or demo proof."),
      points(Boolean(snapshot.metadata.homepage), 2, "Repo homepage/demo link is set.", "Repo homepage/demo link is not set.")
    ]),
    buildCheck("quality", "Tests and quality signals", 15, [
      points(tests.present, 10, tests.evidence[0] ?? "Test files are present.", "No test files or test mentions were detected."),
      points(ci.present, 3, ci.evidence[0] ?? "CI configuration is present.", "No GitHub Actions workflow was detected."),
      points(manifests.present, 2, manifests.evidence[0] ?? "Dependency manifests are present.", "No dependency manifest was detected.")
    ]),
    buildCheck("stack", "Tech stack detectability", 10, [
      points(Object.keys(snapshot.languages).length > 0, 5, "GitHub language data is available.", "GitHub did not return language data."),
      points(detectedTechStack.length >= 3, 3, "Multiple stack signals were detected.", "Few stack signals were detected."),
      points(manifests.present, 2, manifests.evidence[0] ?? "Dependency manifests are present.", "No dependency manifest was detected.")
    ]),
    buildCheck("activity", "Recent activity", 10, [
      points((recentActivity.daysSinceLastPush ?? Number.POSITIVE_INFINITY) <= 90, 5, "Repository was pushed in the last 90 days.", "Repository has not been pushed recently."),
      points(snapshot.recentCommits.length > 0, 3, "Recent commits were returned by the API.", "No recent commits were returned by the API."),
      points(Boolean(snapshot.metadata.updated_at), 2, "Repository update timestamp is available.", "Repository update timestamp is missing.")
    ]),
    buildCheck("structure", "Repo structure", 10, [
      points(structure.present, 4, structure.evidence[0] ?? "Source structure is visible.", "No clear source folder or app structure was detected."),
      points(docs.present, 2, docs.evidence[0] ?? "Additional docs are present.", "No docs folder or documentation files were detected."),
      points(paths.length >= 12, 2, "Repository has enough files to inspect.", "Repository tree looks very small."),
      points(paths.some((path) => path.toLowerCase() === "readme.md"), 2, "README.md exists at the repo root.", "Root README.md was not detected in the tree.")
    ])
  ];

  const overallScore = clampScore(checks.reduce((sum, check) => sum + check.earned, 0));
  const strengths = buildStrengths({
    tests,
    setupInstructions,
    screenshotsOrDemo,
    readmeClarity,
    recentActivity,
    detectedTechStack,
    ci
  });
  const gaps = buildGaps({
    tests,
    setupInstructions,
    screenshotsOrDemo,
    readmeClarity,
    recentActivity,
    ci,
    metadataHasDescription: Boolean(snapshot.metadata.description)
  });
  const suggestions = buildSuggestions({
    tests,
    setupInstructions,
    screenshotsOrDemo,
    readmeClarity,
    recentActivity,
    ci,
    metadataHasDescription: Boolean(snapshot.metadata.description)
  });

  return {
    generatedAt: new Date().toISOString(),
    repo: {
      owner: snapshot.input.owner,
      name: snapshot.metadata.name,
      fullName: snapshot.metadata.full_name,
      url: snapshot.metadata.html_url,
      description: snapshot.metadata.description,
      homepage: snapshot.metadata.homepage,
      defaultBranch: snapshot.metadata.default_branch
    },
    overallScore,
    grade: gradeForScore(overallScore),
    checks,
    strengths,
    gaps,
    suggestions,
    detectedTechStack,
    tests,
    setupInstructions,
    screenshotsOrDemo,
    readmeClarity,
    recentActivity,
    resumeBulletDraft: buildResumeBullet(snapshot, detectedTechStack, tests, setupInstructions, screenshotsOrDemo),
    linkedInSummaryDraft: buildLinkedInSummary(snapshot, overallScore, strengths, suggestions)
  };
}

export function detectTechStack(languages: Record<string, number>, paths: string[], readme: string): string[] {
  const stack = new Set<string>();

  Object.entries(languages)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .forEach(([language]) => stack.add(language));

  const lowerPaths = paths.map((path) => path.toLowerCase());
  const lowerReadme = readme.toLowerCase();

  const addWhen = (condition: boolean, label: string) => {
    if (condition) stack.add(label);
  };

  addWhen(lowerPaths.some((path) => path === "next.config.js" || path === "next.config.ts" || path === "next.config.mjs"), "Next.js");
  addWhen(lowerPaths.some((path) => path.includes("vite.config.")), "Vite");
  addWhen(lowerPaths.some((path) => path === "package.json"), "Node.js");
  addWhen(lowerPaths.some((path) => path === "tsconfig.json"), "TypeScript");
  addWhen(lowerPaths.some((path) => path === "requirements.txt" || path === "pyproject.toml"), "Python");
  addWhen(lowerPaths.some((path) => path === "dockerfile" || path.endsWith("/dockerfile")), "Docker");
  addWhen(lowerPaths.some((path) => path.includes(".github/workflows/")), "GitHub Actions");
  addWhen(lowerPaths.some((path) => path.includes("playwright.config.")), "Playwright");
  addWhen(lowerPaths.some((path) => path.includes("cypress.config.")), "Cypress");
  addWhen(/\bfastapi\b/.test(lowerReadme), "FastAPI");
  addWhen(/\breact\b/.test(lowerReadme), "React");
  addWhen(/\bsqlite\b/.test(lowerReadme), "SQLite");
  addWhen(/\bpostgres\b|\bpostgresql\b/.test(lowerReadme), "PostgreSQL");
  addWhen(/\bopenai\b|\bllm\b|\bai\b/.test(lowerReadme), "AI/API integration");

  return Array.from(stack).slice(0, 10);
}

function buildCheck(id: string, label: string, possible: number, parts: Array<{ earned: number; evidence: string }>): ScoreCheck {
  const earned = clampScore(parts.reduce((sum, part) => sum + part.earned, 0), possible);
  const status: ScoreCheckStatus = earned === possible ? "pass" : earned > 0 ? "partial" : "fail";

  return {
    id,
    label,
    earned,
    possible,
    status,
    evidence: parts.map((part) => part.evidence)
  };
}

function points(condition: boolean, value: number, passEvidence: string, failEvidence: string): { earned: number; evidence: string } {
  return {
    earned: condition ? value : 0,
    evidence: condition ? passEvidence : failEvidence
  };
}

function detectTests(paths: string[], readmeMentionsTests: boolean): BooleanSignal {
  const matches = paths.filter((path) => {
    const lower = path.toLowerCase();
    return (
      /(^|\/)(__tests__|tests?|spec)(\/|$)/.test(lower) ||
      /\.(test|spec)\.[jt]sx?$/.test(lower) ||
      /(^|\/)test_[^/]+\.py$/.test(lower) ||
      lower.endsWith("pytest.ini") ||
      lower.includes("vitest.config.") ||
      lower.includes("jest.config.") ||
      lower.includes("playwright.config.") ||
      lower.includes("cypress.config.")
    );
  });

  if (matches.length > 0) {
    return {
      present: true,
      evidence: [`Detected test-related files such as ${matches.slice(0, 3).join(", ")}.`]
    };
  }

  if (readmeMentionsTests) {
    return {
      present: true,
      evidence: ["README mentions tests or testing commands."]
    };
  }

  return {
    present: false,
    evidence: ["No tests, specs, test config, or README testing mention was detected."]
  };
}

function detectCi(paths: string[]): FileSignal {
  const matches = paths.filter((path) => path.toLowerCase().startsWith(".github/workflows/"));
  return matches.length
    ? { present: true, evidence: [`Detected GitHub Actions workflow ${matches[0]}.`] }
    : { present: false, evidence: ["No .github/workflows files were detected."] };
}

function detectStructure(paths: string[]): FileSignal {
  const structureMarkers = ["src/", "app/", "pages/", "components/", "lib/", "server/", "backend/", "frontend/", "api/"];
  const match = paths.find((path) => structureMarkers.some((marker) => path.toLowerCase().startsWith(marker)));
  return match
    ? { present: true, evidence: [`Detected source structure via ${match}.`] }
    : { present: false, evidence: ["No common source directory was detected."] };
}

function detectManifests(paths: string[]): FileSignal {
  const manifestNames = [
    "package.json",
    "pyproject.toml",
    "requirements.txt",
    "pom.xml",
    "build.gradle",
    "cargo.toml",
    "go.mod",
    "composer.json",
    "gemfile"
  ];
  const match = paths.find((path) => manifestNames.includes(path.toLowerCase()));
  return match
    ? { present: true, evidence: [`Detected dependency manifest ${match}.`] }
    : { present: false, evidence: ["No common dependency manifest was detected."] };
}

function detectDocs(paths: string[]): FileSignal {
  const match = paths.find((path) => {
    const lower = path.toLowerCase();
    return lower.startsWith("docs/") || lower.includes("architecture") || lower.includes("contributing") || lower.includes("deployment");
  });
  return match
    ? { present: true, evidence: [`Detected documentation file ${match}.`] }
    : { present: false, evidence: ["No docs, architecture, contributing, or deployment files were detected."] };
}

function analyzeRecentActivity(snapshot: RepoSnapshot): RecentActivitySignal {
  const lastPushDate = snapshot.metadata.pushed_at;
  const daysSinceLastPush = lastPushDate ? daysBetween(new Date(lastPushDate), new Date()) : null;
  const evidence = [
    lastPushDate ? `Last push was ${daysSinceLastPush} day(s) ago.` : "No push timestamp was returned.",
    `${snapshot.recentCommits.length} recent commit(s) were returned by the API.`
  ];

  return {
    lastPushDate,
    daysSinceLastPush,
    recentCommitCount: snapshot.recentCommits.length,
    evidence
  };
}

function buildStrengths(input: {
  tests: BooleanSignal;
  setupInstructions: BooleanSignal;
  screenshotsOrDemo: BooleanSignal;
  readmeClarity: BooleanSignal;
  recentActivity: RecentActivitySignal;
  detectedTechStack: string[];
  ci: FileSignal;
}): string[] {
  const strengths: string[] = [];

  if (input.readmeClarity.present) strengths.push("README gives a clear first impression of the project purpose.");
  if (input.setupInstructions.present) strengths.push("Setup instructions make the repo easier for reviewers to run.");
  if (input.tests.present) strengths.push("Testing signals are visible, which helps QA and engineering credibility.");
  if (input.ci.present) strengths.push("CI configuration gives the repo a stronger quality signal.");
  if (input.screenshotsOrDemo.present) strengths.push("Screenshots, demo links, or media help recruiters understand the result quickly.");
  if ((input.recentActivity.daysSinceLastPush ?? Number.POSITIVE_INFINITY) <= 90) strengths.push("Recent activity makes the repo look maintained.");
  if (input.detectedTechStack.length > 0) strengths.push(`Detected stack signals: ${input.detectedTechStack.slice(0, 5).join(", ")}.`);

  return strengths.length ? strengths : ["The repository is public and inspectable through the GitHub API."];
}

function buildGaps(input: {
  tests: BooleanSignal;
  setupInstructions: BooleanSignal;
  screenshotsOrDemo: BooleanSignal;
  readmeClarity: BooleanSignal;
  recentActivity: RecentActivitySignal;
  ci: FileSignal;
  metadataHasDescription: boolean;
}): string[] {
  const gaps: string[] = [];

  if (!input.metadataHasDescription) gaps.push("GitHub description is missing, so the repo is harder to scan from search/profile pages.");
  if (!input.readmeClarity.present) gaps.push("README needs a clearer opening paragraph that explains the problem, audience, and result.");
  if (!input.setupInstructions.present) gaps.push("Setup instructions are missing or not obvious.");
  if (!input.screenshotsOrDemo.present) gaps.push("No screenshot, live demo, or walkthrough link was detected.");
  if (!input.tests.present) gaps.push("No test suite or test command was detected.");
  if (!input.ci.present) gaps.push("No CI workflow was detected.");
  if ((input.recentActivity.daysSinceLastPush ?? 9999) > 180) gaps.push("The repo may look inactive because the last push is older than 180 days.");

  return gaps.length ? gaps : ["No major recruiter-readability gaps were detected by the deterministic checks."];
}

function buildSuggestions(input: {
  tests: BooleanSignal;
  setupInstructions: BooleanSignal;
  screenshotsOrDemo: BooleanSignal;
  readmeClarity: BooleanSignal;
  recentActivity: RecentActivitySignal;
  ci: FileSignal;
  metadataHasDescription: boolean;
}): string[] {
  const suggestions: string[] = [];

  if (!input.metadataHasDescription) suggestions.push("Add a one-sentence GitHub repository description that names the user, problem, and core tech.");
  if (!input.readmeClarity.present) suggestions.push("Rewrite the README opening into 2-3 sentences: what it does, who it helps, and what the reviewer can try.");
  if (!input.setupInstructions.present) suggestions.push("Add a Quick start section with install, environment setup, run, and test commands.");
  if (!input.screenshotsOrDemo.present) suggestions.push("Add one screenshot near the top of the README, plus a live demo link if deployment is practical.");
  if (!input.tests.present) suggestions.push("Add 2-4 focused tests for URL parsing, core business logic, and one user-facing workflow.");
  if (!input.ci.present) suggestions.push("Add a small GitHub Actions workflow that runs install, lint, tests, and build.");
  if ((input.recentActivity.daysSinceLastPush ?? 9999) > 180) suggestions.push("Make a small meaningful follow-up commit so the repo shows recent iteration.");

  const fallbackSuggestions = [
    "Add a short resume bullet and architecture note to help recruiters convert the project into role evidence.",
    "Add one before/after note in the README that explains the most important engineering decision.",
    "Add a small roadmap section with the next two practical improvements."
  ];

  for (const fallback of fallbackSuggestions) {
    if (suggestions.length >= 3) break;
    suggestions.push(fallback);
  }

  return suggestions;
}

function buildResumeBullet(
  snapshot: RepoSnapshot,
  stack: string[],
  tests: BooleanSignal,
  setup: BooleanSignal,
  demo: BooleanSignal
): string {
  const stackText = stack.length ? ` using ${stack.slice(0, 4).join(", ")}` : "";
  const proof = [
    tests.present ? "test signals" : null,
    setup.present ? "runnable setup docs" : null,
    demo.present ? "demo/screenshots" : null
  ].filter(Boolean);
  const proofText = proof.length ? ` with ${proof.join(", ")}` : " with recruiter-readable documentation";
  const description = snapshot.metadata.description ? `, ${snapshot.metadata.description.replace(/[.]+$/, "")},` : "";

  return `Built ${snapshot.metadata.name}${description}${stackText}${proofText} to make the project easier to evaluate from GitHub.`;
}

function buildLinkedInSummary(snapshot: RepoSnapshot, score: number, strengths: string[], suggestions: string[]): string {
  const topStrength = strengths[0]?.replace(/[.]+$/, "") ?? "the repo is public and reviewable";
  const nextStep = suggestions[0]?.replace(/[.]+$/, "") ?? "add one more concrete proof point";

  return `I reviewed ${snapshot.metadata.full_name} for recruiter readiness and scored it ${score}/100. The strongest signal: ${topStrength}. Next improvement: ${nextStep}.`;
}

function gradeForScore(score: number): RepoHealthReport["grade"] {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Strong";
  if (score >= 50) return "Developing";
  return "Needs polish";
}

function daysBetween(start: Date, end: Date): number {
  const milliseconds = end.getTime() - start.getTime();
  return Math.max(0, Math.floor(milliseconds / 86_400_000));
}

function clampScore(value: number, max = 100): number {
  return Math.max(0, Math.min(max, Math.round(value)));
}
