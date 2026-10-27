/** The webview of a read-only preview in the home folder or a file-system root gets no local root. */
import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";

import { previewLocalResourceRoots } from "../../src/session/features/rendering";

// @tests_req SwRS-MDOKFSTUDIO-TRUST-002
test("a read-only preview in the home folder or a root has no local resource root", () => {
  const sandbox = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "readonly-roots-")));
  const saved = { HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE };
  const project = path.join(sandbox, "project");
  fs.mkdirSync(project);
  process.env.HOME = sandbox;
  process.env.USERPROFILE = sandbox;
  try {
    assert.deepEqual(previewLocalResourceRoots(sandbox, true), []);
    assert.deepEqual(previewLocalResourceRoots(path.parse(sandbox).root, true), []);
    assert.deepEqual(previewLocalResourceRoots(project, true), [project]);
    assert.deepEqual(previewLocalResourceRoots(sandbox, false), [sandbox]);
  } finally {
    for (const [name, value] of Object.entries(saved)) {
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
    fs.rmSync(sandbox, { recursive: true, force: true });
  }
});
