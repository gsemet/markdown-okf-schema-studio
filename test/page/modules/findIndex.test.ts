import * as assert from "node:assert/strict";
import { test } from "node:test";

import { compileFind } from "../../../src/core/find/findMatches";
import { collectTextBlocks, findInBlocks } from "../../../src/page/modules/findIndex";
import { FakeDocument, FakeElement, FakeText, provideGlobalElement } from "./fakeDom";

provideGlobalElement(FakeElement);
const document = new FakeDocument();

const el = (tag: string, children: Array<string | FakeElement | FakeText>, attrs: Record<string, string> = {}): FakeElement => {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) element.setAttribute(key, value);
  for (const child of children) element.appendChild(typeof child === "string" ? new FakeText(child) : child as FakeElement);
  return element;
};

const pattern = (query: string, regex = false): RegExp => {
  const compiled = compileFind(query, { matchCase: false, wholeWord: false, regex });
  assert.ok(compiled && "pattern" in compiled);
  return compiled.pattern;
};

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-010#S4
test("text blocks follow the block elements; inline elements stay in their block", () => {
  const root = el("main", [
    el("p", ["one ", el("strong", ["two"]), " three"]),
    el("table", [el("tr", [el("td", ["cell a"]), el("td", ["cell b"])])]),
    el("ul", [el("li", ["item ", el("code", ["x"])])]),
  ]);
  assert.deepEqual(collectTextBlocks(root as never).map((block) => block.text), ["one two three", "cell a", "cell b", "item x"]);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-010#S4
test("white space collapses as the reader sees it, code keeps its own", () => {
  const root = el("main", [
    el("p", ["wrapped\n  over   lines ", el("em", [" and  more"])]),
    el("pre", [el("code", ["a  b\n  c"])]),
  ]);
  assert.deepEqual(collectTextBlocks(root as never).map((block) => block.text), ["wrapped over lines and more", "a  b\n  c"]);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-010#S1
// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-010#S2
test("a match maps back to the text nodes it starts and ends in, white space collapsed or not", () => {
  const first = new FakeText("wrapped\n  over");
  const second = new FakeText(" lines and");
  const root = el("main", [el("p", [first, el("em", [second])])]);
  const [match] = findInBlocks(collectTextBlocks(root as never), pattern("over lines"), 10);
  assert.ok(match);
  assert.equal(match.text, "over lines");
  assert.equal(match.startNode, first);
  assert.equal(match.startOffset, "wrapped\n  ".length);
  assert.equal(match.endNode, second);
  assert.equal(match.endOffset, " lines".length);
  const [wrap] = findInBlocks(collectTextBlocks(root as never), pattern("wrapped over"), 10);
  assert.equal(wrap!.text, "wrapped over", "a line break and spaces are one space for the query");
  assert.equal(wrap!.endNode, first);
  assert.equal(wrap!.endOffset, "wrapped\n  over".length);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-010#S1
// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-010#S2
test("a match never crosses two text blocks", () => {
  const root = el("main", [el("p", ["end of one"]), el("p", ["start of two"])]);
  assert.equal(findInBlocks(collectTextBlocks(root as never), pattern("one start"), 10).length, 0);
  assert.equal(findInBlocks(collectTextBlocks(root as never), pattern("of", false), 10).length, 2);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-010#S4
test("the limit stops the search across blocks", () => {
  const root = el("main", [el("p", ["a a a"]), el("p", ["a a a"])]);
  assert.equal(findInBlocks(collectTextBlocks(root as never), pattern("a"), 4).length, 4);
});

const SOURCE_KINDS = ["mermaid", "plantuml", "vega"] as const;

/** A figure as the page holds it: the diagram with its render state (none while it draws), then its source panel. */
const figure = (kind: (typeof SOURCE_KINDS)[number], state: string | undefined): FakeElement => el("figure", [
  el("div", [`${kind} picture`], { class: `myst-${kind}-diagram`, ...(state === undefined ? {} : { "data-render-state": state }) }),
  "\n",
  el("details", [el("summary", ["Source"]), el("pre", [el("code", [`${kind} words`])])], { class: `myst-${kind}-source` }),
], { class: `myst-${kind}-figure` });

// @tests_req SwRS-MDOKFSTUDIO-DIAG-001#S1
// @tests_req SwRS-MDOKFSTUDIO-DIAG-023#S1
// @tests_req SwRS-MDOKFSTUDIO-DIAG-121#S4
test("the source panel of a drawn or drawing figure is hidden and not searched", () => {
  for (const kind of SOURCE_KINDS) {
    for (const state of ["rendered", undefined]) {
      const root = el("main", [el("p", ["body text"]), figure(kind, state)]);
      const blocks = collectTextBlocks(root as never);
      const label = `${kind} ${state ?? "pending"}`;
      assert.deepEqual(blocks.map((block) => block.text), ["body text", `${kind} picture`], label);
      assert.equal(findInBlocks(blocks, pattern(`${kind} words`), 10).length, 0, label);
    }
  }
});

// @tests_req SwRS-MDOKFSTUDIO-DIAG-001#S1
// @tests_req SwRS-MDOKFSTUDIO-DIAG-023#S1
// @tests_req SwRS-MDOKFSTUDIO-DIAG-121#S4
test("the source panel of a failed figure is searched, and only that one", () => {
  for (const kind of SOURCE_KINDS) {
    for (const state of ["error", "unavailable"]) {
      const root = el("main", [figure(kind, "rendered"), figure(kind, state)]);
      const matches = findInBlocks(collectTextBlocks(root as never), pattern(`${kind} words`), 10);
      assert.equal(matches.length, 1, `${kind} ${state}`);
    }
  }
});
