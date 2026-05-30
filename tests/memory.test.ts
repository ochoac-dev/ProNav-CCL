import { existsSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  addProjectNote,
  appendHandoffMemory,
  appendScanMemory,
  appendValidationMemory,
  readProjectMemory
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

  it("records validation, handoff, and note events", async () => {
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
    expect(memory.notes[0]).toMatchObject({ text: "This repo uses src for screens." });
  });
});
