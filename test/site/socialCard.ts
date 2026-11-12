import * as fs from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";

import { chromium } from "playwright-core";

import { EXTENSION_ROOT } from "../reportPaths";

/** Social cards: the Open Graph and Twitter meta tags of a site page and the picture they point to. */

export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;
const SITE_NAME = "Markdown OKF-Schema Studio";
const CARD_TEMPLATE_ROOT = path.join(EXTENSION_ROOT, "out", "site-cards");

function siteUrl(): string {
  const manifest = JSON.parse(fs.readFileSync(path.join(EXTENSION_ROOT, "package.json"), "utf8")) as { repository: { url: string } };
  const match = /^https:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/u.exec(manifest.repository.url);
  if (!match) throw new Error(`Cannot derive the site URL from repository.url: ${manifest.repository.url}`);
  return `https://${match[1]}.github.io/${match[2]}/`;
}

/** Absolute https root of the published site, with a trailing slash. */
export const SITE_URL = siteUrl();

export interface SocialCard {
  title: string;
  description: string;
  /** Path of the page relative to the site, for example `gallery.html`. */
  page: string;
  /** Path of the picture relative to the site, for example `og/gallery.png`. */
  image: string;
  imageAlt: string;
}

export function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

export function socialMetaTags(card: SocialCard): string {
  const image = SITE_URL + card.image;
  const tags: [string, string, string][] = [
    ["name", "description", card.description],
    ["property", "og:type", "website"],
    ["property", "og:site_name", SITE_NAME],
    ["property", "og:title", card.title],
    ["property", "og:description", card.description],
    ["property", "og:url", SITE_URL + card.page],
    ["property", "og:image", image],
    ["property", "og:image:type", "image/png"],
    ["property", "og:image:width", String(CARD_WIDTH)],
    ["property", "og:image:height", String(CARD_HEIGHT)],
    ["property", "og:image:alt", card.imageAlt],
    ["name", "twitter:card", "summary_large_image"],
    ["name", "twitter:title", card.title],
    ["name", "twitter:description", card.description],
    ["name", "twitter:image", image],
    ["name", "twitter:image:alt", card.imageAlt],
  ];
  return tags.map(([kind, key, value]) => `<meta ${kind}="${key}" content="${escapeHtml(value)}">`).join("\n");
}

const CARD_CSS = `
:root { --ink: #16242c; --muted: #53636c; --line: #d7e0e3; --paper: #f7faf9; --accent: #0e6974; --accent-strong: #084b55; --warm: #e8b05d; }
* { box-sizing: border-box; }
html, body { margin: 0; width: ${CARD_WIDTH}px; height: ${CARD_HEIGHT}px; overflow: hidden; }
body { display: flex; flex-direction: column; background: var(--paper); color: var(--ink); font: 24px/1.4 ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
.band { flex: 0 0 14px; background: var(--accent); }
.content { flex: 1; min-height: 0; display: flex; align-items: center; gap: 56px; padding: 0 72px; }
.brand { flex: 0 0 88px; display: flex; align-items: center; gap: 18px; padding: 0 72px; border-top: 1px solid var(--line); background: #ffffff; font-size: 26px; font-weight: 700; color: var(--accent-strong); }
.brand img { width: 48px; height: 48px; }
.text { flex: 1; min-width: 0; }
.eyebrow { margin: 0 0 18px; color: var(--accent); font-size: 26px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
.headline { margin: 0 0 24px; color: var(--accent-strong); font-size: 76px; font-weight: 800; line-height: 1.08; letter-spacing: -.02em; }
.line { margin: 0; color: var(--muted); font-size: 30px; line-height: 1.35; }
.mosaic { flex: 0 0 540px; height: 380px; display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 14px; }
.mosaic img { display: block; width: 100%; height: 100%; min-height: 0; object-fit: cover; object-position: left top; border: 1px solid var(--line); border-radius: 10px; background: #ffffff; }
.mosaic img:first-child { grid-row: 1 / span 2; }
.mosaic.single { grid-template-columns: 1fr; grid-template-rows: 1fr; }
.mosaic.single img:first-child { grid-row: auto; }
.mosaic.pair { grid-template-columns: 1fr; grid-template-rows: 1fr 1fr; }
.mosaic.pair img:first-child { grid-row: auto; }
`;

/** Wraps the body of a card in the shared 1200 x 630 frame: colour band, content, brand bar. */
export function cardDocument(body: string): string {
  const logo = pathToFileURL(path.join(EXTENSION_ROOT, "images", "logo.svg")).toString();
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${SITE_NAME}</title>
<style>${CARD_CSS}</style>
</head>
<body>
<div class="band"></div>
<div class="content">${body}</div>
<div class="brand"><img src="${escapeHtml(logo)}" alt="">${SITE_NAME}</div>
</body>
</html>
`;
}

/** Body of a simple card: an eyebrow, a headline in large type and one line under it. */
export function simpleCard(eyebrow: string, headline: string, line: string): string {
  return `<div class="text"><p class="eyebrow">${escapeHtml(eyebrow)}</p><h1 class="headline">${escapeHtml(headline)}</h1><p class="line">${escapeHtml(line)}</p></div>`;
}

/**
 * Draws each card as `<siteRoot>/og/<name>.png`. The HTML templates go to `out/site-cards/`,
 * outside the published site; one Chromium serves all the cards.
 */
export async function writeCardPictures(
  siteRoot: string,
  cards: { name: string; html: string }[],
  templateRoot = CARD_TEMPLATE_ROOT,
): Promise<void> {
  fs.rmSync(templateRoot, { recursive: true, force: true });
  fs.mkdirSync(templateRoot, { recursive: true });
  fs.mkdirSync(path.join(siteRoot, "og"), { recursive: true });
  const templates = cards.map((card) => {
    const file = path.join(templateRoot, `${card.name}.html`);
    fs.writeFileSync(file, card.html);
    return { name: card.name, file };
  });
  let browser;
  try {
    browser = await chromium.launch();
  } catch {
    throw new Error("Cannot draw the social cards: Chromium does not start (run `just dev` to install it)");
  }
  try {
    const page = await browser.newPage({ viewport: { width: CARD_WIDTH, height: CARD_HEIGHT }, deviceScaleFactor: 1 });
    for (const template of templates) {
      await page.goto(pathToFileURL(template.file).toString());
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all(Array.from(document.images, (image) => image.complete ? undefined : new Promise<void>((resolve) => {
          image.addEventListener("load", () => resolve());
          image.addEventListener("error", () => resolve());
        })));
      });
      await page.screenshot({ path: path.join(siteRoot, "og", `${template.name}.png`), clip: { x: 0, y: 0, width: CARD_WIDTH, height: CARD_HEIGHT } });
    }
  } finally {
    await browser.close();
  }
}
