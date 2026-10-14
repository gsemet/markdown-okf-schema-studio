#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { createServer } from "node:net";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const skillRoot = path.resolve(path.dirname(scriptPath), "..");
const repoRoot = path.resolve(skillRoot, "../../..");
const extensionRoot = repoRoot;
const fixturesRoot = path.join(skillRoot, "assets/fixtures");
const defaultWindowHeight = 900;
const defaultMaxMinutes = 15;
const defaultMaxActions = 50;
const ownershipMarkerName = ".msqa-owner.json";

function parseArgs(argv) {
  const [command, ...tokens] = argv;
  const options = {};
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!token.startsWith("--")) {
      throw new Error(`Unexpected argument: ${token}`);
    }
    const separator = token.indexOf("=");
    const name = token.slice(2, separator === -1 ? undefined : separator);
    const value = separator === -1 ? tokens[index + 1] : token.slice(separator + 1);
    if (value === undefined || (separator === -1 && value.startsWith("--"))) {
      options[name] = true;
    } else {
      options[name] = value;
      if (separator === -1) index += 1;
    }
  }
  return { command, options };
}

function requiredString(options, name) {
  const value = options[name];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing required option --${name}.`);
  }
  return value;
}

function positiveInteger(value, name, fallback) {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`--${name} must be a positive integer.`);
  }
  return parsed;
}

function loadSession(runDirectory) {
  const sessionPath = path.join(runDirectory, "helper-session.json");
  if (!fs.existsSync(sessionPath)) {
    throw new Error(`No helper session exists at ${sessionPath}.`);
  }
  return { sessionPath, session: JSON.parse(fs.readFileSync(sessionPath, "utf8")) };
}

function isExecutable(filePath) {
  try {
    fs.accessSync(filePath, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function commandOnPath(command) {
  return (process.env.PATH ?? "")
    .split(path.delimiter)
    .filter(Boolean)
    .map((directory) => path.join(directory, command))
    .find((candidate) => isExecutable(candidate));
}

function saveSession(sessionPath, session) {
  fs.writeFileSync(sessionPath, `${JSON.stringify(session, null, 2)}\n`, "utf8");
}

function hashFile(filePath) {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function readVsCodeVersion(executable) {
  const appDirectory = path.resolve(path.dirname(executable), "..", "Resources", "app");
  for (const packageName of ["product.json", "package.json"]) {
    const packagePath = path.join(appDirectory, packageName);
    if (!fs.existsSync(packagePath)) continue;
    const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
    if (packageJson.version) return String(packageJson.version);
  }
  const version = spawnSync(executable, ["--version"], {
    encoding: "utf8",
    env: { ...process.env, VSCODE_CLI: "1" },
  });
  const output = `${version.stdout ?? ""}\n${version.stderr ?? ""}`;
  const match = output.match(/\b\d+\.\d+\.\d+(?:[-+][\w.-]+)?\b/u);
  if (match) return match[0];
  throw new Error(`Could not determine the VS Code version for ${executable}.`);
}

function pathIsWithin(candidate, parent) {
  const relative = path.relative(parent, candidate);
  return relative === "" || (!relative.startsWith(".." + path.sep) && relative !== "..");
}

function assertOwnedDirectory(directory, label, expectedParent, expectedName) {
  const resolved = path.resolve(directory);
  let stat;
  try {
    stat = fs.lstatSync(resolved);
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }
  if (!stat.isDirectory() || stat.isSymbolicLink()) {
    throw new Error(`${label} is missing or is a symlink.`);
  }
  const expected = path.join(expectedParent, expectedName);
  if (fs.realpathSync(resolved) !== expected) {
    throw new Error(`${label} is not the expected canonical helper-owned path.`);
  }
}

function validateOwnedInstance(session, runDirectory) {
  const recordedInstanceDirectory = path.resolve(session.instanceDirectory);
  const temporaryDirectory = fs.realpathSync(os.tmpdir());
  const instanceDirectory = fs.realpathSync(recordedInstanceDirectory);
  if (path.dirname(instanceDirectory) !== temporaryDirectory
    || !path.basename(instanceDirectory).startsWith("msqa-")) {
    throw new Error("The helper session instance root is outside the owned temporary directory.");
  }
  const instanceStat = fs.lstatSync(recordedInstanceDirectory);
  if (!instanceStat.isDirectory() || instanceStat.isSymbolicLink()
    || fs.realpathSync(recordedInstanceDirectory) !== instanceDirectory) {
    throw new Error("The helper session instance root is not a canonical directory.");
  }

  const markerPath = path.join(recordedInstanceDirectory, ownershipMarkerName);
  const markerStat = fs.lstatSync(markerPath);
  if (markerStat.isSymbolicLink() || !markerStat.isFile()) {
    throw new Error("The helper ownership marker is missing or is a symlink.");
  }
  const marker = JSON.parse(fs.readFileSync(markerPath, "utf8"));
  const canonicalRunDirectory = fs.realpathSync(runDirectory);
  if (marker.instanceDirectory !== instanceDirectory
    || marker.runDirectory !== canonicalRunDirectory
    || marker.ownerToken !== session.ownerToken) {
    throw new Error("The helper ownership marker does not match the session.");
  }

  for (const [field, name] of [
    ["profileDirectory", "profile"],
    ["sharedDataDirectory", "shared-data"],
    ["extensionsDirectory", "extensions"],
    ["workspaceDirectory", "workspace"],
  ]) {
    assertOwnedDirectory(session[field], field, instanceDirectory, name);
  }
  return { instanceDirectory, marker };
}

function psResult(args, runner = spawnSync) {
  const result = runner("ps", args, { encoding: "utf8" });
  if (result.error || result.status === null) {
    return {
      state: "unknown",
      reason: result.error?.message ?? "The ps command did not return a status.",
    };
  }
  const stdout = String(result.stdout ?? "");
  const stderr = String(result.stderr ?? "");
  if (result.status !== 0) {
    if (stdout.trim() === "" && stderr.trim() === "") return { state: "absent" };
    return {
      state: "unknown",
      reason: stderr.trim() || `ps exited with status ${result.status}.`,
    };
  }
  return { state: "present", stdout };
}

function parseProcessLine(line) {
  const match = line.match(/^\s*(\d+)\s+(\d+)\s+(.{24})\s+(.*)$/u);
  if (!match) return undefined;
  return {
    pid: Number(match[1]),
    pgid: Number(match[2]),
    startMarker: match[3].trim(),
    command: match[4].trim(),
  };
}

function parseProcessRows(stdout) {
  const lines = stdout.split(/\r?\n/u).map((line) => line.trimEnd()).filter(Boolean);
  if (lines.length === 0) return { state: "absent" };
  const snapshots = lines.map(parseProcessLine);
  if (snapshots.some((snapshot) => !snapshot)) {
    return { state: "unknown", reason: "ps returned an unparseable process row." };
  }
  return { state: "present", snapshots };
}

function processSnapshot(pid, runner = spawnSync) {
  if (!Number.isInteger(pid) || pid < 1) {
    return { state: "unknown", reason: "The process PID is invalid." };
  }
  const result = psResult(
    ["-ww", "-p", String(pid), "-o", "pid=,pgid=,lstart=,command="],
    runner,
  );
  if (result.state !== "present") return result;
  const parsed = parseProcessRows(result.stdout);
  if (parsed.state !== "present") return parsed;
  return { state: "present", snapshot: parsed.snapshots[0] };
}

function processGroupSnapshot(pgid, runner = spawnSync) {
  if (!Number.isInteger(pgid) || pgid < 1) {
    return { state: "unknown", reason: "The process group ID is invalid." };
  }
  const result = psResult(
    ["-ww", "-g", String(pgid), "-o", "pid=,pgid=,lstart=,command="],
    runner,
  );
  if (result.state !== "present") return result;
  return parseProcessRows(result.stdout);
}

function signalState(target, signaler = process.kill) {
  if (!Number.isInteger(target) || target === 0) return "unknown";
  try {
    signaler(target, 0);
    return "present";
  } catch (error) {
    if (error.code === "ESRCH") return "absent";
    return "unknown";
  }
}

function processAliveState(pid, signaler = process.kill) {
  return signalState(pid, signaler);
}

function processGroupState(pgid, runner = spawnSync, signaler = process.kill) {
  const snapshot = processGroupSnapshot(pgid, runner);
  if (snapshot.state === "unknown") return snapshot;
  const signal = signalState(-pgid, signaler);
  if (signal === "unknown") {
    return { state: "unknown", reason: "The process group existence check was inconclusive." };
  }
  if (snapshot.state === "present" || signal === "present") {
    return { state: "present", snapshot: snapshot.snapshots ?? [] };
  }
  return { state: "absent" };
}

function processAlive(pid, signaler = process.kill) {
  return processAliveState(pid, signaler) === "present";
}

function assertProcessIdentity(session, { runner = spawnSync } = {}) {
  const identity = session.processIdentity;
  if (!identity || !Number.isInteger(identity.pid) || !Number.isInteger(identity.pgid)
    || typeof identity.startMarker !== "string" || identity.startMarker.length === 0) {
    throw new Error("The saved VS Code PID, start marker, or process group ownership record is missing.");
  }
  const result = processSnapshot(identity.pid, runner);
  if (result.state === "unknown") {
    throw new Error(`The saved VS Code process identity could not be verified: ${result.reason}`);
  }
  if (result.state === "absent") return { state: "absent", pid: identity.pid, pgid: identity.pgid };
  const snapshot = result.snapshot;
  if (snapshot.pid !== identity.pid || snapshot.pgid !== identity.pgid
    || snapshot.startMarker !== identity.startMarker) {
    throw new Error("The saved VS Code PID, start marker, or process group no longer identifies the isolated instance.");
  }
  const missingMarker = identity.commandMarkers.find((marker) => !snapshot.command.includes(marker));
  if (missingMarker) {
    throw new Error(`The saved VS Code PID is now owned by a different command (missing ${missingMarker}).`);
  }
  return { state: "present", snapshot };
}

function assertProcessGroupIdentity(
  session,
  { runner = spawnSync, signaler = process.kill, requireOwner = true } = {},
) {
  const identity = session.processIdentity;
  if (!identity || !Number.isInteger(identity.pgid)) {
    throw new Error("The saved VS Code process group ownership record is missing.");
  }
  const result = processGroupState(identity.pgid, runner, signaler);
  if (result.state === "unknown") {
    throw new Error(`The saved VS Code process group could not be verified: ${result.reason}`);
  }
  if (result.state === "absent") return { state: "absent", pgid: identity.pgid };
  const ownershipRecords = [
    { pid: identity.pid, pgid: identity.pgid, startMarker: identity.startMarker },
    ...(identity.groupMembers ?? []),
  ];
  const ownedMember = result.snapshot.find((member) => ownershipRecords.some((record) =>
    member.pid === record.pid
      && member.pgid === record.pgid
      && member.startMarker === record.startMarker));
  if (!ownedMember && requireOwner) {
    throw new Error("The saved VS Code process group is missing its recorded owner or has been reused.");
  }
  return {
    state: "present",
    pgid: identity.pgid,
    snapshot: result.snapshot,
    ownershipVerified: Boolean(ownedMember),
  };
}

function captureProcessIdentity(pid, commandMarkers, runner = spawnSync, signaler = process.kill) {
  const result = processSnapshot(pid, runner);
  if (result.state !== "present") {
    throw new Error(result.state === "unknown"
      ? `The isolated VS Code process identity could not be captured: ${result.reason}`
      : "The isolated VS Code process exited before its identity could be captured.");
  }
  const snapshot = result.snapshot;
  const group = processGroupState(snapshot.pgid, runner, signaler);
  if (group.state !== "present") {
    throw new Error(group.state === "unknown"
      ? `The isolated VS Code process group could not be captured: ${group.reason}`
      : "The isolated VS Code process group exited before its identity could be captured.");
  }
  const ownedMember = group.snapshot.find((member) =>
    member.pid === snapshot.pid
      && member.pgid === snapshot.pgid
      && member.startMarker === snapshot.startMarker);
  if (!ownedMember) {
    throw new Error("The isolated VS Code process group did not contain its recorded leader.");
  }
  return {
    pid: snapshot.pid,
    pgid: snapshot.pgid,
    startMarker: snapshot.startMarker,
    commandMarkers,
    groupMembers: [{
      pid: snapshot.pid,
      pgid: snapshot.pgid,
      startMarker: snapshot.startMarker,
    }],
  };
}

function assertSharedStorageIsolation(session) {
  const log = fs.readFileSync(session.launchLogPath, "utf8");
  const paths = [...log.matchAll(/shared storage database at ['"]([^'"]+)['"]/gu)]
    .map((match) => path.resolve(match[1]));
  if (paths.length === 0) {
    throw new Error("VS Code did not report a shared-storage database path; isolation is unverified.");
  }
  const expectedRoot = path.resolve(session.sharedDataDirectory);
  const unexpectedPath = paths.find((storagePath) => !pathIsWithin(storagePath, expectedRoot));
  if (unexpectedPath) {
    throw new Error(`VS Code used shared storage outside the disposable directory: ${unexpectedPath}`);
  }
  return paths;
}

async function waitForSharedStorageIsolation(session, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      return assertSharedStorageIsolation(session);
    } catch (error) {
      lastError = error;
      if (!error.message.includes("did not report a shared-storage database path")) throw error;
      await delay(100);
    }
  }
  throw lastError ?? new Error("Shared-storage isolation could not be verified.");
}

function writeCleanupEvidence(runDirectory, cleanup) {
  const evidenceDirectory = path.join(runDirectory, "evidence");
  fs.mkdirSync(evidenceDirectory, { recursive: true });
  const cleanupPath = path.join(evidenceDirectory, "cleanup.json");
  fs.writeFileSync(cleanupPath, `${JSON.stringify(cleanup, null, 2)}\n`, "utf8");
  return cleanupPath;
}

function awaitChildStart(child, launchLogPath) {
  return new Promise((resolve, reject) => {
    let settled = false;
    child.on("error", (error) => {
      fs.appendFileSync(launchLogPath, `Spawn error: ${error.message}\n`, "utf8");
      if (settled) return;
      settled = true;
      reject(error);
    });
    child.once("spawn", () => {
      if (settled) return;
      settled = true;
      resolve();
    });
    child.once("exit", (code, signal) => {
      fs.appendFileSync(launchLogPath, `Process exit: code=${code} signal=${signal}\n`, "utf8");
    });
  });
}

function resolveExecutable() {
  const explicit = process.env.VSCODE_EXECUTABLE;
  if (explicit) {
    const resolved = path.isAbsolute(explicit) ? explicit : commandOnPath(explicit);
    if (resolved) return resolved;
    throw new Error(`VSCODE_EXECUTABLE is not executable: ${explicit}`);
  }

  const candidates = process.platform === "darwin"
    ? [
      "/Applications/Visual Studio Code.app/Contents/MacOS/Code",
      "/Applications/Visual Studio Code - Insiders.app/Contents/MacOS/Code",
    ]
    : [];
  const localExecutable = candidates.find((candidate) => isExecutable(candidate));
  const pathExecutable = commandOnPath("code");
  if (localExecutable) return localExecutable;
  if (pathExecutable) return pathExecutable;
  throw new Error(
    "No installed VS Code executable was found. Set VSCODE_EXECUTABLE or ask for setup assistance.",
  );
}

function readExtensionBuildInfo() {
  const packagePath = path.join(extensionRoot, "package.json");
  if (!fs.existsSync(packagePath)) {
    throw new Error(`Extension package not found at ${packagePath}.`);
  }
  const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  const mainPath = path.resolve(extensionRoot, packageJson.main);
  if (!fs.existsSync(mainPath)) {
    throw new Error(
      `Built extension entry point is missing at ${mainPath}. Run the existing compile and bundle commands first.`,
    );
  }
  const bundleSha256 = createHash("sha256")
    .update(fs.readFileSync(mainPath))
    .digest("hex");
  return {
    version: String(packageJson.version ?? "unknown"),
    mainPath,
    bundleSha256,
  };
}

async function reservePort() {
  const server = createServer();
  try {
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Could not reserve a local debugging port.");
    }
    return address.port;
  } finally {
    if (server.listening) {
      await new Promise((resolve, reject) => server.close((error) =>
        error ? reject(error) : resolve()));
    }
  }
}

async function fetchTargets(port) {
  const response = await fetch(`http://127.0.0.1:${port}/json/list`);
  if (!response.ok) throw new Error(`CDP returned HTTP ${response.status}.`);
  const targets = await response.json();
  return targets.filter((target) => target.type === "page" && target.webSocketDebuggerUrl);
}

