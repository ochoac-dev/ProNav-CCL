import { extname } from "node:path";
import fg from "fast-glob";
import type { GenericScan } from "../types.js";
import { samplePaths, SCAN_IGNORES } from "./common.js";

const MANIFEST_NAMES = new Set([
  "package.json",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "tsconfig.json",
  "vite.config.ts",
  "vite.config.js",
  "next.config.js",
  "next.config.mjs",
  "composer.json",
  "pyproject.toml",
  "requirements.txt",
  "Cargo.toml",
  "go.mod",
  "wp-config.php",
  "ProjectSettings/ProjectVersion.txt"
]);

const LANGUAGE_BY_EXTENSION: Record<string, string> = {
  ".ts": "TypeScript",
  ".tsx": "TypeScript React",
  ".js": "JavaScript",
  ".jsx": "JavaScript React",
  ".mjs": "JavaScript",
  ".cjs": "JavaScript",
  ".cs": "C#",
  ".sql": "SQL",
  ".md": "Markdown",
  ".json": "JSON",
  ".yaml": "YAML",
  ".yml": "YAML",
  ".php": "PHP",
  ".css": "CSS",
  ".scss": "CSS",
  ".html": "HTML",
  ".vue": "Vue",
  ".svelte": "Svelte",
  ".py": "Python",
  ".rb": "Ruby",
  ".go": "Go",
  ".rs": "Rust",
  ".swift": "Swift",
  ".unity": "Unity Scene",
  ".prefab": "Unity Prefab",
  ".asset": "Unity Asset"
};

const SCRIPT_TYPE_BY_EXTENSION: Record<string, string> = {
  ".bash": "Shell",
  ".cjs": "JavaScript",
  ".cljs": "ClojureScript",
  ".clj": "Clojure",
  ".cs": "C#",
  ".dart": "Dart",
  ".erl": "Erlang",
  ".ex": "Elixir",
  ".exs": "Elixir",
  ".fs": "F#",
  ".fsx": "F#",
  ".go": "Go",
  ".java": "Java",
  ".js": "JavaScript",
  ".jsx": "JavaScript React",
  ".kt": "Kotlin",
  ".kts": "Kotlin",
  ".lua": "Lua",
  ".mjs": "JavaScript",
  ".php": "PHP",
  ".pl": "Perl",
  ".ps1": "PowerShell",
  ".py": "Python",
  ".r": "R",
  ".rb": "Ruby",
  ".rs": "Rust",
  ".scala": "Scala",
  ".sh": "Shell",
  ".sql": "SQL",
  ".svelte": "Svelte",
  ".swift": "Swift",
  ".ts": "TypeScript",
  ".tsx": "TypeScript React",
  ".vue": "Vue",
  ".zsh": "Shell"
};

for (const [extension, language] of Object.entries(SCRIPT_TYPE_BY_EXTENSION)) {
  LANGUAGE_BY_EXTENSION[extension] ??= language;
}

export async function scanGeneric(repoRoot: string): Promise<GenericScan> {
  const files = await fg(["**/*"], {
    cwd: repoRoot,
    onlyFiles: true,
    dot: true,
    ignore: SCAN_IGNORES
  });

  return {
    totalFiles: files.length,
    languageCounts: countLanguages(files),
    scripts: countScripts(files),
    topDirectories: countTopDirectories(files),
    manifests: files.filter(isManifest).sort((a, b) => a.localeCompare(b)),
    sampleFiles: samplePaths(files, 50)
  };
}

export function emptyGenericScan(): GenericScan {
  return {
    totalFiles: 0,
    languageCounts: {},
    scripts: { total: 0, typeCounts: {}, samples: [] },
    topDirectories: [],
    manifests: [],
    sampleFiles: []
  };
}

function countLanguages(files: string[]): Record<string, number> {
  const counts = new Map<string, number>();
  for (const file of files) {
    const language = LANGUAGE_BY_EXTENSION[extname(file).toLowerCase()] ?? "Other";
    counts.set(language, (counts.get(language) ?? 0) + 1);
  }

  return Object.fromEntries([...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])));
}

function countScripts(files: string[]): NonNullable<GenericScan["scripts"]> {
  const typeCounts = new Map<string, number>();
  const scriptFiles: string[] = [];

  for (const file of files) {
    const scriptType = scriptTypeFor(file);
    if (!scriptType) continue;
    typeCounts.set(scriptType, (typeCounts.get(scriptType) ?? 0) + 1);
    scriptFiles.push(file);
  }

  return {
    total: scriptFiles.length,
    typeCounts: Object.fromEntries([...typeCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))),
    samples: samplePaths(scriptFiles, 80)
  };
}

function scriptTypeFor(file: string): string | null {
  const extension = extname(file).toLowerCase();
  if (extension) {
    return SCRIPT_TYPE_BY_EXTENSION[extension] ?? null;
  }

  const basename = file.split("/").at(-1)?.toLowerCase();
  if (basename === "dockerfile" || basename === "makefile") {
    return "Build script";
  }

  return null;
}

function countTopDirectories(files: string[]): GenericScan["topDirectories"] {
  const counts = new Map<string, number>();
  for (const file of files) {
    const first = file.includes("/") ? file.split("/")[0] : "(root)";
    counts.set(first, (counts.get(first) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([path, count]) => ({ path, count }))
    .sort((a, b) => b.count - a.count || directoryRank(b.path) - directoryRank(a.path) || a.path.localeCompare(b.path))
    .slice(0, 20);
}

function directoryRank(path: string): number {
  if (path === "src") return 50;
  if (path === "app") return 45;
  if (path === "Assets") return 40;
  if (path === "wp-content") return 35;
  if (path === "supabase") return 30;
  if (path === "docs" || path === "Docs") return 20;
  if (path === "tests" || path === "test") return 15;
  if (path === "(root)") return -10;
  return 0;
}

function isManifest(file: string): boolean {
  if (MANIFEST_NAMES.has(file)) {
    return true;
  }

  return /(^|\/)(Dockerfile|Makefile|.*\.config\.[cm]?[jt]s)$/.test(file);
}
