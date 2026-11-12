import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";

import { pageDocument } from "../buildSite";
import { SITE_URL } from "../socialCard";
import { fixtureReport } from "./fixture";
import { viewerDocument } from "./shell";
import { redirectDocument, writeViewerPages } from "./write";

const EXTENSION_ROOT = path.resolve(__dirname, "..", "..", "..", "..");

test("the site navigation links requirements/ from the root and from nested pages", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-069
  // The link pointed to requirements.html before the viewer; it points to the folder of the viewer now.
  for (const [currentPage, prefix] of [["index.html", ""], ["docs/guide.html", "../"], ["a/b/c.html", "../../"]]) {
    const html = pageDocument("Studio", currentPage, "");
    assert.ok(html.includes(`<a href="${prefix}requirements/">Requirements</a>`), currentPage);
    assert.ok(!html.includes("requirements.html"));
  }
});

test("requirements.html redirects to requirements/", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-069
  const html = redirectDocument();
  assert.ok(html.includes('<meta http-equiv="refresh" content="0; url=requirements/">'));
  assert.ok(html.includes('<a href="requirements/">'));
  assert.ok(html.includes(`<link rel="canonical" href="${SITE_URL}requirements/">`));
});

test("the viewer is written under requirements/ with its assets, index and redirect", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-069
  // @tests_req SwRS-MDOKFSTUDIO-CORE-080
  // @tests_req SwRS-MDOKFSTUDIO-CORE-084
  // @tests_req SwRS-MDOKFSTUDIO-CORE-086
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
  // @tests_req SwRS-MDOKFSTUDIO-CORE-069
  // @tests_req SwRS-MDOKFSTUDIO-CORE-084
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "studio-requirements-"));
  try {
    fs.writeFileSync(path.join(root, "broken.json"), "{");
    for (const reportPath of [path.join(root, "absent.json"), path.join(root, "broken.json")]) {
      const site = path.join(root, "site");
      writeViewerPages(site, reportPath, EXTENSION_ROOT);
      assert.ok(fs.readFileSync(path.join(site, "requirements", "index.html"), "utf8").includes("The requirements report was not generated"));
      assert.deepEqual(fs.readdirSync(path.join(site, "requirements")).sort(), ["index.html", "search-index.js", "viewer.css", "viewer.js"]);
      assert.equal(fs.readFileSync(path.join(site, "requirements", "search-index.js"), "utf8"), "window.SEARCH=[];\n");
      assert.ok(fs.existsSync(path.join(site, "requirements.html")));
      fs.rmSync(site, { recursive: true, force: true });
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("the History checkbox sits inside the header landmark", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-069
  const html = viewerDocument({ dir: "", level: "areas", title: "T", description: "d", body: "<p>x</p>", crumbs: [] }, { sha: "abc", generatedAt: "2026-01-01" });
  const header = html.slice(html.indexOf('<header class="top">'), html.indexOf("</header>"));
  assert.ok(header.includes('id="history"'));
  assert.ok(html.indexOf('id="history"') > html.indexOf("<header"));
});
