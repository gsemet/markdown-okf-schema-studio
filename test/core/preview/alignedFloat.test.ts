/**
 * Requirement tests of the aligned-float attribute of the content root: the host writes it in the
 * page it renders and in the exported file, it is not part of what makes a page another one, and no
 * style rule tests the content root with `:has()`. The layout it drives is measured in Chromium in
 * `test/page/alignedFloatLayout.test.ts`.
 */
import * as assert from "node:assert/strict";
import * as path from "node:path";
import { test } from "node:test";

import { buildHtmlExport } from "../../../src/core/export/htmlExport";
import { canPatch, extractMainContent, planContentPatch, shellKey } from "../../../src/core/preview/contentPatch";
import { PREVIEW_THEME_CSS } from "../../../src/core/preview/previewStyles";
import { renderPreviewDocument } from "../../../src/core/render/renderPipeline";
import { createNodeFileSystem } from "../../../src/node-services/nodeFileSystem";
import { buildPreviewWebviewHtml, setPreviewStatus } from "../../../src/session/webview";
import { fakeAssetResolver } from "../../shared/fakeAssets";

const workspaceRoot = path.resolve(__dirname, "../../../..");
const fixtureDirectory = path.join(workspaceRoot, "tests", "fixtures", "sphinx-features");
const assets = fakeAssetResolver({
  cspSource: "vscode-webview://csp",
  url: (filePath) => "file://vscode-webview://resource" + filePath,
  extensionRoot: workspaceRoot,
});

async function page(markdown: string): Promise<string> {
  const result = await renderPreviewDocument({
    files: createNodeFileSystem(),
    document: {
      uri: { scheme: "file", fsPath: path.join(fixtureDirectory, "inline.md") },
      languageId: "markdown",
      version: 1,
      getText: () => markdown,
    },
    workspaceRoot,
    requestId: 1,
    isWorkspaceTrusted: () => true,
  });
  const built = await buildPreviewWebviewHtml(createNodeFileSystem(), result.html, result.stage.outputDirectory, assets, {
    documentId: result.stage.activeDocumentIdentity,
    revision: 1,
    requestId: 1,
    activeSourceFile: result.stage.activeDocumentPath,
  }, workspaceRoot, undefined, 960);
  return setPreviewStatus(built.html, "success", undefined, []);
}

/** The start tag of the content root of a page or file. */
function rootTag(html: string): string {
  const tag = /<main id="sphinx-myst-preview-content"[^>]*>/u.exec(html)?.[0];
  assert.ok(tag, "the page has a content root");
  return tag;
}

const marked = (html: string): boolean => /\sdata-okf-aligned-float(?:=""|[\s>])/u.test(rootTag(html));

const RAW_TABLE = (align: string): string => `<table align="${align}"><tr><td>a</td></tr></table>\n`;

const FLOATS: ReadonlyArray<[string, string]> = [
  ["an image aligned right", "```{image} pic.png\n:align: right\n```\n"],
  ["a figure aligned left", "```{figure} pic.png\n:align: left\n\nA caption.\n```\n"],
  ["an HTML table with align=right", RAW_TABLE("right")],
  ["an HTML table with align=LEFT", RAW_TABLE("LEFT")],
  ["an image inside a list item inside an admonition", "````{note}\n- item\n\n  ```{image} pic.png\n  :align: left\n  ```\n````\n"],
];

const NO_FLOATS: ReadonlyArray<[string, string]> = [
  ["text only", "Some text.\n"],
  ["an image and a figure aligned center", "```{image} pic.png\n:align: center\n```\n\n```{figure} pic.png\n:align: center\n\nA caption.\n```\n"],
  ["an HTML table with align=center", RAW_TABLE("center")],
  ["a paragraph and a div with align=right", "<p align=\"right\">text</p>\n\n<div align=\"right\">text</div>\n"],
  ["the class name written as text", "`align-right` and align-left in a sentence.\n"],
];

// @tests_req SwRS-MDOKFSTUDIO-LAYOUT-043#S8
test("the rendered page marks its content root exactly when it holds an aligned image, figure or table", async () => {
  for (const [name, markdown] of FLOATS) {
    assert.equal(marked(await page(`# Title\n\n${markdown}\nAfter.\n`)), true, name);
  }
  for (const [name, markdown] of NO_FLOATS) {
    assert.equal(marked(await page(`# Title\n\n${markdown}\nAfter.\n`)), false, name);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-LAYOUT-043#S7
test("a first or last aligned float keeps the page patchable: the mark is not part of the shell", async () => {
  const without = await page("# Title\n\nText.\n");
  const withFloat = await page(`# Title\n\n${RAW_TABLE("right")}\nText.\n`);
  assert.equal(marked(without), false);
  assert.equal(marked(withFloat), true);
  assert.equal(shellKey(withFloat), shellKey(without));
  for (const [current, next] of [[without, withFloat], [withFloat, without]] as const) {
    assert.equal(canPatch(current, next), true);
    assert.equal(planContentPatch(current, next)?.contentHtml, extractMainContent(next)?.inner);
  }
});

// @tests_req SwRS-MDOKFSTUDIO-LAYOUT-043#S8
test("the exported file marks its content root for the content it keeps", () => {
  const exported = (content: string, rootAttribute = ""): string => buildHtmlExport({
    contentHtml: `<main id="sphinx-myst-preview-content"${rootAttribute}>${content}</main>`,
    rootAttributes: {},
    tokens: {},
    mathStyles: "",
    shownTabs: [],
  }, { stem: "notes", maxContentWidth: 900, imageData: () => undefined }).html;

  assert.equal(marked(exported("<p>text</p>")), false);
  assert.equal(marked(exported('<img class="align-right" src="data:image/png;base64,AAAA"><p>text</p>')), true);
  assert.equal(marked(exported('<ul><li><table align="left"><tbody><tr><td>a</td></tr></tbody></table></li></ul>')), true);
  assert.equal(marked(exported("<p>text</p>", ' data-okf-aligned-float=""')), false, "a mark left over goes");
  const inEditor = '<div data-sphinx-preview-block-editor=""><img class="align-left" src="data:image/png;base64,AAAA"></div>';
  assert.equal(marked(exported(`${inEditor}<p>text</p>`, ' data-okf-aligned-float=""')), false,
    "the only aligned float left with the editor that held it");
});

// @tests_req SwRS-MDOKFSTUDIO-LAYOUT-043#S7
test("no style rule of the preview or of the exported file tests the content root with :has()", () => {
  const exported = buildHtmlExport({
    contentHtml: '<main id="sphinx-myst-preview-content"><p>text</p></main>',
    rootAttributes: {}, tokens: {}, mathStyles: "", shownTabs: [],
  }, { stem: "notes", maxContentWidth: 900, imageData: () => undefined }).html;
  const exportedCss = [...exported.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gu)].map((match) => match[1]!).join("\n");
  for (const sheet of [PREVIEW_THEME_CSS, exportedCss]) {
    const css = sheet.replace(/\/\*[\s\S]*?\*\//gu, "");
    assert.match(css, /main#sphinx-myst-preview-content\[data-okf-aligned-float\]::before/u);
    assert.match(css, /main#sphinx-myst-preview-content:not\(\[data-okf-aligned-float\]\) > /u);
    assert.match(css, /main#sphinx-myst-preview-content\[data-okf-aligned-float\] > :is\(h1, h2, h3, h4, h5, h6\)/u);
    // No :has() in the compound selector that names the content root (before any combinator).
    assert.doesNotMatch(css, /#sphinx-myst-preview-content[^\s>+~,{]*:has\(/u);
  }
});
