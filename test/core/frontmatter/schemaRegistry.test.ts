import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

import {
  analyzeFrontmatter,
  setSchemaFileReaderForTests,
} from "../../../src/core/frontmatter/okfFrontmatter";
import { resetSchemaRegistryForTests } from "../../../src/core/frontmatter/schemaRegistry";
import { schemaValidatorCacheSizeForTests } from "../../../src/core/frontmatter/schemaValidator";

// Note: the cache-size accessor reads Ajv's private `_cache` Map; revisit if Ajv is upgraded.
const SCHEMA = (extra = "") => [
  "type: object",
  "required: [type, title]",
  "properties:",
  "  type: { type: string, enum: [note] }",
  "  title: { type: string }",
  "  status: { type: string, enum: [draft, done] }",
  "  tags: { type: array, items: { type: string } }",
  extra,
  "if: { properties: { status: { const: done } } }",
  "then: { required: [tags] }",
].join("\n");

function fixture(): { root: string; schemaPath: string; analyze: (source?: string) => ReturnType<typeof analyzeFrontmatter> } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "okf-registry-"));
  fs.mkdirSync(path.join(root, "_schema"));
  const schemaPath = path.join(root, "_schema", "note.schema.yaml");
  fs.writeFileSync(schemaPath, SCHEMA());
  const filePath = path.join(root, "doc.md");
  const analyze = (source = "---\ntype: note\ntitle: Hi\nstatus: done\ntags: [a]\n---\n") =>
    analyzeFrontmatter({
      filePath,
      sourceText: source,
      stopDir: root,
      inspectLinks: false,
      strictAdditionalProperties: false,
      workspaceRoots: [root],
    });
  return { root, schemaPath, analyze };
}

test.beforeEach(() => resetSchemaRegistryForTests());
test.afterEach(() => {
  setSchemaFileReaderForTests(undefined);
  resetSchemaRegistryForTests();
});

test("repeated analyses reuse one compiled schema and keep the Ajv cache bounded", () => {
  const { root, analyze } = fixture();
  try {
    // Ajv pre-loads its 2020-12 meta-schemas; only growth beyond that baseline counts.
    const baseline = schemaValidatorCacheSizeForTests();
    analyze();
    const afterFirst = schemaValidatorCacheSizeForTests();
    for (let i = 0; i < 50; i += 1) analyze();
    assert.equal(schemaValidatorCacheSizeForTests(), afterFirst);
    assert.ok(afterFirst - baseline <= 5, `entries added by one schema: ${afterFirst - baseline}`);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("editing the schema is picked up and the previous compile is released", () => {
  const { root, schemaPath, analyze } = fixture();
  try {
    const before = analyze();
    assert.equal(before.summary.errors, 0);
    const size = schemaValidatorCacheSizeForTests();
    // Same size, same-tick style edit: content differs only by one character.
    fs.writeFileSync(schemaPath, SCHEMA().replace("[draft, done]", "[draft, dune]"));
    const after = analyze();
    assert.ok(after.summary.errors > 0, "status 'done' must now violate the enum");
    assert.equal(schemaValidatorCacheSizeForTests(), size);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("touching the schema with identical content keeps the result correct and the cache flat", () => {
  const { root, schemaPath, analyze } = fixture();
  try {
    analyze();
    const size = schemaValidatorCacheSizeForTests();
    const future = new Date(Date.now() + 60_000);
    fs.utimesSync(schemaPath, future, future);
    const result = analyze();
    assert.equal(result.summary.errors, 0);
    assert.equal(schemaValidatorCacheSizeForTests(), size);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("deleting the schema falls back to the generic table", () => {
  const { root, schemaPath, analyze } = fixture();
  try {
    assert.equal(analyze().schemaFound, true);
    fs.rmSync(schemaPath);
    assert.equal(analyze().schemaFound, false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("a replaced schema applies, and reverting it is picked up again", () => {
  const { root, schemaPath, analyze } = fixture();
  try {
    analyze();
    fs.writeFileSync(schemaPath, "type: object\nrequired: [nope]\n");
    const broken = analyze();
    assert.ok(broken.missingRequiredFields.includes("nope"));
    fs.writeFileSync(schemaPath, SCHEMA());
    assert.equal(analyze().schemaFound, true);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("changing, adding or removing an inlined $ref target is picked up", () => {
  const { root, schemaPath, analyze } = fixture();
  try {
    const refPath = path.join(root, "_schema", "common.yaml");
    fs.writeFileSync(refPath, "type: string\nenum: [draft, done]\n");
    fs.writeFileSync(schemaPath, SCHEMA().replace("{ type: string, enum: [draft, done] }", "{ $ref: common }"));
    assert.equal(analyze().summary.errors, 0);
    fs.writeFileSync(refPath, "type: string\nenum: [draft]\n");
    assert.ok(analyze().summary.errors > 0, "edited $ref target must apply");
    // The ref target disappears: the $ref stays unresolved, exactly as without the cache.
    fs.rmSync(refPath);
    const withoutTarget = analyze();
    resetSchemaRegistryForTests();
    assert.deepEqual(withoutTarget.summary, analyze().summary);
    // A target that appears later (probed path existed = false before) is picked up.
    fs.writeFileSync(refPath, "type: string\nenum: [draft]\n");
    assert.ok(analyze().summary.errors > 0);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("setSchemaFileReaderForTests overrides content and drops cached schemas", () => {
  const { root, schemaPath, analyze } = fixture();
  try {
    assert.equal(analyze().summary.errors, 0);
    setSchemaFileReaderForTests((p) => {
      assert.equal(p, schemaPath);
      return SCHEMA().replace("[draft, done]", "[draft]");
    });
    assert.ok(analyze().summary.errors > 0);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("an invalid schema reports the same compile error on every analysis", () => {
  const { root, schemaPath, analyze } = fixture();
  try {
    fs.writeFileSync(schemaPath, "type: object\nproperties:\n  title: { type: nope }\n");
    const messages = [analyze(), analyze(), analyze()].map((result) =>
      result.fields.flatMap((field) => field.issues.map((issue) => issue.message))
        .concat(result.info.map((entry) => entry.message)).join("|"));
    assert.match(messages[0], /Schema validation failed to run/);
    assert.equal(messages[1], messages[0]);
    assert.equal(messages[2], messages[0]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("a schema with a property named $id can be edited and re-analysed", () => {
  const { root, schemaPath, analyze } = fixture();
  try {
    const withIdProperty = SCHEMA("  $id: { type: string }");
    fs.writeFileSync(schemaPath, withIdProperty);
    assert.equal(analyze().schemaFound, true);
    fs.writeFileSync(schemaPath, withIdProperty.replace("required: [type, title]", "required: [type, title, zz]"));
    const after = analyze();
    assert.equal(after.schemaFound, true);
    assert.ok(after.missingRequiredFields.includes("zz"));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
