import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const MEMORY_LIMIT = 50;

export interface ProjectMemory {
  project: {
    slug: string;
    name: string | null;
    repoRoot: string | null;
  };
  scans: ScanMemoryEntry[];
  validations: ValidationMemoryEntry[];
  handoffs: HandoffMemoryEntry[];
  codexRuns: CodexRunMemoryEntry[];
  notes: ProjectNote[];
}

export interface ProjectMemorySummary {
  latestScan: ScanMemoryEntry | null;
  previousScan: ScanMemoryEntry | null;
  scanChange: {
    files: number;
    documents: number;
    dirtyEntries: number;
  } | null;
  validationCounts: {
    passed: number;
    failed: number;
    timedOut: number;
  };
  codexRunCounts: {
    passed: number;
    failed: number;
    timedOut: number;
  };
}

export type ProjectMemoryResponse = ProjectMemory & {
  summary: ProjectMemorySummary;
};

export interface ScanMemoryEntry {
  generatedAt: string;
  projectType: string;
  detectedCapabilities: string[];
  files: number;
  documents: number;
  dirtyEntries: number;
}

export interface AppendScanMemoryInput extends ScanMemoryEntry {
  slug: string;
  name: string;
  repoRoot: string;
}

export interface ValidationMemoryEntry {
  createdAt: string;
  command: string;
  exitCode: number;
  durationMs: number;
  timedOut: boolean;
}

export interface HandoffMemoryEntry {
  createdAt: string;
  agent: string;
  taskType: string;
  goal: string;
  scope: string | null;
  path: string;
  relevantFiles: string[];
}

export interface CodexRunMemoryEntry {
  createdAt: string;
  handoffPath: string;
  outputPath: string;
  command: string;
  exitCode: number;
  durationMs: number;
  timedOut: boolean;
}

export interface ProjectNote {
  createdAt: string;
  text: string;
}

export async function readProjectMemory(workspaceRoot: string, projectSlug: string): Promise<ProjectMemory> {
  const slug = requireProjectSlug(projectSlug);
  try {
    const parsed = JSON.parse(await readFile(memoryPath(workspaceRoot, slug), "utf8")) as Partial<ProjectMemory>;
    return normalizeMemory(slug, parsed);
  } catch (error) {
    if ((error as { code?: string }).code !== "ENOENT") throw error;
    return emptyMemory(slug);
  }
}

export async function appendScanMemory(workspaceRoot: string, input: AppendScanMemoryInput): Promise<ProjectMemory> {
  const slug = requireProjectSlug(input.slug);
  const memory = await readProjectMemory(workspaceRoot, slug);
  memory.project = {
    slug,
    name: input.name,
    repoRoot: input.repoRoot
  };
  memory.scans = limitNewest([
    {
      generatedAt: input.generatedAt,
      projectType: input.projectType,
      detectedCapabilities: input.detectedCapabilities,
      files: input.files,
      documents: input.documents,
      dirtyEntries: input.dirtyEntries
    },
    ...memory.scans
  ]);
  await writeProjectMemory(workspaceRoot, memory);
  return memory;
}

export async function appendValidationMemory(
  workspaceRoot: string,
  projectSlug: string,
  input: ValidationMemoryEntry
): Promise<ProjectMemory> {
  const slug = requireProjectSlug(projectSlug);
  const memory = await readProjectMemory(workspaceRoot, slug);
  memory.validations = limitNewest([{ ...input }, ...memory.validations]);
  await writeProjectMemory(workspaceRoot, memory);
  return memory;
}

export async function appendHandoffMemory(workspaceRoot: string, projectSlug: string, input: HandoffMemoryEntry): Promise<ProjectMemory> {
  const slug = requireProjectSlug(projectSlug);
  const memory = await readProjectMemory(workspaceRoot, slug);
  memory.handoffs = limitNewest([{ ...input }, ...memory.handoffs]);
  await writeProjectMemory(workspaceRoot, memory);
  return memory;
}

