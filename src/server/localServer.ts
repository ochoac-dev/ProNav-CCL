import { exec, execFile } from "node:child_process";
import { createReadStream } from "node:fs";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { basename, extname, join, resolve, sep } from "node:path";
import { promisify } from "node:util";
import type { ProNavAppData } from "../app/appData.js";
import { renderAppHtml, renderAppScript, renderAppStyles } from "../app/staticApp.js";
import { defaultCodexCommand, runCodexCli, type CodexRunner, type CodexRunResult } from "../codex/codexRunner.js";
import { buildHandoff, type HandoffAgent, type HandoffTaskType } from "../handoffs/handoff.js";
import type { ExplanationDepth } from "../app/explanationData.js";
import {
  addProjectNote,
  addOrUpdateProjectBrainEntry,
  appendCodexRunMemory,
  appendHandoffMemory,
  appendScanMemory,
  appendValidationMemory,
  draftProjectBrainEntry,
  readProjectMemory,
  updateProjectBrainStatus,
  type ProjectBrainEntryInput,
  type ProjectBrainKind,
  type ProjectBrainSource,
  type ProjectBrainStatusAction,
  withProjectMemorySummary
} from "../memory/projectMemory.js";
import { loadProfile } from "../profile.js";
import { createGeneratedProfile, slugify } from "../project/profileGenerator.js";
import { writeProjectOutputs } from "../project/outputs.js";
import { readDocumentText, scanDocuments } from "../scanners/documents.js";
import { collectScan } from "../scanners/index.js";

export interface LocalServerOptions {
  port?: number;
  workspaceRoot?: string;
  staticAssetRoot?: string;
  pickFolder?: FolderPicker;
  codexRunner?: CodexRunner;
}

export type { CodexRunner };

export interface LocalServerHandle {
  server: Server;
  url: string;
  close: () => Promise<void>;
}

type FolderPicker = () => Promise<string | null>;

const execFileAsync = promisify(execFile);
const execAsync = promisify(exec);
const VALIDATION_TIMEOUT_MS = 120_000;
const VALIDATION_OUTPUT_LIMIT = 80_000;

export async function startLocalServer(options: LocalServerOptions = {}): Promise<LocalServerHandle> {
  const workspaceRoot = resolve(options.workspaceRoot ?? process.cwd());
  const staticAssetRoot = resolve(options.staticAssetRoot ?? workspaceRoot);
  const pickFolder = options.pickFolder ?? chooseLocalFolder;
  const codexRunner = options.codexRunner ?? runCodexCli;
  const server = createServer((request, response) => {
    void handleRequest(request, response, workspaceRoot, staticAssetRoot, pickFolder, codexRunner);
  });

  await new Promise<void>((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(options.port ?? 4173, "127.0.0.1", () => {
      server.off("error", reject);
      resolveListen();
    });
  });

  const address = server.address();
  const port = typeof address === "object" && address ? address.port : options.port ?? 4173;

  return {
    server,
    url: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise((resolveClose, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolveClose();
        });
      })
  };
}

