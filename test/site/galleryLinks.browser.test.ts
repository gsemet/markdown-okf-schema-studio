/**
 * Requirement test of the gallery links in a real browser: `gallery.html`, built with the shipped
 * `pageDocument` and `buildGallery` over four fixture captures and served as static files on
 * 127.0.0.1 (no rewrite, as on GitHub Pages), gives each screenshot its own URL, follows Back and
 * Forward, opens a direct link and refuses an unknown one. Skipped, with a message, when no
 * Chromium can start, unless STUDIO_REQUIRE_CHROMIUM=1.
 */
import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as http from "node:http";
import type { AddressInfo } from "node:net";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";

import { chromium, type Browser, type Locator, type Page } from "playwright-core";

import { pageDocument } from "./buildSite";
import { buildGallery } from "./galleryPage";

const PAGE_TITLE = "gallery | Markdown OKF-Schema Studio";
/** A real one-pixel PNG. */
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGM4ceIEAATUAnFrLC9fAAAAAElFTkSuQmCC", "base64");

/** The four captures in gallery (name) order: a legacy path, a real-window run folder, two visual ones. */
const CAPTURES = [
  { file: "real run/checkpoint.png", id: "real run/checkpoint", fragment: "#real%20run/checkpoint" },
  { file: "real-input-Ab3xZ9/block-editing/r01-paragraph-blur-commit.png", id: "block-editing/r01-paragraph-blur-commit", fragment: "#block-editing/r01-paragraph-blur-commit" },
  { file: "visual/block-editing/v01-paragraph-light-900--typed.png", id: "block-editing/v01-paragraph-light-900--typed", fragment: "#block-editing/v01-paragraph-light-900--typed" },
  { file: "visual/block-editing/v01-paragraph-light-900.png", id: "block-editing/v01-paragraph-light-900", fragment: "#block-editing/v01-paragraph-light-900" },
] as const;
const [LEGACY, RUN, TYPED] = CAPTURES;

/** What the reader sees: the viewer, the address, the title and the notice. */
interface Seen {
  open: boolean;
  fragment: string;
  title: string;
  heading: string | null;
  position: string | null;
  notice: string | null;
}

const shown = (index: number): Seen => ({
  open: true,
  fragment: CAPTURES[index].fragment,
  title: `${CAPTURES[index].id} | ${PAGE_TITLE}`,
  heading: CAPTURES[index].file,
  position: `${index + 1} of ${CAPTURES.length}`,
  notice: null,
});
const grid = (fragment = "", notice: string | null = null): Seen => ({ open: false, fragment, title: PAGE_TITLE, heading: null, position: null, notice });
const missing = (id: string): string => `The screenshot ${id} is not in this gallery: it may have been renamed or removed.`;

function read(page: Page): Promise<Seen> {
  return page.evaluate(() => {
    const viewer = document.querySelector<HTMLDialogElement>(".capture-viewer");
    const notice = document.querySelector<HTMLElement>("[data-capture-missing]");
    const open = viewer?.open ?? false;
    return {
      open,
      fragment: location.hash,
      title: document.title,
      heading: open ? viewer?.querySelector("h2")?.textContent ?? "" : null,
      position: open ? viewer?.querySelector("[data-capture-position]")?.textContent ?? "" : null,
      notice: notice && notice.getClientRects().length > 0 ? notice.textContent : null,
    };
  });
}

/** Waits up to 5 s for the page to show `expected`: Back, Forward and `close` are asynchronous. */
async function expectSeen(page: Page, expected: Seen, message: string): Promise<void> {
  let seen = await read(page);
  for (let tries = 0; tries < 100 && JSON.stringify(seen) !== JSON.stringify(expected); tries += 1) {
    await page.waitForTimeout(50);
    seen = await read(page);
  }
  assert.deepEqual(seen, expected, message);
}

/** The id of the card whose link has the focus, once the page has had time to move it. */
async function expectFocusedCard(page: Page, id: string): Promise<void> {
  await page.waitForFunction((expected) => document.activeElement?.matches("a.capture-open") === true && document.activeElement.getAttribute("data-capture-id") === expected, id, { timeout: 5000 });
}

/** One click as the page left it: `intercepted` says a handler of the page prevented its default. */
interface SeenClick {
  type: string;
  button: number;
  shift: boolean;
  alt: boolean;
  intercepted: boolean;
}

type ClickWatch = Window & { seenClicks?: SeenClick[]; stopWatching?: AbortController };

