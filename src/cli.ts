#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { Command } from "commander";
import { loadProfile } from "./profile.js";
import { createGeneratedProfile } from "./project/profileGenerator.js";
import { displayPath, writeProjectOutputs } from "./project/outputs.js";
import { renderPlainOverview, renderRefactorPacket, renderTechnicalMap } from "./reporters/markdown.js";
import { collectScan } from "./scanners/index.js";
import { startLocalServer } from "./server/localServer.js";

const program = new Command();

program
  .name("pronav")
  .description("Read-only project navigator and Markdown report generator.")
  .version("0.1.0");

program
  .command("init")
  .description("Create or update a generated profile for a local repo.")
  .requiredOption("--repo <path>", "Local repository path to scan read-only")
  .option("--name <name>", "Display/project name")
  .option("--project-type <type>", "Project type: auto, generic, unity, node, supabase, wordpress", "auto")
  .action(async (options: { repo: string; name?: string; projectType: string }) => {
    const generated = await createGeneratedProfile({
      repoRoot: options.repo,
      name: options.name,
      projectType: parseProjectTypeOption(options.projectType)
    });

    console.log(`Wrote ${relative(process.cwd(), generated.profilePath)}`);
  });

program
  .command("scan")
  .description("Generate a plain-language or technical project scan report.")
  .requiredOption("--profile <path>", "YAML project profile")
  .requiredOption("--mode <mode>", "Report mode: plain or technical")
  .action(async (options: { profile: string; mode: string }) => {
    if (options.mode !== "plain" && options.mode !== "technical") {
      throw new Error(`Unsupported scan mode '${options.mode}'. Use 'plain' or 'technical'.`);
    }

    const profile = loadProfile(options.profile);
    const scan = await collectScan(profile);
    const markdown = options.mode === "plain" ? renderPlainOverview(scan) : renderTechnicalMap(scan);
    const reportPath = reportPathFor(profile.name, options.mode === "plain" ? "plain-overview.md" : "technical-map.md");

    await writeReport(reportPath, markdown);
  });

program
  .command("packet")
  .description("Generate a bounded AI/refactor packet for one configured feature.")
  .requiredOption("--profile <path>", "YAML project profile")
  .requiredOption("--feature <id>", "Configured feature id")
  .action(async (options: { profile: string; feature: string }) => {
    const profile = loadProfile(options.profile);
    const scan = await collectScan(profile);
    const markdown = renderRefactorPacket(scan, options.feature);
    const reportPath = reportPathFor(profile.name, `refactor-packet-${options.feature}.md`);

    await writeReport(reportPath, markdown);
  });

program
  .command("app")
  .description("Generate a contained static app for a configured project profile.")
  .requiredOption("--profile <path>", "YAML project profile")
  .action(async (options: { profile: string }) => {
    const profile = loadProfile(options.profile);
    const scan = await collectScan(profile);
    const outputs = await writeProjectOutputs(profile, scan, { writeStaticApp: true });

    console.log(`Wrote ${displayPath(outputs.appIndexPath ?? resolve("app", slugify(profile.name), "index.html"))}`);
  });

program
  .command("serve")
  .description("Serve the local repo navigator on 127.0.0.1.")
  .option("--port <port>", "Localhost port", "4173")
  .action(async (options: { port: string }) => {
    const port = Number.parseInt(options.port, 10);
    if (!Number.isInteger(port) || port < 0 || port > 65535) {
      throw new Error(`Invalid port '${options.port}'.`);
    }

    const server = await startLocalServer({ port });
    console.log(`ProNav local app listening on ${server.url}`);
  });

program.parseAsync(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});

function reportPathFor(profileName: string, fileName: string): string {
  return resolve("reports", slugify(profileName), fileName);
}

async function writeReport(reportPath: string, markdown: string): Promise<void> {
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${markdown.trimEnd()}\n`, "utf8");
  console.log(`Wrote ${relative(process.cwd(), reportPath)}`);
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseProjectTypeOption(value: string) {
  if (
    value !== "auto" &&
    value !== "generic" &&
    value !== "unity" &&
    value !== "node" &&
    value !== "supabase" &&
    value !== "wordpress"
  ) {
    throw new Error("Project type must be one of: auto, generic, unity, node, supabase, wordpress.");
  }

  return value;
}
