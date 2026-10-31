import * as assert from "node:assert/strict";
import * as path from "node:path";
import { test } from "node:test";

import { renderMyst } from "../../../src/core/render/mystRenderer";
import { rewriteSphinxHtml } from "../../../src/core/security/html-sanitizer";
import { ResourcePolicy } from "../../../src/core/security/resource-policy";
import { attribute, findElement, findElements, hasClass, parseHtml, textContent, type HtmlElement } from "./dom";

/** Radio choice lists (`- ( )` / `- (x)`): which items form a radio group, and how it renders. */

const workspaceRoot = path.resolve(__dirname, "../../../../../..");

function radios(html: string): HtmlElement[] {
  return findElements(parseHtml(html), (element) => attribute(element, "role") === "radio");
}

/** `line:column:state` of each radio, state `x` (aria-checked) or space, `*` marking the tab stop. */
function describe(radio: HtmlElement): string {
  return `${attribute(radio, "data-myst-radio-line")}:${attribute(radio, "data-myst-radio-column")}`
    + `:${attribute(radio, "aria-checked") === "true" ? "x" : " "}${attribute(radio, "tabindex") === "0" ? "*" : ""}`;
}

/** The radios of each group, by group id, in source order. */
function groups(html: string): string[][] {
  const byGroup = new Map<string, string[]>();
  for (const radio of radios(html)) {
    const group = attribute(radio, "data-myst-radio-group") ?? "";
    byGroup.set(group, [...(byGroup.get(group) ?? []), describe(radio)]);
  }
  return [...byGroup.values()];
}

// @tests_req SwRS-MDOKFSTUDIO-GFM-039
test("a list of radio items renders as one labelled radio group with a roving tab stop", async () => {
  const source = [
    "Fix direction:",
    "",
    "- (x) A click in the margin around the block opens its editor",
    "- ( ) Alt+click on the link opens the editor",
    "- ( ) Leave as is: edit link-only blocks in the source",
    "",
  ].join("\n");
  const { html } = await renderMyst(source);
  assert.deepEqual(groups(html), [["3:2:x*", "4:2: ", "5:2: "]]);
  const document = parseHtml(html);
  const list = findElement(document, (element) => element.tagName === "ul")!;
  assert.equal(attribute(list, "role"), "radiogroup");
  assert.ok(hasClass(list, "myst-radio-group"));
  const label = findElement(document, (element) => element.tagName === "p" && textContent(element) === "Fix direction:")!;
  assert.ok(attribute(label, "id"), "the paragraph above the list gets an id");
  assert.equal(attribute(list, "aria-labelledby"), attribute(label, "id"));
  const items = findElements(list, (element) => element.tagName === "li");
  assert.ok(items.every((item) => hasClass(item, "myst-radio-item") && attribute(item, "role") === "none"));
  for (const radio of radios(html)) {
    assert.equal(radio.tagName, "span");
    assert.ok(hasClass(radio, "myst-radio"));
    const name = findElement(document, (element) => attribute(element, "id") === attribute(radio, "aria-labelledby"));
    assert.ok(name, "each option is named by its own item text");
  }
  assert.equal(textContent(items[1]).trim(), "Alt+click on the link opens the editor");
  assert.doesNotMatch(html, /\( \)|\(x\)/u, "the markers are replaced by the controls");
});

// @tests_req SwRS-MDOKFSTUDIO-GFM-039
test("a lone radio item stays plain text", async () => {
  for (const source of ["- ( ) only option\n", "- (x) only option\n", "Intro\n\n- (x) only option\n- plain item\n"]) {
    const { html } = await renderMyst(source);
    assert.deepEqual(radios(html), [], source);
    assert.match(html, /\([ x]\) only option/u, source);
    assert.doesNotMatch(html, /[\uE000-\uE01F]/u, "no placeholder may leak into the output");
  }
});

// @tests_req SwRS-MDOKFSTUDIO-GFM-039
test("the marker is ( ), (x) or (X) followed by a space or a tab, at the start of a list item", async () => {
  const { html } = await renderMyst("- (X) upper\n- ( )\ttab\n- (x)glued\n- (y) other\n");
  assert.deepEqual(groups(html), [["1:2:x*", "2:2: "]]);
  assert.match(html, /\(x\)glued/u);
  assert.match(html, /\(y\) other/u);
  const prose = await renderMyst("Pick (x) or ( ) in prose.\n\n1. ( ) first\n2) (x) second\n");
  assert.deepEqual(radios(prose.html), [], "ordered markers of two kinds are two lists, each with one option");
  assert.match(prose.html, /Pick \(x\) or \( \) in prose\./u);
  const ordered = await renderMyst("1. ( ) first\n2. (x) second\n");
  assert.deepEqual(groups(ordered.html), [["1:3: ", "2:3:x*"]]);
});

