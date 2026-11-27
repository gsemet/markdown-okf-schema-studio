/**
 * Requirement test of the video gallery in a real browser: `videos.html`, built with the shipped
 * `pageDocument`, `listVideos` and `buildVideoGallery` over fixture files and served on 127.0.0.1,
 * loads no video file until the reader clicks a card's picture, then requests and plays that card's
 * file. Later clicks are the browser's own: each changes the playback once. The fixture video is a
 * short WebM recorded in the browser. Skipped, with a message, when no Chromium can start, unless
 * STUDIO_REQUIRE_CHROMIUM=1.
 */
import * as assert from "node:assert/strict";
import * as fs from "node:fs";
import * as http from "node:http";
import type { AddressInfo } from "node:net";
import * as os from "node:os";
import * as path from "node:path";
import { test, type TestContext } from "node:test";

import { chromium, type Browser, type Locator, type Page } from "playwright-core";

import { pageDocument } from "./buildSite";
import { buildVideoGallery, listVideos, PRESENTATION_VIDEO } from "./videoGalleryPage";

/** A real one-pixel PNG. */
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGM4ceIEAATUAnFrLC9fAAAAAElFTkSuQmCC", "base64");
const CLIPS = "docs/demo-video/clips";
const FILES = [PRESENTATION_VIDEO, `${CLIPS}/alpha/alpha.webm`, `${CLIPS}/beta/beta.webm`] as const;
const TYPES: Readonly<Record<string, string>> = { ".html": "text/html; charset=utf-8", ".png": "image/png", ".webm": "video/webm", ".mp4": "video/mp4" };

/** Serves the files below `root`, nothing else. */
function serve(root: string): http.Server {
  return http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url ?? "/", "http://127.0.0.1").pathname);
    const file = path.join(root, path.normalize(pathname));
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { "content-type": TYPES[path.extname(file)] ?? "application/octet-stream" });
    response.end(fs.readFileSync(file));
  });
}

/** Two seconds of a changing picture, recorded from a canvas, so that a card's video can really play. */
async function recordWebm(browser: Browser): Promise<Buffer> {
  const page = await browser.newPage();
  const url = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 90;
    const context = canvas.getContext("2d") as CanvasRenderingContext2D;
    const recorder = new MediaRecorder(canvas.captureStream(30), { mimeType: "video/webm" });
    const parts: Blob[] = [];
    recorder.ondataavailable = (event) => parts.push(event.data);
    const stopped = new Promise((resolve) => { recorder.onstop = resolve; });
    recorder.start();
    const end = performance.now() + 2000;
    for (let frame = 0; performance.now() < end; frame += 1) {
      context.fillStyle = frame % 2 ? "#000" : "#fff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      await new Promise((resolve) => setTimeout(resolve, 33));
    }
    recorder.stop();
    await stopped;
    const reader = new FileReader();
    const read = new Promise((resolve) => { reader.onload = resolve; });
    reader.readAsDataURL(new Blob(parts, { type: "video/webm" }));
    await read;
    return reader.result as string;
  });
  await page.close();
  return Buffer.from(url.slice(url.indexOf(",") + 1), "base64");
}

function writeFixtureSite(siteRoot: string, video: Buffer): void {
  for (const file of FILES) {
    const target = path.join(siteRoot, ...file.split("/"));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, video);
    fs.writeFileSync(path.join(path.dirname(target), "poster.png"), PNG);
  }
  fs.writeFileSync(path.join(siteRoot, "videos.html"), pageDocument("videos", "videos.html", buildVideoGallery(listVideos(siteRoot))));
}

interface OpenPage {
  page: Page;
  videoRequests: string[];
  pageErrors: string[];
}

