// The scenario of the clip: in Studio's edit mode, the pointer goes onto a figure, its Edit figure button opens one form
// for the whole figure; the keyboard retypes the caption and sets Width, Align and Name; Enter applies, the text box holds
// the rewritten directive; the save chord closes the box and the page shows the smaller figure floating right.
// The text of every caption, badge and time is in clip.md, not here.
import { readFileSync } from "node:fs";
import { join } from "node:path";

/** Clip-relative file to workspace-relative file. */
export const stage = {
  "stage/harbour-guide.md": "harbour-guide.md",
  "stage/harbour-light.svg": "harbour-light.svg",
};

/** Opened with the window, in Studio (see the editor association in the settings). */
export const open = ["harbour-guide.md"];

/** Every Studio setting stays at its default. */
export const settings = {
  "workbench.editorAssociations": { "harbour-guide.md": "markdown-okf-schema-studio.editor" },
};

/** An edit mode clip with no paste: check.json holds no paste-options line and wants edit mode at the start. */
export const checks = { editMode: "on", paste: false };

/** The text of harbour-guide.md after the save, without its final newline: the "Expected result" block of clip.md. */
export const EXPECTED = [
  "# Harbour guide",
  "",
  "The north pier is open to walkers from dawn to dusk. Keep to the marked path.",
  "",
  ":::{figure} harbour-light.svg",
  ":alt: A lighthouse on a rock at dusk",
  ":width: 40%",
  ":align: right",
  ":name: fig-harbour-light",
  "",
  "Harbour light at dusk, from the north pier.",
  ":::",
  "",
  "The light was built in 1874 and still guides the fishing boats home. Its beam turns once every",
  "ten seconds and reaches eighteen nautical miles on a clear night. The keeper's cottage beside it",
  "is now a small museum, open on weekend afternoons from April to October.",
].join("\n");

const CAPTION = "Harbour light at dusk, from the north pier.";
const WIDTH = "40%";
const NAME = "fig-harbour-light";
const STAGE_MD = new URL("stage/harbour-guide.md", import.meta.url);
const STAGE_SVG = new URL("stage/harbour-light.svg", import.meta.url);

const BOX = "[data-sphinx-preview-block-editor] textarea";
const PANEL = '[data-sphinx-figure-panel="true"]';
const BUTTON = '[data-sphinx-figure-edit="true"]';
const FIELD = (name) => `${PANEL} [data-figure-field="${name}"]`;
const FIELDS = ["source", "alt", "caption", "legend", "width", "align", "name"];
const FIGURE_PART = EXPECTED.slice(EXPECTED.indexOf(":::{figure}"), EXPECTED.indexOf(":::\n", EXPECTED.indexOf(":::{figure}") + 3) + 3);

/** A fresh preview frame (the webview reloads while the layout changes) with its edit mode attribute. */
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

/** The values of the seven fields of the figure form. */
function formValues(frame) {
  return frame.locator(PANEL).first().evaluate((panel, names) => {
    const values = {};
    for (const name of names) values[name] = panel.querySelector(`[data-figure-field="${name}"]`)?.value ?? null;
    values.focused = document.activeElement?.getAttribute("data-figure-field") ?? null;
    return values;
  }, FIELDS);
}

/** The first figure's caption, without its "Figure 1" number (runs in the page). */
function captionText() {
  const caption = document.querySelector("figure figcaption")?.cloneNode(true);
  if (!caption) return null;
  for (const number of caption.querySelectorAll(".caption-number")) number.remove();
  return caption.textContent.trim();
}

/** The union of rectangles { x, y, w, h }. */
function union(rects) {
  const x = Math.min(...rects.map((r) => r.x));
  const y = Math.min(...rects.map((r) => r.y));
  const right = Math.max(...rects.map((r) => r.x + r.w));
  const bottom = Math.max(...rects.map((r) => r.y + r.h));
  return { x, y, w: right - x, h: bottom - y };
}

