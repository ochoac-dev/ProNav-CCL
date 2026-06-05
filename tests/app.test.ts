import { describe, expect, it } from "vitest";
import { buildAppData } from "../src/app/appData.js";
import { renderAppHtml, renderAppScript, renderAppStyles } from "../src/app/staticApp.js";
import type { ScanResult } from "../src/types.js";

const scan: ScanResult = {
  profile: {
    name: "runners",
    projectType: "auto",
    repoRoot: "/tmp/Runners",
    unityProjectRoot: "/tmp/Runners/Runners",
    validationCommands: ["npm test", "npm run build"],
    protectedPaths: ["Runners/data/tokens.json"],
    featureAreas: {
      "field-bag": {
        id: "field-bag",
        title: "Field Bag",
        description: "Active carry and field loot routing.",
        globs: ["Assets/**/*.cs"],
        keywords: ["field bag"],
        maxFiles: 30
      },
      "map-relay": {
        id: "map-relay",
        title: "Map Relay",
        description: "Map and relay routing.",
        globs: ["Assets/**/*.cs"],
        keywords: ["relay"],
        maxFiles: 30
      }
    }
  },
  detection: {
    type: "unity",
    detectedCapabilities: ["git", "generic", "unity", "supabase"],
    roots: {
      repoRoot: "/tmp/Runners",
      unityProjectRoot: "/tmp/Runners/Runners",
      supabaseRoot: "/tmp/Runners/Runners"
    }
  },
  git: {
    branch: "dev",
    status: ["?? capture.png"],
    recentCommits: ["abc123 scan data"],
    remotes: ["origin https://github.com/ochoac-dev/ProNav-CCL.git (fetch)"]
  },
  generic: {
    totalFiles: 18,
    languageCounts: { "C#": 3, SQL: 1, Markdown: 2 },
    topDirectories: [{ path: "Assets", count: 12 }],
    manifests: ["ProjectSettings/ProjectVersion.txt"],
    sampleFiles: ["Assets/Runners_Main.unity"]
  },
  unity: {
    counts: { scenes: 1, prefabs: 2, scripts: 3, resources: 4, projectSettings: 5 },
    scenes: ["Assets/Runners_Main.unity"],
    prefabs: ["Assets/SEL/Prefabs/sel_fieldbag_gps.prefab"],
    scripts: ["Assets/SEL/Scripts/UI/FieldBagInteractionUI.cs"],
    resources: ["Assets/Resources/SEL/DefaultLoadout.asset"],
    projectSettings: ["ProjectSettings/ProjectVersion.txt"],
    selDirectories: ["Assets/SEL/Scripts", "Assets/SEL/Prefabs"]
  },
  supabase: {
    migrationCount: 1,
    migrations: ["supabase/migrations/20260501000000_example.sql"],
    functionNames: ["public.claim_system_field_bag"],
    docs: ["Docs/Supabase/seed_sel_map_nodes.sql"]
  },
  node: {
    packageJsonPath: null,
    packageManager: null,
    scripts: [],
    dependencies: [],
    devDependencies: [],
    frameworks: []
  },
  wordpress: {
    hasWpConfig: false,
    contentRoots: [],
    themes: [],
    plugins: []
  },
  documents: {
    totalDocuments: 2,
    previewableDocuments: 2,
    files: [
      { path: "README.md", title: "README", extension: ".md", sizeBytes: 12, previewable: true },
      { path: "Docs/Supabase/seed_sel_map_nodes.sql", title: "seed_sel_map_nodes", extension: ".sql", sizeBytes: 22, previewable: true }
    ]
  },
  features: {
    "field-bag": {
      id: "field-bag",
      title: "Field Bag",
      description: "Active carry and field loot routing.",
      totalCandidates: 2,
      files: [
        {
          path: "Assets/SEL/Scripts/UI/FieldBagInteractionUI.cs",
          score: 8,
          matchedKeywords: ["field bag"]
        }
      ]
    },
    "map-relay": {
      id: "map-relay",
      title: "Map Relay",
      description: "Map and relay routing.",
      totalCandidates: 2,
      files: [
        {
          path: "Assets/SEL/Scripts/Map/PreSessionMap.cs",
          score: 6,
          matchedKeywords: ["relay"]
        }
      ]
    }
  }
};

