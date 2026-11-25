// The scenario of the clip: Studio on one design note, in reading mode and in Cream. The clip zooms on the
// column once, then outlines six renderings in turn: a Mermaid flowchart, a PlantUML sequence (the built-in
// engine, no Java) and a Vega-Lite line chart in the first view; the page scrolls once under the zoom, then a
// Vega bar chart, a KaTeX display equation and an inline SVG drawing in the second view; the page scrolls back
// to the top and the zoom goes out.
// The text of every caption and every time is in clip.md, not here.
import { readFileSync, readdirSync } from "node:fs";

/** Clip-relative file to workspace-relative file. */
export const stage = { "stage/search-design.md": "search-design.md" };

/** Opened with the window, in Studio (see the editor association in the settings). */
export const open = ["search-design.md"];

/** No Studio setting: every setting at its default, so PlantUML draws with its built-in engine (no Java, no JAR). */
export const settings = {
  "workbench.editorAssociations": { "search-design.md": "markdown-okf-schema-studio.editor" },
};

/** A reading mode clip with no paste: check.json holds no paste-options line and wants reading mode at the start. */
export const checks = { editMode: "off", paste: false };

const STAGE_FILE = new URL("stage/search-design.md", import.meta.url);

const MERMAID = ".myst-mermaid-diagram";
const PLANTUML = ".myst-plantuml-diagram";
const VEGA_LITE = '.myst-vega-diagram[data-myst-chart-kind="vega-lite"]';
const VEGA = '.myst-vega-diagram[data-myst-chart-kind="vega"]';
const THEME_TOGGLE = "[data-sphinx-preview-theme-toggle]";
const EDIT_TOGGLE = "[data-sphinx-preview-edit-toggle]";
const CONTENT = "#sphinx-myst-preview-content";

/** What each mark outlines: the drawing itself (the image, the typeset equation, the inline SVG). */
const DRAWINGS = {
  1: `${MERMAID} img.myst-mermaid-image`,
  2: `${PLANTUML} img.myst-plantuml-image`,
  3: `${VEGA_LITE} img.myst-vega-image`,
  4: `${VEGA} img.myst-vega-image`,
  5: ".math-display .katex-display",
  6: "figure.myst-svg-figure > svg",
};

/** Reads, in the preview frame, whether the six renderings are drawn and no PlantUML block shows an error. */
async function readDrawn(frame) {
  return frame.evaluate(
    ([mermaid, plantuml, vegaLite, vega]) => {
      const block = (selector) => {
        const element = document.querySelector(selector);
        return element ? { state: element.getAttribute("data-render-state"), image: element.querySelector("img") !== null } : null;
      };
      return {
        mermaid: block(mermaid),
        plantuml: block(plantuml),
        vegaLite: block(vegaLite),
        vega: block(vega),
        katex: document.querySelector(".math-display .katex") !== null,
        svg: document.querySelector("figure.myst-svg-figure svg") !== null,
        plantumlErrors: document.querySelectorAll(".myst-plantuml-error").length,
      };
    },
    [MERMAID, PLANTUML, VEGA_LITE, VEGA],
  );
}

const isDrawn = (found) =>
  ["mermaid", "plantuml", "vegaLite", "vega"].every((key) => found[key]?.state === "rendered" && found[key].image) && found.katex && found.svg && found.plantumlErrors === 0;

/** Throws, with what was found, unless all six renderings are drawn (a finding against the feature, never retried by a setting). */
async function drawn(frame, label) {
  const found = await readDrawn(frame);
  if (!isDrawn(found)) throw new Error(`${label}: the six renderings are not all drawn: ${JSON.stringify(found)}`);
  return found;
}

/** The box of the first element matching a selector, in page coordinates. */
async function boxOf(frame, selector) {
  const box = await frame.locator(selector).first().boundingBox();
  if (!box) throw new Error(`no box for ${selector}`);
  return { x: box.x, y: box.y, w: box.width, h: box.height };
}

/** The box of the display equation: the `.katex-display` block, else the `.katex` element. */
async function mathBox(frame) {
  const display = await frame.locator(DRAWINGS[5]).count();
  return boxOf(frame, display > 0 ? DRAWINGS[5] : ".math-display .katex");
}

const drawingBox = (frame, id) => (id === 5 ? mathBox(frame) : boxOf(frame, DRAWINGS[id]));
const headingTop = async (frame) => (await frame.locator(`${CONTENT} h2`, { hasText: "Capacity" }).first().boundingBox())?.y;
const air = (r) => ({ x: r.x - 8, y: r.y - 8, w: r.w + 16, h: r.h + 16 });
const inside = (inner, outer) => inner.x >= outer.x - 0.5 && inner.y >= outer.y - 0.5 && inner.x + inner.w <= outer.x + outer.w + 0.5 && inner.y + inner.h <= outer.y + outer.h + 0.5;
const rectText = (r) => `{x ${r.x.toFixed(1)}, y ${r.y.toFixed(1)}, w ${r.w.toFixed(1)}, h ${r.h.toFixed(1)}}`;