async function handleRequest(
  request: IncomingMessage,
  response: ServerResponse,
  workspaceRoot: string,
  staticAssetRoot: string,
  pickFolder: FolderPicker,
  codexRunner: CodexRunner
): Promise<void> {
  try {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");

    if (request.method === "GET" && url.pathname === "/") {
      sendText(response, 200, "text/html; charset=utf-8", renderAppHtml("ProNav"));
      return;
    }

    if (request.method === "GET" && url.pathname === "/styles.css") {
      sendText(response, 200, "text/css; charset=utf-8", renderAppStyles());
      return;
    }

    if (request.method === "GET" && url.pathname === "/app.js") {
      sendText(response, 200, "application/javascript; charset=utf-8", renderAppScript());
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/projects") {
      sendJson(response, 200, await listGeneratedProjects(workspaceRoot));
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/memory") {
      const project = url.searchParams.get("project")?.trim() ?? "";
      if (!project) {
        sendJson(response, 400, { error: "Project slug is required." });
        return;
      }

      sendJson(response, 200, withProjectMemorySummary(await readProjectMemory(workspaceRoot, project)));
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/pick-folder") {
      const repoPath = await pickFolder();
      if (!repoPath) {
        sendJson(response, 200, { canceled: true });
        return;
      }

      const selectedStat = await stat(repoPath);
      if (!selectedStat.isDirectory()) {
        sendJson(response, 400, { error: "Selected path is not a directory." });
        return;
      }

      sendJson(response, 200, { repoPath });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/document") {
      const project = url.searchParams.get("project")?.trim() ?? "";
      const documentPath = url.searchParams.get("path")?.trim() ?? "";
      if (!project || !documentPath) {
        sendJson(response, 400, { error: "Document project and path are required." });
        return;
      }

      sendJson(response, 200, await readGeneratedProjectDocument(workspaceRoot, project, documentPath));
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/scan") {
      const body = await readJsonBody(request);
      const repoPath = typeof body.repoPath === "string" ? body.repoPath.trim() : "";
      const name = typeof body.name === "string" && body.name.trim().length > 0 ? body.name.trim() : undefined;
      if (!repoPath) {
        sendJson(response, 400, { error: "Repo path is required." });
        return;
      }

      const generated = await createGeneratedProfile({ repoRoot: repoPath, name, workspaceRoot });
      const profile = loadProfile(generated.profilePath);
      const scan = await collectScan(profile);
      const outputs = await writeProjectOutputs(profile, scan, {
        workspaceRoot,
        reportPathPrefix: "/reports"
      });
      await appendScanMemory(workspaceRoot, {
        slug: outputs.data.project.slug,
        name: outputs.data.project.name,
        repoRoot: outputs.data.project.repoRoot,
        projectType: outputs.data.project.type,
        detectedCapabilities: outputs.data.project.detectedCapabilities,
        generatedAt: outputs.data.project.generatedAt,
        files: outputs.data.metrics.files,
        documents: outputs.data.metrics.documents,
        dirtyEntries: outputs.data.metrics.dirtyEntries
      });
      sendJson(response, 200, outputs.data);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/handoff") {
      sendJson(response, 200, await createHandoffFromRequest(workspaceRoot, await readJsonBody(request)));
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/brain/draft") {
      sendJson(response, 200, await createBrainDraftFromRequest(workspaceRoot, await readJsonBody(request)));
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/brain/entry") {
      sendJson(response, 200, await upsertBrainEntryFromRequest(workspaceRoot, await readJsonBody(request)));
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/brain/status") {
      sendJson(response, 200, await updateBrainStatusFromRequest(workspaceRoot, await readJsonBody(request)));
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/validate") {
      sendJson(response, 200, await runValidationFromRequest(workspaceRoot, await readJsonBody(request)));
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/codex-run") {
      sendJson(response, 200, await runCodexFromRequest(workspaceRoot, await readJsonBody(request), codexRunner));
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/notes") {
      sendJson(response, 200, await addNoteFromRequest(workspaceRoot, await readJsonBody(request)));
      return;
    }

    if (
      request.method === "GET" &&
      url.pathname === "/build/icon.png"
    ) {
      await serveWorkspaceFile(response, staticAssetRoot, url.pathname);
      return;
    }

    if (
      request.method === "GET" &&
      (url.pathname.startsWith("/reports/") ||
        url.pathname.startsWith("/app/") ||
        url.pathname.startsWith("/handoffs/") ||
        url.pathname.startsWith("/codex-runs/"))
    ) {
      await serveWorkspaceFile(response, workspaceRoot, url.pathname);
      return;
    }

    sendJson(response, 404, { error: "Not found." });
  } catch (error) {
    const status = isUserInputError(error) ? 400 : 500;
    sendJson(response, status, { error: error instanceof Error ? error.message : String(error) });
  }
}

async function chooseLocalFolder(): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("osascript", [
      "-e",
      'POSIX path of (choose folder with prompt "Choose the project folder for ProNav")'
    ]);

    return normalizePickedFolder(stdout);
  } catch (error) {
    const text = error instanceof Error ? error.message : String(error);
    const stderr = typeof (error as { stderr?: unknown }).stderr === "string" ? (error as { stderr: string }).stderr : "";
    if (/User canceled|-128/.test(`${text}\n${stderr}`)) return null;
    throw new Error("Folder picker failed. You can still type the local repo path manually.");
  }
}

