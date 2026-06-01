import type { NextConfig } from "next";

const repositoryName = "repo-health-analyzer";
const isGitHubActions = process.env.GITHUB_ACTIONS === "true";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: isGitHubActions ? `/${repositoryName}` : "",
  assetPrefix: isGitHubActions ? `/${repositoryName}/` : "",
  images: {
    unoptimized: true
  }
};

export default nextConfig;
