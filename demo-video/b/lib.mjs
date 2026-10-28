import { chromium } from "playwright-core";
export const S = process.env.B_SCRATCH ?? "/private/tmp/claude-502/cr170-b";
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export async function connect() {
  for (let attempt = 0; attempt < 12; attempt++) {
    let browser;
    try { browser = await chromium.connectOverCDP("http://127.0.0.1:9333"); } catch { await sleep(1500); continue; }
    const ctx = browser.contexts()[0];
    let page;
    for (let i = 0; i < 12 && !page; i++) { page = ctx?.pages().find((p) => p.url().includes("workbench")); if (!page) await sleep(500); }
    if (!page) { await browser.close().catch(() => {}); continue; }
    await page.waitForSelector(".monaco-workbench .part.editor", { timeout: 60000 });
    return { browser, ctx, page };
  }
  throw new Error("no workbench page");
}
export async function studioFrame(page) {
  for (const f of page.frames()) {
    try {
      if (await f.locator("#sphinx-myst-preview-content").count() === 0) continue;
      if (!(await (await f.frameElement()).isVisible())) continue;
      return f;
    } catch {}
  }
}

import { mkdirSync, writeFileSync, rmSync } from "node:fs";
/** CDP screencast of the page: JPEG frames on disk + frames.json [{n, t(seconds, epoch)}]. */
export async function startRecording(ctx, page, dir, { quality = 92, scale = 1 } = {}) {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const cdp = await ctx.newCDPSession(page);
  const frames = [];
  let n = 0;
  const pending = [];
  cdp.on("Page.screencastFrame", (e) => {
    const i = ++n;
    frames.push({ n: i, t: e.metadata.timestamp });
    pending.push(import("node:fs/promises").then((fs) => fs.writeFile(`${dir}/f_${String(i).padStart(6, "0")}.jpg`, Buffer.from(e.data, "base64"))));
    cdp.send("Page.screencastFrameAck", { sessionId: e.sessionId }).catch(() => {});
  });
  const size = await page.evaluate(() => [innerWidth, innerHeight, devicePixelRatio]);
  await cdp.send("Page.startScreencast", { format: "jpeg", quality, maxWidth: Math.round(size[0] * size[2] * scale), maxHeight: Math.round(size[1] * size[2] * scale), everyNthFrame: 1 });
  return {
    size,
    async stop() {
      await cdp.send("Page.stopScreencast").catch(() => {});
      await Promise.all(pending);
      writeFileSync(`${dir}/frames.json`, JSON.stringify({ size, frames }));
      return frames.length;
    },
  };
}

import { writeFileSync as _w } from "node:fs";
/** Full-window screenshot through CDP (page.screenshot crops oddly on this Electron). */
export async function snap(ctx, page, path) {
  const cdp = await ctx.newCDPSession(page);
  const r = await cdp.send("Page.captureScreenshot", { format: "png" });
  _w(path, Buffer.from(r.data, "base64"));
  await cdp.detach();
}
