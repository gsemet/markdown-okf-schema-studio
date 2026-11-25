// The scenario of the clip: in Studio's edit mode, a click at the end of a paragraph opens its text box; two Enter
// make an empty line and "/grid" opens the slash menu with Grid highlighted; Enter opens the Insert grid form, Enter
// again inserts the MyST grid and the save chord closes the box on a page with two cards.
// The text of every caption, badge and time is in clip.md, not here.

/** Clip-relative file to workspace-relative file. */
export const stage = { "stage/onboarding.md": "onboarding.md" };

/** Opened with the window, in Studio (see the editor association in the settings). */
export const open = ["onboarding.md"];

/** Grid is a MyST command: the palette must be in MyST mode (the default, GFM, does not list it). */
export const settings = {
  "workbench.editorAssociations": { "onboarding.md": "markdown-okf-schema-studio.editor" },
  "markdownOkfSchemaStudio.editing.defaultPaletteMode": "myst",
};

/** An edit mode clip with no paste: check.json holds no paste-options line and wants edit mode at the start. */
export const checks = { editMode: "on", paste: false };

/** The text of onboarding.md after the save, without its final newline: the "Expected result" block of clip.md. */
export const EXPECTED = [
  "# Onboarding",
  "",
  "Welcome to the team. Pick the track that fits your first week.",
  "",
  "::::{grid} 2",
  ":gutter: 2",
  "",
  ":::{grid-item-card} Card 1",
  "",
  "Content",
  ":::",
  "",
  ":::{grid-item-card} Card 2",
  "",
  "Content",
  ":::",
  "::::",
].join("\n");

const PARAGRAPH = "Welcome to the team. Pick the track that fits your first week.";
const BOX = "[data-sphinx-preview-block-editor] textarea";
const PANEL = '[data-sphinx-directive-panel="grid"]';

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

/** The union of rectangles { x, y, w, h }. */
function union(rects) {
  const x = Math.min(...rects.map((r) => r.x));
  const y = Math.min(...rects.map((r) => r.y));
  const right = Math.max(...rects.map((r) => r.x + r.w));
  const bottom = Math.max(...rects.map((r) => r.y + r.h));
  return { x, y, w: right - x, h: bottom - y };
}

/** Off camera: Studio opens onboarding.md in edit mode, no grid in the page, no text box open, the pointer parked. */
export async function setup(t) {
  let frame = await t.frameOf();
  await t.sleep(1500);
  const onDisk = t.workspaceFile("onboarding.md");
  const shipped = "# Onboarding\n\nWelcome to the team. Pick the track that fits your first week.\n";
  if (onDisk !== shipped) throw new Error(`onboarding.md in the workspace is not the shipped stage file: ${JSON.stringify(onDisk)}`);
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
  if ((await frame.locator(".myst-grid-card").count()) !== 0) throw new Error("the page already shows a grid card: a previous take leaked");
  if ((await frame.locator(BOX).count()) !== 0) throw new Error("a block text box is open at the start");
  // Park the pointer in the empty right margin of the page: the clip starts and ends there.
  const outer = await (await frame.frameElement()).boundingBox();
  await t.moveTo(outer.x + outer.width - 90, outer.y + outer.height * 0.45, 0.1);
  await t.sleep(500);
}

