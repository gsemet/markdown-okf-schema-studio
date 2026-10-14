// Scenario engine for the QA driver: runs a list of steps (real input) and checks (oracles) in
// one CDP connection and prints one line per check. Keeping output short is the point: the agent
// reads PASS/FAIL lines, and opens a screenshot only when a check fails.
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

export function cap(value, max = 2000) {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 1) ?? String(value);
  if (!max || text.length <= max) return text;
  return `${text.slice(0, max)}\n…(${text.length - max} more chars; pass --full to see everything)`;
}

const visible = (line, width) => {
  const shown = line.replace(/\r/g, "␍").replace(/\t/g, "→");
  return shown.length > width ? `${shown.slice(0, width)}…` : shown;
};

// Line diff with common prefix/suffix trimmed, LCS on the middle. `\r` is shown as ␍ so EOL
// changes are visible.
export function lineDiff(before, after, { maxLines = 30, width = 160 } = {}) {
  const a = before.split("\n");
  const b = after.split("\n");
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start += 1;
  let end = 0;
  while (end < a.length - start && end < b.length - start && a[a.length - 1 - end] === b[b.length - 1 - end]) end += 1;
  const a1 = a.slice(start, a.length - end);
  const b1 = b.slice(start, b.length - end);
  if (!a1.length && !b1.length) return { changed: false, removed: 0, added: 0, firstLine: null, text: "" };
  let ops;
  if (a1.length * b1.length <= 4_000_000) {
    const rows = a1.length + 1;
    const cols = b1.length + 1;
    const table = new Uint32Array(rows * cols);
    for (let i = a1.length - 1; i >= 0; i -= 1) {
      for (let j = b1.length - 1; j >= 0; j -= 1) {
        table[i * cols + j] = a1[i] === b1[j] ? table[(i + 1) * cols + j + 1] + 1
          : Math.max(table[(i + 1) * cols + j], table[i * cols + j + 1]);
      }
    }
    ops = [];
    let i = 0;
    let j = 0;
    while (i < a1.length || j < b1.length) {
      if (i < a1.length && j < b1.length && a1[i] === b1[j]) { ops.push([" ", a1[i]]); i += 1; j += 1; }
      else if (i < a1.length && (j === b1.length || table[(i + 1) * cols + j] >= table[i * cols + j + 1])) { ops.push(["-", a1[i]]); i += 1; }
      else { ops.push(["+", b1[j]]); j += 1; }
    }
  } else {
    ops = [...a1.map((line) => ["-", line]), ...b1.map((line) => ["+", line])];
  }
  const removed = ops.filter(([op]) => op === "-").length;
  const added = ops.filter(([op]) => op === "+").length;
  const lines = [`@@ L${start + 1} @@`];
  if (start > 0) lines.push(`  ${visible(a[start - 1], width)}`);
  for (const [op, line] of ops) lines.push(`${op} ${visible(line, width)}`);
  if (end > 0) lines.push(`  ${visible(a[a.length - end], width)}`);
  const shown = lines.length > maxLines ? [...lines.slice(0, maxLines), `… ${lines.length - maxLines} more diff lines`] : lines;
  return { changed: true, removed, added, firstLine: start + 1, text: shown.join("\n") };
}

export function findDoc(state, suffix) {
  return state?.documents?.find((doc) => doc.fsPath.endsWith(suffix));
}

// The spy rewrites state.json every 250 ms; wait for a snapshot taken after `after`.
export async function freshSpy(readSpy, session, after = Date.now()) {
  for (let i = 0; i < 25; i += 1) {
    const state = readSpy(session);
    if (state && Date.parse(state.at) > after) return state;
    await delay(100);
  }
  return readSpy(session);
}

function markPath(session, suffix) {
  return path.join(session.dir, "marks", `${suffix.replace(/[^\w.-]+/g, "_")}.txt`);
}

export function saveMark(session, state, suffix) {
  const doc = findDoc(state, suffix);
  if (!doc) throw new Error(`no open document ends with ${suffix}`);
  const file = markPath(session, suffix);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, doc.text);
  return `${suffix}: ${doc.lineCount} lines, v${doc.version}${doc.isDirty ? ", dirty" : ""}`;
}

