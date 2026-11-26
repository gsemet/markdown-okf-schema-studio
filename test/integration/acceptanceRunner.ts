/**
 * The `--acceptance-only` mode of the integration launcher: one VS Code launch per acceptance file
 * (`test/integration/acceptance/`), in the window kind the file exports, through the suite entry
 * `acceptance-suite.ts`. Each e2e group gets its own manifest
 * (`out/reports/acceptance/<group>/acceptance-manifest.json`) with its campaign identity, which
 * `scripts/e2e-campaign.mjs report` reads. Every file runs even after one failed, so a red run
 * shows every failing path.
 */
import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

import { runTests } from "@vscode/test-electron";

import { ACCEPTANCE_REPORT_ROOT, E2E_REPORT_ROOT } from "../reportPaths";
import {
  ACCEPTANCE_SOURCE_DIR,
  pinnedRunIdOf,
  selectAcceptanceFiles,
  windowKindOf,
  type AcceptanceFile,
  type WindowKind,
} from "../shared/acceptanceCampaign";
import type { GroupId } from "../shared/e2eGroups";
import { heartbeatFileFor } from "../shared/hangWatchdog";
import { resetHeartbeat, watchLaunch } from "../shared/launchWatchdog";
import { createRunDirectories, freePort, instanceTag, shortTemporaryRoot } from "../shared/runIsolation";
import { testProfileLaunchArgs, writeTestProfileSettings } from "../shared/testProfile";
import { runSpawnedWindow } from "./spawnedWindow";

export interface AcceptanceRun {
  readonly group?: GroupId;
  readonly extensionRoot: string;
  readonly instanceId: string;
  /** Resolves (downloads) VS Code; called before each launch so its deadline excludes the download. */
  readonly executable: () => Promise<string>;
}

interface Launch {
  readonly file: string;
  readonly kind: WindowKind;
  status: "running" | "passed" | "failed";
  durationMs: number;
}

interface PlannedFile extends AcceptanceFile {
  readonly kind: WindowKind;
}

interface Context extends AcceptanceRun {
  readonly environment: Readonly<Record<string, string>>;
  /** Path of the VSIX, built on the first call only: one package per run. */
  readonly vsix: () => string;
}

const SUITE_ENTRY = path.join(__dirname, "acceptance-suite.js");

function fileEnvironment(context: Context, file: PlannedFile): Record<string, string> {
  return {
    ...context.environment,
    STUDIO_ACCEPTANCE_FILE: path.join(__dirname, "acceptance", `${file.name}.js`),
    STUDIO_ACCEPTANCE_KIND: file.kind,
  };
}

/** A trusted window, through `runTests`, like the browser suites of the integration campaign. */
async function launchTrusted(context: Context, file: PlannedFile): Promise<void> {
  const directories = createRunDirectories(context.instanceId);
  const { userDataDirectory, extensionsDirectory } = directories;
  writeTestProfileSettings(userDataDirectory); // focus thieves off (testProfile.ts)
  const temporaryRoot = shortTemporaryRoot();
  const workspaceDirectory = fs.mkdtempSync(path.join(temporaryRoot, `studio-${instanceTag(context.instanceId)}-w-`));
  const workspaceFile = path.join(workspaceDirectory, "liveview.code-workspace");
  fs.writeFileSync(workspaceFile, JSON.stringify({
    folders: [{ path: context.extensionRoot }, { path: temporaryRoot }],
    settings: {
      "editor.scrollBeyondLastLine": false,
      "editor.minimap.enabled": false,
      "workbench.startupEditor": "none",
    },
  }));
  const heartbeatFile = heartbeatFileFor(context.instanceId, file.name);
  resetHeartbeat(heartbeatFile);
  try {
    const executable = await context.executable();
    const debugPort = await freePort();
    await watchLaunch({ name: file.name, heartbeatFile, userDataDirectory, cdpPort: debugPort }, runTests({
      vscodeExecutablePath: executable,
      extensionDevelopmentPath: context.extensionRoot,
      extensionTestsPath: SUITE_ENTRY,
      extensionTestsEnv: {
        ...fileEnvironment(context, file),
        STUDIO_CDP_PORT: String(debugPort),
        STUDIO_E2E_INSTANCE: context.instanceId,
        STUDIO_HEARTBEAT_FILE: heartbeatFile,
        STUDIO_USER_DATA_DIR: userDataDirectory,
      },
      launchArgs: [
        "--user-data-dir", userDataDirectory, "--extensions-dir", extensionsDirectory, workspaceFile,
        ...testProfileLaunchArgs(), `--remote-debugging-port=${debugPort}`, "--remote-debugging-address=127.0.0.1",
      ],
    }));
  } finally {
    resetHeartbeat(heartbeatFile); // a dump already holds a copy
    directories.dispose();
    fs.rmSync(workspaceDirectory, { recursive: true, force: true });
  }
}

/** A Restricted Mode window: spawned, with the repository as its untrusted workspace. */
async function launchRestricted(context: Context, file: PlannedFile): Promise<void> {
  await runSpawnedWindow({
    executable: await context.executable(),
    name: file.name,
    label: `The restricted acceptance window of ${file.name}`,
    instanceId: context.instanceId,
    testsPath: SUITE_ENTRY,
    developmentPath: context.extensionRoot,
    workspace: context.extensionRoot,
    env: fileEnvironment(context, file),
  });
}

/**
 * A window whose extension under test is the built VSIX, unpacked into a temporary folder. It opens
 * an empty temporary workspace, trusted as an installed extension's user would have it.
 */
