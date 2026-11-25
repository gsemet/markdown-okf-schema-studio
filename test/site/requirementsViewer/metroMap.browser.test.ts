/**
 * Requirement test of the use case map in a real browser: on the six frozen use cases (`metroShapes.ts`), on the
 * full-ID fixture and on every use case of the requirements report, at 1280 px and at 800 px, no text overlaps another
 * text or a pill, a text stays inside the SVG and a pill holds its two lines, the SVG is never wider than its natural
 * width nor narrower than 85 % of it, and the box of the map scrolls sideways when the page is narrower than the map.
 * Each text is widened by 5 % on each side before it is compared, so a reader's slightly wider font still fits; the
 * tolerance is never loosened, the estimates of `layout.ts` are widened instead.
 *
 * The pages are the real viewer pages (`writeViewerPages`), drawn in the pinned KaTeX fonts (`pinSiteFonts`), so the
 * measures are the same on every machine. The frozen maps are captured at both widths in
 * `out/reports/requirements-viewer-graph/` for the owner's review. Skipped, with a message, when no Chromium can
 * start, unless STUDIO_REQUIRE_CHROMIUM=1; the report test is skipped when `just requirements-report` has not run,
 * unless STUDIO_REQUIRE_REQUIREMENTS_REPORT=1.
 */
import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";

import { chromium, type Browser, type Page } from "playwright-core";

import { pinSiteFonts } from "../../page/pinnedFont";
import { fullIdReport } from "./fixture";
import { FROZEN_USE_CASES, frozenReport } from "./metroShapes";
import { REQUIREMENTS_REPORT_PATH } from "./model";
import { viewerPages, writeViewerPages } from "./write";

const ROOT = path.resolve(__dirname, "..", "..", "..", "..");
const CAPTURES = path.join(ROOT, "out", "reports", "requirements-viewer-graph");
const WIDTHS = [1280, 800] as const;
const SCROLLS_BELOW = 0.85;

/** The checks of one page at the width of its window, run in the page. */
function measure(minRatio: number): { problems: string[]; natural: number } {
  const svg = document.querySelector("svg.metro");
  if (!svg) return { problems: ["no map on the page"], natural: 0 };
  const frame = svg.getBoundingClientRect();
  const natural = Number(svg.getAttribute("width"));
  const problems: string[] = [];
  if (frame.width > natural + 0.5) problems.push(`the map is ${frame.width.toFixed(1)} px wide, over its natural ${natural} px`);
  if (frame.width < natural * minRatio - 0.5) problems.push(`the map is ${frame.width.toFixed(1)} px wide, under ${minRatio * 100} % of its natural ${natural} px`);
  const widen = (rect: DOMRect): { left: number; right: number; top: number; bottom: number } => ({
    left: rect.left - rect.width * 0.05, right: rect.right + rect.width * 0.05, top: rect.top, bottom: rect.bottom,
  });
  const cross = (a: { left: number; right: number; top: number; bottom: number }, b: { left: number; right: number; top: number; bottom: number }): boolean =>
    Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5;
  const texts: Array<{ owner: Element; text: string; box: ReturnType<typeof widen>; plain: DOMRect }> = [];
  for (const element of svg.querySelectorAll("text")) {
    const parts = element.querySelectorAll("tspan:not(.code)");
    const targets = parts.length > 0 ? [...parts] : [element];
    for (const target of targets) {
      const plain = target.getBoundingClientRect();
      if (plain.width === 0) continue;
      texts.push({ owner: element, text: (target.textContent ?? "").trim(), box: widen(plain), plain });
    }
  }
  const pills = [...svg.querySelectorAll("rect.pill")].map((rect) => ({ rect, plain: rect.getBoundingClientRect() }));
  const circles = [...svg.querySelectorAll(".st")].map((state) => ({ state, plain: state.querySelector("circle")!.getBoundingClientRect() }));
  texts.forEach((one, index) => {
    if (one.box.left < frame.left - 0.5 || one.box.right > frame.right + 0.5) problems.push(`"${one.text}" runs past the map`);
    for (const other of texts.slice(index + 1)) {
      if (one.owner !== other.owner && cross(one.box, other.box)) problems.push(`"${one.text}" overlaps "${other.text}"`);
    }
    for (const pill of pills) {
      const inside = one.plain.left >= pill.plain.left - 0.5 && one.plain.right <= pill.plain.right + 0.5 && one.plain.top >= pill.plain.top - 0.5 && one.plain.bottom <= pill.plain.bottom + 0.5;
      if (!inside && cross(one.box, pill.plain)) problems.push(`"${one.text}" overlaps a pill`);
      const mine = pill.rect.nextElementSibling === one.owner;
      if (mine && !inside) problems.push(`"${one.text}" does not fit its pill`);
    }
    for (const circle of circles) {
      if (!circle.state.contains(one.owner) && cross(one.box, circle.plain)) problems.push(`"${one.text}" overlaps a state circle`);
    }
  });
  pills.forEach((one, index) => {
    for (const other of pills.slice(index + 1)) {
      if (cross(one.plain, other.plain)) problems.push("a pill overlaps another pill");
    }
  });
  return { problems, natural };
}

