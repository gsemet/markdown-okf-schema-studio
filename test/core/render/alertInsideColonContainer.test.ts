/**
 * Alerts inside MyST colon containers. The alert pass rewrites `> [!NOTE]` into a `:::{note}`
 * admonition; its closing fence must not close the enclosing `:::{card}` / `:::{tab-item}`, so the
 * content after the alert stays inside the container.
 */

import * as assert from "node:assert/strict";
import { test } from "node:test";

import { expandGithubAlertsWithLines } from "../../../src/core/render/mystGithubAlerts";
import { renderMyst } from "../../../src/core/render/mystRenderer";
import { attribute, findElements, type HtmlElement, parseHtml, textContent } from "./dom";

type Block = [tag: string, line: number, endLine: number | undefined];

function blockOf(element: HtmlElement): Block {
  const end = attribute(element, "data-end-line");
  return [element.tagName, Number(attribute(element, "data-line")), end === undefined ? undefined : Number(end)];
}

function mapped(html: string): HtmlElement[] {
  return findElements(parseHtml(html), (element) => attribute(element, "data-line") !== undefined);
}

// @tests_req SwRS-MDOKFSTUDIO-GFM-009
test("an alert inside a card keeps the text after it inside the card", async () => {
  const source = [":::{card} Title", "> [!NOTE]", "> in card", "", "After alert.", ":::", "", "Outside.", ""].join("\n");
  const { html } = await renderMyst(source);
  const card = findElements(parseHtml(html), (element) => /card/u.test(attribute(element, "class") ?? ""))[0];
  assert.ok(card, "a card is rendered");
  assert.match(textContent(card), /in card/u);
  assert.match(textContent(card), /After alert\./u, "the text after the alert is inside the card");
  assert.doesNotMatch(textContent(card), /Outside\./u);
  const blocks = mapped(html).filter((element) => ["aside", "p"].includes(element.tagName)).map(blockOf);
  assert.deepEqual(blocks, [
    ["aside", 2, 3],
    ["p", 3, 3],
    ["p", 5, 5],
    ["p", 8, 8],
  ]);
});

// @tests_req SwRS-MDOKFSTUDIO-GFM-009
test("an alert inside a tab item of a tab set keeps the text after it in the tab", async () => {
  const source = [
    "::::{tab-set}",
    ":::{tab-item} A",
    "> [!TIP]",
    "> in tab",
    "",
    "After alert.",
    ":::",
    ":::{tab-item} B",
    "B body",
    ":::",
    "::::",
    "",
    "Outside.",
    "",
  ].join("\n");
  const { html } = await renderMyst(source);
  const panels = findElements(parseHtml(html), (element) => /tab-(content|panel|item)/u.test(attribute(element, "class") ?? ""));
  const holder = panels.find((element) => /After alert\./u.test(textContent(element)) && /in tab/u.test(textContent(element)));
  assert.ok(holder, "the text after the alert shares a tab panel with the alert");
  assert.doesNotMatch(textContent(holder), /B body/u);
  // The tab panels carry the lines of their items; their children carry none.
  assert.deepEqual(mapped(html).map(blockOf), [
    ["div", 1, 11],
    ["div", 2, 7],
    ["div", 8, 10],
    ["p", 13, 13],
  ]);
});

// @tests_req SwRS-MDOKFSTUDIO-GFM-009
test("an alert in a three-colon card of a nested grid keeps the text after it in the card", async () => {
  const source = [
    ":::::{grid} 1",
    "::::{grid-item}",
    ":::{card} Inner",
    "  > [!WARNING]",
    "  > careful",
    "",
    "After alert.",
    ":::",
    "::::",
    ":::::",
    "",
    "Outside.",
    "",
  ].join("\n");
  const { html } = await renderMyst(source);
  const card = findElements(parseHtml(html), (element) => /card/u.test(attribute(element, "class") ?? "") && /careful/u.test(textContent(element)))
    .at(-1);
  assert.ok(card);
  assert.match(textContent(card), /After alert\./u);
  assert.doesNotMatch(textContent(card), /Outside\./u);
  const blocks = mapped(html).filter((element) => ["aside", "p"].includes(element.tagName)).map(blockOf);
  assert.deepEqual(blocks, [
    ["aside", 4, 5],
    ["p", 5, 5],
    ["p", 7, 7],
    ["p", 12, 12],
  ]);
});

// @tests_req SwRS-MDOKFSTUDIO-GFM-009
test("inside a colon container the alert is a backtick directive; outside it stays a colon fence", () => {
  const inside = expandGithubAlertsWithLines(":::{card}\n> [!NOTE]\n> a\n\nx\n:::\n");
  assert.deepEqual(inside.text.split("\n").slice(0, 5), [":::{card}", "````{note}", ":class: simple", "a", "````"]);
  const outside = expandGithubAlertsWithLines(":::{card}\nx\n:::\n\n> [!NOTE]\n> a\n");
  assert.equal(outside.text.split("\n")[4], ":::{note}");
  const closed = expandGithubAlertsWithLines(
    "::::{tab-set}\n:::{tab-item} A\nx\n:::\n::::\n\n:::::{grid} 1\n::::{grid-item}\ny\n::::\n:::::\n\n> [!NOTE]\n> a\n",
  );
  assert.ok(closed.text.split("\n").includes(":::{note}"), "an alert after closed containers is a colon fence");
});

// @tests_req SwRS-MDOKFSTUDIO-GFM-009
test("a four-backtick code block in an alert body inside a card does not end the alert", async () => {
  const source = [":::{card} T", "> [!NOTE]", "> ````md", "> code", "> ````", "", "after", ":::", "", "Outside.", ""].join("\n");
  const { html } = await renderMyst(source);
  const card = findElements(parseHtml(html), (element) => /card/u.test(attribute(element, "class") ?? ""))[0];
  assert.ok(card);
  assert.match(textContent(card), /code/u);
  assert.match(textContent(card), /after/u, "the paragraph after the alert stays in the card");
  assert.doesNotMatch(textContent(card), /Outside\./u);
  const blocks = mapped(html).filter((element) => ["aside", "p"].includes(element.tagName)).map(blockOf);
  assert.deepEqual(blocks, [["aside", 2, 5], ["p", 7, 7], ["p", 10, 10]]);
});
