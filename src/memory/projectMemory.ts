import { randomUUID } from "node:crypto";
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
  projectBrain: ProjectBrainEntry[];
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
  projectBrainCounts: Record<ProjectBrainStatus, number>;
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
  changedFiles: string[];
}

export interface ProjectNote {
  createdAt: string;
  text: string;
}

export type ProjectBrainKind = "module-card" | "decision" | "constraint-risk" | "open-question";
export type ProjectBrainStatus = "draft" | "approved" | "pinned" | "deprecated";
export type ProjectBrainSource = "user" | "scan-draft" | "handoff" | "codex-run";
export type ProjectBrainStatusAction = "approve" | "pin" | "unpin" | "deprecate";

export interface ProjectBrainEntry {
  id: string;
  kind: ProjectBrainKind;
  status: ProjectBrainStatus;
  source: ProjectBrainSource;
  title: string;
  body: string;
  scope: string | null;
  paths: string[];
  conceptIds: string[];
  createdAt: string;
  updatedAt: string;
  approvedAt: string | null;
}

export interface ProjectBrainEntryInput {
  id?: string;
  kind: ProjectBrainKind;
  title: string;
  body: string;
  scope?: string | null;
  paths?: string[];
  conceptIds?: string[];
  source?: ProjectBrainSource;
}

export interface ProjectBrainStatusInput {
  id: string;
  action: ProjectBrainStatusAction;
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

export async function draftProjectBrainEntry(
  workspaceRoot: string,
  projectSlug: string,
  input: ProjectBrainEntryInput
): Promise<ProjectBrainEntry> {
  return addOrUpdateProjectBrainEntry(workspaceRoot, projectSlug, {
    ...input,
    source: input.source ?? "scan-draft"
  });
}

export async function addOrUpdateProjectBrainEntry(
  workspaceRoot: string,
  projectSlug: string,
  input: ProjectBrainEntryInput
): Promise<ProjectBrainEntry> {
  const slug = requireProjectSlug(projectSlug);
  const title = input.title.trim();
  const body = input.body.trim();
  if (!title) throw new Error("Project Brain title is required.");
  if (!body) throw new Error("Project Brain body is required.");

  const memory = await readProjectMemory(workspaceRoot, slug);
  const now = new Date().toISOString();
  const existingIndex = input.id ? memory.projectBrain.findIndex((entry) => entry.id === input.id) : -1;
  const existing = existingIndex >= 0 ? memory.projectBrain[existingIndex] : null;
  const entry: ProjectBrainEntry = {
    id: existing?.id ?? input.id ?? createBrainEntryId(input.kind),
    kind: requireProjectBrainKind(input.kind),
    status: existing?.status ?? "draft",
    source: requireProjectBrainSource(input.source ?? existing?.source ?? "user"),
    title,
    body,
    scope: normalizeOptionalText(input.scope),
    paths: normalizeStringList(input.paths),
    conceptIds: normalizeStringList(input.conceptIds),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    approvedAt: existing?.approvedAt ?? null
  };

  if (existingIndex >= 0) {
    memory.projectBrain[existingIndex] = entry;
  } else {
    memory.projectBrain = limitNewest([entry, ...memory.projectBrain]);
  }
  await writeProjectMemory(workspaceRoot, memory);
  return entry;
}

export async function updateProjectBrainStatus(
  workspaceRoot: string,
  projectSlug: string,
  input: ProjectBrainStatusInput
): Promise<ProjectBrainEntry> {
  const slug = requireProjectSlug(projectSlug);
  const memory = await readProjectMemory(workspaceRoot, slug);
  const index = memory.projectBrain.findIndex((entry) => entry.id === input.id);
  if (index < 0) throw new Error("Project Brain entry was not found.");

  const now = new Date().toISOString();
  const entry = { ...memory.projectBrain[index] };
  switch (requireProjectBrainStatusAction(input.action)) {
    case "approve":
      entry.status = "approved";
      entry.approvedAt = entry.approvedAt ?? now;
      break;
    case "pin":
      entry.status = "pinned";
      entry.approvedAt = entry.approvedAt ?? now;
      break;
    case "unpin":
      entry.status = "approved";
      entry.approvedAt = entry.approvedAt ?? now;
      break;
    case "deprecate":
      entry.status = "deprecated";
      break;
  }
  entry.updatedAt = now;
  memory.projectBrain[index] = entry;
  await writeProjectMemory(workspaceRoot, memory);
  return entry;
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
  const projectBrainCounts = memory.projectBrain.reduce(
    (counts, entry) => {
      counts[entry.status] += 1;
      return counts;
    },
    { draft: 0, approved: 0, pinned: 0, deprecated: 0 } as Record<ProjectBrainStatus, number>
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
    codexRunCounts,
    projectBrainCounts
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
    codexRuns: Array.isArray(value.codexRuns)
      ? value.codexRuns.slice(0, MEMORY_LIMIT).map((run) => ({
          ...run,
          changedFiles: Array.isArray(run.changedFiles) ? run.changedFiles : []
        }))
      : [],
    projectBrain: Array.isArray(value.projectBrain)
      ? value.projectBrain.slice(0, MEMORY_LIMIT).map(normalizeBrainEntry).filter((entry): entry is ProjectBrainEntry => entry !== null)
      : [],
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
    projectBrain: [],
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

function createBrainEntryId(kind: ProjectBrainKind): string {
  return `${kind}-${randomUUID().slice(0, 8)}`;
}

function normalizeBrainEntry(value: unknown): ProjectBrainEntry | null {
  if (!value || typeof value !== "object") return null;
  const entry = value as Partial<ProjectBrainEntry>;
  const id = typeof entry.id === "string" && entry.id.trim() ? entry.id.trim() : createBrainEntryId(requireProjectBrainKind(entry.kind));
  const title = typeof entry.title === "string" && entry.title.trim() ? entry.title.trim() : "Untitled Project Brain entry";
  const body = typeof entry.body === "string" ? entry.body.trim() : "";
  if (!body) return null;

  return {
    id,
    kind: requireProjectBrainKind(entry.kind),
    status: requireProjectBrainStatus(entry.status),
    source: requireProjectBrainSource(entry.source),
    title,
    body,
    scope: normalizeOptionalText(entry.scope),
    paths: normalizeStringList(entry.paths),
    conceptIds: normalizeStringList(entry.conceptIds),
    createdAt: typeof entry.createdAt === "string" ? entry.createdAt : new Date().toISOString(),
    updatedAt: typeof entry.updatedAt === "string" ? entry.updatedAt : new Date().toISOString(),
    approvedAt: typeof entry.approvedAt === "string" ? entry.approvedAt : null
  };
}

function normalizeOptionalText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeStringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean).slice(0, 20)
    : [];
}

function requireProjectBrainKind(value: unknown): ProjectBrainKind {
  if (value === "module-card" || value === "decision" || value === "constraint-risk" || value === "open-question") return value;
  return "module-card";
}

function requireProjectBrainStatus(value: unknown): ProjectBrainStatus {
  if (value === "draft" || value === "approved" || value === "pinned" || value === "deprecated") return value;
  return "draft";
}

function requireProjectBrainSource(value: unknown): ProjectBrainSource {
  if (value === "user" || value === "scan-draft" || value === "handoff" || value === "codex-run") return value;
  return "user";
}

function requireProjectBrainStatusAction(value: unknown): ProjectBrainStatusAction {
  if (value === "approve" || value === "pin" || value === "unpin" || value === "deprecate") return value;
  throw new Error("Project Brain status action is invalid.");
}
