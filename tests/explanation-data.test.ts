import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildLearningData } from "../src/app/explanationData.js";
import type { ScanResult } from "../src/types.js";

function makeScan(repoRoot: string): ScanResult {
  return {
    profile: {
      name: "learning-app",
      projectType: "auto",
      repoRoot,
      validationCommands: [`git -C ${repoRoot} status --short`, "npm test"],
      protectedPaths: [".env", "node_modules/"],
      featureAreas: {}
    },
    detection: {
      type: "node",
      detectedCapabilities: ["generic", "git", "node"],
      roots: { repoRoot }
    },
    git: { branch: "main", status: [], recentCommits: [], remotes: [] },
    generic: {
      totalFiles: 7,
      languageCounts: { TypeScript: 2, SQL: 1, Python: 1, Markdown: 1 },
      scripts: {
        total: 4,
        typeCounts: { TypeScript: 2, SQL: 1, Python: 1 },
        samples: [
          "src/index.ts",
          "src/stateMachine.ts",
          "supabase/migrations/20260501000000_claim.sql",
          "tools/sort_items.py"
        ]
      },
      topDirectories: [
        { path: "src", count: 2 },
        { path: "supabase", count: 1 },
        { path: "tools", count: 1 },
        { path: "docs", count: 1 }
      ],
      manifests: ["package.json"],
      sampleFiles: ["src/index.ts", "src/stateMachine.ts", "docs/plan.md"]
    },
    node: {
      packageJsonPath: "package.json",
      packageManager: "npm",
      scripts: ["test: vitest"],
      dependencies: ["commander"],
      devDependencies: ["vitest"],
      frameworks: ["Vitest"]
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
      migrationCount: 1,
      migrations: ["supabase/migrations/20260501000000_claim.sql"],
      functionNames: ["public.claim_loot"],
      docs: []
    },
    wordpress: { hasWpConfig: false, contentRoots: [], themes: [], plugins: [] },
    documents: {
      totalDocuments: 1,
      previewableDocuments: 1,
      files: [{ path: "docs/plan.md", title: "plan", extension: ".md", sizeBytes: 20, previewable: true }]
    },
    features: {}
  };
}

describe("learning explanation data", () => {
  it("builds depth-aware project, folder, file, concept, and validation explanations", async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), "pronav-learning-"));
    mkdirSync(join(repoRoot, "src"), { recursive: true });
    mkdirSync(join(repoRoot, "supabase/migrations"), { recursive: true });
    mkdirSync(join(repoRoot, "tools"), { recursive: true });
    mkdirSync(join(repoRoot, "docs"), { recursive: true });
    writeFileSync(
      join(repoRoot, "src/index.ts"),
      [
        "const items = new Map<string, number>();",
        "const queue: string[] = [];",
        "button.addEventListener('click', () => queue.push('claim'));",
        "items.set('loot', queue.length);"
      ].join("\n")
    );
    writeFileSync(
      join(repoRoot, "src/stateMachine.ts"),
      "export const state = status === 'idle' ? 'running' : 'done';\n"
    );
    writeFileSync(join(repoRoot, "supabase/migrations/20260501000000_claim.sql"), "create function public.claim_loot() returns void as $$ begin select 1; end; $$ language plpgsql;\n");
    writeFileSync(join(repoRoot, "tools/sort_items.py"), "items = sorted([3, 1, 2])\n");
    writeFileSync(join(repoRoot, "docs/plan.md"), "# Plan\n");

    const learning = buildLearningData(makeScan(repoRoot));

    expect(learning.depths.map((depth) => depth.id)).toEqual(["builder", "developer", "senior"]);
    expect(learning.guide.headline).toBe("Start here");
    expect(learning.guide.steps.map((step) => step.targetSection)).toEqual(["overview", "features", "validation"]);
    expect(learning.guide.nextAction.targetSection).toBe("features");
    expect(learning.projectExplanation.builder).toContain("plain-language");
    expect(learning.projectExplanation.developer).toContain("source");
    expect(learning.projectExplanation.senior).toContain("risk");
    expect(learning.folderExplanations["src"].developer).toContain("source");
    expect(learning.fileExplanations["src/index.ts"].category).toBe("source");
    expect(learning.fileExplanations["src/index.ts"].conceptIds).toContain("map-dictionary");
    expect(learning.fileExplanations["supabase/migrations/20260501000000_claim.sql"].conceptIds).toContain("sql-function");
    expect(learning.concepts.map((concept) => concept.id)).toEqual(
      expect.arrayContaining(["array-list", "map-dictionary", "queue", "state-machine", "sorting", "sql-function", "event-handler"])
    );
    expect(learning.validationExplanations[0].command).toBe(`git -C ${repoRoot} status --short`);
    expect(learning.validationExplanations[0].senior).toContain("dirty");
  });
});
