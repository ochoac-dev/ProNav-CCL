import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { startLocalServer } from "../src/server/localServer.js";

const servers: Awaited<ReturnType<typeof startLocalServer>>[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()));
});

describe("local app server", () => {
  it("scans a local repo through POST /api/scan and writes outputs only inside ProNav", async () => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), "pronav-server-workspace-"));
    const repoRoot = await mkdtemp(join(tmpdir(), "pronav-server-repo-"));
    execFileSync("git", ["init"], { cwd: repoRoot, stdio: "ignore" });
    mkdirSync(join(repoRoot, "src"), { recursive: true });
    mkdirSync(join(repoRoot, "docs"), { recursive: true });
    writeFileSync(join(repoRoot, "package.json"), JSON.stringify({ name: "server-fixture" }));
    writeFileSync(join(repoRoot, "src", "index.ts"), "export const value = 1;\n");
    writeFileSync(join(repoRoot, "docs", "notes.md"), "# Notes\nRead-only preview.\n");

    const server = await startLocalServer({ port: 0, workspaceRoot });
    servers.push(server);

    const response = await fetch(`${server.url}/api/scan`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ repoPath: repoRoot, name: "Server Fixture" })
    });
    const body = (await response.json()) as {
      project: { repoRoot: string; detectedCapabilities: string[] };
      generic: { totalFiles: number };
      documents: { totalDocuments: number; files: Array<{ path: string }> };
    };

    expect(response.status).toBe(200);
    expect(body.project.repoRoot).toBe(repoRoot);
    expect(body.project.detectedCapabilities).toContain("node");
    expect(body.generic.totalFiles).toBeGreaterThanOrEqual(2);
    expect(body.documents.files.map((file) => file.path)).toContain("docs/notes.md");
    expect(existsSync(join(workspaceRoot, "project_profiles", "generated", "server-fixture.yml"))).toBe(true);
    expect(existsSync(join(workspaceRoot, "reports", "server-fixture", "plain-overview.md"))).toBe(true);
    expect(existsSync(join(workspaceRoot, "app", "server-fixture", "data.json"))).toBe(true);
    expect(existsSync(join(workspaceRoot, "memory", "server-fixture", "project-memory.json"))).toBe(true);
    expect(existsSync(join(repoRoot, "reports"))).toBe(false);
    expect(existsSync(join(repoRoot, "memory"))).toBe(false);
    expect(execFileSync("git", ["-C", repoRoot, "status", "--short"], { encoding: "utf8" })).toBe(
      "?? docs/\n?? package.json\n?? src/\n"
    );

    const memoryResponse = await fetch(`${server.url}/api/memory?project=server-fixture`);
    const memory = (await memoryResponse.json()) as {
      scans: Array<{ projectType: string; files: number; documents: number }>;
    };
    expect(memoryResponse.status).toBe(200);
    expect(memory.scans[0]).toMatchObject({
      projectType: "node",
      documents: body.documents.totalDocuments
    });
  });

  it("returns an actionable error for a missing repo path", async () => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), "pronav-server-workspace-"));
    const server = await startLocalServer({ port: 0, workspaceRoot });
    servers.push(server);

    const response = await fetch(`${server.url}/api/scan`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ repoPath: join(workspaceRoot, "missing") })
    });
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/Repo path does not exist/);
  });

  it("returns a selected local folder path from POST /api/pick-folder", async () => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), "pronav-server-workspace-"));
    const repoRoot = await mkdtemp(join(tmpdir(), "pronav-picked-folder-"));
    const server = await startLocalServer({
      port: 0,
      workspaceRoot,
      pickFolder: async () => repoRoot
    });
    servers.push(server);

    const response = await fetch(`${server.url}/api/pick-folder`, { method: "POST" });
    const body = (await response.json()) as { repoPath: string };

    expect(response.status).toBe(200);
    expect(body.repoPath).toBe(repoRoot);
  });

  it("reports canceled folder picks without scanning anything", async () => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), "pronav-server-workspace-"));
    const server = await startLocalServer({
      port: 0,
      workspaceRoot,
      pickFolder: async () => null
    });
    servers.push(server);

    const response = await fetch(`${server.url}/api/pick-folder`, { method: "POST" });
    const body = (await response.json()) as { canceled: boolean };

    expect(response.status).toBe(200);
    expect(body.canceled).toBe(true);
  });

  it("serves bounded document previews for generated projects", async () => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), "pronav-server-workspace-"));
    const repoRoot = await mkdtemp(join(tmpdir(), "pronav-server-docs-"));
    mkdirSync(join(repoRoot, "docs"), { recursive: true });
    writeFileSync(join(repoRoot, "docs", "notes.md"), "# Notes\nRead-only preview.\n");
    writeFileSync(join(repoRoot, "secret.txt"), "not in docs list\n");

    const server = await startLocalServer({ port: 0, workspaceRoot });
    servers.push(server);

    await fetch(`${server.url}/api/scan`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ repoPath: repoRoot, name: "Docs Fixture" })
    });

    const ok = await fetch(`${server.url}/api/document?project=docs-fixture&path=docs%2Fnotes.md`);
    const okBody = (await ok.json()) as { path: string; content: string; truncated: boolean };
    expect(ok.status).toBe(200);
    expect(okBody).toMatchObject({
      path: "docs/notes.md",
      content: "# Notes\nRead-only preview.\n",
      truncated: false
    });

    const blocked = await fetch(`${server.url}/api/document?project=docs-fixture&path=..%2Fsecret.txt`);
    const blockedBody = (await blocked.json()) as { error: string };
    expect(blocked.status).toBe(400);
    expect(blockedBody.error).toMatch(/outside the scanned repo/);
  });

  it("creates handoff packets for a selected coding agent without writing to the target repo", async () => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), "pronav-server-workspace-"));
    const repoRoot = await mkdtemp(join(tmpdir(), "pronav-server-handoff-"));
    mkdirSync(join(repoRoot, "src"), { recursive: true });
    writeFileSync(join(repoRoot, "README.md"), "# Handoff Fixture\n");
    writeFileSync(join(repoRoot, "src", "index.ts"), "export const value = 1;\n");

    const server = await startLocalServer({ port: 0, workspaceRoot });
    servers.push(server);

    await fetch(`${server.url}/api/scan`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ repoPath: repoRoot, name: "Handoff Fixture" })
    });

    const response = await fetch(`${server.url}/api/handoff`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        project: "handoff-fixture",
        agent: "cursor",
        taskType: "fix-bug",
        goal: "Fix the login button state.",
        scope: "src"
      })
    });
    const body = (await response.json()) as {
      slug: string;
      prompt: string;
      markdown: string;
      path: string;
    };

    expect(response.status).toBe(200);
    expect(body.slug).toBe("fix-the-login-button-state");
    expect(body.prompt).toContain("Use Cursor");
    expect(body.markdown).toContain("Fix the login button state.");
    expect(body.markdown).toContain("src/index.ts");
    expect(existsSync(join(workspaceRoot, "handoffs", "handoff-fixture", "fix-the-login-button-state.md"))).toBe(true);
    expect(existsSync(join(repoRoot, "handoffs"))).toBe(false);
  });

  it("runs a configured validation command and returns output without accepting arbitrary commands", async () => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), "pronav-server-workspace-"));
    const repoRoot = await mkdtemp(join(tmpdir(), "pronav-server-validation-"));
    writeFileSync(
      join(repoRoot, "package.json"),
      JSON.stringify({
        name: "validation-fixture",
        scripts: {
          test: "node -e \"console.log('VALIDATION_OK')\"",
          build: "node -e \"console.log('BUILD_OK')\""
        }
      })
    );

    const server = await startLocalServer({ port: 0, workspaceRoot });
    servers.push(server);

    await fetch(`${server.url}/api/scan`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ repoPath: repoRoot, name: "Validation Fixture" })
    });

    const response = await fetch(`${server.url}/api/validate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ project: "validation-fixture", commandIndex: 0, command: "echo should-not-run" })
    });
    const body = (await response.json()) as {
      command: string;
      exitCode: number;
      stdout: string;
      stderr: string;
      timedOut: boolean;
    };

    expect(response.status).toBe(200);
    expect(body.command).toBe(`npm --prefix ${repoRoot} test`);
    expect(body.exitCode).toBe(0);
    expect(body.stdout).toContain("VALIDATION_OK");
    expect(body.stdout).not.toContain("should-not-run");
    expect(body.timedOut).toBe(false);

    const memoryResponse = await fetch(`${server.url}/api/memory?project=validation-fixture`);
    const memory = (await memoryResponse.json()) as {
      validations: Array<{ command: string; exitCode: number; timedOut: boolean }>;
    };
    expect(memory.validations[0]).toMatchObject({
      command: `npm --prefix ${repoRoot} test`,
      exitCode: 0,
      timedOut: false
    });
  });

  it("stores handoff history and user notes inside project memory", async () => {
    const workspaceRoot = await mkdtemp(join(tmpdir(), "pronav-server-memory-"));
    const repoRoot = await mkdtemp(join(tmpdir(), "pronav-server-memory-repo-"));
    mkdirSync(join(repoRoot, "src"), { recursive: true });
    writeFileSync(join(repoRoot, "src", "index.ts"), "export const value = 1;\n");

    const server = await startLocalServer({ port: 0, workspaceRoot });
    servers.push(server);

    await fetch(`${server.url}/api/scan`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ repoPath: repoRoot, name: "Memory Server Fixture" })
    });

    const handoffResponse = await fetch(`${server.url}/api/handoff`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        project: "memory-server-fixture",
        agent: "claude",
        taskType: "explain-code",
        goal: "Explain the src folder.",
        scope: "src"
      })
    });
    expect(handoffResponse.status).toBe(200);

    const noteResponse = await fetch(`${server.url}/api/notes`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        project: "memory-server-fixture",
        text: "The user cares most about src."
      })
    });
    expect(noteResponse.status).toBe(200);

    const memoryResponse = await fetch(`${server.url}/api/memory?project=memory-server-fixture`);
    const memory = (await memoryResponse.json()) as {
      handoffs: Array<{ agent: string; taskType: string; goal: string; scope: string }>;
      notes: Array<{ text: string }>;
    };
    expect(memory.handoffs[0]).toMatchObject({
      agent: "claude",
      taskType: "explain-code",
      goal: "Explain the src folder.",
      scope: "src"
    });
    expect(memory.notes[0]).toMatchObject({
      text: "The user cares most about src."
    });
    expect(existsSync(join(repoRoot, "memory"))).toBe(false);
  });
});
