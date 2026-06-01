import { readFileSync } from "node:fs";
import { join, normalize } from "node:path";
import type { ScanResult } from "../types.js";

export type ExplanationDepth = "builder" | "developer" | "senior";

export interface DepthText {
  builder: string;
  developer: string;
  senior: string;
}

export interface LearningDepthOption {
  id: ExplanationDepth;
  label: string;
  description: string;
}

export interface LearningConcept extends DepthText {
  id: string;
  label: string;
  category: "data-structure" | "algorithm" | "pattern" | "platform";
  description: string;
  paths: string[];
}

export interface LearningFolderExplanation extends DepthText {
  path: string;
  category: string;
  safety: "good-start" | "use-care" | "avoid";
}

export interface LearningFileExplanation extends DepthText {
  path: string;
  category: string;
  audience: string;
  purpose: string;
  conceptIds: string[];
}

export interface LearningValidationExplanation extends DepthText {
  command: string;
}

export interface LearningGuideStep {
  label: string;
  text: string;
  targetSection: "overview" | "features" | "delegate" | "validation" | "history";
}

export interface LearningGuide {
  headline: string;
  intro: string;
  steps: LearningGuideStep[];
  nextAction: LearningGuideStep;
}

export interface AppLearningData {
  depths: LearningDepthOption[];
  guide: LearningGuide;
  projectExplanation: DepthText;
  folderExplanations: Record<string, LearningFolderExplanation>;
  fileExplanations: Record<string, LearningFileExplanation>;
  concepts: LearningConcept[];
  validationExplanations: LearningValidationExplanation[];
}

interface CandidateFile {
  path: string;
  text: string;
  category: string;
}

const DEPTHS: LearningDepthOption[] = [
  {
    id: "builder",
    label: "Builder",
    description: "Plain-language view for people who need the project translated before changing it."
  },
  {
    id: "developer",
    label: "Developer",
    description: "Implementation view for people learning which code, concepts, and checks matter."
  },
  {
    id: "senior",
    label: "Senior",
    description: "Architecture view for experienced engineers reviewing risk, coupling, and validation gaps."
  }
];

