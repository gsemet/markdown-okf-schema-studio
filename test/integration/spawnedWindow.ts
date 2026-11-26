/**
 * One VS Code window spawned directly by the launcher, for what `runTests` cannot give: a Restricted
 * Mode window (runTests would trust the workspace) and a window that runs an unpacked VSIX. It gets
 * its own loopback CDP port like the browser suites, and a user setting that keeps the startup trust
 * prompt away (the modal dialog would only cover the window in a capture); the workspace trust
 * itself is what `extraArgs` leaves it.
 */
import { spawn } from "node:child_process";

import { heartbeatFileFor } from "../shared/hangWatchdog";
import { resetHeartbeat, watchLaunch } from "../shared/launchWatchdog";
import { createRunDirectories, freePort } from "../shared/runIsolation";
import { testProfileLaunchArgs, writeTestProfileSettings } from "../shared/testProfile";

export interface SpawnedWindow {
  readonly executable: string;
  /** Names the launch in the watchdog, its dumps and its heartbeat file. */
  readonly name: string;
  /** Names the window in the error of a non-zero exit. */
  readonly label: string;
  readonly instanceId: string;
  /** The extension tests entry the extension host runs. */
  readonly testsPath: string;
  /** The folder of the extension under test. */
  readonly developmentPath: string;
  /** The folder or workspace file the window opens. */
  readonly workspace: string;
  /** Environment of the window, on top of the launcher's and the watchdog's variables. */
  readonly env?: Readonly<Record<string, string>>;
  readonly extraArgs?: readonly string[];
}

/** Runs the window until it exits, under the hang watchdog; throws when it exits non-zero. */
export async function runSpawnedWindow(window: SpawnedWindow): Promise<void> {
  const directories = createRunDirectories(window.instanceId);
  const { userDataDirectory, extensionsDirectory } = directories;
  const debugPort = await freePort();
  const heartbeatFile = heartbeatFileFor(window.instanceId, window.name);
  resetHeartbeat(heartbeatFile);
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
    `--extensionTestsPath=${window.testsPath}`,
    `--extensionDevelopmentPath=${window.developmentPath}`,
    `--remote-debugging-port=${debugPort}`,
    "--remote-debugging-address=127.0.0.1",
    ...(window.extraArgs ?? []),
    window.workspace,
  ];
  try {
    let child: ReturnType<typeof spawn> | undefined;
    // Hang watchdog (test/shared/launchWatchdog.ts): a frozen host or a launch past its deadline is
    // dumped and killed while the user-data directory still exists.
    const exitCode = await watchLaunch({
      name: window.name, heartbeatFile, userDataDirectory, cdpPort: debugPort, rootPid: () => child?.pid,
    }, new Promise<number>((resolve, reject) => {
      child = spawn(window.executable, args, {
        env: {
          ...process.env, STUDIO_E2E_INSTANCE: window.instanceId, STUDIO_CDP_PORT: String(debugPort),
          STUDIO_HEARTBEAT_FILE: heartbeatFile, STUDIO_USER_DATA_DIR: userDataDirectory, ...window.env,
        },
        stdio: "inherit",
      });
      child.once("error", reject);
      child.once("exit", (code: number | null) => resolve(code ?? 1));
    }));
    if (exitCode !== 0) {
      throw new Error(`${window.label} exited with code ${exitCode}.`);
    }
  } finally {
    resetHeartbeat(heartbeatFile); // a dump already holds a copy
    directories.dispose();
  }
}