export function bufferDiff(session, state, suffix, against = "disk", options = {}) {
  const doc = findDoc(state, suffix);
  if (!doc) return { error: `no open document ends with ${suffix}` };
  let base;
  if (against === "mark") {
    const file = markPath(session, suffix);
    if (!fs.existsSync(file)) return { error: `no mark for ${suffix}: run a mark step first` };
    base = fs.readFileSync(file, "utf8");
  } else base = fs.readFileSync(doc.fsPath, "utf8");
  return { ...lineDiff(base, doc.text, options), dirty: doc.isDirty, version: doc.version, buffer: doc.text };
}

export function consoleSince(session, sinceIso) {
  const file = path.join(session.dir, "console.log");
  if (!fs.existsSync(file)) return null;
  const lines = fs.readFileSync(file, "utf8").split("\n").filter((line) => line.slice(0, 24) >= sinceIso);
  return {
    errors: lines.filter((line) => /\[(console\.error|pageerror)\]/.test(line)),
    navs: lines.filter((line) => line.includes("[nav]")),
  };
}

// Webview expression that returns the elements matching a selector, optionally filtered by text.
function elementsJs(selector, text, exact) {
  const sel = JSON.stringify(selector);
  if (text === undefined) return `Array.from(D.querySelectorAll(${sel}))`;
  const wanted = JSON.stringify(String(text));
  return exact
    ? `Array.from(D.querySelectorAll(${sel})).filter((el) => (el.innerText || el.value || '').trim() === ${wanted})`
    : `Array.from(D.querySelectorAll(${sel})).filter((el) => (el.innerText || el.value || '').includes(${wanted}))`;
}

const DEFAULT_PAUSE = { key: 150, type: 300, insert: 300, click: 500, clicksel: 600, palette: 1500, open: 1200, pick: 800, wheel: 500, drag: 500, editMode: 300 };

async function waitUntil(fn, timeout, label) {
  const deadline = Date.now() + timeout;
  let last;
  while (Date.now() < deadline) {
    try { last = await fn(); if (last) return last; } catch (error) { last = String(error.message ?? error); }
    await delay(100);
  }
  throw new Error(`timeout after ${timeout} ms waiting for ${label}${last ? ` (last: ${cap(last, 120)})` : ""}`);
}

export async function setEditMode(ctx, on, which = 0) {
  const wanted = on ? "on" : "off";
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const mode = await ctx.wv(`D.documentElement.getAttribute('data-sphinx-preview-edit-mode')`, which);
    if (mode === wanted) return `edit mode ${wanted}`;
    const b = await ctx.wv(`box(D.querySelector('[data-sphinx-preview-edit-toggle]'))`, which);
    if (!b) throw new Error("edit toggle not found");
    await ctx.page.mouse.click(b.x + b.w / 2, b.y + b.h / 2);
    try {
      await waitUntil(async () => (await ctx.wv(`D.documentElement.getAttribute('data-sphinx-preview-edit-mode')`, which)) === wanted, 1500, `edit mode ${wanted}`);
      return `edit mode ${wanted}`;
    } catch {}
  }
  throw new Error(`edit mode did not switch to ${wanted}`);
}

const ACTIONS = ["open", "palette", "pick", "key", "type", "insert", "click", "clicksel", "wheel", "drag", "waitFor", "waitForPage", "editMode", "mark", "shot", "eval", "wait"];

