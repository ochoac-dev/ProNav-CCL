import { spawn } from "node:child_process";

const CODEX_RUN_TIMEOUT_MS = 20 * 60_000;
const CODEX_OUTPUT_LIMIT = 80_000;

export interface CodexRunInput {
  cwd: string;
  prompt: string;
  timeoutMs?: number;
}

export interface CodexRunResult {
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  timedOut: boolean;
}

export type CodexRunner = (input: CodexRunInput) => Promise<CodexRunResult>;

export function defaultCodexCommand(cwd: string): string {
  return `codex exec -C ${quoteShellText(cwd)} --sandbox workspace-write -`;
}

export async function runCodexCli(input: CodexRunInput): Promise<CodexRunResult> {
  const startedAt = Date.now();
  const timeoutMs = input.timeoutMs ?? CODEX_RUN_TIMEOUT_MS;
  const args = ["exec", "-C", input.cwd, "--sandbox", "workspace-write", "-"];
  const command = defaultCodexCommand(input.cwd);

  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let settled = false;
    let timedOut = false;
    const child = spawn("codex", args, {
      cwd: input.cwd,
      env: { ...process.env, CI: process.env.CI ?? "1" },
      stdio: ["pipe", "pipe", "pipe"]
    });

    const finish = (exitCode: number) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({
        command,
        exitCode,
        stdout,
        stderr,
        durationMs: Date.now() - startedAt,
        timedOut
      });
    };

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout = appendOutput(stdout, chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr = appendOutput(stderr, chunk);
    });
    child.on("error", (error) => {
      stderr = appendOutput(stderr, error.message);
      finish((error as { code?: string }).code === "ENOENT" ? 127 : 1);
    });
    child.on("close", (code) => {
      finish(timedOut ? 124 : code ?? 1);
    });
    child.stdin.end(input.prompt);
  });
}

function appendOutput(current: string, chunk: unknown): string {
  const next = current + (Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk));
  if (next.length <= CODEX_OUTPUT_LIMIT) return next;
  return `${next.slice(0, CODEX_OUTPUT_LIMIT)}\n[Output truncated after ${CODEX_OUTPUT_LIMIT} characters]`;
}

function quoteShellText(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}
