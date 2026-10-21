import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import test from "node:test";

import { removeStaleGalleryPages } from "./poGalleryCli";

test("gallery pages of a group that disappeared are removed, current pages and other files stay", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "gallery-"));
  try {
    const directory = path.join(root, "gallery");
    fs.mkdirSync(directory);
    for (const name of ["alpha.md", "gone.md", "notes.txt"]) fs.writeFileSync(path.join(directory, name), "x");
    const removed = removeStaleGalleryPages(root, { "GALLERY.md": "i", "gallery/alpha.md": "a" });
    assert.deepEqual(removed, ["gallery/gone.md"]);
    assert.deepEqual(fs.readdirSync(directory).sort(), ["alpha.md", "notes.txt"]);
    assert.deepEqual(removeStaleGalleryPages(path.join(root, "missing"), {}), []);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