function normalizePickedFolder(value: string): string {
  const trimmed = value.trim();
  return trimmed.length > 1 ? trimmed.replace(/\/+$/, "") : trimmed;
}

async function createHandoffFromRequest(
  workspaceRoot: string,
  body: Record<string, unknown>
): Promise<{
  slug: string;
  path: string;
  markdown: string;
  prompt: string;
  relevantFiles: string[];
  projectBrainEntries: unknown[];
}> {
  const project = requireProjectSlug(body.project);
  const agent = parseAgent(body.agent);
  const taskType = parseTaskType(body.taskType);
  const explanationDepth = parseExplanationDepth(body.explanationDepth);
  const goal = typeof body.goal === "string" ? body.goal : "";
  const scope = typeof body.scope === "string" ? body.scope : undefined;
  const excludedBrainEntryIds = parseStringList(body.excludedBrainEntryIds);
  const profile = loadProfile(join(workspaceRoot, "project_profiles", "generated", `${project}.yml`));
  const scan = await collectScan(profile);
  const memory = await readProjectMemory(workspaceRoot, project);
  const handoff = buildHandoff(scan, {
    agent,
    taskType,
    goal,
    scope,
    memory,
    explanationDepth,
    excludedBrainEntryIds
  });
  const handoffPath = join(workspaceRoot, "handoffs", project, `${handoff.slug}.md`);

  await mkdir(join(workspaceRoot, "handoffs", project), { recursive: true });
  await writeFile(handoffPath, `${handoff.markdown.trimEnd()}\n`, "utf8");
  await appendHandoffMemory(workspaceRoot, project, {
    agent,
    taskType,
    goal,
    scope: scope ?? null,
    path: `/handoffs/${project}/${handoff.slug}.md`,
    relevantFiles: handoff.relevantFiles,
    createdAt: new Date().toISOString()
  });

  return {
    slug: handoff.slug,
    path: `/handoffs/${project}/${handoff.slug}.md`,
    markdown: handoff.markdown,
    prompt: handoff.prompt,
    relevantFiles: handoff.relevantFiles,
    projectBrainEntries: handoff.projectBrainEntries
  };
}

async function createBrainDraftFromRequest(workspaceRoot: string, body: Record<string, unknown>) {
  const project = requireProjectSlug(body.project);
  const appData = await readGeneratedAppData(workspaceRoot, project);
  const memory = await readProjectMemory(workspaceRoot, project);
  const input = buildBrainDraftInput(
    appData,
    memory,
    parseProjectBrainKind(body.kind),
    typeof body.scope === "string" ? body.scope.trim() : "",
    typeof body.title === "string" ? body.title.trim() : ""
  );
  await draftProjectBrainEntry(workspaceRoot, project, input);
  return withProjectMemorySummary(await readProjectMemory(workspaceRoot, project));
}

async function upsertBrainEntryFromRequest(workspaceRoot: string, body: Record<string, unknown>) {
  const project = requireProjectSlug(body.project);
  await addOrUpdateProjectBrainEntry(workspaceRoot, project, {
    id: typeof body.id === "string" && body.id.trim() ? body.id.trim() : undefined,
    kind: parseProjectBrainKind(body.kind),
    title: typeof body.title === "string" ? body.title : "",
    body: typeof body.body === "string" ? body.body : "",
    scope: typeof body.scope === "string" ? body.scope : null,
    paths: parseStringList(body.paths),
    conceptIds: parseStringList(body.conceptIds),
    source: parseProjectBrainSource(body.source)
  });
  return withProjectMemorySummary(await readProjectMemory(workspaceRoot, project));
}

async function updateBrainStatusFromRequest(workspaceRoot: string, body: Record<string, unknown>) {
  const project = requireProjectSlug(body.project);
  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!id) throw new Error("Project Brain entry id is required.");
  await updateProjectBrainStatus(workspaceRoot, project, {
    id,
    action: parseProjectBrainStatusAction(body.action)
  });
  return withProjectMemorySummary(await readProjectMemory(workspaceRoot, project));
}

