// The scenario of the clip: in Studio's reading mode, the second option of a radio choice list ("Cache the page
// between sessions") is clicked; the page selects it at once and the raw text of the same file, open beside the
// page, moves the x from the first option's line to the second's.
// The text of every caption and every time is in clip.md, not here.

/** Clip-relative file to workspace-relative file. */
export const stage = { "stage/plan.md": "plan.md" };

/** Opened with the window, as the built-in text editor (Studio has priority "option"); setup puts Studio on its left. */
export const open = ["plan.md"];

/** No setting: every setting at its default. */
export const settings = {};

/** A reading mode clip with no paste: check.json holds no paste-options line and wants edit mode off at the start. */
export const checks = { editMode: "off", paste: false };

/** The text of plan.md after the click, character for character: the "Expected result" block of clip.md. */
export const EXPECTED = [
  "# Plan: faster preview start",
  "",
  "The preview takes two seconds to open on large files.",
  "",
  "Approach:",
  "",
  "- ( ) Render the visible blocks first",
  "- (x) Cache the page between sessions",
  "- ( ) Leave as is",
  "",
].join("\n");

const EXPECTED_LINES = EXPECTED.split("\n").filter((line) => line.trim() !== "");

/** The radio controls of the page: `aria-checked` by source line (7, 8, 9), and how many groups hold them. */
const RADIO = "#sphinx-myst-preview-content .myst-radio";

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

/** What the page shows of the radio controls: the groups, and `aria-checked` by source line, in line order. */
async function radioState(frame) {
  return frame.evaluate((selector) => {
    const controls = [...document.querySelectorAll(selector)];
    const groups = new Set(controls.map((control) => control.getAttribute("data-myst-radio-group")));
    const items = controls
      .map((control) => ({ line: Number(control.getAttribute("data-myst-radio-line")), checked: control.getAttribute("aria-checked") }))
      .sort((a, b) => a.line - b.line);
    return { groups: groups.size, items };
  }, RADIO);
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

/** Off camera: Studio on the left in reading mode, the same file as text on the right, the pointer parked below the list. */
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

  // Reading mode: edit mode off.
  let mode;
  ({ frame, mode } = await editMode(t));
  for (let i = 0; i < 6 && mode === "on"; i++) {
    await frame.locator("[data-sphinx-preview-edit-toggle]").first().click();
    for (let j = 0; j < 12 && mode === "on"; j++) {
      await t.sleep(250);
      ({ frame, mode } = await editMode(t));
    }
  }
  t.record("readingMode", mode);
  if (mode !== "off") throw new Error(`Studio is not in reading mode (data-sphinx-preview-edit-mode is ${mode})`);

  // The group: three controls in one group, the first selected.
  let state = { groups: 0, items: [] };
  const wanted = () => state.groups === 1 && state.items.length === 3
    && state.items.map((item) => item.line).join() === "7,8,9"
    && state.items.map((item) => item.checked).join() === "true,false,false";
  for (let i = 0; i < 40 && !wanted(); i++) {
    await t.sleep(250);
    ({ frame } = await editMode(t));
    state = await radioState(frame);
  }
  if (!wanted()) throw new Error(`the page does not show one radio group of three options (lines 7, 8, 9) with the first selected: ${JSON.stringify(state)}`);

  // Park the pointer in the blank area below the list, off every block: frame 0 and the last frame show no hover.
  const list = await frame.locator("#sphinx-myst-preview-content ul").first().boundingBox();
  if (!list) throw new Error("the page has no bulleted list box");
  await t.moveTo(list.x + 200, list.y + list.height + 120, 0.1);
  await t.sleep(500);
}

/** The filmed action: the click on the second option, then the zoom on the raw text with its two marks. */
export async function run(t) {
  const { page } = t;
  const start = Date.now();
  const until = (seconds) => t.sleep(Math.max(0, start + seconds * 1000 - Date.now()));
  const home = { ...t.pointer };
  const frame = await t.frameOf();

  await until(0.3);
  const box = await frame.locator(`${RADIO}[data-myst-radio-line="8"]`).first().boundingBox();
  if (!box) throw new Error("the second option's radio control (source line 8) has no box");
  await t.moveTo(box.x + box.width / 2, box.y + box.height / 2, 0.6);
  t.keyFrame("pointed");

  await until(1.3);
  await t.click();

  // The result: the page and the raw text show the choice (a failure here is a finding against the feature).
  let lines = [];
  let state = { groups: 0, items: [] };
  const samePage = () => state.items.map((item) => item.line + ":" + item.checked).join() === "7:false,8:true,9:false";
  const sameLines = () => lines.length === EXPECTED_LINES.length && lines.every((line, i) => line.text.trimEnd() === EXPECTED_LINES[i]);
  const deadline = Date.now() + 2000;
  for (;;) {
    lines = await editorLines(page);
    state = await radioState(await t.frameOf());
    if ((samePage() && sameLines()) || Date.now() > deadline) break;
    await t.sleep(100);
  }
  t.record("rawLines", lines.map((line) => line.text));
  t.record("pageChoice", state);
  if (!samePage() || !sameLines()) {
    throw new Error(`the click did not give the expected choice. The page shows ${JSON.stringify(state)}, the raw text shows ${JSON.stringify(lines.map((line) => line.text))}`);
  }
  await until(3.4);
  t.keyFrame("chosen");

  await until(4.4);
  lines = await editorLines(page);
  if (lines.length !== EXPECTED_LINES.length) throw new Error(`the text editor shows ${lines.length} non-empty lines, expected ${EXPECTED_LINES.length}`);
  // The lines "Approach:" to "- ( ) Leave as is" (non-empty lines 2 to 5).
  const shown = lines.slice(2, 6);
  const pad = 24;
  const x = Math.min(...shown.map((line) => line.x)) - pad;
  const y = shown[0].y - pad;
  const right = Math.max(...shown.map((line) => line.x + line.w)) + pad;
  const bottom = shown.at(-1).y + shown.at(-1).h + pad;
  t.zoom("raw", { x, y, w: right - x, h: bottom - y });

  const air = (r) => ({ x: r.x - 6, y: r.y - 3, w: r.w + 12, h: r.h + 6 });
  // Mark 1: the new (x) of "Cache the page between sessions" (non-empty line 4, characters 2 to 5).
  await until(5.0);
  t.mark("1", air(await lineSpan(page, 4, 2, 5)));
  await until(6.6);
  t.unmark("1");
  // Mark 2: the old option, now ( ), of "Render the visible blocks first" (non-empty line 3).
  t.mark("2", air(await lineSpan(page, 3, 2, 5)));
  await until(8.2);
  t.unmark("2");

  await until(9.5);
  t.unzoom("raw");
  await t.moveTo(home.x, home.y, 0.6);
  await until(10.5);
}

/** plan.md on disk (auto-save is on) must hold the expected text: a difference fails the take. */
export async function verify(t) {
  let text = "";
  for (let i = 0; i < 12; i++) {
    text = t.workspaceFile("plan.md");
    if (text === EXPECTED) return { text };
    await t.sleep(250);
  }
  throw new Error(`plan.md does not hold the expected text. On disk: ${JSON.stringify(text)}`);
}
