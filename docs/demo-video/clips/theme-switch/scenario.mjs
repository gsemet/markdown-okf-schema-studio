// The scenario of the clip: Studio on a handbook page, in reading mode; the Theme button of the floating
// toolbar is clicked four times, from Cream through the current theme, Dark and White back to Cream; the whole
// page changes theme and the Mermaid diagram and the Vega-Lite chart are drawn again in the new colours; then the
// clip zooms on the diagram and the chart.
// The text of every caption and every time is in clip.md, not here.

/** Clip-relative file to workspace-relative file. */
export const stage = { "stage/handbook.md": "handbook.md" };

/** Opened with the window, in Studio (see the editor association in the settings). */
export const open = ["handbook.md"];

/** No Studio setting: every setting at its default. Studio opens handbook.md, alone in the window. */
export const settings = {
  "workbench.editorAssociations": { "handbook.md": "markdown-okf-schema-studio.editor" },
};

/** A reading mode clip with no paste: check.json holds no paste-options line and wants reading mode at the start. */
export const checks = { editMode: "off", paste: false };

/** The text of handbook.md, character for character: stage/handbook.md (a test compares them). verify reads the file on disk against it. */
export const STAGE = [
  "# Support handbook",
  "",
  "A ticket goes from triage to a fix in one working day.",
  "",
  ":::{tip}",
  "Tag the ticket before you start: the chart below counts tags.",
  ":::",
  "",
  "```mermaid",
  "flowchart LR",
  "  A[Triage] --> B[Reproduce] --> C[Fix] --> D[Release]",
  "```",
  "",
  "```vega-lite",
  "{",
  '  "width": 360,',
  '  "height": 110,',
  '  "data": { "values": [',
  '    { "tag": "bug", "count": 14 },',
  '    { "tag": "question", "count": 9 },',
  '    { "tag": "feature", "count": 5 }',
  "  ] },",
  '  "mark": "bar",',
  '  "encoding": {',
  '    "x": { "field": "count", "type": "quantitative" },',
  '    "y": { "field": "tag", "type": "nominal", "sort": "-x" }',
  "  }",
  "}",
  "```",
  "",
].join("\n");

/** The mode the Theme button shows after a click, from the mode shown now. */
const NEXT = { current: "dark", dark: "white", white: "cream", cream: "current" };

const THEME_BUTTON = "[data-sphinx-preview-theme-toggle]";
const DIAGRAM = ".myst-mermaid-diagram img.myst-mermaid-image";
const CHART = ".myst-vega-diagram .myst-vega-view > svg";

/**
 * The page's state, read from a fresh preview frame (the webview reloads while the layout changes): the
 * theme mode, the edit mode, the toolbar state, the theme button's title and the `src` of the diagram and the markup of the chart.
 */
async function pageState(t) {
  for (let attempt = 0; attempt < 20; attempt++) {
    try {
      const frame = await t.frameOf();
      const state = await frame.evaluate(
        ([diagram, chart]) => ({
          mode: document.documentElement.getAttribute("data-sphinx-preview-theme-mode"),
          editMode: document.documentElement.getAttribute("data-sphinx-preview-edit-mode"),
          toolbar: document.documentElement.getAttribute("data-sphinx-preview-toolbar-state"),
          title: document.querySelector("[data-sphinx-preview-theme-toggle]")?.getAttribute("title") ?? null,
          diagram: document.querySelector(diagram)?.getAttribute("src") ?? null,
          chart: document.querySelector(chart)?.outerHTML ?? null,
        }),
        [DIAGRAM, CHART],
      );
      return { frame, ...state };
    } catch {
      await t.sleep(300);
    }
  }
  throw new Error("the preview frame never settled");
}

const describe = (state) => JSON.stringify({ mode: state.mode, title: state.title, diagram: state.diagram?.length ?? null, chart: state.chart?.length ?? null });

/**
 * Waits until `mode` is shown and both drawings are present and differ from the ones of `before`: the diagram
 * and the chart were drawn again in the new colours. A drawing that stays is a finding against the feature.
 */
async function waitForMode(t, mode, before, seconds) {
  const limit = Date.now() + seconds * 1000;
  let state = await pageState(t);
  for (;;) {
    if (state.mode === mode && state.diagram && state.chart && state.diagram !== before.diagram && state.chart !== before.chart) return state;
    if (Date.now() > limit) throw new Error(`the page did not draw the diagram and the chart again in ${mode}: ${describe(state)}`);
    await t.sleep(50);
    state = await pageState(t);
  }
}

