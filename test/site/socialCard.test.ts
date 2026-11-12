import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";

import { chromium } from "playwright-core";

import { SIMPLE_CARDS, galleryCard, pageDocument } from "./buildSite";
import { SITE_URL, cardDocument, simpleCard, socialMetaTags, writeCardPictures, type SocialCard } from "./socialCard";
import { outputPathForMarkdown } from "./siteLinks";

const CARD: SocialCard = { title: "A title", description: "A description", page: "gallery.html", image: "og/gallery.png", imageAlt: "An alt text" };

function count(html: string, key: string): number {
  return html.split(`="${key}" `).length - 1;
}

test("socialMetaTags writes each tag once, with absolute https urls and the picture size", () => {
  const html = socialMetaTags(CARD);
  for (const key of ["description", "og:type", "og:site_name", "og:title", "og:description", "og:url", "og:image", "og:image:type", "og:image:width", "og:image:height", "og:image:alt", "twitter:card", "twitter:title", "twitter:description", "twitter:image", "twitter:image:alt"]) {
    assert.equal(count(html, key), 1, key);
  }
  assert.ok(html.includes(`property="og:url" content="${SITE_URL}gallery.html"`));
  assert.ok(html.includes(`property="og:image" content="${SITE_URL}og/gallery.png"`));
  assert.ok(html.includes(`name="twitter:image" content="${SITE_URL}og/gallery.png"`));
  assert.ok(html.includes('property="og:image:width" content="1200"'));
  assert.ok(html.includes('property="og:image:height" content="630"'));
  assert.ok(html.includes('name="twitter:card" content="summary_large_image"'));
  assert.ok(socialMetaTags({ ...CARD, title: `<"&>` }).includes('content="&lt;&quot;&amp;&gt;"'));
});

test("SITE_URL is derived from the repository url of package.json", () => {
  assert.equal(SITE_URL, "https://gsemet.github.io/markdown-okf-schema-studio/");
});

test("pageDocument carries the card tags in the head and is unchanged without a card", () => {
  const withCard = pageDocument("t", "gallery.html", "<p>x</p>", CARD);
  const head = withCard.slice(0, withCard.indexOf("</head>"));
  assert.ok(head.includes('property="og:image"'));
  const plain = pageDocument("t", "gallery.html", "<p>x</p>");
  assert.ok(!plain.includes("og:") && !plain.includes("twitter:"));
  assert.equal(withCard.replace(`${socialMetaTags(CARD)}\n`, ""), plain);
});

test("galleryCard shows the count and up to three tiles, and still draws without a mosaic", () => {
  const full = galleryCard(542, ["file:///a.png", "file:///b.png", "file:///c.png"]);
  assert.ok(full.includes("542 screenshots"));
  assert.equal((full.match(/<img /gu) ?? []).length, 3);
  const empty = galleryCard(0, []);
  assert.ok(empty.includes("0 screenshots"));
  assert.ok(!empty.includes("<img") && !empty.includes("mosaic"));
  assert.ok(cardDocument(empty).startsWith("<!doctype html>"));
});

test("simpleCard puts the three lines in the body, escaped", () => {
  const body = simpleCard("Eye <b>", "Head & line", 'A "line"');
  assert.ok(body.includes("Eye &lt;b&gt;") && body.includes("Head &amp; line") && body.includes("A &quot;line&quot;"));
});

test("SIMPLE_CARDS covers the home, Contributing and How we ship pages", () => {
  assert.deepEqual(Object.keys(SIMPLE_CARDS).sort(), ["CONTRIBUTING.md", "README.md", "docs/how-we-ship.md"]);
  for (const [source, entry] of Object.entries(SIMPLE_CARDS)) assert.equal(entry.card.page, outputPathForMarkdown(source));
});

test("writeCardPictures draws a 1200 x 630 png for each card", async (t) => {
  try {
    await (await chromium.launch()).close();
  } catch {
    t.skip("no Chromium can start here (run `just dev` to install it)");
    return;
  }
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "studio-cards-"));
  try {
    await writeCardPictures(path.join(root, "site"), [{ name: "sample", html: cardDocument(simpleCard("Eyebrow", "Headline", "A line")) }], path.join(root, "templates"));
    const png = fs.readFileSync(path.join(root, "site", "og", "sample.png"));
    assert.equal(png.readUInt32BE(16), 1200);
    assert.equal(png.readUInt32BE(20), 630);
    assert.ok(fs.existsSync(path.join(root, "templates", "sample.html")));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
