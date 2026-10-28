// S1 v2 horizontal take: raw perf-analysis.md in a 40 % source pane, click "Open Preview to the Side",
// slow scroll through note + cards, sequence diagram, chart, wide table. Records a CDP screencast
// plus events.json (cursor track, click, scene markers) into $S_SCRATCH/take.
import { writeFileSync, mkdirSync } from "node:fs";
import { connect, studioFrame, sleep, startRecording, snap, S } from "./lib.mjs";

const { browser, ctx, page } = await connect();
await sleep(1500);
const events = [];
const now = () => Date.now() / 1000;
const ev = (type, data = {}) => events.push({ t: now(), type, ...data });
const [W, H, DPR] = await page.evaluate(() => [innerWidth, innerHeight, devicePixelRatio]);
let mx = W * 0.2, my = H * 0.55;
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
async function moveTo(x, y, dur = 1.4) {
  const x0 = mx, y0 = my, steps = Math.max(2, Math.round(dur * 60)), t0 = now();
  for (let i = 1; i <= steps; i++) {
    const k = ease(i / steps);
    mx = x0 + (x - x0) * k; my = y0 + (y - y0) * k;
    await page.mouse.move(mx, my); ev("m", { x: mx, y: my });
    const wait = t0 + (i / steps) * dur - now();
    if (wait > 0) await sleep(wait * 1000);
  }
}
mkdirSync(`${S}/shots`, { recursive: true });
await page.mouse.move(mx, my);
const rec = await startRecording(ctx, page, `${S}/take`);
ev("start"); ev("dims", { w: W, h: H, dpr: DPR });
let f;
async function scrollTo(target, dur) { // eased smooth scroll of the preview to `target` px
  const t0 = now(); let cur = await f.evaluate(() => document.scrollingElement.scrollTop); const from = cur;
  while (now() - t0 < dur) {
    const k = ease(Math.min(1, (now() - t0) / dur));
    const want = from + (target - from) * k;
    cur = await f.evaluate(() => document.scrollingElement.scrollTop);
    const d = want - cur; if (Math.abs(d) > 0.5) await page.mouse.wheel(0, d);
    await sleep(16);
  }
}
const topOf = (sel, nth = 0) => f.evaluate(([s, n]) => { const e = document.querySelectorAll(s)[n]; return e ? e.getBoundingClientRect().top + document.scrollingElement.scrollTop : null; }, [sel, nth]);
try {
  ev("scene", { name: "raw" });
  // fast tour of the raw source: front matter, grid, mermaid, vega-lite, long table row
  const total = 1650, steps = 110;
  await sleep(300);
  for (let i = 0; i < steps; i++) { await page.mouse.wheel(0, (total / steps) * (0.4 + 1.2 * Math.sin(Math.PI * i / steps))); await sleep(2500 / steps); }
  await sleep(150);
  const btn = page.locator('.editor-actions a[aria-label*="Preview"]').first();
  const b = await btn.boundingBox();
  await moveTo(b.x + b.width / 2, b.y + b.height / 2, 1.0);
  await sleep(250);
  ev("click", { x: mx, y: my });
  await page.mouse.down(); await sleep(60); await page.mouse.up();
  ev("scene", { name: "clicked" });
  await sleep(150);
  moveTo(W * 0.84, H * 0.80, 1.2);
  for (let i = 0; i < 80 && !f; i++) { f = await studioFrame(page); if (!f) await sleep(250); }
  if (!f) throw new Error("no preview");
  await f.locator("svg").first().waitFor({ timeout: 15000 }).catch(() => {});
  await sleep(500);
  await f.evaluate(() => document.scrollingElement.scrollTo(0, 0));
  ev("scene", { name: "ready" });
  await snap(ctx, page, `${S}/shots/ready.png`);
  const vh = await f.evaluate(() => innerHeight);
  await sleep(500);
  const cardsTop = await topOf('[class*="grid"], .sd-row, .grid', 0);
  console.log("cardsTop", cardsTop, "vh", vh);
  ev("scene", { name: "cards" });
  await scrollTo(Math.max(0, (cardsTop ?? 500) - vh * 0.45), 1.5);
  await snap(ctx, page, `${S}/shots/cards.png`);
  await sleep(500);
  const h2s = await f.evaluate(() => [...document.querySelectorAll("h2")].map((h) => [h.textContent, h.getBoundingClientRect().top + document.scrollingElement.scrollTop]));
  console.log(h2s);
  const hd = (name) => h2s.find((h) => h[0].includes(name))[1];
  ev("scene", { name: "diagram" });
  await scrollTo(hd("Where the time") - 70, 1.4);
  await snap(ctx, page, `${S}/shots/diagram.png`);
  await sleep(900);
  ev("scene", { name: "chart" });
  await scrollTo(hd("Measured") - 70, 1.2);
  await snap(ctx, page, `${S}/shots/chart.png`);
  await sleep(1000);
  ev("scene", { name: "table" });
  await scrollTo(hd("Projection per") - 40, 1.6);
  await snap(ctx, page, `${S}/shots/table.png`);
  moveTo(W * 0.78, H * 0.74, 1.0);   // note: in Auto width the table does not scroll sideways (scrollLeft resets), so it is held
  await sleep(1800);
  ev("scene", { name: "slide" });
  await sleep(800);
  ev("scene", { name: "tableEnd" });
  await snap(ctx, page, `${S}/shots/end.png`);
} catch (e) { console.error("FAIL", e); await snap(ctx, page, `${S}/shots/failure.png`).catch(() => {}); process.exitCode = 1; }
ev("stop");
const n = await rec.stop();
writeFileSync(`${S}/take/events.json`, JSON.stringify(events));
console.log("frames", n);
await browser.close();
