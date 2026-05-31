import { describe, expect, it } from "vitest";
import { parseGitHubAccountInput, parseGitHubRepoInput } from "@/src/lib/parseRepo";

describe("parseGitHubRepoInput", () => {
  it("parses a normal GitHub URL", () => {
    expect(parseGitHubRepoInput("https://github.com/owner-name/repo.name")).toEqual({
      owner: "owner-name",
      repo: "repo.name",
      normalizedUrl: "https://github.com/owner-name/repo.name"
    });
  });

  it("parses owner/repo shorthand", () => {
    expect(parseGitHubRepoInput("vercel/next.js").normalizedUrl).toBe("https://github.com/vercel/next.js");
  });

  it("ignores extra URL path segments and .git suffixes", () => {
    expect(parseGitHubRepoInput("https://github.com/openai/openai-node.git/tree/main").repo).toBe("openai-node");
  });

  it("parses SSH clone URLs", () => {
    expect(parseGitHubRepoInput("git@github.com:ammar31mawassi/ai-job-tracker.git")).toEqual({
      owner: "ammar31mawassi",
      repo: "ai-job-tracker",
      normalizedUrl: "https://github.com/ammar31mawassi/ai-job-tracker"
    });
  });

  it("rejects non-GitHub URLs", () => {
    expect(() => parseGitHubRepoInput("https://example.com/owner/repo")).toThrow("Only github.com");
  });
});

describe("parseGitHubAccountInput", () => {
  it("parses a username", () => {
    expect(parseGitHubAccountInput("ammar31mawassi")).toEqual({
      username: "ammar31mawassi",
      normalizedUrl: "https://github.com/ammar31mawassi"
    });
  });

  it("parses a GitHub profile URL", () => {
    expect(parseGitHubAccountInput("https://github.com/vercel?tab=repositories")).toEqual({
      username: "vercel",
      normalizedUrl: "https://github.com/vercel"
    });
  });

  it("uses the owner when a repo URL is provided for account analysis", () => {
    expect(parseGitHubAccountInput("https://github.com/openai/openai-node").username).toBe("openai");
  });
});
