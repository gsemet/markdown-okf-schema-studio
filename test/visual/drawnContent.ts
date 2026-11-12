/**
 * The content of a static campaign page after the page scripts drew its Mermaid diagrams, as the
 * webview holds it when the user clicks Export (CR 299): the same page script draws, in headless
 * Chromium, and the content is read once every diagram settled. The export itself is still built
 * by `buildHtmlExport` from this content.
 */
import { pathToFileURL } from "node:url";

import { chromium } from "playwright-core";

const SETTLE_TIMEOUT_MS = 30_000;

/** The `outerHTML` of the content element of the page file, once no Mermaid diagram is drawing. */
export async function drawnContentHtml(pageFile: string): Promise<string> {
  const browser = await chromium.launch({ headless: true, args: ["--allow-file-access-from-files"] });
  try {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(pageFile).toString());
    await page.waitForFunction(
      () => Array.from(document.querySelectorAll(".myst-mermaid-diagram"))
        .every((diagram) => ["rendered", "error", "unavailable"].includes(diagram.getAttribute("data-render-state") ?? "")),
      undefined,
      { timeout: SETTLE_TIMEOUT_MS },
    );
    const html = await page.evaluate(() => document.getElementById("sphinx-myst-preview-content")?.outerHTML);
    if (html === undefined) throw new Error(`no content in ${pageFile}`);
    if (/data-render-state="(error|unavailable)"/u.test(html)) throw new Error(`a Mermaid diagram of ${pageFile} did not draw`);
    return html;
  } finally {
    await browser.close();
  }
}

/**
 * The content of a static campaign page with the editor of a table cell open, as the webview holds it
 * when the user clicks Export while editing (CR 310): the page script turns edit mode on and opens the
 * editor of the cell holding `cellText`, in headless Chromium, and the content is read with the editor
 * still open.
 */
export async function contentWithCellEditorOpenHtml(pageFile: string, cellText: string): Promise<string> {
  const browser = await chromium.launch({ headless: true, args: ["--allow-file-access-from-files"] });
  try {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(pageFile).toString());
    await page.locator("[data-sphinx-preview-edit-toggle]").click();
    await page.locator("#sphinx-myst-preview-content td", { hasText: cellText }).click();
    await page.waitForSelector('[data-sphinx-preview-table-cell-editor="true"] textarea', { timeout: SETTLE_TIMEOUT_MS });
    const html = await page.evaluate(() => document.getElementById("sphinx-myst-preview-content")?.outerHTML);
    if (html === undefined) throw new Error(`no content in ${pageFile}`);
    if (!html.includes("data-sphinx-table-cell-content")) throw new Error(`the cell editor of ${pageFile} hides no cell content`);
    return html;
  } finally {
    await browser.close();
  }
}
