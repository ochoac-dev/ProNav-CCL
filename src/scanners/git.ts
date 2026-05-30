import { execFileSync } from "node:child_process";
import type { GitScan } from "../types.js";
import { splitLines } from "./common.js";

export function redactSecrets(input: string): string {
  return input
    .replace(/github_pat_[A-Za-z0-9_]+/g, "<redacted>")
    .replace(/gh[pousr]_[A-Za-z0-9_]+/g, "<redacted>")
    .replace(/glpat-[A-Za-z0-9_-]+/g, "<redacted>")
    .replace(/\b(access_token|token|password|passwd|api_key|apikey|client_secret)=([^&\s]+)/gi, "$1=<redacted>")
    .replace(/(https?:\/\/)([^@\s/]+)@/g, "$1<redacted>@");
}

export function scanGit(repoRoot: string): GitScan {
  return {
    branch: firstLine(runGit(repoRoot, ["branch", "--show-current"])) || "(detached or unknown)",
    status: splitLines(runGit(repoRoot, ["status", "--short"])),
    recentCommits: splitLines(runGit(repoRoot, ["log", "--oneline", "--decorate", "-5"])),
    remotes: splitLines(redactSecrets(runGit(repoRoot, ["remote", "-v"])))
  };
}

function runGit(repoRoot: string, args: string[]): string {
  try {
    return execFileSync("git", ["-C", repoRoot, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    });
  } catch {
    return "";
  }
}

function firstLine(value: string): string {
  return splitLines(value)[0] ?? "";
}
