import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createGeneratedProfile } from "../src/project/profileGenerator.js";
import { loadProfile } from "../src/profile.js";

describe("generated project profiles", () => {
  it("creates a valid generated profile for a local git repo", async () => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), "pronav-workspace-"));
    const repoRoot = await mkdtemp(join(tmpdir(), "pronav-repo-"));
    execFileSync("git", ["init"], { cwd: repoRoot, stdio: "ignore" });
    writeFileSync(join(repoRoot, "package.json"), JSON.stringify({ scripts: { test: "vitest" } }));

    const generated = await createGeneratedProfile({
      repoRoot,
      name: "Temp Node App",
      workspaceRoot
    });
    const loaded = loadProfile(generated.profilePath);

    expect(generated.slug).toBe("temp-node-app");
    expect(generated.profilePath).toBe(join(workspaceRoot, "project_profiles", "generated", "temp-node-app.yml"));
    expect(loaded.repoRoot).toBe(repoRoot);
    expect(loaded.unityProjectRoot).toBeUndefined();
    expect(loaded.projectType).toBe("auto");
    expect(Object.keys(loaded.featureAreas)).toContain("source");
  });

  it("fails clearly when the repo path is missing or not a directory", async () => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), "pronav-workspace-"));

    await expect(
      createGeneratedProfile({
        repoRoot: join(workspaceRoot, "missing"),
        name: "Missing",
        workspaceRoot
      })
    ).rejects.toThrow(/Repo path does not exist/);

    const filePath = join(workspaceRoot, "not-a-directory.txt");
    mkdirSync(workspaceRoot, { recursive: true });
    writeFileSync(filePath, "nope\n");

    await expect(
      createGeneratedProfile({
        repoRoot: filePath,
        name: "Not Directory",
        workspaceRoot
      })
    ).rejects.toThrow(/Repo path is not a directory/);
  });
});