function targetScore(target) {
  const title = String(target.title ?? "");
  const url = String(target.url ?? "");
  return (title.includes("Visual Studio Code") ? 4 : 0)
    + (url.includes("workbench") ? 2 : 0)
    + (url.startsWith("file:") || url.startsWith("vscode-file:") ? 1 : 0);
}

async function waitForTarget(port, childPid, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const targets = await fetchTargets(port);
      if (targets.length > 0) {
        return targets.sort((left, right) => targetScore(right) - targetScore(left))[0];
      }
    } catch (error) {
      lastError = error;
    }
    try {
      process.kill(-childPid, 0);
    } catch {
      throw new Error("The isolated VS Code process exited before exposing a UI target.");
    }
    await delay(250);
  }
  throw new Error(`No VS Code page target became available within ${timeoutMs} ms.${
    lastError ? ` Last endpoint error: ${lastError.message}` : ""
  }`);
}

class CdpClient {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 0;
    this.pending = new Map();
    socket.addEventListener("message", (event) => {
      let message;
      try {
        message = JSON.parse(String(event.data));
      } catch {
        return;
      }
      if (!message.id) return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) {
        pending.reject(new Error(message.error.message ?? "CDP command failed."));
      } else {
        pending.resolve(message.result ?? {});
      }
    });
    socket.addEventListener("close", () => {
      for (const pending of this.pending.values()) {
        pending.reject(new Error("CDP connection closed."));
      }
      this.pending.clear();
    });
    socket.addEventListener("error", () => {
      for (const pending of this.pending.values()) {
        pending.reject(new Error("CDP WebSocket error."));
      }
      this.pending.clear();
    });
  }

  static async connect(url) {
    const socket = new WebSocket(url);
    await new Promise((resolve, reject) => {
      socket.addEventListener("open", resolve, { once: true });
      socket.addEventListener("error", () => reject(new Error("Could not connect to CDP.")), {
        once: true,
      });
    });
    return new CdpClient(socket);
  }

  call(method, params = {}) {
    const id = ++this.nextId;
    this.socket.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }

  close() {
    this.socket.close();
  }
}

