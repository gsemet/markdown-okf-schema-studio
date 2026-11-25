// The scenario of the clip: spreadsheet cells, as the tab-separated text of tasks.tsv in a text editor, are
// copied with the platform copy shortcut and pasted into the header cell "Task" of a two-column table of a Studio
// page in edit mode: the cells fill rightwards and downwards, and the missing column and rows are added.
// The text of every caption, badge and time is in clip.md, not here.

/** Clip-relative file to workspace-relative file. */
export const stage = { "stage/release-checklist.md": "release-checklist.md", "stage/tasks.tsv": "tasks.tsv" };

/** Opened with the window, in Studio (see the editor association in the settings); setup opens tasks.tsv beside it. */
export const open = ["release-checklist.md"];

/** No Studio setting. The editor settings only lay the tab-separated values out as columns, with no whitespace arrows. */
export const settings = {
  // release-checklist.md opens in Studio, a preview that stays on its document; tasks.tsv stays the plain text editor.
  "workbench.editorAssociations": { "release-checklist.md": "markdown-okf-schema-studio.editor" },
  "editor.tabSize": 22,
  "editor.detectIndentation": false,
  "editor.renderWhitespace": "none",
};

/** An edit mode clip with a paste: check.json holds the paste-options line and wants edit mode at the start. */
export const checks = { editMode: "on", paste: true };

/** The text release-checklist.md must hold after the paste: the "Expected paste" block of clip.md (a test compares them). */
export const EXPECTED = [
  "# Release 2.4 checklist",
  "",
  "| Task | Owner | Due |",
  "| --- | --- | --- |",
  "| Freeze the branch | Ana | Mon |",
  "| Run the migrations | Ben | Tue |",
  "| Restart the workers | Chen | Wed |",
  "| Announce the release | Dev | Thu |",
  "",
].join("\n");

const EXPECTED_HEADERS = ["Task", "Owner", "Due"];
const EXPECTED_ROWS = [
  ["Freeze the branch", "Ana", "Mon"],
  ["Run the migrations", "Ben", "Tue"],
  ["Restart the workers", "Chen", "Wed"],
  ["Announce the release", "Dev", "Thu"],
];

const CELL_EDITOR = "[data-sphinx-preview-table-cell-editor]";

/**
 * The text editor is the right one: of the editors that show lines, the rightmost (Studio is a preview, not an
 * editor). Both helpers below read it (page coordinates, non-breaking spaces turned into spaces).
 */
const RIGHT_EDITOR = `
  const editors = [...document.querySelectorAll(".monaco-editor")].filter((e) => e.querySelector(".view-lines"));
  const editor = editors.sort((a, b) => b.getBoundingClientRect().x - a.getBoundingClientRect().x)[0];
  const viewLines = editor ? [...editor.querySelectorAll(".view-lines .view-line")].filter((l) => l.textContent?.trim()).sort((a, b) => a.getBoundingClientRect().y - b.getBoundingClientRect().y) : [];
`;

/** The texts and rectangles of the non-empty lines of the text editor, top to bottom. */
async function editorLines(page) {
  return page.evaluate(`(() => {
    ${RIGHT_EDITOR}
    return viewLines.map((line) => {
      const range = document.createRange();
      range.selectNodeContents(line);
      const rect = range.getBoundingClientRect();
      return { text: line.textContent.replaceAll("\\u00a0", " "), x: rect.x, y: rect.y, w: rect.width, h: rect.height };
    });
  })()`);
}

/** The left edge (page coordinates) of the first occurrence of `word` in the n-th non-empty line of the text editor. */
async function wordX(page, n, word) {
  return page.evaluate(`((n, word) => {
    ${RIGHT_EDITOR}
    const line = viewLines[n];
    if (!line) throw new Error("the text editor has no line " + n);
    const start = line.textContent.replaceAll("\\u00a0", " ").indexOf(word);
    if (start < 0) throw new Error("line " + n + " has no " + word);
    const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    let pos = 0;
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const len = node.data.length;
      if (start < pos + len) { range.setStart(node, start - pos); range.setEnd(node, start - pos + 1); break; }
      pos += len;
    }
    return range.getBoundingClientRect().x;
  })(${n}, ${JSON.stringify(word)})`);
}

/** The distinct tops of the selection rectangles of the text editor: one per selected row. */
async function selectedRows(page) {
  return page.evaluate(`(() => {
    ${RIGHT_EDITOR}
    if (!editor) return 0;
    return new Set([...editor.querySelectorAll(".view-overlays .selected-text")].map((e) => Math.round(e.getBoundingClientRect().y))).size;
  })()`);
}

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

/** The headers and the body rows of the first table of the page, as texts. */
async function tableShape(frame) {
  return frame.evaluate(() => {
    const table = document.querySelector("#sphinx-myst-preview-content table");
    // A cell editor, when it is open in a cell, is not part of the text of the cell (its buttons are labelled).
    const text = (cell) => {
      const copy = cell.cloneNode(true);
      copy.querySelectorAll("[data-sphinx-preview-table-cell-editor]").forEach((editor) => editor.remove());
      return (copy.textContent ?? "").replace(/\s+/gu, " ").trim();
    };
    if (!table) return { headers: [], rows: [] };
    return {
      headers: [...table.querySelectorAll("thead th, tr:first-child th")].map(text),
      rows: [...table.querySelectorAll("tbody tr")].map((row) => [...row.children].map(text)),
    };
  });
}

