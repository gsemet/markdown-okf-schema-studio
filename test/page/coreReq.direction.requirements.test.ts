/**
 * Requirement test of the text direction in a real browser: a Hebrew paragraph without a dir
 * attribute written by the author ends at the right edge of the column, an English one starts at
 * the left edge. Skipped, with a message, when no Chromium can start here.
 */
import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";

import { chromium } from "playwright-core";

import { renderPreviewDocument } from "../../src/core/render/renderPipeline";
import { buildPreviewWebviewHtml } from "../../src/session/webview";
import { fakeAssetResolver } from "../shared/fakeAssets";
import { pageRuntimeScript } from "./runtimeHarness";

const MARKDOWN = "שלום עולם, זו פסקה בעברית.\n\nHello world, an English paragraph.\n";

// @tests_req SwRS-MDOKFSTUDIO-CORE-041
test("a Hebrew paragraph ends at the right edge of the column and an English one starts at the left", async (t) => {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "core-direction-")));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const workspace = path.join(root, "workspace");
  fs.mkdirSync(workspace, { recursive: true });
  const documentPath = path.join(workspace, "direction.md");
  fs.writeFileSync(documentPath, MARKDOWN);
  fs.mkdirSync(path.join(root, "out", "bundle"), { recursive: true });
  fs.writeFileSync(path.join(root, "out", "bundle", "preview.js"), pageRuntimeScript());
  const rendered = await renderPreviewDocument({
    document: { uri: { scheme: "file", fsPath: documentPath }, languageId: "markdown", version: 1, getText: () => MARKDOWN },
    workspaceRoot: workspace, requestId: 1, isWorkspaceTrusted: () => true,
  });
  const assets = fakeAssetResolver({ cspSource: "file:", url: (filePath) => pathToFileURL(filePath).href, extensionRoot: root });
  const bundle = { ...assets, bundleUri: (...segments: string[]) => (segments[0] === "preview.js" ? assets.bundleUri(...segments) : undefined) };
  const context = {
    activeSourceFile: documentPath, documentId: pathToFileURL(documentPath).toString(), revision: 1, requestId: 1,
    previewThemeMode: "current" as const,
    initialViewPreferences: { zoom: 100, widthMode: "auto" as const, toc: false, incomingChanges: true, comments: true, toolbarCollapsed: true },
  };
  const built = buildPreviewWebviewHtml(rendered.html, workspace, bundle, context, workspace, undefined, 844, true, [], "builtin");
  const pagePath = path.join(root, "page.html");
  fs.writeFileSync(pagePath, built.html);
  let browser;
  try {
    browser = await chromium.launch();
  } catch {
    t.skip("no Chromium can start here (run `just dev` to install it)");
    return;
  }
  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
    await page.addInitScript(() => {
      (window as unknown as { acquireVsCodeApi: () => unknown }).acquireVsCodeApi = () => ({ getState: () => ({}), setState: () => undefined, postMessage: () => undefined });
    });
    await page.goto(pathToFileURL(pagePath).href);
    const edges = await page.evaluate(() => [...document.querySelectorAll("#sphinx-myst-preview-content p")].map((paragraph) => {
      const range = document.createRange();
      range.selectNodeContents(paragraph);
      const text = range.getBoundingClientRect();
      const box = paragraph.getBoundingClientRect();
      const style = getComputedStyle(paragraph);
      return {
        dir: paragraph.getAttribute("dir"),
        direction: style.direction,
        leftGap: text.left - box.left - parseFloat(style.paddingLeft),
        rightGap: box.right - parseFloat(style.paddingRight) - text.right,
      };
    }));
    assert.equal(edges.length, 2);
    const [hebrew, english] = edges as [typeof edges[number], typeof edges[number]];
    assert.equal(hebrew.dir, "auto", "the sanitizer gives the paragraph dir auto");
    assert.equal(hebrew.direction, "rtl");
    assert.ok(Math.abs(hebrew.rightGap) < 1, `the Hebrew text ends at the right edge (gap ${hebrew.rightGap})`);
    assert.ok(hebrew.leftGap > 50, "the Hebrew text does not start at the left edge");
    assert.equal(english.direction, "ltr");
    assert.ok(Math.abs(english.leftGap) < 1, `the English text starts at the left edge (gap ${english.leftGap})`);
    assert.ok(english.rightGap > 50, "the English text does not reach the right edge");
  } finally {
    await browser.close();
  }
});