async function connectSession(session) {
  if (!session.port || !session.target?.webSocketDebuggerUrl) {
    throw new Error("The helper session has no active CDP target.");
  }
  const targets = await fetchTargets(session.port);
  const target = targets.find((entry) => entry.id === session.target.id);
  if (!target) throw new Error("The isolated VS Code UI target is no longer available.");
  const cdp = await CdpClient.connect(target.webSocketDebuggerUrl);
  await cdp.call("Page.enable");
  await cdp.call("Runtime.enable");
  await cdp.call("Emulation.setDeviceMetricsOverride", {
    width: session.requestedWidth,
    height: defaultWindowHeight,
    deviceScaleFactor: 1,
    mobile: false,
  });
  return cdp;
}

async function waitForProcessTermination(session, timeoutMs = 5_000, dependencies = {}) {
  const runner = dependencies.runner ?? spawnSync;
  const signaler = dependencies.signaler ?? process.kill;
  const deadline = Date.now() + timeoutMs;
  let lastProbe;
  while (Date.now() < deadline) {
    const leader = assertProcessIdentity(session, { runner });
    const group = assertProcessGroupIdentity(session, {
      runner,
      signaler,
      requireOwner: false,
    });
    lastProbe = { leader, group };
    if (leader.state === "absent" && group.state === "absent") {
      return {
        verified: true,
        leaderAlive: false,
        groupAlive: false,
        leaderState: leader.state,
        groupState: group.state,
        groupOwnershipVerified: true,
      };
    }
    await delay(100);
  }
  const leader = assertProcessIdentity(session, { runner });
  const group = assertProcessGroupIdentity(session, {
    runner,
    signaler,
    requireOwner: false,
  });
  lastProbe = { leader, group };
  return {
    verified: false,
    leaderAlive: lastProbe.leader.state === "present",
    groupAlive: lastProbe.group.state === "present",
    leaderState: lastProbe.leader.state,
    groupState: lastProbe.group.state,
    groupOwnershipVerified: lastProbe.group.ownershipVerified,
  };
}