async function readGeneratedAppData(workspaceRoot: string, project: string): Promise<ProNavAppData> {
  return JSON.parse(await readFile(join(workspaceRoot, "app", project, "data.json"), "utf8")) as ProNavAppData;
}

function buildBrainDraftInput(
  appData: ProNavAppData,
  memory: Awaited<ReturnType<typeof readProjectMemory>>,
  kind: ProjectBrainKind,
  scope: string,
  titleOverride: string
): ProjectBrainEntryInput {
  const paths = collectBrainDraftPaths(appData, scope);
  const conceptIds = unique(paths.flatMap((path) => appData.learning.fileExplanations[path]?.conceptIds ?? []));
  const label = scope || appData.project.name;
  const folderExplanation = scope ? appData.learning.folderExplanations[scope]?.developer : "";
  const fileLens = paths[0] ? appData.learning.fileExplanations[paths[0]]?.developer : "";
  const summary = summarizeBrainDraftMemory(memory);
  const title = titleOverride || defaultBrainDraftTitle(kind, label);
  const body = defaultBrainDraftBody(kind, label, {
    folderExplanation,
    fileLens,
    paths,
    conceptIds,
    summary
  });

  return {
    kind,
    title,
    body,
    scope: scope || null,
    paths,
    conceptIds,
    source: "scan-draft"
  };
}

function collectBrainDraftPaths(appData: ProNavAppData, scope: string): string[] {
  const candidates = unique([
    ...appData.features.flatMap((feature) => feature.files.map((file) => file.path)),
    ...appData.generic.sampleFiles,
    ...appData.documents.files.map((file) => file.path)
  ]);
  const scoped = scope ? candidates.filter((path) => pathMatches(path, scope)) : candidates;
  return (scoped.length > 0 ? scoped : candidates).slice(0, 8);
}

function defaultBrainDraftTitle(kind: ProjectBrainKind, label: string): string {
  switch (kind) {
    case "module-card":
      return `Module card draft for ${label}`;
    case "decision":
      return `Decision draft for ${label}`;
    case "constraint-risk":
      return `Constraint or risk draft for ${label}`;
    case "open-question":
      return `Open question draft for ${label}`;
  }
}

function defaultBrainDraftBody(
  kind: ProjectBrainKind,
  label: string,
  context: { folderExplanation?: string; fileLens?: string; paths: string[]; conceptIds: string[]; summary: string }
): string {
  const paths = context.paths.length ? `Relevant paths: ${context.paths.join(", ")}.` : "No narrow paths were found yet.";
  const concepts = context.conceptIds.length ? `Detected concepts: ${context.conceptIds.join(", ")}.` : "No strong concepts were detected yet.";
  const evidence = [context.folderExplanation, context.fileLens, paths, concepts, context.summary].filter(Boolean).join(" ");

  switch (kind) {
    case "module-card":
      return `Draft module context for ${label}. ${evidence}`;
    case "decision":
      return `Draft decision context for ${label}. Review whether this should become a trusted project rule. ${evidence}`;
    case "constraint-risk":
      return `Draft constraint or risk for ${label}. Review what a future AI agent should avoid or validate. ${evidence}`;
    case "open-question":
      return `Draft open question for ${label}. Resolve this before treating related implementation assumptions as fact. ${evidence}`;
  }
}

function summarizeBrainDraftMemory(memory: Awaited<ReturnType<typeof readProjectMemory>>): string {
  return [
    `Recent notes: ${memory.notes.slice(0, 2).map((note) => note.text).join(" | ") || "none"}.`,
    `Recent handoffs: ${memory.handoffs.slice(0, 2).map((handoff) => handoff.goal).join(" | ") || "none"}.`,
    `Recent validations: ${memory.validations.slice(0, 2).map((validation) => `${validation.command} exit ${validation.exitCode}`).join(" | ") || "none"}.`
  ].join(" ");
}

