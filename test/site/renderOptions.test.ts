import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import test from "node:test";

import { GENERATED_FIXTURES, HUGE_DOCUMENT_SENTINEL, hugeDocument, writeGeneratedFixtures } from "../visual/generatedFixtures";
import { pageFileName, pageKey, renderOptionsKey, type PageIdentity } from "../visual/renderOptions";

const base: PageIdentity = { fixture: "01-basic", theme: "dark", stickyHeadingDepth: 3 };

test("a page without options keeps its file name and an empty options key", () => {
  assert.equal(pageFileName(base), "01-basic--dark--sticky-3--default.html");
  assert.equal(pageFileName({ ...base, render: {} }), "01-basic--dark--sticky-3--default.html");
  assert.equal(pageFileName({ ...base, plantumlExpectation: "unconfigured" }), "01-basic--dark--sticky-3--unconfigured.html");
  assert.equal(renderOptionsKey(undefined), "");
  assert.equal(renderOptionsKey({}), "");
});

test("the options are part of the page cache key and of the file name", () => {
  const readOnly = { ...base, render: { readOnly: true as const } };
  const strict = { ...base, render: { strictAdditionalProperties: true as const } };
  const keys = new Set([pageKey(base), pageKey(readOnly), pageKey(strict), pageKey({ ...base, render: { zoom: 150 } })]);
  assert.equal(keys.size, 4);
  const names = new Set([pageFileName(base), pageFileName(readOnly), pageFileName(strict), pageFileName({ ...base, render: { zoom: 150 } })]);
  assert.equal(names.size, 4);
  assert.match(pageFileName(readOnly), /^01-basic--dark--sticky-3--default--o[0-9a-f]{8}\.html$/u);
  // The same options give the same page whatever the property order.
  assert.equal(pageKey({ ...base, render: { zoom: 150, readOnly: true } }), pageKey({ ...base, render: { readOnly: true, zoom: 150 } }));
});

test("the huge document is generated, deterministic, long and ends with its sentinel", () => {
  const text = hugeDocument();
  assert.equal(text, hugeDocument());
  const lines = text.split("\n").length;
  assert.ok(lines >= 5900 && lines <= 6600, `${lines} lines`);
  assert.ok(text.trimEnd().endsWith(HUGE_DOCUMENT_SENTINEL));
  assert.ok(Object.keys(GENERATED_FIXTURES).every((name) => name.startsWith("gen-")));
});

test("generated fixtures are written once and rewritten only on change", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "genfix-"));
  try {
    const [file] = writeGeneratedFixtures(directory);
    assert.equal(fs.readFileSync(file!, "utf8"), hugeDocument());
    const before = fs.statSync(file!).mtimeMs;
    writeGeneratedFixtures(directory);
    assert.equal(fs.statSync(file!).mtimeMs, before);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
