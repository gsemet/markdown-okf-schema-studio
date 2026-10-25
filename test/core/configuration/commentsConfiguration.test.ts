import * as assert from "node:assert/strict";
import { test } from "node:test";

import {
  COMMENTS_CONFIGURATION_SECTION,
  DEFAULT_COMMENTS_CONFIGURATION,
  readCommentsConfiguration,
} from "../../../src/core/configuration/commentsConfiguration";

// @tests_req SwRS-MDOKFSTUDIO-REVIEW-065
test("T43: reads the author name of the comments section", () => {
  const sections: string[] = [];
  const configuration = readCommentsConfiguration({
    get<T>(section: string, _defaultValue: T): T {
      sections.push(section);
      return "Ada" as T;
    },
  });
  assert.deepEqual(configuration, { authorName: "Ada" });
  assert.deepEqual(sections, ["authorName"]);
  assert.equal(COMMENTS_CONFIGURATION_SECTION, "markdownOkfSchemaStudio.comments");
  assert.deepEqual(DEFAULT_COMMENTS_CONFIGURATION, { authorName: "" });
});

test("T43: a non-string author name falls back to the empty default", () => {
  for (const value of [42, null, undefined, {}, true]) {
    const configuration = readCommentsConfiguration({
      get<T>(_section: string, _defaultValue: T): T {
        return value as T;
      },
    });
    assert.deepEqual(configuration, DEFAULT_COMMENTS_CONFIGURATION, String(value));
  }
});
