import * as assert from "node:assert/strict";
import { test } from "node:test";

import { FULL_BEHAVIOUR, FULL_USE_CASE, fixtureReport, fullIdReport, requirement } from "./fixture";
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
  assert.equal(page.description, "As a writer, I do <b>a</b> thing.", "the share text is the user need");
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
  // @tests_req SwRS-MDOKFSTUDIO-CORE-093
  // @tests_req SwRS-MDOKFSTUDIO-CORE-083
  const model = load();
  const page = behaviourPage(model, model.byId.get("SwRS-X-011")!).body;
  assert.ok(page.includes("https://github.com/gsemet/markdown-okf-schema-studio/blob/abc123/src/a.ts"));
  assert.ok(page.includes('<span class="tag">unit</span>') && page.includes('<span class="tag">integration</span>'));
  assert.ok(page.includes("Step 2 of path 1 in") && page.includes("<strong>SHALL</strong>"));
  assert.ok(page.includes("Known limits (2)"));
  assert.ok(page.includes('<span class="k nom">nominal</span>Go on'));
  // The pager link names the requirement by its full ID (CR-458, viewer-ids-Q2): the same previous link, now `← <full ID>: <title>`.
  assert.ok(page.includes('<a href="../SwRS-X-010/">← SwRS-X-010: Title of SwRS-X-010</a>'), "the pager links the previous behaviour of the use case");
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

test("without JavaScript the search and Play controls are hidden", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-081
  // @tests_req SwRS-MDOKFSTUDIO-CORE-084
  // @tests_req SwRS-MDOKFSTUDIO-CORE-086
  for (const page of viewerPages(load(), "/nonexistent-root")) {
    assert.ok(!viewerDocument(page, FOOTER).includes('id="theme"'), "no page has a Theme button");
    const rule = /<noscript><style>([^<]*)<\/style><\/noscript>/u.exec(viewerDocument(page, FOOTER))?.[1] ?? "";
    for (const selector of ["#search-open", ".play"]) {
      assert.ok(rule.includes(selector), `${page.dir} hides ${selector}`);
    }
    assert.ok(!rule.includes("hist"), "the CSS-only History toggle stays");
  }
});

test("the use case diagram sits under the user need and before the map, and without one the page is unchanged", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-087
  const model = load();
  const useCase = model.byId.get("StRS-X-001")!;
  const before = useCasePage(model, useCase).body;
  assert.ok(!before.includes("ucd") && !before.includes("Use case diagram"), "no drawing, no figure");
  model.diagrams.set("StRS-X-001", '<svg id="ucd-x-001"><text>drawn</text></svg>');
  const after = useCasePage(model, useCase).body;
  const figure = '<h2>Use case diagram</h2>\n<figure class="ucd" role="img" aria-label="Use case diagram of Title of StRS-X-001"><svg id="ucd-x-001"><text>drawn</text></svg></figure>\n';
  assert.ok(after.includes(figure));
  assert.ok(after.indexOf("</blockquote>") < after.indexOf('<figure class="ucd"'));
  assert.ok(after.indexOf('<figure class="ucd"') < after.indexOf("<h2>How it is split</h2>"));
  assert.equal(after.replace(figure, ""), before, "the rest of the body is byte-identical");
  assert.ok(!after.includes("<script") && !after.includes("prefers-color-scheme"));
});

test("a table scenario shows its table and a mixed scenario shows steps, note and table in order", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-082
  const model = load();
  const page = behaviourPage(model, model.byId.get("SwRS-X-014")!).body;
  const [tableCard = "", mixedCard = ""] = page.split('<details class="scn">').slice(1);
  assert.ok(tableCard.includes("<table>") && tableCard.includes("<th>Input</th><th>Outcome</th>"));
  assert.equal(tableCard.match(/<tr>/gu)?.length, 3, "one header row and one row per source row");
  assert.ok(tableCard.includes("<td>`a | b`</td>"), "the escaped pipe is one cell");
  assert.ok(tableCard.includes("<td>&lt;b&gt; &amp;lt;</td>") && !tableCard.includes("<b>"), "decoded once, then escaped");
  assert.ok(!tableCard.includes('class="gwt"'), "no empty Given / When / Then columns");
  const gwt = mixedCard.indexOf('<div class="gwt">');
  const note = mixedCard.indexOf('<p class="scn-note">A note line');
  const bullet = mixedCard.indexOf('<p class="scn-note">A bullet note');
  const table = mixedCard.indexOf('<div class="scn-table">');
  assert.ok(gwt >= 0 && gwt < note && note < bullet && bullet < table, "steps, note, bullet, table in source order");
  assert.ok(mixedCard.includes("<th>Given</th><th>When</th><th>Then</th>"), "a Given | When | Then table stays a table");
  const list = behaviourPage(model, model.byId.get("SwRS-X-011")!).body;
  assert.ok(list.includes('<div class="gwt">') && list.includes("<b>Given</b>") && list.includes("<b>When</b>") && list.includes("<b>Then</b>"));
  assert.ok(!list.includes("<table>"));
});

