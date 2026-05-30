export const SCAN_IGNORES = [
  "**/.git/**",
  "**/.utmp/**",
  "**/Library/**",
  "**/Temp/**",
  "**/Builds/**",
  "**/Logs/**",
  "**/UserSettings/**",
  "**/node_modules/**",
  "Assets/_Recovery/**",
  "Assets/TextMesh Pro/Examples & Extras/**",
  "Assets/Samples/**"
];

export function splitLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function compactText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function uniqueSorted(values: Iterable<string>): string[] {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

export function samplePaths(paths: string[], limit = 20): string[] {
  return [...paths].sort(rankPath).slice(0, limit);
}

function rankPath(a: string, b: string): number {
  return scorePath(b) - scorePath(a) || a.localeCompare(b);
}

function scorePath(value: string): number {
  let score = 0;
  if (value.includes("Runners_Main")) score += 50;
  if (value.startsWith("Assets/SEL/")) score += 30;
  if (value.startsWith("Assets/Resources/SEL/")) score += 25;
  if (value.startsWith("Docs/Supabase/")) score += 20;
  if (value.startsWith("ProjectSettings/")) score += 10;
  if (value.includes("TextMesh Pro/Examples")) score -= 40;
  if (value.includes("_Recovery/")) score -= 40;
  return score;
}
