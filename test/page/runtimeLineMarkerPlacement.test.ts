import * as assert from "node:assert/strict";
import { test } from "node:test";

import { attribute, findElement, parseHtml } from "../core/render/dom";
import { inlineDocument } from "../core/render/mystFeaturesSupport";
import { renderPreviewDocument } from "../../src/core/render/renderPipeline";
import { createRuntimeHarness, RuntimeElement, type RuntimeHarness } from "./runtimeHarness";
import { buildTabSet, codeBlock, watchProperty, wrappedParagraph } from "./runtimeTabSetSupport";
import { noop, patchMessage } from "./runtimeTestSupport";
import { createNodeFileSystem } from "../../src/node-services/nodeFileSystem";

/**
 * The placement of the line marker (features/lineMarker.ts) on a hidden tab, a table row and a front
 * matter row (CR-457): real flows on the page runtime, with the tab sets wired to the page's
 * `installTabs` (see runtimeTabSetSupport.ts). The cases of a plain block are in runtimeLineMarker.test.ts.
 */

const IDS = { documentId: "file:///active.md", revision: 7, requestId: 11 };
const SELECTED = "true";

function reveal(harness: RuntimeHarness, line: number): void {
  harness.dispatchMessage({ type: "previewRevealLine", ...IDS, line });
  harness.flushFrames();
}

function overlays(harness: RuntimeHarness): RuntimeElement[] {
  return harness.createdElements.filter((element) => element.className === "sphinx-preview-line-marker" && !element.removed);
}

function top(overlay: RuntimeElement | undefined): string {
  return overlay?.style.getPropertyValue("top") ?? "";
}

function child(harness: RuntimeHarness, parent: RuntimeElement, attributes: Record<string, string>, at: number, height: number, tag: string): RuntimeElement {
  const element = new RuntimeElement(attributes, harness.windowState, at, height, tag);
  parent.appendChild(element);
  return element;
}

// The simple tab set: two tab items, the second (lines 206 to 225, not shown) holds a four-line
// paragraph (208 to 211), a code block (213 to 217: fence, three code lines, fence) and a paragraph
// (219 to 221). Its top is 1500, the panels start at 1520.
function simpleTabs(harness: RuntimeHarness) {
  const built = buildTabSet(harness, {
    prefix: "s", top: 1500, setLines: [200, 226], itemLines: [[201, 205], [206, 225]], selected: 0,
  });
  const panel = built.panels[1]!;
  const wrapped = wrappedParagraph(harness, panel, 208, 1530, ["alpha", "beta", "gamma", "delta"]);
  const code = codeBlock(harness, panel, 213, 1620, 3);
  const after = wrappedParagraph(harness, panel, 219, 1700, ["one", "two", "three"]);
  return { ...built, panel, wrapped, code, after };
}

function keyOn(harness: RuntimeHarness, target: RuntimeElement, name: string): void {
  harness.dispatchDocument("keydown", {
    target, key: name, altKey: false, ctrlKey: false, metaKey: false, shiftKey: false, isComposing: false, preventDefault: noop,
  });
  harness.flushFrames();
}

