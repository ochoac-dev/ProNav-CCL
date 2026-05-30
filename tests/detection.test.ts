import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { detectProject } from "../src/project/detect.js";

async function makeFixture(name: string): Promise<string> {
  return mkdtemp(join(tmpdir(), `pronav-detect-${name}-`));
}

describe("project auto-detection", () => {
  it("identifies a generic repo when no specialized markers exist", async () => {
    const repoRoot = await makeFixture("generic");
    writeFileSync(join(repoRoot, "README.md"), "# Generic\n");

    const detection = detectProject(repoRoot);

    expect(detection.type).toBe("generic");
    expect(detection.detectedCapabilities).toContain("generic");
  });

  it("identifies Node, Unity, Supabase, and WordPress markers independently", async () => {
    const nodeRoot = await makeFixture("node");
    writeFileSync(join(nodeRoot, "package.json"), JSON.stringify({ scripts: { test: "vitest" } }));

    const unityRoot = await makeFixture("unity");
    mkdirSync(join(unityRoot, "Assets"), { recursive: true });
    mkdirSync(join(unityRoot, "ProjectSettings"), { recursive: true });

    const supabaseRoot = await makeFixture("supabase");
    mkdirSync(join(supabaseRoot, "supabase", "migrations"), { recursive: true });

    const wordpressRoot = await makeFixture("wordpress");
    mkdirSync(join(wordpressRoot, "wp-content", "themes", "starter"), { recursive: true });

    expect(detectProject(nodeRoot).detectedCapabilities).toEqual(expect.arrayContaining(["generic", "node"]));
    expect(detectProject(unityRoot).detectedCapabilities).toEqual(expect.arrayContaining(["generic", "unity"]));
    expect(detectProject(supabaseRoot).detectedCapabilities).toEqual(expect.arrayContaining(["generic", "supabase"]));
    expect(detectProject(wordpressRoot).detectedCapabilities).toEqual(expect.arrayContaining(["generic", "wordpress"]));
  });

  it("detects a nested Unity project under a git repo root", async () => {
    const repoRoot = await makeFixture("nested-unity");
    const unityRoot = join(repoRoot, "Game");
    mkdirSync(join(unityRoot, "Assets"), { recursive: true });
    mkdirSync(join(unityRoot, "ProjectSettings"), { recursive: true });
    mkdirSync(join(unityRoot, "supabase", "migrations"), { recursive: true });

    const detection = detectProject(repoRoot);

    expect(detection.type).toBe("unity");
    expect(detection.roots.unityProjectRoot).toBe(unityRoot);
    expect(detection.roots.supabaseRoot).toBe(unityRoot);
    expect(detection.detectedCapabilities).toEqual(expect.arrayContaining(["unity", "supabase"]));
  });
});
