// The scenario of the clip: in Studio's edit mode, a click at the end of a paragraph opens its block editor with the
// palette in GFM mode; Ctrl+Shift+M focuses the palette's mode select and Down switches it to MyST, which adds the MyST
// buttons; a zoom then marks the MyST buttons, the rendered GitHub alert above the paragraph and the rendered MyST tip
// below it, which render the same as before; Escape closes the unchanged editor so the clip loops.
// The text of every caption, badge and time is in clip.md, not here.

/** Clip-relative file to workspace-relative file. */
export const stage = { "stage/release-plan.md": "release-plan.md" };

/** Opened with the window, in Studio (see the editor association in the settings). */
export const open = ["release-plan.md"];

/** GFM is the shipped default, written out so the start mode is explicit (a mode stored for the workspace wins over it). */
export const settings = {
  "workbench.editorAssociations": { "release-plan.md": "markdown-okf-schema-studio.editor" },
  "markdownOkfSchemaStudio.editing.defaultPaletteMode": "gfm",
};

/** An edit mode clip with no paste: check.json holds no paste-options line and wants edit mode at the start. */
export const checks = { editMode: "on", paste: false };

/** The text of release-plan.md, the stage file, byte for byte; the take never changes it. */
export const STAGE = [
  "# Release plan",
  "",
  "> [!NOTE]",
  "> Version 2.4 ships on Thursday.",
  "",
  "The release adds offline maps and a faster search. Two people review every change.",
  "",
  ":::{tip}",
  "Read the upgrade guide before you install.",
  ":::",
  "",
].join("\n");

const PARAGRAPH = "The release adds offline maps and a faster search. Two people review every change.";
const BOX = "[data-sphinx-preview-block-editor] textarea";
const PALETTE = '[data-sphinx-edit-palette="true"]';
const SELECT = "[data-edit-palette-mode-select]";
const ADMONITIONS = "#sphinx-myst-preview-content .admonition";
const GITHUB = ["Alert", "Checkbox", "Option", "HTML table", "Collapsible", "Footnote", "Mermaid", "Column alignment", "Key"];

