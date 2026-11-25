import * as assert from "node:assert/strict";
import { test } from "node:test";

import {
  classifyPreviewReference,
  markdownFragmentRange,
  markdownMarkerLine,
} from "../../../src/core/navigation/previewNavigation";

// Tests added by the mutation campaign of src/core (CR-450): they pin the survivors of the first run.

const lineOf = (source: string, suffix: string) => markdownFragmentRange(source, suffix)?.startLine;

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-102
test("a link with no fragment, or an empty one, selects nothing even when a heading would slug to it", () => {
  const source = "# !!!\n\ntext\n";
  assert.equal(lineOf(source, "#"), undefined);
  assert.equal(lineOf(source, ""), undefined);
  assert.equal(lineOf("# heading\n", "heading"), undefined, "a suffix without # has no fragment");
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-102
test("line anchors are exact: one or two numbers, up to the last line, start not after end", () => {
  const source = "1\n2\n3\n4\n5";
  assert.deepEqual(markdownFragmentRange(source, "#L3-L5"), { startLine: 3, endLine: 5 });
  assert.deepEqual(markdownFragmentRange(source, "#L1-L5"), { startLine: 1, endLine: 5 }, "the end may be the last line");
  assert.deepEqual(markdownFragmentRange(source, "#L5"), { startLine: 5, endLine: 5 });
  assert.equal(markdownFragmentRange(source, "#L2-L6"), undefined, "past the last line");
  assert.equal(markdownFragmentRange(source, "#L6"), undefined);
  assert.equal(markdownFragmentRange(source, "#L5-L3"), undefined, "start after end");
  assert.equal(markdownFragmentRange(source, "#L0"), undefined);
  assert.equal(markdownFragmentRange(source, "#fooL3"), undefined, "anchored at the start");
  assert.equal(markdownFragmentRange(source, "#L3x"), undefined, "anchored at the end");
  assert.deepEqual(markdownFragmentRange("a\nb\r\nc\n", "#L3"), { startLine: 3, endLine: 3 }, "CRLF counts as one break");
  const long = Array.from({ length: 120 }, (_, index) => `line ${index + 1}`).join("\n");
  assert.deepEqual(markdownFragmentRange(long, "#L10-L120"), { startLine: 10, endLine: 120 });
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-102
test("heading slugs ignore case, punctuation and runs of spaces, but keep digits", () => {
  const source = "intro\n\n# Hello, World!\n\n## Step  2: go\n\n## Straße\n";
  assert.equal(lineOf(source, "#hello-world"), 3);
  assert.equal(lineOf(source, "#Hello-World"), 3);
  assert.equal(lineOf(source, "#step-2-go"), 5, "a run of spaces is one dash and digits stay");
  assert.equal(lineOf(source, "#straße"), 7);
  assert.equal(lineOf(source, "#strasse"), undefined, "only lower-casing, no wider case folding");
  assert.equal(lineOf(source, "#STEP-2-GO"), 5);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-102
test("a MyST label target is the whole line, at most three spaces in", () => {
  const source = "intro\n(my-label)=\n\nsee (other)=\n\n(spaced)=   \n\n(tail)= extra\n\n    (indented)=\n";
  assert.equal(lineOf(source, "#my-label"), 2);
  assert.equal(lineOf(source, "#other"), undefined, "not at the start of the line");
  assert.equal(lineOf(source, "#spaced"), 6, "trailing spaces are allowed");
  assert.equal(lineOf(source, "#tail"), undefined, "nothing may follow the label");
  assert.equal(lineOf(source, "#indented"), undefined, "four spaces make a code block");
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-102
test("a block id ends its line and may start it", () => {
  const source = "^first\n\ntext ^mid more\n\ntext ^last  \n\ntext ^end\n";
  assert.equal(lineOf(source, "#^first"), 1, "a block id alone on its line");
  assert.equal(lineOf(source, "#^mid"), undefined, "text after the id");
  assert.equal(lineOf(source, "#^last"), 5, "trailing spaces are allowed");
  assert.equal(lineOf(source, "#^end"), 7);
  assert.equal(lineOf(source, "#^"), undefined);
  assert.equal(lineOf("text\n", "#end"), undefined, "a block target needs the caret");
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-102
test("an HTML heading id is a target for any level, quote style and attribute order, only when it matches", () => {
  const source = [
    "text",
    "",
    '<h2 id="intro-section">Intro</h2>',
    "<h3 id='single-quoted'>Single</h3>",
    '<h1 class="big" id="after-class">Class first</h1>',
    '<h4 id="before-class" class="big">Class after</h4>',
    '<h2 id="other-id">Other</h2>',
    "",
    "# Real heading",
  ].join("\n");
  assert.deepEqual(markdownFragmentRange(source, "#intro-section"), { startLine: 3, endLine: 3 });
  assert.equal(lineOf(source, "#single-quoted"), 4);
  assert.equal(lineOf(source, "#after-class"), 5);
  assert.equal(lineOf(source, "#before-class"), 6);
  assert.equal(lineOf(source, "#real-heading"), 9, "an HTML id that is not the target is skipped");
  assert.equal(lineOf(source, "#missing"), undefined);
  assert.equal(lineOf('<p id="not-a-heading">x</p>', "#not-a-heading"), undefined);
  assert.equal(lineOf('<h7 id="level-seven">x</h7>', "#level-seven"), undefined);
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-102
test("ATX and setext headings are recognised by their shape", () => {
  assert.equal(lineOf("# Title\n", "#title"), 1, "a single hash");
  assert.equal(lineOf("   ### Title ###\n", "#title"), 1, "indent of three spaces and a closing run");
  assert.equal(lineOf("foo # bar\n", "#bar"), undefined, "a hash in the middle of a line is no heading");
  assert.equal(lineOf("#Title\n", "#title"), undefined, "a hash needs a space after it");
  assert.equal(lineOf("Title\n=====\n", "#title"), 1, "several equal signs");
  assert.equal(lineOf("Title\n-----\n", "#title"), 1);
  assert.equal(lineOf("Title\n=== \n", "#title"), 1, "trailing space after the underline");
  assert.equal(lineOf("Title\nfoo ---\n", "#title"), undefined, "the underline starts its line");
  assert.equal(lineOf("Title\n--- x\n", "#title"), undefined, "the underline ends its line");
  assert.equal(lineOf("Title\n    ---\n", "#title"), undefined, "four spaces make a code block");
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-102
test("an explicit heading id wins, hugs the text or follows a space, and only counts at the end", () => {
  assert.equal(lineOf("# Title {#custom-id}\n", "#custom-id"), 1);
  assert.equal(lineOf("# Title{#nospace}\n", "#nospace"), 1, "no space before the id");
  assert.equal(lineOf("# Title{#nospace}\n", "#title"), 1, "the id is dropped from the slug");
  assert.equal(lineOf("# Title {#custom-id}\n", "#title"), 1);
  assert.equal(lineOf("# Title {#id} tail\n", "#id"), undefined, "an id in the middle is text");
  assert.equal(lineOf("# Title {#id} tail\n", "#title-id-tail"), 1, "and stays in the slug");
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-102
test("an opening fence line is never a target, even when its info text looks like a heading id", () => {
  const source = '```text <h2 id="fenced">\nbody\n```\n';
  assert.equal(lineOf(source, "#fenced"), undefined);
  assert.equal(lineOf("```\n# Inside\n```\n# Outside\n", "#inside"), undefined);
  assert.equal(lineOf("```\n# Inside\n```\n# Outside\n", "#outside"), 4);
});

// @tests_req SwRS-MDOKFSTUDIO-FMSCHEMA-067#S4
test("marker lines trim the marker and the identity, and refuse an empty one", () => {
  const source = "@tests_req REQ-1\nother\n";
  assert.equal(markdownMarkerLine(source, "@tests_req", "REQ-1"), 1, "the first line is line 1");
  assert.equal(markdownMarkerLine(source, "  @tests_req  ", " REQ-1 "), 1, "padding is trimmed");
  assert.equal(markdownMarkerLine("a  REQ-1\n", "", "REQ-1"), undefined, "an empty marker");
  assert.equal(markdownMarkerLine("@tests_req \n", "@tests_req", ""), undefined, "an empty identity");
  assert.equal(markdownMarkerLine("@tests_req \n", "@tests_req", "   "), undefined, "a blank identity");
  assert.equal(markdownMarkerLine("a\n   \nb\n", "   ", "   "), undefined, "both blank");
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-090
test("a link is trimmed before it is classified", () => {
  assert.deepEqual(classifyPreviewReference("  #top  "), { kind: "anchor", value: "#top" });
  assert.deepEqual(classifyPreviewReference("  notes/a.md  "), { kind: "relative", value: "notes/a.md" });
  assert.deepEqual(classifyPreviewReference("  https://example.com/a  "), { kind: "external", value: "https://example.com/a" });
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-090
// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-102
test("a blocked link says why, and each block has its own reason", () => {
  const reason = (request: string) => {
    const result = classifyPreviewReference(request);
    return result.kind === "blocked" ? result.reason : `not blocked: ${result.kind}`;
  };
  assert.equal(reason("#"), "The preview anchor is invalid.");
  assert.equal(reason("#a#b"), "The preview anchor is invalid.");
  assert.equal(reason("?view=1"), "Query-only navigation targets are not valid file links.");
  assert.equal(reason("?"), "Query-only navigation targets are not valid file links.");
  assert.equal(reason(""), "The navigation target could not be decoded safely.", "an empty link is not a query-only link");
  assert.equal(reason("   "), "The navigation target could not be decoded safely.");
  assert.equal(reason("a%ZZb"), "The navigation target could not be decoded safely.");
  assert.equal(reason("a\\b.md"), "The navigation target could not be decoded safely.");
  assert.equal(reason("a%00b"), "The navigation target could not be decoded safely.");
  assert.equal(reason("javascript:alert(1)"), "The navigation scheme is not allowed in the preview.");
  assert.equal(reason("file:///etc/passwd"), "The navigation scheme is not allowed in the preview.");
  assert.equal(reason("/etc/passwd"), "Absolute navigation targets are not allowed.");
  assert.equal(reason("%2Fetc%2Fpasswd"), "Absolute navigation targets are not allowed.");
});

// @tests_req SwRS-MDOKFSTUDIO-TOOLBAR-090
test("only http, https and mailto links are external, and never behind wiki:", () => {
  assert.deepEqual(classifyPreviewReference("https://example.com"), { kind: "external", value: "https://example.com" });
  assert.deepEqual(classifyPreviewReference("HTTP://example.com"), { kind: "external", value: "HTTP://example.com" });
  assert.deepEqual(classifyPreviewReference("mailto:a@b.c"), { kind: "external", value: "mailto:a@b.c" });
  assert.equal(classifyPreviewReference("wiki:https://example.com").kind, "blocked");
  assert.equal(classifyPreviewReference("wiki:mailto:a@b.c").kind, "blocked");
  assert.equal(classifyPreviewReference("ftp://example.com").kind, "blocked");
  assert.equal(classifyPreviewReference("mailto%3Aa@b.c").kind, "blocked", "an escape before the colon hides the scheme");
  assert.deepEqual(classifyPreviewReference("wiki:Some Page"), { kind: "wiki", value: "wiki:Some Page" });
  assert.deepEqual(classifyPreviewReference("Some Page.md#top"), { kind: "relative", value: "Some Page.md#top" });
});
