import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";

import {
  PlantUmlIncludeWatch,
  resolvePlantUmlInclude,
  type PlantUmlIncludeScope,
} from "../../../src/core/render/plantUmlIncludes";

/** workspace/{docs/{page.md, styles/common.puml, styles/parts.puml}, shared/theme.puml}, outside/secret.puml */
function workspace(): { root: string; workspaceRoot: string; documentPath: string; scope: PlantUmlIncludeScope } {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "plantuml-includes-")));
  const workspaceRoot = path.join(root, "workspace");
  const docs = path.join(workspaceRoot, "docs");
  fs.mkdirSync(path.join(docs, "styles"), { recursive: true });
  fs.mkdirSync(path.join(workspaceRoot, "shared"), { recursive: true });
  fs.mkdirSync(path.join(root, "outside"), { recursive: true });
  const documentPath = path.join(docs, "page.md");
  fs.writeFileSync(documentPath, "# Page\n");
  fs.writeFileSync(path.join(docs, "styles", "common.puml"), "!include parts.puml\n");
  fs.writeFileSync(path.join(docs, "styles", "parts.puml"), "participant Carol\n");
  fs.writeFileSync(path.join(workspaceRoot, "shared", "theme.puml"), "skinparam monochrome true\n");
  fs.writeFileSync(path.join(root, "outside", "secret.puml"), "secret\n");
  return { root, workspaceRoot, documentPath, scope: { documentPath, workspaceRoot, trusted: true } };
}

test("a top-level include resolves next to the document, a nested one next to the including file", () => {
  const { documentPath, scope } = workspace();
  const docs = path.dirname(documentPath);
  const top = resolvePlantUmlInclude({ path: "styles/common.puml", from: null }, scope);
  assert.deepEqual(top, {
    ok: true,
    id: path.join(docs, "styles", "common.puml"),
    text: "!include parts.puml\n",
    watch: path.join(docs, "styles", "common.puml"),
  });
  assert.ok(top.ok);
  const nested = resolvePlantUmlInclude({ path: "parts.puml", from: top.id }, scope);
  assert.deepEqual(nested, {
    ok: true,
    id: path.join(docs, "styles", "parts.puml"),
    text: "participant Carol\n",
    watch: path.join(docs, "styles", "parts.puml"),
  });
  assert.equal(resolvePlantUmlInclude({ path: "parts.puml", from: null }, scope).ok, false,
    "without the including file the name resolves next to the document");
});

test("a trusted workspace serves the workspace; outside it, absolute paths, URLs and the standard library are refused", () => {
  const { documentPath, scope } = workspace();
  assert.equal(resolvePlantUmlInclude({ path: "../shared/theme.puml", from: null }, scope).ok, true);
  const refusals: Array<[string, RegExp]> = [
    ["../../outside/secret.puml", /outside the folders the preview reads/u],
    [path.join(path.dirname(documentPath), "styles", "common.puml"), /must be a relative path/u],
    ["https://example.com/common.puml", /not a local file/u],
    ["file:///etc/passwd", /not a local file/u],
    ["<C4/C4_Context>", /not a local file.*standard library/u],
    ["   ", /names no file/u],
  ];
  for (const [request, reason] of refusals) {
    const answer = resolvePlantUmlInclude({ path: request, from: null }, scope);
    assert.equal(answer.ok, false, request);
    assert.ok(!answer.ok);
    assert.match(answer.reason, reason, request);
    assert.equal(answer.watch, undefined, `${request} is never watched`);
  }
  // A `from` outside the roots cannot widen them: the file it points next to is still checked.
  const forged = resolvePlantUmlInclude({ path: "secret.puml", from: path.join(path.dirname(documentPath), "..", "..", "outside", "x.puml") }, scope);
  assert.equal(forged.ok, false);
  assert.equal(resolvePlantUmlInclude({ path: "parts.puml", from: "styles/common.puml" }, scope).ok, false,
    "a relative from is not an id the host gave");
});

test("Restricted Mode serves only the document's folder and below", () => {
  const { documentPath, workspaceRoot } = workspace();
  const restricted: PlantUmlIncludeScope = { documentPath, workspaceRoot, trusted: false };
  assert.equal(resolvePlantUmlInclude({ path: "styles/common.puml", from: null }, restricted).ok, true);
  const sibling = resolvePlantUmlInclude({ path: "../shared/theme.puml", from: null }, restricted);
  assert.equal(sibling.ok, false, "the workspace outside the document's folder is not served untrusted");
  assert.ok(!sibling.ok);
  assert.match(sibling.reason, /Restricted Mode/u);
});

test("a missing file is refused and watched, a too large file and a symlink escape are refused", () => {
  const { root, documentPath, scope } = workspace();
  const docs = path.dirname(documentPath);
  const missing = resolvePlantUmlInclude({ path: "styles/later.puml", from: null }, scope);
  assert.deepEqual(missing, {
    ok: false,
    reason: "PlantUML file not found: styles/later.puml.",
    watch: path.join(docs, "styles", "later.puml"),
  });

  fs.writeFileSync(path.join(docs, "huge.puml"), Buffer.alloc(5 * 1024 * 1024 + 1, 0x41));
  const huge = resolvePlantUmlInclude({ path: "huge.puml", from: null }, scope);
  assert.equal(huge.ok, false);
  assert.ok(!huge.ok);
  assert.match(huge.reason, /larger than the 5 MiB preview limit/u);

  fs.symlinkSync(path.join(root, "outside", "secret.puml"), path.join(docs, "link.puml"));
  const link = resolvePlantUmlInclude({ path: "link.puml", from: null }, scope);
  assert.equal(link.ok, false);
  assert.ok(!link.ok);
  assert.match(link.reason, /outside the folders the preview reads/u);
});

test("the include watch remembers a bounded set of files", () => {
  const watch = new PlantUmlIncludeWatch(2);
  watch.remember("/a");
  watch.remember("/b");
  watch.remember("/a");
  watch.remember("/c");
  assert.equal(watch.has("/a"), true, "a file asked again stays");
  assert.equal(watch.has("/b"), false, "the oldest file is dropped");
  assert.equal(watch.has("/c"), true);
  assert.equal(watch.size, 2);
  watch.clear();
  assert.equal(watch.size, 0);
});