async function runAction(ctx, step, state) {
  const kind = ACTIONS.find((name) => name in step);
  if (!kind) throw new Error(`unknown step ${JSON.stringify(step)}`);
  const { page } = ctx;
  const which = step.which ?? 0;
  let note;
  switch (kind) {
    case "wait": await delay(Number(step.wait)); return undefined;
    case "open":
      // Cmd+P with focus in the preview opens the file in the preview's group: focus group 1 first.
      await page.keyboard.press("Meta+1"); await delay(200);
      await page.keyboard.press("Meta+P"); await delay(400);
      await page.keyboard.type(step.open, { delay: 10 }); await delay(900);
      await page.keyboard.press("Enter");
      break;
    case "palette":
      await page.keyboard.press("Meta+Shift+P"); await delay(400);
      await page.keyboard.type(step.palette, { delay: 10 }); await delay(500);
      await page.keyboard.press("Enter");
      break;
    case "pick": {
      const rows = page.locator(".quick-input-list .monaco-list-row");
      const count = await rows.count();
      for (let i = 0; i < count; i += 1) {
        const label = await rows.nth(i).getAttribute("aria-label");
        if (label?.includes(step.pick)) {
          const b = await rows.nth(i).boundingBox();
          await page.mouse.click(b.x + 20, b.y + b.height / 2);
          note = `picked ${label.slice(0, 60)}`;
          break;
        }
      }
      if (!note) throw new Error(`quick pick row not found: ${step.pick}`);
      break;
    }
    case "key":
      for (const chord of [].concat(step.key)) { await page.keyboard.press(chord); await delay(Number(step.gap ?? 120)); }
      break;
    case "type": await page.keyboard.type(step.type, { delay: Number(step.delay ?? 35) }); break;
    case "insert": await page.keyboard.insertText(step.insert); break;
    case "click": {
      const [x, y] = step.click;
      await page.mouse.click(x, y, { button: step.right ? "right" : "left", clickCount: Number(step.count ?? 1) });
      break;
    }
    case "clicksel": {
      const nth = Number(step.nth ?? 0);
      const b = await ctx.wv(`(() => { const el = ${elementsJs(step.clicksel, step.text, step.exact)}[${nth}]; if (!el) return null;
        if (${step.scroll !== false}) el.scrollIntoView({ block: 'center' }); return true; })()`, which);
      if (!b) throw new Error(`element not found: ${step.clicksel}${step.text !== undefined ? ` with text ${step.text}` : ""}`);
      await delay(250);
      const r = await ctx.wv(`box(${elementsJs(step.clicksel, step.text, step.exact)}[${nth}])`, which);
      const x = r.x + (step.dx !== undefined ? Number(step.dx) : Math.min(r.w / 2, 40));
      const y = r.y + (step.dy !== undefined ? Number(step.dy) : Math.min(r.h / 2, 12));
      if (step.dbl) await page.mouse.dblclick(x, y);
      else await page.mouse.click(x, y, { button: step.right ? "right" : "left" });
      break;
    }
    case "wheel": {
      const [x, y, dy] = step.wheel;
      await page.mouse.move(x, y);
      const steps = Number(step.steps ?? 1);
      for (let i = 0; i < steps; i += 1) { await page.mouse.wheel(0, dy / steps); await delay(30); }
      break;
    }
    case "drag": {
      const [x1, y1, x2, y2] = step.drag;
      await page.mouse.move(x1, y1); await page.mouse.down(); await page.mouse.move(x2, y2, { steps: 12 }); await page.mouse.up();
      break;
    }
    case "waitFor":
      await waitUntil(() => ctx.wv(step.waitFor, which), Number(step.timeout ?? 5000), step.label ?? step.waitFor);
      return undefined;
    case "waitForPage":
      await waitUntil(() => page.evaluate(step.waitForPage), Number(step.timeout ?? 5000), step.label ?? step.waitForPage);
      return undefined;
    case "editMode": note = await setEditMode(ctx, step.editMode, which); break;
    case "mark": {
      const suffix = step.mark === true ? state.vars.file : step.mark;
      note = `mark ${saveMark(ctx.session, await freshSpy(ctx.readSpy, ctx.session), suffix)}`;
      return note;
    }
    case "shot": {
      if (step.onFail && state.failed === 0) return undefined;
      return `shot ${await ctx.shot(step.shot, step)}`;
    }
    case "eval": return `eval ${cap(await ctx.wv(step.eval, which), Number(step.max ?? 600))}`;
    default: break;
  }
  await delay(Number(step.wait ?? DEFAULT_PAUSE[kind] ?? 300));
  return note;
}