/** Runs `check` on the fixture's Videos page, loaded and idle in a fresh Chromium. */
async function withVideosPage(t: TestContext, check: (open: OpenPage) => Promise<void>): Promise<void> {
  let browser: Browser;
  try {
    browser = await chromium.launch();
  } catch (error) {
    if (process.env.STUDIO_REQUIRE_CHROMIUM === "1") throw new Error(`Chromium is required (STUDIO_REQUIRE_CHROMIUM=1) and cannot start: ${error instanceof Error ? error.message : String(error)}`);
    return t.skip("no Chromium can start here (run `just dev` to install it)");
  }
  const siteRoot = fs.mkdtempSync(path.join(os.tmpdir(), "video-gallery-"));
  const server = serve(siteRoot);
  try {
    writeFixtureSite(siteRoot, await recordWebm(browser));
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const videoRequests: string[] = [];
    page.on("request", (request) => {
      const pathname = new URL(request.url()).pathname.slice(1);
      if (/\.(?:webm|mp4)$/u.test(pathname)) videoRequests.push(pathname);
    });
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.goto(`http://127.0.0.1:${(server.address() as AddressInfo).port}/videos.html`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    await check({ page, videoRequests, pageErrors });
    assert.deepEqual(pageErrors, []);
  } finally {
    await browser.close();
    server.closeAllConnections();
    server.close();
    fs.rmSync(siteRoot, { recursive: true, force: true });
  }
}

/** Keeps, on the video, the name of each play and pause event it fires from now on. */
async function recordPlayback(video: Locator): Promise<void> {
  await video.evaluate((element) => {
    for (const name of ["play", "pause"]) element.addEventListener(name, () => { element.dataset.events = `${element.dataset.events ?? ""} ${name}`.trim(); });
  });
}

/** Clicks the middle of the picture, away from the controls, then reads the playback once it had time to change twice. */
async function clickPicture(video: Locator): Promise<{ paused: boolean; events: string }> {
  await video.click();
  await video.page().waitForTimeout(500);
  return video.evaluate((element) => ({ paused: (element as HTMLVideoElement).paused, events: element.dataset.events ?? "" }));
}

test("the Videos page loads no video file until a click on a picture, which plays that video", async (t) => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-098#S5
  await withVideosPage(t, async ({ page, videoRequests }) => {
    assert.equal(await page.locator(".video-gallery figure video").count(), FILES.length);
    // A copy: the assertion would otherwise narrow the list to an empty one for the compiler.
    assert.deepEqual([...videoRequests], [], "no video file is requested before a click");
    assert.deepEqual(await page.locator("video").evaluateAll((videos) => videos.map((video) => (video as HTMLVideoElement).paused)), [true, true, true]);

    const alpha = page.locator("figure#alpha video");
    await recordPlayback(alpha);
    assert.deepEqual(await clickPicture(alpha), { paused: false, events: "play" }, "the first click plays the video");
    assert.ok(await alpha.evaluate((video) => (video as HTMLVideoElement).currentTime > 0), "the picture moves");
    assert.deepEqual([...new Set(videoRequests)], [FILES[1]], "a click on a card requests its file and no other");
    assert.deepEqual(await clickPicture(alpha), { paused: true, events: "play pause" }, "a click on the playing video pauses it, once");
    assert.deepEqual(await clickPicture(alpha), { paused: false, events: "play pause play" }, "a click on the paused video plays it, once");

    const demo = page.locator("figure#short-demo-01 video");
    await recordPlayback(demo);
    const requested = page.waitForRequest((request) => new URL(request.url()).pathname === `/${FILES[0]}`, { timeout: 5000 });
    await demo.click();
    await requested;
    assert.ok(!videoRequests.includes(FILES[2]), "the card that was not clicked loads nothing");
  });
});

test("the Videos page does not toggle a video twice: neither under a browser's own click toggle, nor once started", async (t) => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-098#S5
  await withVideosPage(t, async ({ page, pageErrors }) => {
    // Stands for a browser whose own click toggles playback, after the page's listeners and unless one prevents it.
    const alpha = page.locator("figure#alpha video");
    await recordPlayback(alpha);
    await alpha.evaluate((element) => {
      const video = element as HTMLVideoElement;
      document.addEventListener("click", (event) => {
        if (event.target !== video || event.defaultPrevented) return;
        if (video.paused) void video.play();
        else video.pause();
      }, { once: true });
    });
    assert.deepEqual(await clickPicture(alpha), { paused: false, events: "play" });

    // A video that started, is paused and has loaded nothing yet: its file never arrives.
    await page.route("**/beta.webm", () => undefined);
    const beta = page.locator("figure#beta video");
    await recordPlayback(beta);
    assert.deepEqual(await clickPicture(beta), { paused: false, events: "play" });
    await beta.evaluate((video) => (video as HTMLVideoElement).pause());
    assert.equal(await beta.evaluate((video) => (video as HTMLVideoElement).readyState), 0);
    assert.deepEqual(await clickPicture(beta), { paused: true, events: "play pause" }, "the page's script does not start it again");
    // The browser reports the one play() that the pause above cut short, and nothing else.
    assert.deepEqual(pageErrors.splice(0).map((message) => /interrupted by a call to pause\(\)/u.test(message)), [true]);
  });
});
