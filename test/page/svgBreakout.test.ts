/**
 * Requirement test of the Auto width rule for an SVG picture (an `svg` fence) in a real browser: a
 * picture that declares a width larger than the column breaks out like an image, a smaller one
 * stays in the column and one sized in % never breaks out. Skipped, with a message, when no
 * Chromium can start here.
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

const COLUMN = 688;
const GUTTER = 78;
const picture = (width: string): string => `\`\`\`svg\n<svg viewBox="0 0 900 100" width="${width}"><rect width="900" height="100" fill="var(--surface)"/></svg>\n\`\`\`\n`;
const MARKDOWN = `${picture("900")}\n${picture("300")}\n${picture("90%")}`;

// @tests_req SwRS-MDOKFSTUDIO-DIAG-125
test("Auto breaks an svg picture out when its declared width is larger than the column", async (t) => {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "svg-breakout-")));
  const workspace = path.join(root, "workspace");
  fs.mkdirSync(workspace, { recursive: true });
  const documentPath = path.join(workspace, "pictures.md");
  fs.writeFileSync(documentPath, MARKDOWN);
  fs.mkdirSync(path.join(root, "out", "bundle"), { recursive: true });
  fs.writeFileSync(path.join(root, "out", "bundle", "preview.js"), pageRuntimeScript());
  const rendered = await renderPreviewDocument({
    document: { uri: { scheme: "file", fsPath: documentPath }, languageId: "markdown", version: 1, getText: () => MARKDOWN },
    workspaceRoot: workspace, requestId: 1, isWorkspaceTrusted: () => true, plantUmlEngine: "builtin",
  });
  const assets = fakeAssetResolver({ cspSource: "file:", url: (filePath) => pathToFileURL(filePath).href, extensionRoot: root });
  const bundle = { ...assets, bundleUri: (...segments: string[]) => (segments[0] === "preview.js" ? assets.bundleUri(...segments) : undefined) };
  const context = {
    activeSourceFile: documentPath, documentId: pathToFileURL(documentPath).toString(), revision: 1, requestId: 1,
    previewThemeMode: "current" as const,
    initialViewPreferences: { zoom: 100, widthMode: "auto" as const, toc: false, incomingChanges: true, comments: true, toolbarCollapsed: true },
  };
  const built = buildPreviewWebviewHtml(rendered.html, workspace, bundle, context, workspace, undefined, COLUMN + GUTTER * 2, true, [], "builtin");
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
    const page = await browser.newPage({ viewport: { width: 1100, height: 1400 } });
    await page.addInitScript(() => {
      (window as unknown as { acquireVsCodeApi: () => unknown }).acquireVsCodeApi = () => ({ getState: () => ({}), setState: () => undefined, postMessage: () => undefined });
    });
    await page.goto(pathToFileURL(pagePath).href);
    await page.waitForFunction(() => document.documentElement.getAttribute("data-sphinx-preview-width") === "auto");
    await page.evaluate(async () => {
      window.dispatchEvent(new Event("resize"));
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    });
    const breakouts = await page.evaluate(() => [...document.querySelectorAll("figure.myst-svg-figure")]
      .map((figure) => ({ breakout: (figure as HTMLElement).style.getPropertyValue("--sphinx-preview-breakout"), width: figure.getBoundingClientRect().width })));
    assert.equal(breakouts.length, 3);
    assert.notEqual(breakouts[0]!.breakout, "", "a 900 px picture breaks out of a 688 px column");
    assert.ok(breakouts[0]!.width > COLUMN + 1);
    assert.equal(breakouts[1]!.breakout, "", "a 300 px picture stays in the column");
    assert.equal(breakouts[2]!.breakout, "", "a picture sized in % never breaks out");
  } finally {
    await browser.close();
  }
});
