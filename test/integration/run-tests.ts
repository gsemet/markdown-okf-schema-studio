import { execFileSync, spawn } from "node:child_process";
import * as fs from "node:fs";
import * as net from "node:net";
import * as path from "node:path";

import { downloadAndUnzipVSCode, runTests } from "@vscode/test-electron";
import { runReloadCampaign } from "./reload-suite";
import { E2E_REPORT_ROOT, E2E_SCREENSHOT_ROOT } from "../reportPaths";

const extensionRoot = path.resolve(__dirname, "../../..");
const workspaceRoot = extensionRoot;
const localCodePath = "/Applications/Visual Studio Code.app/Contents/MacOS/Code";
const artifactRoot = E2E_REPORT_ROOT;
const campaignRunId = process.env.STUDIO_E2E_RUN_ID ?? null;
const campaignStartedAt = process.env.STUDIO_E2E_STARTED_AT ?? null;
const campaignCommand = process.env.STUDIO_E2E_COMMAND ?? null;

async function codeExecutablePath(): Promise<string> {
  return fs.existsSync(localCodePath) ? localCodePath : downloadAndUnzipVSCode({});
}

async function runUntrustedScenario(suiteName: string): Promise<void> {
  const executable = await codeExecutablePath();
  const userDataDirectory = fs.mkdtempSync(path.join("/tmp", "liveview-vscode-"));
  const extensionsDirectory = fs.mkdtempSync(path.join("/tmp", "liveview-ext-"));
  const args = [
    "--no-sandbox",
    "--disable-gpu-sandbox",
    "--disable-updates",
    "--skip-welcome",
    "--skip-release-notes",
    `--user-data-dir=${userDataDirectory}`,
    `--extensions-dir=${extensionsDirectory}`,
    `--extensionTestsPath=${path.join(__dirname, suiteName)}`,
    `--extensionDevelopmentPath=${extensionRoot}`,
    workspaceRoot,
  ];
  try {
    const exitCode = await new Promise<number>((resolve, reject) => {
      const child = spawn(executable, args, { env: process.env, stdio: "inherit" });
      child.once("error", reject);
      child.once("exit", (code: number | null) => resolve(code ?? 1));
    });
    if (exitCode !== 0) {
      throw new Error(`Untrusted extension host exited with code ${exitCode}.`);
    }
  } finally {
    fs.rmSync(userDataDirectory, { recursive: true, force: true });
    fs.rmSync(extensionsDirectory, { recursive: true, force: true });
  }
}

async function runScenario(suiteName: string, untrusted: boolean): Promise<void> {
  if (untrusted) {
    await runUntrustedScenario(suiteName);
    return;
  }
  const userDataDirectory = fs.mkdtempSync(path.join("/tmp", "liveview-vscode-"));
  const workspaceDirectory = fs.mkdtempSync(path.join("/tmp", "liveview-workspace-"));
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
  const debugPort = browserSuite ? await new Promise<number>((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address() as net.AddressInfo;
      server.close(() => resolve(address.port));
    });
  }) : undefined;
  const launchArgs = ["--user-data-dir", userDataDirectory, workspaceFile];
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
          if (campaignRunId && manifest.runId !== campaignRunId) continue;
          if (Date.parse(manifest.startedAt) < startedAt) continue;
          fs.writeFileSync(manifestPath, JSON.stringify({ ...manifest, revision, dirty,
            suiteResult: passed ? "passed" : "failed", completedAt: new Date().toISOString() }, null, 2));
          fs.writeFileSync(path.join(artifactRoot, "FRONTMATTER-LATEST.md"), `# Latest Frontmatter Evidence\n\nSuite: **${passed ? "passed" : "failed"}**\n\n[Ordered captures](screenshots/${entry.name}/INDEX.md)\n\n[Suite result](screenshots/${entry.name}/manifest.json)\n`);
        }
      }
    }
  } finally {
    fs.rmSync(userDataDirectory, { recursive: true, force: true });
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
  status: "running", command: process.argv.join(" "), campaignCommand, runId: campaignRunId,
  campaignStartedAt, startedAt: new Date().toISOString(),
  revision: execFileSync("git", ["rev-parse", "HEAD"], { cwd: extensionRoot, encoding: "utf8" }).trim(),
  dirty: execFileSync("git", ["status", "--porcelain"], { cwd: extensionRoot, encoding: "utf8" }).trim().length > 0,
  scope: process.argv.includes("--reload-only") ? "reload" : process.argv.includes("--trusted-only") ? "trusted" : process.argv.includes("--scroll-only") ? "scroll" : "all",
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
