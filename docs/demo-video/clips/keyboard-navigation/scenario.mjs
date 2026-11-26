// The scenario of the clip: the mouse is never used. In Studio's reading mode on a release plan, E turns edit mode
// on, Down selects the heading then a note admonition, Enter opens the whole admonition in its source editor and
// Escape closes it unchanged. The clip zooms on the admonition: Right goes inside it (its sentence), Down reaches its
// list, Right goes inside the list (its first item), Down the second item, Right inside it (its own text), Down its
// sub-list and Right inside that (the sub-item "the VSIX"). Enter opens that sub-item alone in its editor, the caret at
// the end of its line; the word delete key removes "VSIX", "extension" is typed and the save chord closes the editor;
// an orange mark outlines the saved sub-item.
// The text of every caption, badge and time is in clip.md, not here.

/** Clip-relative file to workspace-relative file. */
export const stage = { "stage/release-plan.md": "release-plan.md" };

/** Opened with the window, in Studio (see the editor association in the settings). */
export const open = ["release-plan.md"];

/** release-plan.md opens in Studio, a preview that stays on its document. No Studio setting: every default holds. */
export const settings = {
  "workbench.editorAssociations": { "release-plan.md": "markdown-okf-schema-studio.editor" },
};

/** A reading-mode clip with no paste: check.json wants reading mode at the start and holds no paste-options line. */
export const checks = { editMode: "off", paste: false };

/** The text of stage/release-plan.md: the test compares both byte for byte. */
export const STAGE = [
  "# Release plan",
  "",
  ":::{note} Before the release",
  "Run these steps in order, one person per step.",
  "",
  "- Tag the release on Friday",
  "- Build the packages",
  "  - the VSIX",
  "  - the docs site",
  "- Post the announcement",
  ":::",
  "",
  "The release owner signs off in the team channel.",
  "",
].join("\n");

/** The text of release-plan.md after the save: one word changed. */
export const EXPECTED = STAGE.replace("  - the VSIX", "  - the extension");

/** The sub-item the walk ends on: its line in the file, as its editor holds it. */
const SUB_ITEM_LINE = "  - the VSIX";

/**
 * The word delete key. Never ControlOrMeta: that is Cmd+Backspace on macOS, which deletes to the start of the line.
 * Read once at import: a constant, no side effect.
 */
export const DELETE_WORD = process.platform === "darwin" ? "Alt+Backspace" : "Control+Backspace";

/** Set to true to film the last Escape of the loop seam fallback (the review notes of clip.md say when it was used). */
const LOOP_FALLBACK = false;

const BOX = "[data-sphinx-preview-block-editor] textarea";
const SELECTED = '#sphinx-myst-preview-content [data-sphinx-preview-block-selected="true"]';
const SENTENCE = "Run these steps in order, one person per step.";

const normalise = (text) => text.replaceAll(" ", " ").replace(/\s+/gu, " ").trim();

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

/** The selected elements ({ tag, classes, text }, text normalised and cut to 80 characters) and whether a text box is open. */
async function selected(frame) {
  return frame.evaluate(
    ([selector, box]) => ({
      selected: [...document.querySelectorAll(selector)].map((element) => ({
        tag: element.tagName.toLowerCase(),
        classes: element.className.toString(),
        text: (element.textContent ?? "").replaceAll(" ", " ").replace(/\s+/gu, " ").trim().slice(0, 80),
      })),
      boxOpen: document.querySelectorAll(box).length > 0,
      box: (() => {
        const element = document.querySelector(box);
        return element ? { value: element.value, start: element.selectionStart, end: element.selectionEnd, focused: document.activeElement === element } : null;
      })(),
    }),
    [SELECTED, BOX],
  );
}

/** The text box: its value, its selection and whether it has the focus; null when none is open. */
async function boxState(frame) {
  return frame.evaluate((box) => {
    const element = document.querySelector(box);
    if (!element) return null;
    return { value: element.value, start: element.selectionStart, end: element.selectionEnd, focused: document.activeElement === element };
  }, BOX);
}

