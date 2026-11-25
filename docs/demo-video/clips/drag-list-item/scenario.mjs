// The scenario of the clip: in Studio's edit mode, the second item of an ordered list ("Build the packages.",
// with its two sub-items) is dragged by its handle above the first item; the list keeps its numbers in order
// and the raw text of the same file, open beside the page, changes to match.
// The text of every caption and every time is in clip.md, not here.

/** Clip-relative file to workspace-relative file. */
export const stage = { "stage/release-steps.md": "release-steps.md" };

/** Opened with the window, as the built-in text editor (Studio has priority "option"); setup puts Studio on its left. */
export const open = ["release-steps.md"];

/** No setting: every setting at its default. */
export const settings = {};

/** An edit mode clip with no paste: check.json holds no paste-options line and wants edit mode at the start. */
export const checks = { editMode: "on", paste: false };

/** The text of release-steps.md after the drag, character for character: the "Expected result" block of clip.md. */
export const EXPECTED = [
  "# Release steps",
  "",
  "1. Build the packages.",
  "   - Linux and macOS",
  "   - Windows",
  "2. Tag the release.",
  "3. Run the smoke tests.",
  "4. Publish the notes.",
  "",
].join("\n");

const EXPECTED_LINES = EXPECTED.split("\n").filter((line) => line.trim() !== "");
const EXPECTED_ORDER = ["Build the packages.", "Tag the release.", "Run the smoke tests.", "Publish the notes."];

const HANDLE = "[data-okf-list-handle-layer] .okf-list-item-handle";

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

/**
 * The item whose own first text starts with `text`: its box in page coordinates, the top and height of its
 * first line (page coordinates) and its source line.
 */
async function itemBox(frame, text) {
  const found = await frame.evaluate((wanted) => {
    const ownText = (candidate) => {
      const walker = document.createTreeWalker(candidate, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if ((node.textContent ?? "").trim()) return (node.textContent ?? "").trim();
      }
      return "";
    };
    const item = [...document.querySelectorAll("#sphinx-myst-preview-content li")].find((candidate) => ownText(candidate).startsWith(wanted));
    if (!item) return undefined;
    const walker = document.createTreeWalker(item, NodeFilter.SHOW_TEXT);
    let first;
    for (let node = walker.nextNode(); node && !first; node = walker.nextNode()) if ((node.textContent ?? "").trim()) first = node;
    const range = document.createRange();
    range.selectNodeContents(first);
    const line = range.getClientRects()[0];
    const box = item.getBoundingClientRect();
    return { line: item.getAttribute("data-sphinx-source-line"), lineTop: line.top - box.top, lineHeight: line.height };
  }, text);
  if (!found || !found.line) throw new Error(`the page has no list item starting with "${text}" (with its source line)`);
  const box = await frame.locator(`#sphinx-myst-preview-content li[data-sphinx-source-line="${found.line}"]`).first().boundingBox();
  if (!box) throw new Error(`the list item "${text}" has no box`);
  return { box, line: found.line, lineTop: box.y + found.lineTop, lineHeight: found.lineHeight };
}

