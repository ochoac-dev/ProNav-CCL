export interface FeatureArea {
  id: string;
  title: string;
  description: string;
  globs: string[];
  keywords: string[];
  maxFiles: number;
}

export type ProjectType = "auto" | "generic" | "unity" | "node" | "supabase" | "wordpress";

export type DetectedCapability = "git" | "generic" | "unity" | "supabase" | "node" | "wordpress";

export interface ProjectDetection {
  type: Exclude<ProjectType, "auto">;
  detectedCapabilities: DetectedCapability[];
  roots: {
    repoRoot: string;
    unityProjectRoot?: string;
    supabaseRoot?: string;
  };
}

export interface ProjectProfile {
  name: string;
  projectType: ProjectType;
  repoRoot: string;
  unityProjectRoot?: string;
  featureAreas: Record<string, FeatureArea>;
  validationCommands: string[];
  protectedPaths: string[];
}

export interface GitScan {
  branch: string;
  status: string[];
  recentCommits: string[];
  remotes: string[];
}

export interface UnityScan {
  counts: {
    scenes: number;
    prefabs: number;
    scripts: number;
    resources: number;
    projectSettings: number;
  };
  scenes: string[];
  prefabs: string[];
  scripts: string[];
  resources: string[];
  projectSettings: string[];
  selDirectories: string[];
}

export interface SupabaseScan {
  migrationCount: number;
  migrations: string[];
  functionNames: string[];
  docs: string[];
}

export interface DirectoryCount {
  path: string;
  count: number;
}

export interface GenericScan {
  totalFiles: number;
  languageCounts: Record<string, number>;
  scripts?: {
    total: number;
    typeCounts: Record<string, number>;
    samples: string[];
  };
  topDirectories: DirectoryCount[];
  manifests: string[];
  sampleFiles: string[];
}

export interface NodeScan {
  packageJsonPath: string | null;
  packageManager: string | null;
  scripts: string[];
  dependencies: string[];
  devDependencies: string[];
  frameworks: string[];
}

export interface WordPressScan {
  hasWpConfig: boolean;
  contentRoots: string[];
  themes: string[];
  plugins: string[];
}

export interface DocumentFile {
  path: string;
  title: string;
  extension: string;
  sizeBytes: number;
  previewable: boolean;
}

export interface DocumentScan {
  totalDocuments: number;
  previewableDocuments: number;
  files: DocumentFile[];
}

export interface FeatureFile {
  path: string;
  score: number;
  matchedKeywords: string[];
}

export interface FeatureScan {
  id: string;
  title: string;
  description: string;
  totalCandidates: number;
  files: FeatureFile[];
}

export interface ScanResult {
  profile: ProjectProfile;
  detection: ProjectDetection;
  git: GitScan;
  generic: GenericScan;
  unity: UnityScan;
  supabase: SupabaseScan;
  node: NodeScan;
  wordpress: WordPressScan;
  documents: DocumentScan;
  features: Record<string, FeatureScan>;
}
