import assert from "node:assert/strict";
import { test } from "node:test";

import { getCachedValidator } from "../../../src/core/frontmatter/schemaValidator";

test("validator cache returns the same compiled function for a schema object", () => {
  const schema = {
    type: "object",
    properties: { name: { type: "string" } },
  };

  const first = getCachedValidator(schema);
  const second = getCachedValidator(schema);

  assert.strictEqual(first, second);
  assert.equal(first({ name: "example" }), true);
  assert.equal(first({ name: 42 }), false);
});
