/**
 * Requirement tests of the MyST scope that run on the renderer: the toctree limits, the extension
 * warnings against conf.py, includes and the reference roles. Each test asserts the behaviour of the
 * current code.
 */

import * as assert from "node:assert/strict";
import * as path from "node:path";
import { test } from "node:test";

import { renderMyst, type MystRenderContext } from "../../../src/core/render/mystRenderer";
import { renderPreviewDocument } from "../../../src/core/render/renderPipeline";
import { attribute, findElement, findElements, hasClass, parseHtml, textContent } from "./dom";
import { inlineDocument, isTag, workspaceRoot } from "./mystFeaturesSupport";

const root = "/virtual";

function context(files: Record<string, string>, extra: Partial<MystRenderContext> = {}): MystRenderContext {
  return {
    sourcePath: `${root}/main.md`,
    resolveInclude: (request, from) => {
      const target = path.posix.resolve(path.posix.dirname(from), request);
      const source = files[target];
      return source === undefined ? undefined : { path: target, source };
    },
    ...extra,
  };
}

function toctreeLabels(html: string): string[] {
  const nav = findElement(parseHtml(html), (element) => hasClass(element, "myst-toctree"));
  assert.ok(nav, "the toctree is rendered");
  return findElements(nav, (element) => element.tagName === "li").map((item) => textContent(item).trim());
}

function toctree(names: string[], options = ""): string {
  return `\`\`\`{toctree}\n${options}\n${names.join("\n")}\n\`\`\`\n`;
}

const numbered = (count: number): string[] => Array.from({ length: count }, (_, index) => `doc${index + 1}`);

// @tests_req SwRS-MDOKFSTUDIO-MYST-057
test("a toctree shows at most 500 entries and all of them when there are 500", async () => {
  const over = toctreeLabels((await renderMyst(toctree(numbered(501)), context({}))).html);
  assert.equal(over.length, 500);
  assert.equal(over[499], "doc500", "the 501st entry is the one left out");

  const exact = toctreeLabels((await renderMyst(toctree(numbered(500)), context({}))).html);
  assert.equal(exact.length, 500);
});

test("a toctree with :reversed: flips the entry order and keeps the written order otherwise", async () => {
  const names = ["alpha", "beta", "gamma"];
  assert.deepEqual(toctreeLabels((await renderMyst(toctree(names, ":reversed:"), context({}))).html), ["gamma", "beta", "alpha"]);
  assert.deepEqual(toctreeLabels((await renderMyst(toctree(names), context({}))).html), names);
});

const EXTENSION_SAMPLES = [
  ":::{note}\nhi\n:::",
  "value $x^2$ here",
  "\\begin{align}\na&=b\n\\end{align}",
  "Term\n: Definition",
  ":name: value\n:other: more",
  "- [ ] a\n- [x] b",
  "some ~~gone~~ text",
  "Hello {{ name }} there",
  "see [text]{.cls} here",
  '<img src="a.png" width="3">',
  '<div class="admonition note"><p>x</p></div>',
];

const warnings = (diagnostics: Array<{ code?: string }>): number =>
  diagnostics.filter((entry) => entry.code === "myst-extension").length;

// @tests_req SwRS-MDOKFSTUDIO-MYST-072
test("at most 10 extension warnings are kept and 10 or fewer are all kept", async () => {
  const enabled = new Set<string>();
  const render = (count: number) => renderMyst(
    ["Intro", ...EXTENSION_SAMPLES.slice(0, count)].join("\n\n") + "\n",
    context({}, { enabledMystExtensions: enabled }),
  );
  assert.equal(warnings((await render(11)).diagnostics), 10, "eleven missing extensions keep ten warnings");
  assert.equal(warnings((await render(10)).diagnostics), 10, "ten are all kept");
  assert.equal(warnings((await render(3)).diagnostics), 3, "fewer are all kept");
});

test("an included file is not checked against conf.py while the document's own text is", async () => {
  const files = { [`${root}/part.md`]: "Included ~~gone~~ text\n\n:::{note}\nInside\n:::\n" };
  const enabled = new Set<string>();
  const included = await renderMyst("Plain text.\n\n```{include} part.md\n```\n", context(files, { enabledMystExtensions: enabled }));
  assert.equal(warnings(included.diagnostics), 0, "no warning for the included text");
  assert.match(included.html, /Inside/u, "the included file is expanded");

  const own = await renderMyst("Own ~~gone~~ text\n", context(files, { enabledMystExtensions: enabled }));
  assert.equal(warnings(own.diagnostics), 1, "the same syntax in the document's own text warns");
});

// @tests_req SwRS-MDOKFSTUDIO-MYST-017
test("doc and download roles render as plain links and numref as an inert placeholder (Known issues)", async () => {
  const result = await renderPreviewDocument({
    document: inlineDocument(
      "See {doc}`other/page`, {doc}`Label <other/page>` and {download}`manifest <schema/m.json>`.\n\n"
      + "(fig-x)=\n## Figure heading\n\nRef {numref}`fig-x` and {numref}`Figure <fig-x>`.\n",
    ),
    workspaceRoot,
    requestId: 3,
    isWorkspaceTrusted: () => true,
  });
  const dom = parseHtml(result.html);
  const links = findElements(dom, (element) => element.tagName === "a" && attribute(element, "href") !== undefined
    && !hasClass(element, "okf-anchor")).map((link) => [attribute(link, "href"), textContent(link)]);
  assert.deepEqual(links, [
    ["other/page", ""], // Known issue: a role without a label gives an empty link
    ["other/page", "Label"],
    ["schema/m.json", "manifest"],
  ]);
  const placeholders = findElements(dom, (element) => element.tagName === "span"
    && hasClass(element, "reference") && hasClass(element, "role") && hasClass(element, "unhandled"));
  assert.equal(placeholders.length, 2, "each numref is an inert placeholder, never a numbered link");
  for (const placeholder of placeholders) {
    assert.equal(textContent(placeholder), "{numref}fig-x", "the role name and the written key, also with a title");
  }
});