/**
 * Polls `check(state, frame)` for at most `ms`, re-reading the preview frame between polls (the page may re-render).
 * Returns what `check` returned when truthy, else throws `what` with what was selected.
 */
async function expectState(t, ms, what, check) {
  const deadline = Date.now() + ms;
  let last = null;
  for (;;) {
    try {
      const frame = await t.frameOf();
      const state = await selected(frame);
      last = state;
      const result = await check(state, frame);
      if (result) return result;
    } catch (error) {
      last = { error: String(error?.message ?? error), previous: last };
    }
    if (Date.now() > deadline) throw new Error(`${what}; state: ${JSON.stringify(last)}`);
    await t.sleep(80);
  }
}

/** Off camera: Studio on release-plan.md in reading mode, toolbar open, nothing selected, keyboard focus on the page, the pointer parked. */
export async function setup(t) {
  await t.sleep(1500);
  const onDisk = t.workspaceFile("release-plan.md");
  if (onDisk !== STAGE) throw new Error(`release-plan.md in the workspace is not the shipped stage file: ${JSON.stringify(onDisk)}`);

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

  // The toolbar open, so the Edit toggle is in view.
  const toolbar = () => frame.evaluate(() => document.documentElement.getAttribute("data-sphinx-preview-toolbar-state"));
  if ((await toolbar()) === "collapsed") {
    await frame.locator("[data-sphinx-preview-toolbar-collapse]").first().click();
    let state = await toolbar();
    for (let i = 0; i < 20 && state !== "expanded"; i++) {
      await t.sleep(250);
      frame = await t.frameOf();
      state = await toolbar();
    }
    if (state !== "expanded") throw new Error(`the toolbar did not open (data-sphinx-preview-toolbar-state is ${state})`);
  }

  // The top of the page, nothing selected.
  await frame.evaluate(() => window.scrollTo(0, 0));
  await t.sleep(300);
  frame = await t.frameOf();
  let state = await selected(frame);
  if (state.selected.length !== 0) throw new Error(`an element is selected before the take: ${JSON.stringify(state)}`);

  // The keyboard focus: one click in the blank right margin of the page. In reading mode it selects and opens nothing.
  const area = await (await frame.frameElement()).boundingBox();
  const content = await t.rectOf(frame.locator("#sphinx-myst-preview-content").first());
  const clickX = Math.min(content.x + content.w + 40, area.x + area.width - 12);
  const clickY = Math.min(Math.max(content.y + content.h / 2, area.y + 40), area.y + area.height - 40);
  t.record("marginClick", { x: Math.round(clickX), y: Math.round(clickY) });
  await t.moveTo(clickX, clickY, 0.4);
  await t.sleep(200);
  await t.click();
  await t.sleep(400);
  frame = await t.frameOf();
  state = await selected(frame);
  const after = await frame.evaluate(() => document.documentElement.getAttribute("data-sphinx-preview-edit-mode"));
  if (state.selected.length !== 0 || state.boxOpen || after !== "off") {
    throw new Error(`the margin click changed the page (mode ${after}): ${JSON.stringify(state)}`);
  }

  // Park the pointer in the bottom right corner of the page: off every block, the toolbar and the zoom.
  await t.moveTo(area.x + area.width - 24, area.y + area.height - 24, 0.4);
  await t.sleep(800);
}

