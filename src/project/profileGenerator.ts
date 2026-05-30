import { constants } from "node:fs";
import { access, mkdir, stat, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import YAML from "yaml";
import type { FeatureArea, ProjectProfile, ProjectType } from "../types.js";
import { detectProject } from "./detect.js";

export interface CreateGeneratedProfileOptions {
  repoRoot: string;
  name?: string;
  projectType?: ProjectType;
  workspaceRoot?: string;
}

export interface GeneratedProfileResult {
  slug: string;
  profilePath: string;
  profile: ProjectProfile;
}

export async function createGeneratedProfile(options: CreateGeneratedProfileOptions): Promise<GeneratedProfileResult> {
  const repoRoot = resolve(options.repoRoot);
  await validateRepoPath(repoRoot);

  const name = normalizeProjectName(options.name, repoRoot);
  const slug = slugify(name);
  const workspaceRoot = resolve(options.workspaceRoot ?? process.cwd());
  const detection = detectProject(repoRoot, { projectType: options.projectType ?? "auto" });
  const featureAreas = defaultFeatureAreas(detection.detectedCapabilities);
  const validationCommands = defaultValidationCommands(repoRoot, detection.detectedCapabilities);
  const protectedPaths = defaultProtectedPaths(detection.detectedCapabilities);
  const profile: ProjectProfile = {
    name,
    projectType: options.projectType ?? "auto",
    repoRoot,
    unityProjectRoot:
      detection.roots.unityProjectRoot && detection.roots.unityProjectRoot !== repoRoot
        ? detection.roots.unityProjectRoot
        : undefined,
    featureAreas,
    validationCommands,
    protectedPaths
  };

  const profilePath = join(workspaceRoot, "project_profiles", "generated", `${slug}.yml`);
  await mkdir(join(workspaceRoot, "project_profiles", "generated"), { recursive: true });
  await writeFile(profilePath, YAML.stringify(toYamlShape(profile)), "utf8");

  return { slug, profilePath, profile };
}

async function validateRepoPath(repoRoot: string): Promise<void> {
  let info;
  try {
    info = await stat(repoRoot);
  } catch {
    throw new Error(`Repo path does not exist: ${repoRoot}`);
  }

  if (!info.isDirectory()) {
    throw new Error(`Repo path is not a directory: ${repoRoot}`);
  }

  try {
    await access(repoRoot, constants.R_OK);
  } catch {
    throw new Error(`Repo path is not readable: ${repoRoot}`);
  }
}

function normalizeProjectName(name: string | undefined, repoRoot: string): string {
  const fallback = basename(repoRoot) || "project";
  const value = name?.trim() || fallback;
  return value;
}

function defaultFeatureAreas(capabilities: string[]): Record<string, FeatureArea> {
  const areas: FeatureArea[] = [
    feature("source", "Source Code", "Primary application and library source files.", [
      "src/**/*",
      "app/**/*",
      "lib/**/*",
      "server/**/*",
      "Assets/**/*.cs",
      "wp-content/**/*.php"
    ], ["source", "app", "service", "controller", "manager", "component", "screen"], 50),
    feature("config", "Configuration", "Project manifests, build settings, and runtime configuration.", [
      "package.json",
      "tsconfig*.json",
      "vite.config.*",
      "*.config.*",
      "ProjectSettings/**/*",
      "wp-config.php",
      ".github/**/*"
    ], ["config", "settings", "manifest", "build", "package"], 40),
    feature("docs", "Documentation", "Project notes, plans, readmes, and handoff documents.", [
      "README*",
      "Docs/**/*",
      "docs/**/*",
      "*.md"
    ], ["readme", "docs", "plan", "handoff", "overview"], 40),
    feature("tests", "Tests", "Automated test files and validation support.", [
      "tests/**/*",
      "test/**/*",
      "**/*.test.*",
      "**/*.spec.*"
    ], ["test", "spec", "vitest", "jest", "playwright"], 40)
  ];

  if (capabilities.includes("node")) {
    areas.push(
      feature("node-app", "Node App", "Node package scripts, runtime code, and dependency surface.", [
        "package.json",
        "src/**/*",
        "app/**/*",
        "server/**/*",
        "api/**/*",
        "components/**/*",
        "pages/**/*"
      ], ["node", "server", "api", "route", "component", "script"], 50)
    );
  }

  if (capabilities.includes("unity")) {
    areas.push(
      feature("unity-content", "Unity Content", "Unity scenes, prefabs, scripts, resources, and project settings.", [
        "Assets/**/*",
        "ProjectSettings/**/*"
      ], ["unity", "scene", "prefab", "asset", "mono", "controller"], 60)
    );
  }

  if (capabilities.includes("supabase")) {
    areas.push(
      feature("supabase-backend", "Supabase Backend", "Supabase migrations, SQL functions, and backend documentation.", [
        "supabase/**/*",
        "Docs/Supabase/**/*",
        "docs/supabase/**/*"
      ], ["supabase", "migration", "function", "rpc", "policy", "seed"], 50)
    );
  }

  if (capabilities.includes("wordpress")) {
    areas.push(
      feature("wordpress-content", "WordPress Content", "WordPress themes, plugins, and site configuration.", [
        "wp-content/**/*",
        "wp-config.php",
        "themes/**/*",
        "plugins/**/*"
      ], ["wordpress", "theme", "plugin", "template", "block"], 50)
    );
  }

  return Object.fromEntries(areas.map((area) => [area.id, area]));
}

function defaultValidationCommands(repoRoot: string, capabilities: string[]): string[] {
  const commands = [`git -C ${repoRoot} status --short`];
  if (capabilities.includes("node")) {
    commands.unshift(`npm --prefix ${repoRoot} test`, `npm --prefix ${repoRoot} run build`);
  }

  return commands;
}

function defaultProtectedPaths(capabilities: string[]): string[] {
  const paths = [".git/", ".env", ".env.*", "**/*secret*", "**/*token*", "node_modules/"];
  if (capabilities.includes("unity")) {
    paths.push("Library/", "Temp/", "Builds/", "Logs/", "UserSettings/");
  }
  if (capabilities.includes("wordpress")) {
    paths.push("wp-config.php", "wp-content/uploads/");
  }

  return paths;
}

function feature(
  id: string,
  title: string,
  description: string,
  globs: string[],
  keywords: string[],
  maxFiles: number
): FeatureArea {
  return { id, title, description, globs, keywords, maxFiles };
}

function toYamlShape(profile: ProjectProfile): Record<string, unknown> {
  return {
    name: profile.name,
    projectType: profile.projectType,
    repoRoot: profile.repoRoot,
    ...(profile.unityProjectRoot ? { unityProjectRoot: profile.unityProjectRoot } : {}),
    featureAreas: Object.fromEntries(
      Object.entries(profile.featureAreas).map(([id, area]) => [
        id,
        {
          title: area.title,
          description: area.description,
          globs: area.globs,
          keywords: area.keywords,
          maxFiles: area.maxFiles
        }
      ])
    ),
    validationCommands: profile.validationCommands,
    protectedPaths: profile.protectedPaths
  };
}

export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "project";
}
