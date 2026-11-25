// The scenario of the clip: Studio shows a Markdown file with changes not yet committed. The Diff button of the
// preview toolbar marks the changed blocks (the paragraph, list items 2 and 3) with a green bar; the Side-by-side button turns the
// paragraph and the list into a card each, the block at the last commit on the left and as it is now on the right,
// with the changed words marked.
// The text of every caption and every time is in clip.md, not here. Node built-ins only: a test loads this file
// without VS Code.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const read = (name) => readFileSync(fileURLToPath(new URL(name, import.meta.url)), "utf8");

/** The text of the last commit (never copied to the workspace) and the text now (saved, not committed). */
export const COMMITTED = read("stage/deploy-guide.committed.md");
export const NOW = read("stage/deploy-guide.md");

/** Clip-relative file to workspace-relative file. */
export const stage = { "stage/deploy-guide.md": "deploy-guide.md" };

/** Opened with the window, in Studio (see the editor association in the settings). */
export const open = ["deploy-guide.md"];

/** Studio opens the file in the whole window; Git decorations off, so the tab title is not coloured as modified. */
export const settings = {
  "workbench.editorAssociations": { "deploy-guide.md": "markdown-okf-schema-studio.editor" },
  "git.decorations.enabled": false,
};

/** A reading mode clip with no paste: check.json holds no paste-options line and wants reading mode at the start. */
export const checks = { editMode: "off", paste: false };

const COMMIT_DATE = "2026-11-16T09:00:00Z";

/** What the cards must show, word by word (consecutive changed words form one marked range). */
const EXPECTED_CARDS = [
  { removed: ["Tuesday", "is"], added: ["Wednesday", "and the smoke tests are"] },
  { removed: ["one", "ten"], added: ["two", "thirty"] },
];

/** git in `workspace`, with no system or global config, no hook and no template of the maintainer; fixed dates. */
function gitIn(workspace, args, input) {
  const empty = join(workspace, "..", "gitconfig-empty");
  if (!existsSync(empty)) writeFileSync(empty, "");
  const env = { ...process.env, GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: empty, GIT_AUTHOR_DATE: COMMIT_DATE, GIT_COMMITTER_DATE: COMMIT_DATE };
  for (const name of ["GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE", "GIT_OBJECT_DIRECTORY"]) delete env[name];
  return execFileSync("git", ["-C", workspace, ...args], { input, encoding: "utf8", env, stdio: ["pipe", "pipe", "pipe"] });
}

/**
 * Off camera: the workspace is a Git repository with one commit that holds COMMITTED as deploy-guide.md, the
 * working file left as the stage made it. Idempotent, never deletes anything. Returns the HEAD commit id.
 */
export function makeRepository(workspace) {
  try {
    execFileSync("git", ["--version"], { stdio: "pipe" });
  } catch {
    throw new Error("git is not on PATH: this clip makes a Git repository");
  }
  const git = (args, input) => gitIn(workspace, args, input);
  if (!existsSync(join(workspace, ".git"))) {
    let inside = false;
    try {
      inside = git(["rev-parse", "--is-inside-work-tree"]).trim() === "true";
    } catch {
      // not inside a work tree: the expected case
    }
    if (inside) throw new Error("the clip workspace is inside a Git work tree; set CLIP_SCRATCH outside any repository");
    git(["init", "-b", "main"]);
    git(["config", "user.name", "Studio Demo"]);
    git(["config", "user.email", "demo@example.invalid"]);
    git(["config", "core.autocrlf", "false"]);
    git(["config", "commit.gpgsign", "false"]);
    const blob = git(["hash-object", "-w", "--stdin"], COMMITTED).trim();
    git(["update-index", "--add", "--cacheinfo", `100644,${blob},deploy-guide.md`]);
    git(["commit", "-m", "Add the deploy guide"]);
  } else {
    let same = false;
    try {
      same = git(["show", "HEAD:deploy-guide.md"]) === COMMITTED && git(["rev-list", "--count", "HEAD"]).trim() === "1";
    } catch {
      // no readable HEAD: another repository
    }
    if (!same) throw new Error("the workspace holds another repository: run `just clip diff-side-by-side setup` again");
  }
  return git(["rev-parse", "HEAD"]).trim();
}

