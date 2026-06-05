import { existsSync } from "node:fs";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  addProjectNote,
  appendHandoffMemory,
  appendCodexRunMemory,
  addOrUpdateProjectBrainEntry,
  appendScanMemory,
  appendValidationMemory,
  draftProjectBrainEntry,
  readProjectMemory,
  summarizeProjectMemory,
  updateProjectBrainStatus,
  withProjectMemorySummary
} from "../src/memory/projectMemory.js";

describe("project memory store", () => {
  it("creates and reads project memory inside the ProNav workspace", async () => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), "pronav-memory-workspace-"));
    const targetRepo = await mkdtemp(join(tmpdir(), "pronav-memory-target-"));

    await appendScanMemory(workspaceRoot, {
      slug: "memory-fixture",
      name: "Memory Fixture",
      repoRoot: targetRepo,
      projectType: "node",
      detectedCapabilities: ["git", "generic", "node"],
      generatedAt: "2026-05-29T20:00:00.000Z",
      files: 4,
      documents: 1,
      dirtyEntries: 0
    });

    const memory = await readProjectMemory(workspaceRoot, "memory-fixture");

    expect(memory.project).toMatchObject({
      slug: "memory-fixture",
      name: "Memory Fixture",
      repoRoot: targetRepo
    });
    expect(memory.scans).toHaveLength(1);
    expect(memory.scans[0]).toMatchObject({
      projectType: "node",
      files: 4,
      documents: 1,
      dirtyEntries: 0
    });
    expect(existsSync(join(workspaceRoot, "memory", "memory-fixture", "project-memory.json"))).toBe(true);
    expect(existsSync(join(targetRepo, "memory"))).toBe(false);
  });

  it("records validation, handoff, codex run, and note events", async () => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), "pronav-memory-events-"));

    await appendValidationMemory(workspaceRoot, "memory-fixture", {
      command: "npm test",
      exitCode: 0,
      durationMs: 120,
      timedOut: false,
      createdAt: "2026-05-29T20:01:00.000Z"
    });
    await appendHandoffMemory(workspaceRoot, "memory-fixture", {
      agent: "codex",
      taskType: "build-feature",
      goal: "Add a settings screen.",
      scope: "src",
      path: "/handoffs/memory-fixture/add-a-settings-screen.md",
      relevantFiles: ["src/index.ts"],
      createdAt: "2026-05-29T20:02:00.000Z"
    });
    await appendCodexRunMemory(workspaceRoot, "memory-fixture", {
      createdAt: "2026-05-29T20:02:30.000Z",
      handoffPath: "/handoffs/memory-fixture/add-a-settings-screen.md",
      outputPath: "/codex-runs/memory-fixture/2026-05-29T20-02-30-000Z-add-a-settings-screen.txt",
      command: "codex exec -C /tmp/example --sandbox workspace-write -",
      exitCode: 0,
      durationMs: 5000,
      timedOut: false,
      changedFiles: ["M src/index.ts"]
    });
    await addProjectNote(workspaceRoot, "memory-fixture", {
      text: "This repo uses src for screens.",
      createdAt: "2026-05-29T20:03:00.000Z"
    });

    const memory = await readProjectMemory(workspaceRoot, "memory-fixture");

    expect(memory.validations[0]).toMatchObject({ command: "npm test", exitCode: 0, timedOut: false });
    expect(memory.handoffs[0]).toMatchObject({
      agent: "codex",
      taskType: "build-feature",
      scope: "src"
    });
    expect(memory.codexRuns[0]).toMatchObject({
      handoffPath: "/handoffs/memory-fixture/add-a-settings-screen.md",
      exitCode: 0,
      timedOut: false
    });
    expect(memory.notes[0]).toMatchObject({ text: "This repo uses src for screens." });
  });

  it("normalizes older Codex run memory without changed-file lists", async () => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), "pronav-memory-legacy-codex-"));
    const memoryDir = join(workspaceRoot, "memory", "memory-fixture");
    await mkdir(memoryDir, { recursive: true });
    await writeFile(
      join(memoryDir, "project-memory.json"),
      JSON.stringify({
        project: { slug: "memory-fixture", name: "Memory Fixture", repoRoot: "/tmp/example" },
        codexRuns: [
          {
            createdAt: "2026-05-29T20:02:30.000Z",
            handoffPath: "/handoffs/memory-fixture/add-a-settings-screen.md",
            outputPath: "/codex-runs/memory-fixture/add-a-settings-screen.txt",
            command: "codex exec -C /tmp/example --sandbox workspace-write -",
            exitCode: 0,
            durationMs: 5000,
            timedOut: false
          }
        ]
      }),
      "utf8"
    );

    const memory = await readProjectMemory(workspaceRoot, "memory-fixture");

    expect(memory.codexRuns[0].changedFiles).toEqual([]);
    expect(memory.projectBrain).toEqual([]);
  });

  it("creates Project Brain drafts for the core entry types", async () => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), "pronav-brain-drafts-"));

    const moduleCard = await draftProjectBrainEntry(workspaceRoot, "brain-fixture", {
      kind: "module-card",
      title: "Source module",
      body: "The src folder owns the visible app behavior.",
      scope: "src",
      paths: ["src/index.ts"],
      conceptIds: ["ui-component"]
    });
    const decision = await draftProjectBrainEntry(workspaceRoot, "brain-fixture", {
      kind: "decision",
      title: "Local-first",
      body: "Project context stays local unless a user explicitly copies it out.",
      scope: null,
      paths: [],
      conceptIds: []
    });
    const risk = await draftProjectBrainEntry(workspaceRoot, "brain-fixture", {
      kind: "constraint-risk",
      title: "Do not edit generated output",
      body: "Generated folders should be avoided unless the user asks for a release artifact.",
      scope: "dist",
      paths: ["dist/app.js"],
      conceptIds: []
    });
    const question = await draftProjectBrainEntry(workspaceRoot, "brain-fixture", {
      kind: "open-question",
      title: "Validation gap",
      body: "Confirm which command proves the desktop package still launches.",
      scope: "desktop",
      paths: ["src/desktop/main.ts"],
      conceptIds: ["test"]
    });

    const memory = await readProjectMemory(workspaceRoot, "brain-fixture");

    expect([moduleCard, decision, risk, question].map((entry) => entry.kind)).toEqual([
      "module-card",
      "decision",
      "constraint-risk",
      "open-question"
    ]);
    expect(memory.projectBrain).toHaveLength(4);
    expect(memory.projectBrain.every((entry) => entry.status === "draft")).toBe(true);
    expect(memory.projectBrain.every((entry) => entry.source === "scan-draft")).toBe(true);
  });

  it("updates Project Brain entries and supports trusted status transitions", async () => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), "pronav-brain-status-"));
    const draft = await draftProjectBrainEntry(workspaceRoot, "brain-fixture", {
      kind: "module-card",
      title: "Source module",
      body: "Draft source summary.",
      scope: "src",
      paths: ["src/index.ts"],
      conceptIds: []
    });

    const edited = await addOrUpdateProjectBrainEntry(workspaceRoot, "brain-fixture", {
      id: draft.id,
      kind: "module-card",
      title: "Source module reviewed",
      body: "Reviewed source summary.",
      scope: "src",
      paths: ["src/index.ts"],
      conceptIds: ["ui-component"],
      source: "user"
    });
    const approved = await updateProjectBrainStatus(workspaceRoot, "brain-fixture", {
      id: draft.id,
      action: "approve"
    });
    const pinned = await updateProjectBrainStatus(workspaceRoot, "brain-fixture", {
      id: draft.id,
      action: "pin"
    });
    const unpinned = await updateProjectBrainStatus(workspaceRoot, "brain-fixture", {
      id: draft.id,
      action: "unpin"
    });
    const deprecated = await updateProjectBrainStatus(workspaceRoot, "brain-fixture", {
      id: draft.id,
      action: "deprecate"
    });
    const memory = withProjectMemorySummary(await readProjectMemory(workspaceRoot, "brain-fixture"));

    expect(edited).toMatchObject({
      title: "Source module reviewed",
      source: "user",
      conceptIds: ["ui-component"]
    });
    expect(approved.status).toBe("approved");
    expect(approved.approvedAt).toBeTruthy();
    expect(pinned.status).toBe("pinned");
    expect(unpinned.status).toBe("approved");
    expect(deprecated.status).toBe("deprecated");
    expect(memory.summary.projectBrainCounts).toEqual({
      draft: 0,
      approved: 0,
      pinned: 0,
      deprecated: 1
    });
  });

  it("summarizes scan changes and validation history without storing derived fields", async () => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), "pronav-memory-summary-"));

    await appendScanMemory(workspaceRoot, {
      slug: "memory-fixture",
      name: "Memory Fixture",
      repoRoot: "/tmp/example",
      projectType: "node",
      detectedCapabilities: ["generic", "node"],
      generatedAt: "2026-05-29T20:00:00.000Z",
      files: 8,
      documents: 2,
      dirtyEntries: 0
    });
    await appendScanMemory(workspaceRoot, {
      slug: "memory-fixture",
      name: "Memory Fixture",
      repoRoot: "/tmp/example",
      projectType: "node",
      detectedCapabilities: ["generic", "node"],
      generatedAt: "2026-05-29T21:00:00.000Z",
      files: 11,
      documents: 3,
      dirtyEntries: 2
    });
    await appendValidationMemory(workspaceRoot, "memory-fixture", {
      command: "npm test",
      exitCode: 0,
      durationMs: 120,
      timedOut: false,
      createdAt: "2026-05-29T21:01:00.000Z"
    });
    await appendValidationMemory(workspaceRoot, "memory-fixture", {
      command: "npm run build",
      exitCode: 1,
      durationMs: 240,
      timedOut: false,
      createdAt: "2026-05-29T21:02:00.000Z"
    });
    await appendValidationMemory(workspaceRoot, "memory-fixture", {
      command: "npm run slow",
      exitCode: 124,
      durationMs: 120_000,
      timedOut: true,
      createdAt: "2026-05-29T21:03:00.000Z"
    });
    await appendCodexRunMemory(workspaceRoot, "memory-fixture", {
      createdAt: "2026-05-29T21:04:00.000Z",
      handoffPath: "/handoffs/memory-fixture/review-src.md",
      outputPath: "/codex-runs/memory-fixture/2026-05-29T21-04-00-000Z-review-src.txt",
      command: "codex exec -C /tmp/example --sandbox workspace-write -",
      exitCode: 1,
      durationMs: 3000,
      timedOut: false,
      changedFiles: ["M src/index.ts"]
    });
    await appendCodexRunMemory(workspaceRoot, "memory-fixture", {
      createdAt: "2026-05-29T21:05:00.000Z",
      handoffPath: "/handoffs/memory-fixture/fix-src.md",
      outputPath: "/codex-runs/memory-fixture/2026-05-29T21-05-00-000Z-fix-src.txt",
      command: "codex exec -C /tmp/example --sandbox workspace-write -",
      exitCode: 0,
      durationMs: 4000,
      timedOut: false,
      changedFiles: []
    });

    const memory = await readProjectMemory(workspaceRoot, "memory-fixture");
    const summary = summarizeProjectMemory(memory);

    expect(summary.scanChange).toMatchObject({
      files: 3,
      documents: 1,
      dirtyEntries: 2
    });
    expect(summary.validationCounts).toEqual({
      passed: 1,
      failed: 1,
      timedOut: 1
    });
    expect(summary.codexRunCounts).toEqual({
      passed: 1,
      failed: 1,
      timedOut: 0
    });
    expect(withProjectMemorySummary(memory).summary).toEqual(summary);
    expect(memory).not.toHaveProperty("summary");
  });
});
