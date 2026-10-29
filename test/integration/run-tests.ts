import { execFileSync, spawn } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

import { downloadAndUnzipVSCode, runTests } from "@vscode/test-electron";
import { runReloadCampaign } from "./reload-suite";
import { testProfileLaunchArgs, writeTestProfileSettings } from "../shared/testProfile";
import { E2E_REPORT_ROOT, E2E_SCREENSHOT_ROOT } from "../reportPaths";
import { createRunDirectories, freePort, instanceIdFromEnvironment, instanceTag } from "../shared/runIsolation";

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
 * The Restricted Mode window is spawned directly (runTests would trust the workspace). It gets its
 * own loopback CDP port like the browser suites, for its real-window capture (CR 043), and a user
 * setting that keeps the startup trust prompt away: the workspace stays untrusted (the suite checks
 * it), the modal dialog would only cover the window in the capture.
 */
async function runUntrustedScenario(suiteName: string): Promise<void> {
  const executable = await codeExecutablePath();
  const directories = createRunDirectories(instanceId);
  const { userDataDirectory, extensionsDirectory } = directories;
  const debugPort = await freePort();
  writeTestProfileSettings(userDataDirectory); // focus thieves off, trust prompt off (testProfile.ts)
  const args = [
    "--no-sandbox",
    "--disable-gpu-sandbox",
    "--disable-updates",
    "--skip-welcome",
    "--skip-release-notes",
    ...testProfileLaunchArgs(),
    `--user-data-dir=${userDataDirectory}`,
    `--extensions-dir=${extensionsDirectory}`,
    `--extensionTestsPath=${path.join(__dirname, suiteName)}`,
    `--extensionDevelopmentPath=${extensionRoot}`,
    `--remote-debugging-port=${debugPort}`,
    "--remote-debugging-address=127.0.0.1",
    workspaceRoot,
  ];
  try {
    const exitCode = await new Promise<number>((resolve, reject) => {
      const child = spawn(executable, args, {
        env: { ...process.env, STUDIO_E2E_INSTANCE: instanceId, STUDIO_CDP_PORT: String(debugPort) },
        stdio: "inherit",
      });
      child.once("error", reject);
      child.once("exit", (code: number | null) => resolve(code ?? 1));
    });
    if (exitCode !== 0) {
      throw new Error(`Untrusted extension host exited with code ${exitCode}.`);
    }
  } finally {
    directories.dispose();
  }
}

async function runScenario(suiteName: string, untrusted: boolean): Promise<void> {
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
    await runTests({
      ...(fs.existsSync(localCodePath) ? { vscodeExecutablePath: localCodePath } : {}),
      extensionDevelopmentPath: extensionRoot,
      extensionTestsPath: path.join(__dirname, suiteName),
      extensionTestsEnv: {
        STUDIO_CDP_PORT: String(debugPort ?? ""),
        STUDIO_E2E_INSTANCE: instanceId,
        STUDIO_AUDIT_REVISION: revision,
        STUDIO_AUDIT_COMMAND: process.env.STUDIO_E2E_COMMAND ?? process.argv.join(" "),
        ...(campaignRunId ? { STUDIO_E2E_RUN_ID: campaignRunId } : {}),
        ...(campaignStartedAt ? { STUDIO_E2E_STARTED_AT: campaignStartedAt } : {}),
        ...(campaignCommand ? { STUDIO_E2E_COMMAND: campaignCommand } : {}),
      },
      launchArgs,
    });
    passed = true;
    } finally {
      if (suiteName === "trusted-suite.js") {
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
    directories.dispose();
    fs.rmSync(workspaceDirectory, { recursive: true, force: true });
  }
}

async function main(): Promise<void> {
  if (process.argv.includes("--reload-only")) {
    await runReloadCampaign(await codeExecutablePath(), extensionRoot, workspaceRoot);
    return;
  }
  if (process.argv.includes("--trusted-only")) {
    await runScenario("trusted-suite.js", false);
    return;
  }
  if (process.argv.includes("--untrusted-only")) {
    await runScenario("untrusted-suite.js", true);
    return;
  }
  await runScenario("scroll-sync-suite.js", false);
  if (process.argv.includes("--scroll-only")) return;
  await runScenario("untrusted-suite.js", true);
  await runScenario("trusted-suite.js", false);
  await runScenario("standalone-suite.js", false);
  await runReloadCampaign(await codeExecutablePath(), extensionRoot, workspaceRoot);
}

fs.mkdirSync(artifactRoot, { recursive: true });
fs.mkdirSync(E2E_SCREENSHOT_ROOT, { recursive: true });
const integrationManifest = {
  status: "running", command: process.argv.join(" "), campaignCommand, runId: campaignRunId, instanceId,
  campaignStartedAt, startedAt: new Date().toISOString(),
  revision: execFileSync("git", ["rev-parse", "HEAD"], { cwd: extensionRoot, encoding: "utf8" }).trim(),
  dirty: execFileSync("git", ["status", "--porcelain"], { cwd: extensionRoot, encoding: "utf8" }).trim().length > 0,
  scope: process.argv.includes("--reload-only") ? "reload" : process.argv.includes("--trusted-only") ? "trusted"
    : process.argv.includes("--untrusted-only") ? "untrusted" : process.argv.includes("--scroll-only") ? "scroll" : "all",
};
fs.writeFileSync(path.join(artifactRoot, "integration-manifest.json"), JSON.stringify(integrationManifest, null, 2));
void main().then(() => {
  integrationManifest.status = "passed";
}).catch((error: unknown) => {
  integrationManifest.status = "failed";
  console.error(error);
  process.exitCode = 1;
}).finally(() => {
  fs.writeFileSync(path.join(artifactRoot, "integration-manifest.json"), JSON.stringify({ ...integrationManifest, completedAt: new Date().toISOString() }, null, 2));
});
