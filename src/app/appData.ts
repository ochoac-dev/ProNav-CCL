import type { FeatureFile, ScanResult } from "../types.js";

export interface AppReportLink {
  label: string;
  path: string;
}

export interface AppFeature {
  id: string;
  title: string;
  description: string;
  totalCandidates: number;
  highSignalFiles: number;
  files: FeatureFile[];
}

export interface AppFolderSummary {
  path: string;
  label: string;
  description: string;
  fileCount: number;
}

export interface AppFriendlySummary {
  headline: string;
  plainSummary: string;
  keyAreas: Array<{
    label: string;
    description: string;
    paths: string[];
  }>;
  nextSteps: string[];
}

export type AppVibeSafety = "good-start" | "use-care" | "avoid";
export type AppVibeTaskType = "build-feature" | "fix-bug" | "explain-code" | "refactor" | "write-tests" | "review";
export type AppVibeRiskSeverity = "info" | "warning" | "danger";

export interface AppVibeChangeArea {
  label: string;
  description: string;
  paths: string[];
  safety: AppVibeSafety;
  reason: string;
}

export interface AppVibeTask {
  title: string;
  taskType: AppVibeTaskType;
  scope: string;
  goal: string;
}

export interface AppVibeRiskNote {
  label: string;
  description: string;
  severity: AppVibeRiskSeverity;
  paths: string[];
}

export interface AppVibeSummary {
  projectStory: string;
  whereToChange: AppVibeChangeArea[];
  askAiNext: AppVibeTask[];
  riskNotes: AppVibeRiskNote[];
}

export interface ProNavAppData {
  project: {
    name: string;
    slug: string;
    type: string;
    repoRoot: string;
    unityProjectRoot: string | null;
    detectedCapabilities: string[];
    generatedAt: string;
  };
  friendly: AppFriendlySummary;
  vibe: AppVibeSummary;
  folders: AppFolderSummary[];
  metrics: {
    scripts: number;
    scriptTypes: number;
    prefabs: number;
    scenes: number;
    resources: number;
    migrations: number;
    rpcFunctions: number;
    features: number;
    dirtyEntries: number;
    files: number;
    documents: number;
  };
  git: ScanResult["git"];
  generic: ScanResult["generic"];
  unity: ScanResult["unity"];
  supabase: ScanResult["supabase"];
  node: ScanResult["node"];
  wordpress: ScanResult["wordpress"];
  documents: ScanResult["documents"];
  features: AppFeature[];
  validationCommands: string[];
  protectedPaths: string[];
  reports: AppReportLink[];
}

export function buildAppData(
  scan: ScanResult,
  generatedAt = new Date().toISOString(),
  reportPathPrefix = "../../reports"
): ProNavAppData {
  const reportSlug = slugify(scan.profile.name);

  return {
    project: {
      name: scan.profile.name,
      slug: reportSlug,
      type: scan.detection.type,
      repoRoot: scan.profile.repoRoot,
      unityProjectRoot: scan.detection.roots.unityProjectRoot ?? scan.profile.unityProjectRoot ?? null,
      detectedCapabilities: scan.detection.detectedCapabilities,
      generatedAt
    },
    friendly: buildFriendlySummary(scan),
    vibe: buildVibeSummary(scan),
    folders: buildFolderSummaries(scan),
    metrics: {
      scripts: scriptSummaryFor(scan).total,
      scriptTypes: Object.keys(scriptSummaryFor(scan).typeCounts).length,
      prefabs: scan.unity.counts.prefabs,
      scenes: scan.unity.counts.scenes,
      resources: scan.unity.counts.resources,
      migrations: scan.supabase.migrationCount,
      rpcFunctions: scan.supabase.functionNames.length,
      features: Object.keys(scan.features).length,
      dirtyEntries: scan.git.status.length,
      files: scan.generic.totalFiles,
      documents: scan.documents.totalDocuments
    },
    git: scan.git,
    generic: scan.generic,
    unity: scan.unity,
    supabase: scan.supabase,
    node: scan.node,
    wordpress: scan.wordpress,
    documents: scan.documents,
    features: Object.values(scan.features).map((feature) => ({
      id: feature.id,
      title: feature.title,
      description: feature.description,
      totalCandidates: feature.totalCandidates,
      highSignalFiles: feature.files.length,
      files: feature.files
    })),
    validationCommands: scan.profile.validationCommands,
    protectedPaths: scan.profile.protectedPaths,
    reports: reportLinks(reportSlug, Object.keys(scan.features), reportPathPrefix)
  };
}

