import { readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import fg from "fast-glob";
import type { SupabaseScan } from "../types.js";
import { SCAN_IGNORES, uniqueSorted } from "./common.js";

const FUNCTION_PATTERN =
  /create\s+(?:or\s+replace\s+)?function\s+((?:"?[A-Za-z_][\w$]*"?\.)?"?[A-Za-z_][\w$]*"?)\s*\(/gi;

export async function scanSupabase(unityProjectRoot: string): Promise<SupabaseScan> {
  const [migrations, docs] = await Promise.all([
    fg(["supabase/migrations/*.sql"], {
      cwd: unityProjectRoot,
      onlyFiles: true,
      dot: true,
      ignore: SCAN_IGNORES
    }),
    fg(["Docs/Supabase/**/*.{sql,md}"], {
      cwd: unityProjectRoot,
      onlyFiles: true,
      dot: true,
      ignore: SCAN_IGNORES
    })
  ]);

  const functionNames = uniqueSorted(migrations.flatMap((file) => extractFunctionNames(join(unityProjectRoot, file))));

  return {
    migrationCount: migrations.length,
    migrations: migrations.sort((a, b) => a.localeCompare(b)),
    functionNames,
    docs: docs.sort((a, b) => a.localeCompare(b))
  };
}

export function emptySupabaseScan(): SupabaseScan {
  return {
    migrationCount: 0,
    migrations: [],
    functionNames: [],
    docs: []
  };
}

function extractFunctionNames(filePath: string): string[] {
  if (statSync(filePath).size > 1_000_000) {
    return [];
  }

  const sql = readFileSync(filePath, "utf8");
  const names: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = FUNCTION_PATTERN.exec(sql)) !== null) {
    names.push(match[1].replaceAll('"', ""));
  }

  return names;
}