// @tests_req SwRS-MDOKFSTUDIO-GFM-039
test("a blank line, a heading, another list or a non-radio item ends a group", async () => {
  const blank = await renderMyst("- ( ) a\n- (x) b\n\n- ( ) c\n- ( ) d\n");
  assert.deepEqual(groups(blank.html), [["1:2: ", "2:2:x*"], ["4:2: *", "5:2: "]]);
  const heading = await renderMyst("- ( ) a\n- (x) b\n# Heading\n- ( ) c\n- ( ) d\n");
  assert.deepEqual(groups(heading.html), [["1:2: ", "2:2:x*"], ["4:2: *", "5:2: "]]);
  const otherList = await renderMyst("- ( ) a\n- ( ) b\n* ( ) c\n* (x) d\n");
  assert.deepEqual(groups(otherList.html), [["1:2: *", "2:2: "], ["3:2: ", "4:2:x*"]]);
  const plainItem = await renderMyst("- ( ) a\n- ( ) b\n- plain\n- (x) c\n- ( ) d\n- ( ) e\n");
  assert.deepEqual(groups(plainItem.html), [["1:2: *", "2:2: "], ["4:2:x*", "5:2: ", "6:2: "]]);
});

// @tests_req SwRS-MDOKFSTUDIO-GFM-039
test("in a list that mixes task items and radio items each item keeps its kind", async () => {
  const source = "Plan:\n\n- [ ] write the spec\n- ( ) option one\n- (x) option two\n- [x] review\n";
  const { html } = await renderMyst(source);
  assert.deepEqual(groups(html), [["4:2: ", "5:2:x*"]]);
  const document = parseHtml(html);
  const boxes = findElements(document, (element) => element.tagName === "input" && hasClass(element, "myst-checkbox"));
  assert.deepEqual(boxes.map((box) => attribute(box, "data-myst-checkbox-line")), ["3", "6"]);
  const list = findElement(document, (element) => element.tagName === "ul")!;
  assert.notEqual(attribute(list, "role"), "radiogroup", "the list itself stays a list");
  const group = findElement(document, (element) => attribute(element, "role") === "radiogroup")!;
  assert.equal(attribute(group, "aria-owns"), radios(html).map((radio) => attribute(radio, "id")).join(" "));
  assert.equal(attribute(group, "aria-labelledby"), undefined, "the paragraph above labels only a group that starts the list");
});

// @tests_req SwRS-MDOKFSTUDIO-GFM-039
test("a group without a selection and a group with two selections render as written", async () => {
  const none = await renderMyst("- ( ) a\n- ( ) b\n- ( ) c\n");
  assert.deepEqual(groups(none.html), [["1:2: *", "2:2: ", "3:2: "]]);
  const two = await renderMyst("- ( ) a\n- (x) b\n- (X) c\n");
  assert.deepEqual(groups(two.html), [["1:2: ", "2:2:x*", "3:2:x"]]);
});

// @tests_req SwRS-MDOKFSTUDIO-GFM-039
test("a nested list forms its own group, labelled by its parent item", async () => {
  const source = "- (x) outer one\n  - ( ) inner one\n  - (x) inner two\n- ( ) outer two\n";
  const { html } = await renderMyst(source);
  assert.deepEqual(groups(html), [["1:2:x*", "4:2: "], ["2:4: ", "3:4:x*"]]);
  const document = parseHtml(html);
  const inner = findElements(document, (element) => element.tagName === "ul")[1];
  assert.equal(attribute(inner, "role"), "radiogroup");
  const label = findElement(document, (element) => attribute(element, "id") === attribute(inner, "aria-labelledby"));
  assert.match(textContent(label!), /outer one/u);
});

// @tests_req SwRS-MDOKFSTUDIO-GFM-039
test("radio markers stay literal in code and keep exact columns in quotes, CRLF files and after frontmatter", async () => {
  const code = await renderMyst("```text\n- ( ) a\n- (x) b\n```\n\n`- ( ) inline`\n");
  assert.deepEqual(radios(code.html), []);
  assert.match(code.html, />- \( \) a\n/u);
  assert.match(code.html, />- \(x\) b\n/u);
  const quoted = await renderMyst("---\ntitle: Plan\n---\n> - ( ) a\r\n> - (x) b\r\n");
  assert.deepEqual(groups(quoted.html), [["4:4: ", "5:4:x*"]]);
  assert.doesNotMatch(quoted.html + code.html, /[\uE000-\uE01F]/u, "no placeholder may leak into the output");
});

// @tests_req SwRS-MDOKFSTUDIO-GFM-039
test("the webview sanitizer keeps the radio roles, states and source attributes", async () => {
  const { html } = await renderMyst("Choose:\n\n- (x) keep\n- ( ) drop\n");
  const rewritten = rewriteSphinxHtml(html, {
    outputRoot: workspaceRoot,
    policy: new ResourcePolicy([]),
    nonce: "unit-nonce",
    resolveResource: () => undefined,
    resolveNavigation: () => ({ kind: "blocked" }),
  });
  assert.deepEqual(groups(rewritten.html), [["3:2:x*", "4:2: "]]);
  const group = findElement(parseHtml(rewritten.html), (element) => attribute(element, "role") === "radiogroup");
  assert.ok(group && attribute(group, "aria-labelledby"), "the sanitizer keeps the group and its label");
});
