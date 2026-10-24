import * as assert from "node:assert/strict";
import { test } from "node:test";

import {
  checkFrontmatterCandidate,
  FRONTMATTER_STALE,
  type FrontmatterField,
  type FrontmatterSavePlan,
  frontmatterValueMatchesField,
  planFrontmatterSave,
} from "../../../src/core/edits/frontmatterEdit";
import { applyTextEdits } from "../../../src/core/edits/textEdit";
import type { FrontmatterResult } from "../../../src/core/frontmatter/okfFrontmatter";

function field(name: string, value: unknown, fieldType: string, extra: Partial<FrontmatterField> = {}): FrontmatterField {
  return { name, value, fieldType, nullable: false, issues: [], ...extra } as unknown as FrontmatterField;
}

function result(fields: FrontmatterField[], extra: Partial<FrontmatterResult> = {}): FrontmatterResult {
  return { fields, schemaFound: false, missingRequiredFields: [], ...extra } as unknown as FrontmatterResult;
}

const SOURCE = "---\ntitle: Old\ncount: 3\n---\nBody\n";

function plan(value: ReturnType<typeof planFrontmatterSave>): FrontmatterSavePlan {
  assert.ok(!("error" in value), "error" in value ? value.error : "");
  return value;
}

test("a value change edits the field in place and gives the edited text", () => {
  const frontmatter = result([field("title", "Old", "text"), field("count", 3, "number")]);
  const save = plan(planFrontmatterSave(SOURCE, frontmatter, { fieldName: "title", fieldValue: "New" }));
  assert.equal(applyTextEdits(SOURCE, [save.edit]), "---\ntitle: New\ncount: 3\n---\nBody\n");
  assert.equal(save.candidateSource, applyTextEdits(SOURCE, [save.edit]));
  assert.equal(save.targetFieldName, "title");
  assert.equal(save.needsSchemaCheck, false, "no schema, nothing to check");
  assert.equal(save.isRemove, false);
});

test("a YAML value is parsed; invalid YAML is refused unless the save is a flush", () => {
  const frontmatter = result([field("count", 3, "number")]);
  const parsed = plan(planFrontmatterSave(SOURCE, frontmatter, { fieldName: "count", fieldValue: "4", fieldValueFormat: "yaml" }));
  assert.equal(parsed.fieldValue, 4);
  const invalid = planFrontmatterSave(SOURCE, frontmatter, { fieldName: "count", fieldValue: "[", fieldValueFormat: "yaml" });
  assert.ok("error" in invalid && invalid.error.startsWith("Invalid YAML value: "));
  const flushed = plan(planFrontmatterSave(SOURCE, frontmatter, {
    fieldName: "count", fieldValue: "[", fieldValueFormat: "yaml", flush: true,
  }));
  assert.equal(flushed.fieldValue, "[");
  assert.deepEqual(planFrontmatterSave(SOURCE, frontmatter, { fieldName: "count", fieldValue: 4, fieldValueFormat: "yaml" }), {
    error: "The YAML field value must be text.",
  });
});

test("a stale field, a bad new key and a value of the wrong type are refused", () => {
  const frontmatter = result([field("title", "Old", "text"), field("count", 3, "number")], { schemaFound: true });
  assert.deepEqual(planFrontmatterSave(SOURCE, frontmatter, { fieldName: "gone", fieldValue: "x" }), { error: FRONTMATTER_STALE });
  assert.deepEqual(planFrontmatterSave(SOURCE, frontmatter, { fieldName: "title", frontmatterAction: "add", fieldValue: "x" }), {
    error: FRONTMATTER_STALE,
  });
  assert.deepEqual(planFrontmatterSave(SOURCE, frontmatter, { fieldName: " key", frontmatterAction: "add", fieldValue: "x" }), {
    error: "Enter a non-empty frontmatter key without leading or trailing spaces.",
  });
  assert.deepEqual(planFrontmatterSave(SOURCE, frontmatter, { fieldName: "title", newFieldName: "" }), {
    error: "Enter a non-empty frontmatter key without leading or trailing spaces.",
  });
  assert.deepEqual(planFrontmatterSave(SOURCE, frontmatter, { fieldName: "count", fieldValue: "three" }), {
    error: FRONTMATTER_STALE,
  });
  const flushed = plan(planFrontmatterSave(SOURCE, frontmatter, { fieldName: "count", fieldValue: "three", flush: true }));
  assert.equal(flushed.needsSchemaCheck, false, "a flush writes the value as typed");
});