async function stopProcessGroup(session, dependencies = {}) {
  const runner = dependencies.runner ?? spawnSync;
  const signaler = dependencies.signaler ?? process.kill;
  const wait = dependencies.wait ?? waitForProcessTermination;
  if (!session.processSpawnAttempted && !session.processPid && !session.processIdentity) {
    return {
      verified: true,
      signal: "not-started",
      leaderAlive: false,
      groupAlive: false,
    };
  }
  if (!session.processIdentity) {
    throw new Error("VS Code startup was attempted without a complete process ownership record.");
  }

  const beforeLeader = assertProcessIdentity(session, { runner });
  const beforeGroup = assertProcessGroupIdentity(session, {
    runner,
    signaler,
    requireOwner: true,
  });
  if (beforeLeader.state === "absent" && beforeGroup.state === "absent") {
    return {
      verified: true,
      signal: "already-exited",
      leaderAlive: false,
      groupAlive: false,
      pid: session.processIdentity.pid,
      pgid: session.processIdentity.pgid,
    };
  }
  if (beforeLeader.state !== "present" || beforeGroup.state !== "present") {
    throw new Error("The isolated VS Code process or process group identity is incomplete.");
  }

  let signal = "SIGTERM";
  try {
    signaler(-beforeGroup.pgid, "SIGTERM");
  } catch (error) {
    if (error.code !== "ESRCH") throw error;
  }
  let termination = await wait(session, 5_000, { runner, signaler });
  if (!termination.verified) {
    const escalationLeader = assertProcessIdentity(session, { runner });
    const escalationGroup = assertProcessGroupIdentity(session, {
      runner,
      signaler,
      requireOwner: true,
    });
    if (escalationLeader.state !== "present" || escalationGroup.state !== "present") {
      throw new Error(
        "SIGKILL was blocked because the saved VS Code PID, start marker, or process group "
          + "could not be verified at escalation.",
      );
    }
    signal = "SIGKILL";
    try {
      signaler(-escalationGroup.pgid, "SIGKILL");
    } catch (error) {
      if (error.code !== "ESRCH") throw error;
    }
    termination = await wait(session, 5_000, { runner, signaler });
  }
  if (!termination.verified) {
    throw new Error(
      `VS Code process termination was not verified (leaderAlive=${termination.leaderAlive}, `
        + `groupAlive=${termination.groupAlive}).`,
    );
  }
  return {
    ...termination,
    signal,
    pid: beforeLeader.snapshot.pid,
    pgid: beforeGroup.pgid,
    command: beforeLeader.snapshot.command,
  };
}

function removeOwnedInstance(session, runDirectory) {
  const { instanceDirectory } = validateOwnedInstance(session, runDirectory);
  fs.rmSync(instanceDirectory, { recursive: true, force: false });
  if (fs.existsSync(instanceDirectory)) {
    throw new Error(`Disposable data still exists after cleanup: ${instanceDirectory}`);
  }
  return { path: instanceDirectory, verifiedAbsent: true };
}

function cleanupFreshInstance(sessionPath, session, runDirectory) {
  if (session.processSpawnAttempted || session.processPid || session.processIdentity) {
    throw new Error("Cannot remove an unowned instance after process startup was attempted.");
  }
  const cleanup = {
    command: "launch-failure",
    status: "started",
    startedAt: new Date().toISOString(),
    instanceDirectory: session.instanceDirectory,
    processPid: null,
  };
  const cleanupPath = writeCleanupEvidence(runDirectory, cleanup);
  session.cleanupEvidence = path.relative(runDirectory, cleanupPath);
  saveSession(sessionPath, session);
  cleanup.processTermination = {
    verified: true,
    signal: "not-started",
    leaderAlive: false,
    groupAlive: false,
  };
  cleanup.terminatedAt = new Date().toISOString();
  writeCleanupEvidence(runDirectory, cleanup);
  cleanup.deletion = removeFreshInstance(session.instanceDirectory);
  cleanup.status = "completed";
  cleanup.finishedAt = new Date().toISOString();
  session.cleanup = cleanup;
  saveSession(sessionPath, session);
  writeCleanupEvidence(runDirectory, cleanup);
  return cleanup;
}

function removeFreshInstance(instanceDirectory) {
  const temporaryDirectory = fs.realpathSync(os.tmpdir());
  const recordedInstanceDirectory = path.resolve(instanceDirectory);
  const canonicalInstanceDirectory = fs.realpathSync(recordedInstanceDirectory);
  if (path.dirname(canonicalInstanceDirectory) !== temporaryDirectory
    || !path.basename(canonicalInstanceDirectory).startsWith("msqa-")) {
    throw new Error("The fresh helper instance root is outside the owned temporary directory.");
  }
  const instanceStat = fs.lstatSync(recordedInstanceDirectory);
  if (!instanceStat.isDirectory() || instanceStat.isSymbolicLink()
    || fs.realpathSync(recordedInstanceDirectory) !== canonicalInstanceDirectory) {
    throw new Error("The fresh helper instance root is not a canonical directory.");
  }
  fs.rmSync(recordedInstanceDirectory, { recursive: true, force: false });
  if (fs.existsSync(recordedInstanceDirectory)) {
    throw new Error(`Disposable data still exists after cleanup: ${recordedInstanceDirectory}`);
  }
  return { path: recordedInstanceDirectory, verifiedAbsent: true };
}

async function cleanupSession(sessionPath, session, runDirectory, command) {
  const cleanup = {
    command,
    status: "started",
    startedAt: new Date().toISOString(),
    instanceDirectory: session.instanceDirectory,
    profileDirectory: session.profileDirectory,
    sharedDataDirectory: session.sharedDataDirectory,
    extensionsDirectory: session.extensionsDirectory,
    workspaceDirectory: session.workspaceDirectory,
    processPid: session.processPid,
  };
  const cleanupPath = writeCleanupEvidence(runDirectory, cleanup);
  session.cleanupEvidence = path.relative(runDirectory, cleanupPath);
  saveSession(sessionPath, session);
  try {
    validateOwnedInstance(session, runDirectory);
    cleanup.ownershipVerifiedAt = new Date().toISOString();
    cleanup.processTermination = await stopProcessGroup(session);
    cleanup.terminatedAt = new Date().toISOString();
    writeCleanupEvidence(runDirectory, cleanup);
    cleanup.deletion = removeOwnedInstance(session, runDirectory);
    cleanup.status = "completed";
    cleanup.finishedAt = new Date().toISOString();
    session.cleanup = cleanup;
    saveSession(sessionPath, session);
    writeCleanupEvidence(runDirectory, cleanup);
    return cleanup;
  } catch (error) {
    cleanup.status = "blocked";
    cleanup.error = error.message;
    cleanup.finishedAt = new Date().toISOString();
    session.cleanup = cleanup;
    saveSession(sessionPath, session);
    writeCleanupEvidence(runDirectory, cleanup);
    throw error;
  }
}

async function captureScreenshot(cdp, evidenceDirectory, name) {
  const safeName = name ?? `ui-${new Date().toISOString().replaceAll(":", "-")}.png`;
  if (!/^[a-zA-Z0-9._-]+\.png$/u.test(safeName)) {
    throw new Error("Screenshot name must be a simple .png filename.");
  }
  fs.mkdirSync(evidenceDirectory, { recursive: true });
  const result = await cdp.call("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
    captureBeyondViewport: false,
  });
  if (!result.data) throw new Error("VS Code returned an empty screenshot.");
  const screenshotPath = path.join(evidenceDirectory, safeName);
  fs.writeFileSync(screenshotPath, Buffer.from(result.data, "base64"));
  const metrics = await cdp.call("Page.getLayoutMetrics");
  return {
    screenshotPath,
    viewport: metrics.cssVisualViewport
      ? {
        width: Math.round(metrics.cssVisualViewport.clientWidth),
        height: Math.round(metrics.cssVisualViewport.clientHeight),
      }
      : { width: undefined, height: undefined },
    bytes: Buffer.byteLength(result.data, "base64"),
  };
}

async function waitForWorkbenchScreenshot(cdp, evidenceDirectory) {
  const deadline = Date.now() + 20_000;
  const readyAfter = Date.now() + 5_000;
  let image;
  do {
    image = await captureScreenshot(cdp, evidenceDirectory, "initial.png");
    if (Date.now() >= readyAfter && image.bytes >= 20_000) return image;
    await delay(250);
  } while (Date.now() < deadline);
  throw new Error(
    `The VS Code workbench did not produce a populated screenshot within 20 seconds `
      + `(last frame: ${image.bytes} bytes).`,
  );
}

