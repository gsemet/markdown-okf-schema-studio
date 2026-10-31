#!/usr/bin/env node
// QA driver for Markdown OKF-Schema Studio: launches an isolated VS Code window and
// drives it through CDP with real mouse/keyboard input. See ../SKILL.md for the command list.
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { createRequire } from "node:module";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { asExpression, asPageExpression, bufferDiff, cap, doctor, freshSpy, lineDiff, listWindows, loadScenario, runSteps, saveMark, setEditMode } from "./engine.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
// scripts/ -> skill -> skills -> .agents -> repository root
const repo = path.resolve(here, "../../../..");
const qaRoot = process.env.QA_ROOT ?? path.join(repo, "output/qa/markdown-studio-claude");
const extensionRoot = repo;
const require = createRequire(path.join(extensionRoot, "package.json"));
const { chromium } = require("playwright-core");
const runsDir = path.join(qaRoot, "runs");
const codeExe = "/Applications/Visual Studio Code.app/Contents/MacOS/Code";

const REPEATABLE = new Set(["annotate", "note", "color", "var"]);

// Exported for the scratch checks of the parser. `--key=value` splits at the first `=` only, so
// `--var=t=a=b` keeps `t=a=b`; quote a value with spaces (`--var 't=3. Quoted'`).
export function args(argv) {
  const positional = [];
  const options = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token.startsWith("--")) {
      const eq = token.indexOf("=");
      const key = eq < 0 ? token.slice(2) : token.slice(2, eq);
      const inline = eq < 0 ? undefined : token.slice(eq + 1);
      let value = true;
      if (inline !== undefined) value = inline;
      else if (argv[i + 1] !== undefined && !argv[i + 1].startsWith("--")) value = argv[++i];
      // Repeatable options keep every value (in order); all others keep the last one.
      options[key] = REPEATABLE.has(key) ? [...(options[key] ?? []), value] : value;
    } else positional.push(token);
  }
  // `--frame` is an alias of `--which` (the webview index printed by `q frames`).
  if (options.frame !== undefined && options.which === undefined) options.which = options.frame;
  return { positional, options };
}

// `--var k=v` pairs (repeatable) to an object; the value keeps any further `=` and spaces.
export function varPairs(list) {
  return Object.fromEntries([].concat(list ?? []).filter((pair) => typeof pair === "string").map((pair) => {
    const eq = pair.indexOf("=");
    return eq < 0 ? [pair, ""] : [pair.slice(0, eq), pair.slice(eq + 1)];
  }));
}

function currentSession(name) {
  // QA_SESSION lets parallel charter agents each drive their own window without racing on `current`.
  const sessionName = name ?? process.env.QA_SESSION ?? fs.readFileSync(path.join(runsDir, "current"), "utf8").trim();
  const file = path.join(runsDir, sessionName, "session.json");
  return { file, session: JSON.parse(fs.readFileSync(file, "utf8")) };
}

async function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

