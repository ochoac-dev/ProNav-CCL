import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { redactSecrets } from "../src/scanners/git.js";
import { scanSupabase } from "../src/scanners/supabase.js";

describe("git scanner redaction", () => {
  it("redacts embedded credentials and GitHub tokens from remote output", () => {
    const tokenOne = "ghp_" + "1234567890abcdef";
    const tokenTwo = "gho_" + "abcdef123456";
    const input = [
      `origin\thttps://octo:${tokenOne}@github.com/ochoac-dev/ProNav-CCL.git (fetch)`,
      `mirror\thttps://${tokenTwo}@github.com/example/repo.git?access_token=secret-token (push)`
    ].join("\n");

    const redacted = redactSecrets(input);

    expect(redacted).not.toContain(tokenOne);
    expect(redacted).not.toContain(tokenTwo);
    expect(redacted).not.toContain("secret-token");
    expect(redacted).toContain("<redacted>");
  });
});

describe("Supabase scanner", () => {
  it("detects migrations and SQL function names without executing SQL", async () => {
    const unityRoot = mkdtempSync(join(tmpdir(), "pronav-supabase-"));
    const migrations = join(unityRoot, "supabase", "migrations");
    mkdirSync(migrations, { recursive: true });
    writeFileSync(
      join(migrations, "20260501000000_example.sql"),
      [
        "create or replace function public.claim_system_field_bag(p_player uuid)",
        "returns jsonb",
        "language sql",
        "as $$ select jsonb_build_object('ok', true) $$;"
      ].join("\n")
    );

    const result = await scanSupabase(unityRoot);

    expect(result.migrationCount).toBe(1);
    expect(result.migrations[0]).toBe("supabase/migrations/20260501000000_example.sql");
    expect(result.functionNames).toContain("public.claim_system_field_bag");
  });
});
