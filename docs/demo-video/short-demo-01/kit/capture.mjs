// Records the panels of the storyboard from a real VS Code window with a CDP screencast.
// Writes frames, frames.json and events.json (mouse track, clicks, panel marks, zoom rects).
import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
const require = createRequire(process.env.DEMO_NODE_ROOT + "/package.json");
const { chromium } = require("playwright-core");
const S = process.env.DEMO_SCRATCH, PORT = 9344, DOC = "checkout-outage.md";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const env = { ...process.env };
for (const k of Object.keys(env)) if (/^(VSCODE_|ELECTRON_|__CFBundle)/.test(k)) delete env[k];
const child = spawn("/Applications/Visual Studio Code.app/Contents/MacOS/Code", [
  "--force-device-scale-factor=2", "--disable-updates", "--skip-welcome", "--skip-release-notes", "--disable-workspace-trust", "--new-window",
  `--remote-debugging-port=${PORT}`, "--remote-debugging-address=127.0.0.1",
  `--user-data-dir=${S}/vscode-user`, `--extensions-dir=${S}/vscode-ext`,
  `${S}/demo-workspace`, `${S}/demo-workspace/${DOC}`,
], { stdio: "ignore", env, detached: true });
child.unref();

let browser, page, ctx;
for (let i = 0; i < 40 && !page; i++) {
  try {
    browser = await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`);
    ctx = browser.contexts()[0];
    page = ctx.pages().find((p) => p.url().includes("workbench"));
  } catch { /* the window is still starting */ }
  if (!page) await sleep(1000);
}
if (!page) throw new Error("no workbench page");
await page.waitForSelector(".monaco-workbench .part.editor", { timeout: 60000 });
await sleep(6000);

mkdirSync(`${S}/shots`, { recursive: true });
const snap = async (name) => {
  const c = await ctx.newCDPSession(page);
  const r = await c.send("Page.captureScreenshot", { format: "png" });
  await writeFile(`${S}/shots/${name}.png`, Buffer.from(r.data, "base64"));
  await c.detach();
};
const frameOf = async () => {
  for (let i = 0; i < 60; i++) {
    for (const f of page.frames()) {
      try { if (await f.locator("#sphinx-myst-preview-content").count()) return f; } catch { /* detached */ }
    }
    await sleep(250);
  }
  throw new Error("no preview frame");
};

const events = [];
const now = () => Date.now() / 1000;
const ev = (type, data = {}) => events.push({ t: now(), type, ...data });
const panel = (id) => { console.log("panel", id); ev("panel", { id }); };
const close = () => ev("close");
const mark = (id, rect) => ev("mark", { id, rect });
const unmark = (id) => ev("unmark", { id });
const zoom = (id, rect) => ev("zoom", { id, rect });
let mx = 900, my = 420;
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
async function moveTo(x, y, dur = 0.7) {
  const x0 = mx, y0 = my, steps = Math.round(dur * 60), t0 = now();
  for (let i = 1; i <= steps; i++) {
    const k = ease(i / steps);
    mx = x0 + (x - x0) * k; my = y0 + (y - y0) * k;
    await page.mouse.move(mx, my);
    ev("m", { x: mx, y: my });
    const wait = t0 + (i / steps) * dur - now();
    if (wait > 0) await sleep(wait * 1000);
  }
}
async function click() {
  ev("click", { x: mx, y: my });
  await page.mouse.down(); await sleep(60); await page.mouse.up();
}
const box = async (loc) => { const b = await loc.boundingBox(); if (!b) throw new Error("no box " + loc); return b; };
const clickLoc = async (loc, dur = 0.7) => { const b = await box(loc); await moveTo(b.x + b.width / 2, b.y + b.height / 2, dur); await click(); return b; };
const union = (a, b, pad = 24) => {
  const x = Math.min(a.x, b.x) - pad, y = Math.min(a.y, b.y) - pad;
  return { x, y, w: Math.max(a.x + a.width, b.x + b.width) + pad - x, h: Math.max(a.y + a.height, b.y + b.height) + pad - y };
};
// The rectangle of a text inside an element, in the coordinates of its own document.
const textIn = (loc, text) => loc.evaluate((el, wanted) => {
  const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let t = w.nextNode(); t; t = w.nextNode()) {
    const i = t.data.replaceAll("\u00a0", " ").indexOf(wanted);
    if (i >= 0) { const g = document.createRange(); g.setStart(t, i); g.setEnd(t, i + wanted.length); const b = g.getBoundingClientRect(); return { x: b.x, y: b.y, width: b.width, height: b.height }; }
  }
  throw new Error("no text " + wanted);
}, text);
const grow = (r, by = 5) => ({ x: r.x - by, y: r.y - by, w: r.width + 2 * by, h: r.height + 2 * by });
const shift = (r, o) => ({ ...r, x: r.x + o.x, y: r.y + o.y });
// Wheels the pane under the cursor by dy, with an eased speed, in dur seconds.
async function wheel(dy, dur) {
  const steps = Math.max(2, Math.round(dur * 40)), t0 = now();
  let done = 0;
  for (let i = 1; i <= steps; i++) {
    const target = dy * (0.5 - 0.5 * Math.cos(Math.PI * i / steps));
    const d = Math.round(target - done);
    if (d) { await page.mouse.wheel(0, d); done += d; }
    const wait = t0 + (i / steps) * dur - now();
    if (wait > 0) await sleep(wait * 1000);
  }
}
// Brings loc to the given height of the window.
const scrollTo = async (loc, top, dur) => { const b = await box(loc); await wheel(b.y - top, dur); };

// Maximises or restores the preview group; the tab click gives the group the focus the key needs.
async function pageFills(full, f) {
  for (let i = 0; i < 5; i++) {
    const w = (await (await f.frameElement()).boundingBox()).width;
    if ((w > W * 0.8) === full) return;
    await page.locator(".tab", { hasText: "Studio" }).first().click();
    await sleep(300);
    await page.keyboard.press("Control+Alt+m");
    await sleep(1200);
  }
  throw new Error("the preview group did not change size");
}

await page.locator(".part.sidebar").isVisible().then(async (v) => { if (v) { await page.keyboard.press("Meta+b"); await sleep(600); } });

rmSync(`${S}/take`, { recursive: true, force: true });
mkdirSync(`${S}/take`, { recursive: true });
const cdp = await ctx.newCDPSession(page);
const size = await page.evaluate(() => [innerWidth, innerHeight, devicePixelRatio]);
const [W, H] = size;
console.log("size", size);
const frames = [], pending = [];
let n = 0;
cdp.on("Page.screencastFrame", (e) => {
  const i = ++n;
  frames.push({ n: i, t: e.metadata.timestamp });
  pending.push(writeFile(`${S}/take/f_${String(i).padStart(6, "0")}.jpg`, Buffer.from(e.data, "base64")));
  cdp.send("Page.screencastFrameAck", { sessionId: e.sessionId }).catch(() => {});
});
await cdp.send("Page.startScreencast", { format: "jpeg", quality: 90, maxWidth: Math.round(W * size[2]), maxHeight: Math.round(H * size[2]), everyNthFrame: 1 });
ev("start");
try {
  // Panel 2: the raw Markdown in the built-in text editor, alone in the window.
  await page.locator(".editor-instance .monaco-editor").first().click({ position: { x: 300, y: 200 } });
  await moveTo(W * 0.6, H * 0.5, 0.3);
  panel(2);
  await sleep(600);
  for (let i = 0; i < 16; i++) { await page.keyboard.press("Control+PageDown"); await sleep(190); }
  await sleep(300);
  close();
  await page.keyboard.press("Meta+ArrowUp");
  await sleep(600);

  // Panel 3: the switch to the extension, beside the same text.
  panel(3);
  await sleep(200);
  await clickLoc(page.locator('.editor-actions a[aria-label*="Preview"]').first(), 0.9);
  let f = await frameOf();
  await f.locator(".myst-radio").first().waitFor({ timeout: 15000 });
  await moveTo(W * 0.74, H * 0.55, 0.6);
  await sleep(2300);
  await snap("03-switch");
  close();


  const more = f.locator('[data-sphinx-preview-toolbar] button[title="Show view controls"]');
  const widthButton = f.locator("[data-sphinx-preview-width-toggle]");
  const toggle = f.locator("[data-sphinx-preview-edit-toggle]");
  const feBox = await (await f.frameElement()).boundingBox();
  const fe = feBox;
  const overPage = () => moveTo(W * 0.78, H * 0.6, 0.2);
  // The source line that holds a text; Monaco writes spaces as non-breaking spaces.
  const sourceLine = (text) => page.locator(".view-line", { hasText: text }).first();
  const inPage = async (loc, text) => grow(shift(await textIn(loc, text), fe));
  const inSource = async (text, part = text) => grow(await textIn(sourceLine(text), part));

  // Panel 4: page and text scroll together.
  panel(4);
  await overPage();
  await wheel(520, 2.6);
  await sleep(400);
  close();
  await wheel(-3000, 0.3);
  await sleep(700);

  // Panel 5: switch to Edit, change one word of the summary; the source line follows.
  panel(5);
  await clickLoc(toggle, 0.7);
  await sleep(500);
  const summary = f.locator("p", { hasText: "one checkout in" }).first();
  const sb = await box(summary);
  await moveTo(sb.x + sb.width * 0.5, sb.y + sb.height * 0.3, 0.6);
  await click();
  await sleep(500);
  const area = f.locator("textarea:visible").first();
  const spot = (word, line = 0) => area.evaluate((el, [wanted, row]) => {
    const c = getComputedStyle(el), g = document.createElement("canvas").getContext("2d");
    g.font = c.font;
    const lines = el.value.split("\n");
    const before = lines[row].slice(0, lines[row].indexOf(wanted));
    const b = el.getBoundingClientRect(), h = parseFloat(c.lineHeight);
    return { x: b.x + parseFloat(c.paddingLeft) + g.measureText(before).width + g.measureText(wanted).width / 2, y: b.y + parseFloat(c.paddingTop) + h * (row + 0.5) };
  }, [word, line]);
  const w4 = await spot("four");
  await moveTo(fe.x + w4.x, fe.y + w4.y, 0.5);
  ev("click", { x: mx, y: my });
  await page.mouse.dblclick(mx, my);
  await sleep(300);
  await page.keyboard.type("three", { delay: 90 });
  await sleep(400);
  await clickLoc(f.getByRole("button", { name: "Done" }), 0.5);
  await sleep(800);
  mark(5, await inPage(f.locator("p", { hasText: "one checkout in" }).first(), "three"));
  mark(5, await inSource("one checkout in", "three"));
  await sleep(1000);
  await snap("05-word");
  close();

  // Panel 6: edit one cell of the table.
  await overPage();
  panel(6);
  await scrollTo(f.locator("h2", { hasText: "Impact by service" }), 150, 1.0);
  await sleep(300);
  const cell = f.locator("td", { hasText: "Pool raised" }).first();
  await clickLoc(cell, 0.6);
  await sleep(500);
  await snap("06-open");
  await page.keyboard.press("End");
  await page.keyboard.type(" to 200", { delay: 90 });
  await sleep(400);
  await snap("06-typed");
  await clickLoc(f.getByRole("button", { name: "Done" }).first(), 0.5);
  await sleep(900);
  mark(6, await inPage(f.locator("td", { hasText: "Pool raised to 200" }).first(), "to 200"));
  mark(6, await inSource("to 200"));
  await sleep(1000);
  await snap("06-cell");
  close();

  // Panel 7: type in the raw text; the diagram follows.
  await overPage();
  await scrollTo(f.locator("h2", { hasText: "Timeline" }), 130, 0.4);
  await sleep(900);
  await snap("07-before");
  panel(7);
  const retry = await box(sourceLine("Retry at once"));
  await moveTo(retry.x + 330, retry.y + retry.height / 2, 0.8);
  await click();
  await sleep(250);
  await page.keyboard.press("End");
  await sleep(250);
  await page.keyboard.type(" (no backoff)", { delay: 110 });
  await sleep(1200);
  mark(7, grow(await box(f.locator(".myst-mermaid-diagram, .myst-mermaid-figure").first())));
  mark(7, await inSource("no backoff"));
  await sleep(1200);
  await snap("07-typed");
  close();

  // Panel 8: change a number in the raw text; the chart redraws at once.
  await overPage();
  await scrollTo(f.locator("h2", { hasText: "Error rate" }), 130, 0.4);
  await sleep(900);
  await snap("08-before");
  panel(8);
  const peak = await textIn(sourceLine("errors: 31"), "31");
  await moveTo(peak.x + peak.width / 2, peak.y + peak.height / 2, 0.8);
  await sleep(200);
  ev("click", { x: mx, y: my });
  await page.mouse.dblclick(mx, my);
  await sleep(350);
  await page.keyboard.type("44", { delay: 350 });
  await sleep(900);
  mark(8, grow(await box(f.locator(".myst-vega-diagram").first())));
  mark(8, await inSource("errors: 44", "44"));
  await sleep(1400);
  await snap("08-chart");
  close();

  // Panel 9: the highlighted lines of the code block change in the raw text.
  await toggle.click();
  await sleep(1000);
  await overPage();
  await scrollTo(f.locator("h2", { hasText: "Root cause" }), 130, 0.4);
  await sleep(900);
  // An edit in the raw text moves both panes: one happens before the panel, so that the shot is still.
  { const l = await textIn(sourceLine("emphasize-lines"), ":emphasize"); await page.mouse.click(l.x + l.width / 2, l.y + l.height / 2); }
  await page.keyboard.press("End");
  await page.keyboard.type(" ");
  await sleep(500);
  await page.keyboard.press("Backspace");
  await sleep(1500);
  await moveTo(W * 0.3, H * 0.3, 0.2);
  await sleep(500);
  await snap("09-before");
  panel(9);
  const lines = await textIn(sourceLine("emphasize-lines"), "3-5");
  await moveTo(lines.x + lines.width + 2, lines.y + lines.height / 2, 0.8);
  await sleep(200);
  ev("click", { x: mx, y: my });
  await page.mouse.click(mx, my);
  await page.keyboard.press("End");
  for (let i = 0; i < 3; i++) await page.keyboard.press("Shift+ArrowLeft");
  await sleep(350);
  await page.keyboard.type("2-6", { delay: 350 });
  await sleep(900);
  mark(9, grow(await box(f.locator("pre", { hasText: "def charge" }).first())));
  mark(9, await inSource("emphasize-lines", "2-6"));
  await sleep(1400);
  await snap("09-code");
  close();

  // Panel 10: the decision moves the x in the file.
  const radio = f.locator(".myst-radio").nth(1);
  const item = f.locator(".myst-radio-item").nth(1);
  await overPage();
  await scrollTo(item, 420, 0.4);
  await sleep(1000);
  panel(10);
  await sleep(300);
  await clickLoc(radio, 0.9);
  await sleep(400);
  mark(10, grow(await box(radio).then((b) => ({ x: b.x - 2, y: b.y - 2, width: b.width + 4, height: b.height + 4 }))));
  mark(10, await inSource("Circuit breaker", "(x)"));
  await moveTo(mx + 260, my + 110, 0.5);
  await sleep(1800);
  await snap("10-decision");
  close();

  // The page takes the whole window for the feature panels.
  await pageFills(true, f);
  await moveTo(W * 0.9, H * 0.5, 0.2);
  await wheel(-8000, 0.3);
  await sleep(500);

  // Panel 11: a value the OKF schema refuses, fixed from the list the schema allows.
  const file = `${S}/demo-workspace/${DOC}`;
  writeFileSync(file, readFileSync(file, "utf8").replace("severity: SEV-1", "severity: SEV-9"));
  await sleep(2500);
  await toggle.click();
  await sleep(900);
  await moveTo(W * 0.62, H * 0.62, 0.2);
  await sleep(300);
  const badge = f.locator("[data-okf-badge]");
  const value = f.locator('tr[data-okf-field="severity"] [data-okf-value-cell]');
  const table = f.locator("table").first();
  panel(11);
  { const b = await box(table), h = await box(f.locator("h1").first()); zoom(11, union(await box(badge), { x: b.x, y: b.y, width: b.width, height: h.y + h.height - b.y }, 20)); }
  mark(11, grow(await box(badge), 3));
  mark(11, grow(await box(value), 1));
  await sleep(1300);
  await snap("11-invalid");
  await clickLoc(value, 0.7);
  await sleep(700);
  await snap("11-open");
  unmark(11);
  await f.locator("select:visible").first().selectOption("SEV-1");
  await sleep(500);
  { const b = await box(table); await moveTo(b.x - 70, b.y + b.height * 0.5, 0.4); await page.mouse.down(); await page.mouse.up(); }
  await sleep(1000);
  mark(11, grow(await box(value), 1));
  await sleep(1000);
  await snap("11-valid");
  console.log("badges", await badge.count());
  close();
  await toggle.click();
  await sleep(900);
  await moveTo(W * 0.9, H * 0.5, 0.2);
  await scrollTo(f.locator("h2", { hasText: "Impact by service" }), 500, 0.3);
  await sleep(700);

  // Panel 12: slow scroll to the wide table, cramped in the column, then Auto lets it out.
  panel(12);
  await scrollTo(f.locator("h2", { hasText: "Impact by service" }), 110, 1.7);
  await sleep(300);
  await snap("12-margin");
  await clickLoc(more, 0.6);
  await sleep(350);
  await clickLoc(widthButton, 0.4);
  await sleep(350);
  const less = f.locator('[data-sphinx-preview-toolbar] button[title="Hide view controls"]');
  if (await less.count()) await clickLoc(less, 0.35);
  await f.evaluate(() => document.activeElement?.blur());
  await moveTo(W * 0.5, H * 0.8, 0.5);
  await sleep(1500);
  await snap("12-auto");
  ev("end");
} catch (e) {
  console.error("FAILED", e);
  await snap("failure").catch(() => {});
  ev("end");
  process.exitCode = 1;
} finally {
  await cdp.send("Page.stopScreencast").catch(() => {});
  await Promise.all(pending);
  writeFileSync(`${S}/take/frames.json`, JSON.stringify({ size, frames }));
  writeFileSync(`${S}/take/events.json`, JSON.stringify(events));
  await browser.close().catch(() => {});
  try { process.kill(child.pid); } catch { /* already gone */ }
}
console.log("frames", frames.length, "secs", frames.at(-1).t - frames[0].t);