async function runCheck(ctx, step, state) {
  const which = step.which ?? 0;
  const label = step.label ? ` (${step.label})` : "";
  switch (step.check) {
    case "diff": {
      const suffix = step.file ?? state.vars.file;
      const against = step.against ?? "disk";
      const spy = await freshSpy(ctx.readSpy, ctx.session);
      const d = bufferDiff(ctx.session, spy, suffix, against, { maxLines: Number(step.maxDiffLines ?? 20) });
      if (d.error) return { ok: false, check: "diff", detail: d.error };
      const problems = [];
      if (step.equal && d.changed) problems.push("buffer changed");
      if (step.maxLines !== undefined && (d.removed > step.maxLines || d.added > step.maxLines)) problems.push(`more than ${step.maxLines} line(s) changed`);
      for (const text of [].concat(step.contains ?? [])) if (!d.buffer.includes(text)) problems.push(`missing ${JSON.stringify(text)}`);
      for (const text of [].concat(step.notContains ?? [])) if (d.buffer.includes(text)) problems.push(`contains ${JSON.stringify(text)}`);
      if (step.dirty !== undefined && d.dirty !== step.dirty) problems.push(`dirty=${d.dirty}`);
      const summary = `${suffix} vs ${against}: ${d.changed ? `-${d.removed} +${d.added} at L${d.firstLine}` : "unchanged"}${d.dirty ? ", dirty" : ""}`;
      return { ok: !problems.length, check: "diff", detail: `${summary}${problems.length ? ` — ${problems.join("; ")}` : ""}${label}`, extra: problems.length || step.show ? d.text : undefined };
    }
    case "errors": {
      const log = consoleSince(ctx.session, state.startIso);
      if (!log) return { ok: false, check: "errors", detail: "no console.log: start the observer (q run observe.mjs, in the background)" };
      // Node deprecation warnings from the extension host are logged as errors and are noise.
      const ignore = new RegExp(`DeprecationWarning${step.ignore ? `|${step.ignore}` : ""}`);
      const errors = log.errors.filter((line) => !ignore.test(line));
      const max = Number(step.max ?? 0);
      return { ok: errors.length <= max, check: "errors", detail: `${errors.length} console error(s), max ${max}${label}`, extra: errors.length ? errors.slice(0, 5).map((line) => cap(line, 220)).join("\n") : undefined };
    }
    case "navs": {
      const log = consoleSince(ctx.session, state.startIso);
      if (!log) return { ok: false, check: "navs", detail: "no console.log: start the observer (q run observe.mjs, in the background)" };
      const max = Number(step.max ?? 0);
      return { ok: log.navs.length <= max, check: "navs", detail: `${log.navs.length} webview navigation(s), max ${max}${label}` };
    }
    case "notifs": {
      const toasts = await ctx.notifications();
      const problems = [];
      if (step.none && toasts.length) problems.push("unexpected toast");
      for (const text of [].concat(step.contains ?? [])) if (!toasts.some((t) => t.includes(text))) problems.push(`no toast with ${JSON.stringify(text)}`);
      return { ok: !problems.length, check: "notifs", detail: `${toasts.length} toast(s)${problems.length ? ` — ${problems.join("; ")}` : ""}${label}`, extra: toasts.length ? toasts.map((t) => cap(t, 200)).join("\n") : undefined };
    }
    case "feval":
    case "peval": {
      const value = step.check === "feval" ? await ctx.wv(step.expr, which) : await ctx.page.evaluate(step.expr);
      const ok = "equals" in step ? JSON.stringify(value) === JSON.stringify(step.equals) : Boolean(value);
      return { ok, check: step.check, detail: `${step.label ?? cap(step.expr, 80)} → ${cap(value, 200)}${"equals" in step ? ` (want ${JSON.stringify(step.equals)})` : ""}` };
    }
    case "focus": {
      const value = await ctx.wv(`(() => { const a = D.activeElement; return { ok: !!(a && (a.matches(${JSON.stringify(step.selector)}) || a.closest(${JSON.stringify(step.selector)}))), tag: a && a.tagName, label: a && a.getAttribute('aria-label') }; })()`, which);
      return { ok: value.ok, check: "focus", detail: `focus in ${step.selector}: ${value.ok} (active ${value.tag}${value.label ? ` "${value.label}"` : ""})${label}` };
    }
    case "inViewport": {
      const value = await ctx.wv(`(() => { const els = ${elementsJs(step.selector, step.text, step.exact)}; const vw = W.innerWidth, vh = W.innerHeight;
        const bad = els.filter((el) => { const r = el.getBoundingClientRect(); return r.width && (r.left < -1 || r.top < -1 || r.right > vw + 1 || r.bottom > vh + 1); });
        return { count: els.length, bad: bad.length, first: bad[0] && box(bad[0]) }; })()`, which);
      const ok = value.count > 0 && value.bad === 0;
      return { ok, check: "inViewport", detail: `${step.selector}: ${value.count} found, ${value.bad} outside the viewport${value.first ? ` (first at ${JSON.stringify(value.first)})` : ""}${label}` };
    }
    case "noOverlap": {
      const value = await ctx.wv(`(() => { const as = ${elementsJs(step.a)}; const bs = ${elementsJs(step.b)}; const hits = [];
        for (const a of as) for (const b of bs) { if (a === b || a.contains(b) || b.contains(a)) continue; const r = a.getBoundingClientRect(), s = b.getBoundingClientRect();
          const w = Math.min(r.right, s.right) - Math.max(r.left, s.left), h = Math.min(r.bottom, s.bottom) - Math.max(r.top, s.top);
          if (w > 1 && h > 1 && r.width && s.width) hits.push({ a: box(a), b: box(b) }); }
        return { pairs: as.length * bs.length, hits: hits.length, first: hits[0] }; })()`, which);
      return { ok: value.hits === 0, check: "noOverlap", detail: `${step.a} × ${step.b}: ${value.hits} overlap(s)${value.first ? ` first ${JSON.stringify(value.first)}` : ""}${label}` };
    }
    case "noClip": {
      const value = await ctx.wv(`(() => { const els = ${elementsJs(step.selector, step.text, step.exact)};
        const bad = els.filter((el) => el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1);
        return { count: els.length, bad: bad.length, first: bad[0] && ((bad[0].innerText || '').slice(0, 60)) }; })()`, which);
      return { ok: value.bad === 0, check: "noClip", detail: `${step.selector}: ${value.count} found, ${value.bad} clipped${value.first ? ` (first "${value.first}")` : ""}${label}` };
    }
    case "editor": {
      // `active` is undefined while a webview has focus; `visible` checks the editor groups instead.
      const spy = await freshSpy(ctx.readSpy, ctx.session);
      const short = (uri) => (uri ? uri.split("/").slice(-2).join("/") : "none");
      if ("visible" in step) {
        const uris = (spy?.visibleEditors ?? []).map((e) => e.uri);
        const ok = uris.some((uri) => uri.endsWith(step.visible));
        return { ok, check: "editor", detail: `visible text editors ${uris.map(short).join(", ") || "none"} (want ${step.visible})${label}` };
      }
      const active = spy?.activeEditor?.uri ?? null;
      const ok = step.active === null ? active === null : Boolean(active?.endsWith(step.active));
      return { ok, check: "editor", detail: `active text editor ${short(active)} (want ${step.active ?? "none"})${label}` };
    }
    default: throw new Error(`unknown check ${step.check}`);
  }
}

