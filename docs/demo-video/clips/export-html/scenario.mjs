// The scenario of the clip: from a page in the Dark theme, a real click on Export saves team-handbook.html
// (VS Code's own save dialog), the file is opened in VS Code's Integrated Browser through a small local server,
// and a click on the tab "Release" shows its panel.
// The text of every caption, badge and time is in clip.md, not here.
import { createServer } from "node:http";
import { existsSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { userInfo } from "node:os";
import { extname, join, resolve, sep } from "node:path";

/** Clip-relative file to workspace-relative file. */
export const stage = { "stage/team-handbook.md": "team-handbook.md" };

/** Opened with the window, in Studio (see the editor association in the settings). */
export const open = ["team-handbook.md"];

export const settings = {
  // team-handbook.md opens in Studio, a preview that stays on its document.
  "workbench.editorAssociations": { "team-handbook.md": "markdown-okf-schema-studio.editor" },
  // The save dialog is VS Code's own input, inside the filmed window, not the system dialog.
  "files.simpleDialog.enable": true,
};

/** Reading mode at the start, no paste line in check.json. */
export const checks = { editMode: "off", paste: false };

/** The panel the click on "Release" shows, and the one it hides. */
export const SHOWN = "We release on Thursday, after the smoke tests.";
export const HIDDEN = "Every change gets one approving review.";

const STAGE_FILE = new URL("stage/team-handbook.md", import.meta.url);
const EXPORT = "[data-sphinx-preview-export]";

let server;
let port = 0;

/** Serves the files of the workspace on 127.0.0.1, 5170 or the next free port up to 5179; never keeps the process open. */
async function startServer(root) {
  const base = resolve(root);
  const handler = (request, response) => {
    const path = decodeURIComponent((request.url ?? "/").split("?")[0]);
    const file = resolve(base, `.${path}`);
    if ((file !== base && !file.startsWith(base + sep)) || !existsSync(file) || !statSync(file).isFile()) {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" }).end("not found");
      return;
    }
    const type = extname(file) === ".html" ? "text/html; charset=utf-8" : "text/plain; charset=utf-8";
    response.writeHead(200, { "content-type": type }).end(readFileSync(file));
  };
  for (let candidate = 5170; candidate <= 5179; candidate++) {
    const attempt = createServer(handler);
    const bound = await new Promise((done) => {
      attempt.once("error", () => done(false));
      attempt.listen(candidate, "127.0.0.1", () => done(true));
    });
    if (bound) {
      attempt.unref();
      server = attempt;
      port = candidate;
      return;
    }
  }
  throw new Error("no free port from 5170 to 5179 for the local server");
}

/** Closes the server and the browser's keep-alive connections, which would hold close() open. */
const stopServer = () =>
  new Promise((done) => {
    if (!server) return done();
    server.close(() => done());
    server.closeAllConnections();
  });

/** The reading-mode attribute, read from a fresh preview frame (the webview reloads while the layout changes). */
async function readingMode(t) {
  for (let attempt = 0; attempt < 20; attempt++) {
    try {
      const frame = await t.frameOf();
      return { frame, mode: await frame.evaluate(() => document.documentElement.getAttribute("data-sphinx-preview-edit-mode")) };
    } catch {
      await t.sleep(300);
    }
  }
  throw new Error("the preview frame never settled");
}

const themeMode = (frame) => frame.evaluate(() => document.documentElement.getAttribute("data-sphinx-preview-theme-mode"));

/** The centre of an element of the preview frame, in workbench page coordinates. */
async function centreOf(frame, selector) {
  const box = await frame.locator(selector).first().boundingBox(); // already in main page coordinates
  if (!box) throw new Error(`no box for ${selector}`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** The page of the Integrated Browser: a page of the browser context that shows the exported file. */
async function browserPage(t, address) {
  for (let attempt = 0; attempt < 60; attempt++) {
    for (const candidate of t.context.pages()) {
      if (candidate.url() === address) return candidate;
    }
    await t.sleep(250);
  }
  throw new Error(`no page at ${address} among ${JSON.stringify(t.context.pages().map((p) => p.url()))}`);
}

/** Whether the panel holding `text` is shown (the exported style sheet hides the others, not the `hidden` attribute). */
const panelShown = (page, text) =>
  page.evaluate((wanted) => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if ((node.textContent ?? "").trim() === wanted) return node.parentElement?.checkVisibility() ?? false;
    }
    return false;
  }, text);

/** Off camera: Studio in reading mode, toolbar expanded, Dark theme, the local server started, the pointer parked. */
export async function setup(t) {
  const user = userInfo().username;
  if (user && t.workspace.toLowerCase().includes(user.toLowerCase())) {
    throw new Error("the save dialog would show the workspace path with your user name: run the take with CLIP_SCRATCH set to a folder without it (for example C:/okfclip)");
  }
  // A file left by an earlier take would make the save dialog ask to overwrite it.
  rmSync(join(t.workspace, "team-handbook.html"), { force: true });
  let { frame, mode } = await readingMode(t);
  if (mode === "on") {
    await frame.locator("[data-sphinx-preview-edit-toggle]").first().click();
    for (let i = 0; i < 20 && mode !== "off"; i++) {
      await t.sleep(250);
      ({ frame, mode } = await readingMode(t));
    }
  }
  t.record("readingMode", mode);
  if (mode !== "off") throw new Error(`Studio is not in reading mode (data-sphinx-preview-edit-mode is ${mode})`);

  // The toolbar is collapsed by default: expand it, then click Theme until the page is Dark.
  const collapse = frame.locator("[data-sphinx-preview-toolbar-collapse]").first();
  if ((await collapse.getAttribute("aria-expanded")) === "false") {
    await collapse.click();
    await t.sleep(500);
  }
  let theme = await themeMode(frame);
  for (let click = 0; click < 4 && theme !== "dark"; click++) {
    await frame.locator("[data-sphinx-preview-theme-toggle]").first().click();
    await t.sleep(500);
    ({ frame } = await readingMode(t));
    theme = await themeMode(frame);
  }
  t.record("themeMode", theme);
  if (theme !== "dark") throw new Error(`the page is not in the Dark theme (data-sphinx-preview-theme-mode is ${theme})`);

  await startServer(t.workspace);
  const answer = await fetch(`http://127.0.0.1:${port}/team-handbook.md`);
  if (answer.status !== 200) throw new Error(`the local server answers ${answer.status} for team-handbook.md`);

  // Off the toolbar and off every block: no tooltip at frame 0 or at the loop seam.
  await t.moveTo(900, 420, 0.1);
  await t.sleep(500);
}

/** The filmed action: Export, the save dialog, the Integrated Browser on the file, the zoom with its two marks. */
export async function run(t) {
  const { page } = t;
  const start = Date.now();
  const until = (seconds) => t.sleep(Math.max(0, start + seconds * 1000 - Date.now()));
  const home = { ...t.pointer };
  const user = userInfo().username.toLowerCase();
  let frame = await t.frameOf();

  await until(0.2);
  const button = await centreOf(frame, EXPORT);
  await t.moveTo(button.x, button.y, 0.6);
  await until(0.8);
  await t.click();

  // VS Code's save dialog: an input at the top whose value ends with the proposed file.
  const input = page.locator(".quick-input-widget input.input").first();
  let value = "";
  for (let i = 0; i < 40; i++) {
    value = (await input.isVisible()) ? await input.inputValue() : "";
    if (value.endsWith("team-handbook.html")) break;
    await t.sleep(150);
  }
  if (!value.endsWith("team-handbook.html")) throw new Error(`the save dialog does not propose team-handbook.html (input: ${JSON.stringify(value)})`);
  if (value.toLowerCase().includes(user)) throw new Error(`the save dialog shows the user name: ${value}`);
  t.record("savePath", value.replace(/^.*[\\/]/u, ""));
  t.keyFrame("save-dialog");
  await until(2.0);
  await page.keyboard.press("Enter");
  const exported = join(t.workspace, "team-handbook.html");
  for (let i = 0; i < 50 && !existsSync(exported); i++) await t.sleep(100);
  if (!existsSync(exported)) throw new Error("team-handbook.html was not written within 5 s of the save dialog");

  // Studio's information message pauses the Integrated Browser ("Paused due to Notification"): dismiss it.
  const toast = page.locator(".notifications-toasts .notification-toast");
  for (let i = 0; i < 20 && !(await toast.count()); i++) await t.sleep(100);
  if (await toast.count()) {
    await page.evaluate(() => document.querySelector(".notifications-toasts .codicon-notifications-clear")?.click());
    for (let i = 0; i < 20 && (await toast.count()); i++) await t.sleep(100);
  }
  t.record("toastLeft", await toast.count());
  // Away from the Export button, so its tooltip does not show.
  await t.moveTo(900, 420, 0.4);
  await until(2.8);
  await t.press("ControlOrMeta+Shift+P", "palette");
  await t.sleep(300);
  await page.keyboard.type("Open Integrated Browser", { delay: 25 });
  await until(4.0);
  await page.keyboard.press("Enter");

  const address = `http://localhost:${port}/team-handbook.html`;
  await page.locator(".browser-root").first().waitFor({ state: "visible" });
  t.keyFrame("browser-opened");
  const urlInput = page.locator(".quick-input-widget input.input").first();
  let urlBar = await urlInput.isVisible();
  t.record("urlBarFocusedOnOpen", urlBar);
  if (!urlBar) {
    await page.locator(".browser-url-display").first().click();
    await urlInput.waitFor({ state: "visible" });
  }
  const at = () => ((Date.now() - start) / 1000).toFixed(2);
  const timing = { urlBar: at() };
  await page.keyboard.type(address, { delay: 0 });
  timing.typed = at();
  const typed = await urlInput.inputValue();
  if (typed !== address) throw new Error(`the address bar holds ${JSON.stringify(typed)}, expected ${JSON.stringify(address)}`);
  await until(5.0);
  await page.keyboard.press("Enter");
  timing.enter = at();
  const view = await browserPage(t, address);
  await view.waitForLoadState("load");
  await view.getByRole("heading", { name: "Team handbook" }).first().waitFor();
  timing.loaded = at();
  t.record("timing", timing);
  t.keyFrame("exported");
  await until(5.8);

  // The browser's content area in workbench coordinates, read from the view.
  const area = await browserArea(t, view);
  t.record("browserArea", area);
  // The zoom frames the page's content, heading to tab set, so it stays inside the window (no blank edge).
  const top = await inWorkbench(view, area, "h1");
  const bottom = await inWorkbench(view, area, ".myst-tab-set");
  const pad = 40;
  const left = Math.min(top.x, bottom.x) - pad;
  const rect = { x: left, y: top.y - pad, w: Math.max(top.x + top.w, bottom.x + bottom.w) + pad - left, h: bottom.y + bottom.h + pad - (top.y - pad) };
  await until(6.0);
  t.zoom("page", rect);

  const air = (r) => ({ x: r.x - 6, y: r.y - 6, w: r.w + 12, h: r.h + 12 });
  const flow = await inWorkbench(view, area, "img.myst-mermaid-image, svg");
  const label = await inWorkbench(view, area, "label.myst-tab", "Release");
  await until(6.6);
  t.mark("1", air(flow));
  // The pointer starts toward "Release" at 7.6 s, while mark 1 is still shown until 8.0 s.
  await until(7.6);
  const approach = t.moveTo(label.x + label.w / 2, label.y + label.h / 2, 0.7);
  await until(8.0);
  t.unmark("1");
  await approach;
  await until(8.4);
  t.ev("click", t.pointer);
  await view.mouse.click(label.cx, label.cy);
  let shown = false;
  let hidden = false;
  for (let i = 0; i < 10 && !(shown && hidden); i++) {
    shown = await panelShown(view, SHOWN);
    hidden = !(await panelShown(view, HIDDEN));
    if (!(shown && hidden)) await t.sleep(100);
  }
  t.record("panelAfterClick", { shown, hidden });
  if (!shown || !hidden) throw new Error(`after the click on "Release", "${SHOWN}" is ${shown ? "shown" : "hidden"} and "${HIDDEN}" is ${hidden ? "hidden" : "shown"}`);
  t.keyFrame("release");

  const tabs = await inWorkbench(view, area, ".myst-tab-set");
  await until(8.6);
  t.mark("2", air(tabs));
  await until(10.2);
  t.unmark("2");

  await until(11.0);
  t.unzoom("page");
  await t.moveTo(home.x, home.y, 0.6);
  await until(12.0);
}

/** The content area of the Integrated Browser (below its address bar) in workbench page coordinates, with the scale of its view. */
async function browserArea(t, view) {
  const area = await t.page.evaluate(() => {
    const root = document.querySelector(".browser-root").getBoundingClientRect();
    const bar = document.querySelector(".browser-navbar").getBoundingClientRect();
    return { x: root.x, y: bar.bottom, w: root.width, h: root.bottom - bar.bottom };
  });
  const inner = await view.evaluate(() => ({ w: innerWidth, h: innerHeight }));
  return { ...area, k: area.w / inner.w, viewW: inner.w, viewH: inner.h };
}

/** The first element matching `selector` (and `text`) of the view: its rectangle in workbench coordinates, its centre in view coordinates. */
async function inWorkbench(view, area, selector, text) {
  const r = await view.evaluate(([sel, wanted]) => {
    const element = [...document.querySelectorAll(sel)].find((e) => !wanted || (e.textContent ?? "").trim() === wanted);
    if (!element) return undefined;
    const rect = element.getBoundingClientRect();
    return { x: rect.x, y: rect.y, w: rect.width, h: rect.height };
  }, [selector, text]);
  if (!r) throw new Error(`the browser page has no ${selector}${text ? ` with text ${text}` : ""}`);
  return { x: area.x + r.x * area.k, y: area.y + r.y * area.k, w: r.w * area.k, h: r.h * area.k, cx: r.x + r.w / 2, cy: r.y + r.h / 2 };
}

/** The exported file on disk and the page of the Integrated Browser, checked after the take. */
export async function verify(t) {
  try {
    const files = readdirSync(t.workspace).filter((name) => !name.startsWith(".")).sort();
    const staged = Object.values(stage).concat("team-handbook.html").sort();
    if (JSON.stringify(files) !== JSON.stringify(staged)) throw new Error(`the workspace holds ${JSON.stringify(files)}, expected ${JSON.stringify(staged)}`);
    const html = t.workspaceFile("team-handbook.html");
    if (/<script/iu.test(html)) throw new Error("the exported file holds a <script");
    if (/<link/iu.test(html)) throw new Error("the exported file holds a <link");
    if (/@import/iu.test(html)) throw new Error("the exported file holds an @import");
    for (const match of html.matchAll(/\s(?:src|href)\s*=\s*"([^"]*)"/giu)) {
      if (!match[1].startsWith("#") && !match[1].startsWith("data:")) throw new Error(`the exported file loads ${match[1]}`);
    }
    // The exported flowchart is an <img> whose src is a data: URL of the SVG, so the markup is escaped in the file.
    if (!html.includes("<svg") && !html.includes("data:image/svg+xml")) throw new Error("the exported file holds no SVG (the flowchart is not embedded)");
    const mode = /<html[^>]*data-sphinx-preview-theme-mode="([^"]*)"/iu.exec(html)?.[1];
    if (mode !== "dark") throw new Error(`the exported <html> carries theme mode ${mode}, expected dark`);
    const address = `http://localhost:${port}/team-handbook.html`;
    const view = t.context.pages().find((candidate) => candidate.url() === address);
    if (!view) throw new Error(`the Integrated Browser page ${address} is gone`);
    if (!(await panelShown(view, SHOWN))) throw new Error(`"${SHOWN}" is not shown in the Integrated Browser`);
    if (await panelShown(view, HIDDEN)) throw new Error(`"${HIDDEN}" is shown in the Integrated Browser`);
    if (t.workspaceFile("team-handbook.md") !== readFileSync(STAGE_FILE, "utf8")) throw new Error("team-handbook.md on disk is not the clip's stage file");
    return { size: html.length, themeMode: mode, port };
  } finally {
    await stopServer();
  }
}