async function launch(options) {
  const name = options.name ?? `s${Date.now()}`;
  const dir = path.join(runsDir, name);
  fs.mkdirSync(dir, { recursive: true });
  const target = options.workspace ?? path.join(qaRoot, options.ws ? `ws-${options.ws}` : "ws");
  if (!options.noTarget && !fs.existsSync(target)) throw new Error(`Workspace ${target} is missing: run scripts/setup-workspace.sh first.`);
  // The IPC socket path must stay under 103 chars on macOS, so the profile lives in TMPDIR.
  const userData = options.userData ?? fs.mkdtempSync(path.join(fs.realpathSync(process.env.TMPDIR ?? "/tmp"), "msq-"));
  const extDir = path.join(userData, "ext");
  const spyOut = path.join(dir, "spy");
  const shots = path.join(dir, "shots");
  for (const d of [userData, extDir, spyOut, shots]) fs.mkdirSync(d, { recursive: true });
  fs.mkdirSync(path.join(userData, "User"), { recursive: true });
  const settings = {
    "security.workspace.trust.enabled": options.untrusted ? true : false,
    "window.restoreWindows": options.restore ? "all" : "none",
    "workbench.startupEditor": "none",
    "workbench.colorTheme": options.theme === "light" ? "Default Light Modern" : "Default Dark Modern",
    "update.mode": "none",
    "extensions.autoUpdate": false,
    "telemetry.telemetryLevel": "off",
    "workbench.tips.enabled": false,
    "chat.disableAIFeatures": true,
    "editor.minimap.enabled": false,
    "window.commandCenter": false,
    "workbench.enableExperiments": false,
    "git.enabled": false,
    "window.dialogStyle": "custom",
    "window.menuStyle": "custom",
    ...(options.settings ? JSON.parse(fs.readFileSync(options.settings, "utf8")) : {}),
  };
  if (!fs.existsSync(path.join(userData, "User", "settings.json")) || options.resetSettings) {
    fs.writeFileSync(path.join(userData, "User", "settings.json"), JSON.stringify(settings, null, 2));
  }
  const port = await freePort();
  const argv = [
    `--user-data-dir=${userData}`,
    `--extensions-dir=${extDir}`,
    `--extensionDevelopmentPath=${extensionRoot}`,
    `--extensionDevelopmentPath=${path.join(here, "spy")}`,
    `--remote-debugging-port=${port}`,
    "--remote-debugging-address=127.0.0.1",
    "--skip-welcome",
    "--skip-release-notes",
    "--disable-telemetry",
    "--new-window",
    ...(options.noTarget ? [] : [target]),
    ...(options.file ? [options.file] : []),
  ];
  const log = fs.openSync(path.join(dir, "vscode.log"), "a");
  const child = spawn(codeExe, argv, {
    detached: true,
    stdio: ["ignore", log, log],
    env: { ...process.env, QA_SPY_OUT: spyOut, VSCODE_CLI: undefined, ELECTRON_RUN_AS_NODE: undefined },
  });
  child.unref();
  const session = { name, dir, port, pid: child.pid, userData, spyOut, shots, target, startedAt: new Date().toISOString() };
  fs.writeFileSync(path.join(dir, "session.json"), JSON.stringify(session, null, 2));
  fs.writeFileSync(path.join(runsDir, "current"), name);
  // Wait for the workbench page.
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      const targets = await res.json();
      if (targets.some((t) => t.type === "page" && /workbench/.test(t.url))) break;
    } catch {}
    await delay(300);
  }
  await delay(2500);
  const { browser, page } = await connect(session);
  if (options.width || options.height) await resize(browser, page, Number(options.width ?? 1440), Number(options.height ?? 900));
  console.log(JSON.stringify(session));
}

async function connect(session) {
  const browser = await chromium.connectOverCDP(`http://127.0.0.1:${session.port}`);
  const pages = browser.contexts().flatMap((c) => c.pages());
  const page = pages.find((p) => /workbench/.test(p.url())) ?? pages[0];
  if (!page) throw new Error("No workbench page");
  return { browser, page };
}

async function resize(browser, page, width, height) {
  // Electron does not implement Browser.setWindowBounds; emulate the viewport instead.
  const cdp = await page.context().newCDPSession(page);
  if (!width) await cdp.send("Emulation.clearDeviceMetricsOverride");
  else await cdp.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
  await delay(400);
}

async function previewFrames(page) {
  const frames = [];
  for (const frame of page.frames()) {
    try {
      if (await frame.locator("#sphinx-myst-preview-content, .sphinx-preview-status, [data-sphinx-preview-status]").count()) {
        let visible = true;
        for (let ancestor = frame; ancestor?.parentFrame(); ancestor = ancestor.parentFrame()) {
          const element = await ancestor.frameElement();
          if (!(await element.isVisible())) { visible = false; break; }
        }
        frames.push({ frame, visible });
      }
    } catch {}
  }
  return frames;
}

async function previewFrame(page, which) {
  const frames = await previewFrames(page);
  const visible = frames.filter((f) => f.visible);
  const list = visible.length ? visible : frames;
  if (!list.length) throw new Error("No preview frame found");
  return list[Math.min(Number(which ?? 0), list.length - 1)].frame;
}

async function notifications(page) {
  return page.$$eval(".notifications-toasts .notification-toast, .notification-list-item", (items) =>
    items.map((item) => item.innerText.replace(/\s+/g, " ").trim()).filter(Boolean));
}

function readSpy(session) {
  try {
    return JSON.parse(fs.readFileSync(path.join(session.spyOut, "state.json"), "utf8"));
  } catch { return undefined; }
}