function substitute(value, vars) {
  if (typeof value === "string") return value.replace(/\$\{(\w+)\}/g, (match, key) => vars[key] ?? match);
  if (Array.isArray(value)) return value.map((item) => substitute(item, vars));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, substitute(v, vars)]));
  return value;
}

// Runs steps and checks; prints only notes, check lines, and a summary. Returns the results.
export async function runSteps(ctx, steps, { name = "adhoc", vars = {}, startIso = new Date().toISOString(), keepGoing = false } = {}) {
  const state = { vars, startIso, failed: 0 };
  const results = [];
  for (const [index, raw] of steps.entries()) {
    const step = substitute(raw, vars);
    const n = index + 1;
    try {
      if (step.check) {
        const result = await runCheck(ctx, step, state);
        results.push({ n, ...result });
        if (!result.ok) state.failed += 1;
        ctx.out(`${result.ok ? "PASS" : "FAIL"} ${n} ${result.check} ${result.detail}`);
        if (result.extra && (!result.ok || step.show)) ctx.out(result.extra.split("\n").map((line) => `     ${line}`).join("\n"));
      } else {
        const note = await runAction(ctx, step, state);
        if (note) ctx.out(`..   ${n} ${note}`);
      }
    } catch (error) {
      state.failed += 1;
      const message = String(error?.message ?? error).split("\n")[0];
      results.push({ n, ok: false, check: "step", detail: message });
      ctx.out(`FAIL ${n} step ${cap(JSON.stringify(raw), 90)}: ${message}`);
      if (!keepGoing && !step.optional) {
        // A broken action makes the following checks meaningless: capture the state and stop.
        try { ctx.out(`..   shot ${await ctx.shot(`${name}-error-${n}`, { clip: "preview" })}`); } catch {}
        break;
      }
    }
  }
  const passed = results.filter((r) => r.ok).length;
  ctx.out(`== ${name}: ${passed} pass, ${state.failed} fail`);
  return { name, startIso, passed, failed: state.failed, results };
}

export function loadScenario(file, overrides = {}) {
  const scenario = JSON.parse(fs.readFileSync(file, "utf8"));
  const vars = { ...(scenario.vars ?? {}), ...(scenario.file ? { file: scenario.file } : {}), ...overrides };
  return { name: scenario.name ?? path.basename(file, ".json"), steps: scenario.steps ?? [], vars };
}

