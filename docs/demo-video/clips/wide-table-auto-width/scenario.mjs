// The scenario of the clip: Studio on a deploys page, in reading mode, in Margin: a table of twelve months and a
// total is wider than the text column and is cut at its right edge (a sideways scroll); one click on the Width
// button of the floating toolbar sets Auto: the table breaks out of the column, centred, and shows every month and
// the total at once, while the heading and the paragraph stay where they were; then a light zoom and two marks, on
// the table and on the paragraph.
// The text of every caption and every time is in clip.md, not here.

/** One-click version (false), or the fallback that clicks twice more after the zoom, Full width then Margin, so the clip ends where it starts (the loop seam). */
const BACK_TO_MARGIN = false;

/** Clip-relative file to workspace-relative file. */
export const stage = { "stage/deploys.md": "deploys.md" };

/** Opened with the window, in Studio (see the editor association in the settings). */
export const open = ["deploys.md"];

/** No Studio setting: every setting at its default (preview.maxContentWidth stays at 960). Studio opens deploys.md, alone in the window. */
export const settings = {
  "workbench.editorAssociations": { "deploys.md": "markdown-okf-schema-studio.editor" },
};

/** A reading mode clip with no paste: check.json holds no paste-options line and wants reading mode at the start. */
export const checks = { editMode: "off", paste: false };

/** The text of deploys.md, character for character: stage/deploys.md (a test compares them). verify reads the file on disk against it. */
export const STAGE = [
  "# Deploys by service",
  "",
  "Each service ships on its own train. The table below counts the deploys of every month, so a team sees its busy seasons at a glance and plans its freezes around them. It is wide: one column per month.",
  "",
  "| Service | Team | Region | Tier | Jan | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep | Oct | Nov | Dec | Total |",
  "| --- | --- | --- | --- | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: | --: |",
  "| checkout-api | payments | eu-west | gold | 21 | 24 | 19 | 26 | 28 | 25 | 22 | 18 | 27 | 30 | 29 | 24 | 293 |",
  "| search-index | discovery | us-east | gold | 17 | 15 | 20 | 18 | 22 | 21 | 19 | 16 | 23 | 25 | 24 | 20 | 240 |",
  "| notifications | messaging | eu-west | silver | 12 | 14 | 11 | 15 | 13 | 16 | 12 | 10 | 14 | 17 | 15 | 13 | 162 |",
  "| media-store | content | ap-south | silver | 8 | 9 | 7 | 10 | 11 | 9 | 8 | 6 | 10 | 12 | 11 | 9 | 110 |",
  "| auth-gateway | identity | us-east | gold | 14 | 13 | 16 | 15 | 17 | 18 | 15 | 12 | 16 | 19 | 18 | 15 | 188 |",
  "",
  "The totals follow the release calendar of the platform team.",
  "",
].join("\n");

const WIDTH_BUTTON = "[data-sphinx-preview-width-toggle]";
/** The mode the Width button shows after a click, from the mode shown now. */
const NEXT = { margin: "auto", auto: "full", full: "margin" };
const TITLES = { margin: "Width: Margin", auto: "Width: Auto", full: "Width: Full width" };

/**
 * The page's layout, read from a fresh preview frame (the webview may reload): the width mode, the Width
 * button's title, the toolbar state, the edit mode, the page's client width, the paragraph's box, and the table
 * block (the child of the content that holds the table): its box, whether it is flagged wide, and the table's
 * scrollWidth, clientWidth and overflow flag. Boxes are in frame coordinates.
 */
