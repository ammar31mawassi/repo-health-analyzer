import type { ReadmeSignals } from "@/src/types";

const SETUP_PATTERNS = [
  /\binstallation\b/i,
  /\binstall\b/i,
  /\bsetup\b/i,
  /\bgetting started\b/i,
  /\bquick start\b/i,
  /\bnpm install\b/i,
  /\bpip install\b/i,
  /\bdocker compose\b/i,
  /\bpnpm install\b/i
];

const USAGE_PATTERNS = [
  /\busage\b/i,
  /\brun locally\b/i,
  /\bnpm run dev\b/i,
  /\bnpm start\b/i,
  /\bpython\b.+\b(app|main|server)\b/i,
  /\bexample\b/i
];

const DEMO_PATTERNS = [
  /!\[[^\]]*\]\([^)]+\)/,
  /\b(screenshot|screenshots|demo|gif|video|walkthrough)\b/i,
  /\b(vercel\.app|netlify\.app|render\.com|railway\.app|live demo)\b/i,
  /\bhttps?:\/\/[^\s)]+/i
];

const ENV_PATTERNS = [
  /\b\.env\b/i,
  /\benvironment variable/i,
  /\bapi key\b/i,
  /\bconfiguration\b/i
];

const TECH_PATTERNS = [
  /\btech stack\b/i,
  /\bbuilt with\b/i,
  /\btypescript\b/i,
  /\bpython\b/i,
  /\bnext\.js\b/i,
  /\breact\b/i,
  /\bfastapi\b/i,
  /\bdjango\b/i,
  /\bpostgres\b/i
];

const PURPOSE_PATTERNS = [
  /\bhelps?\b/i,
  /\bsolves?\b/i,
  /\btracks?\b/i,
  /\banaly[sz]es?\b/i,
  /\bautomates?\b/i,
  /\bvisuali[sz]es?\b/i,
  /\bfor\b.+\b(users|students|developers|recruiters|teams)\b/i
];

export function analyzeReadme(readme: string): ReadmeSignals {
  const normalized = readme.replace(/<!--[\s\S]*?-->/g, " ").trim();
  const wordCount = countWords(normalized);
  const firstSection = normalized.slice(0, 1500);

  const hasTitle = /^#\s+\S+/m.test(normalized);
  const hasSetupInstructions = hasAny(normalized, SETUP_PATTERNS);
  const hasUsageInstructions = hasAny(normalized, USAGE_PATTERNS);
  const hasScreenshotsOrDemoLinks = hasAny(normalized, DEMO_PATTERNS);
  const hasEnvironmentNotes = hasAny(normalized, ENV_PATTERNS);
  const mentionsTests = /\b(test|tests|testing|coverage|pytest|vitest|jest|playwright|cypress)\b/i.test(normalized);
  const mentionsTechStack = hasAny(normalized, TECH_PATTERNS);
  const explainsProjectClearly =
    wordCount >= 50 &&
    hasTitle &&
    (hasAny(firstSection, PURPOSE_PATTERNS) || hasAny(firstSection, TECH_PATTERNS));

  return {
    wordCount,
    hasTitle,
    hasSetupInstructions,
    hasUsageInstructions,
    hasScreenshotsOrDemoLinks,
    hasEnvironmentNotes,
    mentionsTests,
    mentionsTechStack,
    explainsProjectClearly
  };
}

function hasAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

function countWords(text: string): number {
  return text.match(/[a-zA-Z0-9][a-zA-Z0-9_'-]*/g)?.length ?? 0;
}
