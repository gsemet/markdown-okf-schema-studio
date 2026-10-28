import * as assert from "node:assert/strict";
import { test } from "node:test";

import { droppedFilePath, droppedReference, droppedText, firstHeadingTitle } from "../../../src/core/mapping/dropReferences";

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-004
test("firstHeadingTitle reads the first heading outside front matter and code", () => {
  assert.equal(firstHeadingTitle("# Getting started\n\ntext"), "Getting started");
  assert.equal(firstHeadingTitle("---\ntitle: x\n# no\n---\n\n## **Bold** and `code` ##\n"), "Bold and code");
  assert.equal(firstHeadingTitle("```\n# in code\n```\n\n### After\n"), "After");
  assert.equal(firstHeadingTitle("~~~\n# a\n```\n# b\n~~~\n# c\n"), "c");
  assert.equal(firstHeadingTitle("﻿# Bom\r\ntext"), "Bom");
  assert.equal(firstHeadingTitle("No heading.\n#nospace\n"), undefined);
  assert.equal(firstHeadingTitle(""), undefined);
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-004
test("droppedReference writes a relative, percent-encoded link or image", () => {
  const doc = "/w/doc/a.md";
  assert.equal(droppedReference(doc, { path: "/w/doc/The Guide.md", title: "Getting started" }), "[Getting started](The%20Guide.md)");
  assert.equal(droppedReference(doc, { path: "/w/doc/The Guide.md" }), "[The Guide](The%20Guide.md)");
  assert.equal(droppedReference(doc, { path: "/w/img/logo.PNG" }), "![logo](../img/logo.PNG)");
  assert.equal(droppedReference(doc, { path: "/w/doc/a (1).pdf" }), "[a (1).pdf](a%20%281%29.pdf)");
  assert.equal(droppedReference(doc, { path: "/w/doc/x.md", title: "A [b] c" }), "[A \\[b\\] c](x.md)");
  assert.equal(droppedReference("C:\\w\\a.md", { path: "D:\\x\\b.md" }), undefined, "another drive has no relative reference");
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-004
test("droppedText joins the references with a space and skips files without one", () => {
  assert.equal(
    droppedText("C:\\w\\a.md", [{ path: "C:\\w\\one.md" }, { path: "D:\\x\\b.md" }, { path: "C:\\two.png" }]),
    "[one](one.md) ![two](../two.png)",
  );
  assert.equal(droppedText("C:\\w\\a.md", [{ path: "D:\\x\\b.md" }]), undefined);
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-004
test("droppedFilePath reads local file addresses only", () => {
  assert.equal(droppedFilePath("file:///w/The%20Guide.md"), "/w/The Guide.md");
  assert.equal(droppedFilePath("file:///c%3A/w/a.md"), "c:\\w\\a.md");
  assert.equal(droppedFilePath("file:///C:/w/a.md"), "C:\\w\\a.md");
  assert.equal(droppedFilePath("file://server/share/a.md"), undefined);
  assert.equal(droppedFilePath("https://example.com/a.md"), undefined);
  assert.equal(droppedFilePath("file:///w/a%00.md"), undefined);
  assert.equal(droppedFilePath("not an address"), undefined);
});