// Pre-flight: every harness pitfall that can be checked automatically, one line each.
export async function doctor({ session, repo, extensionRoot, here, readSpy }) {
  const lines = [];
  const add = (level, name, detail) => lines.push(`${level.padEnd(4)} ${name}: ${detail}`);
  const alive = (() => { try { process.kill(session.pid, 0); return true; } catch { return false; } })();
  add(alive ? "OK" : "FAIL", "process", `${session.name} pid ${session.pid} ${alive ? "running" : "not running: launch again"}`);
  const socket = path.join(session.userData, "1.141.0-main.sock");
  add(socket.length < 103 ? "OK" : "FAIL", "ipc socket path", `${socket.length} chars (limit 103)`);
  try {
    const settings = JSON.parse(fs.readFileSync(path.join(session.userData, "User", "settings.json"), "utf8"));
    const custom = settings["window.dialogStyle"] === "custom" && settings["window.menuStyle"] === "custom";
    add(custom ? "OK" : "FAIL", "custom dialogs/menus", custom ? "set" : "native dialogs are invisible to CDP: set window.dialogStyle/menuStyle to custom and restart");
  } catch { add("WARN", "custom dialogs/menus", "settings.json not readable"); }
  let targets = [];
  try {
    targets = await (await fetch(`http://127.0.0.1:${session.port}/json/list`, { signal: AbortSignal.timeout(2000) })).json();
    add(targets.some((t) => t.type === "page" && /workbench/.test(t.url)) ? "OK" : "FAIL", "cdp", `port ${session.port}, ${targets.length} target(s)`);
  } catch { add("FAIL", "cdp", `port ${session.port} unreachable`); }
  const webviews = targets.filter((t) => t.type === "iframe" && t.url.startsWith("vscode-webview://")).length;
  add(webviews ? "OK" : "WARN", "webviews", `${webviews} webview target(s)${webviews ? "" : ": open the preview"}`);
  const spy = readSpy(session);
  const age = spy ? Math.round((Date.now() - Date.parse(spy.at)) / 1000) : null;
  add(age !== null && age < 5 ? "OK" : "FAIL", "spy", age === null ? "no state.json: spy extension not loaded" : `last snapshot ${age}s ago`);
  const consoleFile = path.join(session.dir, "console.log");
  const pidFile = path.join(session.dir, "observer.pid");
  const observer = fs.existsSync(pidFile) && (() => { try { process.kill(Number(fs.readFileSync(pidFile, "utf8")), 0); return true; } catch { return false; } })();
  add(observer && fs.existsSync(consoleFile) ? "OK" : "WARN", "observer", observer ? "running" : "not running: start q run observe.mjs in the background (errors/navs checks need it)");
  try {
    const sheet = execFileSync("osascript", [path.join(here, "sheet.applescript"), "read"], { encoding: "utf8", timeout: 4000 }).trim();
    const pending = sheet && !/^no sheet/i.test(sheet);
    add(pending ? "FAIL" : "OK", "native sheet", pending ? `pending: ${cap(sheet, 120)} (dismiss with osascript scripts/sheet.applescript "Cancel")` : "none");
  } catch { add("WARN", "native sheet", "could not query (Accessibility permission?)"); }
  const newest = (dir) => fs.readdirSync(dir, { withFileTypes: true }).reduce((max, entry) => {
    const full = path.join(dir, entry.name);
    return Math.max(max, entry.isDirectory() ? newest(full) : fs.statSync(full).mtimeMs);
  }, 0);
  const bundle = path.join(extensionRoot, "out/bundle/extension.js");
  if (!fs.existsSync(bundle)) add("FAIL", "extension build", "out/bundle/extension.js missing: npm run compile && npm run bundle");
  else {
    const stale = newest(path.join(extensionRoot, "src")) > fs.statSync(bundle).mtimeMs;
    add(stale ? "WARN" : "OK", "extension build", stale ? "sources newer than the bundle: rebuild, then relaunch" : "bundle up to date");
  }
  const others = spawnSync("pgrep", ["-f", "msq-"], { encoding: "utf8" }).stdout.trim().split("\n").filter(Boolean).length;
  add("INFO", "msq- processes (all sessions)", String(others));
  const head = spawnSync("git", ["-C", repo, "rev-parse", "--short", "HEAD"], { encoding: "utf8" }).stdout.trim();
  const dirty = spawnSync("git", ["-C", repo, "status", "--short"], { encoding: "utf8" }).stdout.trim();
  add("INFO", "revision", `${head}${dirty ? " (extension tree dirty)" : " (clean)"}`);
  return lines.join("\n");
}
