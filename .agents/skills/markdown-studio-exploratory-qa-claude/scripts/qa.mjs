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
import { bufferDiff, cap, doctor, freshSpy, lineDiff, loadScenario, runSteps, saveMark, setEditMode } from "./engine.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
// scripts/ -> skill -> skills -> .agents -> repository root
const repo = path.resolve(here, "../../../..");
const qaRoot = process.env.QA_ROOT ?? path.join(repo, "output/qa/markdown-studio-claude");
const extensionRoot = repo;
const require = createRequire(path.join(extensionRoot, "package.json"));
const { chromium } = require("playwright-core");
const runsDir = path.join(qaRoot, "runs");
const codeExe = "/Applications/Visual Studio Code.app/Contents/MacOS/Code";

function args(argv) {
  const positional = [];
  const options = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token.startsWith("--")) {
      const [key, inline] = token.slice(2).split("=", 2);
      if (inline !== undefined) options[key] = inline;
      else if (argv[i + 1] !== undefined && !argv[i + 1].startsWith("--")) options[key] = argv[++i];
      else options[key] = true;
    } else positional.push(token);
  }
  return { positional, options };
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
  if (options.clip) shotOptions.clip = await resolveClip(page, session, options.clip);
  await page.screenshot(shotOptions);
  if (!png) spawnSync("sips", ["-Z", String(options.px ?? 1000), file], { stdio: "ignore" });
  return file;
}

async function resolveClip(page, session, clip) {
  if (Array.isArray(clip)) { const [x, y, width, height] = clip.map(Number); return { x, y, width, height }; }
  if (/^\d+,\d+,\d+,\d+$/.test(clip)) { const [x, y, width, height] = clip.split(",").map(Number); return { x, y, width, height }; }
  if (clip === "preview") {
    const frame = (await webviewInfo(session, page)).find((f) => f.visible);
    if (!frame) throw new Error("clip preview: no visible webview");
    return { x: frame.x, y: frame.y, width: frame.width, height: frame.height };
  }
  const b = await wv(session, page, `box(D.querySelector(${JSON.stringify(clip)}))`);
  if (!b) throw new Error(`clip: element not found: ${clip}`);
  const pad = 12;
  return { x: Math.max(0, b.x - pad), y: Math.max(0, b.y - pad), width: b.w + 2 * pad, height: b.h + 2 * pad };
}

// --- Raw CDP access to webview content (Playwright does not attach pre-existing OOPIFs). ---
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
  return frames.map((f) => ({ ...f, target: targets.find((t) => t.url === f.src) })).filter((f) => f.target);
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
  const frame = list[Math.min(Number(which), list.length - 1)];
  const expression = `(async () => { const F = document.getElementById('active-frame'); const D = F && F.contentDocument; const W = F && F.contentWindow;
    const OFF = F ? F.getBoundingClientRect() : {x:0,y:0}; const BASE = {x: ${frame.x} + OFF.x, y: ${frame.y} + OFF.y};
    const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return {x: Math.round(BASE.x + r.x), y: Math.round(BASE.y + r.y), w: Math.round(r.width), h: Math.round(r.height)}; };
    return (${body}); })()`;
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

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const { positional, options } = args(rest);
  if (command === "launch") return launch(options);
  fs.mkdirSync(runsDir, { recursive: true });
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
      case "frames": out(await webviewInfo(session, page)); break;
      case "box": {
        const sel = JSON.stringify(positional[0]);
        out(await wv(session, page, `Array.from(D.querySelectorAll(${sel})).slice(0, ${Number(options.limit ?? 10)}).map((el, i) => ({ i, ...box(el), text: (el.innerText || el.value || '').slice(0, ${Number(options.chars ?? 70)}).replace(/\\s+/g, ' ') }))`, options.which ?? 0));
        break;
      }
      case "clicksel": {
        const sel = JSON.stringify(positional[0]);
        const b = await wv(session, page, `box(D.querySelectorAll(${sel})[${Number(options.nth ?? 0)}])`, options.which ?? 0);
        if (!b) throw new Error("element not found: " + positional[0]);
        const x = b.x + (options.dx !== undefined ? Number(options.dx) : b.w / 2);
        const y = b.y + (options.dy !== undefined ? Number(options.dy) : Math.min(b.h / 2, 12));
        if (options.dbl) await page.mouse.dblclick(x, y); else await page.mouse.click(x, y);
        await delay(pause);
        out({ clicked: [Math.round(x), Math.round(y)] });
        if (options.shot) out(await shot(page, session, options.shot, options));
        break;
      }
      case "feval": out(await wv(session, page, positional.join(" "), options.which ?? 0)); break;
      case "peval": out(await page.evaluate(positional.join(" "))); break;
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
        const overrides = Object.fromEntries([].concat(options.var ?? []).map((pair) => pair.split("=", 2)));
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

main().then(() => process.exit(0), (error) => { console.error(error?.stack ?? String(error)); process.exit(1); });