test("the line above the map names the paths and what they share", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-081
  const single = load();
  const one = useCasePage(single, single.byId.get("StRS-X-001")!).body;
  assert.ok(one.includes('<p class="mapread">') && one.includes("one <b>path</b>") && one.includes("<b>situation</b>") && one.includes("<b>step</b>"));
  assert.ok(!one.includes("Where paths meet"), "a single path shares nothing");
  const model = load(fullIdReport());
  const two = useCasePage(model, model.byId.get(FULL_USE_CASE)!).body;
  assert.ok(two.includes("<b>2 paths</b>") && two.includes("Where paths meet, they share the circle or the step."));
  assert.ok(two.includes("path 2: Jump to the middle, then save"), "the legend names each path with its title");
  assert.ok(two.includes('<i class="lp1"></i>') && two.includes('<i class="lp2"></i>') && two.includes('<i class="lshared"></i>'));
});

test("a full ID is the text of every link to a requirement", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-080
  // @tests_req SwRS-MDOKFSTUDIO-CORE-082
  // @tests_req SwRS-MDOKFSTUDIO-CORE-083
  const model = load(fullIdReport());
  const useCase = useCasePage(model, model.byId.get(FULL_USE_CASE)!).body;
  assert.ok(useCase.includes(`<span class="id">${FULL_BEHAVIOUR(102)}</span>`), "the list of behaviours");
  assert.ok(useCase.includes(FULL_BEHAVIOUR(104)));
  const behaviour = behaviourPage(model, model.byId.get(FULL_BEHAVIOUR(102))!).body;
  assert.ok(behaviour.includes(`Step 2 of path 1 in <a`) && behaviour.includes(`>${FULL_USE_CASE}</a>`), "the where section names the use case");
  assert.ok(useCase.includes(`>${FULL_BEHAVIOUR(101)}</a></span>`), "the replacement of a retired behaviour");
  const retired = behaviourPage(model, model.byId.get(FULL_BEHAVIOUR(101))!).body;
  assert.ok(retired.includes(`superseded by <a href="./">${FULL_BEHAVIOUR(101)}</a>`), "the replaced behaviour, on the page of its replacement");
  const area = areaPage(model, model.areas[0]!).body;
  assert.ok(area.includes(FULL_USE_CASE) && !/>GFM-001</u.test(area));
  for (const html of [useCase, behaviour, retired, area]) assert.ok(!/>(?:GFM|MYST)-\d+</u.test(html), "no short ID as a text");
});

test("a full ID names a requirement on its page", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-093
  const model = load(fullIdReport());
  const useCase = model.byId.get(FULL_USE_CASE)!;
  const meta = (html: string, property: string): string[] => [...html.matchAll(new RegExp(`<meta (?:property|name)="${property}" content="([^"]*)"`, "gu"))].map((match) => match[1] ?? "");
  const eyebrowOf = (html: string): string => /<p class="eyebrow">(?:<span[^>]*><\/span>)?([^<]*)<\/p>/u.exec(html)?.[1] ?? "";
  const ucSpec = useCasePage(model, useCase);
  const ucHtml = viewerDocument(ucSpec, FOOTER);
  assert.equal(eyebrowOf(ucSpec.body), `Use case ${FULL_USE_CASE}`);
  assert.equal(ucSpec.title, `Use case ${FULL_USE_CASE}: ${useCase.title}`);
  assert.equal(ucSpec.shareTitle, `Use case ${FULL_USE_CASE}: ${useCase.title}`);
  assert.deepEqual(ucSpec.crumbs.map((crumb) => crumb.text), ["Areas", "GitHub Flavored Markdown", FULL_USE_CASE]);
  assert.ok(ucHtml.includes(`<title>Use case ${FULL_USE_CASE}: ${useCase.title} | Studio requirements</title>`));
  assert.deepEqual(meta(ucHtml, "og:title"), [`Use case ${FULL_USE_CASE}: ${useCase.title}`]);
  assert.deepEqual(meta(ucHtml, "twitter:title"), [`Use case ${FULL_USE_CASE}: ${useCase.title}`]);

  const id = FULL_BEHAVIOUR(102);
  const behaviour = model.byId.get(id)!;
  const before = model.byId.get(FULL_BEHAVIOUR(101))!;
  const after = model.byId.get(FULL_BEHAVIOUR(103))!;
  const bSpec = behaviourPage(model, behaviour);
  const bHtml = viewerDocument(bSpec, FOOTER);
  assert.equal(eyebrowOf(bSpec.body), `Behaviour ${id}`);
  assert.equal(bSpec.title, `Behaviour ${id}: ${behaviour.title}`);
  assert.equal(bSpec.shareTitle, `Behaviour ${id}: ${behaviour.title}`);
  assert.deepEqual(bSpec.crumbs.map((crumb) => crumb.text), ["Areas", "GitHub Flavored Markdown", FULL_USE_CASE, id]);
  assert.ok(bSpec.body.includes(`aria-label="Behaviours of ${FULL_USE_CASE}"`));
  assert.ok(bSpec.body.includes(`>← ${before.id}: ${before.title}</a>`), "the previous link");
  assert.ok(bSpec.body.includes(`>${after.id}: ${after.title} →</a>`), "the next link");
  assert.deepEqual(meta(bHtml, "og:title"), [`Behaviour ${id}: ${behaviour.title}`]);
  assert.deepEqual(meta(bHtml, "twitter:title"), [`Behaviour ${id}: ${behaviour.title}`]);

  // No short ID is a text of the whole document, head and breadcrumb included: once the full IDs are taken out, none is left.
  for (const html of [ucHtml, bHtml]) {
    const rest = html.replace(/(?:StRS|SwRS)-MDOKFSTUDIO-(?:GFM|MYST)-\d+/gu, "");
    assert.ok(!/(?:GFM|MYST)-\d+/u.test(rest), "a short ID is left in the document");
  }
});