function buildVibeSummary(scan: ScanResult): AppVibeSummary {
  const whereToChange = buildVibeChangeAreas(scan);

  return {
    projectStory: buildProjectStory(scan),
    whereToChange,
    askAiNext: buildVibeTasks(scan, whereToChange),
    riskNotes: buildRiskNotes(scan)
  };
}

function buildProjectStory(scan: ScanResult): string {
  const typeLabel = displayProjectType(scan.detection.type);
  const scriptSummary = scriptSummaryFor(scan);
  const scriptTypeText = formatScriptTypeText(scriptSummary.typeCounts);
  const featureNames = Object.values(scan.features)
    .slice(0, 4)
    .map((feature) => feature.title);
  const featureText = featureNames.length > 0 ? ` ProNav can already identify work areas like ${featureNames.join(", ")}.` : "";
  const docText =
    scan.documents.totalDocuments > 0
      ? ` It also found ${scan.documents.totalDocuments} docs or notes that can help explain decisions.`
      : " It did not find much project documentation yet.";

  if (scan.detection.type === "unity") {
    return [
      `This appears to be a Unity project named ${scan.profile.name}.`,
      `It has ${scriptSummary.total} script files${scriptTypeText}, ${scan.unity.counts.prefabs} prefabs, ${scan.unity.counts.scenes} scenes, and ${scan.unity.counts.resources} resource files.`,
      "The main experience is likely shaped by Assets, scene files, prefabs, and gameplay/UI scripts.",
      scan.supabase.migrationCount > 0
        ? `A Supabase backend is present too, with ${scan.supabase.migrationCount} migration file(s) and ${scan.supabase.functionNames.length} likely SQL/RPC function(s).`
        : "No Supabase backend files were detected in this scan.",
      featureText,
      docText
    ].join(" ");
  }

  if (scan.detection.type === "node") {
    const frameworkText = scan.node.frameworks.length > 0 ? ` Framework signals include ${scan.node.frameworks.slice(0, 4).join(", ")}.` : "";
    return [
      `This appears to be a Node project named ${scan.profile.name}.`,
      `ProNav found ${scan.generic.totalFiles} scanned files, ${scriptSummary.total} script files${scriptTypeText}, ${scan.node.scripts.length} package script(s), and ${Object.keys(scan.generic.languageCounts).length} language group(s).`,
      "The app behavior is likely in source folders such as src, app, pages, or components, with package.json explaining how it runs.",
      frameworkText,
      featureText,
      docText
    ].join(" ");
  }

  if (scan.detection.type === "supabase") {
    return [
      `This appears to be a Supabase-focused project named ${scan.profile.name}.`,
      `ProNav found ${scan.supabase.migrationCount} migration file(s) and ${scan.supabase.functionNames.length} likely SQL/RPC function(s), scanned only as text.`,
      "Database and backend changes should be handled carefully because they can affect stored data and app behavior.",
      featureText,
      docText
    ].join(" ");
  }

  if (scan.detection.type === "wordpress") {
    return [
      `This appears to be a WordPress project named ${scan.profile.name}.`,
      `ProNav found ${scan.wordpress.themes.length} theme folder(s), ${scan.wordpress.plugins.length} plugin folder(s), and ${scan.generic.totalFiles} scanned files.`,
      "Most visible changes are likely in wp-content, themes, plugins, templates, and supporting assets.",
      featureText,
      docText
    ].join(" ");
  }

  return [
    `This appears to be a general code project named ${scan.profile.name}.`,
    `ProNav found ${scan.generic.totalFiles} scanned files, including ${scriptSummary.total} script files${scriptTypeText}.`,
    "The safest first step is to inspect the top source folders and docs before asking an AI coding tool to change behavior.",
    featureText,
    docText
  ].join(" ");
}

