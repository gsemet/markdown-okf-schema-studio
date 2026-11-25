// The scenario of the clip: in Studio's edit mode, a release note with the standard OKF frontmatter and no schema; a
// click on the `draft` value of the `status` row opens a text box in the cell, `published` is typed over it and saved
// with the save chord; the table row and the body line read `published`; then the clip zooms on the table and the page
// and marks the `status` row, then the "Status: published" line.
// The text of every caption, badge and time is in clip.md, not here.

/** Clip-relative file to workspace-relative file. */
export const stage = { "stage/release-note.md": "release-note.md" };

/** Opened with the window, in Studio (see the editor association in the settings). */
export const open = ["release-note.md"];

/** No Studio setting: every setting at its default (the properties table is on by default). */
export const settings = {
  "workbench.editorAssociations": { "release-note.md": "markdown-okf-schema-studio.editor" },
};

/** An edit mode clip with no paste: check.json holds no paste-options line and wants edit mode at the start. */
export const checks = { editMode: "on", paste: false };

/** The text of release-note.md, character for character: stage/release-note.md (a test compares them). */
export const STAGE = [
  "---",
  "title: Release 2.4",
  "description: What ships in the spring release.",
  "status: draft",
  "date: 2026-11-25",
  "tags:",
  "  - release",
  "  - spring",
  "---",
  "",
  "# Release 2.4",
  "",
  "**Status:** `= this.status`",
  "",
  "The spring release brings faster search and a new export menu.",
  "",
].join("\n");

/** The text of release-note.md after the save, without its final newline: the "Expected result" block of clip.md. */
export const EXPECTED = STAGE.replace("status: draft\n", "status: published\n").slice(0, -1);

const ROW = 'tr[data-okf-field="status"]';
const CELL = `${ROW} [data-okf-value-cell]`;
const BOX = "[data-okf-frontmatter-editor] textarea";
const VALUE = '.okf-frontmatter-value[data-okf-this-field="status"]';
const TABLE = "[data-okf-properties]";
const FIELDS = ["title", "description", "status", "date", "tags"];

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

/** The union of rectangles { x, y, w, h }. */
function union(rects) {
  const x = Math.min(...rects.map((r) => r.x));
  const y = Math.min(...rects.map((r) => r.y));
  const right = Math.max(...rects.map((r) => r.x + r.w));
  const bottom = Math.max(...rects.map((r) => r.y + r.h));
  return { x, y, w: right - x, h: bottom - y };
}

/** What the page shows of the frontmatter: the generic table, its rows, the status row and the body value. */
function readPage(frame) {
  return frame.evaluate(
    ([table, row, value, box]) => {
      const section = document.querySelector(table);
      const statusRow = document.querySelector(row);
      return {
        found: section?.getAttribute("data-okf-schema-found") ?? null,
        headers: [...(section?.querySelectorAll("thead th") ?? [])].map((cell) => cell.textContent.trim()),
        docCells: section?.querySelectorAll("td.okf-doc").length ?? 0,
        fields: [...(section?.querySelectorAll("tr[data-okf-field]") ?? [])].map((tr) => tr.getAttribute("data-okf-field")),
        editable: statusRow?.getAttribute("data-okf-editable") ?? null,
        tableValue: statusRow?.querySelector("[data-okf-value-display]")?.textContent.trim() ?? null,
        tagItems: section?.querySelectorAll('tr[data-okf-field="tags"] [data-okf-value-display] li').length ?? 0,
        tagsText: section?.querySelector('tr[data-okf-field="tags"] [data-okf-value-display]')?.textContent.trim() ?? null,
        bodyValue: document.querySelector(value)?.textContent.trim() ?? null,
        boxes: document.querySelectorAll(box).length,
      };
    },
    [TABLE, ROW, VALUE, BOX],
  );
}

/** Off camera: Studio opens release-note.md in edit mode, the generic table on the page, no text box open, the pointer parked. */
export async function setup(t) {
  let frame = await t.frameOf();
  await t.sleep(1500);
  const onDisk = t.workspaceFile("release-note.md");
  if (onDisk !== STAGE) throw new Error(`release-note.md in the workspace is not the shipped stage file: ${JSON.stringify(onDisk)}`);
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
  // The toolbar is collapsed by default: expand it.
  const collapse = frame.locator("[data-sphinx-preview-toolbar-collapse]").first();
  if ((await collapse.count()) > 0 && (await collapse.getAttribute("aria-expanded")) === "false") {
    await collapse.click();
    await t.sleep(400);
  }
  // The generic table: no schema found, Names and Values, five rows in source order, the status row editable.
  let page;
  const ready = await waitFor(t, 10, async () => {
    try {
      frame = await t.frameOf();
      page = await readPage(frame);
    } catch {
      return false;
    }
    return (
      page.found === "false" &&
      page.headers.join("|") === "Names|Values" &&
      page.docCells === 0 &&
      page.fields.join("|") === FIELDS.join("|") &&
      page.editable === "true" &&
      page.tableValue === "draft" &&
      page.tagItems === 2 &&
      page.bodyValue === "draft" &&
      page.boxes === 0
    );
  });
  if (!ready) throw new Error(`the page does not show the generic frontmatter table at the start: ${JSON.stringify(page)}`);
  t.record("fields", page.fields);
  // Park the pointer in the empty right margin of the page: the clip starts and ends there, no row tooltip at frame 0.
  const outer = await (await frame.frameElement()).boundingBox();
  await t.moveTo(outer.x + outer.width - 90, outer.y + outer.height * 0.45, 0.1);
  await t.sleep(500);
}

