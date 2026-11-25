// The scenario of the clip: Studio on a note of an OKF Schema bundle, in edit mode; the page says `type: note`, so
// Studio finds _schema/note.schema.yaml and shows the frontmatter as a schema table; the typo `status: publshed` gives
// the status row one error and the title badge reads "1 error". A click on the value opens a select with the schema's values;
// two ArrowDown keys pick `published`, the save chord saves, the title badge goes away and the body line reads
// "Status: published"; then the clip zooms on the table and the page and marks the status row, then the "Status:" line.
// The text of every caption, badge and time is in clip.md, not here.

import { readFileSync } from "node:fs";

/** Clip-relative file to workspace-relative file: a real OKF Schema bundle. */
export const stage = {
  "stage/_schema/note.schema.yaml": "_schema/note.schema.yaml",
  "stage/notes/release-note.md": "notes/release-note.md",
};

/** Opened with the window, in Studio (see the editor association in the settings). */
export const open = ["notes/release-note.md"];

/** A pattern with no slash matches the file name. */
export const settings = {
  "workbench.editorAssociations": { "release-note.md": "markdown-okf-schema-studio.editor" },
};

/** An edit mode clip with no paste: check.json holds no paste-options line and wants edit mode at the start. */
export const checks = { editMode: "on", paste: false };

/** The text of notes/release-note.md after the save, without its final newline: the "Expected result" block of clip.md. */
export const EXPECTED = [
  "---",
  "type: note",
  "title: Release 2.4",
  "description: What ships in the spring release.",
  "status: published",
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
].join("\n");

/** The line of the stage and the line the take writes in its place. */
export const TYPO = "status: publshed";
export const FIXED = "status: published";

const PROPS = "section[data-okf-properties]";
const EDITOR = "[data-okf-frontmatter-editor]";
const STATUS_ROW = 'tr[data-okf-field="status"]';

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

/** What the frontmatter table and the page show now: the schema table, its rows, its errors, the badge, the inline value. */
function readState(frame) {
  return frame.evaluate(
    ({ props, editor }) => {
      const section = document.querySelector(props);
      const rows = section ? [...section.querySelectorAll("tr[data-okf-field]")] : [];
      const status = rows.find((row) => row.getAttribute("data-okf-field") === "status");
      const badge = document.querySelector("[data-okf-badge]");
      return {
        schemaFound: section?.getAttribute("data-okf-schema-found") ?? null,
        headers: section ? [...section.querySelectorAll("thead th")].map((th) => (th.textContent ?? "").replace(/[^A-Za-z]/gu, "")) : [],
        fields: rows.map((row) => row.getAttribute("data-okf-field")),
        errorRows: rows.filter((row) => row.classList.contains("okf-error")).map((row) => row.getAttribute("data-okf-field")),
        statusType: status?.getAttribute("data-okf-type") ?? null,
        statusEditable: status?.getAttribute("data-okf-editable") ?? null,
        statusValue: status?.getAttribute("data-okf-value") ?? null,
        statusTitle: status?.getAttribute("title") ?? null,
        badgeErrors: badge?.getAttribute("data-okf-errors") ?? null,
        badgeText: badge ? (badge.textContent ?? "").trim() : null,
        inline: [...document.querySelectorAll(".okf-frontmatter-value")].map((el) => (el.textContent ?? "").trim()),
        editors: document.querySelectorAll(editor).length,
      };
    },
    { props: PROPS, editor: EDITOR },
  );
}

/** Off camera: Studio opens release-note.md in edit mode on its frame 0 state, the pointer parked. */
export async function setup(t) {
  let frame = await t.frameOf();
  await t.sleep(1500);
  const onDisk = t.workspaceFile("notes/release-note.md");
  const shipped = readFileSync(new URL("./stage/notes/release-note.md", import.meta.url), "utf8");
  if (onDisk !== shipped) throw new Error(`notes/release-note.md in the workspace is not the shipped stage file: ${JSON.stringify(onDisk)}`);
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

  // Frame 0: the schema table, one error on status, the badge, the typo in the body.
  let state;
  const ready = await waitFor(t, 10, async () => {
    try {
      frame = await t.frameOf();
      state = await readState(frame);
    } catch {
      return false;
    }
    return (
      state.schemaFound === "true" &&
      state.errorRows.length === 1 &&
      state.badgeErrors === "1" &&
      state.inline.length === 1 &&
      state.inline[0] === "publshed"
    );
  });
  if (!ready) throw new Error(`the page is not in its frame 0 state: ${JSON.stringify(state)}`);
  const headers = state.headers.slice(0, 3).join("|");
  if (headers !== "Name|Value|Description") throw new Error(`the table headers are ${JSON.stringify(state.headers)}, expected Name, Value, Description`);
  const fields = state.fields.join(",");
  if (fields !== "type,title,description,status,date,tags") throw new Error(`the table rows are ${fields}, expected type,title,description,status,date,tags`);
  if (state.errorRows[0] !== "status") throw new Error(`the row in error is ${JSON.stringify(state.errorRows)}, expected status`);
  if (state.statusType !== "enum" || state.statusEditable !== "true") {
    throw new Error(`the status row is ${state.statusType} / editable ${state.statusEditable}, expected enum / true`);
  }
  if (state.badgeText !== "✖ 1") throw new Error(`the title badge reads ${JSON.stringify(state.badgeText)}, expected "✖ 1"`);
  if (state.editors !== 0) throw new Error("a frontmatter value editor is open at the start");
  t.record("frame0", state);
  t.record("rowTitle", state.statusTitle);

  // Park the pointer in the empty right margin of the page: the clip starts and ends there.
  const outer = await (await frame.frameElement()).boundingBox();
  await t.moveTo(outer.x + outer.width - 90, outer.y + outer.height * 0.45, 0.1);
  await t.sleep(500);
}

