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
