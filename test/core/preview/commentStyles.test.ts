import * as assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";

import { COMMENT_CSS } from "../../../src/core/preview/styles/commentStyles";

// The comment stylesheet is joined from named parts (chips, incoming changes, review popovers,
// orphaned comments box, hiding rules, image fit). Joining them must not change one byte by accident:
// a deliberate change of the stylesheet, comments included, updates the length and digest below.
// @tests_req SwRS-MDOKFSTUDIO-REVIEW-143#S4
// @tests_req SwRS-MDOKFSTUDIO-REVIEW-143#S6
// @tests_req SwRS-MDOKFSTUDIO-REVIEW-028#S2
test("the comment stylesheet joined from its parts equals the pinned text", () => {
  assert.equal(Buffer.byteLength(COMMENT_CSS, "utf8"), 24971);
  assert.equal(
    createHash("sha256").update(COMMENT_CSS, "utf8").digest("hex"),
    "8e9d771a2e2b23e0ea34d30ab1d824631be8f5ce76ed5bb510b5d8f1c617a7ed",
  );
});