test("add, rename and remove plan their edits; a duplicate name is named in the error", () => {
  const frontmatter = result([field("title", "Old", "text"), field("count", 3, "number")]);
  const add = plan(planFrontmatterSave(SOURCE, frontmatter, { fieldName: "tag", frontmatterAction: "add", fieldValue: "x" }));
  assert.match(add.candidateSource, /^tag: x$/mu);
  assert.equal(add.targetFieldName, "tag");
  const rename = plan(planFrontmatterSave(SOURCE, frontmatter, { fieldName: "title", newFieldName: "name" }));
  assert.equal(rename.candidateSource, "---\nname: Old\ncount: 3\n---\nBody\n");
  assert.equal(rename.targetFieldName, "name");
  const remove = plan(planFrontmatterSave(SOURCE, frontmatter, { fieldName: "count", frontmatterAction: "remove" }));
  assert.equal(remove.candidateSource, "---\ntitle: Old\n---\nBody\n");
  assert.equal(remove.isRemove, true);
  assert.deepEqual(planFrontmatterSave(SOURCE, frontmatter, { fieldName: "title", newFieldName: "count" }), {
    error: "A frontmatter field named \"count\" already exists.",
  });
});

test("with a schema the save needs the check of its edited text", () => {
  const frontmatter = result([field("title", "Old", "text")], { schemaFound: true });
  const save = plan(planFrontmatterSave(SOURCE, frontmatter, { fieldName: "title", fieldValue: "New" }));
  assert.equal(save.needsSchemaCheck, true);
  assert.equal(checkFrontmatterCandidate(save, result([field("title", "New", "text")], { schemaFound: true }), frontmatter), undefined);
  assert.deepEqual(checkFrontmatterCandidate(save, result([], { schemaFound: true }), frontmatter), {
    error: "The renamed frontmatter field could not be validated.",
  });
  const failing = field("title", "New", "text", {
    issues: [{ severity: "error", origin: "schema", message: "too short" }],
  } as Partial<FrontmatterField>);
  assert.deepEqual(checkFrontmatterCandidate(save, result([failing], { schemaFound: true }), frontmatter), {
    error: "Schema validation failed: too short",
  });
  const linkOnly = field("title", "New", "text", {
    issues: [{ severity: "error", origin: "link", message: "broken link" }],
  } as Partial<FrontmatterField>);
  assert.equal(checkFrontmatterCandidate(save, result([linkOnly], { schemaFound: true }), frontmatter), undefined);
});

test("a remove may not leave a required field newly missing", () => {
  const frontmatter = result([field("title", "Old", "text"), field("count", 3, "number")], {
    schemaFound: true, missingRequiredFields: ["author"],
  });
  const remove = plan(planFrontmatterSave(SOURCE, frontmatter, { fieldName: "count", frontmatterAction: "remove" }));
  assert.equal(checkFrontmatterCandidate(remove, result([], { missingRequiredFields: ["author"] }), frontmatter), undefined);
  assert.deepEqual(checkFrontmatterCandidate(remove, result([], { missingRequiredFields: ["author", "count"] }), frontmatter), {
    error: "Cannot remove required frontmatter field \"count\".",
  });
});

test("a value fits its field type only with a schema and a known type", () => {
  assert.equal(frontmatterValueMatchesField(field("n", 1, "number"), "x", false), true);
  assert.equal(frontmatterValueMatchesField(field("n", 1, "unknown"), "x", true), true);
  assert.equal(frontmatterValueMatchesField(field("n", 1, "number"), Number.NaN, true), false);
  assert.equal(frontmatterValueMatchesField(field("n", 1, "number", { nullable: true }), null, true), true);
  assert.equal(frontmatterValueMatchesField(field("e", "a", "enum", { enums: ["a", "b"] } as Partial<FrontmatterField>), "b", true), true);
  assert.equal(frontmatterValueMatchesField(field("e", "a", "enum", { enums: ["a", "b"] } as Partial<FrontmatterField>), "c", true), false);
  assert.equal(frontmatterValueMatchesField(field("l", [], "list"), [1], true), true);
  assert.equal(frontmatterValueMatchesField(field("c", true, "checkbox"), "true", true), false);
});