interface Opened {
  readonly browser: Browser;
  readonly page: Page;
}

let launchError: unknown;

/** No Chromium can start: skips the test, or fails it with the launch error when STUDIO_REQUIRE_CHROMIUM=1. */
function chromiumUnavailable(t: { skip(message: string): void }): void {
  if (process.env.STUDIO_REQUIRE_CHROMIUM === "1") {
    throw new Error(`Chromium is required (STUDIO_REQUIRE_CHROMIUM=1) and cannot start: ${launchError instanceof Error ? launchError.message : String(launchError)}`);
  }
  t.skip("no Chromium can start here (run `just dev` to install it)");
}

async function open(): Promise<Opened | undefined> {
  try {
    const browser = await chromium.launch();
    return { browser, page: await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 }) };
  } catch (error) {
    launchError = error;
    return undefined;
  }
}

/** Writes the viewer for a report and returns the folder of the site and the use cases that have a map. */
function site(reportJson: string): { siteRoot: string; maps: Array<{ dir: string; id: string }> } {
  const siteRoot = fs.mkdtempSync(path.join(os.tmpdir(), "metro-map-"));
  const report = path.join(siteRoot, "requirements-report.json");
  fs.writeFileSync(report, reportJson);
  const model = writeViewerPages(siteRoot, report, ROOT);
  assert.ok(model, "the report loads");
  const maps = viewerPages(model, ROOT)
    .filter((spec) => spec.body.includes('<svg class="metro"'))
    .map((spec) => ({ dir: spec.dir, id: spec.dir.split("/").pop() ?? spec.dir }));
  return { siteRoot, maps };
}

/** Checks every map of a report at every width; `capture` also writes a picture of each. Returns the problems found. */
async function check(reportJson: string, capture: ReadonlySet<string>, diagnostic: (message: string) => void, mustScroll?: string): Promise<{ problems: string[]; maps: number } | undefined> {
  const { siteRoot, maps } = site(reportJson);
  const opened = await open();
  if (!opened) return undefined;
  const problems: string[] = [];
  try {
    if (capture.size > 0) fs.mkdirSync(CAPTURES, { recursive: true });
    for (const width of WIDTHS) {
      await opened.page.setViewportSize({ width, height: 900 });
      for (const map of maps) {
        await opened.page.goto(pathToFileURL(path.join(siteRoot, map.dir, "index.html")).href);
        await pinSiteFonts(opened.page);
        const { problems: found, natural } = await opened.page.evaluate(measure, SCROLLS_BELOW);
        for (const problem of found) problems.push(`${map.id} at ${width} px: ${problem}`);
        const box = await opened.page.evaluate(() => {
          const frame = document.querySelector(".map") as HTMLElement | null;
          return frame ? { client: frame.clientWidth, scroll: frame.scrollWidth, overflow: getComputedStyle(frame).overflowX } : undefined;
        });
        if (box && natural * SCROLLS_BELOW > box.client + 1 && !(box.scroll > box.client && (box.overflow === "auto" || box.overflow === "scroll"))) {
          problems.push(`${map.id} at ${width} px: the map keeps 85 % of its width over its box and the box does not scroll`);
        }
        if (mustScroll && width === 800 && map.id === mustScroll && !(box && box.scroll > box.client)) {
          problems.push(`${map.id} at ${width} px: the map box does not scroll sideways (scrollWidth ${box?.scroll ?? "?"}, clientWidth ${box?.client ?? "?"})`);
        }
        diagnostic(`${map.id} at ${width} px: natural ${natural} px, box ${box?.client ?? "?"} px`);
        if (capture.has(map.id)) {
          await opened.page.locator(".map").screenshot({ path: path.join(CAPTURES, `${map.id}-${width}.png`) });
        }
      }
    }
  } finally {
    await opened.browser.close();
    fs.rmSync(siteRoot, { recursive: true, force: true });
  }
  return { problems, maps: maps.length };
}