function writeInitializationEvidence(runDirectory, initialization) {
  const evidenceDirectory = path.join(runDirectory, "evidence");
  fs.mkdirSync(evidenceDirectory, { recursive: true });
  const evidencePath = path.join(evidenceDirectory, "initialization-failure.json");
  fs.writeFileSync(evidencePath, `${JSON.stringify(initialization, null, 2)}\n`, "utf8");
  return evidencePath;
}

async function launch(options, runDirectory, dependencies = {}) {
  if (fs.existsSync(path.join(runDirectory, "helper-session.json"))) {
    throw new Error("This run directory already has a helper session; use a fresh tester ID.");
  }
  const theme = options.theme ?? "light";
  if (theme !== "light" && theme !== "dark") {
    throw new Error("--theme must be light or dark.");
  }
  const requestedWidth = positiveInteger(options.width, "width", 1440);
  if (requestedWidth < 900 || requestedWidth > 2400) {
    throw new Error("--width must be between 900 and 2400 pixels.");
  }
  const maxMinutes = positiveInteger(options["max-minutes"], "max-minutes", defaultMaxMinutes);
  const maxActions = positiveInteger(options["max-actions"], "max-actions", defaultMaxActions);
  const documentName = options.document ?? "finding.md";
  if (!new Set(["finding.md", "repair-me.md"]).has(documentName)) {
    throw new Error("--document must be finding.md or repair-me.md.");
  }
  const getExtensionBuildInfo = dependencies.readExtensionBuildInfo ?? readExtensionBuildInfo;
  const getExecutable = dependencies.resolveExecutable ?? resolveExecutable;
  const getVsCodeVersion = dependencies.readVsCodeVersion ?? readVsCodeVersion;
  const reserveDebugPort = dependencies.reservePort ?? reservePort;
  const spawnProcess = dependencies.spawn ?? spawn;
  const extensionInfo = getExtensionBuildInfo();
  const executable = getExecutable();
  const vscodeVersion = getVsCodeVersion(executable);
  const canonicalRunDirectory = fs.realpathSync(runDirectory);
  const helperScriptSha256 = hashFile(scriptPath);
  const instanceDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "msqa-"));
  const profileDirectory = path.join(instanceDirectory, "profile");
  const sharedDataDirectory = path.join(instanceDirectory, "shared-data");
  const extensionsDirectory = path.join(instanceDirectory, "extensions");
  const workspaceDirectory = path.join(instanceDirectory, "workspace");
  const documentPath = path.join(workspaceDirectory, documentName);
  const sessionPath = path.join(runDirectory, "helper-session.json");
  const evidenceDirectory = path.join(runDirectory, "evidence");
  const launchLogPath = path.join(evidenceDirectory, "vscode-launch.log");
  const ownerToken = randomUUID();
  const commandMarkers = [
    `--user-data-dir=${profileDirectory}`,
    `--shared-data-dir=${sharedDataDirectory}`,
    `--extensions-dir=${extensionsDirectory}`,
    `--extensionDevelopmentPath=${extensionRoot}`,
  ];
  const retainedFixtureDirectory = path.join(evidenceDirectory, "fixtures");
  const retainedConfigDirectory = path.join(evidenceDirectory, "config");
  let session;
  let setupPhase = "instance-created";
  let ownershipRecorded = false;
  let child;
  let launchLogDescriptor;
  try {
    setupPhase = "ownership-marker";
    session = {
      command: "launch",
      status: "initializing",
      runDirectory: canonicalRunDirectory,
      processPid: null,
      processSpawnAttempted: false,
      spawnOutcome: "not-started",
      ownerToken,
      processIdentity: null,
      port: null,
      theme,
      requestedWidth,
      maxMinutes,
      maxActions,
      inputActions: 0,
      executable,
      vscodeVersion,
      extensionRoot,
      instanceDirectory,
      extensionVersion: extensionInfo.version,
      extensionMain: extensionInfo.mainPath,
      extensionBundleSha256: extensionInfo.bundleSha256,
      helperScript: scriptPath,
      helperScriptSha256,
      profileDirectory,
      sharedDataDirectory,
      extensionsDirectory,
      workspaceDirectory,
      documentPath,
      launchLogPath,
      retainedFixturePaths: [
        path.relative(runDirectory, path.join(retainedFixtureDirectory, documentName)),
        path.relative(runDirectory, path.join(retainedFixtureDirectory, "_schema", "finding.schema.yaml")),
      ],
      retainedConfigPaths: [path.relative(runDirectory, path.join(retainedConfigDirectory, "settings.json"))],
      initializationPhase: setupPhase,
    };
    fs.writeFileSync(path.join(instanceDirectory, ownershipMarkerName), `${JSON.stringify({
      version: 1,
      ownerToken,
      instanceDirectory: fs.realpathSync(instanceDirectory),
      runDirectory: canonicalRunDirectory,
    }, null, 2)}\n`, "utf8");
    setupPhase = "ownership-recorded";
    session.initializationPhase = setupPhase;
    saveSession(sessionPath, session);
    ownershipRecorded = true;

    setupPhase = "port-reservation";
    session.initializationPhase = setupPhase;
    saveSession(sessionPath, session);
    session.port = await reserveDebugPort();
    session.portReleasedAt = new Date().toISOString();

    setupPhase = "isolated-directories";
    session.initializationPhase = setupPhase;
    saveSession(sessionPath, session);
    fs.mkdirSync(evidenceDirectory, { recursive: true });
    fs.mkdirSync(profileDirectory, { recursive: true });
    fs.mkdirSync(sharedDataDirectory, { recursive: true });
    fs.mkdirSync(extensionsDirectory, { recursive: true });

    setupPhase = "fixture-copy";
    session.initializationPhase = setupPhase;
    saveSession(sessionPath, session);
    fs.cpSync(fixturesRoot, workspaceDirectory, { recursive: true });

    setupPhase = "settings-write";
    session.initializationPhase = setupPhase;
    saveSession(sessionPath, session);
    fs.mkdirSync(path.join(profileDirectory, "User"), { recursive: true });
    fs.writeFileSync(path.join(profileDirectory, "User", "settings.json"), `${JSON.stringify({
      "security.workspace.trust.enabled": false,
      "window.restoreWindows": "none",
      "workbench.startupEditor": "none",
      "workbench.colorTheme": theme === "dark" ? "Default Dark Modern" : "Default Light Modern",
    }, null, 2)}\n`, "utf8");

    setupPhase = "evidence-retention-copy";
    session.initializationPhase = setupPhase;
    saveSession(sessionPath, session);
    fs.mkdirSync(path.join(retainedFixtureDirectory, "_schema"), { recursive: true });
    fs.mkdirSync(retainedConfigDirectory, { recursive: true });
    fs.copyFileSync(
      path.join(workspaceDirectory, documentName),
      path.join(retainedFixtureDirectory, documentName),
    );
    fs.copyFileSync(
      path.join(fixturesRoot, "_schema", "finding.schema.yaml"),
      path.join(retainedFixtureDirectory, "_schema", "finding.schema.yaml"),
    );
    fs.copyFileSync(
      path.join(profileDirectory, "User", "settings.json"),
      path.join(retainedConfigDirectory, "settings.json"),
    );

    const startedAt = new Date().toISOString();
    session.startedAt = startedAt;
    setupPhase = "launch-log";
    session.initializationPhase = setupPhase;
    saveSession(sessionPath, session);
    fs.appendFileSync(
      launchLogPath,
      `Helper isolation: user-data=${profileDirectory} shared-data=${sharedDataDirectory} `
        + `extensions=${extensionsDirectory}\n`,
      "utf8",
    );

    setupPhase = "spawn-attempt";
    session.initializationPhase = setupPhase;
    session.processSpawnAttempted = true;
    session.spawnOutcome = "pending";
    saveSession(sessionPath, session);
    try {
      launchLogDescriptor = fs.openSync(launchLogPath, "a");
      child = spawnProcess(executable, [
        "--no-sandbox",
        "--disable-gpu-sandbox",
        "--disable-updates",
        "--skip-welcome",
        "--skip-release-notes",
        "--new-window",
        `--user-data-dir=${profileDirectory}`,
        `--shared-data-dir=${sharedDataDirectory}`,
        `--extensions-dir=${extensionsDirectory}`,
        `--extensionDevelopmentPath=${extensionRoot}`,
        `--remote-debugging-port=${session.port}`,
        workspaceDirectory,
        "--goto",
        `${documentPath}:1`,
      ], { detached: true, stdio: ["ignore", launchLogDescriptor, launchLogDescriptor] });
      await awaitChildStart(child, launchLogPath);
      if (!child?.pid) throw new Error("VS Code spawn returned no process PID.");
      session.processPid = child.pid ?? null;
      session.spawnOutcome = "started";
      session.initializationPhase = "process-spawned";
      saveSession(sessionPath, session);
    } catch (error) {
      if (child && !child.pid) {
        session.processSpawnAttempted = false;
        session.processPid = null;
        session.processIdentity = null;
        session.spawnOutcome = "failed-no-process";
        setupPhase = "spawn-failed";
        session.initializationPhase = setupPhase;
        session.spawnError = error.message;
        saveSession(sessionPath, session);
      }
      throw error;
    } finally {
      if (launchLogDescriptor !== undefined) {
        fs.closeSync(launchLogDescriptor);
        launchLogDescriptor = undefined;
      }
    }
    child.unref();

    setupPhase = "process-identity";
    session.initializationPhase = setupPhase;
    session.processIdentity = captureProcessIdentity(child.pid, commandMarkers);
    session.processIdentityCapturedAt = new Date().toISOString();
    saveSession(sessionPath, session);

    const target = await waitForTarget(session.port, child.pid);
    session.target = {
      id: target.id,
      title: target.title,
      url: target.url,
      webSocketDebuggerUrl: target.webSocketDebuggerUrl,
    };
    const processIdentity = assertProcessIdentity(session);
    if (processIdentity.state !== "present") {
      throw new Error("The isolated VS Code process disappeared before identity capture.");
    }
    session.processIdentity = {
      ...session.processIdentity,
      command: processIdentity.snapshot.command,
      observedAt: new Date().toISOString(),
    };
    session.sharedStorageDatabasePaths = await waitForSharedStorageIsolation(session);
    session.status = "running";
    saveSession(sessionPath, session);
    const cdp = await connectSession(session);
    try {
      const image = await waitForWorkbenchScreenshot(cdp, evidenceDirectory);
      session.initialScreenshot = path.relative(runDirectory, image.screenshotPath);
      session.actualViewport = image.viewport;
      saveSession(sessionPath, session);
      console.log(JSON.stringify({
        status: session.status,
        processPid: child.pid,
        extensionVersion: session.extensionVersion,
        target: session.target,
        requestedViewport: { width: requestedWidth, height: defaultWindowHeight },
        actualViewport: image.viewport,
        screenshot: session.initialScreenshot,
        evidenceDirectory: path.join(runDirectory, "evidence"),
        launchLog: launchLogPath,
        helperSession: sessionPath,
        maxMinutes,
        maxActions,
      }, null, 2));
    } finally {
      cdp.close();
    }
  } catch (error) {
    session.status = "blocked";
    session.launchError = error.message;
    session.initializationPhase = setupPhase;
    session.stoppedAt = new Date().toISOString();
    const initializationPath = writeInitializationEvidence(runDirectory, {
      status: session.status,
      phase: setupPhase,
      error: error.message,
      port: session.port,
      portReleasedAt: session.portReleasedAt,
      processSpawnAttempted: session.processSpawnAttempted,
      processPid: session.processPid,
      processIdentityCaptured: Boolean(session.processIdentity),
      helperSession: path.relative(runDirectory, sessionPath),
    });
    session.initializationEvidence = path.relative(runDirectory, initializationPath);
    saveSession(sessionPath, session);
    try {
      if (ownershipRecorded) {
        await cleanupSession(sessionPath, session, runDirectory, "launch-failure");
      } else {
        cleanupFreshInstance(sessionPath, session, runDirectory);
      }
    } catch (cleanupError) {
      session.status = "cleanup-blocked";
      session.cleanupError = cleanupError.message;
      saveSession(sessionPath, session);
      throw new Error(
        `${error.message} Cleanup was blocked: ${cleanupError.message}. `
          + `Retained failure status is in ${sessionPath}.`,
      );
    }
    throw new Error(`${error.message} Temporary VS Code data was cleaned; failure status is in ${sessionPath}.`);
  }
}

