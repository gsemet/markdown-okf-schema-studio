import * as assert from "node:assert/strict";
import { test } from "node:test";

import { fixtureReport, requirement } from "./fixture";
import { walkCount } from "./layout";
import { parseRequirementsReport, type ViewerModel } from "./model";
import { areaPage, behaviourPage, testKind, useCasePage } from "./pages";
import { viewerDocument } from "./shell";
import { viewerPages } from "./write";

const FOOTER = { sha: "abc123", generatedAt: "2026-10-25" };

function load(raw = fixtureReport()): ViewerModel {
  const model = parseRequirementsReport(raw, "abc123");
  assert.ok(model);
  return model;
}

/** Every relative href of a page resolves, from the folder of the page, to a folder or file the site holds. */
function resolved(dir: string, html: string): string[] {
  const hrefs = [...html.matchAll(/(?:href|src)="([^"#]+)"/gu)].map((match) => match[1] ?? "").filter((href) => !/^(?:[a-z]+:|\/\/)/u.test(href));
  return hrefs.map((href) => new URL(href, `https://site.test/${dir}/index.html`).pathname.slice(1));
}

test("one page per active area, use case and behaviour and none for a retired one", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-080
  // @tests_req SwRS-MDOKFSTUDIO-CORE-083
  const pages = viewerPages(load(), "/nonexistent-root").map((page) => page.dir);
  assert.deepEqual(pages.slice(0, 3), ["requirements", "requirements/gfm", "requirements/myst"]);
  assert.equal(pages.length, 1 + 2 + 2 + 6);
  assert.ok(pages.includes("requirements/gfm/StRS-X-001"));
  assert.ok(pages.includes("requirements/myst/SwRS-X-013"));
  for (const retired of ["StRS-X-002", "SwRS-X-015", "SwRS-X-016"]) assert.ok(!pages.some((dir) => dir.endsWith(retired)), retired);
});

test("every relative link resolves from every depth", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-080
  // @tests_req SwRS-MDOKFSTUDIO-CORE-082
  const specs = viewerPages(load(), "/nonexistent-root");
  const folders = new Set(specs.map((spec) => spec.dir));
  const assets = new Set(["requirements/viewer.css", "requirements/viewer.js", "requirements/search-index.js"]);
  const site = new Set(["index.html", "contributing.html", "docs/how-we-ship.html", "gallery.html"]);
  for (const spec of specs) {
    const html = viewerDocument(spec, FOOTER);
    assert.ok(resolved(spec.dir, html).length > 5);
    for (const target of resolved(spec.dir, html)) {
      const ok = folders.has(target.replace(/\/$/u, "")) || assets.has(target) || site.has(target) || target === "favicon.svg" || target.startsWith("images/");
      assert.ok(ok, `${spec.dir} links to ${target}`);
    }
  }
  const behaviour = specs.find((spec) => spec.dir.endsWith("/SwRS-X-013"));
  assert.ok(behaviour);
  assert.ok(viewerDocument(behaviour, FOOTER).includes('href="../../viewer.css"'));
});

test("a use case with paths draws the map, the phone list and the walk count", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-081
  const model = load();
  const page = useCasePage(model, model.byId.get("StRS-X-001")!);
  assert.ok(page.body.includes('<svg class="metro"') || page.body.includes("<svg"));
  assert.ok(page.body.includes('<svg class="metro"') && !/<svg class="metro"[^>]*role="img"/u.test(page.body), "the map holds links, so it is not an image widget");
  assert.ok(page.body.includes('class="metro-list"'));
  assert.ok(page.body.includes("State A") && page.body.includes("State C"));
  // A -> B once (1 scenario), B -> C twice (2 scenarios), B -> refusal option once (1 refusal scenario): 1 + 3 = 4 walks.
  assert.equal(walkCount(model, model.paths.get("StRS-X-001")!), 4);
  assert.ok(page.body.includes("4 different ways"));
  assert.ok(page.body.includes("<b>3</b> behaviours") && page.body.includes("<b>5</b> scenarios"));
  assert.ok(page.body.includes('href="../SwRS-X-010/"'), "a transition links to the page of its behaviour");
  assert.ok(page.body.includes('<span class="tag">not on the map</span>'), "SwRS-X-013 is outside the paths");
  assert.ok(page.description.startsWith("4 ways"));
  assert.ok(page.body.includes("do &lt;b&gt;a&lt;/b&gt; thing"), "text from the report is escaped");
});

