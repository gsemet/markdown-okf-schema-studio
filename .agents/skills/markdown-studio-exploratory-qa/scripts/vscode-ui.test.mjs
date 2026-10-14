import { EventEmitter } from "node:events";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  cleanupSession,
  cleanupFreshInstance,
  launch,
  processSnapshot,
  stopProcessGroup,
  verifyRetained,
} from "./vscode-ui.mjs";

const startMarker = "Fri Oct  2 20:23:46 2026";

function processRow(pid, pgid, marker = startMarker, command = "code --owned") {
  return `${pid} ${pgid} ${marker} ${command}\n`;
}

function psRunner({ leader = {}, group = {} } = {}) {
  return (_command, args) => {
    if (args.includes("-p")) return {
      status: leader.status ?? 0,
      stdout: leader.stdout ?? processRow(42, 42),
      stderr: leader.stderr ?? "",
    };
    return {
      status: group.status ?? 0,
      stdout: group.stdout ?? processRow(42, 42),
      stderr: group.stderr ?? "",
    };
  };
}

function sessionWithIdentity(overrides = {}) {
  return {
    processSpawnAttempted: true,
    processPid: 42,
    processIdentity: {
      pid: 42,
      pgid: 42,
      startMarker,
      commandMarkers: ["--owned"],
      groupMembers: [{ pid: 42, pgid: 42, startMarker }],
    },
    ...overrides,
  };
}

function createOwnedInstance(runDirectory, processState = {}) {
  const instanceDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "msqa-"));
  const ownerToken = "owner-token";
  fs.writeFileSync(path.join(instanceDirectory, ".msqa-owner.json"), `${JSON.stringify({
    version: 1,
    ownerToken,
    instanceDirectory: fs.realpathSync(instanceDirectory),
    runDirectory: fs.realpathSync(runDirectory),
  })}\n`, "utf8");
  return {
    command: "launch-failure",
    status: "blocked",
    runDirectory: fs.realpathSync(runDirectory),
    instanceDirectory,
    profileDirectory: path.join(instanceDirectory, "profile"),
    sharedDataDirectory: path.join(instanceDirectory, "shared-data"),
    extensionsDirectory: path.join(instanceDirectory, "extensions"),
    workspaceDirectory: path.join(instanceDirectory, "workspace"),
    ownerToken,
    processPid: null,
    processSpawnAttempted: false,
    processIdentity: null,
    ...processState,
  };
}

function writeSession(runDirectory, session) {
  fs.writeFileSync(
    path.join(runDirectory, "helper-session.json"),
    `${JSON.stringify(session, null, 2)}\n`,
    "utf8",
  );
}

function createRetainedTester(rootDirectory, testerName = "J1") {
  const testerDirectory = path.join(rootDirectory, "testers", testerName);
  const evidenceDirectory = path.join(testerDirectory, "evidence");
  fs.mkdirSync(path.join(evidenceDirectory, "fixtures", "_schema"), { recursive: true });
  fs.mkdirSync(path.join(evidenceDirectory, "config"), { recursive: true });
  fs.writeFileSync(path.join(testerDirectory, "notes.md"), "# Tester Notes\n", "utf8");
  fs.writeFileSync(path.join(evidenceDirectory, "vscode-launch.log"), "launch\n", "utf8");
  fs.writeFileSync(path.join(evidenceDirectory, "fixtures", "finding.md"), "fixture\n", "utf8");
  fs.writeFileSync(
    path.join(evidenceDirectory, "fixtures", "_schema", "finding.schema.yaml"),
    "schema: true\n",
    "utf8",
  );
  fs.writeFileSync(path.join(evidenceDirectory, "config", "settings.json"), "{}\n", "utf8");
  fs.writeFileSync(
    path.join(evidenceDirectory, "cleanup.json"),
    `${JSON.stringify({
      status: "completed",
      processTermination: { verified: true },
      deletion: { verifiedAbsent: true },
    }, null, 2)}\n`,
    "utf8",
  );
  const session = {
    status: "stopped",
    instanceDirectory: path.join(testerDirectory, "deleted-instance"),
    retainedFixturePaths: [
      "evidence/fixtures/finding.md",
      "evidence/fixtures/_schema/finding.schema.yaml",
    ],
    retainedConfigPaths: ["evidence/config/settings.json"],
    initialScreenshot: undefined,
    diagnosticEvidence: undefined,
  };
  writeSession(testerDirectory, session);
  return testerDirectory;
}