/** Off camera: Studio opens harbour-guide.md in edit mode, the figure in place, no form, the pointer parked. */
export async function setup(t) {
  let frame = await t.frameOf();
  await t.sleep(1500);
  const onDisk = t.workspaceFile("harbour-guide.md");
  const shipped = readFileSync(STAGE_MD, "utf8");
  if (onDisk !== shipped) throw new Error(`harbour-guide.md in the workspace is not the clip's stage file: ${JSON.stringify(onDisk)}`);
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
  if (await frame.locator("figure.align-right").count()) throw new Error("the figure already floats right: a previous take leaked");
  const theme = await frame.evaluate(() => document.documentElement.getAttribute("data-sphinx-preview-theme-mode"));
  t.record("themeMode", theme);
  if (theme !== "cream") throw new Error(`the page is not in the Cream theme (data-sphinx-preview-theme-mode is ${theme})`);
  if ((await frame.locator(BOX).count()) !== 0) throw new Error("a block text box is open at the start");
  if ((await frame.locator(PANEL).count()) !== 0) throw new Error("a figure form is open at the start");
  const loaded = await waitFor(t, 10, () => frame.locator("figure img").first().evaluate((img) => img.naturalWidth > 0));
  if (!loaded) throw new Error("the figure's image did not load");
  // Park the pointer in the empty right margin of the page: no Edit figure button and no hover outline at frame 0.
  const outer = await (await frame.frameElement()).boundingBox();
  await t.moveTo(outer.x + outer.width - 40, outer.y + outer.height * 0.5, 0.1);
  await t.sleep(500);
}

