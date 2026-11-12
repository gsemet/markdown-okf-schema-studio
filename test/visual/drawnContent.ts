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
