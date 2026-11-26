import assert from "node:assert/strict";
import test from "node:test";

import { pageDocument } from "./buildSite";
import { viewerDocument } from "./requirementsViewer/shell";
import { rewriteLinkTarget } from "./siteLinks";

const renderedPages = new Set(["README.md", "CONTRIBUTING.md", "docs/guide.md"]);

test("site branding resolves from root and nested pages", () => {
  for (const [currentPage, prefix] of [["index.html", ""], ["docs/guide.html", "../"]]) {
    const document = pageDocument("Studio", currentPage, "<h1>Studio</h1>");
    assert.ok(document.includes(`href="${prefix}favicon.svg" type="image/svg+xml"`));
    assert.ok(document.includes(`src="${prefix}images/logo.svg" alt="" width="44" height="44"`));
    assert.ok(document.includes(`class="site-brand" href="${prefix}index.html"`));
  }
});

test("the site header links How we ship then How we test from root and nested pages", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-086#S1
  for(const [currentPage, folder] of [["index.html", "docs/"], ["docs/guide.html", ""], ["reports/e2e/index.html", "../../docs/"]]) {
    const document = pageDocument("Studio", currentPage, "<h1>Studio</h1>");
    const pair = `<a href="${folder}how-we-ship.html">How we ship</a><a href="${folder}how-we-test.html">How we test</a>`;
    assert.ok(document.includes(pair), `${currentPage} holds ${pair}`);
  }
});

test("a viewer page brands and links the site relative to its own folder", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-086#S1
  // @tests_req SwRS-MDOKFSTUDIO-CORE-086#S2
  const html = viewerDocument({ dir: "requirements/area/StRS-X-001", level: "use-case", title: "T", shareTitle: "T", description: "d", body: "", crumbs: [] }, { sha: "abc", generatedAt: "" });
  assert.ok(html.includes('src="../../../images/logo.svg" alt="" width="44" height="44"'));
  assert.ok(html.includes('class="site-brand" href="../../../index.html"'));
  const links = [["Home", "../../../index.html"], ["Contributing", "../../../contributing.html"], ["How we ship", "../../../docs/how-we-ship.html"], ["How we test", "../../../docs/how-we-test.html"], ["Gallery", "../../../gallery.html"], ["Requirements", "../../"]];
  const nav = links.map(([text, target]) => `<a href="${target}">${text}</a>`).join("");
  assert.ok(html.includes(`<nav class="site" aria-label="Site">${nav}</nav>`), "the six links, in order");
});

test("rewrites rendered Markdown documents and preserves fragments", () => {
  assert.equal(
    rewriteLinkTarget("docs/guide.md#setup", "README.md", "index.html", renderedPages),
    "docs/guide.html#setup",
  );
});

test("publishes repository report paths under the copied reports tree", () => {
  assert.equal(
    rewriteLinkTarget("out/reports/e2e/REVIEW.md", "README.md", "index.html", renderedPages),
    "reports/e2e/REVIEW.md",
  );
});

test("preserves query strings and fragments for copied assets", () => {
  assert.equal(
    rewriteLinkTarget("images/preview.png?fit=cover#hero", "docs/guide.md", "docs/guide.html", renderedPages),
    "images/preview.png?fit=cover#hero",
  );
});

test("never relativizes absolute or protocol-relative URLs", () => {
  for (const value of [
    "https://example.com/docs?a=1#top",
    "mailto:maintainer@example.com",
    "//cdn.example.com/studio.png",
  ]) {
    assert.equal(rewriteLinkTarget(value, "README.md", "index.html", renderedPages), value);
  }
});

test("a clip's WebM keeps its relative path from a docs page", () => {
  assert.equal(
    rewriteLinkTarget("../demo-video/clips/x/x.webm", "docs/user/settings.md", "docs/user/settings.html", renderedPages),
    "../demo-video/clips/x/x.webm",
  );
});
