// The scenario of the clip: in Studio's edit mode, the row "Fix the login bug" of a pipe table is dragged by its
// handle to the top of the body, then the column "Due" by its handle to the first place; the raw text of the same
// file, open beside the page, follows each move and every cell keeps its own spacing.
// The text of every caption and every time is in clip.md, not here.

/** Clip-relative file to workspace-relative file. */
export const stage = { "stage/launch-checklist.md": "launch-checklist.md" };

/** Opened with the window, as the built-in text editor (Studio has priority "option"); setup puts Studio on its left. */
export const open = ["launch-checklist.md"];

/** No setting: every setting at its default. */
export const settings = {};

/** An edit mode clip with no paste: check.json holds no paste-options line and wants edit mode at the start. */
export const checks = { editMode: "on", paste: false };

/** The text of launch-checklist.md after both drags, character for character: the "Expected result" block of clip.md. */
export const EXPECTED = [
  "# Launch checklist",
  "",
  "| Due   | Task                | Team  |",
  "| ----- | ------------------- | ----- |",
  "| Today | Fix the login bug   | QA    |",
  "| Mon   | Write the notes     | Docs  |",
  "| Tue   | Build the packages  | Build |",
  "| Wed   | Publish the release | Docs  |",
  "",
].join("\n");

const EXPECTED_LINES = EXPECTED.split("\n").filter((line) => line.trim() !== "");
/** The non-empty lines of the text after the row move only. */
const AFTER_ROW = [
  "# Launch checklist",
  "| Task                | Team  | Due   |",
  "| ------------------- | ----- | ----- |",
  "| Fix the login bug   | QA    | Today |",
  "| Write the notes     | Docs  | Mon   |",
  "| Build the packages  | Build | Tue   |",
  "| Publish the release | Docs  | Wed   |",
];
const ROWS_AFTER_ROW = ["Fix the login bug", "Write the notes", "Build the packages", "Publish the release"];

const HANDLES = "[data-okf-row-handle-layer] .okf-list-editor-handle";
const ROW_HANDLE = "[data-okf-row-handle-layer] .okf-table-row-handle";
const COL_HANDLE = "[data-okf-row-handle-layer] .okf-table-col-handle";

/**
 * The text editor is the right one: of the editors that show lines, the rightmost. Both helpers below read it
 * (page coordinates, non-breaking spaces turned into spaces).
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

/** The rectangle of the characters [start, end) of the n-th non-empty line of the text editor (page coordinates). */
async function lineSpan(page, n, start, end) {
  return page.evaluate(`((n, start, end) => {
    ${RIGHT_EDITOR}
    const line = viewLines[n];
    if (!line) throw new Error("the text editor has no line " + n);
    const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    let pos = 0, started = false;
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const len = node.data.length;
      if (!started && start < pos + len) { range.setStart(node, start - pos); started = true; }
      if (started && end <= pos + len) { range.setEnd(node, end - pos); break; }
      pos += len;
    }
    const rect = range.getBoundingClientRect();
    return { x: rect.x, y: rect.y, w: rect.width, h: rect.height };
  })(${n}, ${start}, ${end})`);
}

