import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import realFs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { mock, test } from "node:test";

import { nodeSchemaFiles } from "../../src/node-services/schemaFiles";

// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-019
test("the schema directory listing is read once while the directory is unchanged and again after a change", (t) => {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "okf-schema-list-")));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, "note.schema.yaml"), "type: object\n");
  // Changed a minute ago: only a listing of a folder that is not changing right now is kept.
  const minuteAgo = new Date(Date.now() - 60_000);
  fs.utimesSync(root, minuteAgo, minuteAgo);
  const spy = mock.method(realFs, "readdirSync");
  try {
    assert.deepEqual(nodeSchemaFiles.listFiles(root), ["note.schema.yaml"]);
    assert.deepEqual(nodeSchemaFiles.listFiles(root), ["note.schema.yaml"]);
    assert.equal(spy.mock.callCount(), 1, "the second listing reuses the first");
    fs.writeFileSync(path.join(root, "task.schema.yaml"), "type: object\n");
    assert.deepEqual(nodeSchemaFiles.listFiles(root).sort(), ["note.schema.yaml", "task.schema.yaml"]);
    assert.equal(spy.mock.callCount(), 2, "a new schema file is listed");
    fs.rmSync(root, { recursive: true });
    assert.deepEqual(nodeSchemaFiles.listFiles(root), [], "a removed directory lists nothing");
  } finally {
    spy.mock.restore();
  }
});

// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-019
test("a listing read right after the folder changed is not reused: a file added in the same clock step is found", (t) => {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "okf-schema-recent-")));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.writeFileSync(path.join(root, "note.schema.yaml"), "type: object\n");
  // The folder's times as the clock left them: both changes fall in the same clock step.
  const frozen = fs.statSync(root);
  const statSync = realFs.statSync;
  const clock = mock.method(realFs, "statSync", ((target: fs.PathLike, ...rest: unknown[]) =>
    target === root ? frozen : (statSync as (...args: unknown[]) => fs.Stats)(target, ...rest)) as typeof realFs.statSync);
  const spy = mock.method(realFs, "readdirSync");
  try {
    assert.deepEqual(nodeSchemaFiles.listFiles(root), ["note.schema.yaml"]);
    fs.writeFileSync(path.join(root, "task.schema.yaml"), "type: object\n");
    assert.deepEqual(nodeSchemaFiles.listFiles(root).sort(), ["note.schema.yaml", "task.schema.yaml"]);
    assert.equal(spy.mock.callCount(), 2, "the recent folder is read again");
  } finally {
    spy.mock.restore();
    clock.mock.restore();
  }
});
