import * as assert from "node:assert/strict";
import { spawn } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";

import { processTree, writeHangDump } from "../shared/hangDump";
import {
  currentProgress,
  heartbeatFileFor,
  launchDeadlineMs,
  LAUNCH_DEADLINE_MS,
  markProgress,
  readHeartbeat,
  RELOAD_LAUNCH_DEADLINE_MS,
  runStep,
  setHangHandler,
  startHeartbeat,
  stepBudgetMs,
  STEP_BUDGET_DEFAULT_MS,
  watchdogVerdict,
  WHOLE_SUITE_STEPS,
  withTimeout,
  writeHeartbeat,
  type HangReport,
} from "../shared/hangWatchdog";
import { watchLaunch } from "../shared/launchWatchdog";

function temporaryDirectory(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "studio-hang-test-"));
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function waitUntilDead(pid: number, timeoutMs = 3_000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!isAlive(pid)) return true;
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
  }
  return !isAlive(pid);
}

/** A process that never exits, with a grandchild that never exits either (prints its pid). */
function spawnStuckProcess(extraArgs: readonly string[] = []): { child: ReturnType<typeof spawn>; exited: Promise<NodeJS.Signals | null>; grandchild: Promise<number> } {
  const script = "const c=require('child_process').spawn(process.execPath,['-e','setInterval(()=>{},1e3)'],{stdio:'ignore'});"
    + "console.log(c.pid);setInterval(()=>{},1e3)";
  const child = spawn(process.execPath, ["-e", script, ...(extraArgs.length > 0 ? ["--", ...extraArgs] : [])], { stdio: ["ignore", "pipe", "ignore"] });
  const grandchild = new Promise<number>((resolve) => child.stdout!.once("data", (data: Buffer) => resolve(Number(String(data).trim()))));
  const exited = new Promise<NodeJS.Signals | null>((resolve) => child.once("exit", (_code, signal) => resolve(signal)));
  return { child, exited, grandchild };
}

test("CR 173: withTimeout passes a value through and rejects a call that never returns with its label", async () => {
  assert.equal(await withTimeout("fast call", 1_000, Promise.resolve(42)), 42);
  const reports: HangReport[] = [];
  setHangHandler(async (report) => {
    reports.push(report);
    return "/tmp/dump-folder";
  });
  try {
    await assert.rejects(withTimeout("tabGroups.close of preview.md", 50, new Promise<never>(() => undefined)),
      /TIMEOUT: tabGroups\.close of preview\.md did not return within 50 ms .*dump: \/tmp\/dump-folder/u);
  } finally {
    setHangHandler(undefined);
  }
  assert.equal(reports.length, 1);
  assert.equal(reports[0].kind, "call");
  assert.equal(reports[0].label, "tabGroups.close of preview.md");
});

test("CR 173: runStep logs start and done, and a step past its budget names itself and its last marker", async () => {
  const lines: string[] = [];
  assert.equal(await runStep("quick-step", 1_000, async () => "ok", (line) => lines.push(line)), "ok");
  assert.equal(lines[0], "STEP start: quick-step");
  assert.match(lines[1], /^STEP done: quick-step \(\d+ ms\)$/u);
  const reports: HangReport[] = [];
  setHangHandler(async (report) => {
    reports.push(report);
    return undefined;
  });
  try {
    await assert.rejects(runStep("checkbox-toggle", 50, async () => {
      markProgress("waiting for workbench.action.closeAuxiliaryBar");
      await new Promise<never>(() => undefined);
    }, (line) => lines.push(line)),
    /STEP TIMEOUT: checkbox-toggle did not finish within 50 ms; last progress marker: waiting for workbench\.action\.closeAuxiliaryBar/u);
  } finally {
    setHangHandler(undefined);
  }
  assert.equal(reports[0].kind, "step");
  assert.equal(reports[0].step, "checkbox-toggle");
  assert.match(lines.at(-1) ?? "", /^STEP failed: checkbox-toggle/u);
  assert.equal(currentProgress().step, "checkbox-toggle");
});

