"use client";

import type { CSSProperties, FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clipboard,
  ExternalLink,
  Github,
  GitFork,
  Loader2,
  Search,
  UserSearch,
  XCircle
} from "lucide-react";
import type { BooleanSignal, GitHubAccountReport, RepoHealthReport, ScoreCheckStatus } from "@/src/types";

type ApiResponse = {
  report?: RepoHealthReport;
  error?: string;
};

type AccountApiResponse = {
  report?: GitHubAccountReport;
  error?: string;
};

export default function Home() {
  const [repo, setRepo] = useState("");
  const [report, setReport] = useState<RepoHealthReport | null>(null);
  const [accountReport, setAccountReport] = useState<GitHubAccountReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMode, setLoadingMode] = useState<"repo" | "account" | null>(null);

  const sortedChecks = useMemo(() => {
    return report?.checks.slice().sort((a, b) => a.possible - a.earned - (b.possible - b.earned)) ?? [];
  }, [report]);

  const runRepoAnalysis = useCallback(async (target: string) => {
    setLoadingMode("repo");
    setError(null);
    setReport(null);
    setAccountReport(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ repo: target })
      });
      const data = (await response.json()) as ApiResponse;

      if (!response.ok || !data.report) {
        throw new Error(data.error ?? "Could not analyze that repository.");
      }

      setReport(data.report);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not analyze that repository.");
    } finally {
      setLoadingMode(null);
    }
  }, []);

  const runAccountAnalysis = useCallback(async (target: string) => {
    setLoadingMode("account");
    setError(null);
    setReport(null);
    setAccountReport(null);

    try {
      const response = await fetch("/api/analyze-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ account: target })
      });
      const data = (await response.json()) as AccountApiResponse;

      if (!response.ok || !data.report) {
        throw new Error(data.error ?? "Could not analyze that GitHub account.");
      }

      setAccountReport(data.report);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not analyze that GitHub account.");
    } finally {
      setLoadingMode(null);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const repoParam = params.get("repo");
    const accountParam = params.get("account");

    if (repoParam) {
      setRepo(repoParam);
      void runRepoAnalysis(repoParam);
      return;
    }

    if (accountParam) {
      setRepo(accountParam);
      void runAccountAnalysis(accountParam);
    }
  }, [runAccountAnalysis, runRepoAnalysis]);

  async function analyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await runRepoAnalysis(repo);
  }

  async function analyzeAccount() {
    await runAccountAnalysis(repo);
  }

  const loading = loadingMode !== null;

  function loadingCopy() {
    if (loadingMode === "account") {
      return {
        title: "Fetching public GitHub account signals",
        body: "Every public repository is being scored. Larger accounts may take longer or need a GitHub token."
      };
    }

    return {
      title: "Fetching public GitHub signals",
      body: "Metadata, README, languages, file tree, and recent commits are being checked."
    };
  }

  return (
    <main className="app-shell">
      <section className="tool-header" aria-labelledby="page-title">
        <div className="title-lockup">
          <div className="app-icon" aria-hidden="true">
            <Github size={24} />
          </div>
          <div>
            <h1 id="page-title">GitHub Repo Health Analyzer</h1>
            <p>Score a public repo for recruiter readability using deterministic GitHub and README checks.</p>
          </div>
        </div>

        <form className="repo-form" onSubmit={analyze}>
          <label htmlFor="repo-input">GitHub repository or account</label>
          <div className="input-row">
            <input
              id="repo-input"
              value={repo}
              onChange={(event) => setRepo(event.target.value)}
              placeholder="https://github.com/owner/repo or owner"
              autoComplete="off"
            />
            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? <Loader2 className="spin" size={18} aria-hidden="true" /> : <Search size={18} aria-hidden="true" />}
              <span>{loadingMode === "repo" ? "Analyzing" : "Analyze Repo"}</span>
            </button>
          </div>
          <button className="ghost-button" type="button" onClick={analyzeAccount} disabled={loading}>
            {loadingMode === "account" ? (
              <Loader2 className="spin" size={16} aria-hidden="true" />
            ) : (
              <UserSearch size={16} aria-hidden="true" />
            )}
            Analyze GitHub Account
          </button>
        </form>
      </section>

      {error ? (
        <div className="error-panel" role="alert">
          <AlertCircle size={20} aria-hidden="true" />
          <span>{error}</span>
        </div>
      ) : null}

      {loading ? (
        <section className="loading-panel" aria-live="polite">
          <Loader2 className="spin" size={24} aria-hidden="true" />
          <div>
            <h2>{loadingCopy().title}</h2>
            <p>{loadingCopy().body}</p>
          </div>
        </section>
      ) : null}

      {accountReport ? <AccountReportView report={accountReport} /> : null}

      {report ? (
        <div className="report-grid">
          <section className="score-panel" aria-labelledby="score-title">
            <div className="score-ring" style={{ "--score-angle": `${report.overallScore * 3.6}deg` } as CSSProperties}>
              <span>{report.overallScore}</span>
              <small>/100</small>
            </div>
            <div className="score-copy">
              <p className="eyebrow">Recruiter-readiness score</p>
              <h2 id="score-title">{report.grade}</h2>
              <p>{report.repo.description ?? "No GitHub description was provided for this repository."}</p>
              <a href={report.repo.url} target="_blank" rel="noreferrer" className="repo-link">
                Open repository <ExternalLink size={15} aria-hidden="true" />
              </a>
            </div>
          </section>

          <section className="stack-panel" aria-labelledby="stack-title">
            <h2 id="stack-title">Detected Tech Stack</h2>
            <div className="chip-row">
              {report.detectedTechStack.length ? (
                report.detectedTechStack.map((item) => <span key={item}>{item}</span>)
              ) : (
                <span>No clear stack detected</span>
              )}
            </div>
          </section>

          <section className="signals-panel" aria-labelledby="signals-title">
            <h2 id="signals-title">Core Signals</h2>
            <div className="signal-grid">
              <Signal label="Tests" signal={report.tests} />
              <Signal label="Setup instructions" signal={report.setupInstructions} />
              <Signal label="Screenshots or demo" signal={report.screenshotsOrDemo} />
              <Signal label="README clarity" signal={report.readmeClarity} />
            </div>
          </section>

          <section className="checks-panel" aria-labelledby="checks-title">
            <h2 id="checks-title">Explainable Scoring</h2>
            <div className="checks-list">
              {sortedChecks.map((check) => (
                <article className="check-item" key={check.id}>
                  <div>
                    <div className="check-title">
                      <StatusIcon status={check.status} />
                      <h3>{check.label}</h3>
                    </div>
                    <p>{check.evidence[0]}</p>
                  </div>
                  <strong>
                    {check.earned}/{check.possible}
                  </strong>
                </article>
              ))}
            </div>
          </section>

          <ReportList title="Strengths" items={report.strengths} variant="strength" />
          <ReportList title="Gaps" items={report.gaps} variant="gap" />
          <ReportList title="Concrete Suggestions" items={report.suggestions} variant="suggestion" />

          {report.optionalAiSuggestions?.length ? (
            <ReportList title="Optional AI Suggestions" items={report.optionalAiSuggestions} variant="ai" />
          ) : null}

          <section className="draft-panel" aria-labelledby="draft-title">
            <h2 id="draft-title">Career Drafts</h2>
            <DraftBlock title="Resume bullet" text={report.resumeBulletDraft} />
            <DraftBlock title="LinkedIn summary" text={report.linkedInSummaryDraft} />
          </section>

          <section className="activity-panel" aria-labelledby="activity-title">
            <h2 id="activity-title">Recent Activity</h2>
            <p>{report.recentActivity.evidence.join(" ")}</p>
            <p className="timestamp">Report generated {new Date(report.generatedAt).toLocaleString()}.</p>
          </section>
        </div>
      ) : null}
    </main>
  );
}