async function launchVsix(context: Context, file: PlannedFile): Promise<void> {
  const root = fs.mkdtempSync(path.join(shortTemporaryRoot(), `studio-${instanceTag(context.instanceId)}-v-`));
  try {
    const unpacked = path.join(root, "extension");
    const workspace = path.join(root, "workspace");
    fs.mkdirSync(workspace);
    execFileSync("uv", ["run", "--no-sync", "python", "-I", "scripts/unpack_vsix.py", context.vsix(), unpacked],
      { cwd: context.extensionRoot, stdio: "inherit" });
    await runSpawnedWindow({
      executable: await context.executable(),
      name: file.name,
      label: `The VSIX acceptance window of ${file.name}`,
      instanceId: context.instanceId,
      testsPath: SUITE_ENTRY,
      developmentPath: unpacked,
      workspace,
      env: { ...fileEnvironment(context, file), STUDIO_ACCEPTANCE_EXTENSION: unpacked },
      extraArgs: ["--disable-workspace-trust"],
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

const LAUNCHERS: Readonly<Record<WindowKind, (context: Context, file: PlannedFile) => Promise<void>>> = {
  trusted: launchTrusted,
  restricted: launchRestricted,
  vsix: launchVsix,
};

/** `package-extension.mjs` on the compiled and bundled tree: no `vscode:prepublish` rebuilds it. */
function packageOnce(extensionRoot: string): () => string {
  let vsix: string | undefined;
  return () => {
    if (vsix === undefined) {
      execFileSync(process.execPath, ["scripts/package-extension.mjs"], { cwd: extensionRoot, stdio: "inherit" });
      vsix = path.join(extensionRoot, "out", "reports", "package", "markdown-okf-schema-studio.vsix");
    }
    return vsix;
  };
}

function readCampaign(): unknown {
  try {
    return JSON.parse(fs.readFileSync(path.join(E2E_REPORT_ROOT, "campaign-acceptance.json"), "utf8"));
  } catch {
    return undefined; // a direct run, without `e2e-campaign.mjs begin acceptance`
  }
}

/** Runs the acceptance files of `run.group`, or of every group, and writes one manifest per group. */
export async function runAcceptance(run: AcceptanceRun): Promise<void> {
  const sourceDirectory = path.join(run.extensionRoot, ACCEPTANCE_SOURCE_DIR);
  // The sources name the files: out/ may still hold the build of a file that no longer exists.
  const names = fs.existsSync(sourceDirectory) ? fs.readdirSync(sourceDirectory) : [];
  const files: PlannedFile[] = selectAcceptanceFiles(names, run.group).map((file) => ({
    ...file,
    kind: windowKindOf(fs.readFileSync(path.join(sourceDirectory, `${file.name}.ts`), "utf8"), `${file.name}.ts`),
  }));
  const git = (...args: string[]): string => execFileSync("git", args, { cwd: run.extensionRoot, encoding: "utf8" }).trim();
  const revision = git("rev-parse", "HEAD");
  const dirty = git("status", "--porcelain").length > 0;
  const campaignRunId = process.env.STUDIO_E2E_RUN_ID ?? null;
  const campaignStartedAt = process.env.STUDIO_E2E_STARTED_AT ?? null;
  const campaignCommand = process.env.STUDIO_E2E_COMMAND ?? null;
  const command = process.argv.join(" ");
  const context: Context = {
    ...run,
    vsix: packageOnce(run.extensionRoot),
    environment: {
      STUDIO_AUDIT_REVISION: revision,
      STUDIO_AUDIT_COMMAND: campaignCommand ?? command,
      ...(campaignRunId ? { STUDIO_E2E_RUN_ID: campaignRunId } : {}),
      ...(campaignStartedAt ? { STUDIO_E2E_STARTED_AT: campaignStartedAt } : {}),
      ...(campaignCommand ? { STUDIO_E2E_COMMAND: campaignCommand } : {}),
    },
  };
  const pinnedRunId = pinnedRunIdOf(readCampaign(), process.env);
  const failed: string[] = [];
  for (const group of new Set(files.map((file) => file.group))) {
    const manifestFile = path.join(ACCEPTANCE_REPORT_ROOT, group, "acceptance-manifest.json");
    const launches: Launch[] = [];
    const manifest = {
      status: "running", command, campaignCommand, runId: campaignRunId, instanceId: run.instanceId,
      campaignStartedAt, startedAt: new Date().toISOString(), revision, dirty, scope: group, pinnedRunId, launches,
    };
    const write = (extra: Record<string, unknown> = {}): void => {
      fs.mkdirSync(path.dirname(manifestFile), { recursive: true });
      fs.writeFileSync(manifestFile, JSON.stringify({ ...manifest, ...extra }, null, 2));
    };
    write();
    for (const file of files.filter((candidate) => candidate.group === group)) {
      const launch: Launch = { file: `${ACCEPTANCE_SOURCE_DIR}/${file.name}.ts`, kind: file.kind, status: "running", durationMs: 0 };
      launches.push(launch);
      write();
      const startedAt = Date.now();
      try {
        await LAUNCHERS[file.kind](context, file);
        launch.status = "passed";
      } catch (error: unknown) {
        launch.status = "failed";
        failed.push(file.name);
        console.error(`ACCEPTANCE FAILED: ${file.name}`);
        console.error(error);
      }
      launch.durationMs = Date.now() - startedAt;
      console.log(`ACCEPTANCE ${launch.status}: ${file.name} (${file.kind}) in ${Math.round(launch.durationMs / 1000)} s`);
      write();
    }
    manifest.status = launches.every((launch) => launch.status === "passed") ? "passed" : "failed";
    write({ completedAt: new Date().toISOString() });
  }
  if (failed.length > 0) throw new Error(`Acceptance failed in: ${failed.join(", ")}.`);
}