/** The scroll way the take used: "wheel" (CDP mouse wheel) or "scrollTo" (eased scrollBy steps in the preview frame). */
let scrollWay;

/** An instant scrollBy of the element that scrolls the preview (the first scrollable ancestor of the content, else the document). */
async function scrollStep(frame, dy) {
  await frame.evaluate(
    ([content, by]) => {
      let element = document.querySelector(content);
      while (element && !(element.scrollHeight > element.clientHeight + 1 && /auto|scroll/u.test(getComputedStyle(element).overflowY))) element = element.parentElement;
      (element ?? document.scrollingElement).scrollBy({ top: by, behavior: "instant" });
    },
    [CONTENT, dy],
  );
}

/**
 * Scrolls the page by `dy` pixels (positive goes down) over about `seconds`, with the pointer over the preview:
 * a CDP wheel, or a smooth scrollBy when the wheel did not move the page after its first steps. Then waits until
 * two reads of the Capacity heading, 100 ms apart, are equal. Returns the heading's top before and after.
 */
async function scrollBy(t, dy, seconds) {
  let frame = await t.frameOf();
  const before = await headingTop(frame);
  const steps = Math.max(4, Math.round(seconds / 0.05));
  const probe = 6;
  if (scrollWay !== "scrollTo") {
    for (let step = 1; step <= steps; step++) {
      await t.page.mouse.wheel(0, dy / steps);
      await t.sleep((seconds * 1000) / steps);
      if (step === probe && scrollWay === undefined) {
        const moved = Math.abs((await headingTop(frame)) - before);
        if (moved < 1) {
          scrollWay = "scrollTo";
          break;
        }
        scrollWay = "wheel";
      }
    }
  }
  if (scrollWay === "scrollTo") {
    // A smooth scroll in the preview frame: small eased steps, 50 ms apart, so the screencast sees the motion.
    const rest = dy - (before - (await headingTop(frame)));
    const ease = (k) => (k < 0.5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2);
    let done = 0;
    for (let step = 1; step <= steps; step++) {
      const target = rest * ease(step / steps);
      await scrollStep(frame, target - done);
      done = target;
      await t.sleep((seconds * 1000) / steps);
    }
  }
  frame = await t.frameOf();
  let last = await headingTop(frame);
  for (let attempt = 0; attempt < 40; attempt++) {
    await t.sleep(100);
    const now = await headingTop(frame);
    if (now === last) break;
    last = now;
  }
  return { before, after: last };
}

/** Off camera: reading mode, the page in Cream and at the top, the six renderings drawn, the pointer parked. */
export async function setup(t) {
  let frame = await t.frameOf();
  await t.sleep(1500);
  frame = await t.frameOf();
  const readMode = () => frame.evaluate(() => document.documentElement.getAttribute("data-sphinx-preview-edit-mode"));
  let mode = await readMode();
  if (mode === "on") {
    await frame.locator(EDIT_TOGGLE).first().click();
    for (let i = 0; i < 20 && mode !== "off"; i++) {
      await t.sleep(250);
      frame = await t.frameOf();
      mode = await readMode();
    }
  }
  t.record("readingMode", mode);
  if (mode !== "off") throw new Error(`Studio is not in reading mode (data-sphinx-preview-edit-mode is ${mode})`);
  // Cream, whatever mode the workspace stored (a fresh workspace is in Cream).
  const themeMode = () => frame.evaluate(() => document.documentElement.getAttribute("data-sphinx-preview-theme-mode"));
  let theme = await themeMode();
  for (let clicks = 0; clicks < 4 && theme !== "cream"; clicks++) {
    await frame.locator(THEME_TOGGLE).first().click();
    await t.sleep(1200);
    frame = await t.frameOf();
    theme = await themeMode();
  }
  if (theme !== "cream") throw new Error(`the page did not reach the Cream theme (data-sphinx-preview-theme-mode is ${theme})`);
  // Scrolled to the top, then wait for the six renderings.
  await frame.evaluate((content) => {
    let element = document.querySelector(content);
    while (element) {
      element.scrollTop = 0;
      element = element.parentElement;
    }
    document.scrollingElement.scrollTop = 0;
  }, CONTENT);
  const limit = Date.now() + 30000;
  let found = await readDrawn(frame);
  while (!isDrawn(found) && Date.now() < limit) {
    await t.sleep(250);
    frame = await t.frameOf();
    found = await readDrawn(frame);
  }
  if (!isDrawn(found)) throw new Error(`the six renderings are not all drawn after 30 s: ${JSON.stringify(found)}`);
  // Park the pointer in the blank right part of the page, off the toolbar and off every block: frame 0 and the
  // last frame show no hover.
  const content = await boxOf(frame, CONTENT);
  const heading = await boxOf(frame, `${CONTENT} h1`);
  const width = await frame.evaluate(() => window.innerWidth);
  const x = Math.min(content.x + content.w + 120, content.x + width - 40);
  await t.moveTo(x, heading.y + heading.h / 2, 0.1);
  await t.sleep(800);
}

