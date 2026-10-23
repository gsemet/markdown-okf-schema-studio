import { execFileSync } from "node:child_process";

/**
 * macOS side of the window-focus guard, free of the `vscode` API so the test runner (the reload
 * campaign) can use it as well as the extension-host suites (windowFocus.ts). Every call is
 * bounded by a 5 s timeout and returns at once on other platforms.
 */

/**
 * Asks macOS (System Events) to bring the app of process `pid` to the front. Returns
 * "requested", or why the request failed. A missing Automation permission (error -1743, or a
 * consent prompt nobody answered, which ends in a timeout) is named, with what to allow.
 * `requester` is the app macOS asks the permission for: the one that runs this process.
 */
export function activateMacProcess(pid: number, requester: string): string {
  if (process.platform !== "darwin") return "not needed (not macOS)";
  try {
    execFileSync("osascript", ["-e",
      `tell application "System Events" to set frontmost of (first process whose unix id is ${pid}) to true`,
    ], { encoding: "utf8", timeout: 5_000, stdio: ["ignore", "pipe", "pipe"] });
    return "requested";
  } catch (error) {
    return `failed: ${String(error).replace(/\s+/gu, " ").trim()}${automationHint(error, requester)}`;
  }
}

/** The permission sentence for an osascript failure that comes from the Automation consent. */
export function automationHint(error: unknown, requester: string): string {
  const detail = `${String(error)} ${String((error as { stderr?: unknown } | null)?.stderr ?? "")}`;
  const code = (error as { code?: unknown } | null)?.code;
  if (!/-1743|Not authorized|not allowed to send Apple events/iu.test(detail) && code !== "ETIMEDOUT"
    && !/ETIMEDOUT/u.test(detail)) return "";
  return ` The macOS Automation permission is missing or was not answered: allow ${requester} to control`
    + " \"System Events\" in System Settings > Privacy & Security > Automation (macOS asks once per app,"
    + " and each VS Code build counts as its own app), then run the tests again.";
}

/** Process id of the frontmost app as macOS reports it, or null when it cannot be read. */
export function frontmostPid(): number | null {
  const match = /"pid"\s*=\s*(\d+)/u.exec(run("lsappinfo", ["info", "-only", "pid", run("lsappinfo", ["front"])]));
  return match ? Number(match[1]) : null;
}

/** The frontmost app and the screen lock state, for failure messages. */
export function macFocusDiagnostics(): { frontmostApp: string; screenLocked: boolean } {
  return {
    frontmostApp: run("lsappinfo", ["info", "-only", "pid,bundlepath", run("lsappinfo", ["front"])]),
    screenLocked: /"CGSSessionScreenIsLocked"\s*=\s*Yes/u.test(run("ioreg", ["-n", "Root", "-d1"])),
  };
}

function run(command: string, args: string[]): string {
  try {
    return execFileSync(command, args, { encoding: "utf8", timeout: 5_000 }).replace(/\s+/gu, " ").trim();
  } catch (error) {
    return `unavailable: ${String(error)}`;
  }
}
