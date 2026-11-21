/**
 * Host side of a blank-lines block inside a quote, an admonition, a context-tag panel, a quote
 * directive, a definition or a footnote (CR-462): a removal, a block written or pasted in place of a
 * run, a new definition entry or footnote, and the host's refusal of a stale container line, in LF and
 * CR LF documents.
 */

import * as assert from "node:assert/strict";
import { test } from "node:test";

import { renderPreviewSource } from "../../src/core/render/renderPipeline";
import { fixture } from "./blockFixture";

const EOLS = [["LF", "\n"], ["CRLF", "\r\n"]] as const;
const lines = (eol: string, ...entries: string[]): string => entries.join(eol);
const STALE_OPEN = "The preview is stale. Refresh it before editing this block.";
const STALE_SAVE = "The preview is stale. Reopen the block before saving.";
const OUT_OF_DATE = "The preview is out of date. Refresh it and try again.";

type Run = { line: number; endLine: number; itemLine?: number; containerLine?: number };

const errors = (host: ReturnType<typeof fixture>): string[] =>
  host.of("previewEditSource").filter((message) => message.error).map((message) => String(message.error));

const openOf = (run: Run) => ({
  editId: "e1", line: run.line, endLine: run.endLine, insertAfterLine: run.line - 1, replaceBlankRun: run, originalText: "",
});

const render = async (text: string): Promise<string> =>
  (await renderPreviewSource({ text, documentPath: "/w/doc.md", workspaceRoot: "/w", restrictedReads: false })).html;

/** Saves `typed` in place of `run` of `text` and returns the document afterwards. */
async function saved(text: string, run: Run, typed: string): Promise<{ text: string; errors: string[] }> {
  const host = fixture({ text });
  await host.send("previewEditSave", { ...openOf(run), editedText: typed, final: true });
  return { text: host.document.getText(), errors: errors(host) };
}

