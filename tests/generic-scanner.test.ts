import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { scanGeneric } from "../src/scanners/generic.js";

describe("generic code scanner", () => {
  it("collects file counts, language counts, top directories, and manifests for non-Runners repos", async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), "pronav-generic-"));
    mkdirSync(join(repoRoot, "src"), { recursive: true });
    mkdirSync(join(repoRoot, "docs"), { recursive: true });
    writeFileSync(join(repoRoot, "package.json"), JSON.stringify({ name: "fixture" }));
    writeFileSync(join(repoRoot, "src", "index.ts"), "export const ok = true;\n");
    writeFileSync(join(repoRoot, "docs", "overview.md"), "# Overview\n");

    const scan = await scanGeneric(repoRoot);

    expect(scan.totalFiles).toBe(3);
    expect(scan.languageCounts.TypeScript).toBe(1);
    expect(scan.languageCounts.Markdown).toBe(1);
    expect(scan.topDirectories[0]?.path).toBe("src");
    expect(scan.manifests).toContain("package.json");
  });

  it("locates script files across common codebase types", async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), "pronav-scripts-"));
    mkdirSync(join(repoRoot, "src"), { recursive: true });
    mkdirSync(join(repoRoot, "scripts"), { recursive: true });
    mkdirSync(join(repoRoot, "tools"), { recursive: true });
    mkdirSync(join(repoRoot, "Assets"), { recursive: true });
    mkdirSync(join(repoRoot, "supabase", "migrations"), { recursive: true });
    writeFileSync(join(repoRoot, "src", "index.ts"), "export const ok = true;\n");
    writeFileSync(join(repoRoot, "scripts", "deploy.sh"), "#!/usr/bin/env bash\n");
    writeFileSync(join(repoRoot, "tools", "seed.py"), "print('seed')\n");
    writeFileSync(join(repoRoot, "tools", "plugin.php"), "<?php echo 'plugin';\n");
    writeFileSync(join(repoRoot, "Assets", "Player.cs"), "public class Player {}\n");
    writeFileSync(join(repoRoot, "supabase", "migrations", "001_init.sql"), "select 1;\n");
    writeFileSync(join(repoRoot, "README.md"), "# Docs\n");

    const scan = await scanGeneric(repoRoot);

    expect((scan as any).scripts.total).toBe(6);
    expect((scan as any).scripts.typeCounts).toMatchObject({
      "C#": 1,
      PHP: 1,
      Python: 1,
      Shell: 1,
      SQL: 1,
      TypeScript: 1
    });
    expect((scan as any).scripts.samples).toEqual(
      expect.arrayContaining([
        "Assets/Player.cs",
        "scripts/deploy.sh",
        "src/index.ts",
        "supabase/migrations/001_init.sql",
        "tools/plugin.php",
        "tools/seed.py"
      ])
    );
    expect((scan as any).scripts.samples).not.toContain("README.md");
  });
});
