/**
 * Requirement test of the full IDs in a real browser: on the use case and behaviour pages written by
 * `writeViewerPages` from the frozen real use cases and from the full-ID fixture, at 1280, 800 and 390 px, the
 * breadcrumb, the eyebrow and the pager stay inside the page: no horizontal scroll of the page, and no one of them
 * past the right edge of `main` or of the header. Skipped, with a message, when no Chromium can start, unless
 * STUDIO_REQUIRE_CHROMIUM=1.
 */
import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";

import { chromium } from "playwright-core";

import { pinSiteFonts } from "../../page/pinnedFont";
import { fullIdReport } from "./fixture";
import { frozenReport } from "./metroShapes";
import { viewerPages, writeViewerPages } from "./write";

const ROOT = path.resolve(__dirname, "..", "..", "..", "..");
const WIDTHS = [1280, 800, 390] as const;

/** The checks of one page at the width of its window, run in the page. */
function measure(): string[] {
  const problems: string[] = [];
  const doc = document.documentElement;
  if (doc.scrollWidth > doc.clientWidth + 0.5) problems.push(`the page scrolls sideways (${doc.scrollWidth} px in ${doc.clientWidth} px)`);
  const main = document.querySelector("main");
  const header = document.querySelector("header");
  const inner = (box: Element | null): number => {
    if (!box) return window.innerWidth;
    const rect = box.getBoundingClientRect();
    const style = getComputedStyle(box);
    return rect.right - Number.parseFloat(style.paddingRight);
  };
  for (const [name, selector, box] of [["breadcrumb", ".crumbs", header], ["eyebrow", ".eyebrow", main], ["pager", ".pager", main]] as const) {
    const part = document.querySelector(selector);
    if (!part) continue;
    const edge = Math.min(inner(box), window.innerWidth);
    for (const element of [part, ...part.querySelectorAll("*")]) {
      const rect = element.getBoundingClientRect();
      if (rect.width > 0 && rect.right > edge + 0.5) problems.push(`${name}: <${element.tagName.toLowerCase()}> "${(element.textContent ?? "").trim().slice(0, 40)}" ends at ${rect.right.toFixed(1)} px, past ${edge.toFixed(1)} px`);
    }
  }
  return problems;
}

async function check(reportJson: string, diagnostic: (message: string) => void): Promise<{ problems: string[]; pages: number } | Error> {
  const siteRoot = fs.mkdtempSync(path.join(os.tmpdir(), "id-layout-"));
  try {
    const report = path.join(siteRoot, "requirements-report.json");
    fs.writeFileSync(report, reportJson);
    const model = writeViewerPages(siteRoot, report, ROOT);
    assert.ok(model, "the report loads");
    const pages = viewerPages(model, ROOT).filter((spec) => spec.level === "use-case" || spec.level === "behaviour");
    let browser;
    try {
      browser = await chromium.launch();
    } catch (error) {
      return error instanceof Error ? error : new Error(String(error));
    }
    const problems: string[] = [];
    try {
      const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 900 });
        for (const spec of pages) {
          await page.goto(pathToFileURL(path.join(siteRoot, spec.dir, "index.html")).href);
          await pinSiteFonts(page);
          for (const problem of await page.evaluate(measure)) problems.push(`${spec.dir.split("/").pop()} at ${width} px: ${problem}`);
        }
        diagnostic(`${pages.length} pages at ${width} px`);
      }
    } finally {
      await browser.close();
    }
    return { problems, pages: pages.length };
  } finally {
    fs.rmSync(siteRoot, { recursive: true, force: true });
  }
}

for (const [name, report] of [["the frozen use cases", frozenReport], ["the full-ID fixture", fullIdReport]] as const) {
  test(`the breadcrumb, the eyebrow and the pager of ${name} stay inside the page at 1280, 800 and 390 px`, async (t) => {
    // @tests_req SwRS-MDOKFSTUDIO-CORE-093#S1
    // @tests_req SwRS-MDOKFSTUDIO-CORE-093#S2
    const done = await check(report(), (message) => t.diagnostic(message));
    if (done instanceof Error) {
      if (process.env.STUDIO_REQUIRE_CHROMIUM === "1") throw new Error(`Chromium is required (STUDIO_REQUIRE_CHROMIUM=1) and cannot start: ${done.message}`);
      return t.skip("no Chromium can start here (run `just dev` to install it)");
    }
    assert.ok(done.pages >= 2, "the report has use case and behaviour pages");
    assert.deepEqual(done.problems, []);
  });
}
