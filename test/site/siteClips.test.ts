import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import test from "node:test";

import { renderMyst } from "../../src/core/render/mystRenderer";
import { EXTENSION_ROOT } from "../reportPaths";
import { renderedMarkdownFiles } from "./buildSite";
import { clipVideos, copyClipMedia, isClipSource } from "./siteClips";

const CLIP = "docs/demo-video/clips/x";
const IMG = '<p><img src="../demo-video/clips/x/x.gif" alt="A &quot;clip&quot;"></p>';

const exists = (...paths: string[]) => (candidate: string) => paths.includes(candidate);

test("a clip's GIF with its WebM and poster becomes a looping video that falls back to the GIF", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-095
  const html = clipVideos(IMG, "docs/user/settings.md", exists(`${CLIP}/x.webm`, `${CLIP}/poster.png`));
  assert.equal(
    html,
    '<p><video src="../demo-video/clips/x/x.webm" poster="../demo-video/clips/x/poster.png" autoplay="" loop="" muted="" playsinline="" controls="" aria-label="A &quot;clip&quot;"><img src="../demo-video/clips/x/x.gif" alt="A &quot;clip&quot;"></video></p>',
  );
});

test("a clip without poster.png has no poster attribute", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-095
  const html = clipVideos(IMG, "docs/user/settings.md", exists(`${CLIP}/x.webm`));
  assert.ok(html.includes("<video "));
  assert.ok(!html.includes("poster="));
});

test("a clip GIF with no WebM beside it stays an image", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-095
  assert.equal(clipVideos(IMG, "docs/user/settings.md", exists(`${CLIP}/poster.png`)), IMG);
});

test("a GIF outside the clips folder, or not named like its folder, is unchanged", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-095
  const everything = (): boolean => true;
  for (const [html, page] of [
    ['<p><img src="../../images/x.gif" alt="a"></p>', "docs/user/settings.md"],
    ['<p><img src="../demo-video/clips/x/other.gif" alt="a"></p>', "docs/user/settings.md"],
    ['<p><img src="https://example.com/docs/demo-video/clips/x/x.gif" alt="a"></p>', "docs/user/settings.md"],
    ['<p><img src="../demo-video/clips/x/x.png" alt="a"></p>', "docs/user/settings.md"],
  ]) {
    assert.equal(clipVideos(html, page, everything), html);
  }
});

test("copyClipMedia copies the WebM, GIF and poster of each clip and nothing else", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-095
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "clip-media-"));
  try {
    const clip = path.join(root, "repo", "docs", "demo-video", "clips", "x");
    fs.mkdirSync(path.join(clip, "stage"), { recursive: true });
    for (const name of ["x.webm", "x.gif", "poster.png", "x.mp4", "scenario.mjs", "contact-sheet.png", "stage/runbook.md"]) fs.writeFileSync(path.join(clip, name), name);
    const site = path.join(root, "site");
    copyClipMedia(path.join(root, "repo"), site);
    const published = path.join(site, "docs", "demo-video", "clips", "x");
    assert.deepEqual(fs.readdirSync(published).sort(), ["poster.png", "x.gif", "x.webm"]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("copyClipMedia with no clips folder does nothing", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-095
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "clip-media-"));
  try {
    copyClipMedia(path.join(root, "repo"), path.join(root, "site"));
    assert.equal(fs.existsSync(path.join(root, "site")), false);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("the shipped settings page plays the raw copy clip as video", async () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-095
  const clip = "docs/demo-video/clips/raw-copy-balance-edges";
  const source = fs.readFileSync(path.join(EXTENSION_ROOT, "docs", "user", "settings.md"), "utf8");
  const rendered = await renderMyst(source);
  const html = clipVideos(rendered.html, "docs/user/settings.md", (repoPath) => fs.existsSync(path.join(EXTENSION_ROOT, repoPath)));
  assert.ok(html.includes(`<video src="../demo-video/clips/raw-copy-balance-edges/raw-copy-balance-edges.webm"`), "the page holds the clip's video");
  for (const file of ["raw-copy-balance-edges.webm", "raw-copy-balance-edges.gif", "poster.png"]) {
    assert.ok(fs.existsSync(path.join(EXTENSION_ROOT, clip, file)), file);
  }
});

test("the shipped editing page plays the list drag clip as video", async () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-095
  const clip = "docs/demo-video/clips/drag-list-item";
  const source = fs.readFileSync(path.join(EXTENSION_ROOT, "docs", "user", "editing.md"), "utf8");
  const rendered = await renderMyst(source);
  const html = clipVideos(rendered.html, "docs/user/editing.md", (repoPath) => fs.existsSync(path.join(EXTENSION_ROOT, repoPath)));
  assert.ok(html.includes(`<video src="../demo-video/clips/drag-list-item/drag-list-item.webm"`), "the page holds the clip's video");
  for (const file of ["drag-list-item.webm", "drag-list-item.gif", "poster.png"]) {
    assert.ok(fs.existsSync(path.join(EXTENSION_ROOT, clip, file)), file);
  }
});