/** The filmed action: click, two Enter, /grid, Enter, Enter, save, then the zoom on the two cards with its mark. */
export async function run(t) {
  const { page } = t;
  const start = Date.now();
  const until = (seconds) => t.sleep(Math.max(0, start + seconds * 1000 - Date.now()));
  const home = { ...t.pointer };
  let frame = await t.frameOf();

  // 1. The click at the right edge of the paragraph's last character opens its text box.
  await until(0.2);
  const edges = await t.textEdges(frame, "week.", "week.");
  await t.moveTo(edges.to.x, edges.to.y, 0.6);
  await until(0.8);
  await t.click();
  const opened = await waitFor(t, 3, () => frame.locator(BOX).count());
  if (!opened) throw new Error("the click at the end of the paragraph did not open its text box");
  let box = await boxState(frame);
  if (box.value !== PARAGRAPH) throw new Error(`the text box does not hold the paragraph: ${JSON.stringify(box.value)}`);
  if (box.start !== PARAGRAPH.length || box.end !== PARAGRAPH.length) {
    throw new Error(`the caret is not at the end of the paragraph (selection ${box.start} to ${box.end} of ${PARAGRAPH.length})`);
  }
  const mode = await frame.locator('[data-sphinx-edit-palette="true"]').first().getAttribute("data-palette-mode");
  t.record("paletteMode", mode);
  if (mode !== "myst") throw new Error(`the palette is not in MyST mode (data-palette-mode is ${mode}): a mode stored for the workspace wins over editing.defaultPaletteMode`);

  // The palette opened under the pointer and its tooltip shows: park the pointer back in the empty margin.
  await t.moveTo(home.x, home.y, 0.5);

  // 2. Two Enter make an empty line.
  await until(1.6);
  await page.keyboard.press("Enter");
  await t.sleep(200);
  await page.keyboard.press("Enter");
  box = await boxState(frame);
  if (box.value !== `${PARAGRAPH}\n\n`) throw new Error(`the text box does not end with an empty line after the two Enter: ${JSON.stringify(box.value)}`);

  // 3. /grid opens the slash menu, Grid first and highlighted, Table after it.
  await until(2.0);
  await page.keyboard.type("/grid", { delay: 120 });
  const menu = await waitFor(t, 2, () => frame.locator("[data-slash-menu]").count());
  if (!menu) throw new Error("typing /grid opened no slash menu");
  await t.sleep(250);
  const slash = await frame.locator("[data-slash-menu]").first().evaluate((element) => ({
    ids: [...element.querySelectorAll("[data-slash-id]")].map((option) => option.getAttribute("data-slash-id")),
    active: element.querySelector('[data-active="true"]')?.getAttribute("data-slash-id") ?? null,
  }));
  t.record("slashOptions", slash.ids);
  if (slash.active !== "grid") throw new Error(`the slash menu highlights ${JSON.stringify(slash.active)}, not "grid" (options: ${JSON.stringify(slash.ids)})`);
  if (!(slash.ids.indexOf("table") > slash.ids.indexOf("grid"))) throw new Error(`"table" is not listed after "grid" (options: ${JSON.stringify(slash.ids)})`);
  t.keyFrame("slash-menu");

  // 4. Enter opens the Insert grid form with its defaults.
  await until(3.4);
  await page.keyboard.press("Enter");
  const panel = await waitFor(t, 2, () => frame.locator(PANEL).count());
  if (!panel) throw new Error("Enter on Grid opened no Insert grid form");
  await t.sleep(250);
  const fields = await frame.locator(`${PANEL} [data-directive-field]`).evaluateAll((elements) =>
    elements.map((element) => ({ name: element.getAttribute("data-directive-field"), value: element.value })),
  );
  t.record("gridForm", fields);
  const wanted = { columns: "2", gutter: "2", cards: "2" };
  for (const [name, value] of Object.entries(wanted)) {
    const found = fields.find((field) => field.name?.toLowerCase() === name);
    if (!found || found.value !== value) throw new Error(`the Insert grid form field ${name} reads ${JSON.stringify(found?.value)}, expected ${JSON.stringify(value)} (fields: ${JSON.stringify(fields)})`);
  }
  t.keyFrame("grid-form");

  // 5. Enter in the form inserts the grid after the paragraph, "Card 1" selected.
  await until(4.6);
  await page.keyboard.press("Enter");
  const gone = await waitFor(t, 3, async () => (await frame.locator(PANEL).count()) === 0);
  if (!gone) throw new Error("the Insert grid form stayed open after Enter");
  await t.sleep(200);
  box = await boxState(frame);
  const expectedBox = EXPECTED.slice(EXPECTED.indexOf(PARAGRAPH));
  if (box.value !== expectedBox) throw new Error(`the text box does not hold the expected grid text: ${JSON.stringify(box.value)}`);
  const selected = box.value.slice(box.start, box.end);
  if (selected !== "Card 1") throw new Error(`the selected text is ${JSON.stringify(selected)}, expected "Card 1"`);

  // 6. The save chord closes the box and the page renders two cards.
  await until(5.8);
  await t.press("ControlOrMeta+Enter", "save");
  frame = await t.frameOf();
  const rendered = await waitFor(t, 5, async () => {
    const closed = (await frame.locator(BOX).count()) === 0;
    const titles = await frame.locator(".myst-grid-card .myst-grid-card-title").allInnerTexts();
    return closed && titles.length === 2 ? titles.map((title) => title.trim()) : undefined;
  });
  if (!rendered) {
    const status = await frame.locator("[role=status], [data-sphinx-preview-status]").allInnerTexts().catch(() => []);
    throw new Error(`the save did not close the box on two cards (status text: ${JSON.stringify(status)})`);
  }
  t.record("cards", rendered);
  if (rendered[0] !== "Card 1" || rendered[1] !== "Card 2") throw new Error(`the cards are titled ${JSON.stringify(rendered)}, expected Card 1 and Card 2`);

  // 7. Back to the rest point, then the zoom on the paragraph and the two cards.
  await t.moveTo(home.x, home.y, 0.6);
  await until(6.4);
  const paragraph = await t.rectOf(frame.locator("#sphinx-myst-preview-content p").first());
  const cards = [];
  for (let i = 0; i < 2; i++) cards.push(await t.rectOf(frame.locator(".myst-grid-card").nth(i)));
  const pad = 24;
  const whole = union([paragraph, ...cards]);
  t.zoom("grid", { x: whole.x - pad, y: whole.y - pad, w: whole.w + 2 * pad, h: whole.h + 2 * pad });

  // 8. Mark 1: an outline around the two cards.
  const around = union(cards);
  await until(7.0);
  t.mark("1", { x: around.x - 6, y: around.y - 6, w: around.w + 12, h: around.h + 12 });
  await until(8.8);
  t.unmark("1");

  // 9. Zoom out and end at the rest point.
  await until(10.5);
  t.unzoom("grid");
  await t.moveTo(home.x, home.y, 0.6);
  await until(11.5);
}

/** onboarding.md on disk (auto-save is on) must hold the expected text and a final newline: a difference fails the take. */
export async function verify(t) {
  await t.sleep(800);
  let text = t.workspaceFile("onboarding.md");
  for (let i = 0; i < 8 && text !== `${EXPECTED}\n`; i++) {
    await t.sleep(250);
    text = t.workspaceFile("onboarding.md");
  }
  if (text !== `${EXPECTED}\n`) throw new Error(`onboarding.md does not hold the expected text. On disk: ${JSON.stringify(text)}`);
  const { slashOptions, cards } = t.notes;
  return { text, slashOptions, cards };
}
