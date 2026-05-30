import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readDocumentText, scanDocuments } from "../src/scanners/documents.js";

describe("document scanner", () => {
  it("discovers repo documents and marks previewable text files", async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), "pronav-docs-"));
    mkdirSync(join(repoRoot, "docs"), { recursive: true });
    mkdirSync(join(repoRoot, "src"), { recursive: true });
    writeFileSync(join(repoRoot, "README.md"), "# Fixture\n");
    writeFileSync(join(repoRoot, "docs", "plan.md"), "# Plan\nShip it.\n");
    writeFileSync(join(repoRoot, "docs", "deck.pdf"), "%PDF-1.4\n");
    writeFileSync(join(repoRoot, "src", "index.ts"), "export const hidden = true;\n");

    const result = await scanDocuments(repoRoot);

    expect(result.totalDocuments).toBe(3);
    expect(result.files.map((file) => file.path)).toEqual(["README.md", "docs/plan.md", "docs/deck.pdf"]);
    expect(result.files.find((file) => file.path === "docs/plan.md")?.previewable).toBe(true);
    expect(result.files.find((file) => file.path === "docs/deck.pdf")?.previewable).toBe(false);
  });

  it("reads bounded text content and rejects paths outside the repo", async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), "pronav-doc-read-"));
    writeFileSync(join(repoRoot, "README.md"), "# Fixture\n");

    await expect(readDocumentText(repoRoot, "../README.md")).rejects.toThrow(/outside the scanned repo/);
    await expect(readDocumentText(repoRoot, "README.md")).resolves.toMatchObject({
      path: "README.md",
      content: "# Fixture\n",
      truncated: false
    });
  });
});
