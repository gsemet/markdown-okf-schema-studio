import { execFileSync, type ChildProcess } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

import { downloadAndUnzipVSCode, runTests } from "@vscode/test-electron";
import { runAcceptance } from "./acceptanceRunner";
import { runReloadCampaign } from "./reload-suite";
import { runSpawnedWindow } from "./spawnedWindow";
import { testProfileLaunchArgs, writeTestProfileSettings } from "../shared/testProfile";
import { E2E_REPORT_ROOT, E2E_SCREENSHOT_ROOT } from "../reportPaths";
import { createRunDirectories, freePort, instanceIdFromEnvironment, instanceTag, shortTemporaryRoot } from "../shared/runIsolation";
import { heartbeatFileFor, launchDeadlineMs, RELOAD_LAUNCH_DEADLINE_MS, stressDeadlineLine } from "../shared/hangWatchdog";
import { resetHeartbeat, watchLaunch } from "../shared/launchWatchdog";
import { parseRunnerArgs, type IntegrationScope, type RunnerArgs } from "../shared/runnerArgs";
import { trustedLaunches, type TrustedLaunch } from "../shared/trustedParts";

const extensionRoot = path.resolve(__dirname, "../../..");
const workspaceRoot = extensionRoot;
/** `STUDIO_VSCODE_EXECUTABLE` picks another VS Code build (its `Contents/MacOS/Code` on macOS). */
const localCodePath = process.env.STUDIO_VSCODE_EXECUTABLE ?? "/Applications/Visual Studio Code.app/Contents/MacOS/Code";
if (process.env.STUDIO_VSCODE_EXECUTABLE !== undefined && !fs.existsSync(localCodePath)) {
  throw new Error(`STUDIO_VSCODE_EXECUTABLE does not exist: ${localCodePath}`);
}
const artifactRoot = E2E_REPORT_ROOT;
const campaignRunId = process.env.STUDIO_E2E_RUN_ID ?? null;
const campaignStartedAt = process.env.STUDIO_E2E_STARTED_AT ?? null;
const campaignCommand = process.env.STUDIO_E2E_COMMAND ?? null;
/**
 * Identity of THIS run. Every suite of the run shares it (through STUDIO_E2E_INSTANCE) and every
 * launch gets its own user-data and extensions directories, CDP port and evidence folders, so two
 * runs of the same checkout can be active at the same time.
 */
const instanceId = instanceIdFromEnvironment();

async function codeExecutablePath(): Promise<string> {
  return fs.existsSync(localCodePath) ? localCodePath : downloadAndUnzipVSCode({});
}

/**
 * The Restricted Mode window is spawned directly (runTests would trust the workspace), for its
 * real-window capture (CR 043) too; the workspace stays untrusted (the suite checks it).
 */
async function runUntrustedScenario(suiteName: string): Promise<void> {
  await runSpawnedWindow({
    executable: await codeExecutablePath(),
    name: suiteName,
    label: "Untrusted extension host",
    instanceId,
    testsPath: path.join(__dirname, suiteName),
    developmentPath: extensionRoot,
    workspace: workspaceRoot,
  });
}