// Default: JPEG at CSS scale, downsized to 1000 px (`px` to change). `clip` is "preview" (the visible webview),
// "x,y,w,h", or a selector inside the preview. `png: true` keeps a full-fidelity PNG.
async function shot(page, session, name, options = {}) {
  session ??= currentSession().session;
  const png = options.png === true || options.png === "true";
  const base = name.replace(/\.(png|jpe?g)$/, "");
  const file = path.join(session.shots, `${base}.${png ? "png" : "jpg"}`);
  const shotOptions = { path: file, scale: "css", ...(png ? {} : { type: "jpeg", quality: 70 }) };
  if (options.clip) shotOptions.clip = await resolveClip(page, session, options.clip, options.annotate ? 34 : 12, options.which ?? options.frame ?? 0);
  const clearOverlay = () => page.evaluate(() => document.querySelectorAll("#qa-annotations").forEach((e) => e.remove()));
  try {
    const bounds = shotOptions.clip ?? await page.evaluate(() => ({ x: 0, y: 0, width: innerWidth, height: innerHeight }));
    const notes = await annotations(session, page, options, bounds);
    await clearOverlay();
    if (notes.length) for (const w of await drawAnnotations(page, notes, bounds)) console.error(`annotate: ${w}`);
    await page.screenshot(shotOptions);
  } finally {
    await clearOverlay();
  }
  if (!png) spawnSync("sips", ["-Z", String(options.px ?? 1000), file], { stdio: "ignore" });
  return file;
}

const overlaps = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

// Annotations: `annotate` (selector in the preview, or "x,y,w,h" in window CSS px), `note` and `color`
// (red = defect, the default; green = expected/working case). From the CLI they are repeatable and
// pair by position: the nth --note and --color go with the nth --annotate (a single --color applies
// to all). From `q run`/scenarios pass strings or {at, note, color} objects. Boxes are taken now (same
// scroll as the shot) and printed, one line each. An empty box is an error; a box outside the shot
// (`bounds`) or, for a selector, outside the visible preview is a warning.
async function annotations(session, page, options, bounds) {
  const list = [].concat(options.annotate ?? []);
  if (list.includes(true)) throw new Error("annotate: --annotate needs a selector or x,y,w,h");
  const notes = [].concat(options.note ?? []);
  const colors = [].concat(options.color ?? []);
  for (const c of colors) if (c !== "red" && c !== "green") console.error(`annotate: unknown color ${c} (red or green); using red`);
  if (notes.includes(true)) throw new Error("annotate: --note needs a text");
  if (notes.length > list.length || (colors.length > 1 && colors.length !== list.length)) {
    console.error(`annotate: ${list.length} --annotate but ${notes.length} --note and ${colors.length} --color: they pair by position`);
  }
  const visible = list.length ? (await webviewInfo(session, page)).filter((f) => f.visible) : [];
  const view = visible.length ? pickFrame(visible, options.which ?? 0) : undefined;
  const out = [];
  for (const [i, item] of list.entries()) {
    const a = typeof item === "object" && !Array.isArray(item) ? item : { at: item, note: notes[i], color: colors.length === 1 ? colors[0] : colors[i] };
    const at = Array.isArray(a.at) ? a.at.join(",") : String(a.at);
    const coords = /^\d+(\.\d+)?(,\d+(\.\d+)?){3}$/.test(at);
    let box;
    if (coords) { const [x, y, w, h] = at.split(",").map(Number); box = { x, y, w, h }; }
    else box = await wv(session, page, `box(D.querySelector(${JSON.stringify(at)}))`, options.which ?? 0);
    if (!box) throw new Error(`annotate: element not found: ${at}`);
    if (!box.w || !box.h) throw new Error(`annotate: ${at} has an empty box (hidden or collapsed)`);
    const rect = { x: box.x, y: box.y, width: box.w, height: box.h };
    if (!overlaps(rect, bounds)) console.error(`annotate: ${at} is outside the shot clip`);
    else if (!coords && view && !overlaps(rect, view)) console.error(`annotate: ${at} is outside the visible preview (scrolled away?)`);
    out.push({ ...box, at, note: a.note ?? "", color: a.color === "green" ? "#1e8c32" : "#c81e1e" });
    console.log(`annotate ${at} -> x=${box.x} y=${box.y} w=${box.w} h=${box.h}${a.note ? ` "${a.note}"` : ""}`);
  }
  return out;
}