/** The centre, in page coordinates, of the handle of the item starting with `text`. */
async function handleOf(frame, text) {
  const { line } = await itemBox(frame, text);
  const box = await frame.locator(`${HANDLE}[data-okf-list-item-line="${line}"]`).first().boundingBox();
  if (!box) throw new Error(`the item "${text}" has no handle with a box (is edit mode on?)`);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** The own first texts of the top-level ordered list's items, in order, and what the "Build the packages." item holds. */
async function pageOrder(frame) {
  return frame.evaluate(() => {
    const ownText = (candidate) => {
      const walker = document.createTreeWalker(candidate, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if ((node.textContent ?? "").trim()) return (node.textContent ?? "").trim();
      }
      return "";
    };
    const list = document.querySelector("#sphinx-myst-preview-content ol");
    const items = list ? [...list.children].filter((child) => child.tagName === "LI") : [];
    const build = items.find((item) => ownText(item) === "Build the packages.");
    return { order: items.map(ownText), subItems: build ? [...build.querySelectorAll("ul > li, ol > li")].map(ownText) : [] };
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

/** Off camera: Studio on the left in edit mode, the same file as text on the right, the pointer parked below the list. */
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
  for (let i = 0; i < 40 && handles !== 6; i++) {
    await t.sleep(250);
    ({ frame } = await editMode(t));
    handles = await frame.locator(HANDLE).count();
  }
  if (handles !== 6) throw new Error(`the page shows ${handles} list item handles, expected 6 (4 items and 2 sub-items)`);

  // Park the pointer in the blank area below the list, off every block: frame 0 and the last frame show no hover.
  const list = await frame.locator("#sphinx-myst-preview-content ol").first().boundingBox();
  if (!list) throw new Error("the page has no ordered list box");
  await t.moveTo(list.x + 200, list.y + list.height + 120, 0.1);
  await t.sleep(500);
}

/** The filmed action: the drag by the handle, then the zoom on the raw text with its two marks. */
export async function run(t) {
  const { page } = t;
  const start = Date.now();
  const until = (seconds) => t.sleep(Math.max(0, start + seconds * 1000 - Date.now()));
  const home = { ...t.pointer };
  const frame = await t.frameOf();

  await until(0.3);
  const handle = await handleOf(frame, "Build the packages.");
  await t.moveTo(handle.x, handle.y, 0.6);

  await until(1.2);
  const target = await itemBox(frame, "Tag the release.");
  t.ev("click", t.pointer);
  await page.mouse.down();
  await t.moveTo(handle.x + 6, handle.y + 8, 0.1);
  await t.moveTo(target.box.x + 40, target.lineTop + target.lineHeight / 4, 1.1);
  t.keyFrame("drag");
  await until(2.6);
  await page.mouse.up();

  // The result: the raw text and the page show the new order (a failure here is a finding against the feature).
  let lines = [];
  let seen = { order: [], subItems: [] };
  const sameLines = () => lines.length === EXPECTED_LINES.length && lines.every((line, i) => line.text.trimEnd() === EXPECTED_LINES[i]);
  const sameOrder = () => JSON.stringify(seen.order) === JSON.stringify(EXPECTED_ORDER) && JSON.stringify(seen.subItems) === JSON.stringify(["Linux and macOS", "Windows"]);
  const deadline = Date.now() + 2000;
  for (;;) {
    lines = await editorLines(page);
    seen = await pageOrder(await t.frameOf());
    if ((sameLines() && sameOrder()) || Date.now() > deadline) break;
    await t.sleep(100);
  }
  t.record("rawLines", lines.map((line) => line.text));
  t.record("pageOrder", seen);
  if (!sameLines() || !sameOrder()) {
    throw new Error(`the drag did not give the expected order. Raw text shows ${JSON.stringify(lines.map((line) => line.text))}, the page shows ${JSON.stringify(seen)}`);
  }
  await until(3.6);
  t.keyFrame("dropped");

  await until(4.4);
  lines = await editorLines(page);
  if (lines.length !== EXPECTED_LINES.length) throw new Error(`the text editor shows ${lines.length} non-empty lines, expected ${EXPECTED_LINES.length}`);
  const pad = 24;
  const x = Math.min(...lines.map((line) => line.x)) - pad;
  const y = lines[0].y - pad;
  const right = Math.max(...lines.map((line) => line.x + line.w)) + pad;
  const bottom = lines.at(-1).y + lines.at(-1).h + pad;
  t.zoom("raw", { x, y, w: right - x, h: bottom - y });

  const air = (r) => ({ x: r.x - 6, y: r.y - 3, w: r.w + 12, h: r.h + 6 });
  // Mark 1: the moved item and its two sub-items (lines 1 to 3 after the heading).
  const moved = lines.slice(1, 4);
  const movedLeft = Math.min(...moved.map((line) => line.x));
  const movedRight = Math.max(...moved.map((line) => line.x + line.w));
  await until(5.0);
  t.mark("1", air({ x: movedLeft, y: moved[0].y, w: movedRight - movedLeft, h: moved.at(-1).y + moved.at(-1).h - moved[0].y }));
  await until(6.6);
  t.unmark("1");
  // Mark 2: the column of the numbers 1. to 4. (the dashes of the sub-items, at column 3, stay outside).
  const first = await lineSpan(page, 1, 0, 2);
  const last = await lineSpan(page, 6, 0, 2);
  t.mark("2", air({ x: first.x, y: first.y, w: first.w, h: last.y + last.h - first.y }));
  await until(8.2);
  t.unmark("2");

  await until(9.5);
  t.unzoom("raw");
  await t.moveTo(home.x, home.y, 0.6);
  await until(10.5);
}

/** release-steps.md on disk (auto-save is on) must hold the expected text: a difference fails the take. */
export async function verify(t) {
  let text = "";
  for (let i = 0; i < 12; i++) {
    text = t.workspaceFile("release-steps.md");
    if (text === EXPECTED) return { text };
    await t.sleep(250);
  }
  throw new Error(`release-steps.md does not hold the expected text. On disk: ${JSON.stringify(text)}`);
}
