import * as assert from "node:assert/strict";
import { test } from "node:test";

import { applySpanColors, isSafeOkfColor } from "../../src/webview/spanColors";

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

function fakeElement(attributes: Record<string, string>) {
  const set = new Map<string, string>();
  return {
    set,
    getAttribute: (name: string) => attributes[name] ?? null,
    style: { setProperty: (name: string, value: string) => set.set(name, value) },
  };
}

test("data-okf-color and data-okf-background become inline styles, invalid values are ignored", () => {
  const good = fakeElement({ "data-okf-color": "#c00", "data-okf-background": "rgba(1,2,3,0.5)" });
  const bad = fakeElement({ "data-okf-color": "url(x)", "data-okf-background": "red !important" });
  const document = {
    querySelectorAll: (selector: string) => {
      const attribute = /\[(.+)\]$/u.exec(selector)?.[1] ?? "";
      assert.match(selector, /^#sphinx-myst-preview-content \[/u);
      return [good, bad].filter((element) => element.getAttribute(attribute) !== null);
    },
  };
  applySpanColors(document as never, isSafeOkfColor);
  assert.deepEqual([...good.set], [["color", "#c00"], ["background-color", "rgba(1,2,3,0.5)"]]);
  assert.equal(bad.set.size, 0);
});
