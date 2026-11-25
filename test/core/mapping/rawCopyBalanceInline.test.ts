import { test } from "node:test";

import { assertCopy, at } from "./rawCopyBalanceSupport";

const BOLD = "Hello **world** again";
const LINK = "a [link **bold** text](https://x.test) b";

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-279#S3
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-279#S4
test("a bold word cut at its start or its end gets the missing delimiters; cut inside, nothing is added", async () => {
  await assertCopy(BOLD, at("world", 2), at(" again", "end"), "rld** again", "**rld** again");
  await assertCopy(BOLD, at("Hello ", 0), at("world", 2), "Hello **wo", "Hello **wo**");
  await assertCopy(BOLD, at("world", 1), at("world", 4), "orl", "orl");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-279#S3
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-279#S4
test("a bold word inside a link: the link inside only, or crossed with the bold", async () => {
  await assertCopy(LINK, at("bold", 2), at(" text", 3), "ld** te", "**ld** te");
  await assertCopy(LINK, at("bold", 2), at(" b", "end"), "ld** text](https://x.test) b", "[**ld** text](https://x.test) b");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-279#S1
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-279#S4
test("inline code and a MyST role", async () => {
  await assertCopy("use `npm ci` here", at("npm ci", 4), at(" here", "end"), "ci` here", "`ci` here");
  await assertCopy("use `npm ci` here", at("npm ci", 1), at("npm ci", 3), "pm", "pm");
  await assertCopy("{kbd}`Ctrl+C` to copy", at("Ctrl+C", 1), at(" to copy", "end"), "trl+C` to copy", "{kbd}`trl+C` to copy");
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-279#S3
// @tests_req SwRS-MDOKFSTUDIO-BLOCK-279#S4
test("two crossed constructs and an inline HTML element", async () => {
  await assertCopy("~~old~~ and *new*", at("old", 1), at("new", 1), "ld~~ and *n", "~~ld~~ and *n*");
  await assertCopy(
    "see <span class=\"k\">key word</span> here",
    at("key word", 4),
    at(" here", "end"),
    "word</span> here",
    "<span class=\"k\">word</span> here",
  );
});

// @tests_req SwRS-MDOKFSTUDIO-BLOCK-279#S2
test("inline math with an edge inside is whole and adds nothing; clean edges give the verbatim slice", async () => {
  const source = "Area $a^2$ done\n\nSecond paragraph.\n";
  await assertCopy(source, at("Area", 1), at(" done", "end"), "rea $a^2$ done", "rea $a^2$ done");
  await assertCopy(source, at("Area", 1), at("Second paragraph.", "end"), source.slice(1, source.length - 1), source.slice(1, source.length - 1));
});
