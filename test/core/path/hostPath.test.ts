import * as assert from "node:assert/strict";
import * as nodePath from "node:path";
import { test } from "node:test";

import * as hostPath from "../../../src/core/path/hostPath";

test("hostPath exposes the Node path module, win32 and posix flavours included", () => {
  assert.equal(hostPath.win32, nodePath.win32);
  assert.equal(hostPath.posix, nodePath.posix);
  assert.equal(hostPath.sep, nodePath.sep);
  for (const name of ["dirname", "resolve", "basename", "join", "isAbsolute", "relative", "extname", "parse"] as const) {
    assert.equal(hostPath[name], nodePath[name], name);
  }
});

test("hostPath win32 keeps drive-letter semantics", () => {
  assert.equal(hostPath.win32.dirname("C:\\a\\b\\c.md"), "C:\\a\\b");
  assert.equal(hostPath.win32.relative("C:\\a\\b", "C:\\a\\c\\d.png"), "..\\c\\d.png");
  assert.equal(hostPath.win32.relative("C:\\a", "D:\\a\\b"), "D:\\a\\b");
  assert.equal(hostPath.win32.parse("C:\\a\\b").root, "C:\\");
  assert.equal(hostPath.win32.isAbsolute("C:/a/b"), true);
});

test("hostPath win32 keeps UNC semantics", () => {
  assert.equal(hostPath.win32.parse("\\\\server\\share\\x\\y.md").root, "\\\\server\\share\\");
  assert.equal(hostPath.win32.dirname("\\\\server\\share\\x\\y.md"), "\\\\server\\share\\x");
  assert.equal(hostPath.win32.join("\\\\server\\share", "x", "..", "y"), "\\\\server\\share\\y");
  assert.equal(hostPath.win32.isAbsolute("\\\\server\\share\\x"), true);
});

test("hostPath posix keeps forward-slash semantics", () => {
  assert.equal(hostPath.posix.relative("/w/book/ch", "/w/book/img/a.png"), "../img/a.png");
  assert.equal(hostPath.posix.parse("/w/a").root, "/");
});
