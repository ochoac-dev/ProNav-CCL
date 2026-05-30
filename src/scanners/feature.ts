import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import fg from "fast-glob";
import type { FeatureArea, FeatureFile, FeatureScan, ProjectProfile } from "../types.js";
import { compactText, SCAN_IGNORES, uniqueSorted } from "./common.js";

const TEXT_EXTENSIONS = /\.(cs|asset|prefab|unity|sql|md|json|ya?ml|txt|ts|tsx|js|jsx|php|css|html)$/i;

export async function scanFeatures(profile: ProjectProfile): Promise<Record<string, FeatureScan>> {
  const scanRoot = profile.unityProjectRoot ?? profile.repoRoot;
  const entries = await Promise.all(
    Object.values(profile.featureAreas).map(async (area) => [area.id, await scanFeature(scanRoot, area)] as const)
  );

  return Object.fromEntries(entries);
}

async function scanFeature(scanRoot: string, area: FeatureArea): Promise<FeatureScan> {
  const candidates = uniqueSorted(
    await fg(area.globs, {
      cwd: scanRoot,
      onlyFiles: true,
      dot: true,
      ignore: SCAN_IGNORES
    })
  );
  const files = candidates
    .map((candidate) => scoreFeatureFile(scanRoot, candidate, area.keywords))
    .filter((file): file is FeatureFile => file !== null)
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
    .slice(0, area.maxFiles);

  return {
    id: area.id,
    title: area.title,
    description: area.description,
    totalCandidates: candidates.length,
    files
  };
}

function scoreFeatureFile(scanRoot: string, relativePath: string, keywords: string[]): FeatureFile | null {
  const fullPath = join(scanRoot, relativePath);
  const pathText = relativePath.toLowerCase();
  const compactPath = compactText(relativePath);
  const matched = new Set<string>();
  let score = 0;

  for (const keyword of keywords) {
    const normalized = keyword.toLowerCase();
    const compactKeyword = compactText(keyword);
    if (pathText.includes(normalized) || compactPath.includes(compactKeyword)) {
      matched.add(keyword);
      score += 4;
    }
  }

  const content = readTextIfSafe(fullPath);
  if (content) {
    const lowerContent = content.toLowerCase();
    const compactContent = compactText(content);
    for (const keyword of keywords) {
      if (matched.has(keyword)) {
        continue;
      }

      const normalized = keyword.toLowerCase();
      const compactKeyword = compactText(keyword);
      if (lowerContent.includes(normalized) || compactContent.includes(compactKeyword)) {
        matched.add(keyword);
        score += 1;
      }
    }
  }

  if (score === 0) {
    return null;
  }

  return {
    path: relativePath,
    score,
    matchedKeywords: [...matched].sort((a, b) => a.localeCompare(b))
  };
}

function readTextIfSafe(filePath: string): string | null {
  if (!TEXT_EXTENSIONS.test(filePath)) {
    return null;
  }

  try {
    if (statSync(filePath).size > 750_000) {
      return null;
    }

    return readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}