// Overlay in the workbench page (window CSS px), so the shot's own clip and scale apply to it: no
// manual window -> image pixel conversion. Labels are measured once attached, then tried outside
// their outline above, then below, else inside its top-right corner. The first spot inside `bounds`
// that touches no other frame or label wins; if none does, the label goes above, with a warning.
// Returns the warnings.
async function drawAnnotations(page, notes, bounds) {
  return page.evaluate(({ items, b }) => {
    const m = 4;
    const root = document.createElement("div");
    root.id = "qa-annotations";
    root.style.cssText = "position:fixed;inset:0;z-index:2147483647;pointer-events:none";
    document.body.append(root);
    const hit = (p, q) => p.x < q.x + q.w && q.x < p.x + p.w && p.y < q.y + q.h && q.y < p.y + p.h;
    const frames = items.map((n) => ({ x: n.x - m, y: n.y - m, w: n.w + 2 * m, h: n.h + 2 * m }));
    for (const [i, n] of items.entries()) {
      const f = frames[i];
      const el = document.createElement("div");
      el.style.cssText = `position:fixed;box-sizing:border-box;border:3px solid ${n.color};left:${f.x}px;top:${f.y}px;width:${f.w}px;height:${f.h}px`;
      root.append(el);
    }
    const placed = [...frames];
    const warnings = [];
    for (const [i, n] of items.entries()) {
      if (!n.note) continue;
      const f = frames[i];
      const label = document.createElement("div");
      label.textContent = n.note;
      label.style.cssText = `position:fixed;max-width:360px;padding:2px 6px;font:600 13px/1.3 sans-serif;color:#fff;background:${n.color}`;
      root.append(label);
      const { width: w, height: h } = label.getBoundingClientRect();
      const left = Math.max(b.x, Math.min(f.x, b.x + b.width - w));
      const spots = [{ x: left, y: f.y - h - 2 }, { x: left, y: f.y + f.h + 2 }, { x: Math.max(b.x, f.x + f.w - w - 4), y: f.y + 4 }];
      const free = (s) => s.y >= b.y && s.y + h <= b.y + b.height && s.x + w <= b.x + b.width + 0.5
        && !placed.some((r) => r !== f && hit({ x: s.x, y: s.y, w, h }, r));
      const spot = spots.find(free);
      if (!spot) warnings.push(`label of ${n.at} overlaps another annotation or leaves the shot`);
      const { x, y } = spot ?? spots[0];
      label.style.left = `${x}px`;
      label.style.top = `${y}px`;
      placed.push({ x, y, w, h });
    }
    return warnings;
  }, { items: notes, b: bounds });
}

async function resolveClip(page, session, clip, pad = 12, which = 0) {
  if (Array.isArray(clip)) { const [x, y, width, height] = clip.map(Number); return { x, y, width, height }; }
  if (/^\d+,\d+,\d+,\d+$/.test(clip)) { const [x, y, width, height] = clip.split(",").map(Number); return { x, y, width, height }; }
  if (clip === "preview") {
    const visible = (await webviewInfo(session, page)).filter((f) => f.visible);
    if (!visible.length) throw new Error("clip preview: no visible webview");
    const frame = pickFrame(visible, which);
    return { x: frame.x, y: frame.y, width: frame.width, height: frame.height };
  }
  const b = await wv(session, page, `box(D.querySelector(${JSON.stringify(clip)}))`, which);
  if (!b) throw new Error(`clip: element not found: ${clip}`);
  return { x: Math.max(0, b.x - pad), y: Math.max(0, b.y - pad), width: b.w + 2 * pad, height: b.h + 2 * pad };
}

// --- Raw CDP access to webview content (Playwright does not attach pre-existing OOPIFs). ---
// Every webview iframe of the workbench, in DOM order, with its CDP target. A target is matched by
// its URL, else by the webview `id` query parameter (the URL can change after the frame loads).
// Visible frames get `index`: the number that `--frame`/`--which` and the `which` step field take.
async function webviewInfo(session, page) {
  const res = await fetch(`http://127.0.0.1:${session.port}/json/list`);
  const targets = (await res.json()).filter((t) => t.type === "iframe" && t.url.startsWith("vscode-webview://"));
  const frames = await page.evaluate(() => Array.from(document.querySelectorAll("iframe.webview")).map((f) => {
    const r = f.getBoundingClientRect();
    const style = getComputedStyle(f);
    const hidden = r.width === 0 || r.height === 0 || style.visibility === "hidden" || style.display === "none"
      || f.closest("[style*='display: none']") !== null;
    return { src: f.src, x: r.x, y: r.y, width: r.width, height: r.height, visible: !hidden };
  }));
  const idOf = (url) => { try { return new URL(url).searchParams.get("id"); } catch { return null; } };
  const used = new Set();
  const out = [];
  for (const f of frames) {
    const target = targets.find((t) => !used.has(t.id) && t.url === f.src)
      ?? targets.find((t) => !used.has(t.id) && idOf(t.url) && idOf(t.url) === idOf(f.src));
    if (!target) continue;
    used.add(target.id);
    let purpose = null;
    try { purpose = new URL(f.src).searchParams.get("purpose"); } catch {}
    out.push({ ...f, purpose, target });
  }
  let index = 0;
  for (const f of out) if (f.visible) f.index = index++;
  return out;
}

