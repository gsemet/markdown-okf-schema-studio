import * as assert from "node:assert/strict";
import { test } from "node:test";

import { isImageFileName, relativeImageReference } from "../../../src/core/mapping/imageReference";

test("relativeImageReference gives a POSIX path relative to the document folder", () => {
  assert.equal(relativeImageReference("/w/book/a.md", "/w/book/logo.png"), "logo.png");
  assert.equal(relativeImageReference("/w/book/a.md", "/w/book/img/deep/logo.png"), "img/deep/logo.png");
  assert.equal(relativeImageReference("/w/book/ch/a.md", "/w/book/img/logo.png"), "../img/logo.png");
  assert.equal(relativeImageReference("/w/book/a.md", "/w/book/my pics/a (1).png"), "my pics/a (1).png");
});

test("relativeImageReference accepts Windows separators and refuses another drive", () => {
  assert.equal(relativeImageReference("C:\\w\\book\\a.md", "C:\\w\\book\\img\\logo.png"), "img/logo.png");
  assert.equal(relativeImageReference("C:\\w\\book\\a.md", "C:\\w\\shared\\logo.png"), "../shared/logo.png");
  assert.equal(relativeImageReference("C:\\w\\book\\a.md", "D:\\w\\logo.png"), undefined);
});

test("relativeImageReference refuses a path that cannot be written in a reference", () => {
  assert.equal(relativeImageReference("/w/a.md", "/w/x<y.png"), undefined);
  assert.equal(relativeImageReference("/w/a.md", "/w/x>y.png"), undefined);
  assert.equal(relativeImageReference("/w/a.md", "/w/x\ny.png"), undefined);
  assert.equal(relativeImageReference("/w/a.md", "/w"), undefined, "the document folder itself is not a file");
});

test("isImageFileName accepts png, jpeg, gif, webp and svg only", () => {
  for (const name of ["a.png", "a.JPG", "a.jpeg", "a.gif", "a.webp", "a.svg"]) assert.equal(isImageFileName(name), true, name);
  for (const name of ["a.md", "a.exe", "png", "a.png.txt", "a.pdf"]) assert.equal(isImageFileName(name), false, name);
});