async function runValidationFromRequest(
  workspaceRoot: string,
  body: Record<string, unknown>
): Promise<{
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  timedOut: boolean;
}> {
  const project = requireProjectSlug(body.project);
  const commandIndex = parseCommandIndex(body.commandIndex);
  const profile = loadProfile(join(workspaceRoot, "project_profiles", "generated", `${project}.yml`));
  const command = profile.validationCommands[commandIndex];
  if (!command) {
    throw new Error("Validation command index is not configured for this project.");
  }

  const startedAt = Date.now();
  try {
    const result = await execAsync(command, {
      cwd: profile.repoRoot,
      timeout: VALIDATION_TIMEOUT_MS,
      maxBuffer: VALIDATION_OUTPUT_LIMIT * 2,
      env: { ...process.env, CI: process.env.CI ?? "1" }
    });

    const validationResult = {
      command,
      exitCode: 0,
      stdout: truncateValidationOutput(result.stdout),
      stderr: truncateValidationOutput(result.stderr),
      durationMs: Date.now() - startedAt,
      timedOut: false
    };
    await appendValidationMemory(workspaceRoot, project, {
      command: validationResult.command,
      exitCode: validationResult.exitCode,
      durationMs: validationResult.durationMs,
      timedOut: validationResult.timedOut,
      createdAt: new Date().toISOString()
    });
    return validationResult;
  } catch (error) {
    const executionError = error as {
      code?: unknown;
      killed?: boolean;
      signal?: unknown;
      stdout?: unknown;
      stderr?: unknown;
    };

    const validationResult = {
      command,
      exitCode: typeof executionError.code === "number" ? executionError.code : executionError.killed ? 124 : 1,
      stdout: truncateValidationOutput(outputText(executionError.stdout)),
      stderr: truncateValidationOutput(outputText(executionError.stderr)),
      durationMs: Date.now() - startedAt,
      timedOut: executionError.killed === true || executionError.signal === "SIGTERM"
    };
    await appendValidationMemory(workspaceRoot, project, {
      command: validationResult.command,
      exitCode: validationResult.exitCode,
      durationMs: validationResult.durationMs,
      timedOut: validationResult.timedOut,
      createdAt: new Date().toISOString()
    });
    return validationResult;
  }
}

async function runCodexFromRequest(
  workspaceRoot: string,
  body: Record<string, unknown>,
  codexRunner: CodexRunner
): Promise<CodexRunResult & { handoffPath: string; outputPath: string; changedFiles: string[] }> {
  const project = requireProjectSlug(body.project);
  const handoffPath = requireSavedHandoffPath(project, body.handoffPath);
  const profile = loadProfile(join(workspaceRoot, "project_profiles", "generated", `${project}.yml`));
  const handoffText = await readSavedHandoff(workspaceRoot, project, handoffPath);
  const startedAt = new Date();
  const result = await runCodexSafely(codexRunner, profile.repoRoot, handoffText);
  const changedFiles = await collectChangedFiles(profile.repoRoot);
  const outputPath = await writeCodexRunOutput(workspaceRoot, project, handoffPath, startedAt, result, changedFiles);

  await appendCodexRunMemory(workspaceRoot, project, {
    createdAt: startedAt.toISOString(),
    handoffPath,
    outputPath,
    command: result.command,
    exitCode: result.exitCode,
    durationMs: result.durationMs,
    timedOut: result.timedOut,
    changedFiles
  });

  return {
    ...result,
    handoffPath,
    outputPath,
    changedFiles
  };
}

async function runCodexSafely(codexRunner: CodexRunner, cwd: string, prompt: string): Promise<CodexRunResult> {
  try {
    return await codexRunner({ cwd, prompt });
  } catch (error) {
    return {
      command: defaultCodexCommand(cwd),
      exitCode: 1,
      stdout: "",
      stderr: error instanceof Error ? error.message : String(error),
      durationMs: 0,
      timedOut: false
    };
  }
}

async function readSavedHandoff(workspaceRoot: string, project: string, handoffPath: string): Promise<string> {
  const target = resolve(workspaceRoot, `.${handoffPath}`);
  const handoffRoot = resolve(workspaceRoot, "handoffs", project);
  if (!target.startsWith(`${handoffRoot}${sep}`)) {
    throw new Error("Codex can only run from a saved handoff packet.");
  }

  try {
    return await readFile(target, "utf8");
  } catch (error) {
    if ((error as { code?: string }).code === "ENOENT") {
      throw new Error("Codex can only run from a saved handoff packet.");
    }
    throw error;
  }
}