// `which`: the index among visible webviews (as `q frames` prints it), or `left` / `right`.
function pickFrame(list, which = 0) {
  if (which === "left" || which === "right") {
    const sorted = [...list].sort((a, b) => a.x - b.x);
    return which === "left" ? sorted[0] : sorted.at(-1);
  }
  const n = Number(which);
  if (!Number.isInteger(n) || n < 0 || n >= list.length) {
    throw new Error(`webview ${which} is not visible: ${list.length} visible (q frames lists them)`);
  }
  return list[n];
}

async function rawEval(wsUrl, expression) {
  const socket = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = () => reject(new Error("ws error")); });
  const result = await new Promise((resolve, reject) => {
    socket.onmessage = (event) => {
      const message = JSON.parse(String(event.data));
      if (message.id === 1) message.error ? reject(new Error(message.error.message)) : resolve(message.result);
    };
    socket.send(JSON.stringify({ id: 1, method: "Runtime.evaluate", params: { expression, returnByValue: true, awaitPromise: true } }));
  });
  socket.close();
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
  return result.result.value;
}

async function wv(session, page, body, which = 0) {
  const all = await webviewInfo(session, page);
  const list = all.filter((f) => f.visible);
  if (!list.length) throw new Error("No VISIBLE webview found (" + all.length + " hidden)");
  const frame = pickFrame(list, which);
  const expression = `(async () => { const F = document.getElementById('active-frame'); const D = F && F.contentDocument; const W = F && F.contentWindow;
    const OFF = F ? F.getBoundingClientRect() : {x:0,y:0}; const BASE = {x: ${frame.x} + OFF.x, y: ${frame.y} + OFF.y};
    const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return {x: Math.round(BASE.x + r.x), y: Math.round(BASE.y + r.y), w: Math.round(r.width), h: Math.round(r.height)}; };
    return (${body}
    ); })()`;
  return rawEval(frame.target.webSocketDebuggerUrl, expression);
}

const helpers = { webviewInfo, rawEval, delay, previewFrame, previewFrames, notifications, readSpy, shot, resize, lineDiff, freshSpy, saveMark, bufferDiff, cap, runSteps, setEditMode };

function shortPath(session, file) {
  return session.target && file.startsWith(session.target) ? path.relative(session.target, file) : file;
}

// One line per item instead of the full JSON state (pass --json for that).
function spyBrief(session, state) {
  const lines = [`spy ${Math.round((Date.now() - Date.parse(state.at)) / 1000)}s old`];
  const a = state.activeEditor;
  lines.push(a ? `active: ${shortPath(session, decodeURIComponent(a.uri.replace(/^file:\/\//, "")))} sel L${a.selection[0]}:${a.selection[1]}-L${a.selection[2]}:${a.selection[3]} visible ${a.visible.map((r) => r.join("-")).join(",")} col ${a.viewColumn}` : "active: none");
  for (const group of state.tabs) {
    lines.push(`group ${group.viewColumn}${group.isActive ? "*" : ""}: ${group.tabs.map((t) => `${t.isActive ? "[" : ""}${t.label}${t.isDirty ? " ●" : ""} (${t.kind}${t.viewType ? `:${t.viewType.replace(/^mainThreadWebview-/, "")}` : ""})${t.isActive ? "]" : ""}`).join(" | ")}`);
  }
  lines.push(`docs: ${state.documents.map((d) => `${shortPath(session, d.fsPath)} v${d.version}${d.isDirty ? " dirty" : ""}${d.eol === "CRLF" ? " CRLF" : ""} ${d.lineCount}L`).join("; ")}`);
  return lines.join("\n");
}

