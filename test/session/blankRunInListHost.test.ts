/**
 * Host side of a blank-line block inside a list (CR-448): a removal, a block written or pasted in
 * place of a run between two items or inside an item, and the host's refusal of an item line that is
 * not a list item line, in LF and CR LF documents.
 */

import * as assert from "node:assert/strict";
import { test } from "node:test";

import { renderPreviewSource } from "../../src/core/render/renderPipeline";
import { attribute, findElements, parseHtml, textContent } from "../core/render/dom";
import { fixture } from "./blockFixture";
import { createNodeFileSystem } from "../../src/node-services/nodeFileSystem";

const EOLS = [["LF", "\n"], ["CRLF", "\r\n"]] as const;
const lines = (eol: string, ...entries: string[]): string => entries.join(eol);
const STALE_OPEN = "The preview is stale. Refresh it before editing this block.";
const STALE_SAVE = "The preview is stale. Reopen the block before saving.";
const OUT_OF_DATE = "The preview is out of date. Refresh it and try again.";

/** The top-level lists of a rendered text and its items as `[marker line, own paragraphs]`. */
async function listsOf(text: string): Promise<{ lists: number; items: Array<[number, string]> }> {
  const { html } = await renderPreviewSource({ text, documentPath: "/w/doc.md", workspaceRoot: "/w", restrictedReads: false }, createNodeFileSystem());
  const document = parseHtml(html);
  const [body] = findElements(document, (e) => e.tagName === "body");
  const lists = body.childNodes.filter((node) => "tagName" in node && (node.tagName === "ul" || node.tagName === "ol"));
  const items = findElements(document, (e) => e.tagName === "li").map((li): [number, string] => [
    Number(attribute(li, "data-line")),
    li.childNodes.filter((node) => "tagName" in node && node.tagName === "p").map(textContent).join("|"),
  ]);
  return { lists: lists.length, items };
}

const errors = (host: ReturnType<typeof fixture>): string[] =>
  host.of("previewEditSource").filter((message) => message.error).map((message) => String(message.error));

