// The scenario of the clip: a selection that starts inside an admonition and ends after it is copied
// with the platform copy shortcut and pasted into a plain Markdown editor, with balanceEdges on.
// The text of every caption, badge and time is in clip.md, not here.

/** Clip-relative file to workspace-relative file. */
export const stage = { "stage/runbook.md": "runbook.md", "stage/notes.md": "notes.md" };

/** Opened with the window, in Studio (see the editor association in the settings). */
export const open = ["runbook.md"];

/** A startup setting of Studio, read when the page boots: it is in the profile before the window opens. */
export const settings = {
  "markdownOkfSchemaStudio.preview.rawCopy.balanceEdges": true,
  // runbook.md opens in Studio, a preview that stays on its document; notes.md stays the plain text editor.
  "workbench.editorAssociations": { "runbook.md": "markdown-okf-schema-studio.editor" },
};

const EXPECTED = [
  ":::{important} Before you deploy",
  "database migrations first, then restart the workers one at a time.",
  ":::",
  "",
  "The deploy script checks the migration version and refuses to start the workers on an old schema.",
].join("\n");

const normalise = (text) => text.replaceAll(" ", " ").replace(/\s+/gu, " ").trim();

/** The rectangles of the non-empty lines of the text editor (page coordinates), top to bottom. */
async function editorLines(page) {
  return page.evaluate(() => {
    const lines = [];
    for (const line of document.querySelectorAll(".monaco-editor .view-lines .view-line")) {
      if (!line.textContent?.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(line);
      const rect = range.getBoundingClientRect();
      lines.push({ x: rect.x, y: rect.y, w: rect.width, h: rect.height });
    }
    return lines.sort((a, b) => a.y - b.y);
  });
}

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

/** Off camera: Studio on runbook.md on the left, the built-in text editor on the empty notes.md on the right, reading mode. */
export async function setup(t) {
  const { page } = t;
  // The runbook opens in Studio itself (the editor association below), which does not follow the active editor.
  await t.frameOf();
  await t.sleep(1500);
  // notes.md, as the built-in text editor, beside it.
  await page.keyboard.press("Control+p");
  await t.sleep(500);
  await page.keyboard.type("notes.md", { delay: 30 });
  await t.sleep(700);
  await page.keyboard.press("Control+Enter");
  await t.sleep(1500);
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
  // Park the pointer where the clip starts and ends.
  await t.moveTo(900, 420, 0.1);
  await t.sleep(500);
}

/** The filmed action. Times (seconds from the start of the take) follow the proposal of clip.md. */
export async function run(t) {
  const { page } = t;
  const start = Date.now();
  const until = (seconds) => t.sleep(Math.max(0, start + seconds * 1000 - Date.now()));
  const home = { ...t.pointer };
  const frame = await t.frameOf();

  await until(0.3);
  await t.selectText(frame, "database", "old schema.");
  const selected = normalise(await frame.evaluate(() => getSelection()?.toString() ?? ""));
  t.record("selection", selected);
  if (!selected.startsWith("database") || !selected.endsWith("old schema.")) throw new Error(`the page selection is not the expected one: "${selected}"`);

  await until(2.6);
  await t.press("ControlOrMeta+C", "copy");

  await until(2.8);
  const notes = await page.locator(".monaco-editor").last().boundingBox();
  await t.moveTo(notes.x + notes.width * 0.5, notes.y + 120, 0.8);
  await t.click();

  await until(4.2);
  await t.press("ControlOrMeta+V", "paste");
  await t.sleep(250);
  const widgets = await page.locator(".post-edit-widget").count();
  t.record("pasteWidgets", widgets);
  if (widgets !== 0) throw new Error(`${widgets} paste-options widget(s) shown after the paste`);

  await until(4.4);
  const lines = await editorLines(page);
  if (lines.length < 5) throw new Error(`the notes editor shows ${lines.length} lines after the paste, expected at least 5`);
  const pad = 24;
  const x = Math.min(...lines.map((line) => line.x)) - pad;
  const y = lines[0].y - pad;
  const right = Math.max(...lines.map((line) => line.x + line.w)) + pad;
  const bottom = lines.at(-1).y + lines.at(-1).h + pad;
  t.zoom("result", { x, y, w: right - x, h: bottom - y });

  await until(5.2);
  // A little air around the line, so the outline does not touch the first colon.
  t.mark("delimiter", { x: lines[0].x - 8, y: lines[0].y - 3, w: lines[0].w + 16, h: lines[0].h + 6 });
  await until(6.8);
  t.unmark("delimiter");
  await until(7.6);
  t.unzoom("result");
  await t.moveTo(home.x, home.y, 0.6);
  await until(8.5);
}

/** The pasted text, read from disk (auto-save is on), must be the text CR-481's container rule gives. */
export async function verify(t) {
  await t.sleep(800);
  const pasted = t.workspaceFile("notes.md");
  if (pasted !== EXPECTED) throw new Error(`notes.md does not hold the expected text. Pasted: ${JSON.stringify(pasted)}`);
  return { pasted };
}