export async function appendCodexRunMemory(
  workspaceRoot: string,
  projectSlug: string,
  input: CodexRunMemoryEntry
): Promise<ProjectMemory> {
  const slug = requireProjectSlug(projectSlug);
  const memory = await readProjectMemory(workspaceRoot, slug);
  memory.codexRuns = limitNewest([{ ...input }, ...memory.codexRuns]);
  await writeProjectMemory(workspaceRoot, memory);
  return memory;
}

export async function addProjectNote(workspaceRoot: string, projectSlug: string, input: ProjectNote): Promise<ProjectMemory> {
  const slug = requireProjectSlug(projectSlug);
  const text = input.text.trim();
  if (!text) throw new Error("Note text is required.");
  const memory = await readProjectMemory(workspaceRoot, slug);
  memory.notes = limitNewest([{ createdAt: input.createdAt, text }, ...memory.notes]);
  await writeProjectMemory(workspaceRoot, memory);
  return memory;
}

export function summarizeProjectMemory(memory: ProjectMemory): ProjectMemorySummary {
  const scans = [...memory.scans].sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
  const latestScan = scans[0] ?? null;
  const previousScan = scans[1] ?? null;
  const validationCounts = memory.validations.reduce(
    (counts, validation) => {
      if (validation.timedOut) {
        counts.timedOut += 1;
      } else if (validation.exitCode === 0) {
        counts.passed += 1;
      } else {
        counts.failed += 1;
      }

      return counts;
    },
    { passed: 0, failed: 0, timedOut: 0 }
  );
  const codexRunCounts = (memory.codexRuns ?? []).reduce(
    (counts, run) => {
      if (run.timedOut) {
        counts.timedOut += 1;
      } else if (run.exitCode === 0) {
        counts.passed += 1;
      } else {
        counts.failed += 1;
      }

      return counts;
    },
    { passed: 0, failed: 0, timedOut: 0 }
  );

  return {
    latestScan,
    previousScan,
    scanChange:
      latestScan && previousScan
        ? {
            files: latestScan.files - previousScan.files,
            documents: latestScan.documents - previousScan.documents,
            dirtyEntries: latestScan.dirtyEntries - previousScan.dirtyEntries
          }
        : null,
    validationCounts,
    codexRunCounts
  };
}

export function withProjectMemorySummary(memory: ProjectMemory): ProjectMemoryResponse {
  return {
    ...memory,
    summary: summarizeProjectMemory(memory)
  };
}

function normalizeMemory(slug: string, value: Partial<ProjectMemory>): ProjectMemory {
  return {
    project: {
      slug,
      name: typeof value.project?.name === "string" ? value.project.name : null,
      repoRoot: typeof value.project?.repoRoot === "string" ? value.project.repoRoot : null
    },
    scans: Array.isArray(value.scans) ? value.scans.slice(0, MEMORY_LIMIT) : [],
    validations: Array.isArray(value.validations) ? value.validations.slice(0, MEMORY_LIMIT) : [],
    handoffs: Array.isArray(value.handoffs) ? value.handoffs.slice(0, MEMORY_LIMIT) : [],
    codexRuns: Array.isArray(value.codexRuns) ? value.codexRuns.slice(0, MEMORY_LIMIT) : [],
    notes: Array.isArray(value.notes) ? value.notes.slice(0, MEMORY_LIMIT) : []
  };
}

function emptyMemory(slug: string): ProjectMemory {
  return {
    project: { slug, name: null, repoRoot: null },
    scans: [],
    validations: [],
    handoffs: [],
    codexRuns: [],
    notes: []
  };
}

async function writeProjectMemory(workspaceRoot: string, memory: ProjectMemory): Promise<void> {
  const target = memoryPath(workspaceRoot, memory.project.slug);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(memory, null, 2)}\n`, "utf8");
}

function memoryPath(workspaceRoot: string, slug: string): string {
  return join(workspaceRoot, "memory", slug, "project-memory.json");
}

function limitNewest<T>(items: T[]): T[] {
  return items.slice(0, MEMORY_LIMIT);
}

function requireProjectSlug(value: string): string {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(value)) {
    throw new Error("Project slug is invalid.");
  }

  return value;
}