test("the shipped editing page plays the renderings tour clip as video", async () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-095
  const clip = "docs/demo-video/clips/advanced-renderings-tour";
  const source = fs.readFileSync(path.join(EXTENSION_ROOT, "docs", "user", "editing.md"), "utf8");
  const rendered = await renderMyst(source);
  const html = clipVideos(rendered.html, "docs/user/editing.md", (repoPath) => fs.existsSync(path.join(EXTENSION_ROOT, repoPath)));
  assert.ok(html.includes(`<video src="../demo-video/clips/advanced-renderings-tour/advanced-renderings-tour.webm"`), "the page holds the clip's video");
  for (const file of ["advanced-renderings-tour.webm", "advanced-renderings-tour.gif", "poster.png"]) {
    assert.ok(fs.existsSync(path.join(EXTENSION_ROOT, clip, file)), file);
  }
});

test("the shipped editing page plays the radio clip as video", async () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-095
  const clip = "docs/demo-video/clips/radio-buttons";
  const source = fs.readFileSync(path.join(EXTENSION_ROOT, "docs", "user", "editing.md"), "utf8");
  const rendered = await renderMyst(source);
  const html = clipVideos(rendered.html, "docs/user/editing.md", (repoPath) => fs.existsSync(path.join(EXTENSION_ROOT, repoPath)));
  assert.ok(html.includes(`<video src="../demo-video/clips/radio-buttons/radio-buttons.webm"`), "the page holds the clip's video");
  for (const file of ["radio-buttons.webm", "radio-buttons.gif", "poster.png"]) {
    assert.ok(fs.existsSync(path.join(EXTENSION_ROOT, clip, file)), file);
  }
});

test("the shipped editing page plays the block editor modes clip as video", async () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-095
  const clip = "docs/demo-video/clips/block-editor-modes";
  const source = fs.readFileSync(path.join(EXTENSION_ROOT, "docs", "user", "editing.md"), "utf8");
  const rendered = await renderMyst(source);
  const html = clipVideos(rendered.html, "docs/user/editing.md", (repoPath) => fs.existsSync(path.join(EXTENSION_ROOT, repoPath)));
  assert.ok(html.includes(`<video src="../demo-video/clips/block-editor-modes/block-editor-modes.webm"`), "the page holds the clip's video");
  for (const file of ["block-editor-modes.webm", "block-editor-modes.gif", "poster.png"]) {
    assert.ok(fs.existsSync(path.join(EXTENSION_ROOT, clip, file)), file);
  }
});

test("the shipped toolbar page plays the export clip as video", async () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-095
  const clip = "docs/demo-video/clips/export-html";
  const source = fs.readFileSync(path.join(EXTENSION_ROOT, "docs", "user", "toolbar.md"), "utf8");
  const rendered = await renderMyst(source);
  const html = clipVideos(rendered.html, "docs/user/toolbar.md", (repoPath) => fs.existsSync(path.join(EXTENSION_ROOT, repoPath)));
  assert.ok(html.includes(`<video src="../demo-video/clips/export-html/export-html.webm"`), "the page holds the clip's video");
  for (const file of ["export-html.webm", "export-html.gif", "poster.png"]) {
    assert.ok(fs.existsSync(path.join(EXTENSION_ROOT, clip, file)), file);
  }
});

test("the shipped toolbar page plays the diff clip as video", async () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-095
  const clip = "docs/demo-video/clips/diff-side-by-side";
  const source = fs.readFileSync(path.join(EXTENSION_ROOT, "docs", "user", "toolbar.md"), "utf8");
  const rendered = await renderMyst(source);
  const html = clipVideos(rendered.html, "docs/user/toolbar.md", (repoPath) => fs.existsSync(path.join(EXTENSION_ROOT, repoPath)));
  assert.ok(html.includes(`<video src="../demo-video/clips/diff-side-by-side/diff-side-by-side.webm"`), "the page holds the clip's video");
  for (const file of ["diff-side-by-side.webm", "diff-side-by-side.gif", "poster.png"]) {
    assert.ok(fs.existsSync(path.join(EXTENSION_ROOT, clip, file)), file);
  }
});

test("the shipped editing page plays the spreadsheet paste clip as video", async () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-095
  const clip = "docs/demo-video/clips/paste-spreadsheet-cells";
  const source = fs.readFileSync(path.join(EXTENSION_ROOT, "docs", "user", "editing.md"), "utf8");
  const rendered = await renderMyst(source);
  const html = clipVideos(rendered.html, "docs/user/editing.md", (repoPath) => fs.existsSync(path.join(EXTENSION_ROOT, repoPath)));
  assert.ok(html.includes(`<video src="../demo-video/clips/paste-spreadsheet-cells/paste-spreadsheet-cells.webm"`), "the page holds the clip's video");
  for (const file of ["paste-spreadsheet-cells.webm", "paste-spreadsheet-cells.gif", "poster.png"]) {
    assert.ok(fs.existsSync(path.join(EXTENSION_ROOT, clip, file)), file);
  }
});

