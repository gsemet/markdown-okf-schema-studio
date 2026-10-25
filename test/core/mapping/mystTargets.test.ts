import * as assert from "node:assert/strict";
import { test } from "node:test";

import {
  MAX_BIB_KEYS,
  MAX_TARGETS,
  bibKeys,
  collectBibKeys,
  docReference,
  documentTargets,
} from "../../../src/core/mapping/mystTargets";

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-178
test("documentTargets lists (label)= names with the heading or text that follows", () => {
  const text = [
    "(intro)=", "# Introduction", "", "(plain-one)=", "Some paragraph text.", "",
    "(a.b:c_d-1)=", "", "(spaced)=  ", "## Spaced heading", "",
  ].join("\n");
  assert.deepEqual(documentTargets(text).items, [
    { name: "intro", line: 1, title: "Introduction" },
    { name: "plain-one", line: 4, title: "Some paragraph text." },
    { name: "a.b:c_d-1", line: 7 },
    { name: "spaced", line: 9, title: "Spaced heading" },
  ]);
});

test("documentTargets ignores labels in code fences and malformed names", () => {
  const text = "```\n(hidden)=\n```\n\n~~~md\n(hidden2)=\n~~~\n\n(bad name)=\n(-bad)=\n(ok)=\n";
  assert.deepEqual(documentTargets(text).items.map((item) => item.name), ["ok"]);
});

test("documentTargets caps the list and says so", () => {
  const text = Array.from({ length: MAX_TARGETS + 5 }, (_, index) => `(t${index})=\n`).join("");
  const result = documentTargets(text);
  assert.equal(result.items.length, MAX_TARGETS);
  assert.equal(result.truncated, true);
  assert.equal(documentTargets("(a)=\n").truncated, false);
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-183
test("bibKeys reads entry keys and titles, and skips comment, string and preamble entries", () => {
  const bib = [
    "@comment{ignored,}", "@string{jan = \"January\"}", "@preamble{\"x\"}",
    "@article{smith2024,", "  author = {Smith, A.},", "  title = {A {Great} Title},", "  year = 2024", "}",
    "% @book{commented,", "@Book { jones-2020 ,", "  title = \"Quoted title\",", "}",
    "@misc(paren.key:1, note = {x})",
  ].join("\n");
  assert.deepEqual(bibKeys(bib), [
    { key: "smith2024", title: "A Great Title" },
    { key: "jones-2020", title: "Quoted title" },
    { key: "paren.key:1" },
  ]);
});

test("collectBibKeys merges files, removes duplicates, sorts and caps", () => {
  const merged = collectBibKeys(["@a{zeta,}\n@a{alpha,}", "@a{alpha,}\n@a{beta,}"]);
  assert.deepEqual(merged.items.map((item) => item.key), ["alpha", "beta", "zeta"]);
  assert.equal(merged.truncated, false);
  const many = Array.from({ length: MAX_BIB_KEYS + 3 }, (_, index) => `@a{k${index},}`).join("\n");
  const capped = collectBibKeys([many]);
  assert.equal(capped.items.length, MAX_BIB_KEYS);
  assert.equal(capped.truncated, true);
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-148
test("docReference gives a POSIX path relative to the document, without the extension", () => {
  assert.equal(docReference("/w/book/chapters/a.md", "/w/book/chapters/b.md"), "b");
  assert.equal(docReference("/w/book/chapters/a.md", "/w/book/guide/c.md"), "../guide/c");
  assert.equal(docReference("/w/book/a.md", "/w/book/sub/dir/d.markdown"), "sub/dir/d");
  assert.equal(docReference("C:\\w\\a.md", "C:\\w\\sub\\e.md"), "sub/e");
  assert.equal(docReference("C:\\w\\a.md", "D:\\x y\\c.md"), undefined, "another drive has no relative path");
  assert.equal(docReference("/w/a.md", "/w/x`y.md"), undefined, "a backtick cannot sit in a role");
  assert.equal(docReference("/w/a.md", "/w/a b.md"), "a b");
});