async function writeCodexRunOutput(
  workspaceRoot: string,
  project: string,
  handoffPath: string,
  startedAt: Date,
  result: CodexRunResult,
  changedFiles: string[]
): Promise<string> {
  const slug = slugify(basename(handoffPath, ".md"));
  const timestamp = startedAt.toISOString().replace(/[:.]/g, "-");
  const outputPath = `/codex-runs/${project}/${timestamp}-${slug}.txt`;
  const target = join(workspaceRoot, outputPath);
  await mkdir(join(workspaceRoot, "codex-runs", project), { recursive: true });
  await writeFile(
    target,
    [
      `Command: ${result.command}`,
      `Handoff: ${handoffPath}`,
      `Exit code: ${result.exitCode}`,
      `Timed out: ${result.timedOut ? "yes" : "no"}`,
      `Duration: ${Math.round(result.durationMs / 1000)}s`,
      `Changed files: ${changedFiles.length}`,
      ...changedFiles.map((file) => `- ${file}`),
      "",
      "stdout:",
      result.stdout || "(empty)",
      "",
      "stderr:",
      result.stderr || "(empty)"
    ].join("\n"),
    "utf8"
  );

  return outputPath;
}

async function collectChangedFiles(repoRoot: string): Promise<string[]> {
  try {
    const { stdout } = await execFileAsync("git", ["-C", repoRoot, "status", "--short"], {
      maxBuffer: VALIDATION_OUTPUT_LIMIT
    });
    return stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 80);
  } catch {
    return [];
  }
}

async function addNoteFromRequest(workspaceRoot: string, body: Record<string, unknown>) {
  const project = requireProjectSlug(body.project);
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    throw new Error("Note text is required.");
  }

  return withProjectMemorySummary(await addProjectNote(workspaceRoot, project, {
    text,
    createdAt: new Date().toISOString()
  }));
}

function requireSavedHandoffPath(project: string, value: unknown): string {
  if (typeof value !== "string") {
    throw new Error("Codex can only run from a saved handoff packet.");
  }

  const normalized = value.replaceAll("\\", "/");
  if (
    !normalized.startsWith(`/handoffs/${project}/`) ||
    !normalized.endsWith(".md") ||
    normalized.split("/").includes("..")
  ) {
    throw new Error("Codex can only run from a saved handoff packet.");
  }

  return normalized;
}

function parseCommandIndex(value: unknown): number {
  const index = typeof value === "number" ? value : typeof value === "string" ? Number.parseInt(value, 10) : Number.NaN;
  if (!Number.isInteger(index) || index < 0) {
    throw new Error("Validation commandIndex must be a non-negative integer.");
  }

  return index;
}

