export type ParsedRepoInput = {
  owner: string;
  repo: string;
  normalizedUrl: string;
};

export type ParsedAccountInput = {
  username: string;
  normalizedUrl: string;
};

export type GitHubRepository = {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  homepage: string | null;
  default_branch: string;
  created_at: string;
  updated_at: string;
  pushed_at: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  topics?: string[];
  language?: string | null;
  license?: {
    key: string;
    name: string;
    spdx_id: string;
  } | null;
};

export type RecentCommit = {
  sha: string;
  message: string;
  authorName: string | null;
  committedAt: string | null;
  url: string;
};

export type RepoSnapshot = {
  input: ParsedRepoInput;
  metadata: GitHubRepository;
  readme: string;
  languages: Record<string, number>;
  treePaths: string[];
  recentCommits: RecentCommit[];
};

export type ReadmeSignals = {
  wordCount: number;
  hasTitle: boolean;
  hasSetupInstructions: boolean;
  hasUsageInstructions: boolean;
  hasScreenshotsOrDemoLinks: boolean;
  hasEnvironmentNotes: boolean;
  mentionsTests: boolean;
  mentionsTechStack: boolean;
  explainsProjectClearly: boolean;
};

export type ScoreCheckStatus = "pass" | "partial" | "fail";

export type ScoreCheck = {
  id: string;
  label: string;
  earned: number;
  possible: number;
  status: ScoreCheckStatus;
  evidence: string[];
};

export type BooleanSignal = {
  present: boolean;
  evidence: string[];
};

export type RecentActivitySignal = {
  lastPushDate: string | null;
  daysSinceLastPush: number | null;
  recentCommitCount: number;
  evidence: string[];
};

export type RepoHealthReport = {
  generatedAt: string;
  repo: {
    owner: string;
    name: string;
    fullName: string;
    url: string;
    description: string | null;
    homepage: string | null;
    defaultBranch: string;
  };
  overallScore: number;
  grade: "Excellent" | "Strong" | "Developing" | "Needs polish";
  checks: ScoreCheck[];
  strengths: string[];
  gaps: string[];
  suggestions: string[];
  detectedTechStack: string[];
  tests: BooleanSignal;
  setupInstructions: BooleanSignal;
  screenshotsOrDemo: BooleanSignal;
  readmeClarity: BooleanSignal;
  recentActivity: RecentActivitySignal;
  resumeBulletDraft: string;
  linkedInSummaryDraft: string;
  optionalAiSuggestions?: string[];
};

export type GitHubAccountReport = {
  generatedAt: string;
  account: {
    username: string;
    url: string;
  };
  repoCount: number;
  averageScore: number;
  strongestRepos: Array<{
    name: string;
    url: string;
    score: number;
    grade: RepoHealthReport["grade"];
  }>;
  mostImportantGaps: string[];
  suggestions: string[];
  reports: RepoHealthReport[];
};
