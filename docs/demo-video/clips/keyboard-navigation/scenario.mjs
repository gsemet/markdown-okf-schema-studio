// The scenario of the clip: the mouse is never used. In Studio's reading mode on a release plan, E turns edit mode
// on, Down selects the heading then a note admonition, Enter opens the whole admonition in its source editor and
// Escape closes it unchanged. The clip zooms on the admonition: Right goes inside it (its sentence), Down reaches its
// list, Right goes inside the list (its first item). Enter on that item opens the whole admonition in its editor
// (the feature's behaviour, see clip.md); the caret goes to the end of "Friday" by keyboard, the word delete key removes
// it, "Thursday" is typed and the save chord closes the editor; an orange mark outlines the saved item.
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
export const EXPECTED = STAGE.replace("on Friday", "on Thursday");

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

/** The filmed action, eleven badged key presses (plus unbadged caret moves and the typed word), none of them a pointer move. */
export async function run(t) {
  const { page } = t;
  const start = Date.now();
  const until = (seconds) => t.sleep(Math.max(0, start + seconds * 1000 - Date.now()));
  const only = (state) => (state.selected.length === 1 ? state.selected[0] : null);
  const isFirstItem = (element, text) => element && element.tag === "li" && element.text === text;

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
  await until(11.8);
  await t.press("ArrowRight", "right");
  await expectState(t, 1000, "Right on the list did not select its first item", (state) => isFirstItem(only(state), "Tag the release on Friday"));
  await until(12.4);
  t.keyFrame("item-selected");

  // 9. Enter on the selected item opens the whole admonition in its editor (a finding, see clip.md), the caret at the end.
  await until(13.4);
  await t.press("Enter", "enter");
  const item = await expectState(t, 1000, "Enter did not open the admonition's editor from its first item", async (state, frame) => {
    const box = await boxState(frame);
    if (!box || !box.value.startsWith(":::{note} Before the release") || !box.value.trimEnd().endsWith(":::")) return null;
    return box.focused && box.start === box.end && box.start === box.value.trimEnd().length ? box : null;
  });
  t.record("itemEnterEditor", item.value);
  await until(14.2);
  t.keyFrame("admonition-editor-2");

  // 10. The caret goes to the end of "Friday" by keyboard (Up x5, Right to the end of the line): plain presses with no badge, like the typed text.
  await until(14.6);
  const itemLine = [":::{note} Before the release", SENTENCE, "", "- Tag the release on Friday"].join(String.fromCharCode(10));
  // Home and End do not move the caret in the filmed window (End jumped to the end of the whole text): Up x5 reaches the item line, Right walks to the end of "Friday".
  const steps = [];
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press("ArrowUp");
    await t.sleep(50);
  }
  const before = await boxState(await t.frameOf());
  if (!before) throw new Error("the admonition editor closed while the caret moved");
  steps.push(before.start);
  for (let i = before.start; i < itemLine.length; i++) {
    await page.keyboard.press("ArrowRight");
    await t.sleep(20);
  }
  t.record("caretSteps", steps);
  await expectState(t, 1000, `the caret is not at the end of 'Tag the release on Friday' (${steps.join(" ")})`, async (state, frame) => {
    const box = await boxState(frame);
    return box && box.start === box.end && box.start === itemLine.length && box.value.startsWith(itemLine) ? box : null;
  });

  // The word delete key removes "Friday" only.
  await until(16.0);
  await t.press(DELETE_WORD, "delete-word");
  await expectState(t, 1000, "the word delete did not leave the item ending with 'on'", async (state, frame) => {
    const box = await boxState(frame);
    return box && !box.value.includes("Friday") && box.value.split("\n").map((line) => line.trimEnd()).includes("- Tag the release on") && box.value.includes("Build the packages") ? box : null;
  });

  // 11. "Thursday" is typed, with no badge.
  await until(16.5);
  await page.keyboard.type("Thursday", { delay: 75 });
  await expectState(t, 1000, "the admonition editor does not hold '- Tag the release on Thursday'", async (state, frame) => {
    const box = await boxState(frame);
    return box && box.value.split("\n").includes("- Tag the release on Thursday") ? box : null;
  });
  await until(17.3);
  t.keyFrame("word-changed");

  // 12. The save chord closes the editor, the first item reads "Thursday".
  await until(17.8);
  await t.press("ControlOrMeta+Enter", "save");
  await expectState(t, 3000, "the save did not close the editor with the first item reading Thursday", async (state, frame) => {
    if (state.boxOpen) return null;
    return frame.evaluate(() => [...document.querySelectorAll("#sphinx-myst-preview-content .admonition li")].some((li) => (li.textContent ?? "").trim().startsWith("Tag the release on Thursday")));
  });

  // 13. Mark 1 on that item, then the zoom out.
  await until(18.3);
  const frame1 = await t.frameOf();
  const li = await t.rectOf(frame1.locator("#sphinx-myst-preview-content .admonition li").first());
  t.mark("1", { x: li.x - 6, y: li.y - 6, w: li.w + 12, h: li.h + 12 });
  await until(19.5);
  t.unmark("1");
  await until(19.7);
  t.unzoom("admonition");

  // 14. The loop seam fallback: a last Escape moves the selection up to the list.
  if (LOOP_FALLBACK) {
    await until(19.8);
    await t.press("Escape", "escape");
  }
  await until(20.0);
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
  return { itemEnterEditor: t.notes.itemEnterEditor };
}
