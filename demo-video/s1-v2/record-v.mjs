// S1 v2 vertical takes in the portrait window. PASS=raw: the source alone, scrolled fast from the long
// table row up to the front matter. PASS=preview: the preview alone (prep.mjs left it open at 140 %),
// held on the title, then a slow tour: cards, sequence diagram, chart, wide table (slides sideways).
import { writeFileSync } from "node:fs";
import { connect, studioFrame, sleep, startRecording, snap, S } from "./lib.mjs";
const PASS = process.env.PASS ?? "preview";
const { browser, ctx, page } = await connect();
await sleep(1500);
const events = []; const now = () => Date.now() / 1000;
const ev = (type, data = {}) => events.push({ t: now(), type, ...data });
const [W, H, DPR] = await page.evaluate(() => [innerWidth, innerHeight, devicePixelRatio]);
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const dir = PASS === "raw" ? `${S}/take-v-raw` : `${S}/take-v`;
if (PASS === "raw") {
  await page.mouse.click(W * 0.5, H * 0.5); await sleep(200);
  if (await page.locator(".part.sidebar:visible").count()) { await page.keyboard.press("Control+Alt+b"); await sleep(700); }
  await page.mouse.move(W * 0.5, H * 0.5);
  await page.keyboard.press("Control+End"); await sleep(600);   // start on the long table row
} else {
  await page.mouse.move(W * 0.5, H * 0.6);
}
let f = PASS === "raw" ? null : await studioFrame(page);
if (PASS !== "raw" && !f) throw new Error("no preview open");
if (f) { await f.evaluate(() => document.scrollingElement.scrollTo(0, 0)); await sleep(600); }
const rec = await startRecording(ctx, page, dir, { scale: 0.6, quality: PASS === "raw" ? 55 : 62 });
ev("start"); ev("dims", { w: W, h: H, dpr: DPR });
async function scrollTo(target, dur) {
  const t0 = now(); let cur = await f.evaluate(() => document.scrollingElement.scrollTop); const from = cur;
  while (now() - t0 < dur) {
    const k = ease(Math.min(1, (now() - t0) / dur)); const want = from + (target - from) * k;
    cur = await f.evaluate(() => document.scrollingElement.scrollTop);
    const d = want - cur; if (Math.abs(d) > 0.5) await page.mouse.wheel(0, d);
    await sleep(16);
  }
}
try {
  if (PASS === "raw") {
    ev("scene", { name: "raw" }); await sleep(400);
    for (let i = 0; i < 150; i++) { await page.keyboard.press("ArrowUp"); await sleep(2200 / 150 - 6 + (i > 120 ? (i - 120) * 0.5 : 0)); }   // fast scroll up, slowing slightly
    await sleep(400);
    await snap(ctx, page, `${S}/shots/v-raw-end.png`);
  } else {
    const vh = await f.evaluate(() => innerHeight);
    const pos = await f.evaluate(() => { const top = (e) => e.getBoundingClientRect().top + document.scrollingElement.scrollTop; const h2 = [...document.querySelectorAll("h2")]; const grid = document.querySelector('[class*="grid"]');
      const find = (s) => top(h2.find((h) => h.textContent.includes(s)));
      return { grid: grid ? top(grid) : 500, time: find("Where the time"), chart: find("Measured"), table: find("Projection per") }; });
    console.log(pos, "vh", vh);
    ev("scene", { name: "title" }); await snap(ctx, page, `${S}/shots/v-title.png`); await sleep(2300);
    ev("scene", { name: "cards" }); await scrollTo(pos.grid - vh * 0.30, 1.2); await snap(ctx, page, `${S}/shots/v-cards.png`); await sleep(1300);
    ev("scene", { name: "diagram" }); await scrollTo(pos.time - 120, 1.2); await snap(ctx, page, `${S}/shots/v-diagram.png`); await sleep(500); await scrollTo(pos.time + 20, 1.2); await sleep(500);
    ev("scene", { name: "chart" }); await scrollTo(pos.chart - 120, 1.3); await snap(ctx, page, `${S}/shots/v-chart.png`); await sleep(1700);
    ev("scene", { name: "table" }); await scrollTo(pos.table - 120, 1.3); await snap(ctx, page, `${S}/shots/v-table.png`); await sleep(700);
    const dur = 1.8, ts = now();
    ev("scene", { name: "slide" });
    for (;;) {
      const k = Math.min(1, (now() - ts) / dur);
      await f.evaluate((k) => { let e = [...document.querySelectorAll("table")].pop(); while (e && e.scrollWidth <= e.clientWidth + 2) e = e.parentElement; if (e) e.scrollLeft = (e.scrollWidth - e.clientWidth) * k; }, ease(k));
      if (k >= 1) break; await sleep(16);
    }
    await sleep(900); await snap(ctx, page, `${S}/shots/v-end.png`);
  }
} catch (e) { console.error("FAIL", e); await snap(ctx, page, `${S}/shots/v-failure.png`).catch(() => {}); process.exitCode = 1; }
ev("stop");
const n = await rec.stop();
writeFileSync(`${dir}/events.json`, JSON.stringify(events));
console.log("frames", n, "size", W, H, DPR);
await browser.close();
