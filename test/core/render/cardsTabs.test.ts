import * as assert from "node:assert/strict";
import { test } from "node:test";

import { renderPreviewDocument } from "../../../src/core/render/renderPipeline";
import { PREVIEW_THEME_CSS } from "../../../src/core/preview/previewStyles";
import { renderMyst } from "../../../src/core/render/mystRenderer";
import {
  attribute,
  findElement,
  findElements,
  hasClass,
  parseHtml,
  textContent,
} from "./dom";
import { inlineDocument, workspaceRoot } from "./mystFeaturesSupport";

async function render(source: string) {
  const result = await renderMyst(source, { sourcePath: "/virtual/main.md", resolveInclude: () => undefined });
  return { ...result, dom: parseHtml(result.html) };
}

/** The full preview pipeline, sanitizer included. */
async function renderSafe(source: string) {
  const result = await renderPreviewDocument({
    document: inlineDocument(source),
    workspaceRoot,
    requestId: 1,
    isWorkspaceTrusted: () => true,
  });
  return { ...result, dom: parseHtml(result.html) };
}

const CARD = [
  ":::{card} Claude Code",
  ":header: Since v2.1.154, published 2026-05-28",
  ":footer: Documented in the **workflows** guide",
  "",
  "- Saved in `.claude/workflows/`.",
  "- Runs in the CLI.",
  ":::",
].join("\n");

const part = (card: Parameters<typeof findElement>[0], name: string) =>
  findElement(card, (element) => hasClass(element, name));