test("records a failed spawn and deletes the owned instance without a process", async () => {
  const runDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "msqa-launch-test-"));
  const spawnError = Object.assign(new Error("spawn failed: ENOENT"), { code: "ENOENT" });
  try {
    await assert.rejects(
      launch({}, runDirectory, {
        resolveExecutable: () => process.execPath,
        readVsCodeVersion: () => "test-version",
        readExtensionBuildInfo: () => ({
          version: "test-extension",
          mainPath: path.join(runDirectory, "extension.js"),
          bundleSha256: "test-bundle",
        }),
        reservePort: async () => 45_678,
        spawn: () => {
          const child = new EventEmitter();
          child.unref = () => {};
          queueMicrotask(() => child.emit("error", spawnError));
          return child;
        },
      }),
      /Temporary VS Code data was cleaned; failure status is/u,
    );

    const sessionPath = path.join(runDirectory, "helper-session.json");
    const session = JSON.parse(fs.readFileSync(sessionPath, "utf8"));
    assert.equal(session.spawnOutcome, "failed-no-process");
    assert.equal(session.processSpawnAttempted, false);
    assert.equal(session.processPid, null);
    assert.equal(session.processIdentity, null);
    assert.equal(session.status, "blocked");
    const initializationPath = path.join(runDirectory, session.initializationEvidence);
    const initialization = JSON.parse(fs.readFileSync(initializationPath, "utf8"));
    assert.equal(initialization.phase, "spawn-failed");
    assert.equal(initialization.error, "spawn failed: ENOENT");
    assert.equal(initialization.processSpawnAttempted, false);
    assert.equal(initialization.processPid, null);
    assert.ok(fs.existsSync(initializationPath));
    const cleanupPath = path.join(runDirectory, session.cleanupEvidence);
    assert.ok(fs.existsSync(cleanupPath));
    assert.match(
      fs.readFileSync(path.join(runDirectory, "evidence", "vscode-launch.log"), "utf8"),
      /Spawn error: spawn failed: ENOENT/u,
    );
    assert.equal(session.cleanup.processTermination.signal, "not-started");
    assert.equal(session.cleanup.deletion.verifiedAbsent, true);
    assert.equal(fs.existsSync(session.instanceDirectory), false);
  } finally {
    fs.rmSync(runDirectory, { recursive: true, force: true });
  }
});

test("classifies ps command errors separately from definite process absence", () => {
  const commandError = processSnapshot(42, () => ({
    status: 1,
    stdout: "",
    stderr: "ps: command unavailable",
  }));
  assert.equal(commandError.state, "unknown");

  const absent = processSnapshot(42, () => ({ status: 1, stdout: "", stderr: "" }));
  assert.equal(absent.state, "absent");
});

test("blocks escalation when the leader identity becomes unverifiable", async () => {
  let leaderQueries = 0;
  const runner = (_command, args) => {
    if (args.includes("-p")) {
      leaderQueries += 1;
      if (leaderQueries > 1) {
        return { status: 1, stdout: "", stderr: "ps: transient failure" };
      }
    }
    return { status: 0, stdout: processRow(42, 42), stderr: "" };
  };
  const signals = [];
  const signaler = (target, signal) => {
    if (signal !== 0) signals.push({ target, signal });
  };
  await assert.rejects(
    stopProcessGroup(sessionWithIdentity(), {
      runner,
      signaler,
      wait: async () => ({ verified: false }),
    }),
    /could not be verified|SIGKILL was blocked/u,
  );
  assert.deepEqual(signals, [{ target: -42, signal: "SIGTERM" }]);
});

