// Drives the real VS Code window through the storyboard while recording its renderer with a CDP
// screencast. Writes frames + events.json (mouse track, clicks, subtitles, zoom targets, speed
// changes, scene markers) into $B_SCRATCH/take. Run through run.sh.
import { writeFileSync, readFileSync } from "node:fs";
import { connect, studioFrame, sleep, startRecording, snap, S } from "./lib.mjs";

const { browser, ctx, page } = await connect();
await sleep(1500);
const events = [];
const now = () => Date.now() / 1000;
const ev = (type, data = {}) => events.push({ t: now(), type, ...data });
let mx = 700, my = 400;

const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
async function moveTo(x, y, dur = 0.7) {
  const x0 = mx, y0 = my, steps = Math.max(2, Math.round(dur * 60));
  const t0 = now();
  for (let i = 1; i <= steps; i++) {
    const k = ease(i / steps);
    mx = x0 + (x - x0) * k; my = y0 + (y - y0) * k;
    await page.mouse.move(mx, my);
    ev("m", { x: mx, y: my });
    const wait = t0 + (i / steps) * dur - now();
    if (wait > 0) await sleep(wait * 1000);
  }
}
async function click(opts = {}) {
  ev("click", { x: mx, y: my });
  await page.mouse.down(opts); await sleep(60); await page.mouse.up(opts);
}
async function dblclick() { await click(); await sleep(70); ev("click", { x: mx, y: my }); await page.mouse.dblclick(mx, my); }
const sub = (text) => ev("sub", { text });
const scene = (name) => { if (process.env.STOP_BEFORE === name) throw new Error("stop before " + name); ev("scene", { name }); };
const speed = (f) => ev("speed", { f });
const cut = (on) => ev("cut", { on });
/** Zoom target in window css px; null = whole window. */
const zoom = (rect, follow = 0.35) => ev("zoom", { rect, follow });
const frameOf = async () => { for (let i = 0; i < 40; i++) { const f = await studioFrame(page); if (f) return f; await sleep(250); } throw new Error("no studio frame"); };
async function centerOf(loc, dx = 0.5, dy = 0.5) {
  await loc.scrollIntoViewIfNeeded().catch(() => {});
  const b = await loc.boundingBox();
  if (!b) throw new Error("no box " + loc);
  return { x: b.x + b.width * dx, y: b.y + b.height * dy, b };
}
async function clickLoc(loc, { dx = 0.5, dy = 0.5, dur = 0.7 } = {}) {
  const c = await centerOf(loc, dx, dy);
  await moveTo(c.x, c.y, dur); await click(); return c;
}
const rectOf = async (loc, pad = 40) => { const b = await loc.boundingBox(); return { x: b.x - pad, y: b.y - pad, w: b.width + 2 * pad, h: b.height + 2 * pad }; };
async function typeSlow(text, delay = 55) { await page.keyboard.type(text, { delay }); }
async function wheel(dy, over, steps = 30, dur = 1.2) {
  await page.mouse.move(over.x, over.y); mx = over.x; my = over.y;
  for (let i = 0; i < steps; i++) { await page.mouse.wheel(0, dy / steps); await sleep(dur * 1000 / steps); }
}
async function settle(max = 6000) {
  const t0 = Date.now();
  while (Date.now() - t0 < max) {
    const f = await studioFrame(page);
    const saving = f ? await f.getByText("Saving Markdown").count().catch(() => 0) : 0;
    if (!saving) return; await sleep(150);
  }
}
async function saveFile() {
  // Cmd+S needs the focus on the text editor: click into the source, then save (retry until clean).
  await settle();
  for (let attempt = 0; attempt < 3; attempt++) {
    const src = page.locator(".editor-instance .monaco-editor").first();
    const b = await src.boundingBox();
    await moveTo(b.x + 260, b.y + b.height * 0.5, 0.7); await click();
    await sleep(300);
    await page.keyboard.press("Control+Alt+s");
    await sleep(900);
    if (await page.locator(".tab.dirty").count() === 0) return;
  }
}
async function done() {
  let f = await frameOf();
  const btn = f.getByRole("button", { name: "Done" });
  await clickLoc(btn, { dur: 0.8 });
  for (let i = 0; i < 10; i++) { await sleep(250); if (await btn.count() === 0) return; }
  await page.keyboard.press("Meta+Enter");
  await sleep(600);
}
const FULL = () => zoom(null);
const shot = async (n) => snap(ctx, page, `${S}/shots/${n}.png`).catch(() => {});
import { mkdirSync } from "node:fs";
mkdirSync(`${S}/shots`, { recursive: true });

