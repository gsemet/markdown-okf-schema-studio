import * as assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";

import { COMMENT_CSS } from "../../../src/core/preview/styles/commentStyles";

// The comment stylesheet is joined from named parts (chips, incoming changes, review popovers,
// orphaned comments box, hiding rules, image fit). Splitting it must not change one byte: the length
// and digest below are those of the former single constant.
// @tests_req SwRS-MDOKFSTUDIO-CORE-008
// @tests_req SwRS-MDOKFSTUDIO-REVIEW-143
// @tests_req SwRS-MDOKFSTUDIO-REVIEW-028
test("the comment stylesheet joined from its parts equals the former single constant", () => {
  assert.equal(Buffer.byteLength(COMMENT_CSS, "utf8"), 24826);
  assert.equal(
    createHash("sha256").update(COMMENT_CSS, "utf8").digest("hex"),
    "762437166e207f8c5840df966f5b4fbd0eff178e2a5cfa70cb9801db8d87a91a",
  );
});
