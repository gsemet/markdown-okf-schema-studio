import * as assert from "node:assert/strict";
import { test } from "node:test";

import { installPasteUrl, isImageUrl, pastedUrl, pasteUrlEdit } from "../../../src/page/modules/pasteUrl";

/** The text box after the edit. */
function apply(value: string, start: number, end: number, clipboard: string): string | undefined {
  const edit = pasteUrlEdit(value, start, end, clipboard);
  return edit && value.slice(0, edit.start) + edit.text + value.slice(edit.end);
}

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-264
test("CR 145: a URL pasted over selected text makes a link and leaves the rest untouched", () => {
  const value = "Read the docs now.";
  assert.equal(apply(value, 5, 13, "https://example.com/docs"), "Read [the docs](https://example.com/docs) now.");
  assert.equal(apply("mail me", 0, 7, "mailto:a@b.co"), "[mail me](mailto:a@b.co)");
  const edit = pasteUrlEdit(value, 5, 13, "https://example.com/docs")!;
  assert.equal(edit.selectionStart, edit.start + edit.text.length);
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-264
test("CR 145: a URL pasted alone makes an autolink", () => {
  assert.equal(apply("See  now", 4, 4, "https://example.com/a?b=1#c"), "See <https://example.com/a?b=1#c> now");
  assert.equal(apply("", 0, 0, "  http://example.com \n"), "<http://example.com>");
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-264
test("CR 145: an image URL makes an image, with the selection as alt text", () => {
  for (const extension of ["png", "jpg", "jpeg", "gif", "svg", "webp", "PNG"]) {
    assert.equal(apply("", 0, 0, `https://x.org/a/b.${extension}`), `![](https://x.org/a/b.${extension})`, extension);
  }
  assert.equal(apply("a b", 2, 3, "https://x.org/p.png?w=2#top"), "a ![b](https://x.org/p.png?w=2#top)");
  const alone = pasteUrlEdit("x", 1, 1, "https://x.org/p.png")!;
  assert.equal(alone.selectionStart, 1 + 2, "the caret waits in the empty alt text");
  assert.equal(isImageUrl("https://x.org/page.html?img=a.png"), false);
  assert.equal(isImageUrl("mailto:a@b.co"), false);
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-264
test("CR 145: only http, https and mailto addresses are links", () => {
  for (const text of ["javascript:alert(1)", "data:text/html,x", "file:///etc/passwd", "ftp://x.org/a", "www.example.com",
    "https://a.org b", "https://a.org\nhttps://b.org", "https://a.org/<x>", "just words", "", "   "]) {
    assert.equal(pastedUrl(text), undefined, text);
    assert.equal(pasteUrlEdit("abc", 0, 3, text), undefined, text);
  }
  assert.equal(pastedUrl("HTTPS://Example.com"), "HTTPS://Example.com");
  assert.equal(pastedUrl("https://x.org/" + "a".repeat(2100)), undefined);
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-264
test("CR 145: a destination with parentheses is written in angle brackets", () => {
  assert.equal(apply("t", 0, 1, "https://en.wikipedia.org/wiki/Foo_(bar)"), "[t](<https://en.wikipedia.org/wiki/Foo_(bar)>)");
  assert.equal(apply("", 0, 0, "https://x.org/a_(b).png"), "![](<https://x.org/a_(b).png>)");
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-264
test("CR 145: the paste stays native in code, in a link target and over brackets or lines", () => {
  const url = "https://x.org/";
  assert.equal(pasteUrlEdit("```\ncode \n```", 9, 9, url), undefined, "fenced code");
  assert.equal(pasteUrlEdit("use `a ", 7, 7, url), undefined, "inline code");
  assert.equal(pasteUrlEdit("[x](", 4, 4, url), undefined, "link target");
  assert.equal(pasteUrlEdit("<", 1, 1, url), undefined, "inside angle brackets");
  assert.equal(pasteUrlEdit("a [b] c", 2, 5, url), undefined, "brackets in the selection");
  assert.equal(pasteUrlEdit("a\nb", 0, 3, url), undefined, "line break in the selection");
  assert.equal(apply("```\ncode\n```\nafter ", 19, 19, url), "```\ncode\n```\nafter <https://x.org/>", "after the fence is closed");
  assert.equal(apply("ab", 99, 99, url), "ab<https://x.org/>", "positions are clamped");
});

// @tests_req SwRS-MDOKFSTUDIO-PALETTE-264
test("CR 145: Cmd/Ctrl+Shift+V pastes the raw text, rich text is left to the HTML paste", () => {
  const paste = installPasteUrl();
  const box = { value: "abc", selectionStart: 0, selectionEnd: 3 };
  const event = (html: string, text: string) => {
    let prevented = false;
    return {
      event: { clipboardData: { getData: (t: string) => (t === "text/html" ? html : text) }, preventDefault: () => { prevented = true; } },
      prevented: () => prevented,
    };
  };
  const inserted: string[] = [];
  const insert = (edit: { text: string }) => { inserted.push(edit.text); };
  paste.noteKey({ key: "v", shiftKey: true, ctrlKey: true });
  const plain = event("", "https://x.org");
  assert.equal(paste.handle(plain.event, box, insert), false);
  assert.equal(plain.prevented(), false);
  const rich = event("<a href='https://x.org'>x</a>", "https://x.org");
  assert.equal(paste.handle(rich.event, box, insert), false, "html on the clipboard");
  const next = event("", "https://x.org");
  assert.equal(paste.handle(next.event, box, insert), true, "the mark was consumed");
  assert.equal(next.prevented(), true);
  assert.deepEqual(inserted, ["[abc](https://x.org)"]);
  assert.equal(paste.handle(null, box, insert), false);
  assert.equal(paste.handle({ clipboardData: null }, box, insert), false);
});
