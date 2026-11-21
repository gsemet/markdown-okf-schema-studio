import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test, type TestContext } from "node:test";

import { chromium } from "playwright-core";

import { GROUPS } from "../../shared/e2eGroups";
import { SITE_URL, cardDocument, writeCardPictures } from "../socialCard";
import { categoryCardBody, viewerCards } from "./cards";
import { fixtureReport, requirement } from "./fixture";
import { parseRequirementsReport, type Area } from "./model";
import { viewerDocument, type PageSpec } from "./shell";
import { viewerPages } from "./write";

const FOOTER = { sha: "abc123", generatedAt: "" };
const SUFFIX = ": a feature category of Markdown OKF-Schema Studio";

function pagesOf(report = fixtureReport()): PageSpec[] {
  const model = parseRequirementsReport(report, "abc123");
  assert.ok(model);
  return viewerPages(model, "/nonexistent-root");
}

function unescape(value: string): string {
  return value.replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&quot;", '"').replaceAll("&#39;", "'").replaceAll("&amp;", "&");
}

/** The values of every meta tag `<meta property|name="key" content="...">`, unescaped. */
function metas(html: string, key: string): string[] {
  const pattern = new RegExp(`<meta (?:property|name)="${key}" content="([^"]*)">`, "gu");
  return [...html.matchAll(pattern)].map((match) => unescape(match[1] ?? ""));
}

function onlyMeta(html: string, key: string): string {
  const values = metas(html, key);
  assert.equal(values.length, 1, key);
  return values[0] ?? "";
}

function pageOf(pages: readonly PageSpec[], dir: string): PageSpec {
  const page = pages.find((spec) => spec.dir.endsWith(dir));
  assert.ok(page, dir);
  return page;
}

function longRule(): string {
  return "When a writer opens a file, the extension SHALL show `some.code` and follow [the long guide](https://example.com/a/very/long/path) and keep going with more words so that the rule goes far beyond the limit of two hundred characters, because a share text has to be cut at a word and never in the middle of one.";
}

test("every page has its own share title, one set of tags, an absolute url", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-085
  const pages = pagesOf();
  const titles = new Set<string>();
  for (const spec of pages) {
    const html = viewerDocument(spec, FOOTER);
    for (const key of ["og:title", "og:description", "og:url", "og:image", "twitter:card", "twitter:image"]) assert.equal(metas(html, key).length, 1, `${spec.dir} ${key}`);
    assert.equal(onlyMeta(html, "og:title"), spec.shareTitle, spec.dir);
    assert.equal(onlyMeta(html, "twitter:title"), spec.shareTitle, spec.dir);
    assert.ok(unescape(html).includes(`<title>${spec.title} | Studio requirements</title>`), spec.dir);
    assert.equal(onlyMeta(html, "og:url"), `${SITE_URL}${spec.dir}/`, spec.dir);
    assert.equal(onlyMeta(html, "og:image"), onlyMeta(html, "twitter:image"), spec.dir);
    assert.equal(onlyMeta(html, "og:image:width"), "1200");
    assert.equal(onlyMeta(html, "og:image:height"), "630");
    assert.equal(onlyMeta(html, "twitter:card"), "summary_large_image");
    titles.add(spec.shareTitle);
  }
  assert.equal(titles.size, pages.length, "every share title is distinct");
});

test("one picture per category, shared by its use cases and behaviours; the index has its own", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-085
  const pages = pagesOf();
  const image = (spec: PageSpec): string => onlyMeta(viewerDocument(spec, FOOTER), "og:image");
  assert.equal(image(pages[0] as PageSpec), `${SITE_URL}requirements/og/areas-card.png`);
  for (const dir of ["/gfm", "/StRS-X-001", "/SwRS-X-010"]) {
    assert.equal(image(pageOf(pages, dir)), `${SITE_URL}requirements/og/area-gfm.png`, dir);
  }
  assert.equal(image(pageOf(pages, "/SwRS-X-013")), `${SITE_URL}requirements/og/area-myst.png`);
  for (const spec of pages) {
    const html = viewerDocument(spec, FOOTER);
    for (const old of ["og/areas.png", "og/area.png", "og/use-case.png", "og/behaviour.png"]) assert.ok(!html.includes(old), `${spec.dir} ${old}`);
  }
});

