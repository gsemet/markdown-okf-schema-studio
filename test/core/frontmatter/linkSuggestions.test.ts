import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";

import { analyzeFrontmatter } from "../../../src/core/frontmatter/okfFrontmatter";
import { nodeSchemaFiles } from "../../../src/node-services/schemaFiles";

/**
 * The stems a filename-stem link list gets for its list editor: the full known set (for the
 * warning) and the dropdown suggestions, closest to the document first and capped at 500.
 */

const SCHEMA = [
  "type: object",
  "properties:",
  "  type: { const: note }",
  "  related:",
  "    type: array",
  "    items:",
  "      type: string",
  "      x-okf-link: { resolution: filename-stem, syntax: plain }",
  "required: [type]",
].join("\n");

function writeFile(root: string, relative: string, content: string): void {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

// @tests_req SwRS-MDOKFSTUDIO-FMEDIT-010
test("T220: a sibling past the 500th stem is known, and the suggestions start with the document's folder", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "okf-link-suggestions-"));
  try {
    writeFile(root, "index.md", "# Bundle\n");
    writeFile(root, "_schema/note.schema.yaml", SCHEMA);
    // 600 stems far from the document (two steps: notes -> .. -> book) that sort before its siblings.
    for (let index = 0; index < 600; index += 1) {
      writeFile(root, `book/a-${String(index).padStart(3, "0")}.md`, "# Chapter\n");
    }
    writeFile(root, "top.md", "# Top\n");
    writeFile(root, "notes/deep/child.md", "# Child\n");
    writeFile(root, "notes/related-target.md", "# Target\n");
    writeFile(root, "notes/zz-sibling.md", "# Sibling\n");
    writeFile(root, "notes/source.md", "---\ntype: note\nrelated: [related-target]\n---\nBody.\n");
    const sourcePath = path.join(root, "notes/source.md");
    const analysis = analyzeFrontmatter({
      schemaFiles: nodeSchemaFiles,
      filePath: sourcePath,
      sourceText: fs.readFileSync(sourcePath, "utf8"),
      stopDir: root,
      bundleRoot: root,
      inspectLinks: true,
      strictAdditionalProperties: false,
      workspaceRoots: [root],
    });
    const related = analysis.fields.find((field) => field.name === "related");
    assert.ok(related);
    // The table resolves the sibling: the editor's known set must agree.
    assert.equal(related.linkResults?.[0]?.status, "valid");
    const known = related.linkKnownStems ?? [];
    assert.equal(known.length, 600 + 6);
    assert.ok(known.includes("related-target"));
    assert.ok(known.includes("a-599"));
    const suggestions = related.linkSuggestions ?? [];
    assert.equal(suggestions.length, 500);
    assert.equal(new Set(suggestions).size, 500);
    // Same folder first, then one step (child folder, parent folder), then two steps, each alphabetical.
    assert.deepEqual(suggestions.slice(0, 6), ["related-target", "source", "zz-sibling", "child", "index", "top"]);
    assert.deepEqual(suggestions.slice(6, 8), ["a-000", "a-001"]);
    assert.equal(suggestions.at(-1), "a-493");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

// @tests_req SwRS-MDOKFSTUDIO-FMEDIT-010
test("T220: a stem found in several folders is suggested once, at its closest distance", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "okf-link-suggestions-"));
  try {
    writeFile(root, "index.md", "# Bundle\n");
    writeFile(root, "_schema/note.schema.yaml", SCHEMA);
    writeFile(root, "far/away/shared.md", "# Far\n");
    writeFile(root, "notes/shared.md", "# Near\n");
    writeFile(root, "alpha.md", "# Alpha\n");
    writeFile(root, "notes/source.md", "---\ntype: note\nrelated: [alpha]\n---\nBody.\n");
    const sourcePath = path.join(root, "notes/source.md");
    const analysis = analyzeFrontmatter({
      schemaFiles: nodeSchemaFiles,
      filePath: sourcePath,
      sourceText: fs.readFileSync(sourcePath, "utf8"),
      stopDir: root,
      bundleRoot: root,
      inspectLinks: true,
      strictAdditionalProperties: false,
      workspaceRoots: [root],
    });
    const related = analysis.fields.find((field) => field.name === "related");
    assert.deepEqual(related?.linkSuggestions, ["shared", "source", "alpha", "index"]);
    // Nothing was capped: the suggestions already are the known set, so no second list is sent.
    assert.equal(related?.linkKnownStems, undefined);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