/** The filmed action, at the times of clip.md: the zoom, three marks, one scroll, three marks, the scroll back, the zoom out. */
export async function run(t) {
  const start = Date.now();
  const until = (seconds) => t.sleep(Math.max(0, start + seconds * 1000 - Date.now()));
  let frame = await t.frameOf();
  await drawn(frame, "at the start");

  // The zoom rect: the content column, narrowed to the three drawings of the first view (their blocks, so the
  // collapsed "source" lines are in), padded by 24 px; kept at least half of the window so the zoom stays under 2x.
  const blocks = [await boxOf(frame, MERMAID), await boxOf(frame, PLANTUML), await boxOf(frame, VEGA_LITE)];
  const column = await boxOf(frame, CONTENT);
  const pad = 24;
  const left = Math.max(column.x, Math.min(...blocks.map((b) => b.x)) - pad);
  const top = Math.min(...blocks.map((b) => b.y)) - pad;
  const right = Math.min(column.x + column.w, Math.max(...blocks.map((b) => b.x + b.w)) + pad);
  const bottom = Math.max(...blocks.map((b) => b.y + b.h)) + pad;
  let zoomRect = { x: left, y: top, w: right - left, h: bottom - top };
  const [windowWidth, windowHeight] = await t.page.evaluate(() => [innerWidth, innerHeight]);
  if (zoomRect.w < windowWidth / 2) zoomRect = { ...zoomRect, x: zoomRect.x - (windowWidth / 2 - zoomRect.w) / 2, w: windowWidth / 2 };
  if (zoomRect.h < windowHeight / 2) zoomRect = { ...zoomRect, y: zoomRect.y - (windowHeight / 2 - zoomRect.h) / 2, h: windowHeight / 2 };
  const heading0 = await headingTop(frame);

  const marks = [];
  const showMark = async (id, from, to) => {
    await until(from);
    const found = await drawn(await t.frameOf(), `before mark ${id}`);
    const rect = air(await drawingBox(await t.frameOf(), id));
    if (!inside(rect, zoomRect)) throw new Error(`mark ${id} is outside the zoom: mark ${rectText(rect)}, zoom ${rectText(zoomRect)}`);
    t.mark(String(id), rect);
    marks.push({ id: String(id), ...rect });
    await until(to);
    t.unmark(String(id));
    return found;
  };

  await until(0.4);
  t.zoom("tour", zoomRect);
  await showMark(1, 1.0, 2.9);
  await showMark(2, 3.0, 5.1);
  await showMark(3, 5.2, 7.3);

  // The scroll: the Capacity heading goes to the top of the zoom rect.
  await until(7.4);
  // The Capacity heading goes to the top of the zoom rect, or further when that would leave the SVG drawing below it.
  const svg0 = await boxOf(await t.frameOf(), DRAWINGS[6]);
  const wanted = Math.max(heading0 - zoomRect.y - 4, svg0.y + svg0.h + 16 - (zoomRect.y + zoomRect.h) + 4);
  const first = await scrollBy(t, wanted, 0.8);
  t.record("scroll", scrollWay);
  t.record("scrollMoved", Math.round(first.before - first.after));
  console.log(`scroll: wanted ${wanted.toFixed(1)}, heading ${first.before} -> ${first.after}, svg0 ${rectText(svg0)}, zoom ${rectText(zoomRect)}, way ${scrollWay}`);
  await showMark(4, 8.2, 9.9);
  await showMark(5, 10.0, 12.1);
  await showMark(6, 12.2, 14.3);

  // Back to the top, then the zoom goes out and the page is still for the last frames.
  await until(14.4);
  const back = await scrollBy(t, first.after - first.before, 0.6);
  const miss = back.after - heading0;
  if (Math.abs(miss) > 1) {
    // The wheel stops a pixel or two off the top: bring the page back exactly, so the last frame matches frame 0.
    await scrollBy(t, -miss, 0.1);
  }
  await until(15.0);
  t.unzoom("tour");
  t.record("marks", marks);
  t.record("zoom", zoomRect);
  await until(16.0);
}

/** search-design.md on disk must be the stage, byte for byte; no new file; the six renderings still drawn at the end. */
export async function verify(t) {
  if (t.workspaceFile("search-design.md") !== readFileSync(STAGE_FILE, "utf8")) throw new Error("search-design.md changed on disk");
  const frame = await t.frameOf();
  const found = await readDrawn(frame);
  if (found.plantumlErrors !== 0) throw new Error(`a PlantUML block shows an error at the end: ${JSON.stringify(found)}`);
  if (!isDrawn(found)) throw new Error(`the six renderings are not all drawn at the end: ${JSON.stringify(found)}`);
  const files = readdirSync(t.workspace).filter((name) => !name.startsWith("."));
  if (files.length !== 1 || files[0] !== "search-design.md") throw new Error(`the workspace holds ${JSON.stringify(files)} instead of search-design.md alone`);
  return { scroll: scrollWay, unchanged: true };
}