test("the text of a category, a use case and a behaviour is written for sharing", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-085
  const raw = JSON.parse(fixtureReport()) as { requirements: unknown[] };
  raw.requirements.push(requirement("StRS-X-020", "StRS", "gfm", { userNeed: `As a writer, ${"I want a very long need. ".repeat(12)}`.trim() }));
  raw.requirements.push(requirement("SwRS-X-021", "SwRS", "gfm", { description: longRule(), derivesFrom: ["StRS-X-020"] }));
  const pages = pagesOf(JSON.stringify(raw));
  const html = (dir: string): string => viewerDocument(pageOf(pages, dir), FOOTER);

  const category = pageOf(pages, "requirements/gfm");
  assert.ok(category.shareTitle.endsWith(SUFFIX));
  assert.ok(onlyMeta(html("requirements/gfm"), "og:description").startsWith("A feature category of Markdown OKF-Schema Studio"));
  assert.equal(category.title, "GitHub Flavored Markdown: use cases and behaviours");

  const useCase = html("/StRS-X-001");
  assert.equal(onlyMeta(useCase, "og:title"), "Title of StRS-X-001 (StRS-X-001)");
  assert.equal(onlyMeta(useCase, "og:description"), "As a writer, I do <b>a</b> thing.");
  assert.ok(useCase.includes('content="As a writer, I do &lt;b&gt;a&lt;/b&gt; thing."'));
  const need = pageOf(pages, "/StRS-X-020");
  assert.ok(need.description.length > 200 && !need.description.endsWith("…"), "a user need is kept whole");

  assert.equal(onlyMeta(html("/SwRS-X-010"), "og:title"), "Title of SwRS-X-010 (SwRS-X-010)");
  const rule = onlyMeta(html("/SwRS-X-021"), "og:description");
  assert.ok(rule.length <= 200 && rule.endsWith("…"));
  assert.ok(!rule.includes("`") && !rule.includes("]("));
  const plain = longRule().replace(/\[([^\]]*)\]\([^)]*\)/gu, "$1").replaceAll("`", "");
  const head = rule.slice(0, -1);
  assert.ok(plain.startsWith(head) && plain[head.length] === " ", "cut at a word");
});

async function chromiumStarts(t: TestContext): Promise<boolean> {
  try {
    await (await chromium.launch()).close();
    return true;
  } catch {
    t.skip("no Chromium can start here (run `just dev` to install it)");
    return false;
  }
}

test("the index and category pictures are drawn at 1200 x 630", async (t) => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-085
  if (!await chromiumStarts(t)) return;
  const model = parseRequirementsReport(fixtureReport(), "abc123");
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "studio-viewer-cards-"));
  try {
    await writeCardPictures(path.join(root, "site", "requirements"), viewerCards(model), path.join(root, "templates"));
    const folder = path.join(root, "site", "requirements", "og");
    assert.deepEqual(fs.readdirSync(folder).sort(), ["area-gfm.png", "area-myst.png", "areas-card.png"]);
    for (const name of fs.readdirSync(folder)) {
      const png = fs.readFileSync(path.join(folder, name));
      assert.equal(png.readUInt32BE(16), 1200, name);
      assert.equal(png.readUInt32BE(20), 630, name);
      assert.ok(png.length < 5 * 1024 * 1024, name);
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("the headline of a category card fits above the brand bar, for the title of each group", async (t) => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-085
  if (!await chromiumStarts(t)) return;
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
    for (const group of GROUPS) {
      const area: Area = { id: group.id, title: group.title, description: "", colour: "#a14e32", useCases: 0, behaviours: 0, linkedPercent: undefined };
      await page.setContent(cardDocument(categoryCardBody(area)));
      const boxes = await page.evaluate(() => {
        const box = (selector: string): { top: number; bottom: number; left: number; right: number } => {
          const rect = document.querySelector(selector)?.getBoundingClientRect();
          return { top: rect?.top ?? -1, bottom: rect?.bottom ?? 9999, left: rect?.left ?? -1, right: rect?.right ?? 9999 };
        };
        return { headline: box(".headline"), brand: box(".brand") };
      });
      assert.ok(boxes.headline.top >= 0 && boxes.headline.left >= 0 && boxes.headline.right <= 1200, group.title);
      assert.ok(boxes.headline.bottom <= boxes.brand.top, group.title);
    }
  } finally {
    await browser.close();
  }
});