const rec = await startRecording(ctx, page, `${S}/take`);
ev("start");
const dims = rec.size; // css w,h,dpr
ev("dims", { w: dims[0], h: dims[1], dpr: dims[2] });
const W = dims[0], H = dims[1];
try {
  // ---- Scene 2: open the file, open the preview -------------------------------------------
  scene("preview"); FULL();
  sub("Open any Markdown file");
  await moveTo(W * 0.45, H * 0.4, 0.6); await sleep(500);
  const previewBtn = page.locator('.editor-actions a[aria-label*="Preview"]').first();
  zoom({ x: W * 0.55, y: 0, w: W * 0.45, h: H * 0.3 });
  sub("Click Open Preview to Side");
  await clickLoc(previewBtn, { dur: 0.9 });
  let f = await frameOf();
  await sleep(1800);
  FULL();
  sub("The styled page appears next to your source");
  await sleep(1400);
  // close the explorer and the source tab: the page gets the whole window
  await clickLoc(page.locator(".activitybar .action-item").first(), { dur: 0.7 });
  await sleep(500);
  await sleep(1000);
  f = await frameOf();
  await shot("02-preview");
  const table = f.locator("table").first();
  zoom(await rectOf(table, 60));
  sub("Front matter becomes a table, prose becomes a page");
  await moveTo(W * 0.5, H * 0.45, 0.8);
  await sleep(1800);
  const paraBox = await f.locator("p").first().boundingBox();
  zoom({ x: paraBox.x - 40, y: paraBox.y - 120, w: paraBox.width + 80, h: (paraBox.width + 80) * H / W });
  await wheel(260, { x: W * 0.5, y: H * 0.6 }, 24, 1.0);
  await sleep(900);

  // ---- Scene 3: edit where you read ---------------------------------------------------------
  scene("edit"); FULL();
  sub("Edit where you read: switch on Edit mode");
  const toggle = f.locator("[data-sphinx-preview-edit-toggle]");
  zoom(await rectOf(toggle, 90));
  await clickLoc(toggle, { dur: 0.9 });
  await sleep(700);
  const p2 = f.locator("p", { hasText: "This review explains" }).first();
  await p2.scrollIntoViewIfNeeded();
  await sleep(300);
  zoom(await rectOf(p2, 50));
  sub("Click a paragraph and type");
  const pb = await p2.boundingBox();
  await moveTo(pb.x + pb.width * 0.9, pb.y + pb.height * 0.85, 0.9); await click();
  await sleep(700);
  await page.keyboard.press("Meta+ArrowDown");
  speed(1.8);
  await typeSlow(" We measured every stage with the same clock.", 38);
  speed(1);
  await settle(); await sleep(900);
  sub("Done: the page, the source and the file stay in step");
  await done();
  await settle(); await sleep(1100);
  await shot("3b-done");
  // second edit on the same paragraph: bold the first words with Cmd+B
  f = await frameOf();
  const p2b = f.locator("p", { hasText: "This review explains" }).first();
  zoom(await rectOf(p2b, 50));
  sub("Bold with Cmd+B");
  const pbb = await p2b.boundingBox();
  await moveTo(pbb.x + pbb.width * 0.4, pbb.y + pbb.height * 0.5, 0.8); await click();
  await sleep(700);
  await page.keyboard.press("Meta+ArrowUp");
  await page.keyboard.down("Shift");
  for (let i = 0; i < 2; i++) { await page.keyboard.press("Alt+ArrowRight"); await sleep(160); }
  await page.keyboard.up("Shift");
  await sleep(600);
  await page.keyboard.press("Meta+b");
  await sleep(600); await settle(); await sleep(800);
  await shot("3c-bold");
  await done();
  await settle(); await sleep(1000);
  sub("Save, and the file on disk is up to date");
  await saveFile();
  await sleep(1500);
  console.log("saved1:", readFileSync(`${S}/demo-workspace/depot-review.md`, "utf8").includes("same clock"));
  shot("03-edit");

  // ---- Scene 4: slash menu --------------------------------------------------------------------
  scene("slash"); 
  f = await frameOf();
  const p3 = f.locator("p", { hasText: "The savings add up" }).first();
  await p3.scrollIntoViewIfNeeded();
  await sleep(400);
  zoom(await rectOf(p3, 60));
  sub("Type / for the command menu");
  const p3b = await p3.boundingBox();
  await moveTo(p3b.x + p3b.width * 0.85, p3b.y + p3b.height * 0.8, 0.8); await click();
  await sleep(600);
  await page.keyboard.press("Meta+ArrowDown");
  await page.keyboard.press("Enter");
  await sleep(300);
  await typeSlow("/", 80);
  await sleep(900);
  const ids = await f.locator("[data-slash-id]").evaluateAll((e) => e.map((x) => x.getAttribute("data-slash-id")));
  writeFileSync(`${S}/slash-ids.json`, JSON.stringify(ids));
  shot("04-slash");
  zoom({ x: pb.x - 20, y: p3b.y - 60, w: 800, h: 450 });
  await typeSlow("note", 120);
  await sleep(900);
  shot("04-slash2");
  await page.keyboard.press("Enter");
  await sleep(500);
  sub("Pick a block: a callout, a table, a figure");
  await sleep(700);
  speed(1.6);
  await typeSlow("Chargers are the next bottleneck.", 40);
  speed(1);
  await sleep(700);
  shot("04-slash3");
  await done();
  await sleep(900);
  await saveFile();
  await sleep(1200);
  console.log("saved2:", readFileSync(`${S}/demo-workspace/depot-review.md`, "utf8").includes("[!NOTE]"));
  // the source tab is clean now: close it, the page gets the whole window again
  FULL();
  const srcClose = page.locator('.tab[aria-label="depot-review.md"] .codicon-close, .tab[aria-label="depot-review.md"] .action-label').first();
  await clickLoc(srcClose, { dur: 0.8 });
  await sleep(1000);
  console.log("tabs after close:", await page.locator(".tab").count(), "dirty", await page.locator(".tab.dirty").count());
  await shot("04-closed");
  // leave Edit mode
  FULL();
  await clickLoc(toggle, { dur: 0.9 });
  await sleep(900);

  // ---- Scene 5: MyST cards and tabs -----------------------------------------------------------
  scene("myst");
  f = await frameOf();
  const card = f.locator(".sd-card, .sphinx-preview-card, [class*=card]").first();
  const heading = f.locator("h2", { hasText: "Tooling" }).first();
  await heading.scrollIntoViewIfNeeded();
  await sleep(500);
  const hb = await heading.boundingBox();
  zoom({ x: hb.x - 40, y: hb.y - 30, w: 820, h: 820 * H / W });
  sub("MyST cards and tabs render live: switch a tab with a click");
  await sleep(1400);
  const tabs0 = 0;
  const tabs = f.locator('[role="tab"], label.sd-tab-label, .sd-tab-label');
  const nTabs = await tabs.count();
  console.log("tabs", nTabs);
  if (nTabs >= 3) {
    await clickLoc(tabs.nth(1)); await sleep(1100);
    await clickLoc(tabs.nth(2)); await sleep(1100);
    await clickLoc(tabs.nth(0)); await sleep(700);
  }
  shot("05-myst");

  // ---- Scene 6: diagrams and charts -------------------------------------------------------------
  scene("diagrams");
  const chart = f.locator(".myst-vega-figure").first();
  await chart.scrollIntoViewIfNeeded().catch(() => {});
  await sleep(900);
  const cbx = await chart.boundingBox();
  zoom({ x: cbx.x - 60, y: cbx.y - 40, w: cbx.width + 120, h: (cbx.width + 120) * H / W });
  sub("Vega-Lite charts render in place");
  await moveTo(cbx.x + cbx.width * 0.55, cbx.y + cbx.height * 0.5, 0.9);
  await sleep(1800);
  const mer = f.locator(".myst-mermaid-figure").first();
  await mer.scrollIntoViewIfNeeded().catch(() => {});
  await sleep(900);
  const mbx = await mer.boundingBox();
  zoom({ x: mbx.x - 60, y: mbx.y - 40, w: mbx.width + 120, h: (mbx.width + 120) * H / W });
  sub("and so do Mermaid diagrams");
  await moveTo(mbx.x + mbx.width * 0.5, mbx.y + mbx.height * 0.5, 0.9);
  await sleep(2000);
  shot("06-diagrams");

  // ---- Scene 7: review ------------------------------------------------------------------------------
  scene("review");
  f = await frameOf();
  // re-render so the block line mapping is fresh after the edits
  FULL();
  await clickLoc(f.locator("[data-sphinx-preview-toolbar] button[title='Refresh preview']"), { dur: 0.8 });
  await sleep(2200);
  f = await frameOf();
  const pr = f.locator("p", { hasText: "Three months ago" }).first();
  await pr.scrollIntoViewIfNeeded();
  await sleep(500);
  zoom(await rectOf(pr, 60));
  sub("Review: select a phrase and comment");
  const word = await pr.evaluate((el) => {
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      const i = n.data.indexOf("Dispatch");
      if (i >= 0) { const r = document.createRange(); r.setStart(n, i); r.setEnd(n, i + 8); const b = r.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; }
    }
  });
  const fo = await (await f.frameElement()).boundingBox();
  await moveTo(fo.x + word.x, fo.y + word.y, 0.9);
  await dblclick();
  await sleep(700);
  const createBtn = f.locator("[data-okf-comment-create]");
  await createBtn.waitFor({ state: "visible", timeout: 5000 });
  await clickLoc(createBtn, { dur: 0.6 });
  await sleep(600);
  speed(1.4);
  await typeSlow("Which dashboard do they use?", 45);
  speed(1);
  await sleep(500);
  await shot("07a-typed");
  await page.keyboard.press("Meta+Enter");
  await sleep(1300);
  await shot("07b-created");
  f = await frameOf();
  const mark = f.locator("mark[data-okf-comment-thread]").first();
  await sleep(2500);
  console.log("diag", await f.evaluate(() => ({ marks: document.querySelectorAll("mark").length, markAttrs: [...document.querySelectorAll("mark")].map((m) => [...m.attributes].map((a) => a.name).join(",")), badge: document.querySelectorAll("[data-okf-comment-badge]").length, toggle: document.querySelector("[data-sphinx-preview-comments-toggle]")?.outerHTML.slice(0, 200), threads: document.querySelectorAll("[data-okf-comment-thread]").length })));
  if (await mark.count() === 0) {
    console.log("mark missing: refreshing the preview");
    await f.locator("[data-sphinx-preview-toolbar] button[title='Refresh preview']").click();
    await sleep(2500);
    f = await frameOf();
    console.log("after refresh marks", await f.locator("mark").count(), "badges", await f.locator("[data-okf-comment-badge]").count());
  }
  await mark.waitFor({ state: "attached", timeout: 8000 });
  sub("The thread opens on the phrase, stored beside the document");
  await clickLoc(mark, { dur: 0.7 });
  await sleep(2200);
  shot("07-review");
  await page.keyboard.press("Escape");
  await sleep(500);

  // ---- Scene 8: navigation, toolbar, theme -------------------------------------------------------
  scene("navigation"); FULL();
  sub("Navigate with the outline and the toolbar");
  f = await frameOf();
  const more = f.locator('[data-sphinx-preview-toolbar] button[title="Show view controls"]');
  if (await more.count()) { await clickLoc(more, { dur: 0.8 }); await sleep(900); }
  const tocBtn = f.locator("[data-sphinx-preview-toc-toggle]").first();
  if (await tocBtn.count()) {
    zoom(await rectOf(f.locator("[data-sphinx-preview-toolbar]"), 80));
    await sleep(900);
    await clickLoc(tocBtn, { dur: 0.8 });
    await sleep(1300);
    shot("08-toc");
    FULL();
    const entry = f.locator("[data-sphinx-preview-toc] a").nth(3);
    if (await entry.count()) { await clickLoc(entry, { dur: 0.8 }); await sleep(1200); }
  }
  sub("Switch the theme: Cream to Dark");
  const themeBtn = f.locator("[data-sphinx-preview-theme-toggle]");
  zoom(await rectOf(f.locator("[data-sphinx-preview-toolbar]"), 80));
  for (let i = 0; i < 4; i++) {
    await clickLoc(themeBtn, { dur: 0.7 });
    await sleep(1100);
    const mode = await f.locator("html").getAttribute("data-sphinx-preview-theme-mode");
    console.log("theme", mode);
    if (mode === "dark") break;
  }
  FULL();
  await moveTo(W * 0.6, H * 0.5, 0.8);
  await sleep(1800);
  shot("08-dark");
  scene("end");
  await sleep(300);
} catch (e) {
  console.error("SCENE FAILURE", e);
  await shot("failure");
  process.exitCode = 1;
}
ev("stop");
const n = await rec.stop();
writeFileSync(`${S}/take/events.json`, JSON.stringify(events));
console.log("frames", n, "events", events.length);
await browser.close();