/** An attribute of <html> in the preview, read from a fresh frame (the webview reloads while the page changes). */
async function htmlAttribute(t, name) {
  try {
    const frame = await t.frameOf();
    return await frame.evaluate((wanted) => document.documentElement.getAttribute(wanted), name);
  } catch {
    return null;
  }
}

/** Waits up to `timeout` ms for an <html> attribute to take a value; returns the last value read. */
async function waitAttribute(t, name, value, timeout) {
  const deadline = Date.now() + timeout;
  let seen = await htmlAttribute(t, name);
  while (seen !== value && Date.now() < deadline) {
    await t.sleep(200);
    seen = await htmlAttribute(t, name);
  }
  return seen;
}

/** The marked blocks of the page: their tag names, in document order. */
async function changedBlocks(t) {
  try {
    const frame = await t.frameOf();
    return await frame.evaluate(() => [...document.querySelectorAll("[data-sphinx-preview-changed]")].map((block) => block.tagName));
  } catch {
    return [];
  }
}

/** The centre of an element of the preview, page coordinates. */
async function centreOf(t, frame, selector) {
  const rect = await t.rectOf(frame.locator(selector).first());
  return { x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 };
}

/** The point where the pointer rests: the blank area right of the text, off the toolbar, every block and every bar. */
async function restPoint(t) {
  const frame = await t.frameOf();
  const offset = await (await frame.frameElement()).boundingBox();
  const size = await frame.evaluate(() => {
    let right = 0;
    for (const node of document.querySelectorAll("#sphinx-myst-preview-content p, #sphinx-myst-preview-content li, #sphinx-myst-preview-content h1")) {
      const range = document.createRange();
      range.selectNodeContents(node);
      right = Math.max(right, range.getBoundingClientRect().right);
    }
    return { right, width: window.innerWidth, height: window.innerHeight };
  });
  return { x: offset.x + Math.min(size.right + 60, size.width - 30), y: offset.y + size.height * 0.62 };
}

/** The rectangle that holds every given rectangle. */
function union(rects) {
  const x = Math.min(...rects.map((r) => r.x));
  const y = Math.min(...rects.map((r) => r.y));
  const right = Math.max(...rects.map((r) => r.x + r.w));
  const bottom = Math.max(...rects.map((r) => r.y + r.h));
  return { x, y, w: right - x, h: bottom - y };
}

const air = (r) => ({ x: r.x - 6, y: r.y - 3, w: r.w + 12, h: r.h + 6 });