test("CR 173: budgets and the launch deadline come from one place and the environment", () => {
  assert.equal(launchDeadlineMs({}), LAUNCH_DEADLINE_MS);
  assert.equal(launchDeadlineMs({ STUDIO_LAUNCH_TIMEOUT_MS: " 1000 " }), 1_000);
  assert.throws(() => launchDeadlineMs({ STUDIO_LAUNCH_TIMEOUT_MS: "soon" }), /STUDIO_LAUNCH_TIMEOUT_MS/u);
  assert.equal(stepBudgetMs("checkbox-toggle", {}), STEP_BUDGET_DEFAULT_MS);
  assert.ok(stepBudgetMs("real-input", {}) > STEP_BUDGET_DEFAULT_MS);
  assert.equal(stepBudgetMs("real-input", { STUDIO_REAL_INPUT_SCENARIO: "stress", STUDIO_LAUNCH_TIMEOUT_MS: "5000" }), 5_000);
  assert.equal(stepBudgetMs("real-input", { STUDIO_REAL_INPUT_SCENARIO: "toc-loop", STUDIO_LAUNCH_TIMEOUT_MS: "6000" }), 6_000);
  assert.ok(LAUNCH_DEADLINE_MS < 30 * 60_000, "the launch deadline fires before the job timeout");
});

test("CR 173: whole-suite steps and the reload campaign fail well before the 20-minute CI step timeout", () => {
  assert.deepEqual([...WHOLE_SUITE_STEPS].sort(), ["scroll-sync-suite", "standalone-suite", "untrusted-suite"]);
  assert.equal(stepBudgetMs("scroll-sync-suite", {}), 5 * 60_000);
  assert.equal(stepBudgetMs("untrusted-suite", {}), 2 * 60_000);
  assert.equal(stepBudgetMs("standalone-suite", {}), 2 * 60_000);
  // The stress mode repeats the Restricted Mode captures: that suite is bounded by the launch deadline.
  assert.equal(stepBudgetMs("untrusted-suite", { STUDIO_REAL_INPUT_SCENARIO: "stress", STUDIO_LAUNCH_TIMEOUT_MS: "7000" }), 7_000);
  assert.equal(stepBudgetMs("scroll-sync-suite", { STUDIO_REAL_INPUT_SCENARIO: "stress" }), 5 * 60_000);
  assert.equal(RELOAD_LAUNCH_DEADLINE_MS, 3 * 60_000);
  assert.ok(RELOAD_LAUNCH_DEADLINE_MS < LAUNCH_DEADLINE_MS);
});

test("CR 173: the launcher verdict: deadline first, staleness only after a first heartbeat", () => {
  const base = { startedAt: 0, staleMs: 90, deadlineMs: 1_000 };
  assert.equal(watchdogVerdict({ ...base, now: 500, lastHeartbeatAt: undefined }), undefined);
  assert.equal(watchdogVerdict({ ...base, now: 500, lastHeartbeatAt: 450 }), undefined);
  assert.deepEqual(watchdogVerdict({ ...base, now: 500, lastHeartbeatAt: 400 }), { kind: "stale", silentMs: 100 });
  assert.deepEqual(watchdogVerdict({ ...base, now: 1_001, lastHeartbeatAt: 1_000 }), { kind: "deadline", elapsedMs: 1_001 });
});

