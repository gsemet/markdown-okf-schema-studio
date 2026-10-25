import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";

import { describeFolder } from "../integration/folderListing";

test("describeFolder lists sizes and reports a file that vanishes before the stat", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "folder-listing-"));
  try {
    fs.writeFileSync(path.join(directory, "image.png"), "abc");
    fs.writeFileSync(path.join(directory, ".image.png.partial"), "x");
    assert.match(describeFolder(directory), /image\.png \(3 B\)/);
    const vanishing = describeFolder(directory, (file) => {
      if (file.endsWith(".partial")) {
        fs.rmSync(file);
        const error = new Error("ENOENT") as NodeJS.ErrnoException;
        error.code = "ENOENT";
        throw error;
      }
      return fs.statSync(file);
    });
    assert.match(vanishing, /\.image\.png\.partial \(gone during listing\)/);
    assert.match(vanishing, /image\.png \(3 B\)/);
    assert.match(describeFolder(directory, () => undefined), /image\.png \(gone during listing\)/);
    assert.match(describeFolder(path.join(directory, "missing")), /cannot list/);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