function assertInputBudget(session) {
  const elapsedMs = Date.now() - Date.parse(session.startedAt);
  if (elapsedMs >= session.maxMinutes * 60_000) {
    throw new Error(`The ${session.maxMinutes}-minute assignment limit has been reached.`);
  }
  if (session.inputActions >= session.maxActions) {
    throw new Error(`The ${session.maxActions}-action assignment limit has been reached.`);
  }
  if (session.status !== "running") {
    throw new Error(`This session is ${session.status}; UI input is unavailable.`);
  }
}

function recordInput(sessionPath, session, action) {
  session.inputActions += 1;
  session.lastInput = { action, at: new Date().toISOString() };
  saveSession(sessionPath, session);
}

async function status(runDirectory) {
  const { session } = loadSession(runDirectory);
  let targets = [];
  let processIdentity;
  let processGroup;
  let processIdentityError;
  try {
    processIdentity = assertProcessIdentity(session);
  } catch (error) {
    processIdentityError = error.message;
  }
  if (session.status === "running") {
    try {
      targets = await fetchTargets(session.port);
      processGroup = assertProcessGroupIdentity(session, { requireOwner: false });
    } catch (error) {
      session.status = "unavailable";
      processIdentityError ??= error.message;
    }
  }
  console.log(JSON.stringify({
    status: session.status,
    processPid: session.processPid,
    processAlive: processIdentity?.state ?? "unknown",
    processGroupAlive: processGroup?.state ?? "unknown",
    processIdentityVerified: processIdentity?.state === "present",
    processGroupIdentityVerified: processGroup?.ownershipVerified ?? false,
    processIdentityError,
    targetAvailable: targets.some((target) => target.id === session.target?.id),
    inputActions: session.inputActions,
    maxActions: session.maxActions,
    startedAt: session.startedAt,
    maxMinutes: session.maxMinutes,
    actualViewport: session.actualViewport,
    initialScreenshot: session.initialScreenshot,
    launchError: session.launchError,
  }, null, 2));
}