test("does not signal or delete a reused PID", async () => {
  const signals = [];
  await assert.rejects(
    stopProcessGroup(sessionWithIdentity(), {
      runner: psRunner({
        leader: { stdout: processRow(42, 42, "Thu Oct  1 20:23:46 2026") },
      }),
      signaler: (target, signal) => signals.push({ target, signal }),
    }),
    /no longer identifies/u,
  );
  assert.deepEqual(signals, []);
});

test("confirms definite leader and group absence without signaling", async () => {
  const signals = [];
  const result = await stopProcessGroup(sessionWithIdentity(), {
    runner: psRunner({
      leader: { status: 1, stdout: "", stderr: "" },
      group: { status: 1, stdout: "", stderr: "" },
    }),
    signaler: (target, signal) => {
      if (signal === 0) {
        const error = new Error("gone");
        error.code = "ESRCH";
        throw error;
      }
      signals.push({ target, signal });
    },
  });
  assert.equal(result.verified, true);
  assert.equal(result.signal, "already-exited");
  assert.deepEqual(signals, []);
});

test("cleans a forced pre-spawn setup failure but preserves uncertain spawn state", async () => {
  const runDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "msqa-test-"));
  try {
    const sessionPath = path.join(runDirectory, "helper-session.json");
    const session = createOwnedInstance(runDirectory);
    writeSession(runDirectory, session);
    const cleanup = await cleanupSession(sessionPath, session, runDirectory, "launch-failure");
    assert.equal(cleanup.status, "completed");
    assert.equal(fs.existsSync(session.instanceDirectory), false);

    const uncertainRun = fs.mkdtempSync(path.join(os.tmpdir(), "msqa-test-"));
    try {
      const uncertainSession = createOwnedInstance(uncertainRun, {
        processSpawnAttempted: true,
        processPid: null,
        processIdentity: null,
      });
      writeSession(uncertainRun, uncertainSession);
      await assert.rejects(
        cleanupSession(
          path.join(uncertainRun, "helper-session.json"),
          uncertainSession,
          uncertainRun,
          "launch-failure",
        ),
        /ownership record/u,
      );
      assert.equal(fs.existsSync(uncertainSession.instanceDirectory), true);
    } finally {
      fs.rmSync(uncertainRun, { recursive: true, force: true });
    }
  } finally {
    fs.rmSync(runDirectory, { recursive: true, force: true });
  }
});

test("cleans a fresh instance when ownership persistence fails before startup", () => {
  const runDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "msqa-test-"));
  try {
    const session = createOwnedInstance(runDirectory);
    const cleanup = cleanupFreshInstance(
      path.join(runDirectory, "helper-session.json"),
      session,
      runDirectory,
    );
    assert.equal(cleanup.status, "completed");
    assert.equal(cleanup.processTermination.signal, "not-started");
    assert.equal(cleanup.deletion.verifiedAbsent, true);
    assert.equal(fs.existsSync(session.instanceDirectory), false);
  } finally {
    fs.rmSync(runDirectory, { recursive: true, force: true });
  }
});

test("campaign verification catches broken links in a tester report", () => {
  const rootDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "msqa-campaign-"));
  try {
    const testerDirectory = createRetainedTester(rootDirectory);
    fs.writeFileSync(
      path.join(rootDirectory, "report.md"),
      "# Campaign\n\n[tester](testers/J1/notes.md)\n",
      "utf8",
    );
    fs.appendFileSync(
      path.join(rootDirectory, "report.md"),
      "\n[missing evidence](testers/J1/does-not-exist.png)\n",
      "utf8",
    );
    assert.throws(
      () => verifyRetained(rootDirectory),
      /Campaign relative links do not resolve/u,
    );
  } finally {
    fs.rmSync(rootDirectory, { recursive: true, force: true });
  }
});