/** The centre of the Theme button, in page coordinates. */
async function themeButton(frame) {
  const box = await frame.locator(THEME_BUTTON).first().boundingBox();
  if (!box) throw new Error("the Theme button has no box");
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** The box of a drawing (the diagram `img` or the chart `svg`), in page coordinates. */
async function drawingBox(frame, selector) {
  const box = await frame.locator(selector).first().boundingBox();
  if (!box) throw new Error(`no box for ${selector}`);
  return { x: box.x, y: box.y, w: box.width, h: box.height };
}

/** Off camera: the toolbar expanded, reading mode, the page in Cream, both drawings rendered, the pointer parked. */
export async function setup(t) {
  await t.frameOf();
  await t.sleep(1500);
  let state = await pageState(t);
  if (state.toolbar === "collapsed") {
    await state.frame.locator("[data-sphinx-preview-toolbar-collapse]").first().click();
    for (let i = 0; i < 20 && state.toolbar !== "expanded"; i++) {
      await t.sleep(250);
      state = await pageState(t);
    }
  }
  if (state.toolbar !== "expanded") throw new Error(`the toolbar is not expanded (data-sphinx-preview-toolbar-state is ${state.toolbar})`);
  if (state.editMode === "on") {
    await state.frame.locator("[data-sphinx-preview-edit-toggle]").first().click();
    for (let i = 0; i < 20 && state.editMode !== "off"; i++) {
      await t.sleep(250);
      state = await pageState(t);
    }
  }
  t.record("readingMode", state.editMode);
  if (state.editMode !== "off") throw new Error(`Studio is not in reading mode (data-sphinx-preview-edit-mode is ${state.editMode})`);
  // The start mode: Cream (the default of a fresh workspace), whatever mode the workspace stored.
  for (let clicks = 0; clicks < 4 && state.mode !== "cream"; clicks++) {
    const before = state;
    await state.frame.locator(THEME_BUTTON).first().click();
    state = await waitForMode(t, NEXT[before.mode], before, 3);
  }
  if (state.mode !== "cream") throw new Error(`the page did not reach the Cream theme: ${describe(state)}`);
  // Both drawings rendered, in Cream.
  for (let i = 0; i < 40; i++) {
    const rendered = await state.frame.evaluate(() => [...document.querySelectorAll(".myst-mermaid-diagram, .myst-vega-diagram")].map((e) => e.getAttribute("data-render-state")));
    state = await pageState(t);
    if (rendered.length === 2 && rendered.every((value) => value === "rendered") && state.diagram && state.chart) break;
    await t.sleep(250);
  }
  if (!state.diagram || !state.chart) throw new Error(`the diagram and the chart are not drawn: ${describe(state)}`);
  // Park the pointer in the blank right part of the page, off the toolbar and off every block: frame 0 and the
  // last frame show no hover.
  const content = await state.frame.locator("#sphinx-myst-preview-content").first().boundingBox();
  const heading = await state.frame.locator("#sphinx-myst-preview-content h1").first().boundingBox();
  const width = await state.frame.evaluate(() => window.innerWidth);
  const x = Math.min(content.x + content.width + 120, content.x + width - 40);
  await t.moveTo(x, heading.y + heading.height / 2, 0.1);
  await t.sleep(800);
}

/** The filmed action: four clicks on the Theme button, from Cream back to Cream, then the zoom on the diagram and the chart. */
export async function run(t) {
  const start = Date.now();
  const until = (seconds) => t.sleep(Math.max(0, start + seconds * 1000 - Date.now()));
  const home = { ...t.pointer };
  const first = await pageState(t);
  const button = await themeButton(first.frame);
  const titles = {
    current: "Current theme (click for dark theme)",
    dark: "Dark theme (click for white theme)",
    white: "White theme (click for cream theme)",
    cream: "Cream theme (click for current theme)",
  };

  await until(0.3);
  await t.moveTo(button.x, button.y, 0.6);

  // Cream, current, Dark, White, Cream: each click, 0.8 s apart, must draw the diagram and the chart again.
  let state = first;
  const modes = [first.mode];
  const clicks = [0.9, 1.7, 2.5, 3.3];
  for (const [index, at] of clicks.entries()) {
    await until(at);
    await t.click();
    const mode = NEXT[state.mode];
    state = await waitForMode(t, mode, state, 1.5);
    if (state.title !== titles[mode]) throw new Error(`the Theme button reads "${state.title}" in ${mode}`);
    modes.push(mode);
    // A key frame once the fade is over, before the next click (the last one waits for the pointer to leave).
    if (index === 1) {
      await until(at + 0.55);
      t.keyFrame("dark");
    } else if (index === 2) {
      await until(at + 0.55);
      t.keyFrame("white");
    }
  }
  await t.moveTo(home.x, home.y, 0.5);
  await until(4.3);
  t.keyFrame("cream");

  await until(4.6);
  const frame = await t.frameOf();
  const diagram = await drawingBox(frame, DIAGRAM);
  const chart = await drawingBox(frame, CHART);
  const pad = 24;
  const x = Math.min(diagram.x, chart.x) - pad;
  const y = Math.min(diagram.y, chart.y) - pad;
  const right = Math.max(diagram.x + diagram.w, chart.x + chart.w) + pad;
  const bottom = Math.max(diagram.y + diagram.h, chart.y + chart.h) + pad;
  t.zoom("charts", { x, y, w: right - x, h: bottom - y });

  const air = (r) => ({ x: r.x - 8, y: r.y - 8, w: r.w + 16, h: r.h + 16 });
  await until(5.2);
  t.mark("1", air(diagram));
  await until(7.0);
  t.unmark("1");
  t.mark("2", air(chart));
  await until(8.8);
  t.unmark("2");
  await until(9.9);
  t.unzoom("charts");
  t.record("themeModes", modes);
  await until(10.9);
}

/** handbook.md on disk must be the stage, byte for byte: the theme is a view choice, the file is never changed. */
export async function verify(t) {
  const text = t.workspaceFile("handbook.md");
  if (text !== STAGE) throw new Error(`handbook.md changed on disk: ${JSON.stringify(text)}`);
  return { modes: t.notes.themeModes ?? [], unchanged: true };
}