const CONCEPT_DEFINITIONS: Array<{
  id: string;
  label: string;
  category: LearningConcept["category"];
  description: string;
  matches: RegExp[];
}> = [
  {
    id: "array-list",
    label: "Array / list",
    category: "data-structure",
    description: "An ordered collection of values, often used for UI rows, queues, inventory, or command lists.",
    matches: [/\[[^\]]*\]/, /\bArray<|\bList<|\.push\(|\.map\(|\.filter\(/i]
  },
  {
    id: "map-dictionary",
    label: "Map / dictionary",
    category: "data-structure",
    description: "A key-value lookup, useful when code needs to find a value by id, name, or state.",
    matches: [/\bnew\s+Map\b|\bMap<|\bDictionary<|\bRecord<|\bdict\(|\.set\(/i]
  },
  {
    id: "queue",
    label: "Queue",
    category: "data-structure",
    description: "A first-in, first-out flow for pending work, events, messages, or ordered actions.",
    matches: [/\bqueue\b|\benqueue\b|\bdequeue\b|\.shift\(|Queue</i]
  },
  {
    id: "state-machine",
    label: "State machine",
    category: "pattern",
    description: "State-based logic where behavior changes depending on values like idle, running, failed, or complete.",
    matches: [/\bstate\b|\bstatus\b|switch\s*\(|\bidle\b|\brunning\b|\bcomplete\b/i]
  },
  {
    id: "sorting",
    label: "Sorting",
    category: "algorithm",
    description: "Ordering data so users, systems, or validations can process it predictably.",
    matches: [/\.sort\(|\bsorted\(|order\s+by/i]
  },
  {
    id: "searching-filtering",
    label: "Searching / filtering",
    category: "algorithm",
    description: "Finding matching records, files, UI rows, or data entries from a larger set.",
    matches: [/\.find\(|\.filter\(|\bwhere\b|\bselect\b.+\bfrom\b/i]
  },
  {
    id: "sql-function",
    label: "SQL function",
    category: "platform",
    description: "Database-side behavior, often important because it can affect stored data and backend contracts.",
    matches: [/create\s+(or\s+replace\s+)?function|returns\s+\w+|language\s+plpgsql/i]
  },
  {
    id: "api-route",
    label: "API route",
    category: "platform",
    description: "A server boundary where user actions or frontend screens talk to backend behavior.",
    matches: [/\/api\/|app\.(get|post|put|delete)\(|router\.(get|post|put|delete)\(|fetch\(/i]
  },
  {
    id: "event-handler",
    label: "Event handler",
    category: "pattern",
    description: "Code that responds to clicks, taps, input changes, lifecycle events, or messages.",
    matches: [/addEventListener|onClick|onclick|IBAction|Button|clicked|submit/i]
  },
  {
    id: "ui-component",
    label: "UI component",
    category: "pattern",
    description: "A reusable screen or interface piece that shapes what users see and do.",
    matches: [/tsx?$|jsx?$|React|Component|View|Screen|UI|\.prefab|\.unity/i]
  },
  {
    id: "test",
    label: "Automated test",
    category: "pattern",
    description: "Code or commands that prove behavior still works after a change.",
    matches: [/(\b|\/)(test|tests|spec|__tests__)(\/|\b)|vitest|jest|playwright|cypress|expect\(/i]
  },
  {
    id: "migration",
    label: "Database migration",
    category: "platform",
    description: "A database structure or behavior change that should be reviewed carefully before shipping.",
    matches: [/migration|migrations|alter\s+table|create\s+table|create\s+policy/i]
  }
];

export function buildLearningData(scan: ScanResult): AppLearningData {
  const candidates = collectCandidateFiles(scan);
  const concepts = detectConcepts(scan, candidates);

  return {
    depths: DEPTHS,
    guide: buildLearningGuide(scan, concepts),
    projectExplanation: projectExplanationFor(scan, concepts),
    folderExplanations: buildFolderExplanations(scan),
    fileExplanations: buildFileExplanations(scan, candidates, concepts),
    concepts,
    validationExplanations: scan.profile.validationCommands.map((command) => validationExplanationFor(command))
  };
}

function buildLearningGuide(scan: ScanResult, concepts: LearningConcept[]): LearningGuide {
  const hasFolders = scan.generic.topDirectories.length > 0 || Object.keys(scan.features).length > 0;
  const hasValidation = scan.profile.validationCommands.length > 0;
  const conceptHint = concepts.length
    ? `ProNav also found ${concepts.slice(0, 3).map((concept) => concept.label).join(", ")} as topics worth learning gradually.`
    : "ProNav will suggest code concepts after it finds strong local signals.";

  return {
    headline: "Start here",
    intro: `Use this scan in small steps: understand the project, inspect one area, then validate any change. ${conceptHint}`,
    steps: [
      {
        label: "Understand",
        text: "Read what the project is before asking AI to edit it.",
        targetSection: "overview"
      },
      {
        label: hasFolders ? "Browse one area" : "Find one area",
        text: "Pick one folder, file, or feature instead of trying to read everything.",
        targetSection: "features"
      },
      {
        label: hasValidation ? "Validate" : "Plan proof",
        text: hasValidation
          ? "Use the recommended checks before trusting a code change."
          : "Decide what proof would make a future change safe to trust.",
        targetSection: "validation"
      }
    ],
    nextAction: {
      label: "Explore one folder",
      text: "Open Browse and choose one safe starting area before creating a task.",
      targetSection: "features"
    }
  };
}

function collectCandidateFiles(scan: ScanResult): CandidateFile[] {
  const scriptSamples = scan.generic.scripts?.samples ?? [];
  const paths = unique([
    ...scriptSamples,
    ...scan.generic.sampleFiles,
    ...scan.documents.files.map((file) => file.path),
    ...scan.supabase.migrations,
    ...scan.unity.scripts,
    ...scan.unity.scenes,
    ...Object.values(scan.features).flatMap((feature) => feature.files.map((file) => file.path))
  ]).slice(0, 120);

  return paths.map((path) => ({
    path,
    text: readLocalSnippet(scan.profile.repoRoot, path),
    category: fileCategory(path, scan)
  }));
}

function readLocalSnippet(repoRoot: string, relativePath: string): string {
  const normalized = normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, "");
  try {
    return readFileSync(join(repoRoot, normalized), "utf8").slice(0, 12_000);
  } catch {
    return relativePath;
  }
}

function detectConcepts(scan: ScanResult, candidates: CandidateFile[]): LearningConcept[] {
  const pathsByConcept = new Map<string, Set<string>>();

  for (const candidate of candidates) {
    const haystack = `${candidate.path}\n${candidate.text}`;
    for (const definition of CONCEPT_DEFINITIONS) {
      if (definition.id === "sql-function" && !isSqlCandidate(candidate.path)) continue;
      if (definition.id === "migration" && !isSqlCandidate(candidate.path)) continue;
      if (definition.matches.some((pattern) => pattern.test(haystack))) {
        upsertPath(pathsByConcept, definition.id, candidate.path);
      }
    }
  }

  if (scan.supabase.functionNames.length > 0) {
    for (const path of scan.supabase.migrations) upsertPath(pathsByConcept, "sql-function", path);
  }
  for (const path of scan.supabase.migrations) upsertPath(pathsByConcept, "migration", path);

  return CONCEPT_DEFINITIONS
    .filter((definition) => pathsByConcept.has(definition.id))
    .map((definition) => {
      const paths = [...(pathsByConcept.get(definition.id) ?? new Set<string>())].slice(0, 8);
      return {
        id: definition.id,
        label: definition.label,
        category: definition.category,
        description: definition.description,
        paths,
        builder: `${definition.label}: ${definition.description}`,
        developer: `${definition.label} appears in ${paths.slice(0, 3).join(", ")}. Inspect those files to see how the project uses this concept.`,
        senior: `${definition.label} is a ${definition.category} signal. Review coupling, state ownership, and validation around ${paths[0] ?? "the matched files"}.`
      };
    });
}

function buildFolderExplanations(scan: ScanResult): Record<string, LearningFolderExplanation> {
  const entries = scan.generic.topDirectories.map((directory) => {
    const category = folderCategory(directory.path, scan);
    const safety = category === "generated" ? "avoid" : category === "database" || category === "config" ? "use-care" : "good-start";
    return [
      directory.path,
      {
        path: directory.path,
        category,
        safety,
        builder: `This folder is part of the project map. It has ${directory.count} scanned file(s), so it is a useful place to understand what the project contains.`,
        developer: `The ${directory.path} folder is classified as ${category}. Use it to trace source files, tests, config, or platform behavior before editing.`,
        senior: `Senior view: ${directory.path} may affect ${category} ownership. Check blast radius, validation coverage, and whether edits belong in this boundary.`
      } satisfies LearningFolderExplanation
    ] as const;
  });

  return Object.fromEntries(entries);
}

function buildFileExplanations(
  scan: ScanResult,
  candidates: CandidateFile[],
  concepts: LearningConcept[]
): Record<string, LearningFileExplanation> {
  const conceptIdsByPath = new Map<string, string[]>();
  for (const concept of concepts) {
    for (const path of concept.paths) {
      conceptIdsByPath.set(path, [...(conceptIdsByPath.get(path) ?? []), concept.id]);
    }
  }

  const paths = unique([
    ...candidates.map((candidate) => candidate.path),
    ...scan.documents.files.map((file) => file.path),
    ...Object.values(scan.features).flatMap((feature) => feature.files.map((file) => file.path))
  ]);

  return Object.fromEntries(
    paths.map((path) => {
      const category = fileCategory(path, scan);
      const conceptIds = conceptIdsByPath.get(path) ?? [];
      const conceptText = conceptIds.length ? ` It shows concepts like ${conceptIds.map(labelForConcept).join(", ")}.` : "";
      return [
        path,
        {
          path,
          category,
          audience: audienceForFile(path, category),
          purpose: purposeForFile(path, category),
          conceptIds,
          builder: `${path} is a ${category} file. ${purposeForFile(path, category)}${conceptText}`,
          developer: `${path} is useful when tracing ${category} behavior. Read nearby imports, functions, and tests before changing it.${conceptText}`,
          senior: `${path} is a ${category} signal. Review ownership, coupling, validation coverage, and blast radius before approving edits.`
        } satisfies LearningFileExplanation
      ] as const;
    })
  );
}

function projectExplanationFor(scan: ScanResult, concepts: LearningConcept[]): DepthText {
  const type = displayProjectType(scan.detection.type);
  const conceptNames = concepts.slice(0, 6).map((concept) => concept.label).join(", ") || "no strong code concepts yet";
  return {
    builder: `This is the plain-language view of ${scan.profile.name}. ProNav found a ${type} project, ${scan.generic.totalFiles} files, and ${scan.documents.totalDocuments} document(s). Start here to understand what exists before asking AI to change it.`,
    developer: `Developer view: this ${type} project is organized around source folders, documents, validation commands, and detected concepts such as ${conceptNames}. Use these signals to decide which files to inspect first.`,
    senior: `Senior view: review architecture risk through dirty git state, protected paths, backend/database signals, validation coverage, and blast radius before approving AI-generated edits.`
  };
}

function validationExplanationFor(command: string): LearningValidationExplanation {
  const normalized = command.toLowerCase();
  if (/git\b.*status\b.*--short/.test(normalized)) {
    return {
      command,
      builder: "Shows which files changed so you can see whether the coding tool touched anything unexpected.",
      developer: "Use this before and after AI work to compare changed, staged, and untracked files.",
      senior: "dirty-tree guard: this identifies unrelated edits, review scope drift, and files that may need separate commits."
    };
  }
  if (/npm\b.*test|vitest|jest|playwright|cypress/.test(normalized)) {
    return {
      command,
      builder: "Runs automated tests so you can see whether expected behavior still works.",
      developer: "Use this to catch logic, component, API, and regression failures after edits.",
      senior: "Behavioral confidence check: useful coverage signal, but still review changed-file scope and untested integration risk."
    };
  }
  if (/build|tsc|xcodebuild|unity|dotnet/.test(normalized)) {
    return {
      command,
      builder: "Checks whether the project can still compile or package after changes.",
      developer: "Use this to catch import, type, bundling, compiler, or platform setup failures.",
      senior: "Release-readiness signal: confirms compile path, but does not prove product behavior or runtime data safety."
    };
  }
  if (/supabase/.test(normalized)) {
    return {
      command,
      builder: "Checks Supabase project state before trusting database or backend changes.",
      developer: "Use this to verify migration or backend configuration state before shipping.",
      senior: "Database risk control: pair this with migration review, rollback thinking, and data-contract checks."
    };
  }

  return {
    command,
    builder: "Runs a project-specific check that helps prove the work is safer to trust.",
    developer: "Use this command as part of the proof that the changed area still behaves correctly.",
    senior: "Validation signal: inspect what this command covers, what it omits, and whether more focused checks are needed."
  };
}

function fileCategory(path: string, scan: ScanResult): string {
  const lower = path.toLowerCase();
  if (/node_modules|dist|build|coverage|library|temp/.test(lower)) return "generated";
  if (/test|spec|__tests__/.test(lower)) return "test";
  if (/migration|\.sql$|supabase/.test(lower)) return "database";
  if (/readme|docs?\/|\.md$/.test(lower)) return "documentation";
  if (/package\.json|tsconfig|config|settings|\.ya?ml$|\.json$/.test(lower)) return "config";
  if (/\.(png|jpg|jpeg|gif|webp|svg|prefab|unity|asset)$/.test(lower)) return scan.detection.type === "unity" ? "asset or scene" : "asset";
  if (/\.(ts|tsx|js|jsx|cs|py|go|rs|swift|php|rb)$/.test(lower)) return "source";
  return "project";
}

function isSqlCandidate(path: string): boolean {
  return /\.sql$/i.test(path) || /supabase|migration/i.test(path);
}

function folderCategory(path: string, scan: ScanResult): string {
  const lower = path.toLowerCase();
  if (/node_modules|dist|build|coverage|library|temp|release|reports|handoffs|memory/.test(lower)) return "generated";
  if (/supabase|database|migration/.test(lower)) return "database";
  if (/test|spec|e2e/.test(lower)) return "test";
  if (/docs?|notes|guides/.test(lower)) return "documentation";
  if (/config|settings|packages|\.github/.test(lower)) return "config";
  if (/assets|public|static|images|media/.test(lower)) return scan.detection.type === "unity" ? "asset or scene" : "asset";
  if (/src|source|scripts|app|pages|components|ui|views/.test(lower)) return "source";
  return "project";
}

function audienceForFile(path: string, category: string): string {
  if (category === "documentation") return "builders and developers";
  if (category === "database") return "backend developers and senior reviewers";
  if (category === "test") return "developers validating changes";
  if (category === "config") return "developers changing setup or tooling";
  return path.includes("UI") || path.includes("Screen") ? "builders planning visible behavior" : "developers inspecting implementation";
}

function purposeForFile(path: string, category: string): string {
  if (category === "documentation") return "It explains decisions, setup, or project context.";
  if (category === "database") return "It can affect stored data, SQL behavior, or backend contracts.";
  if (category === "test") return "It helps prove behavior still works after changes.";
  if (category === "config") return "It controls setup, tooling, dependencies, or build behavior.";
  if (category === "asset or scene") return "It shapes visible app or game behavior through scenes, prefabs, or assets.";
  if (category === "source") return "It likely contains app logic, UI behavior, or shared implementation.";
  return "It is part of the scanned project context.";
}

function labelForConcept(id: string): string {
  return CONCEPT_DEFINITIONS.find((concept) => concept.id === id)?.label ?? id;
}

function displayProjectType(type: string): string {
  switch (type) {
    case "unity":
      return "Unity";
    case "node":
      return "Node";
    case "supabase":
      return "Supabase";
    case "wordpress":
      return "WordPress";
    default:
      return "generic code";
  }
}

function upsertPath(map: Map<string, Set<string>>, id: string, path: string): void {
  if (!path) return;
  const paths = map.get(id) ?? new Set<string>();
  paths.add(path);
  map.set(id, paths);
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}