function buildVibeChangeAreas(scan: ScanResult): AppVibeChangeArea[] {
  const areas: AppVibeChangeArea[] = [];
  const screenPaths = userFacingPaths(scan);
  if (screenPaths.length > 0) {
    areas.push({
      label: "Screens and app behavior",
      description: userFacingDescription(scan),
      paths: screenPaths,
      safety: "good-start",
      reason: "These paths are where visible behavior usually lives, so they are useful first context for a coding agent."
    });
  }

  const backendPaths = backendPathsFor(scan);
  if (backendPaths.length > 0) {
    areas.push({
      label: "Database and backend",
      description: backendDescription(scan),
      paths: backendPaths,
      safety: "use-care",
      reason: "Backend changes can affect saved data, auth, API behavior, or app-wide runtime behavior."
    });
  }

  const docsPaths = docsPathsFor(scan);
  if (docsPaths.length > 0) {
    areas.push({
      label: "Project docs and notes",
      description: "Use these when you want an AI assistant to understand the project before editing code.",
      paths: docsPaths,
      safety: "good-start",
      reason: "Docs are usually safe to read and make prompts much more grounded."
    });
  }

  const testPaths = testPathsFor(scan);
  if (testPaths.length > 0) {
    areas.push({
      label: "Tests and validation",
      description: "Use these to prove an AI-made change still works.",
      paths: testPaths,
      safety: "good-start",
      reason: "Validation context helps keep delegated tasks small and checkable."
    });
  }

  if (areas.length === 0) {
    areas.push({
      label: "Top project files",
      description: "Start with the first scanned files and top folders until ProNav has more project signals.",
      paths: scan.generic.sampleFiles.slice(0, 6),
      safety: "use-care",
      reason: "The scan did not detect a clear app structure yet."
    });
  }

  return areas;
}

function userFacingPaths(scan: ScanResult): string[] {
  const directoryCandidates = firstExistingPaths(scan, ["src", "app", "pages", "components", "Assets", "wp-content"]);
  const unityCandidates = [
    ...scan.unity.scenes.slice(0, 2),
    ...scan.unity.scripts.filter((path) => /ui|screen|view|menu|hud/i.test(path)).slice(0, 3),
    ...scan.unity.prefabs.slice(0, 2)
  ];
  const wordpressCandidates = [...scan.wordpress.themes.slice(0, 3), ...scan.wordpress.plugins.slice(0, 2)];
  return unique([...directoryCandidates, ...unityCandidates, ...wordpressCandidates, ...scan.generic.sampleFiles.slice(0, 2)]).slice(0, 6);
}

function userFacingDescription(scan: ScanResult): string {
  if (scan.detection.type === "unity") {
    return "Unity screens, gameplay behavior, prefabs, and assets that shape what players see and do.";
  }
  if (scan.detection.type === "wordpress") {
    return "Theme, plugin, and wp-content files that shape what visitors see.";
  }
  if (scan.detection.type === "node") {
    return "Source folders that likely hold screens, routes, commands, or server behavior.";
  }

  return "Source folders and files that likely hold the user-facing behavior.";
}