test("an unknown cited id is drawn without a link and a use case without paths says so", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-081
  const raw = JSON.parse(fixtureReport()) as { requirements: unknown[] };
  raw.requirements.push(requirement("StRS-X-004", "StRS", "gfm", { text: "### Main paths\n\n#### Path 1: x\n\n1. A\n   - SwRS-UNKNOWN-999: moves\n2. B\n" }));
  const model = load(JSON.stringify(raw));
  const html = useCasePage(model, model.byId.get("StRS-X-004")!).body;
  assert.ok(html.includes("SwRS-UNKNOWN-999") && !html.includes("UNKNOWN-999/"));
  const none = useCasePage(model, model.byId.get("StRS-X-003")!);
  assert.ok(none.body.includes("paths of this use case are not written yet"));
  assert.ok(!none.body.includes("<svg"));
});

test("an area page lists its active use cases and keeps retired ones for History", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-080
  // @tests_req SwRS-MDOKFSTUDIO-CORE-083
  const model = load();
  const gfm = areaPage(model, model.areas[0]!);
  assert.ok(gfm.body.includes('href="StRS-X-001/"') && gfm.body.includes('href="StRS-X-003/"'));
  assert.ok(gfm.body.includes("3 behaviours") && gfm.body.includes("<b>80%</b>"));
  const myst = areaPage(model, model.areas[1]!);
  assert.ok(myst.body.includes('class="retired"') && myst.body.includes("superseded by") && myst.body.includes('href="../gfm/StRS-X-001/"'));
  assert.ok(!myst.body.includes('href="StRS-X-002/"'));
});

test("behaviour page: files at the commit, test kinds, retired rows and the where section", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-082
  // @tests_req SwRS-MDOKFSTUDIO-CORE-083
  const model = load();
  const page = behaviourPage(model, model.byId.get("SwRS-X-011")!).body;
  assert.ok(page.includes("https://github.com/gsemet/markdown-okf-schema-studio/blob/abc123/src/a.ts"));
  assert.ok(page.includes('<span class="tag">unit</span>') && page.includes('<span class="tag">integration</span>'));
  assert.ok(page.includes("Step 2 of path 1 in") && page.includes("<strong>SHALL</strong>"));
  assert.ok(page.includes("Known limits (2)"));
  assert.ok(page.includes('<span class="k nom">nominal</span>Go on'));
  assert.ok(page.includes('<a href="../SwRS-X-010/">← Title of SwRS-X-010</a>'), "the pager links the previous behaviour of the use case");
  const exempt = behaviourPage(model, model.byId.get("SwRS-X-013")!).body;
  assert.ok(exempt.includes("Exempt from code and test markers: Documentation only"));
  assert.ok(exempt.includes("Part of") && exempt.includes('href="../../gfm/StRS-X-001/"'), "one block per active parent");
  const replacement = behaviourPage(model, model.byId.get("SwRS-X-014")!).body;
  assert.ok(replacement.includes("<h2>Replaces</h2>") && replacement.includes("X-015"));
  const useCase = useCasePage(model, model.byId.get("StRS-X-003")!).body;
  assert.ok(useCase.includes('class="brow retired"') && useCase.includes("superseded by") && useCase.includes('<a href="../SwRS-X-014/">'));
  assert.equal(testKind("test/visual/a.ts"), "visual");
  assert.equal(testKind("tests/fixtures/x.py"), "unit");
});

test("without JavaScript the search, Play and theme controls are hidden", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-081
  // @tests_req SwRS-MDOKFSTUDIO-CORE-084
  for (const page of viewerPages(load(), "/nonexistent-root")) {
    const rule = /<noscript><style>([^<]*)<\/style><\/noscript>/u.exec(viewerDocument(page, FOOTER))?.[1] ?? "";
    for (const selector of ["#search-open", "#theme", ".play"]) {
      assert.ok(rule.includes(selector), `${page.dir} hides ${selector}`);
    }
    assert.ok(!rule.includes("hist"), "the CSS-only History toggle stays");
  }
});