/** Off camera: the repository, reading mode, the toolbar open, Side-by-side off, Diff off, the pointer parked. */
export async function setup(t) {
  // A leftover quick-input widget of the window start would show in the film.
  await t.page.keyboard.press("Escape");
  await t.sleep(300);
  const id = makeRepository(t.workspace);
  t.record("headCommit", id);
  let frame = await t.frameOf();
  await t.sleep(1500);

  // Reading mode (Side-by-side is disabled in edit mode).
  let mode = await waitAttribute(t, "data-sphinx-preview-edit-mode", "on", 3000);
  if (mode === "on") {
    frame = await t.frameOf();
    await frame.locator("[data-sphinx-preview-edit-toggle]").first().click();
    mode = await waitAttribute(t, "data-sphinx-preview-edit-mode", "off", 5000);
  }
  t.record("readingMode", mode);
  if (mode !== "off") throw new Error(`Studio is not in reading mode (data-sphinx-preview-edit-mode is ${mode})`);

  // The toolbar open: row 4 holds both buttons.
  if ((await htmlAttribute(t, "data-sphinx-preview-toolbar-state")) === "collapsed") {
    frame = await t.frameOf();
    await frame.locator("[data-sphinx-preview-toolbar-collapse]").first().click();
    const state = await waitAttribute(t, "data-sphinx-preview-toolbar-state", "expanded", 5000);
    if (state !== "expanded") throw new Error(`the toolbar did not open (data-sphinx-preview-toolbar-state is ${state})`);
  }

  // Side-by-side off.
  if ((await htmlAttribute(t, "data-sphinx-preview-sbs")) === "on") {
    frame = await t.frameOf();
    await frame.locator("[data-sphinx-preview-sbs-toggle]").first().click();
    const sbs = await waitAttribute(t, "data-sphinx-preview-sbs", "off", 5000);
    if (sbs !== "off") throw new Error(`Side-by-side did not turn off (data-sphinx-preview-sbs is ${sbs})`);
  }

  // Git proof: Diff on shows exactly three marked blocks (the paragraph and list items 2 and 3, one bar each).
  // The window's Git extension finds a repository made after the window opened only after a few seconds, and
  // Studio reads HEAD again on a render.
  if ((await htmlAttribute(t, "data-sphinx-preview-incoming")) === "off") {
    frame = await t.frameOf();
    await frame.locator("[data-sphinx-preview-diff-toggle]").first().click();
  }
  const started = Date.now();
  let lastRefresh = started;
  let blocks = await changedBlocks(t);
  while (blocks.length !== 3 && Date.now() - started < 30000) {
    await t.sleep(500);
    blocks = await changedBlocks(t);
    if (blocks.length === 0 && Date.now() - lastRefresh >= 5000) {
      lastRefresh = Date.now();
      try {
        frame = await t.frameOf();
        await frame.locator("[data-sphinx-preview-refresh]").first().click();
      } catch {
        // the frame reloads: try again at the next round
      }
    }
  }
  if (blocks.length === 0) throw new Error("no change marks: the Git extension did not open the stage repository");
  if (blocks.length !== 3) throw new Error(`the page marks ${blocks.length} changed blocks (${blocks.join(", ")}), expected 3`);

  // Diff off: frame 0 has no bar.
  frame = await t.frameOf();
  await frame.locator("[data-sphinx-preview-diff-toggle]").first().click();
  const incoming = await waitAttribute(t, "data-sphinx-preview-incoming", "off", 5000);
  if (incoming !== "off") throw new Error(`Diff did not turn off (data-sphinx-preview-incoming is ${incoming})`);

  // Park the pointer: frame 0 and the last frame show no hover.
  const rest = await restPoint(t);
  await t.moveTo(rest.x, rest.y, 0.1);
  await t.sleep(500);
}

