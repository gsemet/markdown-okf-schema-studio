import * as assert from "node:assert/strict";
import { test } from "node:test";

import { isSafeOkfColor } from "../../../src/core/security/spanColors";

test("the colour grammar accepts hex and bounded rgb()/rgba() only", () => {
  for (const good of ["#c00", "#c00f", "#cc0000", "#CC000080", "rgb(0, 128, 255)", "rgb(10%,20%,30.5%)",
    "rgba(1,2,3,0.5)", "rgba(1,2,3,.5)", "rgba(1,2,3,1)", "rgba(1,2,3,50%)"]) {
    assert.equal(isSafeOkfColor(good), true, good);
  }
  for (const bad of ["red", "#cc", "#ccccc", "#ggg", "rgb(256,0,0)", "rgb(0,0,101%)", "rgb(0,0)", "rgb(0,0,0,0)",
    "rgba(0,0,0)", "rgba(0,0,0,1.5)", "rgb(-1,0,0)", "rgb(0 0 0)", "rgb(0,0,0) !important", "#c00 !important",
    "var(--x)", "url(x)", "expression(1)", "rgb(0,0,0/**/)", "rgb(var(--a),0,0)", "rgb(0,0,0);x", "", "hsl(0,0%,0%)",
    "rgb(1e2,0,0)", "rgb(0,0,0)rgb(0,0,0)"]) {
    assert.equal(isSafeOkfColor(bad), false, bad);
  }
});