function outputText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Buffer.isBuffer(value)) return value.toString("utf8");
  return "";
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function pathMatches(left: string, right: string): boolean {
  const a = left.toLowerCase();
  const b = right.toLowerCase();
  return a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`) || a.includes(b) || b.includes(a);
}

function truncateValidationOutput(value: string): string {
  if (value.length <= VALIDATION_OUTPUT_LIMIT) return value;
  return `${value.slice(0, VALIDATION_OUTPUT_LIMIT)}\n[Output truncated after ${VALIDATION_OUTPUT_LIMIT} characters]`;
}

function requireProjectSlug(value: unknown): string {
  if (typeof value !== "string" || !/^[a-z0-9][a-z0-9-]*$/.test(value)) {
    throw new Error("Handoff project slug is required.");
  }

  return value;
}

function parseAgent(value: unknown): HandoffAgent {
  if (value === "codex" || value === "claude" || value === "cursor" || value === "copy") {
    return value;
  }

  throw new Error("Handoff agent must be one of: codex, claude, cursor, copy.");
}

function parseTaskType(value: unknown): HandoffTaskType {
  if (
    value === "build-feature" ||
    value === "fix-bug" ||
    value === "explain-code" ||
    value === "refactor" ||
    value === "write-tests" ||
    value === "review"
  ) {
    return value;
  }

  throw new Error("Handoff taskType is invalid.");
}

function parseExplanationDepth(value: unknown): ExplanationDepth | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (value === "builder" || value === "developer" || value === "senior") return value;
  throw new Error("Handoff explanationDepth is invalid.");
}

function parseProjectBrainKind(value: unknown): ProjectBrainKind {
  if (value === "module-card" || value === "decision" || value === "constraint-risk" || value === "open-question") return value;
  throw new Error("Project Brain kind is invalid.");
}

function parseProjectBrainSource(value: unknown): ProjectBrainSource {
  if (value === undefined || value === null || value === "") return "user";
  if (value === "user" || value === "scan-draft" || value === "handoff" || value === "codex-run") return value;
  throw new Error("Project Brain source is invalid.");
}

function parseProjectBrainStatusAction(value: unknown): ProjectBrainStatusAction {
  if (value === "approve" || value === "pin" || value === "unpin" || value === "deprecate") return value;
  throw new Error("Project Brain status action is invalid.");
}

function parseStringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean).slice(0, 40)
    : [];
}

async function readGeneratedProjectDocument(
  workspaceRoot: string,
  projectSlug: string,
  documentPath: string
): Promise<{ path: string; content: string; truncated: boolean }> {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(projectSlug)) {
    throw new Error("Project slug is invalid.");
  }

  const normalizedPath = documentPath.replaceAll("\\", "/").replace(/^\/+/, "");
  if (normalizedPath.split("/").includes("..")) {
    throw new Error("Requested document path is outside the scanned repo.");
  }

  const profile = loadProfile(join(workspaceRoot, "project_profiles", "generated", `${projectSlug}.yml`));
  const documents = await scanDocuments(profile.repoRoot);
  if (!documents.files.some((file) => file.path === normalizedPath && file.previewable)) {
    throw new Error(`Document is not available for preview: ${normalizedPath}`);
  }

  return readDocumentText(profile.repoRoot, normalizedPath);
}

async function listGeneratedProjects(workspaceRoot: string): Promise<Array<{ name: string; slug: string; repoRoot: string; profilePath: string }>> {
  const root = join(workspaceRoot, "project_profiles", "generated");
  let files: string[] = [];
  try {
    files = (await readdir(root)).filter((file) => file.endsWith(".yml") || file.endsWith(".yaml"));
  } catch {
    return [];
  }

  const projects = [];
  for (const file of files) {
    const profilePath = join(root, file);
    try {
      const profile = loadProfile(profilePath);
      projects.push({
        name: profile.name,
        slug: slugify(profile.name),
        repoRoot: profile.repoRoot,
        profilePath
      });
    } catch {
      // Generated profiles can become stale if a target repo is moved. Omit them from the quick list.
    }
  }

  return projects.sort((a, b) => a.name.localeCompare(b.name));
}

async function serveWorkspaceFile(response: ServerResponse, workspaceRoot: string, pathname: string): Promise<void> {
  const target = resolve(workspaceRoot, `.${decodeURIComponent(pathname)}`);
  const workspace = resolve(workspaceRoot);
  if (!target.startsWith(`${workspace}/`)) {
    sendJson(response, 403, { error: "Path is outside the ProNav workspace." });
    return;
  }

  let info;
  try {
    info = await stat(target);
  } catch {
    sendJson(response, 404, { error: "File not found." });
    return;
  }

  if (!info.isFile()) {
    sendJson(response, 404, { error: "File not found." });
    return;
  }

  response.writeHead(200, { "content-type": contentType(target) });
  createReadStream(target).pipe(response);
}

async function readJsonBody(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > 1_000_000) {
      throw new Error("Request body is too large.");
    }
    chunks.push(buffer);
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>;
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  sendText(response, status, "application/json; charset=utf-8", JSON.stringify(body));
}

function sendText(response: ServerResponse, status: number, contentTypeValue: string, body: string): void {
  response.writeHead(status, {
    "content-type": contentTypeValue,
    "cache-control": "no-store"
  });
  response.end(body);
}

function contentType(path: string): string {
  switch (extname(path).toLowerCase()) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
      return "application/javascript; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".md":
      return "text/markdown; charset=utf-8";
    case ".png":
      return "image/png";
    default:
      return "text/plain; charset=utf-8";
  }
}

function isUserInputError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /Repo path|Profile|Configured|feature|document|handoff|note|Project slug|saved handoff|outside the scanned repo/i.test(message);
}