/** The filmed action: Diff, then Side-by-side, then the zoom on the paragraph's card with its three marks. */
export async function run(t) {
  const start = Date.now();
  const until = (seconds) => t.sleep(Math.max(0, start + seconds * 1000 - Date.now()));
  const home = { ...t.pointer };
  let frame = await t.frameOf();

  // 1. Diff.
  await until(0.1);
  const diff = await centreOf(t, frame, "[data-sphinx-preview-diff-toggle]");
  await t.moveTo(diff.x, diff.y, 0.7);
  await until(1.2);
  await t.click();
  // Off the button, toward the rest point, without crossing a bar.
  await t.moveTo(home.x, home.y, 0.55);
  const incoming = await waitAttribute(t, "data-sphinx-preview-incoming", "on", 2000);
  let blocks = await changedBlocks(t);
  for (let i = 0; i < 10 && blocks.length !== 3; i++) {
    await t.sleep(200);
    blocks = await changedBlocks(t);
  }
  if (incoming !== "on" || JSON.stringify(blocks) !== JSON.stringify(["P", "P", "P"])) {
    throw new Error(`Diff did not mark the paragraph and list items 2 and 3: data-sphinx-preview-incoming is ${incoming}, marked blocks ${JSON.stringify(blocks)}`);
  }
  t.record("changedBlocks", blocks.length);
  t.keyFrame("diff-on");

  // Mark 1: around the three bars.
  frame = await t.frameOf();
  const bars = [];
  for (const bar of await frame.locator("[data-sphinx-preview-change-layer] > span").all()) bars.push(await t.rectOf(bar));
  if (bars.length !== 3) throw new Error(`the page shows ${bars.length} change bars, expected 3`);
  await until(2.0);
  t.mark("1", air(union(bars)));

  // 2. Side-by-side: the pointer starts toward the button while mark 1 is still shown.
  await until(2.6);
  const sbs = await centreOf(t, frame, "[data-sphinx-preview-sbs-toggle]");
  const moving = t.moveTo(sbs.x, sbs.y, 0.7);
  await until(3.2);
  t.unmark("1");
  await moving;
  await until(3.4);
  await t.click();
  const mode = await waitAttribute(t, "data-sphinx-preview-sbs", "on", 5000);
  frame = await t.frameOf();
  let cards = [];
  const readCards = () =>
    frame.evaluate(() => {
      const text = (nodes) => [...nodes].map((node) => (node.textContent ?? "").replaceAll(" ", " ").replace(/\s+/gu, " ").trim());
      return [...document.querySelectorAll("[data-okf-sbs-card]")].map((card) => ({
        kind: card.getAttribute("data-okf-sbs-card"),
        removed: text(card.querySelectorAll('[data-okf-sbs-side="base"] [data-okf-sbs-word="removed"]')),
        added: text(card.querySelectorAll('[data-okf-sbs-side="current"] [data-okf-sbs-word="added"]')),
      }));
    });
  const deadline = Date.now() + 5000;
  for (;;) {
    cards = await readCards();
    if (cards.length === 2 || Date.now() > deadline) break;
    await t.sleep(200);
  }
  t.record("cards", cards);
  const shown = JSON.stringify(cards.map(({ removed, added }) => ({ removed, added })));
  if (mode !== "on" || cards.length !== 2 || cards.some((card) => card.kind !== "changed") || shown !== JSON.stringify(EXPECTED_CARDS)) {
    throw new Error(`Side-by-side did not show the expected cards: data-sphinx-preview-sbs is ${mode}, cards ${JSON.stringify(cards)}`);
  }
  await t.moveTo(home.x, home.y, 0.7);
  t.keyFrame("side-by-side");

  // 3. Zoom on the paragraph's card, then the marks on its words.
  await until(4.6);
  const card = frame.locator('[data-okf-sbs-card="changed"]').first();
  const box = await t.rectOf(card);
  const pad = 24;
  t.zoom("card", { x: box.x - pad, y: box.y - pad, w: box.w + 2 * pad, h: box.h + 2 * pad });
  const word = (side, kind, text) => card.locator(`[data-okf-sbs-side="${side}"] [data-okf-sbs-word="${kind}"]`).filter({ hasText: text }).first();
  const tuesday = air(await t.rectOf(word("base", "removed", "Tuesday")));
  const wednesday = air(await t.rectOf(word("current", "added", "Wednesday")));
  const smoke = air(await t.rectOf(word("current", "added", "and the smoke tests are")));
  await until(5.4);
  t.mark("2", tuesday);
  await until(6.8);
  t.unmark("2");
  t.mark("3", wednesday);
  await until(8.2);
  t.unmark("3");
  t.mark("4", smoke);
  await until(9.6);
  t.unmark("4");

  await until(10.0);
  t.unzoom("card");
  await t.moveTo(home.x, home.y, 0.6);
  await until(11.0);
}

/** The feature never changes the file: it is the stage file, and Git sees it modified only. */
export async function verify(t) {
  const now = t.workspaceFile("deploy-guide.md");
  if (now !== NOW) throw new Error(`deploy-guide.md changed during the take. On disk: ${JSON.stringify(now)}`);
  const status = gitIn(t.workspace, ["status", "--porcelain"]).trimEnd();
  if (status !== " M deploy-guide.md") throw new Error(`git status is not " M deploy-guide.md": ${JSON.stringify(status)}`);
  return { headCommit: t.notes.headCommit, changedBlocks: t.notes.changedBlocks, cards: t.notes.cards };
}
