import { describe, expect, it } from "vitest";
import { buildAppData } from "../src/app/appData.js";
import { buildBrowseData } from "../src/app/browseData.js";
import type { ScanResult } from "../src/types.js";

function scanWith(overrides: Partial<ScanResult> = {}): ScanResult {
  const base: ScanResult = {
    profile: {
      name: "ProNav",
      projectType: "auto",
      repoRoot: "/tmp/pronav",
      validationCommands: ["npm test"],
      protectedPaths: [],
      featureAreas: {}
    },
    detection: {
      type: "node",
      detectedCapabilities: ["git", "generic", "node"],
      roots: { repoRoot: "/tmp/pronav" }
    },
    git: {
      branch: "main",
      status: [],
      recentCommits: [],
      remotes: []
    },
    generic: {
      totalFiles: 0,
      languageCounts: {},
      scripts: { total: 0, typeCounts: {}, samples: [] },
      topDirectories: [],
      manifests: [],
      sampleFiles: []
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
    supabase: {
      migrationCount: 0,
      migrations: [],
      functionNames: [],
      docs: []
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
      totalDocuments: 0,
      previewableDocuments: 0,
      files: []
    },
    features: {}
  };

  return {
    ...base,
    ...overrides,
    profile: { ...base.profile, ...overrides.profile },
    detection: {
      ...base.detection,
      ...overrides.detection,
      roots: { ...base.detection.roots, ...overrides.detection?.roots }
    },
    generic: { ...base.generic, ...overrides.generic },
    unity: {
      ...base.unity,
      ...overrides.unity,
      counts: { ...base.unity.counts, ...overrides.unity?.counts }
    },
    supabase: { ...base.supabase, ...overrides.supabase },
    node: { ...base.node, ...overrides.node },
    wordpress: { ...base.wordpress, ...overrides.wordpress },
    documents: { ...base.documents, ...overrides.documents },
    git: { ...base.git, ...overrides.git }
  };
}

function cardsByPath(scan: ScanResult) {
  return Object.fromEntries(buildBrowseData(scan).folders.map((card) => [card.path, card]));
}

describe("browse data builder", () => {
  it("exposes deterministic browse folder cards from app data", () => {
    const scan = scanWith({
      generic: {
        totalFiles: 7,
        languageCounts: { TypeScript: 4, Markdown: 1, JSON: 1 },
        topDirectories: [
          { path: "src", count: 4 },
          { path: "docs", count: 1 },
          { path: "(root)", count: 2 }
        ],
        manifests: ["package.json", "tsconfig.json"],
        sampleFiles: ["src/app.ts", "docs/readme.md"]
      },
      node: {
        packageJsonPath: "package.json",
        packageManager: "npm",
        scripts: ["test: vitest"],
        dependencies: ["commander"],
        devDependencies: ["vitest"],
        frameworks: ["Vitest"]
      }
    });

    const app = buildAppData(scan, "2026-05-29T00:00:00.000Z");

    expect(app.browse.folders).toEqual(buildBrowseData(scan).folders);
    expect(app.browse.folders[0]).toEqual({
      path: "src",
      label: "Src",
      category: "source",
      safety: "good-start",
      description: "Main source code for app behavior and shared logic.",
      reason: "Node project signals and package manifests point to this as a primary code area.",
      nextAction: "Open this when planning source changes, then pair it with nearby tests before editing.",
      fileCount: 4
    });
  });

  it("classifies Node screens, backend, tests, docs, config, and assets folders", () => {
    const cards = cardsByPath(
      scanWith({
        generic: {
          totalFiles: 28,
          languageCounts: { TypeScript: 18, Markdown: 3, JSON: 3, CSS: 2 },
          topDirectories: [
            { path: "app", count: 7 },
            { path: "api", count: 3 },
            { path: "tests", count: 4 },
            { path: "docs", count: 2 },
            { path: "config", count: 1 },
            { path: "public", count: 5 },
            { path: "scripts", count: 6 }
          ],
          manifests: ["package.json", "vite.config.ts", "tsconfig.json"],
          sampleFiles: ["app/page.tsx", "api/health.ts", "tests/app.test.ts"]
        },
        node: {
          packageJsonPath: "package.json",
          packageManager: "npm",
          scripts: ["test: vitest", "build: vite build"],
          dependencies: ["@vitejs/plugin-react"],
          devDependencies: ["vitest"],
          frameworks: ["Vite", "Vitest"]
        }
      })
    );

    expect(cards.app).toMatchObject({ category: "screens", safety: "good-start" });
    expect(cards.api).toMatchObject({ category: "backend", safety: "use-care" });
    expect(cards.tests).toMatchObject({ category: "tests", safety: "good-start" });
    expect(cards.docs).toMatchObject({ category: "docs", safety: "good-start" });
    expect(cards.config).toMatchObject({ category: "config", safety: "use-care" });
    expect(cards.public).toMatchObject({ category: "assets", safety: "good-start" });
    expect(cards.scripts).toMatchObject({ category: "source", safety: "good-start" });
  });

  it("classifies Unity source, screens, assets, config, and generated folders", () => {
    const cards = cardsByPath(
      scanWith({
        detection: {
          type: "unity",
          detectedCapabilities: ["git", "generic", "unity"],
          roots: { repoRoot: "/tmp/game", unityProjectRoot: "/tmp/game" }
        },
        generic: {
          totalFiles: 56,
          languageCounts: { "C#": 18, "Unity Scene": 2, "Unity Prefab": 8 },
          topDirectories: [
            { path: "Assets", count: 30 },
            { path: "Packages", count: 3 },
            { path: "ProjectSettings", count: 4 },
            { path: "Library", count: 12 },
            { path: "Temp", count: 7 }
          ],
          manifests: ["ProjectSettings/ProjectVersion.txt"],
          sampleFiles: ["Assets/Main.unity", "Assets/Scripts/Menu.cs"]
        },
        unity: {
          counts: { scenes: 2, prefabs: 8, scripts: 18, resources: 1, projectSettings: 4 },
          scenes: ["Assets/Main.unity"],
          prefabs: ["Assets/UI/MainMenu.prefab"],
          scripts: ["Assets/Scripts/Menu.cs"],
          resources: ["Assets/Resources/Config.asset"],
          projectSettings: ["ProjectSettings/ProjectVersion.txt"],
          selDirectories: []
        }
      })
    );

    expect(cards.Assets).toMatchObject({ category: "screens", safety: "good-start" });
    expect(cards.Packages).toMatchObject({ category: "config", safety: "use-care" });
    expect(cards.ProjectSettings).toMatchObject({ category: "config", safety: "use-care" });
    expect(cards.Library).toMatchObject({ category: "generated", safety: "avoid" });
    expect(cards.Temp).toMatchObject({ category: "generated", safety: "avoid" });
    expect(cards.Library.nextAction).toContain("Do not ask an AI coding tool to edit this folder");
  });

  it("classifies Supabase and WordPress folders from capabilities and scan details", () => {
    const cards = cardsByPath(
      scanWith({
        detection: {
          type: "wordpress",
          detectedCapabilities: ["git", "generic", "supabase", "wordpress"],
          roots: { repoRoot: "/tmp/site", supabaseRoot: "/tmp/site/supabase" }
        },
        generic: {
          totalFiles: 24,
          languageCounts: { PHP: 8, SQL: 4, CSS: 4 },
          topDirectories: [
            { path: "supabase", count: 5 },
            { path: "wp-content", count: 9 },
            { path: "themes", count: 4 },
            { path: "plugins", count: 4 },
            { path: "uploads", count: 2 }
          ],
          manifests: ["wp-config.php", "supabase/config.toml"],
          sampleFiles: ["wp-content/themes/site/functions.php", "supabase/migrations/001.sql"]
        },
        supabase: {
          migrationCount: 2,
          migrations: ["supabase/migrations/001.sql", "supabase/migrations/002.sql"],
          functionNames: ["public.sync_profile"],
          docs: []
        },
        wordpress: {
          hasWpConfig: true,
          contentRoots: ["wp-content"],
          themes: ["wp-content/themes/site"],
          plugins: ["wp-content/plugins/custom"]
        }
      })
    );

    expect(cards.supabase).toMatchObject({ category: "database", safety: "use-care" });
    expect(cards["wp-content"]).toMatchObject({ category: "screens", safety: "good-start" });
    expect(cards.themes).toMatchObject({ category: "screens", safety: "good-start" });
    expect(cards.plugins).toMatchObject({ category: "backend", safety: "use-care" });
    expect(cards.uploads).toMatchObject({ category: "assets", safety: "good-start" });
  });

  it("marks dependency and build output directories as generated regardless of project type", () => {
    const cards = cardsByPath(
      scanWith({
        generic: {
          totalFiles: 40,
          languageCounts: { TypeScript: 8, JavaScript: 20 },
          topDirectories: [
            { path: "node_modules", count: 20 },
            { path: "dist", count: 5 },
            { path: "build", count: 4 },
            { path: "coverage", count: 3 },
            { path: "release", count: 2 },
            { path: "reports", count: 2 },
            { path: "src", count: 8 }
          ],
          manifests: ["package.json"],
          sampleFiles: ["src/index.ts"]
        }
      })
    );

    for (const path of ["node_modules", "dist", "build", "coverage", "release", "reports"]) {
      expect(cards[path]).toMatchObject({
        category: "generated",
        safety: "avoid",
        reason: "Generated dependency, build, cache, or report output should not be edited directly."
      });
    }
    expect(cards.src).toMatchObject({ category: "source", safety: "good-start" });
  });
});
