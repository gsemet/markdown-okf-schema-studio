// The scenario of the clip: a long report page in Cream and Auto width is scrolled in Studio, a real click on Export
// saves platform-report.html (VS Code's own save dialog), the file is opened in VS Code's Integrated Browser through a
// small local server, and the same page is scrolled there: the wide table still breaks out of the column and the
// diagrams and charts are drawn.
// The text of every caption, badge and time is in clip.md, not here.
import { createServer } from "node:http";
import { existsSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { userInfo } from "node:os";
import { extname, join, resolve, sep } from "node:path";

/** Clip-relative file to workspace-relative file. */
export const stage = { "stage/platform-report.md": "platform-report.md" };

/** Opened with the window, in Studio (see the editor association in the settings). */
export const open = ["platform-report.md"];

export const settings = {
  // platform-report.md opens in Studio, a preview that stays on its document.
  "workbench.editorAssociations": { "platform-report.md": "markdown-okf-schema-studio.editor" },
  // The save dialog is VS Code's own input, inside the filmed window, not the system dialog.
  "files.simpleDialog.enable": true,
  // A narrower column than the default 960 px, so the wide table plainly breaks out of it.
  "markdownOkfSchemaStudio.preview.maxContentWidth": 720,
};

/** Reading mode at the start, no paste line in check.json. */
export const checks = { editMode: "off", paste: false };

const STAGE_FILE = new URL("stage/platform-report.md", import.meta.url);
const EXPORT = "[data-sphinx-preview-export]";
const CONTENT = "#sphinx-myst-preview-content";
/** The length of the clip, as in clip.md. */
const END = 18.0;

let server;
let port = 0;
/** The width of the wide table in Studio, read in setup and compared with the browser's. */
let studioWide;
/** Which way each scroll went ("wheel", or "scrollTo" as soon as one scroll fell back to it). */
const ways = {};

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

const rootAttribute = (frame, name) => frame.evaluate((wanted) => document.documentElement.getAttribute(wanted), name);

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

/**
 * The two tables of the page, measured in a preview frame or in the browser page (the same code in both): for the
 * table whose first header cell is "Service" and the one whose first header cell is "Week", their top-level wrapper
 * (the ancestor whose parent is the content): its width, its rectangle, whether it carries data-sphinx-preview-wide,
 * its right edge and the largest sideways overflow of the table or its wrappers; plus the width of the first
 * paragraph and the view's width.
 */
const wideOf = (target) =>
  target.evaluate((contentSelector) => {
    const content = document.querySelector(contentSelector) ?? document.body;
    const measure = (first) => {
      const table = [...content.querySelectorAll("table")].find((candidate) => (candidate.querySelector("th")?.textContent ?? "").trim() === first);
      if (!table) return null;
      const chain = [table];
      while (chain.at(-1).parentElement && chain.at(-1).parentElement !== content) chain.push(chain.at(-1).parentElement);
      const wrapper = chain.at(-1);
      const rect = wrapper.getBoundingClientRect();
      return {
        width: rect.width,
        rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
        wide: wrapper.hasAttribute("data-sphinx-preview-wide"),
        right: rect.right,
        overflow: Math.max(...chain.map((element) => element.scrollWidth - element.clientWidth)),
      };
    };
    const paragraph = content.querySelector(":scope > p") ?? content.querySelector("p");
    return { inner: innerWidth, paragraph: paragraph ? paragraph.getBoundingClientRect().width : 0, service: measure("Service"), week: measure("Week") };
  }, CONTENT);

/** Whether the wide table of `measure` breaks out of the column: wide, wider than a paragraph, inside the view. */
function breaksOut(where, measure) {
  const { service } = measure;
  if (!service) throw new Error(`${where}: no table starting with "Service"`);
  if (!service.wide) throw new Error(`${where}: the Service table's wrapper does not carry data-sphinx-preview-wide (${JSON.stringify(measure)})`);
  if (!(service.width > measure.paragraph)) throw new Error(`${where}: the Service table (${service.width} px) is not wider than a paragraph (${measure.paragraph} px)`);
  if (service.right > measure.inner + 0.5) throw new Error(`${where}: the Service table's right edge ${service.right} px is outside the view (${measure.inner} px)`);
}

/** In a preview frame: the two Mermaid and the two Vega blocks are drawn (rendered state with their image), one vega-lite and one vega. */
const drawn = (frame) =>
  frame.evaluate(() => {
    const read = (selector, image) => [...document.querySelectorAll(selector)].map((block) => ({ state: block.getAttribute("data-render-state"), image: !!block.querySelector(image), kind: block.getAttribute("data-myst-chart-kind") }));
    const mermaid = read(".myst-mermaid-diagram", "img.myst-mermaid-image");
    const vega = read(".myst-vega-diagram", "img.myst-vega-image");
    const ready = (blocks) => blocks.every((block) => block.state === "rendered" && block.image);
    const kinds = vega.map((block) => block.kind).sort();
    const ok = mermaid.length === 2 && vega.length === 2 && ready(mermaid) && ready(vega) && kinds[0] === "vega" && kinds[1] === "vega-lite";
    return { ok, found: { mermaid, vega } };
  });

/** In the browser page: the four drawings are images that loaded. */
async function imagesLoaded(view) {
  const found = await view.evaluate(() => {
    const read = (selector) => [...document.querySelectorAll(selector)].map((image) => image.complete && image.naturalWidth > 0);
    return { mermaid: read("img.myst-mermaid-image"), vega: read("img.myst-vega-image") };
  });
  if (found.mermaid.length !== 2 || found.vega.length !== 2 || ![...found.mermaid, ...found.vega].every(Boolean)) throw new Error(`the browser page does not show four loaded drawings: ${JSON.stringify(found)}`);
}

/** The distance to scroll to bring `kind` ("wide", "flow-bar" or "end") to the middle of the view, read in a frame or page. */
const distanceTo = (target, kind) =>
  target.evaluate(
    ([what, contentSelector]) => {
      const scroller = document.scrollingElement ?? document.documentElement;
      if (what === "end") return scroller.scrollHeight - innerHeight - scroller.scrollTop;
      const content = document.querySelector(contentSelector) ?? document.body;
      let top;
      let bottom;
      if (what === "wide") {
        const table = [...content.querySelectorAll("table")].find((candidate) => (candidate.querySelector("th")?.textContent ?? "").trim() === "Service");
        if (!table) throw new Error('no table starting with "Service"');
        let wrapper = table;
        while (wrapper.parentElement && wrapper.parentElement !== content) wrapper = wrapper.parentElement;
        ({ top, bottom } = wrapper.getBoundingClientRect());
      } else {
        const flow = content.querySelector("img.myst-mermaid-image");
        const bar = content.querySelector("img.myst-vega-image");
        if (!flow || !bar) throw new Error("no flowchart or bar chart image");
        top = flow.getBoundingClientRect().top;
        bottom = bar.getBoundingClientRect().bottom;
      }
      // Centred; a span taller than the view starts below the sticky band instead.
      return bottom - top + 80 <= innerHeight ? (top + bottom) / 2 - innerHeight / 2 : top - 80;
    },
    [kind, CONTENT],
  );

/**
 * Scrolls `target` ("studio" for the preview, or the browser's page) by `distance` px over `seconds`, in CDP wheel steps
 * of about 60 px with the pointer over the page; when the page has not moved after the first two steps, in one smooth
 * scrollTo of the page instead. Records the way, and returns once the scroll has settled.
 */
async function scrollBy(t, target, distance, seconds) {
  const studio = target === "studio";
  const key = studio ? "scrollStudio" : "scrollBrowser";
  const view = studio ? await t.frameOf() : target;
  const wheel = (dy) => (studio ? t.page.mouse.wheel(0, dy) : target.mouse.wheel(0, dy));
  const top = () => view.evaluate(() => (document.scrollingElement ?? document.documentElement).scrollTop);
  const from = await top();
  const steps = Math.max(2, Math.ceil(Math.abs(distance) / 60));
  const begun = Date.now();
  let way = "wheel";
  for (let step = 1; step <= steps; step++) {
    await wheel(distance / steps);
    if (step === 2) {
      await t.sleep(150);
      if (Math.abs((await top()) - from) < 1) {
        way = "scrollTo";
        await view.evaluate((y) => scrollTo({ top: y, behavior: "smooth" }), from + distance);
        break;
      }
    }
    const wait = begun + (step / steps) * seconds * 1000 - Date.now();
    if (wait > 0) await t.sleep(wait);
  }
  ways[key] = ways[key] === "scrollTo" || way === "scrollTo" ? "scrollTo" : "wheel";
  t.record(key, ways[key]);
  // Settled: two equal reads 100 ms apart.
  let previous = await top();
  for (let i = 0; i < 50; i++) {
    await t.sleep(100);
    const current = await top();
    if (current === previous) return;
    previous = current;
  }
  throw new Error(`the ${studio ? "Studio" : "browser"} page keeps scrolling`);
}

/** Off camera: Studio in reading mode, Cream, Auto width, the toolbar collapsed, the local server started, the pointer parked. */
export async function setup(t) {
  const user = userInfo().username;
  if (user && t.workspace.toLowerCase().includes(user.toLowerCase())) {
    throw new Error("the save dialog would show the workspace path with your user name: run the take with CLIP_SCRATCH set to a folder without it (for example C:/okfclip)");
  }
  // A file left by an earlier take would make the save dialog ask to overwrite it.
  rmSync(join(t.workspace, "platform-report.html"), { force: true });
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

  // No Theme click: the page is in the shipped default theme.
  const theme = await rootAttribute(frame, "data-sphinx-preview-theme-mode");
  t.record("themeMode", theme);
  if (theme !== "cream") throw new Error(`the page is not in the Cream theme (data-sphinx-preview-theme-mode is ${theme})`);

  // The toolbar is collapsed by default: expand it, then click Width until the page is in Auto.
  const collapse = () => frame.locator("[data-sphinx-preview-toolbar-collapse]").first();
  if ((await collapse().getAttribute("aria-expanded")) === "false") {
    await collapse().click();
    await t.sleep(500);
  }
  let width = await rootAttribute(frame, "data-sphinx-preview-width");
  for (let click = 0; click < 3 && width !== "auto"; click++) {
    await frame.locator("[data-sphinx-preview-width-toggle]").first().click();
    await t.sleep(500);
    ({ frame } = await readingMode(t));
    width = await rootAttribute(frame, "data-sphinx-preview-width");
  }
  t.record("widthMode", width);
  if (width !== "auto") throw new Error(`the page is not in Auto width (data-sphinx-preview-width is ${width})`);
  // Collapse the toolbar again; the Export button stays in row 1.
  if ((await collapse().getAttribute("aria-expanded")) === "true") {
    await collapse().click();
    await t.sleep(500);
  }

  // The four drawings are rendered (they take a moment after the webview loads).
  let state;
  for (let i = 0; i < 100; i++) {
    ({ frame } = await readingMode(t));
    state = await drawn(frame);
    if (state.ok) break;
    await t.sleep(300);
  }
  if (!state.ok) throw new Error(`the diagrams and charts are not drawn after 30 s: ${JSON.stringify(state.found)}`);

  const measure = await wideOf(frame);
  const { service, week } = measure;
  if (!service) throw new Error('no table starting with "Service" in Studio');
  if (!week) throw new Error('no table starting with "Week" in Studio');
  if (!service.wide) throw new Error(`the Service table's wrapper does not carry data-sphinx-preview-wide: ${JSON.stringify(measure)}`);
  if (!(service.width > measure.paragraph)) throw new Error(`the Service table (${service.width} px) is not wider than a paragraph (${measure.paragraph} px)`);
  if (service.overflow > 1) throw new Error(`the Service table scrolls sideways inside Studio by ${service.overflow} px: drop month columns from the end of the stage table`);
  if (week.wide) throw new Error("the Week table's wrapper carries data-sphinx-preview-wide: it should stay inside the column");
  studioWide = { width: service.width, paragraph: measure.paragraph, inner: measure.inner, week: week.width };
  t.record("studioWide", studioWide);

  await frame.evaluate(() => scrollTo(0, 0));
  await t.sleep(300);

  await startServer(t.workspace);
  const answer = await fetch(`http://127.0.0.1:${port}/platform-report.md`);
  if (answer.status !== 200) throw new Error(`the local server answers ${answer.status} for platform-report.md`);

  // Off the toolbar and off every block (the blank right side of the content): no tooltip at frame 0 or at the loop seam.
  await t.moveTo(900, 420, 0.1);
  await t.sleep(800);
}

/** The filmed action: scroll Studio, Export, the save dialog, the Integrated Browser on the file, the zoom with its three marks. */
export async function run(t) {
  const { page } = t;
  const start = Date.now();
  const until = (seconds) => t.sleep(Math.max(0, start + seconds * 1000 - Date.now()));
  const home = { ...t.pointer };
  const user = userInfo().username.toLowerCase();

  // Beat 1: the page scrolls in Studio (no mark, no zoom).
  let frame = await t.frameOf();
  await until(0.3);
  t.keyFrame("top");
  await until(0.6);
  await scrollBy(t, "studio", await distanceTo(frame, "wide"), 1.0);
  await until(2.0);
  t.keyFrame("wide-table");
  await until(2.4);
  frame = await t.frameOf();
  await scrollBy(t, "studio", await distanceTo(frame, "flow-bar"), 0.8);
  await until(3.5);
  t.keyFrame("diagrams");
  await until(3.8);
  frame = await t.frameOf();
  await scrollBy(t, "studio", await distanceTo(frame, "end"), 1.0);

  // Beat 2: Export, the save dialog, the Integrated Browser.
  await until(5.0);
  frame = await t.frameOf();
  const button = await centreOf(frame, EXPORT);
  await t.moveTo(button.x, button.y, 0.9);
  await until(6.0);
  await t.click();

  // VS Code's save dialog: an input at the top whose value ends with the proposed file.
  const input = page.locator(".quick-input-widget input.input").first();
  let value = "";
  for (let i = 0; i < 40; i++) {
    value = (await input.isVisible()) ? await input.inputValue() : "";
    if (value.endsWith("platform-report.html")) break;
    await t.sleep(150);
  }
  if (!value.endsWith("platform-report.html")) throw new Error(`the save dialog does not propose platform-report.html (input: ${JSON.stringify(value)})`);
  if (value.toLowerCase().includes(user)) throw new Error(`the save dialog shows the user name: ${value}`);
  t.record("savePath", value.replace(/^.*[\\/]/u, ""));
  t.keyFrame("save-dialog");
  await until(7.0);
  await page.keyboard.press("Enter");
  const exported = join(t.workspace, "platform-report.html");
  for (let i = 0; i < 50 && !existsSync(exported); i++) await t.sleep(100);
  if (!existsSync(exported)) throw new Error("platform-report.html was not written within 5 s of the save dialog");

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
  await until(7.6);
  await t.press("ControlOrMeta+Shift+P", "palette");
  await t.sleep(300);
  await page.keyboard.type("Open Integrated Browser", { delay: 25 });
  await until(8.6);
  await page.keyboard.press("Enter");

  const address = `http://localhost:${port}/platform-report.html`;
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
  await until(9.4);
  await page.keyboard.press("Enter");
  timing.enter = at();
  const view = await browserPage(t, address);
  await view.waitForLoadState("load");
  await view.getByRole("heading", { name: "Platform report, 2026" }).first().waitFor();
  timing.loaded = at();
  t.record("timing", timing);
  t.keyFrame("exported");

  // The same page in the browser: four loaded drawings, the wide table breaking out at Studio's width.
  await imagesLoaded(view);
  const browser = await wideOf(view);
  const browserWide = browserWideOf(browser);
  t.record("browserWide", browserWide);
  await until(9.8);

  // Beat 3: the zoom on the browser's page, narrowed so the wide table fits whole (about 1.25x, 2x at most).
  const area = await browserArea(t, view);
  t.record("browserArea", area);
  const pad = 24;
  const tableW = browser.service.width * area.k;
  const w = Math.min(area.w, Math.max(area.w / 1.25, tableW + 2 * pad));
  const centre = area.x + (browser.service.rect.x + browser.service.rect.w / 2) * area.k;
  const rect = { x: Math.min(area.x + area.w - w, Math.max(area.x, centre - w / 2)), y: area.y, w, h: area.h };
  t.record("zoomRect", rect);
  await until(10.2);
  t.zoom("page", rect);
  await until(10.4);
  // The pointer over the browser page, so the wheel reaches it.
  await t.moveTo(area.x + area.w / 2, area.y + area.h / 2, 0.4);
  await view.mouse.move(area.viewW / 2, area.viewH / 2);

  const air = (r) => ({ x: r.x - 6, y: r.y - 6, w: r.w + 12, h: r.h + 12 });
  const inside = (n, r) => {
    if (r.x < rect.x || r.y < rect.y || r.x + r.w > rect.x + rect.w || r.y + r.h > rect.y + rect.h) throw new Error(`mark ${n} is outside the zoom: ${JSON.stringify({ mark: r, zoom: rect })}`);
    return r;
  };
  const toWorkbench = (r) => ({ x: area.x + r.x * area.k, y: area.y + r.y * area.k, w: r.w * area.k, h: r.h * area.k });

  await until(10.8);
  await scrollBy(t, view, await distanceTo(view, "wide"), 0.8);
  const wide = toWorkbench((await wideOf(view)).service.rect);
  await until(11.8);
  t.mark("1", inside(1, air(wide)));
  await until(13.0);
  t.unmark("1");

  await until(13.2);
  await scrollBy(t, view, await distanceTo(view, "flow-bar"), 0.6);
  const flow = await inWorkbench(view, area, "img.myst-mermaid-image");
  const bar = await inWorkbench(view, area, "img.myst-vega-image");
  await until(14.0);
  t.mark("2", inside(2, air(flow)));
  await until(15.2);
  t.unmark("2");
  await until(15.4);
  t.mark("3", inside(3, air(bar)));
  await until(16.6);
  t.unmark("3");

  await until(17.0);
  t.unzoom("page");
  await t.moveTo(home.x, home.y, 0.6);
  await until(END);
}

/** The wide table of the browser page as the clip claims it: breaking out at Studio's width, no sideways scroll. */
function browserWideOf(measure) {
  breaksOut("the browser page", measure);
  const { service } = measure;
  if (studioWide && Math.abs(service.width - studioWide.width) > 2) {
    throw new Error(`the wide table is ${service.width} px in the browser and ${studioWide.width} px in Studio (more than 2 px apart)`);
  }
  return { width: service.width, paragraph: measure.paragraph, inner: measure.inner, right: service.right };
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
    const staged = Object.values(stage).concat("platform-report.html").sort();
    if (JSON.stringify(files) !== JSON.stringify(staged)) throw new Error(`the workspace holds ${JSON.stringify(files)}, expected ${JSON.stringify(staged)}`);
    const html = t.workspaceFile("platform-report.html");
    if (/<script/iu.test(html)) throw new Error("the exported file holds a <script");
    if (/<link/iu.test(html)) throw new Error("the exported file holds a <link");
    if (/@import/iu.test(html)) throw new Error("the exported file holds an @import");
    for (const match of html.matchAll(/\s(?:src|href)\s*=\s*"([^"]*)"/giu)) {
      if (!match[1].startsWith("#") && !match[1].startsWith("data:")) throw new Error(`the exported file loads ${match[1]}`);
    }
    const themeMode = /<html[^>]*data-sphinx-preview-theme-mode="([^"]*)"/iu.exec(html)?.[1];
    if (themeMode !== "cream") throw new Error(`the exported <html> carries theme mode ${themeMode}, expected cream`);
    const widthMode = /<html[^>]*data-sphinx-preview-width="([^"]*)"/iu.exec(html)?.[1];
    if (widthMode !== "auto") throw new Error(`the exported <html> carries width mode ${widthMode}, expected auto`);
    if (!html.includes("data-sphinx-preview-wide")) throw new Error("the exported file holds no data-sphinx-preview-wide (the wide table's wrapper)");
    // The drawings are <img> whose src is a data: URL of the SVG.
    const images = [...html.matchAll(/<img\b[^>]*>/giu)].map((match) => match[0]);
    for (const kind of ["myst-mermaid-image", "myst-vega-image"]) {
      const own = images.filter((image) => new RegExp(`class="[^"]*\\b${kind}\\b`, "iu").test(image));
      if (own.length !== 2) throw new Error(`the exported file holds ${own.length} img.${kind}, expected 2`);
      for (const image of own) {
        const src = /\ssrc\s*=\s*"([^"]*)"/iu.exec(image)?.[1] ?? "";
        if (!src.startsWith("data:image/svg+xml")) throw new Error(`an img.${kind} of the exported file has the src ${src.slice(0, 40)}, expected data:image/svg+xml`);
      }
    }
    const address = `http://localhost:${port}/platform-report.html`;
    const view = t.context.pages().find((candidate) => candidate.url() === address);
    if (!view) throw new Error(`the Integrated Browser page ${address} is gone`);
    await imagesLoaded(view);
    const browserWide = browserWideOf(await wideOf(view));
    if (t.workspaceFile("platform-report.md") !== readFileSync(STAGE_FILE, "utf8")) throw new Error("platform-report.md on disk is not the clip's stage file");
    return { size: html.length, themeMode, widthMode, studioWide, browserWide, port };
  } finally {
    await stopServer();
  }
}