/** The centre, in page coordinates, of the row handle of the third body row or the column handle of "Due". */
async function handleCentre(frame, selector) {
  const box = await frame.locator(selector).first().boundingBox();
  if (!box) throw new Error(`the handle ${selector} has no box (is edit mode on?)`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** The box of the body row whose first cell reads `text`. */
async function rowBox(frame, text) {
  const index = await frame.evaluate((wanted) => {
    const rows = [...document.querySelectorAll("#sphinx-myst-preview-content table tbody tr")];
    return rows.findIndex((row) => (row.cells[0]?.textContent ?? "").trim() === wanted);
  }, text);
  if (index < 0) throw new Error(`the page has no table row starting with "${text}"`);
  const box = await frame.locator("#sphinx-myst-preview-content table tbody tr").nth(index).boundingBox();
  if (!box) throw new Error(`the table row "${text}" has no box`);
  return box;
}

/** The box of the header cell reading `text`. */
async function headerCellBox(frame, text) {
  const index = await frame.evaluate((wanted) => {
    const cells = [...document.querySelectorAll("#sphinx-myst-preview-content table thead th")];
    return cells.findIndex((cell) => (cell.textContent ?? "").trim() === wanted);
  }, text);
  if (index < 0) throw new Error(`the page has no header cell "${text}"`);
  const box = await frame.locator("#sphinx-myst-preview-content table thead th").nth(index).boundingBox();
  if (!box) throw new Error(`the header cell "${text}" has no box`);
  return box;
}

/** The texts of the header cells and of each body row's cells, in order. */
async function pageTable(frame) {
  return frame.evaluate(() => {
    const texts = (row) => [...row.cells].map((cell) => (cell.textContent ?? "").trim());
    const table = document.querySelector("#sphinx-myst-preview-content table");
    return {
      header: table?.tHead?.rows[0] ? texts(table.tHead.rows[0]) : [],
      rows: table ? [...table.tBodies].flatMap((body) => [...body.rows]).map(texts) : [],
    };
  });
}

/** A step of the layout: its result is checked, else it throws, naming the step. */
async function step(t, name, action, done) {
  await action();
  for (let attempt = 0; attempt < 40; attempt++) {
    if (await done()) return;
    await t.sleep(250);
  }
  const quickText = await t.page.locator(".quick-input-widget").innerText().catch(() => "(no quick input)");
  throw new Error(`layout step "${name}" did not give its result (quick input: ${JSON.stringify(quickText)})`);
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

/** Off camera: Studio on the left in edit mode, the same file as text on the right, the pointer parked below the table. */
export async function setup(t) {
  const { page } = t;
  const editorCount = () => page.locator(".monaco-editor .view-lines").count();
  await page.locator(".monaco-editor").first().click();
  await step(t, "Split Editor Right", () => page.keyboard.press("ControlOrMeta+Backslash"), async () => (await editorCount()) >= 2);
  await page.keyboard.press("ControlOrMeta+1");
  await t.sleep(400);
  const quick = page.locator(".quick-input-widget");
  const quickRows = () => quick.locator(".quick-input-list .monaco-list-row").count();
  const quickShown = async () => (await quick.isVisible()) && (await quickRows()) > 0;
  await step(t, "Command Palette", () => page.keyboard.press("F1"), quickShown);
  // "Reopen Editor with Text Editor" ranks first for this text: pick the "With..." row by its label.
  await page.keyboard.type("Reopen Editor With...", { delay: 30 });
  const command = quick.locator(".quick-input-list .monaco-list-row", { hasText: "With..." });
  await step(t, "Reopen Editor With (command)", () => t.sleep(500), async () => (await command.count()) > 0);
  await command.first().click();
  await step(t, "Reopen Editor With (editor list)", () => t.sleep(500), async () => (await quick.locator(".quick-input-list .monaco-list-row", { hasText: "Markdown OKF-Schema Studio" }).count()) > 0);
  await page.keyboard.type("Markdown OKF-Schema Studio", { delay: 30 });
  await t.sleep(600);
  await page.keyboard.press("Enter");
  let frame;
  try {
    frame = await t.frameOf();
  } catch (error) {
    throw new Error(`layout step "Reopen Editor With Studio" gave no preview frame: ${error.message}`);
  }
  await t.sleep(1500);
  if ((await editorCount()) !== 1) throw new Error(`layout: expected one text editor beside Studio, found ${await editorCount()}`);

  // Edit mode on.
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
  let handles = 0;
  for (let i = 0; i < 40 && handles !== 7; i++) {
    await t.sleep(250);
    ({ frame } = await editMode(t));
    handles = await frame.locator(HANDLES).count();
  }
  if (handles !== 7) throw new Error(`the page shows ${handles} table handles, expected 7 (4 rows and 3 columns)`);

  // Park the pointer in the blank area below the table, off every block: frame 0 and the last frame show no hover.
  const table = await frame.locator("#sphinx-myst-preview-content table").first().boundingBox();
  if (!table) throw new Error("the page has no table box");
  await t.moveTo(table.x + 200, table.y + table.height + 120, 0.1);
  await t.sleep(500);
}

/** The filmed action: the row drag, the column drag, then the zoom on the raw text with its two marks. */
export async function run(t) {
  const { page } = t;
  const start = Date.now();
  const until = (seconds) => t.sleep(Math.max(0, start + seconds * 1000 - Date.now()));
  const home = { ...t.pointer };
  let frame = await t.frameOf();

  // The row: "Fix the login bug" (third body row, rendered row index 3) onto the upper half of "Write the notes".
  await until(0.3);
  const rowHandle = await handleCentre(frame, `${ROW_HANDLE}[data-okf-row="3"]`);
  await t.moveTo(rowHandle.x, rowHandle.y, 0.6);

  await until(1.2);
  const target = await rowBox(frame, "Write the notes");
  t.ev("click", t.pointer);
  await page.mouse.down();
  await t.moveTo(rowHandle.x + 6, rowHandle.y + 8, 0.1);
  await t.moveTo(target.x + 40, target.y + target.height / 4, 1.1);
  t.keyFrame("row-drag");
  await until(2.5);
  await page.mouse.up();

  // The result: the raw text and the page show the new row order (a failure here is a finding against the feature).
  let lines = [];
  let seen = { header: [], rows: [] };
  const sameAfterRow = () => lines.length === AFTER_ROW.length && lines.every((line, i) => line.text.trimEnd() === AFTER_ROW[i]) && JSON.stringify(seen.rows.map((row) => row[0])) === JSON.stringify(ROWS_AFTER_ROW);
  let deadline = Date.now() + 2000;
  for (;;) {
    lines = await editorLines(page);
    seen = await pageTable(await t.frameOf());
    if (sameAfterRow() || Date.now() > deadline) break;
    await t.sleep(100);
  }
  t.record("afterRow", { rawLines: lines.map((line) => line.text), pageTable: seen });
  if (!sameAfterRow()) {
    throw new Error(`the row drag did not give the expected order. Raw text shows ${JSON.stringify(lines.map((line) => line.text))}, the page shows ${JSON.stringify(seen)}`);
  }
  await until(3.5);
  t.keyFrame("row-dropped");

  // The render of the row move rebuilds the handles; until then they refuse a drag.
  deadline = Date.now() + Math.max(500, start + 3900 - Date.now());
  let colHandleBox;
  let count = 0;
  for (;;) {
    frame = await t.frameOf();
    count = await frame.locator(HANDLES).count();
    colHandleBox = await frame.locator(`${COL_HANDLE}[data-okf-col="2"]`).first().boundingBox();
    if ((count === 7 && colHandleBox) || Date.now() > deadline) break;
    await t.sleep(100);
  }
  if (count !== 7 || !colHandleBox) {
    throw new Error(`after the row move the page shows ${count} handles and the column handle of "Due" ${colHandleBox ? "has" : "has no"} a box, expected 7 and a box`);
  }

  // The column: "Due" (cell index 2) onto the left half of the "Task" header cell.
  const colHandle = await handleCentre(frame, `${COL_HANDLE}[data-okf-col="2"]`);
  await t.moveTo(colHandle.x, colHandle.y, 0.5);
  await until(4.5);
  const task = await headerCellBox(frame, "Task");
  t.ev("click", t.pointer);
  await page.mouse.down();
  await t.moveTo(colHandle.x + 6, colHandle.y + 8, 0.1);
  await t.moveTo(task.x + task.width / 4, task.y + task.height / 2, 1.1);
  t.keyFrame("column-drag");
  await until(5.8);
  await page.mouse.up();

  const sameExpected = () => lines.length === EXPECTED_LINES.length && lines.every((line, i) => line.text.trimEnd() === EXPECTED_LINES[i]) && JSON.stringify(seen.header) === JSON.stringify(["Due", "Task", "Team"]) && JSON.stringify(seen.rows[0]) === JSON.stringify(["Today", "Fix the login bug", "QA"]);
  deadline = Date.now() + 2000;
  for (;;) {
    lines = await editorLines(page);
    seen = await pageTable(await t.frameOf());
    if (sameExpected() || Date.now() > deadline) break;
    await t.sleep(100);
  }
  t.record("afterColumn", { rawLines: lines.map((line) => line.text), pageTable: seen });
  if (!sameExpected()) {
    throw new Error(`the column drag did not give the expected order. Raw text shows ${JSON.stringify(lines.map((line) => line.text))}, the page shows ${JSON.stringify(seen)}`);
  }
  await until(6.8);
  t.keyFrame("column-dropped");

  await until(7.1);
  lines = await editorLines(page);
  if (lines.length !== EXPECTED_LINES.length) throw new Error(`the text editor shows ${lines.length} non-empty lines, expected ${EXPECTED_LINES.length}`);
  const pad = 24;
  const x = Math.min(...lines.map((line) => line.x)) - pad;
  const y = lines[0].y - pad;
  const right = Math.max(...lines.map((line) => line.x + line.w)) + pad;
  const bottom = lines.at(-1).y + lines.at(-1).h + pad;
  t.zoom("raw", { x, y, w: right - x, h: bottom - y });

  const air = (r) => ({ x: r.x - 6, y: r.y - 3, w: r.w + 12, h: r.h + 6 });
  // Mark 1: the whole line of the moved row (non-empty line 3 after the heading, header and delimiter).
  const movedRow = lines[3];
  await until(7.6);
  t.mark("1", air({ x: movedRow.x, y: movedRow.y, w: movedRow.w, h: movedRow.h }));
  await until(9.1);
  t.unmark("1");
  // Mark 2: the first cell of every table line, "| Due   |" (header, delimiter and the four body rows).
  const first = await lineSpan(page, 1, 0, 9);
  const last = await lineSpan(page, 6, 0, 9);
  t.mark("2", air({ x: first.x, y: first.y, w: first.w, h: last.y + last.h - first.y }));
  await until(10.6);
  t.unmark("2");

  await until(11.2);
  t.unzoom("raw");
  await t.moveTo(home.x, home.y, 0.6);
  await until(12.0);
}

/** launch-checklist.md on disk (auto-save is on) must hold the expected text: a difference fails the take. */
export async function verify(t) {
  let text = "";
  for (let i = 0; i < 12; i++) {
    text = t.workspaceFile("launch-checklist.md");
    if (text === EXPECTED) return { text };
    await t.sleep(250);
  }
  throw new Error(`launch-checklist.md does not hold the expected text. On disk: ${JSON.stringify(text)}`);
}