function backendPathsFor(scan: ScanResult): string[] {
  const paths = [
    ...firstExistingPaths(scan, ["supabase", "server", "api", "backend", "functions"]),
    ...scan.supabase.migrations.slice(0, 3),
    ...scan.supabase.docs.slice(0, 2),
    ...(scan.node.packageJsonPath ? [scan.node.packageJsonPath] : []),
    ...scan.generic.manifests.filter((manifest) => /package\.json|supabase|server|api|wrangler|vercel/i.test(manifest)).slice(0, 4)
  ];
  return unique(paths).slice(0, 7);
}

function backendDescription(scan: ScanResult): string {
  if (scan.supabase.migrationCount > 0) {
    return "Database migrations, SQL/RPC functions, and backend docs that can affect stored data or server behavior.";
  }
  if (scan.node.packageJsonPath) {
    return "Node package and server-related files that explain scripts, dependencies, and backend behavior.";
  }

  return "Server, API, database, or function files detected by the project scan.";
}

function docsPathsFor(scan: ScanResult): string[] {
  const docDirectories = firstExistingPaths(scan, ["docs", "Docs", "documentation"]);
  const documentFiles = scan.documents.files.slice(0, 5).map((file) => file.path);
  return unique([...docDirectories, ...documentFiles]).slice(0, 6);
}

function testPathsFor(scan: ScanResult): string[] {
  const testDirectories = firstExistingPaths(scan, ["tests", "test", "__tests__", "spec"]);
  const testScripts = scan.node.scripts.filter((script) => /test|vitest|jest|playwright|cypress/i.test(script)).slice(0, 4);
  return unique([...testDirectories, ...scan.profile.validationCommands, ...testScripts]).slice(0, 6);
}

function buildVibeTasks(scan: ScanResult, changeAreas: AppVibeChangeArea[]): AppVibeTask[] {
  const screenArea = changeAreas.find((area) => area.label === "Screens and app behavior");
  const backendArea = changeAreas.find((area) => area.label === "Database and backend");
  const testsArea = changeAreas.find((area) => area.label === "Tests and validation");
  const explanationScope = scan.documents.files[0]?.path ?? screenArea?.paths[0] ?? scan.generic.sampleFiles[0] ?? scan.profile.repoRoot;
  const screenScope = preferredScope(screenArea?.paths ?? []);

  const tasks: AppVibeTask[] = [
    {
      title: "Explain this project in plain English",
      taskType: "explain-code",
      scope: explanationScope,
      goal: `Read the ProNav scan for ${scan.profile.name} and explain what the project does, what the main folders mean, and where a non-coder should look before asking for changes.`
    }
  ];

  if (screenArea && screenScope) {
    tasks.push({
      title: "Plan a small visible change",
      taskType: "build-feature",
      scope: screenScope,
      goal: `Use the ${screenScope} area to propose one small, safe user-facing change. Explain which files you would inspect first and what validation should be run before any edit is trusted.`
    });
  }

  if (backendArea) {
    tasks.push({
      title: "Review backend risk before editing",
      taskType: "review",
      scope: preferredScope(backendArea.paths),
      goal: "Review the backend or database-related files and explain what should not be changed casually, what depends on them, and what validation would be required before shipping a change."
    });
  }

  if (testsArea) {
    tasks.push({
      title: "Turn validation into a checklist",
      taskType: "write-tests",
      scope: preferredScope(testsArea.paths),
      goal: "Create a beginner-friendly validation checklist for this project using the detected tests, scripts, and validation commands."
    });
  }

  return tasks.slice(0, 4);
}

function preferredScope(paths: string[]): string {
  const directSourcePath = paths.find((path) => ["src", "app", "Assets", "wp-content", "tests", "test", "supabase"].includes(path));
  return directSourcePath ?? paths[0] ?? "";
}

