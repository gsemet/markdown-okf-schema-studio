/** The webview of a preview with restricted reads loads the images of the document folder and of a non-broad workspace folder. */
import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";

import { previewLocalResourceRoots } from "../../src/session/features/rendering";

// @tests_req SwRS-MDOKFSTUDIO-TRUST-002
// @tests_req SwRS-MDOKFSTUDIO-TRUST-007
test("a restricted-reads preview has its document folder and a non-broad workspace folder as local resource roots", () => {
  const sandbox = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "readonly-roots-")));
  const saved = { HOME: process.env.HOME, USERPROFILE: process.env.USERPROFILE };
  const project = path.join(sandbox, "project");
  fs.mkdirSync(project);
  process.env.HOME = sandbox;
  process.env.USERPROFILE = sandbox;
  try {
    // The document folder serves its images even when it is broad (CR 238; it used to be none).
    assert.deepEqual(previewLocalResourceRoots(sandbox, true), [sandbox]);
    assert.deepEqual(previewLocalResourceRoots(path.parse(sandbox).root, true), [path.parse(sandbox).root]);
    // A broad workspace folder adds nothing; a narrow one is added.
    assert.deepEqual(previewLocalResourceRoots(project, true, sandbox), [project]);
    assert.deepEqual(previewLocalResourceRoots(project, true, project), [project]);
    const narrow = path.join(sandbox, "ws");
    fs.mkdirSync(narrow);
    assert.deepEqual(previewLocalResourceRoots(project, true, narrow), [project, narrow]);
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
