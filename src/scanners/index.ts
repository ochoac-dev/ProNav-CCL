import type { DetectedCapability, ProjectProfile, ScanResult } from "../types.js";
import { detectProject } from "../project/detect.js";
import { emptyDocumentScan, scanDocuments } from "./documents.js";
import { scanFeatures } from "./feature.js";
import { emptyGenericScan, scanGeneric } from "./generic.js";
import { scanGit } from "./git.js";
import { emptyNodeScan, scanNode } from "./node.js";
import { emptySupabaseScan, scanSupabase } from "./supabase.js";
import { emptyUnityScan, scanUnity } from "./unity.js";
import { emptyWordPressScan, scanWordPress } from "./wordpress.js";

export async function collectScan(profile: ProjectProfile): Promise<ScanResult> {
  const detection = detectProject(profile.repoRoot, {
    projectType: profile.projectType,
    unityProjectRoot: profile.unityProjectRoot
  });
  const hasCapability = (capability: DetectedCapability) => detection.detectedCapabilities.includes(capability);

  const [generic, documents, unity, supabase, features] = await Promise.all([
    scanGeneric(profile.repoRoot).catch(() => emptyGenericScan()),
    scanDocuments(profile.repoRoot).catch(() => emptyDocumentScan()),
    hasCapability("unity") && detection.roots.unityProjectRoot
      ? scanUnity(detection.roots.unityProjectRoot)
      : Promise.resolve(emptyUnityScan()),
    hasCapability("supabase") && detection.roots.supabaseRoot
      ? scanSupabase(detection.roots.supabaseRoot)
      : Promise.resolve(emptySupabaseScan()),
    scanFeatures(profile)
  ]);

  return {
    profile,
    detection,
    git: hasCapability("git") ? scanGit(profile.repoRoot) : { branch: "(not a git repository)", status: [], recentCommits: [], remotes: [] },
    generic,
    documents,
    unity,
    supabase,
    node: hasCapability("node") ? scanNode(profile.repoRoot) : emptyNodeScan(),
    wordpress: hasCapability("wordpress") ? scanWordPress(profile.repoRoot) : emptyWordPressScan(),
    features
  };
}
