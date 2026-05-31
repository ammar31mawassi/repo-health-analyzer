import type { ParsedAccountInput, ParsedRepoInput } from "@/src/types";

const OWNER_PATTERN = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;
const REPO_PATTERN = /^[a-zA-Z0-9._-]+$/;

export function parseGitHubRepoInput(rawInput: string): ParsedRepoInput {
  const input = rawInput.trim();

  if (!input) {
    throw new Error("Enter a GitHub repository URL or owner/repo.");
  }

  const sshMatch = input.match(/^git@github\.com:([^/\s]+)\/([^/\s]+?)(?:\.git)?$/i);
  if (sshMatch) {
    return normalizeParts(sshMatch[1], sshMatch[2]);
  }

  if (/^https?:\/\//i.test(input)) {
    let url: URL;
    try {
      url = new URL(input);
    } catch {
      throw new Error("The GitHub URL is not valid.");
    }

    if (url.hostname.toLowerCase() !== "github.com") {
      throw new Error("Only github.com repository URLs are supported.");
    }

    const [owner, repo] = url.pathname
      .split("/")
      .filter(Boolean)
      .slice(0, 2);

    return normalizeParts(owner, repo);
  }

  const [owner, repo] = input.replace(/^github\.com\//i, "").split("/").filter(Boolean);
  return normalizeParts(owner, repo);
}

export function parseGitHubAccountInput(rawInput: string): ParsedAccountInput {
  const input = rawInput.trim();

  if (!input) {
    throw new Error("Enter a GitHub username or profile URL.");
  }

  if (/^https?:\/\//i.test(input)) {
    let url: URL;
    try {
      url = new URL(input);
    } catch {
      throw new Error("The GitHub URL is not valid.");
    }

    if (url.hostname.toLowerCase() !== "github.com") {
      throw new Error("Only github.com account URLs are supported.");
    }

    const [username] = url.pathname.split("/").filter(Boolean);
    return normalizeAccount(username);
  }

  const [username] = input.replace(/^github\.com\//i, "").split("/").filter(Boolean);
  return normalizeAccount(username);
}

function normalizeParts(owner?: string, repo?: string): ParsedRepoInput {
  const cleanOwner = owner?.trim();
  const cleanRepo = repo?.trim().replace(/\.git$/i, "");

  if (!cleanOwner || !cleanRepo) {
    throw new Error("Use the format owner/repo, for example vercel/next.js.");
  }

  if (!OWNER_PATTERN.test(cleanOwner)) {
    throw new Error("The GitHub owner name is not valid.");
  }

  if (!REPO_PATTERN.test(cleanRepo)) {
    throw new Error("The GitHub repo name is not valid.");
  }

  return {
    owner: cleanOwner,
    repo: cleanRepo,
    normalizedUrl: `https://github.com/${cleanOwner}/${cleanRepo}`
  };
}

function normalizeAccount(username?: string): ParsedAccountInput {
  const cleanUsername = username?.trim();

  if (!cleanUsername) {
    throw new Error("Use a GitHub username, for example ammar31mawassi.");
  }

  if (!OWNER_PATTERN.test(cleanUsername)) {
    throw new Error("The GitHub account name is not valid.");
  }

  return {
    username: cleanUsername,
    normalizedUrl: `https://github.com/${cleanUsername}`
  };
}