async function runUiCommand(command, options, runDirectory) {
  const { sessionPath, session } = loadSession(runDirectory);
  if (command === "inspect" && !options["observed-issue"]) {
    throw new Error("Pass --observed-issue <short-note> only after documenting a visible issue.");
  }
  const cdp = await connectSession(session);
  try {
    if (command === "screenshot") {
      const image = await captureScreenshot(
        cdp,
        path.join(runDirectory, "evidence"),
        options.name,
      );
      session.actualViewport = image.viewport;
      session.lastScreenshot = path.relative(runDirectory, image.screenshotPath);
      saveSession(sessionPath, session);
      console.log(JSON.stringify({ ...image, screenshotPath: session.lastScreenshot }, null, 2));
      return;
    }

    if (command === "inspect") {
      const result = await cdp.call("Runtime.evaluate", {
        expression: `(() => ({ title: document.title, url: location.href, viewport: {
          width: window.innerWidth, height: window.innerHeight
        }, activeElement: document.activeElement?.tagName ?? null,
        visibleText: document.body?.innerText?.slice(0, 4000) ?? "" }))()`,
        returnByValue: true,
      });
      session.diagnostic = {
        observedIssue: String(options["observed-issue"]).slice(0, 240),
        at: new Date().toISOString(),
      };
      const diagnosticName = `diagnostic-${new Date().toISOString().replaceAll(":", "-")}.json`;
      const diagnosticPath = path.join(runDirectory, "evidence", diagnosticName);
      fs.writeFileSync(diagnosticPath, `${JSON.stringify({
        ...session.diagnostic,
        result: result.result?.value ?? null,
      }, null, 2)}\n`, "utf8");
      session.diagnosticEvidence = path.relative(runDirectory, diagnosticPath);
      saveSession(sessionPath, session);
      console.log(JSON.stringify({
        ...(result.result?.value ?? {}),
        diagnosticEvidence: session.diagnosticEvidence,
      }, null, 2));
      return;
    }

    assertInputBudget(session);
    if (command === "click") {
      const x = Number(requiredString(options, "x"));
      const y = Number(requiredString(options, "y"));
      const viewportWidth = session.actualViewport?.width ?? session.requestedWidth;
      const viewportHeight = session.actualViewport?.height ?? defaultWindowHeight;
      if (!Number.isFinite(x) || !Number.isFinite(y)
        || x < 0 || y < 0 || x >= viewportWidth || y >= viewportHeight) {
        throw new Error("Click coordinates must be inside the latest screenshot viewport.");
      }
      await cdp.call("Input.dispatchMouseEvent", {
        type: "mouseMoved", x, y, button: "none",
      });
      await cdp.call("Input.dispatchMouseEvent", {
        type: "mousePressed", x, y, button: "left", clickCount: 1,
      });
      await cdp.call("Input.dispatchMouseEvent", {
        type: "mouseReleased", x, y, button: "left", clickCount: 1,
      });
      recordInput(sessionPath, session, "click");
    } else if (command === "type") {
      const text = requiredString(options, "text");
      await cdp.call("Input.insertText", { text });
      recordInput(sessionPath, session, "type");
    } else if (command === "press") {
      const key = requiredString(options, "key");
      await dispatchKeyChord(cdp, key);
      recordInput(sessionPath, session, "press");
    } else {
      throw new Error(`Unknown command: ${command}`);
    }
    console.log(JSON.stringify({
      action: command,
      inputActions: session.inputActions,
      maxActions: session.maxActions,
      screenshotRecommended: true,
    }, null, 2));
  } finally {
    cdp.close();
  }
}

function retainedFiles(runDirectory) {
  const files = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(entryPath);
      else if (entry.isFile()) files.push(entryPath);
    }
  };
  visit(runDirectory);
  return files;
}

function validateRelativeLinks(runDirectory) {
  const missingLinks = [];
  for (const markdownPath of retainedFiles(runDirectory).filter((filePath) => filePath.endsWith(".md"))) {
    const markdown = fs.readFileSync(markdownPath, "utf8");
    for (const match of markdown.matchAll(/\]\(([^)]+)\)/gu)) {
      const target = match[1].trim().split(/\s+/u, 1)[0];
      if (!target || target.startsWith("#") || /^[a-z][a-z0-9+.-]*:/iu.test(target)) continue;
      const pathTarget = target.split(/[?#]/u, 1)[0];
      if (path.isAbsolute(pathTarget)) {
        missingLinks.push(`${path.relative(runDirectory, markdownPath)} -> ${target}`);
        continue;
      }
      const targetPath = path.resolve(path.dirname(markdownPath), pathTarget);
      if (!pathIsWithin(targetPath, path.resolve(runDirectory)) || !fs.existsSync(targetPath)) {
        missingLinks.push(`${path.relative(runDirectory, markdownPath)} -> ${target}`);
      }
    }
  }
  return missingLinks;
}

function verifyTesterRetained(runDirectory, emit = true) {
  const { session } = loadSession(runDirectory);
  if (session.status !== "stopped") {
    throw new Error(`Retained evidence is not final because helper status is ${session.status}.`);
  }
  const cleanupPath = path.join(runDirectory, "evidence", "cleanup.json");
  const cleanup = JSON.parse(fs.readFileSync(cleanupPath, "utf8"));
  if (cleanup.status !== "completed" || !cleanup.processTermination?.verified
    || !cleanup.deletion?.verifiedAbsent) {
    throw new Error("Retained cleanup evidence does not prove termination and deletion.");
  }
  if (fs.existsSync(session.instanceDirectory)) {
    throw new Error(`Disposable instance data still exists: ${session.instanceDirectory}`);
  }
  const requiredEvidence = [
    "evidence/vscode-launch.log",
    "evidence/cleanup.json",
    ...session.retainedFixturePaths,
    ...session.retainedConfigPaths,
  ];
  if (session.initialScreenshot) requiredEvidence.push(session.initialScreenshot);
  if (session.diagnosticEvidence) requiredEvidence.push(session.diagnosticEvidence);
  const missingEvidence = requiredEvidence.filter((relativePath) =>
    !fs.existsSync(path.join(runDirectory, relativePath)));
  if (missingEvidence.length > 0) {
    throw new Error(`Retained evidence is missing: ${missingEvidence.join(", ")}`);
  }

  const missingLinks = validateRelativeLinks(runDirectory);
  if (missingLinks.length > 0) {
    throw new Error(`Retained relative links do not resolve: ${missingLinks.join(", ")}`);
  }
  const result = {
    status: "verified",
    scope: "tester",
    helperSession: path.join(runDirectory, "helper-session.json"),
    cleanupEvidence: path.relative(runDirectory, cleanupPath),
    retainedEvidence: requiredEvidence,
    disposableInstanceAbsent: true,
    relativeLinks: "resolved",
  };
  if (emit) console.log(JSON.stringify(result, null, 2));
  return result;
}

