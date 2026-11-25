// The scenario of the clip: a sentence of the preview is selected with the mouse, the small Comment button is
// pressed, a comment is typed and saved with the platform save chord; the sentence is highlighted, a click on it
// opens its thread (Reply, Resolve, Delete), the clip zooms on it, then a click beside the paragraph closes it.
// The text of every caption, badge and time is in clip.md, not here.

/** Clip-relative file to workspace-relative file. No comments file is staged: the take creates it. */
export const stage = { "stage/proposal.md": "proposal.md" };

/** Opened with the window, in Studio (see the editor association in the settings). */
export const open = ["proposal.md"];

/** proposal.md opens in Studio, a preview that stays on its document. */
export const settings = {
  "workbench.editorAssociations": { "proposal.md": "markdown-okf-schema-studio.editor" },
};

const SENTENCE = "We drop support for Node 18 in this release.";
const COMMENT = "Can we keep it one more release?";
/** The mark times (seconds), the Mark rows of clip.md. */
const MARK_1 = [6.3, 7.5];
const MARK_2 = [7.5, 8.9];

const normalise = (text) => text.replaceAll(" ", " ").replace(/\s+/gu, " ").trim();

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

/** Waits for a locator to be visible, or throws with `what` after `ms`. */
async function waitFor(locator, ms, what) {
  try {
    await locator.first().waitFor({ state: "visible", timeout: ms });
  } catch {
    throw new Error(`${what} did not appear within ${ms} ms`);
  }
}

/** Off camera: Studio on proposal.md in reading mode, no comments file, no thread, the pointer parked. */
export async function setup(t) {
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
  let existing = null;
  try {
    existing = t.workspaceFile("proposal.comments.json");
  } catch {
    existing = null;
  }
  if (existing !== null) throw new Error(`proposal.comments.json exists before the take (run setup again to empty the workspace): ${existing}`);
  const threads = await frame.locator("mark[data-okf-comment-thread]").count();
  if (threads !== 0) throw new Error(`the page holds ${threads} comment highlight(s) before the take`);
  t.original = t.workspaceFile("proposal.md");
  await t.moveTo(900, 420, 0.1);
  await t.sleep(500);
}

