import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { WordPressScan } from "../types.js";

export function scanWordPress(repoRoot: string): WordPressScan {
  return {
    hasWpConfig: existsSync(join(repoRoot, "wp-config.php")),
    contentRoots: existingDirectories(repoRoot, ["wp-content", "wp-content/themes", "wp-content/plugins"]),
    themes: listDirectoryNames(join(repoRoot, "wp-content", "themes")),
    plugins: listDirectoryNames(join(repoRoot, "wp-content", "plugins"))
  };
}

export function emptyWordPressScan(): WordPressScan {
  return {
    hasWpConfig: false,
    contentRoots: [],
    themes: [],
    plugins: []
  };
}

function existingDirectories(repoRoot: string, paths: string[]): string[] {
  return paths.filter((path) => existsSync(join(repoRoot, path)));
}

function listDirectoryNames(path: string): string[] {
  try {
    return readdirSync(path, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() || entry.isFile())
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}
