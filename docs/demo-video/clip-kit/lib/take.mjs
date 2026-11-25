// Films a clip from a real VS Code window with a CDP screencast, driven by the clip's scenario.
// Writes frames, frames.json, events.json and verify.json in the take folder.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import { resolveChecks } from "./check.mjs";
import { WINDOW, checkDisplay, cleanEnv, expandChord, killTree, launch, repoRequire, sleep } from "./platform.mjs";
import { resolveVSCode } from "./profile.mjs";

const PORT = Number(process.env.CLIP_PORT || 9344);
const now = () => Date.now() / 1000;
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

/** Starts the window and connects to it: { browser, ctx, page, child }. */
async function openWindow(ctx, code, scale) {
  const { chromium } = repoRequire("playwright-core");
  const args = [
    `--force-device-scale-factor=${scale}`, "--disable-updates", "--skip-welcome", "--skip-release-notes", "--disable-workspace-trust", "--new-window",
    `--remote-debugging-port=${PORT}`, "--remote-debugging-address=127.0.0.1",
    `--user-data-dir=${ctx.user}`, `--extensions-dir=${ctx.extensions}`,
    ctx.workspace, ...ctx.openFiles.map((file) => join(ctx.workspace, file)),
  ];
  const child = launch(code.executable, args, { env: cleanEnv() });
  let browser, page, context;
  for (let attempt = 0; attempt < 60 && !page; attempt++) {
    try {
      browser = await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`);
      context = browser.contexts()[0];
      page = context.pages().find((candidate) => candidate.url().includes("workbench"));
    } catch {
      // the window is still starting
    }
    if (!page) await sleep(1000);
  }
  if (!page) throw new Error("no workbench page: VS Code did not open with the debugging port");
  await page.waitForSelector(".monaco-workbench .part.editor", { timeout: 60000 });
  await sleep(6000);
  return { browser, context, page, child };
}

/** The helpers a scenario gets. */
function makeHelpers(ctx, page, context, events) {
  const ev = (type, data = {}) => events.push({ t: now(), type, ...data });
  let mx = 900;
  let my = 420;
  const helpers = {
    page,
    context,
    sleep,
    ev,
    workspace: ctx.workspace,
    get pointer() { return { x: mx, y: my }; },
    /** Eased, logged move of the pointer. */
    async moveTo(x, y, dur = 0.7) {
      const x0 = mx, y0 = my, steps = Math.max(2, Math.round(dur * 60)), t0 = now();
      for (let i = 1; i <= steps; i++) {
        const k = ease(i / steps);
        mx = x0 + (x - x0) * k;
        my = y0 + (y - y0) * k;
        await page.mouse.move(mx, my);
        ev("m", { x: mx, y: my });
        const wait = t0 + (i / steps) * dur - now();
        if (wait > 0) await sleep(wait * 1000);
      }
    },
    async click() {
      ev("click", { x: mx, y: my });
      await page.mouse.down();
      await sleep(60);
      await page.mouse.up();
    },
    /** A mouse drag from the left edge of the first character of `from` to the right edge of the last character of `to`. */
    async selectText(frame, from, to) {
      const edges = await helpers.textEdges(frame, from, to);
      await helpers.moveTo(edges.from.x, edges.from.y, 0.6);
      ev("click", { x: mx, y: my });
      await page.mouse.down();
      await sleep(80);
      await helpers.moveTo(edges.to.x, edges.to.y, 0.9);
      await sleep(60);
      await page.mouse.up();
    },
    /** The start and end points of a text span in page coordinates (non-breaking spaces normalised). */
    async textEdges(frame, from, to) {
      const offset = await (await frame.frameElement()).boundingBox();
      const edges = await frame.evaluate(([first, last]) => {
        const find = (wanted) => {
          const walker = document.createTreeWalker(document.getElementById("sphinx-myst-preview-content") ?? document.body, NodeFilter.SHOW_TEXT);
          for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            const index = node.data.replaceAll(" ", " ").indexOf(wanted);
            if (index >= 0) return { node, index };
          }
          throw new Error(`no text ${wanted}`);
        };
        const charRect = (node, index) => {
          const range = document.createRange();
          range.setStart(node, index);
          range.setEnd(node, index + 1);
          return range.getClientRects()[0];
        };
        const a = find(first), b = find(last);
        const start = charRect(a.node, a.index), end = charRect(b.node, b.index + last.length - 1);
        return { from: { x: start.left + 0.5, y: start.top + start.height / 2 }, to: { x: end.right - 0.5, y: end.top + end.height / 2 } };
      }, [from, to]);
      return {
        from: { x: offset.x + edges.from.x, y: offset.y + edges.from.y },
        to: { x: offset.x + edges.to.x, y: offset.y + edges.to.y },
      };
    },
    /** The rect of an element of the main page, or of the text of an element when `textOnly`. */
    async rectOf(locator, textOnly = false) {
      if (!textOnly) {
        const box = await locator.boundingBox();
        if (!box) throw new Error("no box");
        return { x: box.x, y: box.y, w: box.width, h: box.height };
      }
      return locator.evaluate((element) => {
        const range = document.createRange();
        range.selectNodeContents(element);
        const rect = range.getBoundingClientRect();
        return { x: rect.x, y: rect.y, w: rect.width, h: rect.height };
      });
    },
    /** A key chord through CDP; `ControlOrMeta` is the platform modifier. Logged with the badge id. */
    async press(chord, badgeId) {
      ev("press", { id: badgeId, chord });
      const keys = expandChord(chord);
      if (process.env.CLIP_KEY_COMMANDS === "1") await helpers.pressWithCommands(keys);
      else await page.keyboard.press(keys);
    },
    /** Fallback: the editing command rides on the key event. */
    async pressWithCommands(keys) {
      const session = await context.newCDPSession(page);
      const parts = keys.split("+");
      const key = parts.at(-1);
      const modifiers = (parts.includes("Control") ? 2 : 0) | (parts.includes("Meta") ? 4 : 0) | (parts.includes("Shift") ? 8 : 0) | (parts.includes("Alt") ? 1 : 0);
      const commands = { c: ["copy"], v: ["paste"], x: ["cut"], a: ["selectAll"] }[key.toLowerCase()];
      const info = { key: key.toLowerCase(), code: `Key${key.toUpperCase()}`, windowsVirtualKeyCode: key.toUpperCase().charCodeAt(0), modifiers };
      await session.send("Input.dispatchKeyEvent", { type: "keyDown", ...info, commands });
      await session.send("Input.dispatchKeyEvent", { type: "keyUp", ...info });
      await session.detach();
    },
    zoom: (id, rect) => ev("zoom", { id, rect }),
    unzoom: (id) => ev("unzoom", { id }),
    mark: (id, rect) => ev("mark", { id, rect }),
    unmark: (id) => ev("unmark", { id }),
    /** Names a moment of the take: `render` writes the picture `frames/<name>.png` of it (a lowercase name, unique). */
    keyFrame: (name) => ev("keyframe", { name }),
    /** The preview frame of Studio. */
    async frameOf() {
      for (let i = 0; i < 60; i++) {
        for (const frame of page.frames()) {
          try {
            if (frame.isDetached()) continue;
            if (await frame.locator("#sphinx-myst-preview-content").count()) return frame;
          } catch {
            // detached
          }
        }
        await sleep(250);
      }
      throw new Error("no preview frame");
    },
    workspaceFile: (name) => readFileSync(join(ctx.workspace, name), "utf8"),
    /** A value for check.json (the reading mode at the start, the paste widget count). */
    notes: {},
    record(key, value) { helpers.notes[key] = value; },
  };
  return helpers;
}

/** Runs the whole take. Throws on any failure, after writing what it can for diagnosis. */
export async function runTake(ctx, scenario) {
  const checks = resolveChecks(scenario.checks); // before the window opens: a wrong declaration costs no take
  const { scale } = checkDisplay();
  const code = await resolveVSCode(ctx);
  // A failed take can never be rendered as a new one.
  rmSync(ctx.take, { recursive: true, force: true });
  rmSync(join(ctx.render, "clip.mp4"), { force: true });
  mkdirSync(ctx.take, { recursive: true });
  cpSync(ctx.hostFile, ctx.takeHostFile); // the host that films this take, frozen: a later setup cannot rewrite it
  mkdirSync(ctx.render, { recursive: true });
  // The stage again, so every take starts from the same files.
  for (const [from, to] of Object.entries(scenario.stage)) cpSync(join(ctx.clipDir, from), join(ctx.workspace, to), { recursive: true });
  ctx.openFiles = scenario.open ?? [];

  const events = [];
  const frames = [];
  const pending = [];
  let window;
  let cdp;
  let failure;
  let size;
  try {
    window = await openWindow(ctx, code, scale);
    const { page, context } = window;
    const t = makeHelpers(ctx, page, context, events);
    size = await page.evaluate(() => [innerWidth, innerHeight, devicePixelRatio]);
    console.log("window", size.join(" x "));
    if (Math.abs(size[0] / size[1] - WINDOW.width / WINDOW.height) > 0.02) throw new Error(`the window is ${size[0]}x${size[1]} CSS pixels, not 16:9`);
    if (await page.locator(".part.sidebar").isVisible()) {
      await page.keyboard.press(`${expandChord("ControlOrMeta")}+b`);
      await sleep(600);
    }
    await scenario.setup(t);

    cdp = await context.newCDPSession(page);
    cdp.on("Page.screencastFrame", (event) => {
      const n = frames.length + 1;
      frames.push({ n, t: event.metadata.timestamp });
      pending.push(writeFile(join(ctx.take, `f_${String(n).padStart(6, "0")}.jpg`), Buffer.from(event.data, "base64")));
      cdp.send("Page.screencastFrameAck", { sessionId: event.sessionId }).catch(() => {});
    });
    await cdp.send("Page.startScreencast", { format: "jpeg", quality: 90, maxWidth: Math.round(size[0] * size[2]), maxHeight: Math.round(size[1] * size[2]), everyNthFrame: 1 });
    for (let i = 0; i < 100 && frames.length === 0; i++) await sleep(50);
    if (frames.length === 0) throw new Error("the screencast gave no frame (a Page.captureScreenshot loop is the fallback of the trial)");
    t.ev("start");
    t.ev("m", { x: t.pointer.x, y: t.pointer.y });
    await scenario.run(t);
    t.ev("end");
    await cdp.send("Page.stopScreencast").catch(() => {});
    await Promise.all(pending);
    const outcome = await scenario.verify(t);
    writeFileSync(join(ctx.take, "verify.json"), JSON.stringify({ passed: true, checks, outcome, notes: t.notes }, null, 2));
    t.finish = true;
  } catch (error) {
    failure = error;
    console.error("FAILED", error);
    try {
      if (window) {
        const shot = await window.page.screenshot({ type: "png" });
        writeFileSync(join(ctx.take, "failure.png"), shot);
      }
    } catch {
      // no picture of the failure
    }
    writeFileSync(join(ctx.take, "verify.json"), JSON.stringify({ passed: false, checks, error: String(error?.message ?? error) }, null, 2));
  } finally {
    if (cdp) await cdp.send("Page.stopScreencast").catch(() => {});
    await Promise.all(pending).catch(() => {});
    writeFileSync(join(ctx.take, "frames.json"), JSON.stringify({ size, frames }));
    writeFileSync(join(ctx.take, "events.json"), JSON.stringify(events));
    if (window) {
      await window.browser.close().catch(() => {});
      killTree(window.child.pid);
    }
  }
  if (failure) throw failure;
  console.log("frames", frames.length, "secs", (frames.at(-1).t - frames[0].t).toFixed(2));
}

export const takeExists = (ctx) => existsSync(join(ctx.take, "frames.json"));