function verifyCampaignRetained(runDirectory) {
  const reportPath = path.join(runDirectory, "report.md");
  if (!fs.existsSync(reportPath) || !fs.statSync(reportPath).isFile()) {
    throw new Error(`Campaign consolidated report is missing: ${reportPath}`);
  }
  const testersDirectory = path.join(runDirectory, "testers");
  if (!fs.existsSync(testersDirectory) || !fs.statSync(testersDirectory).isDirectory()) {
    throw new Error(`Campaign tester directory is missing: ${testersDirectory}`);
  }
  const testerDirectories = fs.readdirSync(testersDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(testersDirectory, entry.name))
    .sort();
  if (testerDirectories.length === 0) {
    throw new Error("Campaign has no tester directories to verify.");
  }
  const testers = testerDirectories.map((testerDirectory) => {
    const testerNotes = fs.readdirSync(testerDirectory, { withFileTypes: true })
      .some((entry) => entry.isFile() && entry.name.endsWith(".md"));
    if (!testerNotes) {
      throw new Error(`Tester has no retained Markdown notes: ${path.relative(runDirectory, testerDirectory)}`);
    }
    return {
      tester: path.relative(runDirectory, testerDirectory),
      ...verifyTesterRetained(testerDirectory, false),
    };
  });
  const missingLinks = validateRelativeLinks(runDirectory);
  if (missingLinks.length > 0) {
    throw new Error(`Campaign relative links do not resolve: ${missingLinks.join(", ")}`);
  }
  console.log(JSON.stringify({
    status: "verified",
    scope: "campaign",
    consolidatedReport: path.relative(runDirectory, reportPath),
    testers,
    relativeLinks: "resolved",
  }, null, 2));
}

function verifyRetained(runDirectory) {
  if (fs.existsSync(path.join(runDirectory, "helper-session.json"))) {
    verifyTesterRetained(runDirectory);
    return;
  }
  verifyCampaignRetained(runDirectory);
}

async function dispatchKeyChord(cdp, chord) {
  const parts = chord.split("+").map((part) => part.trim()).filter(Boolean);
  const key = parts.pop();
  if (!key) throw new Error("--key must include a key name.");
  const modifierBits = { Alt: 1, Control: 2, Meta: 4, Shift: 8 };
  const aliases = { Ctrl: "Control", Cmd: "Meta", Option: "Alt", Super: "Meta" };
  let modifiers = 0;
  for (const rawModifier of parts) {
    const modifier = aliases[rawModifier] ?? rawModifier;
    if (!modifierBits[modifier]) throw new Error(`Unsupported key modifier: ${rawModifier}`);
    modifiers |= modifierBits[modifier];
  }
  const namedKeys = {
    Backspace: ["Backspace", "Backspace", 8],
    Delete: ["Delete", "Delete", 46],
    Enter: ["Enter", "Enter", 13],
    Escape: ["Escape", "Escape", 27],
    Space: [" ", "Space", 32],
    Tab: ["Tab", "Tab", 9],
    ArrowDown: ["ArrowDown", "ArrowDown", 40],
    ArrowLeft: ["ArrowLeft", "ArrowLeft", 37],
    ArrowRight: ["ArrowRight", "ArrowRight", 39],
    ArrowUp: ["ArrowUp", "ArrowUp", 38],
  };
  let [keyValue, code, keyCode] = namedKeys[key] ?? [];
  if (!keyValue && /^[a-zA-Z]$/u.test(key)) {
    keyValue = modifiers & modifierBits.Shift ? key.toUpperCase() : key.toLowerCase();
    code = `Key${key.toUpperCase()}`;
    keyCode = key.toUpperCase().charCodeAt(0);
  } else if (!keyValue && /^[0-9]$/u.test(key)) {
    keyValue = key;
    code = `Digit${key}`;
    keyCode = key.charCodeAt(0);
  }
  if (!keyValue) throw new Error(`Unsupported key: ${key}`);
  await cdp.call("Input.dispatchKeyEvent", {
    type: "rawKeyDown",
    key: keyValue,
    code,
    modifiers,
    windowsVirtualKeyCode: keyCode,
    nativeVirtualKeyCode: keyCode,
  });
  await cdp.call("Input.dispatchKeyEvent", {
    type: "keyUp",
    key: keyValue,
    code,
    modifiers,
    windowsVirtualKeyCode: keyCode,
    nativeVirtualKeyCode: keyCode,
  });
}

async function stop(runDirectory) {
  const { sessionPath, session } = loadSession(runDirectory);
  if (session.status === "stopped") {
    console.log(JSON.stringify({
      status: session.status,
      stoppedAt: session.stoppedAt,
      retainedSession: sessionPath,
      retainedEvidence: path.join(runDirectory, "evidence"),
      cleanupEvidence: session.cleanupEvidence,
    }, null, 2));
    return;
  }
  try {
    const cleanup = await cleanupSession(sessionPath, session, runDirectory, "stop");
    session.status = "stopped";
    session.stoppedAt = new Date().toISOString();
    session.cleanup = cleanup;
    saveSession(sessionPath, session);
    console.log(JSON.stringify({
      status: session.status,
      stoppedAt: session.stoppedAt,
      retainedSession: sessionPath,
      retainedEvidence: path.join(runDirectory, "evidence"),
      cleanupEvidence: session.cleanupEvidence,
      removedDisposableData: cleanup.deletion.path,
      processTermination: cleanup.processTermination,
      deletion: cleanup.deletion,
    }, null, 2));
  } catch (error) {
    session.status = "cleanup-blocked";
    session.cleanupError = error.message;
    saveSession(sessionPath, session);
    throw new Error(
      `Cleanup was blocked: ${error.message}. Retained evidence is in ${path.join(runDirectory, "evidence")}.`,
    );
  }
}

function printHelp() {
  console.log(`Usage: node ${path.relative(process.cwd(), scriptPath)} <command> --run-dir <path> [options]

Commands:
  launch     Start isolated VS Code with the development extension and synthetic document
  status     Check the isolated process and CDP target
  screenshot Capture a real workbench screenshot
  click      Click visible coordinates from the latest screenshot
  type       Insert synthetic text into the focused control
  press      Send one key or a supported modifier chord (for example Meta+Shift+P)
  inspect    Read visible DOM text after documenting an issue; requires --observed-issue
  stop       Stop VS Code and delete instance data while retaining evidence
  verify-retained  Verify cleanup evidence, retained fixtures, and relative links after stop

Launch options:
  --theme light|dark       Default: light
  --width <pixels>         Default: 1440; viewport is emulated through CDP
  --document finding.md|repair-me.md
  --max-minutes <n>        Default: 15
  --max-actions <n>        Default: 50

Run all commands from the repository root with the Node version selected by .nvmrc.
`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === "help" || args[0] === "--help" || args[0] === "-h") {
    printHelp();
    return;
  }
  const { command, options } = parseArgs(args);
  if (command === "help" || options.help) {
    printHelp();
    return;
  }
  const runDirectory = path.resolve(requiredString(options, "run-dir"));
  fs.mkdirSync(runDirectory, { recursive: true });
  switch (command) {
    case "launch":
      await launch(options, runDirectory);
      break;
    case "status":
      await status(runDirectory);
      break;
    case "screenshot":
    case "click":
    case "type":
    case "press":
    case "inspect":
      await runUiCommand(command, options, runDirectory);
      break;
    case "verify-retained":
      verifyRetained(runDirectory);
      break;
    case "stop":
      await stop(runDirectory);
      break;
    default:
      throw new Error(`Unknown command: ${command}`);
  }
}

export {
  assertProcessGroupIdentity,
  assertProcessIdentity,
  cleanupFreshInstance,
  cleanupSession,
  launch,
  processGroupSnapshot,
  processSnapshot,
  stopProcessGroup,
  verifyRetained,
};

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
