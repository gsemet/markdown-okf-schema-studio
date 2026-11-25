import * as assert from "node:assert/strict";
import { test } from "node:test";

import { relativeImageReference } from "../../../src/core/mapping/imageReference";

// Tests added by the mutation campaign of src/core (CR-450): they pin the survivors of the first run.

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-192#S1
test("Windows path rules apply when either path holds a backslash, and POSIX rules when neither does", () => {
  assert.equal(relativeImageReference("C:/docs/a.md", "C:\\docs\\img\\p.png"), "img/p.png", "a backslash in the image only");
  assert.equal(relativeImageReference("C:\\docs\\a.md", "C:/docs/img/p.png"), "img/p.png", "a backslash in the document only");
  assert.equal(relativeImageReference("C:\\docs\\a.md", "C:\\docs\\img\\p.png"), "img/p.png", "both");
  assert.equal(relativeImageReference("/Docs/a.md", "/docs/p.png"), "../docs/p.png", "POSIX paths are case sensitive");
  assert.equal(relativeImageReference("C:\\Docs\\a.md", "c:\\docs\\p.png"), "p.png", "Windows paths are not");
  assert.equal(relativeImageReference("C:\\docs\\a.md", "D:\\img\\p.png"), undefined, "another drive has no relative path");
  assert.equal(relativeImageReference("/docs/sub/a.md", "/docs"), "..", "a parent folder is a path");
});
