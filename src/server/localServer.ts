import { exec, execFile } from "node:child_process";
import { createReadStream } from "node:fs";
import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { extname, join, resolve } from "node:path";
import { promisify } from "node:util";
import { renderAppHtml, renderAppScript, renderAppStyles } from "../app/staticApp.js";
import { buildHandoff, type HandoffAgent, type HandoffTaskType } from "../handoffs/handoff.js";
import { loadProfile } from "../profile.js";
import { createGeneratedProfile, slugify } from "../project/profileGenerator.js";
import { writeProjectOutputs } from "../project/outputs.js";
import { readDocumentText, scanDocuments } from "../scanners/documents.js";
import { collectScan } from "../scanners/index.js";

export interface LocalServerOptions {
  port?: number;
  workspaceRoot?: string;
  pickFolder?: FolderPicker;
}

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
  const pickFolder = options.pickFolder ?? chooseLocalFolder;
  const server = createServer((request, response) => {
    void handleRequest(request, response, workspaceRoot, pickFolder);
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
  pickFolder: FolderPicker
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
      sendJson(response, 200, outputs.data);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/handoff") {
      sendJson(response, 200, await createHandoffFromRequest(workspaceRoot, await readJsonBody(request)));
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/validate") {
      sendJson(response, 200, await runValidationFromRequest(workspaceRoot, await readJsonBody(request)));
      return;
    }

    if (
      request.method === "GET" &&
      (url.pathname.startsWith("/reports/") || url.pathname.startsWith("/app/") || url.pathname.startsWith("/handoffs/"))
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
}> {
  const project = requireProjectSlug(body.project);
  const profile = loadProfile(join(workspaceRoot, "project_profiles", "generated", `${project}.yml`));
  const scan = await collectScan(profile);
  const handoff = buildHandoff(scan, {
    agent: parseAgent(body.agent),
    taskType: parseTaskType(body.taskType),
    goal: typeof body.goal === "string" ? body.goal : "",
    scope: typeof body.scope === "string" ? body.scope : undefined
  });
  const handoffPath = join(workspaceRoot, "handoffs", project, `${handoff.slug}.md`);

  await mkdir(join(workspaceRoot, "handoffs", project), { recursive: true });
  await writeFile(handoffPath, `${handoff.markdown.trimEnd()}\n`, "utf8");

  return {
    slug: handoff.slug,
    path: `/handoffs/${project}/${handoff.slug}.md`,
    markdown: handoff.markdown,
    prompt: handoff.prompt,
    relevantFiles: handoff.relevantFiles
  };
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

    return {
      command,
      exitCode: 0,
      stdout: truncateValidationOutput(result.stdout),
      stderr: truncateValidationOutput(result.stderr),
      durationMs: Date.now() - startedAt,
      timedOut: false
    };
  } catch (error) {
    const executionError = error as {
      code?: unknown;
      killed?: boolean;
      signal?: unknown;
      stdout?: unknown;
      stderr?: unknown;
    };

    return {
      command,
      exitCode: typeof executionError.code === "number" ? executionError.code : executionError.killed ? 124 : 1,
      stdout: truncateValidationOutput(outputText(executionError.stdout)),
      stderr: truncateValidationOutput(outputText(executionError.stderr)),
      durationMs: Date.now() - startedAt,
      timedOut: executionError.killed === true || executionError.signal === "SIGTERM"
    };
  }
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
    default:
      return "text/plain; charset=utf-8";
  }
}

function isUserInputError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /Repo path|Profile|Configured|feature|document|handoff|outside the scanned repo/i.test(message);
}
