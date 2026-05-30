import { readFile, stat } from "node:fs/promises";
import { basename, extname, resolve } from "node:path";
import fg from "fast-glob";
import type { DocumentFile, DocumentScan } from "../types.js";
import { SCAN_IGNORES } from "./common.js";

const DOCUMENT_PATTERNS = [
  "README*",
  "*.md",
  "*.txt",
  "*.sql",
  "*.json",
  "*.ya?ml",
  "*.csv",
  "Docs/**/*",
  "docs/**/*",
  "*/Docs/**/*",
  "*/docs/**/*"
];

const PREVIEWABLE_EXTENSIONS = new Set(["", ".md", ".txt", ".sql", ".json", ".yaml", ".yml", ".csv", ".log"]);
const LISTABLE_EXTENSIONS = new Set([...PREVIEWABLE_EXTENSIONS, ".pdf", ".doc", ".docx", ".rtf"]);
const MAX_PREVIEW_BYTES = 200_000;

export async function scanDocuments(repoRoot: string): Promise<DocumentScan> {
  const candidates = await fg(DOCUMENT_PATTERNS, {
    cwd: repoRoot,
    onlyFiles: true,
    dot: true,
    unique: true,
    ignore: SCAN_IGNORES
  });

  const files = (
    await Promise.all(
      candidates
        .filter((path) => isListableDocument(path))
        .map(async (path): Promise<DocumentFile | null> => {
          try {
            const info = await stat(resolve(repoRoot, path));
            return {
              path,
              title: titleFromPath(path),
              extension: extname(path).toLowerCase(),
              sizeBytes: info.size,
              previewable: isPreviewableDocument(path) && info.size <= MAX_PREVIEW_BYTES
            };
          } catch {
            return null;
          }
        })
    )
  )
    .filter((file): file is DocumentFile => file !== null)
    .sort(rankDocument);

  return {
    totalDocuments: files.length,
    previewableDocuments: files.filter((file) => file.previewable).length,
    files: files.slice(0, 250)
  };
}

export function emptyDocumentScan(): DocumentScan {
  return {
    totalDocuments: 0,
    previewableDocuments: 0,
    files: []
  };
}

export async function readDocumentText(
  repoRoot: string,
  relativePath: string,
  maxBytes = MAX_PREVIEW_BYTES
): Promise<{ path: string; content: string; truncated: boolean }> {
  const normalizedPath = normalizeRelativePath(relativePath);
  const root = resolve(repoRoot);
  const target = resolve(root, normalizedPath);

  if (target !== root && !target.startsWith(`${root}/`)) {
    throw new Error("Requested document path is outside the scanned repo.");
  }

  if (!isPreviewableDocument(normalizedPath)) {
    throw new Error(`Document is not text-previewable: ${normalizedPath}`);
  }

  const info = await stat(target);
  if (!info.isFile()) {
    throw new Error(`Document path is not a file: ${normalizedPath}`);
  }

  const bytes = await readFile(target);
  const truncated = bytes.length > maxBytes;
  return {
    path: normalizedPath,
    content: bytes.subarray(0, maxBytes).toString("utf8"),
    truncated
  };
}

function normalizeRelativePath(path: string): string {
  return path.replaceAll("\\", "/").replace(/^\/+/, "");
}

function isListableDocument(path: string): boolean {
  if (basename(path).toLowerCase().startsWith("readme")) {
    return true;
  }

  return LISTABLE_EXTENSIONS.has(extname(path).toLowerCase());
}

function isPreviewableDocument(path: string): boolean {
  if (basename(path).toLowerCase().startsWith("readme") && extname(path) === "") {
    return true;
  }

  return PREVIEWABLE_EXTENSIONS.has(extname(path).toLowerCase());
}

function titleFromPath(path: string): string {
  return basename(path, extname(path))
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function rankDocument(a: DocumentFile, b: DocumentFile): number {
  return documentScore(b.path) - documentScore(a.path) || a.path.localeCompare(b.path);
}

function documentScore(path: string): number {
  const lower = path.toLowerCase();
  let score = 0;
  if (basename(lower).startsWith("readme")) score += 100;
  if (lower.startsWith("docs/")) score += 50;
  if (lower.endsWith(".md")) score += 20;
  if (lower.endsWith(".sql")) score += 10;
  if (lower.includes("supabase")) score += 5;
  return score;
}
