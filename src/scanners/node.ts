import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { NodeScan } from "../types.js";

export function scanNode(repoRoot: string): NodeScan {
  const packageJsonPath = join(repoRoot, "package.json");
  if (!existsSync(packageJsonPath)) {
    return emptyNodeScan();
  }

  const raw = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
    scripts?: Record<string, string>;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const dependencies = sortedKeys(raw.dependencies);
  const devDependencies = sortedKeys(raw.devDependencies);
  const allDependencies = new Set([...dependencies, ...devDependencies]);

  return {
    packageJsonPath: "package.json",
    packageManager: detectPackageManager(repoRoot),
    scripts: Object.entries(raw.scripts ?? {})
      .map(([name, command]) => `${name}: ${command}`)
      .sort((a, b) => a.localeCompare(b)),
    dependencies,
    devDependencies,
    frameworks: detectFrameworks(allDependencies)
  };
}

export function emptyNodeScan(): NodeScan {
  return {
    packageJsonPath: null,
    packageManager: null,
    scripts: [],
    dependencies: [],
    devDependencies: [],
    frameworks: []
  };
}

function sortedKeys(value: Record<string, string> | undefined): string[] {
  return Object.keys(value ?? {}).sort((a, b) => a.localeCompare(b));
}

function detectPackageManager(repoRoot: string): string | null {
  if (existsSync(join(repoRoot, "pnpm-lock.yaml"))) return "pnpm";
  if (existsSync(join(repoRoot, "yarn.lock"))) return "yarn";
  if (existsSync(join(repoRoot, "package-lock.json"))) return "npm";
  return null;
}

function detectFrameworks(dependencies: Set<string>): string[] {
  const known: Array<[string, string]> = [
    ["next", "Next.js"],
    ["react", "React"],
    ["vue", "Vue"],
    ["svelte", "Svelte"],
    ["@angular/core", "Angular"],
    ["vite", "Vite"],
    ["express", "Express"],
    ["fastify", "Fastify"],
    ["commander", "Commander"],
    ["vitest", "Vitest"],
    ["jest", "Jest"],
    ["playwright", "Playwright"],
    ["electron", "Electron"],
    ["@tauri-apps/api", "Tauri"]
  ];

  return known.filter(([dependency]) => dependencies.has(dependency)).map(([, label]) => label);
}
