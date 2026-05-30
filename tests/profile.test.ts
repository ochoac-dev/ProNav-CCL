import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadProfile } from "../src/profile.js";

function makeProjectDirs() {
  const root = mkdtempSync(join(tmpdir(), "pronav-profile-"));
  const repoRoot = join(root, "Runners");
  const unityProjectRoot = join(repoRoot, "Runners");
  mkdirSync(unityProjectRoot, { recursive: true });
  return { root, repoRoot, unityProjectRoot };
}

describe("loadProfile", () => {
  it("loads valid YAML and keeps git and Unity roots separate", () => {
    const { root, repoRoot, unityProjectRoot } = makeProjectDirs();
    const profilePath = join(root, "runners.yml");
    writeFileSync(
      profilePath,
      [
        "name: runners",
        `repoRoot: ${JSON.stringify(repoRoot)}`,
        `unityProjectRoot: ${JSON.stringify(unityProjectRoot)}`,
        "validationCommands:",
        "  - npm test",
        "protectedPaths:",
        "  - Runners/data/tokens.json",
        "featureAreas:",
        "  field-bag:",
        "    title: Field Bag",
        "    description: Active bag and field loot work.",
        "    globs:",
        "      - Assets/**/*.cs",
        "    keywords:",
        "      - field bag"
      ].join("\n")
    );

    const profile = loadProfile(profilePath);

    expect(profile.name).toBe("runners");
    expect(profile.repoRoot).toBe(repoRoot);
    expect(profile.unityProjectRoot).toBe(unityProjectRoot);
    expect(profile.repoRoot).not.toBe(profile.unityProjectRoot);
    expect(profile.featureAreas["field-bag"].keywords).toContain("field bag");
  });

  it("fails clearly when configured Runners paths do not exist", () => {
    const root = mkdtempSync(join(tmpdir(), "pronav-missing-"));
    const profilePath = join(root, "runners.yml");
    writeFileSync(
      profilePath,
      [
        "name: runners",
        `repoRoot: ${JSON.stringify(join(root, "missing-repo"))}`,
        `unityProjectRoot: ${JSON.stringify(join(root, "missing-unity"))}`,
        "featureAreas: {}",
        "validationCommands: []",
        "protectedPaths: []"
      ].join("\n")
    );

    expect(() => loadProfile(profilePath)).toThrow(/Configured repoRoot does not exist/);
  });
});
