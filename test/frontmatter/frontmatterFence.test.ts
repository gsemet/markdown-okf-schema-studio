import * as assert from "node:assert/strict";
import { test } from "node:test";

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { inspectFrontmatterLinks } from "../../src/frontmatter/fileLinks";
import {
  createFrontmatterFieldPatch,
  createFrontmatterFieldRenamePatch,
  extractFrontmatter,
  guardedPatch,
  matchFrontmatterBlock,
} from "../../src/frontmatter/okfFrontmatter";
import { renderMyst } from "../../src/render/mystRenderer";
import { attribute, findElement, parseHtml } from "../rendering/dom";

// STAB-01: the closing fence must stand on its own line. A value ending in `...` or `---` must
// not close the block, and a table edit must change exactly the edited line.

interface Fixture {
  name: string;
  titleLine: string;
  closing?: string;
  eol?: string;
}

const fixtures: Fixture[] = [
  { name: "value ending in three dots", titleLine: "title: To be continued..." },
  { name: "value ending in four dots", titleLine: "title: Wait...." },
  { name: "value ending in three dashes", titleLine: "title: Section---" },
  { name: "dashes inside a quoted string", titleLine: 'title: "a --- b ... c"' },
  { name: "CRLF line endings", titleLine: "title: To be continued...", eol: "\r\n" },
  { name: "trailing spaces after the closing fence", titleLine: "title: Plain", closing: "---  " },
  { name: "dot-dot-dot closing fence", titleLine: "title: Plain...", closing: "..." },
];

function build(fixture: Fixture, status: string): string {
  const eol = fixture.eol ?? "\n";
  return [
    "---", fixture.titleLine, "author: Ada", `status: ${status}`, fixture.closing ?? "---", "# Body", "",
  ].join(eol);
}

for (const fixture of fixtures) {
  test(`frontmatter fence: ${fixture.name}`, async () => {
    const source = build(fixture, "draft");
    const extraction = extractFrontmatter(source);
    assert.equal(extraction.error, undefined);
    assert.deepEqual(Object.keys(extraction.frontmatter ?? {}), ["title", "author", "status"]);

    const patch = createFrontmatterFieldPatch(source, "status", "done");
    assert.ok(patch, "the edit produces a patch");
    const edited = source.slice(0, patch.start) + patch.text + source.slice(patch.end);
    assert.equal(edited, build(fixture, "done"), "exactly the status line changes");

    // The body starts on source line 6 and keeps its source mapping.
    const { html } = await renderMyst(source);
    const heading = findElement(parseHtml(html), (element) => element.tagName === "h1");
    assert.ok(heading);
    assert.equal(attribute(heading, "data-line"), "6");
  });
}

test("frontmatter fence: empty block stays valid", () => {
  const block = matchFrontmatterBlock("---\n---\n# Body\n");
  assert.deepEqual(block && { body: block.body, length: block.length }, { body: "", length: 8 });
  const patch = createFrontmatterFieldPatch("---\n---\n# Body\n", "status", "draft");
  assert.ok(patch);
  assert.equal(
    "---\n---\n# Body\n".slice(0, patch.start) + patch.text + "---\n---\n# Body\n".slice(patch.end),
    "---\nstatus: draft\n---\n# Body\n",
  );
});

test("frontmatter fence: a document without a closing fence has no frontmatter", () => {
  const source = "---\ntitle: Open\nstatus: draft\n# Body\n";
  assert.equal(matchFrontmatterBlock(source), undefined);
  assert.equal(extractFrontmatter(source).present, false);
  assert.equal(createFrontmatterFieldPatch(source, "status", "done"), undefined);
});

test("patch guard refuses patches that lose, duplicate or corrupt a key", () => {
  const source = "---\ntitle: A\nauthor: Ada\nstatus: draft\n---\n# Body\n";
  const keys = ["title", "author", "status"];
  const lineAt = (text: string) => {
    const start = source.indexOf(text);
    return { start, end: start + text.length };
  };
  // A patch that deletes the author key.
  assert.equal(guardedPatch(source, { ...lineAt("author: Ada\n"), text: "" }, keys), undefined);
  // A patch that duplicates the status key.
  assert.equal(guardedPatch(source, { ...lineAt("author: Ada"), text: "status: x" }, keys), undefined);
  // A patch that leaves invalid YAML.
  assert.equal(guardedPatch(source, { ...lineAt("author: Ada"), text: "author: [" }, keys), undefined);
  // A faithful patch passes unchanged.
  const good = { ...lineAt("status: draft"), text: "status: done" };
  assert.equal(guardedPatch(source, good, keys), good);
  // A rename onto an existing key is refused by the public API.
  assert.equal(createFrontmatterFieldRenamePatch(source, "author", "status"), undefined);
});

test("frontmatter fence: CRLF empty block accepts an added field with CRLF endings", () => {
  const source = "---\r\n---\r\n# Body\r\n";
  const patch = createFrontmatterFieldPatch(source, "status", "draft");
  assert.ok(patch);
  const edited = source.slice(0, patch.start) + patch.text + source.slice(patch.end);
  assert.equal(edited, "---\r\nstatus: draft\r\n---\r\n# Body\r\n");
});

test("linked file details read the frontmatter of a BOM-prefixed file", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "okf-bom-link-"));
  try {
    fs.writeFileSync(path.join(root, "target.md"), "\uFEFF---\ndescription: With BOM...\n---\n# Body\n");
    const schema = { properties: { target: { "x-okf-link": {
      resolution: "document-relative",
      syntax: "plain",
      preview_shows_fields: ["description"],
    } } } };
    const [result] = inspectFrontmatterLinks({ target: "target.md" }, schema, {
      filePath: path.join(root, "doc.md"), workspaceRoots: [root],
    });
    assert.deepEqual(result.previewFields, { description: "With BOM..." });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
