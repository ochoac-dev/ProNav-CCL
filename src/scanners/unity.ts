import { readdirSync } from "node:fs";
import { join } from "node:path";
import fg from "fast-glob";
import type { UnityScan } from "../types.js";
import { samplePaths, SCAN_IGNORES } from "./common.js";

export async function scanUnity(unityProjectRoot: string): Promise<UnityScan> {
  const [scenes, prefabs, scripts, resources, projectSettings] = await Promise.all([
    find(unityProjectRoot, ["Assets/**/*.unity"]),
    find(unityProjectRoot, ["Assets/**/*.prefab"]),
    find(unityProjectRoot, ["Assets/**/*.cs"]),
    find(unityProjectRoot, ["Assets/Resources/**/*"]),
    find(unityProjectRoot, ["ProjectSettings/**/*"])
  ]);

  return {
    counts: {
      scenes: scenes.length,
      prefabs: prefabs.length,
      scripts: scripts.length,
      resources: resources.length,
      projectSettings: projectSettings.length
    },
    scenes: samplePaths(scenes, 20),
    prefabs: samplePaths(prefabs, 25),
    scripts: samplePaths(scripts, 30),
    resources: samplePaths(resources, 25),
    projectSettings: samplePaths(projectSettings, 20),
    selDirectories: listSelDirectories(unityProjectRoot)
  };
}

export function emptyUnityScan(): UnityScan {
  return {
    counts: {
      scenes: 0,
      prefabs: 0,
      scripts: 0,
      resources: 0,
      projectSettings: 0
    },
    scenes: [],
    prefabs: [],
    scripts: [],
    resources: [],
    projectSettings: [],
    selDirectories: []
  };
}

async function find(cwd: string, patterns: string[]): Promise<string[]> {
  return fg(patterns, {
    cwd,
    onlyFiles: true,
    dot: true,
    ignore: SCAN_IGNORES
  });
}

function listSelDirectories(unityProjectRoot: string): string[] {
  const selRoot = join(unityProjectRoot, "Assets", "SEL");

  try {
    return readdirSync(selRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => `Assets/SEL/${entry.name}`)
      .sort((a, b) => a.localeCompare(b));
  } catch {
    return [];
  }
}