test("the six frozen use cases draw their map without an overlap at 1280 px and at 800 px", async (t) => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-081#S1
  // @tests_req SwRS-MDOKFSTUDIO-CORE-081#S3
  const done = await check(frozenReport(), new Set(FROZEN_USE_CASES.map((useCase) => useCase.id)), (message) => t.diagnostic(message), "StRS-MDOKFSTUDIO-BLOCK-014");
  if (!done) return chromiumUnavailable(t);
  assert.equal(done.maps, FROZEN_USE_CASES.length, "every frozen use case has a map");
  assert.deepEqual(done.problems, []);
});

test("a use case with full IDs and shared paths draws its map without an overlap at both widths", async (t) => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-081#S1
  // @tests_req SwRS-MDOKFSTUDIO-CORE-081#S3
  const done = await check(fullIdReport(), new Set(), (message) => t.diagnostic(message));
  if (!done) return chromiumUnavailable(t);
  assert.ok(done.maps >= 2, "the fixture has two use cases with a map");
  assert.deepEqual(done.problems, []);
});

test("every use case of the requirements report draws its map without an overlap at both widths", async (t) => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-081#S1
  // @tests_req SwRS-MDOKFSTUDIO-CORE-081#S3
  const report = REQUIREMENTS_REPORT_PATH(ROOT);
  if (!fs.existsSync(report)) {
    if (process.env.STUDIO_REQUIRE_REQUIREMENTS_REPORT === "1") throw new Error(`the requirements report is required (STUDIO_REQUIRE_REQUIREMENTS_REPORT=1) and is missing: ${report} (run \`just requirements-report\`)`);
    t.skip("no requirements report here (run `just requirements-report`)");
    return;
  }
  const done = await check(fs.readFileSync(report, "utf8"), new Set(), (message) => t.diagnostic(message));
  if (!done) return chromiumUnavailable(t);
  assert.ok(done.maps > 0, "the report has use cases with a map");
  assert.deepEqual(done.problems, []);
});

test("Play path 2 on the frozen BLOCK-014 map lights its three steps and four states, and nothing with reduced motion", async (t) => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-091#S1
  // @tests_req SwRS-MDOKFSTUDIO-CORE-091#S2
  const { siteRoot, maps } = site(frozenReport());
  const target = maps.find((map) => map.id === "StRS-MDOKFSTUDIO-BLOCK-014");
  assert.ok(target, "the frozen BLOCK-014 has a map");
  let browser: Browser | undefined;
  try {
    try {
      browser = await chromium.launch();
    } catch (error) {
      launchError = error;
      return chromiumUnavailable(t);
    }
    const url = pathToFileURL(path.join(siteRoot, target.dir, "index.html")).href;
    for (const motion of ["no-preference", "reduce"] as const) {
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1, reducedMotion: motion });
      try {
        const page = await context.newPage();
        await page.goto(url);
        await pinSiteFonts(page);
        await page.getByRole("button", { name: "Play path 2" }).click();
        if (motion === "no-preference") {
          await page.waitForFunction(() => document.querySelectorAll("svg.metro .tr.on").length >= 3, undefined, { timeout: 15000 });
          assert.equal(await page.locator("svg.metro .tr.on").count(), 3, "path 2 lights its three steps");
          assert.equal(await page.locator("svg.metro .st.on").count(), 4, "path 2 lights its four states");
        } else {
          await page.waitForTimeout(500);
          assert.equal(await page.locator("svg.metro .tr.on").count(), 0, "reduced motion lights no step");
          assert.equal(await page.locator("svg.metro .st.on").count(), 0, "reduced motion lights no state");
        }
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser?.close();
    fs.rmSync(siteRoot, { recursive: true, force: true });
  }
});
