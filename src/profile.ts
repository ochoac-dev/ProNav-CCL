import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import YAML from "yaml";
import type { FeatureArea, ProjectProfile, ProjectType } from "./types.js";

interface RawFeatureArea {
  title?: unknown;
  description?: unknown;
  globs?: unknown;
  keywords?: unknown;
  maxFiles?: unknown;
}

interface RawProfile {
  name?: unknown;
  projectType?: unknown;
  repoRoot?: unknown;
  unityProjectRoot?: unknown;
  featureAreas?: unknown;
  validationCommands?: unknown;
  protectedPaths?: unknown;
}

export function loadProfile(profilePath: string): ProjectProfile {
  const absoluteProfilePath = resolve(profilePath);
  const raw = YAML.parse(readFileSync(absoluteProfilePath, "utf8")) as RawProfile;
  const baseDir = dirname(absoluteProfilePath);

  if (!raw || typeof raw !== "object") {
    throw new Error(`Profile ${profilePath} must be a YAML object.`);
  }

  const name = requireString(raw.name, "name");
  const projectType = parseProjectType(raw.projectType);
  const repoRoot = resolveProfilePath(requireString(raw.repoRoot, "repoRoot"), baseDir);
  const unityProjectRoot =
    typeof raw.unityProjectRoot === "string" && raw.unityProjectRoot.trim().length > 0
      ? resolveProfilePath(raw.unityProjectRoot, baseDir)
      : undefined;

  ensureDirectoryExists("repoRoot", repoRoot);
  if (unityProjectRoot) {
    ensureDirectoryExists("unityProjectRoot", unityProjectRoot);

    if (repoRoot === unityProjectRoot) {
      throw new Error("Configured repoRoot and unityProjectRoot must be separate paths when unityProjectRoot is set.");
    }
  }

  return {
    name,
    projectType,
    repoRoot,
    unityProjectRoot,
    featureAreas: parseFeatureAreas(raw.featureAreas),
    validationCommands: optionalStringArray(raw.validationCommands, "validationCommands"),
    protectedPaths: optionalStringArray(raw.protectedPaths, "protectedPaths")
  };
}

function resolveProfilePath(value: string, baseDir: string): string {
  return isAbsolute(value) ? value : resolve(baseDir, value);
}

function ensureDirectoryExists(label: string, value: string): void {
  if (!existsSync(value)) {
    throw new Error(`Configured ${label} does not exist: ${value}`);
  }

  if (!statSync(value).isDirectory()) {
    throw new Error(`Configured ${label} is not a directory: ${value}`);
  }
}

function parseFeatureAreas(raw: unknown): Record<string, FeatureArea> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Profile featureAreas must be a mapping of feature id to config.");
  }

  const entries = Object.entries(raw as Record<string, RawFeatureArea>);
  if (entries.length === 0) {
    throw new Error("Profile featureAreas must define at least one feature.");
  }

  return Object.fromEntries(
    entries.map(([id, value]) => {
      if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) {
        throw new Error(`Feature area id '${id}' must use lowercase letters, numbers, and hyphens.`);
      }

      if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new Error(`Feature area ${id} must be a YAML object.`);
      }

      return [
        id,
        {
          id,
          title: typeof value.title === "string" ? value.title : titleize(id),
          description:
            typeof value.description === "string" ? value.description : `${titleize(id)} feature area.`,
          globs: requireStringArray(value.globs, `featureAreas.${id}.globs`),
          keywords: requireStringArray(value.keywords, `featureAreas.${id}.keywords`),
          maxFiles:
            typeof value.maxFiles === "number" && Number.isFinite(value.maxFiles)
              ? Math.max(1, Math.trunc(value.maxFiles))
              : 40
        }
      ];
    })
  );
}

function parseProjectType(value: unknown): ProjectType {
  if (value === undefined || value === null) {
    return "auto";
  }

  if (
    value !== "auto" &&
    value !== "generic" &&
    value !== "unity" &&
    value !== "node" &&
    value !== "supabase" &&
    value !== "wordpress"
  ) {
    throw new Error("Profile projectType must be one of: auto, generic, unity, node, supabase, wordpress.");
  }

  return value;
}

function titleize(id: string): string {
  return id
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Profile ${label} must be a non-empty string.`);
  }

  return value;
}

function requireStringArray(value: unknown, label: string): string[] {
  if (!Array.isArray(value) || value.length === 0 || !value.every((item) => typeof item === "string")) {
    throw new Error(`Profile ${label} must be a non-empty string array.`);
  }

  return value;
}

function optionalStringArray(value: unknown, label: string): string[] {
  if (value === undefined || value === null) {
    return [];
  }

  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new Error(`Profile ${label} must be a string array.`);
  }

  return value;
}