function buildRiskNotes(scan: ScanResult): AppVibeRiskNote[] {
  const notes: AppVibeRiskNote[] = [];

  if (scan.git.status.length > 0) {
    notes.push({
      label: "Working tree has changes",
      description: "There are existing git status entries. A coding assistant should avoid mixing unrelated work into a new change.",
      severity: "warning",
      paths: scan.git.status.slice(0, 8)
    });
  }

  if (scan.profile.protectedPaths.length > 0) {
    notes.push({
      label: "Protected paths configured",
      description: "These paths should be treated as sensitive and included in handoffs as areas to avoid or handle carefully.",
      severity: "danger",
      paths: scan.profile.protectedPaths.slice(0, 8)
    });
  }

  const generatedDirectories = scan.generic.topDirectories
    .map((directory) => directory.path)
    .filter((path) => /^(Library|Temp|Builds|Logs|node_modules|dist|build|coverage|\.utmp)$/i.test(path));
  if (generatedDirectories.length > 0) {
    notes.push({
      label: "Generated folders should be avoided",
      description: "These look like build, dependency, or generated folders. They are usually not the right place to ask an AI to edit.",
      severity: "info",
      paths: generatedDirectories.slice(0, 8)
    });
  }

  if (scan.profile.validationCommands.length === 0) {
    notes.push({
      label: "No validation commands configured",
      description: "ProNav did not find project-level checks to run after changes, so delegated tasks should ask the coding tool to identify validation first.",
      severity: "warning",
      paths: []
    });
  }

  if (notes.length === 0) {
    notes.push({
      label: "No major scan risks detected",
      description: "ProNav did not see dirty git state, protected paths, generated edit targets, or missing validation commands in this scan.",
      severity: "info",
      paths: []
    });
  }

  return notes;
}

function buildFriendlySummary(scan: ScanResult): AppFriendlySummary {
  const typeLabel = displayProjectType(scan.detection.type);
  const capabilities = scan.detection.detectedCapabilities.filter((capability) => capability !== "generic");
  const capabilityText = capabilities.length > 0 ? capabilities.join(", ") : "general code";
  const featureNames = Object.values(scan.features)
    .slice(0, 4)
    .map((feature) => feature.title);

  return {
    headline: `${typeLabel} project with ${scan.generic.totalFiles} scanned files`,
    plainSummary: [
      `This looks like a ${typeLabel.toLowerCase()} project.`,
      `ProNav found ${scan.generic.totalFiles} files, ${scan.documents.totalDocuments} project documents, and ${Object.keys(scan.features).length} work areas.`,
      `Detected signals: ${capabilityText}.`
    ].join(" "),
    keyAreas: [
      {
        label: "What people see",
        description: describeUserFacingLayer(scan),
        paths: firstExistingPaths(scan, ["app", "src", "Assets", "wp-content", "pages", "components"])
      },
      {
        label: "Project instructions",
        description: "Docs and README files explain what has already been built and how to work with it.",
        paths: scan.documents.files.slice(0, 4).map((file) => file.path)
      },
      {
        label: "Coding focus areas",
        description: featureNames.length > 0 ? `The main work areas are ${featureNames.join(", ")}.` : "No focused work areas have been configured yet.",
        paths: Object.values(scan.features)
          .flatMap((feature) => feature.files.map((file) => file.path))
          .slice(0, 6)
      }
    ],
    nextSteps: [
      "Pick a small goal in normal language.",
      "Use Delegate Task to create a focused packet for Codex or Claude Code.",
      "Run the validation checks after the coding agent makes changes."
    ]
  };
}

function buildFolderSummaries(scan: ScanResult): AppFolderSummary[] {
  return scan.generic.topDirectories.slice(0, 16).map((directory) => ({
    path: directory.path,
    label: labelForFolder(directory.path),
    description: descriptionForFolder(directory.path, scan.detection.type),
    fileCount: directory.count
  }));
}