/** The filmed action: the figure, Edit figure, the form filled by keys, Enter, the zoom, the save chord. */
export async function run(t) {
  const { page } = t;
  const start = Date.now();
  const until = (seconds) => t.sleep(Math.max(0, start + seconds * 1000 - Date.now()));
  const home = { ...t.pointer };
  let frame = await t.frameOf();

  // 1. The pointer moves onto the figure: the Edit figure button shows.
  await until(0.2);
  const image = await t.rectOf(frame.locator("figure img").first());
  await t.moveTo(image.x + image.w * 0.5, image.y + image.h * 0.5, 0.6);
  const shown = await waitFor(t, 2, () => frame.locator(BUTTON).first().isVisible());
  if (!shown) throw new Error("hovering the figure in edit mode showed no Edit figure button");
  t.keyFrame("button");

  // 2. The pointer goes to the button and clicks it: the form opens, filled from the directive, Source focused.
  const button = await t.rectOf(frame.locator(BUTTON).first());
  await t.moveTo(button.x + button.w / 2, button.y + button.h / 2, 0.6);
  await until(1.6);
  await t.click();
  const opened = await waitFor(t, 3, async () => (await frame.locator(PANEL).count()) > 0 && (await frame.locator(BOX).count()) > 0);
  if (!opened) throw new Error("the click on Edit figure opened no form with its text box");
  await t.sleep(250);
  const atOpen = await formValues(frame);
  t.record("formAtOpen", atOpen);
  const wantedAtOpen = { source: "harbour-light.svg", alt: "A lighthouse on a rock at dusk", caption: "The harbour light.", legend: "", width: "", align: "", name: "" };
  for (const [name, value] of Object.entries(wantedAtOpen)) {
    if (atOpen[name] !== value) throw new Error(`the figure form field ${name} reads ${JSON.stringify(atOpen[name])}, expected ${JSON.stringify(value)}`);
  }
  if (atOpen.focused !== "source") throw new Error(`the focused field is ${JSON.stringify(atOpen.focused)}, not "source"`);

  // 3. The pointer leaves the palette button the form opened under (its tooltip would show), then a click in Caption puts
  // the caret there; Ctrl/Cmd+A selects its text; the new caption is typed over it.
  const caption = await t.rectOf(frame.locator(FIELD("caption")).first());
  await t.moveTo(caption.x + caption.w * 0.5, caption.y + caption.h * 0.5, 0.5);
  await t.sleep(300);
  t.keyFrame("form");
  await until(2.6);
  await t.click();
  await page.keyboard.press("ControlOrMeta+A");
  const selected = await frame.locator(FIELD("caption")).first().evaluate((field) => ({
    focused: document.activeElement === field,
    start: field.selectionStart,
    end: field.selectionEnd,
    length: field.value.length,
  }));
  if (!selected.focused || selected.start !== 0 || selected.end !== selected.length || selected.length === 0) {
    throw new Error(`the Caption field does not have all its text selected: ${JSON.stringify(selected)}`);
  }
  await page.keyboard.type(CAPTION, { delay: 15 });

  // 4. Tab, Tab: Legend, then Width; the width is typed.
  await page.keyboard.press("Tab");
  await t.sleep(100);
  await page.keyboard.press("Tab");
  if ((await formValues(frame)).focused !== "width") throw new Error("two Tab after Caption did not reach the Width field");
  await page.keyboard.type(WIDTH, { delay: 25 });

  // 5. Tab: Align, set from the keyboard with its list closed.
  await page.keyboard.press("Tab");
  if ((await formValues(frame)).focused !== "align") throw new Error("Tab after Width did not reach the Align field");
  let alignBy = "r";
  await page.keyboard.press("r");
  let align = (await formValues(frame)).align;
  for (let i = 0; i < 3 && align !== "right"; i++) {
    alignBy = "ArrowDown";
    await page.keyboard.press("ArrowDown");
    align = (await formValues(frame)).align;
  }
  if (align !== "right") {
    alignBy = "selectOption";
    await frame.locator(FIELD("align")).first().selectOption("right");
  }
  t.record("alignBy", alignBy);

  // 6. Tab: Name, typed.
  await page.keyboard.press("Tab");
  if ((await formValues(frame)).focused !== "name") throw new Error("Tab after Align did not reach the Name field");
  await page.keyboard.type(NAME, { delay: 15 });
  const filled = await formValues(frame);
  const wantedFilled = { source: "harbour-light.svg", alt: "A lighthouse on a rock at dusk", caption: CAPTION, legend: "", width: WIDTH, align: "right", name: NAME };
  for (const [name, value] of Object.entries(wantedFilled)) {
    if (filled[name] !== value) throw new Error(`the figure form field ${name} reads ${JSON.stringify(filled[name])}, expected ${JSON.stringify(value)}`);
  }
  // The window is short: a pointer wheel move (a filmed action, the pointer is over the form) scrolls the page so the
  // Width, Align and Name fields show beside Caption in `filled`.
  const below = await frame.locator(FIELD("name")).first().evaluate((field) => field.getBoundingClientRect().bottom + 130 - window.innerHeight);
  for (let left = Math.max(0, below); left > 0; left -= 40) {
    await page.mouse.wheel(0, Math.min(40, left));
    await t.sleep(40);
  }
  await t.sleep(300);
  t.keyFrame("filled");

  // 7. Enter in Name (a one-line field) applies: the form closes, the text box holds the rewritten directive.
  await until(6.0);
  await page.keyboard.press("Enter");
  const gone = await waitFor(t, 2, async () => (await frame.locator(PANEL).count()) === 0);
  if (!gone) throw new Error("the figure form stayed open after Enter in Name");
  await t.sleep(150);
  const box = await frame.locator(BOX).first().evaluate((element) => ({ value: element.value, focused: document.activeElement === element }));
  if (box.value !== FIGURE_PART) throw new Error(`the text box does not hold the expected directive: ${JSON.stringify(box.value)}`);
  if (!box.focused) throw new Error("the text box does not have the focus after Apply");
  await t.moveTo(home.x, home.y, 0.5);

  // 8. The zoom on the text box and the paragraph under it (the figure lands inside it after the save).
  await until(6.5);
  const textBox = await t.rectOf(frame.locator(BOX).first());
  const paragraph = await t.rectOf(frame.locator("#sphinx-myst-preview-content p").last());
  const pad = 24;
  const whole = union([textBox, paragraph]);
  t.zoom("figure", { x: whole.x - pad, y: whole.y - pad, w: whole.w + 2 * pad, h: whole.h + 2 * pad });

  // 9. Mark 1: an outline around the three new option lines (width, align, name) in the text box.
  await until(7.0);
  const lines = await frame.locator(BOX).first().evaluate((element) => {
    const style = getComputedStyle(element);
    const lineHeight = Number.parseFloat(style.lineHeight) || Number.parseFloat(style.fontSize) * 1.4;
    return { lineHeight, paddingTop: Number.parseFloat(style.paddingTop), borderTop: Number.parseFloat(style.borderTopWidth), scrollTop: element.scrollTop };
  });
  const top = textBox.y + lines.borderTop + lines.paddingTop + 2 * lines.lineHeight - lines.scrollTop;
  t.mark("1", { x: textBox.x + 2, y: top - 3, w: textBox.w - 4, h: 3 * lines.lineHeight + 6 });
  await until(8.2);
  t.unmark("1");

  // 10. The save chord closes the box; the figure floats right at 40%.
  await until(8.6);
  await t.press("ControlOrMeta+Enter", "save");
  frame = await t.frameOf();
  const rendered = await waitFor(t, 5, async () => {
    const closed = (await frame.locator(BOX).count()) === 0;
    const right = (await frame.locator("figure.align-right").count()) > 0;
    return closed && right;
  });
  if (!rendered) {
    const status = await frame.locator("[role=status], [data-sphinx-preview-status]").allInnerTexts().catch(() => []);
    throw new Error(`the save did not close the box on a right-floating figure (status text: ${JSON.stringify(status)})`);
  }
  const text = await frame.evaluate(captionText);
  t.record("caption", text);
  // The save gives the focus back to the figure, which shows its Edit figure button as a hover would. A short move out
  // of the page and back (over the page's scroll bar and back to the margin) makes the page read what the pointer is over:
  // the button goes, as it does for a real pointer that leaves a figure.
  const outer = await (await frame.frameElement()).boundingBox();
  await t.moveTo(outer.x + outer.width - 3, home.y, 0.2);
  await t.moveTo(home.x, home.y, 0.2);
  const stray = await waitFor(t, 1, async () => !(await frame.locator(BUTTON).first().isVisible()));
  if (!stray) throw new Error("the Edit figure button stays on the rendered figure with the pointer in the margin");
  t.keyFrame("rendered");

  // 11. Mark 2: an outline around the rendered figure and its caption.
  await until(9.2);
  const figure = await t.rectOf(frame.locator("figure").first());
  t.mark("2", { x: figure.x - 6, y: figure.y - 6, w: figure.w + 12, h: figure.h + 12 });
  await until(10.8);
  t.unmark("2");

  // 12. Zoom out and end at the rest point.
  await until(11.0);
  t.unzoom("figure");
  await t.moveTo(home.x, home.y, 0.6);
  await until(11.9);
}