/**
 * Clicks `target` and returns what the page saw. The click is recorded after the page's own
 * handlers, then the browser's own action (new window, download, new tab) is cancelled, so nothing
 * opens and there is nothing to wait for.
 */
async function watchClick(page: Page, target: Locator, options: Parameters<Locator["click"]>[0]): Promise<SeenClick[]> {
  await page.evaluate(() => {
    const watch = window as ClickWatch;
    const seen: SeenClick[] = [];
    const stop = new AbortController();
    const record = (event: MouseEvent): void => {
      seen.push({ type: event.type, button: event.button, shift: event.shiftKey, alt: event.altKey, intercepted: event.defaultPrevented });
      event.preventDefault();
    };
    for (const type of ["click", "auxclick"] as const) document.addEventListener(type, record, { signal: stop.signal });
    watch.seenClicks = seen;
    watch.stopWatching = stop;
  });
  await target.click(options);
  return page.evaluate(() => {
    const watch = window as ClickWatch;
    watch.stopWatching?.abort();
    return watch.seenClicks ?? [];
  });
}

/** Serves the files below `root`, nothing else: no index page and no rewrite. */
function serve(root: string): http.Server {
  return http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url ?? "/", "http://127.0.0.1").pathname);
    const file = path.join(root, path.normalize(pathname));
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { "content-type": file.endsWith(".html") ? "text/html; charset=utf-8" : "image/png" });
    response.end(fs.readFileSync(file));
  });
}

function writeFixtureSite(siteRoot: string): void {
  const screenshots = path.join(siteRoot, "reports", "e2e", "screenshots");
  for (const capture of CAPTURES) {
    const filename = path.join(screenshots, ...capture.file.split("/"));
    fs.mkdirSync(path.dirname(filename), { recursive: true });
    fs.writeFileSync(filename, PNG);
    fs.writeFileSync(filename.replace(/\.png$/u, ".json"), JSON.stringify({ summary: `Fixture ${capture.id}` }));
  }
  fs.writeFileSync(path.join(siteRoot, "gallery.html"), pageDocument("gallery", "gallery.html", buildGallery(screenshots)));
}