/** `trusted` tells which launch of the trusted window this is; the other suites have one launch each. */
async function runScenario(suiteName: string, untrusted: boolean, trusted?: TrustedLaunch): Promise<void> {
  if (untrusted) {
    await runUntrustedScenario(suiteName);
    return;
  }
  const directories = createRunDirectories(instanceId);
  const { userDataDirectory, extensionsDirectory } = directories;
  writeTestProfileSettings(userDataDirectory); // focus thieves off (testProfile.ts)
  const workspaceDirectory = fs.mkdtempSync(path.join("/tmp", `studio-${instanceTag(instanceId)}-w-`));
  const workspaceFile = path.join(workspaceDirectory, "liveview.code-workspace");
  fs.writeFileSync(
    workspaceFile,
    JSON.stringify({
      folders: [
        { path: workspaceRoot },
        { path: "/tmp" },
      ],
      settings: {
        "editor.scrollBeyondLastLine": false,
        "editor.minimap.enabled": false,
        "workbench.startupEditor": "none",
      },
    }),
  );
  const browserSuite = suiteName === "scroll-sync-suite.js" || suiteName === "trusted-suite.js";
  // Resolved (downloaded) before the launch, so the launch deadline does not count the download.
  const executable = await codeExecutablePath();
  const heartbeatFile = heartbeatFileFor(instanceId, trusted?.suite ?? suiteName);
  resetHeartbeat(heartbeatFile);
  const debugPort = browserSuite ? await freePort() : undefined;
  const launchArgs = ["--user-data-dir", userDataDirectory, "--extensions-dir", extensionsDirectory, workspaceFile];
  launchArgs.push(...testProfileLaunchArgs());
  if (debugPort !== undefined) {
    launchArgs.push(`--remote-debugging-port=${debugPort}`, "--remote-debugging-address=127.0.0.1");
  }
  try {
    fs.mkdirSync(artifactRoot, { recursive: true });
    fs.mkdirSync(E2E_SCREENSHOT_ROOT, { recursive: true });
    const startedAt = Date.now();
    const revision = execFileSync("git", ["rev-parse", "HEAD"], { cwd: extensionRoot, encoding: "utf8" }).trim();
    const dirty = execFileSync("git", ["status", "--porcelain"], { cwd: extensionRoot, encoding: "utf8" }).trim().length > 0;
    let passed = false;
    try {
    // Hang watchdog (test/shared/launchWatchdog.ts): runTests owns the VS Code process, which is
    // found through its user-data directory when it has to be dumped and killed.
    await watchLaunch({
      name: trusted?.name ?? suiteName, dumpLabel: trusted?.dumpLabel, heartbeatFile, userDataDirectory, cdpPort: debugPort,
    }, runTests({
      vscodeExecutablePath: executable,
      extensionDevelopmentPath: extensionRoot,
      extensionTestsPath: path.join(__dirname, suiteName),
      extensionTestsEnv: {
        STUDIO_CDP_PORT: String(debugPort ?? ""),
        STUDIO_E2E_INSTANCE: instanceId,
        STUDIO_HEARTBEAT_FILE: heartbeatFile,
        STUDIO_USER_DATA_DIR: userDataDirectory,
        STUDIO_AUDIT_REVISION: revision,
        STUDIO_AUDIT_COMMAND: process.env.STUDIO_E2E_COMMAND ?? process.argv.join(" "),
        ...(trusted?.part ? { STUDIO_TRUSTED_PART: trusted.part } : {}),
        ...(campaignRunId ? { STUDIO_E2E_RUN_ID: campaignRunId } : {}),
        ...(campaignStartedAt ? { STUDIO_E2E_STARTED_AT: campaignStartedAt } : {}),
        ...(campaignCommand ? { STUDIO_E2E_COMMAND: campaignCommand } : {}),
      },
      launchArgs,
    }));
    passed = true;
    } finally {
      if (trusted?.runsPreviewEditing) { // the launch that wrote the frontmatter evidence
        for (const entry of fs.readdirSync(E2E_SCREENSHOT_ROOT, { withFileTypes: true })) {
          if (!entry.isDirectory() || !entry.name.startsWith("frontmatter-e2e-")) continue;
          const manifestPath = path.join(E2E_SCREENSHOT_ROOT, entry.name, "manifest.json");
          if (!fs.existsSync(manifestPath)) continue;
          const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
          if (manifest.instanceId !== instanceId) continue; // another run's folder
          if (campaignRunId && manifest.runId !== campaignRunId) continue;
          if (Date.parse(manifest.startedAt) < startedAt) continue;
          fs.writeFileSync(manifestPath, JSON.stringify({ ...manifest, revision, dirty,
            suiteResult: passed ? "passed" : "failed", completedAt: new Date().toISOString() }, null, 2));
          fs.writeFileSync(path.join(artifactRoot, "FRONTMATTER-LATEST.md"), `# Latest Frontmatter Evidence\n\nSuite: **${passed ? "passed" : "failed"}**\n\n[Ordered captures](screenshots/${entry.name}/INDEX.md)\n\n[Suite result](screenshots/${entry.name}/manifest.json)\n`);
        }
      }
    }
  } finally {
    resetHeartbeat(heartbeatFile); // a dump already holds a copy
    directories.dispose();
    fs.rmSync(workspaceDirectory, { recursive: true, force: true });
  }
}

/**
 * The reverse-migration window (CR 477): its own user-data directory, whose `User/settings.json`
 * holds the retired `open.markdownFilesInStudio` setting on, and a `.code-workspace` file that holds
 * it too. The suite reads both files back after one activation.
 */
async function runReverseMigrationScenario(): Promise<void> {
  const suiteName = "reverse-migration-suite.js";
  const directories = createRunDirectories(instanceId);
  const { userDataDirectory, extensionsDirectory } = directories;
  writeTestProfileSettings(userDataDirectory);
  const settingsFile = path.join(userDataDirectory, "User", "settings.json");
  fs.writeFileSync(settingsFile, JSON.stringify({
    ...JSON.parse(fs.readFileSync(settingsFile, "utf8")) as Record<string, unknown>,
    "markdownOkfSchemaStudio.open.markdownFilesInStudio": true,
    "markdownOkfSchemaStudio.open.searchResultsInStudio": true,
  }, null, 2));
  const workspaceDirectory = fs.mkdtempSync(path.join(shortTemporaryRoot(), `studio-${instanceTag(instanceId)}-w-`));
  const workspaceFile = path.join(workspaceDirectory, "reverse-migration.code-workspace");
  fs.writeFileSync(workspaceFile, JSON.stringify({
    folders: [{ path: workspaceDirectory }],
    settings: { "markdownOkfSchemaStudio.open.markdownFilesInStudio": true, "workbench.startupEditor": "none" },
  }));
  const executable = await codeExecutablePath();
  const heartbeatFile = heartbeatFileFor(instanceId, suiteName);
  resetHeartbeat(heartbeatFile);
  try {
    await watchLaunch({ name: suiteName, heartbeatFile, userDataDirectory }, runTests({
      vscodeExecutablePath: executable,
      extensionDevelopmentPath: extensionRoot,
      extensionTestsPath: path.join(__dirname, suiteName),
      extensionTestsEnv: {
        STUDIO_E2E_INSTANCE: instanceId,
        STUDIO_HEARTBEAT_FILE: heartbeatFile,
        STUDIO_USER_DATA_DIR: userDataDirectory,
      },
      launchArgs: ["--user-data-dir", userDataDirectory, "--extensions-dir", extensionsDirectory, workspaceFile, ...testProfileLaunchArgs()],
    }));
  } finally {
    resetHeartbeat(heartbeatFile);
    directories.dispose();
    fs.rmSync(workspaceDirectory, { recursive: true, force: true });
  }
}

