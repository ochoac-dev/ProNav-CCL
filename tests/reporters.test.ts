import { describe, expect, it } from "vitest";
import { renderPlainOverview, renderRefactorPacket, renderTechnicalMap } from "../src/reporters/markdown.js";
import type { ScanResult } from "../src/types.js";

const scan: ScanResult = {
  profile: {
    name: "runners",
    projectType: "auto",
    repoRoot: "/tmp/Runners",
    unityProjectRoot: "/tmp/Runners/Runners",
    validationCommands: ["npm test", "git -C /tmp/Runners status --short"],
    protectedPaths: ["Runners/data/tokens.json"],
    featureAreas: {
      "field-bag": {
        id: "field-bag",
        title: "Field Bag",
        description: "Active bag and field loot work.",
        globs: ["Assets/**/*.cs"],
        keywords: ["field bag"],
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
    status: ["?? example.md"],
    recentCommits: ["abc123 example"],
    remotes: ["origin https://github.com/ochoac-dev/ProNav-CCL.git (fetch)"]
  },
  generic: {
    totalFiles: 12,
    languageCounts: { "C#": 3, SQL: 1, Markdown: 1 },
    topDirectories: [{ path: "Assets", count: 8 }],
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
    totalDocuments: 1,
    previewableDocuments: 1,
    files: [{ path: "README.md", title: "README", extension: ".md", sizeBytes: 42, previewable: true }]
  },
  features: {
    "field-bag": {
      id: "field-bag",
      title: "Field Bag",
      description: "Active bag and field loot work.",
      totalCandidates: 1,
      files: [
        {
          path: "Assets/SEL/Scripts/UI/FieldBagInteractionUI.cs",
          score: 8,
          matchedKeywords: ["field bag"]
        }
      ]
    }
  }
};

describe("Markdown reporters", () => {
  it("generates all three requested report types with expected headings", () => {
    expect(renderPlainOverview(scan)).toContain("# Runners Plain-Language Overview");
    expect(renderTechnicalMap(scan)).toContain("# Runners Technical System Map");
    expect(renderRefactorPacket(scan, "field-bag")).toContain("# Runners Refactor Packet: Field Bag");
  });

  it("includes bounded validation checks in refactor packets", () => {
    const packet = renderRefactorPacket(scan, "field-bag");

    expect(packet).toContain("## Required Validation");
    expect(packet).toContain("git -C /tmp/Runners status --short");
    expect(packet).toContain("Runners/data/tokens.json");
  });

  it("reports multi-language scripts instead of only C# script counts", () => {
    const technicalMap = renderTechnicalMap({
      ...scan,
      generic: {
        ...scan.generic,
        scripts: {
          total: 5,
          typeCounts: { "C#": 3, TypeScript: 1, SQL: 1 },
          samples: ["Assets/SEL/Scripts/UI/FieldBagInteractionUI.cs", "src/app.ts", "supabase/migrations/20260501000000_example.sql"]
        }
      } as any
    });

    expect(technicalMap).toContain("- Script files: 5");
    expect(technicalMap).toContain("- Script types:");
    expect(technicalMap).toContain("TypeScript: 1");
    expect(technicalMap).not.toContain("- C# scripts:");
  });
});