// @tests_req SwRS-MDOKFSTUDIO-MYST-100
test("a standalone card shows its header option above the title, then the body and the footer", async () => {
  const { dom, diagnostics, html } = await render(CARD);
  const card = findElement(dom, (element) => hasClass(element, "myst-card"));
  assert.ok(card, "the {card} directive was not rendered as a card");
  assert.equal(textContent(part(card, "myst-grid-card-header")!).trim(), "Since v2.1.154, published 2026-05-28");
  assert.equal(textContent(part(card, "myst-grid-card-title")!).trim(), "Claude Code");
  assert.equal(findElements(part(card, "myst-grid-card-body")!, (element) => element.tagName === "li").length, 2);
  assert.ok(findElement(part(card, "myst-grid-card-footer")!, (element) => element.tagName === "strong"),
    "the footer option is parsed as inline Markdown");
  const order = [...html.matchAll(/myst-grid-card-(header|title|body|footer)"/gu)].map((match) => match[1]);
  assert.deepEqual(order, ["header", "title", "body", "footer"]);
  assert.match(html, /class="myst-card[^"]*"[^>]*data-line="1"/u);
  assert.doesNotMatch(html, /<p data-line="1">/u, "the option lines are not mapped paragraphs");
  assert.equal(diagnostics.length, 0);
});

// @tests_req SwRS-MDOKFSTUDIO-MYST-100
test("a standalone card splits header and footer at ^^^ and +++, and links its title", async () => {
  const { dom } = await render([
    ":::{card} Linked",
    ":link: https://example.com/guide",
    ":link-alt: Open the guide",
    "Header block",
    "^^^",
    "Body block",
    "+++",
    "Footer block",
    ":::",
  ].join("\n"));
  const card = findElement(dom, (element) => hasClass(element, "myst-card"))!;
  assert.equal(textContent(part(card, "myst-grid-card-header")!).trim(), "Header block");
  assert.equal(textContent(part(card, "myst-grid-card-body")!).trim(), "Body block");
  assert.equal(textContent(part(card, "myst-grid-card-footer")!).trim(), "Footer block");
  const link = findElement(card, (element) => element.tagName === "a")!;
  assert.equal(attribute(link, "href"), "https://example.com/guide");
  assert.equal(attribute(link, "title"), "Open the guide");
});

// @tests_req SwRS-MDOKFSTUDIO-MYST-100
test("a card without header or footer shows the title and body only", async () => {
  const { dom } = await render(":::{card} Plain\nOnly body.\n:::\n");
  const card = findElement(dom, (element) => hasClass(element, "myst-card"))!;
  assert.equal(part(card, "myst-grid-card-header"), undefined);
  assert.equal(part(card, "myst-grid-card-footer"), undefined);
  assert.match(textContent(card), /Plain[\s\S]*Only body\./u);
});

// @tests_req SwRS-MDOKFSTUDIO-MYST-100
test("class-card adds safe class names only, on a standalone card and on a grid card", async () => {
  const standalone = await renderSafe(":::{card} Styled\n:class-card: wide my-card okf-comment sphinx-x bad\"name\nBody.\n:::\n");
  const card = findElement(standalone.dom, (element) => hasClass(element, "myst-card"))!;
  assert.ok(hasClass(card, "wide") && hasClass(card, "my-card"));
  assert.ok(!hasClass(card, "okf-comment") && !hasClass(card, "sphinx-x"));
  assert.doesNotMatch(standalone.html, /bad"name|onclick/u);
  const grid = await render(":::{grid} 1\n\n:::{grid-item-card} In grid\n:class-card: tall\nBody.\n:::\n\n:::\n");
  assert.ok(hasClass(findElement(grid.dom, (element) => hasClass(element, "myst-grid-card"))!, "tall"));
});

// @tests_req SwRS-MDOKFSTUDIO-MYST-100
test("a card nests inside a grid item and holds a code block", async () => {
  const { dom } = await render([
    "::::{grid} 1",
    "",
    ":::{grid-item}",
    "::::{card} Nested",
    "```python",
    "print(1)",
    "```",
    "::::",
    ":::",
    "",
    "::::",
  ].join("\n"));
  const card = findElement(dom, (element) => hasClass(element, "myst-card"));
  assert.ok(card, "the card inside the grid item was not rendered");
  assert.ok(findElement(card, (element) => element.tagName === "pre"));
});

const TABS = [
  "::::{tab-set}",
  ":::{tab-item} Python",
  ":sync: py",
  "Use `pip`.",
  ":::",
  ":::{tab-item} Node",
  ":sync: node",
  ":selected:",
  "Use `npm`.",
  ":::",
  ":::{tab-item} Shell",
  "Use `brew`.",
  ":::",
  "::::",
].join("\n");

// @tests_req SwRS-MDOKFSTUDIO-MYST-098
test("a tab set renders a tablist of buttons wired to panels with ARIA roles", async () => {
  const { dom, diagnostics } = await render(TABS);
  const set = findElement(dom, (element) => hasClass(element, "myst-tab-set"))!;
  assert.ok(set, "no tab set");
  const list = findElement(set, (element) => attribute(element, "role") === "tablist")!;
  assert.ok(list, "no tablist");
  const tabs = findElements(list, (element) => attribute(element, "role") === "tab");
  assert.deepEqual(tabs.map((tab) => textContent(tab).trim()), ["Python", "Node", "Shell"]);
  const panels = findElements(set, (element) => attribute(element, "role") === "tabpanel");
  assert.equal(panels.length, 3);
  tabs.forEach((tab, index) => {
    assert.equal(tab.tagName, "button");
    assert.equal(attribute(tab, "type"), "button");
    assert.ok(attribute(tab, "id"));
    assert.equal(attribute(tab, "aria-controls"), attribute(panels[index], "id"));
    assert.equal(attribute(panels[index], "aria-labelledby"), attribute(tab, "id"));
  });
  assert.equal(new Set(tabs.map((tab) => attribute(tab, "id"))).size, 3, "tab ids are unique");
  assert.equal(diagnostics.length, 0);
});

// @tests_req SwRS-MDOKFSTUDIO-MYST-098
test("the :selected: tab shows its panel and the others are hidden; the first tab is the default", async () => {
  const selected = (await render(TABS)).dom;
  const states = (dom: typeof selected) => {
    const tabs = findElements(dom, (element) => attribute(element, "role") === "tab");
    const panels = findElements(dom, (element) => attribute(element, "role") === "tabpanel");
    return {
      selected: tabs.map((tab) => attribute(tab, "aria-selected")),
      tabindex: tabs.map((tab) => attribute(tab, "tabindex")),
      hidden: panels.map((panel) => attribute(panel, "hidden") !== undefined),
    };
  };
  assert.deepEqual(states(selected), {
    selected: ["false", "true", "false"], tabindex: ["-1", "0", "-1"], hidden: [true, false, true],
  });
  const first = (await render(TABS.replace(":selected:\n", ""))).dom;
  assert.deepEqual(states(first), {
    selected: ["true", "false", "false"], tabindex: ["0", "-1", "-1"], hidden: [false, true, true],
  });
});

// @tests_req SwRS-MDOKFSTUDIO-MYST-098
test("tabs keep their sync key and the sync group of the set", async () => {
  const { dom } = await render(TABS.replace("::::{tab-set}", "::::{tab-set}\n:sync-group: language\n"));
  const tabs = findElements(dom, (element) => attribute(element, "role") === "tab");
  assert.deepEqual(tabs.map((tab) => attribute(tab, "data-myst-tab-sync")), ["py", "node", undefined]);
  const set = findElement(dom, (element) => hasClass(element, "myst-tab-set"))!;
  assert.equal(attribute(set, "data-myst-tab-group"), "language");
  const plain = (await render(TABS)).dom;
  assert.equal(attribute(findElement(plain, (element) => hasClass(element, "myst-tab-set"))!, "data-myst-tab-group"), "tab");
});

// @tests_req SwRS-MDOKFSTUDIO-MYST-098
test("each tab item and the tab set carry their own source lines for editing", async () => {
  const { dom } = await render(`Intro\n\n${TABS}\n`);
  const set = findElement(dom, (element) => hasClass(element, "myst-tab-set"))!;
  assert.equal(attribute(set, "data-line"), "3");
  assert.equal(attribute(set, "data-end-line"), "16");
  const panels = findElements(set, (element) => attribute(element, "role") === "tabpanel");
  assert.deepEqual(panels.map((panel) => [attribute(panel, "data-line"), attribute(panel, "data-end-line")]),
    [["4", "7"], ["8", "12"], ["13", "15"]]);
  assert.match(textContent(panels[1]), /Use npm\./u);
  // A click in a panel edits the whole tab item: nothing inside it is a mapped block of its own.
  for (const panel of panels) {
    assert.deepEqual(findElements(panel, (element) => element !== panel && attribute(element, "data-line") !== undefined), []);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-MYST-098
test("tab panels hold any block, a grid and a card among them, and tab sets nest", async () => {
  const { dom } = await render([
    "::::::{tab-set}",
    ":::::{tab-item} One",
    ":::{card} Inner card",
    "Card body.",
    ":::",
    "```text",
    "code",
    "```",
    ":::::",
    ":::::{tab-item} Two",
    "::::{tab-set}",
    ":::{tab-item} Deep",
    "Deeper.",
    ":::",
    "::::",
    ":::::",
    "::::::",
  ].join("\n"));
  assert.ok(findElement(dom, (element) => hasClass(element, "myst-card")));
  assert.ok(findElement(dom, (element) => element.tagName === "pre"));
  assert.equal(findElements(dom, (element) => hasClass(element, "myst-tab-set")).length, 2);
  assert.match(textContent(dom), /Deeper\./u);
});

function lineOf(element: Parameters<typeof attribute>[0]): [string | undefined, string | undefined] {
  return [attribute(element, "data-line"), attribute(element, "data-end-line")];
}

// @tests_req SwRS-MDOKFSTUDIO-MYST-098
// @tests_req SwRS-MDOKFSTUDIO-REVIEW-167
// @tests_req SwRS-MDOKFSTUDIO-REVIEW-133
test("a comment and a thread in a tab item keep their own source line range", async () => {
  const { dom } = await render([
    "::::{tab-set}",
    ":::{tab-item} One",
    "Text.",
    "",
    "<!-- review: inner -->",
    "",
    "<!-- THREAD",
    "Ana (2026-01-01 10:00):",
    "  first",
    "Bob (2026-01-02 10:00):",
    "  second",
    "-->",
    ":::",
    "::::",
  ].join("\n"));
  const comments = findElements(dom, (element) => hasClass(element, "okf-comment"));
  assert.deepEqual(comments.map(lineOf), [["5", "5"], ["7", "12"]]);
  assert.deepEqual(comments.map((comment) => attribute(comment, "data-okf-comment-kind")), ["comment", "thread"]);
  // The item itself is still one block, the paragraph beside the comments is not.
  const panel = findElement(dom, (element) => attribute(element, "role") === "tabpanel")!;
  assert.deepEqual(lineOf(panel), ["2", "13"]);
  assert.deepEqual(findElements(panel, (element) => element.tagName === "p").map(lineOf), [[undefined, undefined]]);
});

// @tests_req SwRS-MDOKFSTUDIO-MYST-098
test("a table, a code block, a card and a grid in a tab item are no blocks of their own", async () => {
  const { dom } = await render([
    "::::::{tab-set}",
    ":::::{tab-item} One",
    "| a | b |",
    "| - | - |",
    "| 1 | 2 |",
    "",
    "```text",
    "code",
    "```",
    "",
    ":::{card} Inner card",
    "Card body.",
    ":::",
    "",
    "::::{grid} 2",
    ":::{grid-item-card} A",
    "Body A.",
    ":::",
    "::::",
    ":::::",
    "::::::",
  ].join("\n"));
  const panel = findElement(dom, (element) => attribute(element, "role") === "tabpanel")!;
  assert.deepEqual(lineOf(panel), ["2", "20"]);
  assert.ok(findElement(panel, (element) => element.tagName === "table"));
  assert.ok(findElement(panel, (element) => element.tagName === "pre"));
  assert.ok(findElement(panel, (element) => hasClass(element, "myst-card")));
  assert.ok(findElement(panel, (element) => hasClass(element, "myst-grid")));
  assert.deepEqual(findElements(panel, (element) => element !== panel && attribute(element, "data-line") !== undefined), []);
});

// @tests_req SwRS-MDOKFSTUDIO-MYST-098
test("a nested tab set in a tab item is no block of its own, only the outer item is edited", async () => {
  const { dom } = await render([
    "::::::{tab-set}",
    ":::::{tab-item} Outer",
    "::::{tab-set}",
    ":::{tab-item} Deep",
    "Deeper.",
    ":::",
    "::::",
    ":::::",
    "::::::",
  ].join("\n"));
  const panels = findElements(dom, (element) => attribute(element, "role") === "tabpanel");
  assert.equal(panels.length, 2);
  assert.deepEqual(lineOf(panels[0]), ["2", "8"]);
  assert.deepEqual(findElements(panels[0], (element) => element !== panels[0] && attribute(element, "data-line") !== undefined), []);
});

// @tests_req SwRS-MDOKFSTUDIO-MYST-098
test("the sanitized preview keeps the tab roles, ids and hidden panels but no script or handler", async () => {
  const { dom, html } = await renderSafe(TABS.replace("Python", "Py<script>alert(1)</script>thon"));
  const tabs = findElements(dom, (element) => attribute(element, "role") === "tab");
  assert.equal(tabs.length, 3);
  assert.ok(tabs.every((tab) => attribute(tab, "aria-controls") && attribute(tab, "id")));
  assert.equal(findElements(dom, (element) => attribute(element, "role") === "tabpanel"
    && attribute(element, "hidden") !== undefined).length, 2);
  assert.doesNotMatch(html, /<script|onclick|javascript:/iu);
});

// @tests_req SwRS-MDOKFSTUDIO-MYST-098
test("tab item titles stay plain text inside the tab button", async () => {
  const { dom } = await render(TABS.replace("Python", "**Py** [link](https://example.com)"));
  const tab = findElements(dom, (element) => attribute(element, "role") === "tab")[0];
  assert.equal(textContent(tab).trim(), "Py link");
  assert.equal(findElement(tab, (element) => element.tagName === "a"), undefined);
});

// @tests_req SwRS-MDOKFSTUDIO-MYST-001
test("a version admonition is titled with its version and no trailing colon", async () => {
  const { dom } = await render([
    ":::{versionadded} 0.47",
    "Added support for `.include` keyword.",
    ":::",
    "",
    ":::{versionchanged} 0.50",
    "Changed.",
    ":::",
    "",
    ":::{deprecated} 1.0",
    "Deprecated.",
    ":::",
  ].join("\n"));
  const titles = findElements(dom, (element) => hasClass(element, "admonition-title")).map((title) => textContent(title));
  assert.deepEqual(titles, ["Added in version 0.47", "Changed in version 0.50", "Deprecated since version 1.0"]);
});

// @tests_req SwRS-MDOKFSTUDIO-MYST-100
test("the stylesheet gives a standalone card the grid card look and its own spacing", () => {
  assert.match(PREVIEW_THEME_CSS, /\.myst-card\s*\{[^}]*margin:/u);
  assert.match(PREVIEW_THEME_CSS, /\.myst-grid-card\s*\{[^}]*border:/u);
});

// @tests_req SwRS-MDOKFSTUDIO-MYST-098
test("the stylesheet lays the tab bar out in a row and removes a hidden panel", () => {
  assert.match(PREVIEW_THEME_CSS, /\.myst-tab-list\s*\{[^}]*display:\s*flex/u);
  assert.match(PREVIEW_THEME_CSS, /\.myst-tab\[aria-selected="true"\]\s*\{/u);
  assert.match(PREVIEW_THEME_CSS, /\.myst-tab-panel\[hidden\]\s*\{[^}]*display:\s*none/u);
  assert.match(PREVIEW_THEME_CSS, /\.myst-tab:focus-visible\s*\{[^}]*outline:/u);
});