async function layout(t) {
  for (let attempt = 0; attempt < 20; attempt++) {
    try {
      const frame = await t.frameOf();
      const state = await frame.evaluate(() => {
        const root = document.documentElement;
        const content = document.getElementById("sphinx-myst-preview-content");
        const box = (el) => {
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { x: r.left, y: r.top, w: r.width, h: r.height };
        };
        const paragraph = content?.querySelector(":scope > p") ?? null;
        const table = content?.querySelector("table") ?? null;
        const block = table ? ([...content.children].find((child) => child.contains(table)) ?? null) : null;
        return {
          mode: root.getAttribute("data-sphinx-preview-width"),
          title: document.querySelector("[data-sphinx-preview-width-toggle]")?.getAttribute("title") ?? null,
          toolbar: root.getAttribute("data-sphinx-preview-toolbar-state"),
          editMode: root.getAttribute("data-sphinx-preview-edit-mode"),
          clientWidth: root.clientWidth,
          paragraph: box(paragraph),
          block: box(block),
          wide: block ? block.hasAttribute("data-sphinx-preview-wide") : null,
          scrollWidth: table?.scrollWidth ?? null,
          tableClientWidth: table?.clientWidth ?? null,
          overflow: table?.getAttribute("data-sphinx-table-overflow") ?? null,
        };
      });
      if (state.paragraph && state.block) return { frame, ...state };
    } catch {
      // the webview reloads while the layout changes
    }
    await t.sleep(300);
  }
  throw new Error("the preview frame never settled");
}

const describe = (s) =>
  JSON.stringify({
    mode: s.mode,
    title: s.title,
    wide: s.wide,
    clientWidth: s.clientWidth,
    paragraph: s.paragraph,
    block: s.block,
    scrollWidth: s.scrollWidth,
    tableClientWidth: s.tableClientWidth,
    overflow: s.overflow,
  });

