import * as assert from "node:assert/strict";
import { test } from "node:test";

import { isSafeOkfColor } from "../../../src/core/security/spanColors";
import { applySpanColors } from "../../../src/page/modules/spanColors";

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
