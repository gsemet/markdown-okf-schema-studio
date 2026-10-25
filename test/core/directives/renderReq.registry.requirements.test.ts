/**
 * Requirement test of the directive registry: a directive name that two families declare is refused
 * when the registry is built (`registry.ts`). The test builds the registry again with a duplicate.
 */

import * as assert from "node:assert/strict";
import { test } from "node:test";

import { ADMONITION_DIRECTIVE } from "../../../src/core/directives/admonition";

const REGISTRY = require.resolve("../../../src/core/directives/registry");

test("a directive name registered twice raises an error naming it; distinct names register", () => {
  const names = ADMONITION_DIRECTIVE.names as string[];
  delete require.cache[REGISTRY];
  assert.doesNotThrow(() => require(REGISTRY), "families with distinct names register without error");

  names.push("figure"); // the figure family declares `figure` already
  try {
    delete require.cache[REGISTRY];
    assert.throws(() => require(REGISTRY), /Directive \{figure\} is registered twice\./u);
  } finally {
    names.pop();
    delete require.cache[REGISTRY];
  }
  assert.doesNotThrow(() => require(REGISTRY));
});
