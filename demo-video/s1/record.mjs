// S1 take: wide VS Code window, source of plan.md, click "Open Preview to the Side", slow scroll.
// Records a CDP screencast + events.json (cursor track, clicks, markers) into $S_SCRATCH/take.
import { writeFileSync, mkdirSync } from "node:fs";
import { connect, studioFrame, sleep, startRecording, snap, S } from "./lib.mjs";

const { browser, ctx, page } = await connect();
await sleep(1500);
const events = [];
const now = () => Date.now() / 1000;
const ev = (type, data = {}) => events.push({ t: now(), type, ...data });
let mx = 1100, my = 640;
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
// Wide view: hide the explorer so the two editors share the whole window.
await page.mouse.click(520, 266); await sleep(300);
if (await page.locator(".part.sidebar:visible").count()) { await page.keyboard.press("Control+Alt+b"); await sleep(700); }
await page.mouse.move(mx, my);
const rec = await startRecording(ctx, page, `${S}/take`);
ev("start");
const d = await page.evaluate(() => [innerWidth, innerHeight, devicePixelRatio]);
ev("dims", { w: d[0], h: d[1], dpr: d[2] });
try {
  ev("scene", { name: "source" });
  await sleep(2800);
  const btn = page.locator('.editor-actions a[aria-label*="Preview"]').first();
  const b = await btn.boundingBox();
  await moveTo(b.x + b.width / 2, b.y + b.height / 2, 1.5);
  await sleep(350);
  ev("click", { x: mx, y: my });
  await page.mouse.down(); await sleep(60); await page.mouse.up();
  ev("scene", { name: "clicked" });
  await sleep(150);
  await moveTo(d[0] * 0.78, d[1] * 0.62, 1.1);
  let f;
  for (let i = 0; i < 60 && !f; i++) { f = await studioFrame(page); if (!f) await sleep(250); }
  if (!f) throw new Error("no preview");
  await f.locator("svg").first().waitFor({ timeout: 15000 }).catch(() => {});
  await sleep(700);
  ev("scene", { name: "ready" });
  await snap(ctx, page, `${S}/shots/ready.png`);
  // slow scroll over the preview, centre of its pane
  const fe = await (await f.frameElement()).boundingBox();
  const ox = fe.x + fe.width / 2, oy = fe.y + fe.height * 0.6;
  const mv = Promise.resolve();
  const total = await f.evaluate(() => { const e = document.scrollingElement; return e.scrollHeight - e.clientHeight; });
  console.log("scrollable", total);
  ev("scene", { name: "scroll" });
  const secs = 5.8, steps = 174, per = Math.min(total, 1550) / steps;
  for (let i = 0; i < steps; i++) { await page.mouse.wheel(0, per); await sleep(secs * 1000 / steps); }
  await mv;
  await sleep(600);
  await snap(ctx, page, `${S}/shots/end.png`);
} catch (e) { console.error("FAIL", e); await snap(ctx, page, `${S}/shots/failure.png`).catch(() => {}); process.exitCode = 1; }
ev("stop");
const n = await rec.stop();
writeFileSync(`${S}/take/events.json`, JSON.stringify(events));
console.log("frames", n);
await browser.close();