// @tests_req SwRS-MDOKFSTUDIO-LIFE-178
// @tests_req SwRS-MDOKFSTUDIO-MYST-099#S2
// @tests_req SwRS-MDOKFSTUDIO-MYST-099#S8
// @tests_req SwRS-MDOKFSTUDIO-LIFE-193
test("a paragraph line in a hidden tab selects the tab, marks the exact wrapped line and posts nothing", () => {
  const harness = createRuntimeHarness();
  const { tabs, panels, set } = simpleTabs(harness);
  assert.equal(panels[1]!.hidden, true);
  const before = harness.messages.length;
  reveal(harness, 210);
  assert.equal(panels[1]!.hidden, false);
  assert.equal(tabs[1]!.getAttribute("aria-selected"), SELECTED);
  assert.equal(tabs[0]!.getAttribute("aria-selected"), "false");
  assert.equal(overlays(harness).length, 1);
  // Lines 208 to 211 start at 1530, 1550, 1570, 1590: line 210 is the third.
  assert.equal(top(overlays(harness)[0]), "1570px");
  assert.equal(panels[1]!.getAttribute("aria-current"), "location");
  assert.equal(set.getAttribute("aria-current"), null);
  assert.equal(harness.messages.slice(before).some((message) => /^previewEdit|^previewBlock|^previewOpen/u.test(String(message.type))), false);
  reveal(harness, 209);
  assert.equal(top(overlays(harness)[0]), "1550px");
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-178
test("the first line of a wrapped paragraph in a hidden tab marks the paragraph top", () => {
  const harness = createRuntimeHarness();
  simpleTabs(harness);
  reveal(harness, 208);
  assert.equal(top(overlays(harness)[0]), "1530px");
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-178
test("a code line in a hidden tab marks its span", () => {
  const harness = createRuntimeHarness();
  const { panels, code } = simpleTabs(harness);
  reveal(harness, 215);
  assert.equal(panels[1]!.hidden, false);
  // Fence 213, code 214 to 216, closing fence 217: line 215 is the second span.
  assert.equal(top(overlays(harness)[0]), `${code.spans[1]!.top}px`);
  assert.equal(overlays(harness).length, 1);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-178
test("a paragraph line after a code block in a tab panel is not put on a code span", () => {
  const harness = createRuntimeHarness();
  const { after, code } = simpleTabs(harness);
  reveal(harness, 220);
  assert.equal(top(overlays(harness)[0]), "1720px");
  assert.notEqual(top(overlays(harness)[0]), `${code.spans.at(-1)!.top}px`);
  // A line of the panel that no child holds (the blank line 218) takes the panel's top: no span either.
  reveal(harness, 218);
  assert.equal(top(overlays(harness)[0]), "1520px");
  assert.equal(after.getAttribute("data-okf-marker-line"), "219");
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-178
// @tests_req SwRS-MDOKFSTUDIO-MYST-099#S6
// @tests_req SwRS-MDOKFSTUDIO-MYST-099#S8
// @tests_req SwRS-MDOKFSTUDIO-LIFE-193
test("a line in a nested hidden tab selects the outer tab first, then the inner one", () => {
  const harness = createRuntimeHarness();
  const outer = buildTabSet(harness, {
    prefix: "o", top: 2000, setLines: [300, 340], itemLines: [[301, 305], [306, 339]], selected: 0,
  });
  const inner = buildTabSet(harness, {
    prefix: "i", top: 2040, setLines: [308, 338], itemLines: [[309, 312], [314, 337]], selected: 0,
    parent: outer.panels[1]!, nested: true,
  });
  wrappedParagraph(harness, inner.panels[1]!, 316, 2080, ["first", "second"]);
  const log: string[] = [];
  watchProperty(outer.panels[1]!, "hidden", "outer", log);
  watchProperty(inner.panels[1]!, "hidden", "inner", log);
  reveal(harness, 317);
  assert.deepEqual(log, ["outer=false", "inner=false"], "outermost first");
  assert.equal(outer.tabs[1]!.getAttribute("aria-selected"), SELECTED);
  assert.equal(inner.tabs[1]!.getAttribute("aria-selected"), SELECTED);
  assert.equal(top(overlays(harness)[0]), "2100px");
  assert.equal(outer.panels[1]!.getAttribute("aria-current"), "location");
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-178
// @tests_req SwRS-MDOKFSTUDIO-LIFE-193
test("a tab set in a closed dropdown is opened, then its tab is selected", () => {
  const harness = createRuntimeHarness();
  const details = new RuntimeElement({}, harness.windowState, 2400, 300, "details");
  const dropdown = details as RuntimeElement & { open: boolean };
  dropdown.open = false;
  const built = buildTabSet(harness, {
    prefix: "d", top: 2400, setLines: [400, 426], itemLines: [[401, 405], [406, 425]], selected: 0,
    parent: details, laidOut: () => dropdown.open,
  });
  wrappedParagraph(harness, built.panels[1]!, 408, 2430, ["a", "b", "c"]);
  const log: string[] = [];
  watchProperty(details, "open", "details", log);
  watchProperty(built.panels[1]!, "hidden", "panel", log);
  reveal(harness, 409);
  assert.deepEqual(log, ["details=true", "panel=false"]);
  assert.equal(built.tabs[1]!.getAttribute("aria-selected"), SELECTED);
  assert.equal(top(overlays(harness)[0]), "2450px");
});

// @tests_req SwRS-MDOKFSTUDIO-MYST-006#S5
// @tests_req SwRS-MDOKFSTUDIO-LIFE-178
test("a line in the body of a closed dropdown directive opens it and is marked, from the real render", async () => {
  const rendered = await renderPreviewDocument({
    files: createNodeFileSystem(),
    document: inlineDocument(
      ["Intro.", "", ":::{dropdown} Title", "First body line.", "", "Second body paragraph.", ":::", ""].join("\n"),
    ),
    workspaceRoot: process.cwd(),
    requestId: 1,
    isWorkspaceTrusted: () => true,
  });
  const html = parseHtml(rendered.html);
  const real = findElement(html, (element) => element.tagName === "details");
  assert.ok(real, "the dropdown directive rendered a details block");
  const start = Number(attribute(real, "data-line"));
  const end = Number(attribute(real, "data-end-line"));
  assert.deepEqual([start, end], [3, 7]);
  const body = findElement(real, (element) =>
    element.tagName === "p" && attribute(element, "data-line") === "6");
  assert.ok(body, "the second body paragraph is mapped to its source line");

  const harness = createRuntimeHarness();
  const details = new RuntimeElement(
    {
      "data-sphinx-preview-document": "file:///active.md",
      "data-sphinx-source-file": "/workspace/active.md",
      "data-sphinx-source-line": String(start),
      "data-sphinx-source-end-line": String(end),
    }, harness.windowState, 300, 120, "details");
  const dropdown = details as RuntimeElement & { open: boolean };
  dropdown.open = false;
  harness.mappings.push(details);
  harness.details.push(details);
  wrappedParagraph(harness, details, 6, 340, ["Second body paragraph."]);
  const log: string[] = [];
  watchProperty(details, "open", "details", log);
  reveal(harness, 6);
  assert.deepEqual(log, ["details=true"]);
  assert.equal(overlays(harness).length, 1);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-179
test("a re-render keeps the revealed tab and places the marker again", () => {
  const harness = createRuntimeHarness();
  const { panels, tabs } = simpleTabs(harness);
  reveal(harness, 210);
  // The content patch renders the tab set in its default state again (the first tab shown).
  panels[0]!.hidden = false;
  panels[1]!.hidden = true;
  tabs[0]!.setAttribute("aria-selected", "true");
  tabs[1]!.setAttribute("aria-selected", "false");
  harness.dispatchMessage(patchMessage());
  harness.flushFrames();
  assert.equal(panels[1]!.hidden, false, "the choice was put back");
  assert.equal(tabs[1]!.getAttribute("aria-selected"), SELECTED);
  assert.equal(overlays(harness).length, 1);
  assert.equal(top(overlays(harness)[0]), "1570px");
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-179
test("a tab shown by the keyboard hides the marker, and showing its tab again draws it again", () => {
  const harness = createRuntimeHarness();
  const { panels, tabs } = simpleTabs(harness);
  reveal(harness, 210);
  assert.equal(overlays(harness).length, 1);
  keyOn(harness, tabs[1]!, "ArrowLeft");
  assert.equal(panels[1]!.hidden, true);
  assert.equal(overlays(harness).length, 0, "not drawn while its tab is not shown");
  assert.equal(panels[1]!.getAttribute("aria-current"), null);
  // The later placement opened nothing.
  assert.equal(tabs[1]!.getAttribute("aria-selected"), "false");
  keyOn(harness, tabs[0]!, "ArrowRight");
  assert.equal(panels[1]!.hidden, false);
  assert.equal(overlays(harness).length, 1);
  assert.equal(top(overlays(harness)[0]), "1570px");
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-178
test("a later placement never selects a tab", () => {
  const harness = createRuntimeHarness();
  const { panels, tabs, wrapped } = simpleTabs(harness);
  reveal(harness, 210);
  panels[0]!.hidden = false;
  panels[1]!.hidden = true;
  tabs[0]!.setAttribute("aria-selected", "true");
  tabs[1]!.setAttribute("aria-selected", "false");
  wrapped.top += 1;
  harness.dispatchWindow("resize");
  harness.flushFrames();
  assert.equal(panels[1]!.hidden, true);
  assert.equal(tabs[1]!.getAttribute("aria-selected"), "false");
  assert.equal(overlays(harness).length, 0);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-178
test("the line of the tab-set itself marks its top and selects no tab", () => {
  const harness = createRuntimeHarness();
  const { panels, tabs, set } = simpleTabs(harness);
  reveal(harness, 200);
  assert.equal(panels[1]!.hidden, true);
  assert.equal(tabs[1]!.getAttribute("aria-selected"), "false");
  assert.equal(top(overlays(harness)[0]), "1500px");
  assert.equal(set.getAttribute("aria-current"), "location");
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-178
// @tests_req SwRS-MDOKFSTUDIO-LIFE-193
test("the line of a tab item belongs to its panel and selects its tab", () => {
  const harness = createRuntimeHarness();
  const { panels, tabs } = simpleTabs(harness);
  reveal(harness, 206);
  assert.equal(panels[1]!.hidden, false);
  assert.equal(tabs[1]!.getAttribute("aria-selected"), SELECTED);
  assert.equal(top(overlays(harness)[0]), "1520px");
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-178
// @tests_req SwRS-MDOKFSTUDIO-MYST-099#S2
// @tests_req SwRS-MDOKFSTUDIO-MYST-099#S8
test("a tab revealed by the marker takes the click's path: the sets of its sync group follow", () => {
  const harness = createRuntimeHarness();
  const first = buildTabSet(harness, {
    prefix: "f", top: 3000, setLines: [500, 520], itemLines: [[501, 505], [506, 519]], selected: 0,
  });
  const second = buildTabSet(harness, {
    prefix: "g", top: 3300, setLines: [600, 620], itemLines: [[601, 605], [606, 619]], selected: 0,
  });
  [first, second].forEach((built) => {
    built.tabs[0]!.setAttribute("data-myst-tab-sync", "py");
    built.tabs[1]!.setAttribute("data-myst-tab-sync", "node");
  });
  wrappedParagraph(harness, first.panels[1]!, 508, 3030, ["x", "y"]);
  reveal(harness, 509);
  assert.equal(second.tabs[1]!.getAttribute("aria-selected"), SELECTED, "the other set of the group follows");
  assert.equal(second.panels[1]!.hidden, false);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-178
test("revealing a tab only schedules the layout pass: the marker is placed once, inside the request", () => {
  const harness = createRuntimeHarness();
  const { wrapped } = simpleTabs(harness);
  harness.dispatchMessage({ type: "previewRevealLine", ...IDS, line: 210 });
  // No frame ran yet: the tab's onChange only asked for a layout pass, which places the marker after the request.
  assert.equal(overlays(harness).length, 1);
  assert.equal(top(overlays(harness)[0]), "1570px");
  const count = harness.createdElements.filter((element) => element.className === "sphinx-preview-line-marker").length;
  harness.flushFrames();
  assert.equal(harness.createdElements.filter((element) => element.className === "sphinx-preview-line-marker").length, count);
  assert.equal(top(overlays(harness)[0]), "1570px");
  assert.equal(wrapped.getAttribute("data-okf-marker-line"), "208");
});

// The front matter: a section mapped from line 1 to line 1, closed by its fence on line 20; the first
// body block starts on line 22 (the harness's first mapped block).
function frontmatter(harness: RuntimeHarness): RuntimeElement {
  const section = harness.mappings[0]!;
  section.setAttribute("data-okf-properties", "true");
  section.setAttribute("data-okf-frontmatter-end-line", "20");
  section.setAttribute("data-sphinx-source-end-line", "1");
  child(harness, section, { "data-okf-field": "title", "data-okf-line": "2", "data-okf-end-line": "2" }, 40, 20, "tr");
  child(harness, section, { "data-okf-field": "tags", "data-okf-line": "3", "data-okf-end-line": "6" }, 60, 80, "tr");
  child(harness, section, { "data-okf-field": "owner", "data-okf-line": "8", "data-okf-end-line": "8" }, 140, 20, "tr");
  return section;
}

// @tests_req SwRS-MDOKFSTUDIO-LIFE-178
// @tests_req SwRS-MDOKFSTUDIO-LIFE-194
test("a front matter key line marks its row, a line in a list value the row of the list, a comment the section top", () => {
  const harness = createRuntimeHarness({ frontmatterHeight: 160, firstMappedSourceLine: 22 });
  const section = frontmatter(harness);
  reveal(harness, 8);
  assert.equal(top(overlays(harness)[0]), "140px");
  reveal(harness, 5);
  assert.equal(top(overlays(harness)[0]), "60px");
  reveal(harness, 7);
  assert.equal(top(overlays(harness)[0]), "0px", "a comment line");
  reveal(harness, 1);
  assert.equal(top(overlays(harness)[0]), "0px", "the opening fence");
  assert.equal(section.getAttribute("aria-current"), "location");
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-178
// @tests_req SwRS-MDOKFSTUDIO-LIFE-194
test("a line near the closing fence of a long front matter marks the section, not the first body block", () => {
  const harness = createRuntimeHarness({ frontmatterHeight: 160, firstMappedSourceLine: 22 });
  const section = frontmatter(harness);
  reveal(harness, 19);
  assert.equal(top(overlays(harness)[0]), "0px");
  assert.equal(section.getAttribute("aria-current"), "location");
  assert.equal(harness.mappings[1]!.getAttribute("aria-current"), null, "the first body block is not marked");
  reveal(harness, 20);
  assert.equal(section.getAttribute("aria-current"), "location");
  assert.equal(harness.mappings[1]!.getAttribute("aria-current"), null);
});

function collapse(harness: RuntimeHarness): void {
  harness.dispatchDocument("click", { target: harness.frontmatterToggleButton, preventDefault: noop, stopImmediatePropagation: noop });
}

// @tests_req SwRS-MDOKFSTUDIO-LIFE-178
// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-090#S1
// @tests_req SwRS-MDOKFSTUDIO-LIFE-194
test("a row line expands a collapsed properties table and marks the row; a fence line leaves it collapsed", () => {
  const harness = createRuntimeHarness({ frontmatterHeight: 160, firstMappedSourceLine: 22 });
  const section = frontmatter(harness);
  collapse(harness);
  assert.equal(harness.frontmatterToggleButton.getAttribute("aria-expanded"), "false");
  reveal(harness, 8);
  assert.equal(harness.frontmatterToggleButton.getAttribute("aria-expanded"), "true");
  assert.equal(top(overlays(harness)[0]), "140px");
  assert.equal(section.getAttribute("aria-current"), "location");

  collapse(harness);
  assert.equal(harness.frontmatterToggleButton.getAttribute("aria-expanded"), "false");
  reveal(harness, 7);
  assert.equal(harness.frontmatterToggleButton.getAttribute("aria-expanded"), "false", "a comment line expands nothing");
  assert.equal(top(overlays(harness)[0]), "0px");
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-179
// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-090#S1
test("a properties table the reader collapses again hides the marker, and a later placement never expands it", () => {
  const harness = createRuntimeHarness({ frontmatterHeight: 160, firstMappedSourceLine: 22 });
  frontmatter(harness);
  reveal(harness, 8);
  assert.equal(overlays(harness).length, 1);
  collapse(harness);
  harness.dispatchWindow("resize");
  harness.flushFrames();
  assert.equal(harness.frontmatterToggleButton.getAttribute("aria-expanded"), "false");
  assert.equal(overlays(harness).length, 0, "not drawn while collapsed");
  harness.dispatchWindow("resize");
  harness.flushFrames();
  assert.equal(harness.frontmatterToggleButton.getAttribute("aria-expanded"), "false", "never expanded by a placement");
  collapse(harness);
  harness.dispatchWindow("resize");
  harness.flushFrames();
  assert.equal(overlays(harness).length, 1, "drawn again once the table shows");
  assert.equal(top(overlays(harness)[0]), "140px");
});

// A quote (a mapped block, lines 60 to 70) holding a pipe table on lines 62 to 65: header 62,
// delimiter 63, body rows 64 and 65. The table and its rows carry marker lines only.
function quotedTable(harness: RuntimeHarness): RuntimeElement {
  const quote = new RuntimeElement({
    "data-sphinx-preview-document": "file:///active.md",
    "data-sphinx-source-end-line": "70",
    "data-sphinx-source-file": "/workspace/active.md",
    "data-sphinx-source-line": "60",
  }, harness.windowState, 600, 200, "blockquote");
  harness.mappings.push(quote);
  const table = child(harness, quote, { "data-okf-marker-line": "62", "data-okf-marker-end-line": "65" }, 620, 100, "table");
  // As rendered, each cell carries the marker line of its row too (a cell is never the target).
  for (const [line, rowTop] of [["62", 620], ["64", 650], ["65", 680]] as const) {
    const row = child(harness, table, { "data-okf-marker-line": line }, rowTop, 25, "tr");
    child(harness, row, { "data-okf-marker-line": line }, rowTop, 25, "td");
  }
  return quote;
}

// @tests_req SwRS-MDOKFSTUDIO-LIFE-178
// @tests_req SwRS-MDOKFSTUDIO-LIFE-192
test("a table in a quote marks its row, the quote is the marked block, and the delimiter line marks the header row", () => {
  const harness = createRuntimeHarness();
  const quote = quotedTable(harness);
  reveal(harness, 65);
  assert.equal(top(overlays(harness)[0]), "680px");
  assert.equal(overlays(harness)[0]!.style.getPropertyValue("height"), "25px", "the row's own height");
  assert.equal(quote.getAttribute("aria-current"), "location");
  assert.equal(quote.getAttribute("data-sphinx-line-marker"), "true");
  reveal(harness, 63);
  assert.equal(top(overlays(harness)[0]), "620px");
  reveal(harness, 62);
  assert.equal(top(overlays(harness)[0]), "620px");
  reveal(harness, 64);
  assert.equal(top(overlays(harness)[0]), "650px");
  assert.equal(overlays(harness).length, 1);
});

// @tests_req SwRS-MDOKFSTUDIO-LIFE-178
// @tests_req SwRS-MDOKFSTUDIO-LIFE-192
test("a line past the last row of a table, or in a table with no row lines, marks the block top", () => {
  const harness = createRuntimeHarness();
  const quote = quotedTable(harness);
  reveal(harness, 67);
  assert.equal(top(overlays(harness)[0]), "600px", "past the last row: the quote's top");
  assert.equal(quote.getAttribute("aria-current"), "location");
  // A list-table shape: a figure with no marker line anywhere inside.
  const figure = new RuntimeElement({
    "data-sphinx-preview-document": "file:///active.md",
    "data-sphinx-source-end-line": "90",
    "data-sphinx-source-file": "/workspace/active.md",
    "data-sphinx-source-line": "80",
  }, harness.windowState, 900, 100, "figure");
  child(harness, figure, {}, 920, 25, "tr");
  harness.mappings.push(figure);
  reveal(harness, 84);
  assert.equal(top(overlays(harness)[0]), "900px");
  assert.equal(figure.getAttribute("aria-current"), "location");
});