/** The edit-mode attribute, read from a fresh preview frame (the webview reloads while the layout changes). */
async function editMode(t) {
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

/** Polls `read` until it gives a truthy value (up to `seconds`), else returns the last value. */
async function waitFor(t, seconds, read) {
  const deadline = Date.now() + seconds * 1000;
  let value = await read();
  while (!value && Date.now() < deadline) {
    await t.sleep(100);
    value = await read();
  }
  return value;
}

/** The text box: its value, its selection and its caret. */
function boxState(frame) {
  return frame.locator(BOX).first().evaluate((box) => ({ value: box.value, start: box.selectionStart, end: box.selectionEnd }));
}

/** The palette: its mode, its select, its button counts by group, its focus. */
function paletteState(frame) {
  return frame.locator(PALETTE).first().evaluate(
    (palette, selectSelector) => {
      const select = palette.querySelector(selectSelector);
      const count = (group) => palette.querySelectorAll(`button[data-edit-group="${group}"]`).length;
      const active = document.activeElement;
      let focus = "other";
      if (active === select) focus = "select";
      else if (active && active.tagName === "TEXTAREA") focus = "textbox";
      return {
        mode: palette.getAttribute("data-palette-mode"),
        select: select ? select.value : null,
        github: count("github"),
        myst: count("myst"),
        full: count("full"),
        focus,
      };
    },
    SELECT,
  );
}

/** The outer HTML of the rendered admonitions (the GitHub alert, then the MyST tip). */
function admonitionsOuter(frame) {
  return frame.locator(ADMONITIONS).evaluateAll((elements) => elements.map((element) => element.outerHTML));
}

/** The inner HTML and class list of the rendered admonitions: the fallback comparison. */
function admonitionsInner(frame) {
  return frame.locator(ADMONITIONS).evaluateAll((elements) =>
    elements.map((element) => ({ inner: element.innerHTML, classes: [...element.classList].sort().join(" ") })),
  );
}

/** The union of rectangles { x, y, w, h }. */
function union(rects) {
  const x = Math.min(...rects.map((r) => r.x));
  const y = Math.min(...rects.map((r) => r.y));
  const right = Math.max(...rects.map((r) => r.x + r.w));
  const bottom = Math.max(...rects.map((r) => r.y + r.h));
  return { x, y, w: right - x, h: bottom - y };
}

/** Throws unless the two admonitions look as they did before: outer HTML first, else inner HTML and classes. */
async function compareRender(t, frame) {
  const before = t.notes.admonitionsBefore;
  const outer = await admonitionsOuter(frame);
  if (outer.length === before.length && outer.every((html, i) => html === before[i])) return "outerHTML";
  const inner = await admonitionsInner(frame);
  const wanted = t.notes.admonitionsInnerBefore;
  if (inner.length === wanted.length && inner.every((entry, i) => entry.inner === wanted[i].inner && entry.classes === wanted[i].classes)) {
    return "innerHTML and classes";
  }
  throw new Error(`the rendered admonitions changed: before ${JSON.stringify(before)}, now ${JSON.stringify(outer)}`);
}

/** Off camera: edit mode on, the palette mode stored as GFM, no block editor open, the admonitions recorded, the pointer parked. */
export async function setup(t) {
  let frame = await t.frameOf();
  await t.sleep(1500);
  const onDisk = t.workspaceFile("release-plan.md");
  if (onDisk !== STAGE) throw new Error(`release-plan.md in the workspace is not the shipped stage file: ${JSON.stringify(onDisk)}`);
  let mode;
  ({ frame, mode } = await editMode(t));
  if (mode !== "on") {
    await frame.locator("[data-sphinx-preview-edit-toggle]").first().click();
    for (let i = 0; i < 40 && mode !== "on"; i++) {
      await t.sleep(250);
      ({ frame, mode } = await editMode(t));
    }
  }
  t.record("readingMode", mode);
  if (mode !== "on") throw new Error(`Studio is not in edit mode (data-sphinx-preview-edit-mode is ${mode})`);
  const outer = await (await frame.frameElement()).boundingBox();

  // The mode is stored per workspace and the clip ends in MyST: open the editor and reset the stored mode to GFM.
  const edges = await t.textEdges(frame, "change.", "change.");
  await t.moveTo(edges.to.x, edges.to.y, 0.1);
  await t.click();
  const opened = await waitFor(t, 3, () => frame.locator(BOX).count());
  if (!opened) throw new Error("the click at the end of the paragraph did not open its block editor");
  let paletteMode = await frame.locator(PALETTE).first().getAttribute("data-palette-mode");
  let resetPath = "none: already GFM";
  if (paletteMode !== "gfm") {
    await t.page.keyboard.press("ControlOrMeta+Shift+M");
    await t.sleep(300);
    await t.page.keyboard.type("g");
    paletteMode = await waitFor(t, 1, async () => ((await frame.locator(PALETTE).first().getAttribute("data-palette-mode")) === "gfm" ? "gfm" : ""));
    resetPath = "g";
    if (paletteMode !== "gfm") {
      await frame.locator(SELECT).first().selectOption("gfm");
      paletteMode = await waitFor(t, 1, async () => ((await frame.locator(PALETTE).first().getAttribute("data-palette-mode")) === "gfm" ? "gfm" : ""));
      resetPath = "selectOption";
    }
  }
  t.record("resetPath", resetPath);
  for (let i = 0; i < 2 && (await frame.locator(BOX).count()) !== 0; i++) {
    await t.page.keyboard.press("Escape");
    await t.sleep(400);
  }
  if (!paletteMode || paletteMode !== "gfm") throw new Error(`the palette mode is not gfm after the reset (data-palette-mode is ${paletteMode})`);
  if ((await frame.locator(BOX).count()) !== 0) throw new Error("a block editor stays open after Escape");
  ({ frame, mode } = await editMode(t));
  if (mode !== "on") throw new Error(`Studio left edit mode during the reset (data-sphinx-preview-edit-mode is ${mode})`);

  // Escape cancelled an unchanged editor: the file is untouched.
  await t.sleep(500);
  if (t.workspaceFile("release-plan.md") !== STAGE) throw new Error("release-plan.md on disk changed during the reset");

  // The rendered admonitions as they are before the clip: the alert, then the tip.
  const before = await admonitionsOuter(frame);
  if (before.length !== 2) throw new Error(`the page shows ${before.length} admonitions, expected 2 (selector ${ADMONITIONS})`);
  t.record("admonitionsBefore", before);
  t.record("admonitionsInnerBefore", await admonitionsInner(frame));

  // Park the pointer in the empty right margin of the page: the clip starts and ends there.
  await t.moveTo(outer.x + outer.width - 90, outer.y + outer.height * 0.45, 0.1);
  await t.sleep(500);
}

/** The filmed action: click, Ctrl+Shift+M, Down, then the zoom with its three marks, Escape. */
export async function run(t) {
  const { page } = t;
  const start = Date.now();
  const until = (seconds) => t.sleep(Math.max(0, start + seconds * 1000 - Date.now()));
  const home = { ...t.pointer };
  const frame = await t.frameOf();

  // 1. The click at the right edge of the paragraph's last character opens its block editor.
  await until(0.2);
  const edges = await t.textEdges(frame, "change.", "change.");
  await t.moveTo(edges.to.x, edges.to.y, 0.6);
  await until(1.0);
  await t.click();
  const opened = await waitFor(t, 3, () => frame.locator(BOX).count());
  if (!opened) throw new Error("the click at the end of the paragraph did not open its block editor");
  let box = await boxState(frame);
  if (box.value !== PARAGRAPH) throw new Error(`the text box does not hold the paragraph: ${JSON.stringify(box.value)}`);
  // The palette opened under the pointer and its tooltip would show: park the pointer back in the empty margin.
  await t.moveTo(home.x, home.y, 0.5);

  // 2. The palette is in GFM mode: the GitHub buttons, no MyST, no Full.
  let state = await paletteState(frame);
  if (state.mode !== "gfm" || state.select !== "gfm" || state.github !== GITHUB.length || state.myst !== 0 || state.full !== 0) {
    throw new Error(`the palette is not in GFM mode with its ${GITHUB.length} GitHub buttons (${JSON.stringify(state)}; expected ${GITHUB.join(", ")})`);
  }
  t.record("gfm", state);
  await until(2.4);
  t.keyFrame("gfm");

  // 3. Ctrl+Shift+M focuses the select; Down switches the palette to MyST.
  await until(3.2);
  await t.press("ControlOrMeta+Shift+M", "mode");
  const focused = await waitFor(t, 1, async () => (await paletteState(frame)).focus === "select");
  if (!focused) throw new Error(`Ctrl+Shift+M did not focus the mode select (${JSON.stringify(await paletteState(frame))})`);
  await until(3.6);
  t.keyFrame("mode-select");
  await until(4.5);
  await t.press("ArrowDown", "down");
  const switched = await waitFor(t, 1, async () => (await frame.locator(PALETTE).first().getAttribute("data-palette-mode")) === "myst");
  if (!switched) throw new Error(`Down did not switch the palette to MyST (${JSON.stringify(await paletteState(frame))})`);
  await t.sleep(300);
  state = await paletteState(frame);
  box = await boxState(frame);
  if (state.mode !== "myst" || state.select !== "myst" || state.github !== GITHUB.length || state.myst !== 19 || state.full !== 0 || state.focus !== "textbox") {
    throw new Error(`the palette is not in MyST mode with 9 GitHub and 19 MyST buttons and the text box focused (${JSON.stringify(state)})`);
  }
  if (box.value !== PARAGRAPH) throw new Error(`the text box changed with the mode: ${JSON.stringify(box.value)}`);
  t.record("myst", state);
  await until(5.0);
  t.keyFrame("myst");

  // 4. The rendered admonitions are the same as before the click.
  const compared = await compareRender(t, frame);
  t.record("renderCompare", compared);

  // 5. The zoom on the palette, the alert and the tip.
  await until(5.2);
  const palette = await t.rectOf(frame.locator(PALETTE).first());
  const alert = await t.rectOf(frame.locator(ADMONITIONS).nth(0));
  const tip = await t.rectOf(frame.locator(ADMONITIONS).nth(1));
  const pad = 24;
  const whole = union([palette, alert, tip]);
  t.zoom("modes", { x: whole.x - pad, y: whole.y - pad, w: whole.w + 2 * pad, h: whole.h + 2 * pad });

  // 6. The three marks, in turn: the MyST buttons, the alert, the tip.
  const outline = (rect) => ({ x: rect.x - 6, y: rect.y - 6, w: rect.w + 12, h: rect.h + 12 });
  const mystButtons = [];
  const buttons = frame.locator(`${PALETTE} button[data-edit-group="myst"]`);
  const total = await buttons.count();
  for (let i = 0; i < total; i++) {
    const box = await buttons.nth(i).boundingBox();
    if (box) mystButtons.push({ x: box.x, y: box.y, w: box.width, h: box.height });
  }
  t.record("mystButtonsBoxed", mystButtons.length);
  if (mystButtons.length === 0) throw new Error(`none of the ${total} MyST buttons has a box on screen`);
  await until(5.9);
  t.mark("1", outline(union(mystButtons)));
  await until(7.5);
  t.unmark("1");
  await until(7.7);
  t.mark("2", outline(alert));
  await until(8.9);
  t.unmark("2");
  await until(9.1);
  t.mark("3", outline(tip));
  await until(10.3);
  t.unmark("3");

  // 7. Zoom out, Escape closes the unchanged editor, back to the rest point for the loop.
  await until(10.4);
  t.unzoom("modes");
  await until(11.3);
  await page.keyboard.press("Escape");
  const closed = await waitFor(t, 2, async () => (await frame.locator(BOX).count()) === 0);
  if (!closed) throw new Error("Escape did not close the block editor");
  await t.moveTo(home.x, home.y, 0.3);
  await until(12.0);
}

/** No editor open, the admonitions unchanged and release-plan.md on disk equal to the stage file: a difference fails the take. */
export async function verify(t) {
  const frame = await t.frameOf();
  if ((await frame.locator(BOX).count()) !== 0) throw new Error("a block editor is open at the end");
  const renderCompare = await compareRender(t, frame);
  await t.sleep(800);
  let text = t.workspaceFile("release-plan.md");
  for (let i = 0; i < 8 && text !== STAGE; i++) {
    await t.sleep(250);
    text = t.workspaceFile("release-plan.md");
  }
  if (text !== STAGE) throw new Error(`release-plan.md changed. On disk: ${JSON.stringify(text)}`);
  const { gfm, myst } = t.notes;
  return { gfm, myst, renderCompare };
}
