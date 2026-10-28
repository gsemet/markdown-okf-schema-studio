import * as assert from "node:assert/strict";
import { test } from "node:test";

import { createEditActions } from "../../../src/page/modules/editActions";
import { createMarkdownTableTools } from "../../../src/page/modules/markdownTable";

const registry = createEditActions([], createMarkdownTableTools());

function applyTo(id: string, value: string, selection: [number, number]): { value: string; selection: [number, number] } {
  const edit = registry.byId.get(id)!.apply({ value, selectionStart: selection[0], selectionEnd: selection[1], scope: "block" })!;
  return {
    value: value.slice(0, edit.start) + edit.text + value.slice(edit.end),
    selection: [edit.selectionStart, edit.selectionEnd],
  };
}

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-265
test("vegaLite inserts a Vega-Lite bar chart fence set apart, its title selected, and the fence renders as a chart", () => {
  const out = applyTo("vegaLite", "Intro\n\nOutro", [5, 5])!;
  assert.match(out.value, /^Intro\n\n```vega-lite\n\{\n {2}"title": "Chart title",/u);
  assert.match(out.value, /\n```\n\nOutro$/u);
  assert.equal(out.value.slice(...out.selection), "Chart title");
  const spec = JSON.parse(/```vega-lite\n([\s\S]*?)\n```/u.exec(out.value)![1]!) as { mark: string; data: { values: unknown[] } };
  assert.equal(spec.mark, "bar");
  assert.equal(spec.data.values.length, 3);
  assert.equal(applyTo("vegaLite", "", [0, 0])!.value.startsWith("```vega-lite\n"), true, "an empty document gets no leading break");
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-265
test("vega inserts a Vega bar chart fence with inline data, its title selected", () => {
  const out = applyTo("vega", "Intro", [5, 5])!;
  assert.match(out.value, /^Intro\n\n```vega\n\{/u);
  assert.equal(out.value.slice(...out.selection), "Chart title");
  const spec = JSON.parse(/```vega\n([\s\S]*?)\n```/u.exec(out.value)![1]!) as { marks: Array<{ type: string }>; data: Array<{ values: unknown[] }> };
  assert.equal(spec.marks[0]!.type, "rect");
  assert.equal(spec.data[0]!.values.length, 3);
});

