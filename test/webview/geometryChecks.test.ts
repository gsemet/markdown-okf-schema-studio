import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import * as vm from "node:vm";
import { test } from "node:test";

// Compiled to out/test/webview, so three levels up is the extension root.
const extensionRoot = path.resolve(__dirname, "../../..");
const source = fs.readFileSync(path.join(extensionRoot, "test", "shared", "geometry-checks.js"), "utf8");

interface GeometryCheck {
  id: string;
  applicable: boolean;
  pass: boolean;
  detail: string;
}

interface FakeRect {
  top: number;
  bottom: number;
  left: number;
  right: number;
  width: number;
  height: number;
}

function rect(left: number, top: number, right: number, bottom: number): FakeRect {
  return { left, top, right, bottom, width: right - left, height: bottom - top };
}

function loadChecks(document: unknown): (options?: object) => { checks: GeometryCheck[] } {
  const context = vm.createContext({
    document,
    window: { innerWidth: 800, innerHeight: 600 },
    getComputedStyle: () => ({ display: "block", visibility: "visible" }),
  });
  vm.runInContext(source, context);
  const check = (context as { studioGeometryChecks?: unknown }).studioGeometryChecks;
  assert.equal(typeof check, "function", "the file defines studioGeometryChecks");
  return check as (options?: object) => { checks: GeometryCheck[] };
}

// Fake text node whose client rects are the given boxes, as a browser Range would report them.
function textNode(text: string, rects: FakeRect[], parentElement?: unknown) {
  return { nodeType: 3, textContent: text, rects, parentElement };
}

// Fake document with one preview root. Only the selectors the checks use return content.
function fakeDocument(root: unknown, extras: { overlays?: unknown[] } = {}) {
  let selected: unknown = undefined;
  return {
    querySelectorAll(selector: string) {
      if (selector === "#sphinx-myst-preview-content") return [root];
      if (selector === ".sphinx-preview-link-tooltip") return extras.overlays ?? [];
      return [];
    },
    createRange() {
      return {
        selectNodeContents(node: { rects: FakeRect[] }) {
          selected = node;
        },
        getClientRects() {
          return (selected as { rects: FakeRect[] }).rects;
        },
      };
    },
  };
}

// Fake root whose descendant queries return the given cells and blocks.
function fakeRoot(cells: unknown[], blocks: unknown[] = []) {
  return {
    querySelectorAll(selector: string) {
      if (selector === "td, th") return cells;
      if (selector === "td, th, p, li, h1, h2, h3, h4, h5, h6, pre, dd, dt") return blocks;
      return [];
    },
  };
}

function runAll(root: unknown, extras: { overlays?: unknown[] } = {}): GeometryCheck[] {
  const run = loadChecks(fakeDocument(root, extras));
  return JSON.parse(JSON.stringify(run({}))).checks as GeometryCheck[];
}

function identifierResult(cell: unknown): GeometryCheck {
  const check = runAll(fakeRoot([cell])).find((item) => item.id === "identifier-split");
  assert.ok(check, "identifier-split is reported");
  return check;
}

test("geometry checks define one function that reports the four check ids", () => {
  const run = loadChecks({ querySelectorAll: () => [] });
  const result = JSON.parse(JSON.stringify(run({})));
  assert.deepEqual(
    result.checks.map((check: GeometryCheck) => check.id),
    ["overlay-covers-text", "overlay-clipped", "identifier-split", "status-two-lines"],
  );
});

test("without any DOM content every geometry check is not applicable and passes", () => {
  const run = loadChecks({ querySelectorAll: () => [] });
  const result = JSON.parse(JSON.stringify(run({ overlays: [], ignoreWithin: [] })));
  for (const check of result.checks as GeometryCheck[]) {
    assert.equal(check.applicable, false, `${check.id} is applicable`);
    assert.equal(check.pass, true, `${check.id} does not pass`);
  }
});

test("identifier-split passes when a cell's text nodes share one line at different sizes", () => {
  // A properties-table name cell: `type` and the smaller `(enum)` label sit on one line.
  const cell = {
    textContent: "type(enum)",
    childNodes: [textNode("type", [rect(0, 83.5, 40, 98.5)]), textNode("(enum)", [rect(40, 85.1, 80, 97.1)])],
  };
  const check = identifierResult(cell);
  assert.equal(check.applicable, true);
  assert.equal(check.pass, true, check.detail);
});

test("identifier-split ignores list items on separate lines", () => {
  // A list item `name` above an item `summary` is two lines by design, not a split identifier.
  const cell = {
    textContent: "namesummary",
    childNodes: [textNode("name", [rect(0, 226.8, 40, 241.8)]), textNode("summary", [rect(0, 251.5, 60, 266.5)])],
  };
  const check = identifierResult(cell);
  assert.equal(check.applicable, true);
  assert.equal(check.pass, true, check.detail);
});

test("identifier-split reports a text node wrapped over two lines", () => {
  const cell = {
    textContent: "2024-03-11",
    childNodes: [textNode("2024-03-11", [rect(0, 1101.5, 80, 1118.5), rect(0, 1123.9, 40, 1140.9)])],
  };
  const check = identifierResult(cell);
  assert.equal(check.applicable, true);
  assert.equal(check.pass, false);
  assert.match(check.detail, /2024-03-11/u);
});

test("overlay-covers-text counts a text node once when nested blocks both contain it", () => {
  const overlay = {
    className: "sphinx-preview-link-tooltip",
    tagName: "DIV",
    getBoundingClientRect: () => rect(0, 0, 200, 50),
  };
  const paragraph: { nodeType: number; childNodes: unknown[]; closest: () => null } = {
    nodeType: 1,
    childNodes: [],
    closest: () => null,
  };
  paragraph.childNodes.push(textNode("covered", [rect(0, 10, 100, 30)], paragraph));
  // The list item contains the paragraph, so both blocks reach the same text node.
  const item = { nodeType: 1, childNodes: [paragraph], closest: () => null };
  const check = runAll(fakeRoot([], [item, paragraph]), { overlays: [overlay] })
    .find((entry) => entry.id === "overlay-covers-text");
  assert.ok(check);
  assert.equal(check.pass, false);
  assert.match(check.detail, /^1 covered text excerpt/u);
});