// One line per VS Code window of an isolated profile (main process per --user-data-dir, helpers
// excluded), named after its session when one matches, then the total against the 2-3 budget.
async function sessions() {
  const known = fs.readdirSync(runsDir, { withFileTypes: true }).filter((e) => e.isDirectory())
    .map((e) => { try { return JSON.parse(fs.readFileSync(path.join(runsDir, e.name, "session.json"), "utf8")); } catch { return null; } })
    .filter(Boolean);
  const real = (p) => { try { return fs.realpathSync(p); } catch { return p; } };
  const windows = listWindows();
  for (const w of windows) {
    const s = known.find((k) => real(k.userData) === real(w.userData));
    let pages = "?";
    if (s) {
      try {
        const targets = await (await fetch(`http://127.0.0.1:${s.port}/json/list`, { signal: AbortSignal.timeout(1500) })).json();
        pages = String(targets.filter((t) => t.type === "page" && /workbench/.test(t.url)).length);
      } catch {}
    }
    console.log(`${s ? s.name : "(no session)"} pid ${w.pid} workbench pages ${pages} profile ${w.userData}${s ? ` ws ${path.basename(s.target ?? "")}` : ""}`);
  }
  console.log(`windows: ${windows.length} (budget 2-3 across all Drivers)${windows.length > 3 ? " OVER BUDGET: q stop some" : ""}`);
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const { positional, options } = args(rest);
  if (command === "launch") return launch(options);
  fs.mkdirSync(runsDir, { recursive: true });
  if (command === "sessions") return sessions();
  if (command === "use") {
    if (!fs.existsSync(path.join(runsDir, positional[0] ?? "", "session.json"))) throw new Error(`Unknown session ${positional[0]}`);
    fs.writeFileSync(path.join(runsDir, "current"), positional[0]);
    console.log("current session:", positional[0]);
    return;
  }
  const { session } = currentSession(options.session);
  if (command === "stop") {
    // VS Code may ignore SIGTERM (for example with dirty buffers): escalate, then verify.
    const alive = () => { try { process.kill(session.pid, 0); return true; } catch { return false; } };
    for (const signal of ["SIGTERM", "SIGKILL"]) {
      try { process.kill(-session.pid, signal); } catch {}
      try { process.kill(session.pid, signal); } catch {}
      for (let i = 0; i < 25 && alive(); i += 1) await delay(200);
      if (!alive()) break;
    }
    console.log(alive() ? `still running: ${session.pid}` : `stopped ${session.name}`);
    return;
  }
  if (command === "spy") {
    const state = await freshSpy(readSpy, session);
    if (!state) throw new Error("no spy state: is the spy extension loaded? (q doctor)");
    if (options.mark) { console.log(`marked ${saveMark(session, state, options.mark)}`); return; }
    if (options.diff) {
      const d = bufferDiff(session, state, options.diff, options.against ?? "disk", { maxLines: Number(options.lines ?? 40) });
      if (d.error) throw new Error(d.error);
      console.log(`${options.diff} vs ${options.against ?? "disk"}: ${d.changed ? `-${d.removed} +${d.added} at L${d.firstLine}` : "unchanged"}${d.dirty ? ", dirty" : ""}, v${d.version}`);
      if (d.text) console.log(d.text);
      return;
    }
    if (options.text) {
      // Prefer --diff: the whole buffer of a chapter is tens of kilobytes of context.
      const doc = state.documents.find((d) => d.fsPath.endsWith(options.text));
      if (!doc) { console.log("(no doc)"); return; }
      const [from, to] = String(options.lines ?? "").split("-").map(Number);
      const text = from ? doc.text.split("\n").slice(from - 1, to || from + 40).join("\n") : doc.text;
      process.stdout.write(options.full ? text : cap(text, Number(options.max ?? 4000)));
      process.stdout.write("\n");
      return;
    }
    if (options.json) console.log(cap({ ...state, documents: state.documents.map(({ text, ...d }) => d) }, options.full ? 0 : Number(options.max ?? 4000)));
    else console.log(spyBrief(session, state));
    return;
  }
  if (command === "doctor") {
    console.log(await doctor({ session, repo, extensionRoot, here, readSpy }));
    return;
  }
  const { browser, page } = await connect(session);
  const max = options.full ? 0 : Number(options.max ?? 2000);
  const out = (value) => console.log(cap(value, max));
  const ctx = {
    page, session, options, out, readSpy, delay,
    wv: (body, which) => wv(session, page, body, which),
    shot: (name, shotOptions = {}) => shot(page, session, name, shotOptions),
    notifications: () => notifications(page),
  };
  const pause = Number(options.wait ?? 600);
  try {
    switch (command) {
      case "shot": out(await shot(page, session, positional[0] ?? `shot-${Date.now()}`, options)); break;
      case "resize": await resize(browser, page, Number(positional[0]), Number(positional[1])); out("ok"); break;
      case "click":
      case "dblclick": {
        const [x, y] = positional.map(Number);
        if (command === "click") await page.mouse.click(x, y, { button: options.right ? "right" : "left", clickCount: Number(options.count ?? 1) });
        else await page.mouse.dblclick(x, y);
        await delay(pause);
        if (options.shot) out(await shot(page, session, options.shot, options));
        break;
      }
      case "move": await page.mouse.move(Number(positional[0]), Number(positional[1]), { steps: 5 }); await delay(pause); if (options.shot) out(await shot(page, session, options.shot, options)); break;
      case "drag": {
        const [x1, y1, x2, y2] = positional.map(Number);
        await page.mouse.move(x1, y1); await page.mouse.down(); await page.mouse.move(x2, y2, { steps: 12 }); await page.mouse.up();
        await delay(pause); if (options.shot) out(await shot(page, session, options.shot, options)); break;
      }
      case "wheel": {
        const [x, y, dy] = positional.map(Number);
        await page.mouse.move(x, y);
        const steps = Number(options.steps ?? 1);
        for (let i = 0; i < steps; i += 1) { await page.mouse.wheel(0, dy / steps); await delay(30); }
        await delay(pause); if (options.shot) out(await shot(page, session, options.shot, options)); break;
      }
      case "key": {
        for (const chord of positional) { await page.keyboard.press(chord); await delay(Number(options.gap ?? 120)); }
        await delay(pause); if (options.shot) out(await shot(page, session, options.shot, options)); break;
      }
      case "type": {
        const text = positional.join(" ").replace(/\\n/g, "\n");
        await page.keyboard.type(text, { delay: Number(options.delay ?? 35) });
        await delay(pause); if (options.shot) out(await shot(page, session, options.shot, options)); break;
      }
      case "insert": { await page.keyboard.insertText(positional.join(" ").replace(/\\n/g, "\n")); await delay(pause); if (options.shot) out(await shot(page, session, options.shot, options)); break; }
      case "palette": {
        await page.keyboard.press("Meta+Shift+P"); await delay(400);
        await page.keyboard.type(positional.join(" "), { delay: 10 }); await delay(500);
        await page.keyboard.press("Enter"); await delay(Number(options.wait ?? 1500));
        if (options.shot) out(await shot(page, session, options.shot, options)); break;
      }
      case "open": {
        await page.keyboard.press("Meta+P"); await delay(400);
        await page.keyboard.type(positional.join(" "), { delay: 10 }); await delay(900);
        await page.keyboard.press("Enter"); await delay(Number(options.wait ?? 1200));
        if (options.shot) out(await shot(page, session, options.shot, options)); break;
      }
      case "frames": {
        // Visible webviews first, with the index that --frame/--which takes; hidden ones after.
        const all = await webviewInfo(session, page);
        const id = (f) => { try { return new URL(f.src).searchParams.get("id")?.slice(0, 8) ?? ""; } catch { return ""; } };
        const line = (f) => `${f.visible ? `[${f.index}]` : "[hidden]"} x=${Math.round(f.x)} y=${Math.round(f.y)} ${Math.round(f.width)}x${Math.round(f.height)} id=${id(f)}${f.purpose ? ` ${f.purpose}` : ""}`;
        out(options.json ? all : [...all.filter((f) => f.visible), ...all.filter((f) => !f.visible)].map(line).join("\n") || "no webview");
        break;
      }
      case "box": {
        const sel = JSON.stringify(positional[0]);
        out(await wv(session, page, `Array.from(D.querySelectorAll(${sel})).slice(0, ${Number(options.limit ?? 10)}).map((el, i) => ({ i, ...box(el), text: (el.innerText || el.value || '').slice(0, ${Number(options.chars ?? 70)}).replace(/\\s+/g, ' ') }))`, options.which ?? 0));
        break;
      }
      case "clicksel": {
        const sel = JSON.stringify(positional[0]);
        const b = await wv(session, page, `box(D.querySelectorAll(${sel})[${Number(options.nth ?? 0)}])`, options.which ?? 0);
        if (!b) throw new Error("element not found: " + positional[0]);
        if (!b.w || !b.h) throw new Error(`${positional[0]} has an empty box (collapsed toolbar? click button[aria-label='Show view controls'] first)`);
        const x = b.x + (options.dx !== undefined ? Number(options.dx) : b.w / 2);
        const y = b.y + (options.dy !== undefined ? Number(options.dy) : Math.min(b.h / 2, 12));
        if (options.dbl) await page.mouse.dblclick(x, y); else await page.mouse.click(x, y);
        await delay(pause);
        out({ clicked: [Math.round(x), Math.round(y)] });
        if (options.shot) out(await shot(page, session, options.shot, options));
        break;
      }
      case "feval": out(await wv(session, page, asExpression(positional.join(" ")), options.which ?? 0)); break;
      case "peval": out(await page.evaluate(asPageExpression(positional.join(" ")))); break;
      case "seq": {
        // Several actions in one CDP connection (quick picks close when reconnecting).
        for (const step of positional) {
          const [kind, ...restParts] = step.split(":");
          const arg = restParts.join(":");
          if (kind === "key") await page.keyboard.press(arg);
          else if (kind === "type") await page.keyboard.type(arg.replace(/\\n/g, "\n"), { delay: 25 });
          else if (kind === "wait") await delay(Number(arg));
          else if (kind === "click") { const [x, y] = arg.split(",").map(Number); await page.mouse.click(x, y); }
          else if (kind === "dbl") { const [x, y] = arg.split(",").map(Number); await page.mouse.dblclick(x, y); }
          else if (kind === "shot") out(await shot(page, session, arg));
          else if (kind === "rows") out(await page.evaluate(() => Array.from(document.querySelectorAll(".quick-input-list .monaco-list-row")).map((r) => r.getAttribute("aria-label")).slice(0, 12)));
          else if (kind === "pick") {
            // Click the quick-pick row whose label contains arg.
            const rows = page.locator(".quick-input-list .monaco-list-row");
            const count = await rows.count();
            let done = false;
            for (let i = 0; i < count && !done; i += 1) {
              const label = await rows.nth(i).getAttribute("aria-label");
              if (label && label.includes(arg)) { const b = await rows.nth(i).boundingBox(); await page.mouse.click(b.x + 20, b.y + b.height / 2); done = true; }
            }
            if (!done) out("pick not found: " + arg);
          }
          else throw new Error("unknown step " + step);
          await delay(120);
        }
        break;
      }
      case "notifs": out(await notifications(page)); break;
      case "scenario": {
        // q scenario FILE.json [--file synth/x.md] [--var k=v] [--keep-going]
        const file = path.isAbsolute(positional[0]) ? positional[0]
          : fs.existsSync(path.resolve(positional[0])) ? path.resolve(positional[0]) : path.join(here, "..", "scenarios", positional[0]);
        const overrides = varPairs(options.var);
        if (options.file) overrides.file = options.file;
        const scenario = loadScenario(file.endsWith(".json") ? file : `${file}.json`, overrides);
        const result = await runSteps(ctx, scenario.steps, { name: scenario.name, vars: scenario.vars, keepGoing: Boolean(options["keep-going"]) });
        const dir = path.join(session.dir, "scenarios");
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, `${scenario.name}-${Date.now()}.json`), JSON.stringify(result, null, 1));
        break;
      }
      case "check": {
        // q check '<json step or array>' [--since SECONDS] : run oracles without actions.
        const parsed = JSON.parse(positional.join(" "));
        const startIso = new Date(Date.now() - Number(options.since ?? 120) * 1000).toISOString();
        await runSteps(ctx, [].concat(parsed), { name: "check", vars: options.file ? { file: options.file } : {}, startIso, keepGoing: true });
        break;
      }
      case "run": {
        const script = path.isAbsolute(positional[0]) ? positional[0]
          : fs.existsSync(path.resolve(positional[0])) ? path.resolve(positional[0]) : path.join(here, positional[0]);
        const mod = await import(script);
        await mod.default({ page, browser, session, options, positional: positional.slice(1), out, ctx, wv: (body, which) => wv(session, page, body, which), ...helpers });
        break;
      }
      default: throw new Error(`Unknown command ${command}`);
    }
  } finally {
    // Disconnect only; never close the VS Code window.
    browser._connection?.close?.();
  }
}

// Run only as the CLI, so the scratch checks can import args() and varPairs().
if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then(() => process.exit(0), (error) => { console.error(error?.stack ?? String(error)); process.exit(1); });
}