for (const [name, eol] of EOLS) {
  // Lines: 3 "- a", 4-6 the run (5-6 shown); in `inItem`: 5 "  p1", 6-8 the run (7-8 shown), 9 "  p2".
  const between = lines(eol, "# T", "", "- a", "", "", "", "- b", "");
  const inItem = lines(eol, "# T", "", "- a", "", "  p1", "", "", "", "  p2", "");
  const betweenRun = { line: 5, endLine: 5, itemLine: 3 };
  const inItemRun = { line: 7, endLine: 7, itemLine: 3 };
  const openOf = (run: { line: number; endLine: number; itemLine?: number }) => ({
    editId: "e1", line: run.line, endLine: run.endLine, insertAfterLine: run.line - 1, replaceBlankRun: run, originalText: "",
  });

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-269#S1
  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-269#S3
  test(`${name}: previewBlankRunDelete between two items removes that one line and leaves one list`, async () => {
    const host = fixture({ text: between });
    await host.send("previewBlankRunDelete", { line: 5, endLine: 5 });
    const expected = lines(eol, "# T", "", "- a", "", "", "- b", "");
    assert.equal(host.document.getText(), expected);
    assert.equal(host.applyCalls.length, 1);
    assert.deepEqual((await listsOf(expected)).lists, 1);
  });

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-269#S1
  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-269#S2
  test(`${name}: previewBlankRunDelete removes that one line and keeps the others byte for byte, spaces included`, async () => {
    const text = lines(eol, "# T", "", "- a", "  ", "", "  ", "- b", "");
    const host = fixture({ text });
    await host.send("previewBlankRunDelete", { line: 5, endLine: 5 });
    assert.equal(host.document.getText(), lines(eol, "# T", "", "- a", "  ", "  ", "- b", ""));
    assert.equal(host.applyCalls.length, 1);
  });

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-269#S2
  test(`${name}: previewBlankRunDelete between two paragraphs of an item changes nothing else`, async () => {
    const host = fixture({ text: inItem });
    await host.send("previewBlankRunDelete", { line: 7, endLine: 7 });
    const expected = lines(eol, "# T", "", "- a", "", "  p1", "", "", "  p2", "");
    assert.equal(host.document.getText(), expected);
    assert.equal(host.applyCalls.length, 1);
    assert.deepEqual(await listsOf(expected), { lists: 1, items: [[3, "a|p1|p2"]] });
  });

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-268#S1
  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-268#S5
  test(`${name}: "More" typed between two items is written in the item with a blank line on each side`, async () => {
    const host = fixture({ text: between });
    await host.send("previewEditOpen", openOf(betweenRun));
    assert.deepEqual(errors(host), []);
    await host.send("previewEditSave", { ...openOf(betweenRun), editedText: "More", final: false });
    const written = lines(eol, "# T", "", "- a", "", "  More", "", "- b", "");
    assert.equal(host.document.getText(), written);
    assert.deepEqual(await listsOf(written), { lists: 1, items: [[3, "a|More"], [7, "b"]] });
    await host.send("previewEditSave", { ...openOf(betweenRun), editedText: "More text", final: false });
    assert.equal(host.document.getText(), lines(eol, "# T", "", "- a", "", "  More text", "", "- b", ""));
    await host.send("previewEditCancel", {
      editId: "e1", line: 5, endLine: 5, insertAfterLine: 4, replaceBlankRun: betweenRun,
    });
    assert.equal(host.document.getText(), between, "the blank line is back byte for byte");
  });

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-268#S5
  test(`${name}: "- c" between two items is an item at the item level, inside an item a nested list`, async () => {
    const top = fixture({ text: between });
    await top.send("previewEditSave", { ...openOf(betweenRun), editedText: "- c", final: true });
    const added = lines(eol, "# T", "", "- a", "", "- c", "", "- b", "");
    assert.equal(top.document.getText(), added);
    assert.deepEqual(await listsOf(added), { lists: 1, items: [[3, "a"], [5, "c"], [7, "b"]] });

    const deep = fixture({ text: inItem });
    await deep.send("previewEditSave", { ...openOf(inItemRun), editedText: "- c", final: true });
    const nested = lines(eol, "# T", "", "- a", "", "  p1", "", "  - c", "", "  p2", "");
    assert.equal(deep.document.getText(), nested);
    const { lists, items } = await listsOf(nested);
    assert.equal(lists, 1);
    assert.deepEqual(items.map(([line]) => line), [3, 7], "a nested item, no new item of the list");
  });

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-268#S5
  test(`${name}: "More" typed inside an item is written between its paragraphs`, async () => {
    const host = fixture({ text: inItem });
    await host.send("previewEditSave", { ...openOf(inItemRun), editedText: "More", final: true });
    const written = lines(eol, "# T", "", "- a", "", "  p1", "", "  More", "", "  p2", "");
    assert.equal(host.document.getText(), written);
    assert.deepEqual(await listsOf(written), { lists: 1, items: [[3, "a|p1|More|p2"]] });
  });

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-268#S1
  test(`${name}: a save that re-creates the edit writes the same indent`, async () => {
    const host = fixture({ text: between });
    await host.send("previewEditSave", { ...openOf(betweenRun), editedText: "More", final: true });
    assert.equal(host.document.getText(), lines(eol, "# T", "", "- a", "", "  More", "", "- b", ""));
    assert.deepEqual(errors(host), []);
  });

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-268#S5
  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-268#S6
  test(`${name}: an item line that is no list item line is refused as stale and nothing changes`, async () => {
    const paragraph = { ...betweenRun, itemLine: 1 };
    const opened = fixture({ text: between });
    await opened.send("previewEditOpen", openOf(paragraph));
    assert.deepEqual(errors(opened), [STALE_OPEN]);

    const saved = fixture({ text: between });
    await saved.send("previewEditSave", { ...openOf(paragraph), editedText: "More", final: false });
    assert.deepEqual(errors(saved), [STALE_SAVE]);
    assert.equal(saved.document.getText(), between);
    assert.equal(saved.applyCalls.length, 0);

    // A line that changed into a paragraph after the preview was drawn: the document says it is no item.
    const changed = lines(eol, "# T", "", "not an item", "", "", "", "- b", "");
    const late = fixture({ text: changed });
    await late.send("previewEditSave", { ...openOf(betweenRun), editedText: "More", final: false });
    assert.deepEqual(errors(late), [STALE_SAVE]);
    assert.equal(late.document.getText(), changed);

    const pasted = fixture({ text: between });
    await pasted.send("previewBlocksPaste", { insertAfterLine: 4, replaceBlankRun: paragraph });
    assert.deepEqual(
      pasted.of("previewBlocksResult").map(({ op, ok, reason }) => ({ op, ok, reason })),
      [{ op: "paste", ok: false, reason: OUT_OF_DATE }],
    );
    assert.equal(pasted.document.getText(), between);
  });

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-268#S6
  test(`${name}: a save or cancel with another item line than the held edit's is refused as stale`, async () => {
    const host = fixture({ text: between });
    await host.send("previewEditSave", { ...openOf(betweenRun), editedText: "More", final: false });
    const written = host.document.getText();
    const other = { ...betweenRun, itemLine: 1 };
    await host.send("previewEditSave", { ...openOf(other), editedText: "More!", final: false });
    await host.send("previewEditSave", { ...openOf({ line: 5, endLine: 5 }), editedText: "More!", final: false });
    await host.send("previewEditCancel", {
      editId: "e1", line: 5, endLine: 5, insertAfterLine: 4, replaceBlankRun: { line: 5, endLine: 5 },
    });
    assert.equal(errors(host).length, 3);
    assert.equal(host.document.getText(), written);
  });

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-268#S1
  test(`${name}: a paste with an item line writes "More" in the item`, async () => {
    const host = fixture({ text: between });
    host.hooks.readClipboard = () => Promise.resolve("More");
    await host.send("previewBlocksPaste", { insertAfterLine: 4, replaceBlankRun: betweenRun });
    const written = lines(eol, "# T", "", "- a", "", "  More", "", "- b", "");
    assert.equal(host.document.getText(), written);
    assert.deepEqual(await listsOf(written), { lists: 1, items: [[3, "a|More"], [7, "b"]] });

    const item = fixture({ text: between });
    item.hooks.readClipboard = () => Promise.resolve("- c");
    await item.send("previewBlocksPaste", { insertAfterLine: 4, replaceBlankRun: betweenRun });
    assert.equal(item.document.getText(), lines(eol, "# T", "", "- a", "", "- c", "", "- b", ""));
  });
}