/** The rectangle of a locator in page coordinates, { x, y, w, h }. */
async function box(locator) {
  const found = await locator.boundingBox();
  if (!found) throw new Error("an element of the page has no box");
  return { x: found.x, y: found.y, w: found.width, h: found.height };
}

/** The union of rectangles. */
function union(rects) {
  const x = Math.min(...rects.map((r) => r.x));
  const y = Math.min(...rects.map((r) => r.y));
  const right = Math.max(...rects.map((r) => r.x + r.w));
  const bottom = Math.max(...rects.map((r) => r.y + r.h));
  return { x, y, w: right - x, h: bottom - y };
}

/** Off camera: Studio on the left in edit mode, tasks.tsv as text on the right, the pointer parked in the text editor. */
export async function setup(t) {
  const { page } = t;
  await t.frameOf();
  await t.sleep(1500);
  // tasks.tsv, as the built-in text editor, beside Studio.
  await page.keyboard.press("Control+p");
  await t.sleep(500);
  await page.keyboard.type("tasks.tsv", { delay: 30 });
  await t.sleep(700);
  await page.keyboard.press("Control+Enter");
  await t.sleep(1500);

  let lines = await editorLines(page);
  for (let i = 0; i < 20 && lines.length !== 5; i++) {
    await t.sleep(250);
    lines = await editorLines(page);
  }
  if (lines.length !== 5) throw new Error(`the text editor shows ${lines.length} non-empty lines, expected the 5 lines of tasks.tsv`);
  const owner = await wordX(page, 0, "Owner");
  const ana = await wordX(page, 1, "Ana");
  if (Math.abs(owner - ana) >= 4) throw new Error(`the tab size does not hold: "Owner" is at x ${owner} and "Ana" at x ${ana}`);

  // Edit mode on.
  let { frame, mode } = await editMode(t);
  if (mode !== "on") {
    await frame.locator("[data-sphinx-preview-edit-toggle]").first().click();
    for (let i = 0; i < 20 && mode !== "on"; i++) {
      await t.sleep(250);
      ({ frame, mode } = await editMode(t));
    }
  }
  t.record("readingMode", mode); // the key keeps its name: it holds data-sphinx-preview-edit-mode
  if (mode !== "on") throw new Error(`Studio is not in edit mode (data-sphinx-preview-edit-mode is ${mode})`);

  const shape = await tableShape(frame);
  const start = shape.headers.join("|") === "Task|Owner" && shape.rows.length === 1 && shape.rows[0].join("|") === "Freeze the branch|Ana";
  if (!start) throw new Error(`the page does not show the small table at the start: ${JSON.stringify(shape)}`);
  if ((await frame.locator(CELL_EDITOR).count()) !== 0) throw new Error("a table cell editor is open at the start");

  // Park the pointer in the blank area of the text editor, below the five lines: the clip starts and ends there.
  const last = lines.at(-1);
  await t.moveTo(lines[0].x + 120, last.y + last.h + 80, 0.1);
  await t.sleep(500);
}