test("the shipped editing page plays the table handles clip as video", async () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-095
  const clip = "docs/demo-video/clips/table-anchors";
  const source = fs.readFileSync(path.join(EXTENSION_ROOT, "docs", "user", "editing.md"), "utf8");
  const rendered = await renderMyst(source);
  const html = clipVideos(rendered.html, "docs/user/editing.md", (repoPath) => fs.existsSync(path.join(EXTENSION_ROOT, repoPath)));
  assert.ok(html.includes(`<video src="../demo-video/clips/table-anchors/table-anchors.webm"`), "the page holds the clip's video");
  for (const file of ["table-anchors.webm", "table-anchors.gif", "poster.png"]) {
    assert.ok(fs.existsSync(path.join(EXTENSION_ROOT, clip, file)), file);
  }
});

test("the shipped editing page plays the figure editor clip as video", async () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-095
  const clip = "docs/demo-video/clips/figure-editor";
  const source = fs.readFileSync(path.join(EXTENSION_ROOT, "docs", "user", "editing.md"), "utf8");
  const rendered = await renderMyst(source);
  const html = clipVideos(rendered.html, "docs/user/editing.md", (repoPath) => fs.existsSync(path.join(EXTENSION_ROOT, repoPath)));
  assert.ok(html.includes(`<video src="../demo-video/clips/figure-editor/figure-editor.webm"`), "the page holds the clip's video");
  assert.ok(html.includes(`<video src="../demo-video/clips/paste-spreadsheet-cells/paste-spreadsheet-cells.webm"`), "the paste clip's video is still there");
  for (const file of ["figure-editor.webm", "figure-editor.gif", "poster.png"]) {
    assert.ok(fs.existsSync(path.join(EXTENSION_ROOT, clip, file)), file);
  }
});

test("the shipped slash menu page plays the grid clip as video", async () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-095
  const clip = "docs/demo-video/clips/slash-menu-grid";
  const source = fs.readFileSync(path.join(EXTENSION_ROOT, "docs", "user", "slash-menu.md"), "utf8");
  const rendered = await renderMyst(source);
  const html = clipVideos(rendered.html, "docs/user/slash-menu.md", (repoPath) => fs.existsSync(path.join(EXTENSION_ROOT, repoPath)));
  assert.ok(html.includes(`<video src="../demo-video/clips/slash-menu-grid/slash-menu-grid.webm"`), "the page holds the clip's video");
  for (const file of ["slash-menu-grid.webm", "slash-menu-grid.gif", "poster.png"]) {
    assert.ok(fs.existsSync(path.join(EXTENSION_ROOT, clip, file)), file);
  }
});

test("the shipped themes page plays the theme switch clip as video", async () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-095
  const clip = "docs/demo-video/clips/theme-switch";
  const source = fs.readFileSync(path.join(EXTENSION_ROOT, "docs", "user", "themes-and-motion.md"), "utf8");
  const rendered = await renderMyst(source);
  const html = clipVideos(rendered.html, "docs/user/themes-and-motion.md", (repoPath) => fs.existsSync(path.join(EXTENSION_ROOT, repoPath)));
  assert.ok(html.includes(`<video src="../demo-video/clips/theme-switch/theme-switch.webm"`), "the page holds the clip's video");
  for (const file of ["theme-switch.webm", "theme-switch.gif", "poster.png"]) {
    assert.ok(fs.existsSync(path.join(EXTENSION_ROOT, clip, file)), file);
  }
});

test("the shipped OKF page plays the frontmatter clip as video", async () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-095
  const clip = "docs/demo-video/clips/okf-frontmatter";
  const source = fs.readFileSync(path.join(EXTENSION_ROOT, "docs", "user", "okf.md"), "utf8");
  const rendered = await renderMyst(source);
  const html = clipVideos(rendered.html, "docs/user/okf.md", (repoPath) => fs.existsSync(path.join(EXTENSION_ROOT, repoPath)));
  assert.ok(html.includes(`<video src="../demo-video/clips/okf-frontmatter/okf-frontmatter.webm"`), "the page holds the clip's video");
  for (const file of ["okf-frontmatter.webm", "okf-frontmatter.gif", "poster.png"]) {
    assert.ok(fs.existsSync(path.join(EXTENSION_ROOT, clip, file)), file);
  }
});

test("a clip's storyboard and stage documents are not site pages", () => {
  // @tests_req SwRS-MDOKFSTUDIO-CORE-095
  assert.equal(isClipSource("docs/demo-video/clips/x/clip.md"), true);
  assert.equal(isClipSource("docs/demo-video/clips/x/stage/runbook.md"), true);
  assert.equal(isClipSource("docs/user/settings.md"), false);
  assert.equal(isClipSource("docs/demo-video/guidelines/x.md"), false);
  const rendered = renderedMarkdownFiles().map((file) => path.relative(EXTENSION_ROOT, file).split(path.sep).join("/"));
  assert.ok(rendered.includes("docs/user/settings.md"));
  assert.deepEqual(rendered.filter((file) => file.startsWith("docs/demo-video/clips/")), []);
});