for (const [name, eol] of EOLS) {
  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-269
  test(`${name}: previewBlankRunDelete on a quote run keeps its first empty line, in one edit`, async () => {
    const text = lines(eol, "# T", "", "> One", ">", ">", ">", "> Two", "");
    const host = fixture({ text });
    await host.send("previewBlankRunDelete", { line: 4, endLine: 6 });
    assert.equal(host.document.getText(), lines(eol, "# T", "", "> One", ">", "> Two", ""));
    assert.equal(host.applyCalls.length, 1);
    assert.match(await render(host.document.getText()), /<blockquote/u);
  });

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-268
  test(`${name}: "More" typed in a quote run is written in the quote with one empty line on each side`, async () => {
    const text = lines(eol, "# T", "", "> One", ">", ">", ">", "> Two", "");
    const result = await saved(text, { line: 4, endLine: 6 }, "More");
    assert.deepEqual(result.errors, []);
    assert.equal(result.text, lines(eol, "# T", "", "> One", ">", "> More", ">", "> Two", ""));
    assert.equal((await render(result.text)).match(/<blockquote/gu)?.length, 1, "still one quote");
  });

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-268
  test(`${name}: "More" typed in an admonition run inside a list item keeps the item and the admonition indent`, async () => {
    const text = lines(eol, "# T", "", "- a", "", "  ```{note}", "  One", "", "", "", "  Two", "  ```", "");
    const result = await saved(text, { line: 7, endLine: 9, containerLine: 5 }, "More");
    assert.deepEqual(result.errors, []);
    assert.equal(result.text, lines(eol, "# T", "", "- a", "", "  ```{note}", "  One", "", "  More", "", "  Two", "  ```", ""));
    assert.match(await render(result.text), /More/u);
  });

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-268
  test(`${name}: "More" typed in a panel, a quote directive, a definition and a footnote run stays inside them`, async () => {
    const panel = lines(eol, "# T", "", "```{note}", "One", "", "", "", "Two", "```", "");
    assert.equal(
      (await saved(panel, { line: 5, endLine: 7, containerLine: 3 }, "More")).text,
      lines(eol, "# T", "", "```{note}", "One", "", "More", "", "Two", "```", ""),
    );
    const epigraph = lines(eol, "# T", "", "```{epigraph}", "One", "", "", "", "Two", "```", "");
    assert.equal(
      (await saved(epigraph, { line: 5, endLine: 7, containerLine: 3 }, "More")).text,
      lines(eol, "# T", "", "```{epigraph}", "One", "", "More", "", "Two", "```", ""),
    );
    const definition = lines(eol, "# T", "", "Term", ": First", "", "", "", "  Second", "");
    assert.equal(
      (await saved(definition, { line: 5, endLine: 7, containerLine: 4 }, "More")).text,
      lines(eol, "# T", "", "Term", ": First", "", "  More", "", "  Second", ""),
    );
    const footnote = lines(eol, "# T", "", "Text[^1].", "", "[^1]: One", "", "", "", "    Two", "");
    assert.equal(
      (await saved(footnote, { line: 6, endLine: 8, containerLine: 5 }, "More")).text,
      lines(eol, "# T", "", "Text[^1].", "", "[^1]: One", "", "    More", "", "    Two", ""),
    );
  });

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-268
  test(`${name}: a block written between two entries is a new definition entry or a new footnote`, async () => {
    const definitions = lines(eol, "# T", "", "A", ": one", "", "", "", "B", ": two", "");
    const entry = await saved(definitions, { line: 5, endLine: 7, containerLine: 4 }, "C\n: three");
    assert.deepEqual(entry.errors, []);
    assert.equal(entry.text, lines(eol, "# T", "", "A", ": one", "", "C", ": three", "", "B", ": two", ""));
    const footnotes = lines(eol, "# T", "", "Text[^1][^2].", "", "[^1]: One", "", "", "", "[^2]: Two", "");
    const note = await saved(footnotes, { line: 6, endLine: 8, containerLine: 5 }, "[^3]: Three");
    assert.deepEqual(note.errors, []);
    assert.equal(note.text, lines(eol, "# T", "", "Text[^1][^2].", "", "[^1]: One", "", "[^3]: Three", "", "[^2]: Two", ""));
  });

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-268
  test(`${name}: "- c" typed in a list inside a quote is an item, with the quote markers kept`, async () => {
    const text = lines(eol, "# T", "", "> - a", ">", ">", ">", "> - b", "");
    const result = await saved(text, { line: 4, endLine: 6, itemLine: 3 }, "- c");
    assert.deepEqual(result.errors, []);
    assert.equal(result.text, lines(eol, "# T", "", "> - a", ">", "> - c", ">", "> - b", ""));
  });

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-268
  test(`${name}: a save that re-creates the edit, then the cancel, give back the run byte for byte`, async () => {
    const text = lines(eol, "# T", "", "> One", ">", ">", ">", "> Two", "");
    const run = { line: 4, endLine: 6 };
    const host = fixture({ text });
    await host.send("previewEditOpen", openOf(run));
    await host.send("previewEditSave", { ...openOf(run), editedText: "More", final: false });
    await host.send("previewEditCancel", {
      editId: "e1", line: 4, endLine: 6, insertAfterLine: 3, replaceBlankRun: run,
    });
    assert.equal(host.document.getText(), text);
    assert.deepEqual(errors(host), []);
  });

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-268
  test(`${name}: a container line that is not the container's line is refused as stale and nothing changes`, async () => {
    const text = lines(eol, "# T", "", "```{note}", "One", "", "", "", "Two", "```", "");
    const stale = { line: 5, endLine: 7, containerLine: 4 };
    const opened = fixture({ text });
    await opened.send("previewEditOpen", openOf(stale));
    assert.deepEqual(errors(opened), [STALE_OPEN]);

    const savedHost = fixture({ text });
    await savedHost.send("previewEditSave", { ...openOf(stale), editedText: "More", final: false });
    assert.deepEqual(errors(savedHost), [STALE_SAVE]);
    assert.equal(savedHost.document.getText(), text);
    assert.equal(savedHost.applyCalls.length, 0);

    const pasted = fixture({ text });
    await pasted.send("previewBlocksPaste", { insertAfterLine: 4, replaceBlankRun: stale });
    assert.deepEqual(
      pasted.of("previewBlocksResult").map(({ op, ok, reason }) => ({ op, ok, reason })),
      [{ op: "paste", ok: false, reason: OUT_OF_DATE }],
    );
    assert.equal(pasted.document.getText(), text);
  });

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-268
  test(`${name}: a save with another container line than the held edit's is refused as stale`, async () => {
    const text = lines(eol, "# T", "", "```{note}", "One", "", "", "", "Two", "```", "");
    const run = { line: 5, endLine: 7, containerLine: 3 };
    const host = fixture({ text });
    await host.send("previewEditSave", { ...openOf(run), editedText: "More", final: false });
    const written = host.document.getText();
    await host.send("previewEditSave", { ...openOf({ line: 5, endLine: 7 }), editedText: "More!", final: false });
    assert.equal(errors(host).length, 1);
    assert.equal(host.document.getText(), written);
  });

  // @tests_req SwRS-MDOKFSTUDIO-BLOCK-268
  test(`${name}: a paste with a container line writes "More" in the quote and in the admonition`, async () => {
    const quote = fixture({ text: lines(eol, "# T", "", "> One", ">", ">", ">", "> Two", "") });
    quote.hooks.readClipboard = () => Promise.resolve("More");
    await quote.send("previewBlocksPaste", { insertAfterLine: 3, replaceBlankRun: { line: 4, endLine: 6 } });
    assert.equal(quote.document.getText(), lines(eol, "# T", "", "> One", ">", "> More", ">", "> Two", ""));

    const panel = fixture({ text: lines(eol, "# T", "", "```{note}", "One", "", "", "", "Two", "```", "") });
    panel.hooks.readClipboard = () => Promise.resolve("More");
    await panel.send("previewBlocksPaste", { insertAfterLine: 4, replaceBlankRun: { line: 5, endLine: 7, containerLine: 3 } });
    assert.equal(panel.document.getText(), lines(eol, "# T", "", "```{note}", "One", "", "More", "", "Two", "```", ""));
  });
}