function AccountReportView({ report }: { report: GitHubAccountReport }) {
  return (
    <div className="report-grid">
      <section className="account-summary-panel" aria-labelledby="account-title">
        <div className="account-score">
          <span>{report.averageScore}</span>
          <small>avg</small>
        </div>
        <div className="score-copy">
          <p className="eyebrow">GitHub account readiness</p>
          <h2 id="account-title">{report.account.username}</h2>
          <p>
            Scored {report.repoCount} public repo{report.repoCount === 1 ? "" : "s"} from this GitHub account.
          </p>
          <a href={report.account.url} target="_blank" rel="noreferrer" className="repo-link">
            Open account <ExternalLink size={15} aria-hidden="true" />
          </a>
        </div>
      </section>

      <section className="account-leaders-panel" aria-labelledby="leaders-title">
        <h2 id="leaders-title">Strongest Repos</h2>
        <div className="repo-mini-list">
          {report.strongestRepos.map((repo) => (
            <a key={repo.url} href={repo.url} target="_blank" rel="noreferrer">
              <span>{repo.name}</span>
              <strong>{repo.score}/100</strong>
            </a>
          ))}
        </div>
      </section>

      <ReportList title="Account Gaps" items={report.mostImportantGaps} variant="gap" />
      <ReportList title="Account Suggestions" items={report.suggestions} variant="suggestion" />

      <section className="all-repos-panel" aria-labelledby="all-repos-title">
        <h2 id="all-repos-title">Every Public Repo</h2>
        <div className="repo-score-grid">
          {report.reports.map((repoReport) => (
            <article key={repoReport.repo.fullName} className="repo-score-card">
              <div className="repo-card-heading">
                <div>
                  <h3>{repoReport.repo.name}</h3>
                  <p>{repoReport.grade}</p>
                </div>
                <strong>{repoReport.overallScore}</strong>
              </div>
              <p>{repoReport.repo.description ?? "No GitHub description."}</p>
              <div className="repo-card-signals">
                <SignalPill label="Tests" present={repoReport.tests.present} />
                <SignalPill label="Setup" present={repoReport.setupInstructions.present} />
                <SignalPill label="Demo" present={repoReport.screenshotsOrDemo.present} />
              </div>
              <a href={repoReport.repo.url} target="_blank" rel="noreferrer" className="repo-link">
                Open repo <ExternalLink size={15} aria-hidden="true" />
              </a>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function SignalPill({ label, present }: { label: string; present: boolean }) {
  return (
    <span className={present ? "signal-pill present" : "signal-pill missing"}>
      <GitFork size={13} aria-hidden="true" />
      {label}
    </span>
  );
}

function Signal({ label, signal }: { label: string; signal: BooleanSignal }) {
  return (
    <article className={signal.present ? "signal present" : "signal missing"}>
      {signal.present ? <CheckCircle2 size={18} aria-hidden="true" /> : <XCircle size={18} aria-hidden="true" />}
      <div>
        <h3>{label}</h3>
        <p>{signal.evidence[0]}</p>
      </div>
    </article>
  );
}

function StatusIcon({ status }: { status: ScoreCheckStatus }) {
  if (status === "pass") return <CheckCircle2 className="status-pass" size={18} aria-hidden="true" />;
  if (status === "partial") return <AlertCircle className="status-partial" size={18} aria-hidden="true" />;
  return <XCircle className="status-fail" size={18} aria-hidden="true" />;
}

function ReportList({
  title,
  items,
  variant
}: {
  title: string;
  items: string[];
  variant: "strength" | "gap" | "suggestion" | "ai";
}) {
  return (
    <section className={`list-panel ${variant}`} aria-labelledby={`${variant}-title`}>
      <h2 id={`${variant}-title`}>{title}</h2>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

function DraftBlock({ title, text }: { title: string; text: string }) {
  const [copied, setCopied] = useState(false);

  async function copyText() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <article className="draft-block">
      <div className="draft-heading">
        <h3>{title}</h3>
        <button type="button" onClick={copyText} title={`Copy ${title}`}>
          <Clipboard size={15} aria-hidden="true" />
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <p>{text}</p>
    </article>
  );
}
