# GitHub Repo Health Analyzer

GitHub Repo Health Analyzer is a small Next.js app that checks whether public GitHub work is recruiter-readable. It accepts a repo URL, `owner/repo`, or a GitHub account name, fetches public GitHub signals directly from the browser, and returns explainable repo scores with strengths, gaps, improvement suggestions, a resume bullet draft, and a short LinkedIn summary draft.

## Why It Is Useful

Students often have real project work on GitHub, but recruiters need to understand it quickly. This tool focuses on the signals a reviewer can see in a few minutes:

- Clear README explanation
- Setup and usage instructions
- Screenshots or demo links
- Visible tests and quality signals
- Detectable tech stack
- Recent activity
- Repository structure and metadata

The scoring is deterministic and explainable. The GitHub Pages deployment works without secrets, login, or a backend server.

## Tech Stack

- Next.js App Router
- TypeScript
- React
- GitHub public REST API from the browser
- Vitest for focused unit tests
- GitHub Actions for CI

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

No environment variables are required. The app calls the public GitHub API from the browser, so it only analyzes public repositories and may be affected by GitHub's unauthenticated API rate limits.

## Deployment

This project is configured for GitHub Pages.

1. Push to the `main` branch.
2. In GitHub, open **Settings > Pages**.
3. Set **Source** to **GitHub Actions**.
4. The `Deploy GitHub Pages` workflow builds the static site into `out/` and publishes it.

Expected public URL:

```text
https://ammar31mawassi.github.io/repo-health-analyzer/
```

## Example Repo To Test

Use Ammar's AI Job Tracker:

```text
https://github.com/ammar31mawassi/ai-job-tracker
```

You can also try any public repo in `owner/repo` format.

To score every public repo in an account, enter a username or profile URL:

```text
ammar31mawassi
https://github.com/ammar31mawassi
```

Then click **Analyze GitHub Account**.

## Scoring Model

The analyzer gives up to 100 points:

- Repository metadata: 10
- README clarity: 20
- Setup and usage: 15
- Screenshots and demo proof: 10
- Tests and quality signals: 15
- Tech stack detectability: 10
- Recent activity: 10
- Repository structure: 10

Each score section includes evidence so the report is explainable instead of hidden behind AI.

## Tests

```bash
npm test
```

The current tests cover:

- GitHub URL and shorthand parsing
- README signal detection
- Recruiter-readiness scoring behavior
- Account-wide aggregation behavior
- A self-readiness check that keeps this project at 90+ under its own scoring model

## Architecture

See [docs/architecture.md](docs/architecture.md) for the data flow, API boundaries, and MVP tradeoffs.

## Screenshots

Current local report screenshot:

![Repo Health Analyzer report](docs/repo-health-analyzer-report.png)

Before publishing, consider capturing:

1. A full report for `ammar31mawassi/ai-job-tracker`
2. A close-up of the score and deterministic scoring sections
3. The generated resume and LinkedIn draft section

Place the final screenshots in `docs/` and keep the best one near the top of this README.

## Build Checks

```bash
npm run lint
npm test
npm run build
```

## MVP Boundaries

- Public GitHub repositories only
- Account mode analyzes public repositories only
- No login or database
- No private repository access
- No required API key
- No dashboards, teams, or payments
