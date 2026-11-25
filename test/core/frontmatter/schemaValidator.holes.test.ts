import assert from "node:assert/strict";
import { test } from "node:test";

import {
  getCachedBranchValidator,
  getCachedValidator,
  releaseSchemaValidators,
  schemaValidatorCacheSizeForTests,
  validateWithCachedValidator,
} from "../../../src/core/frontmatter/schemaValidator";

// Tests added by the mutation campaign of src/core (CR-450): they pin the survivors of the first run.

// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-084#S5
test("a boolean schema decides alone, and a schema that is not an object accepts nothing", () => {
  assert.equal(validateWithCachedValidator(true, "anything"), true);
  assert.equal(validateWithCachedValidator(false, "anything"), false);
  for (const schema of [null, undefined, 0, 1, "", "string", Symbol("s")]) {
    assert.equal(validateWithCachedValidator(schema, "anything"), false, String(schema));
  }
});

// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-084#S5
test("an object schema validates a value, and a schema that answers later is not a pass", () => {
  const schema = { type: "object", required: ["name"], properties: { name: { type: "string" } } };
  assert.equal(validateWithCachedValidator(schema, { name: "x" }), true);
  assert.equal(validateWithCachedValidator(schema, {}), false);
  assert.equal(validateWithCachedValidator(schema, { name: 3 }), false);
  assert.equal(validateWithCachedValidator({}, 12), true, "the empty schema accepts everything");
  assert.equal(validateWithCachedValidator({ $async: true, type: "string" }, "x"), false, "a promise is not true");
});

test("a branch validator is compiled once per branch and root, and released with its root", () => {
  const root = { type: "object" };
  const otherRoot = { type: "object" };
  const branch = { $comment: "branch" };
  const expanded = { type: "string", minLength: 2 };
  const otherExpanded = { type: "string", minLength: 3 };
  const base = schemaValidatorCacheSizeForTests();
  const first = getCachedBranchValidator(branch, root, expanded);
  assert.equal(getCachedBranchValidator(branch, root, { type: "number" }), first, "the same branch and root reuse the compiled validator");
  assert.equal(first("ab"), true);
  assert.equal(first("a"), false);
  const second = getCachedBranchValidator(branch, otherRoot, otherExpanded);
  assert.notEqual(second, first, "another root compiles its own");
  assert.equal(second("ab"), false);
  assert.equal(schemaValidatorCacheSizeForTests(), base + 2);
  releaseSchemaValidators(root);
  assert.equal(schemaValidatorCacheSizeForTests(), base + 1, "the expanded branch of the released root is forgotten");
  releaseSchemaValidators(otherRoot);
  assert.equal(schemaValidatorCacheSizeForTests(), base);
});

// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-084#S5
test("releasing a root forgets its compiled sub-schemas and a failed compile is forgotten at once", () => {
  const sub = { type: "string" };
  const root = { type: "object", properties: { name: sub } };
  const base = schemaValidatorCacheSizeForTests();
  getCachedValidator(root);
  getCachedValidator(sub);
  assert.equal(schemaValidatorCacheSizeForTests(), base + 2);
  releaseSchemaValidators(root);
  assert.equal(schemaValidatorCacheSizeForTests(), base);
  const broken = { type: "nonsense" };
  assert.throws(() => getCachedValidator(broken));
  assert.equal(schemaValidatorCacheSizeForTests(), base, "the half-built entry is removed");
  assert.throws(() => getCachedValidator(broken), "a retry fails the same way");
});