describe("contained app generator", () => {
  it("builds app data with summary metrics, feature cards, and report links", () => {
    const app = buildAppData(scan);

    expect(app.project.name).toBe("runners");
    expect(app.friendly.headline).toContain("Unity");
    expect(app.folders.map((folder) => folder.path)).toContain("Assets");
    expect(app.metrics).toMatchObject({
      scripts: 4,
      scriptTypes: 2,
      prefabs: 2,
      migrations: 1,
      rpcFunctions: 1
    });
    expect(app.features.map((feature) => feature.id)).toEqual(["field-bag", "map-relay"]);
    expect(app.documents.files.map((file) => file.path)).toContain("README.md");
    expect(app.reports).toContainEqual({
      label: "Plain Overview",
      path: "../../reports/runners/plain-overview.md"
    });
    expect(app.learning.depths.map((depth) => depth.id)).toEqual(["builder", "developer", "senior"]);
    expect(app.learning.guide.headline).toBe("Start here");
    expect(app.learning.guide.steps.map((step) => step.targetSection)).toEqual(["overview", "features", "validation"]);
    expect(app.learning.guide.nextAction.label).toContain("Explore");
    expect(app.learning.projectExplanation.builder).toContain("plain-language");
    expect(app.learning.folderExplanations.Assets.builder).toContain("folder");
    expect(app.learning.fileExplanations["Assets/SEL/Scripts/UI/FieldBagInteractionUI.cs"].senior).toContain("blast radius");
    expect(app.learning.validationExplanations[0]).toMatchObject({
      command: "npm test"
    });
  });

  it("uses multi-language script scan data instead of assuming scripts are only C#", () => {
    const mixedScriptScan: ScanResult = {
      ...scan,
      generic: {
        ...scan.generic,
        languageCounts: { TypeScript: 2, Python: 1, SQL: 1, "C#": 3 },
        scripts: {
          total: 7,
          typeCounts: { "C#": 3, TypeScript: 2, Python: 1, SQL: 1 },
          samples: [
            "Assets/SEL/Scripts/UI/FieldBagInteractionUI.cs",
            "src/app.ts",
            "tools/seed.py",
            "supabase/migrations/20260501000000_example.sql"
          ]
        }
      } as any
    };

    const app = buildAppData(mixedScriptScan);

    expect(app.metrics.scripts).toBe(7);
    expect((app.generic as any).scripts.typeCounts).toMatchObject({
      "C#": 3,
      Python: 1,
      SQL: 1,
      TypeScript: 2
    });
    expect(app.vibe.projectStory).toContain("7 script files");
  });

  it("builds a vibe summary for Unity projects with edit areas, AI tasks, and risk notes", () => {
    const app = buildAppData(scan);

    expect(app.vibe.projectStory).toContain("Unity");
    expect(app.vibe.whereToChange.map((area) => area.label)).toContain("Screens and app behavior");
    expect(app.vibe.whereToChange.map((area) => area.label)).toContain("Database and backend");
    expect(app.vibe.whereToChange.map((area) => area.label)).toContain("Project docs and notes");
    expect(app.vibe.whereToChange.find((area) => area.label === "Screens and app behavior")).toMatchObject({
      safety: "good-start"
    });
    expect(app.vibe.askAiNext[0]).toMatchObject({
      title: "Explain this project in plain English",
      taskType: "explain-code"
    });
    expect(app.vibe.askAiNext.some((task) => task.scope.includes("Assets"))).toBe(true);
    expect(app.vibe.riskNotes.map((note) => note.label)).toContain("Working tree has changes");
    expect(app.vibe.riskNotes.map((note) => note.label)).toContain("Protected paths configured");
  });

  it("builds a vibe summary for Node projects without Unity-specific assumptions", () => {
    const nodeScan: ScanResult = {
      ...scan,
      profile: {
        ...scan.profile,
        name: "node-app",
        repoRoot: "/tmp/node-app",
        unityProjectRoot: undefined,
        validationCommands: ["npm test"]
      },
      detection: {
        type: "node",
        detectedCapabilities: ["git", "generic", "node"],
        roots: { repoRoot: "/tmp/node-app" }
      },
      generic: {
        totalFiles: 12,
        languageCounts: { TypeScript: 6, Markdown: 2, JSON: 1 },
        topDirectories: [
          { path: "src", count: 6 },
          { path: "docs", count: 2 },
          { path: "tests", count: 1 }
        ],
        manifests: ["package.json"],
        sampleFiles: ["src/index.ts", "docs/plan.md"]
      },
      unity: {
        counts: { scenes: 0, prefabs: 0, scripts: 0, resources: 0, projectSettings: 0 },
        scenes: [],
        prefabs: [],
        scripts: [],
        resources: [],
        projectSettings: [],
        selDirectories: []
      },
      supabase: { migrationCount: 0, migrations: [], functionNames: [], docs: [] },
      node: {
        packageJsonPath: "package.json",
        packageManager: "npm",
        scripts: ["test: vitest"],
        dependencies: ["commander"],
        devDependencies: ["vitest"],
        frameworks: ["Vitest"]
      },
      features: {}
    };

    const app = buildAppData(nodeScan);

    expect(app.vibe.projectStory).toContain("Node");
    expect(app.vibe.projectStory).not.toContain("Unity scenes");
    expect(app.vibe.whereToChange.map((area) => area.label)).toContain("Screens and app behavior");
    expect(app.vibe.whereToChange.map((area) => area.label)).toContain("Tests and validation");
    expect(app.vibe.askAiNext.some((task) => task.scope === "src")).toBe(true);
  });

  it("renders a self-contained HTML shell wired to local data, styles, and script files", () => {
    const html = renderAppHtml("runners");

    expect(html).toContain("<title>ProNav - runners</title>");
    expect(html).toContain('href="styles.css"');
    expect(html).toContain('src="app.js"');
    expect(html).toContain("data.json");
    expect(html).not.toContain("https://");
  });

  it("renders CSS and browser script for searchable feature exploration", () => {
    expect(renderAppStyles()).toContain(".feature-card");
    expect(renderAppStyles()).toContain("@media");
    expect(renderAppScript()).toContain("renderDocuments");
    expect(renderAppScript()).toContain("submitHandoff");
    expect(renderAppHtml("runners")).toContain("data-section=\"documents\"");
    expect(renderAppHtml("runners")).toContain("data-section=\"delegate\"");
    expect(renderAppHtml("runners")).toContain('id="open-folder-button"');
    expect(renderAppScript()).toContain("feature-search");
    expect(renderAppScript()).toContain("renderFeatureCards");
    expect(renderAppScript()).toContain("pickLocalFolder");
    expect(renderAppHtml("runners")).toContain('id="validation-output"');
    expect(renderAppHtml("runners")).toContain('id="validation-output-panel"');
    expect(renderAppHtml("runners")).toContain("<summary>Validation Output");
    expect(renderAppHtml("runners")).not.toContain('id="validation-output-panel" open');
    expect(renderAppScript()).toContain("runValidationCommand");
    expect(renderAppScript()).toContain("data-validation-index");
    expect(renderAppScript()).toContain("/api/validate");
    expect(renderAppScript()).toContain("describeValidationCommand");
    expect(renderAppScript()).toContain("Runs the project's automated test suite");
    expect(renderAppScript()).toContain("Checks whether the project can build successfully");
    expect(renderAppScript()).toContain("Shows changed, staged, or untracked files");
    expect(renderAppScript()).toContain("Click Validation Output to inspect stdout and stderr.");
    expect(renderAppScript()).toContain('["scripts", "Scripts"]');
    expect(renderAppScript()).toContain("Script types");
    expect(renderAppScript()).not.toContain("C# scripts");
  });

  it("renders the vibe summary sections and delegate suggestion wiring", () => {
    const html = renderAppHtml("runners");
    const script = renderAppScript();

    expect(html).toContain("What this project is");
    expect(html).toContain("Where to make changes");
    expect(html).toContain("Good tasks to delegate");
    expect(html).toContain('id="vibe-project-story"');
    expect(html).toContain('id="vibe-change-areas"');
    expect(html).toContain('id="vibe-ai-tasks"');
    expect(script).toContain("prefillDelegateFromSuggestion");
    expect(script).toContain("data-vibe-task-index");
  });

  it("renders Browse Project and Memory wiring", () => {
    const html = renderAppHtml("runners");
    const script = renderAppScript();

    expect(html).toContain("Browse Project");
    expect(html).toContain('id="browse-folder-cards"');
    expect(html).toContain('id="feature-empty-state"');
    expect(html).toContain('id="memory-timeline"');
    expect(html).toContain('id="memory-note-form"');
    expect(html).toContain("Remember this about the project");
    expect(script).toContain("renderBrowseProject");
    expect(script).toContain("No high-signal feature matches yet");
    expect(script).toContain("loadProjectMemory");
    expect(script).toContain("submitMemoryNote");
    expect(script).toContain("renderMemorySummary");
    expect(script).toContain("formatScanChange");
    expect(script).toContain("Validation history");
    expect(html).toContain('id="memory-summary"');
    expect(script).toContain("prefillDelegateFromBrowse");
    expect(script).toContain("/api/memory");
    expect(script).toContain("/api/notes");
  });

  it("renders depth-aware learning controls and explanation panels across the workflow", () => {
    const html = renderAppHtml("runners");
    const script = renderAppScript();
    const styles = renderAppStyles();

    expect(html).toContain('id="learning-depth-select"');
    expect(html).toContain("Builder");
    expect(html).toContain("Developer");
    expect(html).toContain("Senior");
    expect(html).toContain("What am I seeing?");
    expect(html).toContain('id="learning-guide"');
    expect(html).toContain('id="learning-suggested-next"');
    expect(html).toContain('id="learning-mode-note"');
    expect(html).toContain('id="learning-project-explanation"');
    expect(html).toContain('id="learning-concepts"');
    expect(html).toContain('id="learning-concept-summary"');
    expect(html).toContain('id="learning-concept-details"');
    expect(html).toContain("Explore more when ready");
    expect(html).toContain('id="document-file-lens"');
    expect(html).toContain('id="delegate-learning-explainer"');
    expect(html).toContain('id="validation-learning-explainer"');
    expect(html).toContain('id="history-learning-explainer"');
    expect(script).toContain("pronav-learning-depth");
    expect(script).toContain("renderLearningExplanations");
    expect(script).toContain("learningDepth");
    expect(script).toContain("renderLearningGuide");
    expect(script).toContain("renderConceptSummary");
    expect(script).toContain("learningNextAction");
    expect(script).toContain('Builder-level view. Start with one guided next step; deeper details stay tucked away.');
    expect(script).toContain('const limit = learningDepth === "builder" ? 1 : 3;');
    expect(script).toContain("renderConceptCards");
    expect(script).toContain("renderFileLens");
    expect(script).toContain("validationExplanations");
    expect(styles).toContain(".learning-panel");
    expect(styles).toContain(".learning-guide");
    expect(styles).toContain(".learning-step");
    expect(styles).toContain(".learning-next");
    expect(styles).toContain(".concept-card");
  });

  it("keeps sidebar navigation icons and labels on a fixed alignment grid", () => {
    const styles = renderAppStyles();

    expect(styles).toMatch(/\.nav-button\s*{[^}]*display: grid;[^}]*grid-template-columns: 48px minmax\(0, 1fr\);/s);
    expect(styles).toMatch(/\.nav-icon\s*{[^}]*width: 40px;[^}]*height: 40px;/s);
    expect(styles).toMatch(/\.nav-button span\.label\s*{[^}]*min-width: 0;/s);
    expect(styles).toMatch(/@media \(max-width: 1000px\)[\s\S]*\.nav-button\s*{[^}]*grid-template-columns: 1fr;[^}]*justify-items: center;/);
  });

  it("uses the packaged app icon in the sidebar brand mark", () => {
    const html = renderAppHtml("runners");
    const styles = renderAppStyles();

    expect(html).toContain('<img src="/build/icon.png" alt="ProNav app icon"');
    expect(html).not.toContain('<div class="brand-mark">P</div>');
    expect(styles).toMatch(/\.brand-mark img\s*{[^}]*width: 100%;[^}]*height: 100%;[^}]*object-fit: cover;/s);
  });

  it("renders Project Brain navigation, review surfaces, and handoff preview hooks", () => {
    const html = renderAppHtml("runners");
    const script = renderAppScript();

    expect(html).toContain('data-section="brain"');
    expect(html).toContain("Project Brain");
    expect(html).toContain('id="project-brain-list"');
    expect(html).toContain('id="project-brain-form"');
    expect(html).toContain('id="handoff-brain-preview"');
    expect(html).toContain("Draft Project Brain entry");
    expect(script).toContain("renderProjectBrain");
    expect(script).toContain("submitBrainDraft");
    expect(script).toContain("Senior mode unlocks");
    expect(script).toContain("excludedBrainEntryIds");
  });

  it("renders a streamlined Codex handoff action for vibe coders", () => {
    const html = renderAppHtml("runners");
    const script = renderAppScript();

    expect(html).toContain('id="run-codex-button"');
    expect(html).toContain('id="codex-confirmation"');
    expect(html).toContain('id="start-codex-button"');
    expect(html).toContain('id="cancel-codex-button"');
    expect(html).toContain('id="codex-review-panel"');
    expect(html).toContain("Run in Codex");
    expect(html).toContain("Start Codex");
    expect(html).toContain("Review after Codex");
    expect(renderAppStyles()).toContain("[hidden] { display: none !important; }");
    expect(script).toContain("/api/codex-run");
    expect(script).toContain("showCodexConfirmation");
    expect(script).toContain("runCodexFromHandoff");
    expect(script).toContain("renderCodexReview");
    expect(script).toContain("changedFiles");
    expect(script).toContain('getElementById("run-codex-button").addEventListener("click", showCodexConfirmation)');
    expect(script).toContain('getElementById("start-codex-button").addEventListener("click", runCodexFromHandoff)');
  });

  it("renders the prototype-style command center shell with light and dark mode", () => {
    const html = renderAppHtml("runners");
    const styles = renderAppStyles();
    const script = renderAppScript();

    expect(html).toContain("Local AI project command center");
    expect(html).toContain("Connect Repo");
    expect(html).toContain("Understand");
    expect(html).toContain("Explore");
    expect(html).toContain("Delegate");
    expect(html).toContain("Validate");
    expect(html).toContain('id="theme-toggle"');
    expect(styles).toContain('[data-theme="dark"]');
    expect(styles).toContain(".big-explain");
    expect(script).toContain("applyTheme");
    expect(script).toContain("pronav-theme");
    expect(script).toMatch(/function readStoredTheme\(\)[\s\S]*return "dark";/);
  });
});
