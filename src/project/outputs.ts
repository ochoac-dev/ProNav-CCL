import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { buildAppData, type ProNavAppData, slugify } from "../app/appData.js";
import { renderAppHtml, renderAppScript, renderAppStyles } from "../app/staticApp.js";
import { renderPlainOverview, renderTechnicalMap } from "../reporters/markdown.js";
import type { ProjectProfile, ScanResult } from "../types.js";

export interface WriteProjectOutputsOptions {
  workspaceRoot?: string;
  writeStaticApp?: boolean;
  reportPathPrefix?: string;
}

export interface ProjectOutputResult {
  slug: string;
  data: ProNavAppData;
  reportPaths: {
    plain: string;
    technical: string;
  };
  appDataPath: string;
  appIndexPath?: string;
}

export async function writeProjectOutputs(
  profile: ProjectProfile,
  scan: ScanResult,
  options: WriteProjectOutputsOptions = {}
): Promise<ProjectOutputResult> {
  const workspaceRoot = resolve(options.workspaceRoot ?? process.cwd());
  const slug = slugify(profile.name);
  const reportRoot = join(workspaceRoot, "reports", slug);
  const appRoot = join(workspaceRoot, "app", slug);
  const data = buildAppData(scan, new Date().toISOString(), options.reportPathPrefix ?? "../../reports");
  const plain = join(reportRoot, "plain-overview.md");
  const technical = join(reportRoot, "technical-map.md");
  const appDataPath = join(appRoot, "data.json");

  await Promise.all([
    writeText(plain, renderPlainOverview(scan)),
    writeText(technical, renderTechnicalMap(scan)),
    writeText(appDataPath, JSON.stringify(data, null, 2))
  ]);

  let appIndexPath: string | undefined;
  if (options.writeStaticApp) {
    appIndexPath = join(appRoot, "index.html");
    await Promise.all([
      writeText(appIndexPath, renderAppHtml(profile.name, data)),
      writeText(join(appRoot, "styles.css"), renderAppStyles()),
      writeText(join(appRoot, "app.js"), renderAppScript())
    ]);
  }

  return {
    slug,
    data,
    reportPaths: { plain, technical },
    appDataPath,
    appIndexPath
  };
}

async function writeText(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${content.trimEnd()}\n`, "utf8");
}

export function displayPath(path: string, cwd = process.cwd()): string {
  return relative(cwd, path);
}