/** The filmed action, fifteen badged key presses (plus the typed word), none of them a pointer move. */
export async function run(t) {
  const { page } = t;
  const start = Date.now();
  const until = (seconds) => t.sleep(Math.max(0, start + seconds * 1000 - Date.now()));
  const only = (state) => (state.selected.length === 1 ? state.selected[0] : null);
  const isElement = (element, tag, text) => element && element.tag === tag && element.text === text;
  /** Presses `key` at `seconds` and waits for the one selected element to be a `tag` that reads `text`. */
  const walk = async (seconds, key, badge, tag, text, what) => {
    await until(seconds);
    await t.press(key, badge);
    await expectState(t, 1000, what, (state) => isElement(only(state), tag, text));
  };

  // 1. E turns edit mode on.
  await until(0.6);
  await t.press("e", "edit");
  await expectState(t, 1000, "E did not turn edit mode on", (state, frame) =>
    frame.evaluate(() => document.documentElement.getAttribute("data-sphinx-preview-edit-mode") === "on"),
  );
  await until(1.4);
  t.keyFrame("edit-on");

  // 2. Down selects the heading.
  await until(2.2);
  await t.press("ArrowDown", "down");
  await expectState(t, 1000, "the first Down did not select the heading", (state) => {
    const element = only(state);
    return element && element.tag === "h1" && element.text === "Release plan";
  });

  // 3. Down selects the admonition.
  await until(3.6);
  await t.press("ArrowDown", "down");
  await expectState(t, 1000, "the second Down did not select the admonition", (state) => {
    const element = only(state);
    return element && /\badmonition\b/u.test(element.classes) && element.text.startsWith("Before the release");
  });
  await until(4.4);
  t.keyFrame("admonition-selected");

  // 4. Enter opens the whole admonition, Escape closes it unchanged.
  await until(5.2);
  await t.press("Enter", "enter");
  const opened = await expectState(t, 1000, "Enter did not open the admonition's editor", async (state, frame) => {
    const box = await boxState(frame);
    if (!box || !box.value.startsWith(":::{note} Before the release") || !box.value.trimEnd().endsWith(":::")) return null;
    return box;
  });
  t.record("admonitionEditor", opened.value);
  await until(6.2);
  t.keyFrame("admonition-editor");
  await until(7.0);
  await t.press("Escape", "escape");
  await expectState(t, 1000, "Escape did not close the admonition's editor on the admonition", (state) => {
    const element = only(state);
    return !state.boxOpen && element && /\badmonition\b/u.test(element.classes) && element.text.startsWith("Before the release");
  });
  if (t.workspaceFile("release-plan.md") !== STAGE) throw new Error("Escape changed release-plan.md on disk");
  await until(7.5);
  t.keyFrame("admonition-back");

  // 5. The zoom on the admonition.
  await until(8.0);
  const frame0 = await t.frameOf();
  const admonition = await t.rectOf(frame0.locator("#sphinx-myst-preview-content .admonition").first());
  const pad = 24;
  t.zoom("admonition", { x: admonition.x - pad, y: admonition.y - pad, w: admonition.w + 2 * pad, h: admonition.h + 2 * pad });

  // 6. Right goes inside the admonition, to its sentence.
  await until(8.6);
  await t.press("ArrowRight", "right");
  const inside = await expectState(t, 1000, "Right selected nothing", (state) => only(state));
  if (inside.text !== SENTENCE) {
    const state = await selected(await t.frameOf());
    if (/^Before the release/u.test(inside.text) || /title/u.test(inside.classes)) {
      throw new Error(`Right selected the admonition title, not its first inner block: ${JSON.stringify(state)}`);
    }
    throw new Error(`Right did not select the admonition's sentence: ${JSON.stringify(state)}`);
  }
  await until(9.4);
  t.keyFrame("sentence-selected");

  // 7. Down reaches the list inside the admonition.
  await until(10.2);
  await t.press("ArrowDown", "down");
  await expectState(t, 1000, "Down from the sentence did not select the list", (state) => {
    const element = only(state);
    // `selected` cuts the text to 80 characters: "Post the announcement" is past the cut, the list is the one that starts with its first two items.
    return element && element.tag === "ul" && element.text.startsWith("Tag the release on Friday Build the packages");
  });
  await until(11.0);
  t.keyFrame("list-selected");

  // 8. Right goes inside the list, to its first item.
  await walk(11.8, "ArrowRight", "right", "li", "Tag the release on Friday", "Right on the list did not select its first item");
  await until(12.6);
  t.keyFrame("item-selected");

  // 9. Down selects the second item, the one with the sub-list.
  await walk(13.4, "ArrowDown", "down", "li", "Build the packages the VSIX the docs site", "Down from the first item did not select the second item");
  await until(14.2);
  t.keyFrame("second-item-selected");

  // 10. Right goes inside that item, to its own text.
  await walk(15.0, "ArrowRight", "right", "p", "Build the packages", "Right on the second item did not select its own text");

  // 11. Down reaches the sub-list.
  await walk(16.6, "ArrowDown", "down", "ul", "the VSIX the docs site", "Down from the item's text did not select the sub-list");
  await until(17.4);
  t.keyFrame("sublist-selected");

  // 12. Right goes inside the sub-list, to its first item.
  await walk(18.2, "ArrowRight", "right", "li", "the VSIX", "Right on the sub-list did not select its first item");
  await until(19.0);
  t.keyFrame("subitem-selected");

  // 13. Enter opens that sub-item alone, the caret at the end of its line.
  await until(19.8);
  await t.press("Enter", "enter");
  const item = await expectState(t, 1000, "Enter on the sub-item did not open the editor of its line alone", async (state, frame) => {
    const box = await boxState(frame);
    if (!box || box.value.trimEnd() !== SUB_ITEM_LINE) return null;
    return box.focused && box.start === box.end && box.start === SUB_ITEM_LINE.length ? box : null;
  });
  t.record("subItemEditor", item.value);
  await until(20.6);
  t.keyFrame("subitem-editor");

  // 14. The word delete key removes "VSIX" only.
  await until(21.4);
  await t.press(DELETE_WORD, "delete-word");
  await expectState(t, 1000, "the word delete did not leave the line ending with 'the'", async (state, frame) => {
    const box = await boxState(frame);
    return box && box.value.trimEnd() === "  - the" ? box : null;
  });

  // "extension" is typed, with no badge.
  await until(21.9);
  await page.keyboard.type("extension", { delay: 75 });
  await expectState(t, 1000, "the editor does not hold '  - the extension'", async (state, frame) => {
    const box = await boxState(frame);
    return box && box.value.trimEnd() === "  - the extension" ? box : null;
  });
  await until(23.0);
  t.keyFrame("word-changed");

  // 15. The save chord closes the editor, the sub-item reads "the extension".
  await until(23.4);
  await t.press("ControlOrMeta+Enter", "save");
  await expectState(t, 3000, "the save did not close the editor with the sub-item reading 'the extension'", async (state, frame) => {
    if (state.boxOpen) return null;
    return frame.evaluate(() => (document.querySelector("#sphinx-myst-preview-content .admonition li li")?.textContent ?? "").trim() === "the extension");
  });

  // 16. Mark 1 on that sub-item, then the zoom out.
  await until(23.9);
  const frame1 = await t.frameOf();
  const li = await t.rectOf(frame1.locator("#sphinx-myst-preview-content .admonition li li").first());
  t.mark("1", { x: li.x - 6, y: li.y - 6, w: li.w + 12, h: li.h + 12 });
  await until(25.5);
  t.unmark("1");
  await until(25.7);
  t.unzoom("admonition");

  // 17. The loop seam fallback: a last Escape clears the selection ring, which the save leaves on
  // the whole admonition.
  if (LOOP_FALLBACK) {
    await until(25.8);
    await t.press("Escape", "escape");
  }
  await until(26.0);
}

/** release-plan.md on disk (auto-save is on) must be the stage with one word changed, and no editor stays open. */
export async function verify(t) {
  const frame = await t.frameOf();
  if ((await frame.locator(BOX).count()) !== 0) throw new Error("a block text box is still open after the take");
  const deadline = Date.now() + 3000;
  let text = t.workspaceFile("release-plan.md");
  while (text !== EXPECTED && Date.now() < deadline) {
    await t.sleep(250);
    text = t.workspaceFile("release-plan.md");
  }
  if (text !== EXPECTED) throw new Error(`release-plan.md does not hold the expected text. On disk: ${JSON.stringify(text)}`);
  return { subItemEditor: t.notes.subItemEditor };
}