/** The filmed action: select, copy, click the header cell, paste, then the zoom on the table with its two marks. */
export async function run(t) {
  const { page } = t;
  const start = Date.now();
  const until = (seconds) => t.sleep(Math.max(0, start + seconds * 1000 - Date.now()));
  const home = { ...t.pointer };
  let frame = await t.frameOf();

  // The selection of the five lines in the text editor.
  await until(0.3);
  const lines = await editorLines(page);
  if (lines.length !== 5) throw new Error(`the text editor shows ${lines.length} non-empty lines, expected 5`);
  const first = lines[0];
  const last = lines.at(-1);
  await t.moveTo(first.x + 1, first.y + first.h / 2, 0.5);
  t.ev("click", t.pointer);
  await page.mouse.down();
  await t.sleep(80);
  await t.moveTo(last.x + last.w + 12, last.y + last.h / 2, 0.9);
  await t.sleep(60);
  await page.mouse.up();
  const rows = await selectedRows(page);
  t.record("selectedRows", rows);
  if (rows !== 5) throw new Error(`the text editor shows a selection on ${rows} rows, expected 5`);

  await until(2.0);
  await t.press("ControlOrMeta+C", "copy");

  // The click on the header cell "Task" opens the cell editor.
  await until(2.2);
  frame = await t.frameOf();
  const offset = await (await frame.frameElement()).boundingBox();
  const taskText = await frame.evaluate(() => {
    const th = [...document.querySelectorAll("#sphinx-myst-preview-content table th")].find((cell) => (cell.textContent ?? "").trim() === "Task");
    if (!th) return undefined;
    const range = document.createRange();
    range.selectNodeContents(th);
    const rect = range.getBoundingClientRect();
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  });
  if (!taskText) throw new Error("the page shows no header cell Task");
  await t.moveTo(offset.x + taskText.x, offset.y + taskText.y, 0.8);
  await until(3.2);
  await t.click();
  const cellField = () => frame.locator(`${CELL_EDITOR} textarea`);
  let opened = false;
  for (let deadline = Date.now() + 2000; Date.now() < deadline && !opened; ) {
    opened = (await cellField().count()) > 0 && (await cellField().first().inputValue()) === "Task";
    if (!opened) await t.sleep(100);
  }
  if (!opened) throw new Error("the cell editor did not open on the header cell Task");

  await until(3.8);
  await t.press("ControlOrMeta+V", "paste");
  await t.sleep(250);
  const widgets = await page.locator(".post-edit-widget").count();
  t.record("pasteWidgets", widgets);
  if (widgets !== 0) throw new Error(`a VS Code paste-options widget showed after the paste (${widgets})`);

  // The result: the table (a difference is a finding against the feature). The cell editor is not checked here.
  const same = (shape) => JSON.stringify(shape.headers) === JSON.stringify(EXPECTED_HEADERS) && JSON.stringify(shape.rows) === JSON.stringify(EXPECTED_ROWS);
  let shape = { headers: [], rows: [] };
  for (let deadline = Date.now() + 3000; ; ) {
    frame = await t.frameOf();
    shape = await tableShape(frame);
    if (same(shape) || Date.now() > deadline) break;
    await t.sleep(100);
  }
  t.record("tableShape", shape);
  if (!same(shape)) throw new Error(`the paste did not give the expected table. The page shows ${JSON.stringify(shape)}`);

  // The cell editor of TABLE-120 may or may not be reopened on "Task" after a synthetic paste (the take varies, and the
  // reopen is covered by the real-input integration test). The clip claims nothing about it, but an open editor
  // widens the first column and hides "Due": when it is open, a click on Done closes it before the zoom.
  await until(4.0);
  const done = frame.locator(`${CELL_EDITOR} button[aria-label="Done editing"]`);
  if ((await done.count()) > 0) {
    const doneBox = await box(done.first());
    await t.moveTo(doneBox.x + doneBox.w / 2, doneBox.y + doneBox.h / 2, 0.3);
    await until(4.4);
    await t.click();
    let closed = false;
    for (let deadline = Date.now() + 2000; Date.now() < deadline && !closed; ) {
      closed = (await frame.locator(CELL_EDITOR).count()) === 0;
      if (!closed) await t.sleep(100);
    }
    if (!closed) throw new Error("the cell editor did not close after the click on Done");
  }
  t.record("cellEditorOpen", (await frame.locator(CELL_EDITOR).count()) > 0);

  // The zoom on the table: its box padded by 24 px, grown around its centre to at least half the window, clamped.
  await until(4.8);
  const view = await page.evaluate(() => ({ w: window.innerWidth, h: window.innerHeight }));
  const table = frame.locator("#sphinx-myst-preview-content table").first();
  const tableBox = await box(table);
  const pad = 24;
  const want = { w: Math.max(tableBox.w + 2 * pad, view.w / 2), h: Math.max(tableBox.h + 2 * pad, view.h / 2) };
  const centre = { x: tableBox.x + tableBox.w / 2, y: tableBox.y + tableBox.h / 2 };
  const x = Math.max(0, Math.min(view.w - want.w, centre.x - want.w / 2));
  const y = Math.max(0, Math.min(view.h - want.h, centre.y - want.h / 2));
  t.zoom("table", { x, y, w: Math.min(want.w, view.w), h: Math.min(want.h, view.h) });

  const air = (r) => ({ x: r.x - 6, y: r.y - 3, w: r.w + 12, h: r.h + 6 });
  // Mark 1: the column "Due" (its header and its four cells).
  const dueCells = frame.locator("#sphinx-myst-preview-content table tr").locator("th:nth-child(3), td:nth-child(3)");
  const dueCount = await dueCells.count();
  if (dueCount !== 5) throw new Error(`the column Due has ${dueCount} cells, expected 5`);
  const due = union(await Promise.all([0, 1, 2, 3, 4].map((i) => box(dueCells.nth(i)))));
  await until(5.4);
  t.mark("1", air(due));
  await until(6.9);
  t.unmark("1");
  // Mark 2: the three added rows (the 2nd, 3rd and 4th body rows).
  const bodyRows = frame.locator("#sphinx-myst-preview-content table tbody tr");
  const added = union(await Promise.all([1, 2, 3].map((i) => box(bodyRows.nth(i)))));
  t.mark("2", air(added));
  await until(8.4);
  t.unmark("2");

  await until(9.2);
  t.unzoom("table");
  await t.moveTo(home.x, home.y, 0.6);
  await until(10.0);
}

/** release-checklist.md on disk (auto-save is on) must hold the expected text: a difference fails the take. */
export async function verify(t) {
  let text = "";
  for (let i = 0; i < 12; i++) {
    text = t.workspaceFile("release-checklist.md");
    if (text === EXPECTED) return { text };
    await t.sleep(250);
  }
  throw new Error(`release-checklist.md does not hold the expected text. On disk: ${JSON.stringify(text)}`);
}