test("each screenshot of the gallery has its own link, followed by Back, Forward and a direct load", async (t) => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-096#S1
  // @tests_req SwRS-MDOKFSTUDIO-CORE-096#S4
  // @tests_req SwRS-MDOKFSTUDIO-CORE-096#S5
  let browser: Browser;
  try {
    browser = await chromium.launch();
  } catch (error) {
    if (process.env.STUDIO_REQUIRE_CHROMIUM === "1") throw new Error(`Chromium is required (STUDIO_REQUIRE_CHROMIUM=1) and cannot start: ${error instanceof Error ? error.message : String(error)}`);
    return t.skip("no Chromium can start here (run `just dev` to install it)");
  }
  const siteRoot = fs.mkdtempSync(path.join(os.tmpdir(), "gallery-links-"));
  const server = serve(siteRoot);
  try {
    writeFixtureSite(siteRoot);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/gallery.html`;
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const pageErrors: string[] = [];
    context.on("page", (opened) => opened.on("pageerror", (error) => pageErrors.push(`${opened.url()}: ${error.message}`)));
    const page = await context.newPage();
    const card = (index: number) => page.locator("a.capture-open").nth(index);

    await t.test("1. the URL without a fragment shows the grid", async () => {
      await page.goto(url);
      await expectSeen(page, grid(), "no viewer and no notice");
      assert.equal(await page.locator(".gallery figure").count(), 4);
      assert.deepEqual(await page.locator("a.capture-open").evaluateAll((links) => links.map((link) => link.getAttribute("data-capture-id"))), CAPTURES.map((capture) => capture.id));
    });

    await t.test("2. a plain click opens the card and names it in the URL; a modified or middle click is the browser's", async () => {
      const [tab] = await Promise.all([context.waitForEvent("page"), card(0).click({ modifiers: ["ControlOrMeta"] })]);
      await tab.close();
      await expectSeen(page, grid(), "Ctrl or Meta click leaves this page as it is");
      const entries = await page.evaluate(() => history.length);
      const leftAlone = { type: "click", button: 0, shift: false, alt: false, intercepted: false };
      assert.deepEqual(await watchClick(page, card(0), { modifiers: ["Shift"] }), [{ ...leftAlone, shift: true }], "Shift click");
      assert.deepEqual(await watchClick(page, card(0), { modifiers: ["Alt"] }), [{ ...leftAlone, alt: true }], "Alt click");
      assert.deepEqual(await watchClick(page, card(0), { button: "middle" }), [{ ...leftAlone, type: "auxclick", button: 1 }], "middle click");
      await expectSeen(page, grid(), "Shift, Alt and middle clicks leave this page as it is");
      assert.equal(await page.evaluate(() => history.length), entries);
      await card(0).click();
      await expectSeen(page, shown(0), "card 1");
      assert.ok(page.url().endsWith(LEGACY.fragment));
      assert.ok((await read(page)).heading?.includes(LEGACY.id));
    });

    await t.test("3. Next and ArrowRight change the URL; Alt with an arrow is left to the browser", async () => {
      await page.locator("[data-capture-next]").click();
      await expectSeen(page, shown(1), "after Next");
      await page.keyboard.press("ArrowRight");
      await expectSeen(page, shown(2), "after ArrowRight");
      const entries = await page.evaluate(() => history.length);
      await page.keyboard.press("Alt+ArrowRight");
      await expectSeen(page, shown(2), "after Alt+ArrowRight");
      assert.equal(await page.evaluate(() => history.length), entries);
    });

    await t.test("4. Back and Forward show the screenshots seen, and the grid", async () => {
      await page.goBack();
      await expectSeen(page, shown(1), "Back");
      await page.goBack();
      await expectSeen(page, shown(0), "Back again");
      await page.goBack();
      await expectSeen(page, grid(), "Back to the grid");
      await page.goForward();
      await expectSeen(page, shown(0), "Forward: closing on Back pushed nothing");
    });

    await t.test("5. closing pushes the URL without a fragment, focuses the card, and Back reopens", async () => {
      await page.keyboard.press("Escape");
      await expectSeen(page, grid(), "Escape");
      assert.equal(page.url(), url);
      await expectFocusedCard(page, LEGACY.id);
      await page.goBack();
      await expectSeen(page, shown(0), "Back after Escape");
      await page.locator("[data-capture-next]").click();
      await page.locator(".capture-close").click();
      await expectSeen(page, grid(), "close button");
      await expectFocusedCard(page, RUN.id);
      await page.goBack();
      await expectSeen(page, shown(1), "Back after the close button");
      await page.mouse.click(2, 2);
      await expectSeen(page, grid(), "backdrop click");
      await page.goBack();
      await expectSeen(page, shown(1), "Back after the backdrop click");
    });

    await t.test("6. a direct load opens the screenshot, and a reload keeps it", async () => {
      const direct = await context.newPage();
      await direct.goto(url + RUN.fragment);
      await expectSeen(direct, shown(1), "direct load of a registry id");
      await direct.reload();
      await expectSeen(direct, shown(1), "reload");
      await direct.close();
    });

    await t.test("7. an unknown or malformed fragment shows the notice and no viewer", async () => {
      for (const [fragment, id] of [["#nope/r99-gone", "nope/r99-gone"], ["#%E0%A4%A", "%E0%A4%A"]] as const) {
        const direct = await context.newPage();
        await direct.goto(url + fragment);
        await expectSeen(direct, grid(fragment, missing(id)), `direct load of ${fragment}`);
        await direct.evaluate((hash) => { location.hash = hash; }, TYPED.fragment);
        await expectSeen(direct, shown(2), "a known id typed afterwards");
        await direct.evaluate((hash) => { location.hash = hash; }, fragment);
        await expectSeen(direct, grid(fragment, missing(id)), "an unknown id typed over an open viewer pushes nothing");
        await direct.goBack();
        await expectSeen(direct, shown(2), "Back from the unknown id");
        await direct.goBack();
        await expectSeen(direct, grid(fragment, missing(id)), "Back to the first URL");
        await direct.locator("a.capture-open").first().click();
        await expectSeen(direct, shown(0), "opening a card hides the notice");
        await direct.close();
      }
    });

    await t.test("8. the link of a card is the URL of its screenshot", async () => {
      await page.goto("about:blank");
      await page.goto(url);
      const href = await card(0).evaluate((link: HTMLAnchorElement) => link.href);
      assert.equal(href, `${url}#real%20run/checkpoint`);
      const direct = await context.newPage();
      await direct.goto(href);
      await expectSeen(direct, shown(0), "loading the copied link");
      await direct.close();
    });

    await t.test("9. no page error", () => {
      assert.deepEqual(pageErrors, []);
    });
  } finally {
    await browser.close();
    server.closeAllConnections();
    server.close();
    fs.rmSync(siteRoot, { recursive: true, force: true });
  }
});