/** The filmed action: click the status value, select, type published, save, then the zoom with its two marks. */
export async function run(t) {
  const { page } = t;
  const start = Date.now();
  const until = (seconds) => t.sleep(Math.max(0, start + seconds * 1000 - Date.now()));
  const home = { ...t.pointer };
  let frame = await t.frameOf();

  // 1. The pointer goes to the text `draft` of the status value cell.
  await until(0.3);
  const cell = await t.rectOf(frame.locator(CELL).first(), true);
  const offset = await (await frame.frameElement()).boundingBox();
  await t.moveTo(offset.x + cell.x + cell.w / 2, offset.y + cell.y + cell.h / 2, 0.6);

  // 2. The click opens the YAML text box in the cell, holding `draft`.
  await until(1.0);
  await t.click();
  const opened = await waitFor(t, 3, async () => {
    const box = frame.locator(BOX);
    return (await box.count()) > 0 && (await box.first().inputValue()).trimEnd() === "draft";
  });
  if (!opened) {
    const value = (await frame.locator(BOX).count()) > 0 ? await frame.locator(BOX).first().inputValue() : null;
    throw new Error(`the click on the status value did not open a text box holding "draft" (box value: ${JSON.stringify(value)})`);
  }
  t.keyFrame("editing");
  // The frontmatter menu may open under the pointer: park the pointer back at the rest point.
  await t.moveTo(home.x, home.y, 0.5);

  // 3. Select the whole text of the box.
  await until(1.8);
  const box = frame.locator(BOX).first();
  await page.keyboard.press("ControlOrMeta+A");
  let selection = await box.evaluate((element) => ({ start: element.selectionStart, end: element.selectionEnd, length: element.value.length }));
  if (selection.start !== 0 || selection.end !== selection.length) {
    await box.evaluate((element) => element.select());
    selection = await box.evaluate((element) => ({ start: element.selectionStart, end: element.selectionEnd, length: element.value.length }));
    t.record("selection", "select()");
    if (selection.start !== 0 || selection.end !== selection.length) throw new Error(`the box text is not selected: ${JSON.stringify(selection)}`);
  } else {
    t.record("selection", "ControlOrMeta+A");
  }

  // 4. published is typed over it.
  await until(2.2);
  await page.keyboard.type("published", { delay: 120 });
  const typed = await box.inputValue();
  if (typed !== "published") throw new Error(`the text box holds ${JSON.stringify(typed)}, expected "published"`);

  // 5. The save chord closes the box; the row and the body line read published.
  await until(4.6);
  await t.press("ControlOrMeta+Enter", "save");
  frame = await t.frameOf();
  const saved = await waitFor(t, 5, async () => {
    try {
      const read = await readPage(frame);
      return read.boxes === 0 && read.tableValue === "published" && read.bodyValue === "published" ? read : undefined;
    } catch {
      frame = await t.frameOf();
      return undefined;
    }
  });
  if (!saved) {
    const status = await frame.locator("[role=status]").allInnerTexts().catch(() => []);
    const now = await readPage(frame).catch(() => null);
    throw new Error(`the save did not update the table and the body (status text: ${JSON.stringify(status)}, page: ${JSON.stringify(now)})`);
  }
  t.record("tableValue", saved.tableValue);
  t.record("bodyValue", saved.bodyValue);

  // 6. The zoom on the table and the paragraph holding the body value.
  await t.moveTo(home.x, home.y, 0.6);
  await until(6.2);
  const paragraph = frame.locator(VALUE).first().locator("xpath=ancestor::p[1]");
  const table = await t.rectOf(frame.locator(TABLE).first());
  const line = await t.rectOf(paragraph);
  const pad = 24;
  const whole = union([table, line]);
  t.zoom("table", { x: whole.x - pad, y: whole.y - pad, w: whole.w + 2 * pad, h: whole.h + 2 * pad });

  // 7. Mark 1 on the status row, then mark 2 on the "Status: published" line.
  const row = await t.rectOf(frame.locator(ROW).first());
  await until(7.0);
  t.mark("1", { x: row.x - 6, y: row.y - 6, w: row.w + 12, h: row.h + 12 });
  await until(8.7);
  t.unmark("1");
  t.mark("2", { x: line.x - 6, y: line.y - 6, w: line.w + 12, h: line.h + 12 });
  await until(10.4);
  t.unmark("2");

  // 8. Zoom out and end at the rest point.
  await until(10.5);
  t.unzoom("table");
  await t.moveTo(home.x, home.y, 0.6);
  await until(11.5);
}

/** release-note.md on disk (auto-save is on) must hold the expected text and a final newline: a difference fails the take. */
export async function verify(t) {
  await t.sleep(800);
  let text = t.workspaceFile("release-note.md");
  for (let i = 0; i < 12 && text !== `${EXPECTED}\n`; i++) {
    await t.sleep(250);
    text = t.workspaceFile("release-note.md");
  }
  if (text !== `${EXPECTED}\n`) throw new Error(`release-note.md does not hold the expected text. On disk: ${JSON.stringify(text)}`);
  const { tableValue, bodyValue } = t.notes;
  return { text, tableValue, bodyValue };
}
