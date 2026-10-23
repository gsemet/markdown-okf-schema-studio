import * as assert from "node:assert/strict";
import { test } from "node:test";

import { imageParagraphEdit } from "../../src/webview/pasteImage";

/** The text box after the edit, and the selected text. */
function paste(value: string, start: number, end = start, name = "image.png"): { text: string; selected: string } {
  const edit = imageParagraphEdit(value, start, end, name);
  const text = value.slice(0, edit.start) + edit.text + value.slice(edit.end);
  return { text, selected: text.slice(edit.selectionStart, edit.selectionEnd) };
}

test("CR 050: an image pasted at the end of a text line becomes a paragraph of its own", () => {
  assert.deepEqual(paste("Text before the image.", 22), {
    text: "Text before the image.\n\n![image.png](image.png)", selected: "image.png",
  });
  // The space typed before the paste goes with the break: no trailing blank on the text line.
  assert.equal(paste("Text before the image. ", 23).text, "Text before the image.\n\n![image.png](image.png)");
});

test("CR 050: an image pasted in the middle of a line splits it around its own paragraph", () => {
  const value = "A paragraph after the image.";
  assert.equal(paste(value, value.indexOf(" after")).text, "A paragraph\n\n![image.png](image.png)\n\nafter the image.");
  assert.equal(paste(value, 0).text, "![image.png](image.png)\n\nA paragraph after the image.");
});

test("CR 050: blank lines already there are reused, not doubled", () => {
  assert.equal(paste("", 0).text, "![image.png](image.png)");
  assert.equal(paste("One.\n\n", 6).text, "One.\n\n![image.png](image.png)");
  assert.equal(paste("One.\n", 5).text, "One.\n\n![image.png](image.png)");
  assert.equal(paste("One.\n\nTwo.", 5).text, "One.\n\n![image.png](image.png)\n\nTwo.");
  assert.equal(paste("One.\nTwo.", 4).text, "One.\n\n![image.png](image.png)\n\nTwo.");
  assert.equal(paste("One.\n\n\nTwo.", 6).text, "One.\n\n![image.png](image.png)\n\nTwo.");
});

test("CR 050: a selection is replaced by the image paragraph", () => {
  const value = "Keep this. Replace me. Keep that.";
  const start = value.indexOf("Replace");
  const end = start + "Replace me.".length;
  assert.deepEqual(paste(value, start, end, "shot.webp"), {
    text: "Keep this.\n\n![shot.webp](shot.webp)\n\nKeep that.", selected: "shot.webp",
  });
});

test("CR 050: out-of-range positions are clamped to the text", () => {
  assert.equal(paste("Text.", 99).text, "Text.\n\n![image.png](image.png)");
  assert.equal(paste("Text.", -4).text, "![image.png](image.png)\n\nText.");
});
