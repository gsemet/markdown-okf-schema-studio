// The scenario of the clip: a selection that starts inside the bold of an untitled admonition, crosses a
// table and a thematic break, and ends inside the warning admonition is copied with the platform copy
// shortcut and pasted into a plain Markdown editor, with balanceEdges on.
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

/** The text the paste must hold, character for character: the "Expected paste" block of clip.md (a test compares them). */
export const EXPECTED = [
  ":::{important}",
  "**migrations first**, then restart the workers one at a time.",
  ":::",
  "",
  "| Step | Command |",
  "| --- | --- |",
  "| Migrate | `just migrate` |",
  "| Restart | `just restart-workers` |",
  "",
  "---",
  "",
  "The deploy script refuses to start the workers on an old schema.",
  "",
  ":::{warning}",
  "Never restart every worker",
  ":::",
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

/** The rectangle of the characters [start, end) of the n-th non-empty editor line (page coordinates). */
async function lineSpan(page, n, start, end) {
  return page.evaluate(([n, start, end]) => {
    const lines = [...document.querySelectorAll(".monaco-editor .view-lines .view-line")].filter((l) => l.textContent?.trim()).sort((a, b) => a.getBoundingClientRect().y - b.getBoundingClientRect().y);
    const line = lines[n];
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
  }, [n, start, end]);
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

/** The filmed action: from inside the bold of the untitled admonition to inside the warning. */
export async function run(t) {
  const { page } = t;
  const start = Date.now();
  const until = (seconds) => t.sleep(Math.max(0, start + seconds * 1000 - Date.now()));
  const home = { ...t.pointer };
  const frame = await t.frameOf();

  await until(0.3);
  await t.selectText(frame, "migrations", "every worker");
  const selected = normalise(await frame.evaluate(() => getSelection()?.toString() ?? ""));
  t.record("selection", selected);
  if (!selected.startsWith("migrations") || !selected.endsWith("every worker")) throw new Error(`the page selection is not the expected one: "${selected}"`);

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

  await until(4.4);
  const lines = await editorLines(page);
  t.record("pastedLines", lines.length);
  if (lines.length !== 12) throw new Error(`the notes editor shows ${lines.length} non-empty lines after the paste, expected 12`);
  const pad = 24;
  const x = Math.min(...lines.map((line) => line.x)) - pad;
  const y = lines[0].y - pad;
  const right = Math.max(...lines.map((line) => line.x + line.w)) + pad;
  const bottom = lines.at(-1).y + lines.at(-1).h + pad;
  t.zoom("result", { x, y, w: right - x, h: bottom - y });

  const air = (r) => ({ x: r.x - 6, y: r.y - 3, w: r.w + 12, h: r.h + 6 });
  await until(5.0);
  // Mark 1: the added opening line `:::{important}`.
  t.mark("1", air(lines[0]));
  await until(6.2);
  t.unmark("1");
  // Mark 2: the added opening `**` before "migrations".
  t.mark("2", air(await lineSpan(page, 1, 0, 2)));
  await until(7.4);
  t.unmark("2");
  // Mark 3: the added closing `:::`.
  t.mark("3", air(lines.at(-1)));
  await until(8.6);
  t.unmark("3");
  await until(8.8);
  t.unzoom("result");
  await t.moveTo(home.x, home.y, 0.6);
  await until(9.8);
}

/** The pasted text, read from disk (auto-save is on), must be the text the feature gives: a difference fails the take. */
export async function verify(t) {
  await t.sleep(800);
  const pasted = t.workspaceFile("notes.md");
  if (pasted !== EXPECTED) throw new Error(`notes.md does not hold the expected text. Pasted: ${JSON.stringify(pasted)}`);
  return { pasted };
}
