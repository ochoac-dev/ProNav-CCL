import type { ScanResult } from "../types.js";

export type AppBrowseCategory = "screens" | "backend" | "database" | "docs" | "tests" | "config" | "generated" | "assets" | "source" | "other";
export type AppBrowseSafety = "good-start" | "use-care" | "avoid";

export interface AppBrowseFolderCard {
  path: string;
  label: string;
  category: AppBrowseCategory;
  safety: AppBrowseSafety;
  description: string;
  reason: string;
  nextAction: string;
  fileCount: number;
}

export interface AppBrowseData {
  folders: AppBrowseFolderCard[];
}

type FolderClassification = Pick<AppBrowseFolderCard, "category" | "safety" | "description" | "reason" | "nextAction">;

const GENERATED_FOLDERS = new Set([
  ".next",
  ".nuxt",
  "build",
  "builds",
  "coverage",
  "dist",
  "handoffs",
  "library",
  "logs",
  "memory",
  "node_modules",
  "out",
  "release",
  "reports",
  "temp"
]);
const DOC_FOLDERS = new Set(["docs", "doc", "documentation", "guides", "notes"]);
const TEST_FOLDERS = new Set(["tests", "test", "__tests__", "spec", "specs", "e2e"]);
const CONFIG_FOLDERS = new Set(["config", "configs", ".config", ".github", ".vscode", "projectsettings", "packages"]);
const ASSET_FOLDERS = new Set(["assets", "asset", "public", "static", "images", "img", "uploads", "media"]);
const SCREEN_FOLDERS = new Set(["app", "pages", "screens", "views", "components", "ui", "wp-content", "themes"]);
const BACKEND_FOLDERS = new Set(["api", "server", "backend", "functions", "plugins", "middleware"]);
const SOURCE_FOLDERS = new Set(["src", "source", "scripts", "lib", "libs", "packages"]);

export function buildBrowseData(scan: ScanResult): AppBrowseData {
  return {
    folders: scan.generic.topDirectories.map((directory) => {
      const classification = classifyFolder(directory.path, scan);
      return {
        path: directory.path,
        label: labelForFolder(directory.path),
        ...classification,
        fileCount: directory.count
      };
    })
  };
}