/** The centre of the Width button, in page coordinates. */
async function widthButton(frame) {
  const box = await frame.locator(WIDTH_BUTTON).first().boundingBox();
  if (!box) throw new Error("the Width button has no box");
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** The box of an element, in page coordinates. */
async function pageBox(frame, selector) {
  const box = await frame.locator(selector).first().boundingBox();
  if (!box) throw new Error(`no box for ${selector}`);
  return { x: box.x, y: box.y, w: box.width, h: box.height };
}

/** The Margin state: not wide, the table overflows the column and carries the overflow flag. Returns what is wrong, or null. */
function marginProblem(s) {
  if (s.mode !== "margin" || s.title !== TITLES.margin) return `not in Margin: ${describe(s)}`;
  if (s.wide) return `the table block is flagged wide in Margin: ${describe(s)}`;
  if (!(s.scrollWidth > s.tableClientWidth + 1)) return `the table does not overflow in Margin: ${describe(s)}`;
  if (s.overflow !== "true") return `the table has no overflow flag in Margin: ${describe(s)}`;
  return null;
}

/** The Auto state: broken out on both sides of the paragraph, centred, no overflow, the paragraph unmoved from `before`. Returns what is wrong, or null. */
function autoProblem(s, before) {
  if (s.mode !== "auto" || s.title !== TITLES.auto) return `not in Auto: ${describe(s)}`;
  if (!s.wide) return `the table block is not flagged wide in Auto: ${describe(s)}`;
  const left = s.block.x;
  const right = s.block.x + s.block.w;
  if (!(left < s.paragraph.x && right > s.paragraph.x + s.paragraph.w)) return `the table does not break out on both sides: ${describe(s)}`;
  if (Math.abs((left + right) / 2 - s.clientWidth / 2) > 2) return `the table is not centred: ${describe(s)}`;
  if (!(s.scrollWidth <= s.tableClientWidth + 1)) return `the table still overflows in Auto: ${describe(s)}`;
  if (Math.abs(s.paragraph.x - before.paragraph.x) > 1 || Math.abs(s.paragraph.w - before.paragraph.w) > 1) {
    return `the paragraph moved: ${describe(s)} before ${JSON.stringify(before.paragraph)}`;
  }
  return null;
}

/** Waits until the page shows `mode` (and the button its title). */
async function waitForMode(t, mode, seconds) {
  const limit = Date.now() + seconds * 1000;
  let s = await layout(t);
  while (!(s.mode === mode && s.title === TITLES[mode])) {
    if (Date.now() > limit) throw new Error(`the page did not reach ${mode}: ${describe(s)}`);
    await t.sleep(50);
    s = await layout(t);
  }
  return s;
}

/** Off camera: the toolbar expanded, reading mode, Margin (checked), the Auto width measured, Margin again, the pointer parked. */
export async function setup(t) {
  await t.frameOf();
  await t.sleep(1500);
  let s = await layout(t);
  if (s.toolbar === "collapsed") {
    await s.frame.locator("[data-sphinx-preview-toolbar-collapse]").first().click();
    for (let i = 0; i < 20 && s.toolbar !== "expanded"; i++) {
      await t.sleep(250);
      s = await layout(t);
    }
  }
  if (s.toolbar !== "expanded") throw new Error(`the toolbar is not expanded (data-sphinx-preview-toolbar-state is ${s.toolbar})`);
  if (s.editMode === "on") {
    await s.frame.locator("[data-sphinx-preview-edit-toggle]").first().click();
    for (let i = 0; i < 20 && s.editMode !== "off"; i++) {
      await t.sleep(250);
      s = await layout(t);
    }
  }
  t.record("readingMode", s.editMode);
  if (s.editMode !== "off") throw new Error(`Studio is not in reading mode (data-sphinx-preview-edit-mode is ${s.editMode})`);
  const theme = await s.frame.evaluate(() => document.documentElement.getAttribute("data-sphinx-preview-theme-mode"));
  if (theme !== "cream") throw new Error(`the page is not in the Cream theme (data-sphinx-preview-theme-mode is ${theme})`);
  // The start mode: Margin, whatever mode the workspace stored (the button cycles Margin, Auto, Full width).
  for (let clicks = 0; clicks < 3 && s.mode !== "margin"; clicks++) {
    const previous = s.mode;
    await s.frame.locator(WIDTH_BUTTON).first().click();
    for (let i = 0; i < 40 && s.mode === previous; i++) {
      await t.sleep(100);
      s = await layout(t);
    }
  }
  await t.sleep(400);
  s = await layout(t);
  let problem = marginProblem(s);
  if (problem) throw new Error(problem);
  // Measure Auto off camera: the table must be wider than the column and fit in the room.
  const margin = s;
  await s.frame.locator(WIDTH_BUTTON).first().click();
  s = await waitForMode(t, NEXT.margin, 3);
  await t.sleep(400);
  s = await layout(t);
  problem = autoProblem(s, margin);
  if (problem) throw new Error(`the table must be narrowed: ${problem}`);
  t.record("autoWidth", {
    table: s.block.w,
    column: s.paragraph.w,
    room: s.clientWidth - 32,
    marginScrollWidth: margin.scrollWidth,
    marginClientWidth: margin.tableClientWidth,
  });
  // Back to Margin: Full width, then Margin.
  await s.frame.locator(WIDTH_BUTTON).first().click();
  s = await waitForMode(t, NEXT.auto, 3);
  await s.frame.locator(WIDTH_BUTTON).first().click();
  s = await waitForMode(t, NEXT.full, 3);
  await t.sleep(400);
  s = await layout(t);
  problem = marginProblem(s);
  if (problem) throw new Error(problem);
  // Park the pointer in the blank area right of the heading, off the toolbar and off every block: frame 0 shows no hover.
  const content = await s.frame.locator("#sphinx-myst-preview-content").first().boundingBox();
  const heading = await s.frame.locator("#sphinx-myst-preview-content h1").first().boundingBox();
  const width = await s.frame.evaluate(() => window.innerWidth);
  const x = Math.min(content.x + content.width + 120, content.x + width - 40);
  await t.moveTo(x, heading.y + heading.height / 2, 0.1);
  await t.sleep(800);
}

/** The filmed action: one click on the Width button, Margin to Auto, then the zoom and two marks. */
export async function run(t) {
  const start = Date.now();
  const until = (seconds) => t.sleep(Math.max(0, start + seconds * 1000 - Date.now()));
  const home = { ...t.pointer };
  const before = await layout(t);
  const modes = [before.mode];
  const button = await widthButton(before.frame);

  await until(0.3);
  await t.moveTo(button.x, button.y, 1.2);
  await until(2.3);
  t.keyFrame("margin");

  await until(2.5);
  await t.click();
  // Auto, broken out, centred, no overflow, the paragraph unmoved, within 1.5 s.
  const limit = Date.now() + 1500;
  let state = await layout(t);
  let problem = autoProblem(state, before);
  while (problem) {
    if (Date.now() > limit) throw new Error(`the page did not reach Auto: ${problem}`);
    await t.sleep(50);
    state = await layout(t);
    problem = autoProblem(state, before);
  }
  modes.push(state.mode);
  t.record("auto", {
    table: state.block,
    paragraph: state.paragraph,
    clientWidth: state.clientWidth,
    scrollWidth: state.scrollWidth,
    tableClientWidth: state.tableClientWidth,
  });

  await t.moveTo(home.x, home.y, 0.5);
  await until(3.6);
  t.keyFrame("auto");

  await until(3.8);
  const frame = await t.frameOf();
  const paragraph = await pageBox(frame, "#sphinx-myst-preview-content > p");
  const tableBox = await tableBlockBox(frame);
  const pad = 24;
  const x = Math.min(paragraph.x, tableBox.x) - pad;
  const y = Math.min(paragraph.y, tableBox.y) - pad;
  const right = Math.max(paragraph.x + paragraph.w, tableBox.x + tableBox.w) + pad;
  const bottom = Math.max(paragraph.y + paragraph.h, tableBox.y + tableBox.h) + pad;
  t.zoom("page", { x, y, w: right - x, h: bottom - y });

  const air = (r) => ({ x: r.x - 8, y: r.y - 8, w: r.w + 16, h: r.h + 16 });
  await until(4.4);
  t.mark("1", air(tableBox));
  await until(6.6);
  t.unmark("1");
  await until(6.8);
  t.mark("2", air(paragraph));
  await until(9.0);
  t.unmark("2");
  await until(9.6);
  t.unzoom("page");

  if (!BACK_TO_MARGIN) {
    await until(10.6);
  } else {
    await t.moveTo(button.x, button.y, 0.5);
    await until(10.2);
    await t.click();
    state = await waitForMode(t, "full", 1.5);
    modes.push(state.mode);
    await until(10.8);
    await t.click();
    state = await waitForMode(t, "margin", 1.5);
    modes.push(state.mode);
    await t.sleep(300);
    state = await layout(t);
    problem = marginProblem(state);
    if (!problem && (Math.abs(state.paragraph.x - before.paragraph.x) > 1 || Math.abs(state.paragraph.w - before.paragraph.w) > 1)) {
      problem = `the paragraph is not where it started: ${describe(state)}`;
    }
    if (problem) throw new Error(problem);
    await t.moveTo(home.x, home.y, 0.4);
    await until(11.8);
  }
  t.record("widthModes", modes);
}

/** The box of the table's top-level block, in page coordinates. */
async function tableBlockBox(frame) {
  const offset = await (await frame.frameElement()).boundingBox();
  const block = await frame.evaluate(() => {
    const content = document.getElementById("sphinx-myst-preview-content");
    const table = content.querySelector("table");
    const el = [...content.children].find((child) => child.contains(table));
    const r = el.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  });
  return { x: block.x + offset.x, y: block.y + offset.y, w: block.w, h: block.h };
}

/** deploys.md on disk must be the stage, byte for byte: the width mode is a view choice, the file is never changed. */
export async function verify(t) {
  const text = t.workspaceFile("deploys.md");
  if (text !== STAGE) throw new Error(`deploys.md changed on disk: ${JSON.stringify(text)}`);
  return { modes: t.notes.widthModes ?? [], auto: t.notes.auto ?? null, unchanged: true };
}