function scriptSummaryFor(scan: ScanResult): NonNullable<ScanResult["generic"]["scripts"]> {
  if (scan.generic.scripts) {
    return scan.generic.scripts;
  }

  const scriptTypeNames = new Set([
    "C#",
    "Clojure",
    "ClojureScript",
    "Dart",
    "Elixir",
    "Erlang",
    "F#",
    "Go",
    "Java",
    "JavaScript",
    "JavaScript React",
    "Kotlin",
    "Lua",
    "PHP",
    "Perl",
    "PowerShell",
    "Python",
    "R",
    "Ruby",
    "Rust",
    "Scala",
    "Shell",
    "SQL",
    "Svelte",
    "Swift",
    "TypeScript",
    "TypeScript React",
    "Vue"
  ]);
  const typeCounts = Object.fromEntries(Object.entries(scan.generic.languageCounts).filter(([language]) => scriptTypeNames.has(language)));
  const total = Object.values(typeCounts).reduce((sum, count) => sum + count, 0) || scan.unity.counts.scripts;
  const samples = unique([...scan.unity.scripts, ...scan.generic.sampleFiles.filter((file) => /\.[a-z0-9]+$/i.test(file))]).slice(0, 80);
  return { total, typeCounts, samples };
}

function formatScriptTypeText(typeCounts: Record<string, number>): string {
  const typeNames = Object.keys(typeCounts);
  if (typeNames.length === 0) return "";
  return ` across ${typeNames.slice(0, 4).join(", ")}${typeNames.length > 4 ? ", and more" : ""}`;
}

function displayProjectType(type: string): string {
  switch (type) {
    case "unity":
      return "Unity";
    case "node":
      return "Node";
    case "supabase":
      return "Supabase";
    case "wordpress":
      return "WordPress";
    default:
      return "Generic";
  }
}

function describeUserFacingLayer(scan: ScanResult): string {
  if (scan.detection.type === "unity") {
    return "Unity scenes, prefabs, scripts, and assets are the main player-facing experience.";
  }
  if (scan.detection.type === "wordpress") {
    return "WordPress themes and plugins shape what visitors see on the site.";
  }
  if (scan.detection.type === "node") {
    return "Node app folders usually hold the screens, server routes, or command-line behavior users interact with.";
  }

  return "The top source folders hold the main app behavior.";
}

function firstExistingPaths(scan: ScanResult, names: string[]): string[] {
  const directoryPaths = new Set(scan.generic.topDirectories.map((directory) => directory.path));
  return names.filter((name) => directoryPaths.has(name)).slice(0, 6);
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function labelForFolder(path: string): string {
  if (path === "(root)") return "Root files";
  return path
    .split(/[-_\s/]+/)
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

function descriptionForFolder(path: string, projectType: string): string {
  const lower = path.toLowerCase();
  if (lower === "src") return "Main source code for app behavior and shared logic.";
  if (lower === "app") return "Application screens, routes, or contained app files.";
  if (lower === "assets") return projectType === "unity" ? "Unity gameplay assets, scenes, scripts, and prefabs." : "Static or visual assets.";
  if (lower === "docs") return "Documentation, notes, and project instructions.";
  if (lower === "reports") return "Generated ProNav reports and summaries.";
  if (lower === "tests") return "Automated checks that help confirm changes still work.";
  if (lower === "supabase") return "Database migrations, SQL functions, and backend setup.";
  if (lower === "wp-content") return "WordPress themes, plugins, and uploaded site content.";
  if (lower === "(root)") return "Important project files that live at the top level.";
  return "Project folder discovered during the read-only scan.";
}

function reportLinks(reportSlug: string, featureIds: string[], reportPathPrefix: string): AppReportLink[] {
  const links = [
    { label: "Plain Overview", path: `${reportPathPrefix}/${reportSlug}/plain-overview.md` },
    { label: "Technical Map", path: `${reportPathPrefix}/${reportSlug}/technical-map.md` }
  ];

  if (featureIds.includes("field-bag")) {
    links.push({ label: "Field Bag Packet", path: `${reportPathPrefix}/${reportSlug}/refactor-packet-field-bag.md` });
  }

  return links;
}

export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
