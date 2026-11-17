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
  assert.equal(Buffer.byteLength(COMMENT_CSS, "utf8"), 21977);
  assert.equal(
    createHash("sha256").update(COMMENT_CSS, "utf8").digest("hex"),
    "138c5ec9b03a6eb3c4950ca77ea2a9a485a586edce4506c787fdac581f71eab6",
  );
});
