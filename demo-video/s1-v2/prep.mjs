// Pre-warm (not recorded): open the preview once, set zoom / Auto width, collapse the toolbar,
// set the source pane to ~40 %, then close the preview tab (the empty right group keeps its size).
import { connect, studioFrame, sleep, snap, S } from "./lib.mjs";
const V = process.env.VARIANT ?? "h";
const ZOOM_CLICKS = V === "v" ? 6 : 3;   // 160 % portrait (readable on a phone), 130 % horizontal (steps of 10)
const { ctx, page, browser } = await connect(); await sleep(1500);
await page.mouse.click(300, 266);
if (await page.locator(".part.sidebar:visible").count()) { await page.keyboard.press("Control+Alt+b"); await sleep(700); }
await page.locator('.editor-actions a[aria-label*="Preview"]').first().click();
let f; for (let i = 0; i < 60 && !f; i++) { f = await studioFrame(page); if (!f) await sleep(250); }
await sleep(2500);
const click = (sel) => f.locator(sel).first().evaluate((b) => b.click());
const chev = () => f.locator('button[aria-label$="view controls"]').first();
if ((await chev().getAttribute("aria-label")).startsWith("Show")) { await chev().evaluate((b) => b.click()); await sleep(900); }
for (let i = 0; i < ZOOM_CLICKS; i++) { await click('[data-sphinx-preview-zoom-in]'); await sleep(250); }
{ const want = V === "v" ? "Full" : "Auto"; for (let i = 0; i < 3; i++) { const l = await f.locator('button[aria-label^="Width"]').getAttribute("aria-label"); if (l.includes(want)) break; await click('button[aria-label^="Width"]'); await sleep(400); } }
console.log(await f.locator('button[aria-label^="Width"]').getAttribute("aria-label"), await f.evaluate(() => document.documentElement.getAttribute("data-sphinx-preview-zoom")));
await snap(ctx, page, `${S}/shots/prep.png`);
if ((await chev().getAttribute("aria-label")).startsWith("Hide")) { await chev().evaluate((b) => b.click()); await sleep(900); }
if (V === "h") { // sash between the groups: 50 % -> 40 %
  const w = await page.evaluate(() => innerWidth);
  const sash = await page.evaluate(() => { const s = [...document.querySelectorAll(".monaco-sash.vertical:not(.disabled)")].map((e) => e.getBoundingClientRect()).filter((r) => r.height > 300 && r.x > 100); return s[0] && { x: s[0].x + s[0].width / 2, y: s[0].y + s[0].height / 2 }; });
  console.log("sash", sash, w);
  await page.mouse.move(sash.x, sash.y); await page.mouse.down(); await page.mouse.move(w * 0.4, sash.y, { steps: 12 }); await page.mouse.up(); await sleep(800);
}
await snap(ctx, page, `${S}/shots/prep2.png`);
if (V === "v") { // one pane at a time: close the source tab, the preview keeps the window
  const st = await page.locator('.tab[aria-label*="perf-analysis.md"]:not([aria-label*="Studio"])').first().boundingBox();
  await page.mouse.click(st.x + st.width / 2, st.y + st.height / 2, { button: "middle" });
  await sleep(1500); await snap(ctx, page, `${S}/shots/prep3.png`); await browser.close(); process.exit(0);
}
// close the preview tab (middle click)
const tb = await page.locator('.tab[aria-label*="Studio"]').first().boundingBox();
await page.mouse.click(tb.x + tb.width / 2, tb.y + tb.height / 2, { button: "middle" });
await sleep(1200);
await page.mouse.click(200, 400); await sleep(300);
await snap(ctx, page, `${S}/shots/prep3.png`);
await browser.close();
