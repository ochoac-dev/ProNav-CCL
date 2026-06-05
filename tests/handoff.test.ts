import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildHandoff } from "../src/handoffs/handoff.js";
import type { ScanResult } from "../src/types.js";

function makeScan(repoRoot: string): ScanResult {
  return {
    profile: {
      name: "friendly-app",
      projectType: "auto",
      repoRoot,
      validationCommands: [`git -C ${repoRoot} status --short`, "npm test"],
      protectedPaths: [".env", "node_modules/"],
      featureAreas: {
        source: {
          id: "source",
          title: "Source Code",
          description: "Primary source files.",
          globs: ["src/**/*"],
          keywords: ["source"],
          maxFiles: 20
        }
      }
    },
    detection: {
      type: "node",
      detectedCapabilities: ["generic", "git", "node"],
      roots: { repoRoot }
    },
    git: { branch: "main", status: [], recentCommits: [], remotes: [] },
    generic: {
      totalFiles: 4,
      languageCounts: { TypeScript: 2, Markdown: 1, JSON: 1 },
      topDirectories: [
        { path: "src", count: 2 },
        { path: "docs", count: 1 }
      ],
      manifests: ["package.json"],
      sampleFiles: ["src/index.ts", "docs/plan.md"]
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
    supabase: { migrationCount: 0, migrations: [], functionNames: [], docs: [] },
    wordpress: { hasWpConfig: false, contentRoots: [], themes: [], plugins: [] },
    documents: {
      totalDocuments: 1,
      previewableDocuments: 1,
      files: [{ path: "docs/plan.md", title: "plan", extension: ".md", sizeBytes: 20, previewable: true }]
    },
    features: {
      source: {
        id: "source",
        title: "Source Code",
        description: "Primary source files.",
        totalCandidates: 2,
        files: [{ path: "src/index.ts", score: 4, matchedKeywords: ["source"] }]
      }
    }
  };
}

describe("handoff builder", () => {
  it("creates a friendly agent packet with bounded context and validation", async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), "pronav-handoff-repo-"));
    mkdirSync(join(repoRoot, "src"), { recursive: true });
    writeFileSync(join(repoRoot, "src", "index.ts"), "export const app = true;\n");
    const scan = makeScan(repoRoot);

    const handoff = buildHandoff(scan, {
      agent: "codex",
      taskType: "build-feature",
      goal: "Add a settings screen for users.",
      scope: "src"
    });

    expect(handoff.slug).toBe("add-a-settings-screen-for-users");
    expect(handoff.prompt).toContain("Use Codex");
    expect(handoff.markdown).toContain("Add a settings screen for users.");
    expect(handoff.markdown).toContain("src/index.ts");
    expect(handoff.markdown).toContain("git -C");
    expect(handoff.markdown).toContain("Do not edit protected paths");
    expect(handoff.relevantFiles).toContain("src/index.ts");
  });

  it("labels Cursor handoffs for users working in their IDE", async () => {
    const scan = makeScan(await mkdtemp(join(tmpdir(), "pronav-handoff-cursor-")));

    const handoff = buildHandoff(scan, {
      agent: "cursor",
      taskType: "review",
      goal: "Review the delegate screen for confusing wording.",
      scope: "src"
    });

    expect(handoff.prompt).toContain("Use Cursor");
    expect(handoff.markdown).toContain("Agent: Cursor");
  });

  it("includes recent project memory so agents understand scan changes and notes", async () => {
    const scan = makeScan(await mkdtemp(join(tmpdir(), "pronav-handoff-memory-")));

    const handoff = buildHandoff(scan, {
      agent: "codex",
      taskType: "refactor",
      goal: "Clean up the settings flow.",
      scope: "src",
      memory: {
        project: {
          slug: "friendly-app",
          name: "Friendly App",
          repoRoot: scan.profile.repoRoot
        },
        scans: [
          {
            generatedAt: "2026-05-29T22:00:00.000Z",
            projectType: "node",
            detectedCapabilities: ["generic", "git", "node"],
            files: 12,
            documents: 3,
            dirtyEntries: 1
          },
          {
            generatedAt: "2026-05-29T21:00:00.000Z",
            projectType: "node",
            detectedCapabilities: ["generic", "git", "node"],
            files: 10,
            documents: 2,
            dirtyEntries: 0
          }
        ],
        validations: [
          {
            createdAt: "2026-05-29T22:03:00.000Z",
            command: "npm run build",
            exitCode: 1,
            durationMs: 940,
            timedOut: false
          },
          {
            createdAt: "2026-05-29T22:02:00.000Z",
            command: "npm test",
            exitCode: 0,
            durationMs: 120,
            timedOut: false
          }
        ],
        handoffs: [],
        codexRuns: [],
        projectBrain: [],
        notes: [
          {
            createdAt: "2026-05-29T22:04:00.000Z",
            text: "The user wants beginner-friendly names for settings."
          }
        ]
      }
    });

    expect(handoff.prompt).toContain("Use the Project Memory section");
    expect(handoff.markdown).toContain("## Project Memory");
    expect(handoff.markdown).toContain("Files changed since last scan: +2");
    expect(handoff.markdown).toContain("Validation history: 1 passed, 1 failed, 0 timed out");
    expect(handoff.markdown).toContain("npm run build");
    expect(handoff.markdown).toContain("The user wants beginner-friendly names for settings.");
  });

  it("includes explanation depth and detected concept context when requested", async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), "pronav-handoff-learning-"));
    mkdirSync(join(repoRoot, "src"), { recursive: true });
    writeFileSync(join(repoRoot, "src", "index.ts"), "const lookup = new Map();\nbutton.addEventListener('click', () => lookup.set('open', true));\n");
    const scan = makeScan(repoRoot);

    const handoff = buildHandoff(scan, {
      agent: "codex",
      taskType: "explain-code",
      goal: "Explain the source code for a new builder.",
      scope: "src",
      explanationDepth: "developer"
    });

    expect(handoff.prompt).toContain("Use Developer-level explanations");
    expect(handoff.markdown).toContain("## Explanation Context");
    expect(handoff.markdown).toContain("Explanation depth: Developer");
    expect(handoff.markdown).toContain("Map / dictionary");
    expect(handoff.markdown).toContain("Event handler");
  });

  it("includes only relevant trusted Project Brain entries in handoff packets", async () => {
    const scan = makeScan(await mkdtemp(join(tmpdir(), "pronav-handoff-brain-")));

    const handoff = buildHandoff(scan, {
      agent: "codex",
      taskType: "fix-bug",
      goal: "Fix source behavior.",
      scope: "src",
      memory: {
        project: { slug: "friendly-app", name: "Friendly App", repoRoot: scan.profile.repoRoot },
        scans: [],
        validations: [],
        handoffs: [],
        codexRuns: [],
        notes: [],
        projectBrain: [
          {
            id: "brain-approved-src",
            kind: "module-card",
            status: "approved",
            source: "user",
            title: "Source owns app behavior",
            body: "The src folder owns visible app behavior and should be validated with npm test.",
            scope: "src",
            paths: ["src/index.ts"],
            conceptIds: [],
            createdAt: "2026-05-29T22:00:00.000Z",
            updatedAt: "2026-05-29T22:01:00.000Z",
            approvedAt: "2026-05-29T22:01:00.000Z"
          },
          {
            id: "brain-pinned-global",
            kind: "decision",
            status: "pinned",
            source: "user",
            title: "Local-first context",
            body: "Keep Project Brain context local unless the user copies a handoff.",
            scope: null,
            paths: [],
            conceptIds: [],
            createdAt: "2026-05-29T22:00:00.000Z",
            updatedAt: "2026-05-29T22:02:00.000Z",
            approvedAt: "2026-05-29T22:02:00.000Z"
          },
          {
            id: "brain-draft-src",
            kind: "constraint-risk",
            status: "draft",
            source: "scan-draft",
            title: "Unreviewed source risk",
            body: "This draft should not reach the handoff.",
            scope: "src",
            paths: ["src/index.ts"],
            conceptIds: [],
            createdAt: "2026-05-29T22:00:00.000Z",
            updatedAt: "2026-05-29T22:00:00.000Z",
            approvedAt: null
          },
          {
            id: "brain-deprecated-src",
            kind: "open-question",
            status: "deprecated",
            source: "user",
            title: "Old source question",
            body: "This deprecated entry should not reach the handoff.",
            scope: "src",
            paths: ["src/index.ts"],
            conceptIds: [],
            createdAt: "2026-05-29T22:00:00.000Z",
            updatedAt: "2026-05-29T22:03:00.000Z",
            approvedAt: "2026-05-29T22:01:00.000Z"
          }
        ]
      }
    });

    expect(handoff.markdown).toContain("## Human-Approved Project Brain");
    expect(handoff.markdown).toContain("Source owns app behavior");
    expect(handoff.markdown).toContain("Local-first context");
    expect(handoff.markdown).not.toContain("Unreviewed source risk");
    expect(handoff.markdown).not.toContain("Old source question");
  });

  it("respects Project Brain entries removed from a handoff review", async () => {
    const scan = makeScan(await mkdtemp(join(tmpdir(), "pronav-handoff-brain-removed-")));

    const handoff = buildHandoff(scan, {
      agent: "codex",
      taskType: "fix-bug",
      goal: "Fix source behavior.",
      scope: "src",
      excludedBrainEntryIds: ["brain-approved-src"],
      memory: {
        project: { slug: "friendly-app", name: "Friendly App", repoRoot: scan.profile.repoRoot },
        scans: [],
        validations: [],
        handoffs: [],
        codexRuns: [],
        notes: [],
        projectBrain: [
          {
            id: "brain-approved-src",
            kind: "module-card",
            status: "approved",
            source: "user",
            title: "Source owns app behavior",
            body: "The src folder owns visible app behavior and should be validated with npm test.",
            scope: "src",
            paths: ["src/index.ts"],
            conceptIds: [],
            createdAt: "2026-05-29T22:00:00.000Z",
            updatedAt: "2026-05-29T22:01:00.000Z",
            approvedAt: "2026-05-29T22:01:00.000Z"
          }
        ]
      }
    });

    expect(handoff.markdown).not.toContain("## Human-Approved Project Brain");
    expect(handoff.markdown).not.toContain("Source owns app behavior");
  });
});
