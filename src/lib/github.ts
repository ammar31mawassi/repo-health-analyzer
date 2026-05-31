import type { GitHubRepository, ParsedAccountInput, ParsedRepoInput, RecentCommit, RepoSnapshot } from "@/src/types";

type GitHubReadmeResponse = {
  content: string;
  encoding: string;
};

type GitHubTreeResponse = {
  tree?: Array<{
    path: string;
    type: string;
  }>;
  truncated?: boolean;
};

type GitHubContentItem = {
  path: string;
  type: string;
};

type GitHubCommitResponse = {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    author?: {
      name?: string;
      date?: string;
    } | null;
  };
};

type GitHubSearchRepositoriesResponse = {
  items: GitHubRepository[];
};

type RepositoryListResult = {
  repositories: GitHubRepository[];
  apiDetailsAvailable: boolean;
};

export class GitHubApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "GitHubApiError";
    this.status = status;
  }
}

export async function fetchRepoSnapshot(input: ParsedRepoInput): Promise<RepoSnapshot> {
  const metadata = await fetchGitHubJson<GitHubRepository>(`/repos/${input.owner}/${input.repo}`);
  return fetchRepoSnapshotFromMetadata(input, metadata);
}

export async function fetchAccountRepoSnapshots(input: ParsedAccountInput): Promise<RepoSnapshot[]> {
  const { repositories, apiDetailsAvailable } = await fetchPublicRepositories(input.username);

  if (repositories.length === 0) {
    throw new GitHubApiError("No public repositories were found for that GitHub account.", 404);
  }

  return mapInBatches(repositories, 4, (repository) =>
    fetchRepoSnapshotFromMetadata(
      {
        owner: input.username,
        repo: repository.name,
        normalizedUrl: repository.html_url
      },
      repository,
      { allowPartial: true, skipApiDetails: !apiDetailsAvailable }
    )
  );
}

async function fetchRepoSnapshotFromMetadata(
  input: ParsedRepoInput,
  metadata: GitHubRepository,
  options: { allowPartial?: boolean; skipApiDetails?: boolean } = {}
): Promise<RepoSnapshot> {
  const [readme, languages, treePaths, recentCommits] = await Promise.all([
    fetchReadme(input.owner, input.repo, metadata.default_branch, options.allowPartial),
    options.skipApiDetails
      ? Promise.resolve(metadata.language ? { [metadata.language]: 1 } : {})
      : fetchGitHubJson<Record<string, number>>(`/repos/${input.owner}/${input.repo}/languages`).catch(() => ({})),
    options.skipApiDetails ? Promise.resolve<string[]>([]) : fetchTreePaths(input.owner, input.repo, metadata.default_branch),
    options.skipApiDetails ? Promise.resolve<RecentCommit[]>([]) : fetchRecentCommits(input.owner, input.repo)
  ]);
  const normalizedTreePaths = options.skipApiDetails && readme ? Array.from(new Set(["README.md", ...treePaths])) : treePaths;

  return {
    input,
    metadata,
    readme,
    languages,
    treePaths: normalizedTreePaths,
    recentCommits
  };
}

async function fetchPublicRepositories(username: string): Promise<RepositoryListResult> {
  const repositories: GitHubRepository[] = [];

  try {
    for (let page = 1; page <= 10; page += 1) {
      const batch = await fetchGitHubJson<GitHubRepository[]>(
        `/users/${username}/repos?type=public&sort=updated&direction=desc&per_page=100&page=${page}`
      );

      repositories.push(...batch);
      if (batch.length < 100) break;
    }

    return { repositories, apiDetailsAvailable: true };
  } catch (error) {
    if (!(error instanceof GitHubApiError) || error.status !== 403) {
      throw error;
    }
  }

  return {
    repositories: await fetchPublicRepositoriesFromSearch(username),
    apiDetailsAvailable: false
  };
}

async function fetchPublicRepositoriesFromSearch(username: string): Promise<GitHubRepository[]> {
  const repositories: GitHubRepository[] = [];
  const encodedQuery = encodeURIComponent(`user:${username} fork:true`);

  for (let page = 1; page <= 10; page += 1) {
    const response = await fetchGitHubJson<GitHubSearchRepositoriesResponse>(
      `/search/repositories?q=${encodedQuery}&sort=updated&order=desc&per_page=100&page=${page}`
    );

    repositories.push(...response.items);
    if (response.items.length < 100) break;
  }

  return repositories;
}

