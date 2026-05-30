import { existsSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import type { DetectedCapability, ProjectDetection, ProjectType } from "../types.js";

interface DetectOptions {
  projectType?: ProjectType;
  unityProjectRoot?: string;
}

export function detectProject(repoRoot: string, options: DetectOptions = {}): ProjectDetection {
  const absoluteRepoRoot = resolve(repoRoot);
  const unityCandidate = options.unityProjectRoot ? resolve(options.unityProjectRoot) : absoluteRepoRoot;
  const capabilities: DetectedCapability[] = ["generic"];
  const roots: ProjectDetection["roots"] = { repoRoot: absoluteRepoRoot };

  if (isDirectory(join(absoluteRepoRoot, ".git"))) {
    capabilities.push("git");
  }

  const nestedUnityRoot = findNestedUnityRoot(absoluteRepoRoot);
  if (hasUnityMarkers(unityCandidate)) {
    capabilities.push("unity");
    roots.unityProjectRoot = unityCandidate;
  } else if (unityCandidate !== absoluteRepoRoot && hasUnityMarkers(absoluteRepoRoot)) {
    capabilities.push("unity");
    roots.unityProjectRoot = absoluteRepoRoot;
  } else if (nestedUnityRoot) {
    capabilities.push("unity");
    roots.unityProjectRoot = nestedUnityRoot;
  }

  const supabaseRoot = firstDirectoryWith(
    [roots.unityProjectRoot, options.unityProjectRoot, absoluteRepoRoot],
    "supabase",
    "migrations"
  );
  if (supabaseRoot) {
    capabilities.push("supabase");
    roots.supabaseRoot = supabaseRoot;
  }

  if (existsSync(join(absoluteRepoRoot, "package.json"))) {
    capabilities.push("node");
  }

  if (hasWordPressMarkers(absoluteRepoRoot)) {
    capabilities.push("wordpress");
  }

  return {
    type: resolveProjectType(capabilities, options.projectType),
    detectedCapabilities: capabilities,
    roots
  };
}

function hasUnityMarkers(root: string): boolean {
  return isDirectory(join(root, "Assets")) && isDirectory(join(root, "ProjectSettings"));
}

function hasWordPressMarkers(root: string): boolean {
  return (
    existsSync(join(root, "wp-config.php")) ||
    isDirectory(join(root, "wp-content")) ||
    isDirectory(join(root, "themes")) ||
    isDirectory(join(root, "plugins"))
  );
}

function findNestedUnityRoot(repoRoot: string): string | undefined {
  try {
    for (const entry of readdirSync(repoRoot, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name.startsWith(".")) {
        continue;
      }

      const candidate = join(repoRoot, entry.name);
      if (hasUnityMarkers(candidate)) {
        return candidate;
      }
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function firstDirectoryWith(candidateRoots: Array<string | undefined>, ...segments: string[]): string | undefined {
  for (const candidateRoot of candidateRoots) {
    if (!candidateRoot) continue;
    const candidate = resolve(candidateRoot);
    if (isDirectory(join(candidate, ...segments))) {
      return candidate;
    }
  }

  return undefined;
}

function resolveProjectType(
  capabilities: DetectedCapability[],
  configured: ProjectType | undefined
): Exclude<ProjectType, "auto"> {
  if (configured && configured !== "auto") {
    return configured;
  }

  if (capabilities.includes("unity")) return "unity";
  if (capabilities.includes("wordpress")) return "wordpress";
  if (capabilities.includes("node")) return "node";
  if (capabilities.includes("supabase")) return "supabase";
  return "generic";
}

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}