/** The reload campaign drives its window from here (no host suite, no heartbeat): deadline only. */
async function runWatchedReloadCampaign(): Promise<void> {
  const executable = await codeExecutablePath();
  const launch: { child?: ChildProcess; userDataDirectory?: string; port?: number } = {};
  await watchLaunch({
    name: "reload-campaign",
    deadlineMs: RELOAD_LAUNCH_DEADLINE_MS,
    rootPid: () => launch.child?.pid,
    get userDataDirectory() { return launch.userDataDirectory; },
    get cdpPort() { return launch.port; },
  }, runReloadCampaign(executable, extensionRoot, workspaceRoot, (child, userDataDirectory, port) => {
    Object.assign(launch, { child, userDataDirectory, port });
  }));
}

/** The trusted window: two launches, each with its own deadline, or the one launch of a scenario (trustedParts.ts). */
async function runTrustedLaunches(): Promise<void> {
  for (const launch of trustedLaunches(process.env)) await runScenario(launch.suiteFile, false, launch);
}

async function main(suites: IntegrationScope): Promise<void> {
  launchDeadlineMs(); // an invalid STUDIO_LAUNCH_TIMEOUT_MS or stress plan fails here, before any VS Code starts
  const deadlineLine = stressDeadlineLine();
  if (deadlineLine !== undefined && suites !== "reload") console.log(deadlineLine);
  if (suites === "reload") {
    await runWatchedReloadCampaign();
    return;
  }
  if (suites === "trusted") {
    await runTrustedLaunches();
    return;
  }
  if (suites === "reverse-migration") {
    await runReverseMigrationScenario();
    return;
  }
  if (suites === "untrusted") {
    await runScenario("untrusted-suite.js", true);
    return;
  }
  await runScenario("scroll-sync-suite.js", false);
  if (suites === "scroll") return;
  await runScenario("untrusted-suite.js", true);
  await runTrustedLaunches();
  await runScenario("standalone-suite.js", false);
  await runReverseMigrationScenario();
  await runWatchedReloadCampaign();
}

/** The integration suites, recorded in `out/reports/e2e/integration-manifest.json`. */
function runIntegration(args: Extract<RunnerArgs, { mode: "integration" }>): void {
  fs.mkdirSync(artifactRoot, { recursive: true });
  fs.mkdirSync(E2E_SCREENSHOT_ROOT, { recursive: true });
  const integrationManifest = {
    status: "running", command: process.argv.join(" "), campaignCommand, runId: campaignRunId, instanceId,
    campaignStartedAt, startedAt: new Date().toISOString(),
    revision: execFileSync("git", ["rev-parse", "HEAD"], { cwd: extensionRoot, encoding: "utf8" }).trim(),
    dirty: execFileSync("git", ["status", "--porcelain"], { cwd: extensionRoot, encoding: "utf8" }).trim().length > 0,
    scope: args.scope,
  };
  fs.writeFileSync(path.join(artifactRoot, "integration-manifest.json"), JSON.stringify(integrationManifest, null, 2));
  void main(args.suites).then(() => {
    integrationManifest.status = "passed";
  }).catch((error: unknown) => {
    integrationManifest.status = "failed";
    console.error(error);
    process.exitCode = 1;
  }).finally(() => {
    fs.writeFileSync(path.join(artifactRoot, "integration-manifest.json"), JSON.stringify({ ...integrationManifest, completedAt: new Date().toISOString() }, null, 2));
  });
}

/** The StRS acceptance files only; their manifests are per group (`acceptanceRunner.ts`). */
async function mainAcceptance(args: Extract<RunnerArgs, { mode: "acceptance" }>): Promise<void> {
  launchDeadlineMs(); // an invalid STUDIO_LAUNCH_TIMEOUT_MS fails here, before any VS Code starts
  await runAcceptance({ group: args.group, extensionRoot, instanceId, executable: codeExecutablePath });
}

// Parsed first: a refused argument fails before any manifest is written and any VS Code starts.
const runnerArgs = parseRunnerArgs(process.argv.slice(2));
if (runnerArgs.mode === "integration") {
  runIntegration(runnerArgs);
} else {
  void mainAcceptance(runnerArgs).catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