async function fetchReadme(owner: string, repo: string, branch: string, allowPartial = false): Promise<string> {
  try {
    const response = await fetchGitHubJson<GitHubReadmeResponse>(`/repos/${owner}/${repo}/readme`);
    if (response.encoding !== "base64") return "";
    return Buffer.from(response.content, "base64").toString("utf8");
  } catch (error) {
    const rawReadme = await fetchRawReadme(owner, repo, branch);
    if (rawReadme) return rawReadme;
    if (error instanceof GitHubApiError && (error.status === 404 || allowPartial)) return "";
    throw error;
  }
}

async function fetchRawReadme(owner: string, repo: string, branch: string): Promise<string> {
  const candidates = ["README.md", "readme.md", "README.MD", "README"];

  for (const fileName of candidates) {
    try {
      const response = await fetch(
        `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(
          branch
        )}/${fileName}`,
        { cache: "no-store" }
      );

      if (response.ok) return response.text();
    } catch {
      // Try the next common README file name.
    }
  }

  return "";
}

async function fetchTreePaths(owner: string, repo: string, branch: string): Promise<string[]> {
  try {
    const encodedBranch = encodeURIComponent(branch);
    const response = await fetchGitHubJson<GitHubTreeResponse>(
      `/repos/${owner}/${repo}/git/trees/${encodedBranch}?recursive=1`
    );
    const paths = response.tree?.map((item) => item.path).filter(Boolean) ?? [];
    if (paths.length > 0) return paths;
  } catch {
    // Fall through to the root contents endpoint when the recursive tree is blocked or unavailable.
  }

  try {
    const rootContents = await fetchGitHubJson<GitHubContentItem[] | GitHubContentItem>(`/repos/${owner}/${repo}/contents`);
    const items = Array.isArray(rootContents) ? rootContents : [rootContents];
    return items.map((item) => item.path).filter(Boolean);
  } catch {
    return [];
  }
}

async function fetchRecentCommits(owner: string, repo: string): Promise<RecentCommit[]> {
  try {
    const commits = await fetchGitHubJson<GitHubCommitResponse[]>(`/repos/${owner}/${repo}/commits?per_page=10`);
    return commits.map((item) => ({
      sha: item.sha,
      message: item.commit.message.split("\n")[0] ?? "",
      authorName: item.commit.author?.name ?? null,
      committedAt: item.commit.author?.date ?? null,
      url: item.html_url
    }));
  } catch {
    return [];
  }
}

async function fetchGitHubJson<T>(path: string): Promise<T> {
  const response = await fetch(`https://api.github.com${path}`, {
    headers: githubHeaders(),
    cache: "no-store"
  });

  if (!response.ok) {
    const message = await safeGitHubErrorMessage(response);
    throw new GitHubApiError(message, response.status);
  }

  return (await response.json()) as T;
}

async function mapInBatches<T, R>(items: T[], batchSize: number, mapper: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = [];

  for (let index = 0; index < items.length; index += batchSize) {
    const batch = items.slice(index, index + batchSize);
    results.push(...(await Promise.all(batch.map(mapper))));
  }

  return results;
}

function githubHeaders(): HeadersInit {
  const headers: HeadersInit = {
    Accept: "application/vnd.github+json",
    "User-Agent": "repo-health-analyzer",
    "X-GitHub-Api-Version": "2022-11-28"
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  return headers;
}

async function safeGitHubErrorMessage(response: Response): Promise<string> {
  let apiMessage = "";

  try {
    const body = (await response.json()) as { message?: string };
    apiMessage = body.message ? ` GitHub says: ${body.message}` : "";
  } catch {
    apiMessage = "";
  }

  if (response.status === 404) return `Repository was not found or is not public.${apiMessage}`;
  if (response.status === 403) return `GitHub API rate limit or access limit was hit.${apiMessage}`;
  return `GitHub API request failed with status ${response.status}.${apiMessage}`;
}
