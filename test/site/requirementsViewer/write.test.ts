import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";

import { pageDocument } from "../buildSite";
import { SITE_URL } from "../socialCard";
import { fixtureReport, fixtureTrace } from "./fixture";
import { parseRequirementsReport } from "./model";
import { shareCard, viewerDocument } from "./shell";
import { redirectDocument, viewerPages, writeViewerPages } from "./write";

const EXTENSION_ROOT = path.resolve(__dirname, "..", "..", "..", "..");

test("the site navigation links requirements/ from the root and from nested pages", () => {
  // The link pointed to requirements.html before the viewer; it points to the folder of the viewer now.
  for (const [currentPage, prefix] of [["index.html", ""], ["docs/guide.html", "../"], ["a/b/c.html", "../../"]]) {
    const html = pageDocument("Studio", currentPage, "");
    assert.ok(html.includes(`<a href="${prefix}requirements/">Requirements</a>`), currentPage);
    assert.ok(!html.includes("requirements.html"));
  }
});

function tags(html: string): string[] {
  return html.match(/<meta (?:property|name)="(?:og|twitter):[^>]*>/gu) ?? [];
}

test("requirements.html redirects to requirements/ and carries the tags of the index", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-085#S6
  const model = parseRequirementsReport(fixtureReport(), "abc123");
  assert.ok(model);
  const index = viewerPages(model, "/nonexistent-root")[0];
  assert.ok(index);
  const html = redirectDocument(shareCard(index));
  assert.ok(html.includes('<meta http-equiv="refresh" content="0; url=requirements/">'));
  assert.ok(html.includes('<a href="requirements/">'));
  assert.ok(html.includes(`<link rel="canonical" href="${SITE_URL}requirements/">`));
  assert.ok(html.includes("<title>Requirements | Markdown OKF-Schema Studio</title>"));
  assert.ok(html.includes(`property="og:image" content="${SITE_URL}requirements/og/areas-card.png"`));
  assert.ok(html.includes(`property="og:url" content="${SITE_URL}requirements/"`));
  assert.ok(html.includes('name="twitter:card" content="summary_large_image"'));
  const page = viewerDocument(index, { sha: "abc", generatedAt: "" });
  assert.deepEqual(tags(html), tags(page).filter((tag) => !tag.includes('name="description"')));
});

test("the viewer is written under requirements/ with its assets, index and redirect", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-084#S1
  // @tests_req SwRS-MDOKFSTUDIO-CORE-086#S2
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "studio-requirements-"));
  try {
    const reportPath = path.join(root, "report.json");
    fs.writeFileSync(reportPath, fixtureReport());
    const site = path.join(root, "site");
    writeViewerPages(site, reportPath, EXTENSION_ROOT);
    for (const file of ["requirements.html", "requirements/index.html", "requirements/viewer.css", "requirements/viewer.js", "requirements/search-index.js",
      "requirements/gfm/index.html", "requirements/gfm/StRS-X-001/index.html", "requirements/gfm/SwRS-X-010/index.html", "requirements/myst/SwRS-X-013/index.html"]) {
      assert.ok(fs.existsSync(path.join(site, file)), file);
    }
    assert.ok(!fs.existsSync(path.join(site, "requirements", "myst", "StRS-X-002")));
    // A reviewer reads the site written from a report: its home, an area, a use case and its
    // behaviours, without building anything.
    const home = fs.readFileSync(path.join(site, "requirements", "index.html"), "utf8");
    // The dark mode was removed: the home has no dark rule and no data-theme, and still links its stylesheet.
    assert.ok(!home.includes("prefers-color-scheme: dark") && !home.includes("data-theme") && home.includes('href="viewer.css"'));
    const css = fs.readFileSync(path.join(site, "requirements", "viewer.css"), "utf8");
    assert.ok(css.startsWith(":root{color-scheme:light;--bg:#f5f1e8") && css.includes(".crumbs{"), "the shared site stylesheet comes first, then viewer.css");
    assert.ok(!css.includes("prefers-color-scheme") && !css.includes("data-theme"));
    assert.ok(!fs.readFileSync(path.join(site, "requirements", "viewer.js"), "utf8").includes("req-theme"));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("a missing report writes the home and the redirect only", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-069#S3
  // @tests_req SwRS-MDOKFSTUDIO-CORE-084#S2
  // @tests_req SwRS-MDOKFSTUDIO-CORE-085#S6
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "studio-requirements-"));
  try {
    fs.writeFileSync(path.join(root, "broken.json"), "{");
    for (const reportPath of [path.join(root, "absent.json"), path.join(root, "broken.json")]) {
      const site = path.join(root, "site");
      writeViewerPages(site, reportPath, EXTENSION_ROOT);
      assert.ok(fs.readFileSync(path.join(site, "requirements", "index.html"), "utf8").includes("The requirements report was not generated"));
      assert.deepEqual(fs.readdirSync(path.join(site, "requirements")).sort(), ["index.html", "search-index.js", "viewer.css", "viewer.js"]);
      assert.equal(fs.readFileSync(path.join(site, "requirements", "search-index.js"), "utf8"), "window.SEARCH=[];\n");
      const stub = fs.readFileSync(path.join(site, "requirements.html"), "utf8");
      assert.ok(stub.includes('property="og:image"') && stub.includes('name="twitter:card"'), "the stub carries the tags of the index");
      fs.rmSync(site, { recursive: true, force: true });
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("the History checkbox sits inside the header landmark", () => {
  const html = viewerDocument({ dir: "", level: "areas", title: "T", shareTitle: "T", description: "d", body: "<p>x</p>", crumbs: [] }, { sha: "abc", generatedAt: "2026-01-01" });
  const header = html.slice(html.indexOf('<header class="top">'), html.indexOf("</header>"));
  assert.ok(header.includes('id="history"'));
  assert.ok(html.indexOf('id="history"') > html.indexOf("<header"));
});

test("the trace file next to the report feeds the path and scenario counts; without it the build still passes", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-069#S5
  // @tests_req SwRS-MDOKFSTUDIO-CORE-069#S6
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "studio-requirements-"));
  try {
    const reportPath = path.join(root, "requirements-report.json");
    fs.writeFileSync(reportPath, fixtureReport());
    const without = writeViewerPages(path.join(root, "site-a"), reportPath, EXTENSION_ROOT);
    assert.equal(without?.stats.hasTrace, false);
    fs.writeFileSync(path.join(root, "requirements-trace.json"), fixtureTrace());
    const site = path.join(root, "site-b");
    const withTrace = writeViewerPages(site, reportPath, EXTENSION_ROOT);
    assert.equal(withTrace?.stats.hasTrace, true);
    assert.deepEqual([withTrace?.stats.pathsTested, withTrace?.stats.pathsAccepted, withTrace?.stats.scenariosTested], [2, 1, 4]);
    const home = fs.readFileSync(path.join(site, "requirements", "index.html"), "utf8");
    assert.ok(home.includes("<strong>2/3</strong><span>StRS paths tested</span>"));
    fs.writeFileSync(path.join(root, "requirements-trace.json"), "{");
    assert.equal(writeViewerPages(path.join(root, "site-c"), reportPath, EXTENSION_ROOT)?.stats.hasTrace, false, "a broken trace file is no trace file");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
