import assert from "node:assert/strict";
import test from "node:test";

import { pageDocument } from "./buildSite";
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