/** harbour-guide.md on disk (auto-save is on) must hold the expected text and the page the figure: a difference fails the take. */
export async function verify(t) {
  await t.sleep(800);
  let text = t.workspaceFile("harbour-guide.md");
  for (let i = 0; i < 8 && text !== `${EXPECTED}\n`; i++) {
    await t.sleep(250);
    text = t.workspaceFile("harbour-guide.md");
  }
  if (text !== `${EXPECTED}\n`) throw new Error(`harbour-guide.md does not hold the expected text. On disk: ${JSON.stringify(text)}`);
  const frame = await t.frameOf();
  const seen = await frame.evaluate(() => {
    const caption = document.querySelector("figure figcaption")?.cloneNode(true);
    for (const number of caption?.querySelectorAll(".caption-number") ?? []) number.remove();
    const figure = document.querySelector("figure");
    const named = document.getElementById("fig-harbour-light");
    return {
      alignRight: figure?.classList.contains("align-right") ?? false,
      width: figure?.querySelector("img")?.getAttribute("data-okf-width") ?? null,
      namedIsFigure: Boolean(named && figure && (named === figure || figure.contains(named) || named.contains(figure))),
      caption: caption?.textContent.trim() ?? null,
      boxes: document.querySelectorAll("[data-sphinx-preview-block-editor] textarea").length,
    };
  });
  if (!seen.alignRight) throw new Error(`the figure does not have the class align-right: ${JSON.stringify(seen)}`);
  if (seen.width !== WIDTH) throw new Error(`the figure image has data-okf-width ${JSON.stringify(seen.width)}, expected ${WIDTH}`);
  if (!seen.namedIsFigure) throw new Error(`the id fig-harbour-light is not the figure: ${JSON.stringify(seen)}`);
  if (seen.caption !== CAPTION) throw new Error(`the caption reads ${JSON.stringify(seen.caption)}: ${JSON.stringify(seen)}`);
  if (seen.boxes !== 0) throw new Error("a block text box is still open");
  if (!readFileSync(join(t.workspace, "harbour-light.svg")).equals(readFileSync(STAGE_SVG))) {
    throw new Error("harbour-light.svg on disk is not the clip's stage SVG, byte for byte");
  }
  const { alignBy, formAtOpen } = t.notes;
  return { text, alignBy, formAtOpen };
}
