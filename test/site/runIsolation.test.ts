import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as net from "node:net";
import * as os from "node:os";
import test from "node:test";

import { EvidenceStore } from "../shared/evidenceStore";
import { createRunDirectories, freePort, instanceIdFromEnvironment, instanceTag, newInstanceId, shortTemporaryRoot } from "../shared/runIsolation";

test("instance ids are sortable, unique per call and safe in a folder name", () => {
  const first = newInstanceId(new Date("2026-10-23T03:15:00.123Z"), Buffer.from("a1b2c3d4", "hex"));
  assert.equal(first, "20261023T031500Z-a1b2c3d4");
  const ids = new Set(Array.from({ length: 50 }, () => newInstanceId()));
  assert.equal(ids.size, 50);
  for (const id of ids) assert.match(id, /^[0-9]{8}T[0-9]{6}Z-[0-9a-f]{8}$/u);
});

test("the runner can pin the instance id through the environment, anything unsafe is replaced", () => {
  assert.equal(instanceIdFromEnvironment({ STUDIO_E2E_INSTANCE: "20261023T031500Z-aaaa1111" }), "20261023T031500Z-aaaa1111");
  assert.notEqual(instanceIdFromEnvironment({ STUDIO_E2E_INSTANCE: "../../etc" }), "../../etc");
  assert.match(instanceIdFromEnvironment({}), /^[0-9]{8}T[0-9]{6}Z-[0-9a-f]{8}$/u);
});

test("two runs get different user-data and extensions directories, both removed on dispose", () => {
  const first = createRunDirectories(newInstanceId());
  const second = createRunDirectories(newInstanceId());
  try {
    const all = [first.userDataDirectory, first.extensionsDirectory, second.userDataDirectory, second.extensionsDirectory];
    assert.equal(new Set(all).size, 4);
    for (const directory of all) {
      assert.ok(fs.statSync(directory).isDirectory());
      assert.ok(directory.startsWith(shortTemporaryRoot()));
      assert.ok(directory.length < 60, `${directory} stays far below the ~100 character socket path limit`);
    }
    assert.ok(first.userDataDirectory.includes(instanceTag(first.instanceId)));
  } finally {
    first.dispose();
    second.dispose();
  }
  assert.ok(!fs.existsSync(first.userDataDirectory));
  assert.ok(!fs.existsSync(second.extensionsDirectory));
});

test("simultaneous ports are free and distinct while held", async () => {
  const servers: net.Server[] = [];
  try {
    const ports: number[] = [];
    for (let index = 0; index < 3; index += 1) {
      const port = await freePort();
      ports.push(port);
      const server = net.createServer();
      await new Promise<void>((resolve) => server.listen(port, "127.0.0.1", resolve));
      servers.push(server);
    }
    assert.equal(new Set(ports).size, 3);
  } finally {
    await Promise.all(servers.map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
  }
});

test("two evidence stores of the same suite and root never share a folder, instance id or manifest", () => {
  const root = fs.mkdtempSync(`${os.tmpdir()}/isolation-test-`);
  try {
    const first = new EvidenceStore({ suite: "real-input", screenshotRoot: root, environment: {} });
    const second = new EvidenceStore({ suite: "real-input", screenshotRoot: root, environment: {} });
    assert.notEqual(first.directory, second.directory);
    assert.notEqual(first.instanceId, second.instanceId);
    first.writeManifest({ status: "passed" });
    second.writeManifest({ status: "failed" });
    assert.equal(JSON.parse(fs.readFileSync(`${first.directory}/manifest.json`, "utf8")).status, "passed");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