/** The filmed action: select the sentence, comment, save, open the thread, zoom, close. */
export async function run(t) {
  const { page } = t;
  const start = Date.now();
  const until = (seconds) => t.sleep(Math.max(0, start + seconds * 1000 - Date.now()));
  const home = { ...t.pointer };
  const frame = await t.frameOf();

  await until(0.3);
  await t.selectText(frame, "We drop", "release.");
  const selected = normalise(await frame.evaluate(() => getSelection()?.toString() ?? ""));
  t.record("selection", selected);
  if (selected !== SENTENCE) throw new Error(`the page selection is not the sentence: "${selected}"`);

  const button = frame.locator("[data-okf-comment-create]");
  await waitFor(button, 2000, "the Comment button");
  const buttonRect = await t.rectOf(button);
  await t.moveTo(buttonRect.x + buttonRect.w / 2, buttonRect.y + buttonRect.h / 2, 0.6);
  await until(2.6);
  await t.click();

  const input = frame.locator("[data-okf-comment-compose-input]");
  await waitFor(input, 2000, "the comment box");
  await until(2.9);
  await page.keyboard.type(COMMENT, { delay: 40 });
  const typed = await input.first().inputValue();
  t.record("typed", typed);
  if (typed !== COMMENT) throw new Error(`the comment box holds "${typed}", expected "${COMMENT}"`);

  await until(4.6);
  await t.press("ControlOrMeta+Enter", "save");
  const highlight = frame.locator("mark[data-okf-comment-thread]");
  const deadline = Date.now() + 3000;
  for (;;) {
    const closed = (await frame.locator("[data-okf-comment-compose]").count()) === 0;
    const marked = normalise((await highlight.allTextContents()).join(" ")) === SENTENCE;
    if (closed && marked) break;
    if (Date.now() > deadline) {
      const errors = (await frame.locator("[data-okf-comment-error]").allTextContents()).join(" | ");
      throw new Error(`the comment was not saved within 3 s (box closed: ${closed}, highlight: ${marked}, error: "${errors}")`);
    }
    await t.sleep(100);
  }

  const markRect = await t.rectOf(highlight.first());
  await t.moveTo(markRect.x + markRect.w / 2, markRect.y + markRect.h / 2, 0.7);
  await until(5.4);
  await t.click();
  const popover = frame.locator("[data-okf-comment-popover]");
  await waitFor(popover, 2000, "the thread popover");
  await t.sleep(200);

  const box = await t.rectOf(popover.first());
  const hl = await t.rectOf(highlight.first());
  const pad = 24;
  const ux = Math.min(box.x, hl.x) - pad;
  const uy = Math.min(box.y, hl.y) - pad;
  const ur = Math.max(box.x + box.w, hl.x + hl.w) + pad;
  const ub = Math.max(box.y + box.h, hl.y + hl.h) + pad;
  await until(5.8);
  t.zoom("thread", { x: ux, y: uy, w: ur - ux, h: ub - uy });

  const air = (r) => ({ x: r.x - 6, y: r.y - 3, w: r.w + 12, h: r.h + 6 });
  await until(MARK_1[0]);
  t.mark("1", air(await t.rectOf(highlight.first())));
  await until(MARK_1[1]);
  t.unmark("1");
  const reply = await t.rectOf(frame.locator("[data-okf-comment-reply]").first());
  const resolve = await t.rectOf(frame.locator("[data-okf-comment-resolve]").first());
  const rx = Math.min(reply.x, resolve.x), ry = Math.min(reply.y, resolve.y);
  const rr = Math.max(reply.x + reply.w, resolve.x + resolve.w), rb = Math.max(reply.y + reply.h, resolve.y + resolve.h);
  t.mark("2", air({ x: rx, y: ry, w: rr - rx, h: rb - ry }));
  await until(MARK_2[1]);
  t.unmark("2");

  await until(9.6);
  t.unzoom("thread");
  // An empty place of the page, beside the paragraph: a press outside closes the thread.
  const content = await t.rectOf(frame.locator("#sphinx-myst-preview-content").first());
  const area = await (await frame.frameElement()).boundingBox();
  const emptyX = content.x > area.x + 60 ? area.x + (content.x - area.x) / 2 : area.x + area.width - 30;
  const emptyY = area.y + area.height * 0.6;
  t.record("closeAt", { x: Math.round(emptyX), y: Math.round(emptyY) });
  await t.moveTo(emptyX, emptyY, 0.6);
  await until(10.4);
  await t.click();
  try {
    await popover.first().waitFor({ state: "detached", timeout: 2000 });
  } catch {
    throw new Error("the thread popover did not close after the click beside the paragraph");
  }

  await t.moveTo(home.x, home.y, 0.6);
  const widgets = await page.locator(".post-edit-widget").count();
  t.record("pasteWidgets", widgets);
  await until(11.3);
}

/** The comments file, read from disk, must hold the one thread of the take, and proposal.md must be unchanged. */
export async function verify(t) {
  await t.sleep(800);
  const text = t.workspaceFile("proposal.comments.json");
  let file;
  try {
    file = JSON.parse(text);
  } catch {
    throw new Error(`proposal.comments.json is not JSON: ${text}`);
  }
  const thread = file.threads?.[0];
  const comment = thread?.comments?.[0];
  const ok =
    file.version === 1 &&
    file.document === "proposal.md" &&
    file.threads?.length === 1 &&
    thread.anchor?.quote === SENTENCE &&
    thread.resolved === false &&
    thread.comments?.length === 1 &&
    comment.author === "Reviewer" &&
    comment.body === COMMENT;
  if (!ok) throw new Error(`proposal.comments.json does not hold the expected thread: ${text}`);
  if (t.workspaceFile("proposal.md") !== t.original) throw new Error("proposal.md changed during the take");
  return { comments: file };
}