function classifyFolder(path: string, scan: ScanResult): FolderClassification {
  const key = folderKey(path);
  const firstSegment = firstPathSegment(path);
  const capabilities = new Set(scan.detection.detectedCapabilities);

  if (GENERATED_FOLDERS.has(key) || GENERATED_FOLDERS.has(firstSegment)) {
    return {
      category: "generated",
      safety: "avoid",
      description: "Generated dependency, build, cache, or report output.",
      reason: "Generated dependency, build, cache, or report output should not be edited directly.",
      nextAction: "Do not ask an AI coding tool to edit this folder; change source files and regenerate it instead."
    };
  }

  if (key === "supabase" || hasManifestUnder(scan, path, /^supabase\//i) || hasSupabaseEvidence(path, scan)) {
    return {
      category: "database",
      safety: "use-care",
      description: "Supabase database migrations, SQL functions, or backend configuration.",
      reason: "Detected Supabase capability, migrations, or manifests point to database behavior.",
      nextAction: "Review migrations and validation commands before asking an AI coding tool to change database behavior."
    };
  }

  if (isDocsFolder(key)) {
    return {
      category: "docs",
      safety: "good-start",
      description: "Documentation, notes, and project instructions.",
      reason: "Documentation folders are useful context and are usually safe to inspect first.",
      nextAction: "Open this first when explaining the project or grounding a task for an AI coding tool."
    };
  }

  if (isTestsFolder(key)) {
    return {
      category: "tests",
      safety: "good-start",
      description: "Automated checks and test fixtures that prove behavior still works.",
      reason: "Test folders help turn delegated changes into verifiable work.",
      nextAction: "Use this to identify the focused test command that should run after a change."
    };
  }

  if (isConfigFolder(key) || hasConfigManifestUnder(scan, path)) {
    return {
      category: "config",
      safety: "use-care",
      description: "Project settings, package configuration, or tooling setup.",
      reason: "Configuration folders and manifests can affect builds, editor setup, or runtime behavior.",
      nextAction: "Inspect this when setup or build behavior matters, and make changes only with clear validation."
    };
  }

  if (isWordPressScreenFolder(key, scan) || isUnityScreenFolder(key, scan) || isNodeScreenFolder(key, scan)) {
    return {
      category: "screens",
      safety: "good-start",
      description: screenDescription(scan),
      reason: screenReason(scan),
      nextAction: "Open this when planning visible behavior changes, then pair it with tests or validation before editing."
    };
  }

  if (isBackendFolder(key) || isWordPressPluginFolder(key, scan)) {
    return {
      category: "backend",
      safety: "use-care",
      description: "Server, API, plugin, or function code that can affect app-wide behavior.",
      reason: "Backend-style folder names or detected platform signals point to runtime behavior beyond one screen.",
      nextAction: "Ask for a small, reviewed change here and include the relevant validation command in the handoff."
    };
  }

  if (isAssetsFolder(key, scan)) {
    return {
      category: "assets",
      safety: "good-start",
      description: scan.detection.type === "unity" ? "Unity assets, prefabs, scenes, and resources." : "Static media, uploads, or visual assets.",
      reason: "Asset folders usually hold visual or static files used by the app.",
      nextAction: "Use this for visual context or asset references before changing code that consumes those files."
    };
  }

  if (isSourceFolder(key, scan)) {
    return {
      category: "source",
      safety: "good-start",
      description: "Main source code for app behavior and shared logic.",
      reason: sourceReason(scan),
      nextAction: "Open this when planning source changes, then pair it with nearby tests before editing."
    };
  }

  if (path === "(root)") {
    return {
      category: "config",
      safety: "use-care",
      description: "Top-level files such as manifests, README files, and project metadata.",
      reason: "Root files often include package, tooling, documentation, or project configuration.",
      nextAction: "Inspect root manifests before changing project setup or task commands."
    };
  }

  if (capabilities.has("node") && hasNodeManifest(scan)) {
    return {
      category: "source",
      safety: "good-start",
      description: "Project code or support files discovered in a Node-capable repo.",
      reason: "Node project signals and package manifests point to this as a primary code area.",
      nextAction: "Open this when narrowing a Node task, then confirm whether tests cover it."
    };
  }

  return {
    category: "other",
    safety: "use-care",
    description: "Project folder discovered during the read-only scan.",
    reason: "The scan did not have enough specific signals to classify this folder more narrowly.",
    nextAction: "Inspect the folder name and nearby manifests before asking an AI coding tool to edit it."
  };
}

function isDocsFolder(key: string): boolean {
  return DOC_FOLDERS.has(key) || key.startsWith("docs-") || key.endsWith("-docs");
}

function isTestsFolder(key: string): boolean {
  return TEST_FOLDERS.has(key) || key.includes("test") || key.includes("spec");
}

function isConfigFolder(key: string): boolean {
  return CONFIG_FOLDERS.has(key) || key.includes("config") || key.includes("settings");
}

function isAssetsFolder(key: string, scan: ScanResult): boolean {
  if (ASSET_FOLDERS.has(key)) return true;
  if (scan.detection.type === "wordpress" && key === "uploads") return true;
  return false;
}

function isSourceFolder(key: string, scan: ScanResult): boolean {
  if (SOURCE_FOLDERS.has(key)) return true;
  if (scan.detection.type === "unity" && key === "assets") return true;
  return false;
}

function isBackendFolder(key: string): boolean {
  return BACKEND_FOLDERS.has(key);
}

function isNodeScreenFolder(key: string, scan: ScanResult): boolean {
  return scan.detection.detectedCapabilities.includes("node") && SCREEN_FOLDERS.has(key);
}

function isUnityScreenFolder(key: string, scan: ScanResult): boolean {
  return scan.detection.detectedCapabilities.includes("unity") && key === "assets" && scan.unity.counts.scenes + scan.unity.counts.prefabs + scan.unity.counts.scripts > 0;
}

function isWordPressScreenFolder(key: string, scan: ScanResult): boolean {
  if (!scan.detection.detectedCapabilities.includes("wordpress")) return false;
  return key === "wp-content" || key === "themes" || scan.wordpress.themes.some((themePath) => folderKey(themePath).includes(key));
}

function isWordPressPluginFolder(key: string, scan: ScanResult): boolean {
  if (!scan.detection.detectedCapabilities.includes("wordpress")) return false;
  return key === "plugins" || scan.wordpress.plugins.some((pluginPath) => folderKey(pluginPath).includes(key));
}

function hasSupabaseEvidence(path: string, scan: ScanResult): boolean {
  const prefix = pathPrefix(path);
  return (
    scan.detection.detectedCapabilities.includes("supabase") &&
    (scan.supabase.migrations.some((migration) => migration.startsWith(prefix)) ||
      scan.supabase.docs.some((docPath) => docPath.startsWith(prefix)) ||
      scan.generic.manifests.some((manifest) => manifest.startsWith(prefix) && /supabase/i.test(manifest)))
  );
}

function hasConfigManifestUnder(scan: ScanResult, path: string): boolean {
  const prefix = pathPrefix(path);
  return scan.generic.manifests.some((manifest) => manifest.startsWith(prefix) && isConfigManifest(manifest));
}

function hasManifestUnder(scan: ScanResult, path: string, pattern: RegExp): boolean {
  const prefix = pathPrefix(path);
  return scan.generic.manifests.some((manifest) => manifest.startsWith(prefix) && pattern.test(manifest));
}

function isConfigManifest(path: string): boolean {
  return /(^|\/)(package(-lock)?\.json|pnpm-lock\.yaml|yarn\.lock|tsconfig\.json|vite\.config\.[cm]?[jt]s|next\.config\.(mjs|js)|composer\.json|pyproject\.toml|requirements\.txt|cargo\.toml|go\.mod|wp-config\.php|projectversion\.txt|dockerfile|makefile|.*\.config\.[cm]?[jt]s)$/i.test(path);
}

function hasNodeManifest(scan: ScanResult): boolean {
  return Boolean(scan.node.packageJsonPath) || scan.generic.manifests.some((manifest) => /(^|\/)package\.json$/i.test(manifest));
}

function screenDescription(scan: ScanResult): string {
  if (scan.detection.type === "unity") {
    return "Unity screens, gameplay behavior, prefabs, and assets that shape what players see and do.";
  }
  if (scan.detection.type === "wordpress") {
    return "WordPress themes, templates, and content folders that shape what visitors see.";
  }
  return "Application screens, routes, components, or user-facing behavior.";
}

function screenReason(scan: ScanResult): string {
  if (scan.detection.type === "unity") {
    return "Unity scenes, prefabs, scripts, or asset signals point to visible app behavior.";
  }
  if (scan.detection.type === "wordpress") {
    return "WordPress content, theme, or template signals point to visitor-facing behavior.";
  }
  return "Node project structure and folder names point to user-facing app behavior.";
}

function sourceReason(scan: ScanResult): string {
  if (scan.detection.detectedCapabilities.includes("node") && hasNodeManifest(scan)) {
    return "Node project signals and package manifests point to this as a primary code area.";
  }
  if (scan.detection.detectedCapabilities.includes("unity")) {
    return "Unity scan results point to this as a primary source and asset area.";
  }
  return "Source-style folder names point to this as a primary code area.";
}

function labelForFolder(path: string): string {
  if (path === "(root)") return "Root Files";
  return path
    .split(/[-_\s/]+/)
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

function folderKey(path: string): string {
  return path.replace(/\\/g, "/").replace(/\/+$/g, "").toLowerCase();
}

function firstPathSegment(path: string): string {
  return folderKey(path).split("/")[0] ?? "";
}

function pathPrefix(path: string): string {
  return path === "(root)" ? "" : `${path.replace(/\\/g, "/").replace(/\/+$/g, "")}/`;
}