/** The filmed action: click the typo, pick `published` in the select, save, then the zoom with its two marks. */
export async function run(t) {
  const { page } = t;
  const start = Date.now();
  const until = (seconds) => t.sleep(Math.max(0, start + seconds * 1000 - Date.now()));
  const home = { ...t.pointer };
  let frame = await t.frameOf();
  const select = `${STATUS_ROW} ${EDITOR} select`;

  // 1. The click on the status value opens a select with the schema's values, on "Choose a value...".
  await until(0.2);
  t.keyFrame("invalid");
  const cell = frame.locator(`${STATUS_ROW} [data-okf-value-cell]`).first();
  const cellBox = await t.rectOf(cell);
  await t.moveTo(cellBox.x + cellBox.w / 2, cellBox.y + cellBox.h / 2, 0.6);
  await until(1.2);
  await t.click();
  const opened = await waitFor(t, 3, async () =>
    (await frame.locator(select).count()) === 1 && (await frame.locator(select).first().evaluate((el) => el === el.ownerDocument.activeElement)),
  );
  if (!opened) throw new Error("the click on the status value did not open a focused select in its cell");
  const options = await frame.locator(`${select} option`).evaluateAll((els) => els.map((el) => (el.textContent ?? "").trim()));
  const first = await frame.locator(select).first().evaluate((el) => el.value);
  t.record("selectOptions", options);
  if (options.join("|") !== "Choose a value...|draft|published|retired") throw new Error(`the select offers ${JSON.stringify(options)}`);
  if (first !== "") throw new Error(`the select opens on ${JSON.stringify(first)}, expected the disabled "Choose a value..." entry`);

  // 2. The pointer goes back to the rest point: the row's tooltip and the hover do not show.
  await t.moveTo(home.x, home.y, 0.5);
  t.keyFrame("select-open");

  // 3. Two ArrowDown keys on the select: draft, then published. A pick alone does not save.
  const valueOf = () => frame.locator(select).first().evaluate((el) => el.value);
  await until(2.2);
  await page.keyboard.press("ArrowDown");
  const one = await valueOf();
  if (one !== "draft") throw new Error(`the first ArrowDown gives ${JSON.stringify(one)}, expected "draft"`);
  await until(2.7);
  await page.keyboard.press("ArrowDown");
  const two = await valueOf();
  if (two !== "published") throw new Error(`the second ArrowDown gives ${JSON.stringify(two)}, expected "published"`);
  const stillTypo = t.workspaceFile("notes/release-note.md");
  if (!stillTypo.includes(TYPO)) throw new Error(`the pick alone changed the file on disk: ${JSON.stringify(stillTypo)}`);
  t.keyFrame("picked");

  // 4. The save chord: the select closes, no row in error, no badge, the body reads published.
  await until(4.8);
  await t.press("ControlOrMeta+Enter", "save");
  let state;
  const saved = await waitFor(t, 5, async () => {
    try {
      frame = await t.frameOf();
      state = await readState(frame);
    } catch {
      return false;
    }
    return state.editors === 0 && state.errorRows.length === 0 && state.badgeErrors === null && state.statusValue === JSON.stringify("published") && state.inline.join() === "published";
  });
  if (!saved) throw new Error(`the save did not clear the error: ${JSON.stringify(state)}`);
  t.record("after", state);

  // 5. The zoom on the table and the "Status:" line.
  await until(6.9);
  const props = await t.rectOf(frame.locator(PROPS).first());
  const line = await t.rectOf(frame.locator("p", { has: frame.locator(".okf-frontmatter-value") }).first());
  const pad = 24;
  const whole = union([props, line]);
  t.zoom("table", { x: whole.x - pad, y: whole.y - pad, w: whole.w + 2 * pad, h: whole.h + 2 * pad });

  // 6. Mark 1 on the status row, then mark 2 on the "Status: published" line.
  const row = await t.rectOf(frame.locator(STATUS_ROW).first());
  await until(7.4);
  t.mark("1", { x: row.x - 6, y: row.y - 6, w: row.w + 12, h: row.h + 12 });
  await until(9.1);
  t.unmark("1");
  t.mark("2", { x: line.x - 6, y: line.y - 6, w: line.w + 12, h: line.h + 12 });
  await until(10.8);
  t.unmark("2");

  // 7. Zoom out and end at the rest point.
  await until(11.0);
  t.unzoom("table");
  await t.moveTo(home.x, home.y, 0.6);
  await until(12.0);
}

/** notes/release-note.md on disk (auto-save is on) must hold the expected text; the schema must be untouched. */
export async function verify(t) {
  await t.sleep(800);
  let text = t.workspaceFile("notes/release-note.md");
  for (let i = 0; i < 12 && text !== `${EXPECTED}\n`; i++) {
    await t.sleep(250);
    text = t.workspaceFile("notes/release-note.md");
  }
  if (text !== `${EXPECTED}\n`) throw new Error(`notes/release-note.md does not hold the expected text. On disk: ${JSON.stringify(text)}`);
  const schema = t.workspaceFile("_schema/note.schema.yaml");
  const shipped = readFileSync(new URL("./stage/_schema/note.schema.yaml", import.meta.url), "utf8");
  if (schema !== shipped) throw new Error(`_schema/note.schema.yaml changed on disk: ${JSON.stringify(schema)}`);
  const { frame0, after } = t.notes;
  return { text, frame0, after };
}