test("CR 173: the heartbeat file holds the running step and survives an unwritable folder", () => {
  const directory = temporaryDirectory();
  try {
    const file = heartbeatFileFor("20261028T000000Z-abcdef12", "trusted-suite.js", directory);
    assert.equal(path.basename(file), "heartbeat-20261028T000000Z-abcdef12-trusted-suite.json");
    const heartbeat = startHeartbeat("trusted-suite", file, 10_000);
    heartbeat.stop();
    markProgress("first capture");
    writeHeartbeat(file, 1234);
    assert.deepEqual({ ...readHeartbeat(file), stepStartedAt: 0, markerAt: 0 },
      { ...currentProgress(), stepStartedAt: 0, markerAt: 0, suite: "trusted-suite", pid: process.pid, time: 1234 });
    writeHeartbeat(path.join(file, "not-a-directory", "heartbeat.json")); // must not throw
    assert.equal(readHeartbeat(path.join(directory, "missing.json")), undefined);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("CR 173: processTree selects the roots, the user-data matches and their descendants, never the caller", () => {
  const processes = [
    { pid: 1, ppid: 0, args: "init" },
    { pid: 10, ppid: 1, args: "code --user-data-dir /tmp/studio-x-d-1" },
    { pid: 11, ppid: 10, args: "code --type=renderer" },
    { pid: 12, ppid: 11, args: "code --type=utility exthost" },
    { pid: 20, ppid: 1, args: "code --user-data-dir /tmp/other" },
    { pid: 30, ppid: 1, args: "node spawned" },
    { pid: 31, ppid: 30, args: "node grandchild" },
  ];
  assert.deepEqual(processTree(processes, [], ["/tmp/studio-x-d-1"]).map((entry) => entry.pid), [10, 11, 12]);
  assert.deepEqual(processTree(processes, [30], []).map((entry) => entry.pid), [30, 31]);
  assert.deepEqual(processTree(processes, [30], [], [31]).map((entry) => entry.pid), [30]);
});

test("CR 173: the hang dump writes the processes, the log tails, the host state and the heartbeat", async () => {
  const directory = temporaryDirectory();
  try {
    const userData = path.join(directory, "user-data");
    fs.mkdirSync(path.join(userData, "logs", "20261028T000000", "window1", "exthost"), { recursive: true });
    const longLog = Array.from({ length: 500 }, (_, index) => `line ${index + 1}`).join("\n");
    fs.writeFileSync(path.join(userData, "logs", "20261028T000000", "main.log"), "main started\n");
    fs.writeFileSync(path.join(userData, "logs", "20261028T000000", "window1", "exthost", "exthost.log"), longLog);
    const heartbeatFile = path.join(directory, "heartbeat.json");
    writeHeartbeat(heartbeatFile);
    const dump = await writeHangDump({
      root: path.join(directory, "hang-dumps"),
      step: "stock coexistence/close",
      reason: "test",
      userDataDirectory: userData,
      heartbeatFile,
      hostState: () => ({ activeTab: "preview.md" }),
      rootPids: [process.pid],
      screenshots: false,
      now: new Date("2026-10-28T19:18:50.123Z"),
    });
    assert.equal(path.basename(dump), "20261028T191850123Z-stock-coexistence-close");
    const files = fs.readdirSync(dump).sort();
    for (const name of ["dump-errors.txt", "heartbeat.json", "host-state.json", "logs", "ps-forest.txt", "ps-vscode.txt", "summary.json"]) {
      assert.ok(files.includes(name), `${name} missing from ${files.join(", ")}`);
    }
    assert.match(fs.readFileSync(path.join(dump, "ps-forest.txt"), "utf8"), /PID/u);
    const tail = fs.readFileSync(path.join(dump, "logs", "20261028T000000__window1__exthost__exthost.log"), "utf8").trimEnd().split("\n");
    assert.equal(tail.length, 300);
    assert.equal(tail[0], "line 201");
    assert.equal(tail.at(-1), "line 500");
    assert.ok(fs.existsSync(path.join(dump, "logs", "20261028T000000__main.log")));
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(dump, "host-state.json"), "utf8")), { activeTab: "preview.md" });
    assert.equal(fs.readFileSync(path.join(dump, "dump-errors.txt"), "utf8"), "none\n");
    const again = await writeHangDump({ root: path.join(directory, "hang-dumps"), step: "stock coexistence/close", reason: "again",
      screenshots: false, now: new Date("2026-10-28T19:18:50.123Z") });
    assert.equal(path.basename(again), "20261028T191850123Z-stock-coexistence-close-2");
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("CR 173: a launch whose heartbeat goes stale is dumped, killed with its descendants and failed", async () => {
  const directory = temporaryDirectory();
  const stuck = spawnStuckProcess();
  const grandchild = await stuck.grandchild;
  try {
    const heartbeatFile = path.join(directory, "heartbeat.json");
    markProgress("tabGroups.close of preview.md");
    const launch = stuck.exited;
    const watched = watchLaunch({
      name: "trusted-suite.js", heartbeatFile, rootPid: () => stuck.child.pid, staleMs: 1_000, deadlineMs: 60_000,
      pollMs: 100, dumpRoot: path.join(directory, "hang-dumps"), screenshots: false, log: () => undefined,
    }, launch);
    await runStep("stock-coexistence", 10_000, async () => writeHeartbeat(heartbeatFile), () => undefined);
    await assert.rejects(watched, (error: Error) => {
      assert.match(error.message, /LAUNCH HANG: trusted-suite\.js: no extension host heartbeat for \d+ s/u);
      assert.match(error.message, /last heartbeat step: stock-coexistence/u);
      assert.match(error.message, /killed VS Code processes: \d+/u);
      return true;
    });
    assert.equal(await stuck.exited, "SIGKILL");
    assert.equal(await waitUntilDead(grandchild), true, "the grandchild survived");
    const dumps = fs.readdirSync(path.join(directory, "hang-dumps"));
    assert.equal(dumps.length, 1);
    assert.match(dumps[0], /-stock-coexistence$/u);
    assert.ok(fs.existsSync(path.join(directory, "hang-dumps", dumps[0], "heartbeat.json")));
  } finally {
    stuck.child.kill("SIGKILL");
    if (isAlive(grandchild)) process.kill(grandchild, "SIGKILL");
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("CR 173: a launch past its deadline is killed even without any heartbeat; a healthy one passes", async () => {
  const directory = temporaryDirectory();
  const stuck = spawnStuckProcess();
  const grandchild = await stuck.grandchild;
  try {
    await assert.rejects(watchLaunch({
      name: "untrusted-suite.js", heartbeatFile: path.join(directory, "never.json"), rootPid: () => stuck.child.pid,
      staleMs: 60_000, deadlineMs: 1_000, pollMs: 100, dumpRoot: path.join(directory, "hang-dumps"),
      screenshots: false, log: () => undefined,
    }, stuck.exited), /LAUNCH TIMEOUT: untrusted-suite\.js exceeded its 1000 ms deadline .*no heartbeat was ever written/u);
    assert.equal(await stuck.exited, "SIGKILL");
    assert.equal(await waitUntilDead(grandchild), true, "the grandchild survived");
    assert.equal(await watchLaunch({ name: "healthy", deadlineMs: 1_000, pollMs: 100, screenshots: false },
      Promise.resolve("done")), "done");
  } finally {
    stuck.child.kill("SIGKILL");
    if (isAlive(grandchild)) process.kill(grandchild, "SIGKILL");
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("CR 173: without a root pid the watchdog kills the launch found by its user-data directory, not a parallel one", async () => {
  const directory = temporaryDirectory();
  const dirA = fs.mkdtempSync(path.join(directory, "studio-a-d-"));
  const dirB = fs.mkdtempSync(path.join(directory, "studio-b-d-"));
  const launchA = spawnStuckProcess([`--user-data-dir=${dirA}`]);
  const launchB = spawnStuckProcess([`--user-data-dir=${dirB}`]);
  const grandchildA = await launchA.grandchild;
  const grandchildB = await launchB.grandchild;
  try {
    await assert.rejects(watchLaunch({
      name: "trusted-suite.js", userDataDirectory: dirA, staleMs: 60_000, deadlineMs: 1_000, pollMs: 100,
      dumpRoot: path.join(directory, "hang-dumps"), screenshots: false, log: () => undefined,
    }, launchA.exited), (error: Error) => {
      assert.match(error.message, /LAUNCH TIMEOUT: trusted-suite\.js/u);
      assert.match(error.message, new RegExp(`killed VS Code processes: .*\\b${launchA.child.pid}\\b`, "u"));
      return true;
    });
    assert.equal(await launchA.exited, "SIGKILL");
    assert.equal(await waitUntilDead(grandchildA), true, "the grandchild of launch A survived");
    assert.equal(isAlive(launchB.child.pid!), true, "the parallel launch B was killed");
    assert.equal(isAlive(grandchildB), true, "the grandchild of launch B was killed");
  } finally {
    for (const pid of [launchA.child.pid, grandchildA, launchB.child.pid, grandchildB]) {
      if (pid !== undefined && isAlive(pid)) process.kill(pid, "SIGKILL");
    }
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
