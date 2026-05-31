# Architecture

GitHub Repo Health Analyzer keeps the MVP intentionally small:

- The browser UI in `app/page.tsx` collects a repository URL, `owner/repo`, or GitHub account name.
- `app/api/analyze/route.ts` handles single-repo analysis.
- `app/api/analyze-account/route.ts` handles account-wide analysis across public repositories.
- `src/lib/github.ts` fetches public GitHub API data and falls back to lighter public data when unauthenticated rate limits are hit.
- `src/lib/scoring.ts` applies deterministic scoring rules before any optional AI suggestions are considered.
- `src/lib/accountAnalysis.ts` aggregates repo-level reports into account-level strengths, gaps, and next actions.

The app has no database, login, payments, or private repository access. This keeps the portfolio story focused on API integration, deterministic analysis, UI polish, and testable business logic.

## Data Flow

1. User enters a public GitHub target.
2. The API route parses and validates the input.
3. GitHub public metadata, README content, language data, tree data, and recent activity are fetched where available.
4. The deterministic scoring engine creates an explainable report.
5. The UI renders score, evidence, strengths, gaps, suggestions, and career-ready drafts.

Optional OpenAI suggestions use only the deterministic public summary and are disabled unless `OPENAI_API_KEY` is set.
